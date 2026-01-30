# Ralph Prompt: [Feature Name]

You are implementing [feature] for the Risk Intelligence Platform.

## Context
- Brief context about where this fits in the system
- Key constraints or patterns to follow
- Reference relevant PRD: 02-MODULES/[module]/PRD.md

## Current State
Check the current implementation state:
1. [File to check]
2. [Another file]
3. Run: `npm run typecheck`

## Requirements

### 1. [Component 1]
- Specific requirements
- Code patterns to follow
- Commands to run after

### 2. [Component 2]
- Requirements
- Patterns
- Verification commands

### 3. [Component 3]
- Requirements
- Patterns
- Verification commands

## Critical Patterns (from CLAUDE.md)

### Tenant Isolation
- Every entity has organizationId
- All queries filter by organizationId
- Cache keys: `org:{organizationId}:...`

### Activity Logging
```typescript
await this.activityService.log({
  entityType: 'ENTITY_TYPE',
  entityId: entity.id,
  action: 'action_name',
  actionDescription: `Natural language: ${user.name} did X to ${entity.name}`,
  actorUserId: user.id,
  organizationId: orgId,
});
```

### AI-First Fields
- aiSummary, aiSummaryGeneratedAt, aiModelVersion
- Narrative context fields (description, notes)
- Migration fields (sourceSystem, sourceRecordId, migratedAt)

## Verification Checklist
Before outputting completion promise:
- [ ] organizationId on all new entities
- [ ] Tests pass: `npm test -- --testPathPattern="[pattern]"`
- [ ] Type check passes: `npm run typecheck`
- [ ] Activity logging on mutations
- [ ] No tenant isolation vulnerabilities

## Completion
When ALL requirements are met and tests pass:
<promise>[FEATURE_NAME] COMPLETE</promise>

Do not output promise until everything passes. If tests fail, fix and retry.
