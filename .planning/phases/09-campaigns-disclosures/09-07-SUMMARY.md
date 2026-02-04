---
phase: 09-campaigns-disclosures
plan: 07
status: complete
started: 2026-02-04T07:08:50Z
completed: 2026-02-04T07:20:23Z
duration: 12 min
---

# Phase 9 Plan 07: Campaign Targeting Summary

**One-liner:** Mom-test friendly segment builder with simple (checkboxes) and advanced (tenure, hierarchy) targeting modes, plus natural language descriptions.

## What Was Built

### 1. Targeting Criteria DTOs (`campaign-targeting.dto.ts`)

Three targeting modes per RS.50 specification:

**ALL mode:**
- Targets all active employees (simplest case)

**SIMPLE mode (Mom-test friendly):**
- `SimpleTargetingDto`: checkbox-based selection
  - `departments: string[]` - department IDs
  - `locations: string[]` - location IDs
  - `businessUnits: string[]` - business unit IDs
  - `divisions: string[]` - division IDs
  - `includeSubordinates: boolean` - expands to org hierarchy

**ADVANCED mode (Power user):**
- `AdvancedTargetingDto`: rule-based targeting
  - `jobTitles: string[]` - case-insensitive contains
  - `managerHierarchyDepth: number` - managers with N+ reports
  - `tenureMinDays/tenureMaxDays: number` - hire date filtering
  - `complianceRoles: string[]` - CCO, Investigator, etc.
  - `jobLevels: string[]` - IC, Manager, Director, VP, C_LEVEL
  - `primaryLanguages: string[]` - ISO 639-1 codes
  - `workModes: string[]` - REMOTE, HYBRID, ONSITE
  - `previousCampaignResponses: {campaignId, status}[]` - historical
  - `exclusions: string[]` - explicit employee ID exclusions
  - `customAttributes: Record<string, unknown>` - HRIS custom fields

**Supporting DTOs:**
- `AudiencePreviewDto`: count + paginated employee list + description
- `TargetingAttributeDto`: available HRIS attributes for UI
- `TargetingValidationResultDto`: errors, warnings, estimated count

### 2. CampaignTargetingService

**Core Methods:**

| Method | Purpose |
|--------|---------|
| `previewAudience()` | Count + paginated employees matching criteria |
| `buildCriteriaDescription()` | Human-readable summary of targeting rules |
| `getTargetEmployeeIds()` | Full employee ID list for campaign launch |
| `validateCriteria()` | Validates references exist, warns on 0 matches |
| `getAvailableAttributes()` | HRIS attributes for UI population |

**Key Features:**
- Recursive org hierarchy walk for `includeSubordinates` (max 10 levels)
- Natural language descriptions: "Finance department, US locations only, 90+ days tenure"
- Interop with existing `SegmentQueryBuilder` via `convertToSegmentCriteria()`
- Validates that referenced departments/locations/etc. exist
- Warning when criteria matches 0 employees

## Verification Results

| Check | Result |
|-------|--------|
| TypeScript compiles | PASS |
| Simple mode works | PASS (department + location IN clauses) |
| Advanced mode works | PASS (tenure date math, job title contains) |
| Preview returns count + sample | PASS (paginated with totalCount) |
| Description is human-readable | PASS (natural language summaries) |

## Files Changed

| File | Change |
|------|--------|
| `apps/backend/src/modules/campaigns/dto/campaign-targeting.dto.ts` | NEW - Targeting DTOs |
| `apps/backend/src/modules/campaigns/dto/index.ts` | Added export |
| `apps/backend/src/modules/campaigns/campaign-targeting.service.ts` | NEW - Service implementation |
| `apps/backend/src/modules/campaigns/campaigns.module.ts` | Added service to providers/exports |
| `apps/backend/src/modules/campaigns/index.ts` | Added service export |

## Commits

| Hash | Description |
|------|-------------|
| `86d05c9` | feat(09-07): add campaign targeting DTOs with simple/advanced modes |
| `ea23ee0` | feat(09-07): add CampaignTargetingService with mom-test friendly segment builder |

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Max 10 levels for hierarchy walk | Prevents infinite loops, matches existing pattern (04-02) |
| Recursive subordinate expansion | Required for `includeSubordinates` to work properly |
| Validate references before count | Better UX to catch invalid IDs early |
| Warning (not error) for 0 matches | Allow empty previews for "what if" exploration |

## Technical Notes

1. **Type Casting for AssignmentStatus**: Campaign assignment status filter required cast to `AssignmentStatus` enum for Prisma type compatibility.

2. **Job Title Matching**: Uses case-insensitive `contains` for flexibility (e.g., "Manager" matches "Product Manager", "Engineering Manager").

3. **Tenure Calculation**: Computed from current date minus tenure days, converted to `hireDate` filter (`lte` for min tenure, `gte` for max tenure).

4. **Manager Detection**: Finds managers by checking which employee IDs appear in `managerId` field of other employees.

## Next Phase Readiness

This service provides the targeting foundation for:
- **09-08**: Campaign creation with audience targeting
- **09-09**: Campaign launch with employee notification
- **09-10**: Response collection and auto-case creation

No blockers identified.
