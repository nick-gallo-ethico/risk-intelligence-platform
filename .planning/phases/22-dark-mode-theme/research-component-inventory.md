# Phase 22: Dark Mode & Theme - Component Inventory Research

## 1. Page Inventory (43 pages/routes)

### App Framework
- **Next.js 14** with App Router (`src/app/` directory structure)
- **Tailwind CSS 3.4** with `darkMode: ['class']` already configured

### Authenticated Pages (behind auth layout)
| Route | Page File |
|-------|-----------|
| `/dashboard` | `app/(authenticated)/dashboard/page.tsx` |
| `/cases` | `app/(authenticated)/cases/page.tsx` |
| `/cases/new` | `app/(authenticated)/cases/new/page.tsx` |
| `/cases/[id]` | `app/(authenticated)/cases/[id]/page.tsx` |
| `/investigations` | `app/(authenticated)/investigations/page.tsx` |
| `/investigations/[id]` | `app/(authenticated)/investigations/[id]/page.tsx` |
| `/policies` | `app/(authenticated)/policies/page.tsx` |
| `/policies/[id]` | `app/(authenticated)/policies/[id]/page.tsx` |
| `/disclosures` | `app/(authenticated)/disclosures/page.tsx` |
| `/intake-forms` | `app/(authenticated)/intake-forms/page.tsx` |
| `/campaigns` | `app/(authenticated)/campaigns/page.tsx` |
| `/analytics` | `app/(authenticated)/analytics/page.tsx` |
| `/analytics/dashboards/[id]` | `app/(authenticated)/analytics/dashboards/[id]/page.tsx` |
| `/analytics/reports/[id]` | `app/(authenticated)/analytics/reports/[id]/page.tsx` |
| `/analytics/reports/[id]/run` | `app/(authenticated)/analytics/reports/[id]/run/page.tsx` |
| `/projects` | `app/(authenticated)/projects/page.tsx` |
| `/settings` | `app/(authenticated)/settings/page.tsx` |
| `/settings/users` | `app/(authenticated)/settings/users/page.tsx` |
| `/settings/users/[id]` | `app/(authenticated)/settings/users/[id]/page.tsx` |
| `/settings/users/invite` | `app/(authenticated)/settings/users/invite/page.tsx` |
| `/settings/audit` | `app/(authenticated)/settings/audit/page.tsx` |
| `/settings/organization` | `app/(authenticated)/settings/organization/page.tsx` |
| `/notifications` | `app/(authenticated)/notifications/page.tsx` |
| `/profile` | `app/(authenticated)/profile/page.tsx` |
| `/search` | `app/(authenticated)/search/page.tsx` |
| `/my-work` | `app/(authenticated)/my-work/page.tsx` |

### Public/External Pages
| Route | Page File |
|-------|-----------|
| `/` (root) | `app/page.tsx` |
| `/login` | `app/login/page.tsx` |
| `/~offline` | `app/~offline/page.tsx` |

### Ethics Portal (public, tenant-branded)
| Route | Page File |
|-------|-----------|
| `/ethics/[tenant]` | `app/ethics/[tenant]/page.tsx` |
| `/ethics/[tenant]/report` | `app/ethics/[tenant]/report/page.tsx` |
| `/ethics/[tenant]/report/confirmation` | `app/ethics/[tenant]/report/confirmation/page.tsx` |
| `/ethics/[tenant]/status` | `app/ethics/[tenant]/status/page.tsx` |
| `/ethics/[tenant]/status/[code]` | `app/ethics/[tenant]/status/[code]/page.tsx` |

### Operator Console
| Route | Page File |
|-------|-----------|
| `/operator` | `app/operator/page.tsx` |
| `/operator/qa-queue` | `app/operator/qa-queue/page.tsx` |

### Employee Portal
| Route | Page File |
|-------|-----------|
| `/employee` | `app/employee/page.tsx` |
| `/employee/proxy-report` | `app/employee/proxy-report/page.tsx` |
| `/employee/disclosures/[id]` | `pages/employee/disclosures/[id].tsx` |

### Compliance
| Route | Page File |
|-------|-----------|
| `/compliance/conflicts` | `app/compliance/conflicts/page.tsx` |

### Internal Admin
| Route | Page File |
|-------|-----------|
| `/internal` | `app/internal/page.tsx` |
| `/internal/implementation` | `app/internal/implementation/page.tsx` |
| `/internal/implementation/[projectId]` | `app/internal/implementation/[projectId]/page.tsx` |
| `/internal/implementation/[projectId]/go-live` | `app/internal/implementation/[projectId]/go-live/page.tsx` |

---

## 2. Layout Components (7 layouts + 8 layout/navigation components)

### Next.js Layout Files
| Layout | File |
|--------|------|
| Root layout | `app/layout.tsx` |
| Authenticated layout | `app/(authenticated)/layout.tsx` |
| Ethics portal layout | `app/ethics/[tenant]/layout.tsx` |
| Operator layout | `app/operator/layout.tsx` |
| Employee layout | `app/employee/layout.tsx` |
| Internal layout | `app/internal/layout.tsx` |
| Implementation layout | `app/internal/implementation/layout.tsx` |

### Sidebar & Navigation Components
| Component | File |
|-----------|------|
| App Sidebar | `components/layout/app-sidebar.tsx` |
| Top Navigation | `components/layout/top-nav.tsx` |
| Main Navigation | `components/layout/nav-main.tsx` |
| Admin Navigation | `components/layout/nav-admin.tsx` |
| Mobile Bottom Nav | `components/layout/mobile-bottom-nav.tsx` |
| Mobile More Drawer | `components/layout/mobile-more-drawer.tsx` |
| AI Panel | `components/layout/ai-panel.tsx` |
| Internal Layout Wrapper | `components/layouts/InternalLayout.tsx` |

### Sidebar UI Primitive
| Component | File |
|-----------|------|
| Sidebar (shadcn/ui) | `components/ui/sidebar.tsx` |

### Other Navigation/Header Components
| Component | File |
|-----------|------|
| Ethics Header | `components/ethics/ethics-header.tsx` |
| Ethics Footer | `components/ethics/ethics-footer.tsx` |
| Ethics Nav | `components/ethics/ethics-nav.tsx` |
| Employee Header | `components/employee/employee-header.tsx` |
| Operator Console Layout | `components/operator/operator-console-layout.tsx` |

---

## 3. Component Inventory by Category

### UI Primitives (shadcn/ui - 30 components)
All located in `components/ui/`:
- `alert.tsx`, `alert-dialog.tsx`, `avatar.tsx`, `badge.tsx`, `button.tsx`
- `calendar.tsx`, `card.tsx`, `checkbox.tsx`, `collapsible.tsx`
- `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`
- `popover.tsx`, `progress.tsx`, `scroll-area.tsx`, `select.tsx`
- `separator.tsx`, `severity-badge.tsx`, `sheet.tsx`, `sidebar.tsx`
- `skeleton.tsx`, `status-badge.tsx`, `switch.tsx`, `table.tsx`
- `tabs.tsx`, `textarea.tsx`, `toaster.tsx`, `toggle-group.tsx`, `tooltip.tsx`

**Note:** These use CSS variables (bg-background, text-foreground, etc.) via shadcn/ui conventions. Most should auto-adapt with the `.dark` class, though some have hardcoded color overrides.

### Case Management (23 components)
Located in `components/cases/`:
- `case-header.tsx`, `case-detail-header.tsx`, `case-detail-layout.tsx`
- `case-tabs.tsx`, `case-properties-panel.tsx`, `case-investigations-panel.tsx`
- `case-activity-timeline.tsx`, `case-list-filters.tsx`, `case-creation-form.tsx`
- `activity-entry.tsx`, `activity-filters.tsx`
- `editable-field.tsx`, `property-section.tsx`
- `investigation-card.tsx`, `create-investigation-dialog.tsx`
- `search-input.tsx`, `filter-chips.tsx`, `pagination.tsx`
- `linked-riu-list.tsx`, `messages-tab.tsx`
- `remediation-tab.tsx`, `remediation-step-card.tsx`, `files-tab.tsx`
- Plus form sections: `details-section.tsx`, `basic-info-section.tsx`, `location-section.tsx`, `reporter-section.tsx`

### Investigation Components (10 components)
Located in `components/investigations/`:
- `investigation-detail-panel.tsx`, `investigation-header.tsx`
- `investigation-overview.tsx`, `investigation-findings.tsx`
- `investigation-notes.tsx`, `note-card.tsx`, `add-note-modal.tsx`
- `checklist-panel.tsx`, `checklist-item.tsx`, `template-selector.tsx`

### Dashboard Components (5 components)
Located in `components/dashboard/`:
- `stats-cards.tsx`, `recent-cases.tsx`, `my-assignments.tsx`
- `quick-actions.tsx`, `my-tasks.tsx`

### Ethics Portal (20 components)
Located in `components/ethics/`:
- `ethics-home.tsx`, `ethics-header.tsx`, `ethics-footer.tsx`, `ethics-nav.tsx`
- `report-form.tsx`, `category-selector.tsx`, `confirmation-page.tsx`
- `status-view.tsx`, `status-badge.tsx`
- `anonymity-selector.tsx`, `access-code-input.tsx`, `access-code-display.tsx`
- `smart-prompts.tsx`, `quick-actions.tsx`, `attachment-upload.tsx`
- `language-switcher.tsx`, `message-thread.tsx`, `message-composer.tsx`
- `tenant-theme-provider.tsx`, `theme-skeleton.tsx`

### Operator Console (17 components)
Located in `components/operator/`:
- `operator-console-layout.tsx`
- `call-controls.tsx`, `call-timer.tsx`, `context-tabs.tsx`
- `directives-panel.tsx`, `hris-lookup-panel.tsx`, `caller-history-panel.tsx`
- `riu-type-selector.tsx`, `intake-form.tsx`
- `category-questions.tsx`, `subject-selector.tsx`, `ai-note-cleanup.tsx`
- `qa-queue-list.tsx`, `qa-queue-item.tsx`, `qa-item-detail.tsx`
- `qa-review-panel.tsx`, `qa-edit-form.tsx`

### Employee Portal (11 components)
Located in `components/employee/`:
- `employee-dashboard.tsx`, `employee-header.tsx`
- `dashboard-tabs.tsx`, `my-tasks-tab.tsx`, `my-team-tab.tsx`
- `task-card.tsx`, `team-member-row.tsx`, `team-member-selector.tsx`
- `proxy-report-form.tsx`, `proxy-confirmation.tsx`, `proxy-reason-selector.tsx`

### Views/Data Grid System (27 components)
Located in `components/views/`:
- `DataTable.tsx`, `BoardView.tsx`, `BoardColumn.tsx`, `BoardCard.tsx`
- `ViewToolbar.tsx`, `ViewTabsBar.tsx`, `SortableViewTab.tsx`
- `ViewTabContextMenu.tsx`, `ViewModeToggle.tsx`
- `AddViewButton.tsx`, `CreateViewDialog.tsx`, `SaveButton.tsx`
- `QuickFiltersRow.tsx`, `QuickFilterDropdown.tsx`, `MultiSelectFilter.tsx`
- `DateRangeFilter.tsx`, `AdvancedFiltersPanel.tsx`
- `FilterGroupCard.tsx`, `FilterConditionRow.tsx`, `PropertyPicker.tsx`
- `ColumnSelectionModal.tsx`, `SelectedColumnsList.tsx`
- `SortButton.tsx`, `ExportButton.tsx`, `PaginationBar.tsx`
- `BulkActionsBar.tsx`, `SavedViewProvider.tsx`

### Policy Management (8+ components)
Located in `components/policies/`:
- `policy-list.tsx`, `policy-detail-header.tsx`, `policy-editor.tsx`
- `policy-filters.tsx`, `policy-version-history.tsx`, `policy-version-diff.tsx`
- `policy-translations-panel.tsx`, `policy-attestations-panel.tsx`, `policy-cases-panel.tsx`

### Settings (8 components)
Located in `components/settings/`:
- `organization-general-settings.tsx`, `organization-branding-settings.tsx`
- `organization-notification-settings.tsx`, `organization-security-settings.tsx`
- `user-list.tsx`, `user-form.tsx`, `invite-user-form.tsx`
- `role-permissions-table.tsx`

### User Management (6 components)
Located in `components/users/`:
- `users-table.tsx`, `user-filters.tsx`
- `create-user-dialog.tsx`, `edit-user-dialog.tsx`, `deactivate-user-dialog.tsx`

### Campaigns (6 components)
Located in `components/campaigns/`:
- `CampaignBuilder.tsx`, `SegmentBuilder.tsx`, `ScheduleConfig.tsx`
- `campaigns-table.tsx`, `campaigns-filters.tsx`, `campaigns-summary-cards.tsx`

### Conflicts (3 components)
Located in `components/conflicts/`:
- `ConflictAlert.tsx`, `ConflictQueue.tsx`, `EntityTimeline.tsx`

### Disclosures (5 components)
Located in `components/disclosures/`:
- `DisclosureForm.tsx`, `DraftIndicator.tsx`
- Form Builder: `FormBuilder.tsx`, `FormPreview.tsx`, `FieldPalette.tsx`

### File Management (4 components)
Located in `components/files/`:
- `file-upload.tsx`, `file-list.tsx`, `file-preview.tsx`

### Rich Text Editor (4 components)
Located in `components/rich-text/`:
- `rich-text-editor.tsx`, `rich-text-display.tsx`
- `editor-toolbar.tsx`, `character-count.tsx`

### Analytics (3 components)
Located in `components/analytics/`:
- `dashboards-list.tsx`, `reports-list.tsx`, `dashboard-template-picker.tsx`

### Exports (2 components)
Located in `components/exports/`:
- `FlatExportBuilder.tsx`, `TaggedFieldConfig.tsx`

### Projects (2 components)
Located in `components/projects/`:
- `GanttChart.tsx`, `MilestoneTimeline.tsx`

### Implementation (4 components)
Located in `components/implementation/`:
- `ProjectCard.tsx`, `ChecklistPanel.tsx`, `GoLiveChecklist.tsx`, `BlockerCard.tsx`

### Common/Shared (4 components)
Located in `components/common/`:
- `saved-view-selector.tsx`, `shortcuts-help-dialog.tsx`
- `command-palette.tsx`, `empty-state.tsx`

---

## 4. Hardcoded Colors Audit

### Summary Statistics
| Color Pattern | Occurrences | Files Affected |
|--------------|-------------|----------------|
| **Neutral Tailwind classes** (bg-white, bg-gray-*, text-gray-*, border-gray-*, bg-black, text-white, text-black, bg-slate-*, text-slate-*, border-slate-*) | **~750** | **~91 files** |
| **Semantic Tailwind classes** (bg-blue-*, bg-green-*, bg-red-*, bg-yellow-*, etc. + text- and border- variants) | **~534** | **~100 files** |
| **Hardcoded hex colors** (#xxxxxx) | **6** | **1 file** (organization-branding-settings.tsx - these are default color picker values, acceptable) |
| **Hardcoded rgba()** | **2** | **1 file** (DataTable.tsx - box-shadow values for sticky columns) |
| **Inline style={} objects** | **0** | **0 files** |
| **Existing dark: variants** | **67** | **20 files** |

### Existing dark: Variant Usage (20 files already partially themed)
These files already have some `dark:` prefixed classes:
- Ethics portal components (status-badge, access-code-display, smart-prompts, confirmation-page, etc.)
- Employee portal components (proxy-confirmation, proxy-report-form, employee-dashboard)
- Operator components (call-timer, directives-panel)
- Policy components (policy-detail-header, policy-version-diff)
- Rich text components (character-count, rich-text-editor)
- Export components (TaggedFieldConfig)
- UI primitives (alert, SelectedColumnsList, AdvancedFiltersPanel)

### Most Color-Heavy Files (highest priority for dark mode conversion)
| File | Total hardcoded color occurrences |
|------|----------------------------------|
| `components/disclosures/form-builder/FormPreview.tsx` | ~54 |
| `components/disclosures/form-builder/FormBuilder.tsx` | ~50 |
| `components/cases/case-detail-layout.tsx` | ~24 |
| `components/cases/case-detail-header.tsx` | ~33 |
| `components/layout/top-nav.tsx` | ~13 |
| `components/cases/case-tabs.tsx` | ~22 |
| `components/cases/linked-riu-list.tsx` | ~31 |
| `components/cases/investigation-card.tsx` | ~27 |
| `components/investigations/checklist-panel.tsx` | ~24 |
| `components/investigations/checklist-item.tsx` | ~23 |
| `components/implementation/GoLiveChecklist.tsx` | ~47 |
| `components/cases/remediation-tab.tsx` | ~15 |
| `components/cases/case-activity-timeline.tsx` | ~12 |
| `components/conflicts/ConflictAlert.tsx` | ~26 |
| `components/exports/FlatExportBuilder.tsx` | ~13 |
| `components/exports/TaggedFieldConfig.tsx` | ~8 |
| `components/users/users-table.tsx` | ~21 |
| `components/settings/role-permissions-table.tsx` | ~14 |
| `components/common/command-palette.tsx` | ~16 |
| `components/common/shortcuts-help-dialog.tsx` | ~8 |
| `components/ethics/theme-skeleton.tsx` | ~21 |

### Key Patterns Requiring dark: Variants
The most commonly used patterns that need `dark:` variants:

1. **`bg-white`** - Used extensively for card backgrounds, panels, modals (~100+ occurrences)
   - Needs: `dark:bg-gray-900` or `dark:bg-card`
2. **`bg-gray-50`** - Used for secondary backgrounds, sidebar areas (~50+ occurrences)
   - Needs: `dark:bg-gray-800` or `dark:bg-muted`
3. **`bg-gray-100`** - Used for hover states, badge backgrounds (~60+ occurrences)
   - Needs: `dark:bg-gray-700`
4. **`text-gray-500` / `text-gray-600`** - Muted text (~80+ occurrences)
   - Needs: `dark:text-gray-400`
5. **`text-gray-900` / `text-gray-800`** - Primary text (~40+ occurrences)
   - Needs: `dark:text-gray-100`
6. **`border-gray-200` / `border-gray-300`** - Borders (~40+ occurrences)
   - Needs: `dark:border-gray-700`
7. **`bg-black/30` / `bg-black/50`** - Overlays (modals, drawers)
   - These are already opacity-based, should work fine
8. **Semantic status colors** (bg-blue-*, bg-green-*, bg-red-*, bg-yellow-*, bg-amber-*, bg-emerald-*, bg-rose-*)
   - ~534 occurrences across ~100 files
   - Many of these are light shades (e.g., `bg-blue-100 text-blue-800`) that need dark variants (e.g., `dark:bg-blue-900/30 dark:text-blue-300`)

---

## 5. Existing Dark Mode Infrastructure

### Already In Place
1. **Tailwind darkMode: `['class']`** - Configured in `tailwind.config.ts` line 4
2. **CSS variables with .dark overrides** - Full set of dark theme CSS variables defined in `globals.css` lines 60-96:
   - `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`
   - `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`
   - `--sidebar-*` variants (background, foreground, primary, accent, border, ring)
3. **shadcn/ui CSS variable system** - All UI primitives use `bg-background`, `text-foreground`, `bg-card`, `bg-popover`, `bg-muted`, etc.
4. **Ethico brand colors** as CSS variables: `--ethico-navy`, `--ethico-cyan`, `--ethico-purple`, `--ethico-purple-light`

### What's Missing
1. **No dark mode toggle mechanism** - No theme provider context, no user preference storage
2. **No system preference detection** - No `prefers-color-scheme` media query listener
3. **Massive hardcoded color usage** - ~1,284 hardcoded Tailwind color class occurrences across ~100+ files that bypass the CSS variable system
4. **No `dark:` variants** on the vast majority of components (only 67 occurrences in 20 files out of ~200+ component files)
5. **No dark mode variants for Ethico brand colors** (gradient utilities in globals.css)
6. **Ethics portal tenant-theme-provider** exists but is specifically for tenant branding, not dark mode

---

## 6. Third-Party Components Needing Theming

### Tiptap Rich Text Editor (2 files)
- `components/rich-text/rich-text-editor.tsx` (uses @tiptap/react)
- `components/rich-text/editor-toolbar.tsx`
- **Impact:** Tiptap renders its own DOM elements; need to ensure `.ProseMirror` content area, selection highlights, and link styling respect dark mode
- **Already partially themed:** Has 4 `dark:` variants in rich-text-editor.tsx

### @tanstack/react-table (1 file)
- `components/views/DataTable.tsx`
- **Impact:** Table renders through React components with Tailwind classes. The DataTable has hardcoded `rgba()` box-shadow and sticky column styling that needs dark mode adaptation.

### @dnd-kit (Drag & Drop) (10 files)
- Board view: `BoardView.tsx`, `BoardColumn.tsx`, `BoardCard.tsx`
- Sortable views: `SelectedColumnsList.tsx`, `SortableViewTab.tsx`, `ViewTabsBar.tsx`
- Form builder: `FieldPalette.tsx`, `FormBuilder.tsx`
- Cases: `remediation-tab.tsx`, `remediation-step-card.tsx`
- **Impact:** Drag overlays, drop indicators, and placeholder elements may need dark-aware styling

### Radix UI Primitives (17 files using direct imports)
- All accessed via shadcn/ui wrappers (`dialog`, `popover`, `dropdown-menu`, `select`, `tabs`, `checkbox`, `collapsible`, `alert-dialog`, `switch`, `toggle-group`, `tooltip`, `scroll-area`, `separator`, `sheet`)
- **Impact:** Already styled via shadcn/ui CSS variables. Should auto-adapt with `.dark` class. The `command-palette.tsx` also uses Radix patterns directly.

### react-day-picker (1 file)
- `components/ui/calendar.tsx`
- **Impact:** Calendar styling may need explicit dark mode classes for day cells, navigation buttons, range highlighting

### Sonner Toast (1 file)
- `components/ui/toaster.tsx`
- **Impact:** Has 4 existing hardcoded color references. Toast notifications need theme-aware styling. Sonner supports a `theme` prop (`light`/`dark`/`system`).

### Lucide React Icons (widespread - 100+ files)
- **Impact:** Icons inherit `currentColor` by default. No special theming needed as long as parent text color is correct.

### i18next (internationalization)
- Used for text translation only. No theming impact.

---

## 7. Summary & Recommendations

### Total Scope
- **43 pages** across 7 route groups
- **~200+ component files** (excluding tests)
- **~1,284 hardcoded color occurrences** needing `dark:` variants
- **30 UI primitives** (mostly auto-adapt via CSS variables)
- **~170+ feature components** with manual color classes

### Recommended Migration Strategy

**Phase A: Infrastructure (do first)**
1. Create a ThemeProvider context with system preference detection and localStorage persistence
2. Add dark mode toggle to top-nav or settings
3. Verify/extend the CSS variables in globals.css for any missing semantic tokens
4. Add semantic color tokens for status colors (success, warning, error, info) as CSS variables

**Phase B: Automatic wins (UI primitives)**
1. The 30 shadcn/ui components in `components/ui/` mostly use CSS variable classes (`bg-background`, `text-foreground`, etc.) and will auto-adapt. Audit each for any hardcoded overrides.
2. Specifically fix: `toaster.tsx` (4 hardcoded), `dialog.tsx` (4 hardcoded), `dropdown-menu.tsx` (7 hardcoded), `sheet.tsx` (1 hardcoded), `alert-dialog.tsx` (1 hardcoded), `status-badge.tsx`, `severity-badge.tsx`

**Phase C: Layout shell (high impact)**
1. `app-sidebar.tsx` - Already uses sidebar CSS variables
2. `top-nav.tsx` - 13 hardcoded occurrences
3. `mobile-bottom-nav.tsx`, `mobile-more-drawer.tsx`
4. `case-detail-layout.tsx` - 24 hardcoded occurrences (core page layout)
5. `InternalLayout.tsx` - 6 hardcoded occurrences

**Phase D: Feature components (by area, most to least traffic)**
1. Cases (23 components, ~200 hardcoded colors)
2. Investigations (10 components, ~80 hardcoded colors)
3. Dashboard (5 components, ~20 hardcoded colors)
4. Views/DataGrid (27 components, ~30 hardcoded colors)
5. Policies (8 components, ~40 hardcoded colors)
6. Ethics portal (20 components - already partially done)
7. Operator console (17 components)
8. Employee portal (11 components)
9. Settings (8 components)
10. Campaigns (6 components)
11. Remaining (disclosures, conflicts, exports, projects, implementation)

**Phase E: Third-party integration**
1. Configure Sonner `theme` prop from context
2. Test Tiptap editor styling in dark mode
3. Verify @dnd-kit drag overlays in dark mode
4. Verify react-day-picker calendar in dark mode
5. Test DataTable sticky column shadows in dark mode

### Estimated Effort
- **Infrastructure:** Small (ThemeProvider, toggle, CSS variables)
- **UI Primitives:** Small (mostly auto-adapt, ~7 files need fixes)
- **Layout Components:** Medium (~8 files)
- **Feature Components:** Large (~170 files, ~1,200+ class additions)
- **Testing/QA:** Medium (visual regression across all pages)

### Key Risk: Status/Severity Color Mappings
Many components use light-shade backgrounds with dark-shade text for status indicators (e.g., `bg-green-100 text-green-800`). In dark mode, these patterns should invert to dark-shade backgrounds with light-shade text (e.g., `dark:bg-green-900/30 dark:text-green-300`). Consider creating reusable semantic color mappings to avoid inconsistency:

```
// Suggested: create semantic status color utilities
const statusColors = {
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  warning: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  error: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
}
```

These mappings are used in at least: `case-header.tsx`, `case-detail-header.tsx`, `investigation-card.tsx`, `investigation-header.tsx`, `status-badge.tsx`, `severity-badge.tsx`, `ethics/status-badge.tsx`, `policy-detail-header.tsx`, `policy-list.tsx`, and many more.
