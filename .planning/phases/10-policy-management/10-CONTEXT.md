# Phase 10: Policy Management - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete policy lifecycle - document management with versioning, approval workflows, attestation campaigns, and AI-powered translation. Users can create policies with rich text, route through approval, distribute via attestation campaigns, and maintain translations.

</domain>

<decisions>
## Implementation Decisions

### Policy Editor Experience

- **Autosave:** Debounced - save after user stops typing for 2-3 seconds
- **Version comparison:** Inline diff as primary (additions green, deletions red strikethrough), with toggle to side-by-side view
- **Draft indicator:** Status badge + top banner with calmer design (grey background, warning border) showing "DRAFT - Last saved X min ago"
- **Edit published policy:** Explicit "Create New Version" button required - no auto-creating drafts
- **Rich text formatting:** Full support - headings, lists, tables, links, images, footnotes, callout boxes
- **Document structure:** Numbered sections (1.0, 1.1, 2.0) with auto-generated table of contents - structure optional, not enforced
- **Large documents:** Single scrollable document with sticky TOC sidebar, section highlighting on scroll
- **Review reminders:** Review date tracking with auto-reminders to policy owner - no hard expiry enforcement
- **Keyboard shortcuts:** Extended set (Mod+B/I/U, Mod+S save, Mod+K link, Mod+Alt+1/2/3 headings) - optional slash commands for power users

**Policy Creation Flow (4 entry points):**
1. Start from blank with section template
2. Use system templates (Code of Conduct, Data Privacy, etc.) OR custom templates ("Save as template")
3. Import from PDF/Word with structure parsing
4. AI-assisted draft generation from requirements

**Metadata:** Extended + custom fields for HRIS targeting
- Standard: title, type, owner, effective date, review date
- Targeting: departments, locations, job levels, employment types, custom HRIS field matching
- Tenant-configurable custom properties

### Approval Workflow UX

- **Submission:** "Submit for Approval" button opens dialog with workflow selector, approval chain preview, and required submission notes
- **Reviewer visibility:** All channels - dedicated My Approvals queue + email/in-app notifications + dashboard widget
- **Review interface:** Changes-focused diff view as default (inline diff), with toggle to full policy view
- **Rejection options:** Two distinct actions:
  - "Request Changes" - soft rejection, stays in workflow, returns to author for revision
  - "Reject" - hard rejection, closes workflow entirely, requires new submission
  - Both require written feedback/reason

### Attestation Campaigns

- **Acknowledgment types:** Multiple, configurable per campaign - checkbox, electronic signature, quiz-based verification
- **Campaign creation:** Both entry points - "Create Attestation Campaign" from policy page OR from campaigns hub selecting policy
- **Employee experience:** Full policy displayed with acknowledgment section at bottom - forced scroll optional per policy
- **Campaign dashboard:** Actionable with detailed breakdown
  - Progress by department/location/job level
  - One-click "Send Reminder to All Pending" / "Send Urgent to Overdue" / "Escalate to Managers"
  - Non-completers list with individual actions and bulk select
  - Completion trend chart with deadline marker

**Quiz-based attestation:**
- Learning-focused with pass threshold (default 80%)
- Immediate feedback after each question showing correct answer + explanation
- Unlimited retries - goal is comprehension, not gatekeeping
- Log each attempt with score, timestamp, time spent

**Refusal handling:** Allow "I decline" with required reason, creates compliance case for review

**Reminders:** Configurable per campaign
- Set days before deadline, channel (email/in-app/both), tone (friendly/urgent/final)
- Default template: 14, 7, 3, 1 days before
- Post-deadline escalation to managers configurable

**Exemptions:** All three mechanisms
- Admin exemption with reason
- Manager requests exemption, compliance admin approves
- Auto-exempt rules (e.g., contractors exempt from internal policies)

**Employee history:** Full attestation history visible + downloadable certificates

**Re-attestation on update:** Required decision during publish flow
- Compliance officer must explicitly choose "Yes - require re-attestation" or "No - changes are minor"
- Justification required for audit trail
- Not automatic

**Reporting:** Multiple report types for different audiences - completion, compliance, full audit detail

**Policy bundles:** Campaigns can include multiple related policies (e.g., "Annual Compliance Bundle")

### Translation Management

- **Translation workflow:** Side-by-side editing - AI generates draft, human edits with original visible alongside
  - Left panel: Original (read-only)
  - Right panel: Translation (editable)
  - Sync scroll, highlight corresponding segments
  - Tools: Re-translate selection, alternative phrasings, terminology lookup

- **Stale translation handling:** Diff-based update
  - When source updates, mark translation as stale but keep it live
  - AI re-translates only changed sections, preserving human edits to unchanged sections
  - Create draft for review
  - Old translation remains live until new version approved

- **Translator permissions:** Flexible role model
  - Internal: Policy authors can translate their policies, Compliance officers any policy, dedicated Translator role
  - External: Limited-access contractor accounts scoped to assigned translations only
  - Language assignments per translator

### Claude's Discretion

- Save/sync status indicator design
- Terminology glossary approach (simple term list vs. full glossary system)
- Exact spacing, typography, loading skeletons
- Error state handling

</decisions>

<specifics>
## Specific Ideas

- "I like how Twitter shows the new posts indicator without disrupting scroll position" - apply same pattern to policy updates
- Cards should feel like Linear's issue cards - clean, not cluttered
- Draft banner should be calming during editing, not alarming (grey background, not bright yellow)
- Policy structure should feel like ISO/SOC2 policies - formal section numbering (1.0 Purpose, 2.0 Scope, etc.)
- Approval review should feel like GitHub PR review - changes highlighted inline, approve/reject controls
- Quiz feedback should teach, not gatekeep - show correct answers immediately after each question
- Translation editor should feel like professional CAT tools (SDL Trados, memoQ) with side-by-side panels
- External translators should have minimal UI - only their assigned work, nothing else

</specifics>

<deferred>
## Deferred Ideas

- **In-document commenting** - Real-time comments on specific policy sections (collaboration feature - separate phase)
- **User tagging in comments** - @mention colleagues in policy comments (collaboration feature - separate phase)
- **Y.js collaborative editing** - Multiple users editing same policy simultaneously (v2 feature per PRD)

</deferred>

---

*Phase: 10-policy-management*
*Context gathered: 2026-02-04*
