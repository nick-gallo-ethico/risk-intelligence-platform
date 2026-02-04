---
status: complete
phase: 06-case-management
source: 06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md, 06-06-SUMMARY.md, 06-07-SUMMARY.md, 06-08-SUMMARY.md, 06-09-SUMMARY.md, 06-10-SUMMARY.md, 06-11-SUMMARY.md, 06-12-SUMMARY.md, 06-13-SUMMARY.md, 06-14-SUMMARY.md, 06-15-SUMMARY.md
started: 2026-02-03T00:00:00Z
updated: 2026-02-03T12:30:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Create Investigation Template
expected: Navigate to Investigation Templates. Create a new template with sections and checklist items. Save. Template appears in list.
result: pass

### 2. Investigation Template Versioning
expected: Edit an existing template that has been used. Click "Publish". A new version is created while in-flight investigations continue on the original version.
result: pass

### 3. Schedule an Investigation Interview
expected: On an Investigation, click to add an interview. Select interviewee type (Person, External, or Anonymous). Set scheduled date/time. Optional: select a template. Save. Interview appears in list with "SCHEDULED" status.
result: pass

### 4. Complete Interview Workflow
expected: Open a scheduled interview. Click "Start" to begin (status changes to IN_PROGRESS). Complete the interview and add notes/answers. Click "Complete" to finish. Status shows "COMPLETED".
result: pass

### 5. Create Remediation Plan on Case
expected: On a Case's Remediation tab, create a new remediation plan. Add steps with assignees, due dates, and dependencies. Save. Plan shows step count and completion progress.
result: pass

### 6. Complete Remediation Step
expected: View a remediation plan. Complete a step by clicking "Complete" and providing completion notes/evidence. Step status changes to COMPLETED. Progress percentage updates.
result: pass

### 7. Step Dependencies Block Completion
expected: Try to complete a remediation step that has an incomplete dependency (another step must be done first). The system blocks completion until dependencies are met.
result: pass

### 8. Create and Apply Saved View
expected: On the Cases list page, apply some filters (status, severity, etc.). Click "Save View". Name it. The view appears in saved views dropdown. Navigate away and return. Apply the saved view. Filters restore.
result: pass

### 9. Set Default View
expected: On the Cases list page, open saved views. Set one as default (via checkbox or menu). Close and reopen the page. The default view filters are automatically applied (or available to apply).
result: pass

### 10. Create Custom Property Definition
expected: Navigate to Custom Properties settings. Create a new property for Cases with data type (e.g., SELECT with options). Save. The property appears in the list.
result: pass

### 11. Use Custom Property on Entity
expected: Edit a Case. The custom property appears in the form with its configured input type. Enter a value and save. The value persists when reloading the case.
result: pass

### 12. Category-Template Mapping
expected: Navigate to Investigation Template settings. Map a template to a category with requirement level (Required/Recommended/Optional). When creating an investigation for that category, the template is suggested or auto-applied based on the mapping.
result: pass

### 13. Investigation Checklist Progress
expected: Apply a template to an investigation. View the checklist panel. Complete some items by checking them and adding notes. Progress bar updates. Section shows completion status (pending/in_progress/completed).
result: issue
reported: "Controller uses hardcoded organizationId='stub-org-id' instead of extracting from JWT auth context. Returns 'Investigation not found' error."
severity: major

### 14. Checklist Item Dependencies
expected: Try to complete a checklist item that depends on another uncompleted item. A lock icon appears and completion is blocked until the dependency is met.
result: issue
reported: "Cannot test - checklist controller authentication not fully implemented"
severity: major

### 15. Add Custom Checklist Item
expected: On an investigation checklist, click "Add Custom Item" within a section. Enter text and save. The custom item appears at the end of the section and can be completed like template items.
result: issue
reported: "Cannot test - checklist controller authentication not fully implemented"
severity: major

### 16. Skip Checklist Item with Reason
expected: Click skip on a non-required checklist item. A dialog prompts for a reason (N/A explanation). After providing a reason, the item shows as skipped. Progress recalculates excluding skipped items.
result: issue
reported: "Cannot test - checklist controller authentication not fully implemented"
severity: major

### 17. Anonymous Message from Investigator
expected: On a Case with an anonymous reporter, go to Messages tab. Compose a message. If PII is detected, a warning appears but sending is still allowed after acknowledgment. Message sends successfully.
result: pass

### 18. Reporter Receives Message (via Access Code)
expected: Using the anonymous access code at the public status check page, the reporter can see messages from the investigator. Outbound messages are marked as read when retrieved.
result: issue
reported: "Public reporter endpoint returns 500 error. Access code validation uses uppercase regex [A-Z0-9]{12,20} but seed data generates mixed-case codes like 'k3QQH5sUbHcg'"
severity: major

### 19. Reporter Sends Reply
expected: At the public status check page with access code, the reporter can compose and send a reply. The message appears in the investigator's Messages tab marked as new/unread.
result: issue
reported: "Cannot test - public endpoint access code validation fails"
severity: major

### 20. Unified Search Across Entities
expected: Use the global search (likely Cmd+K or search bar). Enter a search term. Results return from multiple entity types (Cases, RIUs, Investigations, Persons) grouped by type.
result: pass

### 21. Activity Timeline on Case
expected: On a Case detail page, view the Activity tab. A timeline shows recent activities including status changes, assignments, comments, and related investigation activities merged chronologically.
result: pass

### 22. Case Detail with Linked RIUs
expected: Open a Case detail page. The header shows reference number (copyable), status, severity, pipeline progress, and SLA. A sidebar shows linked RIUs with the PRIMARY RIU highlighted (blue border/star icon). Other RIUs appear under "Related Reports".
result: pass

### 23. Expand RIU Details Inline
expected: On a Case detail page, click to expand a linked RIU. The RIU summary and truncated details appear inline without navigating away.
result: skipped
reason: Cannot test full flow - frontend/backend port mismatch. Code verified correct structure exists.

### 24. Case Tabs Navigation
expected: On Case detail, tabs are visible (Overview, Investigations, Messages, Files, Activity, Remediation). Clicking each tab shows appropriate content. Tab state syncs to URL for shareable deep links.
result: skipped
reason: Cannot test full flow - frontend configured for port 3000, backend on 3001

### 25. Investigation Checklist UI
expected: Open an Investigation. The checklist panel shows sections with items. Each item shows required/evidence indicators. Overall and per-section progress bars display. Items can be completed with notes.
result: skipped
reason: Cannot test full flow - backend auth context issue

### 26. Select Investigation Template
expected: When creating or viewing an investigation without a template, a template selector shows templates grouped by tier (Official, Team, Personal). Selecting one applies it to the investigation.
result: pass

### 27. Keyboard Shortcut J/K Navigation
expected: On the Cases list page, press J and K keys. Focus moves down/up through the list items with a visible ring indicator. Pressing Enter opens the focused case.
result: skipped
reason: No cases in list to test navigation. Hook implementation verified in code.

### 28. Command Palette (Cmd+K)
expected: Press Cmd+K (Mac) or Ctrl+K (Windows). A command palette opens with fuzzy search. Type to filter commands. Recent items appear. Select an item to navigate.
result: pass

### 29. Shortcuts Help Dialog
expected: Press ? key (when not in a form field). A shortcuts help dialog appears showing categorized keyboard shortcuts with platform-appropriate key names (Cmd vs Ctrl).
result: issue
reported: "Pressing Shift+/ does not open help dialog. Shortcut definitions exist in code but UI component not wired up."
severity: minor

### 30. Tab Navigation with Number Keys
expected: On a Case or Investigation detail page, press number keys 1-6. The corresponding tab is selected (1=Overview, 2=Investigations, etc.).
result: skipped
reason: Cannot test - case detail page won't load without backend connection

## Summary

total: 30
passed: 17
issues: 7
pending: 0
skipped: 6

## Gaps

- truth: "Apply template to investigation and track checklist progress"
  status: failed
  reason: "User reported: Controller uses hardcoded organizationId='stub-org-id' instead of extracting from JWT auth context. Returns 'Investigation not found' error."
  severity: major
  test: 13
  root_cause: "Checklist controller at apps/backend/src/modules/investigations/checklists/checklist.controller.ts uses hardcoded stub values instead of @TenantId() decorator"
  artifacts:
    - path: "apps/backend/src/modules/investigations/checklists/checklist.controller.ts"
      issue: "organizationId and userId hardcoded as 'stub-org-id' and 'stub-user-id'"
  missing:
    - "Add @TenantId() and @CurrentUser() decorators to controller methods"
    - "Remove hardcoded stub values"

- truth: "Reporter can check status and retrieve messages via access code"
  status: failed
  reason: "User reported: Public reporter endpoint returns 500 error. Access code validation uses uppercase regex [A-Z0-9]{12,20} but seed data generates mixed-case codes like 'k3QQH5sUbHcg'"
  severity: major
  test: 18
  root_cause: "Access code regex mismatch between validation and generation"
  artifacts:
    - path: "apps/backend/src/modules/messaging/messaging.controller.ts"
      issue: "Access code regex pattern is uppercase-only"
  missing:
    - "Update regex to allow mixed case: [A-Za-z0-9]{12,20}"
    - "Or update seed data to generate uppercase-only codes"

- truth: "Shortcuts help dialog opens with ? key"
  status: failed
  reason: "User reported: Pressing Shift+/ does not open help dialog. Shortcut definitions exist in code but UI component not wired up."
  severity: minor
  test: 29
  root_cause: "ShortcutsHelpDialog component exists but shortcut binding not connected"
  artifacts:
    - path: "apps/frontend/src/components/common/shortcuts-help-dialog.tsx"
      issue: "Component exists but not triggered by keyboard shortcut"
  missing:
    - "Wire ? shortcut in ShortcutsProvider to open help dialog"

- truth: "Route prefixes should not be duplicated"
  status: failed
  reason: "All Phase 6 controllers have double api/v1/ prefix bug - routes at /api/v1/api/v1/..."
  severity: minor
  test: 0
  root_cause: "Controllers use @Controller('api/v1/...') but main.ts also sets global prefix"
  artifacts:
    - path: "apps/backend/src/modules/investigations/checklists/checklist.controller.ts"
      issue: "Double prefix"
    - path: "apps/backend/src/modules/remediation/remediation.controller.ts"
      issue: "Double prefix"
  missing:
    - "Remove api/v1 from controller decorators - global prefix handles it"

- truth: "Frontend should connect to correct backend port"
  status: failed
  reason: "Frontend configured for port 3000, backend running on port 3001"
  severity: minor
  test: 0
  root_cause: "Environment variable mismatch"
  artifacts:
    - path: "apps/frontend/.env"
      issue: "NEXT_PUBLIC_API_URL needs to be http://localhost:3001"
  missing:
    - "Set NEXT_PUBLIC_API_URL=http://localhost:3001"
