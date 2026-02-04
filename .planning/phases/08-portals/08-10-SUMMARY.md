---
phase: 08-portals
plan: 10
subsystem: frontend
tags: [ethics-portal, report-form, attachments, auto-save]
dependency_graph:
  requires: [08-08]
  provides: [report-submission-ui, confirmation-page]
  affects: [08-13, 08-14]
tech_stack:
  added: []
  patterns:
    - Multi-step form with react-hook-form
    - Auto-save drafts to encrypted IndexedDB
    - Smart prompts for context-aware suggestions
key_files:
  created:
    - apps/frontend/src/hooks/useTenantCategories.ts
    - apps/frontend/src/components/ethics/category-selector.tsx
    - apps/frontend/src/components/ethics/anonymity-selector.tsx
    - apps/frontend/src/components/ethics/report-form.tsx
    - apps/frontend/src/components/ethics/attachment-upload.tsx
    - apps/frontend/src/components/ethics/smart-prompts.tsx
    - apps/frontend/src/components/ethics/access-code-display.tsx
    - apps/frontend/src/components/ethics/confirmation-page.tsx
    - apps/frontend/src/app/ethics/[tenant]/report/page.tsx
    - apps/frontend/src/app/ethics/[tenant]/report/confirmation/page.tsx
  modified:
    - apps/frontend/src/components/ethics/access-code-input.tsx
    - apps/frontend/src/components/ethics/ethics-home.tsx
decisions:
  - id: category-tree-pattern
    choice: Recursive expandable tree with aria-expanded
    reason: Supports hierarchical categories with keyboard navigation
  - id: auto-save-interval
    choice: 30-second debounced save
    reason: Balance between data loss prevention and performance
  - id: smart-prompts-approach
    choice: Non-blocking hints with dismiss option
    reason: Per CONTEXT.md - never block submission
metrics:
  duration: 28 min
  completed: 2026-02-04
---

# Phase 08 Plan 10: Ethics Portal Report Submission UI Summary

**One-liner:** Multi-step report form with category selection, anonymity tiers, auto-save drafts, smart prompts, attachments, and confirmation page with access code display.

## What Was Built

### Task 1: Category and Anonymity Selection Components
- **useTenantCategories hook** - Fetches categories from API with tree building and 5-minute cache
- **CategorySelector** - Expandable tree structure with keyboard navigation, mobile-friendly 44px+ touch targets, "Most common" badges
- **AnonymitySelector** - Three-tier card display (Anonymous/Confidential/Open) with clear benefits and considerations

### Task 2: Report Form with Auto-Save and Attachments
- **ReportForm** - Multi-step form (Category, Details, Attachments, Review) using react-hook-form
- **AttachmentUpload** - Drag-drop zone with camera capture on mobile, file validation (25MB max), sensitivity tagging
- **SmartPrompts** - Context-aware suggestions based on description length, category, and filled fields
- Auto-save integration with useAutoSaveDraft (30-second interval)
- Category-specific dynamic fields loaded from API

### Task 3: Confirmation Page and Report Routes
- **AccessCodeDisplay** - Segmented code display with copy/email/print/download options
- **ConfirmationPage** - Success animation, "What happens next" steps, acknowledgment checkbox
- **/ethics/[tenant]/report** - Report submission page with language switcher
- **/ethics/[tenant]/report/confirmation** - Confirmation page (sessionStorage result, redirect protection)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed access-code-input.tsx useImperativeHandle type error**
- **Found during:** Task 1 verification
- **Issue:** Invalid useImperativeHandle call with useRef(null) instead of forwardRef
- **Fix:** Removed broken imperative handle, added comment about forwardRef requirement
- **Files modified:** access-code-input.tsx
- **Commit:** f42aa32

**2. [Rule 1 - Bug] Fixed ethics-home.tsx unescaped apostrophe**
- **Found during:** Task 2 verification
- **Issue:** ESLint error for unescaped `'` in JSX
- **Fix:** Changed `We're` to `We&apos;re`
- **Files modified:** ethics-home.tsx
- **Commit:** b1944cc

**3. [Rule 1 - Bug] Fixed category-selector.tsx aria role mismatch**
- **Found during:** Task 2 verification
- **Issue:** aria-expanded not supported by role="option"
- **Fix:** Changed to role="treeitem" for expandable items
- **Files modified:** category-selector.tsx
- **Commit:** b1944cc

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Form library | react-hook-form | Already in project, excellent TypeScript support |
| Auto-save approach | 30s debounced to IndexedDB | Balances data safety with performance |
| Smart prompts | Non-blocking amber banners | Per CONTEXT.md: "never block submission" |
| Mobile attachments | Camera capture via input[capture] | Native browser support, no extra deps |
| Anonymity display | Three-card layout | Clear visual distinction with pros/cons per tier |

## Verification Results

- [x] Frontend builds successfully (`npm run build -- --filter=frontend`)
- [x] Category selector shows hierarchical categories
- [x] Anonymity selector displays three tiers with explanations
- [x] Report form integrates useAutoSaveDraft hook
- [x] Attachments support drag-drop and sensitivity tagging
- [x] Confirmation page displays access code prominently
- [x] All ESLint/TypeScript errors resolved

## Key Patterns Established

### Multi-Step Form Pattern
```tsx
const STEPS = [
  { id: 'category', label: 'Category', description: '...' },
  { id: 'details', label: 'Details', description: '...' },
  // ...
];

const [currentStep, setCurrentStep] = useState(0);
// Navigate with goToNextStep/goToPreviousStep
```

### Smart Prompts Generation
```tsx
const prompts = generateSmartPrompts({
  description,
  categoryId,
  categoryName,
  filledFields,
});
// Returns prioritized, filtered prompts
```

### Attachment with Sensitivity
```tsx
interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  isSensitive: boolean;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
}
```

## Files Reference

| File | Purpose | Exports |
|------|---------|---------|
| useTenantCategories.ts | Category fetching with tree | `useTenantCategories` |
| category-selector.tsx | Expandable category tree | `CategorySelector` |
| anonymity-selector.tsx | Three-tier anonymity cards | `AnonymitySelector` |
| report-form.tsx | Multi-step form | `ReportForm` |
| attachment-upload.tsx | Drag-drop uploads | `AttachmentUpload` |
| smart-prompts.tsx | Context-aware hints | `SmartPrompts`, `generateSmartPrompts` |
| access-code-display.tsx | Code display with actions | `AccessCodeDisplay` |
| confirmation-page.tsx | Success confirmation | `ConfirmationPage` |

## Next Phase Readiness

- Report form ready for backend integration (API endpoints pending)
- Confirmation flow complete for end-to-end testing
- Mobile-first design ready for responsive testing
