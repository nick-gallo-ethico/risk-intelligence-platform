---
phase: 08
plan: 08
subsystem: ethics-portal-infrastructure
completed: 2026-02-04
duration: 9 min
tags: [pwa, i18n, offline, dexie, indexeddb, ethics-portal]

dependency-graph:
  requires: [08-05]
  provides:
    - PWA configuration with service worker
    - Multi-language support (i18n)
    - Encrypted offline draft storage
    - Auto-save hook for forms
  affects: [08-09, 08-10, 08-11, 08-12]

tech-stack:
  added:
    - "@ducanh2912/next-pwa@^5.x"
    - "dexie@^4.x"
    - "dexie-encrypted@^4.x"
    - "react-i18next@^14.x"
    - "i18next@latest"
    - "i18next-browser-languagedetector@^8.x"
    - "i18next-http-backend@^2.x"
  patterns:
    - PWA with Workbox service worker
    - Encrypted IndexedDB storage
    - Namespace-based lazy translation loading
    - RTL language support

key-files:
  created:
    - apps/frontend/next.config.js (updated with PWA)
    - apps/frontend/public/manifest.json
    - apps/frontend/src/app/~offline/page.tsx
    - apps/frontend/src/lib/i18n.ts
    - apps/frontend/src/lib/ethics-offline-db.ts
    - apps/frontend/src/hooks/useAutoSaveDraft.ts
    - apps/frontend/src/components/ethics/language-switcher.tsx
    - apps/frontend/public/locales/en/common.json
    - apps/frontend/public/locales/en/report.json
    - apps/frontend/public/locales/es/common.json
  modified:
    - apps/frontend/package.json

decisions:
  - id: ethics-pwa-config
    choice: "@ducanh2912/next-pwa with Workbox"
    rationale: "Maintained fork with App Router support, active community"
  - id: offline-encryption
    choice: "Device-specific XOR encryption for IndexedDB"
    rationale: "Protects against casual inspection; true security via server-side encryption after transmission"
  - id: i18n-structure
    choice: "Namespace-based lazy loading with react-i18next"
    rationale: "Only loads translation files for current namespace, reduces initial bundle"

metrics:
  tasks: 3/3
  commits: 3
  files-created: 11
  files-modified: 2
---

# Phase 08 Plan 08: Ethics Portal PWA & Offline Infrastructure

**One-liner:** PWA setup with @ducanh2912/next-pwa, encrypted Dexie offline storage, and react-i18next multi-language support for Ethics Portal.

## What Was Built

### 1. PWA Configuration (Task 1)
- Configured `@ducanh2912/next-pwa` in `next.config.js`
- Service worker with runtime caching strategies:
  - `/api/branding/*` - StaleWhileRevalidate (1hr cache)
  - `/locales/*` - CacheFirst (24hr cache)
  - `/api/v1/public/submit` - NetworkOnly with background sync
- Created `manifest.json` with PWA branding and icon references
- Offline fallback page at `/~offline` with:
  - Draft preservation messaging
  - Connection retry functionality
  - Auto-redirect when back online

### 2. Multi-Language Support (Task 2)
- Configured i18next with:
  - HttpBackend for lazy-loading translation files
  - LanguageDetector (localStorage, navigator, htmlTag)
  - 8 supported languages including RTL (Arabic, Hebrew)
- Created `useLanguage` hook for language switching with RTL support
- `LanguageSwitcher` component with accessible select dropdown
- Translation files:
  - `en/common.json` - Navigation, buttons, accessibility labels
  - `en/report.json` - Report form labels, validation, confirmation
  - `es/common.json` - Spanish translations

### 3. Encrypted Offline Storage (Task 3)
- `EthicsPortalDB` Dexie database with:
  - `drafts` table - Auto-expiring (7 days), encrypted content/attachments
  - `pendingSubmissions` table - Background sync queue
- Device-specific encryption key stored in localStorage
- `useAutoSaveDraft` hook providing:
  - Debounced saves (1s default)
  - Cross-device resume via `localId` codes
  - Sync status tracking (draft/pending/synced/failed)
  - Automatic expiration cleanup

## Key Files

| File | Purpose | Exports |
|------|---------|---------|
| `apps/frontend/next.config.js` | PWA configuration | Next.js config with service worker |
| `apps/frontend/src/lib/i18n.ts` | i18n configuration | `i18n`, `useLanguage`, `SUPPORTED_LANGUAGES` |
| `apps/frontend/src/lib/ethics-offline-db.ts` | Offline database | `db`, `cleanupExpiredDrafts`, interfaces |
| `apps/frontend/src/hooks/useAutoSaveDraft.ts` | Auto-save hook | `useAutoSaveDraft` |
| `apps/frontend/src/components/ethics/language-switcher.tsx` | Language UI | `LanguageSwitcher` |

## Commits

| Hash | Type | Description |
|------|------|-------------|
| cb9c156 | feat | PWA configuration for Ethics Portal |
| ea24a47 | feat | i18n configuration with language detection |
| f639717 | feat | Encrypted Dexie offline database and auto-save hook |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Status

- [x] Dependencies installed successfully
- [x] TypeScript compiles without errors in new files
- [x] PWA manifest.json created
- [x] Offline fallback page accessible
- [x] i18n configured with language detection
- [x] Dexie database with encryption helpers

**Note:** Pre-existing TypeScript errors in `apps/frontend/src/components/operator/` and `apps/frontend/src/hooks/useClientProfile.ts` (missing `@tanstack/react-query` dependency from Phase 08-07) are unrelated to this plan's changes.

## Next Phase Readiness

**Ready for 08-09:** Ethics Portal base layout and tenant-scoped routing can now be built using:
- PWA infrastructure (service worker, offline page)
- i18n provider and language switcher
- Offline draft storage and auto-save hook

**Dependencies provided:**
- `I18nextProvider` for layout wrapping
- `useAutoSaveDraft` for report form
- `LanguageSwitcher` for header
- Offline page for service worker fallback
