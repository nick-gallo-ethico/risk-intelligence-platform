# AI Agent Technical Specification

**Version:** 1.0
**Last Updated:** February 2026
**Status:** Draft
**References:** WORKING-DECISIONS.md sections AA.1-AA.21

---

## Table of Contents

1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Interaction Model](#3-interaction-model)
4. [Action System](#4-action-system)
5. [Skills System](#5-skills-system)
6. [Content Generation](#6-content-generation)
7. [Operations](#7-operations)
8. [Security & Permissions](#8-security--permissions)
9. [Data Model](#9-data-model)
10. [API Endpoints](#10-api-endpoints)
11. [Appendix A: Decision Log](#appendix-a-decision-log)

---

## 1. Overview

### 1.1 Vision: "Claude Code for Compliance"

The Ethico Risk Intelligence Platform AI is not a traditional chatbot that simply answers questions. It is an **action agent** that can execute real operations on behalf of users, similar to how Claude Code operates for software developers.

**Core Principle:** The AI assists compliance professionals by:
- Understanding context from the user's current view
- Proposing and executing real actions (with appropriate confirmation)
- Respecting all user permissions and security boundaries
- Learning organizational terminology and workflows through context files
- Providing specialized assistance through scoped agents

### 1.2 Key Differentiators

| Traditional Chatbot | Ethico AI Agent |
|---------------------|-----------------|
| Answers questions only | Executes real actions |
| Static context | Dynamic, view-aware context |
| One-size-fits-all | Scoped agents per workflow |
| Ephemeral conversations | Structured persistence (decisions, drafts) |
| No permission awareness | Full RBAC integration |

### 1.3 Design Philosophy

1. **Non-intrusive by default** - AI doesn't consume screen space until invoked
2. **Assist, don't replace** - Human judgment always has final say
3. **Transparent** - Clear when content is AI-generated
4. **Permission-respecting** - AI cannot do anything the user couldn't do manually
5. **Context-aware** - AI adapts to what the user is viewing
6. **Recoverable** - Actions can be undone; mistakes are correctable

---

## 2. Architecture

### 2.1 Scoped Agents

**Decision (AA.17):** Instead of one AI that dynamically adjusts scope, use specialized agents for different views. Each agent has its own context scope, default behaviors, and available skills.

#### 2.1.1 Agent Types

| Agent | Scope | Context Loads | Best For |
|-------|-------|---------------|----------|
| **Investigation Agent** | Single investigation | Investigation details, interviews, findings, evidence | Deep work on one investigation |
| **Case Agent** | Case + linked entities | Case data, all RIUs, all investigations (summarized), timeline, communications | Case management, seeing full picture |
| **RIU Agent** | Single RIU | RIU details, linked case (if any), reporter communications | Intake review, QA work |
| **Compliance Manager** | Program-wide | Recent activity, assigned items, trends, cross-entity patterns | Dashboard, oversight, reporting |
| **Policy Agent** | Policy lifecycle | Policy content, versions, approval workflow, attestation status | Policy work |

#### 2.1.2 Agent Type Schema

```typescript
interface AgentType {
  id: string;
  name: string;
  scope: 'entity' | 'program';

  // What it loads automatically
  contextLoading: {
    primaryEntity: boolean;
    linkedEntities: 'full' | 'summary' | 'none';
    activityDepth: number;  // Number of activity events to load
    programData?: {
      assignedItems: boolean;
      recentActivity: boolean;
      trends: boolean;
    };
  };

  // Behavioral defaults
  persona: {
    description: string;
    defaultTone: 'analytical' | 'supportive' | 'executive';
    thinkingStyle: string;
  };

  // Skill availability
  availableSkillCategories: string[];
  defaultSkills: string[];  // Skills shown by default in UI
}
```

#### 2.1.3 Agent Definitions

```typescript
const investigationAgent: AgentType = {
  id: 'investigation',
  name: 'Investigation Assistant',
  scope: 'entity',
  contextLoading: {
    primaryEntity: true,
    linkedEntities: 'summary',
    activityDepth: 100,
  },
  persona: {
    description: "I help you conduct thorough investigations with proper documentation.",
    defaultTone: 'analytical',
    thinkingStyle: 'Focuses on evidence, interviews, findings, and defensible conclusions',
  },
  availableSkillCategories: ['investigation', 'interviews', 'documentation'],
  defaultSkills: ['/interview-prep', '/summarize-findings', '/evidence-checklist'],
};

const caseAgent: AgentType = {
  id: 'case',
  name: 'Case Manager',
  scope: 'entity',
  contextLoading: {
    primaryEntity: true,
    linkedEntities: 'full',
    activityDepth: 50,
  },
  persona: {
    description: "I help you manage cases from intake to resolution.",
    defaultTone: 'supportive',
    thinkingStyle: 'Focuses on workflow, assignments, timelines, and stakeholder communication',
  },
  availableSkillCategories: ['case-management', 'communication', 'reporting'],
  defaultSkills: ['/case-summary', '/assign', '/send-update'],
};

const riuAgent: AgentType = {
  id: 'riu',
  name: 'Intake Assistant',
  scope: 'entity',
  contextLoading: {
    primaryEntity: true,
    linkedEntities: 'summary',
    activityDepth: 20,
  },
  persona: {
    description: "I help you review and process intake reports.",
    defaultTone: 'analytical',
    thinkingStyle: 'Focuses on categorization, severity assessment, and routing decisions',
  },
  availableSkillCategories: ['intake', 'categorization', 'qa'],
  defaultSkills: ['/categorize', '/assess-severity', '/suggest-routing'],
};

const complianceManagerAgent: AgentType = {
  id: 'compliance-manager',
  name: 'Compliance Manager',
  scope: 'program',
  contextLoading: {
    primaryEntity: false,
    linkedEntities: 'none',
    activityDepth: 20,
    programData: {
      assignedItems: true,
      recentActivity: true,
      trends: true,
    },
  },
  persona: {
    description: "I help you oversee your compliance program and spot patterns.",
    defaultTone: 'executive',
    thinkingStyle: 'Focuses on trends, risks, overdue items, and strategic insights',
  },
  availableSkillCategories: ['reporting', 'analytics', 'oversight'],
  defaultSkills: ['/weekly-summary', '/overdue-items', '/trend-analysis'],
};

const policyAgent: AgentType = {
  id: 'policy',
  name: 'Policy Assistant',
  scope: 'entity',
  contextLoading: {
    primaryEntity: true,
    linkedEntities: 'summary',
    activityDepth: 30,
  },
  persona: {
    description: "I help you create, review, and manage policies.",
    defaultTone: 'analytical',
    thinkingStyle: 'Focuses on clarity, compliance requirements, and approval workflows',
  },
  availableSkillCategories: ['policy', 'drafting', 'review'],
  defaultSkills: ['/improve-clarity', '/check-compliance', '/summarize-changes'],
};
```

#### 2.1.4 Agent Switching

Agents load automatically based on the current view. The user always sees which agent they are talking to:

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Investigation Assistant              [Context: 48%]      │
│ Investigation #456                                          │
├─────────────────────────────────────────────────────────────┤
│ User: "What questions should I ask the department head?"    │
│                                                             │
│ AI: Based on the evidence collected and witness             │
│ statements so far, here are targeted questions...           │
│                                                             │
│ [/interview-prep] [/evidence-checklist] [+ Skills]          │
└─────────────────────────────────────────────────────────────┘
```

When user navigates to dashboard:

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Compliance Manager                   [Context: 35%]      │
│ Program Overview                                            │
├─────────────────────────────────────────────────────────────┤
│ AI: Good morning! You have 12 items assigned to you,        │
│ 3 are overdue. I also noticed a spike in harassment         │
│ reports this month (up 40% from last month). Want me        │
│ to dig into that trend?                                     │
│                                                             │
│ [/overdue-items] [/weekly-summary] [/trends] [+ Skills]     │
└─────────────────────────────────────────────────────────────┘
```

#### 2.1.5 Cross-Agent Handoff

When Compliance Manager surfaces an entity, user can "zoom in":

```
User (to Compliance Manager): "Show me the overdue cases"

AI: You have 3 overdue cases:

    1. Case #789 - "Manufacturing Safety Concern"
       Due: Jan 28 (5 days overdue)
       [Open Case →]
    ...

User clicks [Open Case →]

→ Navigates to Case #789
→ Case Manager agent loads
→ Context shifts to Case #789 data
→ AI: "I've loaded Case #789. This case is 5 days overdue.
   The investigation is waiting on an interview. Want me
   to help draft a follow-up?"
```

### 2.2 Context Hierarchy

**Decision (AA.12):** Platform AI follows Claude Code patterns with hierarchical context loading.

#### 2.2.1 Context Loading Order

Context loads in order, with later sources overriding earlier:

```
Context Loading Order:
─────────────────────────────────────────────────────────────
1. Platform Context     → Built-in platform knowledge, entity schemas, action catalog
2. Organization Context → Org-level CONTEXT.md (terminology, policies, standards)
3. Team Context         → Team-level CONTEXT.md (team workflows, preferences)
4. User Context         → User-level CONTEXT.md (personal style, shortcuts)
5. Entity Context       → Current case/investigation data + conversation history
```

#### 2.2.2 Organization Context Example

```markdown
# Acme Corp AI Context

## Terminology
- "Associate" not "Employee"
- "Incident" not "Case" in external communications
- HIPAA cases always require Legal review before closing

## Writing Standards
- Summaries: 3 paragraphs max, executive-friendly
- Use active voice
- Never include SSNs or full names in AI-generated summaries

## Escalation Rules
- Any case mentioning "retaliation" → auto-flag for Legal
- Cases involving VP+ → CCO notification required
```

#### 2.2.3 Team Context Example

```markdown
# HIPAA Investigation Team Context

## Our Workflow
- Always check prior training records before interview
- Standard interview questions in /templates/hipaa-interview.md
- Final reports require peer review

## Preferred Tools
- Use /summarize-hipaa for breach summaries (includes required fields)
```

#### 2.2.4 Context Storage

| Context Level | Storage | Editable By |
|---------------|---------|-------------|
| Platform | Deployed with code | Ethico engineers |
| Organization | Database (OrganizationContext table) | Org admins |
| Team | Database (TeamContext table) | Team leads |
| User | Database (UserContext table) | Individual user |

```typescript
interface ContextDocument {
  id: string;
  organizationId: string;
  scope: 'organization' | 'team' | 'user';
  scopeId?: string;  // teamId or userId (null for org-level)

  content: string;   // Markdown content

  createdAt: DateTime;
  updatedAt: DateTime;
  updatedById: string;

  version: number;
  isActive: boolean;
}
```

### 2.3 Context Window Management

**Decision (AA.15):** Like Claude Code, users see and control their context consumption.

#### 2.3.1 Context Visibility UI

```
┌─────────────────────────────────────────────────────────────┐
│ AI Chat                                        [≡] [⟳] [×]  │
├─────────────────────────────────────────────────────────────┤
│ Context: ████████░░░░░░░░ 52% used                          │
│ [View breakdown ▼]                                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ (conversation content)                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### 2.3.2 Expanded Breakdown

```
┌─────────────────────────────────────────────────────────────┐
│ Context Breakdown                                    52%    │
│─────────────────────────────────────────────────────────────│
│ Entity data (Case #1234)               ████░░░░      18%    │
│ Activity timeline (47 events)          ███░░░░░      12%    │
│ Context files (org + user)             ██░░░░░░       8%    │
│ Session notes (2 active)               █░░░░░░░       4%    │
│ Current conversation                   ███░░░░░      10%    │
│─────────────────────────────────────────────────────────────│
│ Available                              ████████      48%    │
│                                                             │
│ [Compact Conversation]  [Clear Chat]  [Start Fresh]         │
└─────────────────────────────────────────────────────────────┘
```

#### 2.3.3 Context Actions

| Action | What It Does |
|--------|--------------|
| **Compact** | AI summarizes conversation so far, replaces raw history with summary. Preserves meaning, reduces tokens. |
| **Clear Chat** | Clears conversation history, keeps entity context + context files. Like starting new chat on same case. |
| **Start Fresh** | Clears everything except base entity data. Reloads context files fresh. |

#### 2.3.4 Compact Flow

```
User clicks [Compact Conversation]

AI:
┌─────────────────────────────────────────────────────────────┐
│ Compacting conversation...                                  │
│                                                             │
│ Summary of conversation so far:                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ User asked about case status and next steps.            │ │
│ │ Discussed waiting for Legal review. Drafted             │ │
│ │ partial summary (saved). Identified 3 pending           │ │
│ │ interviews to schedule.                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ This will reduce context from 52% → ~35%                    │
│                                                             │
│ [Compact]  [Cancel]                                         │
└─────────────────────────────────────────────────────────────┘
```

#### 2.3.5 Context by Agent Type

**Investigation Agent (viewing Investigation #456):**
```
┌─────────────────────────────────────────────────────────────┐
│ Context Breakdown                                    48%    │
│─────────────────────────────────────────────────────────────│
│ Investigation #456 details             ██████░░      25%    │
│ ├─ Interviews (3)                                           │
│ ├─ Findings draft                                           │
│ ├─ Evidence/documents                                       │
│ └─ Activity timeline                                        │
│ Parent Case #123 (summary only)        ██░░░░░░       8%    │
│ Context files (org + user)             ██░░░░░░       8%    │
│ Session notes                          █░░░░░░░       3%    │
│ Conversation                           █░░░░░░░       4%    │
│─────────────────────────────────────────────────────────────│
│ Available                              █████████     52%    │
└─────────────────────────────────────────────────────────────┘
```

**Compliance Manager (dashboard view):**
```
┌─────────────────────────────────────────────────────────────┐
│ Context Breakdown                                    35%    │
│─────────────────────────────────────────────────────────────│
│ Your assigned items (12)               ████░░░░      15%    │
│ Recent activity (org-wide)             ██░░░░░░       6%    │
│ Dashboard state/filters                █░░░░░░░       2%    │
│ Context files (org + user)             ██░░░░░░       8%    │
│ Conversation                           █░░░░░░░       4%    │
│─────────────────────────────────────────────────────────────│
│ Available for queries                  █████████     65%    │
│ (more headroom for cross-entity searches)                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Interaction Model

### 3.1 Tiered Interaction

**Decision (AA.8):** Tiered interaction model - AI doesn't consume screen real estate until invoked.

#### 3.1.1 Tier 1 - Inline (Ghost Text)

| Aspect | Detail |
|--------|--------|
| **Trigger** | Auto-appears while typing in text fields |
| **UX** | Ghost text suggestions (smart compose style) |
| **Accept** | Tab to accept |
| **Dismiss** | Escape or keep typing |
| **Use Cases** | Note completion, email templates, standard phrases |

```
┌─────────────────────────────────────────────────────────────┐
│ Add Investigation Note                                      │
├─────────────────────────────────────────────────────────────┤
│ Interviewed department manager who                          │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ confirmed that similar incidents occurred in Q3 2025.       │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ (ghost text - press Tab to accept)                          │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.2 Tier 2 - Contextual (Selection/Field Actions)

| Aspect | Detail |
|--------|--------|
| **Trigger** | Text selection, right-click, ✨ icon on AI-enabled fields |
| **UX** | Floating toolbar or popover with action buttons |
| **Actions** | "Summarize", "Improve", "Translate", "Ask AI..." |
| **Special** | Screenshot drop zones for "create form from image" workflows |
| **Use Cases** | Summarize selected notes, improve draft text, create form from screenshot |

```
┌─────────────────────────────────────────────────────────────┐
│ Selected text: "The employee stated they witnessed..."      │
│                                                             │
│ ┌───────────────────────────────────────┐                   │
│ │ ✨ Summarize │ Improve │ Translate │ Ask AI...            │
│ └───────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.3 Tier 3 - Slide-over Drawer (Extended Conversation)

| Aspect | Detail |
|--------|--------|
| **Trigger** | Cmd+J (Mac) / Ctrl+J (Win), header AI icon, escalation from Tier 2 |
| **UX** | Right-side drawer slides in (like Claude Code terminal) |
| **Default** | Closed - opens on demand |
| **Option** | Can be pinned open by users who prefer persistent chat |
| **Use Cases** | Multi-turn conversations, complex queries, bulk action workflows |

```
┌─────────────────────────────────────────────────────────────┐
│ Case #1234 - Manufacturing Safety     │ AI Assistant        │
│                                       │ ─────────────────── │
│ [Case Details]                        │ How can I help?     │
│ ...                                   │                     │
│                                       │ > Summarize this    │
│                                       │   case for the CCO  │
│                                       │                     │
│                                       │ AI: Here's an       │
│                                       │ executive summary...│
│                                       │                     │
│                                       │ ─────────────────── │
│                                       │ [Type message...]   │
└─────────────────────────────────────────────────────────────┘
```

#### 3.1.4 Escalation Flow

```
Tier 1 (Inline)
    │ User wants more control/options
    ▼
Tier 2 (Contextual)
    │ Task requires multi-turn conversation
    ▼
Tier 3 (Drawer)
```

**Key Principle:** AI is non-intrusive by default. Contextual assistance appears where you're working, not in a persistent panel consuming screen space.

### 3.2 Conversation Persistence

**Decision (AA.13):** Selective Persistence - Chat transcripts are ephemeral. What persists is structured context: decisions, session notes, drafts, and entity data.

#### 3.2.1 Persistence Layers

| Layer | Persists | Example |
|-------|----------|---------|
| Entity data | Always | Status changes, assignments, findings |
| Owned narrative | Always | User's curated summary |
| Activity log | Always | All actions taken |
| Session notes | When saved | "Waiting for Legal before closing" |
| Drafts | Until accepted/discarded | In-progress summary |
| Raw chat | Never | The actual back-and-forth |

#### 3.2.2 The Pause Pattern

When user leaves mid-work (closes drawer, navigates away, or explicitly `/pause`):

```
AI detects unsaved work or important decisions

AI:
┌─────────────────────────────────────────────────────────────┐
│ 📌 Save session context before leaving?                     │
│                                                             │
│ **Decisions:**                                              │
│ • Waiting for Legal review before closing                   │
│                                                             │
│ **Draft in progress:**                                      │
│ • Investigation summary (not yet saved)                     │
│   [Preview draft]                                           │
│                                                             │
│ **Next steps identified:**                                  │
│ • Follow up after Legal responds                            │
│                                                             │
│ [Save Context]  [Save Draft Only]  [Discard]                │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.3 Session Note Schema

```typescript
interface SessionNote {
  id: string;
  organizationId: string;
  entityType: 'case' | 'investigation' | 'riu' | 'policy';
  entityId: string;
  createdAt: DateTime;
  createdById: string;

  // Structured content (not raw transcript)
  decisions: string[];           // Key decisions made
  pendingActions: string[];      // What's waiting
  draftContent?: string;         // Any unsaved draft
  contextSummary: string;        // AI-generated summary of session

  // Lifecycle
  status: 'active' | 'resolved' | 'archived';
  resolvedAt?: DateTime;         // When pending items completed
  resolvedReason?: string;
}
```

#### 3.2.4 The Resume Pattern

When user returns to entity and opens AI drawer:

```
AI loads: Entity data + Owned narrative + Active session notes + Recent activity

AI:
┌─────────────────────────────────────────────────────────────┐
│ 👋 Welcome back to Case #1234                               │
│                                                             │
│ **From your last session (2 days ago):**                    │
│ • Waiting for Legal review                                  │
│ • Draft summary saved                                       │
│                                                             │
│ **Since then:**                                             │
│ • ✓ Legal review completed - Approved to close              │
│ • 2 new comments added                                      │
│                                                             │
│ Ready to finalize that summary?                             │
│                                                             │
│ [Continue draft]  [Show what changed]  [Start fresh]        │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.5 Auto-Resolution of Session Notes

When pending items complete, session notes auto-resolve:

```
Session note: "Waiting for Legal review"
     ↓
Legal adds approval comment
     ↓
System detects: Legal review completed
     ↓
Session note status: active → resolved
     ↓
Next session: AI mentions "Legal review you were waiting for is complete"
```

#### 3.2.6 Pinning Mid-Conversation

User can explicitly pin important context without pausing:

```
User: "Remember that the reporter mentioned they have documentation at home"

AI: "Got it. Want me to add this as a case note so it's captured?"
    [Add as Case Note]  [Just for this session]

If "Add as Case Note":
→ Adds to entity: "Reporter has additional documentation at home (not yet collected)"
→ Visible in case timeline
→ AI will reference in future sessions
```

---

## 4. Action System

### 4.1 Core Capability

**Decision (AA.1):** AI can take real actions in the platform, not just answer questions.

#### 4.1.1 Action Categories

| Category | Examples | Confirm Required? |
|----------|----------|-------------------|
| **Read/Summarize** | "Summarize this case", "Show overdue tasks" | No |
| **Draft/Propose** | "Draft follow-up emails to managers", "Suggest remediation steps" | Preview only |
| **Execute (Low Risk)** | "Add a note to this case", "Create a task for myself" | Yes (single click) |
| **Execute (High Risk)** | "Send emails to 15 managers", "Close this investigation" | Yes (explicit confirm + preview) |
| **Modify Settings** | "Update the approval workflow", "Change notification rules" | Yes (admin only, full preview) |

#### 4.1.2 Context Scopes

**Decision (AA.2):** AI context adapts based on what user is viewing.

| Scope | User Is Looking At | AI Can Act On |
|-------|-------------------|---------------|
| **Program (Bird's Eye)** | Dashboard, analytics | Cross-entity queries, bulk operations, program-wide insights |
| **Entity List** | Cases list, campaign list | Filter/search, bulk actions on visible items |
| **Entity Detail** | Specific case, investigation | That entity and its children (notes, tasks, messages) |
| **Workflow** | Approval queue, task board | Items in that workflow context |

Context is passed to AI with every interaction:
- Current page/view
- Selected entity (if any)
- User's role and permissions
- Organization settings

### 4.2 Action Catalog

**Decision (AA.9):** Hybrid approach - Static action catalog with dynamic runtime filtering.

#### 4.2.1 Action Registration Pattern

```typescript
// Each module registers its AI-invokable actions
interface AIAction {
  id: string;                       // 'case.send_reminder'
  label: string;                    // 'Send reminder to assignee'
  description: string;              // Detailed description for AI understanding
  category: ActionCategory;         // 'read' | 'draft' | 'execute_low' | 'execute_high' | 'settings'

  // Permission requirements
  requiredPermissions: string[];    // ['case.update', 'email.send']
  requiredFeatures: string[];       // ['email_integration']

  // Context requirements
  contextRequirements: {
    entityType?: string;            // 'case', 'investigation', etc.
    conditions?: string[];          // ['status != closed', 'has_assignee']
    scope?: 'entity' | 'list' | 'program';
  };

  // Parameters
  parameters: ActionParameter[];

  // Execution
  handler: string;                  // Reference to handler function

  // Undo capability
  reversibility: 'full' | 'soft' | 'none';
  undoAction?: string;
  undoWindowMinutes?: number;       // Default: 5
}

interface ActionParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'entity_ref' | 'enum';
  required: boolean;
  description: string;
  enumValues?: string[];
  defaultValue?: any;
}

type ActionCategory = 'read' | 'draft' | 'execute_low' | 'execute_high' | 'settings';
```

#### 4.2.2 Example Action Registrations

```typescript
const caseActions: AIAction[] = [
  {
    id: 'case.send_reminder',
    label: 'Send reminder to assignee',
    description: 'Send an email reminder to the case assignee about pending tasks',
    category: 'execute_high',
    requiredPermissions: ['case.update', 'email.send'],
    requiredFeatures: ['email_integration'],
    contextRequirements: {
      entityType: 'case',
      conditions: ['status != closed', 'has_assignee'],
      scope: 'entity',
    },
    parameters: [
      { name: 'message', type: 'string', required: false, description: 'Custom message to include' },
    ],
    handler: 'CaseActionHandler.sendReminder',
    reversibility: 'none',
  },
  {
    id: 'case.assign',
    label: 'Assign case to user',
    description: 'Assign this case to a specific user',
    category: 'execute_low',
    requiredPermissions: ['case.assign'],
    requiredFeatures: [],
    contextRequirements: {
      entityType: 'case',
      scope: 'entity',
    },
    parameters: [
      { name: 'userId', type: 'entity_ref', required: true, description: 'User to assign to' },
      { name: 'note', type: 'string', required: false, description: 'Assignment note' },
    ],
    handler: 'CaseActionHandler.assign',
    reversibility: 'full',
    undoAction: 'case.assign',  // Can re-assign to previous
    undoWindowMinutes: 5,
  },
  {
    id: 'case.add_note',
    label: 'Add note to case',
    description: 'Add a note or comment to this case',
    category: 'execute_low',
    requiredPermissions: ['case.comment'],
    requiredFeatures: [],
    contextRequirements: {
      entityType: 'case',
      scope: 'entity',
    },
    parameters: [
      { name: 'content', type: 'string', required: true, description: 'Note content' },
      { name: 'isInternal', type: 'boolean', required: false, description: 'Internal only (not visible to reporter)' },
    ],
    handler: 'CaseActionHandler.addNote',
    reversibility: 'full',
    undoAction: 'case.delete_note',
    undoWindowMinutes: 5,
  },
  {
    id: 'case.close',
    label: 'Close case',
    description: 'Close this case with an outcome and summary',
    category: 'execute_high',
    requiredPermissions: ['case.close'],
    requiredFeatures: [],
    contextRequirements: {
      entityType: 'case',
      conditions: ['status != closed'],
      scope: 'entity',
    },
    parameters: [
      { name: 'outcome', type: 'enum', required: true, description: 'Case outcome', enumValues: ['substantiated', 'unsubstantiated', 'inconclusive', 'withdrawn'] },
      { name: 'summary', type: 'string', required: true, description: 'Closure summary' },
    ],
    handler: 'CaseActionHandler.close',
    reversibility: 'full',
    undoAction: 'case.reopen',
    undoWindowMinutes: 30,
  },
];
```

#### 4.2.3 Runtime Filtering Layers

| Layer | Filter Logic |
|-------|--------------|
| **Permission Filter** | User must have all `requiredPermissions` |
| **Feature Filter** | Organization must have all `requiredFeatures` enabled |
| **Context Filter** | Current entity must match `contextRequirements` |
| **Workflow Filter** | Custom workflows may add/remove actions dynamically |

```typescript
interface ActionFilterContext {
  user: {
    id: string;
    permissions: string[];
    role: string;
  };
  organization: {
    id: string;
    enabledFeatures: string[];
  };
  currentView: {
    type: 'dashboard' | 'list' | 'entity' | 'workflow';
    entityType?: string;
    entityId?: string;
    entity?: Record<string, any>;  // Current entity data for condition evaluation
  };
}

function filterActionsForContext(
  allActions: AIAction[],
  context: ActionFilterContext
): AIAction[] {
  return allActions.filter(action => {
    // Permission check
    const hasPermissions = action.requiredPermissions.every(
      p => context.user.permissions.includes(p)
    );
    if (!hasPermissions) return false;

    // Feature check
    const hasFeatures = action.requiredFeatures.every(
      f => context.organization.enabledFeatures.includes(f)
    );
    if (!hasFeatures) return false;

    // Context check
    if (action.contextRequirements.entityType) {
      if (context.currentView.entityType !== action.contextRequirements.entityType) {
        return false;
      }
    }

    // Condition evaluation
    if (action.contextRequirements.conditions && context.currentView.entity) {
      const conditionsMet = evaluateConditions(
        action.contextRequirements.conditions,
        context.currentView.entity
      );
      if (!conditionsMet) return false;
    }

    return true;
  });
}
```

#### 4.2.4 What AI Receives

```
User asks: "What can I do with this case?"
AI sees: [assign, add_note, request_investigation, send_reminder, close]
AI does NOT see: [delete, change_org_settings, bulk_export] (no permission)
```

**Anti-Pattern:** AI must NEVER directly call API endpoints. All AI actions route through the action catalog with permission validation.

### 4.3 Multi-Step Actions

**Decision (AA.10):** Preview-then-Execute pattern - AI prepares everything invisibly, presents editable preview, user confirms once.

#### 4.3.1 UX Pattern

```
User: "Send follow-up emails to all managers with pending COI approvals"

AI: [Does work invisibly - queries, generates, prepares]

AI Response:
┌─────────────────────────────────────────────────────────────┐
│ 📧 Ready to send 12 follow-up emails                        │
│                                                             │
│ Recipients: 12 managers with pending approvals              │
│ [View List] [Edit Recipients]                               │
│                                                             │
│ Template Preview:                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Subject: Action Required: Pending COI Approval          │ │
│ │                                                         │ │
│ │ Hi {manager_name},                                      │ │
│ │ You have {count} pending COI disclosures awaiting...    │ │
│ └─────────────────────────────────────────────────────────┘ │
│ [Edit Template]                                             │
│                                                             │
│ ⚠️ This will send 12 emails immediately                     │
│                                                             │
│ [Cancel]                         [Send All]                 │
└─────────────────────────────────────────────────────────────┘
```

#### 4.3.2 Key Principles

| Principle | Implementation |
|-----------|----------------|
| **Prep Invisibly** | User doesn't see "Step 1 of 5" wizard |
| **Smart Defaults** | AI makes reasonable choices (user can adjust) |
| **Everything Editable** | Recipients, template, timing all changeable from preview |
| **Single Confirmation** | One "Send All" button, not confirm-confirm-confirm |
| **Clear Consequences** | "This will send 12 emails" shown explicitly |

#### 4.3.3 Escalation to Conversation

If AI cannot make a confident choice, it asks ONE clarifying question before preparing preview:

```
AI: "Should I include managers on leave, or only active managers?
     (3 are currently on leave)"
User: "Only active"
AI: [Prepares preview with 9 recipients]
```

**Anti-Patterns:**
- Wizard fatigue: "Step 1 of 6: Select recipients..."
- Surprise actions: Sending without preview
- Over-asking: "Are you sure?" at every step

### 4.4 Confirmation Patterns

**Decision (AA.3, AA.6):** Tiered confirmation based on action risk, with guardrails for dangerous operations.

#### 4.4.1 Confirm-Before-Action UX

1. User requests action via chat
2. AI proposes action with full preview (who will receive what, what will change)
3. User reviews and clicks "Confirm" or "Edit"
4. AI executes and reports result
5. All actions logged with AI attribution

#### 4.4.2 Example Flow

```
User: "Send follow-up emails to all managers whose approval is needed for pending COI disclosures"

AI: "I found 12 managers with pending approvals. Here's the proposed email:

To: [Manager Name]
Subject: Action Required: COI Disclosure Awaiting Your Approval
Body: [Preview...]

Recipients: Sarah Chen, Mike Rodriguez, ... [+10 more]

[Preview All] [Edit Template] [Confirm & Send] [Cancel]"
```

#### 4.4.3 Guardrails

**Decision (AA.6):** Certain actions ALWAYS require human confirmation.

**Never Auto-Execute:**
- Delete/archive operations
- External communications (email, SMS)
- Permission changes
- Workflow modifications
- Bulk operations (>5 items)
- Financial/sensitive data export

```typescript
const GUARDRAIL_ACTIONS = [
  'delete',
  'archive',
  'send_email',
  'send_sms',
  'change_permissions',
  'modify_workflow',
  'bulk_*',  // Any bulk operation
  'export_*', // Any export
];

function requiresExplicitConfirmation(action: AIAction): boolean {
  return (
    action.category === 'execute_high' ||
    action.category === 'settings' ||
    GUARDRAIL_ACTIONS.some(pattern =>
      action.id.match(new RegExp(pattern.replace('*', '.*')))
    )
  );
}
```

### 4.5 Error Handling & Undo

**Decision (AA.14):** Partial success with retry offer for failures; time-limited undo trail for reversible actions.

#### 4.5.1 Partial Failure Handling

Successful actions preserved, failed actions reported with retry option:

```
AI: "Done: Case assigned to Sarah ✓
     ⚠️ Failed: Email notification (server timeout)

     [Retry Notification]  [Skip]  [Undo Assignment]"
```

#### 4.5.2 Action Reversibility Classification

```typescript
interface AIAction {
  // ... other fields

  reversibility: 'full' | 'soft' | 'none';
  // full: Can undo completely (status change, assignment)
  // soft: Can restore within grace period (delete → trash)
  // none: Cannot undo (send email, external API call)

  undoAction?: string;  // Action ID to reverse this
  undoWindowMinutes?: number;  // How long undo available (default: 5)
}
```

| Action Type | Reversibility | Example |
|-------------|---------------|---------|
| Status change | Full | Open → Closed → Open |
| Assignment | Full | Assign → Reassign |
| Add note/summary | Full | Add → Remove |
| Send notification | None | Can't unsend email |
| External integration | None | Sent to Legal system |
| Delete | Soft | Trash → Restore (30 days) |

#### 4.5.3 Undo UX Pattern

After every action, show result with undo option:

```
┌─────────────────────────────────────────────────────────────┐
│ ✓ Done                                                      │
│                                                             │
│ Changes to Case #1234:                                      │
│   • Status: Open → Closed                                   │
│   • Outcome: Substantiated                                  │
│   • Closed by: You (via AI)                                 │
│                                                             │
│ [Undo] ← available for 5 min     [View Case #1234]          │
└─────────────────────────────────────────────────────────────┘
```

#### 4.5.4 Multi-Action Undo

```
User: "Assign to Sarah, set priority high, add note about deadline"

AI executes 3 actions, shows:
┌─────────────────────────────────────────────────────────────┐
│ ✓ 3 changes made to Case #1234                              │
│                                                             │
│   • Assigned to Sarah Chen                                  │
│   • Priority: Normal → High                                 │
│   • Note added: "Deadline: Feb 10 per client request"       │
│                                                             │
│ [Undo All]  [Undo specific...]  [View Case]                 │
└─────────────────────────────────────────────────────────────┘

If [Undo specific...]:
┌─────────────────────────────────────────────────────────────┐
│ Select changes to undo:                                     │
│                                                             │
│ ☐ Assigned to Sarah Chen                                    │
│ ☐ Priority: Normal → High                                   │
│ ☐ Note added: "Deadline: Feb 10..."                         │
│                                                             │
│ [Undo Selected]  [Cancel]                                   │
└─────────────────────────────────────────────────────────────┘
```

#### 4.5.5 Irreversible Action Warning

Before executing irreversible actions, require explicit confirmation:

```
User: "Close this and notify the reporter"

AI:
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ This includes actions that cannot be undone              │
│                                                             │
│ Reversible:                                                 │
│   • Close Case #1234                                        │
│                                                             │
│ ⚠️ NOT reversible:                                          │
│   • Send closure notification to reporter                   │
│     (email cannot be unsent)                                │
│                                                             │
│ [Confirm All]  [Close Only]  [Cancel]                       │
└─────────────────────────────────────────────────────────────┘
```

#### 4.5.6 Undo Record Schema

```typescript
interface UndoRecord {
  id: string;
  organizationId: string;
  actionId: string;
  entityType: string;
  entityId: string;

  // What changed
  previousState: Record<string, any>;  // Snapshot of changed fields
  newState: Record<string, any>;

  // Timing
  executedAt: DateTime;
  undoExpiresAt: DateTime;  // executedAt + undoWindowMinutes

  // Status
  status: 'available' | 'executed' | 'expired';
  undoneAt?: DateTime;
  undoneById?: string;

  // Attribution
  userId: string;
  aiConversationId?: string;
}
```

#### 4.5.7 Entity Confirmation in Preview

For significant actions, preview shows entity clearly:

```
┌─────────────────────────────────────────────────────────────┐
│ About to close:                                             │
│                                                             │
│ Case #1234                                                  │
│ "ABC Corp - Harassment Allegation"                          │
│ Created: Jan 15, 2026 | Assignee: Sarah Chen                │
│                                                             │
│ Is this the right case?                                     │
│                                                             │
│ [Yes, Close It]  [No, Wrong Case]                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Skills System

### 5.1 Skill Definition

**Decision (AA.12):** Skills are reusable, composable AI actions (like Claude Code slash commands).

#### 5.1.1 Skill Hierarchy

```
Skill Hierarchy:
─────────────────
Platform Skills (built-in, all orgs)
├── /summarize - Generate entity summary
├── /timeline - Create chronological narrative
├── /find - Search across entities
├── /assign - Assign entity to user
├── /status - Change entity status
├── /remind - Set reminder/follow-up
├── /export - Generate report/export
└── /template - Apply response template

Organization Skills (org-defined)
├── /summarize-hipaa - HIPAA-specific summary with required fields
├── /escalate-legal - Standard legal escalation workflow
├── /close-investigation - Org's closure checklist
└── /weekly-report - Generate weekly case summary

Team Skills (team-defined)
├── /peer-review - Request peer review with checklist
└── /interview-prep - Generate interview questions for case type

User Skills (personal shortcuts)
├── /my-summary-style - Apply my preferred summary format
└── /quick-close - My standard closure notes
```

#### 5.1.2 Skill Definition Schema

```typescript
interface Skill {
  id: string;                    // 'summarize-hipaa'
  name: string;                  // 'HIPAA Summary'
  description: string;           // Shown in skill picker

  // Ownership & Scope
  createdById: string;
  organizationId: string;
  scope: 'platform' | 'organization' | 'team' | 'user';
  scopeId?: string;              // teamId or userId for team/user scope
  visibility: 'private' | 'shared' | 'published';

  // What the skill does
  promptTemplate: string;        // AI instructions with {{variables}}
  requiredContext: string[];     // ['case', 'investigation']

  // Permissions
  requiredPermissions: string[];
  requiredFeatures: string[];

  // Parameters user can provide
  parameters?: SkillParameter[];

  // Actions the skill can take
  allowedActions: string[];      // From Action Catalog

  // Model requirements
  modelHint?: 'fast' | 'standard' | 'premium' | 'auto';
  modelJustification?: string;   // "Requires nuanced legal analysis"

  // Versioning
  version: string;               // semver
  changelog?: string;

  // Metadata
  category: string;              // 'investigations', 'reporting', 'hipaa', etc.
  tags: string[];

  // Timestamps
  createdAt: DateTime;
  updatedAt: DateTime;
  publishedAt?: DateTime;
}

interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date' | 'enum';
  required: boolean;
  description: string;
  defaultValue?: any;
  enumValues?: string[];
}
```

#### 5.1.3 Example Skill Definition

```typescript
const hipaaBreachSummarySkill: Skill = {
  id: 'summarize-hipaa',
  name: 'HIPAA Breach Summary',
  description: 'Generates a HIPAA-compliant breach summary with all required fields for HHS notification',

  createdById: 'system',
  organizationId: '*',  // Platform skill
  scope: 'platform',
  visibility: 'published',

  promptTemplate: `
    Generate a HIPAA breach summary for this case.
    Include:
    - Breach type and description
    - PHI types involved
    - Number of individuals affected
    - Discovery date and notification deadline (60 days from discovery)
    - Root cause analysis
    - Remediation steps taken or planned

    {{#if org.hipaa_additional_fields}}
    Also include: {{org.hipaa_additional_fields}}
    {{/if}}

    Format as a professional report suitable for HHS notification.
  `,
  requiredContext: ['case', 'investigation'],

  requiredPermissions: ['case.read', 'investigation.read'],
  requiredFeatures: [],

  parameters: [
    {
      name: 'includeRemediation',
      type: 'boolean',
      required: false,
      description: 'Include remediation plan section',
      defaultValue: true,
    },
  ],

  allowedActions: ['read'],
  modelHint: 'standard',

  version: '1.2.0',
  category: 'healthcare',
  tags: ['hipaa', 'breach', 'compliance', 'hhs'],

  createdAt: new Date('2025-06-01'),
  updatedAt: new Date('2026-01-15'),
  publishedAt: new Date('2025-06-15'),
};
```

#### 5.1.4 Skill Invocation Example

```
User: /summarize-hipaa

AI: [Loads skill, applies org context, generates]
┌─────────────────────────────────────────────────────────────┐
│ HIPAA Breach Summary - Case #1234                           │
│                                                             │
│ **Breach Type:** Unauthorized Access                        │
│ **PHI Involved:** Yes - 3 patient records                   │
│ **Discovery Date:** January 15, 2026                        │
│ **Notification Deadline:** March 15, 2026 (60 days)         │
│                                                             │
│ **Summary:**                                                │
│ An employee accessed patient records outside their          │
│ authorized scope...                                         │
│                                                             │
│ [Edit] [Add to Case Summary] [Export as PDF]                │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Skill Marketplace

**Decision (AA.16):** Skills progress from personal use to community sharing, with marketplace features for discovery and quality signals.

#### 5.2.1 Skill Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ SKILL LIFECYCLE                                             │
│                                                             │
│  [Create] → [Test] → [Use] → [Share] → [Publish]            │
│     │         │        │        │          │                │
│     ▼         ▼        ▼        ▼          ▼                │
│  Personal   Draft    Active   Team/Org  Community           │
│   Skill    Version   Skill    Shared    Marketplace         │
└─────────────────────────────────────────────────────────────┘
```

#### 5.2.2 Extended Skill Schema (for marketplace)

```typescript
interface MarketplaceSkill extends Skill {
  // Community metadata
  authorProfile: {
    userId: string;
    displayName: string;
    reputation: number;
    badges: Badge[];
  };

  // Ratings & usage
  installCount: number;
  rating: number;              // 1-5 stars
  reviewCount: number;
  reviews: SkillReview[];

  // Compatibility
  minPlatformVersion: string;

  // Forking
  forkedFrom?: string;         // Original skill ID
  forkCount: number;

  // Verification
  isVerified: boolean;         // Ethico reviewed
  verifiedAt?: DateTime;
}

interface SkillReview {
  id: string;
  userId: string;
  displayName: string;
  rating: number;
  comment: string;
  createdAt: DateTime;
  helpfulCount: number;
}

interface Badge {
  id: string;
  name: string;                // 'First Skill Published'
  description: string;
  earnedAt: DateTime;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}
```

#### 5.2.3 Skill Builder UI

```
┌─────────────────────────────────────────────────────────────┐
│ Create New Skill                                            │
├─────────────────────────────────────────────────────────────┤
│ Name: ___HIPAA Breach Summary_______________                │
│                                                             │
│ Description:                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Generates a HIPAA-compliant breach summary with         │ │
│ │ all required fields for HHS notification.               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ When to use: [Case] [Investigation] ☑️                      │
│ Category: [Healthcare / HIPAA ▼]                            │
│                                                             │
│ Prompt Template:                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Generate a HIPAA breach summary for this case.          │ │
│ │ Include:                                                │ │
│ │ - Breach type and description                           │ │
│ │ - PHI types involved                                    │ │
│ │ - Number of individuals affected                        │ │
│ │ - Discovery date and notification deadline              │ │
│ │ - Root cause analysis                                   │ │
│ │ {{#if org.hipaa_additional_fields}}                     │ │
│ │ Also include: {{org.hipaa_additional_fields}}           │ │
│ │ {{/if}}                                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Actions this skill can take:                                │
│ ☑️ Read case data    ☑️ Generate text                       │
│ ☐ Update fields      ☐ Send notifications                  │
│                                                             │
│ [Test Skill]  [Save as Draft]  [Save & Activate]            │
└─────────────────────────────────────────────────────────────┘
```

#### 5.2.4 Skill Marketplace UI

```
┌─────────────────────────────────────────────────────────────┐
│ Skill Marketplace                          [My Skills]      │
├─────────────────────────────────────────────────────────────┤
│ 🔍 Search skills...                    [Filter ▼]           │
│                                                             │
│ Categories: [All] [Investigations] [HIPAA] [SOX]            │
│             [Reporting] [Interviews] [Closures]             │
├─────────────────────────────────────────────────────────────┤
│ ⭐ Featured                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📋 HIPAA Breach Summary Pro              ⭐ 4.8 (127)    │ │
│ │ Complete HHS-ready breach documentation                 │ │
│ │ By: ComplianceExpert42 | 1.2k installs                  │ │
│ │ [Preview]  [Install]                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔍 Investigation Interview Prep          ⭐ 4.6 (89)     │ │
│ │ Generates tailored interview questions by case type     │ │
│ │ By: InvestigatorPro | 890 installs                      │ │
│ │ [Preview]  [Install]                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### 5.2.5 User Skill Profile

```typescript
interface UserSkillProfile {
  userId: string;
  organizationId: string;

  // Usage stats
  skillsCreated: number;
  skillsPublished: number;
  totalSkillUses: number;

  // Recognition
  badges: Badge[];
  reputation: number;

  // Published skill stats
  totalInstalls: number;
  averageRating: number;

  // Progression
  level: 'Novice' | 'Practitioner' | 'Expert' | 'Master';
  experiencePoints: number;
  nextLevelXp: number;
}
```

#### 5.2.6 Skill Profile UI

```
┌─────────────────────────────────────────────────────────────┐
│ Your AI Skill Profile                                       │
├─────────────────────────────────────────────────────────────┤
│ Level: Expert                        XP: 2,450 / 5,000      │
│ ████████████████░░░░░░░░                                    │
│                                                             │
│ 🏆 Badges                                                   │
│ [🌟 First Skill] [📤 Publisher] [⭐ 5-Star Creator]         │
│ [🔥 Trending] [💯 100 Installs]                             │
│                                                             │
│ 📊 Your Stats                                               │
│ • Skills created: 12                                        │
│ • Skills published: 4                                       │
│ • Total installs: 347                                       │
│ • Average rating: 4.6 ⭐                                     │
│                                                             │
│ 🎯 Next Badge: "Community Champion" (500 installs)          │
│    Progress: 347/500 ████████████████░░░                    │
└─────────────────────────────────────────────────────────────┘
```

#### 5.2.7 Community Features

- **Skill Challenges:** "Create the best SOX audit skill this month"
- **Leaderboards:** Top skill creators, most helpful skills
- **Skill Forking:** "Based on HIPAA Summary Pro by @ComplianceExpert42"
- **Collaboration:** Co-author skills with team members
- **Certification Paths:** "Ethico Certified Skill Developer"

---

## 6. Content Generation

### 6.1 Summary & Narrative Ownership

**Decision (AA.11):** Every Case and Investigation has an owned narrative that persists and evolves. User controls it; AI assists.

#### 6.1.1 Ownership Model

```typescript
interface EntityNarrative {
  entityType: 'case' | 'investigation';
  entityId: string;
  organizationId: string;

  // The "owned" summary - persists on the entity
  summary: string;              // 2-3 paragraph executive summary
  summaryLastEditedBy: 'user' | 'ai';
  summaryLastEditedById: string;
  summaryLastEditedAt: DateTime;

  // Optional detailed write-up
  detailedWriteup?: string;     // Full chronological narrative
  writeupLastEditedBy: 'user' | 'ai';
  writeupLastEditedById?: string;
  writeupLastEditedAt?: DateTime;

  // AI can always regenerate from raw data
  // but user edits are preserved until explicitly replaced
}
```

#### 6.1.2 Three AI Assistance Modes

| Mode | User Action | AI Behavior |
|------|-------------|-------------|
| **Generate** | "Write me a summary" | AI creates full summary from entity data, user edits before accepting |
| **Suggest** | "What should I add?" | AI proposes additions based on recent activity, user cherry-picks |
| **Augment** | "Update with latest findings" | AI drafts additions, user reviews diff before merging |

#### 6.1.3 Edit-Before-Accept Pattern

```
┌─────────────────────────────────────────────────────────────┐
│ AI has drafted a summary update                             │
│                                                             │
│ Current Summary:                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ On Jan 15, employee reported witnessing...              │ │
│ │ Investigation assigned to Sarah Chen on Jan 16...       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Suggested Addition:                          [Edit ✏️]      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ On Jan 20, interview with department manager            │ │
│ │ revealed that similar incidents occurred in Q3...       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Discard]    [Replace Full Summary]    [Append to End]     │
└─────────────────────────────────────────────────────────────┘
```

#### 6.1.4 Conversation Accumulation

Each workflow step adds to a conversation record that AI can read:

```
Case #1234 Conversation Timeline:
─────────────────────────────────
[RIU Created] "Employee called hotline reporting HIPAA concern..."
     ↓
[Triage Note] "Categorized as Privacy violation, assigned to..."
     ↓
[Investigation Started] "Investigation opened, template: HIPAA Breach"
     ↓
[Interview Logged] "Spoke with department manager who confirmed..."
     ↓
[Finding Added] "Root cause: Inadequate access controls on..."
     ↓
[AI Summary Request] → AI reads full conversation → drafts summary
     ↓
[User Edits] "Added context about prior training completion"
     ↓
[Summary Saved] → Owned narrative updated
```

#### 6.1.5 AI Context Access

- AI always has access to full conversation timeline (raw data)
- AI can materialize this into narrative form on demand
- User's owned summary is separate from raw data - it's their curated view
- Regenerating summary doesn't delete user edits unless explicitly chosen

**Key Principle:** The owned narrative is the user's artifact. AI helps create and update it, but user always has final edit authority.

---

## 7. Operations

### 7.1 Model Selection

**Decision (AA.19):** Task-based automatic model routing with tier-based access to premium models.

#### 7.1.1 Model Tiers

| Model Tier | Use Cases | Speed | Cost | Example Models |
|------------|-----------|-------|------|----------------|
| Fast | Inline suggestions, autocomplete, simple Q&A | <1s | $ | Claude Haiku, GPT-4-mini |
| Standard | Chat, skill execution, summaries, most work | 2-5s | $$ | Claude Sonnet |
| Premium | Complex analysis, large documents, nuanced judgment | 5-15s | $$$ | Claude Opus |

#### 7.1.2 Automatic Routing Rules

```typescript
interface ModelRoutingRule {
  taskType: string;
  defaultModel: 'fast' | 'standard' | 'premium';
  upgradeConditions?: string[];  // When to use higher tier
}

const routingRules: ModelRoutingRule[] = [
  // Fast model (Haiku)
  { taskType: 'inline_suggestion', defaultModel: 'fast' },
  { taskType: 'autocomplete', defaultModel: 'fast' },
  { taskType: 'simple_lookup', defaultModel: 'fast' },

  // Standard model (Sonnet)
  { taskType: 'chat_response', defaultModel: 'standard' },
  { taskType: 'skill_execution', defaultModel: 'standard' },
  { taskType: 'entity_summary', defaultModel: 'standard' },
  { taskType: 'action_planning', defaultModel: 'standard' },

  // Premium model (Opus) - or upgrade to premium when:
  {
    taskType: 'complex_analysis',
    defaultModel: 'premium',
    upgradeConditions: [
      'document_length > 50000 tokens',
      'cross_entity_count > 20',
      'requires_nuanced_judgment',
      'legal_or_regulatory_context',
    ]
  },
  {
    taskType: 'document_generation',
    defaultModel: 'standard',
    upgradeConditions: ['formal_report', 'external_facing']
  },
];
```

#### 7.1.3 Tier Access by Plan

| Plan | Fast | Standard | Premium |
|------|------|----------|---------|
| Starter | Yes | Yes (limited) | No |
| Professional | Yes | Yes | Yes (quota) |
| Enterprise | Yes | Yes | Yes (unlimited) |

#### 7.1.4 User-Visible Model Indicator

```
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Investigation Assistant              [Context: 48%]      │
│ Model: Sonnet (Standard)                        [Change ▼]  │
├─────────────────────────────────────────────────────────────┤
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

#### 7.1.5 Manual Override

Users on Professional/Enterprise can request premium model:

```
User: "Use the best model to analyze this complex case"

AI: "Switching to Opus (Premium) for this analysis.
    Note: Premium model uses 3x credits.
    [Continue with Opus] [Stay with Sonnet]"
```

### 7.2 Rate Limiting & Cost Management

**Decision (AA.18):** Tiered Limits + Full Visibility hybrid.

#### 7.2.1 Tier Structure

| Tier | Monthly AI Budget | Skills Access | Marketplace | At-Limit Behavior |
|------|------------------|---------------|-------------|-------------------|
| Starter | 10k requests | Platform skills only | Browse only | Soft warning → Admin approval to continue |
| Professional | 100k requests | Full skills + create | Install skills | Soft warning → 20% overage buffer → Admin notification |
| Enterprise | Custom/Unlimited | Full + priority models | Full + publish | Visibility only, no limits |

#### 7.2.2 Usage Event Tracking

```typescript
interface AIUsageEvent {
  id: string;
  organizationId: string;
  userId: string;

  type: 'chat_turn' | 'skill_execution' | 'action' | 'generation' | 'inline_suggestion';

  // Token usage
  tokensIn: number;
  tokensOut: number;
  model: string;

  // Weighted cost (normalize across models)
  normalizedCost: number;  // 1.0 = standard, 2.0 = premium model

  // Context
  agentType: string;
  skillId?: string;
  entityType?: string;
  entityId?: string;

  timestamp: DateTime;
}
```

#### 7.2.3 Admin Visibility Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│ AI Usage - February 2026                        [Export]    │
├─────────────────────────────────────────────────────────────┤
│ Plan: Professional (100k requests/month)                    │
│                                                             │
│ Usage: ████████████████░░░░░░░░  67,450 / 100,000          │
│                                 67% used, 12 days left      │
│                                                             │
│ Projected: ~95,000 by month end (within budget ✓)           │
│                                                             │
│ By Feature:                      By Team:                   │
│ ├─ Chat interactions  45%       ├─ Investigations  52%     │
│ ├─ Skill executions   30%       ├─ Case Mgmt       28%     │
│ ├─ Document summary   15%       ├─ Policy          12%     │
│ └─ Actions            10%       └─ Other            8%     │
│                                                             │
│ Top Users:                       Top Skills:                │
│ 1. Sarah Chen    12,400         1. /case-summary  8,200    │
│ 2. John Doe       9,800         2. /interview-prep 5,100   │
│                                                             │
│ [Set Alerts]  [User Limits]  [Feature Controls]             │
└─────────────────────────────────────────────────────────────┘
```

#### 7.2.4 Alert Configuration

- Alert at 50% usage: Notify admins
- Alert at 80% usage: Notify admins + show banner to users
- Alert at 100% usage: Require admin approval (Starter/Professional)
- Weekly usage summary emails

#### 7.2.5 At-Limit Experience

**Starter (hard-ish limit):**
```
⚠️ AI limit reached. Options:
• Wait for reset (March 1)
• Request admin approval
• Upgrade to Professional
```

**Professional (soft limit with buffer):**
```
⚠️ Budget exceeded. 20% overage buffer available.
Current: 102,400 / 100,000 (+2.4% overage)
Admin notified. AI features remain available.
```

**Enterprise:** No interruption, visibility-only dashboard.

#### 7.2.6 Billing & Overage

```typescript
interface BillableUsage {
  organizationId: string;
  billingPeriod: string;         // '2026-02'

  // Included in tier
  tierIncludedRequests: number;
  tierUsedRequests: number;

  // Overage (billable)
  overageRequests: number;
  overageTokensIn: number;
  overageTokensOut: number;
  overageCost: number;

  // Outcome tracking (future billing)
  casesClosedWithAI: number;
  investigationsCompletedWithAI: number;
  reportsGeneratedWithAI: number;
}
```

### 7.3 Offline & Degraded Mode

**Decision (AA.20):** Graceful degradation with clear user communication.

#### 7.3.1 Degradation Levels

| Level | Condition | AI Behavior |
|-------|-----------|-------------|
| **Healthy** | All systems normal | Full functionality |
| **Slow** | API latency >5s | Show loading indicator, suggest simpler queries |
| **Degraded** | Intermittent failures, >50% error rate | Disable non-essential AI, queue retries |
| **Offline** | No AI API connectivity | Queue requests, show cached suggestions, manual fallbacks |

#### 7.3.2 User Communication

```
Healthy (no indicator)

Slow:
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Investigation Assistant              [Context: 48%]      │
│ ⚠️ AI is responding slowly. Simpler queries recommended.    │
└─────────────────────────────────────────────────────────────┘

Degraded:
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Investigation Assistant              [Context: 48%]      │
│ ⚠️ AI features limited. Some requests may fail.             │
│ [Check Status]                                              │
└─────────────────────────────────────────────────────────────┘

Offline:
┌─────────────────────────────────────────────────────────────┐
│ 🔍 Investigation Assistant                      [Offline]   │
│ AI is temporarily unavailable.                              │
│                                                             │
│ You can:                                                    │
│ • Continue working manually                                 │
│ • Queue AI requests for later                               │
│ • Use cached/template responses                             │
│                                                             │
│ [Queue for Later]  [Use Template]  [Dismiss]                │
└─────────────────────────────────────────────────────────────┘
```

#### 7.3.3 Offline Queue

```typescript
interface QueuedAIRequest {
  id: string;
  organizationId: string;
  userId: string;
  entityType: string;
  entityId: string;

  request: {
    type: 'skill' | 'chat' | 'action';
    content: string;
    skillId?: string;
  };

  queuedAt: DateTime;
  priority: 'high' | 'normal' | 'low';
  expiresAt: DateTime;  // Request no longer relevant after this

  status: 'queued' | 'processing' | 'completed' | 'expired' | 'failed';
  result?: string;
  notifyOnComplete: boolean;
}
```

#### 7.3.4 Fallback Behaviors

| Feature | Degraded Fallback | Offline Fallback |
|---------|-------------------|------------------|
| Inline suggestions | Disabled | Disabled |
| Chat | Slower, retry on failure | Queue or template responses |
| Skills | Retry with backoff | Queue |
| Actions | Execute without AI confirmation | Manual workflow only |
| Search | Non-AI search only | Non-AI search only |

### 7.4 Analytics & Telemetry

**Decision (AA.21):** Comprehensive analytics for AI quality improvement.

#### 7.4.1 Usage Metrics

```typescript
interface AIUsageMetrics {
  organizationId: string;
  period: string;  // '2026-02' or '2026-W05'

  // Volume
  totalRequests: number;
  requestsByType: Record<string, number>;  // chat, skill, action
  requestsByAgent: Record<string, number>; // Investigation, Case, etc.

  // Performance
  averageLatency: number;
  p95Latency: number;
  errorRate: number;

  // Cost
  totalTokensIn: number;
  totalTokensOut: number;
  estimatedCost: number;
  costByModel: Record<string, number>;
}
```

#### 7.4.2 Quality Metrics

```typescript
interface AIQualityMetrics {
  organizationId: string;
  period: string;

  // User feedback
  helpfulnessRating: number;      // 1-5 when user rates
  acceptanceRate: number;         // % of suggestions accepted
  editRate: number;               // % of AI outputs edited before use
  undoRate: number;               // % of AI actions undone

  // Implicit signals
  conversationLength: number;     // Longer = harder problem or poor responses?
  reformulationRate: number;      // User rephrasing = AI didn't understand
  abandonmentRate: number;        // Started AI interaction but left

  // Skill-specific
  skillSuccessRate: Record<string, number>;
  skillUsageFrequency: Record<string, number>;
}
```

#### 7.4.3 Feedback Collection

After AI interactions, occasionally prompt for feedback:

```
┌─────────────────────────────────────────────────────────────┐
│ Was this helpful?                                           │
│                                                             │
│ 👍 Yes    👎 No    [Skip]                                   │
│                                                             │
│ (Asked occasionally, not every time)                        │
└─────────────────────────────────────────────────────────────┘
```

For negative feedback:

```
┌─────────────────────────────────────────────────────────────┐
│ What went wrong?                                            │
│                                                             │
│ ○ Didn't understand my question                             │
│ ○ Response was inaccurate                                   │
│ ○ Too slow                                                  │
│ ○ Didn't do what I expected                                 │
│ ○ Other: _______________                                    │
│                                                             │
│ [Submit]  [Skip]                                            │
└─────────────────────────────────────────────────────────────┘
```

#### 7.4.4 Privacy & Data Handling

| Data Type | Stored | Retention | Access |
|-----------|--------|-----------|--------|
| Usage counts | Yes | Indefinite (aggregated) | Admins |
| Quality ratings | Yes | 1 year | Admins |
| Query content | No* | N/A | N/A |
| Error details | Yes (sanitized) | 90 days | Support |

*Query content NOT stored for analytics. Only used real-time for AI response.

---

## 8. Security & Permissions

### 8.1 Permission Inheritance

**Decision (AA.4):** AI actions respect user's existing permissions.

#### 8.1.1 Rules

- AI cannot do anything the user couldn't do manually
- AI cannot escalate privileges
- Admin-only actions require admin role
- Bulk actions may have additional limits (e.g., max 50 emails per request)

#### 8.1.2 Permission Check Flow

```typescript
async function validateAIAction(
  action: AIAction,
  user: User,
  context: ActionFilterContext
): Promise<ValidationResult> {
  // 1. Check user has required permissions
  const hasPermissions = action.requiredPermissions.every(
    p => user.permissions.includes(p)
  );
  if (!hasPermissions) {
    return {
      valid: false,
      reason: 'insufficient_permissions',
      missing: action.requiredPermissions.filter(p => !user.permissions.includes(p))
    };
  }

  // 2. Check organization has required features
  const hasFeatures = action.requiredFeatures.every(
    f => context.organization.enabledFeatures.includes(f)
  );
  if (!hasFeatures) {
    return {
      valid: false,
      reason: 'feature_not_enabled',
      missing: action.requiredFeatures.filter(f => !context.organization.enabledFeatures.includes(f))
    };
  }

  // 3. Check entity-level access (RLS will also enforce)
  if (context.currentView.entity) {
    const hasEntityAccess = await checkEntityAccess(
      user,
      context.currentView.entityType,
      context.currentView.entityId
    );
    if (!hasEntityAccess) {
      return { valid: false, reason: 'entity_access_denied' };
    }
  }

  // 4. Check bulk limits
  if (action.id.startsWith('bulk_')) {
    const itemCount = context.bulkItems?.length || 0;
    const maxBulk = user.role === 'admin' ? 100 : 50;
    if (itemCount > maxBulk) {
      return {
        valid: false,
        reason: 'bulk_limit_exceeded',
        limit: maxBulk,
        requested: itemCount
      };
    }
  }

  return { valid: true };
}
```

### 8.2 Audit Trail

**Decision (AA.5):** All AI-initiated actions are logged with full attribution.

#### 8.2.1 AI Audit Record Schema

```typescript
interface AIAuditRecord {
  id: string;
  organizationId: string;

  // Action details
  action: string;                    // 'case.assign', 'email_sent'
  actionDescription: string;         // Natural language description

  // Attribution
  actorType: 'ai';
  actorUserId: string;               // User who authorized
  aiConversationId: string;          // Link to conversation
  aiPrompt: string;                  // What user asked for

  // What was affected
  entityType: string;
  entityId: string;
  affectedEntities?: string[];       // For bulk operations

  // Changes made
  previousState?: Record<string, any>;
  newState?: Record<string, any>;

  // Timing
  timestamp: DateTime;

  // Undo tracking
  undoRecordId?: string;
  wasUndone?: boolean;
  undoneAt?: DateTime;
}
```

#### 8.2.2 Activity Log Display

```
Case #1234 Activity:
─────────────────────
[Feb 2, 2:30 PM] Status changed: Open → Closed
                 By: AI (authorized by John Smith)
                 Reason: "close with standard outcome"
                 [View conversation]

[Feb 2, 2:31 PM] Status changed: Closed → Open
                 By: AI (authorized by John Smith)
                 Reason: Undo requested
```

---

## 9. Data Model

### 9.1 Prisma Schema

```prisma
// =============================================================================
// AI AGENT DATA MODEL
// =============================================================================

// -----------------------------------------------------------------------------
// AI Conversations
// -----------------------------------------------------------------------------

model AIConversation {
  id              String   @id @default(uuid())
  organizationId  String
  userId          String

  // Context
  agentType       String   // 'investigation', 'case', 'compliance-manager', etc.
  entityType      String?  // If scoped to entity
  entityId        String?

  // Status
  status          String   @default("active") // 'active', 'paused', 'completed'

  // Timestamps
  startedAt       DateTime @default(now())
  lastActivityAt  DateTime @default(now())
  endedAt         DateTime?

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id])
  user            User         @relation(fields: [userId], references: [id])
  messages        AIMessage[]
  actions         AIActionExecution[]
  sessionNotes    AISessionNote[]

  @@index([organizationId])
  @@index([userId])
  @@index([entityType, entityId])
}

model AIMessage {
  id              String   @id @default(uuid())
  conversationId  String

  role            String   // 'user', 'assistant', 'system'
  content         String   @db.Text

  // Token tracking
  tokensIn        Int?
  tokensOut       Int?
  model           String?

  // Timing
  createdAt       DateTime @default(now())
  latencyMs       Int?

  // Relations
  conversation    AIConversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
}

// -----------------------------------------------------------------------------
// AI Actions
// -----------------------------------------------------------------------------

model AIActionExecution {
  id              String   @id @default(uuid())
  organizationId  String
  conversationId  String
  userId          String

  // Action details
  actionId        String   // From action catalog
  parameters      Json     // Parameters passed

  // Execution
  status          String   // 'pending', 'confirmed', 'executed', 'failed', 'undone'
  executedAt      DateTime?

  // Results
  result          Json?
  errorMessage    String?

  // Affected entities
  entityType      String
  entityId        String
  affectedEntities Json?   // Array of entity references

  // Undo capability
  undoRecord      AIUndoRecord?

  // Timestamps
  createdAt       DateTime @default(now())

  // Relations
  organization    Organization   @relation(fields: [organizationId], references: [id])
  conversation    AIConversation @relation(fields: [conversationId], references: [id])
  user            User           @relation(fields: [userId], references: [id])

  @@index([organizationId])
  @@index([conversationId])
  @@index([entityType, entityId])
}

model AIUndoRecord {
  id              String   @id @default(uuid())
  organizationId  String
  actionExecutionId String @unique

  // What changed
  previousState   Json
  newState        Json

  // Timing
  executedAt      DateTime
  undoExpiresAt   DateTime

  // Status
  status          String   @default("available") // 'available', 'executed', 'expired'
  undoneAt        DateTime?
  undoneById      String?

  // Relations
  organization    Organization      @relation(fields: [organizationId], references: [id])
  actionExecution AIActionExecution @relation(fields: [actionExecutionId], references: [id])
  undoneBy        User?             @relation(fields: [undoneById], references: [id])

  @@index([organizationId])
  @@index([status, undoExpiresAt])
}

// -----------------------------------------------------------------------------
// Session Notes (Pause/Resume)
// -----------------------------------------------------------------------------

model AISessionNote {
  id              String   @id @default(uuid())
  organizationId  String
  conversationId  String
  userId          String

  // Entity context
  entityType      String
  entityId        String

  // Content
  decisions       Json     // Array of strings
  pendingActions  Json     // Array of strings
  draftContent    String?  @db.Text
  contextSummary  String   @db.Text

  // Status
  status          String   @default("active") // 'active', 'resolved', 'archived'
  resolvedAt      DateTime?
  resolvedReason  String?

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  organization    Organization   @relation(fields: [organizationId], references: [id])
  conversation    AIConversation @relation(fields: [conversationId], references: [id])
  user            User           @relation(fields: [userId], references: [id])

  @@index([organizationId])
  @@index([entityType, entityId, status])
}

// -----------------------------------------------------------------------------
// Skills
// -----------------------------------------------------------------------------

model AISkill {
  id              String   @id @default(uuid())
  organizationId  String?  // Null for platform skills

  // Identity
  name            String
  slug            String   // URL-safe identifier
  description     String   @db.Text

  // Scope
  scope           String   // 'platform', 'organization', 'team', 'user'
  scopeId         String?  // teamId or userId
  visibility      String   @default("private") // 'private', 'shared', 'published'

  // Definition
  promptTemplate  String   @db.Text
  requiredContext Json     // Array of entity types
  requiredPermissions Json // Array of permission strings
  requiredFeatures Json    // Array of feature flags
  parameters      Json     // Array of SkillParameter
  allowedActions  Json     // Array of action IDs

  // Model
  modelHint       String?  // 'fast', 'standard', 'premium', 'auto'

  // Versioning
  version         String   @default("1.0.0")
  changelog       String?  @db.Text

  // Categorization
  category        String
  tags            Json     // Array of strings

  // Marketplace
  installCount    Int      @default(0)
  rating          Float?
  reviewCount     Int      @default(0)
  isVerified      Boolean  @default(false)

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  publishedAt     DateTime?

  // Relations
  organization    Organization? @relation(fields: [organizationId], references: [id])
  createdBy       User          @relation("SkillCreator", fields: [createdById], references: [id])
  createdById     String
  reviews         AISkillReview[]
  installations   AISkillInstallation[]

  @@unique([organizationId, slug])
  @@index([scope, visibility])
  @@index([category])
}

model AISkillReview {
  id              String   @id @default(uuid())
  skillId         String
  userId          String

  rating          Int      // 1-5
  comment         String?  @db.Text
  helpfulCount    Int      @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  skill           AISkill  @relation(fields: [skillId], references: [id], onDelete: Cascade)
  user            User     @relation(fields: [userId], references: [id])

  @@unique([skillId, userId])
}

model AISkillInstallation {
  id              String   @id @default(uuid())
  skillId         String
  organizationId  String

  installedAt     DateTime @default(now())
  installedById   String

  // Usage tracking
  usageCount      Int      @default(0)
  lastUsedAt      DateTime?

  // Relations
  skill           AISkill      @relation(fields: [skillId], references: [id], onDelete: Cascade)
  organization    Organization @relation(fields: [organizationId], references: [id])
  installedBy     User         @relation(fields: [installedById], references: [id])

  @@unique([skillId, organizationId])
}

// -----------------------------------------------------------------------------
// Context Documents
// -----------------------------------------------------------------------------

model AIContextDocument {
  id              String   @id @default(uuid())
  organizationId  String

  // Scope
  scope           String   // 'organization', 'team', 'user'
  scopeId         String?  // teamId or userId

  // Content
  content         String   @db.Text

  // Versioning
  version         Int      @default(1)
  isActive        Boolean  @default(true)

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  updatedById     String

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id])
  updatedBy       User         @relation(fields: [updatedById], references: [id])

  @@unique([organizationId, scope, scopeId])
}

// -----------------------------------------------------------------------------
// Usage Tracking
// -----------------------------------------------------------------------------

model AIUsageEvent {
  id              String   @id @default(uuid())
  organizationId  String
  userId          String

  // Event type
  type            String   // 'chat_turn', 'skill_execution', 'action', 'inline_suggestion'

  // Token usage
  tokensIn        Int
  tokensOut       Int
  model           String
  normalizedCost  Float

  // Context
  agentType       String?
  skillId         String?
  conversationId  String?
  entityType      String?
  entityId        String?

  // Timing
  timestamp       DateTime @default(now())
  latencyMs       Int?

  // Status
  success         Boolean  @default(true)
  errorType       String?

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id])
  user            User         @relation(fields: [userId], references: [id])

  @@index([organizationId, timestamp])
  @@index([userId, timestamp])
}

model AIUsageSummary {
  id              String   @id @default(uuid())
  organizationId  String

  // Period
  periodType      String   // 'daily', 'weekly', 'monthly'
  periodStart     DateTime
  periodEnd       DateTime

  // Aggregated metrics
  totalRequests   Int
  totalTokensIn   Int
  totalTokensOut  Int
  totalCost       Float

  // Breakdowns
  requestsByType  Json     // Record<string, number>
  requestsByAgent Json     // Record<string, number>
  requestsByUser  Json     // Record<string, number>
  costByModel     Json     // Record<string, number>

  // Quality metrics
  averageLatency  Float?
  errorRate       Float?
  helpfulnessRating Float?

  // Timestamps
  createdAt       DateTime @default(now())

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id])

  @@unique([organizationId, periodType, periodStart])
}

// -----------------------------------------------------------------------------
// Offline Queue
// -----------------------------------------------------------------------------

model AIQueuedRequest {
  id              String   @id @default(uuid())
  organizationId  String
  userId          String

  // Context
  entityType      String?
  entityId        String?

  // Request
  requestType     String   // 'skill', 'chat', 'action'
  content         String   @db.Text
  skillId         String?

  // Priority & expiry
  priority        String   @default("normal") // 'high', 'normal', 'low'
  expiresAt       DateTime

  // Status
  status          String   @default("queued") // 'queued', 'processing', 'completed', 'expired', 'failed'
  result          String?  @db.Text
  errorMessage    String?

  // Notification
  notifyOnComplete Boolean @default(true)
  notifiedAt      DateTime?

  // Timestamps
  queuedAt        DateTime @default(now())
  processedAt     DateTime?

  // Relations
  organization    Organization @relation(fields: [organizationId], references: [id])
  user            User         @relation(fields: [userId], references: [id])

  @@index([organizationId, status])
  @@index([status, expiresAt])
}

// -----------------------------------------------------------------------------
// User Skill Profile
// -----------------------------------------------------------------------------

model AIUserProfile {
  id              String   @id @default(uuid())
  userId          String   @unique
  organizationId  String

  // Stats
  skillsCreated   Int      @default(0)
  skillsPublished Int      @default(0)
  totalSkillUses  Int      @default(0)
  totalInstalls   Int      @default(0)

  // Reputation
  reputation      Int      @default(0)
  averageRating   Float?

  // Progression
  level           String   @default("Novice") // 'Novice', 'Practitioner', 'Expert', 'Master'
  experiencePoints Int     @default(0)

  // Badges
  badges          Json     @default("[]") // Array of Badge objects

  // Timestamps
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  // Relations
  user            User         @relation(fields: [userId], references: [id])
  organization    Organization @relation(fields: [organizationId], references: [id])
}
```

---

## 10. API Endpoints

### 10.1 Conversation Endpoints

```typescript
// POST /api/v1/ai/conversations
// Start a new AI conversation
interface CreateConversationRequest {
  agentType: string;
  entityType?: string;
  entityId?: string;
}

interface CreateConversationResponse {
  id: string;
  agentType: string;
  entityType?: string;
  entityId?: string;
  welcomeMessage: string;
  availableSkills: SkillSummary[];
  contextUsage: ContextUsage;
}

// POST /api/v1/ai/conversations/:id/messages
// Send a message in a conversation
interface SendMessageRequest {
  content: string;
  skillId?: string;  // If invoking a skill
}

interface SendMessageResponse {
  messageId: string;
  response: {
    content: string;
    actions?: ProposedAction[];
    entityReferences?: EntityReference[];
  };
  contextUsage: ContextUsage;
  modelUsed: string;
}

// POST /api/v1/ai/conversations/:id/compact
// Compact conversation history
interface CompactConversationResponse {
  summary: string;
  previousContextUsage: number;
  newContextUsage: number;
}

// POST /api/v1/ai/conversations/:id/pause
// Pause conversation and save session note
interface PauseConversationRequest {
  saveSessionNote: boolean;
  decisions?: string[];
  pendingActions?: string[];
  draftContent?: string;
}

// GET /api/v1/ai/conversations/:id/resume
// Resume a paused conversation
interface ResumeConversationResponse {
  sessionNotes: SessionNote[];
  changesSinceLastSession: EntityChange[];
  welcomeBackMessage: string;
}
```

### 10.2 Action Endpoints

```typescript
// GET /api/v1/ai/actions
// Get available actions for current context
interface GetActionsRequest {
  entityType?: string;
  entityId?: string;
  viewType: 'dashboard' | 'list' | 'entity' | 'workflow';
}

interface GetActionsResponse {
  actions: AIAction[];
}

// POST /api/v1/ai/actions/preview
// Preview an action before execution
interface PreviewActionRequest {
  actionId: string;
  parameters: Record<string, any>;
  entityType: string;
  entityId: string;
}

interface PreviewActionResponse {
  action: AIAction;
  preview: {
    description: string;
    affectedEntities: EntityReference[];
    changes: ProposedChange[];
    warnings: string[];
    isReversible: boolean;
    undoWindowMinutes?: number;
  };
}

// POST /api/v1/ai/actions/execute
// Execute a confirmed action
interface ExecuteActionRequest {
  actionId: string;
  parameters: Record<string, any>;
  entityType: string;
  entityId: string;
  conversationId: string;
}

interface ExecuteActionResponse {
  executionId: string;
  status: 'success' | 'partial' | 'failed';
  results: ActionResult[];
  undoAvailable: boolean;
  undoExpiresAt?: string;
}

// POST /api/v1/ai/actions/:executionId/undo
// Undo an executed action
interface UndoActionResponse {
  status: 'success' | 'failed' | 'expired';
  restoredState?: Record<string, any>;
  message: string;
}
```

### 10.3 Skill Endpoints

```typescript
// GET /api/v1/ai/skills
// List available skills
interface ListSkillsRequest {
  scope?: 'platform' | 'organization' | 'team' | 'user' | 'all';
  category?: string;
  search?: string;
}

interface ListSkillsResponse {
  skills: SkillSummary[];
  total: number;
}

// GET /api/v1/ai/skills/:id
// Get skill details
interface GetSkillResponse {
  skill: Skill;
  isInstalled: boolean;
  usage: {
    totalUses: number;
    lastUsedAt?: string;
  };
}

// POST /api/v1/ai/skills
// Create a new skill
interface CreateSkillRequest {
  name: string;
  description: string;
  scope: 'organization' | 'team' | 'user';
  scopeId?: string;
  promptTemplate: string;
  requiredContext: string[];
  parameters?: SkillParameter[];
  allowedActions: string[];
  category: string;
  tags: string[];
}

// POST /api/v1/ai/skills/:id/invoke
// Invoke a skill
interface InvokeSkillRequest {
  conversationId: string;
  entityType: string;
  entityId: string;
  parameters?: Record<string, any>;
}

interface InvokeSkillResponse {
  result: string;
  actions?: ProposedAction[];
  contextUsage: ContextUsage;
}

// GET /api/v1/ai/skills/marketplace
// Browse marketplace
interface MarketplaceRequest {
  category?: string;
  search?: string;
  sortBy?: 'popular' | 'rating' | 'recent';
  page?: number;
  limit?: number;
}

interface MarketplaceResponse {
  skills: MarketplaceSkill[];
  total: number;
  categories: CategoryCount[];
}

// POST /api/v1/ai/skills/:id/install
// Install a marketplace skill
interface InstallSkillResponse {
  installation: SkillInstallation;
}
```

### 10.4 Context Endpoints

```typescript
// GET /api/v1/ai/context
// Get current context for AI
interface GetContextRequest {
  agentType: string;
  entityType?: string;
  entityId?: string;
}

interface GetContextResponse {
  platformContext: string;
  organizationContext?: string;
  teamContext?: string;
  userContext?: string;
  entityContext?: string;
  totalTokens: number;
  breakdown: ContextBreakdown;
}

// PUT /api/v1/ai/context/:scope
// Update a context document
interface UpdateContextRequest {
  content: string;
}

interface UpdateContextResponse {
  document: ContextDocument;
}
```

### 10.5 Analytics Endpoints

```typescript
// GET /api/v1/ai/usage
// Get usage statistics (admin only)
interface GetUsageRequest {
  periodType: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
}

interface GetUsageResponse {
  summary: AIUsageSummary;
  trend: UsageTrendPoint[];
  topUsers: UserUsage[];
  topSkills: SkillUsage[];
}

// GET /api/v1/ai/quality
// Get quality metrics (admin only)
interface GetQualityResponse {
  overall: {
    helpfulnessRating: number;
    acceptanceRate: number;
    undoRate: number;
  };
  byAgent: Record<string, QualityMetrics>;
  bySkill: Record<string, QualityMetrics>;
  issues: QualityIssue[];
}

// POST /api/v1/ai/feedback
// Submit feedback on AI response
interface SubmitFeedbackRequest {
  conversationId: string;
  messageId: string;
  rating: 'helpful' | 'not_helpful';
  reason?: string;
  details?: string;
}
```

### 10.6 Health Endpoints

```typescript
// GET /api/v1/ai/health
// Get AI service health status
interface HealthResponse {
  status: 'healthy' | 'slow' | 'degraded' | 'offline';
  latency: {
    current: number;
    p95: number;
  };
  errorRate: number;
  queuedRequests: number;
  lastChecked: string;
}

// POST /api/v1/ai/queue
// Queue a request for later processing
interface QueueRequestRequest {
  type: 'skill' | 'chat' | 'action';
  content: string;
  skillId?: string;
  entityType?: string;
  entityId?: string;
  priority?: 'high' | 'normal' | 'low';
  expiresInMinutes?: number;
  notifyOnComplete?: boolean;
}

interface QueueRequestResponse {
  queuedRequest: QueuedRequest;
  estimatedProcessingTime?: string;
}
```

---

## Appendix A: Decision Log

### A.1 Summary Table

| ID | Area | Decision | Status |
|----|------|----------|--------|
| AA.1 | Core Capability | AI can execute real actions, not just answer questions | Confirmed |
| AA.2 | Context Awareness | Context adapts to user's current view (program/entity/workflow) | Confirmed |
| AA.3 | Confirmation UX | Tiered confirmation UX based on action risk | Confirmed |
| AA.4 | Permissions | AI respects user's existing permissions | Confirmed |
| AA.5 | Audit Trail | Full audit trail with AI attribution | Confirmed |
| AA.6 | Guardrails | Guardrails prevent auto-execution of risky actions | Confirmed |
| AA.7 | Specification | TECH-SPEC-AI-AGENT.md needed for full specification | Completed |
| AA.8 | Interaction Model | Tiered interaction model (Inline -> Contextual -> Drawer) | Confirmed |
| AA.9 | Action Discovery | Hybrid action catalog with dynamic filtering | Confirmed |
| AA.10 | Multi-Step Actions | Preview-then-Execute pattern for multi-step actions | Confirmed |
| AA.11 | Narratives | User-owned narratives with AI assistance modes | Confirmed |
| AA.12 | Context & Skills | Claude Code-style context hierarchy and skills system | Confirmed |
| AA.13 | Persistence | Selective persistence with pause/resume pattern | Confirmed |
| AA.14 | Error Handling | Partial success with retry + time-limited undo trail | Confirmed |
| AA.15 | Context Window | Visible context usage with compact/clear/fresh actions | Confirmed |
| AA.16 | Skill Marketplace | Skill lifecycle from personal to community marketplace | Confirmed |
| AA.17 | Scoped Agents | Scoped agents per view (Investigation, Case, Compliance Manager, etc.) | Confirmed |
| AA.18 | Cost Management | Tiered limits + full visibility hybrid for cost management | Confirmed |
| AA.19 | Model Selection | Task-based model routing with tier upgrades | Confirmed |
| AA.20 | Offline Mode | Graceful degradation with offline queue and fallbacks | Confirmed |
| AA.21 | Analytics | Comprehensive AI analytics for quality, usage, and improvement | Confirmed |

### A.2 Key Principles Summary

1. **Non-intrusive by default** - AI doesn't consume screen space until invoked
2. **Tiered confirmation** - Risk-based confirmation prevents accidents
3. **Permission inheritance** - AI cannot escalate user privileges
4. **Full attribution** - All AI actions logged with user authorization
5. **Recoverable actions** - Time-limited undo for reversible operations
6. **Context transparency** - Users see and control context consumption
7. **Scoped expertise** - Different agents for different workflows
8. **Progressive sharing** - Skills evolve from personal to community
9. **Graceful degradation** - Platform works when AI is unavailable
10. **Continuous improvement** - Analytics drive skill and prompt updates

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | February 2026 | Claude Code | Initial specification from WORKING-DECISIONS.md AA.1-AA.21 |
