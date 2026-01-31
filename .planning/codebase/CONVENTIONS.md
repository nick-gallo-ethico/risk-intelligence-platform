# Coding Conventions

**Analysis Date:** 2026-01-30

## Naming Patterns

**Files:**
- Services: `{entity}.service.ts` (e.g., `cases.service.ts`)
- Controllers: `{entity}.controller.ts` (e.g., `cases.controller.ts`)
- Modules: `{entity}.module.ts` (e.g., `cases.module.ts`)
- DTOs: Grouped in `dto/` directory with pattern `create-{entity}.dto.ts`, `update-{entity}.dto.ts`, `{entity}-query.dto.ts`
- Tests: `{entity}.spec.ts` (unit) or `{entity}.e2e-spec.ts` (E2E)
- Components (frontend): `{component-name}.tsx` with corresponding `__tests__/{component-name}.test.tsx`
- React custom hooks: `use{FeatureName}.ts` in `/hooks` directory
- UI components: `/components/ui/{component}.tsx` (shadcn/ui based)

**Functions:**
- Use camelCase for all function names
- Service methods follow CRUD pattern: `create()`, `findAll()`, `findOne()`, `update()`, `remove()`
- Async methods must return typed Promise (e.g., `Promise<Case>` not just `Promise<any>`)
- Private helpers prefixed with underscore: `_isValidTransition()`, `_generateReferenceNumber()`

**Variables:**
- Use camelCase: `organizationId`, `userId`, `caseData`
- Constants use SCREAMING_SNAKE_CASE: `MAX_FILE_SIZE`, `DEFAULT_PAGE_LIMIT`
- Color maps and lookup tables: `STATUS_COLORS`, `SEVERITY_COLORS` (PascalCase for Record types)
- Boolean prefixes: `isLoading`, `hasAccess`, `canDelete`

**Types:**
- Interfaces: PascalCase with `I` prefix discouraged (just use name directly)
- Example: `interface User { }` not `interface IUser { }`
- Enums: PascalCase with values in SCREAMING_SNAKE_CASE
- Example: `enum CaseStatus { DRAFT = 'DRAFT', ACTIVE = 'ACTIVE' }`
- DTO names: `Create{Entity}Dto`, `Update{Entity}Dto`, `{Entity}QueryDto`, `{Entity}ResponseDto`
- Prisma types imported directly: `import type { Case, CaseStatus } from '@prisma/client'`

## Code Style

**Formatting:**
- Tool: Prettier 3.2.2
- Configured via lint-staged in `package.json`
- Line length: No explicit limit configured (Prettier default ~80 for prose, flexible for code)
- Indentation: 2 spaces (Prettier default)
- Trailing commas: ES5 (trailing commas everywhere valid)
- Quotes: Single quotes (Prettier default) except JSX attributes use double quotes

**Linting:**
- Tool: ESLint 8.56.0 with TypeScript parser
- Config: `apps/backend/.eslintrc.js` and `apps/frontend/.eslintrc.json`
- Key rules enabled:
  - `@typescript-eslint/no-explicit-any`: WARN (discouraged but allowed in some cases)
  - `@typescript-eslint/no-unused-vars`: WARN with `argsIgnorePattern: '^_'` (unused params starting with `_` allowed)
  - `@typescript-eslint/explicit-function-return-type`: OFF (return types inferred)
  - `@typescript-eslint/no-namespace`: OFF (allowed for Express augmentation)
- Pre-commit: lint-staged runs `eslint --fix` and `prettier --write` on staged files

**Backend TypeScript Strictness:**
- `strict: true` in `tsconfig.json`
- `strictNullChecks: true` (null/undefined must be explicitly handled)
- `noImplicitAny: true` (types must be explicit, no `any` without annotation)
- Target: ES2021

**Frontend TypeScript:**
- `strict: true` in `tsconfig.json`
- Target: ES2017 with `lib: ["dom", "dom.iterable", "esnext"]`
- JSX mode: `preserve` (Next.js handles transformation)

## Import Organization

**Order:**
1. External libraries (node standard library, npm packages): `import { Logger } from '@nestjs/common'`
2. Prisma and ORM: `import { PrismaService } from '../modules/prisma/prisma.service'`
3. Local absolute imports (using path aliases): `import { AuthGuard } from '@common/guards/auth.guard'`
4. Relative imports (parent/sibling): `import { CaseStatus } from '../entities/case.entity'`
5. Type imports at bottom: `import type { User } from '@prisma/client'`

**Path Aliases (Backend):**
- `@/*` → `src/`
- `@common/*` → `src/common/` (Guards, decorators, interceptors, filters, services)
- `@modules/*` → `src/modules/` (Feature modules)
- `@config/*` → `src/config/` (Configuration)

**Path Aliases (Frontend):**
- `@/*` → `src/`
- `@/components/*` → `src/components/`
- `@/lib/*` → `src/lib/` (Utilities, helpers, constants)

**Example Backend:**
```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@modules/prisma/prisma.service';
import { ActivityService } from '@common/services/activity.service';
import type { Case } from '@prisma/client';
```

**Example Frontend:**
```typescript
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { caseApi } from '@/lib/api/cases';
import type { Case } from '@/types/case';
```

## Error Handling

**Patterns:**
- Use NestJS exception classes: `NotFoundException`, `BadRequestException`, `ForbiddenException`, `ConflictException`
- Always provide meaningful error messages with context
- Log errors with Logger before throwing (except expected validation errors)
- Return 404 for both "not found" AND "resource exists but user doesn't have access" (prevents enumeration attacks)

**Backend Service Pattern:**
```typescript
async findOne(id: string, organizationId: string): Promise<Case> {
  const entity = await this.prisma.case.findFirst({
    where: { id, organizationId }, // Must include org filter
  });

  if (!entity) {
    throw new NotFoundException('Resource not found'); // 404 for both missing/forbidden
  }

  return entity;
}
```

**Backend Controller Pattern:**
```typescript
@Get(':id')
async findOne(
  @Param('id', ParseUUIDPipe) id: string, // Validates UUID format
  @TenantId() organizationId: string,
): Promise<CaseResponseDto> {
  return this.service.findOne(id, organizationId);
}
```

**Frontend Error Handling:**
```typescript
try {
  const data = await api.cases.get(id);
  setCase(data);
} catch (error) {
  if (error instanceof AxiosError && error.response?.status === 404) {
    // Handle not found
  }
  toast.error('Failed to load case');
}
```

## Logging

**Framework:** Pino (backend) with pino-http, console-based (frontend)

**Backend Patterns:**
- Inject Logger in each service: `private readonly logger = new Logger(ServiceName.name)`
- Use debug level for operational info: `this.logger.debug('Creating case for org ${organizationId}')`
- Use error level for exceptions: `this.logger.error('Failed to process payment', error)`
- Never log sensitive data (passwords, tokens, SSN)
- Log activity mutations via ActivityService (not direct Logger)

**Frontend Patterns:**
- Use `console.error()` for errors
- Use `console.warn()` for warnings
- Use `console.log()` sparingly, prefer Sentry/error tracking
- Use `console.debug()` for development-only logging

## Comments

**When to Comment:**
- Complex business logic (state machines, validation rules)
- Non-obvious design decisions
- Security-critical sections (tenant isolation, auth)
- Temporary workarounds (include FIXME/TODO with context)
- DON'T comment obvious code (`const x = 5; // set x to 5`)

**JSDoc/TSDoc:**
- Use JSDoc for public service methods and API endpoints
- Include parameter types, return type, and description
- Include `@example` for complex operations

**Pattern:**
```typescript
/**
 * Transitions case to a new status with state machine validation.
 * Only valid transitions are allowed (e.g., DRAFT -> OPEN, OPEN -> CLOSED).
 *
 * @param id - Case UUID
 * @param newStatus - Target status
 * @param rationale - Human-readable reason for transition (required for audit)
 * @param userId - User performing transition
 * @param organizationId - Tenant ID
 * @returns Updated case
 * @throws ForbiddenException if transition not allowed
 *
 * @example
 * const updated = await service.changeStatus(
 *   caseId,
 *   'CLOSED',
 *   'Investigation complete',
 *   userId,
 *   orgId,
 * );
 */
async changeStatus(
  id: string,
  newStatus: CaseStatus,
  rationale: string,
  userId: string,
  organizationId: string,
): Promise<Case> {
  // implementation
}
```

## Function Design

**Size:**
- Keep functions under 50 lines (prefer under 30)
- If a function does multiple distinct things, split it
- Helper methods (private) can be used to break up logic

**Parameters:**
- Max 3-4 parameters; use objects for more
- DTOs for input: `create(dto: CreateCaseDto, userId: string, orgId: string)`
- Query objects for optional filtering: `findAll(query: CaseQueryDto, orgId: string)`
- Always include `organizationId` as parameter (never derive from request)
- Always include `userId` when tracking who made change

**Return Values:**
- Use typed returns, no `any` or implicit `unknown`
- Return entities/DTOs from services, not raw Prisma models (except for testing)
- Use `Promise<T>` for async functions
- Return `void` for operations with side effects only (e.g., delete)
- Return pagination object for list operations: `{ items: [], pagination: { page, limit, total, totalPages } }`

**Pattern:**
```typescript
// GOOD: Clear parameters, focused purpose
async findByCategory(
  categoryId: string,
  options: { organizationId: string; page?: number; limit?: number },
): Promise<{ items: Case[]; pagination: PaginationMeta }> {
  const { page = 1, limit = 20, organizationId } = options;
  // implementation
}

// AVOID: Too many parameters
async find(id, org, page, limit, sort, filter, includeDeleted, userId) {
  // Too many params, use object pattern above
}
```

## Module Design

**Exports:**
- Each module exports barrel file (`index.ts`) with public API
- Export service, controller, module only
- Don't export internal utilities
- Pattern:
  ```typescript
  // src/modules/cases/index.ts
  export * from './cases.service';
  export * from './cases.controller';
  export * from './cases.module';
  export * from './dto';
  ```

**Barrel Files:**
- Use for organizing DTOs: `src/modules/cases/dto/index.ts`
  ```typescript
  export * from './create-case.dto';
  export * from './update-case.dto';
  export * from './case-query.dto';
  ```
- Use for UI components: `src/components/ui/index.ts`
- Reduces import paths: `import { Button, Card } from '@/components/ui'`

**Module Dependency Injection:**
- Import modules in imports array: `imports: [PrismaModule, ActivityModule]`
- Inject services via constructor: `constructor(private prisma: PrismaService)`
- Use `forRoot()` for configuration at root module level

## Multi-Tenancy Critical Pattern

**EVERY data access must include organizationId:**
- All Prisma queries must filter by `organizationId`
- All cache keys must include tenant: `org:${organizationId}:resource:${id}`
- All service methods receive `organizationId` as parameter
- Never trust client input for organizationId; extract from JWT only

**Pattern in Service:**
```typescript
async findAll(
  organizationId: string, // From JWT via decorator
  options?: { page?: number },
): Promise<{ items: Case[] }> {
  // CRITICAL: Always filter by organizationId
  const items = await this.prisma.case.findMany({
    where: { organizationId }, // Explicit tenant filter
    skip: (options?.page ?? 1 - 1) * 20,
    take: 20,
  });

  return { items };
}
```

**Pattern in Controller:**
```typescript
@Get()
async findAll(
  @Query() query: CaseQueryDto,
  @TenantId() organizationId: string, // From decorator, not body
): Promise<CaseListResponseDto> {
  return this.service.findAll(organizationId, {
    page: query.page,
  });
}
```

## Activity Logging Pattern

**Every mutation must log activity:**
- CREATE: `action: 'created'`, include entity identifier
- UPDATE: `action: 'updated'`, include old and new values
- DELETE: `action: 'deleted'`, use soft delete
- STATUS_CHANGE: `action: 'status_changed'`, include rationale

**Pattern:**
```typescript
const entity = await this.prisma.case.create({ data });

await this.activityService.log({
  entityType: AuditEntityType.CASE,
  entityId: entity.id,
  action: 'created',
  actionDescription: `Created case ${entity.referenceNumber}`, // Natural language
  actorUserId: userId,
  organizationId,
  metadata: { sourceChannel: dto.sourceChannel },
});
```

---

*Convention analysis: 2026-01-30*
