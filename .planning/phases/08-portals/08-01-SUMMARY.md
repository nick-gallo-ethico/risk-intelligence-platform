---
phase: 08-portals
plan: 01
subsystem: branding
tags: [white-label, css, theming, portal]
dependency-graph:
  requires: []
  provides: [BrandingService, BrandingController, TenantBranding]
  affects: [08-05, 08-08, 08-09]
tech-stack:
  added: []
  patterns: [css-custom-properties, cache-invalidation, upsert]
key-files:
  created:
    - apps/backend/src/modules/branding/branding.controller.ts
    - apps/backend/src/modules/branding/branding.module.ts
    - apps/backend/src/modules/branding/branding.service.ts
    - apps/backend/src/modules/branding/index.ts
    - apps/backend/src/modules/branding/dto/branding.dto.ts
    - apps/backend/src/modules/branding/dto/index.ts
    - apps/backend/src/modules/branding/types/branding.types.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/app.module.ts
decisions:
  - id: 08-01-01
    description: "Use const objects for BrandingMode and ThemeMode enums (not Prisma re-exports)"
  - id: 08-01-02
    description: "CSS custom properties use HSL format without hsl() wrapper for Tailwind compatibility"
  - id: 08-01-03
    description: "1-hour cache TTL with both branding config and CSS output caching"
  - id: 08-01-04
    description: "Public CSS endpoint at /api/v1/public/branding/:tenantSlug/css requires no auth"
  - id: 08-01-05
    description: "FULL_WHITE_LABEL mode requires colorPalette to be configured"
metrics:
  duration: "9 min"
  completed: "2026-02-04"
---

# Phase 08 Plan 01: White-Label Branding Service Summary

**One-liner:** BrandingModule with per-tenant CSS generation supporting TEMPLATE and FULL_WHITE_LABEL modes, 1-hour caching, and public/admin endpoints.

## Objective

Create the white-label branding service that stores per-tenant configuration and generates CSS custom properties for theme customization, enabling each tenant's Ethics Portal to have unique branding without code changes.

## What Was Built

### 1. TenantBranding Prisma Model (Task 1)

Added to `schema.prisma`:
- `BrandingMode` enum: TEMPLATE, FULL_WHITE_LABEL
- `ThemeMode` enum: LIGHT, DARK, SYSTEM
- `TenantBranding` model with:
  - Basic branding: logoUrl, primaryColor, theme
  - Full white-label: colorPalette (17-token JSON), typography (JSON)
  - Additional: customDomain, footerText, welcomeVideoUrl
  - Unique constraint on organizationId (one branding per tenant)
  - Unique constraint on customDomain (prevent domain conflicts)

### 2. BrandingService with CSS Generation (Task 2)

Core methods:
- `getBranding(tenantSlug)` - Lookup by slug with caching
- `getBrandingByOrgId(organizationId)` - Direct lookup with caching
- `getCss(tenantSlug)` - Returns CSS string with Cache-Control header
- `generateCss(branding)` - Converts branding config to CSS custom properties
- `update(organizationId, dto)` - Upsert with cache invalidation and event emission
- `previewCss(dto)` - Generate CSS without saving (live preview)
- `getDefaultBranding(organizationId)` - Returns Ethico defaults

CSS Generation Features:
- For TEMPLATE mode: Derives full palette from primaryColor
- For FULL_WHITE_LABEL mode: Uses complete 17-token colorPalette
- Includes typography variables (--font-family, --heading-font-family)
- Includes logo URL variable (--logo-url)

### 3. BrandingController with Public CSS Endpoint (Task 3)

Public endpoints (no auth):
- `GET /api/v1/public/branding/:tenantSlug/css` - Returns CSS with 1-hour cache

Admin endpoints (requires auth):
- `GET /api/v1/branding` - Get current org's branding config
- `PUT /api/v1/branding` - Update branding (SYSTEM_ADMIN/COMPLIANCE_OFFICER)
- `POST /api/v1/branding/preview-css` - Preview CSS without saving

## Technical Decisions

1. **HSL Color Format:** Colors stored as HSL values without `hsl()` wrapper (e.g., "221 83% 53%") for direct use in CSS custom properties and Tailwind compatibility.

2. **Caching Strategy:**
   - Branding config cached at `branding:${organizationId}`
   - CSS output cached at `branding:css:${organizationId}`
   - 1-hour TTL for both
   - Both caches invalidated on update

3. **CSS Variable Naming:** Uses shadcn/ui compatible variable names (--primary, --background, --card, etc.) for seamless integration with the design system.

4. **Event Emission:** `branding.updated` event emitted on changes for audit logging and potential cache invalidation in other services.

5. **Public Endpoint:** CSS endpoint is public (no auth) to allow browser/CDN caching and simple `<link>` tag inclusion.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| ab911f4 | feat | Add TenantBranding Prisma model |
| 7f9683f | feat | Add BrandingModule with controller and CSS generation |

## Deviations from Plan

**[Rule 3 - Blocking] Fixed Prisma type compatibility**
- **Found during:** Task 3 (build verification)
- **Issue:** Prisma generates strict enum types and requires `Prisma.JsonNull` for JSON null values
- **Fix:** Added imports for Prisma enums and used proper enum mapping in upsert create clause
- **Files modified:** branding.service.ts

## Files Created/Modified

### Created
- `apps/backend/src/modules/branding/branding.controller.ts` - Public and admin controllers
- `apps/backend/src/modules/branding/branding.module.ts` - Module with CacheModule
- `apps/backend/src/modules/branding/branding.service.ts` - Core service with CSS generation
- `apps/backend/src/modules/branding/index.ts` - Module exports
- `apps/backend/src/modules/branding/dto/branding.dto.ts` - DTOs with validation
- `apps/backend/src/modules/branding/dto/index.ts` - DTO exports
- `apps/backend/src/modules/branding/types/branding.types.ts` - Type definitions and constants

### Modified
- `apps/backend/prisma/schema.prisma` - Added TenantBranding model and enums
- `apps/backend/src/app.module.ts` - Registered BrandingModule

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /api/v1/public/branding/:tenantSlug/css | None | Get tenant CSS |
| GET | /api/v1/branding | JWT | Get branding config |
| PUT | /api/v1/branding | JWT + Role | Update branding |
| POST | /api/v1/branding/preview-css | JWT | Preview CSS |

## Next Phase Readiness

The BrandingModule is ready for integration with:
- **08-05 (Employee Portal):** Will consume CSS endpoint for theming
- **08-08/08-09 (Portal UI):** Will use branding config for logo, footer, etc.

No blockers or concerns for downstream phases.
