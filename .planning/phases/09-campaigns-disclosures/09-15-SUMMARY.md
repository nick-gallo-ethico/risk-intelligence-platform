---
phase: "09"
plan: "15"
subsystem: "campaigns-ui"
tags: ["frontend", "react", "campaigns", "segment-builder", "scheduling"]
dependency-graph:
  requires: ["09-07", "09-08", "09-13"]
  provides: ["campaign-builder-ui", "segment-builder", "schedule-config"]
  affects: ["09-16", "09-17"]
tech-stack:
  added: ["@radix-ui/react-tooltip"]
  patterns: ["multi-step-wizard", "live-preview", "debounced-search"]
key-files:
  created:
    - "apps/frontend/src/components/campaigns/SegmentBuilder.tsx"
    - "apps/frontend/src/components/campaigns/ScheduleConfig.tsx"
    - "apps/frontend/src/components/campaigns/CampaignBuilder.tsx"
    - "apps/frontend/src/components/campaigns/index.ts"
    - "apps/frontend/src/components/ui/tooltip.tsx"
    - "apps/frontend/src/app/campaigns/new/page.tsx"
    - "apps/frontend/src/app/campaigns/[id]/edit/page.tsx"
  modified: []
decisions:
  - id: "RS.50-impl"
    title: "Mom-test friendly segment builder with simple/advanced modes"
    rationale: "Simple mode for non-technical users, advanced mode for power users"
  - id: "wave-presets"
    title: "Three wave presets: 25%/day, pilot first (10%), gradual ramp-up"
    rationale: "Common rollout patterns available as one-click presets"
  - id: "reminder-presets"
    title: "Three reminder presets: standard, aggressive, minimal"
    rationale: "Quick configuration of common reminder schedules"
metrics:
  duration: "11 min"
  completed: "2026-02-04"
---

# Phase 9 Plan 15: Campaign Builder UI Summary

**One-liner:** Mom-test friendly campaign builder with segment targeting, staggered rollout scheduling, and configurable reminder sequences.

## What Was Built

### 1. SegmentBuilder Component (apps/frontend/src/components/campaigns/SegmentBuilder.tsx)

Mom-test friendly audience targeting per RS.50:

**Simple Mode (default):**
- Department multi-select with checkbox picker and search
- Location multi-select with checkbox picker and search
- "Include their direct reports" toggle
- Live preview count updated with 500ms debounce

**Advanced Mode (expandable):**
- Field selector with all employee attributes (job title, tenure, manager, etc.)
- Operator selector (equals, contains, in, greater than, etc.)
- Value input with comma-separated support for "in" operator
- Add/remove conditions dynamically
- AND/OR logic toggle

**Audience Preview:**
- Natural language summary: "Everyone in [Finance, Procurement] at [US locations]"
- Real-time count display
- Preview modal with employee table (name, department, location, email)
- CSV export functionality
- Warning when 0 matches

### 2. ScheduleConfig Component (apps/frontend/src/components/campaigns/ScheduleConfig.tsx)

Campaign scheduling interface per RS.53:

**Launch Options:**
1. **Immediate** - Launch now
2. **Scheduled** - Date/time picker with timezone selection
3. **Staggered** - Wave configuration builder

**Staggered Rollout Features:**
- Add/remove waves with percentage or count
- Day offset configuration per wave
- Visual timeline showing wave distribution
- Presets: "25% per day", "Pilot first (10%)", "Gradual ramp-up"

**Deadline Settings:**
- Absolute date or relative (X days after assignment)
- Blackout date warnings in calendar picker
- Dates in blackout period highlighted

**Reminder Configuration:**
- Add/remove reminder milestones
- Days before deadline input
- CC Manager toggle per reminder
- CC HR toggle per reminder
- Visual reminder timeline
- Presets: "Standard (5, 10, 13)", "Aggressive (3, 7, 10, 14)", "Minimal (7, 14)"

### 3. CampaignBuilder Wizard (apps/frontend/src/components/campaigns/CampaignBuilder.tsx)

Multi-step campaign creation wizard:

**Steps:**
1. **Basic Info** - Name, description, campaign type, form template
2. **Audience** - SegmentBuilder integration
3. **Schedule** - ScheduleConfig integration
4. **Review** - Full summary with edit links

**Features:**
- Step indicator with progress tracking
- Save draft at any step
- Step validation prevents advancing without required data
- Campaign type options: Disclosure, Attestation, Survey, Acknowledgment
- Form template selection filtered by campaign type
- Review step with summary cards and timeline visualizations
- Launch confirmation dialog with recipient count warning
- Estimated completion date calculation

### 4. Campaign Pages

**Create Page (/campaigns/new):**
- Full CampaignBuilder wizard
- Back navigation to campaigns list
- Clean container layout

**Edit Page (/campaigns/:id/edit):**
- Load existing campaign draft
- Block editing for launched campaigns
- Transform API response to draft format
- Status badge for draft campaigns

### 5. Supporting Components

**Tooltip Component (apps/frontend/src/components/ui/tooltip.tsx):**
- Radix UI tooltip primitive wrapper
- Used for wave timeline and reminder timeline interactions

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Simple mode as default | Non-technical compliance officers should succeed without training |
| 500ms debounce on preview | Balance responsiveness with API efficiency |
| Wave presets | Common patterns available instantly, custom still available |
| Natural language descriptions | "Everyone in Finance at US locations" more readable than JSON |
| CSV export from preview | Compliance needs offline review capability |
| Blackout date warnings | Prevent scheduling during company holidays |

## Verification Results

1. TypeScript compiles without errors (in new components)
2. Simple mode targeting easy to use - checkbox pickers with search
3. Audience preview shows count and sample employees
4. Staggered rollout visualizes correctly - wave timeline component
5. Reminder sequence configurable - timeline visualization included
6. Launch confirmation prevents accidental launches
7. Draft saves preserve progress via Save Draft button

## Deviations from Plan

**[Rule 3 - Blocking] Added @radix-ui/react-tooltip package**
- **Found during:** Task 2
- **Issue:** Tooltip component needed for timeline interactions
- **Fix:** Installed package and created tooltip.tsx component
- **Files modified:** package.json, components/ui/tooltip.tsx

## API Integration Points

The components call these backend endpoints:
- `GET /departments` - Load department list for segment builder
- `GET /locations` - Load location list for segment builder
- `POST /campaigns/audience/preview` - Preview audience count and sample
- `GET /campaigns/blackout-dates` - Load blackout dates for scheduler
- `GET /forms/definitions` - Load form templates by type
- `POST /campaigns/draft` - Save campaign draft
- `POST /campaigns` - Create campaign
- `POST /campaigns/:id/launch` - Launch campaign
- `GET /campaigns/:id` - Load campaign for edit page

## Next Steps

- 09-16: Campaign Dashboard UI (completion tracking, charts)
- 09-17: Disclosure response forms
