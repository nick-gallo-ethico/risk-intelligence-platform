# Phase 5: AI Infrastructure - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the AI integration layer that all features consume — Claude API client, context hierarchy loading, skills registry, action catalog, scoped agents per view, and the AI panel interface. This phase establishes the infrastructure; specific AI features (case summarization, note cleanup, etc.) are built on top.

</domain>

<decisions>
## Implementation Decisions

### AI Panel Layout & States
- Right slide-over panel (slides in from right edge)
- Three states: hidden, side panel, full screen (Claude.ai-like experience)
- Side panel: chat with popup documents
- Full screen: two columns — chat on left, editable output on right
- Full-screen takeover on mobile devices
- Keyboard shortcut: Cmd/Ctrl + K to open/close

### Context System
- Context-aware by default — AI knows current entity (investigation, case, etc.)
- Slash commands to "zoom out": `/case` for case context, `/platform` for org-wide
- `/pause` command saves context for later resume
- `/resume` command restores saved context
- Context breadcrumb visible showing current scope (e.g., "Investigation #1234 > Case #567")
- Support for "claude.md"-like context files at organization and user levels for brand voice, terminology, custom rules

### Conversation Management
- Per-entity history persisted across sessions
- Multiple concurrent conversations supported (soft limit ~5)
- Auto-pause and switch when navigating to different entity (subtle toast, not dialog)
- AI-generated conversation titles
- Searchable archive for all conversations
- Soft delete (archive) — hides from user view but retains for audit
- Full conversation logged to audit trail with configurable retention
- Copy individual messages + export full conversation to PDF

### Response Display
- Word-by-word streaming (like ChatGPT/Claude.ai)
- Typing indicator + status text showing current step ("Analyzing case notes...")
- Stop button during generation (keeps partial response)
- Context-aware suggested prompts when panel is empty
- Personal + shared (organization-wide) prompt templates

### User Preferences
- AI learns user preferences (formality, length, common corrections)
- Warning when approaching usage limits (not constant display)
- Voice input with microphone button
- Text-to-speech: deferred to future release

### Content Editing
- All AI-generated content editable before acceptance/logging
- Share conversation as case note (converts to logged record)

### Content Generation Style
- Formality: configurable per organization (via context file)
- Note cleanup: light cleanup by default (grammar, clarity, preserve voice) — org/user can override to full rewrite
- Two summary formats: brief (1-2 paragraphs, pinned at top) and comprehensive (full page, pinnable)
- Confidence scores: show only when low (no clutter on confident outputs)
- Structured output with section headers (Background, Findings, Recommendations)
- Risk scores include breakdown of contributing factors
- Suggested edits shown as track changes (red/green diff view)
- Footnote references for citations when generating from multiple sources
- AI badge/indicator on all generated content (sparkle icon differentiates pure AI, AI+edited, AI-assisted)
- Response length: user-configurable (Brief/Standard/Detailed) with smart defaults per skill

### Sensitive Content Handling
- Context-dependent redaction: full detail for investigators, auto-redact for exports/reports
- Visual PII/allegation flagging even when showing full detail
- Translations: side-by-side original + translation with collapsible original and "Flag Issue" button
- Legally sensitive content (termination letters, formal accusations): draft only, requires approval workflow
- Categorization includes visible reasoning ("Categorized as Harassment because mentions hostile work environment")
- Language: English primary, auto-detect and translate from other languages

### Agent Architecture
- Both entity-scoped AND role-scoped: agent adapts to current entity type and user's role
- Agent types: Investigation Agent, Case Agent, Campaign Agent, Compliance Manager (org-wide), Admin Agent (system admins)
- Consistent personality across all agents (same professional tone)
- Full investigation toolkit: summarize, clean notes, suggest questions, draft communications, categorize, risk score
- Skills for other domains: policy, disclosures, campaigns
- Role + entity intersection for permissions (user must have BOTH role permission AND entity access)
- Admins can disable specific skills per organization
- Template-based custom skills: admins create from prompt templates
- Proactive suggestions enabled ("I noticed 3 similar cases — want me to link them?")
- External system queries (HRIS, email) with explicit permission and transparency
- Bulk operations supported with full preview before execution

### Skill Discovery
- `/help` command shows available skills grouped by category
- Autocomplete dropdown when typing `/`
- Context-aware suggested prompts in empty state

### Agent Behavior
- Auto-pause and switch when user navigates to different entity
- Both entity AND user memory (remembers entity context + user preferences)
- When action unavailable: explain why + suggest alternatives
- Admin-only debug mode showing: model, tokens, context loaded, system prompt, reasoning trace
- Soft rate limits per user with warning (not hard blocks)

### Action Handling
- Preview required for: external sends (email, notifications), external API calls, bulk operations, close/archive
- No preview for: add note, change assignment, update status (have undo)
- Diff view for all previews (before/after with changes highlighted)

### Undo System
- Undo window configurable per action:
  - 30 seconds: add note, update field
  - 5 minutes: change assignment, change status
  - 30 minutes: close case, close investigation
  - 24 hours: archive
- Quick actions (≤30s): toast with countdown and Undo link
- Significant actions (>30s): toast + "View in History" link
- Non-undoable: sent emails, external API calls, records under legal hold
- Legal hold: append-only (can add notes, cannot edit/delete/undo existing)

### Execution Model
- Atomic execution with rollback for dependent operations (all succeed or all rolled back)
- Best effort for independent bulk operations (send 100 emails)
- Dedicated AI action history view showing timeline of all AI-performed actions
- Type-to-confirm for destructive actions (delete, archive, remove from legal hold)

### Claude's Discretion
- Quick action buttons vs conversation-only interface design
- User rating UI (thumbs up/down with optional feedback)
- Source/citation display format (collapsible section vs inline)
- Error message tone and retry UX
- Regeneration approach (multiple variations vs single new version)

</decisions>

<specifics>
## Specific Ideas

- "Should have a /pause feature like GSD has that saves context from previous chats"
- Two-column layout in full screen mode: chat on left, editable output on right — like a document editor
- Context files work like CLAUDE.md: organization-wide for brand voice/standards, user-level for personal preferences
- Visual treatment for AI badge: sparkle icon (✨) signals AI without making it feel "lesser"
- Debug mode like Claude Code with full transparency for admins: model, tokens, context, prompts, reasoning
- Track changes style for edits (Word-like red/green highlighting)
- "Claude Code for Compliance" design philosophy — action agent, not chatbot
- Multiple concurrent conversations because compliance officers work across multiple cases simultaneously
- Pause/resume synergy: auto-pause uses that pattern naturally when navigating between entities

</specifics>

<deferred>
## Deferred Ideas

- Text-to-speech for AI responses — future release
- Custom agent personalities per agent type — opted for consistency instead

</deferred>

---

*Phase: 05-ai-infrastructure*
*Context gathered: 2026-02-03*
