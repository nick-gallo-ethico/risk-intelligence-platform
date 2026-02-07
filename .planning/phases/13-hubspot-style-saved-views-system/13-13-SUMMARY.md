---
phase: 13-hubspot-style-saved-views-system
plan: 13
subsystem: frontend-views
tags: [disclosures, intake-forms, saved-views, module-config]
status: complete

dependency-graph:
  requires:
    - 13-11 (Cases/Views integration)
    - 13-12 (Investigations/Policies integration)
  provides:
    - Disclosures view configuration
    - Intake Forms view configuration
    - Central module config index
  affects:
    - 13-14 (URL state sync)
    - 13-15 (UAT)

tech-stack:
  added: []
  patterns:
    - Module view config pattern
    - COI-specific disclosure columns
    - AI triage integration for intake forms

key-files:
  created:
    - apps/frontend/src/lib/views/configs/disclosures.config.ts
    - apps/frontend/src/lib/views/configs/intake-forms.config.ts
    - apps/frontend/src/lib/views/configs/index.ts
    - apps/frontend/src/hooks/views/useDisclosuresView.ts
    - apps/frontend/src/hooks/views/useIntakeFormsView.ts
  modified:
    - apps/frontend/src/hooks/views/index.ts
    - apps/frontend/src/app/(authenticated)/disclosures/page.tsx
    - apps/frontend/src/app/(authenticated)/intake-forms/page.tsx
    - apps/frontend/src/components/views/SavedViewProvider.tsx (bugfix)

decisions:
  - id: disclosures-columns
    description: "Include gift value, gift description, third party, relationship, outside activity fields as module-specific columns"
    rationale: "COI disclosures require domain-specific data not present in generic entity views"

  - id: intake-ai-triage
    description: "Include aiCategory, aiPriority, aiSummary, aiConfidence columns"
    rationale: "AI triage is central to intake processing workflow"

  - id: central-config-index
    description: "Create MODULE_VIEW_CONFIGS map with getModuleViewConfig helper"
    rationale: "Enable dynamic config lookup by moduleType for generic components"

metrics:
  duration: 17 min
  completed: 2026-02-07
---

# Phase 13 Plan 13: Disclosures and Intake Forms Module Integration Summary

COI-specific disclosures and intake form submissions with full saved views.

## What Was Built

1. **DISCLOSURES_VIEW_CONFIG** - Complete view configuration for disclosures module
   - Property groups: core, submitter, review, dates, gift, relationship, outside_activity, campaign, outcome
   - COI-specific columns: giftValue, giftDescription, thirdParty, relationship, activityName, hoursPerWeek
   - Default views: All Disclosures, Pending Review, High Risk, Gifts Over $100, Conflicts of Interest, Outside Activities
   - Board view grouped by status with risk level display

2. **INTAKE_FORMS_VIEW_CONFIG** - Complete view configuration for intake forms
   - Property groups: core, submitter, dates, assignment, outcome, ai
   - Source channel tracking: web_form, employee_portal, ethics_portal, mobile_app
   - AI triage columns: aiCategory, aiPriority, aiSummary, aiConfidence
   - Default views: All Submissions, Pending Review, Anonymous Reports, Ethics Reports, Compliance Concerns, High Priority (AI)
   - Board view grouped by status

3. **useDisclosuresView Hook** - Data fetching and bulk actions for disclosures
   - Status, risk level, assign, and delete bulk mutations
   - COI-specific Disclosure type with gift, relationship, outside activity fields

4. **useIntakeFormsView Hook** - Data fetching and bulk actions for intake forms
   - Status, assign, create-cases, and delete bulk mutations
   - IntakeFormSubmission type with AI triage fields

5. **Central Config Index** - All module configs from single entry point
   - MODULE_VIEW_CONFIGS map for dynamic lookup
   - getModuleViewConfig(), getAvailableModuleTypes(), isValidModuleType() helpers

6. **Page Updates** - Both pages now use SavedViewProvider
   - Disclosures page with Form Builder quick action
   - Intake Forms page with IntakeChannelsBar for channel navigation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed missing Next.js navigation hook imports**

- **Found during:** Task 3
- **Issue:** SavedViewProvider.tsx was missing useRouter and useSearchParams imports, causing typecheck failure
- **Fix:** Added import statement for Next.js navigation hooks
- **Files modified:** apps/frontend/src/components/views/SavedViewProvider.tsx
- **Commit:** Part of commit 2762569 (from prior plan)

## Key Artifacts

| File                     | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| `disclosures.config.ts`  | 618 lines - COI disclosure columns and views    |
| `intake-forms.config.ts` | 430 lines - Intake submission columns and views |
| `configs/index.ts`       | Central export with lookup helpers              |
| `useDisclosuresView.ts`  | Hook with COI-specific mutations                |
| `useIntakeFormsView.ts`  | Hook with create-cases bulk action              |

## Commits

| Hash    | Message                                                                  |
| ------- | ------------------------------------------------------------------------ |
| e264bd9 | feat(13-13): add Disclosures module view configuration                   |
| 5ff9c86 | feat(13-13): add hooks and update pages for Disclosures and Intake Forms |
| 6ef601a | feat(13-13): add central module config index with lookup functions       |

## Next Phase Readiness

**Ready for:** 13-14 (URL State Synchronization) - all 5 module configs complete

**All modules integrated:**

- Cases (13-11)
- Investigations (13-12)
- Policies (13-12)
- Disclosures (13-13)
- Intake Forms (13-13)

**Testing checklist:**

- [ ] Disclosures page loads with saved views UI
- [ ] Intake Forms page loads with saved views UI
- [ ] Quick filters work for type, status, risk level
- [ ] Board view drag-and-drop updates status
- [ ] Bulk actions (assign, status, export) function correctly
- [ ] Central config index exports all 5 modules
