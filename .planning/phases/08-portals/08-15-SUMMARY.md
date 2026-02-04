---
phase: 08-portals
plan: 15
subsystem: operator-console
tags: [frontend, operator, intake-form, ai-cleanup, hris-search]
dependency-graph:
  requires: [08-09]
  provides: [IntakeForm, AiNoteCleanup, CategoryQuestions, SubjectSelector, useIntake, useHrisSearch, useAiNoteCleanup]
  affects: [08-16, 08-17]
tech-stack:
  added: []
  patterns: [auto-save-hook, debounced-search, comparison-view, ai-skill-integration]
key-files:
  created:
    - apps/frontend/src/components/operator/intake-form.tsx
    - apps/frontend/src/components/operator/riu-type-selector.tsx
    - apps/frontend/src/components/operator/category-questions.tsx
    - apps/frontend/src/components/operator/subject-selector.tsx
    - apps/frontend/src/components/operator/ai-note-cleanup.tsx
    - apps/frontend/src/hooks/useIntake.ts
    - apps/frontend/src/hooks/useHrisSearch.ts
    - apps/frontend/src/hooks/useAiNoteCleanup.ts
  modified: []
decisions:
  - key: notes-always-visible
    value: Notes textarea always visible regardless of RIU type
    rationale: Per CONTEXT.md HubSpot pattern - notes always visible during calls
  - key: ai-cleanup-below-notes
    value: AI cleanup button placed below notes area
    rationale: Non-intrusive post-call cleanup option per CONTEXT.md
  - key: subject-unknown-option
    value: Added "Subject Unknown" toggle for unidentified subjects
    rationale: Subjects may not always be identifiable during intake
metrics:
  duration: 8 min
  completed: 2026-02-04
---

# Phase 8 Plan 15: Hotline Intake Form Summary

**One-liner:** Operator Console intake form with RIU type selection, category-specific questions, HRIS subject search, and AI-powered note cleanup with side-by-side comparison view.

## What Was Built

### useIntake Hook
- State management for intake form data (RIU type, category, content, caller info, subject)
- Auto-save every 30 seconds when dirty
- Methods: `updateField`, `updateContent`, `updateCategoryAnswers`, `save`, `submit`, `reset`, `setSubject`
- Handles draft persistence via POST/PUT to `/operator/clients/:id/intake`
- Submit action calls `/operator/clients/:id/intake/:id/submit-qa`

### RiuTypeSelector Component
- Three large buttons: REPORT, REQUEST_FOR_INFO, WRONG_NUMBER
- Each type shows icon, label, and description
- Selection indicator and disabled state support
- Visual styling with type-specific colors (blue/amber/gray)

### IntakeForm Component
- Main form with 6 sections:
  1. **RIU Type** - RiuTypeSelector component
  2. **Category** - Dropdown (Report type only) with high-risk badge
  3. **Category Questions** - Dynamic questions per category
  4. **Content/Notes** - Large textarea (min 200px) always visible
  5. **Caller Info** - Anonymity tier, phone, name (based on tier)
  6. **Subject** - HRIS search or manual entry (Report type only)
- Urgency checkbox with high-risk category indicator
- Action buttons: Save Draft, Clear Form, Submit to QA, Save & Close (Wrong Number)
- Error display for save failures
- Loading states for save/submit operations

### CategoryQuestions Component
- Fetches questions from `/operator/clients/:id/categories/:categoryId/questions`
- Renders dynamic fields based on question schema
- Question types: text, textarea, select, date, checkbox, radio
- Required field indicators
- Help text support

### SubjectSelector Component
- Two modes: HRIS Search, Manual Entry
- HRIS Search:
  - Typeahead search with 300ms debounce
  - Results show name, job title, department
  - Click to select with confirmation card
- Manual Entry:
  - First name, last name, job title, department
  - Relationship dropdown (employee, contractor, vendor, etc.)
- "Subject Unknown" toggle for unidentified subjects
- Selected subject display card with clear button

### useHrisSearch Hook
- Debounced search (300ms) with min 2 characters
- AbortController pattern for cancelling stale requests
- Calls `/operator/clients/:id/hris/search`
- Returns: search function, results, isSearching, clearResults

### AiNoteCleanup Component
- Style selector: "Light" (preserves voice) vs "Full" (formal rewrite)
- "Clean Up Notes" button below notes area
- Comparison view:
  - Side-by-side original vs cleaned
  - Actions: Apply Changes, Keep Original, Edit Cleaned
- Edit mode for manual modification of cleaned content
- Rate limiting display with retry countdown
- Error handling with retry button

### useAiNoteCleanup Hook
- Calls `/ai/skills/note-cleanup/execute` (Phase 5 skill)
- Returns: cleanup function, cleanedContent, isProcessing, error, rateLimitRetryAfter
- Handles rate limit errors gracefully
- Auto-clears rate limit after countdown

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| Notes always visible | Per CONTEXT.md - HubSpot pattern, notes never hidden during calls |
| AI cleanup below notes | Non-intrusive placement for post-call cleanup |
| Subject Unknown option | Subjects may not be identifiable during intake |
| Category questions fetch on selection | Load only when needed, 5-min cache |
| Three RIU types with distinct flows | Report creates case, Request for Info is inquiry, Wrong Number logs and closes |

## Deviations from Plan

None - plan executed exactly as written. All tasks implemented together since they're interdependent (intake form imports all other components).

## Verification Results

1. `npm run build -- --filter=frontend` - PASSED
2. IntakeForm captures RIU type with appropriate fields - VERIFIED
3. Category selection triggers category-specific questions - VERIFIED
4. Subject can be searched via HRIS or entered manually - VERIFIED
5. AI note cleanup shows before/after comparison - VERIFIED
6. Notes area is always visible during intake - VERIFIED

## Next Phase Readiness

Ready for 08-16 (QA Queue UI) and 08-17 (Operator Console Integration):
- IntakeForm can be rendered in OperatorConsoleLayout's intakeFormSlot
- Form integrates with existing operator API structure
- AI cleanup uses Phase 5 skill infrastructure
- HRIS search uses existing operator-api service

## Commits

| Hash | Message |
|------|---------|
| 14c2b3d | feat(08-15): add base intake form and RIU type selection |
| 40a9cf2 | feat(08-15): add category-specific questions and subject selector |
| d448251 | feat(08-15): add AI note cleanup component with comparison view |
