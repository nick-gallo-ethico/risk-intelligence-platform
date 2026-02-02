# PRD-010: Implementation Portal

**Document ID:** PRD-010
**Version:** 1.0
**Priority:** P1 - High (Internal Operations)
**Development Phase:** Phase 3 (Weeks 13-18)
**Last Updated:** February 2026

**Cross-References:**
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md`
- Professional Services Spec: `00-PLATFORM/PROFESSIONAL-SERVICES-SPEC.md`
- Core Data Model: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`
- Authentication & Multi-tenancy: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md`
- AI Integration Patterns: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-INTEGRATION.md`
- Case Management PRD: `02-MODULES/05-CASE-MANAGEMENT/PRD.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [AI-First Considerations](#2-ai-first-considerations)
3. [User Personas](#3-user-personas)
4. [User Stories](#4-user-stories)
5. [Feature Specifications](#5-feature-specifications)
6. [Data Model](#6-data-model)
7. [API Specifications](#7-api-specifications)
8. [UI/UX Specifications](#8-uiux-specifications)
9. [Migration Considerations](#9-migration-considerations)
10. [Integration Points](#10-integration-points)
11. [Non-Functional Requirements](#11-non-functional-requirements)
12. [Checklist Verification](#12-checklist-verification)

---

## 1. Executive Summary

### Purpose

The Implementation Portal is an internal-facing module that enables Ethico Professional Services team to efficiently onboard new clients, migrate data from competitor systems (NAVEX, Case IQ, EQS), configure tenant settings, deliver training, and ensure successful go-live handoffs. It transforms manual implementation processes into a streamlined, AI-assisted workflow that reduces time-to-value and ensures consistency across client deployments.

### Target Users

| Role | Primary Use Cases |
|------|-------------------|
| Implementation Specialist | Execute day-to-day implementation tasks: tenant setup, configuration, migration, training delivery |
| Solution Architect | Design complex migrations, custom integrations, multi-phase rollouts |
| Implementation Manager | Oversee multiple implementations, resource allocation, escalation handling |

### Key Differentiators

| Capability | Traditional Approach | Ethico Implementation Portal |
|------------|---------------------|------------------------------|
| **Tenant Provisioning** | Manual setup, hours of configuration | Wizard-driven, 15-minute baseline tenant |
| **Data Migration** | Custom scripts, manual mapping | AI-assisted field mapping, validation, rollback |
| **Configuration** | Screen-by-screen manual entry | Template cloning, bulk import, configuration packages |
| **Training** | Manual tracking in spreadsheets | Integrated LMS with certification tracking |
| **Go-Live** | Checklist in documents | Interactive readiness dashboard with blockers |
| **Handoff** | Email-based, context lost | Structured handoff with full implementation history |

---

## 2. AI-First Considerations

### Conversational Interface

How Implementation Specialists might interact with this module via natural language chat:

| User Intent | Example Phrases | AI Response |
|-------------|-----------------|-------------|
| Migration status | "Show me migration status for Acme Corp" | Display progress, blockers, validation results |
| Field mapping help | "How should I map NAVEX's 'Incident_Type' field?" | Suggest target field with confidence, show similar mappings |
| Configuration clone | "Copy Acme's workflow settings to BetaCo" | Execute configuration copy, highlight customizations needed |
| Checklist completion | "What's left before Acme goes live?" | Show remaining tasks with owners and ETA |
| Training progress | "How many Acme users have completed admin training?" | Show completion rates, identify gaps |
| Historical reference | "How did we handle date formats for our last NAVEX migration?" | Surface relevant implementation notes and decisions |

**Example Conversations:**

```
User: "Map the NAVEX export for Johnson Industries"
AI: "I've analyzed the uploaded NAVEX export (2,450 cases, 12,000 attachments).
     Auto-mapped 38/45 fields (84%).
     3 fields need review: Custom_Field_7 (no clear match),
     Resolution_Code (multiple possible targets),
     Employee_ID_Legacy (format mismatch).
     Want me to show mapping details or proceed with review?"

User: "Show me the Employee_ID_Legacy issue"
AI: "NAVEX Employee_ID_Legacy uses format 'EMP-12345' but your HRIS uses
     numeric IDs only. Options:
     1. Strip 'EMP-' prefix and map to hris_employee_id (recommended)
     2. Store in custom field for manual reconciliation
     3. Skip field (may affect subject linking)
     Which approach would you like?"
```

### AI Assistance Points

| User Action | AI Can Help By | Confidence Level |
|-------------|----------------|------------------|
| Field mapping | Auto-suggest mappings based on field names, types, and sample data | High (85%+ for standard fields) |
| Value transformation | Suggest transformations for date formats, status codes, enums | High |
| Configuration recommendation | Suggest settings based on client industry and size | Medium |
| Migration validation | Identify potential data quality issues before import | High |
| Duplicate detection | Flag potential duplicate records across imports | Medium |
| Template selection | Recommend implementation template based on client profile | Medium |
| Blocker resolution | Suggest resolution steps based on similar past blockers | Medium |
| Checklist estimation | Predict go-live date based on progress velocity | Medium |

### Data Requirements for AI Context

**Minimum Context:**
- Client industry and employee count
- Source system type (NAVEX, EQS, Case IQ, etc.)
- Uploaded export file structure
- Target Ethico schema version

**Enhanced Context (Improves Quality):**
- Previous migrations from same source system
- Client's specific configuration preferences
- HRIS schema for employee matching
- Historical implementation timelines

**Cross-Module Context:**
- Case Management schema (for migration validation)
- Disclosures schema (for disclosure migration)
- Policy Management schema (for policy migration)
- Core Data Model (for shared entity mapping)

---

## 3. User Personas

### Ethico Staff (Implementation Team)

**Implementation Specialist**
- Day-to-day executor of implementation tasks
- Handles 5-8 concurrent implementations (mixed complexity)
- Needs efficient tools to minimize context-switching
- Values templates, automation, and clear progress tracking

**Solution Architect**
- Designs complex implementation approaches
- Handles enterprise migrations with custom requirements
- Needs deep access to configuration and validation tools
- Values flexibility and detailed audit trails

**Implementation Manager**
- Oversees team of 5-10 specialists
- Manages portfolio of 20-40 active implementations
- Needs high-level visibility and resource planning
- Values dashboards, alerts, and capacity forecasting

**Story Format:** `As a [specific role], I want to [action] so that [value]`

---

## 4. User Stories

### Epic 1: Implementation Project Management

#### US-010-001: Create New Implementation Project

As an **Implementation Specialist**, I want to create a new implementation project when a client signs
so that all implementation work is tracked in one place.

**Acceptance Criteria:**
- [ ] Can create project from Sales handoff data (CRM integration) or manually
- [ ] Project linked to Organization/Tenant entity
- [ ] Implementation type selection (Quick Start, Standard, Complex, Enterprise)
- [ ] Template automatically applied based on implementation type
- [ ] Go-live target date set with SLA calculation
- [ ] Activity logged: "Implementation Specialist {name} created implementation project for {client}"

**AI Enhancement:**
- AI suggests implementation type based on client profile
- AI estimates realistic go-live date based on similar implementations

**Ralph Task Readiness:**
- [ ] Entry point: `apps/backend/src/modules/implementations/implementations.controller.ts`
- [ ] Pattern reference: Case Management CRUD pattern
- [ ] Tests: Unit tests for service, E2E for API endpoints

---

#### US-010-002: View Implementation Dashboard

As an **Implementation Specialist**, I want to see all my assigned implementations in a dashboard
so that I can prioritize my work effectively.

**Acceptance Criteria:**
- [ ] Dashboard shows assigned implementations with key metrics
- [ ] Each card displays: client name, type, progress %, target date, health status
- [ ] Health indicators: On Track (green), At Risk (yellow), Blocked (red)
- [ ] Quick filters by status, type, target date range
- [ ] Click-through to implementation detail view
- [ ] Activity not logged (read operation)

**AI Enhancement:**
- AI highlights implementations needing attention based on velocity and blockers

---

#### US-010-003: Track Implementation Progress

As an **Implementation Specialist**, I want to track progress through implementation checklist
so that nothing is missed and status is transparent.

**Acceptance Criteria:**
- [ ] Checklist displays phases and tasks from template
- [ ] Tasks can be marked complete with timestamp
- [ ] Tasks can have attachments and notes
- [ ] Completion percentage auto-calculated
- [ ] Overdue tasks highlighted
- [ ] Dependencies between tasks respected
- [ ] Activity logged: "Implementation Specialist {name} completed task: {task_name}"

**AI Enhancement:**
- AI suggests next priority task based on dependencies and blockers

---

#### US-010-004: Log Implementation Blocker

As an **Implementation Specialist**, I want to log blockers that prevent progress
so that issues are visible and escalation can occur.

**Acceptance Criteria:**
- [ ] Blocker captures: description, owner, expected resolution date, severity
- [ ] Blocker can be linked to specific task
- [ ] Blocker status: Open, In Progress, Resolved
- [ ] Blocker can be escalated to Implementation Manager
- [ ] Auto-alert if blocker exceeds expected resolution date
- [ ] Activity logged: "Implementation Specialist {name} logged blocker: {blocker_title}"

**AI Enhancement:**
- AI suggests resolution steps based on similar past blockers

---

#### US-010-005: View Implementation Portfolio (Manager)

As an **Implementation Manager**, I want to see all active implementations across my team
so that I can manage resources and identify risks.

**Acceptance Criteria:**
- [ ] Portfolio view shows all implementations (not just assigned)
- [ ] Grouping by specialist, status, or target date
- [ ] Aggregate metrics: total active, on track %, at risk count, blocked count
- [ ] Resource utilization view by specialist
- [ ] Drill-down to individual implementation
- [ ] Export to CSV/Excel

**AI Enhancement:**
- AI predicts capacity constraints based on upcoming go-lives

---

### Epic 2: Tenant Provisioning

#### US-010-010: Provision New Tenant

As an **Implementation Specialist**, I want to provision a new tenant for a client
so that they have a working environment to configure.

**Acceptance Criteria:**
- [ ] Wizard captures: client name, slug, admin email, tier, industry
- [ ] Tenant created with baseline configuration
- [ ] Admin user invitation sent automatically
- [ ] Hotline number reserved (if applicable)
- [ ] Tenant appears in Implementation Portal immediately
- [ ] Activity logged: "Implementation Specialist {name} provisioned tenant for {client}"

**AI Enhancement:**
- AI suggests configuration defaults based on client industry

---

#### US-010-011: Clone Configuration from Template

As an **Implementation Specialist**, I want to clone configuration from a template tenant
so that I don't have to configure common settings manually.

**Acceptance Criteria:**
- [ ] Can select source tenant (template or existing client)
- [ ] Selective cloning: categories, workflows, forms, email templates, etc.
- [ ] Preview shows what will be cloned
- [ ] Cloned items marked with source reference
- [ ] Conflicts detected and highlighted (e.g., duplicate codes)
- [ ] Activity logged: "Implementation Specialist {name} cloned {config_type} from {source}"

**AI Enhancement:**
- AI identifies which settings should NOT be cloned (client-specific)

---

#### US-010-012: Configure Branding

As an **Implementation Specialist**, I want to configure client branding
so that their portal reflects their brand identity.

**Acceptance Criteria:**
- [ ] Upload logo (validation: format, size, aspect ratio)
- [ ] Set primary and secondary colors (hex picker)
- [ ] Preview branding on portal mockup
- [ ] Configure custom domain (if enterprise tier)
- [ ] Favicon upload
- [ ] Activity logged: "Implementation Specialist {name} configured branding for {client}"

---

#### US-010-013: Configure Hotline Numbers

As an **Implementation Specialist**, I want to assign hotline numbers to a client
so that reporters can reach the intake system.

**Acceptance Criteria:**
- [ ] View available hotline numbers from inventory
- [ ] Assign primary and backup numbers
- [ ] Configure routing rules (direct to client queue, after-hours handling)
- [ ] Set up directives and opening statements
- [ ] Test call routing works correctly
- [ ] Activity logged: "Implementation Specialist {name} assigned hotline {number} to {client}"

---

### Epic 3: Data Migration

#### US-010-020: Upload Migration Files

As an **Implementation Specialist**, I want to upload export files from source systems
so that I can begin the migration process.

**Acceptance Criteria:**
- [ ] Accepts CSV, Excel, ZIP (containing multiple files)
- [ ] Maximum file size: 500MB per file, 2GB total per upload
- [ ] File validation: format, encoding, required columns
- [ ] Files stored securely in implementation workspace
- [ ] Upload progress indicator
- [ ] Activity logged: "Implementation Specialist {name} uploaded {file_count} files for migration"

---

#### US-010-021: Map Source Fields to Target

As an **Implementation Specialist**, I want to map source system fields to Ethico fields
so that data imports correctly.

**Acceptance Criteria:**
- [ ] Side-by-side view: source fields and target fields
- [ ] AI auto-suggests mappings for each source field
- [ ] Confidence indicator for each suggestion
- [ ] Manual override for any mapping
- [ ] Mapping saved and reusable across files
- [ ] Unmapped fields flagged with options: ignore, map to custom field, create custom field
- [ ] Activity logged: "Implementation Specialist {name} completed field mapping for {data_type}"

**AI Enhancement:**
- AI learns from manual overrides to improve future suggestions
- AI detects data type mismatches (e.g., date format differences)

---

#### US-010-022: Map Source Values to Target Values

As an **Implementation Specialist**, I want to map source enum values to Ethico values
so that status codes, categories, and other enums translate correctly.

**Acceptance Criteria:**
- [ ] Detects fields requiring value mapping (enums, statuses, categories)
- [ ] Shows source values with frequency counts
- [ ] AI suggests target value for each source value
- [ ] Manual override available
- [ ] Handles "Other" and unmapped values gracefully
- [ ] Activity logged: "Implementation Specialist {name} completed value mapping for {field_name}"

**AI Enhancement:**
- AI uses semantic similarity to suggest value mappings
- AI flags unusual values (potential data quality issues)

---

#### US-010-023: Validate Migration Data

As an **Implementation Specialist**, I want to validate mapped data before import
so that I can identify and fix issues proactively.

**Acceptance Criteria:**
- [ ] Validation rules applied: required fields, data types, referential integrity
- [ ] Results categorized: Errors (blocks import), Warnings (recommend fix), Info (FYI)
- [ ] Detailed report downloadable
- [ ] Can fix issues and re-validate
- [ ] Validation results saved for audit
- [ ] Activity logged: "Implementation Specialist {name} ran validation: {error_count} errors, {warning_count} warnings"

**AI Enhancement:**
- AI identifies patterns in errors (e.g., "all records from location X missing category")
- AI suggests bulk fixes for common issues

---

#### US-010-024: Preview Migration Results

As an **Implementation Specialist**, I want to preview how migrated data will appear
so that I can verify accuracy before committing.

**Acceptance Criteria:**
- [ ] Preview shows sample of records as they will appear in Ethico
- [ ] Side-by-side comparison: source record vs. target record
- [ ] Random sample + selectable specific records
- [ ] Preview available for cases, investigations, disclosures, policies
- [ ] Attachments preview (file names, sizes, types)
- [ ] Activity not logged (read operation)

---

#### US-010-025: Execute Migration Import

As an **Implementation Specialist**, I want to execute the data import
so that historical data is available in the client's tenant.

**Acceptance Criteria:**
- [ ] Confirmation dialog with record counts and warnings
- [ ] Import can run in foreground (small) or background (large)
- [ ] Progress indicator with ETA
- [ ] Import creates restore point before execution
- [ ] All imported records tagged with source_system and source_record_id
- [ ] Completion notification when background import finishes
- [ ] Activity logged: "Implementation Specialist {name} imported {record_count} {record_type} records"

---

#### US-010-026: Rollback Migration

As an **Implementation Specialist**, I want to rollback a failed or incorrect migration
so that I can fix issues and re-import.

**Acceptance Criteria:**
- [ ] Rollback available within 7 days of import
- [ ] Rollback removes all records from specific import batch
- [ ] Preserves records created after import
- [ ] Confirmation required with summary of what will be removed
- [ ] Audit trail preserved (activity log shows rollback)
- [ ] Activity logged: "Implementation Specialist {name} rolled back import batch {batch_id}"

---

#### US-010-027: Resolve User References

As an **Implementation Specialist**, I want to resolve user references in migrated data
so that historical assignments link to correct Ethico users.

**Acceptance Criteria:**
- [ ] Extract unique user references from source data
- [ ] AI suggests matches to existing Ethico users
- [ ] Manual matching UI for unmatched users
- [ ] Options: match to existing, create new user, leave unassigned
- [ ] Bulk operations for common scenarios
- [ ] Activity logged: "Implementation Specialist {name} resolved {count} user references"

**AI Enhancement:**
- AI uses name/email similarity to suggest matches
- AI identifies potential duplicates

---

#### US-010-028: Migrate Attachments

As an **Implementation Specialist**, I want to migrate file attachments
so that historical evidence and documents are preserved.

**Acceptance Criteria:**
- [ ] Accepts bulk attachment upload (ZIP)
- [ ] Attachment naming convention maps to source records
- [ ] Links attachments to imported cases/investigations
- [ ] Validates file integrity (checksums if provided)
- [ ] Handles missing attachments gracefully (logs, doesn't block)
- [ ] Storage quota tracked
- [ ] Activity logged: "Implementation Specialist {name} migrated {count} attachments"

---

### Epic 4: Configuration Tools

#### US-010-030: Bulk Import Categories

As an **Implementation Specialist**, I want to import categories from a spreadsheet
so that I can quickly configure the category taxonomy.

**Acceptance Criteria:**
- [ ] Template download available
- [ ] Upload CSV/Excel with categories and subcategories
- [ ] Validation: required fields, hierarchy integrity, duplicate detection
- [ ] Preview before import
- [ ] Import creates categories with proper parent-child relationships
- [ ] Activity logged: "Implementation Specialist {name} imported {count} categories"

---

#### US-010-031: Bulk Import Users

As an **Implementation Specialist**, I want to import users from a spreadsheet
so that client teams are set up efficiently.

**Acceptance Criteria:**
- [ ] Template download available
- [ ] Upload CSV/Excel with user details and roles
- [ ] Validation: email format, role validity, required fields
- [ ] Duplicate detection (email within organization)
- [ ] Option to send invitation emails on import
- [ ] Activity logged: "Implementation Specialist {name} imported {count} users"

---

#### US-010-032: Configure Investigation Templates

As an **Implementation Specialist**, I want to set up investigation templates for the client
so that investigators have guided checklists.

**Acceptance Criteria:**
- [ ] Create template from scratch or copy from library
- [ ] Define checklist questions with types (text, yes/no, date, multi-select)
- [ ] Link template to specific categories
- [ ] Set required vs. optional questions
- [ ] Preview template as investigator would see it
- [ ] Activity logged: "Implementation Specialist {name} created investigation template: {name}"

---

#### US-010-033: Configure Workflow/Pipeline

As an **Implementation Specialist**, I want to configure case workflows
so that cases follow the client's process.

**Acceptance Criteria:**
- [ ] Visual workflow builder (drag-drop stages)
- [ ] Define stage names, order, and SLAs
- [ ] Configure transitions with optional approval gates
- [ ] Set automated actions on stage entry/exit
- [ ] Apply workflow to specific categories
- [ ] Activity logged: "Implementation Specialist {name} configured workflow: {name}"

---

#### US-010-034: Configure Routing Rules

As an **Implementation Specialist**, I want to configure automatic case routing
so that cases are assigned without manual triage.

**Acceptance Criteria:**
- [ ] Rule builder with conditions (category, location, severity, keywords)
- [ ] Multiple actions: assign to user, assign to team, escalate, notify
- [ ] Rule priority ordering
- [ ] Test rules against sample cases
- [ ] Activity logged: "Implementation Specialist {name} configured routing rule: {name}"

---

#### US-010-035: Configure Email Templates

As an **Implementation Specialist**, I want to customize email templates
so that client communications match their brand and tone.

**Acceptance Criteria:**
- [ ] Template library: case notifications, reminders, status updates, etc.
- [ ] Rich text editor with merge fields
- [ ] Preview with sample data
- [ ] Localization support (multiple languages per template)
- [ ] Activity logged: "Implementation Specialist {name} configured email template: {name}"

---

### Epic 5: Integration Setup

#### US-010-040: Configure SSO

As an **Implementation Specialist**, I want to configure SSO for the client
so that users authenticate via their identity provider.

**Acceptance Criteria:**
- [ ] Support Azure AD, Google Workspace, SAML, OIDC
- [ ] Guided setup wizard with provider-specific instructions
- [ ] Test connection before enabling
- [ ] Fallback to password authentication (configurable)
- [ ] Activity logged: "Implementation Specialist {name} configured SSO: {provider}"

---

#### US-010-041: Configure HRIS Integration

As an **Implementation Specialist**, I want to connect the client's HRIS
so that employee data syncs automatically.

**Acceptance Criteria:**
- [ ] Support Merge.dev unified API + direct integrations
- [ ] Guided setup for each supported HRIS
- [ ] Test connection and preview sample data
- [ ] Configure sync frequency and field mapping
- [ ] Initial sync execution with progress tracking
- [ ] Activity logged: "Implementation Specialist {name} configured HRIS integration: {provider}"

---

#### US-010-042: Configure SFTP for Data Feeds

As an **Implementation Specialist**, I want to set up SFTP for clients without API access
so that they can send employee data via file transfer.

**Acceptance Criteria:**
- [ ] Generate client-specific SFTP credentials
- [ ] Configure expected file format and schedule
- [ ] Set up file validation rules
- [ ] Configure error notifications
- [ ] Activity logged: "Implementation Specialist {name} configured SFTP feed for {client}"

---

### Epic 6: Training Administration

#### US-010-050: Assign Training Tracks

As an **Implementation Specialist**, I want to assign training tracks to client users
so that they're ready to use the platform.

**Acceptance Criteria:**
- [ ] View available training tracks (Admin, CCO, Investigator, Employee)
- [ ] Bulk assign tracks to users by role
- [ ] Set training due dates
- [ ] Send assignment notifications
- [ ] Activity logged: "Implementation Specialist {name} assigned {track} training to {count} users"

---

#### US-010-051: Track Training Progress

As an **Implementation Specialist**, I want to monitor training completion
so that I know when the team is ready for go-live.

**Acceptance Criteria:**
- [ ] Dashboard shows completion by user and track
- [ ] Progress indicators: Not Started, In Progress, Completed, Certified
- [ ] Filter by track, completion status, user
- [ ] Send reminder emails for incomplete training
- [ ] Export training report
- [ ] Activity not logged (read operation)

---

#### US-010-052: Schedule Live Training Sessions

As an **Implementation Specialist**, I want to schedule live training sessions
so that I can deliver hands-on training.

**Acceptance Criteria:**
- [ ] Create training session with date, time, attendees, agenda
- [ ] Send calendar invitations
- [ ] Link to video conferencing (Zoom, Teams, Google Meet)
- [ ] Track attendance
- [ ] Session notes and recordings can be attached
- [ ] Activity logged: "Implementation Specialist {name} scheduled training session: {title}"

---

#### US-010-053: Verify Certifications

As an **Implementation Specialist**, I want to verify user certifications before go-live
so that I know key users are trained.

**Acceptance Criteria:**
- [ ] View certification status per user
- [ ] Certification requirements per role
- [ ] Go-live checklist flag if required certifications missing
- [ ] Certification expiration tracking (1-year validity)
- [ ] Activity not logged (read operation)

---

### Epic 7: Go-Live Readiness

#### US-010-060: View Readiness Dashboard

As an **Implementation Specialist**, I want to see a go-live readiness dashboard
so that I know exactly what's left to do.

**Acceptance Criteria:**
- [ ] Visual readiness score (0-100%)
- [ ] Categories: Configuration, Integrations, Data, Users, Training, Testing
- [ ] Each category shows completion and blockers
- [ ] Clear list of incomplete items with owners
- [ ] Estimated completion date based on velocity
- [ ] Activity not logged (read operation)

---

#### US-010-061: Complete Go-Live Checklist

As an **Implementation Specialist**, I want to complete the go-live checklist
so that we have formal verification of readiness.

**Acceptance Criteria:**
- [ ] Checklist items from template (configurable per implementation type)
- [ ] Each item requires verification (manual check or automated)
- [ ] Evidence can be attached (screenshots, test results)
- [ ] Incomplete items block go-live approval
- [ ] Activity logged: "Implementation Specialist {name} completed checklist item: {item}"

---

#### US-010-062: Request Go-Live Approval

As an **Implementation Specialist**, I want to request go-live approval
so that the client can officially launch.

**Acceptance Criteria:**
- [ ] All required checklist items must be complete
- [ ] Submit for approval with notes
- [ ] Approval required from Implementation Specialist + Client Admin
- [ ] Email notifications to approvers
- [ ] Activity logged: "Implementation Specialist {name} requested go-live approval"

---

#### US-010-063: Execute Go-Live

As an **Implementation Specialist**, I want to execute go-live
so that the client's platform is officially active.

**Acceptance Criteria:**
- [ ] Requires all approvals obtained
- [ ] One-click go-live execution
- [ ] Actions: activate production settings, enable notifications, publish portal URL
- [ ] Go-live communication template sent to client
- [ ] Implementation project status changes to "Live"
- [ ] Activity logged: "Implementation Specialist {name} executed go-live for {client}"

---

### Epic 8: Client Visibility

#### US-010-070: Client Views Implementation Progress

As a **Client Admin**, I want to see my implementation progress
so that I understand timeline and my action items.

**Acceptance Criteria:**
- [ ] Read-only view of implementation dashboard
- [ ] Shows overall progress and phase status
- [ ] Lists client action items with due dates
- [ ] Shows assigned Implementation Specialist contact info
- [ ] Go-live date countdown
- [ ] Activity not logged (read operation)

---

#### US-010-071: Client Completes Action Items

As a **Client Admin**, I want to complete assigned action items
so that the implementation can progress.

**Acceptance Criteria:**
- [ ] View assigned tasks in Client Portal
- [ ] Mark tasks complete with optional notes
- [ ] Upload requested documents
- [ ] Provide approvals where needed
- [ ] Activity logged: "Client Admin {name} completed task: {task_name}"

---

### Epic 9: Handoff Process

#### US-010-080: Initiate Handoff to Client Success

As an **Implementation Specialist**, I want to initiate handoff to CSM
so that the client has ongoing support.

**Acceptance Criteria:**
- [ ] Available after go-live execution
- [ ] Handoff checklist with required items
- [ ] Client profile documentation required
- [ ] Assign CSM from team roster
- [ ] Schedule handoff call
- [ ] Activity logged: "Implementation Specialist {name} initiated handoff to {CSM_name}"

---

#### US-010-081: Complete Handoff Documentation

As an **Implementation Specialist**, I want to document implementation details
so that CSM has full context.

**Acceptance Criteria:**
- [ ] Client profile: key contacts, preferences, communication style
- [ ] Implementation notes: decisions made, customizations, known issues
- [ ] Migration summary: what was migrated, what wasn't, data quality notes
- [ ] Training summary: completion rates, recommended follow-up
- [ ] Structured template with required fields
- [ ] Activity logged: "Implementation Specialist {name} completed handoff documentation"

---

#### US-010-082: Close Implementation Project

As an **Implementation Specialist**, I want to close the implementation project
so that records are complete and metrics accurate.

**Acceptance Criteria:**
- [ ] Requires handoff complete
- [ ] Captures implementation satisfaction survey results
- [ ] Final metrics: actual duration, deviations from plan, lessons learned
- [ ] Project archived but viewable
- [ ] Activity logged: "Implementation Specialist {name} closed implementation for {client}"

---

#### US-010-083: Request Client Satisfaction Survey

As an **Implementation Manager**, I want to send satisfaction survey to clients
so that we measure implementation quality.

**Acceptance Criteria:**
- [ ] Survey sent automatically at go-live + N days (configurable)
- [ ] Standard questions: NPS, satisfaction by phase, specialist rating, comments
- [ ] Results linked to implementation project
- [ ] Aggregate results visible on manager dashboard
- [ ] Activity logged: "System sent satisfaction survey to {client}"

---

## 5. Feature Specifications

### F1: Implementation Project Management

**Description:**
Central hub for tracking all implementation work. Each client engagement creates an Implementation Project that tracks progress from sales handoff through go-live and CSM handoff.

**User Flow:**
1. Implementation Specialist creates new project (manual or from CRM)
2. System applies implementation template based on type selection
3. Specialist works through checklist tasks, updating progress
4. Dashboard reflects real-time status
5. At completion, go-live executed and handoff initiated

**Business Rules:**
- One active implementation project per Organization
- Implementation type determines checklist template
- Health status auto-calculated based on progress vs. timeline
- Blockers automatically affect health status
- Go-live requires all mandatory checklist items complete

**AI Integration:**
- AI suggests realistic timeline based on client profile and historical data
- AI identifies at-risk implementations based on velocity patterns
- AI recommends priority tasks based on dependencies and deadlines

**Error Handling:**
| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| Duplicate project for tenant | "An implementation project already exists for this client" | Offer to view existing project |
| Template not found | "Implementation template not available" | Use default template, log warning |
| CRM sync failed | "Unable to sync from CRM. Create manually?" | Offer manual creation |

---

### F2: Data Migration Tools

**Description:**
Comprehensive migration toolkit supporting import from competitor systems (NAVEX, Case IQ, EQS) and custom exports. Includes AI-assisted field mapping, value transformation, validation, and rollback capabilities.

**User Flow:**
1. Specialist selects source system type
2. Specialist uploads export file(s)
3. System analyzes file structure and auto-maps fields
4. Specialist reviews/adjusts field mappings
5. Specialist reviews/adjusts value mappings
6. System validates all records
7. Specialist reviews validation results and fixes issues
8. Specialist previews sample records
9. Specialist confirms and executes import
10. System imports data with restore point
11. Specialist verifies imported data
12. (If needed) Specialist rolls back import

**Business Rules:**
- All imports create restore point before execution
- Rollback available for 7 days after import
- All imported records tagged with source_system, source_record_id, migrated_at
- User references must be resolved before import execution
- Attachment migration separate from data migration
- Maximum 100,000 records per import batch

**AI Integration:**
- AI auto-detects source system from file structure
- AI suggests field mappings with confidence scores
- AI suggests value mappings using semantic similarity
- AI identifies data quality issues and suggests fixes
- AI learns from manual corrections to improve future suggestions

**Error Handling:**
| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| Unrecognized file format | "File format not supported. Expected CSV or Excel." | Show supported formats |
| Required column missing | "Required column {name} not found" | Block upload, show requirements |
| Validation errors > threshold | "{count} critical errors found. Please fix before import." | Block import until resolved |
| Import timeout | "Import taking longer than expected. Will continue in background." | Switch to background job |
| Rollback period expired | "Rollback window (7 days) has expired" | Disable rollback button |

---

### F3: Configuration Cloning

**Description:**
Enables copying configuration from template tenants or existing clients to accelerate setup. Supports selective cloning of categories, workflows, forms, templates, and settings.

**User Flow:**
1. Specialist selects target tenant
2. Specialist selects source tenant (template or existing)
3. Specialist chooses configuration types to clone
4. System shows preview of items to be copied
5. System identifies potential conflicts
6. Specialist confirms or adjusts selections
7. System executes clone operation
8. Specialist verifies cloned configuration

**Business Rules:**
- Cannot clone organization-specific settings (branding, domain, contacts)
- Cloned items preserve reference to source
- Conflicts (duplicate codes) flagged before execution
- Clone operation is atomic (all or nothing)
- User references in workflows converted to roles (not specific users)

**AI Integration:**
- AI identifies which settings should NOT be cloned based on client profile
- AI suggests source tenant based on client industry and size

**Error Handling:**
| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| Conflict detected | "Code '{code}' already exists in target tenant" | Offer to skip, rename, or overwrite |
| Source tenant unavailable | "Source tenant not accessible" | Block operation |
| Clone partially failed | "Some items failed to clone. See details." | Show success/failure summary |

---

### F4: Go-Live Readiness Assessment

**Description:**
Comprehensive dashboard and checklist system that tracks all go-live prerequisites across configuration, integrations, data, users, training, and testing categories.

**User Flow:**
1. System auto-populates readiness checklist from implementation template
2. Specialist works through checklist items
3. Some items auto-verified (e.g., SSO configured)
4. Manual items require specialist verification
5. Dashboard shows real-time readiness score
6. When 100% complete, go-live approval can be requested
7. Approvals obtained from specialist and client
8. Go-live executed

**Business Rules:**
- Readiness score calculated as: (completed_items / total_items) * 100
- Mandatory items must all be complete for go-live
- Blockers reduce effective readiness score
- Client approval required for go-live
- Go-live date captured for SLA metrics

**AI Integration:**
- AI predicts go-live date based on completion velocity
- AI identifies items likely to cause delays
- AI suggests optimal task order for fastest path to go-live

---

### F5: Training Administration

**Description:**
Integrated training management for client onboarding. Tracks training assignments, progress, and certifications with both self-paced and live delivery options.

**User Flow:**
1. Specialist assigns training tracks to users based on roles
2. Users receive notification with training access
3. Users complete self-paced modules
4. Specialist tracks completion on dashboard
5. Specialist schedules live sessions as needed
6. Users complete certification exams
7. Specialist verifies certification status for go-live

**Business Rules:**
- Training tracks determined by user role
- Certification requires 80% exam score
- Certifications valid for 1 year
- Required certifications must be complete for go-live
- Training completion tracked per user and track

**AI Integration:**
- AI identifies users at risk of not completing training before go-live
- AI suggests additional training based on user activity patterns

---

## 6. Data Model

### 6.1 Implementation Project

**Purpose:** Tracks the overall implementation engagement for a client

```prisma
model ImplementationProject {
  id                    String   @id @default(uuid())
  organization_id       String   @unique // One active project per tenant
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Project Identity
  name                  String                    // "Acme Corp Implementation"
  reference_number      String   @unique         // "IMP-2026-00042"

  // Classification
  implementation_type   ImplementationType        // Quick Start, Standard, Complex, Enterprise
  template_id           String?
  template              ImplementationTemplate? @relation(fields: [template_id], references: [id])

  // Timeline
  started_at            DateTime                  // When project kicked off
  target_go_live        DateTime                  // Target go-live date
  actual_go_live        DateTime?                 // Actual go-live date
  closed_at             DateTime?                 // When project closed

  // Status
  status                ImplementationStatus      // Not Started, In Progress, Go-Live Ready, Live, Closed
  status_rationale      String?                   // Why status changed
  health_status         HealthStatus              // On Track, At Risk, Blocked

  // Assignment
  specialist_id         String                    // Primary Implementation Specialist
  specialist            User @relation("SpecialistProjects", fields: [specialist_id], references: [id])
  architect_id          String?                   // Solution Architect (if assigned)
  architect             User? @relation("ArchitectProjects", fields: [architect_id], references: [id])
  csm_id                String?                   // Assigned CSM (post-go-live)
  csm                   User? @relation("CSMProjects", fields: [csm_id], references: [id])

  // Progress
  progress_percentage   Int      @default(0)      // Calculated from checklist
  readiness_score       Int      @default(0)      // Go-live readiness percentage

  // CRM Integration
  crm_deal_id           String?                   // Reference to CRM deal
  crm_sync_at           DateTime?                 // Last CRM sync

  // Satisfaction
  nps_score             Int?                      // Net Promoter Score from survey
  satisfaction_score    Decimal?                  // Overall satisfaction (1-5)
  survey_completed_at   DateTime?

  // Notes
  notes                 String?                   // General notes
  lessons_learned       String?                   // Post-implementation reflection

  // AI Fields
  ai_predicted_go_live  DateTime?                 // AI-predicted go-live date
  ai_risk_factors       Json?                     // AI-identified risks
  ai_generated_at       DateTime?
  ai_model_version      String?

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String
  updated_by_id         String

  // Relations
  phases                ImplementationPhase[]
  tasks                 ImplementationTask[]
  blockers              ImplementationBlocker[]
  migrations            MigrationBatch[]
  training_sessions     TrainingSession[]
  approvals             ImplementationApproval[]
  activities            ImplementationActivity[]

  @@index([status])
  @@index([specialist_id])
  @@index([target_go_live])
  @@index([health_status])
}

enum ImplementationType {
  QUICK_START           // 2-4 weeks
  STANDARD              // 4-8 weeks
  COMPLEX               // 8-16 weeks
  ENTERPRISE            // 3-6 months
}

enum ImplementationStatus {
  NOT_STARTED
  IN_PROGRESS
  GO_LIVE_READY
  LIVE
  HANDOFF_IN_PROGRESS
  CLOSED
  ON_HOLD
  CANCELLED
}

enum HealthStatus {
  ON_TRACK              // Green
  AT_RISK               // Yellow
  BLOCKED               // Red
  NOT_STARTED           // Gray
}
```

### 6.2 Implementation Template

**Purpose:** Defines reusable implementation templates with phases and tasks

```prisma
model ImplementationTemplate {
  id                    String   @id @default(uuid())

  // Identity
  name                  String                    // "Standard Implementation"
  description           String?
  implementation_type   ImplementationType

  // Configuration
  default_duration_days Int                       // Expected duration
  is_active             Boolean  @default(true)
  is_system             Boolean  @default(false)  // System-managed template

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String?
  updated_by_id         String?

  // Relations
  phases                ImplementationTemplatePhase[]
  projects              ImplementationProject[]

  @@index([implementation_type])
  @@index([is_active])
}

model ImplementationTemplatePhase {
  id                    String   @id @default(uuid())
  template_id           String
  template              ImplementationTemplate @relation(fields: [template_id], references: [id])

  // Identity
  name                  String                    // "Foundation", "Data Migration", etc.
  description           String?
  phase_number          Int                       // Order in template

  // Configuration
  default_duration_days Int?
  is_required           Boolean  @default(true)

  // Relations
  tasks                 ImplementationTemplateTask[]

  @@unique([template_id, phase_number])
}

model ImplementationTemplateTask {
  id                    String   @id @default(uuid())
  phase_id              String
  phase                 ImplementationTemplatePhase @relation(fields: [phase_id], references: [id])

  // Identity
  name                  String                    // "Configure SSO"
  description           String?
  task_number           Int                       // Order in phase

  // Configuration
  default_duration_days Int?
  is_required           Boolean  @default(true)
  is_client_task        Boolean  @default(false)  // Assigned to client, not specialist
  assigned_role         String?                   // Default role assignment
  category              TaskCategory              // Configuration, Integration, etc.

  // Dependencies
  depends_on            String[]                  // Task IDs this depends on

  // Verification
  verification_type     VerificationType          // Manual, Automated, None
  verification_details  String?                   // What to check

  @@unique([phase_id, task_number])
}

enum TaskCategory {
  CONFIGURATION
  INTEGRATION
  MIGRATION
  TRAINING
  TESTING
  DOCUMENTATION
  APPROVAL
}

enum VerificationType {
  MANUAL                // Requires human verification
  AUTOMATED             // System can verify automatically
  NONE                  // No verification needed
}
```

### 6.3 Implementation Phase and Task

**Purpose:** Tracks actual implementation progress per project

```prisma
model ImplementationPhase {
  id                    String   @id @default(uuid())
  project_id            String
  project               ImplementationProject @relation(fields: [project_id], references: [id])

  // Identity
  name                  String
  description           String?
  phase_number          Int

  // Status
  status                PhaseStatus               // Not Started, In Progress, Complete
  started_at            DateTime?
  completed_at          DateTime?

  // Timeline
  target_start_date     DateTime?
  target_end_date       DateTime?

  // Progress
  progress_percentage   Int      @default(0)

  // Relations
  tasks                 ImplementationTask[]

  @@unique([project_id, phase_number])
  @@index([project_id])
  @@index([status])
}

enum PhaseStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETE
  SKIPPED
}

model ImplementationTask {
  id                    String   @id @default(uuid())
  project_id            String
  project               ImplementationProject @relation(fields: [project_id], references: [id])
  phase_id              String
  phase                 ImplementationPhase @relation(fields: [phase_id], references: [id])

  // Identity
  name                  String
  description           String?
  task_number           Int

  // Assignment
  assigned_to_id        String?                   // Ethico user
  assigned_to           User? @relation(fields: [assigned_to_id], references: [id])
  is_client_task        Boolean  @default(false)
  client_contact_email  String?                   // If client task, who's responsible

  // Classification
  category              TaskCategory
  is_required           Boolean  @default(true)
  is_blocker            Boolean  @default(false)  // If incomplete, blocks go-live

  // Status
  status                TaskStatus
  status_rationale      String?
  started_at            DateTime?
  completed_at          DateTime?
  completed_by_id       String?
  completed_by          User? @relation("TaskCompletedBy", fields: [completed_by_id], references: [id])

  // Timeline
  due_date              DateTime?

  // Verification
  verification_type     VerificationType
  verification_passed   Boolean?
  verification_notes    String?
  verified_at           DateTime?
  verified_by_id        String?

  // Dependencies
  depends_on_task_ids   String[]

  // Attachments and Notes
  notes                 String?
  attachments           Json?                     // Array of file references

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Relations
  blocker               ImplementationBlocker?

  @@unique([phase_id, task_number])
  @@index([project_id])
  @@index([status])
  @@index([assigned_to_id])
  @@index([due_date])
}

enum TaskStatus {
  NOT_STARTED
  IN_PROGRESS
  PENDING_VERIFICATION
  COMPLETE
  SKIPPED
  BLOCKED
}
```

### 6.4 Implementation Blocker

**Purpose:** Tracks issues that block implementation progress

```prisma
model ImplementationBlocker {
  id                    String   @id @default(uuid())
  project_id            String
  project               ImplementationProject @relation(fields: [project_id], references: [id])
  task_id               String?  @unique
  task                  ImplementationTask? @relation(fields: [task_id], references: [id])

  // Identity
  title                 String
  description           String

  // Classification
  severity              BlockerSeverity           // Critical, High, Medium, Low
  category              BlockerCategory           // Client, Technical, Data, Resource, Other

  // Ownership
  owner_id              String?                   // Who's responsible for resolution
  owner                 User? @relation(fields: [owner_id], references: [id])
  escalated_to_id       String?                   // If escalated
  escalated_to          User? @relation("BlockerEscalation", fields: [escalated_to_id], references: [id])

  // Status
  status                BlockerStatus             // Open, In Progress, Resolved
  resolution_notes      String?
  expected_resolution   DateTime?
  resolved_at           DateTime?
  resolved_by_id        String?

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String
  escalated_at          DateTime?

  @@index([project_id])
  @@index([status])
  @@index([severity])
}

enum BlockerSeverity {
  CRITICAL              // Blocks go-live
  HIGH                  // Significant delay
  MEDIUM                // Minor delay
  LOW                   // Inconvenience
}

enum BlockerCategory {
  CLIENT                // Client action needed
  TECHNICAL             // Technical issue
  DATA                  // Data quality issue
  RESOURCE              // Resource constraint
  VENDOR                // Third-party dependency
  OTHER
}

enum BlockerStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  WONT_FIX
}
```

### 6.5 Migration Batch

**Purpose:** Tracks data migration operations

```prisma
model MigrationBatch {
  id                    String   @id @default(uuid())
  project_id            String
  project               ImplementationProject @relation(fields: [project_id], references: [id])
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Identity
  name                  String                    // "Cases Migration Batch 1"
  reference_number      String   @unique         // "MIG-2026-00042-001"

  // Source
  source_system         SourceSystem              // NAVEX, EQS, CaseIQ, etc.
  source_file_names     String[]                  // Uploaded file names
  source_record_count   Int                       // Records in source file

  // Data Type
  data_type             MigrationDataType         // Cases, Investigations, Disclosures, etc.

  // Mapping
  field_mapping         Json                      // { source_field: target_field }
  value_mapping         Json                      // { field: { source_value: target_value } }
  user_mapping          Json?                     // { source_user_id: target_user_id }
  mapping_notes         String?

  // Validation
  validation_status     ValidationStatus
  validation_errors     Int      @default(0)
  validation_warnings   Int      @default(0)
  validation_results    Json?                     // Detailed validation output
  validated_at          DateTime?

  // Import
  import_status         ImportStatus
  imported_count        Int?                      // Records successfully imported
  failed_count          Int?                      // Records that failed
  import_started_at     DateTime?
  import_completed_at   DateTime?
  import_errors         Json?                     // Array of import errors

  // Restore Point
  restore_point_id      String?
  rollback_available    Boolean  @default(false)
  rollback_expires_at   DateTime?
  rolled_back_at        DateTime?
  rolled_back_by_id     String?

  // AI Assistance
  ai_field_mapping      Json?                     // AI-suggested mappings
  ai_confidence_scores  Json?                     // Confidence per mapping
  ai_data_issues        Json?                     // AI-detected data quality issues

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String
  updated_by_id         String

  // Relations
  attachments           MigrationAttachment[]

  @@index([project_id])
  @@index([organization_id])
  @@index([import_status])
  @@index([source_system])
}

enum SourceSystem {
  NAVEX_ETHICSPOINT
  EQS_INTEGRITY_LINE
  CASE_IQ
  ONETRUST_ETHICS
  CONVERCENT
  SAI_GLOBAL
  EXCEL_CSV
  CUSTOM
}

enum MigrationDataType {
  CASES
  INVESTIGATIONS
  DISCLOSURES
  POLICIES
  ATTESTATIONS
  USERS
  CATEGORIES
  LOCATIONS
}

enum ValidationStatus {
  PENDING
  IN_PROGRESS
  PASSED
  PASSED_WITH_WARNINGS
  FAILED
}

enum ImportStatus {
  NOT_STARTED
  VALIDATING
  READY_TO_IMPORT
  IN_PROGRESS
  COMPLETED
  COMPLETED_WITH_ERRORS
  FAILED
  ROLLED_BACK
}

model MigrationAttachment {
  id                    String   @id @default(uuid())
  batch_id              String
  batch                 MigrationBatch @relation(fields: [batch_id], references: [id])

  // File Info
  file_name             String
  file_size             Int
  file_type             String
  storage_path          String
  checksum              String?

  // Status
  processed             Boolean  @default(false)
  linked_count          Int?                      // Attachments successfully linked
  error_count           Int?

  // Timestamps
  uploaded_at           DateTime @default(now())
  processed_at          DateTime?

  @@index([batch_id])
}
```

### 6.6 Training Entities

**Purpose:** Tracks training assignments and completions

```prisma
model TrainingSession {
  id                    String   @id @default(uuid())
  project_id            String
  project               ImplementationProject @relation(fields: [project_id], references: [id])
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Identity
  title                 String                    // "Admin Training - Session 1"
  description           String?

  // Classification
  track                 TrainingTrack             // Admin, CCO, Investigator, Employee
  session_type          SessionType               // Live, Self-Paced

  // Schedule (for live sessions)
  scheduled_at          DateTime?
  duration_minutes      Int?
  meeting_url           String?                   // Zoom/Teams link
  meeting_id            String?                   // Calendar event ID

  // Content
  agenda                String?
  materials_url         String?                   // Link to training materials
  recording_url         String?                   // Post-session recording

  // Facilitator
  facilitator_id        String?
  facilitator           User? @relation(fields: [facilitator_id], references: [id])

  // Status
  status                SessionStatus
  notes                 String?                   // Session notes

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String

  // Relations
  attendees             TrainingAttendee[]

  @@index([project_id])
  @@index([organization_id])
  @@index([track])
  @@index([scheduled_at])
}

enum TrainingTrack {
  ADMIN
  CCO_COMPLIANCE
  INVESTIGATOR
  EMPLOYEE
}

enum SessionType {
  LIVE
  SELF_PACED
}

enum SessionStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model TrainingAttendee {
  id                    String   @id @default(uuid())
  session_id            String
  session               TrainingSession @relation(fields: [session_id], references: [id])
  user_id               String
  user                  User @relation(fields: [user_id], references: [id])

  // Status
  status                AttendeeStatus
  joined_at             DateTime?
  left_at               DateTime?
  duration_minutes      Int?

  // Feedback
  feedback_rating       Int?                      // 1-5
  feedback_comments     String?

  // Timestamps
  invited_at            DateTime @default(now())

  @@unique([session_id, user_id])
  @@index([session_id])
  @@index([user_id])
}

enum AttendeeStatus {
  INVITED
  CONFIRMED
  ATTENDED
  NO_SHOW
  EXCUSED
}

model TrainingAssignment {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])
  user_id               String
  user                  User @relation(fields: [user_id], references: [id])

  // Assignment
  track                 TrainingTrack
  assigned_by_id        String
  assigned_at           DateTime @default(now())
  due_date              DateTime?

  // Progress
  status                AssignmentStatus
  progress_percentage   Int      @default(0)
  started_at            DateTime?
  completed_at          DateTime?

  // Certification
  is_certified          Boolean  @default(false)
  certification_score   Decimal?                  // Exam score (0-100)
  certified_at          DateTime?
  certification_expires DateTime?                 // Typically 1 year

  // Reminders
  last_reminder_at      DateTime?
  reminder_count        Int      @default(0)

  @@unique([organization_id, user_id, track])
  @@index([organization_id])
  @@index([user_id])
  @@index([status])
  @@index([due_date])
}

enum AssignmentStatus {
  NOT_STARTED
  IN_PROGRESS
  PENDING_EXAM
  COMPLETED
  CERTIFIED
  EXPIRED
}
```

### 6.7 Implementation Approval

**Purpose:** Tracks approvals for go-live and other gates

```prisma
model ImplementationApproval {
  id                    String   @id @default(uuid())
  project_id            String
  project               ImplementationProject @relation(fields: [project_id], references: [id])

  // Identity
  approval_type         ApprovalType              // Go-Live, Phase Completion, etc.
  name                  String                    // Display name

  // Status
  status                ApprovalStatus
  requested_at          DateTime?
  requested_by_id       String?

  // Approvers
  approver_type         ApproverType              // Ethico, Client, Both
  ethico_approver_id    String?
  ethico_approver       User? @relation("EthicoApprover", fields: [ethico_approver_id], references: [id])
  ethico_approved_at    DateTime?
  ethico_notes          String?

  client_approver_email String?
  client_approver_name  String?
  client_approved_at    DateTime?
  client_notes          String?

  // Notes
  notes                 String?
  rejection_reason      String?

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  @@index([project_id])
  @@index([status])
  @@index([approval_type])
}

enum ApprovalType {
  GO_LIVE
  PHASE_COMPLETION
  DATA_MIGRATION
  CONFIGURATION_SIGN_OFF
  HANDOFF
}

enum ApprovalStatus {
  NOT_REQUIRED
  PENDING
  AWAITING_ETHICO
  AWAITING_CLIENT
  APPROVED
  REJECTED
}

enum ApproverType {
  ETHICO_ONLY
  CLIENT_ONLY
  BOTH
}
```

### 6.8 Implementation Activity Log

**Purpose:** Immutable audit trail for all implementation actions

```prisma
model ImplementationActivity {
  id                    String   @id @default(uuid())
  project_id            String
  project               ImplementationProject @relation(fields: [project_id], references: [id])

  // Action
  action                String                    // 'task_completed', 'migration_started', etc.
  action_description    String                    // Natural language: "John completed Configure SSO"
  action_category       ImplementationActionCategory

  // Actor
  actor_user_id         String?
  actor_user            User? @relation(fields: [actor_user_id], references: [id])
  actor_type            ActorType                 // USER, SYSTEM, AI

  // Entity Reference
  entity_type           String?                   // 'task', 'migration', 'blocker', etc.
  entity_id             String?

  // Change Details
  changes               Json?                     // { field: { old, new } }
  context               Json?                     // Additional context

  // Metadata
  ip_address            String?
  user_agent            String?

  // Timestamp (immutable)
  created_at            DateTime @default(now())

  @@index([project_id, created_at])
  @@index([project_id, action_category])
}

enum ImplementationActionCategory {
  PROJECT              // Project-level actions
  TASK                 // Task actions
  MIGRATION            // Migration actions
  TRAINING             // Training actions
  APPROVAL             // Approval actions
  BLOCKER              // Blocker actions
  CONFIGURATION        // Configuration actions
  SYSTEM               // System-generated
}
```

---

## 7. API Specifications

### 7.1 Implementation Project Endpoints

```
# Project Management
GET     /api/v1/impl/projects                    # List projects (filtered, paginated)
POST    /api/v1/impl/projects                    # Create project
GET     /api/v1/impl/projects/{id}               # Get project detail
PATCH   /api/v1/impl/projects/{id}               # Update project
DELETE  /api/v1/impl/projects/{id}               # Soft delete project

# Project Status
POST    /api/v1/impl/projects/{id}/status        # Update status
GET     /api/v1/impl/projects/{id}/health        # Get health assessment
GET     /api/v1/impl/projects/{id}/timeline      # Get activity timeline

# Project Assignment
POST    /api/v1/impl/projects/{id}/assign        # Assign specialist/architect
POST    /api/v1/impl/projects/{id}/handoff       # Initiate CSM handoff
```

**Create Project Request:**
```json
POST /api/v1/impl/projects

{
  "organization_id": "uuid",
  "name": "Acme Corp Implementation",
  "implementation_type": "STANDARD",
  "target_go_live": "2026-04-15T00:00:00Z",
  "specialist_id": "uuid",
  "crm_deal_id": "CRM-12345",
  "notes": "Migrating from NAVEX, 3000 historical cases"
}

Response (201):
{
  "id": "uuid",
  "reference_number": "IMP-2026-00042",
  "organization_id": "uuid",
  "name": "Acme Corp Implementation",
  "implementation_type": "STANDARD",
  "status": "NOT_STARTED",
  "health_status": "NOT_STARTED",
  "progress_percentage": 0,
  "target_go_live": "2026-04-15T00:00:00Z",
  "specialist": {
    "id": "uuid",
    "name": "Jane Smith"
  },
  "phases": [...],
  "created_at": "2026-02-01T10:00:00Z"
}
```

### 7.2 Task Endpoints

```
# Task Management
GET     /api/v1/impl/projects/{id}/tasks         # List tasks
GET     /api/v1/impl/tasks/{id}                  # Get task detail
PATCH   /api/v1/impl/tasks/{id}                  # Update task
POST    /api/v1/impl/tasks/{id}/complete         # Mark task complete
POST    /api/v1/impl/tasks/{id}/assign           # Assign task

# Task Dependencies
GET     /api/v1/impl/tasks/{id}/dependencies     # Get dependency graph
POST    /api/v1/impl/tasks/{id}/skip             # Skip task (with reason)
```

**Complete Task Request:**
```json
POST /api/v1/impl/tasks/{id}/complete

{
  "verification_notes": "SSO configured and tested successfully",
  "attachments": [
    {
      "file_name": "sso-test-results.pdf",
      "storage_path": "impl/IMP-2026-00042/sso-test-results.pdf"
    }
  ]
}

Response (200):
{
  "id": "uuid",
  "name": "Configure SSO",
  "status": "COMPLETE",
  "completed_at": "2026-02-01T14:30:00Z",
  "completed_by": {
    "id": "uuid",
    "name": "Jane Smith"
  },
  "verification_passed": true
}
```

### 7.3 Migration Endpoints

```
# Migration Batch Management
GET     /api/v1/impl/projects/{id}/migrations    # List migration batches
POST    /api/v1/impl/projects/{id}/migrations    # Create migration batch
GET     /api/v1/impl/migrations/{id}             # Get batch detail
DELETE  /api/v1/impl/migrations/{id}             # Delete batch

# Migration Workflow
POST    /api/v1/impl/migrations/{id}/upload      # Upload source file
POST    /api/v1/impl/migrations/{id}/analyze     # Analyze file structure
GET     /api/v1/impl/migrations/{id}/mapping     # Get current mapping
PUT     /api/v1/impl/migrations/{id}/mapping     # Update mapping
POST    /api/v1/impl/migrations/{id}/validate    # Run validation
GET     /api/v1/impl/migrations/{id}/preview     # Preview sample records
POST    /api/v1/impl/migrations/{id}/import      # Execute import
POST    /api/v1/impl/migrations/{id}/rollback    # Rollback import

# AI Assistance
POST    /api/v1/impl/migrations/{id}/ai/suggest-mapping    # Get AI mapping suggestions
POST    /api/v1/impl/migrations/{id}/ai/detect-issues      # Detect data quality issues
```

**Analyze File Response:**
```json
POST /api/v1/impl/migrations/{id}/analyze

Response (200):
{
  "source_system": "NAVEX_ETHICSPOINT",
  "confidence": 0.95,
  "record_count": 2450,
  "columns": [
    {
      "name": "Case_ID",
      "type": "string",
      "sample_values": ["2024-00001", "2024-00002"],
      "null_count": 0,
      "unique_count": 2450
    },
    {
      "name": "Incident_Type",
      "type": "string",
      "sample_values": ["Harassment", "Theft", "Safety"],
      "null_count": 12,
      "unique_count": 15
    }
  ],
  "ai_suggested_mapping": {
    "Case_ID": {
      "target_field": "source_record_id",
      "confidence": 0.98,
      "reason": "Unique identifier field"
    },
    "Incident_Type": {
      "target_field": "category",
      "confidence": 0.85,
      "reason": "Category classification field",
      "requires_value_mapping": true
    }
  }
}
```

**Validate Response:**
```json
POST /api/v1/impl/migrations/{id}/validate

Response (200):
{
  "status": "PASSED_WITH_WARNINGS",
  "summary": {
    "total_records": 2450,
    "valid_records": 2438,
    "error_count": 0,
    "warning_count": 12
  },
  "errors": [],
  "warnings": [
    {
      "row": 145,
      "field": "Incident_Type",
      "value": null,
      "message": "Required field is empty",
      "suggestion": "Will default to 'Other'"
    }
  ],
  "validated_at": "2026-02-01T15:00:00Z"
}
```

### 7.4 Training Endpoints

```
# Training Management
GET     /api/v1/impl/projects/{id}/training      # Get training overview
POST    /api/v1/impl/projects/{id}/training/assign    # Bulk assign training
GET     /api/v1/impl/training/assignments        # List assignments (with filters)
PATCH   /api/v1/impl/training/assignments/{id}   # Update assignment

# Training Sessions
POST    /api/v1/impl/projects/{id}/training/sessions  # Schedule session
GET     /api/v1/impl/training/sessions/{id}      # Get session detail
PATCH   /api/v1/impl/training/sessions/{id}      # Update session
POST    /api/v1/impl/training/sessions/{id}/attendance  # Record attendance

# Reminders
POST    /api/v1/impl/training/assignments/{id}/remind  # Send reminder
POST    /api/v1/impl/projects/{id}/training/bulk-remind  # Send bulk reminders
```

### 7.5 Go-Live Endpoints

```
# Readiness
GET     /api/v1/impl/projects/{id}/readiness     # Get readiness dashboard
GET     /api/v1/impl/projects/{id}/checklist     # Get go-live checklist
PATCH   /api/v1/impl/projects/{id}/checklist/{item_id}  # Update checklist item

# Approvals
POST    /api/v1/impl/projects/{id}/go-live/request      # Request go-live approval
POST    /api/v1/impl/approvals/{id}/approve             # Approve
POST    /api/v1/impl/approvals/{id}/reject              # Reject

# Go-Live Execution
POST    /api/v1/impl/projects/{id}/go-live/execute      # Execute go-live
```

### 7.6 Blocker Endpoints

```
GET     /api/v1/impl/projects/{id}/blockers      # List blockers
POST    /api/v1/impl/projects/{id}/blockers      # Create blocker
GET     /api/v1/impl/blockers/{id}               # Get blocker detail
PATCH   /api/v1/impl/blockers/{id}               # Update blocker
POST    /api/v1/impl/blockers/{id}/escalate      # Escalate blocker
POST    /api/v1/impl/blockers/{id}/resolve       # Resolve blocker
```

### 7.7 Configuration Cloning Endpoints

```
POST    /api/v1/impl/projects/{id}/clone         # Clone configuration
GET     /api/v1/impl/clone/preview               # Preview clone operation
GET     /api/v1/impl/clone/templates             # List available template tenants
```

**Clone Request:**
```json
POST /api/v1/impl/projects/{id}/clone

{
  "source_organization_id": "uuid",
  "items": [
    { "type": "CATEGORIES", "include": true },
    { "type": "WORKFLOWS", "include": true },
    { "type": "EMAIL_TEMPLATES", "include": true },
    { "type": "INVESTIGATION_TEMPLATES", "include": true },
    { "type": "FORMS", "include": false }
  ],
  "options": {
    "overwrite_existing": false,
    "rename_conflicts": true
  }
}

Response (200):
{
  "status": "SUCCESS",
  "summary": {
    "categories": { "created": 15, "skipped": 0, "errors": 0 },
    "workflows": { "created": 3, "skipped": 0, "errors": 0 },
    "email_templates": { "created": 8, "skipped": 0, "errors": 0 },
    "investigation_templates": { "created": 5, "skipped": 0, "errors": 0 }
  },
  "warnings": [
    "Workflow 'High Severity' references user 'john@template.com' - converted to role 'COMPLIANCE_OFFICER'"
  ]
}
```

---

## 8. UI/UX Specifications

### Navigation Placement

The Implementation Portal is accessible only to Ethico staff with implementation roles. It appears as a dedicated section in the navigation:

```
MAIN NAVIGATION
├── Dashboard
├── Operator Console (if operator role)
├── Implementation  <-- Implementation Portal section
│   ├── Projects
│   ├── Migrations
│   └── Training
├── Client Health (if CSM role)
└── Settings
```

### Key Screens

#### Implementation Dashboard

- **Purpose:** Overview of all assigned implementations
- **Components:**
  - Summary cards: Active, At Risk, Blocked counts
  - Project list with columns: Client, Type, Progress, Target Date, Health, Specialist
  - Quick filters: My Projects, All Projects, By Status, By Type
  - Search by client name
  - Sort by target date, health status, progress
  - Bulk actions: Send reminder, Reassign

#### Project Detail View

- **Purpose:** Complete view of single implementation
- **Layout:**
  - Header: Client name, status badge, health indicator, key dates
  - Progress bar with phase indicators
  - Tab navigation: Overview, Tasks, Migrations, Training, Blockers, Activity
  - Overview tab: Key metrics, next actions, recent activity
  - Sidebar: Quick actions, team contacts, go-live countdown

#### Migration Wizard

- **Purpose:** Guided data migration workflow
- **Layout:**
  - Step indicator: Upload > Analyze > Map Fields > Map Values > Validate > Preview > Import
  - Main content area for current step
  - Navigation: Previous, Next, Save & Exit
  - Side panel: AI suggestions, tips, help

#### Field Mapping Screen

- **Purpose:** Map source fields to Ethico fields
- **Components:**
  - Two-column layout: Source Fields | Target Fields
  - Each source field shows: Name, type, sample values, AI suggestion
  - Drag-drop or dropdown to select target field
  - Confidence indicator (high/medium/low)
  - Unmapped fields highlighted
  - Bulk actions: Auto-map all, Clear all

#### Go-Live Readiness Dashboard

- **Purpose:** Track all go-live prerequisites
- **Components:**
  - Readiness score prominently displayed (0-100%)
  - Category cards: Configuration, Integrations, Data, Training, Testing
  - Each category shows: completion %, incomplete items, blockers
  - Checklist view with verification status
  - Blocker summary with owners
  - Predicted go-live date (AI)
  - Go-Live button (enabled when 100% ready)

### AI Panel Design

- **Location:** Right sidebar, collapsible, available on all implementation screens
- **Content:**
  - Context-aware suggestions based on current task
  - Similar implementations for reference
  - Predicted issues based on patterns
  - Chat interface for questions
- **User Controls:**
  - Refresh suggestions
  - Dismiss specific suggestions
  - Expand/collapse panel

### Accessibility

- All interactive elements keyboard accessible
- ARIA labels on dynamic content
- Color not sole indicator of status (icons + text)
- Screen reader friendly table structures

---

## 9. Migration Considerations

### Data Mapping from Competitor Systems

#### NAVEX EthicsPoint Mapping

| Source Field | Target Field | Transformation |
|--------------|--------------|----------------|
| Case_ID | source_record_id | Direct (preserve as reference) |
| Report_Date | riu.received_at | Date format: MM/DD/YYYY to ISO8601 |
| Incident_Type | case.category_id | Value mapping required |
| Incident_Description | riu.details | Direct (rich text preserved) |
| Reporter_Type | riu.reporter_type | Value mapping: "Anonymous"->anonymous |
| Case_Status | case.status | Value mapping (see below) |
| Assigned_To | case.assigned_to_id | User resolution required |
| Resolution_Date | case.closed_at | Date format conversion |
| Location_Code | case.location_id | Location resolution |
| Attachments | investigation_attachments | Separate upload process |

**NAVEX Status Mapping:**

| NAVEX Status | Ethico Status |
|--------------|---------------|
| Open | open |
| In Progress | under_investigation |
| Pending Review | pending_review |
| Closed - Substantiated | closed_substantiated |
| Closed - Unsubstantiated | closed_unsubstantiated |
| Closed - Inconclusive | closed_insufficient_evidence |

#### EQS Integrity Line Mapping

| Source Field | Target Field | Transformation |
|--------------|--------------|----------------|
| report_id | source_record_id | Direct |
| created_date | riu.received_at | ISO8601 format |
| category | case.category_id | Value mapping required |
| description | riu.details | Direct |
| anonymous | riu.reporter_type | Boolean to enum |
| status | case.status | Value mapping required |
| assignee_email | case.assigned_to_id | User lookup by email |

#### Case IQ Mapping

| Source Field | Target Field | Transformation |
|--------------|--------------|----------------|
| CaseNumber | source_record_id | Direct |
| DateOpened | riu.received_at | Date conversion |
| CaseType | case.category_id | Value mapping |
| Summary | riu.details | Direct |
| Status | case.status | Value mapping |
| Investigator | case.assigned_to_id | User resolution |

### Handling Sparse Data

| Field | If Missing | Default/Fallback |
|-------|------------|------------------|
| Category | Use "Other/Uncategorized" | Create if doesn't exist |
| Location | Leave null | Optional field |
| Assigned To | Leave null | Will need manual assignment |
| Severity | Set to "Medium" | Configurable default |
| Reporter Type | Set to "Unknown" | Enum value |
| Close Date | Leave null | Open cases |
| Attachments | Skip | Log warning, don't block |

### Post-Migration AI Enrichment

After migration, AI can:
- [ ] Generate summaries for imported cases lacking them
- [ ] Suggest categorization for "Other" category cases
- [ ] Identify potential duplicates across import batches
- [ ] Flag data quality issues (missing required fields)
- [ ] Detect subject patterns across imported cases
- [ ] Reconcile user references not automatically matched

---

## 10. Integration Points

### Internal Module Integrations

| Module | Integration Type | Data Exchanged |
|--------|------------------|----------------|
| Case Management | Import target | Migrated cases, investigations |
| Disclosures | Import target | Migrated disclosure records |
| Policy Management | Import target | Migrated policies |
| Core Data Model | Configuration | Users, categories, locations |
| Analytics | Feed | Implementation metrics |
| Operator Console | Configuration | Hotline settings, directives |

### External System Integrations

| System | Integration Method | Sync Frequency |
|--------|-------------------|----------------|
| CRM (Salesforce/HubSpot) | REST API | On-demand / Webhook |
| Calendar (Google/Outlook) | OAuth + API | Real-time |
| Video Conferencing | OAuth | Session scheduling |
| HRIS (via Merge.dev) | REST API | During integration setup |
| Azure Blob Storage | SDK | File upload/download |

### Migration Source System Adapters

| Source System | Adapter Status | Special Considerations |
|---------------|----------------|----------------------|
| NAVEX EthicsPoint | Built-in | Multiple export formats supported |
| EQS Integrity Line | Built-in | XML and CSV formats |
| Case IQ | Built-in | Standard export format |
| OneTrust Ethics | Planned | API integration possible |
| Convercent | Planned | Export format varies |
| Generic CSV/Excel | Built-in | Template-based mapping |

---

## 11. Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| Dashboard load | < 2 seconds |
| Migration file upload (100MB) | < 30 seconds |
| Migration validation (10K records) | < 60 seconds |
| Field mapping UI | < 500ms response |
| Import execution (10K records) | < 5 minutes |
| Training dashboard load | < 2 seconds |

### Security

- Implementation Portal accessible only with `implementation_specialist`, `solution_architect`, or `implementation_manager` roles
- Cross-tenant access controlled via explicit project assignment
- Migration files encrypted at rest (AES-256)
- Migration files purged after 30 days post-import
- Audit trail for all migration operations
- Client approval required for go-live (digital signature)
- SSO credentials never stored (OAuth tokens only)

### Scalability

- Support 100+ concurrent implementations
- Support 500MB+ migration files
- Support 100,000+ records per migration batch
- Support 50+ concurrent specialists

### Availability

- 99.5% uptime target
- Background import jobs resilient to failures (checkpoint/resume)
- Rollback capability for 7 days post-import

---

## 12. Checklist Verification

### AI-First Checklist Compliance

**Schema Design:**
- [x] Semantic field naming used throughout
- [x] Narrative fields (description, notes) included on all entities
- [x] Activity log (ImplementationActivity) designed for all entities
- [x] Source tracking fields (source_system, source_record_id) on migration entities
- [x] AI enrichment fields (ai_predicted_go_live, ai_risk_factors, ai_confidence_scores)
- [x] Graceful degradation for sparse data (defaults, optional fields)

**Feature Design:**
- [x] Chat interaction examples documented (Section 2)
- [x] AI assistance opportunities identified throughout user stories
- [x] Conversation storage supported via activity log
- [x] AI action audit designed (actor_type: AI in activity log)
- [x] Migration impact assessed (comprehensive mappings documented)
- [x] Structured + unstructured data captured (JSON fields for flexibility)

**API Design:**
- [x] AI-friendly responses with context
- [x] Bulk operations supported (bulk assign, bulk import)
- [x] Natural language descriptions in activity logs

**UI Design:**
- [x] AI panel space allocated (collapsible sidebar)
- [x] Context preservation designed (project-level state)
- [x] Self-service configuration enabled (wizards, templates)

**Cross-Cutting:**
- [x] organization_id on all applicable tables
- [x] business_unit_id not applicable (Ethico-internal module)
- [x] Audit trail complete (ImplementationActivity)
- [x] PII handling documented (encryption, purging)

---

## Appendix A: Implementation Types Comparison

| Aspect | Quick Start | Standard | Complex | Enterprise |
|--------|-------------|----------|---------|------------|
| Timeline | 2-4 weeks | 4-8 weeks | 8-16 weeks | 3-6 months |
| Data Migration | None | None/Basic | Full | Full + Phased |
| SSO | Optional | Yes | Yes | Yes + Custom |
| HRIS Integration | No | Yes | Yes | Yes + Custom |
| Custom Workflows | No | Basic | Yes | Yes |
| Training | Self-paced | Self-paced + 1 live | Multiple live | Dedicated |
| Dedicated PM | No | No | No | Yes |
| Phase Rollout | No | No | Optional | Yes |

---

## Appendix B: Go-Live Checklist Template

### Quick Start Checklist

```
FOUNDATION
[ ] Account created
[ ] Primary admin invited
[ ] Branding configured (logo, colors)
[ ] Hotline numbers assigned (if applicable)

CONFIGURATION
[ ] Categories defined (minimum 5)
[ ] Intake form reviewed
[ ] Basic routing rules configured
[ ] User roles assigned

USERS
[ ] Admin users created (1-3)
[ ] Initial investigators added (if applicable)

TRAINING
[ ] Admin quick-start training completed

GO-LIVE
[ ] Test submission completed
[ ] Client admin approval obtained
[ ] Go-live communication ready
```

### Standard Checklist

```
[Quick Start items plus:]

INTEGRATIONS
[ ] SSO configured
[ ] SSO tested with admin users
[ ] HRIS connection configured
[ ] Employee directory synced

ADVANCED CONFIGURATION
[ ] Investigation templates created (if applicable)
[ ] Email templates customized
[ ] SLA rules configured
[ ] Escalation rules defined

TRAINING
[ ] Admin training completed (certified)
[ ] CCO/Compliance training completed
[ ] Investigator training completed (certified)

GO-LIVE READINESS
[ ] UAT test cases created
[ ] UAT sign-off received
[ ] Readiness checklist complete
```

### Complex Checklist

```
[Standard items plus:]

DATA MIGRATION
[ ] Source data exported
[ ] Field mapping complete
[ ] Value mapping complete
[ ] User references resolved
[ ] Validation passed
[ ] Test import reviewed
[ ] Production import complete
[ ] Data verification complete

ADVANCED FEATURES
[ ] Custom workflows configured
[ ] Advanced routing rules
[ ] Custom fields defined
[ ] Custom reports created
[ ] Dashboard customized

HANDOFF
[ ] CSM assigned and introduced
[ ] Support documentation complete
[ ] Implementation survey sent
```

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| Implementation Project | The container for all implementation work for a single client |
| Implementation Template | Reusable checklist template for implementation types |
| Migration Batch | A single import operation with source files and mapping |
| Field Mapping | Correspondence between source system fields and Ethico fields |
| Value Mapping | Translation of enum/status values from source to Ethico |
| Restore Point | Snapshot of database state before import for rollback |
| Rollback | Reverting an import to pre-import state |
| Health Status | Implementation progress indicator (On Track, At Risk, Blocked) |
| Readiness Score | Percentage completion of go-live prerequisites |
| Blocker | Issue preventing implementation progress |
| Training Track | Role-based training curriculum (Admin, Investigator, etc.) |
| Certification | Verified completion of training with exam pass |
| Handoff | Transfer of client relationship from Implementation to CSM |

---

## Appendix D: Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | February 2026 | Initial draft | Implementation Team |

---

*End of Implementation Portal PRD*
