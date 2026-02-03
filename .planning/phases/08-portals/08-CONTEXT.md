# Phase 8: Portals - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Launch three user-facing portals for end-to-end compliance self-service:
1. **Ethics Portal** - Branded public compliance microsite with content (CoC, policies, FAQs), AI chatbot, and all RIU intake access points (reports, disclosures, hotline)
2. **Employee Portal** - Authenticated personalized dashboard for employees to see their reports, disclosures, attestations, tasks, and (for managers) team compliance status
3. **Operator Console** - Hotline intake tool where operators receive calls, identify clients/callers via phone lookup, and create RIUs with AI assistance

**Critical clarification:** The Ethics Portal is a full compliance website (not just intake forms). Phone calls create RIUs that can be "Request for Information" (non-issue), "Report" (auto-creates Case), or "Wrong Number".

</domain>

<decisions>
## Implementation Decisions

### Ethics Portal - Architecture

- **Full branded microsite** with sections: Home (welcome video, announcements, quick actions), Code of Conduct (web-based, interactive), Resources (policies, training), FAQs, Speak Up (RIU access points)
- **Universal + customizable category template** - single comprehensive template (~20 categories by domain), enable/disable/rename per org, add custom categories, industry-specific ones disabled by default
- **Tiered branding** - Template mode (quick setup: logo, colors, theme) + Full white-label mode (custom domain, logo variants, 12-token color palette, typography, footer, email branding)
- **SSO-integrated but optional** - all content and forms public without auth, SSO adds value (pre-fill, tracked reading, past submissions) but never blocks core functionality
- **Full PWA with offline support** - installable to home screen, encrypted IndexedDB drafts, background sync for submissions, auto-expire drafts after 7 days

### Ethics Portal - Report Submission Flow

- **Adaptive flow** - minimal start (category + description), then category-specific questions expand contextually
- **Browser-detected language + manual override** - auto-detect from Accept-Language, persistent switcher in header, localStorage for preference
- **Inline attachments** - drag-drop zone always visible below text area, add/remove anytime during writing
- **Dedicated confirmation page** - full page (not modal) with prominent access code, save options (copy/email/print), acknowledgment checkbox, auto-download PDF backup
- **Smart prompts** - gently encourage more detail if short/sparse, category-aware suggestions, always allow "Submit Anyway" - never block
- **Tiered anonymity with benefits shown** - display 3 levels (Anonymous/Confidential/Open) with clear pros/cons
- **Context-specific demographics** - only collect when relevant to allegation type (e.g., protected class for discrimination)
- **Sensitivity tagging** - reporter can mark files as "highly sensitive" for extra access restrictions

### Ethics Portal - Urgency & Triage

- **Both auto-detect + reporter flag** - auto-detect high-risk categories + reporter can flag urgent, combined = CRITICAL
- **Tiered escalation** - CRITICAL: immediate multi-channel + 15/30 min escalation; URGENT: immediate notification + 2hr escalation; NORMAL: standard SLA

### Ethics Portal - AI Assistance

- **AI Chatbot at front door** - policy Q&A, guidance on whether to report, creates "Inquiry" records linked to reports
- **Report submission is AI-free** - reporter's own words only, no AI rewriting (legal authenticity)
- **Capture in-chat with transition** - if disclosure detected, gather details conversationally, then open pre-filled structured form in side panel
- **Any language + detection** - accept any language, auto-detect, store original + AI translation, bidirectional translation for follow-up messages

### Ethics Portal - Drafts & Offline

- **Auto-save (local) + optional save code** - auto-save to encrypted IndexedDB for same-device resume, optional "Save for Later" button generates code for cross-device resume, 7-day expiration
- **Mobile-first design** - phone-optimized for privacy-conscious reporting, large touch targets, camera integration, offline PWA support, scales up to desktop

### Ethics Portal - Code of Conduct

- **Full campaign support** - scheduled rollouts, audience targeting, automated reminders, escalation to managers/HR
- **Reading requirements** (configurable) - scroll-through tracking, minimum time (optional), acknowledgment checkbox, quiz (optional)
- **Detailed reporting** - by department/location breakdown, incomplete employee list, export for auditors

### Access Code Experience

- **Short Report ID + System PIN + Optional Email Backup**
  - Report ID: `RPT-{4-5 digit number}` (sequential per tenant, not secret)
  - Access PIN: 6 alphanumeric chars (system-generated, shown only once, hashed storage)
  - Optional email backup for recovery (encrypted, one-time-use magic links)
- **Segmented PIN input** - auto-advancing formatted input for PIN entry
- **Rate limiting** - 5 fails → 15min lockout, escalating (10 fails → 1hr, 20 fails → 24hr)
- **Minimal status view** - just current status (Received/Under Review/Closed) and message thread - no internal process visibility
- **Rich messaging with structured Q&A** - formatted text, attachments, read receipts, plus investigator can send structured questions
- **Optional email notifications** - reporter can opt-in to receive email alerts when investigator sends new message (no content in email)
- **Configurable closure feedback** - investigator controls what reporter sees at closure (option to not notify, standard template, custom message)

### Employee Portal - Layout

- **Action-focused dashboard with role-aware tabs**
  - **My Tasks** (default): Pending attestations, disclosures, approvals, report follow-ups, recently completed
  - **My Team** (managers only): Team compliance rates, members needing attention, bulk reminders, exportable status table
  - **My History**: All past disclosures, attestations, reports - filterable/searchable/exportable
  - **Policies**: Role/department-appropriate policies with acknowledgment status, "recently updated" flags
  - **Submit/Report**: All RIU entry points (report, proxy report, chatbot, hotline, G&E, COI, custom forms)
- **Configurable per-user notifications** - employee can choose: in-app only, email per event, daily digest, or weekly digest

### Employee Portal - Integration

- **Both standalone + embeddable widgets**
  - Standalone portal at custom domain with full functionality
  - Embeddable widgets: My Tasks, Team Status, Quick Actions, Announcements
  - Embed methods: iframe (simple), Web Component (configurable), SharePoint Web Part (enterprise), API (custom)
- **Deep links** - widgets link to full portal for detailed views

### Operator Console - Call Flow

- **Phone number lookup first** - incoming caller ID triggers client profile lookup, loads client-specific scripts and configurations
- **RIU types from calls**: Request for Information (non-issue), Report (auto-creates Case), Wrong Number
- **Category-triggered templates** - when "Report" selected and category chosen (e.g., HIPAA), load category-specific questionnaire in real-time
- **Full client context on load** - HRIS data, locations, scripts/directives, category templates, client branding

### Operator Console - Layout & AI

- **Split screen (HubSpot-inspired)** - top bar with call controls (timer, mute, hold, transfer, end), left 60% for intake form (always visible), right 40% for context tabs (Script/Guide, HRIS, History)
- **Both AI assist modes** - operator can toggle between live AI cleanup suggestions while typing OR post-call "Clean Up Notes" button
- **Full HRIS search** - operators can search by name, department, title - see org chart and manager hierarchy

### Operator Console - Scripts & QA

- **Read-aloud prompts** - pop up text that operator reads verbatim to caller (exact wording matters for legal/compliance)
- **Client-specific directives** - different scripts for different categories at different call stages
- **Configurable QA per client** - global default + client override
  - QA modes: All to QA (100%), Risk-based (high-risk categories), Sample-based (random %), No QA
  - Keyword triggers (always route to QA regardless of mode)
  - Client-specific category and keyword overrides
- **Warm transfer with context** - transfer to QA/supervisor with intake notes visible, operator can brief before connecting

### Claude's Discretion

- Loading states and skeleton designs
- Exact spacing, typography, and visual polish
- Error state UI (within accessibility guidelines)
- Performance optimizations
- Database schema specifics beyond requirements
- Exact PWA caching strategies
- Offline sync conflict resolution approach

</decisions>

<specifics>
## Specific Ideas

- "I like how Twitter shows the new posts indicator without disrupting your scroll position" - reference for new report notifications
- Cards should feel like Linear's issue cards - clean, not cluttered
- HubSpot pattern for Operator Console: notes always visible, context alongside (not behind), quick actions without switching views
- Ethics Portal should feel like a secure, private app - not "just a website"
- Reporters on personal phones for privacy - mobile-first is essential
- "I want it to feel like pg_dump - familiar to database people" pattern for CLI - similar familiarity for compliance officers with ethics tools

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 08-portals*
*Context gathered: 2026-02-03*
