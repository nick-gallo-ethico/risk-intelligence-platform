---
phase: 08-portals
plan: 02
status: complete
started: 2026-02-04T05:14:50Z
completed: 2026-02-04T05:28:38Z
duration: 14 min
subsystem: operator-portal
tags: [directives, operator-console, scripts, hotline]

dependency_graph:
  requires: [08-01]
  provides:
    - DirectivesService
    - DirectivesController
    - CallDirectives grouped retrieval
  affects: [08-05, 08-06]

tech_stack:
  added: []
  patterns:
    - Stage-based directive retrieval
    - Call-grouped directive structure
    - Soft delete for audit trail
    - Reorder with transaction

key_files:
  created:
    - apps/backend/src/modules/portals/operator/directives.service.ts
    - apps/backend/src/modules/portals/operator/directives.controller.ts
    - apps/backend/src/modules/portals/operator/types/directives.types.ts
  modified:
    - apps/backend/prisma/schema.prisma (prior commit)
    - apps/backend/src/modules/portals/operator/operator-portal.module.ts

decisions:
  - id: 08-02-01
    title: Stage-based directive grouping
    choice: Four stages (OPENING, INTAKE, CATEGORY_SPECIFIC, CLOSING)
    rationale: Matches natural call flow sequence
  - id: 08-02-02
    title: Category relation for category-specific directives
    choice: Direct FK to Category, nullable for non-category-specific
    rationale: Simple query pattern, enforces referential integrity
  - id: 08-02-03
    title: Prisma connect/disconnect for relation updates
    choice: Use relation-based update input, not direct FK assignment
    rationale: Proper Prisma pattern for nullable FK updates

metrics:
  tasks_completed: 3
  commits: 2 (from prior session)
  tests_added: 0
  tests_passing: N/A (unit tests pending)
---

# Phase 8 Plan 2: Directives Service Summary

**One-liner:** Stage-based directive management for operator call scripts with category-specific filtering and read-aloud tracking.

## What Was Built

### DirectivesService (`directives.service.ts`)

Service providing CRUD operations and stage-based retrieval for client-specific scripts:

- `getDirectivesForStage(organizationId, stage, categoryId?)` - Load directives for a specific call stage
- `getDirectivesForCall(organizationId, categoryId?)` - Load all directives grouped by stage in one query
- `getAllDirectives(organizationId, options?)` - Admin view with inactive/all directives
- `create(organizationId, dto)` - Create with auto-order assignment
- `update(id, organizationId, dto)` - Partial update with category disconnect on stage change
- `delete(id, organizationId)` - Soft delete (isActive = false)
- `reorder(organizationId, ids)` - Transactional reorder within stage
- `getById(id, organizationId)` - Single directive lookup

### DirectivesController (`directives.controller.ts`)

REST endpoints at `/api/v1/operator/clients/:clientId/directives`:

| Method | Path | Role | Description |
|--------|------|------|-------------|
| GET | `/` | OPERATOR, SYSTEM_ADMIN | List all directives grouped by stage |
| GET | `/call` | OPERATOR, SYSTEM_ADMIN | Get directives for active call |
| GET | `/:id` | OPERATOR, SYSTEM_ADMIN | Get single directive |
| POST | `/` | SYSTEM_ADMIN | Create directive |
| PUT | `/:id` | SYSTEM_ADMIN | Update directive |
| DELETE | `/:id` | SYSTEM_ADMIN | Soft delete directive |
| POST | `/reorder` | SYSTEM_ADMIN | Reorder directives in stage |

### Type Definitions (`directives.types.ts`)

- `DirectiveWithCategory` - Directive with category relation included
- `CallDirectives` - Grouped structure: { opening, intake, categorySpecific, closing }
- `DirectivesByStage` - Record keyed by DirectiveStage enum values
- `GetDirectivesOptions` - Query options interface

### Prisma Model (from prior commit 9df9bff)

```prisma
enum DirectiveStage {
  OPENING
  INTAKE
  CATEGORY_SPECIFIC
  CLOSING
}

model ClientDirective {
  id             String         @id @default(uuid())
  organizationId String
  stage          DirectiveStage
  categoryId     String?        // Required for CATEGORY_SPECIFIC
  title          String
  content        String         @db.Text
  isReadAloud    Boolean        @default(false)
  order          Int            @default(0)
  isActive       Boolean        @default(true)
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  // Relations and indexes
}
```

## Key Design Patterns

### Stage-Based Call Flow

Directives are organized into four stages matching the natural call flow:
1. **OPENING** - Read at call start (legal disclaimers, greeting scripts)
2. **INTAKE** - General guidance during intake process
3. **CATEGORY_SPECIFIC** - Loaded when operator selects category (e.g., HIPAA for healthcare)
4. **CLOSING** - Read at call end (confirmation, access code instructions)

### CallDirectives Structure

```typescript
interface CallDirectives {
  opening: DirectiveWithCategory[];
  intake: DirectiveWithCategory[];
  categorySpecific: DirectiveWithCategory[];
  closing: DirectiveWithCategory[];
}
```

Single query retrieves all directives needed for a call, grouped for UI consumption.

### Read-Aloud Flag

Directives with `isReadAloud: true` must be read verbatim to callers. UI should:
- Display with distinct styling (e.g., monospace font, box border)
- Show "Must read verbatim" indicator
- Potentially require acknowledgment before proceeding

### Soft Delete Pattern

Directives are never hard-deleted. Setting `isActive = false`:
- Preserves audit trail
- Allows restoration if needed
- Historical calls can still reference directive content

## API Usage Examples

### Get All Directives for a Call

```bash
GET /api/v1/operator/clients/{clientId}/directives/call?categoryId={categoryId}

Response:
{
  "opening": [
    { "id": "...", "title": "Welcome Script", "content": "...", "isReadAloud": true }
  ],
  "intake": [
    { "id": "...", "title": "Privacy Notice", "content": "..." }
  ],
  "categorySpecific": [
    { "id": "...", "title": "HIPAA Disclosure", "content": "...", "isReadAloud": true }
  ],
  "closing": [
    { "id": "...", "title": "Access Code Instructions", "content": "..." }
  ]
}
```

### Create Category-Specific Directive

```bash
POST /api/v1/operator/clients/{clientId}/directives
{
  "stage": "CATEGORY_SPECIFIC",
  "categoryId": "healthcare-category-id",
  "title": "HIPAA Disclosure Warning",
  "content": "This call may be recorded...",
  "isReadAloud": true
}
```

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

### Completed Prerequisites for:
- **08-05 (Intake Intake):** DirectivesService available for loading scripts during intake
- **08-06 (QA Workflow):** Category-specific directives can be displayed during QA review

### Outstanding Items:
- Unit tests for DirectivesService (coverage pending)
- E2E tests for controller endpoints
- Admin UI for directive management (Phase 8 frontend plans)

## Commits

| Hash | Message |
|------|---------|
| 9df9bff | feat(08-02): add ClientDirective model and DirectiveStage enum |
| d93e55c | feat(08-03): add ClientProfileService with phone lookup (includes directives files) |

Note: Due to parallel execution, directive service/controller files were committed with 08-03 ClientProfileService commit.
