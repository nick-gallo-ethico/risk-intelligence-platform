# Phase 35: Code Quality & Architecture - Research

**Researched:** 2026-02-15
**Domain:** TypeScript strict mode, service architecture, code quality
**Confidence:** HIGH (direct codebase analysis)

## Summary

This phase addresses code quality issues identified in the v1.2 code review. The research confirms all 12 fat services exist and exceed 800+ LOC, there are **92 explicit `any` type usages** (including both `: any` and `as any` patterns), and the tsconfig.json already has some strict settings but not the full `strict: true` flag. The service splits are feasible but require careful ordering due to dependency chains.

**Primary recommendation:** Split services in dependency order (leaf services first), then address `any` types by file category (infrastructure, then domain), then enable `strict: true` incrementally.

## Standard Stack

This phase uses existing project dependencies - no new libraries needed.

### Core (Already in Project)

| Library        | Version | Purpose              | Notes                           |
| -------------- | ------- | -------------------- | ------------------------------- |
| TypeScript     | ^5.x    | Type checking        | Enable strict mode flags        |
| @nestjs/common | ^10.x   | Service architecture | Standard DI patterns            |
| Prisma         | ^5.x    | Database ORM         | Type generation helps fix `any` |

### Supporting Tools

| Tool                | Purpose       | When to Use                         |
| ------------------- | ------------- | ----------------------------------- |
| ESLint              | Code quality  | `max-lines` rule already set at 500 |
| TypeScript compiler | Type checking | `npx tsc --noEmit` for validation   |

## Current State Analysis

### QUAL-01: Fat Services Inventory (12 Services)

All 12 mentioned services confirmed with actual LOC counts:

| Service                            | File                                  | LOC  | Primary Responsibilities                                                      |
| ---------------------------------- | ------------------------------------- | ---- | ----------------------------------------------------------------------------- |
| ai-triage.service.ts               | modules/disclosures/                  | 1000 | NL query parsing, preview generation, bulk execution, RIU/conflict operations |
| mapping-suggestion.service.ts      | modules/analytics/migration/          | 957  | Field synonyms, fuzzy matching, validation, transformation                    |
| query-to-prisma.service.ts         | modules/analytics/ai-query/           | 956  | Field whitelisting, Prisma query building, date range handling                |
| user-table.service.ts              | modules/tables/                       | 952  | Table CRUD, data source mapping, scheduled delivery, sharing                  |
| project-template.service.ts        | modules/projects/                     | 929  | Template definitions, template application, cloning                           |
| context-loader.service.ts          | modules/ai/services/                  | 925  | Hierarchy loading, caching, context assembly, system prompts                  |
| ai-query.service.ts                | modules/analytics/ai-query/           | 914  | Query execution, rate limiting, visualization, history                        |
| migration-parser.service.ts        | modules/analytics/migration/services/ | 887  | Format detection, field mapping, value transformation                         |
| policy-case-association.service.ts | modules/policies/associations/        | 878  | Association CRUD, events, violation stats                                     |
| notification.service.ts            | modules/notifications/services/       | 868  | Dispatch routing, preference checking, OOO handling                           |
| campaign-scheduling.service.ts     | modules/campaigns/                    | 856  | Scheduling, wave management, blackout dates                                   |
| schema-introspection.service.ts    | modules/ai/                           | 843  | Entity schemas, filter validation, documentation                              |

**Split Strategy by Service:**

| Service                         | Suggested Splits                                       | Rationale                                                  |
| ------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- |
| ai-triage.service               | `TriageInterpreter`, `TriageExecutor`, `TriagePreview` | NL parsing vs. execution vs. preview are distinct concerns |
| mapping-suggestion.service      | `FieldMatcher`, `TransformApplier`                     | Fuzzy matching is reusable; transforms are specific        |
| query-to-prisma.service         | `FieldWhitelist`, `PrismaQueryBuilder`                 | Security validation separate from query building           |
| user-table.service              | `TableCrud`, `TableQuery`, `TableDelivery`             | CRUD, query execution, scheduled email are separate flows  |
| project-template.service        | `TemplateRegistry`, `TemplateApplier`                  | Static definitions vs. dynamic application                 |
| context-loader.service          | `ContextCache`, `HierarchyLoader`, `PromptBuilder`     | Caching, loading, assembly are distinct                    |
| ai-query.service                | `QueryParser`, `QueryExecutor`, `ResultFormatter`      | AI parsing, DB execution, formatting are pipeline stages   |
| migration-parser.service        | `FormatDetector`, `MappingGenerator`                   | Detection vs. generation                                   |
| policy-case-association.service | `AssociationCrud`, `ViolationAnalytics`                | Core CRUD vs. analytics/reporting                          |
| notification.service            | `NotificationRouter`, `DeliveryDispatcher`             | Routing logic vs. actual dispatch                          |
| campaign-scheduling.service     | `WaveScheduler`, `BlackoutManager`                     | Wave logic vs. blackout date management                    |
| schema-introspection.service    | `EntitySchemaRegistry`, `FilterValidator`              | Static registry vs. validation logic                       |

### QUAL-02: Any Type Audit (92 Total)

**Total `any` usages found:** 92 instances across 27 files

**Breakdown by pattern:**

| Pattern                  | Count | Example                              |
| ------------------------ | ----- | ------------------------------------ |
| `: any` parameter/return | 31    | `handleRequest(err: any, user: any)` |
| `as any` cast            | 61    | `(this.prisma as any)[modelName]`    |

**Files with Most `any` Usages:**

| File                            | Count | Context                           |
| ------------------------------- | ----- | --------------------------------- |
| ai-triage.service.ts            | 8     | Prisma where clause typing        |
| ai-query.service.ts             | 9     | Dynamic Prisma model access       |
| saml.strategy.ts                | 6     | SAML profile attribute extraction |
| threshold.service.ts            | 5     | Rules engine conditions           |
| qa-queue.service.ts             | 4     | Query building                    |
| workflow.service.ts             | 4     | Template stages/transitions       |
| create-workflow-template.dto.ts | 4     | Workflow step/gate arrays         |
| project-update.service.ts       | 3     | Recursive update formatting       |
| auth.controller.ts              | 3     | req.user typing                   |

**Type Categories to Create:**

| Category              | Files Affected                             | Type Interface Needed                              |
| --------------------- | ------------------------------------------ | -------------------------------------------------- |
| Prisma dynamic access | ai-query, ai-triage, user-table, reporting | `PrismaModelDelegate<T>`                           |
| SAML profile          | saml.strategy                              | `SamlProfile` with attribute maps                  |
| Rules engine          | threshold.service                          | `RuleCondition`, `RuleAction`                      |
| Workflow steps        | create-workflow-template.dto               | `WorkflowStep`, `StageGate`, `TransitionCondition` |
| Request user          | auth.controller                            | Proper `Request` augmentation                      |
| JSON fields           | various                                    | Specific Prisma `JsonValue` handling               |

### QUAL-03: Strict Mode Assessment

**Current tsconfig.json settings:**

```json
{
  "compilerOptions": {
    "strictNullChecks": true, // ENABLED
    "noImplicitAny": true, // ENABLED
    "strictBindCallApply": true, // ENABLED
    "strict": false, // NOT SET (implicit)
    // Missing strict flags:
    "strictFunctionTypes": false, // NOT SET
    "strictPropertyInitialization": false, // NOT SET
    "alwaysStrict": false, // NOT SET
    "useUnknownInCatchVariables": false // NOT SET
  }
}
```

**What `strict: true` adds:**

- `strictFunctionTypes` - Contravariant function parameter checking
- `strictPropertyInitialization` - Class properties must be initialized
- `alwaysStrict` - Parse in strict mode, emit "use strict"
- `useUnknownInCatchVariables` - `catch(e)` has type `unknown` not `any`

**Estimated compilation impact:**

- Most code already passes `noImplicitAny` and `strictNullChecks`
- `strictPropertyInitialization` will flag uninitialized class properties (common in NestJS with DI)
- `useUnknownInCatchVariables` will require adding type guards in catch blocks

### QUAL-04: Non-null Assertions Audit

**Total `!.` assertions found:** 36 instances across 20 files

**Files mentioned in requirements:**

| File                        | Line    | Usage                                     | Risk                              |
| --------------------------- | ------- | ----------------------------------------- | --------------------------------- |
| keyvault.service.ts         | 98      | `this.client!.getSecret(name)`            | Client may be null before init    |
| claude.provider.ts          | 77, 102 | `this.client!.messages.create()`          | Client may be null if init failed |
| impersonation.middleware.ts | 107     | `req.impersonation!.targetOrganizationId` | Impersonation may not be set      |

**Other notable non-null assertions:**

| File                    | Count | Context                   |
| ----------------------- | ----- | ------------------------- |
| tagged-field.service.ts | 5     | Field definitions         |
| task-sorter.service.ts  | 3     | Array element access      |
| ai-client.service.ts    | 2     | Provider access           |
| rate-limiter.service.ts | 8     | Array index access `![0]` |

### QUAL-05: Forms Controller Analysis

**File:** `apps/backend/src/modules/forms/forms.controller.ts`

**Problem locations:**

- Line 62: `return this.schemaService.create(orgId, dto as any, user.id);`
- Line 103: `return this.schemaService.update(orgId, id, dto as any, user.id);`

**Root cause:**
The controller imports `CreateFormDefinitionDto` and `UpdateFormDefinitionDto` from `./dto` (class-validator DTOs), but the service expects interfaces from `form-schema.service.ts` with the same names but different definitions.

**DTO class (dto/create-form-definition.dto.ts):**

```typescript
export class CreateFormDefinitionDto {
  schema: Record<string, unknown>; // Generic object
  uiSchema?: Record<string, unknown>;
  // ...
}
```

**Service interface (form-schema.service.ts):**

```typescript
export interface CreateFormDefinitionDto {
  schema: FormSchema; // Specific type
  uiSchema?: UiSchema; // Specific type
  // ...
}
```

**Fix:** Either:

1. Unify the types (make DTO class implement interface with proper typing)
2. Create a mapper function that validates and transforms
3. Use `FormSchema` and `UiSchema` types in the DTO with custom validators

## Architecture Patterns

### Recommended Split Pattern

Follow the "Thin Coordinator + Focused Helpers" pattern already used in migration module:

```
src/modules/[feature]/
├── [feature].service.ts          # Thin coordinator (200-400 LOC)
├── services/                     # Focused sub-services
│   ├── [feature]-parser.service.ts
│   ├── [feature]-executor.service.ts
│   └── [feature]-validator.service.ts
└── [feature].module.ts           # Provides all services
```

**Example from migration module (already refactored):**

```typescript
// migration.service.ts - thin coordinator
@Injectable()
export class MigrationService {
  constructor(
    private parser: MigrationParserService,
    private validator: MigrationValidatorService,
    private executor: MigrationExecutorService,
  ) {}

  async processFile(dto: ProcessFileDto) {
    const parsed = await this.parser.parse(dto.file);
    const validated = await this.validator.validate(parsed);
    return this.executor.execute(validated);
  }
}
```

### Type Definition Pattern

For dynamic Prisma model access:

```typescript
// types/prisma.types.ts
import { PrismaClient, Prisma } from "@prisma/client";

type PrismaModels = {
  case: Prisma.CaseDelegate;
  investigation: Prisma.InvestigationDelegate;
  // ... all models
};

export function getPrismaModel<K extends keyof PrismaModels>(
  prisma: PrismaClient,
  modelName: K,
): PrismaModels[K] {
  return prisma[modelName] as PrismaModels[K];
}
```

### Non-null Assertion Replacement

```typescript
// BEFORE
const result = this.client!.getSecret(name);

// AFTER (with guard)
private ensureClient(): SecretClient {
  if (!this.client) {
    throw new Error('KeyVault client not initialized');
  }
  return this.client;
}

const result = this.ensureClient().getSecret(name);
```

## Don't Hand-Roll

| Problem                 | Don't Build       | Use Instead                | Why                           |
| ----------------------- | ----------------- | -------------------------- | ----------------------------- |
| Type-safe Prisma access | Custom type maps  | Prisma-generated types     | Already comprehensive         |
| JSON Schema validation  | Custom validators | Ajv + class-validator      | Battle-tested, spec-compliant |
| Rules engine types      | Custom DSL        | json-rules-engine types    | Already in use, has types     |
| SAML profile parsing    | Manual extraction | @node-saml/node-saml types | Library provides types        |

## Common Pitfalls

### Pitfall 1: Circular Dependencies After Split

**What goes wrong:** Splitting a service creates circular imports
**Why it happens:** Sub-services reference each other or the parent
**How to avoid:**

- Create explicit dependency hierarchy
- Use event emitter for cross-service communication
- Put shared types in separate files
  **Warning signs:** `Cannot read property of undefined` at runtime

### Pitfall 2: Breaking External Imports

**What goes wrong:** Other modules import from old locations
**Why it happens:** Not updating barrel exports (index.ts)
**How to avoid:**

- Update index.ts to re-export from new locations
- Search for all import references before moving
  **Warning signs:** TypeScript import errors after split

### Pitfall 3: strictPropertyInitialization False Positives

**What goes wrong:** NestJS DI-injected properties flag as uninitialized
**Why it happens:** TypeScript doesn't understand DI
**How to avoid:**

- Use definite assignment assertion for DI: `private readonly service!: Service`
- Or use constructor assignment pattern
  **Warning signs:** Compilation errors on @Inject properties

### Pitfall 4: Generic `any` Replacements Breaking Runtime

**What goes wrong:** Type is correct but runtime behavior changes
**Why it happens:** Previous `any` allowed silent coercion
**How to avoid:**

- Add runtime validation alongside type changes
- Test thoroughly after each type fix
  **Warning signs:** Runtime type errors after deployment

## Code Examples

### Splitting a Fat Service

```typescript
// BEFORE: ai-triage.service.ts (1000 LOC)
@Injectable()
export class AiTriageService {
  // interpretQuery() - 200 LOC
  // generatePreview() - 150 LOC
  // executeTriageAction() - 250 LOC
  // buildPrismaFilter() - 200 LOC
  // ... etc
}

// AFTER: Split into focused services
// services/triage-interpreter.service.ts (~200 LOC)
@Injectable()
export class TriageInterpreterService {
  async interpretQuery(
    query: string,
    orgId: string,
  ): Promise<TriageInterpretation> {
    // NL parsing logic
  }
}

// services/triage-preview.service.ts (~200 LOC)
@Injectable()
export class TriagePreviewService {
  async generatePreview(
    interpretation: TriageInterpretation,
  ): Promise<TriagePreview> {
    // Preview generation logic
  }
}

// services/triage-executor.service.ts (~250 LOC)
@Injectable()
export class TriageExecutorService {
  async execute(preview: TriagePreview, userId: string): Promise<TriageResult> {
    // Bulk action execution
  }
}

// ai-triage.service.ts (~150 LOC) - Thin Coordinator
@Injectable()
export class AiTriageService {
  constructor(
    private interpreter: TriageInterpreterService,
    private preview: TriagePreviewService,
    private executor: TriageExecutorService,
  ) {}

  async triageFromNaturalLanguage(
    query: string,
    userId: string,
    orgId: string,
  ) {
    const interpretation = await this.interpreter.interpretQuery(query, orgId);
    const preview = await this.preview.generatePreview(interpretation);
    return preview;
  }
}
```

### Replacing Dynamic Prisma Access

```typescript
// BEFORE
const count = await (this.prisma as any)[modelName].count({ where });

// AFTER - with type-safe helper
// common/prisma/model-accessor.ts
import { PrismaClient } from "@prisma/client";

const MODEL_MAP = {
  case: "case",
  investigation: "investigation",
  riskIntelligenceUnit: "riskIntelligenceUnit",
  campaign: "campaign",
} as const;

type ModelName = keyof typeof MODEL_MAP;

export function getModelDelegate(prisma: PrismaClient, model: ModelName) {
  switch (model) {
    case "case":
      return prisma.case;
    case "investigation":
      return prisma.investigation;
    case "riskIntelligenceUnit":
      return prisma.riskIntelligenceUnit;
    case "campaign":
      return prisma.campaign;
    default:
      const _exhaustive: never = model;
      throw new Error(`Unknown model: ${model}`);
  }
}

// Usage
const count = await getModelDelegate(this.prisma, "case").count({ where });
```

### SAML Profile Type Definition

```typescript
// BEFORE
const email = (profile as any)[
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
];

// AFTER
// types/saml.types.ts
interface SamlClaimUris {
  email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";
  upn: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn";
  givenName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname";
  surname: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname";
}

interface SamlProfile {
  nameID?: string;
  nameIDFormat?: string;
  [SamlClaimUris.email]?: string;
  [SamlClaimUris.upn]?: string;
  [SamlClaimUris.givenName]?: string;
  [SamlClaimUris.surname]?: string;
  givenName?: string;
  surname?: string;
}

// Usage with type-safe helper
function getEmail(profile: SamlProfile): string | undefined {
  return (
    profile[
      "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
    ] || profile["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn"]
  );
}
```

## Dependency Map (Split Ordering)

Services should be split in reverse dependency order (leaf nodes first):

```
Level 0 (No Dependencies - Split First):
├── schema-introspection.service (used by ai-triage, ai-query)
├── mapping-suggestion.service (standalone)
├── query-to-prisma.service (used by ai-query)

Level 1 (Depend on Level 0):
├── ai-query.service (depends on query-to-prisma)
├── migration-parser.service (depends on mapping-suggestion)

Level 2 (Depend on Level 1):
├── ai-triage.service (depends on schema-introspection)
├── user-table.service (standalone)
├── project-template.service (standalone)
├── context-loader.service (standalone)
├── policy-case-association.service (standalone)
├── notification.service (standalone, many dependents)
├── campaign-scheduling.service (standalone)
```

**Split notification.service LAST** - it has 13 files importing it.

## Open Questions

1. **Workflow DTO typing**: The `create-workflow-template.dto.ts` uses `any[]` for steps/gates/conditions because the types are complex and validated at service layer. Should we:
   - Create full DTO types (more work, better compile-time safety)
   - Keep validation at service layer (current approach)
   - **Recommendation:** Create types since QUAL-02 requires it

2. **strictPropertyInitialization approach**: NestJS services use DI which TypeScript doesn't understand. Options:
   - Use `!:` definite assignment assertion on all @Inject properties
   - Use constructor parameter properties
   - **Recommendation:** Use `!:` for DI properties, document pattern in examples

3. **Incremental strict mode**: Should we enable all strict flags at once or incrementally?
   - **Recommendation:** Enable `strict: true` once, fix all errors together to avoid multiple migration waves

## Sources

### Primary (HIGH confidence)

- Direct codebase analysis via Read/Grep tools
- `apps/backend/tsconfig.json` - Current TypeScript configuration
- Service files analyzed for LOC, dependencies, responsibilities

### Secondary (MEDIUM confidence)

- TypeScript strict mode documentation
- NestJS service architecture patterns

## Metadata

**Confidence breakdown:**

- Fat Services Inventory: HIGH - Direct file analysis
- Any Type Audit: HIGH - Grep search of codebase
- Strict Mode Assessment: HIGH - Direct tsconfig.json analysis
- Non-null Assertions: HIGH - Grep search of codebase
- Forms Controller: HIGH - Direct file analysis
- Split Recommendations: MEDIUM - Based on code structure analysis

**Research date:** 2026-02-15
**Valid until:** 30 days (codebase may change)
