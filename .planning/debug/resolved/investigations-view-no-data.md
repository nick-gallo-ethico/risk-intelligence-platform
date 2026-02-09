---
status: resolved
trigger: "Investigate why the Investigations page shows view tabs but no investigation data loads."
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:00:00Z
---

## Current Focus

hypothesis: Frontend calls GET /investigations but backend only has GET /investigations/:id and GET /cases/:caseId/investigations
test: Comparing investigations controller routes with cases controller routes
expecting: Backend missing GET /investigations (list all) endpoint
next_action: Verify backend controller structure confirms missing endpoint

## Symptoms

expected: Investigations page should load a list of investigations in the data table
actual: View tabs show but no investigation data loads
errors: Likely 404 or route not found on GET /investigations
reproduction: Navigate to investigations page with saved views system
started: Current session (view system works for cases, not investigations)

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-02-08T00:00:00Z
  checked: apps/frontend/src/hooks/views/useInvestigationsView.ts
  found: Frontend makes GET request to "/investigations" with query params (line 156)
  implication: Frontend expects a list endpoint at GET /investigations

- timestamp: 2026-02-08T00:00:00Z
  checked: apps/frontend/src/hooks/views/useCasesView.ts
  found: Cases hook makes GET request to "/cases" with query params (line 157) - same pattern
  implication: Investigations should follow same pattern as cases

- timestamp: 2026-02-08T00:00:00Z
  checked: apps/backend/src/modules/cases/cases.controller.ts
  found: Cases controller has GET /cases endpoint at line 93 that returns paginated list
  implication: This is the working pattern that investigations should follow

- timestamp: 2026-02-08T00:00:00Z
  checked: apps/backend/src/modules/investigations/investigations.controller.ts
  found: InvestigationsController only has GET /investigations/:id (line 138), no list endpoint. CaseInvestigationsController has GET /cases/:caseId/investigations but that's nested under cases.
  implication: Missing GET /investigations endpoint that returns paginated list of all investigations

- timestamp: 2026-02-08T00:00:00Z
  checked: apps/backend/src/modules/investigations/investigations.service.ts
  found: Service has findAllForCase() (line 161) which queries investigations for a specific caseId, but no findAll() method to query all investigations for an organization
  implication: Service layer also missing the method to support the list endpoint

- timestamp: 2026-02-08T00:00:00Z
  checked: apps/backend/src/modules/cases/cases.service.ts
  found: CasesService has findAll() method (line 124) that queries all cases for organizationId with filters, search, sort, and pagination
  implication: This is the pattern InvestigationsService.findAll() should follow

## Resolution

root_cause: Backend InvestigationsController is missing a GET /investigations endpoint to return a paginated list of all investigations. The controller only has GET /investigations/:id (single investigation by ID) and the nested GET /cases/:caseId/investigations (investigations for a specific case). Frontend expects GET /investigations to return {data: Investigation[], total: number, limit: number, offset: number} but this route doesn't exist.

Additionally, InvestigationsService is missing the findAll() method. The service only has findAllForCase() which queries investigations for a specific case, not across all cases for the organization.

fix:
1. Add findAll() method to InvestigationsService that:
   - Accepts InvestigationQueryDto
   - Queries all investigations for organizationId (not scoped to caseId)
   - Supports filters, search, sort, pagination
   - Returns {data: Investigation[], total: number, limit: number, page: number}
   - Follows same pattern as CasesService.findAll() (lines 124-186)

2. Add GET /investigations endpoint to InvestigationsController that:
   - Accepts InvestigationQueryDto
   - Calls investigationsService.findAll(query, organizationId)
   - Returns {data: Investigation[], total: number, limit: number, offset: number}
   - Follows same pattern as CasesController.findAll() (lines 93-108)

verification:
files_changed: []
