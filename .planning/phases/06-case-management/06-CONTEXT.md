# Phase 6: Case Management - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the Case investigation lifecycle - templates with checklists, structured interviews, remediation plans, subject tracking, and two-way anonymous communication. Users can run standardized investigations, document evidence, track remediation, and communicate with anonymous reporters. Creating new cases/RIUs is Phase 4; AI assistance is Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Investigation Templates & Checklists

**Template Flexibility**
- Templates are flexible after apply - investigators can add custom steps, skip irrelevant ones, reorder
- Template provides starting structure, not rigid workflow

**Checklist Completion Model**
- Checkbox + evidence required for completion
- Completing an item prompts for notes/attachments explaining how it was satisfied
- AI can suggest completion notes based on recent activity
- Evidence can be quick ("Reviewed, no issues") or detailed with attachments

**Template Application**
- Auto-apply by category - harassment case gets harassment template automatically
- Investigator can swap template if needed
- Category-to-template mapping is admin-configurable

**Template Tiers**
- Three-tier system: Official (admin-created, org-wide) → Team-shared (investigators share with teammates) → Personal (save-as from completed cases)
- Creator can share personal templates with specific users/teams
- Recipients can "Use only" or "Use and duplicate"
- Natural promotion path: Personal → Team → Request Official status

**Checklist Dependencies**
- Optional dependencies between items - template authors choose where needed
- Items show but are disabled until prerequisite done
- Locked items display reason: "Complete these first: [prerequisites]"
- Only critical sequences constrained; most items remain flexible

**Template Versioning**
- Prompt to upgrade when template updated
- Shows diff: added/modified/removed items, impact on completed items
- Investigator can stay on old version or upgrade
- Admin can mark updates as required (not dismissible) for regulatory changes
- Completed items preserved during upgrade

**Checklist Structure**
- Grouped sections (phases): "Initial Triage" → "Evidence Collection" → "Interviews" → "Analysis" → "Closure"
- Collapsible sections for focus
- Section-level progress bars
- Section-level dependencies ("Unlock Interviews when Evidence complete")

**Suggested Durations**
- Template can suggest durations per section ("Evidence Collection: 5 days")
- System calculates target dates from SLA + template hints
- Warning states: on track (green) → approaching (yellow) → over suggested (orange) → SLA at risk (red)
- Suggestions are guidance, not hard deadlines

**Item-Level Attachments**
- Items can have files/links attached directly as evidence
- Upload new file (stored at item level, also appears in case files)
- Or link to existing case document (no duplication)
- Case files view shows all attachments, tagged with which checklist item they support

**Conditional Items**
- Basic conditionals: items/sections can hide based on category, severity, case flags
- "Show HIPAA steps only for HIPAA cases"
- Transparency: "4 items hidden (not applicable to this case)"
- Reduces N/A fatigue - investigator sees only relevant items

**Template Analytics**
- Track: completion rate, avg duration, phase durations, item skip rate, modification rate, version adoption
- AI-powered suggestions: "Item X skipped 43% - consider removing"
- Aggregate analytics, not individual tracking

**Import/Export**
- JSON export/import for cross-org sharing
- Enables: Ethico starter templates, enterprise rollout to subsidiaries, consultant-provided templates
- Import as draft (review first) or official

**Handoff on Reassignment**
- Progress transfers to new investigator
- System prompts outgoing investigator to add handoff notes before reassignment completes

**Template Requirements by Category**
- Configurable per category: Required / Recommended / Optional
- Required: investigation cannot proceed without template (for high-risk categories)
- Recommended: auto-applies but can be removed
- Optional: investigator chooses

**System Starter Templates**
- Platform ships with common templates: HIPAA Breach, Harassment, Fraud, Safety, General
- New orgs select which to import during onboarding
- Customize creates org-owned copy; can reset to system version

**Template Archive**
- Retired templates move to "Archived" state
- Not selectable for new cases, but visible for historical reference
- Past cases show which (archived) template was used
- Unarchive capability if needed again

### Structured Interviews

**Recording Format**
- Text notes as primary format
- Optional audio recording for investigators who want it

**Question Templates**
- Required questions (must document response) + optional suggested questions
- Configurable per template which questions are required vs suggested

**Interview Linking**
- Dual link: Interview belongs to case AND can link to specific checklist item
- "Interview witnesses" checklist item shows linked interviews
- Click checklist item → see linked interviews, completion evidence

**Interviewees**
- Search existing Persons first (employees, contacts in system)
- Or add freeform name for external parties not in system

### Remediation Tracking

**Assignees**
- Users (system accounts) + external contacts (email notification, manual completion tracking)
- External contacts receive email notification with task details
- Compliance Officer marks external tasks complete manually

**Completion Verification**
- Self-report + evidence as default (assignee provides notes/attachments explaining what was done)
- Template can flag specific high-stakes steps as requiring CO approval
- Required notes, recommended attachments for audit trail

**Overdue Handling**
- Auto-escalation with configurable rules
- Pre-due reminders (3 days, 1 day before)
- Overdue reminders to assignee (3 days, 7 days after)
- Escalation to CO after configurable days (default 7)
- Critical escalation to Compliance Manager after extended delay

**Independent Lifecycle**
- Remediation plans continue after case closure
- Case closes when investigation complete; remediation tracks separately
- Remediation plan status independent of case status

**Remediation Templates**
- Separate template library from investigation templates
- Categories: Data Breach Response, Policy Violation, Safety Incident, etc.
- Templates define step roles; apply-time fills in specific people

**Step Dependencies**
- Optional dependencies between remediation steps
- Same pattern as investigation checklists

**Finding-Level Linking**
- Remediation plan links to specific case finding, not just case
- Case with 3 findings can have 3 targeted remediation plans
- Enables: independent closure per finding, gap reporting, clear audit trail

**Reporting**
- Rich analytics with drill-downs
- By category, aging, assignee, template usage
- Trends over time
- Exportable for board/auditor reports
- Bottleneck identification (which assignees/departments lag)

### Anonymous Messaging

**Delivery**
- Pull-based (check inbox with access code) as default
- Optional email notification - reporter can opt-in during initial report

**File Attachments**
- Reporters can attach documents, screenshots to messages

**Retention**
- Permanent retention as part of case record

**Conversation Style**
- Flat conversation (chronological), no threading
- Simple two-party exchange

**Moderation**
- No moderation - messages go directly from investigator to reporter

**PII Protection**
- Warning prompts if message contains potential PII (names, dates, locations)
- Reporter can still send after warning if they choose

### Claude's Discretion

- Read receipts / typing indicators for anonymous messaging
- Message deletion policy (no deletion vs time-limited)
- Guidance text on checklist items (expandable "why this matters" content)
- AI summary inclusion from checklist data (manual control preferred)

</decisions>

<specifics>
## Specific Ideas

**Checklist Evidence Prompt UI**
```
┌─────────────────────────────────────────────────────────────┐
│ ☑️ Completing: Review access logs for anomalies             │
├─────────────────────────────────────────────────────────────┤
│ How was this satisfied?                                     │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Reviewed badge access logs Jan 1-15. Found 3 after-    │ │
│ │ hours entries. Screenshots attached.                    │ │
│ └─────────────────────────────────────────────────────────┘ │
│ 📎 [Attach file]  [Link to case document]                   │
│ ✨ AI Suggestion: "Based on your notes, you reviewed..."    │
│ [Cancel]                              [Mark Complete]       │
└─────────────────────────────────────────────────────────────┘
```

**Section-Based Checklist Progress**
- Each section shows progress bar and target date
- Sections can collapse/expand for focus
- Visual indicators: on track (green) → approaching (yellow) → over (orange) → SLA at risk (red)

**Remediation Finding Traceability**
- Auditor asks "How was Finding #2 addressed?" → Direct link to specific remediation plan with completion evidence
- Full chain: Finding → Remediation Plan → Steps → Completion Evidence

**External Contact Notification Pattern**
- Email includes: task description, due date, case reference (redacted as appropriate)
- Reminder cadence configurable at org level

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-case-management*
*Context gathered: 2026-02-03*
