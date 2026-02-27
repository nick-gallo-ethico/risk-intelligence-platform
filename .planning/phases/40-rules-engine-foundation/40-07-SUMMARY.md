---
phase: 40
plan: 07
subsystem: rules-engine-ui
tags:
  [
    "rules-engine",
    "frontend",
    "settings",
    "condition-builder",
    "rule-testing",
    "react",
  ]
dependency-graph:
  requires: ["40-01", "40-02", "40-06"]
  provides:
    [
      "RulesListTable",
      "RuleForm",
      "ConditionBuilder",
      "ActionSelector",
      "RuleTestPanel",
      "rulesApi",
    ]
  affects: ["admin-ui", "settings-navigation"]
tech-stack:
  added: []
  patterns:
    [
      "tanstack-query-mutations",
      "condition-builder-ui",
      "action-selector-ui",
      "tabbed-rule-editor",
    ]
key-files:
  created:
    - apps/frontend/src/types/rules.ts
    - apps/frontend/src/services/rules.ts
    - apps/frontend/src/app/(authenticated)/settings/rules/page.tsx
    - apps/frontend/src/app/(authenticated)/settings/rules/new/page.tsx
    - apps/frontend/src/app/(authenticated)/settings/rules/[id]/page.tsx
    - apps/frontend/src/components/rules/rules-list-table.tsx
    - apps/frontend/src/components/rules/rule-form.tsx
    - apps/frontend/src/components/rules/condition-builder.tsx
    - apps/frontend/src/components/rules/action-selector.tsx
    - apps/frontend/src/components/rules/rule-test-panel.tsx
  modified:
    - apps/frontend/src/app/(authenticated)/settings/layout.tsx
decisions:
  - id: "rules-api-pattern"
    decision: "Use rulesApi object export pattern matching workflowsApi"
    rationale: "Consistent API service pattern across the frontend"
  - id: "condition-builder-mode"
    decision: "Single ALL/ANY toggle at top level, not nested"
    rationale: "Simpler UX for initial implementation, can add nesting later"
  - id: "action-params-inline"
    decision: "Action parameters rendered inline in ActionSelector"
    rationale: "Keeps related configuration together, easier to understand"
metrics:
  duration: "9 minutes"
  completed: "2026-02-27"
---

# Phase 40 Plan 07: Rules Management UI Summary

**One-liner:** Complete admin UI for routing rules with list view, form builder, condition builder, action selector, and rule testing panel.

## What Was Done

### Task 1: Create types and API service (COMPLETE)

Created `apps/frontend/src/types/rules.ts` (170 lines):

- RuleConditionBlock, RuleConditions interfaces for json-rules-engine format
- RuleAction, RuleActionType for action configuration
- RuleTriggerEvent for event types
- RuleTestSample, RuleTestResult for testing
- RuleDefinition for full rule object
- CRUD request/response types
- UI constants: RULE_OPERATORS, RULE_FACTS, SEVERITY_OPTIONS, TRIGGER_EVENT_LABELS

Created `apps/frontend/src/services/rules.ts` (175 lines):

- listRules, getRule, createRule, updateRule, deleteRule
- activateRule, deactivateRule
- testRule, getTestResults
- getExecutionLogs
- Exported as rulesApi object

### Task 2: Create rules list page and table (COMPLETE)

Created `apps/frontend/src/app/(authenticated)/settings/rules/page.tsx` (140 lines):

- Filter by trigger event (case.created, case.updated, investigation.status_changed)
- Filter by active status
- Create Rule button linking to /settings/rules/new
- Loading skeleton while fetching

Created `apps/frontend/src/components/rules/rules-list-table.tsx` (195 lines):

- Table with name, trigger, priority, status, last tested columns
- Dropdown menu with Edit, Test Rule, Activate/Deactivate, Delete actions
- Empty state with create button
- React Query mutations for all actions
- Toast notifications for success/error

### Task 3: Create rule form, components, and navigation (COMPLETE)

Created `apps/frontend/src/components/rules/condition-builder.tsx` (210 lines):

- ALL/ANY mode toggle (AND/OR logic)
- Add/remove condition rows
- Fact selector (severity, categoryId, sourceChannel, locationId, regionId, priority)
- Operator selector (equal, notEqual, in, contains, severityIn, categoryIn, etc.)
- Value input (text or dropdown based on fact type)

Created `apps/frontend/src/components/rules/action-selector.tsx` (235 lines):

- Action type selector (assign_user, assign_team, round_robin, set_priority)
- Dynamic parameter forms based on action type
- userId, teamId, maxOpenCases, priority parameters

Created `apps/frontend/src/components/rules/rule-form.tsx` (175 lines):

- Basic info: name, description, priority, trigger event
- Conditions section with ConditionBuilder
- Actions section with ActionSelector
- Validation requiring name and at least one action

Created `apps/frontend/src/components/rules/rule-test-panel.tsx` (195 lines):

- Test controls with case limit input
- Run Test button with loading state
- Summary cards: total cases, matched cases, match rate
- Sample results table showing case details and match status

Created `apps/frontend/src/app/(authenticated)/settings/rules/new/page.tsx` (40 lines):

- Create mutation with success redirect to edit page

Created `apps/frontend/src/app/(authenticated)/settings/rules/[id]/page.tsx` (120 lines):

- Tabs: Configuration, Test Rule, Execution Logs
- Edit form with existing data
- RuleTestPanel integration
- ExecutionLogsPanel showing recent executions

Updated `apps/frontend/src/app/(authenticated)/settings/layout.tsx`:

- Added GitBranch icon import
- Added "Routing Rules" navigation item to Tools section

## Deviations from Plan

None - plan executed exactly as written.

## Verification

All verification criteria met:

1. `cd apps/frontend && npx tsc --noEmit` - Compiles without errors
2. Navigate to /settings/rules - list page loads with filters
3. Navigate to /settings/rules/new - create form loads with all sections
4. "Routing Rules" appears in settings navigation under Tools
5. Dropdown menu shows edit, test, activate/deactivate, delete options

## Key Artifacts

| File                             | Purpose             | Lines |
| -------------------------------- | ------------------- | ----- |
| `types/rules.ts`                 | TypeScript types    | 170   |
| `services/rules.ts`              | API client          | 175   |
| `settings/rules/page.tsx`        | List page           | 140   |
| `settings/rules/new/page.tsx`    | Create page         | 40    |
| `settings/rules/[id]/page.tsx`   | Edit page with tabs | 120   |
| `rules/rules-list-table.tsx`     | Table component     | 195   |
| `rules/rule-form.tsx`            | Form component      | 175   |
| `rules/condition-builder.tsx`    | Condition UI        | 210   |
| `rules/action-selector.tsx`      | Action UI           | 235   |
| `rules/rule-test-panel.tsx`      | Test UI             | 195   |
| `settings/layout.tsx` (modified) | Navigation          | +2    |

## Technical Notes

### API Integration

Uses tanstack/react-query for:

- `useQuery` for fetching rules, test results, execution logs
- `useMutation` for create, update, delete, activate, deactivate, test
- Query invalidation on mutations for cache consistency

### Condition Builder

Supports json-rules-engine format:

```typescript
{
  all: [
    { fact: "severity", operator: "severityIn", value: ["HIGH", "CRITICAL"] },
    { fact: "categoryId", operator: "categoryIn", value: ["cat-fraud"] },
  ];
}
```

### Action Selector

Supports four action types:

- assign_user: { userId: string }
- assign_team: { teamId: string }
- round_robin: { teamId: string, maxOpenCases?: number }
- set_priority: { priority: string }

## Next Phase Readiness

**Ready for Phase 40-08 (Demo Seed Data):**

- UI complete for viewing and managing rules
- Test panel ready to display test results
- Execution logs panel ready to show history
- API endpoints expected by UI are defined in rulesApi

**Integration Points:**

- Backend rules API must match rulesApi endpoints
- Test results format must match RuleTestResult interface
- Execution logs format must match RuleExecutionLog interface
