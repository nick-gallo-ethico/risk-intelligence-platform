# V1 Issues & Gaps — Post-Testing Punch List

> Source: Manual QA testing of all built phases (1-12)
> Created: 2026-02-06
> Purpose: Organize into GSD phases for systematic resolution

---

## Phase 14: Critical Bug Fixes & Navigation (Quick Wins)

**Priority: URGENT — These are broken links, 404s, and non-functional UI elements that make the app look unfinished.**

| # | Issue | Location | Type |
|---|-------|----------|------|
| 14.1 | Audit log goes to 404 page | Sidebar → Audit Log | Broken route |
| 14.2 | Notifications "View All" goes to 404 | Top nav notification bell → View All | Broken route |
| 14.3 | Dashboard "View All Tasks" goes to 404 | Dashboard → Tasks section → View All | Broken route |
| 14.4 | Dashboard "My Tasks" — clicking a case goes to 404 | Dashboard → My Tasks → click case | Broken route |
| 14.5 | User menu links don't work | Top right user avatar → dropdown menu | Non-functional links |
| 14.6 | Search bar at the top doesn't work | Global search bar | Non-functional |
| 14.7 | Dashboard "Create Case" gives Select.Item error | Dashboard → Quick Actions → Create Case | Runtime error (empty string value on Select.Item) |
| 14.8 | Dashboard "My Active Cases" takes a long time to load | Dashboard → My Active Cases | Performance |
| 14.9 | Top right user name doesn't change with different logins | Top nav → user display name | Auth/session bug |
| 14.10 | Logo — the "E" in the top left should be the Ethico E | Top left corner of app | Asset/branding |
| 14.11 | Top nav bar should be same color as side nav bar (both dark) | Top navigation bar | Styling |

**Estimated scope:** Mostly route fixes, a few component bugs. Should be 1-2 plans.

---

## Phase 15: Case Detail Page Overhaul

**Priority: HIGH — The case page is the heart of the application. Users spend 80% of their time here.**

### Layout (Three-Column Design)

The case page should be **three columns** with the middle column **twice as wide** as the outer two:

**Left Column (1x width):**
- Case number and high-level info (date created, status, pipeline, days open)
- Row of action buttons: Note, Interview, Document, Task, Email
  - Email button: compose from screen, add to activity feed; also can log external emails (sent from inbox + responses) to activity feed
- Below buttons: all RIU-specific fields (form answers), divided into relevant sections

**Middle Column (2x width) — Tabbed:**
- **Overview tab:** High-level case info, date created, lifecycle stage, last activity date, recent activities, upcoming activities
- **Activities tab:** Descending thread of ALL interactions — tasks, notes, meetings, emails, calls, documents, etc.
- **Summary tab:** AI-written or user-written summary + full write-up of case findings

**Right Column (1x width):**
- Cards for connected documents
- Cards for connected people (witness, subject)
  - "Add person" pulls from HRIS or free-form text
  - Same for locations
- AI button: slides out over right column, ask questions about case, AI can modify statuses, add notes to activity feed

### Broken Buttons & Tabs

| # | Issue | Expected Behavior |
|---|-------|-------------------|
| 15.1 | Case tabs (Overview, Investigations, Messages, Files, Activities, Remediation) don't work | Should switch content within the case |
| 15.2 | "Assign" button doesn't work | Pop up list of available people to assign to |
| 15.3 | "Status" button doesn't work | Let user change case status, move to closed/resolved |
| 15.4 | "Merge" button doesn't work | Merge current case with another case |
| 15.5 | No action buttons in top area | Need: Call, Meeting, Note, Template, etc. |
| 15.6 | Status/field changes don't appear in activity feed | Any change to a field or status should log to activity |

### Seed Data

- Case details should be **200-400 words** (currently too short)
- Case summaries should be **50-75 words** (currently too short or missing)

**Estimated scope:** Major frontend overhaul. 4-6 plans covering layout, tabs, buttons, activity feed, AI panel.

---

## Phase 16: AI Integration Fix

**Priority: HIGH — AI is a core differentiator and currently doesn't work at all.**

| # | Issue | Details |
|---|-------|---------|
| 16.1 | AI doesn't work at all | Need to diagnose: API key? Service connection? Frontend wiring? WebSocket? |
| 16.2 | AI panel slide-out needed on case page | When user clicks AI button, slides over right column |
| 16.3 | AI should be able to modify case data | Change statuses, add notes to activity feed |
| 16.4 | AI case summaries not generating | Should auto-generate or be triggerable |

**Estimated scope:** Debug + fix backend AI service, wire up frontend AI panel. 2-3 plans.

---

## Phase 17: Campaigns Hub

**Priority: HIGH — Core compliance feature.**

| # | Issue | Details |
|---|-------|---------|
| 17.1 | Need centralized campaigns area | All campaigns (disclosures, attestations, stay interviews, distributed forms) in one place |
| 17.2 | Campaigns should be editable and releasable | Full lifecycle management |
| 17.3 | Should be able to make new forms | Form builder for new campaign types |
| 17.4 | Need link to forms/RIU Types | Disclosures, hotline intake, surveys, proxy forms, web intake, etc. |

**Estimated scope:** Much of the backend exists (Phase 9). This is primarily frontend wiring and a unified campaigns hub page. 3-4 plans.

---

## Phase 18: Reports & Data Management

**Priority: HIGH — Lots of data exists but no way to use it.**

| # | Issue | Details |
|---|-------|---------|
| 18.1 | No way to design reports | Acme Co. has tons of data but can't create reports |
| 18.2 | All case fields should be reportable and sortable | Every field on a case should be available in reports |
| 18.3 | Export functionality | Download/export data from views |

**Estimated scope:** Report designer UI, field availability. Backend reporting engine exists (Phase 11). 2-3 plans.

---

## Phase 19: Workflow Engine UI

**Priority: HIGH — Workflow engine powers case assignments, approval routing, disclosure approvals. Critical infrastructure.**

| # | Issue | Details |
|---|-------|---------|
| 19.1 | No way to edit workflows | Backend workflow engine exists but no UI to manage it |
| 19.2 | Where do workflows live? | Need a dedicated section in the app |
| 19.3 | Workflow builder UI | Visual builder for creating/editing workflows |
| 19.4 | Workflow application | Apply workflows to: case assignments, approval routing, disclosure approvals |

**Estimated scope:** Full workflow builder UI. Backend engine exists (Phase 1). 4-5 plans.

---

## Phase 20: Settings Overhaul (HubSpot-Style)

**Priority: MEDIUM-HIGH — Currently settings are minimal. Needs major expansion.**

### 1. Your Preferences
**1a. General Settings:**
- Profile management
- Email: connect email to system, link emails to cases, manage signatures
- Security: edit email, reset password, set up passkey, delete account
- Task settings

**1b. Notification Settings:**
- Control notifications per event type (email and desktop)
- Model after HubSpot's notification settings

### 2. Account Management
- Account defaults
- Audit Log (fix the 404!)
- Users & Teams: super admin controls users, seats, teams, permission sets
  - **Permission sets are critical** — research HubSpot permission sets with templates
- Integrations
- Approvals
- AI settings

### 3. Data Management
- **Properties:** Add new properties to objects and groups (HubSpot-style property management)
- **Objects:** Forms, Cases, Investigations, Policies, Tickets, Disclosures, RIUs, etc.

### 4. Tools
- Tabs under each subpage for different components

**Estimated scope:** Large UI effort with multiple sub-pages. 5-7 plans.

---

## Phase 21: Project Management (Monday.com-Style)

**Priority: MEDIUM — Currently described as "totally nonexistent."**

| # | Issue | Details |
|---|-------|---------|
| 21.1 | Projects section has no Monday.com functionality | Kanban boards, task views, timelines |
| 21.2 | Project management system not built out | Full project tracking system needed |

**Estimated scope:** Significant new feature module. 4-6 plans.

---

## Phase 22: Dark Mode & Theme Polish

**Priority: MEDIUM — User explicitly said "should be available in V1."**

| # | Issue | Details |
|---|-------|---------|
| 22.1 | No dark mode available | Need full dark mode toggle |
| 22.2 | Nav bar color inconsistency | Top and side nav should both be dark |

**Estimated scope:** Theme system + dark mode CSS. 1-2 plans.

---

## Phase 23: Help & Support System

**Priority: MEDIUM — Users need a way to get help.**

| # | Issue | Details |
|---|-------|---------|
| 23.1 | Help and Support goes nowhere useful | Should go to knowledge base or allow ticket filing |
| 23.2 | Need knowledge base | Build or integrate |
| 23.3 | Real-time support ticket filing | From platform, from email |

**Estimated scope:** Knowledge base integration or build + support ticket system. 2-3 plans.

---

## Phase 24: Policy Content & Formatting

**Priority: MEDIUM — Policies exist but have no actual content.**

| # | Issue | Details |
|---|-------|---------|
| 24.1 | Policies not populated with text | Each policy should look like a properly formatted document |

**Estimated scope:** Seed data update. 1 plan.

---

## Saved Views (Already Phase 13)

These items are already covered by Phase 13 (queued):
- No way to save a view when you resort it
- Should have slide-out to create views with all fields available
- Column selection (like HubSpot)
- Download/export from view
- Save as tab

---

## Recommended Execution Order

Based on dependencies, visibility, and impact:

```
Phase 14: Critical Bug Fixes & Navigation  ← Do first (quick wins, immediate polish)
Phase 15: Case Detail Page Overhaul         ← Core UX, biggest user impact
Phase 16: AI Integration Fix                ← Core differentiator
Phase 13: Saved Views (already planned)     ← Enhances all list pages
Phase 17: Campaigns Hub                     ← Core compliance feature
Phase 18: Reports & Data Management         ← Unlocks data value
Phase 19: Workflow Engine UI                ← Critical infrastructure
Phase 20: Settings Overhaul                 ← Admin functionality
Phase 21: Project Management                ← New module
Phase 22: Dark Mode & Theme                 ← Polish
Phase 23: Help & Support                    ← Support infrastructure
Phase 24: Policy Content                    ← Seed data
```

## GSD Commands to Execute

```bash
# For each new phase (14-24, skipping 13 which exists):
/gsd:add-phase     # Add the phase to the roadmap with description
/gsd:plan-phase N  # Create detailed execution plans for phase N
/gsd:execute-phase N  # Execute all plans in phase N

# If you need to discuss approach first:
/gsd:discuss-phase N  # Gather context before planning

# To check progress:
/gsd:progress  # See where you are
```

---

*Document created: 2026-02-06*
*Total issues: 30+*
*Estimated new phases: 11 (Phases 14-24)*
*Phase 13 (Saved Views) already covers view saving functionality*
