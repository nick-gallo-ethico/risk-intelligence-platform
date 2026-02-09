---
status: resolved
trigger: "Investigate why clicking Excel/CSV export options doesn't download any file."
created: 2026-02-08T00:00:00Z
updated: 2026-02-08T00:05:00Z
---

## Current Focus

hypothesis: Export button click handler may be missing or not properly connected to backend API
test: Examine ViewToolbar, ExportButton components and trace export flow
expecting: Find missing API call, broken handler, or frontend-backend disconnection
next_action: Read ViewToolbar.tsx and locate export button implementation

## Symptoms

expected: Clicking Excel or CSV export option should trigger file download
actual: Clicking export options doesn't download any file
errors: [to be gathered]
reproduction: Click Excel or CSV export button in any view
started: Unknown - appears to be non-functional

## Eliminated

## Evidence

- timestamp: 2026-02-08T00:01:00Z
  checked: apps/frontend/src/components/views/ExportButton.tsx
  found: ExportButton component properly implements handleExport function that calls config.endpoints.export with POST request
  implication: Frontend export code is correct

- timestamp: 2026-02-08T00:02:00Z
  checked: apps/frontend/src/lib/views/configs/cases.config.ts
  found: Config defines export endpoint as "/cases/export" at line 56
  implication: Frontend expects POST /cases/export endpoint to exist

- timestamp: 2026-02-08T00:03:00Z
  checked: apps/backend/src/modules/cases/cases.controller.ts
  found: Controller has NO /export endpoint defined - only standard CRUD endpoints
  implication: Backend is missing the export endpoint entirely

## Resolution

root_cause: Backend is missing POST /{entity}/export endpoints for all modules with saved views (cases, policies, disclosures, investigations, intake-forms). Frontend ExportButton.tsx (line 30) calls config.endpoints.export but gets 404 because controllers don't have these endpoints.

fix: Add export endpoints to each controller that:
1. Accept ExportDto with format (xlsx/csv), filters, sortBy, sortOrder, columns
2. Query data using existing findAll service methods with filters
3. Use ExcelExportService.generateBuffer() for Excel or simple CSV generation
4. Return blob with proper content-type header
5. Follow pattern: @Post('export') with @Res() decorator for streaming response

verification: Click Excel/CSV export buttons in cases, policies, disclosures, investigations, intake-forms views and verify files download correctly
files_changed:
  - apps/backend/src/modules/cases/cases.controller.ts (add export endpoint)
  - apps/backend/src/modules/policies/policies.controller.ts (add export endpoint)
  - apps/backend/src/modules/disclosures/disclosure-form.controller.ts (add export endpoint)
  - apps/backend/src/modules/investigations/investigations.controller.ts (add export endpoint)
  - apps/backend/src/modules/forms/forms.controller.ts (add export endpoint for intake-forms)
  - Create apps/backend/src/common/dto/export.dto.ts (shared DTO)
  - Update each module to inject ExcelExportService
