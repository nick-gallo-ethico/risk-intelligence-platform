# Coding Conventions

**Analysis Date:** 2026-02-13

## Naming Patterns

**Files:**

- Services: `kebab-case.service.ts` (e.g., `investigation-notes.service.ts`, `activity.service.ts`)
- Controllers: `kebab-case.controller.ts` (e.g., `investigations.controller.ts`)
- DTOs: `kebab-case.dto.ts` (e.g., `chat-message.dto.ts`, `timeline-query.dto.ts`)
- Interfaces: `kebab-case.interface.ts` (e.g., `jwt-payload.interface.ts`)
- Guards: `kebab-case.guard.ts` (e.g., `jwt-auth.guard.ts`, `tenant.guard.ts`)
- Decorators: `kebab-case.decorator.ts` (e.g., `current-user.decorator.ts`)
- Middleware: `kebab-case.middleware.ts` (e.g., `tenant.middleware.ts`)
- Test files: `*.spec.ts` for unit tests, `*.e2e-spec.ts` for E2E tests

**Functions:**

- camelCase for all functions and methods
- Descriptive action verbs: `create()`, `findOne()`, `update()`, `assign()`, `transition()`
- Query methods: `findAll()`, `findOne()`, `findAllForCase()`
- Validation helpers: `isValidTransition()`, `getNextInvestigationNumber()`

**Variables:**

- camelCase for all variables
- Descriptive names: `existing`, `updated`, `newStatus`, `changedFields`
- Mock prefixes in tests: `mockOrgId`, `mockUserId`, `mockEntity`
- Constants in SCREAMING_SNAKE_CASE (rare, usually enums)

**Types:**

- PascalCase for classes, interfaces, enums, types
- DTOs: `CreateExampleDto`, `UpdateExampleDto`, `ExampleQueryDto`
- Services: `InvestigationsService`, `ActivityService`, `PrismaService`
- Interfaces: `LogActivityInput`, `AssignmentHistoryEntry`, `RequestUser`
- Enums: `ExampleStatus`, `MessageRole`, `UserRole`

**Class Members:**

- Private fields: `private readonly logger`, `private readonly prisma`
- Access modifiers explicit: `private`, `public` (implied for controller methods)

## Code Style

**Formatting:**

- Tool: Prettier 3.2.2
- No explicit .prettierrc file - uses Prettier defaults
- Integrated with ESLint via `eslint-plugin-prettier`
- Auto-formatting via `npm run format` (formats `src/**/*.ts` and `test/**/*.ts`)

**Linting:**

- Tool: ESLint with `@typescript-eslint/eslint-plugin`
- Config: `apps/backend/.eslintrc.js`
- Key rules:
  - `@typescript-eslint/no-explicit-any`: `warn` (allowed but discouraged)
  - `@typescript-eslint/no-unused-vars`: `warn` with `argsIgnorePattern: '^_'` (underscore-prefixed args allowed)
  - `@typescript-eslint/explicit-function-return-type`: `off` (type inference allowed)
  - `@typescript-eslint/explicit-module-boundary-types`: `off`
  - `@typescript-eslint/no-namespace`: `off` (allows Express augmentation)
- Command: `npm run lint` (auto-fixes with `--fix`)

**TypeScript Strictness:**

- Compiler: TypeScript 5.3.3
- Strict flags enabled:
  - `strictNullChecks: true`
  - `noImplicitAny: true`
  - `strictBindCallApply: true`
  - `forceConsistentCasingInFileNames: true`
  - `noFallthroughCasesInSwitch: true`
- Target: ES2021
- Decorators: `experimentalDecorators: true`, `emitDecoratorMetadata: true`

## Import Organization

**Order:**

1. External dependencies (NestJS, Prisma, etc.)
2. Internal common modules (`@common/*`)
3. Internal modules (`@modules/*`)
4. Internal config (`@config/*`)
5. Relative imports (`./*`, `../*`)

**Example:**

```typescript
import { Injectable, NotFoundException, Logger } from "@nestjs/common";
import { Prisma, Investigation } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import { CreateInvestigationDto } from "./dto";
```

**Path Aliases:**

- `@/*` → `src/*`
- `@common/*` → `src/common/*`
- `@modules/*` → `src/modules/*`
- `@config/*` → `src/config/*`

**Import Style:**

- Named imports preferred
- Destructure multiple exports: `import { A, B, C } from 'module'`
- Group related imports on same line
- Never use `import *`

## Error Handling

**Patterns:**

- Use NestJS exceptions: `NotFoundException`, `BadRequestException`, `ForbiddenException`
- Return 404 (not 403) for tenant isolation violations to prevent enumeration
- Non-blocking logging: activity logging failures should not crash requests
- Validation errors handled by class-validator automatically

**Examples:**

```typescript
// Tenant isolation - return 404 if not found OR wrong org
if (!investigation) {
  throw new NotFoundException(`Investigation with ID ${id} not found`);
}

// Business rule validation
if (!this.isValidTransition(existing.status, dto.status)) {
  throw new BadRequestException(
    `Cannot transition from ${existing.status} to ${dto.status}`
  );
}

// Non-blocking activity log
try {
  await this.activityService.log(...);
} catch (error) {
  this.logger.error('Failed to log activity', error);
  // Continue - don't fail request
}
```

## Logging

**Framework:** Pino (via `pino` and `pino-http`)

**Patterns:**

- Logger instance per service: `private readonly logger = new Logger(ServiceName.name)`
- Log levels: `debug`, `log`, `warn`, `error`
- Use structured logging where possible
- Debug logs for entry/exit: `this.logger.debug('Creating investigation for case...')`
- Error logs include context: `this.logger.error('Failed to log activity', error)`

**When to Log:**

- Service method entry (debug level)
- Business logic errors (error level)
- Validation failures (warn level)
- Activity logging failures (error level)

## Comments

**When to Comment:**

- Complex business logic requiring explanation
- State machine transitions (status validations)
- Security-critical code (tenant isolation checks)
- Non-obvious patterns (assignment history JSON structure)
- Reference to external specs or docs

**JSDoc/TSDoc:**

- Used on service methods: purpose, params, return, throws
- Multi-line format:
  ```typescript
  /**
   * Creates a new investigation for a case.
   * Auto-generates investigation number and sets initial status to NEW.
   */
  ```
- Single-line format rare

**Inline Comments:**

- Mark critical tenant isolation: `// CRITICAL: Tenant isolation`
- Explain non-obvious behavior: `// Return 404 not 403 to prevent enumeration`
- TODO comments tracked: `// TODO: Add guards when auth module is integrated`

## Function Design

**Size:**

- Services: 20-80 lines per method typical
- Controllers: 10-30 lines per endpoint (mostly delegation)
- Keep business logic in services, not controllers

**Parameters:**

- Services always receive: `dto`, `userId`, `organizationId` (in that order)
- Use DTOs for validation, not primitive obsession
- Destructure query params from DTOs

**Example:**

```typescript
async create(
  dto: CreateInvestigationDto,
  caseId: string,
  userId: string,
  organizationId: string,
): Promise<Investigation>
```

**Return Values:**

- Return Prisma entities directly from services
- Use response DTOs only when needed for mapping
- Paginated responses: `{ data, total, limit, page }`
- Always return promises (async/await pattern)

## Module Design

**Exports:**

- Barrel exports in `index.ts` files:
  ```typescript
  export * from "./guards";
  export * from "./decorators";
  export * from "./services";
  ```
- DTOs exported from `dto/index.ts`
- Services exported directly from service files

**Barrel Files:**

- Used in `common/` for cross-cutting concerns
- Used in module DTOs: `src/modules/*/dto/index.ts`
- Controllers import from module root

**Module Structure:**

```
module/
├── dto/
│   ├── create.dto.ts
│   ├── update.dto.ts
│   ├── query.dto.ts
│   └── index.ts
├── module.controller.ts
├── module.service.ts
├── module.service.spec.ts
└── module.module.ts
```

## NestJS Conventions

**Decorators:**

- Controllers: `@Controller()`, `@ApiTags()`, `@ApiBearerAuth()`, `@UseGuards()`
- Endpoints: `@Get()`, `@Post()`, `@Patch()`, `@Delete()`, `@HttpCode()`
- Parameters: `@Param()`, `@Body()`, `@Query()`, `@CurrentUser()`, `@TenantId()`
- Authorization: `@Roles()`, `@UseGuards(RolesGuard)`
- Swagger: `@ApiOperation()`, `@ApiResponse()`, `@ApiParam()`

**Dependency Injection:**

- Constructor injection: `constructor(private readonly service: Service)`
- Use `private readonly` for all injected dependencies
- Inject interfaces where possible (e.g., `ActivityService` not concrete)

**Guards:**

- Always apply: `@UseGuards(JwtAuthGuard, TenantGuard)`
- Role-based: Add `@UseGuards(RolesGuard)` after `@Roles()` decorator
- Order matters: Auth → Tenant → Roles

## DTO Conventions

**Validation:**

- All fields MUST have class-validator decorators
- Required: `@IsString()`, `@IsNotEmpty()`, `@MaxLength()`
- Optional: `@IsOptional()` first
- Transform: `@Transform()` for sanitization
- Type coercion: `@Type(() => Number)` for query params

**Structure:**

- `CreateDto`: all required fields
- `UpdateDto`: extends `PartialType(CreateDto)` (all optional)
- `QueryDto`: pagination + filters
- Response DTOs: typing only, no validation

**Security:**

- NEVER include `organizationId` in DTOs (comes from JWT)
- NEVER include `createdAt`, `updatedAt`, `createdById` (service sets these)
- NEVER accept UUIDs user shouldn't control

**Example:**

```typescript
export class CreateInvestigationDto {
  @ApiProperty({ description: "Category UUID" })
  @IsUUID()
  categoryId: string;

  @ApiPropertyOptional({ description: "Due date" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;
}
```

## Activity Logging Pattern

**Every mutation must log activity with natural language description:**

```typescript
await this.activityService.log({
  entityType: AuditEntityType.INVESTIGATION,
  entityId: investigation.id,
  action: "created",
  actionDescription: `Created investigation #${investigationNumber} for case ${caseNumber}`,
  actorUserId: userId,
  organizationId,
  context: { caseId, investigationNumber },
});
```

**Structure:**

- `entityType`: Enum (CASE, INVESTIGATION, RIU, etc.)
- `entityId`: UUID of affected entity
- `action`: verb (created, updated, deleted, assigned, status_changed)
- `actionDescription`: Natural language sentence
- `actorUserId`: Who did it
- `organizationId`: Tenant isolation
- `changes`: `{ oldValue, newValue }` for updates
- `context`: Additional metadata (optional)

## Tenant Isolation (CRITICAL)

**Every query MUST filter by organizationId:**

```typescript
const investigation = await this.prisma.investigation.findFirst({
  where: {
    id,
    organizationId, // CRITICAL: Tenant isolation
  },
});
```

**Services always receive organizationId as parameter:**

- Extract from JWT in controller: `@TenantId() organizationId: string`
- Pass to service: `this.service.create(dto, userId, organizationId)`
- Use in all Prisma queries

**Return 404, not 403, for cross-tenant access:**

```typescript
if (!entity) {
  throw new NotFoundException(`Entity with ID ${id} not found`);
  // Not ForbiddenException - prevents enumeration
}
```

---

_Convention analysis: 2026-02-13_
