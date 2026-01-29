# Platform UI/UX Design System

**Document ID:** UI-001
**Version:** 1.0
**Last Updated:** January 2026
**Status:** Approved

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [User Categories & Roles](#2-user-categories--roles)
3. [Platform Navigation](#3-platform-navigation)
4. [Detail View Pattern](#4-detail-view-pattern)
5. [List View Modes](#5-list-view-modes)
6. [Saved Views & Workspaces](#6-saved-views--workspaces)
7. [Widget Dashboards](#7-widget-dashboards)
8. [AI Integration Patterns](#8-ai-integration-patterns)
9. [Email Integration](#9-email-integration)
10. [Command Palette](#10-command-palette)
11. [Implementation Portal](#11-implementation-portal)
12. [Demo Environment](#12-demo-environment)
13. [Mobile & Responsive](#13-mobile--responsive)
14. [Dark Mode](#14-dark-mode)
15. [Design System Foundation](#15-design-system-foundation)
16. [Accessibility](#16-accessibility)

---

## 1. Design Philosophy

### Core Principles

| Principle | Description |
|-----------|-------------|
| **Modern Minimal** | Clean interfaces with purposeful white space, subtle shadows, and refined typography |
| **Clarity Over Cleverness** | Prioritize clear communication over novel interactions |
| **Progressive Disclosure** | Show essential information first, details on demand |
| **Consistent Patterns** | Reusable components and predictable interactions |
| **Accessible by Default** | WCAG 2.1 AA compliance built into every component |
| **Self-Service First** | Non-technical users can configure in under 5 minutes |

### Design Inspirations

| Product | What We Borrow |
|---------|----------------|
| **HubSpot** | 3-column detail view, saved views as tabs, activity timeline |
| **Linear** | Command palette, keyboard-first, modern aesthetic |
| **Notion** | Clean editor, slash commands, minimal chrome |
| **Figma** | Collaborative indicators, presence awareness |

### User Experience Goals

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER EXPERIENCE PILLARS                       │
├─────────────────┬─────────────────┬─────────────────────────────┤
│    EFFICIENT    │   TRUSTWORTHY   │        DELIGHTFUL           │
├─────────────────┼─────────────────┼─────────────────────────────┤
│ • Fast load     │ • Consistent    │ • Smooth animations         │
│ • Keyboard nav  │ • Predictable   │ • Helpful empty states      │
│ • Batch actions │ • Secure feel   │ • Micro-interactions        │
│ • Smart search  │ • Audit trails  │ • Contextual guidance       │
│ • ⌘K palette    │ • Clear logging │ • AI assistance             │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

---

## 2. User Categories & Roles

### Three User Categories

| Category | Users | Access Pattern |
|----------|-------|----------------|
| **Ethico Internal** | Operators, QA, Implementation, Support, AE, SE | Cross-tenant access to assigned clients |
| **Client Platform** | CCO, Investigators, Compliance, HR, Legal | Single-tenant, their organization only |
| **Employee Portal** | All employees at client orgs | Limited self-service (report, attest, policy Q&A) |

### Ethico Internal Roles

| Role | Primary Function | Cross-Tenant |
|------|------------------|--------------|
| **Operator** | Hotline intake, follows directives, submits to QA | Yes - assigned clients |
| **QA Reviewer** | Reviews/edits operator submissions before release | Yes - assigned clients |
| **Implementation Specialist** | Onboards new clients, configures, migrates data | Yes - assigned clients |
| **Support** | Troubleshoots issues, read access for debugging | Yes - assigned clients |
| **Ethico Admin** | Internal system administration | Yes - all clients |
| **Account Executive** | Client relationships, demos | Yes - demo + assigned |
| **Solutions Engineer** | Technical demos, pre-sales support | Yes - demo + assigned |

### Client Platform Roles

| Role | See Cases | Assign | Investigate | Close | Configure |
|------|-----------|--------|-------------|-------|-----------|
| **System Admin** | All | Yes | Yes | Yes | Yes |
| **CCO/Compliance** | All | Yes | Optional | Yes | Yes |
| **Triage Lead** | Scoped | Yes | Yes | Configurable | Limited |
| **Investigator** | Assigned only | Configurable | Yes | Configurable | No |
| **HR Manager** | Scoped | No | No | No | No |
| **Employee** | Own cases only | No | No | No | No |

### Employee Portal Roles

| Role | Capabilities |
|------|--------------|
| **Employee** | Submit reports, check status, attest to policies, ask policy questions via chatbot |
| **Manager** | Above + submit proxy reports on behalf of team members |

---

## 3. Platform Navigation

### Overall Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ┌──────┐                        ┌─────────────────┐  ┌───┐ ┌───┐ ┌─────────┐│
│ │ Logo │  ⌘K Search...          │ Client: Acme Co │  │🔔│ │❓│ │ JD ▼   ││
│ └──────┘                        └─────────────────┘  └───┘ └───┘ └─────────┘│
├────────────┬────────────────────────────────────────────────────────────────┤
│            │                                                                │
│  ◀ ▶       │   MAIN CONTENT AREA                                           │
│            │                                                                │
│ ┌────────┐ │   (List views, Detail views, Dashboards, Settings)            │
│ │Dashboard│ │                                                               │
│ └────────┘ │                                                                │
│ ┌────────┐ │                                                                │
│ │ Cases  │ │                                                                │
│ └────────┘ │                                                                │
│ ┌────────┐ │                                                                │
│ │Investig│ │                                                                │
│ └────────┘ │                                                                │
│ ┌────────┐ │                                                                │
│ │Disclosu│ │                                                                │
│ └────────┘ │                                                                │
│ ┌────────┐ │                                                                │
│ │Policies│ │                                                                │
│ └────────┘ │                                                                │
│ ┌────────┐ │                                                                │
│ │Analytics│ │                                                               │
│ └────────┘ │                                                                │
│            │                                                                │
│ ─────────  │                                                                │
│ ┌────────┐ │                                                                │
│ │Settings│ │                                                                │
│ └────────┘ │                                                                │
└────────────┴────────────────────────────────────────────────────────────────┘
```

### Navigation Components

| Component | Behavior |
|-----------|----------|
| **Logo** | Click returns to Dashboard |
| **Sidebar** | Collapsible (◀ ▶) - expands to labels, collapses to icons |
| **Command Palette** | ⌘K opens global search and actions |
| **Client Selector** | Ethico internal users only - switch between assigned clients |
| **Notifications** | Bell icon with unread count, dropdown panel |
| **Help** | Links to documentation, support, keyboard shortcuts |
| **User Menu** | Profile, preferences, sign out |

### Navigation for Ethico Internal Users

Implementation Specialists, Support, and other Ethico roles see additional nav section:

```
│ ─────────  │
│ IMPLEMENT  │
│ ┌────────┐ │
│ │Onboard │ │  ← Onboarding checklists
│ └────────┘ │
│ ┌────────┐ │
│ │Migrate │ │  ← Data import tools
│ └────────┘ │
│ ┌────────┐ │
│ │Configure│ │  ← Bulk setup wizards
│ └────────┘ │
│ ┌────────┐ │
│ │Health  │ │  ← Client health dashboard
│ └────────┘ │
```

---

## 4. Detail View Pattern

### Three-Column Layout (HubSpot-Style)

When viewing Cases, Investigations, Disclosures, or Policies:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ ← Cases    Actions ▼            [Overview] [Activities] [✧ Customize]    + Add  ⚙  │
├────────────────────┬─────────────────────────────────────────┬──────────────────────┤
│                    │                                         │                      │
│ LEFT COLUMN        │ CENTER COLUMN                           │ RIGHT COLUMN         │
│ ~280px             │ Flexible                                │ ~300px               │
│                    │                                         │                      │
│ • Entity header    │ • Activity timeline                     │ • Related entities   │
│ • Quick actions    │ • Filtered by type                      │ • Subjects/Contacts  │
│ • Properties       │ • Add notes, emails,                    │ • Linked items       │
│ • Collapsible      │   tasks, documents                      │ • AI Assistant       │
│   sections         │ • Search activities                     │                      │
│                    │                                         │                      │
└────────────────────┴─────────────────────────────────────────┴──────────────────────┘
```

### Left Column: Entity Properties

```
┌────────────────────┐
│ 🏢 CASE-2024-00142 │
│ Harassment Allegat │
│                    │
│ Status: ● Open     │
│ Severity: ▲ High   │
│ Category: Harassm  │
│ Created: Jan 15    │
│ ─────────────────  │
│ [📝][✉️][📞][📋][…] │  ← Quick Actions
│ Note Email Call    │
│      Task  More    │
│                    │
│ ▼ Case Details     │  ← Collapsible
│   Actions ⚙        │
│                    │
│   Source           │
│   Hotline          │
│                    │
│   Assigned To      │
│   Sarah Chen       │
│                    │
│   Location         │
│   Chicago, IL      │
│                    │
│ ▼ About this Case  │  ← Collapsible
│   ...              │
└────────────────────┘
```

### Center Column: Activity Timeline

```
┌─────────────────────────────────────────┐
│ 🔍 Search activities    [Collapse all] │
│                                         │
│ [Activity] [Notes] [Emails] [Tasks]    │  ← Filter tabs
│ [Documents] [Interviews]               │
│                                         │
│ Filter by: All ▼  All users ▼         │
│                                         │
│ ┌─────────────────────────────────┐   │
│ │ Upcoming                        │   │
│ │ > Task: Interview witness       │   │
│ │   Due: Feb 2, 2026              │   │
│ └─────────────────────────────────┘   │
│                                         │
│ January 2026                           │
│ ┌─────────────────────────────────┐   │
│ │ 📧 Email sent          Jan 28   │   │
│ │ Sarah Chen emailed witness...   │   │
│ └─────────────────────────────────┘   │
│ ┌─────────────────────────────────┐   │
│ │ 📝 Note added          Jan 27   │   │
│ │ Initial triage complete...      │   │
│ └─────────────────────────────────┘   │
│ ┌─────────────────────────────────┐   │
│ │ 📥 Case created        Jan 15   │   │
│ │ This case was created by...     │   │
│ └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Right Column: Related Entities

```
┌──────────────────────┐
│ Subjects (2)   + Add │
│ ┌────────────────┐   │
│ │ John Smith     │   │
│ │ Accused        │   │
│ │ VP, Sales      │   │
│ └────────────────┘   │
│ ┌────────────────┐   │
│ │ Jane Doe       │   │
│ │ Reporter       │   │
│ │ [Anonymous]    │   │
│ └────────────────┘   │
│ View all Subjects ↗  │
│ ──────────────────   │
│ Investigations (1)   │
│ ┌────────────────┐   │
│ │ INV-001        │   │
│ │ ● In Progress  │   │
│ │ Sarah Chen     │   │
│ └────────────────┘   │
│ ──────────────────   │
│ 🤖 AI Assistant      │
│    [Open ▶]          │
│ ──────────────────   │
│ Remediation (0)      │
│ + Add Plan           │
└──────────────────────┘
```

### Quick Actions

| Action | Icon | Behavior |
|--------|------|----------|
| **Note** | 📝 | Opens inline note composer in activity stream |
| **Email** | ✉️ | Opens inline email composer with templates/AI |
| **Call** | 📞 | Logs a call record with notes |
| **Task** | 📋 | Creates task linked to entity |
| **More** | … | Document upload, link investigation, change status, etc. |

---

## 5. List View Modes

Users can toggle between three views for any entity list:

### View Mode Toggle

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Cases                                              [≡ Grid] [▦ Card] [▥ Board] │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Grid View (Default - Power Users)

Best for: Bulk operations, filtering, sorting, exports

```
┌──────┬───────────────────────┬──────────┬──────────┬────────────┬───────────────┐
│ □    │ Case                  │ Status   │ Severity │ Assigned   │ Created       │
├──────┼───────────────────────┼──────────┼──────────┼────────────┼───────────────┤
│ □    │ CASE-2024-00142       │ ● Open   │ ▲ High   │ S. Chen    │ Jan 15, 2026  │
│      │ Harassment Allegation │          │          │            │               │
├──────┼───────────────────────┼──────────┼──────────┼────────────┼───────────────┤
│ □    │ CASE-2024-00141       │ ● Open   │ ► Medium │ M. Lee     │ Jan 14, 2026  │
│      │ Expense Policy Violat │          │          │            │               │
└──────┴───────────────────────┴──────────┴──────────┴────────────┴───────────────┘
```

**Features:**
- Bulk selection checkboxes
- Configurable columns (⚙)
- Click column header to sort
- Bulk actions on selection (Assign, Export, etc.)
- Pagination with page size options

### Card View (Visual Scanning / Triage)

Best for: Quick visual scanning, seeing more context per item

```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ ▲ HIGH        ● Open│  │ ► MED         ● Open│  │ ▼ LOW       ○ Closed│
│ ───────────────────│  │ ───────────────────│  │ ───────────────────│
│ CASE-2024-00142     │  │ CASE-2024-00141     │  │ CASE-2024-00140     │
│ Harassment Allegat… │  │ Expense Policy Vi…  │  │ Conflict of Inter…  │
│                     │  │                     │  │                     │
│ Employee reports    │  │ Multiple unapproved │  │ Outside board       │
│ pattern of comments │  │ expenses submitted… │  │ position disclosed… │
│                     │  │                     │  │                     │
│ 👤 Sarah Chen       │  │ 👤 Marcus Lee       │  │ 👤 Jenny Park       │
│ 📅 Jan 15, 2026     │  │ 📅 Jan 14, 2026     │  │ 📅 Jan 12, 2026     │
│ 💬 3  📎 2  ✓ 1/4   │  │ 💬 1  📎 0  ✓ 0/3   │  │ 💬 5  📎 4  ✓ 4/4   │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

**Features:**
- Visual severity/status indicators (color-coded)
- Summary preview text
- Quick stats: 💬 comments, 📎 attachments, ✓ tasks completed
- Click card → opens 3-column detail view

### Board View (Kanban - Pipeline Management)

Best for: Status-based workflow management, visualizing bottlenecks

```
│  NEW (5)           │ TRIAGE (3)        │ INVESTIGATING (8) │ PENDING CLOSE (2)  │
│  ─────────────────│──────────────────│──────────────────│─────────────────────│
│  ┌───────────────┐│ ┌───────────────┐│ ┌───────────────┐│ ┌───────────────┐   │
│  │ ▲ Harassment  ││ │ ► Expense     ││ │ ▲ Retaliation ││ │ ► Data Breach │   │
│  │ CASE-00145    ││ │ CASE-00143    ││ │ CASE-00142    ││ │ CASE-00138    │   │
│  │ 👤 Unassigned ││ │ 👤 S. Chen    ││ │ 👤 M. Lee     ││ │ 👤 J. Park    │   │
│  │ 📅 2 days     ││ │ 📅 3 days     ││ │ 📅 14 days    ││ │ 📅 21 days    │   │
│  └───────────────┘│ └───────────────┘│ └───────────────┘│ └───────────────┘   │
```

**Features:**
- Drag-and-drop between columns (updates status)
- Group by: Status, Assignee, Category, Severity
- Column counts show pipeline health at a glance
- Visual identification of bottlenecks
- "+ Add" at bottom of first column

---

## 6. Saved Views & Workspaces

### Saved Views (Tabs)

Users can save any filtered/sorted view as a persistent tab:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  [My Open Cases] [High Severity] [Unassigned - EMEA] [Overdue] [+ Save View]   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### What Gets Saved

Each saved view preserves:
- Filter criteria
- Sort order
- Column configuration (Grid view)
- View mode preference (Grid/Card/Board)
- Board grouping (Board view)

### View Management

| Action | How |
|--------|-----|
| **Create view** | Set filters → Click "+ Save View" → Name it |
| **Rename** | Right-click tab → Rename |
| **Duplicate** | Right-click tab → Duplicate |
| **Delete** | Right-click tab → Delete |
| **Reorder** | Drag tabs to reorder |
| **Share** | Right-click tab → Share with team |

### Shared Views

- "Share with team" makes view available to others in same role/group
- Shared views appear with 👥 icon
- Only creator or admin can edit shared view
- Others can duplicate to customize

---

## 7. Widget Dashboards

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Dashboard                                    [Edit Layout]  [+ Add Widget]  ⚙  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐       │
│  │ Open Cases          │ │ Avg Days to Close   │ │ High Severity       │       │
│  │       47            │ │       23            │ │        8            │       │
│  │    ↑ 12% vs last mo │ │    ↓ 5 days better  │ │    → same as last   │       │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘       │
│                                                                                 │
│  ┌───────────────────────────────────────────┐ ┌───────────────────────────┐   │
│  │ Cases by Status (Bar Chart)               │ │ Cases by Category         │   │
│  └───────────────────────────────────────────┘ └───────────────────────────┘   │
│                                                                                 │
│  ┌───────────────────────────────────────────────────────────────────────────┐ │
│  │ Case Volume Trend (12 Months - Line Chart)                                │ │
│  └───────────────────────────────────────────────────────────────────────────┘ │
│                                                                                 │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────────┐   │
│  │ My Open Cases (List)                │ │ Overdue Tasks (List)            │   │
│  └─────────────────────────────────────┘ └─────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Widget Library Categories

| Category | Widgets |
|----------|---------|
| **📊 Metrics** | Open Cases, Avg Days to Close, Cases This Month, Overdue Cases, Substantiation Rate, Anonymous Report Rate, Pending Disclosures, Avg Time to First Action |
| **📈 Charts** | Cases by Status, Cases by Category, Trend Over Time, Cases by Location, Resolution Outcomes, Reporter Sources, Severity Distribution, Disclosure Pipeline |
| **📋 Lists** | My Open Cases, Unassigned Cases, Overdue Tasks, Recent Activity, Pending Approvals, Upcoming Deadlines |
| **🎯 Compliance Scores** | Policy Attestation Rate, Training Completion, Disclosure Compliance, Program Health Score |
| **🤖 AI Insights** | Trending Topics, Risk Predictions, Executive Summary, Anomaly Alerts |

### Widget Configuration

Each widget supports:
- Custom title
- Chart type selection (where applicable)
- Time range filter
- Entity filters (status, severity, location, etc.)
- Display options (show values, show legend, etc.)
- Refresh interval

### Edit Layout Mode

- Drag handle (⋮⋮) to move widgets
- Resize by dragging corners/edges
- Remove with ✕ button
- Snap to grid for clean alignment
- Changes auto-save

### Role-Based Default Dashboards

| Role | Default Widgets |
|------|-----------------|
| **CCO** | Executive KPIs, trends, compliance scores, AI insights, program health |
| **Investigator** | My cases, overdue tasks, recent activity, workload metrics |
| **Triage Lead** | Unassigned cases, queue depth, SLA status, team workload |
| **HR Manager** | Department cases, disclosure status, attestation progress |
| **Implementation** | Client health, onboarding progress, migration status |

Users can modify defaults or reset to role template anytime.

---

## 8. AI Integration Patterns

### Design Principle

AI appears where it's useful via **contextual suggestions and inline actions** - not as a separate mode or toolbar.

### Contextual AI Chips

Subtle chips appear next to fields where AI can help:

```
┌─────────────────────────────────────────────────────────────────┐
│ CASE SUMMARY                                    [✨ Suggest]    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Employee reports pattern of inappropriate comments...       │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Chip Behaviors:**
- Subtle appearance (ghost button or icon) until hovered
- Click to generate AI content inline
- Generated content shows "✨ AI generated" attribution
- User can edit, accept, or reject all AI output

### AI Slide-Over Panel

For complex or conversational AI tasks, a slide-over panel opens from the right:

```
┌──────────────────────────────────────────────────────────────┬──────────────┐
│                                                              │ 🤖 AI        │
│                 MAIN CONTENT                                 │ ──────────── │
│                                                              │              │
│                                                              │ Ask about    │
│                                                              │ this case... │
│                                                              │              │
│                                                              │ ┌──────────┐ │
│                                                              │ │ Type     │ │
│                                                              │ │ here...  │ │
│                                                              │ └──────────┘ │
│                                                              │              │
│                                                              │ [Expand ↗]  │
└──────────────────────────────────────────────────────────────┴──────────────┘
```

**Panel Modes:**
- **Collapsed**: Icon only in right column
- **Open**: ~300px panel alongside content
- **Expanded**: ~500px for longer conversations
- **Focus Mode**: Full-screen chat with context cards inline

### AI Capabilities by Context

| Context | AI Can Help With |
|---------|------------------|
| **Case Detail** | Summarize case, draft update email, suggest next steps, find similar cases |
| **Investigation** | Generate interview questions, summarize findings, draft report |
| **Email Composer** | Draft email, improve tone, translate, shorten/expand |
| **Policy Editor** | Generate policy draft, simplify language, check compliance |
| **Dashboard** | Explain trends, generate executive summary, answer questions |
| **Search** | Natural language queries ("cases about harassment in EMEA this year") |

### AI in Employee Portal

For the Ethics Portal (employee-facing), AI chat can be the primary interface since employees are mainly asking policy questions or submitting reports:

- Full-screen chat option available
- Guided report intake via conversation
- Policy Q&A with citations
- One-click escalation to human always available

---

## 9. Email Integration

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ COMPOSE + LOG + INBOX SYNC                                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • Send emails from platform (templates, AI draft, freeform)                    │
│ • Auto-log all sent emails to associated entity                                │
│ • Sync inbox replies back to case via OAuth connection                         │
│ • Full communication thread visible in activity timeline                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Email Composer (Inline)

When user clicks ✉️ Email button, composer opens inline in activity stream:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ✉️ New Email                                                    [× Close]  │
├─────────────────────────────────────────────────────────────────────────────┤
│ To:    [john.smith@acme.com                             ] [+ Cc/Bcc]       │
│ ────────────────────────────────────────────────────────────────────────── │
│ Subject: [RE: Case Follow-up - Interview Request                         ] │
│ ────────────────────────────────────────────────────────────────────────── │
│ Template: [Select template...                                    ▼]        │
│ ────────────────────────────────────────────────────────────────────────── │
│                                                                             │
│ Dear Mr. Smith,                                                             │
│                                                                             │
│ I am writing to schedule a follow-up interview regarding the matter        │
│ we discussed on January 15.                                                 │
│                                                                             │
│ Please let me know your availability for a 30-minute call this week.       │
│                                                                             │
│ Best regards,                                                               │
│ Sarah Chen                                                                  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ [📎 Attach]  [✨ AI Draft]  [🔒 Confidential]                               │
│                                                                             │
│                                          [Save Draft]  [Send Email]        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Email Features

| Feature | Description |
|---------|-------------|
| **Templates** | Pre-built: Interview Request, Document Request, Status Update, Case Closure |
| **AI Draft** | Click ✨ to have AI draft based on context |
| **AI Improve** | Select text → "Make more formal", "Shorten", "Translate" |
| **Attachments** | Attach from case documents or upload new |
| **Confidential** | Flag sensitive emails (logged but content hidden from certain roles) |
| **Auto-logging** | Sent emails automatically appear in activity timeline |
| **Reply Sync** | Replies to case emails sync back and log to case |

### Email Connection (User Settings)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Settings > Email Integration                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Connected Email Account                                                     │
│ ✓ sarah.chen@acme.com (Microsoft 365)              [Disconnect]            │
│   Connected Jan 10, 2026 · Syncing replies · Last sync: 2 min ago          │
│                                                                             │
│ Default Settings                                                            │
│ ☑ Auto-log all sent emails to associated cases                             │
│ ☑ Sync replies to case emails                                              │
│ ☐ Send from platform email (noreply@ethico.com) instead of my address     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Supported Email Providers

- Microsoft 365 / Outlook (OAuth)
- Google Workspace / Gmail (OAuth)
- BCC fallback (for unsupported providers)

---

## 10. Command Palette

### Activation

- **Keyboard**: ⌘K (Mac) / Ctrl+K (Windows)
- **Click**: Search bar in top navigation

### Interface

```
┌─────────────────────────────────────────────────────────────┐
│ ⌘K  Search or type a command...                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ RECENT                                                      │
│ │ 🔵 CASE-2024-00142 Harassment Allegation                 │
│ │ 🟢 CASE-2024-00139 Conflict of Interest                  │
│ │ 📄 Anti-Bribery Policy v2.3                              │
│                                                             │
│ QUICK ACTIONS                                               │
│ │ ➕ Create new case                           ⌘⇧C         │
│ │ ➕ Create new investigation                  ⌘⇧I         │
│ │ 📧 Compose email                            ⌘⇧E         │
│                                                             │
│ NAVIGATION                                                  │
│ │ 📁 Go to Cases                               ⌘1          │
│ │ 📁 Go to Investigations                      ⌘2          │
│ │ 📊 Go to Dashboard                           ⌘D          │
│                                                             │
│ Press ↑↓ to navigate, ↵ to select, esc to close           │
└─────────────────────────────────────────────────────────────┘
```

### Command Palette Capabilities

| Capability | Example |
|------------|---------|
| **Search anything** | Type "harassment" → finds cases, policies, subjects |
| **Quick navigation** | Type "cases" → jump to Cases list |
| **Entity lookup** | Type "CASE-00142" → opens that case directly |
| **Actions** | Type "create case" → starts new case flow |
| **AI queries** | Type "?" then question → "? how many cases this month" |
| **User lookup** | Type "@sarah" → finds user, can assign/message |
| **Settings** | Type "settings" → jump to settings pages |

### Contextual Commands

When viewing a specific entity, command palette shows relevant actions first:

```
│ ACTIONS FOR THIS CASE                                       │
│ │ 📝 Add note to case                                      │
│ │ 📧 Send email about case                                 │
│ │ 👤 Assign case to...                                     │
│ │ 🏷️ Change status                                         │
│ │ ✨ AI: Summarize this case                               │
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| ⌘K | Open command palette |
| ⌘1-4 | Navigate to main sections |
| ⌘D | Go to Dashboard |
| ⌘, | Open Settings |
| ⌘⇧C | Create new case |
| ⌘⇧N | Add note (when in entity) |
| ⌘⇧E | Compose email (when in entity) |
| Esc | Close modals, panels, palette |

---

## 11. Implementation Portal

The Implementation Portal is a **role-based view** within the same platform, not a separate application.

### Who Sees It

Users with Implementation Specialist role see additional navigation section.

### Implementation Navigation

```
│ ─────────  │
│ IMPLEMENT  │
│ ┌────────┐ │
│ │📋Onboard│ │  ← Onboarding checklists
│ └────────┘ │
│ ┌────────┐ │
│ │📥Migrate│ │  ← Data import tools
│ └────────┘ │
│ ┌────────┐ │
│ │⚙️Config │ │  ← Bulk configuration wizards
│ └────────┘ │
│ ┌────────┐ │
│ │📊Health │ │  ← Client health dashboard
│ └────────┘ │
```

### Onboarding Checklist

Tracks implementation progress through phases:

```
✅ PHASE 1: FOUNDATION                                              Complete
├─ ✓ Account created
├─ ✓ Primary admin invited
├─ ✓ SSO configured
└─ ✓ Branding uploaded

🔄 PHASE 2: CONFIGURATION                                          In Progress
├─ ✓ Categories & subcategories defined
├─ ✓ Locations hierarchy imported
├─ ○ Severity levels configured                              [Configure →]
├─ ○ Routing rules defined                                   [Configure →]
└─ ○ Investigation templates created                         [Create →]

⬚ PHASE 3: INTEGRATIONS                                            Not Started
├─ ○ HRIS connected                                          [Connect →]
├─ ○ Employee directory synced
└─ ○ Email integration enabled

⬚ PHASE 4: DATA MIGRATION                                          Not Started
├─ ○ Historical cases imported                               [Import →]
├─ ○ Existing disclosures migrated
└─ ○ Data validation complete

⬚ PHASE 5: TESTING & TRAINING                                      Not Started
├─ ○ Test cases created
├─ ○ Admin training completed
└─ ○ Go-live readiness review
```

### Data Migration Tool

Step-by-step wizard for importing data from competitor systems:

1. **Upload**: Select source system (NAVEX, EQS, CSV, etc.), upload export file
2. **Map Fields**: Match source columns to Ethico fields, AI-assisted suggestions
3. **Map Values**: Handle status/category mismatches with value mapping
4. **Preview**: Review sample of mapped records, validation errors
5. **Import**: Execute import with rollback capability
6. **Validate**: Review import results, fix issues

**AI Assist:**
- Auto-map fields based on column names and content analysis
- Suggest value mappings based on semantic similarity
- Flag potential data quality issues

### Bulk Configuration Wizard

Configure multiple settings efficiently:

- **Categories & Routing**: Template-based setup with routing rules
- **Investigation Templates**: Create category-specific checklists
- **Corrective Action Library**: Pre-populate remediation options
- **Form Builder**: Configure intake forms, disclosure forms
- **Workflow Rules**: Set up approval chains, escalation rules

### Client Health Dashboard

For Implementation Specialists managing multiple clients:

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ CLIENT              PHASE           PROGRESS    GO-LIVE     STATUS             │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Acme Corporation    Configuration   ████░░ 42%  Feb 15      🟡 On Track        │
│ Global Industries   Migration       ██████ 78%  Feb 1       🟢 Ahead           │
│ TechCorp Inc        Testing         █████░ 65%  Feb 28      🔴 At Risk         │
│ HealthCo            Foundation      ██░░░░ 15%  Mar 15      🟡 On Track        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**At-Risk Alerts:**
- Automatic detection of blockers and delays
- Recommended actions for resolution
- Escalation paths to client sponsor

---

## 12. Demo Environment

### Smart Demo Account (Future Feature)

A pre-populated "Acme Co." environment for sales demos:

**What's Populated:**
- Historical cases across all categories and statuses
- Active and completed investigations
- Disclosure campaigns in progress
- Fully configured policies with attestation tracking
- Populated dashboards with realistic metrics
- Configured ethics portal and employee portal
- Sample forms (near miss reporting, data breach, etc.)

**Demo Features:**
- Account Executives can "step into" Acme Co. instantly
- Data resets periodically or on-demand
- Demonstrates all differentiated functionality
- Supports industry-specific variants (Healthcare, Finance, Manufacturing)

**Access:**
- Account Executive and Solutions Engineer roles
- Demo mode indicator visible in UI
- Cannot modify core demo data (but can add test records)

---

## 13. Mobile & Responsive

### Strategy: Responsive Web + PWA

Same application adapts to all screen sizes, installable as Progressive Web App.

### Mobile-Optimized Features

| Feature | Mobile Support |
|---------|----------------|
| Dashboard views | ✅ Full support, stacked widgets |
| Case list browsing | ✅ Card view default on mobile |
| Case detail viewing | ✅ Stacked columns (left → center → right) |
| Notification acknowledgment | ✅ Full support |
| Quick status updates | ✅ Simplified actions |
| Comments and notes | ✅ Full support |
| AI chat | ✅ Full-screen on mobile |

### Desktop-Preferred Features

| Feature | Mobile Support |
|---------|----------------|
| Form builder configuration | ⚠️ View only, edit on desktop |
| Policy document editing | ⚠️ View only, edit on desktop |
| Bulk operations | ⚠️ Limited, full on desktop |
| Complex investigation workflows | ⚠️ Simplified |
| Report building | ⚠️ View only, build on desktop |
| Dashboard customization | ⚠️ View only, edit on desktop |

### Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| **Desktop** | ≥1280px | Full 3-column detail view, sidebar expanded |
| **Tablet** | 768-1279px | 2-column detail, sidebar collapsed |
| **Mobile** | <768px | Single column, stacked layout, bottom nav |

### PWA Features

- Install to home screen
- Push notifications (with permission)
- Offline viewing of cached data
- Background sync when connection restored

---

## 14. Dark Mode

### Support

- User toggle in preferences (Light / Dark / System)
- Respects OS preference when set to "System"
- Persists across sessions

### Implementation

All components themed using CSS custom properties:

```css
:root {
  --background: #ffffff;
  --foreground: #111827;
  --primary: #8B5CF6;
  /* ... */
}

[data-theme="dark"] {
  --background: #111827;
  --foreground: #F9FAFB;
  --primary: #A78BFA;
  /* ... */
}
```

### Dark Mode Considerations

- Charts and graphs adapt colors for readability
- Status colors maintain meaning (green=good, red=bad)
- Sufficient contrast ratios maintained (WCAG AA)
- Images/logos may need dark-mode variants

---

## 15. Design System Foundation

### UI Framework

**shadcn/ui + Tailwind CSS** with Radix primitives

- NOT Material-UI (MUI)
- Customizable, accessible components
- Consistent with platform design language

### Color Palette

```scss
// Primary Brand Colors (Purple/Violet)
$primary-50:  #F5F3FF;
$primary-500: #8B5CF6;  // Primary buttons, links
$primary-600: #7C3AED;  // Hover states
$primary-700: #6D28D9;  // Active states

// Semantic Colors
$success: #10B981;  // Green - Approved, Completed
$warning: #F59E0B;  // Amber - Pending, Due Soon
$error:   #EF4444;  // Red - Rejected, Overdue
$info:    #3B82F6;  // Blue - Information

// Neutral Colors
$gray-50 to $gray-900 for backgrounds, text, borders
```

### Typography

```scss
$font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
$font-family-mono: 'JetBrains Mono', monospace;

// Scale: 12px, 14px, 16px (base), 18px, 20px, 24px, 30px, 36px
```

### Spacing

8px grid system: 4, 8, 12, 16, 24, 32, 48, 64, 96px

### Border Radius

- Small (buttons, inputs): 6px
- Medium (cards, modals): 8px
- Large (panels): 12px

### Shadows

```scss
$shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
$shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
$shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
```

---

## 16. Accessibility

### Standards

- **WCAG 2.1 AA** compliance minimum
- **AAA** for critical flows (report submission, authentication)

### Requirements

| Requirement | Implementation |
|-------------|----------------|
| **Keyboard Navigation** | All interactive elements focusable, logical tab order |
| **Screen Readers** | Semantic HTML, ARIA labels, live regions for updates |
| **Color Contrast** | Minimum 4.5:1 for text, 3:1 for large text/UI |
| **Focus Indicators** | Visible focus rings on all interactive elements |
| **Error Identification** | Errors announced, associated with fields |
| **Resize Support** | Content reflows up to 400% zoom |
| **Motion** | Respect prefers-reduced-motion |

### Testing

- Automated: axe-core in CI/CD
- Manual: VoiceOver, NVDA testing
- User testing with assistive technology users

---

## Appendix: Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Navigation | Collapsible Left Sidebar + ⌘K | HubSpot/Linear pattern, power user efficiency |
| Detail View | 3-Column HubSpot-style | Properties visible, activity-centric, related entities accessible |
| View Modes | Grid + Card + Board | Each serves distinct use case |
| Saved Views | Tab-based with sharing | HubSpot pattern, critical for compliance workflows |
| Dashboards | Widget-based, drag-and-drop | Self-service customization, role-based defaults |
| AI Integration | Contextual chips + slide-over | Low friction, non-intrusive, powerful when needed |
| Email | Compose + Log + Inbox Sync | Complete audit trail, auto-documentation |
| Mobile | Responsive PWA | Single codebase, install capability, offline support |
| Dark Mode | User toggle + system preference | User preference, modern expectation |
| Implementation Portal | Role-based view | Same platform, consistent experience, simpler architecture |

---

*Document Version: 1.0*
*Last Updated: January 2026*
