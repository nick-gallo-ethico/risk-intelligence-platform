---
# Frontmatter - Plan Execution Summary
phase: 06-case-management
plan: 04
subsystem: case-management
tags: [saved-views, filters, user-preferences, prisma, nestjs]

# Dependency graph
requires:
  - 01-foundation (PrismaModule, common guards/decorators)
  - 04-core-entities (Case, RIU, Investigation enums)
provides:
  - SavedView Prisma model with filter persistence
  - SavedViewsService for view CRUD with validation
  - SavedViewsController with REST endpoints
  - Filter validation against enum values
affects:
  - 06-05+ (UI modules can use saved views)
  - 07-analytics (usage tracking data available)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Filter validation against current enum values
    - Default view management (auto-deselect others)
    - Usage tracking (lastUsedAt, useCount)
    - View sharing (personal vs shared)

# File tracking
key-files:
  created:
    - apps/backend/prisma/schema.prisma (ViewEntityType enum, SavedView model)
    - apps/backend/src/modules/saved-views/dto/saved-view.dto.ts
    - apps/backend/src/modules/saved-views/saved-views.service.ts
    - apps/backend/src/modules/saved-views/saved-views.controller.ts
    - apps/backend/src/modules/saved-views/saved-views.module.ts
    - apps/backend/src/modules/saved-views/index.ts
  modified:
    - apps/backend/src/app.module.ts (added SavedViewsModule)

# Decisions made during execution
decisions:
  - key: saved-views-entity-types
    choice: "Six entity types: CASES, RIUS, INVESTIGATIONS, PERSONS, CAMPAIGNS, REMEDIATION_PLANS"
    rationale: "Covers all major list views in the platform"
  - key: filter-validation
    choice: "Validate enum values at create, update, and apply time"
    rationale: "Enums may change over time; graceful degradation on apply"
  - key: invalid-filter-response
    choice: "Return invalidFilters array instead of throwing errors on apply"
    rationale: "Views should still work even if some filter values become invalid"

# Metrics
metrics:
  duration: 30 min
  completed: 2026-02-03
---

# Phase 6 Plan 4: Saved Views Summary

**One-liner:** SavedView model with filter persistence, enum validation, usage tracking, and sharing support for filtered list views.

## What Was Built

### 1. Prisma Schema Additions

Added `ViewEntityType` enum with six entity types:
- CASES
- RIUS
- INVESTIGATIONS
- PERSONS
- CAMPAIGNS
- REMEDIATION_PLANS

Added `SavedView` model with:
- Filter configuration as JSON (flexible filter criteria)
- Sort preferences (sortBy, sortOrder)
- Column configuration as JSON (visibility, order, width)
- User preferences (isDefault, isPinned, displayOrder, color)
- Sharing support (isShared, sharedWithTeamId)
- Usage tracking (lastUsedAt, useCount)
- Unique constraint on (organizationId, createdById, entityType, name)

### 2. DTOs

- **FilterCriteria** interface: Common and entity-specific filter patterns
- **ColumnConfig** interface: Column visibility, order, width
- **CreateSavedViewDto**: Full view creation with filters and preferences
- **UpdateSavedViewDto**: Partial update support
- **SavedViewQueryDto**: List filtering (entityType, includeShared, pinnedOnly)
- **ApplyViewResponseDto**: Validated filters with invalid filter list

### 3. SavedViewsService

CRUD operations with:
- Filter validation against current enum values (CaseStatus, RiuStatus, InvestigationStatus, Severity, SlaStatus)
- Default view management (auto-deselect other defaults)
- Usage tracking on apply
- View duplication
- View reordering
- Graceful degradation (invalidFilters returned, not thrown)

### 4. SavedViewsController

REST endpoints at `/api/v1/saved-views`:
- `POST /` - Create view
- `GET /` - List views (with query filters)
- `GET /default/:entityType` - Get default view for entity type
- `GET /:id` - Get single view
- `PUT /:id` - Update view
- `DELETE /:id` - Delete view
- `POST /:id/apply` - Apply view (tracks usage, validates filters)
- `POST /:id/duplicate` - Duplicate view
- `PUT /reorder` - Reorder views

## Key Technical Decisions

### Filter Validation Strategy

Filter values are validated against current enum values at:
1. **Create time**: Invalid values throw BadRequestException
2. **Update time**: Invalid values throw BadRequestException
3. **Apply time**: Invalid values returned in `invalidFilters` array (graceful degradation)

This ensures views remain usable even if enum values change over time.

### Default View Management

When a user sets a view as default:
1. All other default views for that entity type are unset
2. Only the new view becomes the default
3. One default per (user, entityType) pair

### Sharing Model

Views can be:
- **Personal**: Only the creator can see/use
- **Shared**: All organization members can see/use
- **Team-shared** (future): sharedWithTeamId for team-specific sharing

## Deviations from Plan

### Fixed Pre-existing Schema Error

**[Rule 3 - Blocking]** Removed dangling `InvestigationTemplate` relation from Organization model that was blocking Prisma validation. The model didn't exist yet, causing schema validation errors.

## API Examples

### Create Saved View
```typescript
POST /api/v1/saved-views
{
  "name": "High Priority Cases",
  "entityType": "CASES",
  "filters": {
    "severity": ["HIGH"],
    "status": ["OPEN", "NEW"]
  },
  "sortBy": "createdAt",
  "sortOrder": "desc",
  "isDefault": true
}
```

### Apply View Response
```typescript
POST /api/v1/saved-views/:id/apply
// Response
{
  "filters": { "severity": ["HIGH"], "status": ["OPEN", "NEW"] },
  "sortBy": "createdAt",
  "sortOrder": "desc",
  "invalidFilters": [] // Any invalid filter keys listed here
}
```

## Commits

1. `9b64e1b` - feat(06-04): add SavedView model to Prisma schema
2. `756760a` - feat(06-04): create SavedViews DTOs and Service
3. `f09709c` - feat(06-04): create SavedViews Controller and Module

## Testing Notes

- SavedViewsService handles filter validation for Cases, RIUs, and Investigations
- Filter validation for PERSONS, CAMPAIGNS, REMEDIATION_PLANS is pass-through (no enum validation yet)
- Usage tracking increments on each applyView call
- Duplicate creates personal copy even from shared views

## Next Phase Readiness

**Ready for:** UI integration to display and manage saved views in list pages.

**Depends on:**
- Frontend list components for Cases, RIUs, Investigations
- UI for saved view picker dropdown
- UI for "Save current view" functionality
