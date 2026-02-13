---
phase: 25
plan: 03
subsystem: frontend/cases
tags: [ui, association-cards, hubspot-pattern, right-sidebar]

dependency-graph:
  requires: ["25-01", "25-02"]
  provides:
    - "AssociationCard reusable wrapper component"
    - "Right sidebar association cards pattern"
    - "5 association cards for case detail"
  affects: ["25-04", "investigation-detail-page"]

tech-stack:
  added: []
  patterns:
    - "AssociationCard wrapper for consistent association card UI"
    - "Collapsible cards with count badges and gear icons"
    - "Search filtering within association cards"
    - "HubSpot-style right sidebar association pattern"

files:
  created:
    - "apps/frontend/src/components/ui/association-card.tsx"
    - "apps/frontend/src/components/cases/related-cases-card.tsx"
    - "apps/frontend/src/components/cases/related-policies-card.tsx"
    - "apps/frontend/src/components/cases/linked-rius-card.tsx"
  modified:
    - "apps/frontend/src/components/cases/connected-people-card.tsx"
    - "apps/frontend/src/components/cases/connected-documents-card.tsx"
    - "apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx"

decisions:
  - id: "25-03-01"
    decision: "AssociationCard wrapper with consistent props for all right sidebar cards"
    rationale: "HubSpot's association cards share consistent UI: count badge, +Add, gear icon, collapsible content, View all link"
  - id: "25-03-02"
    decision: "Search filtering threshold of 5 items"
    rationale: "Show search input only when association count exceeds 5 to avoid unnecessary UI clutter"
  - id: "25-03-03"
    decision: "Card order: People, RIUs, Related Cases, Related Policies, Documents"
    rationale: "Matches HubSpot recommended order - investigators need to see who is involved first"

metrics:
  duration: "12 min"
  completed: "2026-02-13"
---

# Phase 25 Plan 03: Right Sidebar Association Cards Summary

**One-liner:** HubSpot-style AssociationCard wrapper with 5 association cards (People, RIUs, Cases, Policies, Documents) for case detail right sidebar.

## What Was Built

### Task 1: AssociationCard Wrapper Component

Created a reusable wrapper component at `apps/frontend/src/components/ui/association-card.tsx` that provides:

- **Header**: Icon + title + count badge + optional +Add button + optional gear icon
- **Collapsible content**: Chevron toggle with smooth rotation animation
- **Search input**: Optional, shown when item count exceeds threshold (default 5)
- **Footer**: "View all associated X" link

Props interface supports all HubSpot-style association card features:

- `title`, `count`, `icon` - Required header elements
- `onAdd`, `onSettings` - Optional button handlers
- `viewAllHref`, `viewAllLabel` - Footer link
- `searchThreshold`, `searchQuery`, `onSearchChange` - Search filtering
- `collapsible`, `defaultCollapsed` - Collapse behavior

### Task 2: Three New Association Cards

**LinkedRiusCard** (`linked-rius-card.tsx`):

- Displays RIU associations from case data
- PRIMARY associations highlighted with blue border and star icon
- Shows RIU type label, reference number, and creation date
- Uses type-specific icons (Phone for hotline, FileInput for web forms)

**RelatedCasesCard** (`related-cases-card.tsx`):

- Fetches related cases via `GET /cases/:id/related-cases`
- Shows reference number, status badge, summary, and association type
- Status colors: NEW (blue), OPEN (yellow), CLOSED (gray)
- Graceful fallback to empty array if endpoint unavailable

**RelatedPoliciesCard** (`related-policies-card.tsx`):

- Fetches linked policies via `GET /cases/:id/policies`
- Shows policy title, version, status, department, and link type
- Link types: VIOLATION, REFERENCE, GOVERNING
- Graceful fallback to empty array if endpoint unavailable

### Task 3: Refactored Existing Cards and Page Wiring

**ConnectedPeopleCard refactored**:

- Now uses AssociationCard wrapper
- Added search filtering by name or email
- Added email display with copy-to-clipboard icon
- Maintains existing person grouping by role/label

**ConnectedDocumentsCard refactored**:

- Now uses AssociationCard wrapper
- Added gear icon and View all link
- Removed redundant +Add button (uses onAdd prop instead)

**Case detail page updated**:

- Imported and wired all 5 association cards
- Cards ordered per HubSpot pattern: People, RIUs, Cases, Policies, Documents
- AI Assistant button remains at bottom of right sidebar

## Key Files

| File                                                              | Purpose                                |
| ----------------------------------------------------------------- | -------------------------------------- |
| `apps/frontend/src/components/ui/association-card.tsx`            | Reusable wrapper component (175 lines) |
| `apps/frontend/src/components/cases/linked-rius-card.tsx`         | Linked RIUs card                       |
| `apps/frontend/src/components/cases/related-cases-card.tsx`       | Related cases card                     |
| `apps/frontend/src/components/cases/related-policies-card.tsx`    | Related policies card                  |
| `apps/frontend/src/components/cases/connected-people-card.tsx`    | Refactored people card                 |
| `apps/frontend/src/components/cases/connected-documents-card.tsx` | Refactored documents card              |
| `apps/frontend/src/app/(authenticated)/cases/[id]/page.tsx`       | Case detail page with all cards        |

## Verification Status

- [x] AssociationCard component exports and compiles
- [x] All 5 cards use AssociationCard wrapper consistently
- [x] Cards have count badges in headers
- [x] Cards have gear icons for future customization
- [x] Cards have "View all associated X" links
- [x] ConnectedPeopleCard has search for >5 people
- [x] LinkedRiusCard highlights PRIMARY with blue border and star
- [x] TypeScript compilation passes (`npm run typecheck`)
- [x] Right sidebar order: People, RIUs, Cases, Policies, Documents, AI button

## Commits

| Hash    | Message                                                                |
| ------- | ---------------------------------------------------------------------- |
| 6b07f2c | feat(25-03): create AssociationCard wrapper component                  |
| a138763 | feat(25-03): create association cards for RIUs, cases, and policies    |
| 5d9cedd | feat(25-03): refactor existing cards and wire all cards to case detail |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for Phase 25-04:

- AssociationCard pattern established for investigation detail page
- Right sidebar association cards pattern proven and reusable
- All TypeScript types compile
- No blocking issues

## Related Documentation

- Design spec: `docs/CASE-INVESTIGATION-PAGE-REDESIGN.md` (sections 2.5, 4.1)
- Previous wave: 25-01 (tab reordering, activity timeline), 25-02 (quick actions, properties)
- Next: Investigation detail page three-column conversion
