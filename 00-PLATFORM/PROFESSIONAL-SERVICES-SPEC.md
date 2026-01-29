# Professional Services & Implementation Specification

**Document ID:** PS-001
**Version:** 1.0
**Last Updated:** January 2026
**Status:** Approved

---

## Table of Contents

1. [Service Philosophy](#1-service-philosophy)
2. [Engagement Model](#2-engagement-model)
3. [Implementation Team](#3-implementation-team)
4. [Implementation Portal](#4-implementation-portal)
5. [Implementation Templates](#5-implementation-templates)
6. [Configuration Tools](#6-configuration-tools)
7. [Data Migration](#7-data-migration)
8. [Training & Certification](#8-training--certification)
9. [Go-Live Readiness](#9-go-live-readiness)
10. [Client Portal View](#10-client-portal-view)
11. [Handoff Process](#11-handoff-process)
12. [Knowledge Base & Self-Service](#12-knowledge-base--self-service)

---

## 1. Service Philosophy

### Core Principle

**"Design for self-service, deliver white-glove."**

- Every client gets human implementation support by default
- But every tool Implementation Specialists use is also available to clients
- Platform is 100% self-service capable with docs, videos, and in-app guidance
- Clients can self-manage post-go-live without calling Ethico

### Why This Matters

| Benefit | Description |
|---------|-------------|
| **Scalability** | Same tools work for 10 implementations or 1,000 |
| **Enablement** | Clients learn the platform, not dependency on Ethico |
| **Flexibility** | Simple clients can self-serve; complex get white-glove |
| **Quality** | Consistent experience regardless of implementation path |
| **Differentiation** | Competitors require PS; we make it optional |

### Guiding Principles

1. **Flexibility** - Implementation adapts to client needs, not rigid phases
2. **Transparency** - Clients see their progress, not a black box
3. **Enablement** - Train clients to self-manage, don't create dependency
4. **Scalability** - Tools must work efficiently at scale
5. **Quality** - Every go-live meets defined readiness criteria

---

## 2. Engagement Model

### Implementation Types

| Type | Client Profile | Scope | Timeline |
|------|----------------|-------|----------|
| **Quick Start** | New compliance programs, simple requirements | Account setup, categories, users, branding, basic training | 2-4 weeks |
| **Standard** | Mid-market, switching from basic systems | Quick Start + SSO, HRIS, intake forms, routing, training | 4-8 weeks |
| **Complex** | Enterprise switching from NAVEX/EQS | Standard + full migration, custom workflows, advanced training | 8-16 weeks |
| **Enterprise** | Large enterprise, phased rollout | Complex + dedicated PM, executive alignment, multiple phases | 3-6 months |

### Default Engagement

All clients receive human implementation support by default:
- Assigned Implementation Specialist
- Kickoff call and requirements gathering
- Guided configuration and setup
- Training sessions (live + self-paced)
- Go-live support and handoff to CSM

### Self-Service Option

Clients who prefer self-service have full access to:
- Same configuration tools used by Implementation Specialists
- Complete documentation and video library
- In-app guidance and tooltips
- Email/chat support for questions

---

## 3. Implementation Team

### Ethico Internal Roles

| Role | Responsibility | Client Interaction |
|------|----------------|-------------------|
| **Implementation Specialist** | Hands-on configuration, migration, training delivery | Primary contact during implementation |
| **Implementation Manager** | Complex/enterprise projects, manages multiple specialists | Executive sponsor for large projects |
| **Solutions Engineer** | Pre-sales technical validation, complex integration design | Pre-sales and technical deep-dives |
| **Customer Success Manager (CSM)** | Relationship owner post-go-live, adoption, expansion | Introduced at go-live, ongoing relationship |
| **Support** | Post-go-live technical support | Reactive support post-handoff |

### Implementation Specialist Capabilities

Within the platform, Implementation Specialists have:
- Cross-tenant access to assigned clients
- Implementation Portal navigation section
- Elevated configuration permissions
- Migration and bulk import tools
- Training administration
- Client health dashboard

### Capacity Planning

| Specialist Level | Concurrent Implementations | Notes |
|------------------|---------------------------|-------|
| Junior | 3-5 Quick Start / Standard | Supervised, learning |
| Mid-level | 5-8 mixed complexity | Independent |
| Senior | 3-5 Complex / Enterprise | May supervise juniors |
| Manager | 1-2 Enterprise + oversight | Team leadership |

---

## 4. Implementation Portal

### Portal Access

Implementation Specialists see an additional navigation section:

```
─────────────
IMPLEMENTATION
├── 📋 Onboard    (Checklists & task tracking)
├── 📥 Migrate    (Data import tools)
├── ⚙️ Configure  (Bulk setup wizards)
└── 📊 Health     (Client health dashboard)
```

### Implementation Dashboard

The main dashboard shows all assigned implementations:

**Active Implementations:**
- Client name
- Implementation type (Quick/Standard/Complex/Enterprise)
- Progress percentage
- Target go-live date
- Health status (🟢 On Track / 🟡 At Risk / 🔴 Blocked)
- Next action required

**Features:**
- Filter by status, type, go-live date
- Sort by priority, date, health
- Alerts for blocked or at-risk implementations
- Quick actions (open checklist, contact client, escalate)

### Client Health Indicators

| Status | Criteria |
|--------|----------|
| 🟢 **On Track** | Progress aligned with timeline, no blockers, client responsive |
| 🟡 **At Risk** | Behind schedule, minor blockers, or client delays |
| 🔴 **Blocked** | Major blocker, unresponsive client, or critical issue |
| ⚪ **Not Started** | Scheduled but not yet kicked off |

### Blocker Management

When a blocker is identified:
1. Log blocker with description and owner
2. Set expected resolution date
3. Track escalation path
4. Auto-alert if unresolved past expected date
5. Provide recommended actions

---

## 5. Implementation Templates

### Template Selection

Instead of rigid phases, implementations use **flexible templates** that can be customized:

| Template | Est. Timeline | Includes | Excludes |
|----------|---------------|----------|----------|
| **Quick Start** | 2-4 weeks | Account setup, categories, users, branding, basic training | Migration, HRIS, custom integrations |
| **Standard** | 4-8 weeks | Quick Start + SSO, HRIS, intake forms, routing, training | Large migration, custom workflows |
| **Complex** | 8-16 weeks | Standard + full migration, custom workflows, advanced training | N/A - full scope |
| **Custom** | Variable | Start from scratch, add only needed tasks | N/A - fully configurable |

### Template Customization

After selecting a template, specialists can:
- Add/remove phases
- Add/remove individual tasks
- Reorder tasks
- Adjust due dates
- Assign tasks to specialist or client
- Add dependencies between tasks

### Standard Phases

Most implementations include these phases (customizable):

**Phase 1: Foundation**
- Kickoff call
- Account creation
- Admin user invitation
- Branding configuration
- Hotline number assignment

**Phase 2: Users & Access**
- SSO configuration
- User role definition
- Initial user provisioning

**Phase 3: Case Management Setup**
- Categories & subcategories
- Severity levels
- Intake form customization
- Routing rules
- Investigation templates
- Corrective action library
- SLA configuration
- Email templates

**Phase 4: Integrations**
- SSO testing & validation
- HRIS connection
- Employee directory sync
- Email integration

**Phase 5: Data Migration** (if applicable)
- Source system export
- Field mapping
- Value mapping
- Validation
- Import execution
- Data verification

**Phase 6: Training**
- Admin training sessions
- CCO/Compliance training
- Investigator training
- Training completion verification

**Phase 7: Go-Live Readiness**
- Test case creation
- User acceptance testing
- Go-live readiness checklist
- Go-live communication
- Go-live execution

**Phase 8: Handoff**
- CSM introduction
- Support documentation
- Implementation closure
- Client satisfaction survey

---

## 6. Configuration Tools

### Must-Have Configuration Items

Every implementation requires:

| Category | Items |
|----------|-------|
| **Categories** | Case categories, subcategories, routing rules |
| **Users** | Admin users, investigators, role assignments |
| **Branding** | Logo, primary colors, portal customization |
| **Hotline** | Phone numbers, routing, directives |
| **Routing** | Assignment rules, escalation triggers |
| **Intake Forms** | Form fields, conditional logic, translations |

### Bulk Configuration Wizards

For efficient setup, wizards provide:

**Categories & Routing Wizard:**
- Start from industry templates (Healthcare, Finance, Manufacturing, etc.)
- Bulk add categories with subcategories
- Configure routing rules per category
- AI-suggested categories based on industry

**Investigation Templates Wizard:**
- Create category-specific checklists
- Define required fields and documentation
- Set up interview templates
- Configure finding categories

**Corrective Action Library:**
- Pre-populate remediation options
- Categorize by type (Training, Termination, Policy Change, etc.)
- Set default assignees and timelines

### AI-Assisted Configuration

AI helps accelerate configuration:
- Suggest categories based on client industry
- Auto-generate investigation checklists
- Recommend routing rules based on org structure
- Flag potential gaps in configuration

---

## 7. Data Migration

### Supported Source Systems

**Tier 1: Pre-built Mappings**
- NAVEX EthicsPoint
- EQS Integrity Line
- Case IQ
- OneTrust Ethics
- Convercent

**Tier 2: Template-Based**
- Excel / CSV with provided templates
- Custom exports with manual mapping

### Data Types

| Data Type | Typical Volume | Complexity |
|-----------|---------------|------------|
| **Cases** | 100 - 10,000+ | High - many fields, relationships |
| **Investigations** | Linked to cases | Medium - status, findings |
| **Disclosures** | 500 - 50,000+ | Medium - form fields vary |
| **Policies** | 20 - 200 | Low - documents + metadata |
| **Attachments** | 1,000 - 50,000+ | High - file handling, linking |
| **Attestations** | Historical records | Low - optional |

### Migration Wizard Steps

**Step 1: Source Selection**
- Select source system (pre-built or custom)
- Select data types to migrate
- Review expected format and requirements

**Step 2: File Upload**
- Upload export files (CSV, Excel, ZIP)
- System detects row count, columns
- Validate file format

**Step 3: Field Mapping**
- AI auto-maps fields based on names and content
- Review and adjust mappings
- Handle unmapped fields (map or ignore)

**Step 4: Value Mapping**
- Map source values to Ethico values (status, categories)
- Resolve user references (create users or map to existing)
- AI suggests mappings based on semantic similarity

**Step 5: Validation**
- Run validation rules on all records
- Report errors, warnings, and valid records
- Preview sample of mapped data

**Step 6: Import**
- Confirm import scope
- Enable rollback capability
- Execute import (foreground or background)
- Monitor progress

**Step 7: Verification**
- Review import results
- Spot-check sample records
- Verify attachments linked correctly
- Rollback if needed (within 7 days)

### AI-Assisted Migration

AI helps with:
- Auto-detecting field mappings from column names and sample data
- Suggesting value mappings based on semantic similarity
- Identifying potential data quality issues
- Recommending unmapped field destinations

### Rollback Capability

All imports support rollback:
- Creates restore point before import
- Can undo entire import within 7 days
- Removes imported records, restores previous state
- Audit log preserved

---

## 8. Training & Certification

### Training Philosophy

Role-based tracks with certification - different roles have fundamentally different needs.

### Training Tracks

| Track | Audience | Duration | Modules |
|-------|----------|----------|---------|
| **Admin** | System administrators, compliance ops | 3-4 hours | 6 modules |
| **CCO/Compliance Leader** | Chief Compliance Officers, Directors | 2-3 hours | 6 modules |
| **Investigator** | Investigators, HR partners, Legal | 2-3 hours | 6 modules |
| **Employee** | All employees (optional) | 30-45 min | 5 modules |

### Admin Track Modules

1. Platform Overview & Navigation
2. User & Role Management
3. Categories, Routing & Forms
4. Workflow Configuration
5. Integrations (SSO, HRIS, Email)
6. Certification Exam

### CCO/Compliance Leader Track Modules

1. Executive Dashboard & KPIs
2. Building Custom Reports
3. Board Reporting & Export
4. Program Health & Risk Metrics
5. AI Insights & Analytics
6. Certification Exam

### Investigator Track Modules

1. Case & Investigation Overview
2. Working Cases: Notes, Emails, Tasks
3. Evidence & Document Management
4. Findings & Remediation
5. Using AI Assistance
6. Certification Exam

### Employee Track Modules

1. Ethics Portal Overview
2. How to Submit a Report
3. Policy Access & Questions
4. Disclosures & Attestations
5. Certification Quiz

### Module Structure

Each module includes:
- Video content (5-20 minutes)
- Written articles/guides
- Interactive exercises (where applicable)
- Knowledge check quiz

### Certification

**Requirements:**
- Complete all track modules
- Pass certification exam (80% minimum)
- 45-minute time limit
- 2 retake attempts allowed

**Certification Benefits:**
- Digital badge displayed on profile
- Downloadable certificate
- Logged for audit compliance
- Valid for 1 year (annual refresher available)

### Training Delivery

**Self-Paced:**
- On-demand video modules
- Interactive exercises
- Knowledge checks
- Progress tracking

**Live Sessions:**
- Scheduled during implementation
- Client-specific Q&A
- Hands-on walkthrough of their configuration
- Recorded for future reference

### Training Administration

Admins can:
- View team training progress
- See certification status
- Send reminders to incomplete users
- Assign training to new users
- Export completion reports for audit

---

## 9. Go-Live Readiness

### Readiness Criteria

Go-live requires completion of defined criteria across categories:

**Configuration (Required)**
- Categories & routing configured
- Intake forms customized
- Investigation templates created
- Email templates configured
- Branding applied

**Integrations (As Applicable)**
- SSO configured & tested
- HRIS connected & synced
- Email integration enabled

**Data (If Migrating)**
- Historical data imported
- Data validation complete
- Attachments verified

**Users & Training (Required)**
- Admin users provisioned & certified
- Investigator users provisioned & certified
- CCO/Compliance users trained

**Testing (Required)**
- Test cases created by client
- End-to-end workflow tested
- Reporting validated
- UAT sign-off received

**Communications (Required)**
- Go-live announcement drafted
- Employee communication ready
- Hotline number published

### Readiness Score

Visual progress indicator:
- 0-50%: 🔴 Not Ready
- 51-80%: 🟡 Almost Ready
- 81-99%: 🟢 Nearly Ready
- 100%: ✅ Ready for Go-Live

### Blocker Resolution

Before go-live, all blockers must be resolved:
- Training incomplete → Send reminders, extend deadline
- Integration issues → Escalate to technical team
- Client delays → Escalate to sponsor
- Data issues → Re-run migration or manual fix

### Go-Live Approval

Requires sign-off from:
1. Implementation Specialist
2. Client Admin
3. Client Executive Sponsor (for Enterprise)

Sign-off confirms:
- All configuration reviewed and approved
- Data migration validated
- Required training complete
- UAT testing complete and signed off
- Go-live communications ready

---

## 10. Client Portal View

### Client Visibility

Clients see their own implementation progress via the Client Portal:

**Visible to Client:**
- Overall progress percentage
- Phase completion status
- Their action items with due dates
- Implementation team contacts
- Go-live date countdown
- Getting started resources

**Internal Only:**
- Ethico task assignments
- Internal notes
- Effort estimates
- Billing information
- Detailed blocker investigation

### Client Action Items

Clients can complete tasks directly:
- Review and approve configurations
- Upload credentials securely
- Provide sign-offs
- Complete training modules
- Mark tasks complete

### Client Self-Service

Clients can independently:
- Access configuration tools (if enabled)
- View documentation and videos
- Complete training modules
- Track team training progress
- Contact Implementation Specialist

---

## 11. Handoff Process

### Handoff Trigger

Handoff begins after:
- Go-live approval received
- Go-live executed successfully
- Initial post-go-live period complete (typically 3-5 days)

### Handoff Checklist

**CSM Assignment:**
- CSM assigned to account
- Introduction call scheduled
- Client contacts transferred

**Support Documentation:**
- Client profile documented
- Special configurations noted
- Known issues documented
- Migration notes captured

**Training Status:**
- All required users certified
- Training completion verified

**Implementation Survey:**
- Client satisfaction survey sent
- Feedback captured

**Closure:**
- Implementation marked complete
- Archive implementation records
- Update CRM status

### CSM Introduction Call

Agenda:
1. Introductions
2. Review implementation highlights
3. Discuss adoption goals
4. Set up recurring check-ins
5. Introduce support channels
6. Answer questions

### Support Transition

After handoff:
- Support team receives client profile
- Implementation Specialist available for 30-day questions
- All support tickets go to Support team
- CSM owns relationship and escalations

---

## 12. Knowledge Base & Self-Service

### Documentation Library

**Getting Started:**
- Platform overview
- Quick start guides by role
- Video walkthroughs

**Admin Guides:**
- User management
- Category configuration
- Form building
- Workflow setup
- Integration guides

**User Guides:**
- Case management
- Investigation workflow
- Reporting and analytics
- Email and communication

**API Documentation:**
- REST API reference
- Authentication
- Webhooks
- Integration examples

### Video Library

Organized by:
- Role (Admin, Investigator, CCO, Employee)
- Feature area
- Complexity (Beginner, Intermediate, Advanced)

### In-App Guidance

- Tooltips on complex features
- First-time user tours
- Contextual help links
- AI assistant for questions

### Support Channels

| Channel | Availability | Use Case |
|---------|--------------|----------|
| **Knowledge Base** | 24/7 | Self-service answers |
| **In-App Chat** | Business hours | Quick questions |
| **Email Support** | 24/7 (response SLA) | Detailed issues |
| **Phone Support** | Business hours | Urgent issues (Enterprise) |
| **CSM** | Scheduled | Strategic discussions |

---

## Appendix A: Implementation Checklist Template

### Quick Start Template

```
FOUNDATION
□ Kickoff call completed
□ Account created
□ Primary admin invited
□ Branding configured (logo, colors)
□ Hotline numbers assigned

CONFIGURATION
□ Categories defined (minimum 5)
□ Intake form reviewed
□ Basic routing rules configured
□ User roles assigned

USERS
□ Admin users created (1-3)
□ Initial investigators added

TRAINING
□ Admin quick-start training
□ Investigator orientation

GO-LIVE
□ Test submission completed
□ Go-live communication sent
□ Go-live!
```

### Standard Template

```
[Quick Start items plus:]

INTEGRATIONS
□ SSO configured
□ SSO tested with admin users
□ HRIS connection configured
□ Employee directory synced

ADVANCED CONFIGURATION
□ Investigation templates created
□ Email templates customized
□ SLA rules configured
□ Escalation rules defined

TRAINING
□ Admin training (full track)
□ CCO/Compliance training
□ Investigator training (full track)
□ Training certification verified

GO-LIVE READINESS
□ UAT test cases created
□ UAT sign-off received
□ Readiness checklist complete
```

### Complex Template

```
[Standard items plus:]

DATA MIGRATION
□ Source data exported
□ Field mapping complete
□ Value mapping complete
□ Validation passed
□ Test import reviewed
□ Production import complete
□ Data verification complete

ADVANCED FEATURES
□ Custom workflows configured
□ Advanced routing rules
□ Custom fields defined
□ Custom reports created
□ Dashboard customized

HANDOFF
□ CSM assigned and introduced
□ Support documentation complete
□ Implementation survey sent
□ Implementation closed
```

---

## Appendix B: Data Migration Field Mappings

### NAVEX EthicsPoint → Ethico

| NAVEX Field | Ethico Field | Notes |
|-------------|--------------|-------|
| Case_ID | external_reference | Preserved for reference |
| Report_Date | created_at | Date conversion |
| Incident_Type | category_id | Value mapping required |
| Incident_Description | description | Direct map |
| Reporter_Type | reporter_type | Value mapping required |
| Case_Status | status | Value mapping required |
| Assigned_To | assigned_to_id | User resolution required |
| Resolution_Date | closed_at | Date conversion |
| Location_Code | location_id | Location resolution |

### Common Value Mappings

**Status Mapping:**
| Source Value | Ethico Value |
|--------------|--------------|
| Open | open |
| In Progress | under_investigation |
| Closed - Substantiated | closed_substantiated |
| Closed - Unsubstantiated | closed_unsubstantiated |
| Closed - Inconclusive | closed_insufficient_evidence |
| Pending Review | triage |

---

## Appendix C: Training Certification Requirements

### Exam Specifications

| Track | Questions | Time Limit | Passing Score | Retakes |
|-------|-----------|------------|---------------|---------|
| Admin | 25 | 45 min | 80% | 2 |
| CCO/Compliance | 20 | 30 min | 80% | 2 |
| Investigator | 25 | 45 min | 80% | 2 |
| Employee | 10 | 15 min | 70% | 3 |

### Question Types

- Multiple choice (single answer)
- Multiple select (multiple answers)
- Scenario-based (read scenario, answer question)
- True/False

### Certification Validity

- Standard validity: 1 year
- Refresher training available
- Major releases may require re-certification
- Audit log maintained for compliance

---

*Document Version: 1.0*
*Last Updated: January 2026*
