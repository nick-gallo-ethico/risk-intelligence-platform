# Phase 29: Error Handling & Reliability - Research

**Researched:** 2026-02-14
**Domain:** NestJS Exception Handling, Next.js Error Boundaries, Event-Driven Error Management
**Confidence:** HIGH

## Summary

This phase addresses nine specific error handling deficiencies identified in the UNIFIED-AUDIT-REPORT.md, spanning backend exception handling, audit trail reliability, frontend error boundaries, and async event handler safety. The codebase already has well-structured exception filters (`HttpExceptionFilter`, `SentryExceptionFilter`) and one error boundary pattern (`apps/frontend/src/app/(authenticated)/cases/[id]/error.tsx`) that can be extended.

The primary issues are:
1. **Backend:** 133 bare `throw new Error()` statements bypass NestJS exception filters; global filters are not registered in `main.ts`
2. **Audit reliability:** AuditService swallows all errors with no escalation; attachment deletion creates orphaned files
3. **Frontend:** Only 1 error boundary exists for 545+ components; auth/storage errors are silently swallowed
4. **Async events:** Event handlers run fire-and-forget with no error boundaries; async handler rejections go untracked

**Primary recommendation:** Register global exception filters, systematically replace bare `throw new Error()` with NestJS HTTP exceptions, add error boundaries to all top-level route segments, and wrap async event handlers with try-catch boundaries that log failures.

## Standard Stack

### Core (Already in Use)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/common` | 10.x | Built-in HTTP exceptions | NestJS-native, filter-aware, structured responses |
| `@nestjs/event-emitter` | 2.x | Async event handling | NestJS-native, decorator-based, supports async |
| Next.js App Router | 14.x | `error.tsx` file convention | Built-in error boundary support per route segment |
| `@sentry/node` | 7.x | Error tracking | Already integrated via `SentryExceptionFilter` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `sonner` or `react-hot-toast` | latest | User-facing error toasts | Frontend error notifications (already have toast in shadcn/ui) |

### Not Needed (Don't Add)

| Instead of | Don't Use | Why |
|------------|-----------|-----|
| Custom error classes | Generic Error subclasses | NestJS built-in exceptions cover all HTTP use cases |
| External monitoring lib | Additional APM | Sentry already integrated, just needs proper wiring |
| Custom retry libraries | Hand-rolled retry | Use simple counter + threshold pattern for AuditService |

**Installation:** No new packages required. All patterns use existing dependencies.

## Architecture Patterns

### Pattern 1: NestJS Exception Hierarchy

**What:** Replace bare `throw new Error()` with typed HTTP exceptions that flow through global filters.

**When to use:** Any backend error that should return an HTTP response to the client.

**NestJS Built-in Exceptions (use these):**

| Exception | HTTP Status | Use Case |
|-----------|-------------|----------|
| `BadRequestException` | 400 | Invalid input, validation failures |
| `UnauthorizedException` | 401 | Missing or invalid authentication |
| `ForbiddenException` | 403 | Insufficient permissions |
| `NotFoundException` | 404 | Resource not found |
| `ConflictException` | 409 | Duplicate resource, concurrent modification |
| `UnprocessableEntityException` | 422 | Semantic validation errors |
| `InternalServerErrorException` | 500 | Unexpected server errors (use sparingly) |
| `ServiceUnavailableException` | 503 | External service failures |

**Example - Event Class Validation:**
```typescript
// Source: apps/backend/src/modules/projects/events/project.events.ts
// BEFORE: Bare throw
constructor(data: Partial<ProjectTaskCreatedEvent>) {
  super(data);
  if (!data.taskId) {
    throw new Error("ProjectTaskCreatedEvent requires taskId");  // BAD
  }
}

// AFTER: Typed exception (for HTTP context) or remain as Error (for internal validation)
// Note: Event constructors are internal validation, not HTTP requests.
// For events, keep Error but ensure handlers have try-catch.
// For services/controllers, use:
import { BadRequestException } from '@nestjs/common';

if (!dto.taskId) {
  throw new BadRequestException('Task ID is required');  // GOOD
}
```

### Pattern 2: Global Exception Filter Registration

**What:** Register filters globally in `main.ts` so ALL exceptions flow through them.

**Current state:** Filters exist but are not registered.

**Required change in `main.ts`:**
```typescript
// Source: NestJS official docs - https://docs.nestjs.com/exception-filters
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Register global exception filters
  // Order matters: Sentry captures first, then HttpExceptionFilter formats response
  const httpAdapter = app.getHttpAdapter();
  app.useGlobalFilters(
    new SentryExceptionFilter(httpAdapter),
    new HttpExceptionFilter(),
  );

  // ... rest of bootstrap
}
```

### Pattern 3: Audit Failure Counting with Threshold Alerting

**What:** Track consecutive audit failures and emit an alert event after threshold.

**Example implementation:**
```typescript
// apps/backend/src/modules/audit/audit.service.ts
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private consecutiveFailures = 0;
  private readonly FAILURE_THRESHOLD = 5;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async log(dto: CreateAuditLogDto): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: { /* ... */ } });
      this.consecutiveFailures = 0;  // Reset on success
      this.logger.debug(`Audit log created: ${dto.entityType}/${dto.entityId}`);
    } catch (error) {
      this.consecutiveFailures++;
      this.logger.error(
        `Audit log failure (${this.consecutiveFailures}/${this.FAILURE_THRESHOLD}): ${error instanceof Error ? error.message : 'Unknown'}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
        this.eventEmitter.emit('monitoring.alert', {
          type: 'AUDIT_TRAIL_GAP',
          message: `${this.FAILURE_THRESHOLD} consecutive audit log failures`,
          severity: 'CRITICAL',
          context: { lastError: error instanceof Error ? error.message : 'Unknown' },
        });
        // Reset to avoid alert flooding
        this.consecutiveFailures = 0;
      }
    }
  }
}
```

### Pattern 4: Safe Attachment Deletion (Abort on Storage Failure)

**What:** Only delete DB record if storage deletion succeeds or file is already gone.

**Example implementation:**
```typescript
// apps/backend/src/modules/attachments/attachments.service.ts
async delete(id: string, organizationId: string, userId: string): Promise<void> {
  const attachment = await this.prisma.attachment.findFirst({
    where: { id, organizationId },
  });

  if (!attachment) {
    throw new NotFoundException('Attachment not found');
  }

  // 1. Attempt storage deletion FIRST
  try {
    await this.storageService.delete(attachment.fileKey);
  } catch (error) {
    // Only allow deletion if file was already missing (404/NotFound)
    const isNotFound = error instanceof NotFoundException ||
      (error instanceof Error && error.message.includes('not found'));

    if (!isNotFound) {
      this.logger.error(
        `Storage deletion failed for ${attachment.fileKey}; aborting DB deletion to prevent orphan`,
        error,
      );
      throw new InternalServerErrorException(
        'Failed to delete file from storage. Please try again.',
      );
    }
    // File already missing - proceed with DB cleanup
    this.logger.warn(`File ${attachment.fileKey} already missing from storage`);
  }

  // 2. Only delete DB record after storage succeeds (or file was already gone)
  await this.prisma.attachment.delete({ where: { id } });

  // 3. Log activity (existing code)
}
```

### Pattern 5: Next.js Error Boundary per Route Segment

**What:** Create `error.tsx` files in each top-level route segment under `(authenticated)`.

**Required locations (16 route segments):**
```
apps/frontend/src/app/
├── (authenticated)/
│   ├── error.tsx              # Catch-all for authenticated routes
│   ├── analytics/error.tsx
│   ├── campaigns/error.tsx
│   ├── cases/
│   │   ├── error.tsx          # Already exists for [id], add for /cases root
│   │   └── [id]/error.tsx     # EXISTS
│   ├── dashboard/error.tsx
│   ├── disclosures/error.tsx
│   ├── forms/error.tsx
│   ├── help/error.tsx
│   ├── intake-forms/error.tsx
│   ├── investigations/error.tsx
│   ├── my-work/error.tsx
│   ├── notifications/error.tsx
│   ├── policies/error.tsx
│   ├── profile/error.tsx
│   ├── projects/error.tsx
│   ├── reports/error.tsx
│   ├── search/error.tsx
│   └── settings/error.tsx
├── ethics/[tenant]/error.tsx   # Public ethics portal
├── employee/error.tsx          # Employee portal
├── internal/error.tsx          # Internal tools
├── operator/error.tsx          # Operator console
└── global-error.tsx            # Root layout errors
```

**Reusable error component template:**
```typescript
// Source: Next.js docs - https://nextjs.org/docs/app/api-reference/file-conventions/error
'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RouteErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RouteError({ error, reset }: RouteErrorProps) {
  useEffect(() => {
    // Log to error reporting service (Sentry already set up)
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
      <p className="text-muted-foreground mb-6 text-center max-w-md">
        {error.message || 'An unexpected error occurred. Please try again.'}
      </p>
      {error.digest && (
        <p className="text-xs text-muted-foreground mb-4">
          Error ID: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <Button onClick={reset} variant="default">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    </div>
  );
}
```

### Pattern 6: Offline Draft Decryption Failure Flag

**What:** Return a `_decryptionFailed` flag when decryption fails so UI can display error.

**Example implementation:**
```typescript
// apps/frontend/src/lib/ethics-offline-db.ts
interface DecryptedDraft extends ReportDraft {
  _decryptionFailed?: boolean;
}

decryptDraft(draft: ReportDraft): DecryptedDraft {
  if (!this.encryptionKey) {
    throw new Error('Encryption not initialized');
  }

  try {
    return {
      ...draft,
      content: JSON.parse(
        decryptValue(draft.content as unknown as string, this.encryptionKey)
      ),
      attachments: JSON.parse(
        decryptValue(draft.attachments as unknown as string, this.encryptionKey)
      ),
    };
  } catch (error) {
    console.error('Draft decryption failed:', error);
    // Return marker flag so UI can show error message
    return {
      ...draft,
      content: {},
      attachments: [],
      _decryptionFailed: true,
    };
  }
}
```

**UI handling:**
```typescript
// In component using useAutoSaveDraft
const draft = await loadDraft();
if (draft?._decryptionFailed) {
  toast.error(
    'Unable to recover your saved draft. The encryption key may have changed.',
    { duration: 10000 }
  );
}
```

### Pattern 7: Auth Logout Failure Logging

**What:** Log server-side logout failures to console.warn (not swallow completely).

**Example implementation:**
```typescript
// apps/frontend/src/contexts/auth-context.tsx
const logout = useCallback(async () => {
  try {
    await apiClient.post('/auth/logout');
  } catch (error) {
    // Log failure - tokens may remain valid server-side
    console.warn(
      'Server-side session invalidation failed. Session may remain active.',
      error instanceof Error ? error.message : error,
    );
  } finally {
    // Always clear local state
    authStorage.clearAll();
    setState({ /* ... */ });
  }
}, []);
```

### Pattern 8: Auth Storage Corruption Handling

**What:** Log and clear corrupted localStorage entries.

**Example implementation:**
```typescript
// apps/frontend/src/lib/auth-storage.ts
getUser<T>(): T | null {
  if (typeof window === 'undefined') return null;

  const user = localStorage.getItem(TOKEN_KEYS.USER);
  if (!user) return null;

  try {
    return JSON.parse(user) as T;
  } catch (error) {
    // Log corruption and clean up
    console.warn(
      'Corrupted user data in localStorage. Clearing auth state.',
      { key: TOKEN_KEYS.USER, error },
    );
    // Clean up corrupted entry
    localStorage.removeItem(TOKEN_KEYS.USER);
    return null;
  }
}
```

### Pattern 9: AI Provider Registry Error Logging

**What:** Log errors with provider name before returning null.

**Example implementation:**
```typescript
// apps/backend/src/modules/ai/services/provider-registry.service.ts
tryGetProvider(name?: string): AIProvider | null {
  const providerName = name || this.defaultProviderName;

  try {
    return this.getProvider(providerName);
  } catch (error) {
    this.logger.error(
      `Failed to get AI provider '${providerName}': ${error instanceof Error ? error.message : 'Unknown error'}`,
      error instanceof Error ? error.stack : undefined,
    );
    return null;
  }
}
```

### Pattern 10: Async Event Handler Error Boundaries

**What:** Wrap async event handlers in try-catch to log errors.

**Example implementation:**
```typescript
// apps/backend/src/modules/audit/handlers/case-audit.handler.ts
@OnEvent('case.created', { async: true })
async handleCaseCreated(event: CaseCreatedEvent): Promise<void> {
  try {
    this.logger.debug(`Handling case.created for ${event.caseId}`);

    const description = await this.descriptionService.buildCaseCreatedDescription({
      actorUserId: event.actorUserId,
      caseId: event.caseId,
      referenceNumber: event.referenceNumber,
      sourceChannel: event.sourceChannel,
    });

    await this.auditService.log({ /* ... */ });
  } catch (error) {
    // Log but don't rethrow - async handlers are fire-and-forget
    this.logger.error(
      `Failed to handle case.created event for ${event.caseId}: ${error instanceof Error ? error.message : 'Unknown'}`,
      error instanceof Error ? error.stack : undefined,
    );
    // Optionally emit monitoring event for handler failures
  }
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP error responses | Custom error classes | NestJS built-in exceptions | Filter-aware, consistent format |
| Error tracking | Custom logging aggregation | Sentry (already integrated) | Production-ready, alerting built-in |
| React error boundaries | Class-based ErrorBoundary | Next.js `error.tsx` convention | Framework-native, better DX |
| Retry logic | Custom retry library | Simple counter pattern | Audit only needs threshold alerting |

**Key insight:** The codebase already has the correct infrastructure (filters, Sentry, one error boundary). The work is wiring them properly and extending patterns consistently.

## Common Pitfalls

### Pitfall 1: Registering Filters in Wrong Order

**What goes wrong:** Sentry captures errors AFTER HttpExceptionFilter transforms them, losing original stack trace.
**Why it happens:** Filter execution order is first-registered, last-executed.
**How to avoid:** Register SentryExceptionFilter FIRST (so it executes last, after response is built but before sending).
**Warning signs:** Sentry shows generic "Internal Server Error" messages instead of actual exceptions.

### Pitfall 2: Bare Throw in Event Constructors

**What goes wrong:** Event constructor throws bare `Error`, which doesn't flow through HTTP filters.
**Why it happens:** Events are internal objects, not HTTP requests.
**How to avoid:** Keep `throw new Error()` in event constructors (they're validation), but wrap event emission and handlers in try-catch.
**Warning signs:** Unhandled promise rejections from event emission.

### Pitfall 3: Missing `'use client'` in error.tsx

**What goes wrong:** Error boundary doesn't render; app crashes completely.
**Why it happens:** Error boundaries must be client components in Next.js App Router.
**How to avoid:** Always include `'use client'` directive at top of error.tsx files.
**Warning signs:** Server-side rendering error about useState/useEffect in error component.

### Pitfall 4: Swallowing Auth Errors Completely

**What goes wrong:** User appears logged out but tokens remain valid server-side (security risk).
**Why it happens:** Silently catching logout errors to provide "smooth" UX.
**How to avoid:** Log failures to console.warn; optionally show subtle notification.
**Warning signs:** Users report still being logged in after logout on other devices.

### Pitfall 5: Deleting DB Record Before Storage

**What goes wrong:** Storage deletion fails, but DB record is already gone = orphaned file.
**Why it happens:** "Optimistic" deletion pattern assumes storage never fails.
**How to avoid:** Delete storage FIRST, then DB record only on success (or file-already-missing).
**Warning signs:** Growing storage costs, compliance issues with untracked sensitive files.

## Code Examples

### Example 1: Complete main.ts with Global Filters

```typescript
// apps/backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import pino from 'pino';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  // Security
  app.use(helmet());

  // Global exception filters (order matters: Sentry first, HttpException second)
  const httpAdapter = app.getHttpAdapter();
  app.useGlobalFilters(
    new SentryExceptionFilter(httpAdapter),
    new HttpExceptionFilter(),
  );

  // Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // ... rest of bootstrap
}
```

### Example 2: HttpExceptionFilter with Non-Error Logging

```typescript
// apps/backend/src/common/filters/http-exception.filter.ts
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    // ... existing code for HttpException and Error ...

    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      // ADD: Log non-Error exceptions that would otherwise be lost
      this.logger.error(
        `Non-Error exception caught: ${typeof exception}`,
        JSON.stringify(exception),
      );
    }

    // ... rest of method
  }
}
```

### Example 3: Safe Storage Event Emission

```typescript
// apps/backend/src/modules/storage/storage.service.ts
if (this.documentProcessing.isExtractable(params.contentType)) {
  // Wrap async event emission to catch handler rejections
  this.eventEmitter
    .emitAsync('file.uploaded', {
      organizationId: params.organizationId,
      attachmentId: attachment.id,
      fileKey: fileKey,
      contentType: params.contentType,
      fileName: params.fileName,
    })
    .catch((error) => {
      // Log but don't fail the upload
      this.logger.warn(
        `Async handler failed for file.uploaded event (attachment: ${attachment.id}): ${error instanceof Error ? error.message : 'Unknown'}`,
        error instanceof Error ? error.stack : undefined,
      );
    });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Class-based Error Boundaries | Next.js `error.tsx` convention | Next.js 13 (2022) | Simpler, file-based, automatic wrapping |
| Manual Sentry capture | `@Catch()` filter integration | Sentry 7.x | Automatic capture with context |
| `throw new Error()` | NestJS typed exceptions | NestJS best practice | Filter-aware, structured responses |

**Deprecated/outdated:**
- Manual `try-catch` around every controller method: Use global filters instead
- Custom exception class hierarchies: Use NestJS built-in exceptions

## Open Questions

1. **Monitoring Alert Event Handler**
   - What we know: AuditService should emit `monitoring.alert` events after failure threshold
   - What's unclear: Where do these events get consumed? Is there an existing monitoring handler?
   - Recommendation: Check for existing monitoring infrastructure; if none, log to console.error with `[ALERT]` prefix for now

2. **Global Error Boundary Coverage**
   - What we know: Need `global-error.tsx` for root layout errors
   - What's unclear: Does the app have critical dependencies in root layout that could fail?
   - Recommendation: Create `global-error.tsx` as a safety net; it should be rarely triggered

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** - Direct review of existing filters, error boundaries, and error handling patterns
- **Next.js Official Docs** - https://nextjs.org/docs/app/api-reference/file-conventions/error (v16.1.6, 2026-02-11)
- **UNIFIED-AUDIT-REPORT.md** - Specific findings C3, H7, H8, H9, H10, H11, H12, M6, M11, M12

### Secondary (MEDIUM confidence)
- **NestJS Exception Filters** - https://docs.nestjs.com/exception-filters (WebSearch results confirmed patterns)
- **Better Stack Community** - https://betterstack.com/community/guides/scaling-nodejs/error-handling-nestjs/

### Tertiary (LOW confidence)
- None - all patterns verified against existing codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Using existing NestJS/Next.js built-ins already in codebase
- Architecture patterns: HIGH - Extending existing patterns (filters, error.tsx)
- Pitfalls: HIGH - Based on actual audit findings from codebase review

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days - stable patterns, no breaking changes expected)

---

## Appendix: Files to Modify by Requirement

| Requirement | Files to Modify | Pattern |
|-------------|-----------------|---------|
| ERR-01 | Top 10 `throw new Error()` files | Pattern 1 |
| ERR-02 | `audit.service.ts` | Pattern 3 |
| ERR-03 | `attachments.service.ts` | Pattern 4 |
| ERR-04 | `ethics-offline-db.ts`, consuming hooks | Pattern 6 |
| ERR-05 | 16 route segments + `global-error.tsx` | Pattern 5 |
| ERR-06 | `auth-context.tsx` | Pattern 7 |
| ERR-07 | `auth-storage.ts` | Pattern 8 |
| ERR-08 | `provider-registry.service.ts` | Pattern 9 |
| ERR-09 | `case-audit.handler.ts` + other async handlers | Pattern 10 |

**Top 10 files with bare `throw new Error()` (from audit):**
1. `project.events.ts` - 18 instances
2. `sla.events.ts` - 15 instances
3. `policy.events.ts` - 12 instances
4. `case.events.ts` - 11 instances
5. `investigation.events.ts` - 10 instances
6. Various other event files and services

**Note:** Event class constructor validation (`throw new Error()`) is appropriate - these are internal consistency checks, not HTTP responses. The fix is to wrap event emission and handlers in try-catch, not change the event constructors.
