---
phase: 15
plan: 03
subsystem: frontend/case-detail
tags: [tabs, activity-feed, summary, lifecycle, ui]
requires: [15-01, 15-07]
provides: [fixed-activity-api, summary-tab, enhanced-overview]
affects: [15-04, 15-05, 15-06]
tech-stack:
  added: []
  patterns: [pipeline-progress-visualization, tab-navigation-with-url-sync]
key-files:
  created:
    - apps/frontend/src/components/cases/summary-tab.tsx
  modified:
    - apps/frontend/src/components/cases/case-activity-timeline.tsx
    - apps/frontend/src/components/cases/case-tabs.tsx
decisions:
  - id: 15-03-01
    decision: "Activity feed API path fixed to /activity/CASE/:id"
    rationale: "Backend ActivityTimelineController uses entityType as first path param, not 'entity' prefix"
  - id: 15-03-02
    decision: "7 tabs in order: Overview, Activities, Summary, Investigations, Messages, Files, Remediation"
    rationale: "Matches plan requirements and logical workflow progression"
  - id: 15-03-03
    decision: "Pipeline progress uses 5 stages: New, Triage, Investigation, Review, Closed"
    rationale: "Standard case lifecycle stages that map to status values"
metrics:
  duration: ~12 minutes
  completed: 2026-02-10
---

# Phase 15 Plan 03: Center Column Tabs and Activity Feed Summary

Fixed activity feed API path, added Summary tab, enhanced Overview with lifecycle section.

## One-Liner

Fixed activity API to `/activity/CASE/:id`, added Summary tab with AI/manual summary display, enhanced Overview with pipeline progress and assignee visualization.

## What Was Built

### 1. Fixed Activity Feed API Path (Task 1)

**File:** `apps/frontend/src/components/cases/case-activity-timeline.tsx`

- Changed API endpoint from `/activity/entity/CASE/${id}` to `/activity/CASE/${id}`
- Added query parameters: `includeRelated=true&limit=50`
- Added `TimelineResponse` interface matching backend `TimelineResponseDto`
- Transform backend response format (`.entries`) to frontend Activity format
- Added fallback to `/cases/${id}/activity` endpoint
- Removed fake fallback data - shows error with retry button instead
- Added `RefreshCw` icon for retry button

### 2. Created SummaryTab Component (Task 2)

**File:** `apps/frontend/src/components/cases/summary-tab.tsx`

Two-section layout:

1. **Case Summary** - Shows AI or manual summary with badge indicator
   - Purple "AI Generated" badge when `aiSummary` exists
   - Gray "Manual" badge when only `summary` exists
   - Placeholder when no summary available
   - Timestamp when AI summary was generated

2. **Case Details** - Shows full `details` write-up
   - White card with border styling
   - Placeholder when no details

### 3. Updated CaseTabs Configuration (Task 2)

**File:** `apps/frontend/src/components/cases/case-tabs.tsx`

- **New tab order (7 tabs):**
  1. Overview (FileText icon)
  2. Activities (Activity icon)
  3. Summary (ScrollText icon)
  4. Investigations (Search icon)
  5. Messages (MessageSquare icon)
  6. Files (Paperclip icon)
  7. Remediation (ClipboardCheck icon)

- Added Summary TabsContent with SummaryTab component
- Added `summary` to TabCounts interface
- Updated skeleton to render 7 placeholder tabs

### 4. Enhanced Overview Tab (Task 2)

**File:** `apps/frontend/src/components/cases/case-tabs.tsx` (OverviewTab function)

New sections added:

1. **Lifecycle Section** - Pipeline progress visualization
   - 5-stage progress indicator: New, Triage, Investigation, Review, Closed
   - Visual circles with connecting lines
   - Current stage highlighted in blue with ring
   - Completed stages shown in green
   - Status badge (NEW/OPEN/CLOSED)
   - Assigned investigators with avatar circles

2. **Recent Activity Link** - CTA to Activities tab
   - "View Activities" button with arrow icon
   - Uses `onTabChange` callback to switch tabs

## Technical Details

### Activity Timeline Response Transformation

The backend `ActivityTimelineController` returns:

```typescript
{
  entries: TimelineEntryDto[];
  total: number;
  hasMore: boolean;
  page: number;
  limit: number;
}
```

Frontend transforms to `Activity[]` format:

- Maps `entry.entityType` to `Activity['entityType']`
- Maps `entry.action` to `Activity['action']`
- Sets `actorType` based on `actorUserId` presence
- Handles Date objects or ISO strings for `createdAt`

### Pipeline Stage Mapping

When `pipelineStage` is not set, maps from `status`:

- `NEW` -> Stage 0 (New)
- `OPEN` -> Stage 2 (Investigation)
- `CLOSED` -> Stage 4 (Closed)

## Commits

| Hash      | Description                                                              |
| --------- | ------------------------------------------------------------------------ |
| `0beb4fc` | fix(15-03): correct activity feed API path (part of 15-02 commit)        |
| `eda86a2` | feat(15-03): add Summary tab and enhance Overview with lifecycle section |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. `npx tsc --noEmit` - PASSED
2. Activity API path is `/activity/CASE/${id}` - VERIFIED
3. SummaryTab component exists with summary + details sections - VERIFIED
4. TABS array has 7 entries including 'summary' - VERIFIED
5. TabsContent for 'summary' renders SummaryTab - VERIFIED
6. Overview tab has lifecycle section - VERIFIED
7. All 7 tabs configured in correct order - VERIFIED

## Next Phase Readiness

Ready for:

- **15-04**: Right column panels (AI assistance, connected people)
- **15-05**: File attachments and messaging
- **15-06**: Investigations tab enhancements

## Notes

The activity feed fix (Task 1) was partially committed as part of the 15-02 work that ran prior to this plan. The changes were already in the file when this plan started, so Task 1 verification confirmed the fix was in place.
