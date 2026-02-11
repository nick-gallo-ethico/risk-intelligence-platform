---
phase: 15
plan: 09
subsystem: case-detail
tags: [riu, form-data, intake-display, collapsible-sections]
depends_on:
  requires: []
  provides: [riu-form-data-endpoint, linked-riu-form-answers-component]
  affects: [case-detail-view, riu-display]
tech-stack:
  added: []
  patterns:
    [type-specific-section-builders, collapsible-sections, form-field-rendering]
key-files:
  created:
    - apps/backend/src/modules/rius/rius.controller.ts
    - apps/backend/src/modules/rius/types/riu-form-data.types.ts
    - apps/frontend/src/components/cases/linked-riu-form-answers.tsx
  modified:
    - apps/backend/src/modules/rius/rius.service.ts
    - apps/backend/src/modules/rius/rius.module.ts
    - apps/frontend/src/components/cases/case-tabs.tsx
decisions:
  - id: riu-section-structure
    decision: Build type-specific sections (HOTLINE_REPORT, WEB_FORM_SUBMISSION, DISCLOSURE_RESPONSE) with tailored fields
    rationale: Different RIU types capture different intake data; tailored sections provide better UX
metrics:
  duration: 9 minutes
  completed: 2026-02-11
---

# Phase 15 Plan 09: RIU Intake Form Answers Display Summary

**One-liner:** Backend endpoint and frontend component to display RIU intake form Q&A organized by collapsible sections in case detail.

## What Was Built

### Backend: RIU Form Data Endpoint

**New Controller:** `apps/backend/src/modules/rius/rius.controller.ts`

- `GET /rius/:id/form-data` - Returns structured form data organized by sections
- JWT/Tenant guard protected
- Swagger documented

**Service Methods:** Added to `apps/backend/src/modules/rius/rius.service.ts`

- `getFormData()` - Fetches RIU with extensions and structures into sections
- `structureFormData()` - Routes to type-specific section builders
- `buildHotlineSections()` - Report Info, Reporter Details, Incident Details, Classification, Processing
- `buildWebFormSections()` - Submission Info, Reporter Details, Report Details, Classification
- `buildDisclosureSections()` - Disclosure Info, Disclosure Details, Review Status, Classification
- `buildGenericSections()` - Fallback for other RIU types
- `buildCustomFieldsSection()` - Parses customFields and formResponses JSON
- Helper methods for formatting (source channel, status, reporter type, QA status, disclosure type, currency)

**Types:** `apps/backend/src/modules/rius/types/riu-form-data.types.ts`

- `FormFieldType` - text, textarea, select, multiselect, date, datetime, boolean, number, currency
- `FormField` - label, value, type
- `FormSection` - id, title, fields[]
- `RiuFormDataResponse` - riuId, riuType, referenceNumber, sections[]

### Frontend: LinkedRiuFormAnswers Component

**Component:** `apps/frontend/src/components/cases/linked-riu-form-answers.tsx`

- Fetches from `/rius/:id/form-data` on mount
- Collapsible sections using shadcn/ui Collapsible
- Expand/Collapse all control
- First section expanded by default
- Type-specific field rendering:
  - Boolean: Green/gray badge with Yes/No
  - Textarea: Multiline with scroll
  - Date/DateTime: Formatted locale strings
  - Number: Localized with commas
  - Currency: Pre-formatted by backend
  - Multiselect: Tag badges
- Loading skeleton and error states

### Integration: Case Tabs Overview

**Modified:** `apps/frontend/src/components/cases/case-tabs.tsx`

- Added import for LinkedRiuFormAnswers
- New "Original Intake Details" section in Overview tab
- Displays after Linked RIUs section
- Uses primary RIU (or first if no primary)

## Commits

| Task | Commit  | Description                                                 |
| ---- | ------- | ----------------------------------------------------------- |
| 1    | b193be5 | feat(15-09): add RIU form-data endpoint                     |
| 2    | 586d2f0 | feat(15-09): add LinkedRiuFormAnswers frontend component    |
| 3    | cf78c36 | feat(15-09): integrate LinkedRiuFormAnswers in Overview tab |

## Verification Results

All verification checks passed:

- Backend TypeScript: Compiles without errors
- Frontend TypeScript: Compiles without errors
- `form-data` found in rius.controller.ts (lines 18, 34, 42)
- `LinkedRiuFormAnswers` found in case-tabs.tsx (lines 21, 399)

## Success Criteria Met

1. GET /rius/:id/form-data endpoint returns structured form data by section
2. LinkedRiuFormAnswers component renders intake Q&A with collapsible sections
3. Overview tab in case detail shows original intake details
4. Different RIU types display appropriate fields (hotline vs web form vs disclosure)

## Deviations from Plan

None - plan executed exactly as written.

## Files Summary

| File                                                           | Change   | Lines |
| -------------------------------------------------------------- | -------- | ----- |
| apps/backend/src/modules/rius/rius.controller.ts               | Created  | 64    |
| apps/backend/src/modules/rius/types/riu-form-data.types.ts     | Created  | 50    |
| apps/backend/src/modules/rius/rius.service.ts                  | Modified | +600  |
| apps/backend/src/modules/rius/rius.module.ts                   | Modified | +3    |
| apps/frontend/src/components/cases/linked-riu-form-answers.tsx | Created  | 342   |
| apps/frontend/src/components/cases/case-tabs.tsx               | Modified | +25   |

## Technical Notes

### Section Structure by RIU Type

**HOTLINE_REPORT:**

- Report Information: reference, channel, created, status, call duration
- Reporter Details: type, name, email, phone, callback info
- Incident Details: narrative, summary, location, caller demeanor, interpreter
- Classification: category, severity
- Processing: QA status, operator notes

**WEB_FORM_SUBMISSION:**

- Submission Information: reference, form name, channel, source, submitted at, duration, attachments
- Reporter Details: type, contact info
- Report Details: narrative, summary, location
- Classification: category, severity, status

**DISCLOSURE_RESPONSE:**

- Disclosure Information: reference, type, subtype, submitted, status
- Disclosure Details: narrative, value, related person/company, relationship, dates
- Review Status: threshold triggered, conflict detected, reason
- Classification: category, severity

### API Response Structure

```typescript
{
  riuId: string,
  riuType: "HOTLINE_REPORT" | "WEB_FORM_SUBMISSION" | "DISCLOSURE_RESPONSE",
  referenceNumber: string,
  sections: [
    {
      id: "report-info",
      title: "Report Information",
      fields: [
        { label: "Reference Number", value: "RIU-2026-00001", type: "text" },
        { label: "Created At", value: "2026-02-11T02:00:00Z", type: "datetime" }
      ]
    }
  ]
}
```

## Next Phase Readiness

This plan closes Gap 1 from Phase 15 verification - the case detail page now displays original RIU intake form questions and answers organized by sections, providing full visibility into intake data without leaving the case view.
