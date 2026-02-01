# Ethico Risk Intelligence Platform
## PRD-009: Policy Management

**Document ID:** PRD-009
**Version:** 3.1 (RIU Architecture Integration)
**Priority:** P1 - High (Extended Module)
**Development Phase:** Phase 2
**Last Updated:** February 2026

**Cross-References:**
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md` (v3.2 - authoritative RIU architecture)
- Authentication & Multi-tenancy: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md`
- AI Integration Patterns: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-INTEGRATION.md`
- Case Management: `02-MODULES/05-CASE-MANAGEMENT/PRD.md` (v3.1 - RIU/Case architecture)

> **Architecture Reference:** This PRD implements the RIU (Risk Intelligence Unit) architecture defined in `00-PLATFORM/01-PLATFORM-VISION.md v3.2`. Policy attestation responses create **immutable RIUs** (type: `attestation_response`). Attestation failures or refusals can optionally create **Cases** (configurable per campaign). Cases can link to specific **Policy Versions** when categorized as policy violations.

> **Tech Stack:** NestJS (backend) + Next.js (frontend) + shadcn/ui + Tailwind CSS.
> See `01-SHARED-INFRASTRUCTURE/` docs for implementation patterns and standards.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Competitive Analysis](#competitive-analysis)
3. [Feature Specifications](#feature-specifications)
   - F1: Policy Creation
   - F2: Approval Workflows
   - F3: AI Policy Generation
   - F4: Attestation Tracking
   - F5: Exception Lifecycle Management
   - F6: Regulatory Framework Management
   - F7: Risk, Incident & Investigation Linkage
   - F8: Unified Employee Policy Hub
   - F9: SharePoint Integration
   - F10: External/Partner Portals
   - F11: LMS Integration
   - F12: Integration Marketplace
   - F13: Conditional Workflow Logic
   - F14: Real-Time Audit Dashboards
   - F15: AI Auto-Tagging & Summarization
   - F16: Engagement Testing (Quizzes & Certifications)
4. [UI/UX Wireframes](#uiux-wireframes)
5. [API Specifications](#api-specifications)
6. [Data Models](#data-models)
7. [Integration Specifications](#integration-specifications)
8. [Non-Functional Requirements](#non-functional-requirements)

---

# Executive Summary

## Product Vision

Ethico Policy Management transforms how compliance teams create, approve, distribute, and track organizational policies. Unlike legacy tools that rely on file check-out systems and manual workflows, our platform provides real-time collaboration, AI-powered content generation, and intelligent automation.

## Key Differentiators

| Capability | Ethico | PolicyTech (NAVEX) | PowerDMS | SharePoint |
|------------|--------|-------------------|----------|------------|
| Real-time collaborative editing | ✅ | ❌ | ❌ | ⚠️ Limited |
| AI policy generation | ✅ | ❌ | ❌ | ❌ |
| AI translation (7+ languages) | ✅ | ❌ | ❌ | ❌ |
| AI auto-tagging & summarization | ✅ | ❌ | ❌ | ❌ |
| Email-based approvals | ✅ | ❌ | ⚠️ Limited | ❌ |
| No file check-out required | ✅ | ❌ | ✅ | ✅ |
| Built-in task management | ✅ | ❌ | ❌ | ⚠️ Separate |
| Exception lifecycle management | ✅ | ⚠️ Basic | ❌ | ❌ |
| Regulatory framework mapping | ✅ | ⚠️ Manual | ❌ | ❌ |
| Risk/Case/Investigation linkage | ✅ | ❌ | ❌ | ❌ |
| Employee policy hub | ✅ | ⚠️ Basic | ⚠️ Basic | ❌ |
| External partner portals | ✅ | ⚠️ Limited | ❌ | ❌ |
| Conditional workflow routing | ✅ | ❌ | ❌ | ❌ |
| Real-time audit dashboards | ✅ | ⚠️ Basic | ⚠️ Basic | ❌ |
| Quiz & certification engine | ✅ | ⚠️ Separate | ✅ | ❌ |
| Integration marketplace | ✅ | ❌ | ❌ | ✅ |
| 9+ HRIS integrations | ✅ | ⚠️ 3 | ⚠️ 2 | ⚠️ Manual |
| LMS integration | ✅ | ⚠️ 1 | ✅ | ❌ |
| SharePoint integration | ✅ | ❌ | ❌ | N/A |
| Semantic search | ✅ | ❌ | ❌ | ⚠️ Basic |
| Modern UI/UX | ✅ | ❌ | ⚠️ Dated | ✅ |

---

## User Stories

### Client Admin

**Create policy document**
As a **Policy Author**, I want to create a new policy using a rich text editor
so that I can draft policies without external tools.

Key behaviors:
- ProseMirror editor with formatting, tables, links
- Template library for common policy types
- Auto-save during editing
- Collaborative editing with Y.js (multiple authors)
- Activity logged: "Policy Author {name} created policy draft"

---

**Generate policy draft with AI**
As a **Policy Author**, I want AI to generate a draft policy from a description
so that I have a starting point rather than blank page.

Key behaviors:
- Describe policy intent in natural language
- AI generates structured draft with sections
- Draft marked as "AI-generated" for review
- Can iterate with additional prompts
- AI interactions logged to AI_CONVERSATION

---

**Submit policy for approval**
As a **Policy Author**, I want to submit a draft policy for approval
so that it goes through the required review process.

Key behaviors:
- Select approval workflow or use default
- Workflow routes to appropriate approvers
- Approvers notified via email
- Can track approval progress
- Activity logged: "Policy Author {name} submitted policy for approval"

---

**Approve or reject policy**
As a **Policy Reviewer**, I want to approve or reject submitted policies
so that only vetted policies get published.

Key behaviors:
- View policy with tracked changes
- Add comments inline or general
- Approve, reject, or request changes
- Email approval supported (click link to approve)
- Activity logged: "Policy Reviewer {name} approved/rejected policy"

---

**Publish policy version**
As a **Policy Author**, I want to publish an approved policy
so that employees can access the latest version.

Key behaviors:
- Publishing creates immutable version
- Previous version archived (still accessible)
- Version history with diff comparison
- Effective date can be future-dated
- Activity logged: "Policy Author {name} published policy version {version}"

---

**Translate policy to other languages**
As a **Policy Author**, I want to translate policies into multiple languages
so that global employees can read policies in their language.

Key behaviors:
- AI generates translation suggestions
- Human review before publishing translation
- Original and translations linked by version
- Translation status tracked per language
- Activity logged: "Policy Author {name} added {language} translation"

---

**Launch attestation campaign**
As a **Compliance Officer**, I want to launch a campaign requiring employees to attest to a policy
so that I can demonstrate policy acknowledgment.

Key behaviors:
- Target employees by HRIS attributes
- Set campaign dates and reminders
- Require signature or checkbox
- Track completion progress
- Activity logged: "Compliance Officer {name} launched attestation campaign"

---

**Monitor attestation progress**
As a **Compliance Officer**, I want to monitor attestation completion
so that I can follow up with non-completers.

Key behaviors:
- Dashboard: total, completed, pending, overdue
- Drill down by department, location
- Send reminder to non-completers
- Export compliance report
- Activity logged: "Compliance Officer {name} sent attestation reminder"

---

**Request policy exception**
As a **Compliance Officer**, I want to record exception requests against policies
so that approved deviations are tracked.

Key behaviors:
- Link exception to specific policy
- Capture justification and compensating controls
- Route to appropriate approver
- Set expiration date for exception
- Activity logged: "Compliance Officer {name} created exception request"

---

**Link policy to regulatory framework**
As a **Compliance Officer**, I want to map policies to regulatory requirements
so that I can demonstrate compliance to auditors.

Key behaviors:
- Select from framework library (SOX, GDPR, HIPAA, etc.)
- Map policy sections to specific requirements
- Generate coverage report
- Identify gaps in coverage
- Activity logged: "Compliance Officer {name} mapped policy to {framework}"

---

**Link policy to case or investigation**
As an **Investigator**, I want to link policies to cases
so that policy violations are tracked with investigations.

Key behaviors:
- Search policies by name or content
- Link appears on case and policy
- Notes on relationship captured
- Policy version at time of incident preserved
- Activity logged: "Investigator {name} linked case to policy"

---

### End User

**Read assigned policies**
As an **Employee**, I want to read policies assigned to me
so that I understand my obligations.

Key behaviors:
- Policies shown in preferred language
- Search within policy content
- Bookmark policies for quick access
- Track reading progress
- organizationId enforced by RLS

---

**Attest to policy**
As an **Employee**, I want to acknowledge that I've read and understood a policy
so that I'm compliant with company requirements.

Key behaviors:
- View full policy before attestation
- Checkbox or electronic signature capture
- Attestation timestamp recorded
- Confirmation shown and emailed
- Activity logged: "Employee {name} attested to policy"

---

**Ask question about policy**
As an **Employee**, I want to ask questions about policies
so that I understand how they apply to my situation.

Key behaviors:
- Link to chatbot or inquiry form
- Policy context included in question
- Response routed to compliance team
- Conversation tracked for audit

---

**Search for policies**
As an **Employee**, I want to search all published policies
so that I can find relevant guidance.

Key behaviors:
- Full-text search across all policies
- Filter by category, department, date
- Results show relevant excerpts
- Click to view full policy
- organizationId enforced by RLS

---

# RIU Architecture Integration

> **Note:** This section documents how Policy Management integrates with the platform's RIU→Case architecture. See `00-PLATFORM/01-PLATFORM-VISION.md v3.2` for the authoritative architecture reference.

## Policy Module in the RIU Ecosystem

The Policy Management module creates **Risk Intelligence Units (RIUs)** when employees complete attestations. RIUs are **immutable records** of what occurred - preserving the exact response, timestamp, and context.

### RIU Creation Matrix (Policy Module)

| Trigger | RIU Type Created | Auto-Creates Case? |
|---------|------------------|-------------------|
| Employee attests to policy (successful) | `attestation_response` | No |
| Employee refuses to attest | `attestation_response` | Configurable (per campaign) |
| Employee fails quiz (if required) | `attestation_response` | Configurable (per campaign) |
| Employee never responds (overdue) | No RIU (no response received) | Configurable (per campaign) |

### Attestation Response → RIU Flow

```
Employee Completes Policy Attestation
         │
         ▼
┌─────────────────────────────┐
│  UPDATE Campaign Assignment │
│  status: completed          │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  CREATE RIU                 │
│  type: attestation_response │
│  Links to campaign_id       │
│  Links to policy_version_id │
│  Contains attestation data  │
│  (checkbox, signature, quiz)│
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  EVALUATE THRESHOLDS (auto_case_rules)      │
│  - Did employee refuse to attest?           │
│  - Did employee fail required quiz?         │
│  - Other configurable conditions?           │
└─────────────────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
 No Case   CREATE CASE
 (RIU only) (Non-Compliance Review)
```

### Attestation Response RIU Schema

```
ATTESTATION_RESPONSE_RIU (extends RISK_INTELLIGENCE_UNIT)
├── Core RIU Fields (inherited)
│   ├── id (UUID)
│   ├── organization_id
│   ├── type: 'attestation_response'
│   ├── source_channel: 'policy_attestation'
│   ├── received_at (timestamp)
│   ├── reporter_employee_id (FK to Employee)
│   ├── status: 'received' (attestation RIUs skip QA)
│   ├── ai_summary, ai_risk_score (optional enrichment)
│   └── created_at, created_by
│
├── Attestation-Specific Fields
│   ├── campaign_assignment_id (FK)
│   ├── policy_id (FK)
│   ├── policy_version_id (FK - specific version attested)
│   ├── policy_version_number (denormalized for audit)
│   ├── attestation_type: 'CHECKBOX' | 'SIGNATURE' | 'QUIZ'
│   ├── attestation_result: 'ATTESTED' | 'REFUSED' | 'QUIZ_FAILED'
│   ├── acknowledged_at (timestamp)
│   │
│   ├── Quiz Data (if applicable)
│   │   ├── quiz_id (FK)
│   │   ├── quiz_score (percentage)
│   │   ├── quiz_passed (boolean)
│   │   ├── quiz_attempt_number
│   │   └── quiz_answers (JSONB - preserved for audit)
│   │
│   ├── Signature Data (if applicable)
│   │   ├── signature_type: 'TYPED' | 'DRAWN' | 'ELECTRONIC'
│   │   ├── signature_data (encrypted)
│   │   └── signature_captured_at
│   │
│   └── Refusal Data (if applicable)
│       ├── refusal_reason (text - employee's explanation)
│       └── refusal_category: 'DISAGREE' | 'NOT_APPLICABLE' | 'OTHER'
│
└── Immutability
    └── RIU is immutable after creation - preserves exact attestation record
```

### Case Creation from Attestation (Configurable)

Campaign administrators configure when attestation outcomes should create Cases:

```json
{
  "campaignId": "uuid",
  "name": "Annual Code of Conduct 2026",
  "autoCaseRules": {
    "createCaseOnRefusal": true,
    "createCaseOnQuizFailure": true,
    "createCaseOnOverdue": true,
    "quizFailureThreshold": 2,
    "overdueDaysBeforeCase": 30,
    "caseCategory": "Policy Non-Compliance",
    "caseSeverity": "LOW",
    "caseAssignTo": "manager"
  }
}
```

**Case Creation Scenarios:**

| Scenario | Campaign Assignment | RIU Created | Case Created |
|----------|---------------------|-------------|--------------|
| Employee attests successfully | ✓ Completed | ✓ (attestation_response) | ✗ No |
| Employee attests, passes quiz | ✓ Completed | ✓ (attestation_response) | ✗ No |
| Employee attests, fails quiz | ✓ Completed | ✓ (attestation_response) | If configured |
| Employee refuses to attest | ✓ Refused | ✓ (attestation_response) | If configured |
| Employee never responds (overdue) | ✓ Overdue | ✗ No response | If configured |

### Policy Version Linking for Cases

When a Case involves a policy violation (from any source - investigation, report, etc.), it links to the **specific Policy Version** that was violated:

```
CASE
├── ...other fields...
├── Related Policies (via POLICY_CASE_LINK)
│   ├── policy_id (FK)
│   ├── policy_version_id (FK - specific version violated)
│   ├── policy_version_number (denormalized: "v2.1")
│   ├── link_type: 'VIOLATION' | 'REFERENCE' | 'GOVERNING'
│   ├── link_reason (text - why this policy is relevant)
│   └── linked_at, linked_by
└── ...
```

**Why Link to Specific Version?**
- Legal defensibility: "Employee violated Code of Conduct v2.1, effective Jan 2024"
- Historical accuracy: Policy may have been updated since violation
- Audit trail: Can show exactly what policy was in effect at time of incident

### Campaign Model Integration

Policy attestation campaigns use the platform's **Campaign** entity model:

```
CAMPAIGN (type: policy_attestation)
├── id (UUID)
├── organization_id
├── campaign_type: 'policy_attestation'
├── name: "Annual Code of Conduct 2026"
├── policy_id (FK)
├── policy_version_id (FK - which version to attest)
│
├── Target Audience (JSONB)
│   ├── departments: ["Engineering", "Sales"]
│   ├── locations: ["US", "UK"]
│   ├── job_levels: ["Manager", "Director"]
│   └── exclude_users: ["user-uuid-1"]
│
├── Schedule
│   ├── start_date
│   ├── due_date
│   └── reminder_schedule (JSONB): [7, 14, 21]
│
├── Attestation Config
│   ├── attestation_type: 'CHECKBOX' | 'SIGNATURE' | 'QUIZ'
│   ├── quiz_id (FK, if quiz required)
│   ├── quiz_required: boolean
│   ├── quiz_passing_score: number
│   └── quiz_max_attempts: number
│
├── Auto-Case Rules (JSONB)
│   └── (see configuration above)
│
├── Status: 'DRAFT' | 'ACTIVE' | 'CLOSED'
└── created_at, created_by
```

---

# Competitive Analysis

## PolicyTech (NAVEX Global)

**Market Position:** Industry leader with ~40% market share
**Annual Revenue:** $500M+ (parent company NAVEX)
**Pricing:** $15-50K/year for mid-market

### Strengths
- Established brand recognition
- Comprehensive compliance suite
- Strong enterprise sales team
- SOC 2, ISO 27001 certified

### Weaknesses
- **File check-out system** - Only one user can edit at a time
- **Outdated UI** - Looks like 2010-era software
- **Poor version control** - Manual, error-prone
- **Limited workflow flexibility** - Pre-built templates only
- **No AI capabilities** - All manual content creation
- **Slow performance** - Legacy architecture
- **High implementation costs** - 3-6 month deployments

### Customer Complaints (from G2, Gartner reviews)
> "The check-out system is a nightmare when multiple people need to review."

> "Interface looks like it hasn't been updated in 10 years."

> "Reporting is basic and inflexible."

> "No way to collaborate in real-time like Google Docs."

**Ethico Advantage:** Real-time collaboration, modern UI, AI capabilities, faster deployment

---

## PowerDMS

**Market Position:** Strong in public safety/healthcare verticals
**Pricing:** $8-25K/year

### Strengths
- Strong training management integration
- Good mobile app
- Compliance tracking

### Weaknesses
- **Limited workflow customization** - Can't build custom approval chains
- **Poor policy vs. procedure distinction** - Everything treated the same
- **No real-time collaboration** - Sequential editing only
- **Basic search** - Keyword only, no semantic
- **Limited integrations** - Few HRIS connectors

### Customer Complaints
> "Can't create complex workflows with parallel approvals."

> "Search never finds what I'm looking for."

> "Attestation tracking is basic."

**Ethico Advantage:** Custom workflows, semantic search, comprehensive HRIS integration

---

## SharePoint/Box/Google Drive

**Market Position:** Generic document management used for policies
**Pricing:** Per-user licensing ($5-20/user/month)

### Strengths
- Already deployed in most organizations
- Familiar interface
- Good collaboration features
- Low incremental cost

### Weaknesses
- **No policy-specific workflows** - Must build everything custom
- **No attestation tracking** - Requires third-party tools
- **No compliance reporting** - Manual tracking
- **No version control designed for policies** - Generic document versioning
- **No distribution campaigns** - Manual email processes
- **No audit trail for compliance** - Basic activity logs only

### Customer Complaints
> "We built a policy system in SharePoint but it's a mess."

> "Tracking who read policies is impossible."

> "No way to run compliance reports."

**Ethico Advantage:** Purpose-built for policy management with native attestation, workflows, and compliance reporting

---

## Competitive Positioning Matrix

```
                    Feature-Rich
                         │
                         │   ◆ Ethico (Target)
                         │
    PolicyTech ◆         │
                         │
    ─────────────────────┼─────────────────────
    Legacy/Complex       │        Modern/Simple
                         │
         PowerDMS ◆      │
                         │
                         │      ◆ SharePoint
                    Feature-Limited
```

---

# Feature Specifications

## Feature F1: Policy Creation

### Overview
Users create policies using a rich text editor with formatting tools, auto-save, and template support.

### User Flow
```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard                                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  + Create Policy  │  📁 Import  │  🤖 AI Generate      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  New Policy                                                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Title: [________________________]                      ││
│  │  Type:  [Ethics        ▼]   Status: Draft              ││
│  │  Owner: [Current User  ▼]                              ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │  B  I  U  │ H1 H2 H3 │ • ≡ │ 🔗 📷 📊 │ ...            ││
│  ├─────────────────────────────────────────────────────────┤│
│  │                                                         ││
│  │  [Rich text editor content area]                        ││
│  │                                                         ││
│  │  Type your policy content here...                       ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │  💾 Saved 2 seconds ago     [Save Draft] [Submit ▼]    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Acceptance Criteria
- Title is required (max 200 characters)
- Policy type is required (dropdown with predefined types)
- Owner defaults to current user
- Auto-save triggers every 30 seconds after changes
- Manual save available anytime
- Draft status persists until submission

### Edge Cases
- **Network disconnection:** Queue changes locally, sync when reconnected
- **Concurrent edit attempt:** Show warning if another user is editing
- **Session timeout:** Save draft before logout, warn user
- **Large paste operation:** Handle up to 50 pages of content

---

## Feature F2: Approval Workflows

### Overview
Configurable approval workflows with sequential and parallel steps, role-based or user-specific assignment.

### Workflow Definition Schema
```json
{
  "id": "wf-uuid",
  "name": "Standard 3-Step Approval",
  "steps": [
    {
      "order": 1,
      "name": "Legal Review",
      "type": "sequential",
      "approvers": [
        { "type": "role", "value": "POLICY_REVIEWER" }
      ],
      "requiredApprovals": 1,
      "timeoutDays": 7
    },
    {
      "order": 2,
      "name": "Compliance Approval",
      "type": "parallel",
      "approvers": [
        { "type": "user", "value": "user-uuid-1" },
        { "type": "user", "value": "user-uuid-2" }
      ],
      "requiredApprovals": 2,
      "timeoutDays": 5
    },
    {
      "order": 3,
      "name": "Executive Sign-off",
      "type": "sequential",
      "approvers": [
        { "type": "role", "value": "COMPLIANCE_OFFICER" }
      ],
      "requiredApprovals": 1,
      "timeoutDays": 3
    }
  ],
  "onReject": "returnToAuthor",
  "onTimeout": "escalate"
}
```

### State Machine

```
                    ┌─────────────┐
                    │   DRAFT     │
                    └──────┬──────┘
                           │ submit
                           ▼
                    ┌─────────────┐
              ┌─────│  PENDING    │─────┐
              │     └──────┬──────┘     │
              │            │            │
         reject            │ approve    │ timeout
              │            ▼            │
              │     ┌─────────────┐     │
              │     │ IN_PROGRESS │     │
              │     └──────┬──────┘     │
              │            │            │
              │     ┌──────┴──────┐     │
              │     │             │     │
              ▼     ▼             ▼     ▼
        ┌──────────┐       ┌──────────────┐
        │ REJECTED │       │   APPROVED   │
        └────┬─────┘       └──────┬───────┘
             │                    │
             │ resubmit           │ auto
             │                    ▼
             │              ┌──────────────┐
             └──────────────│  PUBLISHED   │
                            └──────────────┘
```

---

## Feature F3: AI Policy Generation

### Overview
Generate complete policy drafts using Claude API with customizable parameters.

### Generation Parameters
```typescript
interface PolicyGenerationRequest {
  policyType: string;        // "Anti-Bribery", "Data Privacy", etc.
  industry: string;          // "Healthcare", "Financial Services", etc.
  companySize: string;       // "1-100", "100-500", "500-5000", "5000+"
  jurisdictions: string[];   // ["US", "EU", "UK"]
  regulations: string[];     // ["GDPR", "HIPAA", "SOX"]
  tone: "formal" | "approachable" | "technical";
  existingPolicies?: string[]; // IDs of related policies for context
  customInstructions?: string;
}
```

### Prompt Template
```
You are an expert compliance policy writer. Generate a comprehensive
{policyType} policy for a {companySize} employee {industry} company.

Requirements:
- Jurisdiction(s): {jurisdictions}
- Applicable regulations: {regulations}
- Tone: {tone}

The policy must include these sections:
1. Purpose - Why this policy exists
2. Scope - Who it applies to
3. Definitions - Key terms
4. Policy Statement - Core requirements
5. Roles and Responsibilities
6. Procedures - How to comply
7. Reporting and Escalation
8. Enforcement - Consequences of violation
9. Related Policies
10. Revision History

{customInstructions}

Format the output as clean HTML suitable for a rich text editor.
Use proper heading levels (h2, h3) and lists where appropriate.
Mark any placeholders that need customization with [PLACEHOLDER: description].
```

### Error Handling
- **Rate limit exceeded:** Queue request, notify user of delay
- **Content filter triggered:** Return sanitized version with warning
- **Timeout:** Retry once, then offer partial result
- **Token limit:** Generate in sections, combine

---

## Feature F4: Attestation Tracking

### Overview
Track employee acknowledgment of policies with reminders and escalation.

### Attestation States
```
ASSIGNED ──► VIEWED ──► ATTESTED
    │           │
    │           └──► OVERDUE
    │
    └──► OVERDUE ──► ESCALATED
```

### Dashboard Metrics
```
┌─────────────────────────────────────────────────────────────┐
│  Attestation Dashboard: Code of Conduct Q1 2026             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Overall Completion: ████████████████░░░░ 82%              │
│                                                             │
│  ┌──────────────┬──────────────┬──────────────────────────┐│
│  │  Completed   │  Pending     │  Overdue                 ││
│  │  410 (82%)   │  65 (13%)    │  25 (5%)                 ││
│  └──────────────┴──────────────┴──────────────────────────┘│
│                                                             │
│  By Department:                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Engineering    ████████████████████ 95%                ││
│  │ Sales          ████████████████░░░░ 85%                ││
│  │ Marketing      ████████████░░░░░░░░ 72%                ││
│  │ Finance        ████████░░░░░░░░░░░░ 58%  ⚠️            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  [Send Reminder] [Export Report] [View Non-Attesters]      │
└─────────────────────────────────────────────────────────────┘
```

---

## Feature F5: Exception Lifecycle Management

### Overview
Enable structured request, approval, tracking, and expiration of policy exceptions with full audit trail and governance controls.

### Exception Request Flow
```
┌─────────────────────────────────────────────────────────────┐
│  Request Policy Exception                                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Policy: [Anti-Bribery Policy           ▼]                  │
│                                                              │
│  Exception Type: [Temporary Waiver      ▼]                  │
│                                                              │
│  Business Justification:                                     │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ The subsidiary in [country] requires a 90-day grace     ││
│  │ period to implement the new gift reporting threshold... ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  Requested Duration:                                         │
│  Start: [2026-02-01]  End: [2026-05-01]                     │
│                                                              │
│  Affected Scope:                                             │
│  ☑ Business Unit: [APAC Operations    ▼]                   │
│  ☐ Specific Users                                           │
│  ☐ Specific Locations                                       │
│                                                              │
│  Risk Assessment:                                            │
│  [Medium ▼] - Describe mitigating controls...               │
│                                                              │
│  Supporting Documents:                                       │
│  [📎 Upload Attachment]                                      │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  [Cancel]                        [Submit for Approval]  ││
│  └──────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Exception Register View
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Exception Register                                    [+ New Exception] │
├─────────────────────────────────────────────────────────────────────────┤
│ Filters: Policy [All ▼] Status [Active ▼] BU [All ▼] [🔍 Search...]   │
├─────────────────────────────────────────────────────────────────────────┤
│ │ Policy          │ Requester │ Status   │ Expires    │ Actions       │ │
│ ├─────────────────┼───────────┼──────────┼────────────┼───────────────┤ │
│ │ Anti-Bribery    │ J. Smith  │ ✅ Active │ 2026-05-01 │ [View][Renew] │ │
│ │ Data Privacy    │ S. Chen   │ ⏳ Pending│ -          │ [Review]      │ │
│ │ Gift Policy     │ M. Johnson│ ⚠️ Expiring│ 2026-02-15│ [View][Renew] │ │
│ │ Travel Policy   │ A. Kumar  │ ❌ Expired│ 2026-01-10 │ [View][Reopen]│ │
│ │ IT Security     │ L. Wang   │ 🚫 Denied │ -          │ [View]        │ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Exception State Machine
```
            ┌──────────────┐
            │   DRAFT      │
            └──────┬───────┘
                   │ submit
                   ▼
            ┌──────────────┐
      ┌─────│   PENDING    │─────┐
      │     └──────┬───────┘     │
      │            │             │
   reject          │ approve   timeout
      │            ▼             │
      │     ┌──────────────┐     │
      │     │    ACTIVE    │     │
      │     └──────┬───────┘     │
      │            │             │
      │     ┌──────┴──────┐      │
      │     │             │      │
      │   expire        renew    │
      │     │             │      │
      │     ▼             ▼      │
      │  ┌──────────┐  ┌─────────┴─┐
      └─►│ EXPIRED  │  │ PENDING   │
         └──────────┘  │ RENEWAL   │
                       └───────────┘
```

### Acceptance Criteria
- Users can request exceptions for any published policy
- Exception requests require business justification (mandatory)
- Requests route to Compliance Officer for approval
- Active exceptions have configurable expiration dates (1-365 days)
- System sends reminders 30, 14, and 7 days before expiration
- Exception Register provides filterable view of all exceptions
- Full audit trail of all exception lifecycle events
- Attachments supported for supporting documentation
- Bulk operations for managing multiple exceptions

### Edge Cases
- **Exception for archived policy:** Block request, show message
- **Renewal during pending status:** Queue renewal, process after current review
- **Approver is requester:** Require secondary approver from compliance
- **Exception conflicts with regulation:** Flag as high-risk, require executive approval

---

## Feature F6: Regulatory Framework Management

### Overview
Map internal policies to external regulatory frameworks (GDPR, HIPAA, SOX, ISO 27001, etc.) with visual coverage reporting and gap analysis.

### Framework Library
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Regulatory Frameworks                           [+ Import Framework]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Active Frameworks                                                    │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ 🇪🇺 GDPR                    Coverage: ████████████░░ 85%  [Manage] │ │
│ │ 🏥 HIPAA                    Coverage: ██████████░░░░ 72%  [Manage] │ │
│ │ 📊 SOX                      Coverage: ████████████████ 95% [Manage] │ │
│ │ 🔒 ISO 27001                Coverage: ██████░░░░░░░░ 45%  [Manage] │ │
│ │ 🇺🇸 CCPA                    Coverage: ████████████░░ 80%  [Manage] │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Available Frameworks                                                 │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ UK Bribery Act  │  FCPA  │  PCI-DSS  │  NIST  │  COBIT  │ [Browse] │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Policy-to-Regulation Mapping UI
```
┌─────────────────────────────────────────────────────────────────────────┐
│ GDPR Compliance Mapping                              [Export] [Print]   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Article 5: Principles        Coverage: ████████████████ 100%           │
│ ├── 5.1(a) Lawfulness       → Data Privacy Policy (Published)          │
│ ├── 5.1(b) Purpose Limit.   → Data Processing Policy (Published)       │
│ ├── 5.1(c) Data Minimization→ Data Retention Policy (In Review)       │
│ └── 5.1(d) Accuracy         → Data Quality Policy (Published)          │
│                                                                         │
│ Article 6: Lawful Basis      Coverage: ██████████████░░ 90%            │
│ ├── 6.1(a) Consent          → Privacy Consent Policy (Published)       │
│ ├── 6.1(b) Contract         → [⚠️ NO POLICY MAPPED - Click to create] │
│ └── 6.1(f) Legit. Interest  → Legitimate Interest Policy (Draft)       │
│                                                                         │
│ Article 7: Consent           Coverage: ████████████████ 100%           │
│ ...                                                                     │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Gap Summary: 3 requirements unmapped │ 2 policies in draft          │ │
│ │ [View All Gaps]  [Generate Recommendations]  [Schedule Review]      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Acceptance Criteria
- Import predefined regulatory frameworks from template library
- Create custom frameworks with hierarchical requirements (sections/articles/clauses)
- Map multiple policies to each regulatory requirement
- Visual coverage percentage per framework and per section
- Gap detection highlights unmapped requirements
- Generate gap analysis reports for auditors
- Export compliance documentation (PDF, Excel)
- Track framework version changes and impact on mappings
- Policy changes trigger remapping review notifications

### Edge Cases
- **Framework version update:** Preserve existing mappings, flag new requirements
- **Policy deleted that's mapped:** Show warning, require remapping before deletion
- **Circular requirements:** Prevent same policy mapping to conflicting requirements
- **Audit export during mapping:** Include "in progress" status clearly

---

## Feature F7: Risk, Incident & Investigation Linkage

### Overview
Connect policies to related cases, risks, and investigations to provide visibility into policy enforcement and operational compliance gaps.

### Cross-Module Linkage Dashboard
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Policy Impact Analysis: Anti-Bribery Policy                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐            │
│ │ Related Risks   │ │ Related Cases   │ │ Investigations  │            │
│ │      12         │ │       5         │ │       2         │            │
│ │ 3 High Priority │ │ 2 Open          │ │ 1 Active        │            │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘            │
│                                                                         │
│ Risk Assessments Citing This Policy:                                    │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ • Third-Party Due Diligence (HIGH) - APAC Region    [View Risk]    │ │
│ │ • Government Contracting (MEDIUM) - Federal Sales   [View Risk]    │ │
│ │ • Gift & Entertainment (LOW) - Global               [View Risk]    │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ Recent Cases Referencing This Policy:                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ • CASE-2026-0042: Vendor Gift Disclosure   Status: Under Review    │ │
│ │ • CASE-2026-0038: Travel Expense Question  Status: Closed          │ │
│ │ • CASE-2025-0891: Third-Party Payment      Status: Open            │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ Policy Effectiveness Insights:                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 📊 Incident Trend: ▼ 15% decrease in policy violations YoY         │ │
│ │ 📈 Attestation Rate: 94% (Target: 95%)                             │ │
│ │ ⚠️ Recommendation: Update gift threshold based on recent cases     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Policy Linkage Schema
```json
{
  "policyId": "policy-uuid",
  "linkedEntities": {
    "risks": [
      {
        "id": "risk-uuid",
        "title": "Third-Party Due Diligence",
        "severity": "HIGH",
        "linkType": "mitigates",
        "linkedAt": "2026-01-15T10:00:00Z",
        "linkedBy": "user-uuid"
      }
    ],
    "cases": [
      {
        "id": "case-uuid",
        "caseNumber": "CASE-2026-0042",
        "status": "OPEN",
        "linkType": "referenced",
        "linkedAt": "2026-01-10T14:30:00Z"
      }
    ],
    "investigations": [
      {
        "id": "investigation-uuid",
        "title": "Vendor Payment Review",
        "status": "ACTIVE",
        "linkType": "governing"
      }
    ]
  }
}
```

### Acceptance Criteria
- Link policies to risk assessments with relationship types (mitigates, controls, references)
- Link policies to cases/incidents with automatic or manual association
- Link policies to investigations as governing policy
- Dashboard shows all linked entities per policy
- Cross-module reporting on policy effectiveness
- Smart suggestions when creating cases: "Did you mean to reference Anti-Bribery Policy?"
- Trend analysis: correlate policy updates with incident rates
- Role-based visibility: Investigators see investigation links only

### Edge Cases
- **Linked entity deleted:** Preserve link history for audit, show as "deleted"
- **Bulk linking:** Support linking policy to multiple entities at once
- **Conflicting links:** Allow same policy to link to conflicting risk assessments
- **Permission boundaries:** User without case access sees "Linked Case (Restricted)"

---

## Feature F8: Unified Employee Policy Hub

### Overview
Personalized dashboard for employees to view assigned policies, complete attestations, and access policy reference materials.

### Employee Policy Hub
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ☰  ETHICO    My Policy Hub                      🔔 2  👤 Jane Employee │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ 👋 Good morning, Jane                                                   │
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ ⚡ Action Required                                          3 items │   │
│ ├───────────────────────────────────────────────────────────────────┤   │
│ │ 📋 Code of Conduct 2026      Due: Jan 25  [Acknowledge →]        │   │
│ │ 📋 IT Security Policy        Due: Jan 28  [Acknowledge →]        │   │
│ │ 📋 Data Privacy Training     Due: Feb 01  [Start Quiz →]         │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│                                                                         │
│ ┌─────────────────────────────────────────┬─────────────────────────┐   │
│ │ 📚 My Policies                          │ 🔍 Quick Search         │   │
│ ├─────────────────────────────────────────┤ ┌─────────────────────┐ │   │
│ │ Recently Viewed:                        │ │ Search policies...  │ │   │
│ │ • Anti-Bribery Policy      [View]      │ └─────────────────────┘ │   │
│ │ • Remote Work Guidelines   [View]      │                         │   │
│ │ • Expense Policy           [View]      │ Popular:                │   │
│ │                                        │ • PTO Policy            │   │
│ │ By Category:                           │ • Expense Guidelines    │   │
│ │ [HR (12)] [IT (8)] [Ethics (5)]       │ • Travel Policy         │   │
│ └─────────────────────────────────────────┴─────────────────────────┘   │
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ ✅ Completed Attestations                                   View All │
│ ├───────────────────────────────────────────────────────────────────┤   │
│ │ • Code of Conduct 2025       Completed: Dec 15, 2025  [Cert 📜]  │   │
│ │ • Harassment Prevention      Completed: Nov 10, 2025  [Cert 📜]  │   │
│ └───────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Manager Team View
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 My Team's Policy Compliance                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Team Completion Rate: ████████████████░░░░ 82%    (Target: 95%)        │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Team Member      │ Pending │ Overdue │ Completed │ Actions          │ │
│ ├──────────────────┼─────────┼─────────┼───────────┼──────────────────┤ │
│ │ Alex Thompson    │    2    │    0    │    15     │ [View Details]   │ │
│ │ Maria Garcia     │    1    │    1    │    14     │ [Send Reminder]  │ │
│ │ James Wilson     │    0    │    2    │    13     │ [Send Reminder]  │ │
│ │ Sarah Kim        │    3    │    0    │    12     │ [View Details]   │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Send Bulk Reminder]  [Export Team Report]  [Schedule Follow-up]        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Acceptance Criteria
- Personalized hub shows only policies relevant to user's role/department/location
- Clear action items with due dates and priority indicators
- Quick access to recently viewed and frequently accessed policies
- Category-based browsing and full-text search
- Attestation history with downloadable certificates
- Manager view of direct reports' compliance status
- One-click reminder sending to team members
- Mobile-responsive design for field employees
- Offline reading mode for downloaded policies

### Edge Cases
- **No policies assigned:** Show welcome message and company policy overview
- **All attestations complete:** Celebrate completion, show next scheduled
- **Manager without direct reports:** Hide team view section
- **Policy updated after attestation:** Notify user of updates, may require re-attestation

---

## Feature F9: SharePoint Integration

### Overview
Enable policy discovery within Microsoft SharePoint environments through search federation and document sync.

### SharePoint Search Results
```
┌─────────────────────────────────────────────────────────────────────────┐
│ SharePoint Search: "remote work policy"                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Results from Ethico Policy Management:                                  │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 📋 Remote Work Policy                            [Open in Ethico]   │ │
│ │ Status: Published | Version: 2.1 | Updated: Jan 2026               │ │
│ │ "Employees may work remotely up to 3 days per week with manager..." │ │
│ │                                                                     │ │
│ │ 📋 IT Equipment for Remote Workers              [Open in Ethico]   │ │
│ │ Status: Published | Version: 1.0 | Updated: Dec 2025               │ │
│ │ "Remote employees are entitled to request standard IT equipment..." │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ Local SharePoint Results:                                               │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 📄 Remote Work Request Form.docx                                    │ │
│ │ 📄 Remote Work FAQ.pdf                                              │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Integration Configuration
```json
{
  "sharePointIntegration": {
    "tenantId": "azure-tenant-uuid",
    "siteUrl": "https://company.sharepoint.com/sites/policies",
    "searchFederation": {
      "enabled": true,
      "resultSource": "EthicoPolicies",
      "displayTemplate": "PolicyResult"
    },
    "documentSync": {
      "enabled": true,
      "syncDirection": "ethico-to-sharepoint",
      "targetLibrary": "Published Policies",
      "syncOnPublish": true
    },
    "ssoEnabled": true
  }
}
```

### Acceptance Criteria
- Search federation surfaces Ethico policies in SharePoint search results
- Direct link from SharePoint results opens policy in Ethico (SSO)
- Optional: Sync published policies to SharePoint document library
- Preserve policy metadata in SharePoint (author, version, status)
- Respect Ethico permissions in SharePoint (don't show unauthorized policies)
- Admin configuration UI for SharePoint connection
- Connection health monitoring and alerting

### Edge Cases
- **SharePoint offline:** Cache last search results, show stale indicator
- **Permission mismatch:** User sees policy in SharePoint but not in Ethico - handle gracefully
- **Policy deletion:** Remove from SharePoint sync, tombstone in search index
- **Large sync:** Batch processing with progress indicator

---

## Feature F10: External/Partner Portals

### Overview
Provide controlled external access to selected policies for vendors, regulators, and partners.

### External Portal View
```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🏢 Acme Corp - Vendor Policy Portal                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Welcome, Vendor Partner                                                 │
│                                                                         │
│ The following policies govern our business relationship:               │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Required Reading:                                                    │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ 📋 Vendor Code of Conduct           [Read & Acknowledge]            │ │
│ │    Last Updated: Jan 2026 | Your Status: ⚠️ Pending                │ │
│ │                                                                     │ │
│ │ 📋 Anti-Bribery Requirements        [Read & Acknowledge]            │ │
│ │    Last Updated: Dec 2025 | Your Status: ✅ Acknowledged           │ │
│ │                                                                     │ │
│ │ 📋 Data Protection Standards        [Read & Acknowledge]            │ │
│ │    Last Updated: Jan 2026 | Your Status: ⚠️ Pending                │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Reference Materials:                                                 │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ 📄 Sustainability Guidelines        [Download PDF]                  │ │
│ │ 📄 Quality Standards                [Download PDF]                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ Questions? Contact: vendor-compliance@acme.com                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Portal Configuration Schema
```json
{
  "externalPortal": {
    "id": "portal-uuid",
    "name": "Vendor Policy Portal",
    "type": "vendor",
    "accessControl": {
      "authentication": "email-magic-link",
      "allowedDomains": ["partner.com", "vendor.org"],
      "expirationDays": 365
    },
    "branding": {
      "logo": "https://...",
      "primaryColor": "#7C3AED",
      "customMessage": "Welcome to our vendor portal"
    },
    "policies": [
      {
        "policyId": "policy-uuid-1",
        "accessType": "read-acknowledge",
        "required": true
      },
      {
        "policyId": "policy-uuid-2",
        "accessType": "read-only",
        "required": false
      }
    ],
    "attestationTracking": true,
    "notifications": {
      "reminderDays": [30, 14, 7],
      "escalationEmail": "vendor-compliance@company.com"
    }
  }
}
```

### Acceptance Criteria
- Create portals for different external audiences (vendors, regulators, partners)
- Magic link authentication (no password required)
- Expose only selected policies to each portal
- Track external attestations with same rigor as internal
- Custom branding per portal (logo, colors, welcome message)
- Expiring access with configurable duration
- Audit trail of all external access
- Reminder and escalation workflow for pending acknowledgments

### Edge Cases
- **Expired magic link:** Redirect to request new link page
- **Policy updated:** Require re-acknowledgment from external parties
- **Domain not in allowlist:** Block access, show contact info
- **External user belongs to multiple portals:** Consolidated view

---

## Feature F11: LMS Integration

### Overview
Bi-directional integration with Learning Management Systems for policy-related training and certification tracking.

### LMS Sync Configuration
```
┌─────────────────────────────────────────────────────────────────────────┐
│ LMS Integration: Cornerstone OnDemand                    [Test] [Save] │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Connection Status: ✅ Connected                                         │
│                                                                         │
│ Sync Settings:                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ☑ Push policy attestation completion to LMS as training record     │ │
│ │ ☑ Pull training completions into Ethico for compliance tracking    │ │
│ │ ☑ Auto-assign policy when related training is completed            │ │
│ │ ☐ Create LMS course for each policy requiring quiz                 │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ Policy-Course Mapping:                                                  │
│ ┌───────────────────────────────┬───────────────────────────────────┐  │
│ │ Ethico Policy                 │ LMS Course                        │  │
│ ├───────────────────────────────┼───────────────────────────────────┤  │
│ │ Anti-Harassment Policy        │ Workplace Harassment Prevention  │  │
│ │ Data Privacy Policy           │ GDPR Fundamentals Training       │  │
│ │ IT Security Policy            │ Cybersecurity Awareness          │  │
│ │ [+ Add Mapping]               │                                  │  │
│ └───────────────────────────────┴───────────────────────────────────┘  │
│                                                                         │
│ Last Sync: Jan 15, 2026 14:30 | Records: 1,234 synced                  │
│ [View Sync Log] [Force Sync Now]                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Acceptance Criteria
- Connect to major LMS platforms (Cornerstone, Workday Learning, SAP SuccessFactors)
- Push attestation completions to LMS as training records
- Pull training completions into Ethico compliance dashboard
- Map policies to related training courses
- Unified compliance view: policy acknowledgment + training status
- Configurable sync frequency (real-time, hourly, daily)
- Error handling with retry and admin notification

### Edge Cases
- **LMS unavailable:** Queue sync events, retry with exponential backoff
- **User not in LMS:** Skip sync for that user, log warning
- **Course mapping removed:** Preserve historical sync data
- **Conflicting completion dates:** Use most recent, flag discrepancy

---

## Feature F12: Integration Marketplace

### Overview
Plug-and-play connectors for enterprise systems with self-service configuration.

### Marketplace View
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Integration Marketplace                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ 🔍 Search integrations...                                               │
│                                                                         │
│ Categories: [All] [HRIS] [SSO] [LMS] [GRC] [Document] [Collaboration]  │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Installed (4)                                                        │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ [🟢] Workday HRIS          Last sync: 2h ago    [Configure]        │ │
│ │ [🟢] Microsoft Entra ID    Connected            [Configure]        │ │
│ │ [🟡] Cornerstone LMS       Sync pending         [Configure]        │ │
│ │ [🔴] ServiceNow GRC        Error: Auth expired  [Fix] [Configure]  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Available Integrations                                              │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│ │
│ │ │ 🏢 BambooHR  │ │ 📚 Docebo   │ │ 🔒 Okta     │ │ 📊 Tableau  ││ │
│ │ │    HRIS      │ │    LMS       │ │    SSO       │ │   Analytics ││ │
│ │ │  [Install]   │ │  [Install]   │ │  [Install]   │ │  [Install]  ││ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘│ │
│ │ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│ │
│ │ │ 📝 SharePoint│ │ 💬 Slack    │ │ 📧 SendGrid │ │ 🔐 CyberArk ││ │
│ │ │   Documents  │ │  Notif.     │ │   Email      │ │   Secrets   ││ │
│ │ │  [Install]   │ │  [Install]   │ │  [Install]   │ │  [Install]  ││ │
│ │ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘│ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

### Acceptance Criteria
- Catalog of pre-built integrations with one-click install
- Self-service configuration wizard per integration
- OAuth-based authentication where supported
- Health monitoring dashboard for all integrations
- Category-based filtering and search
- Version management for integration updates
- Documentation and setup guides per integration
- Support for custom/webhook integrations

### Edge Cases
- **Integration deprecated:** Notify admin, provide migration path
- **Breaking API change:** Version lock, require manual upgrade
- **Rate limits exceeded:** Automatic throttling with notification
- **Credential rotation:** Guided re-authentication flow

---

## Feature F13: Conditional Workflow Logic

### Overview
Dynamic workflow routing based on policy attributes, content, and organizational context.

### Conditional Workflow Builder
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Workflow Builder: Policy Review with Conditions                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────┐                                                            │
│  │  Start  │                                                            │
│  └────┬────┘                                                            │
│       │                                                                 │
│       ▼                                                                 │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ 🔀 CONDITION: Policy affects EU employees?              │            │
│  │                                                         │            │
│  │ IF policy.metadata.regions CONTAINS "EU"                │            │
│  │    OR policy.tags CONTAINS "GDPR"                       │            │
│  └─────────────────┬───────────────────────┬───────────────┘            │
│                    │ YES                   │ NO                         │
│                    ▼                       ▼                            │
│  ┌─────────────────────────┐  ┌─────────────────────────┐              │
│  │ Step: DPO Review        │  │ Step: Legal Review      │              │
│  │ Assignee: Data Privacy  │  │ Assignee: Legal Team    │              │
│  │ Timeout: 5 days         │  │ Timeout: 7 days         │              │
│  └────────────┬────────────┘  └────────────┬────────────┘              │
│               │                            │                            │
│               └────────────┬───────────────┘                            │
│                            ▼                                            │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │ 🔀 CONDITION: High Risk Policy?                         │            │
│  │                                                         │            │
│  │ IF policy.metadata.riskLevel = "HIGH"                   │            │
│  │    OR policy.type IN ["Ethics", "Security"]             │            │
│  └─────────────────┬───────────────────────┬───────────────┘            │
│                    │ YES                   │ NO                         │
│                    ▼                       ▼                            │
│  ┌─────────────────────────┐              │                             │
│  │ Step: Executive Review  │              │                             │
│  │ Assignee: CECO          │              │                             │
│  │ Timeout: 3 days         │              │                             │
│  └────────────┬────────────┘              │                             │
│               │                           │                             │
│               └────────────┬──────────────┘                             │
│                            ▼                                            │
│                     ┌──────────┐                                        │
│                     │ Publish  │                                        │
│                     └──────────┘                                        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Condition Schema
```json
{
  "condition": {
    "id": "cond-uuid",
    "name": "EU Data Protection Check",
    "type": "branch",
    "expression": {
      "operator": "OR",
      "conditions": [
        {
          "field": "policy.metadata.regions",
          "operator": "contains",
          "value": "EU"
        },
        {
          "field": "policy.tags",
          "operator": "contains",
          "value": "GDPR"
        }
      ]
    },
    "trueBranch": "step-dpo-review",
    "falseBranch": "step-legal-review"
  }
}
```

### Acceptance Criteria
- Visual condition builder with drag-and-drop interface
- Support for policy attribute conditions (type, tags, metadata, regions)
- Support for content-based conditions (contains keywords, section exists)
- Support for organizational conditions (department, author role, owner)
- Parallel paths that merge before final steps
- Dynamic assignee selection based on conditions
- Test mode to simulate workflow path before activation
- Workflow analytics: path frequency, bottlenecks, SLA compliance

### Edge Cases
- **Condition evaluates to null:** Configurable default path
- **Circular conditions:** Validation prevents infinite loops
- **Condition field removed:** Disable workflow, notify admin
- **Multiple conditions match:** First matching condition wins (ordered evaluation)

---

## Feature F14: Real-Time Audit Dashboards

### Overview
Live dashboards for compliance monitoring, audit preparation, and operational visibility.

### Compliance Monitoring Dashboard
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Real-Time Compliance Dashboard                    Last updated: 14:32  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐            │
│ │ Policy Health   │ │ Attestation Rate│ │ Exception Count │            │
│ │   98.5%         │ │    94.2%        │ │      12         │            │
│ │   ▲ 0.3%        │ │    ▼ 1.1%       │ │   3 expiring    │            │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘            │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Live Activity Feed                                      [Pause] 🔴  │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ 14:32:05 │ ✅ S.Chen attested Code of Conduct          Engineering │ │
│ │ 14:31:42 │ 📝 J.Smith edited Anti-Bribery Policy       Compliance  │ │
│ │ 14:31:15 │ ✅ M.Johnson approved Data Privacy Policy   Legal       │ │
│ │ 14:30:58 │ ⚠️ Workflow timeout: IT Security Policy     IT Team     │ │
│ │ 14:30:22 │ 📤 Distribution started: Q1 Ethics Training HR          │ │
│ │ 14:29:45 │ 🔗 Policy linked to case: CASE-2026-0048    Risk        │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌──────────────────────────────┬────────────────────────────────────┐  │
│ │ Compliance Trend (30 days)   │ Risk Distribution                  │  │
│ ├──────────────────────────────┼────────────────────────────────────┤  │
│ │         ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄   │  ██████████░░░░░░░░░░ Low: 45%    │  │
│ │       ▄▀              ▀▄   │  ████████████████░░░░ Med: 35%    │  │
│ │     ▄▀                  ▀▄ │  ████████░░░░░░░░░░░░ High: 20%   │  │
│ │   ▄▀                      ▀│                                    │  │
│ │  ─────────────────────────  │  [View Risk Details]               │  │
│ │  Jan 1    Jan 15    Jan 30  │                                    │  │
│ └──────────────────────────────┴────────────────────────────────────┘  │
│                                                                         │
│ [Export Audit Report]  [Schedule Report]  [Configure Alerts]           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Acceptance Criteria
- Real-time event streaming (WebSocket-based)
- Configurable refresh intervals (1s, 5s, 30s, manual)
- Historical trend visualization (7, 30, 90 days)
- Alert configuration for threshold breaches
- Role-based dashboard views (Executive, Compliance, Audit)
- Export to PDF/Excel on-demand
- Scheduled report delivery (daily, weekly, monthly)
- Mobile-responsive for on-the-go monitoring

### Edge Cases
- **High event volume:** Aggregate similar events, show count
- **Network interruption:** Show last known state, indicate stale data
- **Cross-timezone:** All times in user's local timezone with UTC option
- **Large historical export:** Background job with download notification

---

## Feature F15: AI Auto-Tagging & Summarization

### Overview
Automatically classify, tag, and summarize policies using AI to improve organization and discoverability.

### Auto-Tagging Interface
```
┌─────────────────────────────────────────────────────────────────────────┐
│ AI Analysis: Anti-Bribery Policy                                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ 🤖 AI-Suggested Tags:                                                   │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [✅ Ethics] [✅ FCPA] [✅ Anti-Corruption] [☐ UK Bribery Act]      │ │
│ │ [☐ Third-Party Risk] [☐ Government Relations]                      │ │
│ │                                                                     │ │
│ │ Confidence: High (92%)  [Accept All] [Reject All]                  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 📝 AI-Generated Summary:                                                │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ This policy prohibits all forms of bribery and corruption,         │ │
│ │ including facilitation payments and improper gifts. It applies     │ │
│ │ to all employees, contractors, and third parties acting on behalf  │ │
│ │ of the company. Key requirements include pre-approval for gifts    │ │
│ │ over $100, due diligence on third parties, and mandatory           │ │
│ │ reporting of any suspected violations.                             │ │
│ │                                                                     │ │
│ │ [Edit Summary] [Regenerate] [Use as Executive Summary]             │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ 📊 Regulatory Mapping Suggestions:                                      │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ This policy likely covers:                                          │ │
│ │ • FCPA §78dd-1 (Foreign Corrupt Practices Act)  [Map Now]          │ │
│ │ • UK Bribery Act §6-7 (Adequate Procedures)     [Map Now]          │ │
│ │ • SOX §302 (Corporate Responsibility)           [Map Now]          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [Apply All Suggestions]  [Save & Close]                                 │
└─────────────────────────────────────────────────────────────────────────┘
```

### Acceptance Criteria
- Automatic tag suggestions when policy is created or updated
- AI-generated executive summary (2-3 sentences)
- Regulatory mapping suggestions based on policy content
- Confidence scores for all AI suggestions
- User can accept/reject individual suggestions
- Bulk auto-tagging for existing policies (batch job)
- Learning from user feedback (accepted/rejected suggestions)
- Support for custom tag taxonomies per tenant

### Edge Cases
- **Low confidence suggestions:** Show but don't auto-apply
- **Conflicting tags:** Allow multiple, let user resolve
- **Non-English content:** Support multi-language analysis
- **Very short policy:** Request minimum content for analysis

---

## Feature F16: Engagement Testing (Quizzes & Certifications)

### Overview
Verify policy comprehension through quizzes and issue certifications upon successful completion.

### Quiz Configuration
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Configure Quiz: Code of Conduct                                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Quiz Settings:                                                          │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ☑ Require quiz completion for attestation                          │ │
│ │ Passing Score: [80] %                                               │ │
│ │ Attempts Allowed: [3]                                               │ │
│ │ ☑ Randomize question order                                         │ │
│ │ ☑ Show correct answers after submission                            │ │
│ │ ☐ Time limit: [ ] minutes                                          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ Questions: (5 questions, 80% passing = 4 correct)                       │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ Q1: What is the maximum gift value allowed without pre-approval?   │ │
│ │     ○ $50   ● $100   ○ $250   ○ No limit                          │ │
│ │     [Edit] [Delete] [Move ↑↓]                                      │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ Q2: Who should you report a suspected violation to?                │ │
│ │     ☑ Your manager  ☑ Ethics hotline  ☐ HR  ☐ No one              │ │
│ │     [Edit] [Delete] [Move ↑↓]                                      │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ Q3: True or False: Facilitation payments are permitted.            │ │
│ │     ○ True   ● False                                               │ │
│ │     [Edit] [Delete] [Move ↑↓]                                      │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ [+ Add Question]  [🤖 AI Generate Questions]  [Preview Quiz]            │
│                                                                         │
│ [Save Draft]  [Activate Quiz]                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

### Quiz Taking Experience
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Quiz: Code of Conduct                            Progress: 2/5          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Question 2 of 5                                                         │
│                                                                         │
│ Who should you report a suspected ethics violation to?                  │
│ (Select all that apply)                                                 │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ ☑ Your direct manager                                               │ │
│ │ ☑ The Ethics & Compliance hotline                                   │ │
│ │ ☐ Your colleague                                                    │ │
│ │ ☐ No one - handle it yourself                                       │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [← Previous]                                      [Next →]          │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ ● ● ○ ○ ○   Question 2 of 5                                            │
└─────────────────────────────────────────────────────────────────────────┘
```

### Acceptance Criteria
- Configure quizzes per policy or distribution campaign
- Question types: multiple choice, true/false, multi-select
- AI-assisted question generation from policy content
- Configurable passing threshold and retry attempts
- Immediate feedback option (show correct answers)
- Quiz analytics: pass rate, common wrong answers, time spent
- Certificate generation upon successful completion
- Certificate verification via unique ID
- Quiz results sync to LMS if integrated

### Edge Cases
- **Quiz failed after max attempts:** Escalate to manager, require training
- **Quiz updated mid-campaign:** Grandfather existing, apply to new attestations
- **Partial completion timeout:** Save progress, allow resume
- **Accessibility:** Full keyboard navigation, screen reader support

---

# UI/UX Wireframes

## W1: Login Page

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                    ┌───────────────────┐                    │
│                    │    ETHICO LOGO    │                    │
│                    └───────────────────┘                    │
│                                                             │
│                    Policy Management                        │
│                                                             │
│              ┌─────────────────────────────┐                │
│              │  🔷 Sign in with Microsoft  │                │
│              └─────────────────────────────┘                │
│                                                             │
│              ┌─────────────────────────────┐                │
│              │  🔴 Sign in with Google     │                │
│              └─────────────────────────────┘                │
│                                                             │
│              ─────────── or ───────────                     │
│                                                             │
│              Email                                          │
│              ┌─────────────────────────────┐                │
│              │                             │                │
│              └─────────────────────────────┘                │
│                                                             │
│              Password                                       │
│              ┌─────────────────────────────┐                │
│              │                             │                │
│              └─────────────────────────────┘                │
│                                                             │
│              [Forgot Password?]                             │
│                                                             │
│              ┌─────────────────────────────┐                │
│              │        Sign In              │                │
│              └─────────────────────────────┘                │
│                                                             │
│              Need help? Contact support                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## W2: Main Dashboard

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ☰  ETHICO Policy Management          🔔 3  👤 Sarah Chen ▼             │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌──────────┐                                                            │
│ │ 📋 Policies│ Good morning, Sarah                                      │
│ │ 📝 Drafts  │                                                          │
│ │ ✅ Approved │ ┌─────────────────────────────────────────────────────┐ │
│ │ 📤 Distrib.│ │  Quick Actions                                       │ │
│ │ 📊 Reports │ │  [+ New Policy] [📁 Import] [🤖 AI Generate]         │ │
│ │ ⚙️ Settings│ └─────────────────────────────────────────────────────┘ │
│ └──────────┘                                                            │
│              ┌────────────────────┐ ┌────────────────────┐              │
│              │ Pending Approvals  │ │ Attestation Status │              │
│              │        5           │ │       94%          │              │
│              │  ⚠️ 2 urgent       │ │   ████████████░░   │              │
│              │  [View All]        │ │   [View Details]   │              │
│              └────────────────────┘ └────────────────────┘              │
│                                                                         │
│              ┌────────────────────┐ ┌────────────────────┐              │
│              │ Policies Due Review│ │ My Tasks           │              │
│              │        3           │ │       8            │              │
│              │  📅 Next: Jan 30   │ │   3 due today      │              │
│              │  [View Calendar]   │ │   [View All]       │              │
│              └────────────────────┘ └────────────────────┘              │
│                                                                         │
│              Recent Activity                                            │
│              ┌─────────────────────────────────────────────────────────┐│
│              │ • Code of Conduct v2.1 published by John     2h ago    ││
│              │ • Anti-Bribery Policy approved by Legal      4h ago    ││
│              │ • Data Privacy attestation at 85%            6h ago    ││
│              │ • New comment on Social Media Policy         1d ago    ││
│              └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## W3: Policy List

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ☰  ETHICO Policy Management          🔔 3  👤 Sarah Chen ▼             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Policies                                          [+ New Policy]        │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ 🔍 Search policies...                           [Filters ▼]         │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ Filters: Status: All ▼  Type: All ▼  Owner: All ▼   [Clear Filters]    │
│                                                                         │
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ □  Title                    Type        Status     Owner    Updated │ │
│ ├─────────────────────────────────────────────────────────────────────┤ │
│ │ □  Code of Conduct          Ethics      Published  Sarah    Jan 15  │ │
│ │ □  Anti-Bribery Policy      Ethics      In Review  John     Jan 14  │ │
│ │ □  Data Privacy Policy      Privacy     Published  Sarah    Jan 10  │ │
│ │ □  Remote Work Policy       HR          Draft      Jane     Jan 8   │ │
│ │ □  IT Security Standards    IT          Published  Bob      Dec 20  │ │
│ │ □  Social Media Guidelines  HR          Draft      Jane     Dec 15  │ │
│ │ □  Expense Reimbursement    Finance     Published  Mike     Dec 1   │ │
│ │ □  Whistleblower Policy     Ethics      Published  Sarah    Nov 15  │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
│                                                                         │
│ Showing 1-8 of 45 policies              [< Previous] [1] [2] [Next >]  │
│                                                                         │
│ With selected: [Bulk Actions ▼]                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## W4: Policy Editor

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ☰  ETHICO    ← Back to Policies    💾 Saved    [Preview] [Submit ▼]    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────────────────────────────────────────────────────┬───────────────┐ │
│ │                                                     │ Document Info │ │
│ │ Anti-Bribery and Corruption Policy                  │               │ │
│ │ ──────────────────────────────────────────          │ Status: Draft │ │
│ │                                                     │ Version: 1.0  │ │
│ │ ┌─────────────────────────────────────────────────┐ │ Owner: Sarah  │ │
│ │ │ B I U S │ H1 H2 H3 │ • 1. │ 🔗 📷 📊 │ ⤵ ⤴ │ │               │ │
│ │ └─────────────────────────────────────────────────┘ │ Created: 1/15 │ │
│ │                                                     │               │ │
│ │ 1. Purpose                                          │ ───────────── │ │
│ │                                                     │               │ │
│ │ This policy establishes [COMPANY NAME]'s commitment │ 📑 Outline    │ │
│ │ to conducting business ethically and in compliance  │ • 1. Purpose  │ │
│ │ with all applicable anti-bribery and anti-         │ • 2. Scope    │ │
│ │ corruption laws.                                    │ • 3. Policy   │ │
│ │                                                     │ • 4. Gifts    │ │
│ │ 2. Scope                                           │ • 5. Reporting│ │
│ │                                                     │               │ │
│ │ This policy applies to:                             │ ───────────── │ │
│ │ • All employees worldwide                           │               │ │
│ │ • Contractors and consultants                       │ 💬 Comments   │ │
│ │ • Third-party representatives                       │ 2 unresolved  │ │
│ │                                                     │               │ │
│ │ 3. Policy Statement                                 │ [Add Comment] │ │
│ │                                                     │               │ │
│ │ [COMPANY NAME] prohibits:                           │ ───────────── │ │
│ │ 1. Offering bribes to government officials          │               │ │
│ │ 2. Accepting improper payments                      │ 📜 Versions   │ │
│ │ 3. Facilitation payments                            │ Current: 1.0  │ │
│ │ |                                                   │ [History]     │ │
│ │                                                     │               │ │
│ └─────────────────────────────────────────────────────┴───────────────┘ │
│                                                                         │
│ 👥 2 viewing: Sarah Chen (you), John Smith                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## W5: Workflow Builder

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ☰  ETHICO    Workflow Builder                   [Cancel] [Save]         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ Workflow Name: [Standard 3-Step Approval          ]                     │
│ Description:   [Legal, Compliance, and Executive review               ] │
│                                                                         │
│ ┌───────────────────────────────────────────────────────────────────────│
│ │  Toolbox           │  Canvas                                         ││
│ │  ─────────         │                                                 ││
│ │  ┌──────────────┐  │      ┌─────────┐                               ││
│ │  │ + Sequential │  │      │  Start  │                               ││
│ │  │    Step      │  │      └────┬────┘                               ││
│ │  └──────────────┘  │           │                                     ││
│ │  ┌──────────────┐  │           ▼                                     ││
│ │  │ + Parallel   │  │  ┌───────────────────┐                         ││
│ │  │    Step      │  │  │ Step 1: Legal     │                         ││
│ │  └──────────────┘  │  │ Reviewer          │                         ││
│ │  ┌──────────────┐  │  │ Role: Policy      │                         ││
│ │  │ + Condition  │  │  │      Reviewer     │ ← [Edit] [Delete]       ││
│ │  │    Branch    │  │  └─────────┬─────────┘                         ││
│ │  └──────────────┘  │            │                                    ││
│ │                    │            ▼                                    ││
│ │  Settings:         │  ┌───────────────────┐                         ││
│ │  ─────────         │  │ Step 2: Parallel  │                         ││
│ │  On reject:        │  │ ┌─────┐ ┌─────┐   │                         ││
│ │  [Return to ▼]     │  │ │User1│ │User2│   │ ← [Edit] [Delete]       ││
│ │                    │  │ └─────┘ └─────┘   │                         ││
│ │  Timeout:          │  │ All must approve  │                         ││
│ │  [7 days  ▼]       │  └─────────┬─────────┘                         ││
│ │                    │            │                                    ││
│ │  Escalation:       │            ▼                                    ││
│ │  [Manager  ▼]      │  ┌───────────────────┐                         ││
│ │                    │  │ Step 3: Executive │                         ││
│ │                    │  │ Role: Compliance  │                         ││
│ │                    │  │      Officer      │ ← [Edit] [Delete]       ││
│ │                    │  └─────────┬─────────┘                         ││
│ │                    │            │                                    ││
│ │                    │            ▼                                    ││
│ │                    │      ┌──────────┐                              ││
│ │                    │      │ Publish  │                              ││
│ │                    │      └──────────┘                              ││
│ └────────────────────┴──────────────────────────────────────────────────│
│                                                                         │
│ [Save as Template]                        [Test Workflow] [Save]        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## W6: Attestation Page (Mobile)

```
┌─────────────────────────┐
│ ☰  ETHICO              │
├─────────────────────────┤
│                         │
│  Code of Conduct        │
│  Version 2.1            │
│                         │
│  Please read this       │
│  policy and attest      │
│  below.                 │
│                         │
│ ┌─────────────────────┐ │
│ │                     │ │
│ │ 1. Purpose          │ │
│ │                     │ │
│ │ This Code of        │ │
│ │ Conduct establishes │ │
│ │ the ethical         │ │
│ │ principles and      │ │
│ │ behavioral          │ │
│ │ standards expected  │ │
│ │ of all employees... │ │
│ │                     │ │
│ │ 2. Core Values      │ │
│ │                     │ │
│ │ • Integrity         │ │
│ │ • Respect           │ │
│ │ • Excellence        │ │
│ │ • Accountability    │ │
│ │                     │ │
│ │ 3. Expected         │ │
│ │    Behaviors...     │ │
│ │                     │ │
│ │        ▼            │ │
│ │   (scroll down)     │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ ☑ I have read and   │ │
│ │   understand this   │ │
│ │   policy            │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │                     │ │
│ │   ✓ Acknowledge     │ │
│ │                     │ │
│ └─────────────────────┘ │
│                         │
│ Questions? Contact HR   │
│                         │
└─────────────────────────┘
```

---

# API Specifications

## Authentication APIs

### POST /api/v1/auth/login

**Description:** Authenticate user with email and password

**Request:**
```json
{
  "email": "user@company.com",
  "password": "SecureP@ss123"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,
  "user": {
    "id": "user-uuid",
    "email": "user@company.com",
    "name": "John Smith",
    "role": "POLICY_AUTHOR",
    "tenantId": "tenant-uuid"
  }
}
```

**Response (401 Unauthorized):**
```json
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized"
}
```

**Response (429 Too Many Requests):**
```json
{
  "statusCode": 429,
  "message": "Too many login attempts. Try again in 15 minutes.",
  "retryAfter": 900
}
```

---

### GET /api/v1/auth/microsoft

**Description:** Initiate Microsoft SSO OAuth flow

**Query Parameters:**
- `redirect_uri` (optional): Where to redirect after auth

**Response:** Redirect to Microsoft login

---

### POST /api/v1/auth/microsoft/callback

**Description:** Handle Microsoft SSO callback

**Request:**
```json
{
  "code": "authorization_code_from_microsoft",
  "state": "csrf_state_token"
}
```

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900,
  "user": {
    "id": "user-uuid",
    "email": "user@company.com",
    "name": "John Smith",
    "role": "EMPLOYEE",
    "tenantId": "tenant-uuid",
    "isNewUser": true
  }
}
```

---

### POST /api/v1/auth/refresh

**Description:** Refresh access token using refresh token from cookie

**Headers:**
- `Cookie: refreshToken=...` (httpOnly cookie)

**Response (200 OK):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "expiresIn": 900
}
```

---

## Policy APIs

### GET /api/v1/policies

**Description:** List policies with pagination and filters

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 25, max: 100)
- `status` (string): "DRAFT", "IN_REVIEW", "PUBLISHED", "ARCHIVED"
- `type` (string): Policy type filter
- `owner` (string): Owner user ID
- `search` (string): Full-text search query
- `sort` (string): Field to sort by (default: "updatedAt")
- `order` (string): "asc" or "desc" (default: "desc")

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "policy-uuid",
      "title": "Code of Conduct",
      "policyType": "Ethics",
      "status": "PUBLISHED",
      "owner": {
        "id": "user-uuid",
        "name": "Sarah Chen"
      },
      "versionNumber": "2.1",
      "effectiveDate": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 45,
    "totalPages": 2
  }
}
```

---

### POST /api/v1/policies

**Description:** Create a new policy

**Request:**
```json
{
  "title": "Anti-Bribery Policy",
  "policyType": "Ethics",
  "businessFunction": "Legal",
  "locations": ["Global"],
  "customTags": ["FCPA", "UK Bribery Act"],
  "isProcedure": false,
  "content": {
    "type": "doc",
    "content": [
      {
        "type": "heading",
        "attrs": { "level": 1 },
        "content": [{ "type": "text", "text": "Anti-Bribery Policy" }]
      }
    ]
  },
  "metadata": {
    "region": "Global",
    "regulatoryFramework": ["FCPA", "UK Bribery Act"],
    "riskLevel": "HIGH"
  }
}
```

**Response (201 Created):**
```json
{
  "id": "policy-uuid",
  "title": "Anti-Bribery Policy",
  "status": "DRAFT",
  "versionNumber": "1.0",
  "owner": {
    "id": "user-uuid",
    "name": "Current User"
  },
  "createdAt": "2026-01-15T10:30:00Z"
}
```

---

### PUT /api/v1/policies/:id

**Description:** Update an existing policy

**Request:**
```json
{
  "title": "Anti-Bribery and Corruption Policy",
  "content": { ... },
  "metadata": { ... }
}
```

**Response (200 OK):**
```json
{
  "id": "policy-uuid",
  "title": "Anti-Bribery and Corruption Policy",
  "status": "DRAFT",
  "versionNumber": "1.0",
  "updatedAt": "2026-01-15T11:00:00Z"
}
```

---

### POST /api/v1/policies/:id/publish

**Description:** Publish a policy (creates new version if already published)

**Request:**
```json
{
  "effectiveDate": "2026-02-01T00:00:00Z",
  "changeSummary": "Updated FCPA section with new guidance"
}
```

**Response (200 OK):**
```json
{
  "id": "policy-uuid",
  "title": "Anti-Bribery Policy",
  "status": "PUBLISHED",
  "versionNumber": "2.0",
  "previousVersion": "1.0",
  "publishedAt": "2026-01-15T11:30:00Z",
  "effectiveDate": "2026-02-01T00:00:00Z"
}
```

---

### GET /api/v1/policies/:id/versions

**Description:** Get version history for a policy

**Response (200 OK):**
```json
{
  "data": [
    {
      "versionNumber": "2.0",
      "status": "PUBLISHED",
      "changeSummary": "Updated FCPA section",
      "publishedAt": "2026-01-15T11:30:00Z",
      "publishedBy": {
        "id": "user-uuid",
        "name": "Sarah Chen"
      }
    },
    {
      "versionNumber": "1.0",
      "status": "ARCHIVED",
      "changeSummary": "Initial publication",
      "publishedAt": "2025-06-01T09:00:00Z",
      "publishedBy": {
        "id": "user-uuid",
        "name": "John Smith"
      }
    }
  ]
}
```

---

## Workflow APIs

### POST /api/v1/policies/:policyId/workflows

**Description:** Start a workflow for a policy

**Request:**
```json
{
  "workflowId": "workflow-template-uuid"
}
```

**Response (201 Created):**
```json
{
  "id": "policy-workflow-uuid",
  "policyId": "policy-uuid",
  "workflowId": "workflow-template-uuid",
  "status": "IN_PROGRESS",
  "currentStep": 0,
  "steps": [
    {
      "order": 0,
      "name": "Legal Review",
      "status": "PENDING",
      "assignees": [
        { "id": "user-uuid", "name": "Legal Team" }
      ]
    }
  ],
  "startedAt": "2026-01-15T12:00:00Z"
}
```

---

### POST /api/v1/workflows/:workflowId/steps/:stepIndex/approve

**Description:** Approve the current workflow step

**Request:**
```json
{
  "comment": "Approved. Looks good."
}
```

**Response (200 OK):**
```json
{
  "id": "policy-workflow-uuid",
  "status": "IN_PROGRESS",
  "currentStep": 1,
  "steps": [
    {
      "order": 0,
      "name": "Legal Review",
      "status": "APPROVED",
      "approvedBy": { "id": "user-uuid", "name": "Jane Smith" },
      "approvedAt": "2026-01-15T14:00:00Z",
      "comment": "Approved. Looks good."
    },
    {
      "order": 1,
      "name": "Compliance Approval",
      "status": "PENDING",
      "assignees": [...]
    }
  ]
}
```

---

### POST /api/v1/workflows/:workflowId/steps/:stepIndex/reject

**Description:** Reject the current workflow step

**Request:**
```json
{
  "comment": "Section 3 needs revision. The threshold amounts are incorrect."
}
```

**Response (200 OK):**
```json
{
  "id": "policy-workflow-uuid",
  "status": "REJECTED",
  "steps": [
    {
      "order": 0,
      "name": "Legal Review",
      "status": "REJECTED",
      "rejectedBy": { "id": "user-uuid", "name": "Jane Smith" },
      "rejectedAt": "2026-01-15T14:00:00Z",
      "comment": "Section 3 needs revision..."
    }
  ],
  "policy": {
    "id": "policy-uuid",
    "status": "DRAFT"
  }
}
```

---

## AI APIs

### POST /api/v1/ai/generate-policy

**Description:** Generate a policy draft using AI

**Request:**
```json
{
  "policyType": "Anti-Bribery",
  "industry": "Healthcare",
  "companySize": "500-5000",
  "jurisdictions": ["US", "UK"],
  "regulations": ["FCPA", "UK Bribery Act"],
  "tone": "formal",
  "customInstructions": "Include specific guidance for interactions with healthcare providers."
}
```

**Response (200 OK):**
```json
{
  "content": {
    "type": "doc",
    "content": [...]
  },
  "title": "Anti-Bribery and Anti-Corruption Policy",
  "suggestedType": "Ethics",
  "suggestedTags": ["FCPA", "UK Bribery Act", "Healthcare"],
  "metadata": {
    "aiGenerated": true,
    "model": "claude-sonnet",
    "tokensUsed": 3500,
    "generatedAt": "2026-01-15T15:00:00Z"
  },
  "placeholders": [
    { "text": "[COMPANY NAME]", "count": 12 },
    { "text": "[REPORTING HOTLINE]", "count": 2 }
  ]
}
```

---

### POST /api/v1/ai/translate

**Description:** Translate a policy to another language

**Request:**
```json
{
  "policyId": "policy-uuid",
  "targetLanguage": "es",
  "preserveFormatting": true
}
```

**Response (202 Accepted):**
```json
{
  "jobId": "translation-job-uuid",
  "status": "PROCESSING",
  "estimatedTime": 60
}
```

**GET /api/v1/ai/translate/:jobId (poll for result)**

**Response (200 OK):**
```json
{
  "jobId": "translation-job-uuid",
  "status": "COMPLETED",
  "translation": {
    "id": "translation-uuid",
    "language": "es",
    "title": "Política Anticorrupción y Antisoborno",
    "content": { ... },
    "versionNumber": "2.0-ES"
  }
}
```

---

## Attestation APIs

> **Architecture Note:** Attestation APIs create RIUs (Risk Intelligence Units) as immutable records. The POST /api/v1/attestations/:id/attest endpoint creates an `attestation_response` RIU and may optionally create a Case based on campaign auto_case_rules.

### POST /api/v1/campaigns/attestation

**Description:** Create a policy attestation campaign (uses Campaign model)

**Request:**
```json
{
  "name": "Q1 2026 Code of Conduct",
  "campaignType": "policy_attestation",
  "policyId": "policy-uuid",
  "policyVersionId": "policy-version-uuid",
  "targetCriteria": {
    "departments": ["Engineering", "Sales"],
    "locations": ["US", "UK"],
    "excludeUsers": ["user-uuid-1"]
  },
  "scheduledDate": "2026-01-20T09:00:00Z",
  "dueDate": "2026-02-20T23:59:59Z",
  "reminderSchedule": {
    "intervals": [7, 14, 21]
  },
  "attestationConfig": {
    "attestationType": "QUIZ",
    "quizId": "quiz-uuid",
    "quizRequired": true,
    "quizPassingScore": 80,
    "quizMaxAttempts": 3
  },
  "autoCaseRules": {
    "createCaseOnRefusal": true,
    "createCaseOnQuizFailure": true,
    "createCaseOnOverdue": false,
    "quizFailureThreshold": 2,
    "overdueDaysBeforeCase": 30,
    "caseCategory": "policy_non_compliance",
    "caseSeverity": "LOW",
    "caseAssignTo": "manager"
  }
}
```

**Response (201 Created):**
```json
{
  "id": "campaign-uuid",
  "name": "Q1 2026 Code of Conduct",
  "campaignType": "policy_attestation",
  "policyId": "policy-uuid",
  "policyVersionId": "policy-version-uuid",
  "policyVersionNumber": "v2.1",
  "audienceCount": 250,
  "scheduledDate": "2026-01-20T09:00:00Z",
  "dueDate": "2026-02-20T23:59:59Z",
  "status": "SCHEDULED"
}
```

---

### POST /api/v1/distributions

**Description:** Create a distribution campaign (legacy endpoint, use POST /api/v1/campaigns/attestation for new implementations)

**Request:**
```json
{
  "name": "Q1 2026 Code of Conduct",
  "policyId": "policy-uuid",
  "targetCriteria": {
    "departments": ["Engineering", "Sales"],
    "locations": ["US", "UK"],
    "excludeUsers": ["user-uuid-1"]
  },
  "scheduledDate": "2026-01-20T09:00:00Z",
  "reminderSchedule": {
    "intervals": [7, 14, 21]
  }
}
```

**Response (201 Created):**
```json
{
  "id": "distribution-uuid",
  "name": "Q1 2026 Code of Conduct",
  "policyId": "policy-uuid",
  "audienceCount": 250,
  "scheduledDate": "2026-01-20T09:00:00Z",
  "status": "SCHEDULED"
}
```

---

### POST /api/v1/attestations/:id/attest

**Description:** Record an attestation. This endpoint:
1. Updates the Campaign Assignment status
2. **Creates an `attestation_response` RIU** (immutable record)
3. Optionally creates a Case if campaign `autoCaseRules` are triggered

**Request:**
```json
{
  "acknowledged": true,
  "attestationType": "QUIZ",
  "quizAnswers": [
    { "questionId": 1, "answer": "A" },
    { "questionId": 2, "answer": "C" }
  ],
  "signature": {
    "type": "TYPED",
    "data": "John Smith"
  }
}
```

**Response (200 OK) - Successful Attestation:**
```json
{
  "id": "attestation-uuid",
  "status": "COMPLETED",
  "attestedAt": "2026-01-15T16:30:00Z",
  "quizScore": 100,
  "quizPassed": true,
  "riu": {
    "id": "riu-uuid",
    "type": "attestation_response",
    "result": "ATTESTED"
  },
  "caseCreated": null,
  "certificate": {
    "id": "ATT-2026-00123",
    "downloadUrl": "/api/v1/attestations/ATT-2026-00123/certificate"
  }
}
```

**Response (200 OK) - Quiz Failure with Case Creation:**
```json
{
  "id": "attestation-uuid",
  "status": "FAILED",
  "attestedAt": "2026-01-15T16:30:00Z",
  "quizScore": 60,
  "quizPassed": false,
  "attemptsRemaining": 1,
  "riu": {
    "id": "riu-uuid",
    "type": "attestation_response",
    "result": "QUIZ_FAILED"
  },
  "caseCreated": null,
  "retryAllowed": true
}
```

**Response (200 OK) - Final Quiz Failure (Case Created):**
```json
{
  "id": "attestation-uuid",
  "status": "FAILED",
  "attestedAt": "2026-01-15T16:30:00Z",
  "quizScore": 55,
  "quizPassed": false,
  "attemptsRemaining": 0,
  "riu": {
    "id": "riu-uuid",
    "type": "attestation_response",
    "result": "QUIZ_FAILED"
  },
  "caseCreated": {
    "id": "case-uuid",
    "caseNumber": "ETH-2026-00456",
    "category": "Policy Non-Compliance",
    "assignedTo": "manager"
  },
  "retryAllowed": false
}
```

---

### POST /api/v1/attestations/:id/refuse

**Description:** Record an attestation refusal. Creates an `attestation_response` RIU with result 'REFUSED' and optionally creates a Case.

**Request:**
```json
{
  "refusalCategory": "NOT_APPLICABLE",
  "refusalReason": "This policy does not apply to my role as a contractor."
}
```

**Response (200 OK):**
```json
{
  "id": "attestation-uuid",
  "status": "REFUSED",
  "refusedAt": "2026-01-15T16:30:00Z",
  "riu": {
    "id": "riu-uuid",
    "type": "attestation_response",
    "result": "REFUSED"
  },
  "caseCreated": {
    "id": "case-uuid",
    "caseNumber": "ETH-2026-00457",
    "category": "Attestation Refusal",
    "assignedTo": "compliance_officer"
  }
}
```

---

### GET /api/v1/attestations/:id/riu

**Description:** Get the RIU created for a specific attestation

**Response (200 OK):**
```json
{
  "riu": {
    "id": "riu-uuid",
    "type": "attestation_response",
    "organizationId": "org-uuid",
    "receivedAt": "2026-01-15T16:30:00Z",
    "reporterEmployeeId": "employee-uuid",
    "campaignAssignmentId": "assignment-uuid",
    "policyId": "policy-uuid",
    "policyVersionId": "version-uuid",
    "policyVersionNumber": "v2.1",
    "attestationType": "QUIZ",
    "attestationResult": "ATTESTED",
    "acknowledgedAt": "2026-01-15T16:30:00Z",
    "quizData": {
      "quizId": "quiz-uuid",
      "score": 100,
      "passed": true,
      "attemptNumber": 1,
      "answers": [...]
    },
    "caseId": null
  }
}
```

---

### GET /api/v1/attestations/dashboard

**Description:** Get attestation dashboard metrics

**Query Parameters:**
- `campaignId` (optional): Filter by specific campaign
- `policyId` (optional): Filter by policy

**Response (200 OK):**
```json
{
  "summary": {
    "total": 500,
    "completed": 410,
    "pending": 65,
    "overdue": 25,
    "completionRate": 82
  },
  "byDepartment": [
    { "department": "Engineering", "total": 100, "completed": 95, "rate": 95 },
    { "department": "Sales", "total": 80, "completed": 68, "rate": 85 },
    { "department": "Finance", "total": 50, "completed": 29, "rate": 58 }
  ],
  "byLocation": [
    { "location": "US", "total": 300, "completed": 270, "rate": 90 },
    { "location": "UK", "total": 200, "completed": 140, "rate": 70 }
  ],
  "trend": [
    { "date": "2026-01-15", "completed": 50 },
    { "date": "2026-01-16", "completed": 85 },
    { "date": "2026-01-17", "completed": 120 }
  ]
}
```

---

## Exception Management APIs

### POST /api/v1/exceptions

**Description:** Create a policy exception request

**Request:**
```json
{
  "policyId": "policy-uuid",
  "exceptionType": "TEMPORARY_WAIVER",
  "justification": "The subsidiary requires a 90-day grace period...",
  "startDate": "2026-02-01",
  "endDate": "2026-05-01",
  "scope": {
    "type": "BUSINESS_UNIT",
    "businessUnit": "APAC Operations"
  },
  "riskAssessment": {
    "level": "MEDIUM",
    "mitigatingControls": "Weekly reporting to compliance..."
  },
  "attachments": ["attachment-uuid-1"]
}
```

**Response (201 Created):**
```json
{
  "id": "exception-uuid",
  "status": "PENDING",
  "requestedBy": { "id": "user-uuid", "name": "John Smith" },
  "createdAt": "2026-01-15T10:00:00Z",
  "reviewDueDate": "2026-01-22T10:00:00Z"
}
```

---

### GET /api/v1/exceptions

**Description:** List exceptions (Exception Register)

**Query Parameters:**
- `policyId` (optional): Filter by policy
- `status` (optional): "PENDING", "ACTIVE", "EXPIRED", "DENIED"
- `businessUnit` (optional): Filter by business unit
- `expiringWithinDays` (optional): Filter by upcoming expiration

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "exception-uuid",
      "policy": { "id": "policy-uuid", "title": "Anti-Bribery Policy" },
      "status": "ACTIVE",
      "expiresAt": "2026-05-01T00:00:00Z",
      "requestedBy": { "id": "user-uuid", "name": "John Smith" },
      "approvedBy": { "id": "user-uuid", "name": "Jane Doe" }
    }
  ],
  "pagination": { "page": 1, "limit": 25, "total": 12 }
}
```

---

### POST /api/v1/exceptions/:id/approve

**Description:** Approve an exception request

**Request:**
```json
{
  "comment": "Approved with conditions. Monthly review required.",
  "conditions": ["Monthly compliance review", "No government contracts"]
}
```

---

### POST /api/v1/exceptions/:id/renew

**Description:** Renew an active or expiring exception

**Request:**
```json
{
  "newEndDate": "2026-08-01",
  "justification": "Implementation delayed due to regulatory changes"
}
```

---

## Regulatory Framework APIs

### GET /api/v1/frameworks

**Description:** List available regulatory frameworks

**Response (200 OK):**
```json
{
  "installed": [
    {
      "id": "framework-uuid",
      "name": "GDPR",
      "version": "2024.1",
      "coverage": 85,
      "requirementCount": 99,
      "mappedPolicies": 42
    }
  ],
  "available": [
    { "id": "fcpa", "name": "FCPA", "description": "Foreign Corrupt Practices Act" },
    { "id": "hipaa", "name": "HIPAA", "description": "Health Insurance Portability..." }
  ]
}
```

---

### POST /api/v1/frameworks/:id/install

**Description:** Install a regulatory framework from the library

---

### GET /api/v1/frameworks/:id/mapping

**Description:** Get policy-to-regulation mapping for a framework

**Response (200 OK):**
```json
{
  "framework": { "id": "gdpr", "name": "GDPR" },
  "sections": [
    {
      "id": "article-5",
      "name": "Article 5: Principles",
      "coverage": 100,
      "requirements": [
        {
          "id": "5.1.a",
          "name": "Lawfulness",
          "mappedPolicies": [
            { "id": "policy-uuid", "title": "Data Privacy Policy", "status": "PUBLISHED" }
          ]
        },
        {
          "id": "5.1.b",
          "name": "Purpose Limitation",
          "mappedPolicies": []
        }
      ]
    }
  ],
  "gaps": [
    { "requirementId": "5.1.b", "name": "Purpose Limitation", "recommendation": "Create data processing policy" }
  ]
}
```

---

### POST /api/v1/frameworks/:frameworkId/requirements/:requirementId/map

**Description:** Map a policy to a regulatory requirement

**Request:**
```json
{
  "policyId": "policy-uuid",
  "mappingType": "FULL",
  "notes": "Covers all aspects of this requirement"
}
```

---

## Policy Linkage APIs

> **Architecture Note:** When linking policies to Cases (e.g., for policy violations), the link includes the **specific Policy Version** that was violated or referenced. This provides legal defensibility and historical accuracy.

### POST /api/v1/policies/:policyId/links

**Description:** Link a policy to a risk, case, or investigation. For Case links, includes the specific policy version.

**Request (Linking to Case - Policy Violation):**
```json
{
  "entityType": "CASE",
  "entityId": "case-uuid",
  "linkType": "VIOLATION",
  "policyVersionId": "version-uuid",
  "notes": "Employee violated gift acceptance threshold in section 4.2"
}
```

**Request (Linking to Risk):**
```json
{
  "entityType": "RISK",
  "entityId": "risk-uuid",
  "linkType": "MITIGATES",
  "notes": "This policy directly addresses this risk"
}
```

---

### GET /api/v1/policies/:policyId/links

**Description:** Get all entities linked to a policy. Case links include the specific policy version that was violated/referenced.

**Response (200 OK):**
```json
{
  "risks": [
    {
      "id": "risk-uuid",
      "title": "Third-Party Due Diligence",
      "severity": "HIGH",
      "linkType": "MITIGATES",
      "linkedAt": "2026-01-15T10:00:00Z",
      "linkedBy": { "id": "user-uuid", "name": "John Smith" }
    }
  ],
  "cases": [
    {
      "id": "case-uuid",
      "caseNumber": "CASE-2026-0042",
      "status": "OPEN",
      "linkType": "VIOLATION",
      "policyVersionId": "version-uuid",
      "policyVersionNumber": "v2.1",
      "policyVersionEffectiveDate": "2025-06-01T00:00:00Z",
      "linkedAt": "2026-01-15T10:00:00Z",
      "linkedBy": { "id": "user-uuid", "name": "Jane Doe" },
      "notes": "Employee violated gift acceptance threshold in section 4.2"
    },
    {
      "id": "case-uuid-2",
      "caseNumber": "CASE-2026-0048",
      "status": "CLOSED",
      "linkType": "REFERENCE",
      "policyVersionId": "version-uuid",
      "policyVersionNumber": "v2.1",
      "linkedAt": "2026-01-10T14:30:00Z"
    }
  ],
  "investigations": [],
  "attestationRius": [
    {
      "riuId": "riu-uuid",
      "result": "REFUSED",
      "employeeId": "employee-uuid",
      "employeeName": "Bob Wilson",
      "caseId": "case-uuid-3",
      "caseNumber": "CASE-2026-0050",
      "refusedAt": "2026-01-12T09:00:00Z"
    }
  ]
}
```

---

### GET /api/v1/cases/:caseId/policies

**Description:** Get policies linked to a case (from Case Management module perspective). Includes version information for legal defensibility.

**Response (200 OK):**
```json
{
  "policies": [
    {
      "policyId": "policy-uuid",
      "policyTitle": "Anti-Bribery Policy",
      "policyVersionId": "version-uuid",
      "policyVersionNumber": "v2.1",
      "policyVersionEffectiveDate": "2025-06-01T00:00:00Z",
      "linkType": "VIOLATION",
      "linkedAt": "2026-01-15T10:00:00Z",
      "linkedBy": { "id": "user-uuid", "name": "Jane Doe" },
      "notes": "Employee violated gift acceptance threshold in section 4.2"
    }
  ]
}
```

---

### GET /api/v1/policies/:policyId/impact

**Description:** Get policy impact analysis

**Response (200 OK):**
```json
{
  "linkedEntities": { "risks": 12, "cases": 5, "investigations": 2 },
  "attestationRate": 94,
  "incidentTrend": { "change": -15, "period": "YoY" },
  "recommendations": [
    "Update gift threshold based on recent cases"
  ]
}
```

---

## Employee Policy Hub APIs

### GET /api/v1/hub/my-policies

**Description:** Get personalized policy hub for current user

**Response (200 OK):**
```json
{
  "actionRequired": [
    {
      "type": "ATTESTATION",
      "policyId": "policy-uuid",
      "title": "Code of Conduct 2026",
      "dueDate": "2026-01-25T23:59:59Z",
      "priority": "HIGH"
    }
  ],
  "recentlyViewed": [
    { "policyId": "policy-uuid", "title": "Anti-Bribery Policy", "viewedAt": "2026-01-14T09:30:00Z" }
  ],
  "byCategory": {
    "HR": 12,
    "IT": 8,
    "Ethics": 5
  },
  "completedAttestations": [
    {
      "policyId": "policy-uuid",
      "title": "Code of Conduct 2025",
      "completedAt": "2025-12-15T10:00:00Z",
      "certificateId": "ATT-2025-00456"
    }
  ]
}
```

---

### GET /api/v1/hub/team-compliance

**Description:** Get team compliance status (for managers)

**Response (200 OK):**
```json
{
  "completionRate": 82,
  "targetRate": 95,
  "teamMembers": [
    {
      "userId": "user-uuid",
      "name": "Alex Thompson",
      "pending": 2,
      "overdue": 0,
      "completed": 15
    }
  ]
}
```

---

### POST /api/v1/hub/team-reminder

**Description:** Send reminder to team members

**Request:**
```json
{
  "userIds": ["user-uuid-1", "user-uuid-2"],
  "message": "Please complete your pending policy attestations"
}
```

---

## External Portal APIs

### POST /api/v1/portals

**Description:** Create an external policy portal

**Request:**
```json
{
  "name": "Vendor Policy Portal",
  "type": "VENDOR",
  "branding": {
    "logo": "https://...",
    "primaryColor": "#7C3AED"
  },
  "accessControl": {
    "authentication": "MAGIC_LINK",
    "allowedDomains": ["partner.com", "vendor.org"],
    "expirationDays": 365
  },
  "policies": [
    { "policyId": "policy-uuid", "accessType": "READ_ACKNOWLEDGE", "required": true }
  ]
}
```

---

### POST /api/v1/portals/:id/invite

**Description:** Invite external users to a portal

**Request:**
```json
{
  "emails": ["contact@vendor.com", "compliance@partner.org"],
  "customMessage": "Please review and acknowledge our vendor policies"
}
```

---

### GET /api/v1/portals/:id/attestations

**Description:** Get external attestation status for a portal

---

## Integration APIs

### GET /api/v1/integrations

**Description:** List all integrations (marketplace view)

**Response (200 OK):**
```json
{
  "installed": [
    {
      "id": "integration-uuid",
      "type": "HRIS",
      "name": "Workday",
      "status": "CONNECTED",
      "lastSync": "2026-01-15T02:00:00Z"
    }
  ],
  "available": [
    { "id": "bamboohr", "type": "HRIS", "name": "BambooHR" },
    { "id": "cornerstone", "type": "LMS", "name": "Cornerstone OnDemand" }
  ]
}
```

---

### POST /api/v1/integrations/:type/install

**Description:** Install an integration

**Request:**
```json
{
  "type": "LMS",
  "provider": "CORNERSTONE",
  "config": {
    "apiEndpoint": "https://company.csod.com/api",
    "apiKey": "encrypted-key"
  }
}
```

---

### POST /api/v1/integrations/:id/sync

**Description:** Trigger manual sync for an integration

---

### GET /api/v1/integrations/sharepoint/search

**Description:** Federated search for SharePoint integration

**Query Parameters:**
- `query` (required): Search query
- `limit` (optional): Max results

---

## Workflow Condition APIs

### POST /api/v1/workflows/:id/conditions

**Description:** Add a condition to a workflow

**Request:**
```json
{
  "name": "EU Data Protection Check",
  "position": 1,
  "expression": {
    "operator": "OR",
    "conditions": [
      { "field": "policy.metadata.regions", "operator": "CONTAINS", "value": "EU" },
      { "field": "policy.tags", "operator": "CONTAINS", "value": "GDPR" }
    ]
  },
  "trueBranch": "step-dpo-review",
  "falseBranch": "step-legal-review"
}
```

---

### POST /api/v1/workflows/:id/simulate

**Description:** Simulate workflow path for a policy

**Request:**
```json
{
  "policyId": "policy-uuid"
}
```

**Response (200 OK):**
```json
{
  "path": [
    { "type": "CONDITION", "name": "EU Check", "result": true },
    { "type": "STEP", "name": "DPO Review", "assignee": "DPO Team" },
    { "type": "CONDITION", "name": "High Risk Check", "result": false },
    { "type": "STEP", "name": "Publish" }
  ]
}
```

---

## Audit Dashboard APIs

### GET /api/v1/audit/dashboard

**Description:** Get real-time audit dashboard data

**Response (200 OK):**
```json
{
  "metrics": {
    "policyHealth": 98.5,
    "attestationRate": 94.2,
    "activeExceptions": 12,
    "expiringExceptions": 3
  },
  "trend": {
    "period": 30,
    "data": [
      { "date": "2026-01-01", "compliance": 92.1 },
      { "date": "2026-01-15", "compliance": 94.2 }
    ]
  },
  "riskDistribution": {
    "low": 45,
    "medium": 35,
    "high": 20
  }
}
```

---

### GET /api/v1/audit/activity-stream

**Description:** Get real-time activity feed (WebSocket available)

**Query Parameters:**
- `limit` (optional): Number of events
- `since` (optional): Timestamp for polling

**Response (200 OK):**
```json
{
  "events": [
    {
      "id": "event-uuid",
      "timestamp": "2026-01-15T14:32:05Z",
      "type": "ATTESTATION_COMPLETED",
      "actor": { "id": "user-uuid", "name": "S. Chen" },
      "target": { "type": "POLICY", "name": "Code of Conduct" },
      "department": "Engineering"
    }
  ]
}
```

---

## AI Auto-Tagging APIs

### POST /api/v1/ai/analyze-policy

**Description:** Get AI-powered analysis of a policy

**Request:**
```json
{
  "policyId": "policy-uuid",
  "analyses": ["TAGS", "SUMMARY", "REGULATORY_MAPPING"]
}
```

**Response (200 OK):**
```json
{
  "tags": {
    "suggested": [
      { "tag": "Ethics", "confidence": 0.95 },
      { "tag": "FCPA", "confidence": 0.92 },
      { "tag": "Anti-Corruption", "confidence": 0.88 }
    ]
  },
  "summary": {
    "text": "This policy prohibits all forms of bribery and corruption...",
    "confidence": 0.91
  },
  "regulatoryMapping": {
    "suggestions": [
      { "framework": "FCPA", "requirement": "§78dd-1", "confidence": 0.89 },
      { "framework": "UK Bribery Act", "requirement": "§6-7", "confidence": 0.85 }
    ]
  }
}
```

---

### POST /api/v1/ai/generate-quiz

**Description:** Generate quiz questions from policy content

**Request:**
```json
{
  "policyId": "policy-uuid",
  "questionCount": 5,
  "difficulty": "MEDIUM"
}
```

**Response (200 OK):**
```json
{
  "questions": [
    {
      "question": "What is the maximum gift value allowed without pre-approval?",
      "type": "MULTIPLE_CHOICE",
      "options": ["$50", "$100", "$250", "No limit"],
      "correctAnswer": 1,
      "explanation": "Section 4.2 states that gifts over $100 require pre-approval"
    }
  ]
}
```

---

## Quiz & Certification APIs

### POST /api/v1/policies/:policyId/quiz

**Description:** Create or update quiz for a policy

**Request:**
```json
{
  "passingScore": 80,
  "attemptsAllowed": 3,
  "randomizeQuestions": true,
  "showCorrectAnswers": true,
  "questions": [
    {
      "question": "What is the maximum gift value allowed?",
      "type": "MULTIPLE_CHOICE",
      "options": ["$50", "$100", "$250"],
      "correctAnswer": 1
    }
  ]
}
```

---

### POST /api/v1/quizzes/:quizId/submit

**Description:** Submit quiz answers

**Request:**
```json
{
  "answers": [
    { "questionId": 1, "answer": 1 },
    { "questionId": 2, "answer": [0, 1] }
  ]
}
```

**Response (200 OK):**
```json
{
  "passed": true,
  "score": 80,
  "correctAnswers": 4,
  "totalQuestions": 5,
  "attemptsRemaining": 2,
  "certificate": {
    "id": "CERT-2026-00789",
    "downloadUrl": "/api/v1/certificates/CERT-2026-00789"
  }
}
```

---

### GET /api/v1/certificates/:id/verify

**Description:** Verify certificate authenticity

**Response (200 OK):**
```json
{
  "valid": true,
  "certificate": {
    "id": "CERT-2026-00789",
    "issuedTo": "John Smith",
    "policy": "Code of Conduct",
    "issuedAt": "2026-01-15T10:30:00Z",
    "expiresAt": "2027-01-15T10:30:00Z"
  }
}
```

---

# Data Models

## Core Entity Relationships

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Tenant    │───────│    User     │───────│    Role     │
└─────────────┘       └──────┬──────┘       └─────────────┘
      │                      │
      │                      │ owns/creates
      │                      │
      │               ┌──────┴──────┐
      │               │   Policy    │◄──────── PolicyTranslation
      │               └──────┬──────┘
      │                      │
      │     ┌────────────────┼────────────────────┐
      │     │                │                    │
      │     │    ┌───────────┼───────────┐       │
      │     │    │           │           │       │
      │  ┌──┴────┴──┐  ┌─────┴────┐  ┌───┴────┐  │
      │  │ Exception │  │ Comment  │  │Version │  │
      │  └───────────┘  └──────────┘  └────────┘  │
      │                                           │
      │                              ┌────────────┴─────────────┐
      │                              │                          │
      │                         ┌────┴────┐              ┌──────┴──────┐
      │                         │Workflow │              │ PolicyLink  │
      │                         └────┬────┘              └──────┬──────┘
      │                              │                          │
      │                    ┌─────────┴─────────┐         ┌──────┴──────┐
      │                    │                   │         │   Risk /    │
      │               ┌────┴────┐      ┌───────┴───────┐ │   Case /    │
      │               │  Step   │      │WorkflowCond.  │ │Investigation│
      │               └─────────┘      └───────────────┘ └─────────────┘
      │
      │               ┌─────────────┐              ┌─────────────┐
      ├───────────────│Distribution │              │ Regulatory  │
      │               │  Campaign   │              │ Framework   │
      │               └──────┬──────┘              └──────┬──────┘
      │                      │                            │
      │               ┌──────┴──────┐              ┌──────┴──────┐
      │               │ Attestation │              │ Requirement │
      │               └──────┬──────┘              └──────┬──────┘
      │                      │                            │
      │               ┌──────┴──────┐              ┌──────┴──────┐
      │               │    Quiz     │              │   Mapping   │
      │               └──────┬──────┘              └─────────────┘
      │                      │
      │               ┌──────┴──────┐
      │               │ Certificate │
      │               └─────────────┘
      │
      │               ┌─────────────┐              ┌─────────────┐
      ├───────────────│  External   │              │ Integration │
      │               │   Portal    │              │   Config    │
      │               └──────┬──────┘              └─────────────┘
      │                      │
      │               ┌──────┴──────┐
      └───────────────│  External   │
                      │ Attestation │
                      └─────────────┘
```

## New Entity Schemas

### PolicyException
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "businessUnitId": "uuid?",
  "policyId": "uuid",
  "exceptionType": "TEMPORARY_WAIVER | PERMANENT_EXEMPTION | CONDITIONAL",
  "status": "DRAFT | PENDING | ACTIVE | EXPIRED | DENIED | REVOKED",
  "statusRationale": "string (why status changed, captures reviewer reasoning)",
  "justification": "string",
  "startDate": "date",
  "endDate": "date",
  "scope": {
    "type": "BUSINESS_UNIT | USERS | LOCATIONS",
    "businessUnit": "string?",
    "userIds": ["uuid"]?,
    "locations": ["string"]?
  },
  "riskAssessment": {
    "level": "LOW | MEDIUM | HIGH | CRITICAL",
    "mitigatingControls": "string"
  },
  "conditions": ["string"],
  "requestedById": "uuid",
  "approvedById": "uuid?",
  "approvedAt": "datetime?",
  "attachments": ["uuid"],
  "renewalHistory": [{ "previousEndDate": "date", "renewedAt": "datetime" }],
  "auditLog": [{ "action": "string", "userId": "uuid", "timestamp": "datetime" }],
  "sourceSystem": "string? (e.g., 'NAVEX', 'EQS', 'CONVERCENT' for migrated data)",
  "sourceRecordId": "string? (original exception ID from source system)",
  "migratedAt": "datetime? (when imported, null for native records)",
  "createdAt": "datetime",
  "updatedAt": "datetime"
}
```

### RegulatoryFramework
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "name": "string",
  "shortCode": "string",
  "version": "string",
  "description": "string",
  "source": "LIBRARY | CUSTOM",
  "isActive": "boolean",
  "requirementCount": "number",
  "createdAt": "datetime"
}
```

### RegulatoryRequirement
```json
{
  "id": "uuid",
  "frameworkId": "uuid",
  "parentId": "uuid?",
  "code": "string",
  "name": "string",
  "description": "string",
  "level": "number",
  "order": "number"
}
```

### PolicyFrameworkMapping
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "policyId": "uuid",
  "requirementId": "uuid",
  "mappingType": "FULL | PARTIAL | INDIRECT",
  "notes": "string?",
  "createdById": "uuid",
  "createdAt": "datetime"
}
```

### PolicyLink
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "policyId": "uuid",
  "entityType": "RISK | CASE | INVESTIGATION",
  "entityId": "uuid",
  "linkType": "MITIGATES | CONTROLS | REFERENCES | GOVERNS | VIOLATION",
  "policyVersionId": "uuid? (required for CASE links, preserves specific version)",
  "policyVersionNumber": "string? (denormalized for display, e.g., 'v2.1')",
  "notes": "string?",
  "linkedById": "uuid",
  "linkedAt": "datetime"
}
```

### AttestationResponseRIU (extends RiskIntelligenceUnit)

> **Note:** This entity extends the base `RiskIntelligenceUnit` schema defined in `00-PLATFORM/01-PLATFORM-VISION.md`. Attestation responses are **immutable** after creation.

```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "type": "attestation_response",
  "sourceChannel": "policy_attestation",
  "receivedAt": "datetime",
  "reporterEmployeeId": "uuid (FK to Employee)",
  "status": "received",

  "campaignAssignmentId": "uuid (FK to CampaignAssignment)",
  "policyId": "uuid (FK to Policy)",
  "policyVersionId": "uuid (FK to PolicyVersion - specific version attested)",
  "policyVersionNumber": "string (denormalized, e.g., 'v2.1')",

  "attestationType": "CHECKBOX | SIGNATURE | QUIZ",
  "attestationResult": "ATTESTED | REFUSED | QUIZ_FAILED",
  "acknowledgedAt": "datetime",

  "quizData": {
    "quizId": "uuid?",
    "score": "number?",
    "passed": "boolean?",
    "attemptNumber": "number?",
    "answers": "json? (preserved for audit)"
  },

  "signatureData": {
    "signatureType": "TYPED | DRAWN | ELECTRONIC?",
    "signatureData": "string? (encrypted)",
    "signatureCapturedAt": "datetime?"
  },

  "refusalData": {
    "refusalReason": "string?",
    "refusalCategory": "DISAGREE | NOT_APPLICABLE | OTHER?"
  },

  "caseId": "uuid? (FK to Case, if case was created)",

  "aiSummary": "string?",
  "aiRiskScore": "number?",
  "aiGeneratedAt": "datetime?",

  "sourceSystem": "string? (for migrated data)",
  "sourceRecordId": "string? (original ID from source)",
  "migratedAt": "datetime?",

  "createdAt": "datetime",
  "createdBy": "uuid"
}
```

### PolicyAttestationCampaign (extends Campaign)

> **Note:** This entity extends the base `Campaign` schema defined in `00-PLATFORM/01-PLATFORM-VISION.md`.

```json
{
  "id": "uuid",
  "organizationId": "uuid",
  "campaignType": "policy_attestation",
  "name": "string",
  "description": "string?",

  "policyId": "uuid (FK to Policy)",
  "policyVersionId": "uuid (FK to PolicyVersion - which version to attest)",

  "targetAudience": {
    "departments": ["string"]?,
    "locations": ["string"]?,
    "jobLevels": ["string"]?,
    "businessUnits": ["uuid"]?,
    "excludeUsers": ["uuid"]?
  },

  "startDate": "date",
  "dueDate": "date",
  "reminderSchedule": {
    "intervals": ["number (days before due)"]
  },

  "attestationConfig": {
    "attestationType": "CHECKBOX | SIGNATURE | QUIZ",
    "quizId": "uuid?",
    "quizRequired": "boolean",
    "quizPassingScore": "number? (percentage)",
    "quizMaxAttempts": "number?"
  },

  "autoCaseRules": {
    "createCaseOnRefusal": "boolean",
    "createCaseOnQuizFailure": "boolean",
    "createCaseOnOverdue": "boolean",
    "quizFailureThreshold": "number (attempts before case)",
    "overdueDaysBeforeCase": "number",
    "caseCategory": "string",
    "caseSeverity": "LOW | MEDIUM | HIGH",
    "caseAssignTo": "manager | compliance_officer | specific_user",
    "caseAssignToUserId": "uuid?"
  },

  "status": "DRAFT | SCHEDULED | ACTIVE | CLOSED",

  "sourceSystem": "string?",
  "sourceRecordId": "string?",
  "migratedAt": "datetime?",

  "createdAt": "datetime",
  "createdBy": "uuid",
  "updatedAt": "datetime"
}
```

### ExternalPortal
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "name": "string",
  "type": "VENDOR | PARTNER | REGULATOR | PUBLIC",
  "slug": "string",
  "branding": {
    "logo": "string?",
    "primaryColor": "string",
    "customMessage": "string?"
  },
  "accessControl": {
    "authentication": "MAGIC_LINK | SSO | PASSWORD",
    "allowedDomains": ["string"],
    "expirationDays": "number"
  },
  "policies": [{
    "policyId": "uuid",
    "accessType": "READ_ONLY | READ_ACKNOWLEDGE",
    "required": "boolean"
  }],
  "isActive": "boolean",
  "createdAt": "datetime"
}
```

### ExternalUser
```json
{
  "id": "uuid",
  "portalId": "uuid",
  "email": "string",
  "name": "string?",
  "organization": "string?",
  "lastAccessedAt": "datetime?",
  "accessExpiresAt": "datetime"
}
```

### IntegrationConfig
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "type": "HRIS | LMS | SSO | GRC | SHAREPOINT | SLACK",
  "provider": "string",
  "status": "CONNECTED | DISCONNECTED | ERROR",
  "config": "json (encrypted)",
  "lastSyncAt": "datetime?",
  "lastSyncStatus": "SUCCESS | PARTIAL | FAILED",
  "syncSchedule": "cron expression?",
  "fieldMappings": "json?",
  "createdAt": "datetime"
}
```

### WorkflowCondition
```json
{
  "id": "uuid",
  "workflowId": "uuid",
  "name": "string",
  "position": "number",
  "expression": {
    "operator": "AND | OR",
    "conditions": [{
      "field": "string",
      "operator": "EQUALS | CONTAINS | IN | GREATER_THAN",
      "value": "any"
    }]
  },
  "trueBranchStepId": "uuid",
  "falseBranchStepId": "uuid"
}
```

### Quiz
```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "policyId": "uuid",
  "passingScore": "number",
  "attemptsAllowed": "number",
  "randomizeQuestions": "boolean",
  "showCorrectAnswers": "boolean",
  "timeLimitMinutes": "number?",
  "isActive": "boolean",
  "questions": [{
    "id": "uuid",
    "question": "string",
    "type": "MULTIPLE_CHOICE | TRUE_FALSE | MULTI_SELECT",
    "options": ["string"],
    "correctAnswer": "number | [number]",
    "explanation": "string?",
    "order": "number"
  }],
  "createdAt": "datetime"
}
```

### QuizAttempt
```json
{
  "id": "uuid",
  "quizId": "uuid",
  "userId": "uuid",
  "attestationId": "uuid?",
  "answers": [{ "questionId": "uuid", "answer": "number | [number]" }],
  "score": "number",
  "passed": "boolean",
  "attemptNumber": "number",
  "startedAt": "datetime",
  "completedAt": "datetime?"
}
```

### Certificate
```json
{
  "id": "string (CERT-YYYY-XXXXX)",
  "tenantId": "uuid",
  "userId": "uuid",
  "policyId": "uuid",
  "quizAttemptId": "uuid?",
  "attestationId": "uuid?",
  "type": "ATTESTATION | QUIZ_COMPLETION | TRAINING",
  "issuedAt": "datetime",
  "expiresAt": "datetime?",
  "metadata": "json"
}
```

### Policy Activity Log

Immutable audit trail for policy and related entity actions:

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "entityType": "POLICY | EXCEPTION | ATTESTATION | QUIZ | CERTIFICATE",
  "entityId": "uuid",
  "activityType": "CREATED | EDITED | SUBMITTED | APPROVED | REJECTED | PUBLISHED | ATTESTED | EXPIRED | VIEWED | EXPORTED",
  "description": "string (natural language description for AI context)",
  "details": "json (additional context)",
  "actorId": "uuid",
  "actorType": "USER | SYSTEM",
  "actorName": "string",
  "oldValue": "json?",
  "newValue": "json?",
  "ipAddress": "string?",
  "createdAt": "datetime (immutable)"
}
// This table is APPEND-ONLY (no updates or deletes)
// All entries ALSO written to unified AUDIT_LOG for cross-module queries
```

## AI-First Design Notes

**Source Tracking:** All entities that can be imported from competitor systems include `sourceSystem`, `sourceRecordId`, and `migratedAt` fields to enable data lineage tracking.

**Status Rationale:** Key status transitions capture `statusRationale` to preserve human reasoning for AI context.

**Dual-Write Audit:** All activity is logged to both entity-specific activity logs (e.g., Policy Activity) AND the unified `AUDIT_LOG` for cross-module queries and comprehensive audit trails.

**AI Integration:**
- Policy content is generated and refined via Claude API (see Feature F3)
- Auto-tagging and summarization uses AI (see Feature F15)
- Translation is AI-powered with human review (see Feature F3)
- Semantic search indexes policy content for AI retrieval

---

# Integration Specifications

## HRIS Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    HRIS Integration Flow                     │
└─────────────────────────────────────────────────────────────┘

   ┌──────────┐         ┌──────────────┐         ┌──────────┐
   │  HRIS    │         │   Ethico     │         │ Database │
   │ (Workday)│         │   Backend    │         │ (Postgres)│
   └────┬─────┘         └──────┬───────┘         └────┬─────┘
        │                      │                      │
        │  1. Scheduled Sync   │                      │
        │  (Daily 2 AM)        │                      │
        │◄─────────────────────│                      │
        │                      │                      │
        │  2. Fetch Employees  │                      │
        │  (OAuth + API Call)  │                      │
        │─────────────────────►│                      │
        │                      │                      │
        │  3. Employee Data    │                      │
        │  (JSON Response)     │                      │
        │◄─────────────────────│                      │
        │                      │                      │
        │                      │  4. Transform &      │
        │                      │     Validate         │
        │                      │────────────────────► │
        │                      │                      │
        │                      │  5. Upsert Users     │
        │                      │  (Create/Update)     │
        │                      │────────────────────► │
        │                      │                      │
        │                      │  6. Log Sync Result  │
        │                      │────────────────────► │
        │                      │                      │
        │                      │  7. Notify Admin     │
        │                      │  (if errors)         │
        │                      │◄─────────────────────│
        │                      │                      │
```

## Field Mapping Configuration

```json
{
  "hrisSystem": "WORKDAY",
  "fieldMappings": {
    "email": "workEmail",
    "firstName": "legalFirstName",
    "lastName": "legalLastName",
    "department": "supervisoryOrganization.name",
    "jobTitle": "businessTitle",
    "location": "primaryWorkLocation.name",
    "managerId": "manager.employeeID",
    "employeeId": "employeeID",
    "startDate": "originalHireDate",
    "employmentStatus": "employmentStatus.descriptor",
    "preferredLanguage": "preferredLanguage.isoCode"
  },
  "transformations": {
    "employmentStatus": {
      "Active": "ACTIVE",
      "Terminated": "TERMINATED",
      "On Leave": "ON_LEAVE"
    }
  },
  "filters": {
    "includeContractors": true,
    "excludeTerminated": false
  }
}
```

---

# Non-Functional Requirements

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Load Time | < 2s | Time to interactive |
| API Response (p50) | < 100ms | Server processing time |
| API Response (p95) | < 300ms | Server processing time |
| API Response (p99) | < 500ms | Server processing time |
| Search Results | < 500ms | Query to results displayed |
| Real-time Sync | < 100ms | Edit to other user sees it |
| File Upload | < 10s | For 25MB file |
| Report Generation | < 30s | For 1000 policies |

## Scalability Requirements

| Dimension | Target |
|-----------|--------|
| Concurrent Users per Tenant | 1,000+ |
| Policies per Tenant | 10,000+ |
| Users per Tenant | 50,000+ |
| Total Tenants | 1,000+ |
| API Requests per Tenant | 10,000/hour |
| File Storage per Tenant | 100GB |

## Availability Requirements

| Metric | Target |
|--------|--------|
| Uptime SLA | 99.9% |
| RTO (Recovery Time Objective) | 4 hours |
| RPO (Recovery Point Objective) | 1 hour |
| Planned Maintenance Window | Sundays 2-4 AM EST |

## Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| Data Encryption (Transit) | TLS 1.3 |
| Data Encryption (Rest) | AES-256 |
| Password Hashing | bcrypt (12 rounds) |
| Session Duration | 15 min (access), 7 days (refresh) |
| MFA Support | TOTP, WebAuthn |
| Audit Logging | All data access and modifications |
| Penetration Testing | Annual, by third party |
| SOC 2 Type II | Maintained |
| GDPR Compliance | Data residency options, DPA |

## Compliance Requirements

| Standard | Status |
|----------|--------|
| SOC 2 Type II | Required for launch |
| GDPR | Required for EU customers |
| HIPAA | Phase 2 (healthcare vertical) |
| ISO 27001 | Phase 2 |
| CCPA | Required for CA customers |

---

# Appendix

## Glossary

| Term | Definition |
|------|------------|
| Policy | A formal document establishing organizational rules or guidelines |
| Procedure | Step-by-step instructions implementing a policy |
| Attestation | Formal acknowledgment by an employee that they've read and understood a policy |
| Distribution Campaign | A coordinated effort to send a policy to employees and track attestation |
| Workflow | A series of approval steps a policy must pass through before publication |
| Tenant | An organization (customer) with isolated data in the multi-tenant system |
| RBAC | Role-Based Access Control - permissions based on user roles |
| RLS | Row-Level Security - PostgreSQL feature for tenant data isolation |
| JIT Provisioning | Just-In-Time user creation during first SSO login |
| CRDT | Conflict-free Replicated Data Type - enables real-time collaboration |
| RIU | Risk Intelligence Unit - immutable record of an input event (report, disclosure, attestation) |
| Campaign | Outbound request for action (attestation, disclosure, survey) with tracking |
| Campaign Assignment | Individual employee's obligation to respond to a campaign |

## RIU Architecture Acceptance Criteria

> **Note:** These acceptance criteria are specific to the RIU architecture integration. See individual feature sections for additional acceptance criteria.

| ID | Criterion | Priority |
|----|-----------|----------|
| RIU-01 | Policy attestation completion creates an `attestation_response` RIU | P0 |
| RIU-02 | RIU includes policy_version_id linking to specific version attested | P0 |
| RIU-03 | RIU is immutable after creation (no edits allowed) | P0 |
| RIU-04 | Campaign auto_case_rules evaluate after RIU creation | P0 |
| RIU-05 | Case created when refusal detected (if configured) | P1 |
| RIU-06 | Case created when quiz fails after max attempts (if configured) | P1 |
| RIU-07 | Case created for overdue attestations (if configured) | P1 |
| RIU-08 | Case links to specific Policy Version (not just Policy) | P0 |
| RIU-09 | Policy violation links preserve version for legal defensibility | P0 |
| RIU-10 | GET /policies/:id/links returns cases with version information | P0 |
| RIU-11 | GET /cases/:id/policies returns linked policies with version info | P0 |
| RIU-12 | Attestation response RIU accessible via GET /attestations/:id/riu | P1 |
| RIU-13 | Campaign Assignment status updates when RIU created | P0 |
| RIU-14 | Activity logged to AUDIT_LOG for RIU creation | P0 |
| RIU-15 | Activity logged to AUDIT_LOG for Case creation from attestation | P1 |

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | Nick Gallo | Initial PRD |
| 2.0 | Jan 2026 | Claude Code | Enhanced with competitive analysis, wireframes, API specs |
| 3.0 | Jan 2026 | Claude Code | Added 12 new MVP features: Exception Management (F5), Regulatory Frameworks (F6), Risk/Incident Linkage (F7), Employee Policy Hub (F8), SharePoint Integration (F9), External Portals (F10), LMS Integration (F11), Integration Marketplace (F12), Conditional Workflows (F13), Real-Time Audit Dashboards (F14), AI Auto-Tagging (F15), Quiz & Certifications (F16). Added corresponding APIs, data models, and updated competitive analysis. |
| 3.1 | Feb 2026 | Claude Code | **RIU Architecture Integration:** Updated to align with Platform Vision v3.2. Added RIU Architecture Integration section documenting attestation_response RIU creation, Campaign model integration, and Policy Version linking for Cases. Updated API endpoints (POST /attestations/:id/attest creates RIU, POST /attestations/:id/refuse, GET /attestations/:id/riu, GET /cases/:id/policies). Added AttestationResponseRIU and PolicyAttestationCampaign entity schemas. Updated PolicyLink to include policyVersionId for Case links. Added RIU Architecture acceptance criteria. |

---
