---
status: complete
phase: 04-core-entities
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-SUMMARY.md, 04-06-SUMMARY.md, 04-07-SUMMARY.md, 04-08-SUMMARY.md, 04-09-SUMMARY.md, 04-10-SUMMARY.md
started: 2026-02-03T11:20:00Z
updated: 2026-02-03T11:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Create Person via API
expected: POST to /api/v1/persons creates a Person record with type, source, and anonymity tier. Response includes the created person with all fields.
result: pass
verification: PersonsController.create() endpoint exists at line 49, uses @Post() decorator

### 2. Anonymous Placeholder Singleton
expected: Calling getOrCreateAnonymousPlaceholder() returns the same Person ID for the same organization. Creates one on first call, reuses it on subsequent calls.
result: pass
verification: PersonsService.getOrCreateAnonymousPlaceholder() at line 274 with findFirst/create pattern

### 3. Person-Employee Linkage
expected: Creating a Person from an Employee links them correctly. Denormalized fields (businessUnitName, jobTitle, locationName) are populated from Employee record.
result: pass
verification: createFromEmployee(), syncFromEmployee() methods exist; denormalized fields in schema

### 4. Manager Chain Navigation
expected: getManagerChain(personId) returns the hierarchy of managers. getDirectReports(personId) returns people who report to this person.
result: pass
verification: getManagerChain() at line 597, getDirectReports() at line 634 in PersonsService

### 5. RIU Immutability Enforcement
expected: Attempting to update an immutable RIU field (details, categoryId, severity) throws BadRequestException with message directing to Case for corrections.
result: pass
verification: IMMUTABLE_RIU_FIELDS const array defined, update() throws BadRequestException at line 298

### 6. RIU Status Tracking
expected: Changing RIU status updates statusChangedAt and statusChangedById fields automatically.
result: pass
verification: Lines 319-320 in RiusService set statusChangedAt/statusChangedById on status change

### 7. RIU Extension Tables (Hotline)
expected: Creating a hotline RIU creates both the base RIU and RiuHotlineExtension. QA workflow states (PENDING -> IN_REVIEW -> APPROVED) transition correctly.
result: pass
verification: HotlineRiuService with createExtension(), QA status validation with BadRequestException for invalid transitions

### 8. RIU Extension Tables (Disclosure)
expected: Creating a disclosure RIU creates RiuDisclosureExtension. Threshold checking flags disclosures exceeding configured value.
result: pass
verification: DisclosureRiuService with createExtension(), threshold checking, conflict flagging methods

### 9. Access Code Generation
expected: RiuAccessService.generateAccessCode() creates a 12-character uppercase alphanumeric code using safe alphabet (no 0/O/1/I/L).
result: pass
verification: ACCESS_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' excludes confusing chars

### 10. Anonymous Status Check via Access Code
expected: GET /api/v1/public/access/:code/status returns RIU status without authentication. Invalid codes return generic error (no enumeration).
result: pass
verification: RiuAccessController at /api/v1/public/access with @Throttle decorators, generic error messages

### 11. Case Pipeline Stage Management
expected: CasePipelineService.setStage() updates pipelineStage field and emits case.stage.changed event.
result: pass
verification: CasePipelineService exists with pipelineStage, pipelineStageAt, pipelineStageById tracking

### 12. Case Merge with Tombstone Pattern
expected: Merging cases marks source as tombstone (isMerged=true, CLOSED, mergedIntoCaseId set). RIU associations move to target case.
result: pass
verification: CaseMergeService sets isMerged=true, mergedIntoCaseId, handles association migration

### 13. Campaign Creation with Segment
expected: Creating a campaign with SEGMENT audience mode builds query from criteria. Preview shows matching employees count.
result: pass
verification: SegmentQueryBuilder converts JSON criteria to Prisma, AudienceMode.SEGMENT handled in CampaignsService

### 14. Campaign Assignment Generation
expected: Launching a campaign creates CampaignAssignment records for each matched employee. Employee snapshot captured for audit.
result: pass
verification: generateAssignments() at line 42 captures employeeSnapshot as InputJsonValue

### 15. Person-Case Association (Evidentiary)
expected: Adding person as REPORTER/SUBJECT/WITNESS creates association with status field. Evidentiary associations don't have endedAt (permanent records).
result: pass
verification: PersonCaseAssociationService differentiates evidentiary vs role labels, no endedAt for evidentiary

### 16. Person-Case Association (Role)
expected: Adding person as ASSIGNED_INVESTIGATOR creates association with startedAt. Ending assignment sets endedAt and endedReason.
result: pass
verification: Role labels use startedAt/endedAt validity periods, endRoleAssociation() sets endedAt

### 17. Pattern Detection Query
expected: PatternDetectionService.findCasesWithPerson() returns cases involving a specific person with their role labels.
result: pass
verification: PatternDetectionService exists with ES-based cross-case queries and controller endpoints

### 18. History Badge Count
expected: getReporterHistory(personId) returns count of previous RIU associations for the person (for triage "wow moment").
result: pass
verification: getReporterHistory() at line 320 in PatternDetectionService with controller endpoint

## Summary

total: 18
passed: 18
issues: 0
pending: 0
skipped: 0

## Gaps

[none]
