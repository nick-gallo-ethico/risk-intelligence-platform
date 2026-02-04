---
phase: 08-portals
plan: 05
subsystem: public-api
tags: [ethics-portal, public-api, anonymous-reporting, access-code, rate-limiting]
dependencies:
  requires: ["08-01"]
  provides: ["ethics-portal-api", "public-report-submission", "access-code-status"]
  affects: ["08-06", "08-07"]
tech-stack:
  added: []
  patterns: ["public-endpoint-controller", "access-code-auth", "cache-based-drafts"]
key-files:
  created:
    - apps/backend/src/modules/portals/ethics/ethics-portal.service.ts
    - apps/backend/src/modules/portals/ethics/ethics-portal.controller.ts
    - apps/backend/src/modules/portals/ethics/ethics-portal.module.ts
    - apps/backend/src/modules/portals/ethics/dto/submit-report.dto.ts
    - apps/backend/src/modules/portals/ethics/types/ethics-portal.types.ts
    - apps/backend/src/modules/portals/ethics/dto/index.ts
    - apps/backend/src/modules/portals/ethics/types/index.ts
    - apps/backend/src/modules/portals/ethics/index.ts
  modified:
    - apps/backend/src/modules/portals/portals.module.ts
decisions:
  - id: "08-05-01"
    title: "Cache-based draft and temp attachment storage"
    choice: "Use CacheModule for drafts and temp attachments instead of database tables"
    rationale: "Avoids schema migration; Redis-backed cache provides cross-server support in production"
  - id: "08-05-02"
    title: "System user for public submissions"
    choice: "Create/find system@ethico.com user per org for RIU createdById"
    rationale: "Maintains audit trail and FK integrity for anonymous submissions"
  - id: "08-05-03"
    title: "Category form schema via moduleConfig"
    choice: "Store formSchemaId in category.moduleConfig JSON field"
    rationale: "Avoids schema change; leverages existing flexible config pattern"
  - id: "08-05-04"
    title: "Access code endpoints separate controller"
    choice: "EthicsAccessController at /public/access/:code distinct from EthicsPortalController"
    rationale: "Clear separation between tenant-scoped and access-code-scoped operations"
metrics:
  duration: "14 min"
  completed: "2026-02-04"
---

# Phase 8 Plan 05: Ethics Portal API Summary

Public Ethics Portal API for anonymous report submission and access code operations.

## One-Liner

EthicsPortalService and controllers providing 10 public endpoints for report submission, category/form retrieval, draft persistence, and access-code-based status/messaging.

## What Was Built

### EthicsPortalService

Core service with methods:
- `submitReport()` - Create RIU with access code via RiusService
- `getCategoriesForTenant()` - Build hierarchical category tree
- `getFormSchema()` - Retrieve JSON Schema for category-specific forms
- `uploadAttachment()` - Cache-based temporary attachment storage
- `getTenantConfig()` - Cached portal configuration (5-min TTL)
- `saveDraft()` / `getDraft()` - Cache-based draft persistence (24-hr TTL)
- `getReportStatus()` - Delegate to RiuAccessService
- `getMessages()` / `sendMessage()` - Delegate to MessageRelayService

### EthicsPortalController

Tenant-scoped endpoints at `/api/v1/public/ethics/:tenantSlug`:
| Endpoint | Rate Limit | Purpose |
|----------|-----------|---------|
| GET /config | 30/min | Portal configuration |
| GET /categories | 30/min | Category tree |
| GET /categories/:id/form | 30/min | Form JSON Schema |
| POST /reports | 5/min | Submit report |
| POST /attachments | 10/min | Upload file (25MB max) |
| POST /draft | 10/min | Save draft |
| GET /draft/:draftCode | 10/min | Resume draft |

### EthicsAccessController

Access-code-scoped endpoints at `/api/v1/public/access/:code`:
| Endpoint | Rate Limit | Purpose |
|----------|-----------|---------|
| GET /status | 10/min | Report status |
| GET /messages | 10/min | Get messages |
| POST /messages | 5/min | Send message |

### EthicsPortalModule

Imports:
- PrismaModule
- CacheModule (5-min default TTL)
- MulterModule (25MB, 10 files max)
- RiusModule
- FormsModule
- BrandingModule
- MessagingModule

## Key Integrations

```
EthicsPortalService
    |
    |-- RiusService.create() --> Creates RIU
    |-- RiuAccessService.generateAccessCode() --> 12-char access code
    |-- RiuAccessService.checkStatus() --> Status lookup
    |-- FormSchemaService.findById() --> Category forms
    |-- BrandingService.getBrandingByOrgId() --> Portal branding
    |-- MessageRelayService.receiveFromReporter() --> Anonymous messaging
    |-- MessageRelayService.getMessagesForReporter() --> Message retrieval
```

## Decisions Made

1. **Cache-based storage** - Drafts and temp attachments use CacheModule (Redis in production) instead of database tables. Avoids schema migration, provides automatic expiration.

2. **System user pattern** - Public submissions use a per-org `system@ethico.com` user for `createdById`. This maintains audit trail and FK integrity while indicating system-initiated actions.

3. **Form schema in moduleConfig** - Category-specific form schemas referenced via `category.moduleConfig.formSchemaId` rather than a dedicated FK. Leverages existing flexible JSON config pattern.

4. **Separate access controller** - Access code operations in distinct controller (`EthicsAccessController`) at different route prefix for clear separation from tenant-scoped operations.

## Deviations from Plan

None - plan executed exactly as written.

## Test Verification

TypeScript compilation passes for all ethics portal files:
```bash
npx tsc --noEmit --project apps/backend/tsconfig.build.json 2>&1 | grep -c "ethics"
# Output: 0 (no errors)
```

## Files Changed

| File | Change |
|------|--------|
| ethics-portal.service.ts | NEW - Core service with all business logic |
| ethics-portal.controller.ts | NEW - 10 public endpoints across 2 controllers |
| ethics-portal.module.ts | NEW - Module with dependency imports |
| submit-report.dto.ts | NEW - DTOs for submission, draft, messaging |
| ethics-portal.types.ts | NEW - Types for results, config, messages |
| dto/index.ts | NEW - Barrel export |
| types/index.ts | NEW - Barrel export |
| index.ts | NEW - Module barrel export |
| portals.module.ts | MODIFIED - Added EthicsPortalModule import/export |

## Commits

| Hash | Description |
|------|-------------|
| 6e3e970 | feat(08-05): add EthicsPortalService for public report submission |
| 9993e31 | feat(08-05): add EthicsPortalController with public endpoints |
| a21bed7 | feat(08-05): add EthicsPortalModule and register in PortalsModule |

## Next Phase Readiness

Ready for:
- **08-06**: Manager Portal proxy reporting can use similar submission patterns
- **08-07**: Portal frontend can consume these endpoints

No blockers identified.
