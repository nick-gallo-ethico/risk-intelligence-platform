# Phase 31: Code Quality & Performance - Research

**Researched:** 2026-02-14
**Domain:** Code refactoring, service architecture, frontend error handling, database optimization, JWT security
**Confidence:** HIGH (verified with official documentation and current codebase analysis)

## Summary

Phase 31 addresses code quality and performance issues identified in the Unified Audit Report. The phase involves eight distinct work areas: decomposing monolithic services, extracting a generic base class for association services, moving business logic from controllers to services, fixing hardcoded localhost URLs, implementing toast notifications for API errors, optimizing database connections, adding Elasticsearch circuit breakers, and implementing JWT RS256 with key rotation.

The current codebase has clear patterns already established (NestJS service/controller separation, Prisma ORM, Sonner for toast notifications in shadcn/ui). The refactoring work can follow these existing patterns. The most complex items are the JWT RS256 migration (requires coordination across frontend/backend) and the service decomposition (requires understanding domain boundaries).

**Primary recommendation:** Start with lower-risk items (compression, pool config, localhost URLs) to establish momentum, then tackle the architectural refactoring (service decomposition, base class extraction), and finish with the JWT migration as the final high-coordination item.

## Standard Stack

### Core (Already in Codebase)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/core | 10.x | Application framework | Already used throughout |
| @nestjs/jwt | Latest | JWT authentication | Already configured, supports RS256 |
| Prisma | 5.x/6.x | Database ORM | Already used, connection_limit configurable |
| compression | Latest | Response compression | Official NestJS recommendation |
| Sonner | Latest | Toast notifications | Official shadcn/ui component |

### Supporting (To Add)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| opossum | 8.x | Circuit breaker | Elasticsearch timeout/fallback |
| @nestjs-modules/mailer | -- | Already installed | -- |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| opossum | nestjs-circuit-breaker | opossum has 70K downloads/week, better documented |
| Sonner | react-hot-toast | Sonner is official shadcn/ui recommendation |
| RS256 | HS256 with rotation | RS256 allows public key distribution for microservices |

**Installation:**
```bash
# Backend (add to apps/backend)
npm install opossum @types/opossum compression @types/compression

# Frontend (if not already added)
npx shadcn@latest add sonner
```

## Architecture Patterns

### Recommended Service Decomposition Structure

For services exceeding 300 LOC, decompose by domain responsibility:

```
src/modules/analytics/reports/
├── report.service.ts              # Orchestration (< 300 LOC)
├── report-field-registry.service.ts  # DECOMPOSE into:
│   ├── registry/
│   │   ├── field-definition.service.ts    # Field metadata
│   │   ├── field-validation.service.ts    # Validation rules
│   │   └── field-computation.service.ts   # Computed fields
│   └── report-field-registry.service.ts   # Thin coordinator
```

### Pattern 1: Generic Base Association Service

**What:** Extract common CRUD, audit, and event logic into a generic base class
**When to use:** 4 association services share 70%+ identical code
**Example:**
```typescript
// Source: Current codebase analysis + TypeScript generics best practices

export interface AssociationConfig<
  TCreate,
  TEntity,
  TLabel extends string
> {
  entityName: string;        // 'PersonCase', 'CaseCase', etc.
  entityType: string;        // 'CASE', 'RIU', 'PERSON'
  eventPrefix: string;       // 'association.person-case'
  labelEnum: Record<string, TLabel>;
}

@Injectable()
export abstract class BaseAssociationService<
  TCreate,
  TEntity,
  TLabel extends string
> {
  protected abstract config: AssociationConfig<TCreate, TEntity, TLabel>;
  protected abstract prismaModel: any;

  constructor(
    protected prisma: PrismaService,
    protected eventEmitter: EventEmitter2,
    protected auditService: AuditService,
  ) {}

  async create(
    dto: TCreate,
    userId: string,
    organizationId: string,
  ): Promise<TEntity> {
    const association = await this.createEntity(dto, userId, organizationId);

    await this.emitCreatedEvent(association, organizationId);
    await this.logAuditCreate(association, userId, organizationId);

    return association;
  }

  protected abstract createEntity(
    dto: TCreate,
    userId: string,
    organizationId: string,
  ): Promise<TEntity>;

  // ... common findBy*, delete methods
}
```

### Pattern 2: Controller-to-Service Logic Extraction

**What:** Move business logic from controllers to services, keep controllers thin
**When to use:** Controllers > 200 LOC or containing branching/database logic
**Example:**
```typescript
// BEFORE: Business logic in controller (BAD)
@Post()
async createReport(@Body() dto, @CurrentUser() user) {
  // 50 lines of validation, transformation, conditional logic
  const fields = dto.fields.filter(f => this.isValidField(f));
  const computedData = await this.computeMetrics(fields);
  // ... more business logic
  return this.reportService.create({ ...dto, computedData });
}

// AFTER: Thin controller, service handles logic (GOOD)
@Post()
async createReport(@Body() dto, @CurrentUser() user) {
  return this.reportService.createWithValidation(dto, user.id, user.organizationId);
}
```

### Pattern 3: Circuit Breaker for Elasticsearch

**What:** Wrap ES calls in opossum circuit breaker with 5s timeout
**When to use:** Any external service call that can timeout or fail
**Example:**
```typescript
// Source: opossum documentation + NestJS integration patterns
import CircuitBreaker from 'opossum';

@Injectable()
export class SearchService implements OnModuleInit {
  private searchBreaker: CircuitBreaker;

  onModuleInit() {
    this.searchBreaker = new CircuitBreaker(
      (query: SearchQuery) => this.executeSearch(query),
      {
        timeout: 5000,              // 5 second timeout (was 30s)
        errorThresholdPercentage: 50,
        resetTimeout: 30000,        // Try again after 30s
        volumeThreshold: 5,         // Min requests before tripping
      }
    );

    this.searchBreaker.fallback(() => ({
      hits: [],
      total: 0,
      fallback: true,
      message: 'Search temporarily unavailable'
    }));
  }

  async search(query: SearchQuery) {
    return this.searchBreaker.fire(query);
  }
}
```

### Pattern 4: JWT RS256 Key Rotation

**What:** Migrate from HS256 to RS256 with key rotation support
**When to use:** Production JWT systems requiring key rotation
**Example:**
```typescript
// Source: @nestjs/jwt documentation + key rotation best practices
import { createPrivateKey, createPublicKey, KeyObject } from 'crypto';

interface JwtKeyPair {
  kid: string;          // Key ID for rotation
  privateKey: KeyObject;
  publicKey: KeyObject;
  createdAt: Date;
  expiresAt: Date;      // Keys valid until this date
}

@Injectable()
export class JwtKeyService {
  private currentKey: JwtKeyPair;
  private previousKey: JwtKeyPair | null = null;

  // Sign with current key
  getSigningKey(): { privateKey: KeyObject; kid: string } {
    return {
      privateKey: this.currentKey.privateKey,
      kid: this.currentKey.kid,
    };
  }

  // Verify with current or previous key (for rotation period)
  getVerificationKeys(): JwtKeyPair[] {
    const keys = [this.currentKey];
    if (this.previousKey && this.previousKey.expiresAt > new Date()) {
      keys.push(this.previousKey);
    }
    return keys;
  }
}

// JwtModule configuration with secretOrKeyProvider
JwtModule.registerAsync({
  useFactory: (keyService: JwtKeyService) => ({
    secretOrKeyProvider: (requestType, tokenOrPayload) => {
      if (requestType === JwtSecretRequestType.SIGN) {
        return keyService.getSigningKey().privateKey;
      }
      // VERIFY: return key matching kid from token header
      const kid = extractKidFromToken(tokenOrPayload);
      return keyService.getKeyById(kid)?.publicKey;
    },
    signOptions: { algorithm: 'RS256' },
  }),
  inject: [JwtKeyService],
})
```

### Anti-Patterns to Avoid

- **Breaking existing API contracts during refactoring:** Service decomposition must preserve existing method signatures
- **Hardcoding fallback values in production:** Circuit breaker fallbacks should still indicate failure mode to caller
- **Rotating keys without overlap period:** Always maintain previous key validity for token expiry duration
- **Moving ALL logic to services:** Simple passthrough validation/transformation can stay in DTOs/pipes

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Circuit breaker | Custom retry/timeout wrapper | opossum | State machine complexity, metrics, fallback handling |
| Response compression | Manual gzip in middleware | compression package | Handles content negotiation, streaming |
| Toast notifications | Custom notification system | Sonner | Animation, queue management, accessibility |
| Connection pooling | Custom pool manager | Prisma connection_limit + PgBouncer | Edge cases, leak detection |
| Key rotation scheduling | cron-based manual rotation | Automated rotation service | Security timing, overlap management |

**Key insight:** Each of these "simple" problems has edge cases (circuit half-open state, compression content-type detection, toast queue overflow, connection leak recovery) that libraries handle correctly.

## Common Pitfalls

### Pitfall 1: Service Decomposition Breaking Tests

**What goes wrong:** Splitting a service breaks existing tests that mock the whole service
**Why it happens:** Tests mock `ReportFieldRegistryService` directly, not its sub-services
**How to avoid:** Decompose the service AFTER tests exist (Phase 30), update mocks to target coordination service
**Warning signs:** Test failures after moving methods to sub-services

### Pitfall 2: Circuit Breaker Too Sensitive

**What goes wrong:** Circuit opens on transient failures, causing cascading degradation
**Why it happens:** Default thresholds (50% errors, 5 requests) may be too aggressive
**How to avoid:** Start with higher thresholds (70%, 10 requests), tune based on monitoring
**Warning signs:** Circuit opening frequently under normal load

### Pitfall 3: JWT Migration Token Invalidation

**What goes wrong:** All users forced to re-login when switching from HS256 to RS256
**Why it happens:** Old HS256 tokens can't be verified with RS256 keys
**How to avoid:** Dual-algorithm support during migration: verify HS256 OR RS256, sign only RS256
**Warning signs:** Mass logout events after deployment

### Pitfall 4: Console.error Grep Misses Dynamic Strings

**What goes wrong:** Searching for `console.error` misses template literals or aliased calls
**Why it happens:** `console.error(\`Error: ${msg}\`)` or `const log = console.error`
**How to avoid:** Use AST-based search or review manually; add ESLint rule to prevent future additions
**Warning signs:** Missing error notifications after "complete" migration

### Pitfall 5: Base Class Over-Abstraction

**What goes wrong:** Generic base class becomes too complex, harder to understand than duplicated code
**Why it happens:** Trying to handle all edge cases in one abstraction
**How to avoid:** Start with 80% common code, allow services to override for specific needs
**Warning signs:** Base class has more type parameters than methods

## Code Examples

### Example 1: Adding Response Compression

```typescript
// Source: NestJS official documentation + compression package docs
// File: apps/backend/src/main.ts

import compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Add compression middleware
  app.use(compression({
    threshold: 1024,  // Only compress responses > 1KB
    level: 6,         // Balanced compression level
  }));

  // ... rest of bootstrap
}
```

### Example 2: Prisma Connection Pool Configuration

```typescript
// Source: Prisma documentation
// File: apps/backend/prisma/schema.prisma or env variable

// Option A: In connection URL
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=50"

// Option B: With PgBouncer (recommended for production)
DATABASE_URL="postgresql://user:pass@pgbouncer:6432/db?connection_limit=50&pgbouncer=true"
```

### Example 3: Toast Notification Wrapper for API Errors

```typescript
// Source: Sonner documentation + shadcn/ui patterns
// File: apps/frontend/src/lib/api-with-toast.ts

import { toast } from 'sonner';
import { apiClient } from './api';

export const apiWithToast = {
  async post<T>(url: string, data?: unknown): Promise<T | null> {
    try {
      return await apiClient.post<T>(url, data);
    } catch (error) {
      const message = error?.response?.data?.message || 'An error occurred';
      toast.error(message);
      return null;
    }
  },

  // Or use toast.promise for loading states
  async mutate<T>(
    url: string,
    data: unknown,
    options: { loading?: string; success?: string; error?: string }
  ): Promise<T> {
    return toast.promise(
      apiClient.post<T>(url, data),
      {
        loading: options.loading || 'Saving...',
        success: options.success || 'Saved successfully',
        error: (err) => options.error || err?.response?.data?.message || 'Failed',
      }
    );
  },
};
```

### Example 4: Environment URL Configuration (Frontend)

```typescript
// Source: Next.js environment variable patterns
// File: apps/frontend/src/config/env.ts

export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  wsUrl: process.env.NEXT_PUBLIC_WS_URL,
} as const;

// Validate at build time
if (!config.apiUrl) {
  throw new Error('NEXT_PUBLIC_API_URL is required');
}

// Usage in components - NEVER hardcode localhost
const socket = io(config.wsUrl);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| HS256 static secret | RS256 with key rotation | Security best practice 2024+ | Enables key rotation without invalidation |
| Monolithic services | Vertical slice + sub-services | DDD maturity 2023+ | Better testability, maintainability |
| Manual retry logic | Circuit breaker pattern | Resilience engineering | Prevents cascade failures |
| `connection_limit=10` | 50-100 with PgBouncer | Scale requirements | Handles 10K+ concurrent users |
| `console.error` only | Toast + structured logging | UX maturity | Users see actionable errors |

**Deprecated/outdated:**
- `@nestjs/jwt` with raw secret strings: Use `KeyObject` instances for performance
- shadcn toast component: Deprecated in favor of Sonner
- Fixed 30s Elasticsearch timeout: Too generous, causes slow page loads

## Open Questions

1. **Key storage for RS256 rotation**
   - What we know: Keys need to be stored securely and rotated
   - What's unclear: Use Azure Key Vault (Phase 28 scope) or database? Environment variables for initial implementation?
   - Recommendation: Start with environment variables (PEM files), plan Key Vault integration separately

2. **Service decomposition boundaries**
   - What we know: Top 5 services exceed 300 LOC
   - What's unclear: Optimal split points without domain analysis
   - Recommendation: Split by distinct responsibilities visible in method names (validation vs. computation vs. orchestration)

3. **Toast notification scope**
   - What we know: 30+ components use console.error
   - What's unclear: Should ALL errors show toast, or only user-actionable ones?
   - Recommendation: Show toast for user actions (form submit, delete), not background operations (polling, prefetch)

## Sources

### Primary (HIGH confidence)
- NestJS JWT documentation - RS256 configuration, secretOrKeyProvider pattern
- Prisma documentation - Connection pool configuration, connection_limit
- shadcn/ui Sonner documentation - Toast API, installation
- opossum GitHub/npm - Circuit breaker API, configuration options
- Current codebase analysis - Existing patterns, service structure

### Secondary (MEDIUM confidence)
- [NestJS compression documentation](https://docs.nestjs.com/techniques/compression) - Package setup
- [Circuit Breaker Pattern in NestJS](https://medium.com/@Abdelrahman_Rezk/circuit-breaker-pattern-a-comprehensive-guide-with-nest-js-application-41300462d579) - Implementation patterns
- [TypeScript Generic Base Service patterns](https://medium.com/@kalebteshale72/build-a-generic-crud-service-in-nestjs-typeorm-postgres-dbeebf912fb6) - Generic class structure

### Tertiary (LOW confidence)
- Web search results for specific version recommendations - Should validate versions against package.json

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in codebase or official recommendations
- Architecture patterns: HIGH - Based on existing codebase analysis and established patterns
- Pitfalls: MEDIUM - Based on common patterns, some may not apply to this specific codebase
- JWT rotation: MEDIUM - Pattern is clear, but key storage strategy needs Phase 28 coordination

**Research date:** 2026-02-14
**Valid until:** 30 days (stable technologies, established patterns)

---

## Appendix: Current Codebase Metrics

### Services Requiring Decomposition (QUAL-01)

| Service | LOC | Location |
|---------|-----|----------|
| report-field-registry.service.ts | 1838 | modules/analytics/reports/ |
| rius.service.ts | 1410 | modules/rius/ |
| conflict-detection.service.ts | 1402 | modules/disclosures/ |
| disclosure-submission.service.ts | 1328 | modules/disclosures/ |
| cases.service.ts | ~1000+ | modules/cases/ |

### Controllers Requiring Logic Extraction (QUAL-03)

| Controller | LOC | Location |
|------------|-----|----------|
| report.controller.ts | 1085 | modules/analytics/reports/ |
| projects.controller.ts | 885 | modules/projects/ |
| cases.controller.ts | 614 | modules/cases/ |
| ai.controller.ts | 580 | modules/ai/ |

### Association Services for Base Class (QUAL-02)

| Service | LOC | Common Methods |
|---------|-----|----------------|
| person-case-association.service.ts | 421 | create, findBy*, remove, audit |
| case-case-association.service.ts | 346 | create, findBy*, delete, audit |
| person-person-association.service.ts | 425 | create, findBy*, delete, audit |
| person-riu-association.service.ts | 202 | create, findBy*, delete, audit |

### Frontend Files with Hardcoded localhost (QUAL-04)

8 files identified via grep:
- components/cases/ai-chat-panel.tsx
- lib/attachments-api.ts
- lib/api.ts (uses env fallback)
- app/page.tsx
- hooks/useEthicsPortalConfig.ts
- hooks/useReportStatus.ts
- components/ethics/tenant-theme-provider.tsx
- hooks/useTenantBranding.ts

### Frontend Components Using console.error (QUAL-05)

71 total occurrences across 40 files - see UNIFIED-AUDIT-REPORT.md M8 for complete list.
