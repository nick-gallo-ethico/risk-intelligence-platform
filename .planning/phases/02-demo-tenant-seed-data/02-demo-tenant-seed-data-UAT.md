---
status: complete
phase: 02-demo-tenant-seed-data
source:
  - 02-01-SUMMARY.md
  - 02-02-SUMMARY.md
  - 02-03-SUMMARY.md
  - 02-04-SUMMARY.md
  - 02-05-SUMMARY.md
  - 02-06-SUMMARY.md
  - 02-07-SUMMARY.md
started: 2026-02-03T08:45:00Z
updated: 2026-02-03T09:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Run Database Seed Command
expected: Running `npm run db:seed` in the backend directory executes the seeder orchestrator. CLI shows progress and completes without errors. Final output displays demo metrics summary.
result: pass

### 2. Demo Tenant "Acme Co." Exists
expected: Querying the database shows "Acme Co." organization exists with proper configuration.
result: pass

### 3. Category Taxonomy Seeded (32 Categories)
expected: Database contains 32 categories: 7 parent categories (Harassment, Fraud, COI, Safety, Data, Policy, RFI) with child categories under each. Each has severity and SLA days configured.
result: pass

### 4. Locations Seeded (52 Global Locations)
expected: Database contains 52 locations across 3 regions: 25 US, 15 EMEA, 12 APAC. Each has proper timezone and city data.
result: pass

### 5. Organization Hierarchy (4-Level Structure)
expected: Database contains 4 Divisions, ~10 Business Units, ~25 Departments, and ~60 Teams with proper parent-child relationships.
result: pass

### 6. Employees Seeded (~20,000)
expected: Database contains approximately 20,000 employee records with manager hierarchy. Named executive personas exist (Bob Chen CEO, Maggie Thompson CCO, etc.).
result: pass

### 7. Demo Users Created (9 Accounts)
expected: 9 demo users exist with different roles: demo-admin@acme.local (SYSTEM_ADMIN), demo-cco@acme.local (COMPLIANCE_OFFICER), demo-triage@acme.local (TRIAGE_LEAD), demo-investigator@acme.local (INVESTIGATOR), demo-policy@acme.local (POLICY_AUTHOR), etc.
result: pass

### 8. RIUs Seeded (~5,000)
expected: Database contains approximately 5,000 RIU records with proper type distribution (55% hotline, 25% web form, etc.) and reference number format (RIU-YYYY-NNNNN).
result: pass

### 9. Cases Seeded (~4,500)
expected: Database contains approximately 4,500 Case records. 10% open (NEW/OPEN status), 90% closed. Cases are linked to RIUs via RiuCaseAssociation.
result: pass

### 10. Investigations Seeded (~5,000)
expected: Database contains approximately 5,000 Investigation records with ~60% substantiation rate. Each has outcome, findings, and timeline data.
result: pass

### 11. Flagship Cases Present (10)
expected: 10 named flagship cases exist for demo walkthroughs: "The Chicago Warehouse Incident", "Q3 Financial Irregularities", "Executive Expense Report", etc. Each has rich narrative and AI summary.
result: pass

### 12. Demo User Login Works
expected: Can log in as demo-cco@acme.local with password "Password123!" and access the system with COMPLIANCE_OFFICER permissions.
result: pass

### 13. Prospect Provisioning API Works
expected: POST to /api/v1/demo/prospects creates a new time-limited prospect account. Response includes prospect user details and expiry date (14 days default).
result: pass

### 14. Demo Reset Preview Shows User Changes
expected: GET /api/v1/demo/reset/preview returns summary of what would be deleted (user-created cases, RIUs, investigations) while preserving base data.
result: pass

### 15. Demo Reset Requires Confirmation
expected: POST /api/v1/demo/reset without confirmationToken="CONFIRM_RESET" is rejected. Reset only succeeds with proper confirmation.
result: pass

### 16. Deterministic Seed Produces Same Data
expected: Running seed command twice produces identical data (same UUIDs, same content) due to master seed value 20260202.
result: pass

## Summary

total: 16
passed: 16
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
