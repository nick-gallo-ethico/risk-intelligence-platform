---
phase: 12-internal-operations-portal
plan: 15
title: "Hotline Operations UI"
subsystem: ops-console
tags: [hotline-ops, qa-queue, directives, operator-status, bulk-actions, real-time]

# Dependency Graph
requires: [12-10, 12-13]
provides:
  - HotlineOpsLayout
  - QaQueuePage
  - DirectivesPage
  - OperatorsPage
  - BulkQaActions
  - DirectiveEditor
  - OperatorStatusBoard
affects: [12-16]

# Tech Stack
tech-stack:
  added:
    - "@tanstack/react-query (ops-console)"
    - "date-fns (ops-console)"
  patterns:
    - Auto-refresh polling (30s QA, 5s operators)
    - Bulk action with selection state
    - Grouped list by organization
    - Real-time status board

# Files
key-files:
  created:
    - apps/ops-console/src/app/hotline/layout.tsx
    - apps/ops-console/src/app/hotline/page.tsx
    - apps/ops-console/src/app/hotline/qa-queue/page.tsx
    - apps/ops-console/src/app/hotline/directives/page.tsx
    - apps/ops-console/src/app/hotline/operators/page.tsx
    - apps/ops-console/src/components/hotline/BulkQaActions.tsx
    - apps/ops-console/src/components/hotline/DirectiveEditor.tsx
    - apps/ops-console/src/components/hotline/OperatorStatusBoard.tsx

# Metrics
metrics:
  duration: "14 min"
  completed: "2026-02-06"
---

# Phase 12 Plan 15: Hotline Operations UI Summary

Hotline operations UI for internal Ethico staff to manage QA queue, directives, and operator status.

## What Was Built

### QA Queue Page
Global QA queue for reviewing RIUs across all tenants:
- **Status tabs**: Filter by PENDING, IN_REVIEW, APPROVED, REJECTED
- **Auto-refresh**: Polls every 30 seconds per CONTEXT.md
- **Bulk selection**: Checkbox per row + select all
- **Table columns**: Reference, Client (org), Category, Priority, Created, Status
- **Priority badges**: HIGH (red), MEDIUM (yellow), LOW (gray)
- **API integration**: Fetches from `/api/v1/internal/hotline-ops/qa-queue`

### BulkQaActions Component
Bulk action bar for selected QA items:
- **Approve All**: Green button, immediate action
- **Reject All**: Red button, requires reason input before confirm
- **Escalate**: Yellow button, sets priority to HIGH (3)
- **Selection count**: Shows "{N} items selected"
- **Loading state**: Disabled during mutation
- **API integration**: POST to `/api/v1/internal/hotline-ops/qa-queue/bulk-action`

### Directives Page
Cross-tenant directive management:
- **Search**: Filter by title or organization
- **Drafts filter**: Toggle to show only draft directives
- **Grouped display**: Directives organized by client organization
- **Status indicators**: Active (green) vs Draft (yellow) badges
- **Metadata display**: Stage, version, read-aloud flag, category
- **API integration**: Fetches from `/api/v1/internal/hotline-ops/directives`

### DirectiveEditor Modal
Create/edit directives with version tracking:
- **Organization ID**: Required for new directives (UUID input)
- **Stage selector**: OPENING, INTAKE, CATEGORY_SPECIFIC, CLOSING
- **Category ID**: Optional, for category-specific directives
- **Title/Content**: Standard text inputs
- **Read Aloud toggle**: Orange highlight, indicates verbatim requirement
- **Approve and Publish**: Checkbox for drafts, activates immediately
- **Version notice**: Warning that edits create new version
- **Unsaved changes**: Indicator in footer

### Operators Page
Real-time operator status board:
- **Live updates**: Polls every 5 seconds per CONTEXT.md
- **Last updated**: Timestamp display
- **Connection indicator**: Green wifi icon for live status

### OperatorStatusBoard Component
Visual operator status display:
- **Summary cards**: Available, On Call, On Break, Offline counts
- **Capacity bar**: Visual progress bar of available capacity
- **Operator grid**: Grouped by status (Available first)
- **Operator cards**: ID, status dot, last update time, languages
- **Language skills**: Globe icon with language list
- **Current call**: Shows call ID for ON_CALL operators

## Commits

| Hash | Message |
|------|---------|
| c1f8bd3 | feat(12-15): add ops-console app with hotline ops layout and QA queue |
| f391119 | feat(12-15): add directive management and operator status pages |

## Technical Decisions

### Auto-Refresh Intervals
- QA Queue: 30 seconds (slower, less volatile data)
- Operator Status: 5 seconds (real-time needs)
- Both use TanStack Query refetchInterval

### Bulk Action Pattern
- Selection stored in React state (Set<string>)
- Bulk action mutations invalidate query cache
- Selection cleared on successful action
- Reject requires reason before confirm

### Directive Grouping
- Client-side grouping by organization name
- Sorted alphabetically by org name
- Unknown organization falls back to "Unknown Organization"

### Version Tracking
- UI shows version number on directives
- Edit warning explains version preservation
- approveAndPublish flag for draft->active transition

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- [x] TypeScript compiles without errors
- [x] Build succeeds
- [x] QA queue page: 281 lines (min 150)
- [x] OperatorStatusBoard: 203 lines (min 80)
- [x] BulkQaActions POSTs to correct endpoint
- [x] QA queue auto-refreshes every 30s
- [x] Bulk select with checkbox and "select all"
- [x] Bulk approve, reject (with reason), escalate actions
- [x] Directive list grouped by organization
- [x] Directive editor with stage, content, read-aloud toggle
- [x] "Approve and publish" option for draft directives
- [x] Operator status board with summary counts
- [x] Individual operator cards show status, last update, languages
- [x] Status refreshes every 5 seconds

## Next Steps

- 12-16: Add support console pages for tenant search and debug access
- Future: Add WebSocket integration for instant operator status updates
- Future: Add directive version history viewer
