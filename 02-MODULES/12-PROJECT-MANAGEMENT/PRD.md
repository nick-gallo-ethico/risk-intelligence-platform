# Ethico Risk Intelligence Platform
## PRD-012: Project & Task Management

**Document ID:** PRD-012
**Version:** 1.0
**Priority:** P1 - High (Operational Efficiency Module)
**Development Phase:** Phase 3 (Post Core Modules)
**Last Updated:** February 2026

**Cross-References:**
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md`
- Core Data Model: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`
- Authentication & Multi-tenancy: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md`
- AI Integration Patterns: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-INTEGRATION.md`
- Case Management: `02-MODULES/05-CASE-MANAGEMENT/PRD.md`
- Professional Services: `00-PLATFORM/PROFESSIONAL-SERVICES-SPEC.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [AI-First Considerations](#2-ai-first-considerations)
3. [User Stories](#3-user-stories)
4. [Feature Specifications](#4-feature-specifications)
5. [Data Model](#5-data-model)
6. [API Specifications](#6-api-specifications)
7. [UI/UX Specifications](#7-uiux-specifications)
8. [Migration Considerations](#8-migration-considerations)
9. [Integration Points](#9-integration-points)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Checklist Verification](#11-checklist-verification)
12. [Appendix](#appendix)

---

## 1. Executive Summary

### Purpose

The Project & Task Management module provides a Monday.com-style work coordination system embedded within the Ethico Risk Intelligence Platform. It enables compliance teams to track investigation tasks, manage remediation execution, coordinate disclosure campaigns, oversee implementation projects, and handle ad-hoc compliance initiatives through a unified, visual interface.

This module transforms scattered compliance work into structured, trackable projects with clear ownership, deadlines, dependencies, and progress visibility.

### Target Users

| Role | Primary Use Cases |
|------|-------------------|
| **Investigator** | Track investigation checklist items, manage interview schedules, document collection tasks |
| **Compliance Officer** | Oversee remediation plans, manage compliance program projects, audit preparation |
| **HR Manager** | Coordinate disclosure campaigns, manage attestation drives, team training initiatives |
| **Triage Lead** | Workload distribution, SLA monitoring, team capacity planning |
| **Implementation Specialist** | Client onboarding projects, migration milestones, go-live readiness tracking |
| **System Admin** | Configure project templates, manage automation rules, audit task completion |

### Key Differentiators

| Capability | Competitors | Ethico Platform |
|------------|-------------|-----------------|
| **Integration** | Separate tool (Asana, Monday) | Native to compliance platform |
| **Context** | Manual linking to cases/policies | Automatic entity linking |
| **Templates** | Generic project templates | Compliance-specific (Investigation, Remediation, Campaign) |
| **AI Assistance** | None | Task suggestions, delay predictions, workload optimization |
| **Automation** | Basic | Event-driven (Case created → tasks spawn) |
| **Compliance Focus** | General-purpose | Built for compliance workflows |

---

## 2. AI-First Considerations

### Conversational Interface

How users might interact with this module via natural language chat:

| User Intent | Example Phrases | AI Response |
|-------------|-----------------|-------------|
| View tasks | "Show my tasks due this week", "What's overdue?" | Filter and display task list |
| Create tasks | "Create a task to interview John Smith for case #123" | Create task with entity link |
| Delegate | "Assign this to Sarah", "Move all my tasks to Mike" | Reassignment with notification |
| Summarize | "What's the status of the Acme onboarding project?" | Project summary with key metrics |
| Predict | "Will we hit the deadline for remediation plan #456?" | Risk analysis based on velocity |
| Suggest | "What tasks should I create for this harassment investigation?" | Template-based suggestions |

**Example Conversations:**

```
User: "Show me overdue tasks for the Q4 disclosure campaign"
AI: "The Q4 Annual COI Disclosure campaign has 3 overdue tasks:
     1. 'Send reminder to non-responders' - due 2 days ago, assigned to Sarah
     2. 'Escalate to managers' - due yesterday, assigned to you
     3. 'Review flagged disclosures' - due today, 5 items pending
     Would you like me to send reminders to the assignees?"

User: "Yes, and reschedule the escalation task to tomorrow"
AI: "Done. I've sent reminders to Sarah about the reminder task
     and rescheduled 'Escalate to managers' to February 3rd.
     I've also added a note explaining the delay."
```

### AI Assistance Points

| User Action | AI Can Help By | Confidence Level |
|-------------|----------------|------------------|
| Creating investigation tasks | Suggesting checklist based on case category | High |
| Estimating duration | Predicting based on similar past tasks | Medium |
| Identifying blockers | Detecting dependency chains and delays | High |
| Workload balancing | Suggesting reassignment based on capacity | Medium |
| Creating remediation tasks | Suggesting steps based on finding type | High |
| Sprint planning | Recommending task prioritization | Medium |
| Identifying patterns | Flagging recurring delays by task type | High |
| Generating reports | Summarizing project status for stakeholders | High |

### Data Requirements for AI Context

**Minimum Context:**
- Task title and description
- Due date and current status
- Assignee and project association
- Entity links (Case, Campaign, Policy)

**Enhanced Context (Improves Quality):**
- Historical task completion times
- Assignee workload and capacity
- Dependency chain status
- Related entity details (case severity, campaign type)
- Past similar tasks and outcomes

**Cross-Module Context:**
- Case investigation status and timeline
- Remediation plan progress
- Campaign response rates
- Employee certification status
- Implementation checklist completion

---

## 3. User Stories

### Epic 1: Project Management

#### Ethico Staff Stories

**US-012-001: Create implementation project from template**

As an **Implementation Specialist**, I want to create a new implementation project from a template so that I can quickly set up a structured onboarding plan for a new client.

**Acceptance Criteria:**
- [ ] Can select from Quick Start, Standard, Complex, and Custom templates
- [ ] Template creates project with pre-defined phases and tasks
- [ ] Can customize template after creation (add/remove/reorder tasks)
- [ ] Project links to client Organization entity
- [ ] All tasks inherit organization_id for RLS

**AI Enhancement:**
- AI can suggest template modifications based on client profile (industry, size)
- AI can estimate timeline based on similar past implementations

**Ralph Task Readiness:**
- Entry point: `apps/backend/src/modules/projects/projects.service.ts`
- Pattern reference: Case creation with templates
- Test specification: Verify template instantiation, task creation, entity linking

---

**US-012-002: Track implementation milestones**

As an **Implementation Specialist**, I want to track key milestones with health indicators so that I can identify at-risk implementations early.

**Acceptance Criteria:**
- [ ] Milestones are special tasks that aggregate subtask completion
- [ ] Health indicator (On Track, At Risk, Blocked) calculated automatically
- [ ] Dashboard shows all implementations with health status
- [ ] Alerts triggered when milestone is at risk

**AI Enhancement:**
- AI predicts health status based on task velocity and dependencies

---

#### Client Admin Stories

**US-012-010: Create project for compliance initiative**

As a **Compliance Officer**, I want to create a project for an ad-hoc compliance initiative so that I can organize and track related tasks in one place.

**Acceptance Criteria:**
- [ ] Can create project with name, description, dates, and owner
- [ ] Can add team members with different permission levels
- [ ] Project appears in My Projects and team dashboards
- [ ] Activity logged: "User created project {name}"

**AI Enhancement:**
- AI suggests project structure based on initiative description

---

**US-012-011: View project in Kanban board**

As a **Compliance Officer**, I want to view my project as a Kanban board so that I can visualize task status and drag tasks between columns.

**Acceptance Criteria:**
- [ ] Kanban view shows tasks as cards in status columns
- [ ] Drag-and-drop moves tasks between statuses
- [ ] Card shows title, assignee avatar, due date, priority indicator
- [ ] Click card opens task detail panel
- [ ] Column WIP limits configurable

**AI Enhancement:**
- AI highlights cards that may miss deadline based on current velocity

---

**US-012-012: View project in list view**

As a **Triage Lead**, I want to view project tasks in a sortable list so that I can analyze and filter tasks efficiently.

**Acceptance Criteria:**
- [ ] List view shows tasks in table format
- [ ] Columns: Title, Status, Assignee, Due Date, Priority, Entity Link
- [ ] Sortable by any column
- [ ] Filterable by status, assignee, date range, priority
- [ ] Bulk selection for mass updates

**AI Enhancement:**
- AI can natural language filter: "Show overdue tasks assigned to investigators"

---

**US-012-013: View project in timeline view**

As a **Compliance Officer**, I want to view my project as a Gantt-style timeline so that I can understand task dependencies and scheduling.

**Acceptance Criteria:**
- [ ] Timeline shows tasks as bars on a calendar
- [ ] Dependencies shown as connector lines
- [ ] Drag to adjust dates
- [ ] Critical path highlighted
- [ ] Today line visible

**AI Enhancement:**
- AI identifies tasks that could parallelize to shorten timeline

---

**US-012-014: Create task with subtasks**

As an **Investigator**, I want to create tasks with subtasks so that I can break down complex work into trackable steps.

**Acceptance Criteria:**
- [ ] Task can have unlimited subtasks
- [ ] Subtask has title, assignee, due date, status
- [ ] Parent task progress shows subtask completion percentage
- [ ] Subtasks can be promoted to full tasks
- [ ] Checklist view for quick subtask management

**AI Enhancement:**
- AI suggests subtasks based on parent task type

---

**US-012-015: Set task dependencies**

As a **Compliance Officer**, I want to set dependencies between tasks so that the system understands execution order and impacts.

**Acceptance Criteria:**
- [ ] Can set "blocks" and "blocked by" relationships
- [ ] Cannot complete task if blockers incomplete
- [ ] Warning shown when dependency would create circular reference
- [ ] Dependency visualization in timeline view
- [ ] Cascade due date adjustments when predecessor changes

**AI Enhancement:**
- AI suggests dependencies based on task patterns

---

**US-012-016: Assign recurring tasks**

As a **Compliance Officer**, I want to create recurring tasks so that I don't have to manually recreate periodic compliance activities.

**Acceptance Criteria:**
- [ ] Recurrence patterns: Daily, Weekly, Monthly, Quarterly, Annually
- [ ] Custom recurrence (every 2 weeks, first Monday, etc.)
- [ ] Specify end condition (after N occurrences, by date, never)
- [ ] Each occurrence is independent task with link to series
- [ ] Can edit single occurrence or entire series

**AI Enhancement:**
- AI can suggest recurrence based on compliance calendar

---

**US-012-017: Track time on tasks**

As an **Investigator**, I want to optionally track time spent on tasks so that I can report effort for audits and capacity planning.

**Acceptance Criteria:**
- [ ] Time tracking toggle per project (on/off)
- [ ] Can log time manually or use timer
- [ ] Time entries have date, duration, description
- [ ] Total time displayed on task and project
- [ ] Time reports exportable

**AI Enhancement:**
- AI can predict remaining effort based on similar task history

---

#### End User Stories

**US-012-020: Complete assigned task**

As an **Employee** (non-user), I want to complete a remediation task assigned to me via email so that I can fulfill my compliance obligation without a platform login.

**Acceptance Criteria:**
- [ ] Receive email with task details and secure completion link
- [ ] Link opens simple form to mark complete with optional notes
- [ ] Completion updates task status and notifies owner
- [ ] Link expires after task completion or configurable timeout
- [ ] No platform account required

**AI Enhancement:**
- AI summarizes outstanding tasks in reminder emails

---

### Epic 2: Task Templates

**US-012-030: Create investigation task template**

As a **System Admin**, I want to create task templates tied to case categories so that investigators get consistent checklists for each investigation type.

**Acceptance Criteria:**
- [ ] Template has name, description, applicable categories
- [ ] Template contains ordered list of template tasks
- [ ] Each template task has: title, description, default assignee role, relative due date
- [ ] Templates versioned (changes don't affect existing instances)
- [ ] Can clone and modify existing templates

**AI Enhancement:**
- AI can generate template based on category and historical investigations

---

**US-012-031: Apply template to investigation**

As an **Investigator**, I want to apply a task template when I start an investigation so that I have a structured checklist of work to complete.

**Acceptance Criteria:**
- [ ] When creating investigation, option to "Apply template"
- [ ] System suggests templates based on case category
- [ ] Tasks created with links to investigation entity
- [ ] Due dates calculated from investigation start date
- [ ] Can modify tasks after creation without affecting template

**AI Enhancement:**
- AI suggests template and estimates completion time

---

**US-012-032: Create remediation task template**

As a **Compliance Officer**, I want to create remediation task templates tied to finding outcomes so that corrective actions follow consistent patterns.

**Acceptance Criteria:**
- [ ] Template linked to outcome types (substantiated harassment, policy violation, etc.)
- [ ] Tasks can be assigned to roles (HR, Legal, Manager) or specific users
- [ ] Tasks can target internal users or external email addresses
- [ ] Template includes escalation rules for overdue steps

**AI Enhancement:**
- AI suggests remediation steps based on finding details

---

### Epic 3: Cross-Entity Integration

**US-012-040: Auto-create tasks when case reaches stage**

As a **System Admin**, I want tasks to auto-create when a case reaches a specific stage so that workflows trigger automatically.

**Acceptance Criteria:**
- [ ] Configure automation rules: "When Case reaches [stage], create [template tasks]"
- [ ] Tasks link to triggering case
- [ ] Assignee can be case owner, specific user, or role
- [ ] Due dates relative to trigger date
- [ ] Activity logged: "System created tasks from automation rule"

**AI Enhancement:**
- AI suggests automation rules based on manual task creation patterns

---

**US-012-041: Link tasks to cases**

As an **Investigator**, I want to link tasks to cases so that case-related work is tracked and visible from the case detail view.

**Acceptance Criteria:**
- [ ] Create task with case link from case detail view
- [ ] Tasks appear in "Tasks" tab on case detail
- [ ] Task card shows linked case reference number
- [ ] Clicking case link navigates to case detail

**AI Enhancement:**
- AI can create tasks from case context: "Create task to interview the witness"

---

**US-012-042: Link tasks to campaigns**

As an **HR Manager**, I want to link tasks to campaigns so that campaign management activities are organized and tracked.

**Acceptance Criteria:**
- [ ] Create task with campaign link from campaign detail view
- [ ] Tasks appear in campaign "Tasks" tab
- [ ] Campaign completion can depend on task completion
- [ ] Pre-built campaign task templates available

**AI Enhancement:**
- AI suggests campaign tasks based on campaign type and timeline

---

**US-012-043: Link tasks to policies**

As a **Policy Author**, I want to link tasks to policies so that policy review and update work is tracked.

**Acceptance Criteria:**
- [ ] Create task with policy link from policy detail view
- [ ] Tasks appear in policy "Tasks" tab
- [ ] Policy review workflows can auto-create tasks
- [ ] Task completion can advance policy workflow stage

**AI Enhancement:**
- AI suggests policy review tasks based on policy type and age

---

### Epic 4: Notifications and Reminders

**US-012-050: Receive task assignment notification**

As an **Investigator**, I want to receive a notification when a task is assigned to me so that I know about new work immediately.

**Acceptance Criteria:**
- [ ] In-app notification when task assigned
- [ ] Email notification (based on user preferences)
- [ ] Notification includes task title, due date, project, and link
- [ ] Batch assignment sends single summary notification

**AI Enhancement:**
- AI can include context: "This task is for the high-severity case you're investigating"

---

**US-012-051: Receive due date reminder**

As an **Investigator**, I want to receive reminders before tasks are due so that I don't miss deadlines.

**Acceptance Criteria:**
- [ ] Reminder X days before due (configurable: 1, 3, 7 days)
- [ ] Reminder on due date morning
- [ ] Reminder if overdue (daily until complete or reassigned)
- [ ] User can snooze reminders
- [ ] Project owner notified of overdue tasks

**AI Enhancement:**
- AI prioritizes reminders: "This task blocks 3 other tasks, prioritize this"

---

**US-012-052: Receive blocked task notification**

As an **Investigator**, I want to be notified when a blocking task is completed so that I know I can proceed with my work.

**Acceptance Criteria:**
- [ ] Notification when blocking task marked complete
- [ ] Notification includes both task titles
- [ ] Due date warning if blocked task is now urgent
- [ ] Bulk notification if multiple blockers complete

**AI Enhancement:**
- AI can suggest: "You can now start task X, estimated 2 hours"

---

### Epic 5: Reporting and Analytics

**US-012-060: View project dashboard**

As a **Compliance Officer**, I want to view a project dashboard so that I can monitor overall progress and identify issues.

**Acceptance Criteria:**
- [ ] Dashboard shows: total tasks, by status, by assignee, by priority
- [ ] Burndown chart showing completion over time
- [ ] Overdue task count with drill-down
- [ ] Milestone status summary
- [ ] Configurable date range

**AI Enhancement:**
- AI provides project health summary: "Project is 3 days behind schedule due to..."

---

**US-012-061: Generate completion report**

As a **Compliance Officer**, I want to generate a task completion report so that I can document work for audits and stakeholders.

**Acceptance Criteria:**
- [ ] Report shows completed tasks with dates and assignees
- [ ] Filter by date range, project, assignee, entity type
- [ ] Include time tracking data if enabled
- [ ] Export to PDF, CSV, Excel
- [ ] Schedule recurring report delivery

**AI Enhancement:**
- AI generates executive summary paragraph for report

---

**US-012-062: View workload report**

As a **Triage Lead**, I want to view team workload so that I can balance assignments and identify capacity issues.

**Acceptance Criteria:**
- [ ] Report shows tasks per assignee
- [ ] Capacity indicator (under/at/over capacity)
- [ ] Upcoming due dates by assignee
- [ ] Historical completion rates
- [ ] Recommendations for rebalancing

**AI Enhancement:**
- AI suggests task reassignments based on workload and skills

---

---

## 4. Feature Specifications

### F1: Project Board Views

**Description:**
Multiple view types for visualizing project tasks, matching different work styles and use cases.

**User Flow:**
1. User navigates to Project detail
2. User selects view type (Kanban, List, Timeline)
3. System renders appropriate visualization
4. User interacts with tasks (click, drag, filter)
5. Changes persist immediately

**Business Rules:**
- Default view is user's last-used view (stored in preferences)
- View settings (columns, sort, filter) saved per project per user
- Kanban WIP limits are soft (warning, not blocking)
- Timeline critical path calculated using dependency chains

**AI Integration:**
- AI can highlight "at risk" items in any view
- Natural language filtering: "Show me Sarah's overdue tasks"

**Error Handling:**
| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| Circular dependency | "Cannot create dependency - would create circular reference" | Block action |
| Invalid date range | "End date must be after start date" | Highlight field |
| Drag to invalid status | "Tasks with incomplete blockers cannot be marked Done" | Snap back |

---

### F2: Task Templates and Automation

**Description:**
Pre-defined task structures that can be manually applied or auto-triggered by platform events.

**User Flow - Manual Application:**
1. User creates Investigation or Remediation Plan
2. System suggests applicable templates based on category
3. User selects template
4. System creates tasks from template with adjusted dates
5. User can modify created tasks

**User Flow - Automation:**
1. Admin configures automation rule (trigger + template)
2. Platform event occurs (case stage change, campaign launch)
3. System evaluates automation rules
4. Matching rules fire, creating tasks
5. Assignees notified

**Business Rules:**
- Templates are versioned; existing instances unaffected by template changes
- Automation rules execute in defined order (priority field)
- Max 50 tasks per automation trigger (prevent runaway)
- Relative due dates calculated from trigger date

**AI Integration:**
- AI suggests templates based on entity characteristics
- AI can generate custom templates from historical patterns

---

### F3: Cross-Entity Linking

**Description:**
Tasks can be linked to Cases, Investigations, Campaigns, Policies, and other platform entities, providing context and enabling entity-specific task views.

**User Flow:**
1. User creates task with entity link (or links existing task)
2. Task appears in entity's "Tasks" tab
3. Entity reference appears on task card
4. Click navigates to linked entity
5. Entity deletion orphans task (soft link)

**Business Rules:**
- Task can link to multiple entities (Case AND Investigation)
- Entity link is soft (entity deletion doesn't delete task)
- Task inherits organization_id from linked entity (RLS)
- Cross-tenant linking prohibited (enforced by RLS)

**AI Integration:**
- AI can create tasks from entity context
- AI includes entity summary when describing tasks

---

### F4: External Assignee Support

**Description:**
Tasks can be assigned to non-users via email, enabling remediation steps that require action from people outside the platform.

**User Flow:**
1. User creates task with email assignee (not a platform User)
2. System sends email with task details and secure completion link
3. External person clicks link, views task, marks complete
4. System updates task status and notifies task owner
5. Completion logged with external person identifier

**Business Rules:**
- Secure link valid for 30 days (configurable)
- Link invalidated after completion
- No login required; link is authentication
- PII (email) encrypted at rest
- Rate limiting on completion endpoint (prevent abuse)

**AI Integration:**
- AI can summarize tasks in reminder emails
- AI can suggest escalation if external task overdue

---

### F5: Recurring Tasks

**Description:**
Tasks that automatically regenerate on a schedule, supporting periodic compliance activities.

**User Flow:**
1. User creates task with recurrence pattern
2. First occurrence created immediately (or at future start)
3. When occurrence completed, next occurrence auto-created
4. User can edit single occurrence or entire series
5. Series ends per end condition (date, count, never)

**Business Rules:**
- Each occurrence is independent task (can have different notes, time entries)
- Occurrences link to series via recurring_task_id
- Editing series creates new version (existing occurrences unchanged)
- Deleting series prompts: delete future only, delete all, or cancel

**AI Integration:**
- AI suggests recurrence based on task type and compliance calendar
- AI can recommend recurrence pattern changes based on actual completion patterns

---

## 5. Data Model

### 5.1 Project Entity

**Purpose:** A collection of related tasks representing a body of work.

```prisma
model Project {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Identity
  name                  String                    // "Q4 COI Disclosure Campaign"
  description           String?                   // Rich text description
  slug                  String                    // URL-safe identifier

  // Classification
  project_type          ProjectType               // INVESTIGATION, REMEDIATION, CAMPAIGN, IMPLEMENTATION, COMPLIANCE_INITIATIVE, CUSTOM

  // Ownership
  owner_id              String
  owner                 User @relation("ProjectOwner", fields: [owner_id], references: [id])

  // Team
  team_members          ProjectMember[]

  // Dates
  start_date            DateTime?
  target_end_date       DateTime?
  actual_end_date       DateTime?

  // Status
  status                ProjectStatus             // NOT_STARTED, IN_PROGRESS, ON_HOLD, COMPLETED, CANCELLED
  status_rationale      String?                   // Why this status was set
  status_changed_at     DateTime?
  status_changed_by_id  String?

  // Health (calculated)
  health_status         ProjectHealth             // ON_TRACK, AT_RISK, BLOCKED
  health_reason         String?                   // AI-generated explanation

  // Progress (calculated)
  total_tasks           Int      @default(0)
  completed_tasks       Int      @default(0)
  progress_percentage   Float    @default(0)

  // Configuration
  settings              Json?                     // View preferences, WIP limits, etc.
  time_tracking_enabled Boolean  @default(false)

  // Cross-Entity Links
  linked_entity_type    LinkedEntityType?         // CASE, CAMPAIGN, POLICY, IMPLEMENTATION, etc.
  linked_entity_id      String?

  // Template Source
  template_id           String?                   // ProjectTemplate that spawned this
  template              ProjectTemplate? @relation(fields: [template_id], references: [id])

  // AI Enrichment
  ai_summary            String?                   // AI-generated project summary
  ai_risk_factors       Json?                     // AI-identified risks
  ai_generated_at       DateTime?
  ai_model_version      String?

  // Migration Support
  source_system         String?                   // 'ASANA', 'MONDAY', 'MANUAL'
  source_record_id      String?
  migrated_at           DateTime?

  // Audit
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String
  created_by            User @relation("ProjectCreator", fields: [created_by_id], references: [id])
  updated_by_id         String?

  // Relations
  tasks                 Task[]
  milestones            Milestone[]
  activities            ProjectActivity[]

  // Unique constraints
  @@unique([organization_id, slug])

  // Indexes
  @@index([organization_id])
  @@index([organization_id, status])
  @@index([organization_id, owner_id])
  @@index([organization_id, project_type])
  @@index([organization_id, linked_entity_type, linked_entity_id])
}

enum ProjectType {
  INVESTIGATION         // Investigation-related tasks
  REMEDIATION          // Corrective action tracking
  CAMPAIGN             // Disclosure/attestation campaign management
  IMPLEMENTATION       // Client onboarding (Ethico internal)
  COMPLIANCE_INITIATIVE // Ad-hoc compliance projects
  POLICY_REVIEW        // Policy lifecycle management
  AUDIT_PREPARATION    // Audit readiness
  CUSTOM               // User-defined
}

enum ProjectStatus {
  NOT_STARTED
  IN_PROGRESS
  ON_HOLD
  COMPLETED
  CANCELLED
}

enum ProjectHealth {
  ON_TRACK             // Progress aligned with timeline
  AT_RISK              // Behind schedule or minor blockers
  BLOCKED              // Major blocker or critical issue
}

enum LinkedEntityType {
  CASE
  INVESTIGATION
  CAMPAIGN
  POLICY
  REMEDIATION_PLAN
  ORGANIZATION         // For implementation projects
}
```

### 5.2 Project Member

```prisma
model ProjectMember {
  id                    String   @id @default(uuid())
  project_id            String
  project               Project @relation(fields: [project_id], references: [id])
  user_id               String
  user                  User @relation(fields: [user_id], references: [id])
  organization_id       String

  // Role
  role                  ProjectMemberRole         // OWNER, ADMIN, MEMBER, VIEWER

  // Dates
  added_at              DateTime @default(now())
  added_by_id           String

  // Unique constraints
  @@unique([project_id, user_id])

  // Indexes
  @@index([organization_id])
  @@index([user_id])
}

enum ProjectMemberRole {
  OWNER                // Full control, can delete project
  ADMIN                // Can manage members and settings
  MEMBER               // Can create/edit tasks
  VIEWER               // Read-only access
}
```

### 5.3 Task Entity

**Purpose:** A unit of work within a project or standalone.

```prisma
model Task {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Identity
  title                 String                    // "Interview witness John Smith"
  description           String?                   // Rich text with details
  reference_number      String                    // "TASK-2026-00001"

  // Project Association (optional - tasks can be standalone)
  project_id            String?
  project               Project? @relation(fields: [project_id], references: [id])

  // Parent/Subtask Hierarchy
  parent_task_id        String?
  parent_task           Task? @relation("TaskHierarchy", fields: [parent_task_id], references: [id])
  subtasks              Task[] @relation("TaskHierarchy")

  // Assignment
  assigned_to_id        String?                   // Platform User
  assigned_to           User? @relation("TaskAssignee", fields: [assigned_to_id], references: [id])
  assigned_to_email     String?                   // Non-user (external assignee)
  assigned_to_name      String?                   // Display name for external
  assigned_at           DateTime?
  assigned_by_id        String?

  // Dates
  start_date            DateTime?
  due_date              DateTime?
  completed_at          DateTime?

  // Classification
  status                TaskStatus                // TODO, IN_PROGRESS, BLOCKED, IN_REVIEW, DONE, CANCELLED
  status_rationale      String?
  status_changed_at     DateTime?
  priority              TaskPriority              // LOW, MEDIUM, HIGH, URGENT
  task_type             TaskType?                 // INTERVIEW, DOCUMENT_REVIEW, APPROVAL, TRAINING, etc.

  // Progress (for parent tasks with subtasks)
  subtask_count         Int      @default(0)
  subtask_completed     Int      @default(0)
  progress_percentage   Float    @default(0)

  // Time Tracking
  estimated_hours       Float?
  actual_hours          Float?
  time_entries          TimeEntry[]

  // Dependencies
  blocked_by            TaskDependency[] @relation("BlockedTask")
  blocks                TaskDependency[] @relation("BlockingTask")

  // Recurrence
  is_recurring          Boolean  @default(false)
  recurring_task_id     String?                   // Links to recurrence series
  recurring_task        RecurringTask? @relation(fields: [recurring_task_id], references: [id])
  recurrence_index      Int?                      // Which occurrence in series

  // Cross-Entity Links (soft links)
  entity_links          TaskEntityLink[]

  // Template Source
  template_task_id      String?                   // TaskTemplate that spawned this

  // External Completion
  external_token        String?  @unique         // Secure token for non-user completion
  external_token_expires DateTime?
  external_completed_at DateTime?
  external_completed_by String?                   // Email or name

  // Checklist (simple subtasks stored as JSON)
  checklist             Json?                     // [{title, completed, completedAt}]

  // AI Enrichment
  ai_suggested          Boolean  @default(false) // Was this task AI-suggested?
  ai_estimated_hours    Float?                    // AI-predicted effort
  ai_risk_score         Float?                    // 0-1 likelihood of delay
  ai_risk_factors       String?                   // AI explanation
  ai_generated_at       DateTime?
  ai_model_version      String?

  // Migration Support
  source_system         String?
  source_record_id      String?
  migrated_at           DateTime?

  // Audit
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String
  created_by            User @relation("TaskCreator", fields: [created_by_id], references: [id])
  updated_by_id         String?

  // Relations
  comments              TaskComment[]
  attachments           TaskAttachment[]
  activities            TaskActivity[]

  // Indexes
  @@index([organization_id])
  @@index([organization_id, project_id])
  @@index([organization_id, status])
  @@index([organization_id, assigned_to_id])
  @@index([organization_id, due_date])
  @@index([organization_id, parent_task_id])
  @@index([external_token])
}

enum TaskStatus {
  TODO
  IN_PROGRESS
  BLOCKED
  IN_REVIEW
  DONE
  CANCELLED
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum TaskType {
  // Investigation
  INTERVIEW
  DOCUMENT_REVIEW
  EVIDENCE_COLLECTION
  RESEARCH

  // Remediation
  TRAINING
  POLICY_UPDATE
  DISCIPLINARY_ACTION
  PROCESS_CHANGE

  // Campaign
  SEND_REMINDERS
  REVIEW_RESPONSES
  ESCALATE_NON_RESPONDERS

  // General
  APPROVAL
  MEETING
  REPORT
  COMMUNICATION
  REVIEW
  CUSTOM
}
```

### 5.4 Task Dependency

```prisma
model TaskDependency {
  id                    String   @id @default(uuid())
  organization_id       String

  // The task that is blocked
  blocked_task_id       String
  blocked_task          Task @relation("BlockedTask", fields: [blocked_task_id], references: [id])

  // The task that must complete first
  blocking_task_id      String
  blocking_task         Task @relation("BlockingTask", fields: [blocking_task_id], references: [id])

  // Dependency Type
  dependency_type       DependencyType            // FINISH_TO_START, START_TO_START, etc.
  lag_days              Int      @default(0)      // Days between tasks

  // Metadata
  created_at            DateTime @default(now())
  created_by_id         String

  // Unique constraints
  @@unique([blocked_task_id, blocking_task_id])

  // Indexes
  @@index([organization_id])
  @@index([blocked_task_id])
  @@index([blocking_task_id])
}

enum DependencyType {
  FINISH_TO_START       // Blocking must finish before blocked can start (default)
  START_TO_START        // Blocking must start before blocked can start
  FINISH_TO_FINISH      // Blocking must finish before blocked can finish
  START_TO_FINISH       // Blocking must start before blocked can finish
}
```

### 5.5 Task Entity Link

```prisma
model TaskEntityLink {
  id                    String   @id @default(uuid())
  task_id               String
  task                  Task @relation(fields: [task_id], references: [id])
  organization_id       String

  // Linked Entity (polymorphic)
  entity_type           LinkedEntityType
  entity_id             String

  // Context
  link_description      String?                   // "Primary case for this investigation"

  // Metadata
  created_at            DateTime @default(now())
  created_by_id         String

  // Unique constraints
  @@unique([task_id, entity_type, entity_id])

  // Indexes
  @@index([organization_id])
  @@index([entity_type, entity_id])
}
```

### 5.6 Recurring Task

```prisma
model RecurringTask {
  id                    String   @id @default(uuid())
  organization_id       String

  // Base Task Template
  title                 String
  description           String?
  project_id            String?
  assigned_to_id        String?
  priority              TaskPriority
  task_type             TaskType?
  estimated_hours       Float?

  // Recurrence Pattern
  pattern               RecurrencePattern
  pattern_config        Json                      // Pattern-specific configuration

  // Schedule
  start_date            DateTime
  end_date              DateTime?                 // null = no end
  end_after_occurrences Int?                      // Alternative to end_date

  // Status
  is_active             Boolean  @default(true)
  next_occurrence_date  DateTime?
  occurrences_created   Int      @default(0)

  // Metadata
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String

  // Relations
  occurrences           Task[]

  // Indexes
  @@index([organization_id])
  @@index([organization_id, is_active, next_occurrence_date])
}

enum RecurrencePattern {
  DAILY
  WEEKLY
  BIWEEKLY
  MONTHLY
  QUARTERLY
  ANNUALLY
  CUSTOM
}
```

**Pattern Config JSON Structure:**

```json
// Daily
{ "every_n_days": 1 }

// Weekly
{ "day_of_week": ["MONDAY", "WEDNESDAY", "FRIDAY"] }

// Monthly
{
  "day_of_month": 15,
  // OR
  "week_of_month": 2, "day_of_week": "TUESDAY"
}

// Quarterly
{ "month_of_quarter": 1, "day_of_month": 1 }

// Custom
{
  "every_n": 2,
  "unit": "WEEKS",
  "on": ["MONDAY"]
}
```

### 5.7 Time Entry

```prisma
model TimeEntry {
  id                    String   @id @default(uuid())
  task_id               String
  task                  Task @relation(fields: [task_id], references: [id])
  organization_id       String

  // Time
  date                  DateTime @db.Date
  duration_minutes      Int

  // Description
  description           String?

  // Billing (future)
  billable              Boolean  @default(true)

  // Metadata
  created_at            DateTime @default(now())
  created_by_id         String

  // Indexes
  @@index([organization_id])
  @@index([task_id])
  @@index([organization_id, created_by_id, date])
}
```

### 5.8 Milestone

```prisma
model Milestone {
  id                    String   @id @default(uuid())
  project_id            String
  project               Project @relation(fields: [project_id], references: [id])
  organization_id       String

  // Identity
  name                  String                    // "Phase 1: Foundation Complete"
  description           String?

  // Date
  target_date           DateTime
  actual_date           DateTime?

  // Status
  status                MilestoneStatus           // PENDING, AT_RISK, COMPLETED, MISSED
  status_rationale      String?

  // Progress (calculated from associated tasks)
  associated_task_ids   String[]                  // Tasks that contribute to this milestone
  progress_percentage   Float    @default(0)

  // Health
  health_status         ProjectHealth

  // Metadata
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String

  // Indexes
  @@index([organization_id])
  @@index([project_id])
  @@index([organization_id, target_date])
}

enum MilestoneStatus {
  PENDING
  AT_RISK
  COMPLETED
  MISSED
}
```

### 5.9 Project Template

```prisma
model ProjectTemplate {
  id                    String   @id @default(uuid())
  organization_id       String?                   // null = system template

  // Identity
  name                  String                    // "Standard Implementation"
  description           String?

  // Classification
  template_type         ProjectType
  applicable_contexts   Json?                     // Industries, categories, etc.

  // Version
  version               Int      @default(1)
  is_active             Boolean  @default(true)

  // Phases
  phases                ProjectTemplatePhase[]

  // Metadata
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String?

  // Relations
  spawned_projects      Project[]

  // Indexes
  @@index([organization_id])
  @@index([template_type])
}

model ProjectTemplatePhase {
  id                    String   @id @default(uuid())
  template_id           String
  template              ProjectTemplate @relation(fields: [template_id], references: [id])

  // Identity
  name                  String                    // "Phase 1: Foundation"
  description           String?
  order                 Int

  // Tasks
  tasks                 ProjectTemplateTask[]

  // Metadata
  created_at            DateTime @default(now())
}

model ProjectTemplateTask {
  id                    String   @id @default(uuid())
  phase_id              String
  phase                 ProjectTemplatePhase @relation(fields: [phase_id], references: [id])

  // Task Definition
  title                 String
  description           String?
  task_type             TaskType?

  // Assignment
  default_assignee_role String?                   // OWNER, COMPLIANCE_OFFICER, etc.

  // Timing
  relative_start_days   Int      @default(0)      // Days from phase/project start
  relative_due_days     Int                       // Days from phase/project start
  estimated_hours       Float?

  // Order
  order                 Int

  // Dependencies (within template)
  depends_on_task_order Int[]                     // Task orders this depends on

  // Metadata
  created_at            DateTime @default(now())
}
```

### 5.10 Task Template (for Investigations/Remediation)

```prisma
model TaskTemplate {
  id                    String   @id @default(uuid())
  organization_id       String

  // Identity
  name                  String                    // "Harassment Investigation Checklist"
  description           String?

  // Applicability
  template_type         TaskTemplateType          // INVESTIGATION, REMEDIATION
  applicable_categories String[]                  // Category IDs
  applicable_outcomes   String[]                  // For remediation: outcome types

  // Version
  version               Int      @default(1)
  is_active             Boolean  @default(true)

  // Items
  items                 TaskTemplateItem[]

  // Usage Stats
  times_applied         Int      @default(0)

  // AI Enhancement
  ai_generated          Boolean  @default(false)

  // Metadata
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String

  // Indexes
  @@index([organization_id])
  @@index([organization_id, template_type])
}

enum TaskTemplateType {
  INVESTIGATION
  REMEDIATION
  CAMPAIGN
  CUSTOM
}

model TaskTemplateItem {
  id                    String   @id @default(uuid())
  template_id           String
  template              TaskTemplate @relation(fields: [template_id], references: [id])

  // Task Definition
  title                 String
  description           String?
  task_type             TaskType?

  // Assignment
  default_assignee_role String?                   // HR, LEGAL, INVESTIGATOR, etc.
  default_assignee_id   String?                   // Specific user
  allow_external        Boolean  @default(false)  // Can assign to email

  // Timing
  relative_due_days     Int                       // Days from template application
  estimated_hours       Float?

  // Order
  order                 Int
  is_required           Boolean  @default(true)

  // Subtasks (checklist items)
  default_checklist     Json?                     // [{title}]

  // Metadata
  created_at            DateTime @default(now())
}
```

### 5.11 Automation Rule

```prisma
model AutomationRule {
  id                    String   @id @default(uuid())
  organization_id       String

  // Identity
  name                  String                    // "Create investigation tasks when case assigned"
  description           String?

  // Trigger
  trigger_type          AutomationTriggerType
  trigger_config        Json                      // Trigger-specific configuration

  // Action
  action_type           AutomationActionType
  action_config         Json                      // Action-specific configuration

  // Execution
  is_active             Boolean  @default(true)
  priority              Int      @default(100)    // Lower = executes first

  // Stats
  times_triggered       Int      @default(0)
  last_triggered_at     DateTime?

  // Metadata
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String

  // Indexes
  @@index([organization_id])
  @@index([organization_id, trigger_type, is_active])
}

enum AutomationTriggerType {
  CASE_CREATED
  CASE_STATUS_CHANGED
  CASE_STAGE_CHANGED
  INVESTIGATION_CREATED
  CAMPAIGN_LAUNCHED
  POLICY_REVIEW_DUE
  TASK_COMPLETED
  CUSTOM_WEBHOOK
}

enum AutomationActionType {
  CREATE_TASK
  CREATE_TASKS_FROM_TEMPLATE
  ASSIGN_TASK
  SEND_NOTIFICATION
  UPDATE_ENTITY
}
```

**Trigger Config Examples:**

```json
// CASE_STATUS_CHANGED
{
  "from_status": ["NEW"],
  "to_status": ["UNDER_INVESTIGATION"],
  "category_ids": ["cat-123", "cat-456"],  // optional filter
  "severity": ["HIGH", "MEDIUM"]           // optional filter
}

// CAMPAIGN_LAUNCHED
{
  "campaign_types": ["DISCLOSURE", "ATTESTATION"]
}
```

**Action Config Examples:**

```json
// CREATE_TASKS_FROM_TEMPLATE
{
  "template_id": "template-uuid",
  "link_to_entity": true,
  "assignee_from": "ENTITY_OWNER"  // or specific user_id
}

// CREATE_TASK
{
  "title": "Review new case",
  "description": "Initial case review required",
  "due_days": 2,
  "assignee_from": "ENTITY_OWNER",
  "link_to_entity": true
}
```

### 5.12 Activity Logs

```prisma
model ProjectActivity {
  id                    String   @id @default(uuid())
  project_id            String
  project               Project @relation(fields: [project_id], references: [id])
  organization_id       String

  // Action
  action                String                    // 'created', 'status_changed', 'member_added', etc.
  action_description    String                    // "Sarah Chen added Mike Johnson to the project"

  // Actor
  actor_user_id         String?
  actor_type            ActorType

  // Changes
  changes               Json?
  context               Json?

  // Metadata
  created_at            DateTime @default(now())

  // Indexes
  @@index([organization_id, project_id, created_at])
}

model TaskActivity {
  id                    String   @id @default(uuid())
  task_id               String
  task                  Task @relation(fields: [task_id], references: [id])
  organization_id       String

  // Action
  action                String
  action_description    String

  // Actor
  actor_user_id         String?
  actor_type            ActorType

  // Changes
  changes               Json?
  context               Json?

  // Metadata
  created_at            DateTime @default(now())

  // Indexes
  @@index([organization_id, task_id, created_at])
}
```

### 5.13 Task Comment & Attachment

```prisma
model TaskComment {
  id                    String   @id @default(uuid())
  task_id               String
  task                  Task @relation(fields: [task_id], references: [id])
  organization_id       String

  // Content
  content               String                    // Rich text

  // Mentions
  mentioned_user_ids    String[]

  // Metadata
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String

  // Indexes
  @@index([organization_id])
  @@index([task_id])
}

model TaskAttachment {
  id                    String   @id @default(uuid())
  task_id               String
  task                  Task @relation(fields: [task_id], references: [id])
  organization_id       String

  // File
  file_name             String
  file_type             String                    // MIME type
  file_size             Int                       // Bytes
  storage_path          String                    // Blob storage path

  // Metadata
  uploaded_at           DateTime @default(now())
  uploaded_by_id        String

  // Indexes
  @@index([organization_id])
  @@index([task_id])
}
```

---

## 6. API Specifications

### 6.1 Project Endpoints

#### Create Project

```http
POST /api/v1/projects

Request:
{
  "name": "Q4 Annual COI Disclosure",
  "description": "Annual conflict of interest disclosure campaign management",
  "project_type": "CAMPAIGN",
  "start_date": "2026-10-01",
  "target_end_date": "2026-12-15",
  "team_member_ids": ["user-uuid-1", "user-uuid-2"],
  "linked_entity_type": "CAMPAIGN",
  "linked_entity_id": "campaign-uuid",
  "template_id": "template-uuid",  // optional - spawn from template
  "time_tracking_enabled": false
}

Response (201):
{
  "id": "project-uuid",
  "organization_id": "org-uuid",
  "name": "Q4 Annual COI Disclosure",
  "slug": "q4-annual-coi-disclosure",
  "project_type": "CAMPAIGN",
  "status": "NOT_STARTED",
  "health_status": "ON_TRACK",
  "progress_percentage": 0,
  "total_tasks": 12,  // if template applied
  "owner": {
    "id": "user-uuid",
    "name": "Sarah Chen"
  },
  "team_members": [...],
  "created_at": "2026-02-02T10:00:00Z"
}

Errors:
- 400: Validation error
- 401: Not authenticated
- 403: Insufficient permissions
- 404: Template not found
```

#### List Projects

```http
GET /api/v1/projects?page=1&limit=20&status=IN_PROGRESS&type=CAMPAIGN

Query Parameters:
- page: integer (default: 1)
- limit: integer (default: 20, max: 100)
- status: enum filter (comma-separated for multiple)
- type: ProjectType filter
- owner_id: filter by owner
- health: ON_TRACK, AT_RISK, BLOCKED
- search: full-text search in name/description
- linked_entity_type: filter by linked entity type
- linked_entity_id: filter by specific linked entity

Response (200):
{
  "data": [
    {
      "id": "project-uuid",
      "name": "Q4 Annual COI Disclosure",
      "project_type": "CAMPAIGN",
      "status": "IN_PROGRESS",
      "health_status": "ON_TRACK",
      "progress_percentage": 45,
      "target_end_date": "2026-12-15",
      "owner": { "id": "...", "name": "Sarah Chen" },
      "linked_entity": {
        "type": "CAMPAIGN",
        "id": "campaign-uuid",
        "name": "Annual COI 2026"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "pages": 1
  }
}
```

#### Get Project Detail

```http
GET /api/v1/projects/:id

Query Parameters:
- include: tasks,milestones,activities (comma-separated)

Response (200):
{
  "id": "project-uuid",
  "name": "Q4 Annual COI Disclosure",
  "description": "...",
  "project_type": "CAMPAIGN",
  "status": "IN_PROGRESS",
  "status_rationale": null,
  "health_status": "ON_TRACK",
  "health_reason": "All tasks on schedule",
  "progress_percentage": 45,
  "total_tasks": 12,
  "completed_tasks": 5,
  "start_date": "2026-10-01",
  "target_end_date": "2026-12-15",
  "owner": { "id": "...", "name": "...", "avatar_url": "..." },
  "team_members": [...],
  "linked_entity": {...},
  "ai_summary": "Campaign is progressing well with 45% of tasks complete...",
  "settings": {...},
  "tasks": [...],  // if included
  "milestones": [...],  // if included
  "activities": [...],  // if included
  "created_at": "...",
  "updated_at": "..."
}
```

#### Update Project

```http
PATCH /api/v1/projects/:id

Request:
{
  "name": "Q4 Annual COI Disclosure - Updated",
  "target_end_date": "2026-12-20",
  "status": "ON_HOLD",
  "status_rationale": "Waiting for legal review"
}

Response (200):
{ ...updated project... }
```

#### Delete Project

```http
DELETE /api/v1/projects/:id

Response (204): No content

Notes:
- Soft delete (marks as deleted)
- Tasks not deleted, become orphaned
- Requires OWNER role on project
```

### 6.2 Task Endpoints

#### Create Task

```http
POST /api/v1/tasks

Request:
{
  "title": "Interview witness John Smith",
  "description": "Schedule and conduct interview regarding warehouse incident",
  "project_id": "project-uuid",  // optional
  "parent_task_id": "task-uuid",  // optional - creates subtask
  "assigned_to_id": "user-uuid",  // or assigned_to_email
  "assigned_to_email": "external@company.com",  // for non-users
  "assigned_to_name": "External Person",
  "start_date": "2026-02-03",
  "due_date": "2026-02-05",
  "priority": "HIGH",
  "task_type": "INTERVIEW",
  "estimated_hours": 2,
  "entity_links": [
    {
      "entity_type": "CASE",
      "entity_id": "case-uuid"
    }
  ],
  "checklist": [
    { "title": "Send interview invitation" },
    { "title": "Prepare questions" },
    { "title": "Document responses" }
  ]
}

Response (201):
{
  "id": "task-uuid",
  "reference_number": "TASK-2026-00042",
  "title": "Interview witness John Smith",
  "status": "TODO",
  "priority": "HIGH",
  "assigned_to": { "id": "...", "name": "..." },
  "entity_links": [...],
  "checklist": [...],
  "created_at": "..."
}
```

#### List Tasks

```http
GET /api/v1/tasks?project_id=xxx&status=TODO,IN_PROGRESS&assigned_to_id=yyy

Query Parameters:
- project_id: filter by project
- status: comma-separated status filter
- assigned_to_id: filter by assignee
- due_date_from: filter tasks due after date
- due_date_to: filter tasks due before date
- priority: filter by priority
- entity_type: filter by linked entity type
- entity_id: filter by linked entity
- is_overdue: true/false
- search: full-text search
- sort: field name (due_date, created_at, priority)
- order: asc/desc

Response (200):
{
  "data": [...tasks...],
  "pagination": {...}
}
```

#### Get Task Detail

```http
GET /api/v1/tasks/:id

Response (200):
{
  "id": "task-uuid",
  "reference_number": "TASK-2026-00042",
  "title": "Interview witness John Smith",
  "description": "...",
  "status": "IN_PROGRESS",
  "status_rationale": null,
  "priority": "HIGH",
  "task_type": "INTERVIEW",
  "project": { "id": "...", "name": "..." },
  "assigned_to": { "id": "...", "name": "...", "avatar_url": "..." },
  "start_date": "2026-02-03",
  "due_date": "2026-02-05",
  "completed_at": null,
  "estimated_hours": 2,
  "actual_hours": 0.5,
  "progress_percentage": 33,  // from checklist
  "subtasks": [...],
  "checklist": [
    { "id": "...", "title": "Send interview invitation", "completed": true, "completed_at": "..." },
    { "title": "Prepare questions", "completed": false },
    { "title": "Document responses", "completed": false }
  ],
  "entity_links": [
    {
      "entity_type": "CASE",
      "entity_id": "case-uuid",
      "entity_summary": { "reference_number": "ETH-2026-00123", "title": "Warehouse Safety Concern" }
    }
  ],
  "blocked_by": [...],
  "blocks": [...],
  "time_entries": [...],
  "comments": [...],
  "attachments": [...],
  "activities": [...],
  "ai_risk_score": 0.2,
  "ai_risk_factors": "On track, no blockers identified",
  "created_at": "...",
  "updated_at": "..."
}
```

#### Update Task

```http
PATCH /api/v1/tasks/:id

Request:
{
  "status": "DONE",
  "status_rationale": "Interview completed and documented",
  "completed_at": "2026-02-05T14:30:00Z"
}

Response (200):
{ ...updated task... }
```

#### Update Task Checklist

```http
PATCH /api/v1/tasks/:id/checklist

Request:
{
  "checklist": [
    { "id": "item-1", "completed": true },
    { "id": "item-2", "completed": true },
    { "title": "New item added" }  // new item without id
  ]
}

Response (200):
{ ...updated task with checklist... }
```

#### Add Task Dependency

```http
POST /api/v1/tasks/:id/dependencies

Request:
{
  "blocking_task_id": "other-task-uuid",
  "dependency_type": "FINISH_TO_START",
  "lag_days": 0
}

Response (201):
{
  "id": "dependency-uuid",
  "blocked_task_id": "task-uuid",
  "blocking_task_id": "other-task-uuid",
  "dependency_type": "FINISH_TO_START"
}

Errors:
- 400: Would create circular dependency
```

#### Complete External Task

```http
POST /api/v1/tasks/complete-external

Request:
{
  "token": "secure-token-from-email",
  "completion_notes": "Training completed on Feb 3rd",
  "completed_by_name": "John Smith"  // optional override
}

Response (200):
{
  "success": true,
  "message": "Task marked complete. Thank you."
}

Errors:
- 400: Token expired
- 404: Token not found
```

### 6.3 Template Endpoints

#### Create Task Template

```http
POST /api/v1/task-templates

Request:
{
  "name": "Harassment Investigation Checklist",
  "description": "Standard tasks for investigating harassment allegations",
  "template_type": "INVESTIGATION",
  "applicable_categories": ["category-uuid-harassment"],
  "items": [
    {
      "title": "Initial case review",
      "description": "Review intake information and determine scope",
      "task_type": "DOCUMENT_REVIEW",
      "default_assignee_role": "INVESTIGATOR",
      "relative_due_days": 1,
      "estimated_hours": 1,
      "order": 1,
      "is_required": true
    },
    {
      "title": "Interview complainant",
      "task_type": "INTERVIEW",
      "relative_due_days": 3,
      "order": 2,
      "default_checklist": [
        { "title": "Schedule interview" },
        { "title": "Conduct interview" },
        { "title": "Document responses" }
      ]
    }
  ]
}

Response (201):
{ ...created template... }
```

#### Apply Template to Entity

```http
POST /api/v1/task-templates/:id/apply

Request:
{
  "entity_type": "INVESTIGATION",
  "entity_id": "investigation-uuid",
  "project_id": "project-uuid",  // optional
  "start_date": "2026-02-02",  // for relative due date calculation
  "assignee_overrides": {
    "1": "specific-user-uuid"  // override item order 1's assignee
  }
}

Response (201):
{
  "tasks_created": 5,
  "tasks": [...created tasks...]
}
```

### 6.4 Automation Endpoints

#### Create Automation Rule

```http
POST /api/v1/automation-rules

Request:
{
  "name": "Create investigation tasks when case assigned",
  "trigger_type": "CASE_STATUS_CHANGED",
  "trigger_config": {
    "from_status": ["NEW"],
    "to_status": ["UNDER_INVESTIGATION"]
  },
  "action_type": "CREATE_TASKS_FROM_TEMPLATE",
  "action_config": {
    "template_id": "template-uuid",
    "link_to_entity": true,
    "assignee_from": "ENTITY_OWNER"
  },
  "priority": 100
}

Response (201):
{ ...created rule... }
```

### 6.5 Time Tracking Endpoints

#### Log Time Entry

```http
POST /api/v1/tasks/:id/time-entries

Request:
{
  "date": "2026-02-03",
  "duration_minutes": 45,
  "description": "Initial document review"
}

Response (201):
{
  "id": "entry-uuid",
  "task_id": "task-uuid",
  "date": "2026-02-03",
  "duration_minutes": 45,
  "description": "Initial document review"
}
```

### 6.6 AI Endpoints

#### Get AI Task Suggestions

```http
POST /api/v1/ai/task-suggestions

Request:
{
  "context_type": "INVESTIGATION",
  "context_id": "investigation-uuid",
  "existing_tasks": ["task-uuid-1", "task-uuid-2"]  // to avoid duplicates
}

Response (200):
{
  "suggestions": [
    {
      "title": "Interview accused party",
      "description": "Schedule interview with the subject of the allegation",
      "task_type": "INTERVIEW",
      "priority": "HIGH",
      "estimated_hours": 1.5,
      "confidence": 0.92,
      "rationale": "Typical next step after complainant interview"
    },
    {
      "title": "Collect relevant documents",
      "confidence": 0.85,
      ...
    }
  ],
  "ai_model_version": "claude-3-opus"
}
```

#### Predict Task Completion Risk

```http
POST /api/v1/ai/completion-prediction

Request:
{
  "task_id": "task-uuid"
}

Response (200):
{
  "risk_score": 0.35,
  "risk_level": "MEDIUM",
  "risk_factors": [
    "Task is 2 days old with no progress updates",
    "Assignee has 8 other tasks due this week"
  ],
  "recommendations": [
    "Consider extending due date by 2 days",
    "Assignee workload is high - consider reassignment"
  ],
  "predicted_completion_date": "2026-02-08",
  "ai_model_version": "claude-3-opus"
}
```

#### Get Workload Optimization

```http
POST /api/v1/ai/workload-optimization

Request:
{
  "project_id": "project-uuid",
  "target_date": "2026-02-15"
}

Response (200):
{
  "current_distribution": {
    "user-1": { "tasks": 5, "hours": 12 },
    "user-2": { "tasks": 2, "hours": 4 }
  },
  "optimized_distribution": {
    "user-1": { "tasks": 4, "hours": 9 },
    "user-2": { "tasks": 3, "hours": 7 }
  },
  "suggested_reassignments": [
    {
      "task_id": "task-uuid",
      "from_user_id": "user-1",
      "to_user_id": "user-2",
      "rationale": "User-1 is over capacity; User-2 has relevant experience"
    }
  ],
  "projected_completion": {
    "current": "2026-02-18",
    "optimized": "2026-02-14"
  }
}
```

---

## 7. UI/UX Specifications

### Navigation Placement

```
LEFT NAV:
├── Dashboard
├── My Workspace
├── Cases
├── Investigations
├── Disclosures
├── Policies
├── Campaigns
├── Projects & Tasks    ← NEW SECTION
│   ├── My Tasks
│   ├── Projects
│   └── Templates (Admin)
├── Analytics
└── Settings
```

### Key Screens

#### 7.1 My Tasks View

**Purpose:** Personal task list across all projects and standalone tasks

**Components:**
- **Header:** "My Tasks" title, task count, AI summary button
- **Filters:**
  - Status: All, To Do, In Progress, Blocked, Done
  - Due: Today, This Week, Overdue, Upcoming
  - Priority: All, Urgent, High, Medium, Low
  - Project: All, [Project list], Standalone
- **Task List:**
  - Grouped by: Due Date (default), Project, Priority, Status
  - Each row: Checkbox, Title, Project tag, Due date, Priority indicator
  - Click row → slide-out detail panel
- **Quick Add:** Floating "+" button for new task
- **AI Panel (collapsible):**
  - "3 tasks at risk of delay"
  - "Suggested focus: High-priority interview task due today"

**Layout Mockup:**
```
┌────────────────────────────────────────────────────────────────────┐
│  My Tasks (42 total)                              [+ New Task]     │
├────────────────────────────────────────────────────────────────────┤
│  Status: [All ▼]  Due: [This Week ▼]  Project: [All ▼]  🔍 Search │
├────────────────────────────────────────────────────────────────────┤
│  TODAY (3)                                                         │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ☐  Interview John Smith           [Campaign] Due: Today  🔴  │ │
│  │ ☐  Review disclosure responses    [Campaign] Due: Today  🟡  │ │
│  │ ☐  Send reminder emails           [Campaign] Due: Today  🟢  │ │
│  └──────────────────────────────────────────────────────────────┘ │
│  TOMORROW (5)                                                      │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │ ☐  Document interview findings    [Case #123] Due: Feb 3 🟡  │ │
│  │ ...                                                           │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

#### 7.2 Project List View

**Purpose:** Browse and manage all projects

**Components:**
- **Header:** "Projects" title, project count, filters, view toggle (Cards/Table)
- **Filters:** Status, Type, Owner, Health, Date range
- **Project Cards (Card View):**
  - Name, Type badge, Health indicator
  - Progress bar
  - Owner avatar, Due date
  - Quick actions: Open, Archive
- **Project Table (Table View):**
  - Columns: Name, Type, Status, Health, Progress, Owner, Due Date
  - Sortable, filterable
- **Create Button:** "+ New Project"

#### 7.3 Project Detail - Kanban View

**Purpose:** Visual task management with drag-and-drop

**Components:**
- **Header:**
  - Project name, Type badge, Health indicator
  - View switcher: [Kanban] [List] [Timeline]
  - Filters, Search, "+ Add Task"
- **Kanban Board:**
  - Columns: To Do | In Progress | In Review | Done
  - Column WIP count and limit indicator
  - Task Cards:
    - Title (2 lines max)
    - Assignee avatar
    - Due date with color coding (green/yellow/red)
    - Priority dot
    - Entity link icon
    - Subtask progress indicator
  - Drag-and-drop between columns
  - Click card → opens detail slide-out
- **Collapsed Sidebar:** Project info, milestones, team

**Layout Mockup:**
```
┌────────────────────────────────────────────────────────────────────────┐
│  Q4 COI Disclosure Campaign        🟢 On Track     [Kanban][List][📊] │
│  ─────────────────────────────────────────────────────────────────────│
│  [Filter ▼]  [Assignee ▼]  [Priority ▼]  🔍 Search    [+ Add Task]    │
├────────────────┬────────────────┬────────────────┬────────────────────┤
│ TO DO (5)      │ IN PROGRESS (3)│ IN REVIEW (2)  │ DONE (8)          │
├────────────────┼────────────────┼────────────────┼────────────────────┤
│ ┌────────────┐ │ ┌────────────┐ │ ┌────────────┐ │ ┌────────────┐    │
│ │Send remind.│ │ │Review resp.│ │ │Draft report│ │ │Launch email│    │
│ │👤 SC  📅2/3│ │ │👤 MJ  📅2/4│ │ │👤 SC  📅2/5│ │ │✓ 2/1      │    │
│ │🔴 High     │ │ │🟡 Med      │ │ │🟢 Low      │ │ │           │    │
│ └────────────┘ │ └────────────┘ │ └────────────┘ │ └────────────┘    │
│ ┌────────────┐ │ ┌────────────┐ │ ┌────────────┐ │ ┌────────────┐    │
│ │Escalate    │ │ │Follow-up   │ │ │...         │ │ │...         │    │
│ │...         │ │ │...         │ │ │            │ │ │           │    │
│ └────────────┘ │ └────────────┘ │ └────────────┘ │ └────────────┘    │
└────────────────┴────────────────┴────────────────┴────────────────────┘
```

#### 7.4 Project Detail - List View

**Purpose:** Tabular task view for analysis and bulk operations

**Components:**
- **Same header as Kanban**
- **Task Table:**
  - Columns: Checkbox, Title, Status, Assignee, Due Date, Priority, Progress, Entity
  - Inline editing for status, assignee, dates
  - Row selection for bulk actions
  - Expandable rows for subtasks
- **Bulk Actions Bar:** (appears when rows selected)
  - Assign to, Change status, Change priority, Delete

#### 7.5 Project Detail - Timeline View

**Purpose:** Gantt-style visualization of task scheduling and dependencies

**Components:**
- **Same header as Kanban**
- **Timeline:**
  - Y-axis: Task list (grouped by assignee or phase)
  - X-axis: Date scale (day/week/month toggle)
  - Task bars showing duration
  - Dependency arrows between tasks
  - Today line
  - Critical path highlight (optional toggle)
  - Milestones as diamonds
- **Interactions:**
  - Drag bar ends to adjust dates
  - Click bar to edit task
  - Hover for task details tooltip

#### 7.6 Task Detail Slide-out

**Purpose:** Full task information and actions without leaving list/board

**Components:**
- **Header:**
  - Title (editable)
  - Status dropdown
  - Priority dropdown
  - Close button
- **Main Content:**
  - Description (rich text, editable)
  - Checklist with checkboxes
  - Subtasks list
  - Time entries (if tracking enabled)
  - Comments thread
  - Attachments
- **Sidebar:**
  - Assignee (with reassign)
  - Due date (with date picker)
  - Entity links (clickable)
  - Dependencies (blocked by / blocks)
  - Time estimate / actual
- **Activity Feed:** Timeline of changes
- **AI Panel:**
  - Risk assessment
  - Suggested next steps

#### 7.7 Template Builder

**Purpose:** Create and edit task templates

**Components:**
- **Header:** Template name, type, save/cancel
- **Applicability:**
  - Template type dropdown
  - Category/outcome multi-select
- **Task List Builder:**
  - Drag-and-drop reordering
  - Add task button
  - For each task:
    - Title, description
    - Default assignee role dropdown
    - Relative due days input
    - Estimated hours
    - Required toggle
    - Checklist items
  - Dependency connections (visual)
- **Preview:** Show how tasks will appear when applied

### AI Panel Design

- **Location:** Right sidebar, collapsible
- **Default State:** Collapsed with summary indicator ("2 suggestions")
- **Expanded Content:**
  - Risk summary for project/task
  - Suggested actions with "Apply" buttons
  - Workload insights
  - Chat interface: "Ask about this project..."
- **User Controls:**
  - Refresh/regenerate
  - "Not helpful" feedback
  - Collapse/expand

### Component Library (shadcn/ui)

- **Cards:** Task cards with consistent structure
- **Tables:** Sortable, filterable data tables
- **Kanban:** Custom component using dnd-kit
- **Timeline:** Custom Gantt using react-gantt-timeline or custom
- **Dropdowns:** Status, priority, assignee selectors
- **Date Pickers:** Single date, date range
- **Progress Bars:** Task and project progress
- **Badges:** Status, priority, health indicators
- **Avatars:** Assignee display
- **Modals:** Task creation, template application
- **Slide-outs:** Task detail panel

---

## 8. Migration Considerations

### Data Mapping from External Systems

#### From Monday.com

| Monday Field | Ethico Field | Transformation |
|--------------|--------------|----------------|
| Board | Project | Direct mapping |
| Group | Phase (custom field) | Map to project phase |
| Item | Task | Direct mapping |
| Subitems | Subtasks or Checklist | Configurable |
| Person | assigned_to_id | User resolution required |
| Status | status | Value mapping |
| Date | due_date | Date conversion |
| Timeline | start_date, due_date | Split into two fields |

#### From Asana

| Asana Field | Ethico Field | Transformation |
|-------------|--------------|----------------|
| Project | Project | Direct mapping |
| Section | Phase (custom field) | Map to project phase |
| Task | Task | Direct mapping |
| Subtask | Subtasks | Direct mapping |
| Assignee | assigned_to_id | User resolution required |
| Due Date | due_date | Date conversion |
| Dependencies | TaskDependency | Relationship mapping |

#### From Excel/CSV

| Column | Ethico Field | Notes |
|--------|--------------|-------|
| Task Name | title | Required |
| Description | description | Optional |
| Project | project_id | Must exist or create |
| Assignee | assigned_to_id/email | User resolution or email |
| Due Date | due_date | Date parsing |
| Status | status | Value mapping |
| Priority | priority | Value mapping |

### Handling Sparse Data

| Field | If Missing | Default/Fallback |
|-------|------------|------------------|
| project_id | Create standalone task | null |
| assigned_to_id | Unassigned | null |
| due_date | No due date | null |
| priority | Default priority | MEDIUM |
| status | Initial status | TODO |
| description | Empty | null |

### Post-Migration AI Enrichment

After migration, AI can:
- [ ] Suggest project grouping for standalone tasks
- [ ] Identify potential duplicate tasks
- [ ] Suggest task dependencies based on titles
- [ ] Estimate missing due dates based on similar tasks
- [ ] Flag tasks that may need attention (old, unassigned)

---

## 9. Integration Points

### Internal Module Integrations

| Module | Integration Type | Data Flow |
|--------|------------------|-----------|
| **Case Management** | Bidirectional | Cases → linked tasks; Task completion → case activity |
| **Investigations** | Bidirectional | Investigation templates spawn tasks; Task status visible on investigation |
| **Remediation Plans** | Source | Remediation steps become tasks; Completion syncs |
| **Campaigns** | Bidirectional | Campaign tasks for management; Response review tasks |
| **Policies** | Bidirectional | Policy review tasks; Approval workflow tasks |
| **Implementation Portal** | Primary | Implementation checklists are projects; Milestone tracking |
| **Analytics** | Feed | Task metrics, completion rates, workload data |
| **Notifications** | Subscriber | Task events trigger notifications |

### Integration Patterns

**Case → Tasks:**
```
Case created → Check automation rules → Create tasks from template
Task completed → Log activity on linked case
Case closed → Mark linked tasks as cancelled (optional)
```

**Investigation → Tasks:**
```
Investigation created → Suggest applicable task template
Template applied → Tasks created with investigation link
Task completed → Investigation checklist progress updated
All tasks done → Prompt to record findings
```

**Remediation → Tasks:**
```
Remediation plan attached → Tasks created from remediation steps
Task assigned to external → Email sent with completion link
External completes → Task marked done, plan progress updated
All steps done → Remediation plan marked complete
```

**Campaign → Tasks:**
```
Campaign launched → Create campaign management tasks
Response received → Create "Review response" task if flagged
Campaign deadline approaching → Create reminder tasks
```

### External System Integrations

| System | Integration Method | Sync Direction |
|--------|-------------------|----------------|
| Microsoft Outlook | Calendar sync | Bidirectional (tasks ↔ calendar events) |
| Google Calendar | Calendar sync | Bidirectional |
| Slack | Notifications | One-way (Ethico → Slack) |
| Microsoft Teams | Notifications | One-way (Ethico → Teams) |
| Zapier | Webhook | Bidirectional via triggers/actions |

### Webhook Events

```json
{
  "event": "task.completed",
  "timestamp": "2026-02-02T15:30:00Z",
  "data": {
    "task_id": "task-uuid",
    "task_title": "Interview witness",
    "project_id": "project-uuid",
    "completed_by": {
      "id": "user-uuid",
      "name": "Sarah Chen"
    },
    "entity_links": [
      { "type": "CASE", "id": "case-uuid" }
    ]
  }
}
```

---

## 10. Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| Task list load (100 items) | < 500ms |
| Kanban board render | < 1 second |
| Task detail load | < 300ms |
| Drag-and-drop response | < 100ms |
| Timeline view render (50 tasks) | < 1 second |
| AI suggestion generation | < 5 seconds |
| Bulk task creation (50 tasks) | < 3 seconds |

### Scalability

| Scenario | Target |
|----------|--------|
| Tasks per organization | 100,000+ |
| Tasks per project | 1,000+ |
| Concurrent users per org | 100+ |
| Active projects per org | 500+ |
| Automation rule evaluations/min | 1,000+ |

### Security

- All data filtered by organization_id (RLS)
- Role-based access enforced on projects
- External completion links are cryptographically secure
- PII (external emails) encrypted at rest
- Audit trail for all task operations
- Rate limiting on external completion endpoint

### Availability

| Metric | Target |
|--------|--------|
| Uptime | 99.5% |
| Recovery Time Objective (RTO) | 4 hours |
| Recovery Point Objective (RPO) | 1 hour |

### Data Retention

| Data Type | Retention |
|-----------|-----------|
| Active tasks | Indefinite |
| Completed tasks | 7 years (compliance requirement) |
| Task activities | 7 years |
| Time entries | 7 years |
| Deleted tasks | 90 days (soft delete) |

---

## 11. Checklist Verification

### AI-First Checklist Compliance

**Schema Design:**
- [x] Semantic field naming used throughout
- [x] Narrative fields (description, status_rationale) included
- [x] Activity log designed for Project and Task entities
- [x] Source tracking fields included (source_system, source_record_id, migrated_at)
- [x] AI enrichment fields included (ai_summary, ai_risk_score, ai_model_version)
- [x] Graceful degradation for sparse data

**Feature Design:**
- [x] Chat interaction examples documented
- [x] AI assistance opportunities identified (task suggestions, risk prediction, workload optimization)
- [x] Conversation storage planned (AI interactions logged)
- [x] AI action audit designed (ai_suggested flag, model version tracking)
- [x] Migration impact assessed
- [x] Structured + unstructured data captured

**API Design:**
- [x] AI-friendly responses with context
- [x] Bulk operations supported (template application, bulk update)
- [x] Natural language search available (via search parameter)

**UI Design:**
- [x] AI panel space allocated (collapsible sidebar)
- [x] Context preservation designed (entity links, project context)
- [x] Self-service configuration enabled (template builder)

**Cross-Cutting:**
- [x] organization_id on all tables
- [x] business_unit_id not applicable (tasks span BUs)
- [x] Audit trail complete
- [x] PII handling documented (external emails encrypted)

---

## Appendix

### A. Glossary

| Term | Definition |
|------|------------|
| **Project** | A collection of related tasks representing a body of work with defined scope and timeline |
| **Task** | A unit of work with title, assignee, due date, and status |
| **Subtask** | A task nested under a parent task, contributing to parent's completion |
| **Checklist** | Simple to-do items within a task (lighter than subtasks) |
| **Milestone** | A significant project checkpoint, often aggregating task completion |
| **Dependency** | A relationship where one task must complete before another can start |
| **Recurring Task** | A task that regenerates on a schedule |
| **Template** | A predefined task structure that can be applied to create multiple tasks |
| **Automation Rule** | A trigger-action configuration that creates tasks automatically |
| **External Assignee** | A non-user assigned to a task via email |
| **Time Entry** | A logged record of time spent on a task |

### B. Status Transition Matrix

| From Status | To Status | Conditions |
|-------------|-----------|------------|
| TODO | IN_PROGRESS | Manual or first activity |
| TODO | BLOCKED | Blocking task incomplete |
| TODO | CANCELLED | Manual |
| IN_PROGRESS | TODO | Manual (reopen) |
| IN_PROGRESS | BLOCKED | Blocking task incomplete |
| IN_PROGRESS | IN_REVIEW | Manual (submit for review) |
| IN_PROGRESS | DONE | Manual or checklist complete |
| IN_PROGRESS | CANCELLED | Manual |
| BLOCKED | TODO | Blocking task completed |
| BLOCKED | CANCELLED | Manual |
| IN_REVIEW | IN_PROGRESS | Rejected (needs rework) |
| IN_REVIEW | DONE | Approved |
| DONE | IN_PROGRESS | Reopened |
| CANCELLED | TODO | Restored |

### C. Priority Definitions

| Priority | Definition | SLA Guidance |
|----------|------------|--------------|
| URGENT | Critical path, blocking others, or emergency | Same day |
| HIGH | Important, time-sensitive | Within 2 days |
| MEDIUM | Normal priority | Within 1 week |
| LOW | Nice to have, not time-sensitive | As capacity allows |

### D. Default Templates

**Investigation Template: Harassment**
1. Initial case review (Day 1)
2. Interview complainant (Day 3)
3. Collect relevant documents (Day 5)
4. Interview witnesses (Day 7)
5. Interview accused party (Day 10)
6. Analyze evidence (Day 12)
7. Document findings (Day 14)
8. Review with legal (Day 15)
9. Finalize investigation report (Day 17)

**Campaign Template: Annual Disclosure**
1. Define target population (Week -4)
2. Review/update disclosure form (Week -3)
3. Test campaign workflow (Week -2)
4. Send launch communication (Week -1)
5. Launch campaign (Day 0)
6. Send first reminder (Week 2)
7. Send second reminder (Week 3)
8. Escalate to managers (Week 4)
9. Review flagged disclosures (Week 4+)
10. Generate completion report (Week 5)
11. Follow up on non-responders (Week 6)

**Implementation Template: Standard**
- Phase 1: Foundation (Week 1-2)
- Phase 2: Users & Access (Week 2-3)
- Phase 3: Case Management Setup (Week 3-4)
- Phase 4: Integrations (Week 4-5)
- Phase 5: Data Migration (Week 5-7)
- Phase 6: Training (Week 6-7)
- Phase 7: Go-Live Readiness (Week 7-8)
- Phase 8: Handoff (Week 8)

### E. Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | February 2026 | Initial draft | Claude |

---

*End of Project & Task Management PRD*
