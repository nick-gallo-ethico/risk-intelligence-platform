# Phase 22: Dark Mode & Theme - Research Summary

> Synthesized: 2026-02-08
> Sources: 4 parallel researchers (theme infrastructure, component inventory, charts/visuals, dark mode patterns)

---

## Current State: What Exists

### Already Working (Foundation is 60% Ready)
1. **Tailwind `darkMode: ['class']`** configured in `tailwind.config.ts`
2. **Full `.dark` CSS variable overrides** in `globals.css` — complete dark palette with Ethico brand navy
3. **shadcn/ui CSS variable system** active (`cssVariables: true`) — 30 UI primitives use semantic tokens
4. **Body defaults** use `bg-background text-foreground` — will auto-adapt
5. **Sidebar tokens** (`--sidebar-*`) have dark variants defined
6. **20 files already have `dark:` variants** (67 occurrences) — Ethics portal, rich text, some cases
7. **Brand colors tokenized** (`--ethico-navy`, `--ethico-cyan`, `--ethico-purple`)

### What's Missing (Work Required)
1. **`next-themes` package** — not installed
2. **ThemeProvider** — not wired into app providers
3. **Theme toggle UI** — does not exist
4. **`<html>` configuration** — missing `suppressHydrationWarning` and class management
5. **User preference storage** — no theme preference in database or API
6. **~1,284 hardcoded color classes** across ~100 files (bg-white, bg-gray-*, text-gray-*, etc.)
7. **~534 semantic color occurrences** (bg-blue-100 text-blue-800 patterns) needing dark variants
8. **Gantt chart hex colors** in inline styles (gantt-utils.ts)
9. **No system preference detection** (prefers-color-scheme)

---

## Architecture: App Structure

### Route Groups (43 pages total)
- **(authenticated)/** — 25 pages (dashboard, cases, investigations, policies, campaigns, analytics, settings, etc.)
- **ethics/[tenant]/** — 5 pages (public reporter portal, tenant-branded)
- **employee/** — 3 pages (employee self-service)
- **operator/** — 2 pages (hotline intake, QA queue)
- **internal/** — 4 pages (support, implementation)
- **Public** — 3 pages (root, login, offline)

### Layout Hierarchy
```
app/layout.tsx              → Root: <html>, <body>, Providers
  (authenticated)/layout.tsx → SidebarProvider + AppSidebar + MobileBottomNav + AiPanel
  ethics/[tenant]/layout.tsx → TenantThemeProvider + EthicsHeader/Footer
  employee/layout.tsx        → Employee layout
  operator/layout.tsx        → Operator layout
  internal/layout.tsx        → Internal admin layout
```

### Component Count: ~224 files
| Area | Components | Hardcoded Colors |
|------|-----------|-----------------|
| ui/ (shadcn) | 30 | Minimal (auto-adapt) |
| views/ | 27 | ~30 |
| cases/ | 23 | ~200 |
| ethics/ | 20 | ~40 (partially done) |
| operator/ | 17 | ~50 |
| employee/ | 11 | ~30 |
| investigations/ | 10 | ~80 |
| policies/ | 8 | ~40 |
| settings/ | 8 | ~20 |
| campaigns/ | 6 | ~15 |
| dashboard/ | 5 | ~20 |
| implementation/ | 4 | ~47 |
| Other | ~55 | ~100 |

---

## Key Technical Decisions

### 1. Dark Mode Strategy: `next-themes` + class-based
- Install `next-themes` — standard for Next.js dark mode
- Uses `class` strategy matching existing Tailwind config
- Handles SSR/SSG hydration mismatch prevention
- System preference detection built-in
- localStorage persistence built-in

### 2. Color Migration Strategy: Replace + Add
For hardcoded neutral colors (`bg-white`, `bg-gray-*`, `text-gray-*`):
- **Preferred:** Replace with semantic tokens (`bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`)
- **Fallback:** Add `dark:` variants where semantic tokens don't fit

For semantic status colors (`bg-blue-100 text-blue-800`):
- Create shared status color utilities with built-in dark variants
- Pattern: `bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300`

### 3. Gantt Chart: Replace hex with CSS variables
- `getStatusColor()` and `getStatusBgColor()` in gantt-utils.ts use hardcoded hex
- Migrate to CSS custom property access or Tailwind class approach

### 4. Flash of Wrong Theme (FOIT) Prevention
- `next-themes` handles this via script injection before hydration
- Requires `suppressHydrationWarning` on `<html>`
- Theme reads from localStorage before React renders

### 5. Ethics Portal Coordination
- Ethics portal has its own `TenantThemeProvider` for branding
- Dark mode should layer on top of (not conflict with) tenant branding
- The `TenantBranding` type already includes `theme: 'LIGHT' | 'DARK' | 'SYSTEM'`

### 6. Navigation Bar Handling
- Top nav uses hardcoded `bg-[hsl(227,36%,13%)]` (always dark navy)
- Sidebar already uses `--sidebar-*` CSS variables with dark variants
- In dark mode: sidebar adapts automatically, top nav stays dark (HubSpot pattern)
- May need subtle border/shadow to differentiate top nav from dark content area

---

## Third-Party Library Theming

| Library | Status | Action Needed |
|---------|--------|--------------|
| shadcn/ui (30 components) | CSS variables | Auto-adapts, audit 7 files with overrides |
| Radix UI primitives | Via shadcn/ui | No action |
| Tiptap rich text | Partially themed | Verify .ProseMirror styles |
| @tanstack/react-table | Mostly themed | Fix 1 rgba shadow |
| @dnd-kit drag-drop | Class-based | Verify drag overlays |
| react-day-picker | Via shadcn Calendar | Should auto-adapt |
| Sonner toasts | Supports theme prop | Pass theme from context |
| Lucide icons | Inherits currentColor | No action |
| recharts | NOT INSTALLED | N/A (planned for future) |

---

## Highest-Risk Files (Most Hardcoded Colors)

| File | Occurrences | Notes |
|------|------------|-------|
| FormPreview.tsx (disclosures) | ~54 | Form builder preview |
| FormBuilder.tsx (disclosures) | ~50 | Form builder |
| GoLiveChecklist.tsx | ~47 | Implementation portal |
| case-detail-header.tsx | ~33 | Core case page |
| linked-riu-list.tsx | ~31 | Case detail tab |
| investigation-card.tsx | ~27 | Case investigations |
| ConflictAlert.tsx | ~26 | Conflict review |
| case-detail-layout.tsx | ~24 | Case page layout |
| checklist-panel.tsx | ~24 | Investigation checklists |
| checklist-item.tsx | ~23 | Individual checklist items |
| case-tabs.tsx | ~22 | Case detail tabs |
| theme-skeleton.tsx | ~21 | Ethics portal skeleton |
| users-table.tsx | ~21 | User management |

---

## Recommended Plan Structure

### Wave 1: Infrastructure (no visual changes yet)
- Install next-themes, create ThemeProvider, wire into layout
- Create theme toggle component
- Add user preference persistence (localStorage + optional API)
- Create status color utility system (shared dark mode mappings)
- Add CSS variables for missing semantic tokens if needed

### Wave 2: Core Layout + UI Primitives
- Audit and fix 30 shadcn/ui components (mostly auto-adapt)
- Fix top-nav dark mode differentiation
- Fix authenticated layout, sidebar (already mostly themed)
- Fix internal layout, employee layout, operator layout
- Fix Sonner toaster theme prop

### Wave 3: High-Traffic Feature Components
- Dashboard components
- Case management (23 components — heaviest area)
- Investigation components
- Views/DataGrid system
- Policy components

### Wave 4: Remaining Feature Components
- Ethics portal (already partial)
- Operator console
- Employee portal
- Campaigns, disclosures, conflicts
- Settings, users, analytics
- Implementation/projects (Gantt chart, etc.)

### Wave 5: Testing & Polish
- Visual regression across all 43 pages
- Third-party component verification
- FOIT testing
- Accessibility contrast verification
- Demo data / seed update if needed

---

## RESEARCH COMPLETE
