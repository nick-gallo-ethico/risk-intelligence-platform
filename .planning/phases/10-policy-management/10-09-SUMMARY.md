---
phase: 10-policy-management
plan: 09
subsystem: frontend
tags: [policies, detail-page, version-diff, translations, attestations, case-linking]
depends_on:
  requires: [10-04, 10-05, 10-06, 10-07, 10-08]
  provides: [policy-detail-page, version-comparison, translation-management-ui]
  affects: [10-10, 10-11]
tech-stack:
  added: [diff, @types/diff, @radix-ui/react-toggle-group]
  patterns: [tabbed-interface, timeline-component, diff-highlighting, url-state-sync]
key-files:
  created:
    - apps/frontend/src/app/(authenticated)/policies/[id]/page.tsx
    - apps/frontend/src/components/policies/policy-detail-header.tsx
    - apps/frontend/src/components/policies/policy-version-history.tsx
    - apps/frontend/src/components/policies/policy-version-diff.tsx
    - apps/frontend/src/components/policies/policy-translations-panel.tsx
    - apps/frontend/src/components/policies/policy-attestations-panel.tsx
    - apps/frontend/src/components/policies/policy-cases-panel.tsx
    - apps/frontend/src/components/ui/alert.tsx
    - apps/frontend/src/components/ui/toggle-group.tsx
    - apps/frontend/src/components/rich-text/rich-text-display.tsx
  modified:
    - apps/frontend/src/types/policy.ts
    - apps/frontend/src/services/policies.ts
    - apps/frontend/package.json
decisions:
  - key: diff-mode-default
    choice: "Inline diff as default mode per CONTEXT.md"
    rationale: "Inline diff with green additions and red strikethrough is more readable for typical policy changes"
  - key: url-tab-sync
    choice: "Tab selection syncs with URL query parameter"
    rationale: "Enables shareable deep links to specific tabs and proper back/forward navigation"
  - key: approval-status-display
    choice: "Show current step name and pending reviewers in yellow card"
    rationale: "Users need visibility into approval progress without navigating away"
metrics:
  duration: 18 min
  completed: 2026-02-05
---

# Phase 10 Plan 09: Policy Detail Page Summary

Policy detail page with version history, translations panel, attestation campaigns, and linked cases - providing full visibility into policy lifecycle and distribution.

## What Was Built

### Policy Detail Page (`page.tsx`)
- Tabbed interface with 5 sections: Content, Versions, Translations, Attestations, Linked Cases
- Tab navigation synced with URL query parameter (`?tab=versions`)
- Breadcrumb navigation back to policies list
- Loading skeleton, error state, and not-found handling
- Dialog placeholders for Publish, Retire, Submit for Approval, Cancel Approval actions

### Policy Detail Header (`policy-detail-header.tsx`)
- Title with status badge (color-coded: DRAFT gray, PENDING_APPROVAL yellow, APPROVED blue, PUBLISHED green, RETIRED red)
- Metadata row: version, policy type, owner, effective date, review date
- Review date overdue warning using Alert component (warning variant)
- Action buttons based on status:
  - Edit (DRAFT or PUBLISHED)
  - Submit for Approval (DRAFT)
  - Publish (APPROVED)
  - Create Attestation Campaign (PUBLISHED)
  - Retire (PUBLISHED)
  - Cancel Approval (PENDING_APPROVAL)
- Approval workflow status card with current step name, pending reviewers, submitted date

### Version History (`policy-version-history.tsx`)
- Timeline view of all published versions
- Each version shows: number, label, published date/user, change notes, summary
- "View" button opens dialog with full version content
- "Compare" button shows diff between consecutive versions
- Empty state when no versions published yet

### Version Diff (`policy-version-diff.tsx`)
- Uses `diff` library's `diffWords` function for text comparison
- **Inline mode** (default): green background for additions, red with strikethrough for deletions
- **Side-by-side mode**: two columns with full content
- Toggle between modes using ToggleGroup component
- HTML stripping for accurate text comparison
- HTML entity decoding for proper display

### Translations Panel (`policy-translations-panel.tsx`)
- Grid of translation cards showing language name/code
- Status badge: PENDING_REVIEW (yellow), APPROVED (blue), PUBLISHED (green), NEEDS_REVISION (red)
- Stale indicator with "Refresh" button for outdated translations
- "Add Translation" dialog with language selector (13 supported languages)
- AI-powered translation generation on create

### Attestations Panel (`policy-attestations-panel.tsx`)
- Campaign cards with name, status badge, description
- Progress bar showing completed/total with percentage
- Overdue count in red
- Due date display
- "View Campaign" link to campaign details
- "Create Attestation Campaign" button linking to campaign creation

### Cases Panel (`policy-cases-panel.tsx`)
- Table with Case Reference, Link Type, Violation Date, Linked Date columns
- Link type badges: VIOLATION (red), REFERENCE (blue), GOVERNING (gray)
- "View Case" and "Unlink" actions in dropdown menu
- Unlink confirmation dialog
- "Link to Case" button with placeholder dialog for case search

### Supporting Components
- **Alert** (`alert.tsx`): warning variant with yellow styling for review overdue
- **ToggleGroup** (`toggle-group.tsx`): Radix-based toggle button group for diff mode
- **RichTextDisplay** (`rich-text-display.tsx`): read-only prose-styled HTML content viewer

### Extended Types and Service
- Added `PolicyCaseLinkType`, `PolicyCaseAssociation`, `AttestationCampaign` types
- Added `POLICY_LINK_TYPE_LABELS`, `SUPPORTED_LANGUAGES` constants
- Extended policies service with:
  - `refreshTranslation()` - refresh stale translation
  - `getCaseAssociations()` - get linked cases
  - `linkCase()` / `unlinkCase()` - case association management
  - `getAttestationCampaigns()` - get campaigns for policy

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash | Description |
|------|-------------|
| 736be7a | feat(10-09): add policy detail page structure with header and tabs |
| 765e039 | feat(10-09): add version history timeline with diff comparison |
| f7d198c | feat(10-09): add translations, attestations, and cases panels |

## Verification

- All components lint-free with eslint
- TypeScript compiles without errors in new files
- Tab navigation updates URL correctly
- Diff view shows inline highlighting by default
- Toggle switches between inline and side-by-side modes

## Next Phase Readiness

Ready for:
- 10-10: Policy approval workflow integration (submit, review, approve/reject)
- 10-11: Attestation campaign integration with policy bundles
