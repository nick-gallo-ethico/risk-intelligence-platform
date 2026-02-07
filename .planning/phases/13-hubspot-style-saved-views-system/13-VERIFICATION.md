# Phase 13 Verification Checklist

**Phase:** 13 - HubSpot-Style Saved Views System
**Last Verified:** 2026-02-07
**Status:** Ready for verification

## Backend API Verification

### SavedView Model

- [x] SavedView model has frozenColumnCount field (added in 13-01)
- [x] SavedView model has viewMode field (table/board) (added in 13-01)
- [x] SavedView model has boardGroupBy field (added in 13-01)
- [x] SavedView model has recordCount and recordCountAt fields (added in 13-01)
- [x] ViewEntityType enum extended with POLICIES, DISCLOSURES, INTAKE_FORMS (added in 13-15)
- [x] Prisma generate succeeds

### SavedViews API

- [x] GET /api/views returns list with recordCount
- [x] POST /api/views creates new view
- [x] PUT /api/views/:id updates view
- [x] DELETE /api/views/:id deletes view
- [x] POST /api/views/:id/clone duplicates view
- [x] PUT /api/views/reorder updates display order

### Saved Views Seeder

- [x] seedSavedViews function exists in saved-views.seeder.ts
- [x] 16 default views defined across 5 modules
- [x] Seeder integrated into main seed.ts
- [x] Views include table and board modes
- [x] Views include realistic filter presets

## Frontend Component Verification

### Zone 1 - View Tabs Bar (13-04, 13-06)

- [ ] Tabs render horizontally
- [ ] Active tab is visually distinct
- [ ] Tabs are draggable for reordering
- [ ] Context menu shows on three-dot click
- [ ] Rename, Clone, Delete work from menu
- [ ] Add view (+) button creates new view
- [ ] Record count badge displays on tabs

### Zone 2 - Toolbar (13-05)

- [ ] Search box filters data
- [ ] View mode toggle switches table/board
- [ ] Edit columns opens modal
- [ ] Filter button toggles quick filters row
- [ ] Sort button opens sort popover
- [ ] Export downloads file
- [ ] Save button enabled when changes exist

### Zone 3 - Quick Filters Row (13-07, 13-08)

- [ ] Date filters show presets and custom picker
- [ ] Multi-select filters show searchable checkboxes
- [ ] More button adds additional quick filters
- [ ] Advanced filters button opens slide-out
- [ ] Clear all removes all filters

### Advanced Filters Panel (13-08)

- [ ] Panel slides out from right
- [ ] Filter groups show with OR separator
- [ ] Conditions show with AND separator
- [ ] Property dropdown shows all filterable properties
- [ ] Operators change based on property type
- [ ] Value inputs adapt to operator
- [ ] Filters apply in real-time

### Zone 4a - Data Table (13-09)

- [ ] Table renders with correct columns
- [ ] Column headers sort on click
- [ ] Frozen columns remain fixed on scroll
- [ ] Checkbox column enables selection
- [ ] Bulk actions bar appears when rows selected
- [ ] Pagination shows page numbers
- [ ] Page size dropdown works

### Zone 4b - Board View (13-10)

- [ ] Board renders cards in status lanes
- [ ] Cards are draggable between lanes
- [ ] Dropping card updates status
- [ ] Cards show correct summary fields
- [ ] Lane headers show count

### Column Selection Modal (13-11)

- [ ] Modal shows two-panel layout
- [ ] Available columns grouped by category
- [ ] Search filters available columns
- [ ] Selected columns are drag-reorderable
- [ ] Frozen columns dropdown works (0-3)
- [ ] First column is locked

## Module Integration Verification

### Cases Module (13-12)

- [ ] Cases page uses SavedViewProvider
- [ ] All Cases, My Cases, Open Cases views work
- [ ] Table and board views functional
- [ ] Bulk actions work (assign, status, export)
- [ ] Default view loads on page visit

### Investigations Module (13-12)

- [ ] Investigations page uses SavedViewProvider
- [ ] Default views load correctly
- [ ] Board groups by investigation stage
- [ ] Active Investigations filter works

### Policies Module (13-13)

- [ ] Policies page uses SavedViewProvider
- [ ] Default views load correctly
- [ ] Board groups by policy status
- [ ] Published Policies filter works

### Disclosures Module (13-13)

- [ ] Disclosures page uses SavedViewProvider
- [ ] COI-specific columns available
- [ ] Gift value filtering works
- [ ] High Risk filter works

### Intake Forms Module (13-13)

- [ ] Intake Forms page uses SavedViewProvider
- [ ] Anonymous filter works
- [ ] Form type filtering works
- [ ] AI triage columns visible

## URL State Verification (13-14)

- [ ] View ID reflected in URL (?view=xxx)
- [ ] Filters encoded in URL
- [ ] Sort state in URL
- [ ] Search query in URL
- [ ] Shared link loads correct state
- [ ] Browser back/forward works
- [ ] Deep linking works for specific views

## Demo Data Verification (13-15)

- [ ] npm run db:seed succeeds
- [ ] Default views created for all 5 modules
- [ ] Views have correct filters pre-applied
- [ ] Views use shared visibility (all users can see)
- [ ] Default views are pinned

## Performance Verification

- [ ] Page loads in <2 seconds
- [ ] View switching is instant (<100ms)
- [ ] Filters apply without visible lag
- [ ] Large datasets (1000+ rows) paginate correctly
- [ ] Board view handles 50+ cards per lane

## Accessibility Verification

- [ ] Keyboard navigation works in tabs
- [ ] Screen reader announces view changes
- [ ] Focus management in modals is correct
- [ ] Color contrast meets WCAG AA

---

## Test Instructions

### Backend Testing

```bash
cd apps/backend

# Run typecheck
npm run typecheck

# Run unit tests
npm test

# Seed database
npm run db:seed
```

### Frontend Testing

```bash
cd apps/frontend

# Run typecheck
npm run typecheck

# Run tests
npm test

# Build for production
npm run build
```

### Manual Testing

1. Start the application:
   ```bash
   npm run dev
   ```

2. Navigate to Cases page
3. Verify view tabs appear at top
4. Click different tabs to switch views
5. Try creating a new view
6. Test filter application
7. Switch to board view
8. Test drag and drop in board
9. Copy URL and open in new tab to verify deep linking

---

## Known Issues

1. **Pre-existing TypeScript errors**: Several files have type errors unrelated to Phase 13:
   - `acme-phase-12.ts`: Missing organizationId in create calls
   - `case.seeder.ts`: Missing organizationId in RiuCaseAssociation
   - `go-live.service.ts`: Missing organizationId fields
   - `operator/*.controller.ts`: Missing OPERATOR role in UserRole enum

2. **Prisma generate warnings**: May show write errors on Windows due to file locking

---

## Verification Sign-off

| Component | Verified By | Date | Status |
|-----------|-------------|------|--------|
| Backend API | | | Pending |
| Frontend Components | | | Pending |
| Module Integration | | | Pending |
| URL State | | | Pending |
| Demo Data | | | Pending |
| Performance | | | Pending |
| Accessibility | | | Pending |

---

## Next Steps After Verification

1. Fix pre-existing TypeScript errors (Phase 14 scope)
2. Update ROADMAP.md to mark Phase 13 complete
3. Begin Phase 14: Critical Bug Fixes & Navigation
