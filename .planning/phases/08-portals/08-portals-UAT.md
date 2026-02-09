---
status: complete
phase: 08-portals
source: 08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md, 08-04-SUMMARY.md, 08-05-SUMMARY.md, 08-06-SUMMARY.md, 08-07-SUMMARY.md, 08-08-SUMMARY.md, 08-09-SUMMARY.md, 08-10-SUMMARY.md, 08-11-SUMMARY.md, 08-12-SUMMARY.md, 08-13-SUMMARY.md, 08-14-SUMMARY.md, 08-15-SUMMARY.md, 08-16-SUMMARY.md
started: 2026-02-04T08:00:00Z
updated: 2026-02-04T11:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Public CSS Endpoint
expected: Navigate to /api/v1/public/branding/{tenantSlug}/css returns CSS custom properties for theming
result: pass

### 2. Directives by Stage
expected: GET /api/v1/operator/clients/:clientId/directives/call returns directives grouped by stage (opening, intake, categorySpecific, closing)
result: pass

### 3. Phone Number Lookup
expected: GET /api/v1/operator/lookup/phone/:phoneNumber returns client profile including organization, categories, and QA config
result: pass

### 4. Employee Tasks Aggregation
expected: GET /api/v1/employee/tasks returns unified task list from campaign assignments and remediation steps
result: pass

### 5. Ethics Portal Public Report Submission
expected: POST /api/v1/public/ethics/:tenantSlug/reports creates RIU and returns access code (12 chars) without authentication
result: pass

### 6. Access Code Status Check
expected: GET /api/v1/public/access/:code/status returns report status (RECEIVED, UNDER_REVIEW, etc.) and reference number
result: pass

### 7. Employee History Views
expected: GET /api/v1/employee/reports returns employee's submitted RIUs with linked case status
result: pass

### 8. Manager Proxy Authorization
expected: POST /api/v1/employee/proxy-report validates manager-employee relationship before creating RIU
result: pass

### 9. Hotline RIU Creation
expected: POST /api/v1/operator/intake creates HOTLINE_REPORT RIU with call metadata and HotlineRiuExtension
result: pass

### 10. QA Queue Listing
expected: GET /api/v1/operator/qa-queue returns pending items sorted by severity (HIGH first), then createdAt
result: pass

### 11. QA Claim and Release
expected: POST /api/v1/operator/qa-queue/:riuId/claim then /release changes qaStatus from PENDING to IN_REVIEW to APPROVED
result: pass

### 12. Ethics Portal Home Page
expected: Navigate to /ethics/{tenant} shows branded home page with logo, welcome message, and quick actions grid
result: pass

### 13. Ethics Portal Language Switcher
expected: Language switcher in header allows changing to supported languages (ES, FR, DE, etc.) and UI translates
result: pass

### 14. Report Form Multi-Step
expected: /ethics/{tenant}/report shows 4-step form (Category, Details, Attachments, Review) with progress indicator
result: pass

### 15. Access Code Input
expected: /ethics/{tenant}/status shows 3-segment (4 chars each) access code input with auto-advance on fill
result: pass

### 16. Message Thread Display
expected: /ethics/{tenant}/status/:code shows chronological message thread with inbound (left) and outbound (right) messages
result: pass

### 17. Employee Dashboard Stats
expected: /employee shows stats cards (Pending Tasks, Overdue, Due This Week, Compliance Score) for logged-in employee
result: pass

### 18. Manager My Team Tab
expected: /employee?tab=team shows team compliance overview with members, scores, and "Remind All" action (managers only)
result: pass

### 19. Proxy Report Form
expected: /employee/proxy-report shows team member selector, reason selector, and report form (manager access only)
result: pass

### 20. Operator Console Layout
expected: /operator shows split-screen layout with call controls, phone lookup, and context tabs (Script, HRIS, History)
result: pass

### 21. Intake Form RIU Types
expected: Intake form shows three RIU type buttons (REPORT, REQUEST_FOR_INFO, WRONG_NUMBER) with distinct flows
result: pass

### 22. AI Note Cleanup
expected: "Clean Up Notes" button below notes area shows before/after comparison with Apply/Keep Original actions
result: pass

### 23. QA Queue Page
expected: /operator/qa-queue shows split-view (40% list, 60% detail) with filters and claim/release/reject actions
result: pass

### 24. QA Edit Form
expected: QA edit form allows changing summary, category, severity with required edit notes when changes made
result: pass

## Summary

total: 24
passed: 24
issues: 0
pending: 0
skipped: 0

## Gaps

[none]

## Fixes Applied

### Doubled API Path Prefix Bug (FIXED)
Six controllers incorrectly included `api/v1` in their `@Controller()` decorator, causing routes to be doubled when combined with the global prefix.

**Fixed Controllers:**
- `EmployeePortalController` - Changed from `@Controller('api/v1/employee')` to `@Controller('employee')`
- `IntakeController` - Changed from `@Controller('api/v1/operator')` to `@Controller('operator')`
- `QaQueueController` - Changed from `@Controller('api/v1/operator/qa-queue')` to `@Controller('operator/qa-queue')`
- `DirectivesController` - Changed from `@Controller('api/v1/operator/clients/:clientId/directives')` to `@Controller('operator/clients/:clientId/directives')`
- `ClientLookupController` - Changed from `@Controller('api/v1/operator')` to `@Controller('operator')`
- `ClientAdminController` - Changed from `@Controller('api/v1/admin/clients/:clientId')` to `@Controller('admin/clients/:clientId')`

**Root Cause:** NestJS `app.setGlobalPrefix('api/v1')` in main.ts already provides the prefix. Controllers should only specify their path segment after the global prefix.
