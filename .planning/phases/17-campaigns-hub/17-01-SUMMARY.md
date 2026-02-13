---
phase: 17
plan: 01
subsystem: campaigns-hub
tags: [campaigns, dashboard, navigation, api]
dependency-graph:
  requires: []
  provides: [dashboard-endpoints, campaigns-navigation, create-campaign-page]
  affects: [17-02, 17-03, 17-04]
tech-stack:
  added: []
  patterns: [controller-endpoint-wiring, navigation-config, page-routing]
key-files:
  created:
    - apps/frontend/src/app/(authenticated)/campaigns/new/page.tsx
  modified:
    - apps/backend/src/modules/campaigns/campaigns.controller.ts
    - apps/frontend/src/lib/navigation.ts
    - apps/frontend/src/app/(authenticated)/campaigns/page.tsx
decisions:
  - key: dashboard-route-order
    choice: Dashboard routes placed BEFORE :id route
    rationale: NestJS evaluates routes top-down; dashboard would match :id if placed after
  - key: campaign-type-mapping
    choice: ACKNOWLEDGMENT mapped to ATTESTATION for API compatibility
    rationale: CampaignBuilder has 4 types but API supports 3; ACKNOWLEDGMENT is effectively attestation
metrics:
  duration: ~15 minutes
  completed: 2026-02-11
---

# Phase 17 Plan 01: Wire Backend Dashboard Endpoints and Navigation Summary

## One-liner

Backend dashboard endpoints wired to existing services, sidebar navigation added for Campaigns and Forms, /campaigns/new page created with CampaignBuilder wizard.

## What Was Built

### Task 1: Backend Dashboard + Reminder Controller Endpoints

Wired 4 new endpoints to CampaignsController by injecting CampaignDashboardService and CampaignReminderService:

1. **GET /api/v1/campaigns/dashboard/stats** - Returns overall dashboard statistics including campaign counts by status, assignment metrics, and completion rates

2. **GET /api/v1/campaigns/dashboard/overdue** - Returns campaigns with overdue assignments, sorted by overdue count. Accepts optional `limit` query param (default 10)

3. **GET /api/v1/campaigns/dashboard/upcoming** - Returns active campaigns with deadlines within specified days. Accepts optional `days` (default 7) and `limit` (default 10) query params

4. **POST /api/v1/campaigns/:id/remind** - Triggers reminder sending for a specific campaign. Finds pending reminders and queues them via CampaignReminderService

**Critical Implementation Detail:** Dashboard routes are placed BEFORE the `:id` route to prevent route matching conflicts (NestJS evaluates routes top-down).

### Task 2: Sidebar Navigation + Create Campaign Page

**Navigation Updates (navigation.ts):**

- Added `Megaphone` icon for Campaigns entry
- Added `FileInput` icon for Forms entry
- Inserted entries after Policies and before Projects in navigationItems array

**Create Campaign Page (/campaigns/new/page.tsx):**

- Header with back link to /campaigns
- CampaignBuilder wizard component with full functionality
- `onSave` handler: Creates campaign draft and navigates to detail page
- `onLaunch` handler: Creates campaign, launches it, then navigates to detail page
- Type mapping: Handles CampaignBuilder's ACKNOWLEDGMENT type by mapping to ATTESTATION for API compatibility

**Campaigns List Page Enhancement:**

- Added "Manage Forms" button in header next to "Create Campaign"
- Button navigates to /forms for form template management

## Key Artifacts

| File                                                           | Purpose                                        |
| -------------------------------------------------------------- | ---------------------------------------------- |
| `apps/backend/src/modules/campaigns/campaigns.controller.ts`   | Dashboard and reminder endpoints               |
| `apps/frontend/src/lib/navigation.ts`                          | Sidebar navigation config with Campaigns/Forms |
| `apps/frontend/src/app/(authenticated)/campaigns/new/page.tsx` | Campaign creation page                         |
| `apps/frontend/src/app/(authenticated)/campaigns/page.tsx`     | Campaigns list with Manage Forms button        |

## Commits

| Hash    | Description                                                                      |
| ------- | -------------------------------------------------------------------------------- |
| 00d0bb3 | feat(17-01): wire dashboard and reminder controller endpoints                    |
| 4733750 | feat(17-02): extend campaigns API client and hooks for assignments and dashboard |

Note: Task 2 changes were committed together with additional API client work in commit 4733750.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed CampaignType incompatibility**

- **Found during:** Task 2 - Create Campaign Page
- **Issue:** CampaignBuilder uses 4 types (DISCLOSURE, ATTESTATION, SURVEY, ACKNOWLEDGMENT) but API's CampaignType only defines 3
- **Fix:** Added type mapping in buildCreateDto to map ACKNOWLEDGMENT to ATTESTATION
- **Files modified:** apps/frontend/src/app/(authenticated)/campaigns/new/page.tsx

## Verification Results

All verification criteria passed:

- [x] Backend TypeScript compiles without errors
- [x] Frontend TypeScript compiles without errors
- [x] Navigation items array contains Campaigns and Forms entries
- [x] /campaigns/new/page.tsx exists and imports CampaignBuilder
- [x] campaigns.controller.ts has dashboard/stats, dashboard/overdue, dashboard/upcoming, and :id/remind routes
- [x] Dashboard routes are placed BEFORE the :id route to avoid route matching conflicts

## Next Phase Readiness

Ready for Phase 17 Plan 02:

- Dashboard endpoints are wired and ready for frontend consumption
- Navigation provides access to /campaigns and /forms
- /campaigns/new page provides campaign creation flow
- CampaignBuilder wizard is integrated with API hooks

No blockers identified.
