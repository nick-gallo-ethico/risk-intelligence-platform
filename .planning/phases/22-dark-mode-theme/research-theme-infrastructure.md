# Theme Infrastructure Research

> Researched: 2026-02-08
> Scope: `apps/frontend/` of the Ethico Risk Intelligence Platform

---

## 1. Current CSS / Theme Setup

### 1.1 Tailwind Configuration (`apps/frontend/tailwind.config.ts`)

- **Dark mode strategy:** `darkMode: ['class']` -- class-based dark mode is already configured.
  The `dark` variant activates when a `.dark` class is present on an ancestor element (typically `<html>`).
- **Content paths:** `./src/pages/**`, `./src/components/**`, `./src/app/**`
- **Plugin:** `tailwindcss-animate` (for accordion and other animations)
- **Container:** Centered, `2rem` padding, max `1400px`

### 1.2 CSS Custom Properties (`apps/frontend/src/app/globals.css`)

The file defines a full set of **shadcn/ui CSS custom properties** in HSL format (without the `hsl()` wrapper -- values are bare HSL numbers like `227 36% 13%`).

**Light theme (`:root`):**

| Token | HSL Value | Description |
|---|---|---|
| `--ethico-navy` | `227 36% 13%` | Brand: Ethico navy |
| `--ethico-cyan` | `170 72% 50%` | Brand: Ethico cyan/teal |
| `--ethico-purple` | `259 91% 66%` | Brand: Ethico purple |
| `--ethico-purple-light` | `259 87% 76%` | Brand: Ethico purple light |
| `--background` | `0 0% 100%` | White |
| `--foreground` | `227 36% 13%` | Ethico navy |
| `--card` | `0 0% 100%` | White |
| `--card-foreground` | `227 36% 13%` | Ethico navy |
| `--popover` | `0 0% 100%` | White |
| `--popover-foreground` | `227 36% 13%` | Ethico navy |
| `--primary` | `227 36% 13%` | Ethico navy |
| `--primary-foreground` | `210 40% 98%` | Near white |
| `--secondary` | `210 40% 96.1%` | Light gray-blue |
| `--secondary-foreground` | `227 36% 13%` | Ethico navy |
| `--muted` | `210 40% 96.1%` | Light gray-blue |
| `--muted-foreground` | `215.4 16.3% 46.9%` | Medium gray |
| `--accent` | `170 72% 50%` | Ethico cyan |
| `--accent-foreground` | `227 36% 13%` | Ethico navy |
| `--destructive` | `0 84.2% 60.2%` | Red |
| `--destructive-foreground` | `210 40% 98%` | Near white |
| `--border` | `214.3 31.8% 91.4%` | Light border |
| `--input` | `214.3 31.8% 91.4%` | Light border |
| `--ring` | `259 91% 66%` | Ethico purple |
| `--radius` | `0.5rem` | Border radius |
| `--sidebar-background` | `227 36% 13%` | Ethico navy |
| `--sidebar-foreground` | `0 0% 100%` | White |
| `--sidebar-primary` | `0 0% 100%` | White |
| `--sidebar-primary-foreground` | `227 36% 13%` | Ethico navy |
| `--sidebar-accent` | `0 0% 100% / 0.1` | White 10% |
| `--sidebar-accent-foreground` | `0 0% 100%` | White |
| `--sidebar-border` | `0 0% 100% / 0.1` | White 10% |
| `--sidebar-ring` | `170 72% 50%` | Ethico cyan |

**Dark theme (`.dark`):**

| Token | HSL Value | Description |
|---|---|---|
| `--background` | `227 36% 13%` | Dark navy |
| `--foreground` | `210 40% 98%` | Near white |
| `--card` | `227 36% 17%` | Slightly lighter navy |
| `--card-foreground` | `210 40% 98%` | Near white |
| `--popover` | `227 36% 17%` | Slightly lighter navy |
| `--popover-foreground` | `210 40% 98%` | Near white |
| `--primary` | `210 40% 98%` | Near white (inverted from light) |
| `--primary-foreground` | `227 36% 13%` | Dark navy |
| `--secondary` | `227 32% 22%` | Muted navy |
| `--secondary-foreground` | `210 40% 98%` | Near white |
| `--muted` | `227 32% 22%` | Muted navy |
| `--muted-foreground` | `215 20.2% 65.1%` | Medium light gray |
| `--accent` | `170 72% 50%` | Ethico cyan (same as light) |
| `--accent-foreground` | `227 36% 13%` | Dark navy |
| `--destructive` | `0 62.8% 30.6%` | Darker red |
| `--destructive-foreground` | `210 40% 98%` | Near white |
| `--border` | `227 32% 22%` | Muted navy |
| `--input` | `227 32% 22%` | Muted navy |
| `--ring` | `170 72% 50%` | Ethico cyan |
| `--sidebar-background` | `240 5.9% 10%` | Very dark gray |
| `--sidebar-foreground` | `240 4.8% 95.9%` | Near white |
| `--sidebar-primary` | `224.3 76.3% 48%` | Blue |
| `--sidebar-primary-foreground` | `0 0% 100%` | White |
| `--sidebar-accent` | `240 3.7% 15.9%` | Dark gray |
| `--sidebar-accent-foreground` | `240 4.8% 95.9%` | Near white |
| `--sidebar-border` | `240 3.7% 15.9%` | Dark gray |
| `--sidebar-ring` | `217.2 91.2% 59.8%` | Blue |

### 1.3 Custom Gradient Utilities (globals.css `@layer utilities`)

Three gradient utility classes are defined:
- `.ethico-gradient` -- cyan-to-purple linear gradient (135deg)
- `.ethico-gradient-text` -- same gradient applied to text (background-clip text)
- `.ethico-gradient-reverse` -- purple-light-to-cyan gradient

### 1.4 Base Layer Defaults (globals.css)

```css
* { @apply border-border; }
body { @apply bg-background text-foreground; }
```

These ensure the entire app uses semantic tokens by default.

---

## 2. Theme Provider / Context

### 2.1 No Global Dark Mode Theme Provider

There is **no global theme provider** for dark/light mode toggling. The root providers in `apps/frontend/src/app/providers.tsx` include:
- `QueryClientProvider` (TanStack Query)
- `AuthProvider`
- `ShortcutsProvider`

There is **no** `next-themes` package installed. The `next-themes` package is not in `package.json` dependencies.

### 2.2 Root Layout (`apps/frontend/src/app/layout.tsx`)

The `<html>` tag is rendered with `lang="en"` but **no class for dark mode** and **no suppressHydrationWarning** attribute (which would be needed for `next-themes`).

```tsx
<html lang="en">
  <body className={inter.className}>
    <Providers>
      <main className="min-h-screen">{children}</main>
    </Providers>
  </body>
</html>
```

### 2.3 Tenant-Specific Theme Provider (Ethics Portal Only)

`apps/frontend/src/components/ethics/tenant-theme-provider.tsx` provides a **tenant branding theme provider** that:
- Fetches CSS from `/api/v1/public/branding/:tenant/css`
- Injects CSS custom properties into the document head via a `<style>` element
- Falls back to a default theme on error
- Shows a `ThemeSkeleton` loading state

This is used **only** in the Ethics Portal route (`/ethics/[tenant]/*`), not for the main authenticated app. It does NOT handle dark/light mode -- it handles tenant branding colors.

---

## 3. Current Dark Mode Support

### 3.1 CSS Variables: FULLY DEFINED

The `.dark` class CSS custom property overrides are **already defined** in `globals.css`. The dark theme tokens are complete and brand-appropriate (navy-based dark theme preserving Ethico cyan accent).

### 3.2 Tailwind Config: READY

`darkMode: ['class']` is configured. The class-based strategy is the correct approach for a togglable dark mode.

### 3.3 `dark:` Class Usage in Components: PARTIAL (20 files, ~67 occurrences)

The following files use `dark:` Tailwind variants:

| File | Count | Context |
|---|---|---|
| `components/employee/proxy-confirmation.tsx` | 10 | Status colors |
| `components/employee/proxy-report-form.tsx` | 7 | Info cards |
| `components/ethics/status-badge.tsx` | 5 | Badge variants |
| `components/ethics/smart-prompts.tsx` | 5 | Amber warning styling |
| `components/ethics/access-code-display.tsx` | 5 | Warning/success states |
| `components/ethics/confirmation-page.tsx` | 3 | Success icon |
| `app/ethics/[tenant]/status/page.tsx` | 4 | Status info |
| `components/policies/policy-detail-header.tsx` | 4 | Warning card |
| `components/rich-text/rich-text-editor.tsx` | 4 | Prose styling |
| `components/policies/policy-version-diff.tsx` | 3 | Diff highlighting |
| `components/exports/TaggedFieldConfig.tsx` | 3 | Field styling |
| `components/ui/alert.tsx` | 3 | Alert variants |
| `app/employee/proxy-report/page.tsx` | 2 | Warning state |
| `components/views/SelectedColumnsList.tsx` | 2 | Column highlight |
| `components/operator/directives-panel.tsx` | 2 | Active state |
| `components/views/AdvancedFiltersPanel.tsx` | 1 | Filter badge |
| `components/operator/call-timer.tsx` | 1 | Timer state |
| `components/rich-text/rich-text-display.tsx` | 1 | Prose |
| `components/rich-text/character-count.tsx` | 1 | Warning color |
| `components/ethics/report-form.tsx` | 1 | Border color |

Most `dark:` usage is for **semantic color overrides** (amber, blue, green, red feedback colors) rather than base layout. This means these components are partially dark-mode aware but the majority of the app is NOT.

### 3.4 Theme Toggle Component: NONE

There is no theme toggle component anywhere in the codebase.

### 3.5 localStorage Theme Persistence: NONE

No localStorage-based theme persistence was found. No `prefers-color-scheme` media query is used anywhere.

### 3.6 Missing Infrastructure for Dark Mode

To enable dark mode, the following are needed:
1. Install `next-themes` package
2. Add `ThemeProvider` wrapping the app in `providers.tsx`
3. Add `suppressHydrationWarning` to `<html>` in root layout
4. Add `.dark` class toggling to `<html>` element
5. Create a theme toggle component
6. Audit all components for hardcoded colors

---

## 4. Component Library

### 4.1 shadcn/ui Configuration (`apps/frontend/components.json`)

```json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

Key details:
- **Style:** `default` (not "new-york")
- **RSC:** true (React Server Components enabled)
- **Base color:** `slate` -- this is the shadcn base palette
- **CSS Variables:** `true` -- all colors use CSS custom properties (good for theming)

### 4.2 shadcn/ui Components Inventory (30 files in `components/ui/`)

| Component | File |
|---|---|
| Alert | `alert.tsx` |
| AlertDialog | `alert-dialog.tsx` |
| Avatar | `avatar.tsx` |
| Badge | `badge.tsx` |
| Button | `button.tsx` |
| Calendar | `calendar.tsx` |
| Card | `card.tsx` |
| Checkbox | `checkbox.tsx` |
| Collapsible | `collapsible.tsx` |
| Dialog | `dialog.tsx` |
| DropdownMenu | `dropdown-menu.tsx` |
| Input | `input.tsx` |
| Label | `label.tsx` |
| Popover | `popover.tsx` |
| Progress | `progress.tsx` |
| ScrollArea | `scroll-area.tsx` |
| Select | `select.tsx` |
| Separator | `separator.tsx` |
| SeverityBadge | `severity-badge.tsx` (custom) |
| Sheet | `sheet.tsx` |
| Sidebar | `sidebar.tsx` |
| Skeleton | `skeleton.tsx` |
| StatusBadge | `status-badge.tsx` (custom) |
| Switch | `switch.tsx` |
| Table | `table.tsx` |
| Tabs | `tabs.tsx` |
| Textarea | `textarea.tsx` |
| Toaster | `toaster.tsx` |
| ToggleGroup | `toggle-group.tsx` |
| Tooltip | `tooltip.tsx` |

### 4.3 Material-UI: NOT USED

No `@mui/*` or `material-ui` imports found anywhere in the frontend. The project has fully migrated to shadcn/ui.

### 4.4 Radix UI Primitives (from `package.json`)

All shadcn/ui components are backed by Radix UI primitives:
- `@radix-ui/react-alert-dialog`
- `@radix-ui/react-checkbox`
- `@radix-ui/react-collapsible`
- `@radix-ui/react-dialog`
- `@radix-ui/react-dropdown-menu`
- `@radix-ui/react-popover`
- `@radix-ui/react-scroll-area`
- `@radix-ui/react-select`
- `@radix-ui/react-separator`
- `@radix-ui/react-slot`
- `@radix-ui/react-switch`
- `@radix-ui/react-tabs`
- `@radix-ui/react-toggle-group`
- `@radix-ui/react-tooltip`

### 4.5 Other UI Dependencies

- `class-variance-authority` (CVA) -- used for component variants
- `clsx` + `tailwind-merge` -- used via `cn()` utility
- `lucide-react` -- icon library
- `sonner` -- toast notifications
- `@tiptap/*` -- rich text editor (ProseMirror-based)
- `react-day-picker` -- calendar date picker
- `@dnd-kit/*` -- drag and drop functionality
- `react-hook-form` + `@hookform/resolvers` + `zod` -- form handling

### 4.6 Custom Component Counts by Area

| Directory | Component Count | Notes |
|---|---|---|
| `ui/` | 30 | shadcn/ui primitives |
| `views/` | 27 | Data table, board, filters, views system |
| `cases/` | 23 | Case management UI |
| `ethics/` | 20 | Ethics portal public-facing |
| `operator/` | 17 | Operator/support UI |
| `employee/` | 11 | Employee-facing forms |
| `investigations/` | 10 | Investigation management |
| `policies/` | 9 | Policy management |
| `settings/` | 8 | Settings panels |
| `layout/` | 7 | App layout components |
| `campaigns/` | 6 | Campaign management |
| `dashboard/` | 5 | Dashboard widgets |
| `users/` | 5 | User management |
| `common/` | 4 | Command palette, empty state, etc. |
| `rich-text/` | 4 | Rich text editor/display |
| `implementation/` | 4 | Implementation tracking |
| `analytics/` | 3 | Analytics dashboards |
| `conflicts/` | 3 | Conflict of interest |
| `files/` | 3 | File upload/preview |
| `disclosures/` | 2 | Disclosure forms |
| `exports/` | 2 | Export configuration |
| `projects/` | 2 | Project management |
| `layouts/` | 1 | Internal layout |
| **TOTAL** | **224** | |

---

## 5. Hardcoded Colors (Dark Mode Blockers)

### 5.1 Hardcoded Tailwind Gray/White Classes

**314 occurrences** across 30+ files of `bg-white`, `bg-gray-*`, `text-gray-*`, `border-gray-*`. These classes will NOT respond to dark mode because they are NOT using CSS custom properties.

**Worst offenders** (files with most hardcoded colors):
- `components/implementation/GoLiveChecklist.tsx` (25 occurrences)
- `components/cases/case-detail-layout.tsx` (22)
- `components/cases/case-detail-header.tsx` (22)
- `components/cases/linked-riu-list.tsx` (20)
- `components/common/command-palette.tsx` (16)
- `components/cases/case-tabs.tsx` (19)
- `components/implementation/ChecklistPanel.tsx` (16)
- `components/ethics/theme-skeleton.tsx` (21)

### 5.2 Hardcoded Hex Colors

Only found in `components/settings/organization-branding-settings.tsx`:
- `#0070f3` (primary default)
- `#6366f1` (secondary default)
- `#f59e0b` (accent default)

These are used as default values for tenant branding color pickers -- acceptable and not a dark mode concern.

### 5.3 Hardcoded HSL in Templates

One instance in `components/layout/top-nav.tsx`:
```tsx
bg-[hsl(227,36%,13%)] // Ethico navy, hardcoded in top nav header
```

This is the top navigation bar which uses a dark navy background regardless of theme mode. This is likely intentional (HubSpot-style always-dark top nav), but should be verified for dark mode.

### 5.4 Hardcoded RGBA

Two instances in `components/views/DataTable.tsx`:
```tsx
shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)] // Sticky column shadows
```

These shadow values will need dark mode variants.

### 5.5 Inline Styles (`style={...}`)

21 files use inline `style` props. These are mainly for:
- Dynamic widths/heights (DataTable column sizing, Gantt chart bars)
- Dynamic positioning (drag-and-drop overlays)
- Dynamic colors from data (branding settings color preview)

Most inline styles are for layout/positioning and won't need dark mode changes. The branding color previews use dynamic hex values which are inherently theme-independent.

---

## 6. Layout Architecture

### 6.1 Route Structure

```
app/
  layout.tsx              -- Root: html/body, font, Providers
  (authenticated)/
    layout.tsx            -- SidebarProvider + AppSidebar + MobileBottomNav + AiPanel
    dashboard/
    cases/
    investigations/
    policies/
    ...
  ethics/[tenant]/
    layout.tsx            -- TenantThemeProvider + EthicsHeader + EthicsFooter
  employee/
    layout.tsx            -- Employee-facing layout
  operator/
    layout.tsx            -- Operator support layout
  internal/
    ...                   -- Internal ops (uses InternalLayout component)
  login/
    ...                   -- Login page
```

### 6.2 Key Layout Files for Dark Mode Integration

1. **`app/layout.tsx`** -- Must add `suppressHydrationWarning` to `<html>`, add ThemeProvider
2. **`app/providers.tsx`** -- Must wrap with ThemeProvider from `next-themes`
3. **`components/layout/top-nav.tsx`** -- Uses hardcoded `bg-[hsl(227,36%,13%)]`; may keep as-is (always dark nav)
4. **`components/layouts/InternalLayout.tsx`** -- Uses `bg-gray-50`, `bg-white`, hardcoded gray classes extensively
5. **`components/ethics/theme-skeleton.tsx`** -- All hardcoded grays

---

## 7. Summary & Recommendations

### What's Already in Place (Good)
- Tailwind `darkMode: ['class']` is configured
- Full `.dark` CSS custom property overrides exist in `globals.css`
- shadcn/ui components use CSS variables by default (`cssVariables: true`)
- Base body styles use `bg-background text-foreground` semantic tokens
- Brand colors (ethico-navy, ethico-cyan, ethico-purple) are tokenized
- No Material-UI dependency to deal with

### What's Missing (Work Required)
1. **`next-themes` package** -- Not installed
2. **ThemeProvider** -- Not wired up
3. **Theme toggle UI** -- Does not exist
4. **`<html>` configuration** -- Missing `suppressHydrationWarning` and class management
5. **~314 hardcoded color references** -- `bg-white`, `bg-gray-*`, `text-gray-*`, etc. across 30+ files need migration to semantic tokens (`bg-background`, `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`)
6. **Inline shadows** -- 2 instances need `dark:` variants
7. **20 files already have `dark:` variants** -- These are ahead of the curve and properly handle dark mode for specific semantic colors (amber warnings, green success, blue info, red destructive)

### Estimated Effort
- Infrastructure (next-themes, provider, toggle): **Small** -- straightforward setup
- shadcn/ui components: **Minimal** -- already use CSS variables, will auto-adapt
- Custom components audit (224 files): **Large** -- ~30+ files with hardcoded colors need migration
- Testing across all routes: **Medium** -- visual regression testing needed

### Risk Areas
- The **tenant theme provider** (ethics portal) injects CSS custom properties dynamically. Dark mode must coordinate with tenant branding -- if a tenant has custom colors, those should also have dark mode variants, or the system should derive them automatically.
- The **top navigation** uses a hardcoded dark background. In dark mode, this might need a subtle visual differentiation from the main content area.
- The **sidebar** already uses dedicated `--sidebar-*` tokens which have dark mode values defined. This should transition smoothly.
