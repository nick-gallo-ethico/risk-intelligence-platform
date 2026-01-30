# Ralph Prompt: Investigation Entity Implementation

You are implementing the Investigation entity for the Risk Intelligence Platform.

## Context
- Investigations belong to Cases (0 to N per case)
- Must follow multi-tenant patterns with organizationId
- See 02-MODULES/05-CASE-MANAGEMENT/PRD.md for full requirements

## Current State
Check:
1. Does Case entity exist? (prerequisite)
2. `apps/backend/prisma/schema.prisma` - Investigation model?
3. `apps/backend/src/modules/investigations/` - module exists?

## Requirements

### 1. Prisma Schema
Investigation model with:
- id, organizationId, caseId (relation to Case)
- status (enum: NOT_STARTED, IN_PROGRESS, ON_HOLD, COMPLETED, CLOSED)
- assigneeId (User who owns investigation)
- priority, dueDate
- findings, outcome, remediationPlan (text fields for AI context)
- templateId (optional - category-specific checklist)
- AI enrichment fields
- Migration support fields
- Standard audit fields

### 2. Investigation Module
Create at `apps/backend/src/modules/investigations/`:
- investigation.module.ts
- investigation.service.ts
- investigation.controller.ts
- DTOs for create, update, assign, complete
- Spec file with tenant isolation tests

### 3. Key Business Logic
- When investigation created, case status may change to IN_PROGRESS
- When all investigations complete, case can be closed
- Assignee must belong to same organization
- Activity log: "John assigned investigation to Sarah"

### 4. Tests
```bash
cd apps/backend && npm test -- --testPathPattern="investigation"
cd apps/backend && npm run typecheck
```

## Verification
- [ ] organizationId on Investigation
- [ ] Foreign key to Case with cascade delete consideration
- [ ] Assignee validation (same org)
- [ ] Activity logging on all mutations
- [ ] Tests pass
- [ ] Typecheck passes

## Completion
<promise>INVESTIGATION ENTITY COMPLETE</promise>
