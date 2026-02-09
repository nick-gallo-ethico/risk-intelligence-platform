# Phase 22: Dark Mode & Theme - Charts & Visuals Research

## 1. Chart Libraries in Use

### Finding: No Chart Library Currently Installed

The frontend `package.json` (`apps/frontend/package.json`) does **not** include any charting library:
- No `recharts`
- No `chart.js` / `react-chartjs-2`
- No `d3`, `visx`, `nivo`, `victory`, `apexcharts`, `highcharts`, or `plotly`

References to `recharts` exist only in planning/research markdown files (phases 11, 12, 18), suggesting it was planned but never added as a dependency.

### Dashboard Widgets - Current State

The analytics dashboard detail page (`apps/frontend/src/app/(authenticated)/analytics/dashboards/[id]/page.tsx`) uses **placeholder widgets** with static numbers in `Card` components. The "Case Volume Trend" widget renders a placeholder text: `"Chart visualization will be rendered here"`. No actual chart rendering exists yet.

Dashboard components in `apps/frontend/src/components/dashboard/`:
- `stats-cards.tsx` - Metric cards with calculated stats (no charts)
- `recent-cases.tsx` - Table of recent cases
- `my-assignments.tsx` - List of user's active cases
- `quick-actions.tsx` - Action buttons

### GanttChart - Custom SVG/HTML Implementation

**File:** `apps/frontend/src/components/projects/GanttChart.tsx`

This is a fully custom implementation using `div` elements with inline styles for bars. Colors come from:

**File:** `apps/frontend/src/lib/gantt-utils.ts` (lines 160-191)

```typescript
// Hardcoded hex colors for milestone status
export function getStatusColor(status): string {
  switch (status) {
    case 'COMPLETED': return '#22c55e'; // green-500
    case 'IN_PROGRESS': return '#3b82f6'; // blue-500
    case 'AT_RISK': return '#f59e0b'; // amber-500
    case 'CANCELLED': return '#6b7280'; // gray-500
    default: return '#94a3b8'; // slate-400
  }
}

export function getStatusBgColor(status): string {
  switch (status) {
    case 'COMPLETED': return '#dcfce7'; // green-100
    case 'IN_PROGRESS': return '#dbeafe'; // blue-100
    case 'AT_RISK': return '#fef3c7'; // amber-100
    case 'CANCELLED': return '#f3f4f6'; // gray-100
    default: return '#f1f5f9'; // slate-100
  }
}
```

**Theming concern:** These are **hardcoded hex values** applied via inline `style` attributes (not Tailwind classes), making them invisible to CSS variable-based theming. The GanttChart also uses hardcoded `bg-white`, `bg-slate-50`, `bg-slate-100`, `bg-blue-50` Tailwind classes.

---

## 2. Current Color Configuration System

### CSS Custom Properties (globals.css)

**File:** `apps/frontend/src/app/globals.css`

The app uses the **shadcn/ui CSS variable pattern** with HSL values:

**Light theme (`:root`):**
```css
--background: 0 0% 100%;         /* white */
--foreground: 227 36% 13%;       /* Ethico navy */
--card: 0 0% 100%;               /* white */
--card-foreground: 227 36% 13%;  /* navy */
--primary: 227 36% 13%;          /* navy */
--primary-foreground: 210 40% 98%; /* near-white */
--secondary: 210 40% 96.1%;      /* light gray */
--muted: 210 40% 96.1%;          /* light gray */
--accent: 170 72% 50%;           /* Ethico cyan */
--destructive: 0 84.2% 60.2%;    /* red */
--border: 214.3 31.8% 91.4%;     /* light gray */
--ring: 259 91% 66%;             /* Ethico purple */
```

**Dark theme (`.dark`) - Already Defined:**
```css
--background: 227 36% 13%;       /* navy */
--foreground: 210 40% 98%;       /* near-white */
--card: 227 36% 17%;             /* slightly lighter navy */
--primary: 210 40% 98%;          /* inverted to white */
--secondary: 227 32% 22%;        /* dark blue-gray */
--muted: 227 32% 22%;            /* dark blue-gray */
--accent: 170 72% 50%;           /* cyan (unchanged) */
--destructive: 0 62.8% 30.6%;    /* darker red */
--border: 227 32% 22%;           /* dark border */
```

The `.dark` class CSS variables are fully defined but **never activated** -- there is no mechanism to toggle the `dark` class on the `<html>` element.

### Tailwind Configuration

**File:** `apps/frontend/tailwind.config.ts`

- `darkMode: ['class']` is configured -- dark mode is class-based (requires `.dark` on `<html>`)
- All semantic colors reference CSS variables via `hsl(var(--xxx))`
- Sidebar-specific variables are also defined
- Brand colors (`--ethico-navy`, `--ethico-cyan`, `--ethico-purple`) defined in `:root`

### Tenant Branding System

**File:** `apps/frontend/src/components/ethics/tenant-theme-provider.tsx`

A `TenantThemeProvider` exists for the **Ethics Portal** (public-facing reporter portal) that:
- Fetches CSS from `/api/v1/public/branding/:tenant/css`
- Injects tenant-specific CSS variables into `<style>` element
- Falls back to default Ethico theme on error

**File:** `apps/frontend/src/types/branding.ts`

The `TenantBranding` type already includes:
- `theme: ThemeMode` with values `'LIGHT' | 'DARK' | 'SYSTEM'`
- `colorPalette: ColorPalette | null` with all 17 CSS variable tokens
- This is for the **Ethics Portal only**, not the admin platform

---

## 3. Data Table Implementations

### Primary: DataTable (TanStack React Table)

**File:** `apps/frontend/src/components/views/DataTable.tsx`

Uses `@tanstack/react-table` v8.21.3 with:
- Column resizing with resize handles
- Row selection (checkboxes)
- Frozen/sticky columns
- Sorting (server-side)
- Pagination via `PaginationBar` component
- Bulk actions via `BulkActionsBar` component

**Theming concerns (hardcoded colors):**
- Frozen column shadow: `shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]` -- hardcoded shadow color
- Header: Uses `bg-muted` (themed)
- Selected rows: `bg-primary/5` (themed)
- Hover: `hover:bg-muted/50` (themed)
- Resize handle: `hover:bg-primary/50` (themed)
- Frozen cells: `bg-background` (themed)

**Verdict:** Mostly theme-compatible. The frozen column `rgba(0,0,0,0.1)` shadow needs dark mode handling.

### Secondary: shadcn/ui Table Components

**File:** `apps/frontend/src/components/ui/table.tsx`

Standard shadcn/ui table primitives using semantic classes (`border-b`, `hover:bg-muted/50`, `text-muted-foreground`). Fully theme-compatible.

### Users Table

**File:** `apps/frontend/src/components/users/users-table.tsx`

Uses the shadcn/ui `Table` components. Has hardcoded `text-gray-*` and `bg-gray-*` classes (needs audit).

---

## 4. Visual Components Needing Theming

### A. Status/Severity Badges (Hardcoded Colors - HIGH PRIORITY)

**File:** `apps/frontend/src/components/ui/status-badge.tsx`
```typescript
const STATUS_COLORS: Record<CaseStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800 border-blue-200',
  OPEN: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CLOSED: 'bg-gray-100 text-gray-800 border-gray-200',
};
```

**File:** `apps/frontend/src/components/ui/severity-badge.tsx`
```typescript
const SEVERITY_COLORS: Record<Severity, string> = {
  LOW: 'bg-green-100 text-green-800 border-green-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
};
```

**Theming concern:** These use explicit Tailwind color classes (not CSS variables). In dark mode, `bg-blue-100` stays blue-100 regardless of theme. Need `dark:` variants or a mapping approach.

**File:** `apps/frontend/src/components/ethics/status-badge.tsx`
This one **already has dark mode classes**: `'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'`

### B. Dashboard Stats Cards (Hardcoded Colors)

**File:** `apps/frontend/src/components/dashboard/stats-cards.tsx`
- `text-gray-500` (multiple instances)
- `text-yellow-600` (Open Cases)
- `text-blue-600` (New Cases)
- `text-green-600` (Resolution Time)

### C. Progress Bar

**File:** `apps/frontend/src/components/ui/progress.tsx`
- Track: `bg-gray-200` (hardcoded)
- Fill: `bg-primary` (themed via CSS variable)
- Track needs `dark:bg-gray-700` or equivalent

### D. Timeline Components

**File:** `apps/frontend/src/components/cases/case-activity-timeline.tsx`
- Action bar: `bg-gray-50` (hardcoded)
- Case details text: `text-gray-700` (hardcoded)
- Activity section header: `text-gray-700` (hardcoded)
- Empty state: `text-gray-500`, `text-gray-300`, `text-gray-900` (hardcoded)
- Modal overlay: `bg-black/50`, modal body: `bg-white` (hardcoded)

**File:** `apps/frontend/src/components/projects/MilestoneTimeline.tsx`
- Timeline line: `bg-slate-200` (hardcoded)
- Hover state: `hover:bg-slate-50` (hardcoded)
- Status icon backgrounds: Hardcoded Tailwind color classes (`bg-slate-100`, `bg-blue-100`, `bg-amber-100`, `bg-green-100`, `bg-gray-100`)

**File:** `apps/frontend/src/components/conflicts/EntityTimeline.tsx`
- Timeline line: `bg-muted` (themed - good)
- Event type colors: Hardcoded (`bg-blue-100 text-blue-600`, `bg-orange-100 text-orange-600`, etc.)

### E. GanttChart (Hardcoded Hex Colors)

**File:** `apps/frontend/src/components/projects/GanttChart.tsx`
- Container: `bg-white` (hardcoded)
- Toolbar: `bg-slate-50` (hardcoded)
- Header: `bg-slate-100` (hardcoded)
- Grid lines: `border-slate-100` (hardcoded)
- Today column: `bg-blue-50/30` (hardcoded)
- Weekend columns: `bg-slate-50/50` (hardcoded)
- Today line: `bg-red-500`, label `bg-red-500 text-white` (hardcoded)
- **Bar colors use inline styles with hardcoded hex values** from `gantt-utils.ts`

### F. Dashboard Template Picker

**File:** `apps/frontend/src/components/analytics/dashboard-template-picker.tsx`
- Template colors hardcoded per type: `bg-blue-50 text-blue-600 border-blue-200`, etc.

### G. Remediation Step Cards

**File:** `apps/frontend/src/components/cases/remediation-step-card.tsx`
- Card background: `bg-white` (hardcoded)
- Drag handle hover: `hover:bg-gray-100` (hardcoded)
- Status badge colors hardcoded per status:
  - PENDING: `bg-gray-100 text-gray-700`
  - IN_PROGRESS: `bg-blue-100 text-blue-700`
  - COMPLETED: `bg-green-100 text-green-700`
  - SKIPPED: `bg-amber-100 text-amber-700`
  - AWAITING_APPROVAL: `bg-purple-100 text-purple-700`

### H. Project Cards (Internal Portal)

**File:** `apps/frontend/src/components/implementation/ProjectCard.tsx`
- Card: `bg-white` (hardcoded)
- Status colors hardcoded per status
- Health score colors: hardcoded `text-green-600`, `text-yellow-600`, `text-red-600`

### I. Top Navigation

**File:** `apps/frontend/src/components/layout/top-nav.tsx`
- Hardcoded `bg-[hsl(227,36%,13%)]` (Ethico navy)
- Multiple `text-white/XX`, `border-white/XX`, `bg-white/XX` classes
- The nav is always dark-styled -- may not need changes for dark mode

### J. Badge (Base Component)

**File:** `apps/frontend/src/components/ui/badge.tsx`
- Uses CVA with semantic classes: `bg-primary`, `bg-secondary`, `bg-destructive` (themed - good)

### K. Card (Base Component)

**File:** `apps/frontend/src/components/ui/card.tsx`
- Uses `bg-card text-card-foreground shadow-sm` (themed - good)

---

## 5. Settings/Preferences Infrastructure

### Settings Page Structure

**File:** `apps/frontend/src/app/(authenticated)/settings/page.tsx`

Settings hub with sections:
- **Organization:** General, Users & Permissions, Notification Preferences
- **Security & Access:** Security Settings, SSO Configuration
- **System:** Audit Log, Branding

Sub-pages exist at:
- `/settings/organization` (tabs: general, branding, notifications, security)
- `/settings/users` (list, invite, detail)
- `/settings/audit`

### User Preferences API (Backend)

**File:** `apps/backend/src/modules/notifications/controllers/preferences.controller.ts`

Existing API: `GET/PUT /api/v1/notifications/preferences`
- Currently only handles **notification preferences** (channels, quiet hours, timezone, OOO)
- Does **not** include theme/appearance preferences
- User preferences are tied to `userId` + `organizationId`

### No Theme Toggle Infrastructure

- `next-themes` is **not installed** (not in `package.json`)
- No `ThemeProvider` wrapping the app (only `AuthProvider`, `QueryClientProvider`, `ShortcutsProvider`)
- No `useTheme` hook exists
- The `<html>` element has no `class` attribute for dark mode toggling
- No user preference for theme is stored in the database

### User Profile Dropdown (Where Toggle Would Go)

**File:** `apps/frontend/src/components/layout/top-nav.tsx` (lines 268-327)

The user profile dropdown includes: My Profile, My Tasks, Settings, Log out.
This is where a theme toggle (light/dark/system) would naturally be placed.

### Branding Backend

**File:** `apps/backend/src/modules/branding/`

A branding module exists with:
- `branding.controller.ts` - CRUD for tenant branding
- `branding.service.ts` - Service layer
- `types/branding.types.ts` - Types including `ThemeMode: 'LIGHT' | 'DARK' | 'SYSTEM'`

This handles **tenant-level** branding for the Ethics Portal but not **user-level** theme preference.

---

## 6. Summary: Files Count by Theming Category

### Already Theme-Compatible (use CSS variables)
- `apps/frontend/src/components/ui/card.tsx` -- `bg-card`, `text-card-foreground`
- `apps/frontend/src/components/ui/badge.tsx` -- `bg-primary`, `bg-secondary`
- `apps/frontend/src/components/ui/table.tsx` -- `border-b`, `hover:bg-muted/50`
- `apps/frontend/src/components/views/DataTable.tsx` -- mostly themed (1 shadow fix needed)

### Need Dark Mode Variants (hardcoded Tailwind colors)
~90 files use `bg-gray-*`, `text-gray-*`, etc. Key ones:
- `apps/frontend/src/components/ui/status-badge.tsx`
- `apps/frontend/src/components/ui/severity-badge.tsx`
- `apps/frontend/src/components/ui/progress.tsx`
- `apps/frontend/src/components/dashboard/stats-cards.tsx`
- `apps/frontend/src/components/dashboard/recent-cases.tsx`
- `apps/frontend/src/components/dashboard/my-assignments.tsx`
- `apps/frontend/src/components/cases/case-activity-timeline.tsx`
- `apps/frontend/src/components/cases/remediation-step-card.tsx`
- `apps/frontend/src/components/projects/MilestoneTimeline.tsx`
- `apps/frontend/src/components/conflicts/EntityTimeline.tsx`
- `apps/frontend/src/components/analytics/dashboard-template-picker.tsx`
- `apps/frontend/src/components/implementation/ProjectCard.tsx`

### Need Hex-to-Variable Migration (hardcoded inline styles)
- `apps/frontend/src/lib/gantt-utils.ts` -- `getStatusColor()` and `getStatusBgColor()`
- `apps/frontend/src/components/projects/GanttChart.tsx` -- uses inline hex from utils

### Infrastructure Needed
1. Install `next-themes` package
2. Create `ThemeProvider` wrapper in `providers.tsx`
3. Add `dark` class toggle to `<html>` element
4. Add theme toggle UI in user dropdown (top-nav.tsx)
5. Optionally persist preference via user preferences API
6. When a charting library is eventually added, ensure it supports dark mode token mapping

### Already Has Dark Mode Support
- `apps/frontend/src/components/ethics/status-badge.tsx` -- has `dark:` prefixed classes
- `apps/frontend/src/app/globals.css` -- `.dark` CSS variables fully defined
- `apps/frontend/tailwind.config.ts` -- `darkMode: ['class']` configured
