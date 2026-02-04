---
phase: 08-portals
plan: 12
subsystem: ethics-portal
tags: [frontend, theming, white-label, next.js, react]
dependency-graph:
  requires: ["08-08", "08-01"]
  provides: ["TenantThemeProvider", "EthicsHeader", "EthicsFooter", "EthicsHome", "ethics-[tenant]-layout"]
  affects: ["08-13", "08-14", "08-15"]
tech-stack:
  added: []
  patterns: ["CSS injection for theming", "tenant-scoped routes", "feature-based navigation"]
key-files:
  created:
    - apps/frontend/src/components/ethics/tenant-theme-provider.tsx
    - apps/frontend/src/components/ethics/theme-skeleton.tsx
    - apps/frontend/src/components/ethics/ethics-header.tsx
    - apps/frontend/src/components/ethics/ethics-nav.tsx
    - apps/frontend/src/components/ethics/ethics-footer.tsx
    - apps/frontend/src/components/ethics/ethics-home.tsx
    - apps/frontend/src/components/ethics/quick-actions.tsx
    - apps/frontend/src/hooks/useTenantBranding.ts
    - apps/frontend/src/hooks/useEthicsPortalConfig.ts
    - apps/frontend/src/types/branding.ts
    - apps/frontend/src/app/ethics/[tenant]/layout.tsx
    - apps/frontend/src/app/ethics/[tenant]/page.tsx
  modified:
    - apps/frontend/src/components/ethics/index.ts
    - apps/frontend/src/hooks/useReportStatus.ts
decisions:
  - id: ethics-portal-theming
    decision: "CSS custom properties injected via style element"
    rationale: "Runtime theming without rebuild, follows shadcn/ui patterns"
metrics:
  duration: "19 min"
  completed: "2026-02-04"
---

# Phase 8 Plan 12: Ethics Portal Theming & Home Page Summary

**One-liner:** White-label theming infrastructure with CSS injection and branded home page for tenant-scoped Ethics Portal.

## What Was Built

### 1. TenantThemeProvider and Branding Infrastructure

**TenantThemeProvider** (`tenant-theme-provider.tsx`):
- Fetches CSS from `/api/v1/public/branding/:tenant/css` on mount
- Injects CSS as a `<style id="tenant-theme">` element in document head
- Shows `ThemeSkeleton` while loading to prevent flash of unstyled content
- Falls back to Ethico default theme (blue primary) on error
- Cleans up style element on unmount for proper tenant switching

**useTenantBranding hook** (`useTenantBranding.ts`):
- Fetches tenant branding JSON from `/api/v1/public/branding/:tenant`
- In-memory cache with 1-hour TTL (matches backend cache)
- Returns branding config, loading state, error, and refetch function
- Falls back to default branding on 404 or error

**useEthicsPortalConfig hook** (`useEthicsPortalConfig.ts`):
- Fetches portal config from `/api/v1/public/ethics/:tenant/config`
- Provides feature flags, welcome message, quick links configuration
- Same caching strategy as branding hook

**ThemeSkeleton** (`theme-skeleton.tsx`):
- Neutral gray loading state matching final layout structure
- Header, main content, footer skeleton elements
- Prevents jarring color shift when theme applies

### 2. Ethics Portal Header and Navigation

**EthicsHeader** (`ethics-header.tsx`):
- Sticky header with backdrop blur
- Tenant logo on left (or "Ethics Portal" fallback text)
- Desktop navigation in center (hidden on mobile)
- LanguageSwitcher on right
- Mobile hamburger menu with slide-out Sheet
- Skip-to-content link for accessibility

**EthicsNav** (`ethics-nav.tsx`):
- Navigation items: Home, Report an Issue, Check Status, Ask a Question, Resources
- Conditional items based on feature flags (chatbot, resources)
- Active link highlighting with `aria-current="page"`
- Supports both horizontal (desktop) and vertical (mobile) layouts

**EthicsFooter** (`ethics-footer.tsx`):
- Customizable footer text from branding config
- Standard links: Privacy Policy, Terms of Use, Accessibility
- Support for additional tenant-specific links
- Ethico attribution at bottom
- Responsive layout

### 3. Ethics Portal Layout and Home Page

**Layout** (`app/ethics/[tenant]/layout.tsx`):
- Wraps all Ethics Portal routes
- TenantThemeProvider for CSS injection
- EthicsHeader at top
- Main content area with `id="main-content"` for skip link
- EthicsFooter at bottom
- min-h-screen flex layout

**Home Page** (`app/ethics/[tenant]/page.tsx`):
- Loads branding and config via hooks
- Shows ThemeSkeleton while loading
- Renders EthicsHome with all data

**EthicsHome** (`ethics-home.tsx`):
- Welcome section with optional video embed
- Configurable welcome message
- Announcement banner (if configured)
- QuickActions grid
- "How It Works" 3-step section
- Trust indicators (Secure, Confidential, Anonymous, No Retaliation)

**QuickActions** (`quick-actions.tsx`):
- Grid of action cards (2x2 on desktop, vertical on mobile)
- "Report an Issue" highlighted as primary action
- Conditional display based on feature flags and quick links config
- Each card has icon, title, description, and action button

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed useReportStatus hook ordering**
- **Found during:** Task 2 (build verification)
- **Issue:** `refreshMessagesInternal` used before declaration, causing TypeScript error
- **Fix:** Moved `refreshMessagesInternal` definition before `sendMessage` that uses it
- **Files modified:** `apps/frontend/src/hooks/useReportStatus.ts`
- **Commit:** `830fd55`

## How to Use

### Access the Ethics Portal

Navigate to `/ethics/{tenant-slug}` where `{tenant-slug}` is the organization's URL slug:

```
http://localhost:3000/ethics/acme-corp
http://localhost:3000/ethics/demo-company
```

### Theme Customization

1. Configure branding via backend API:
   ```bash
   PUT /api/v1/branding
   {
     "mode": "TEMPLATE",
     "primaryColor": "221 83% 53%",
     "logoUrl": "https://storage.blob.core.windows.net/tenant-123/logo.png"
   }
   ```

2. The CSS endpoint generates theme CSS:
   ```bash
   GET /api/v1/public/branding/acme-corp/css
   # Returns: :root { --primary: 221 83% 53%; ... }
   ```

### Feature Flags

Configure which quick actions appear via portal config:
- `features.chatbotEnabled` - Shows "Ask a Question" action
- `features.resourcesEnabled` - Shows "Resources" action
- `quickLinks.*` - Fine-grained control over each quick link

## API Dependencies

| Endpoint | Purpose | Created In |
|----------|---------|------------|
| `/api/v1/public/branding/:tenant/css` | Tenant CSS custom properties | 08-01 |
| `/api/v1/public/branding/:tenant` | Tenant branding JSON | 08-01 |
| `/api/v1/public/ethics/:tenant/config` | Portal configuration | TBD (08-13+) |

## Next Phase Readiness

**Ready for:**
- 08-13: Report submission form routes (`/ethics/[tenant]/report`)
- 08-14: Status check routes (`/ethics/[tenant]/status`)
- 08-15: Resources section (`/ethics/[tenant]/resources`)
- Chat/chatbot integration when enabled

**Blockers:**
None - all infrastructure in place.

**Notes:**
- The `/api/v1/public/ethics/:tenant/config` endpoint needs to be implemented in backend (currently uses fallback config)
- SEO metadata generation requires server-side API calls (commented out in page.tsx)
