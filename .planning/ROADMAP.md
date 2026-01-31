# Roadmap: Ethico Risk Intelligence Platform v1.0

**Created:** 2026-01-31
**Project:** Ethico Risk Intelligence Platform
**Source:** PRDs in `02-MODULES/`, Audit in `.planning/v1.0-TIER1-AUDIT.md`

---

## Overview

| Metric | Value |
|--------|-------|
| Total Phases | 7 |
| Total Requirements | 73 |
| Estimated Complexity | High |
| Foundation Status | 53% complete (Tier 1) |

---

## Phase 1: Foundation Completion

**Goal:** Complete missing core entities and SSO authentication required for downstream modules.

**Requirements:** ENT-01, ENT-02, ENT-03, ENT-04, ENT-05, ENT-06, ENT-07, ENT-08, ENT-09, AUTH-05, AUTH-06, AUTH-07, ORG-01, USER-01, CASE-01

**Success Criteria:**
1. Subject entity supports HRIS lookup and cross-case search returns all cases involving a subject
2. Category entity with hierarchical taxonomy is used by Case creation form
3. SSO login via Azure AD and Google OAuth creates/updates user with JIT provisioning
4. Follow-up calls create Interaction records linked to existing cases
5. Two-way messaging delivers messages to anonymous reporters via relay
6. Remediation plans can be attached to investigations with assignable steps

**Dependencies:** None (foundation for all other phases)

**PRD Reference:** `02-MODULES/05-CASE-MANAGEMENT/PRD.md` Sections 2, 3

---

## Phase 2: Operator Console

**Goal:** Enable Ethico hotline operators to capture intakes, manage QA workflow, and release cases to clients.

**Requirements:** OPC-01, OPC-02, OPC-03, OPC-04, OPC-05, OPC-06, OPC-07, OPC-08, OPC-09, OPC-10, OPC-11, OPC-12, OPC-13, OPC-14, AI-01, AI-02, AI-03, AI-04

**Success Criteria:**
1. Operator receives call, profile auto-loads from phone number in <2 seconds
2. Operator captures intake using structured form, submits to QA queue
3. QA reviewer claims case, edits fields, releases to client with routing preview
4. Follow-up call links to existing case via access code, creates Interaction
5. AI generates category suggestions with confidence scores during intake
6. AI converts bullet notes to professional narrative with one click

**Dependencies:** Phase 1 (Subject, Interaction, Category entities)

**PRD Reference:** `02-MODULES/02-OPERATOR-CONSOLE/PRD.md`

---

## Phase 3: Ethics Portal & Employee Portal

**Goal:** Enable anonymous reporting via public portal and authenticated self-service for employees.

**Requirements:** EPL-01, EPL-02, EPL-03, EPL-04, EPL-05, EPL-06, EPL-07, EPL-08, EPL-09, EPL-10, EMP-01, EMP-02, EMP-03, EMP-04, EMP-05, EMP-06, EMP-07, EMP-08, EMP-09, EMP-10, EMP-11

**Success Criteria:**
1. Anonymous reporter submits report via public portal, receives access code
2. Anonymous reporter checks status via access code, sees messages from investigators
3. Anonymous reporter replies to messages, investigators see reply on case timeline
4. Employee logs in via SSO, sees their submitted cases with configurable visibility
5. Employee sends/receives messages with investigators, can attach files
6. Manager sees team compliance dashboard with direct reports' outstanding items

**Dependencies:** Phase 1 (SSO, CaseMessage), Phase 2 (Operator Console for intake pipeline)

**PRD Reference:** `02-MODULES/03-ETHICS-PORTAL/PRD.md`

---

## Phase 4: Disclosures (MVP)

**Goal:** Enable disclosure submission, review workflow, and conditions tracking.

**Requirements:** DIS-01, DIS-02, DIS-03, DIS-04, DIS-05, DIS-06, DIS-07, DIS-08, DIS-09, DIS-10, DIS-11, DIS-12, DIS-13

**Success Criteria:**
1. Employee submits ad-hoc disclosure via Employee Portal
2. Unauthenticated user submits disclosure via Ethics Portal with employee ID
3. Reviewer sees disclosure queue, makes decision (clear/reject/conditions)
4. Employee sees conditions in portal, marks complete with evidence
5. Disclosure can be escalated to create a Case with pre-populated fields
6. External parties are linked across disclosures for pattern detection

**Dependencies:** Phase 3 (Employee Portal, Ethics Portal)

**PRD Reference:** `02-MODULES/06-DISCLOSURES/PRD.md` Sections 1-6

---

## Phase 5: Disclosures Campaign Engine

**Goal:** Enable campaign-driven disclosure collection with HRIS targeting.

**Requirements:** CMP-01, CMP-02, CMP-03, CMP-04, CMP-05, CMP-06, CMP-07, CMP-08, CMP-09, CMP-10

**Success Criteria:**
1. Admin creates campaign targeting employees by HRIS rules (department, location, role)
2. Campaign launches, employees receive invitation emails, see in Employee Portal
3. Campaign dashboard shows completion rate, drill-down by department
4. Reminder schedule sends emails at configured intervals (30, 14, 7, 3, 1 days)
5. Multi-stage approval routes disclosure through up to 4 reviewer stages
6. Auto-clear rules process low-risk disclosures without human review

**Dependencies:** Phase 4 (Disclosure core), Phase 1 (Employee entity for HRIS)

**PRD Reference:** `02-MODULES/06-DISCLOSURES/PRD.md` Sections 4, 7

---

## Phase 6: AI Features

**Goal:** Enable AI-powered assistance throughout the platform.

**Requirements:** AI-05, AI-06, AI-07, AI-08, AI-09

**Success Criteria:**
1. Non-English reports are auto-translated, original preserved, translation marked
2. Cases receive AI-generated risk score with contributing factors
3. User can ask natural language questions about a specific case
4. User can get AI summary of all cases involving a specific subject
5. Employee can ask policy questions via chatbot, gets answers with citations

**Dependencies:** Phase 2 (AI patterns established), Phase 3 (Employee Portal for chatbot)

**PRD Reference:** `02-MODULES/05-CASE-MANAGEMENT/PRD.md` Section 10, `02-MODULES/03-ETHICS-PORTAL/PRD.md` Section 8

---

## Phase 7: Analytics & Notifications

**Goal:** Enable operational dashboards, saved views, and email notifications.

**Requirements:** RPT-01, RPT-02, RPT-03, RPT-04, RPT-05, NTF-01, NTF-02, NTF-03, NTF-04

**Success Criteria:**
1. Case dashboard shows key metrics (open, overdue, by category, by severity)
2. Campaign dashboard shows completion rate, drill-down by department/location
3. User creates saved view with custom columns, filters, sort, persists across sessions
4. User exports case/disclosure data to CSV
5. Email notifications sent for case assignment, status changes, new messages
6. User configures notification preferences per event type

**Dependencies:** Phase 4 (Disclosures for campaign metrics), Phase 3 (Employee Portal)

**PRD Reference:** `02-MODULES/07-ANALYTICS-REPORTING/PRD.md`, `02-MODULES/03-ETHICS-PORTAL/PRD.md` Section 9

---

## Phase Summary

| Phase | Name | Requirements | Key Deliverable |
|-------|------|--------------|-----------------|
| 1 | Foundation Completion | 15 | SSO + Missing entities |
| 2 | Operator Console | 18 | Hotline intake + QA workflow |
| 3 | Ethics Portal & Employee Portal | 21 | Self-service reporting |
| 4 | Disclosures (MVP) | 13 | Disclosure submission + review |
| 5 | Disclosures Campaign Engine | 10 | HRIS-driven campaigns |
| 6 | AI Features | 5 | Translation, chatbot, Q&A |
| 7 | Analytics & Notifications | 9 | Dashboards + email |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| SSO complexity | Phase 1 delay | Start with Azure AD, add Google incrementally |
| HRIS data quality | Campaign targeting issues | Validate HRIS sync before campaign launch |
| AI response latency | UX degradation | Implement streaming responses, loading states |
| Anonymous relay complexity | Message delivery failures | Comprehensive E2E testing with access codes |

---

## Notes

- **Existing Code:** Tier 1 Foundation (Slices 1.1-1.8) provides solid base
- **Test Coverage:** 218 tests passing; maintain >80% coverage
- **Multi-tenancy:** All new entities MUST have organizationId with RLS
- **UI Framework:** shadcn/ui + Tailwind CSS only (no Material-UI)

---
*Roadmap created: 2026-01-31*
*Last updated: 2026-01-31 after GSD initialization*
