# Coding Conventions

**Analysis Date:** 2026-02-02

## Naming Patterns

**Files:**
- Services: PascalCase + `.service.ts` (e.g., `activity.service.ts`)
- Controllers: PascalCase + `.controller.ts` (e.g., `activity.controller.ts`)
- Guards: PascalCase + `.guard.ts` (e.g., `jwt-auth.guard.ts`)
- Decorators: kebab-case + `.decorator.ts` (e.g., `current-user.decorator.ts`)
- DTOs: PascalCase + `.dto.ts` (e.g., `create-activity.dto.ts`)
- Tests: filename + `.spec.ts` (unit) or `.e2e-spec.ts` (e2e)
- Frontend components: PascalCase (e.g., `CaseCreationForm.tsx`, `case-creation-form.tsx`)
- Frontend hooks: `use` prefix in camelCase (e.g., `useCaseFormDraft.ts`)
- Frontend pages: kebab-case in directories with `page.tsx` (e.g., `/cases/[id]/page.tsx`)

**Functions:**
- camelCase for all functions and methods
- PascalCase for React functional components
- Prefix private methods with underscore: `_generateUpdatedDescription()`
- Prefix test functions with descriptive words: `generateSummaryFor()` for factory functions

**Variables:**
- camelCase for all variables and constants
- UPPER_SNAKE_CASE for true constants (rarely used; prefer `const` declarations)
- Use descriptive names: `mockOrganizationId` instead of `orgId` in tests
- Test data objects: `mock*` prefix (e.g., `mockUser`, `mockAuditLog`, `mockCase`)

**Types and Interfaces:**
- PascalCase for all TypeScript types and interfaces
- Prefix DTOs with scope: `CreateActivityDto`, `ActivityQueryDto`, `ActivityListResponseDto`
- Prefix interfaces with "I" only for abstract contracts (not for data types)
- Entity types match Prisma schema: `User`, `Case`, `AuditLog`, `Organization`

**Enums:**
- PascalCase with UPPER_SNAKE_CASE values
- Stored in Prisma schema (`@prisma/client` exports)
- Example: `AuditEntityType.CASE`, `AuditActionCategory.UPDATE`, `ActorType.USER`

## Code Style

**Formatting:**
- Prettier 3.2.2 for auto-formatting
- Max line length: default (80 chars enforced by lint-staged)
- Indentation: 2 spaces
- Quotes: single quotes in TypeScript, JSX attributes can use double quotes
- Semicolons: required at end of statements

**Linting:**
- Backend: ESLint with `@typescript-eslint` plugin
- Frontend: Next.js ESLint config
- Applied via lint-staged on git commit for staged files
- Run manually: `npm run lint` (applies `--fix`)

**ESLint Rules (Backend):**
- `@typescript-eslint/no-explicit-any`: warn (allowed with explicit reasoning)
- `@typescript-eslint/no-unused-vars`: warn with `argsIgnorePattern: '^_'` (allow unused args with `_` prefix)
- `@typescript-eslint/no-namespace`: off (allowed for Express augmentation)
- `@typescript-eslint/explicit-function-return-type`: off (inferred from context)
- Interface name prefix requirement: off (no `I` prefix required)

**Type Checking:**
- Run: `npm run typecheck`
- Backend: TypeScript 5.3.3 with strict mode enabled
- Frontend: TypeScript 5.3.3 with strict mode, `noEmit` flag
- All decorators required: `"experimentalDecorators": true`, `"emitDecoratorMetadata": true`

## Import Organization

**Order:**
1. External packages (`@nestjs/*`, `react`, third-party libraries)
2. Absolute path imports (using path aliases like `@/*`)
3. Relative imports (`../`, `./`)
4. Blank line between groups

**Path Aliases:**

Backend (`@` prefix):
```typescript
import { PrismaService } from '@modules/prisma/prisma.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CreateActivityDto } from '@common/dto';
import configuration from '@config/configuration';
```

Frontend (`@` prefix):
```typescript
import { Button } from '@/components/ui/button';
import { caseCreationSchema } from '@/lib/validations/case-schema';
import { casesApi } from '@/lib/cases-api';
import type { CreateCaseInput } from '@/types/case';
```

**Barrel Exports:**
- Use `index.ts` files to re-export public APIs
- Example: `@common/dto/index.ts` exports `CreateActivityDto`, `ActivityQueryDto`, etc.
- Keep barrel files minimal; only export what's needed by consumers

## Error Handling

**Patterns:**

Activity logging uses **non-blocking error handling** - errors logged but never thrown to caller:
```typescript
// In ActivityService.log()
try {
  await this.prisma.auditLog.create({ data: {...} });
} catch (error) {
  this.logger.error(`Failed to log activity: ${error.message}`, error.stack);
  // Do not throw - let operation complete
}
```

HTTP exceptions follow standardized format via `HttpExceptionFilter`:
```typescript
// Controller throws specific error
throw new BadRequestException('Validation failed');

// Filter catches and formats response
{
  "statusCode": 400,
  "timestamp": "2026-01-15T10:30:00.000Z",
  "path": "/api/v1/cases",
  "method": "POST",
  "message": "Validation failed",
  "error": "Bad Request"
}
```

Guard errors throw `UnauthorizedException`:
```typescript
// In JwtAuthGuard.handleRequest()
if (err || !user) {
  throw new UnauthorizedException('Invalid or expired token');
}
```

Custom exceptions use NestJS built-ins: `BadRequestException`, `UnauthorizedException`, `ForbiddenException`, `NotFoundException`.

## Logging

**Framework:** Pino 8.17.2 for backend, `console` for frontend

**Backend Patterns:**
```typescript
private readonly logger = new Logger(ActivityController.name);

// Debug: non-critical diagnostic info
this.logger.debug(`Fetching organization activity for org ${organizationId}`);

// Error: caught exceptions or degraded functionality
this.logger.error(`Unhandled exception: ${error.message}`, error.stack);
```

**Frontend Patterns:**
```typescript
// Warn: fallback behavior, draft save failures
console.warn('Failed to save draft:', error);

// Info: user-facing toasts via `sonner` library
toast.info('Draft found', { description: 'Would you like to restore?' });
```

**When to Log:**
- Do NOT log on every function entry/exit
- DO log before/after external service calls (API, database, storage)
- DO log errors with full stack traces
- DO log state changes that affect user experience
- DO NOT log sensitive data (passwords, tokens, PII)

## Comments

**When to Comment:**
- JSDoc for all public methods and classes
- Inline comments for non-obvious logic only (avoid stating the obvious)
- Use `// ` for single-line comments, `/* */` for block comments
- Never use old-style `/***/` comments

**JSDoc/TSDoc Style:**

Backend:
```typescript
/**
 * Generates a natural language description for an activity.
 *
 * @param context - The context containing all values for description generation
 * @returns A human-readable description string
 *
 * @example
 * ```typescript
 * generator.generate({ action: 'created', entityType: 'Case', actorName: 'John Doe' });
 * // => "John Doe created Case"
 * ```
 */
generate(context: DescriptionContext): string {
  // Implementation
}
```

Frontend:
```typescript
/**
 * Hook for persisting case creation form drafts to localStorage.
 *
 * Features:
 * - Auto-save every 30 seconds when data changes
 * - Restore draft on page load
 * - Clear draft on successful submit
 *
 * @param getFormData - Function to get current form values
 * @param enabled - Whether auto-save is enabled (default: true)
 */
export function useCaseFormDraft(...): UseCaseFormDraftReturn {
  // Implementation
}
```

Controllers and routes:
```typescript
/**
 * Get organization-wide activity (paginated).
 *
 * @route GET /api/v1/activity
 * @access Requires COMPLIANCE_OFFICER or SYSTEM_ADMIN role
 */
@Get()
@Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
async getOrganizationActivity(...): Promise<ActivityListResponseDto> {
  // Implementation
}
```

## Function Design

**Size:** Aim for 20-40 lines per function (hard limit: 100 lines)

**Parameters:**
- Max 3 positional parameters; use object destructuring for more:
  ```typescript
  // Good
  async log(input: LogActivityInput): Promise<void>

  // Avoid
  async log(entityType, entityId, action, description, organizationId, ...): Promise<void>
  ```

**Return Values:**
- Explicit return types on all public functions
- Use `Promise<T>` for async functions
- Return `void` for side-effect-only functions
- Throw exceptions rather than returning `null` or error objects

**Composition:**
- Prefer small, focused functions over god functions
- Extract multi-step logic into named helper methods
- Example: `_generateUpdatedDescription()` extracted from main `generate()` method

## Module Design

**Exports:**
- Use barrel files (`index.ts`) for module public API
- Example: `@common/index.ts` re-exports guards, decorators, services
- Only export types that consumers need

**NestJS Modules:**
- Follow feature-based structure: each feature gets own module
- Module name matches feature: `CasesModule` in `cases/` directory
- Each module has: `*.module.ts`, `*.service.ts`, `*.controller.ts`
- Share common functionality via `CommonModule` (activity, storage, auth)

**Frontend Modules:**
- Components live in `src/components/{feature}/`
- Hooks in `src/hooks/`
- Utilities in `src/lib/`
- Types in `src/types/`

## Organization-Specific Patterns

**Tenant Isolation:**
- Every table must have `organizationId` field
- All database queries filter by `organizationId`
- Cache keys prefixed: `org:{organizationId}:...`
- Elasticsearch indices: `org_{organizationId}_{type}`
- JWT token contains `organizationId` extracted by `TenantMiddleware`

**Activity/Audit Logging:**
- Every mutation must call `ActivityService.log()` with natural language `actionDescription`
- Activity logging never blocks main operation (non-blocking error handling)
- Actor names denormalized for efficiency
- Use standard action types: `created`, `updated`, `deleted`, `status_changed`, `assigned`, etc.

**Data Validation:**
- Backend: NestJS `class-validator` with DTOs
- Frontend: Zod schemas for form validation
- Always whitelist fields: `whitelist: true` in ValidationPipe
- Schema enums match Prisma schema enums

**Immutability Patterns:**
- RIUs (Risk Intelligence Units) are immutable after creation
- Corrections go on linked Case entity, not the RIU
- Use Prisma `@createdAt` for audit trail, no `updatedAt` on immutable entities

---

*Convention analysis: 2026-02-02*
