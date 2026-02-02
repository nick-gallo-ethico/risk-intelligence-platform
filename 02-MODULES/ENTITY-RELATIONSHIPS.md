# Entity Relationship Diagram

**Purpose:** Visual overview of how all major entities across the Ethico Risk Intelligence Platform connect.

**Last Updated:** February 2026

---

## Table of Contents

1. [High-Level Domain Model](#high-level-domain-model)
2. [Core Domain (Foundation)](#core-domain-foundation)
3. [Intake Domain (RIU Flow)](#intake-domain-riu-flow)
4. [Work Domain (Case Processing)](#work-domain-case-processing)
5. [Intelligence Domain (Analytics)](#intelligence-domain-analytics)
6. [The RIU-to-Case Flow (Critical Path)](#the-riu-to-case-flow-critical-path)
7. [Complete Entity Matrix](#complete-entity-matrix)

---

## High-Level Domain Model

```
+=====================================================================+
|                      ETHICO RISK INTELLIGENCE PLATFORM               |
+=====================================================================+

                           +-----------------+
                           |  ORGANIZATION   |  <-- Tenant Root
                           |  (Multi-Tenant) |
                           +--------+--------+
                                    |
         +-----------+-------+------+-------+----------+-----------+
         |           |       |              |          |           |
         v           v       v              v          v           v
    +--------+  +--------+  +--------+  +--------+  +--------+  +--------+
    |  User  |  |Employee|  |Business|  |Location|  |Category|  | Audit  |
    |        |  |        |  |  Unit  |  |        |  |        |  |  Log   |
    +--------+  +--------+  +--------+  +--------+  +--------+  +--------+
         |           |           |           |           |
         +-----------+-----------+-----------+-----------+
                                 |
            REFERENCED BY ALL DOMAIN ENTITIES
                                 |
    +----------------------------+----------------------------+
    |                            |                            |
    v                            v                            v
+--------+                 +-----------+               +-----------+
| INTAKE |                 |   WORK    |               |INTELLIGENCE|
| DOMAIN |                 |   DOMAIN  |               |   DOMAIN   |
+--------+                 +-----------+               +-----------+
    |                            |                            |
    |  - RIU                     |  - Case                    |  - Dashboard
    |  - Campaign                |  - Investigation           |  - Report
    |  - CampaignAssignment      |  - Subject                 |  - SavedSearch
    |  - DisclosureForm          |  - Interaction             |  - FactTable
    |  - ChatbotConversation     |  - CaseMessage             |
    |                            |  - Project                 |
    |                            |  - Task                    |
    |                            |  - Policy                  |
    |                            |  - PolicyVersion           |
    |                            |  - Attestation             |
    +----------------------------+----------------------------+
```

---

## Core Domain (Foundation)

These foundational entities are referenced by all other domains.

```
+=====================================================================+
|                         CORE DOMAIN                                  |
+=====================================================================+

                    +------------------+
                    |   Organization   |
                    +------------------+
                    | id               |
                    | name             |
                    | slug             |
                    | tier             |
                    | settings (JSON)  |
                    +--------+---------+
                             |
       +----------+----------+----------+----------+----------+
       |          |          |          |          |          |
       | 1      * | 1      * | 1      * | 1      * | 1      * |
       v          v          v          v          v          v
+----------+ +----------+ +----------+ +----------+ +----------+
|   User   | | Employee | | Business | | Location | | Category |
+----------+ +----------+ |   Unit   | +----------+ +----------+
| id       | | id       | +----------+ | id       | | id       |
| email    | | hris_id  | | id       | | name     | | name     |
| role     | | email    | | name     | | code     | | module   |
| is_active| | status   | | code     | | country  | | severity |
+----+-----+ +----+-----+ +----+-----+ +----+-----+ +----+-----+
     |            |            |            |            |
     |            |            |            |            |
     +------------+------------+------------+------------+
                             |
                    (Self-referential hierarchies)
                             |
     +------------+------------+------------+
     |            |            |
     v            v            v
+----------+ +----------+ +----------+
|  User    | | Business | | Category |
|   has    | |   Unit   | |   has    |
| Employee | |   has    | |  Parent  |
| (opt)    | |  Parent  | |          |
+----------+ +----------+ +----------+


RELATIONSHIP KEY:
-----------------
User 1 -------- 0..1 Employee     (User optionally linked to HRIS Employee)
Employee 1 ---- 0..1 User         (Employee optionally has platform login)
Employee * ---- 1 Manager         (Employee reports to Manager/Employee)
BusinessUnit * --- 0..1 Parent    (Hierarchical)
Location * ------- 0..1 Parent    (Hierarchical)
Category * ------- 0..1 Parent    (Hierarchical taxonomy)
```

---

## Intake Domain (RIU Flow)

The Intake Domain handles all inputs into the platform. RIUs are immutable records of "something happened."

```
+=====================================================================+
|                        INTAKE DOMAIN                                 |
+=====================================================================+

                          +------------------+
                          |     Campaign     |
                          +------------------+
                          | id               |
                          | type             |  disclosure | attestation | survey
                          | name             |
                          | target_audience  |
                          | due_date         |
                          | auto_case_rules  |
                          +--------+---------+
                                   |
                                   | 1
                                   |
                                   | *
                                   v
                    +------------------------+
                    |  CampaignAssignment    |
                    +------------------------+
                    | id                     |
                    | campaign_id        FK  |
                    | employee_id        FK  |-------> Employee
                    | status                 |  pending | completed | overdue
                    | due_date               |
                    | completed_at           |
                    +------------+-----------+
                                 |
                                 | When employee responds
                                 | 1
                                 v
+=====================================================================+
|                    RISK INTELLIGENCE UNIT (RIU)                      |
|                         [IMMUTABLE INPUT]                            |
+=====================================================================+
| id                                                                   |
| organization_id                   FK --> Organization                |
| type                              hotline_report | web_form |        |
|                                   disclosure_response | attestation  |
| source_channel                    phone | web | chatbot | email      |
| reporter_type                     anonymous | confidential | identified|
| reporter_employee_id              FK --> Employee (if identified)    |
| category_id                       FK --> Category (as captured)      |
| severity                          (as captured at intake)            |
| details                           [IMMUTABLE narrative]              |
| status                            pending_qa | released              |
|                                                                      |
| ai_summary                        (can be regenerated)               |
| ai_risk_score                     (AI assessment)                    |
| ai_translation                    (if non-English)                   |
|                                                                      |
| campaign_assignment_id            FK --> CampaignAssignment (if any) |
| chatbot_conversation_id           FK --> ChatbotConversation (if any)|
+=====================================================================+
         |
         | Creates Case (if rules met)
         |
         v
    [ Case Domain ]


ADDITIONAL INTAKE ENTITIES:
---------------------------

+------------------+          +------------------------+
|  DisclosureForm  |          | ChatbotConversation    |
+------------------+          +------------------------+
| id               |          | id                     |
| organization_id  |          | organization_id        |
| name             |          | employee_id (opt)      |
| form_schema JSON |          | transcript JSON        |
| disclosure_type  |          | outcome                |
| thresholds JSON  |          | escalated              |
+------------------+          | riu_id (if creates)    |
                              +------------------------+

RELATIONSHIP KEY:
-----------------
Campaign 1 ---------- * CampaignAssignment
CampaignAssignment 1 - 1 Employee
CampaignAssignment 1 - 0..1 RIU (when completed)
RIU * --------------- 1 Organization
RIU * --------------- 0..1 Employee (reporter)
RIU * --------------- 1 Category
RIU 0..1 ------------ 1 ChatbotConversation (if chatbot source)
```

---

## Work Domain (Case Processing)

The Work Domain contains mutable work containers where the organization tracks its response to inputs.

```
+=====================================================================+
|                         WORK DOMAIN                                  |
+=====================================================================+

                 RIU (from Intake Domain)
                          |
                          | riu_case_associations (M:M)
                          | association_type: primary | related | merged_from
                          |
                          v
+=====================================================================+
|                           CASE                                       |
|                    [MUTABLE WORK CONTAINER]                          |
+=====================================================================+
| id                                                                   |
| organization_id               FK --> Organization                    |
| case_number                   (auto-generated)                       |
|                                                                      |
| category_id                   FK --> Category (may differ from RIU)  |
| severity                      (may differ from RIU - corrected)      |
| status                        new | in_progress | closed             |
| status_rationale              (why this status)                      |
|                                                                      |
| assigned_to_id                FK --> User                            |
| assigned_team_id              FK --> Team                            |
| pipeline_id / stage           (workflow position)                    |
|                                                                      |
| substantiated                 boolean                                |
| outcome                       (final determination)                  |
| finding_summary               (narrative)                            |
|                                                                      |
| merged_into_case_id           FK --> Case (if merged)                |
|                                                                      |
| ai_case_summary               (AI-generated)                         |
| ai_risk_score                 (AI assessment)                        |
+=====================================================================+
         |
         | 1
         |
    +----+----+--------------------+--------------------+
    |         |                    |                    |
    | *       | *                  | *                  | *
    v         v                    v                    v
+--------+ +--------+        +-----------+        +-----------+
|Subject | |Investi-|        |Interaction|        |   Case    |
|        | | gation |        |           |        |  Message  |
+--------+ +--------+        +-----------+        +-----------+
| id     | | id     |        | id        |        | id        |
| case_id| | case_id|        | case_id   |        | case_id   |
|employee| | status |        | type      |        | direction |
| _id    | |investi-|        | channel   |        | content   |
| type   | | gator  |        | notes     |        | is_read   |
| role   | | findings        | new_info  |        |           |
+--------+ +--------+        +-----------+        +-----------+
              |
              | 1
              | * (Investigation has many)
              v
        +-----------+
        |   Task    |
        +-----------+      (Investigation-level tasks)


POLICY MANAGEMENT ENTITIES:
---------------------------

+------------------+        +-----------------+        +----------------+
|     Policy       |        |  PolicyVersion  |        |  Attestation   |
+------------------+        +-----------------+        +----------------+
| id               |  1   * | id              |        | id             |
| organization_id  |--------| policy_id       |        | policy_version |
| name             |        | version_number  |        |    _id         |
| status           |        | content         |        | employee_id    |
| owner_id --> User|        | published_at    |        | status         |
| category_id      |        | approval_status |        | attested_at    |
+------------------+        +-----------------+        +----------------+
                                    |
                                    | * (Attestations for a version)
                                    +----------------------------------+


PROJECT MANAGEMENT:
-------------------

+------------------+        +------------------+
|     Project      |        |       Task       |
+------------------+        +------------------+
| id               |  1   * | id               |
| organization_id  |--------| project_id       |
| name             |        | title            |
| status           |        | status           |
| owner_id --> User|        | assignee_id      |
+------------------+        | due_date         |
                            | entity_type      |  (polymorphic link)
                            | entity_id        |
                            +------------------+


RELATIONSHIP KEY:
-----------------
RIU M ----------- M Case        (via riu_case_associations)
Case 1 --------- * Subject
Case 1 --------- * Investigation
Case 1 --------- * Interaction
Case 1 --------- * CaseMessage
Case * --------- 1 User         (assigned_to)
Case * --------- 0..1 Case      (merged_into)

Investigation 1 - 1 User        (investigator)
Investigation 1 - * Task        (checklist items)

Subject * ------ 0..1 Employee  (if HRIS-linked)

Policy 1 ------- * PolicyVersion
PolicyVersion 1 - * Attestation
Attestation * --- 1 Employee

Project 1 ------ * Task
Task * --------- 0..1 User      (assignee)
```

---

## Intelligence Domain (Analytics)

The Intelligence Domain aggregates data for reporting and insights.

```
+=====================================================================+
|                      INTELLIGENCE DOMAIN                             |
+=====================================================================+

+------------------+        +------------------+        +----------------+
|    Dashboard     |        |      Report      |        |  SavedSearch   |
+------------------+        +------------------+        +----------------+
| id               |        | id               |        | id             |
| organization_id  |        | organization_id  |        | organization_id|
| name             |        | name             |        | name           |
| owner_id --> User|        | type             |        | entity_type    |
| is_default       |        | data_source      |        | filters JSON   |
| layout JSON      |        | filters JSON     |        | columns JSON   |
+--------+---------+        | schedule         |        | owner_id       |
         |                  | last_run_at      |        | is_shared      |
         | 1                +------------------+        +----------------+
         |
         | * (Dashboard has many widgets)
         v
+------------------+
| DashboardWidget  |
+------------------+
| id               |
| dashboard_id     |
| widget_type      |  chart | metric | table | list
| data_source      |
| config JSON      |
| position JSON    |
+------------------+


FACT TABLES (Analytics Layer):
------------------------------

+--------------------+     +--------------------+     +--------------------+
|   FACT_RIU_DAILY   |     |  FACT_CASE_DAILY   |     |FACT_CAMPAIGN_DAILY |
+--------------------+     +--------------------+     +--------------------+
| date_id            |     | date_id            |     | date_id            |
| organization_id    |     | organization_id    |     | organization_id    |
| riu_type           |     | status             |     | campaign_id        |
| source_channel     |     | outcome            |     | campaign_type      |
| category_id        |     | category_id        |     | assignments_total  |
| severity           |     | assigned_to_id     |     | completed_count    |
| location_id        |     | severity           |     | overdue_count      |
| business_unit_id   |     | avg_days_open      |     | cases_created      |
| is_anonymous       |     | sla_status         |     | completion_rate    |
| count              |     | count              |     +--------------------+
+--------------------+     +--------------------+


NOTIFICATION ENTITIES:
----------------------

+------------------------+        +------------------------+
| NotificationTemplate   |        |     Notification       |
+------------------------+        +------------------------+
| id                     |        | id                     |
| organization_id        |        | organization_id        |
| name                   |        | template_id            |
| channel                |  email | sms | in_app           |
| subject_template       |        | recipient_user_id      |
| body_template          |        | recipient_email        |
| trigger_event          |        | status                 |
+------------------------+        | sent_at                |
                                  | entity_type            |
                                  | entity_id              |
                                  +------------------------+


RELATIONSHIP KEY:
-----------------
Dashboard 1 -------- * DashboardWidget
Dashboard * -------- 1 User (owner)
Report * ----------- 1 User (creator)
SavedSearch * ------ 1 User (owner)
Notification * ----- 0..1 NotificationTemplate
Notification * ----- 0..1 User (recipient)
```

---

## The RIU-to-Case Flow (Critical Path)

This is the most important data flow in the platform. RIUs are immutable inputs; Cases are mutable work containers.

```
+=====================================================================+
|              THE RIU --> CASE CRITICAL PATH                          |
+=====================================================================+

    INPUT SOURCES                          WORK PROCESSING
    =============                          ===============

    +-------------+
    |   Phone     |
    |   Call      |---+
    +-------------+   |
                      |    +-------------------+
    +-------------+   +--->| OPERATOR CONSOLE  |
    |   Web       |   |    |  (QA Required)    |
    |   Form      |---+    +--------+----------+
    +-------------+   |             |
                      |             v
    +-------------+   |    +-------------------+
    |  Chatbot    |---+--->|       RIU         |
    +-------------+   |    | (Immutable Input) |
                      |    +--------+----------+
    +-------------+   |             |
    |  Disclosure |---+             | status: pending_qa
    |  Campaign   |                 |
    +-------------+                 v
                           +-------------------+
                           |    QA REVIEW      |
                           | (Hotline only)    |
                           +--------+----------+
                                    |
                                    | status: released
                                    |
                                    v
                    +-------------------------------+
                    |     CASE CREATION RULES       |
                    +-------------------------------+
                    | - Hotline: Always             |
                    | - Web Form: Always            |
                    | - Disclosure: If threshold    |
                    | - Attestation: If failure     |
                    +---------------+---------------+
                                    |
               +--------------------+--------------------+
               |                                         |
               v                                         v
    +---------------------+                   +---------------------+
    |    NO CASE CREATED  |                   |    CASE CREATED     |
    | (RIU stored only)   |                   | (Work begins)       |
    +---------------------+                   +----------+----------+
                                                         |
                                                         v
                                              +---------------------+
                                              |       CASE          |
                                              +---------------------+
                                              | - Assignment        |
                                              | - Investigation(s)  |
                                              | - Subjects          |
                                              | - Communications    |
                                              | - Findings          |
                                              | - Remediation       |
                                              +---------------------+


MANY RIUs --> ONE CASE (Consolidation)
--------------------------------------

    +--------+
    | RIU #1 |---+  association_type: 'primary'
    +--------+   |
                 |
    +--------+   |       +-------------------+
    | RIU #2 |---+------>|    CASE #100      |
    +--------+   |       | "Safety Issue"    |
                 |       +-------------------+
    +--------+   |              |
    | RIU #3 |---+              +---> Investigation A
    +--------+     'related'    +---> Investigation B
                                +---> Remediation Plan


CASE MERGE FLOW
---------------

    +----------+                +----------+
    | CASE #50 |                | CASE #51 |
    +----+-----+                +----+-----+
         |                           |
         | RIU #10                   | RIU #11
         | RIU #12                   |
         |                           |
         +---------------------------+
                     |
                     | MERGE INTO
                     v
              +------------+
              |  CASE #50  |  (Primary - keeps all content)
              +------------+
              | RIU #10 (primary)
              | RIU #11 (merged_from)
              | RIU #12 (related)
              +------------+

              +------------+
              |  CASE #51  |  (Tombstone - read-only redirect)
              | merged_into: #50
              +------------+
```

---

## Complete Entity Matrix

### Entity Ownership by Module

| Entity | Module | Owns | References |
|--------|--------|------|------------|
| **Organization** | Core | Root | - |
| **User** | Core | Auth/RBAC | Organization, Employee, Location, BusinessUnit |
| **Employee** | Core | HRIS Data | Organization, Location, BusinessUnit, Manager(Employee) |
| **BusinessUnit** | Core | Org Structure | Organization, Parent(BusinessUnit) |
| **Location** | Core | Geography | Organization, Parent(Location) |
| **Category** | Core | Taxonomy | Organization, Parent(Category) |
| **AuditLog** | Core | Activity | Organization, User, Entity(polymorphic) |
| **RIU** | Intake | Immutable Input | Organization, Employee, Category, Campaign |
| **Campaign** | Intake | Outbound Request | Organization, DisclosureForm |
| **CampaignAssignment** | Intake | Obligation | Campaign, Employee, RIU |
| **DisclosureForm** | Intake | Form Schema | Organization, Category |
| **ChatbotConversation** | Intake | Transcript | Organization, Employee, RIU |
| **Case** | Work | Work Container | Organization, Category, User, Team, RIU(M:M) |
| **Investigation** | Work | Workstream | Case, User(investigator), Template |
| **Subject** | Work | Person Involved | Case, Employee |
| **Interaction** | Work | Follow-up | Case, RIU |
| **CaseMessage** | Work | Communication | Case, User |
| **Policy** | Work | Document | Organization, User(owner), Category |
| **PolicyVersion** | Work | Versioned Content | Policy |
| **Attestation** | Work | Acknowledgment | PolicyVersion, Employee |
| **Project** | Work | Program Mgmt | Organization, User(owner) |
| **Task** | Work | Action Item | Project/Investigation, User(assignee), Entity(polymorphic) |
| **Dashboard** | Intelligence | Visualization | Organization, User(owner) |
| **DashboardWidget** | Intelligence | Widget | Dashboard |
| **Report** | Intelligence | Data Export | Organization, User(creator) |
| **SavedSearch** | Intelligence | Filter | Organization, User(owner) |
| **Notification** | Intelligence | Alert | Organization, User, Template, Entity(polymorphic) |
| **NotificationTemplate** | Intelligence | Template | Organization |

### Cardinality Summary

| Relationship | Cardinality | Notes |
|--------------|-------------|-------|
| Organization : User | 1 : * | Tenant has many users |
| Organization : Employee | 1 : * | Tenant has many employees |
| Organization : RIU | 1 : * | Tenant has many RIUs |
| Organization : Case | 1 : * | Tenant has many cases |
| User : Employee | 1 : 0..1 | Optional HRIS linkage |
| Employee : Employee (manager) | * : 0..1 | Manager hierarchy |
| Campaign : CampaignAssignment | 1 : * | Campaign targets many employees |
| CampaignAssignment : Employee | * : 1 | Assignment belongs to one employee |
| CampaignAssignment : RIU | 1 : 0..1 | Response creates RIU |
| **RIU : Case** | **M : M** | **Critical: via riu_case_associations** |
| Case : Investigation | 1 : * | Case has many investigations |
| Case : Subject | 1 : * | Case involves many people |
| Case : Interaction | 1 : * | Case has many follow-ups |
| Case : Case (merge) | * : 0..1 | Cases can merge |
| Investigation : Task | 1 : * | Investigation has checklist |
| Policy : PolicyVersion | 1 : * | Policy has version history |
| PolicyVersion : Attestation | 1 : * | Version has many attestations |
| Dashboard : DashboardWidget | 1 : * | Dashboard has many widgets |

---

## Quick Reference: Key Foreign Keys

```
CORE:
  User.organization_id         --> Organization.id
  User.employee_id             --> Employee.id
  Employee.organization_id     --> Organization.id
  Employee.manager_id          --> Employee.id
  Employee.location_id         --> Location.id
  Employee.business_unit_id    --> BusinessUnit.id
  BusinessUnit.parent_id       --> BusinessUnit.id
  Location.parent_id           --> Location.id
  Category.parent_id           --> Category.id

INTAKE:
  RIU.organization_id          --> Organization.id
  RIU.category_id              --> Category.id
  RIU.reporter_employee_id     --> Employee.id
  Campaign.organization_id     --> Organization.id
  CampaignAssignment.campaign_id --> Campaign.id
  CampaignAssignment.employee_id --> Employee.id
  CampaignAssignment.riu_id    --> RIU.id

WORK:
  Case.organization_id         --> Organization.id
  Case.category_id             --> Category.id
  Case.assigned_to_id          --> User.id
  Case.merged_into_case_id     --> Case.id

  riu_case_associations.riu_id --> RIU.id
  riu_case_associations.case_id --> Case.id

  Investigation.case_id        --> Case.id
  Investigation.investigator_id --> User.id
  Subject.case_id              --> Case.id
  Subject.employee_id          --> Employee.id
  Interaction.case_id          --> Case.id

  Policy.organization_id       --> Organization.id
  Policy.owner_id              --> User.id
  PolicyVersion.policy_id      --> Policy.id
  Attestation.policy_version_id --> PolicyVersion.id
  Attestation.employee_id      --> Employee.id

  Project.organization_id      --> Organization.id
  Task.project_id              --> Project.id
  Task.assignee_id             --> User.id

INTELLIGENCE:
  Dashboard.organization_id    --> Organization.id
  Dashboard.owner_id           --> User.id
  DashboardWidget.dashboard_id --> Dashboard.id
  Report.organization_id       --> Organization.id
  SavedSearch.organization_id  --> Organization.id
  Notification.user_id         --> User.id
```

---

*End of Entity Relationship Diagram*
