# Ralph Prompt: Case Entity Implementation

You are implementing the Case entity for the Risk Intelligence Platform.

## Context
- This is a multi-tenant SaaS platform with PostgreSQL Row-Level Security
- Every entity MUST have `organizationId` for tenant isolation
- Follow patterns in CLAUDE.md exactly

## Current State
Check the current state of implementation:
1. `apps/backend/prisma/schema.prisma` - Does Case model exist?
2. `apps/backend/src/modules/cases/` - Does case module exist?
3. Run `npm run typecheck` to see current errors

## Requirements

### 1. Prisma Schema (if not complete)
Create/update Case model with:
- id, organizationId, caseNumber (auto-generated)
- status (enum: OPEN, IN_PROGRESS, CLOSED, ARCHIVED)
- severity (enum: LOW, MEDIUM, HIGH, CRITICAL)
- category, subcategory
- description (narrative context for AI)
- reporterType (ANONYMOUS, IDENTIFIED, THIRD_PARTY)
- source (HOTLINE, WEB_FORM, EMAIL, WALK_IN)
- AI enrichment: aiSummary, aiSummaryGeneratedAt, aiModelVersion
- Migration support: sourceSystem, sourceRecordId, migratedAt
- Standard fields: createdAt, updatedAt, createdById, updatedById

Run: `cd apps/backend && npx prisma migrate dev --name add_case_entity`

### 2. Case Module (if not complete)
Create NestJS module at `apps/backend/src/modules/cases/`:
- case.module.ts
- case.service.ts (following service pattern in CLAUDE.md)
- case.controller.ts (with TenantGuard, RolesGuard)
- dto/create-case.dto.ts, update-case.dto.ts
- case.service.spec.ts (with tenant isolation tests)

### 3. Activity Logging
Every mutation must log activity with natural language:
```typescript
await this.activityService.log({
  entityType: 'CASE',
  entityId: case.id,
  action: 'created',
  actionDescription: `${user.name} created case ${case.caseNumber}`,
  actorUserId: user.id,
  organizationId: orgId,
});
```

### 4. Tests
After each major component, run:
```bash
cd apps/backend && npm test -- --testPathPattern="case"
cd apps/backend && npm run typecheck
```

## Verification Checklist
Before outputting completion promise, verify:
- [ ] Prisma schema has organizationId on Case
- [ ] Migration runs successfully
- [ ] Service filters all queries by organizationId
- [ ] Controller has @UseGuards(JwtAuthGuard, TenantGuard)
- [ ] Activity logging on create, update, delete
- [ ] Tests pass: `npm test -- --testPathPattern="case"`
- [ ] Type check passes: `npm run typecheck`

## Completion
When ALL tests pass and verification checklist is complete, output:
<promise>CASE ENTITY COMPLETE</promise>

If tests fail, analyze the error and fix it. Do not output the promise until everything passes.
