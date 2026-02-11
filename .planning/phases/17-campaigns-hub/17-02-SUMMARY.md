---
phase: 17-campaigns-hub
plan: 02
subsystem: campaigns
tags: [frontend, campaigns, detail-page, lifecycle, assignments]
dependency-graph:
  requires: [17-01]
  provides:
    [campaign-detail-page, campaign-assignments-view, campaign-lifecycle-ui]
  affects: [17-03, 17-04]
tech-stack:
  added: []
  patterns: [tabbed-layout, lifecycle-buttons, assignment-table]
key-files:
  created:
    - apps/frontend/src/components/campaigns/campaign-detail.tsx
    - apps/frontend/src/app/(authenticated)/campaigns/[id]/page.tsx
  modified:
    - apps/frontend/src/types/campaign.ts
    - apps/frontend/src/lib/campaigns-api.ts
    - apps/frontend/src/hooks/use-campaigns.ts
    - apps/frontend/src/components/campaigns/index.ts
    - apps/frontend/src/app/(authenticated)/campaigns/new/page.tsx
decisions:
  - id: 17-02-01
    title: "Tabbed layout for campaign detail"
    decision: "Three tabs: Overview, Assignments, Settings"
    rationale: "Matches HubSpot pattern for complex entity views"
  - id: 17-02-02
    title: "Lifecycle buttons conditional on status"
    decision: "DRAFT=Launch, ACTIVE=Pause/Cancel/Remind, PAUSED=Resume/Cancel, SCHEDULED=Cancel"
    rationale: "State machine pattern ensures valid transitions only"
  - id: 17-02-03
    title: "AlertDialog for destructive actions"
    decision: "Confirmation dialogs for Launch and Cancel operations"
    rationale: "Prevent accidental campaign state changes"
metrics:
  duration: ~25 min
  completed: 2026-02-11
---

# Phase 17 Plan 02: Campaign Detail Page Summary

**One-liner:** Campaign detail page with tabbed layout (Overview/Assignments/Settings), lifecycle action buttons, and assignment table with status badges.

## What Was Built

### Task 1: Campaigns API Extensions

Extended the campaigns API client and React Query hooks to support the detail page:

**Types (campaign.ts):**

- `CampaignAssignment` interface with employeeSnapshot for denormalized employee data
- `CampaignAssignmentStatus` type (PENDING, NOTIFIED, IN_PROGRESS, COMPLETED, OVERDUE, SKIPPED)
- `CampaignSummary` for dashboard widgets
- `ASSIGNMENT_STATUS_LABELS` and `ASSIGNMENT_STATUS_COLORS` for UI display
- Extended `CreateCampaignDto` to include `formDefinitionId`, `audienceMode`, `criteria`, `launchAt`

**API Client (campaigns-api.ts):**

- `getAssignments(id, params)` - GET /campaigns/:id/assignments with pagination
- `getOverdueCampaigns(limit)` - GET /campaigns/dashboard/overdue
- `getUpcomingDeadlines(params)` - GET /campaigns/dashboard/upcoming
- `sendReminders(id)` - POST /campaigns/:id/remind

**Hooks (use-campaigns.ts):**

- `useCampaignAssignments(id, params)` - Query for campaign assignments
- `useOverdueCampaigns(limit)` - Query for overdue campaigns
- `useUpcomingDeadlines(params)` - Query for upcoming deadlines
- `useSendReminders()` - Mutation for sending reminders

### Task 2: Campaign Detail Component and Page

**CampaignDetail Component (580 lines):**

Header section:

- Back link to /campaigns
- Campaign name as h1
- Status Badge using CAMPAIGN_STATUS_COLORS
- Type Badge using CAMPAIGN_TYPE_COLORS
- Conditional action buttons based on campaign.status

Overview Tab:

- Summary cards row: Total Assignments, Completed (green), Overdue (red), Completion Rate
- Progress component showing completion percentage
- Campaign details: Due Date, Start Date, Launched At, Created At, Owner

Assignments Tab:

- useCampaignAssignments hook for data fetching
- Table with columns: Employee Name, Email, Department, Status, Assigned At, Completed At
- Status badges with color coding

Settings Tab:

- Read-only campaign configuration display
- Edit Campaign button (visible only for DRAFT campaigns)

Dialogs:

- AlertDialog for Launch confirmation
- AlertDialog for Cancel confirmation with destructive styling

**Page Component:**

- Route: /campaigns/[id]
- useParams() to extract campaign ID
- useCampaign(id) hook for data fetching
- Suspense boundary with skeleton loading state
- notFound() for error handling

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CreateCampaignDto type compatibility**

- **Found during:** Task 1 (pre-commit hook failed)
- **Issue:** campaigns/new/page.tsx was passing properties not in CreateCampaignDto
- **Fix:** Extended CreateCampaignDto with formDefinitionId, audienceMode, criteria, launchAt fields
- **Files modified:** apps/frontend/src/types/campaign.ts, apps/frontend/src/app/(authenticated)/campaigns/new/page.tsx

## Commits

| Hash    | Message                                                                          |
| ------- | -------------------------------------------------------------------------------- |
| 4733750 | feat(17-02): extend campaigns API client and hooks for assignments and dashboard |
| df2118c | docs(17-01): complete campaigns hub plan 01 (includes Task 2 files)              |

## Verification Checklist

- [x] Frontend TypeScript compiles without errors
- [x] /campaigns/[id]/page.tsx exists and uses useCampaign hook
- [x] campaign-detail.tsx has Overview, Assignments, Settings tabs
- [x] Lifecycle buttons conditionally render based on campaign status
- [x] Assignments tab fetches and displays campaign assignments
- [x] campaigns/index.ts exports CampaignDetail

## Key Patterns Established

1. **Tabbed Entity Detail Layout**
   - Tabs component from shadcn/ui
   - Overview for summary, entity-specific tabs for related data, Settings for configuration
   - Pattern reusable for other entity detail pages

2. **Lifecycle Action Buttons**
   - Conditional rendering based on entity status
   - State machine pattern ensures valid transitions
   - AlertDialog confirmation for destructive actions

3. **Assignment Table Pattern**
   - Employee snapshot for denormalized display
   - Status badges with color coding
   - Pagination-ready structure

## Next Phase Readiness

Phase 17-03 (if exists) can build upon:

- Campaign detail page structure
- Assignment table component patterns
- Lifecycle mutation hooks
