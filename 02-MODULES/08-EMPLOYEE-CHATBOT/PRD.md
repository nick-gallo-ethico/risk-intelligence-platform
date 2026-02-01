# Ethico Risk Intelligence Platform
## PRD-008: Employee Chatbot

**Document ID:** PRD-008
**Version:** 2.0 (RIU - Risk Intelligence Unit)
**Priority:** P1 - High (Extended Module)
**Development Phase:** Phase 3 (Weeks 13-20)
**Last Updated:** February 2026

> **Architecture Reference:** This PRD implements the RIU→Case architecture defined in `00-PLATFORM/01-PLATFORM-VISION.md v3.2`. Every completed chatbot conversation creates an **immutable RIU** (Risk Intelligence Unit) of type `chatbot_transcript`. Case creation is **outcome-based**—only conversations that result in escalation, human review flags, or formal intake create Cases.

---

## 1. Executive Summary

The Employee Chatbot is an AI-powered conversational interface that serves as the primary self-service channel for employees interacting with the Ethico platform. It provides a natural language interface for speak-up reporting, policy questions, disclosure assistance, case status checks, and compliance team inquiries.

**This module reuses patterns established in other PRDs:**
- Case creation workflow (from PRD-005 Case Management)
- Disclosure submission (from PRD-006 Disclosures)
- Anonymous communication (from PRD-005)
- Translation patterns (from PRD-005/006)
- Multi-tenant isolation (platform-wide)

### Module Scope

| In Scope | Out of Scope (Other PRDs) |
|----------|---------------------------|
| Conversational UI for all use cases | Ethics Portal branding (PRD-003) |
| Guided speak-up intake | Web Form Builder core (PRD-004) |
| Policy Q&A with knowledge base | Policy Management module (PRD-009) |
| Case status checks | Case workflow engine (PRD-005) |
| Disclosure assistance | Disclosure forms/workflows (PRD-006) |
| Compliance team inquiries | Analytics dashboards (PRD-007) |
| Knowledge base management | HRIS integration core (PRD-010) |
| Multi-language conversations | |
| Proactive notifications | |

### Key Design Principles

1. **Tiered AI Model** - Direct answers when confident, escalate when uncertain
2. **Confidence Transparency** - Always indicate when quoting policy vs. interpreting
3. **One-Click Human Access** - Never trap users in AI purgatory
4. **Async Over Live** - Match compliance team staffing realities (1-5 people, not call centers)
5. **Context Preservation** - Full conversation history for audit and handoff
6. **Channel Unification** - Responses delivered where conversation started

---

## 1.1 RIU→Case Architecture (Chatbot Flow)

The Employee Chatbot follows the platform-wide RIU→Case architecture. **Every completed chatbot conversation creates an RIU** (Risk Intelligence Unit) of type `chatbot_transcript`. Case creation depends on the conversation outcome.

### Chatbot RIU Creation Flow

```
Chatbot Conversation Completes
         │
         ▼
┌─────────────────────────────┐
│  CREATE RIU                 │
│  type: chatbot_transcript   │
│  Full conversation stored   │
│  Immutable record           │
└─────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  EVALUATE OUTCOME                           │
│  - User requested escalation to human?      │
│  - AI flagged concern for human review?     │
│  - Intake completed (report submitted)?     │
│  - Policy Q&A only (no action needed)?      │
└─────────────────────────────────────────────┘
         │
    ┌────┴────┬────────────┬────────────┐
    │         │            │            │
    ▼         ▼            ▼            ▼
 No Case   Inquiry      CREATE CASE   CREATE CASE
 (Q&A only) Created     (Escalation)  (Report)
    │         │            │            │
    │         │            └────────────┘
    │         │                  │
    │         │                  ▼
    │         │          Link RIU to Case
    │         │          via riu_case_associations
    │         │          (association_type: 'primary')
    └─────────┴──────────────────┘
              │
              ▼
       RIU preserved for
       analytics regardless
       of Case creation
```

### Case Creation Rules by Outcome

| Conversation Outcome | Creates Case? | Rationale |
|---------------------|---------------|-----------|
| **Intake completed** (user clicks "Submit Report") | Yes | Formal report requires investigation tracking |
| **User requested escalation** ("Talk to a human") | Yes (or Inquiry) | Human review needed, creates audit trail |
| **AI flagged for human review** (confidence < threshold) | Configurable | May create Inquiry only, or Case if serious |
| **Disclosure completed** | Via Disclosures module | Creates disclosure_response RIU instead |
| **Policy Q&A - answered successfully** | No | No action needed; RIU preserved for analytics |
| **Policy Q&A - user satisfied** | No | Question resolved; RIU preserved |
| **Status check only** | No | No new information; interaction logged on existing Case |
| **Abandoned mid-intake** | No | Partial data preserved in RIU for resumption/analytics |
| **Abandoned Q&A** | No | RIU preserved for analytics (common questions) |

### RIU Fields for Chatbot Transcripts

The `chatbot_transcript` RIU type includes:

```
RIU (type: chatbot_transcript)
├── Standard RIU fields
│   ├── id, organization_id, type, source_channel
│   ├── received_at (conversation start)
│   ├── reporter_type (anonymous/confidential/identified)
│   ├── reporter_employee_id (if authenticated)
│   ├── ai_summary, ai_language_detected
│   └── source_system: 'CHATBOT'
│
├── Chatbot-specific extension (stored in JSONB or extension table)
│   ├── conversation_id (FK to CHATBOT_CONVERSATION)
│   ├── conversation_type (INTAKE, POLICY_QA, STATUS_CHECK, etc.)
│   ├── outcome (SUBMITTED, ESCALATED, RESOLVED, ABANDONED)
│   ├── message_count
│   ├── full_transcript (JSONB array of messages)
│   ├── extracted_data (structured data from conversation)
│   │   ├── detected_category
│   │   ├── detected_severity
│   │   ├── detected_subjects[]
│   │   └── case_draft (partial case data if intake)
│   ├── ai_confidence_scores[] (per response)
│   ├── escalation_reason (if escalated)
│   └── resulting_entity_type (CASE, INQUIRY, DISCLOSURE, NONE)
```

### Linking RIUs to Cases

When a Case is created from a chatbot conversation:

1. **RIU created first** - Immutable record of the conversation
2. **Case created second** - Mutable work container
3. **Association created** - Links RIU to Case via `riu_case_associations`:
   ```sql
   INSERT INTO riu_case_associations (
     riu_id,
     case_id,
     association_type,  -- 'primary'
     associated_at,
     associated_by      -- SYSTEM for auto-creation
   )
   ```

4. **Activity logged on both entities:**
   - RIU: "System created RIU from chatbot intake"
   - Case: "System created Case from chatbot RIU"

### Analytics Value of Non-Case RIUs

Even when no Case is created, chatbot RIUs provide valuable analytics:

| Metric | Data Source |
|--------|-------------|
| Common policy questions | Q&A RIUs by topic/policy |
| Knowledge base gaps | Low-confidence Q&A RIUs |
| Abandoned intake patterns | Where users drop off |
| Self-service deflection rate | Q&A RIUs that didn't escalate |
| Chatbot effectiveness | Resolution rate without human |

---

## 2. User Stories

### End User

**Ask policy question**
As an **Employee**, I want to ask questions about company policies in natural language
so that I can get quick answers without searching documents.

Key behaviors:
- Type question in chat interface
- AI searches policy knowledge base
- Response cites relevant policy sections with links
- Confidence indicator shows certainty level
- Conversation logged for audit

---

**Get help with disclosure decision**
As an **Employee**, I want to ask if I need to disclose something
so that I understand my obligations before taking action.

Key behaviors:
- Describe situation in natural language
- AI analyzes against disclosure policies
- Clear recommendation: disclose/don't disclose/ask compliance
- If needed, offer to start disclosure form
- Conversation context preserved

---

**Report concern via chatbot**
As an **Employee**, I want to report a concern through the chatbot
so that I can describe the issue naturally instead of filling forms.

Key behaviors:
- Chatbot guides through intake questions conversationally
- Extracts structured data from natural language
- Offers anonymous or identified reporting
- On submission:
  - **Creates RIU** (type: `chatbot_transcript`) - immutable record of conversation
  - **Creates Case** linked to RIU via `riu_case_associations` (association_type: 'primary')
- Provides access code (anonymous) or case reference (identified)
- Activity logged: "System created RIU from chatbot intake"
- Activity logged: "System created Case from chatbot RIU"

---

**Check case status**
As an **Anonymous Reporter**, I want to check my case status via chatbot
so that I can get updates without navigating the portal.

Key behaviors:
- Enter access code when prompted
- View current case status
- See any messages from investigators
- Can add follow-up information
- Can reply to investigator questions

---

**Resume previous conversation**
As an **Employee**, I want to resume a conversation I started earlier
so that I don't have to repeat context.

Key behaviors:
- Conversation persists for configured duration
- Resume link or access code available
- Full context restored on resume
- Can start fresh if preferred
- Activity logged: "Employee resumed conversation"

---

**Escalate to compliance team**
As an **Employee**, I want to talk to a real person when the AI can't help
so that complex questions get proper attention.

Key behaviors:
- One-click "Talk to Compliance" option always visible
- Creates inquiry ticket routed to compliance team
- Full conversation context transferred
- Response delivered in same channel
- Expectation set for async response time

---

**Receive proactive compliance reminder**
As an **Employee**, I want to receive reminders about outstanding compliance items
so that I stay on top of deadlines.

Key behaviors:
- Chatbot notifies of pending disclosures, attestations
- Direct link to complete the item
- Frequency configurable by admin
- Can dismiss for configurable period
- Activity logged: "Reminder sent to employee"

---

### Client Admin

**Configure chatbot knowledge base**
As a **Compliance Officer**, I want to configure which policies are in the knowledge base
so that the chatbot answers accurately for our organization.

Key behaviors:
- Select policies to include
- AI indexes content automatically
- Preview answers before publishing
- Track which policies are cited most
- Activity logged: "Knowledge base updated"

---

**Review chatbot conversations**
As a **Compliance Officer**, I want to review chatbot conversations
so that I can identify common questions and improve training.

Key behaviors:
- View conversation transcripts
- Filter by topic, outcome, escalation
- See AI confidence scores
- Identify low-confidence answers for improvement
- organizationId enforced by RLS

---

**Handle escalated inquiry**
As a **Compliance Officer**, I want to respond to escalated chatbot inquiries
so that employees get answers to complex questions.

Key behaviors:
- Inquiry queue shows pending items
- Full conversation context visible
- Response delivered to original channel
- Can close or ask follow-up
- Activity logged: "Compliance Officer {name} responded to inquiry"

---

**Configure chatbot responses**
As a **System Admin**, I want to configure standard chatbot responses
so that common questions have approved answers.

Key behaviors:
- Define FAQ-style responses
- Set response priority over AI generation
- Multi-language support
- Test responses before publishing
- Activity logged: "Chatbot FAQ updated"

---

## 3. Entity Model

> **Note:** The chatbot module creates RIUs (Risk Intelligence Units) of type `chatbot_transcript`. The CHATBOT_CONVERSATION entity below is the detailed tracking table; on conversation completion, an RIU is created linking to this conversation. See Section 1.1 for the RIU→Case flow.

### 3.1 Chatbot Conversation

The primary entity tracking all chatbot interactions:

```
CHATBOT_CONVERSATION
├── Core Fields
│   ├── id (UUID)
│   ├── organization_id (tenant)
│   ├── business_unit_id (FK, nullable - from employee's BU)
│   ├── reference_number (CHAT-2026-00001)
│   ├── session_id (browser session identifier)
│   ├── conversation_type (INTAKE, POLICY_QA, STATUS_CHECK, DISCLOSURE, INQUIRY, MIXED)
│   ├── status (ACTIVE, COMPLETED, ABANDONED, ESCALATED, PAUSED)
│   ├── created_at, updated_at
│
├── Identity
│   ├── is_anonymous (boolean)
│   ├── employee_id (FK to User, if authenticated)
│   ├── employee_email (if authenticated)
│   ├── employee_name (if authenticated)
│   ├── anonymous_access_code (for anonymous resume/status)
│   ├── hris_snapshot (JSONB - employee data at conversation time)
│
├── Language
│   ├── detected_language (ISO code)
│   ├── confirmed_language (if user corrected)
│   ├── translation_enabled (boolean)
│
├── Transcript
│   ├── messages[] (JSONB array)
│   │   ├── id (UUID)
│   │   ├── role (USER, ASSISTANT, SYSTEM)
│   │   ├── content (message text)
│   │   ├── content_original (if translated)
│   │   ├── timestamp
│   │   ├── message_type (TEXT, ATTACHMENT, FORM_RESPONSE, ACTION)
│   │   ├── metadata (JSONB - citations, confidence, etc.)
│   │   └── attachments[] (file references)
│   ├── message_count
│   ├── last_message_at
│   ├── last_user_message_at
│
├── Context (accumulated during conversation)
│   ├── extracted_data (JSONB)
│   │   ├── case_draft (partial case data)
│   │   ├── disclosure_draft (partial disclosure data)
│   │   ├── inquiry_draft (question details)
│   │   ├── detected_category
│   │   ├── detected_severity
│   │   ├── detected_subjects[]
│   │   └── detected_location
│   ├── current_flow (which guided flow is active)
│   ├── flow_step (current step in flow)
│   ├── pending_questions[] (questions waiting for answer)
│
├── RIU & Resulting Entities (per RIU→Case architecture)
│   ├── riu_id (FK to RIU) ← ALWAYS created on conversation completion
│   ├── resulting_case_id (FK to Case) ← Only if outcome requires Case
│   ├── resulting_disclosure_id (FK to Disclosure)
│   ├── resulting_inquiry_id (FK to Inquiry)
│   ├── resulting_entity_type (CASE, DISCLOSURE, INQUIRY, NONE)
│   ├── case_creation_reason (INTAKE_COMPLETED, USER_ESCALATION, AI_FLAGGED, THRESHOLD_MET)
│   ├── submitted_at
│
├── Resume & Continuity
│   ├── is_resumable (boolean)
│   ├── resume_expires_at (timestamp)
│   ├── resumed_from_id (FK to previous conversation, if resumed)
│   ├── abandoned_at
│   ├── abandonment_reason (TIMEOUT, USER_EXIT, ERROR)
│
├── Access Point
│   ├── access_point (ETHICS_PORTAL_WIDGET, EMPLOYEE_PORTAL, STANDALONE, NOTIFICATION_LINK)
│   ├── entry_context (JSONB - what triggered the conversation)
│   │   ├── source_notification_id
│   │   ├── preloaded_context (for notification-triggered)
│   │   └── referrer_url
│
├── Handoff
│   ├── handoff_offered (boolean)
│   ├── handoff_accepted (boolean)
│   ├── handoff_type (HOTLINE, LIVE_CHAT, FORM)
│   ├── handoff_reference (code for operator lookup)
│
├── Compliance
│   ├── consent_captured (boolean)
│   ├── consent_captured_at
│   ├── ip_address
│   ├── user_agent
│   ├── data_residency_region
│
└── Metadata
    ├── started_at
    ├── completed_at
    ├── total_duration_seconds
    ├── ai_model_version
```

### 3.2 Chatbot Inquiry

For Tier 3 escalations that need human response. Note: Inquiries may or may not create Cases depending on configuration. The chatbot RIU (`chatbot_transcript`) is always created and linked.

```
CHATBOT_INQUIRY
├── Core Fields
│   ├── id (UUID)
│   ├── organization_id (tenant)
│   ├── reference_number (INQ-2026-00001)
│   ├── conversation_id (FK to Chatbot Conversation)
│   ├── riu_id (FK to RIU) ← Links to chatbot_transcript RIU
│   ├── status (PENDING, ASSIGNED, IN_PROGRESS, ANSWERED, CLOSED, ESCALATED_TO_CASE)
│   ├── created_at, updated_at
│
├── Submitter
│   ├── is_anonymous (boolean)
│   ├── employee_id (FK, if authenticated)
│   ├── employee_email
│   ├── employee_name
│   ├── employee_department
│   ├── anonymous_access_code
│
├── Question
│   ├── question_text (user's original question)
│   ├── question_summary (AI-generated summary)
│   ├── conversation_context (relevant transcript excerpt)
│   ├── full_transcript_available (boolean)
│   ├── ai_attempted_answer (what AI said before escalating)
│   ├── ai_confidence_score (0-100)
│   ├── escalation_reason (LOW_CONFIDENCE, USER_REQUESTED, COMPLEX_SITUATION)
│
├── Classification
│   ├── topic_category (POLICY, PROCEDURE, SITUATION, REPORTING, OTHER)
│   ├── related_policies[] (policy IDs that might apply)
│   ├── urgency (NORMAL, HIGH)
│   ├── tags[]
│
├── Assignment
│   ├── assigned_to_id (FK to User)
│   ├── assigned_to_name
│   ├── assigned_at
│   ├── assigned_by
│   ├── queue_id (FK to Queue, if using queues)
│
├── Response
│   ├── response_text (compliance team's answer)
│   ├── response_attachments[]
│   ├── response_policies_cited[] (links to policies)
│   ├── responded_at
│   ├── responded_by_id (FK to User)
│   ├── response_channel (CHATBOT, EMAIL, PORTAL)
│   ├── response_delivered_at
│   ├── response_read_at
│
├── Follow-up
│   ├── follow_up_questions[] (if employee has more questions)
│   ├── thread_messages[] (back-and-forth)
│
├── SLA
│   ├── sla_due_at
│   ├── sla_warning_sent_at
│   ├── sla_breached (boolean)
│   ├── sla_breached_at
│
├── Escalation (if becomes a Case)
│   ├── escalated_to_case_id (FK to Case)
│   ├── escalated_at
│   ├── escalated_by
│   ├── escalation_reason
│
└── Metadata
    ├── created_at
    ├── closed_at
    ├── closed_by
    ├── closure_reason
```

### 3.3 Knowledge Base Document

Documents that power the AI's policy knowledge:

```
KNOWLEDGE_BASE_DOCUMENT
├── Core Fields
│   ├── id (UUID)
│   ├── organization_id (tenant)
│   ├── document_type (POLICY, FAQ, HANDBOOK, GUIDELINE, TRAINING, PROCEDURE, CUSTOM)
│   ├── source_type (POLICY_MODULE, UPLOAD, MANUAL_ENTRY, URL)
│   ├── status (ACTIVE, INACTIVE, PENDING_INDEX, INDEX_FAILED)
│   ├── created_at, updated_at
│
├── Content
│   ├── title
│   ├── description
│   ├── content (full text, extracted from documents)
│   ├── content_format (PLAIN_TEXT, MARKDOWN, HTML)
│   ├── file_path (S3 reference, if uploaded file)
│   ├── file_type (PDF, DOCX, TXT, etc.)
│   ├── file_size_bytes
│   ├── source_url (if from URL)
│   ├── source_policy_id (FK to Policy, if from Policy Module)
│
├── Chunking & Embeddings
│   ├── chunks[] (JSONB array of text chunks)
│   │   ├── chunk_id
│   │   ├── chunk_text
│   │   ├── chunk_order
│   │   ├── start_position
│   │   ├── end_position
│   ├── embeddings (pgvector - stored separately for performance)
│   ├── embedding_model_version
│   ├── last_indexed_at
│   ├── index_error (if failed)
│
├── Metadata
│   ├── author
│   ├── version
│   ├── effective_date
│   ├── expiry_date
│   ├── language
│   ├── keywords[]
│   ├── categories[]
│
├── Usage Statistics
│   ├── citation_count (how often referenced in answers)
│   ├── last_cited_at
│   ├── helpfulness_score (from user feedback)
│
└── Admin
    ├── uploaded_by
    ├── approved_by
    ├── approved_at
    ├── notes
```

### 3.4 Knowledge Base Chunk Embedding

Separate table for pgvector performance:

```
KNOWLEDGE_BASE_EMBEDDING
├── id (UUID)
├── document_id (FK to Knowledge Base Document)
├── organization_id (tenant)
├── chunk_id (matches chunk in document)
├── chunk_text (denormalized for retrieval)
├── embedding (vector(1536) - pgvector)
├── created_at
```

### 3.5 Chatbot Consent Log

Immutable audit trail of consent:

```
CHATBOT_CONSENT_LOG
├── id (UUID)
├── conversation_id (FK)
├── organization_id
├── consent_type (AI_USE, DATA_RETENTION, RECORDING, TERMS_OF_USE)
├── consent_version (version of consent text)
├── consent_text_shown (exact text displayed)
├── consent_given (boolean)
├── captured_at (timestamp)
├── ip_address
├── user_agent

-- This table is APPEND-ONLY (no updates or deletes)
```

### 3.6 Chatbot Configuration

Per-tenant chatbot settings:

```
CHATBOT_CONFIGURATION
├── id (UUID)
├── organization_id (tenant, unique)
│
├── General
│   ├── is_enabled (boolean)
│   ├── welcome_message
│   ├── welcome_message_translations (JSONB)
│   ├── fallback_message (when AI can't help)
│   ├── hotline_number
│   ├── hotline_hours
│   ├── support_email
│
├── Features
│   ├── intake_enabled (boolean)
│   ├── policy_qa_enabled (boolean)
│   ├── status_check_enabled (boolean)
│   ├── disclosure_enabled (boolean)
│   ├── inquiry_enabled (boolean)
│
├── AI Behavior
│   ├── confidence_threshold_tier1 (0-100, above = direct answer)
│   ├── confidence_threshold_tier2 (0-100, above = guidance, below = escalate)
│   ├── max_clarifying_questions (before offering escalation)
│   ├── always_show_escalation_option (boolean)
│   ├── ai_personality (PROFESSIONAL, FRIENDLY, FORMAL)
│
├── Knowledge Base
│   ├── include_policy_module (boolean - auto-index published policies)
│   ├── faq_enabled (boolean)
│   ├── custom_uploads_enabled (boolean)
│
├── Languages
│   ├── default_language
│   ├── supported_languages[]
│   ├── auto_detect_language (boolean)
│   ├── translate_for_reviewers (boolean)
│
├── Proactive
│   ├── proactive_prompts_enabled (boolean)
│   ├── disclosure_reminders_enabled (boolean)
│   ├── contextual_help_enabled (boolean)
│
├── Resume
│   ├── resume_enabled (boolean)
│   ├── resume_timeout_hours (default 48)
│   ├── save_abandoned_conversations (boolean)
│
├── Compliance
│   ├── consent_required (boolean)
│   ├── consent_text
│   ├── consent_text_translations (JSONB)
│   ├── data_residency_region
│
├── SLA
│   ├── inquiry_sla_hours (default 24)
│   ├── sla_warning_threshold_percent (default 80)
│
└── Metadata
    ├── created_at, updated_at
    ├── updated_by
```

### 3.7 FAQ Entry

Pre-defined Q&A pairs for common questions:

```
FAQ_ENTRY
├── id (UUID)
├── organization_id (tenant)
├── category (GENERAL, REPORTING, DISCLOSURE, POLICY, PROCEDURE)
├── question (the question employees might ask)
├── question_variations[] (alternate phrasings)
├── answer (the approved response)
├── answer_translations (JSONB)
├── related_policies[] (FK to policies)
├── related_documents[] (FK to knowledge base docs)
├── is_active (boolean)
├── display_order
├── view_count
├── helpful_count
├── not_helpful_count
├── created_at, created_by
├── updated_at, updated_by
```

### 3.8 Chatbot Activity Log

Immutable audit trail:

```
CHATBOT_ACTIVITY
├── id (UUID)
├── conversation_id (FK)
├── inquiry_id (FK, nullable)
├── organization_id
│
├── Activity
│   ├── activity_type (STARTED, MESSAGE_SENT, MESSAGE_RECEIVED,
│   │                  ATTACHMENT_UPLOADED, CONSENT_CAPTURED,
│   │                  FLOW_STARTED, FLOW_COMPLETED,
│   │                  RIU_CREATED, CASE_CREATED, SUBMISSION_CREATED,
│   │                  ESCALATED, INQUIRY_CREATED, INQUIRY_ASSIGNED,
│   │                  INQUIRY_ANSWERED, RESUMED, ABANDONED,
│   │                  HANDOFF_OFFERED, HANDOFF_ACCEPTED,
│   │                  KNOWLEDGE_SEARCHED, AI_RESPONSE_GENERATED)
│   ├── description
│   ├── details (JSONB)
│
├── Actor
│   ├── actor_type (USER, SYSTEM, AI, COMPLIANCE_OFFICER)
│   ├── actor_id (FK to User, nullable)
│   ├── actor_name
│
├── Context
│   ├── ip_address
│   ├── user_agent
│   ├── session_id
│
├── created_at (immutable)

-- This table is APPEND-ONLY (no updates or deletes)
-- All entries ALSO written to unified AUDIT_LOG for cross-module queries
```

**AI-First Design Notes:**
- Conversation transcript preserves natural language for AI context
- `ai_model_version` tracks which model generated responses
- Activity log descriptions capture human-readable context
- Knowledge base documents enable RAG-based policy Q&A
- Extracted data from conversations provides structured context for AI summarization
- All activity logged to both `CHATBOT_ACTIVITY` and unified `AUDIT_LOG`

**RIU→Case Architecture Notes:**
- Every completed conversation creates an RIU (type: `chatbot_transcript`)
- RIU is immutable record of what was said; Case is mutable work container
- RIU always created; Case creation is outcome-based (see Section 1.1)
- Non-Case RIUs still provide analytics value (common questions, drop-off patterns)
- Activity logged on RIU creation: "System created RIU from chatbot {conversation_type}"

---

## 3. Use Cases & Conversation Flows

### 3.1 Report Intake (Speak-Up)

**Purpose:** Guide employees through submitting an ethics/compliance report conversationally.

**Entry Points:**
- Ethics Portal widget: "Report a concern"
- Employee Portal: "Submit a report"
- Direct URL: `/chatbot/report`

**Flow:**

```
1. CONSENT & INTRODUCTION
   ├── Display consent notice (AI use, data retention)
   ├── User accepts to continue
   └── "I'll help you report a concern. Your report can be anonymous if you prefer."

2. ANONYMOUS DECISION
   ├── "Would you like to remain anonymous?"
   ├── If YES → Generate access code, explain its importance
   └── If NO → Collect contact info (or use SSO data)

3. NARRATIVE CAPTURE
   ├── "Please describe what happened or what you're concerned about."
   ├── "Take your time - you can share as much or as little as you'd like."
   ├── User provides narrative (can be multiple messages)
   ├── AI acknowledges: "Thank you for sharing that."
   └── "I have a few follow-up questions to help us understand the situation better."

4. GUIDED QUESTIONS (one at a time)
   ├── LOCATION
   │   ├── "Where did this happen?"
   │   ├── Show location picker OR "I'll help you find the location"
   │   └── AI can suggest based on narrative ("It sounds like this was at the Chicago office?")
   │
   ├── TIMING
   │   ├── "When did this happen?"
   │   ├── "Is this still happening?" / "Is this a one-time or ongoing situation?"
   │   └── Collect approximate dates
   │
   ├── SUBJECTS (people involved)
   │   ├── "Can you tell me who was involved?"
   │   ├── "Do you know their name, title, or department?"
   │   ├── HRIS lookup (if authenticated): "Is this [Name, Title]?"
   │   └── Can add multiple subjects
   │
   ├── CATEGORY
   │   ├── AI suggests based on narrative: "This sounds like it may involve [category]. Is that right?"
   │   ├── If unsure, show category picker
   │   └── Secondary category optional
   │
   ├── SEVERITY ASSESSMENT
   │   ├── "Is anyone in immediate danger?"
   │   ├── "Is this situation currently happening?"
   │   └── AI determines HIGH/MEDIUM/LOW, may escalate immediately if HIGH

5. CUSTOM QUESTIONS (if configured by client)
   ├── General questions (all reports)
   └── Category-specific questions (triggered by category selection)

6. ATTACHMENTS
   ├── "Do you have any documents, photos, or other evidence to share?"
   ├── Drag-and-drop or file picker
   ├── Can skip: "No, I don't have anything to attach"
   └── Can add multiple

7. REVIEW & SUBMIT
   ├── "Here's a summary of your report:"
   ├── Display summary in readable format
   ├── "Is there anything you'd like to add or change?"
   ├── Allow edits via conversation ("Actually, the date was...")
   └── Confirm submission

8. CONFIRMATION
   ├── Display case reference number
   ├── If anonymous: Remind of access code, explain how to check status
   ├── If identified: Explain email notifications
   ├── "What happens next" explanation
   └── Offer to start new conversation or exit

HANDOFF OPTION (available throughout):
   ├── "I'd prefer to talk to someone" / "Can I call instead?"
   ├── Display hotline number and hours
   ├── "Your progress has been saved. Reference code: [CODE]"
   └── "When you call, you can mention this code and we'll have your information ready."
```

**RIU & Case Creation (per RIU→Case Architecture):**
- **Always creates RIU** (type: `chatbot_transcript`) with full conversation
- **Case creation is outcome-based:**
  - Intake completed (report submitted)? → Create Case, link RIU as 'primary'
  - User clicked "Submit Report"? → Create Case
  - Abandoned mid-intake? → RIU only (no Case, preserves partial data for analytics)
- Case created with `source_channel = CHATBOT`
- No QA required (same as web form submissions)
- Triggers routing/assignment rules
- RIU linked to Case via `riu_case_associations` (association_type: 'primary')

### 3.2 Policy Q&A (Tiered Model)

**Purpose:** Answer employee questions about policies, procedures, and compliance topics.

**Entry Points:**
- Ethics Portal widget: "Ask a question"
- Employee Portal: "Policy questions"
- Direct URL: `/chatbot/ask`

**Tier Model:**

```
TIER 1: DIRECT ANSWER (High Confidence)
├── Trigger: AI confidence > tier1_threshold (default 85)
├── Response format:
│   "Based on Policy 4.2 (Gift & Entertainment Policy):
│   The limit for business gifts is $100 per recipient per year.
│
│   📄 View full policy: [Link]"
├── Always include citation and source link
└── Offer: "Does this answer your question?"

TIER 2: SITUATIONAL GUIDANCE (Medium Confidence)
├── Trigger: AI confidence 50-85
├── Response format:
│   "This situation may depend on a few factors. Let me ask some
│   clarifying questions to give you better guidance.
│
│   - Is the vendor a government entity?
│   - What is the approximate value?
│   - Is this a one-time gift or recurring?"
├── After clarification:
│   "Based on what you've shared, here's my recommendation:
│   [Guidance with confidence level]
│
│   ⚠️ Note: This is general guidance based on our policies.
│   For situations involving [complexity], I'd recommend
│   confirming with the compliance team."
└── Always offer: "Would you like me to send this question to our compliance team for confirmation?"

TIER 3: ASYNC ESCALATION (Low Confidence / User Request)
├── Trigger: AI confidence < 50 OR user requests human
├── Response:
│   "This is a great question that I think warrants a response from
│   our compliance team directly. They can give you specific guidance
│   for your situation.
│
│   Would you like me to send your question to them? They typically
│   respond within 1 business day."
├── If YES: Create CHATBOT_INQUIRY
├── Creates RIU (type: chatbot_transcript) with escalation flag
├── Creates Case if inquiry requires formal tracking (configurable)
├── Confirmation:
│   "I've sent your question to the compliance team.
│   Reference: INQ-2026-00042
│
│   You'll receive a notification when they respond. You can also
│   check back here anytime."
└── Question + full context sent to compliance

ONE-CLICK ESCALATION (Always Visible):
├── Persistent option: "I'd prefer to ask a human"
├── Available at any point in conversation
├── Creates RIU (type: chatbot_transcript) capturing conversation
└── Creates inquiry with full conversation context
```

**Escalation Options (All Available):**
1. Create inquiry (Tier 3)
2. Show relevant policy links
3. Direct to hotline/email
4. Let user choose

### 3.3 Case Status Check

**Purpose:** Allow reporters to check status and communicate about their case.

**Entry Points:**
- Ethics Portal widget: "Check case status"
- Employee Portal: "My reports"
- Direct URL with code: `/chatbot/status?code=ABC123`
- Notification link

**Flow:**

```
AUTHENTICATION:
├── Anonymous reporters:
│   ├── "Please enter your access code"
│   ├── Validate code
│   ├── On failure: "I couldn't find a report with that code.
│   │   Please check the code and try again."
│   └── Max 5 attempts, then suggest hotline
│
└── Authenticated users:
    ├── Auto-lookup cases by employee_id
    └── "I found [N] reports associated with your account."

STATUS DISPLAY:
├── "Here's the current status of your report:"
├── Reference: ETH-2026-00042
├── Status: Under Investigation
├── Last updated: January 15, 2026
├──
└── "The compliance team is actively reviewing your report."

MESSAGES:
├── "You have [N] new message(s) from the compliance team:"
├── Display messages
└── "Would you like to reply?"

REPLY CAPABILITY:
├── "Type your message below"
├── Attachment support
├── Send confirmation
└── "Your message has been sent to the compliance team."

ADDITIONAL ACTIONS:
├── "Add more information to my report"
├── "I have a new concern to report"
└── "I have a question about the process"
```

### 3.4 Disclosure Assistance

**Purpose:** Help employees complete disclosure forms conversationally.

**Entry Points:**
- Employee Portal notification: "Your COI disclosure is due"
- Employee Portal: "Submit a disclosure"
- Direct URL: `/chatbot/disclosure?type=coi`

**Flow:**

```
CONTEXT LOADING:
├── If from notification: Pre-load disclosure type and context
├── If general: "What type of disclosure would you like to make?"
│   ├── Conflict of Interest
│   ├── Gift or Entertainment
│   ├── Outside Employment
│   └── Other

TRIAGE (Optional):
├── "Not sure if you need to disclose? Let me help."
├── "Do you have any financial interest in a company that does business with us?"
├── Guide through decision tree
└── "Based on your answers, you [do/do not] need to submit a disclosure."

CONVERSATIONAL FORM:
├── For each disclosure form field:
│   ├── Ask question in natural language
│   ├── Explain why it matters: "We ask this to..."
│   ├── Provide examples if helpful
│   ├── Handle edge cases: "What if I'm not sure of the value?"
│   └── Validate input and confirm
│
├── Example (COI):
│   "What is your relationship to [Company Name]?
│   For example: You own stock, you're on their board,
│   a family member works there, etc."
│
└── Complex fields:
    ├── External party lookup
    ├── Date pickers
    └── Currency/value inputs

REVIEW & SUBMIT:
├── Summary of all responses
├── "Please review and confirm this is accurate"
├── Allow corrections: "Actually, the value was..."
└── Submit creates Disclosure entity (PRD-006)

CONFIRMATION:
├── Reference number
├── Next steps (if requires review)
├── "You can update this disclosure anytime from your portal"

RIU CREATION (per RIU→Case architecture):
├── Creates RIU type: disclosure_response (NOT chatbot_transcript)
├── This is a Disclosures module RIU, not a Chatbot RIU
├── Chatbot is just the UI layer; Disclosures module owns the RIU
├── Case created only if disclosure thresholds met (per Disclosures PRD-006)
```

### 3.5 Compliance Team Inquiry

**Purpose:** Submit questions to the compliance team when AI cannot help.

**Flow:**

```
QUESTION CAPTURE:
├── "What would you like to ask the compliance team?"
├── User types question
├── AI may ask: "To help them answer faster, can you share
│   any additional context about your situation?"
└── Optional attachments

REVIEW:
├── "Here's what I'll send to the compliance team:"
├── Display question summary
├── "Would you like to add anything?"
└── Confirm submission

CONFIRMATION:
├── Reference: INQ-2026-00042
├── "Typical response time: 1 business day"
├── "You'll be notified when they respond"
└── "You can check back here anytime to see their response"

RESPONSE DELIVERY:
├── Notification sent when answered
├── Employee returns to chatbot
├── Response displayed in chat context
├── Can ask follow-up questions
└── Thread continues until resolved
```

---

## 4. Knowledge Base Architecture

### 4.1 Document Sources

| Source | Auto-Index | Manual Upload | Notes |
|--------|------------|---------------|-------|
| Policy Module | Yes (if enabled) | N/A | Published policies auto-indexed |
| FAQ Entries | Yes | Via admin UI | Pre-approved Q&A pairs |
| Handbooks | No | Upload required | Company handbooks, guides |
| Procedures | No | Upload required | SOPs, process docs |
| Training Materials | No | Upload required | Optional inclusion |
| Custom Documents | No | Upload required | Any relevant content |

### 4.2 Document Processing Pipeline

```
UPLOAD/UPDATE
     │
     ▼
┌─────────────────────┐
│  Extract Text       │ ← PDF, DOCX, TXT extraction
│  (Preserve format)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Clean & Normalize  │ ← Remove headers/footers, normalize spacing
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Chunk Document     │ ← Split into semantic chunks (~500 tokens each)
│  (Overlap enabled)  │   with 50-token overlap
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Generate           │ ← Claude API for embeddings
│  Embeddings         │   Store in pgvector
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Index Complete     │ ← Mark document as ACTIVE
│  (Ready for search) │
└─────────────────────┘
```

### 4.3 Semantic Search

**Query Flow:**

```
USER QUESTION
     │
     ▼
┌─────────────────────┐
│  Generate Query     │ ← Same embedding model
│  Embedding          │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Vector Similarity  │ ← pgvector <-> operator
│  Search             │   Top 10 chunks
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Retrieve Full      │ ← Get surrounding context
│  Context            │   Link to source documents
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Generate Answer    │ ← Claude API with retrieved context
│  (with citations)   │   Include source references
└─────────────────────┘
```

### 4.4 Citation Format

```
"Based on the **Gift & Entertainment Policy** (Section 4.2):

> 'Employees may not accept gifts valued at more than $100 USD
> from any single vendor, customer, or business partner in a
> calendar year.'

This means you would need to politely decline the tickets,
as they exceed the annual limit.

📄 **Source:** Gift & Entertainment Policy v2.3 (Updated Jan 2026)
   [View Full Policy →]"
```

---

## 5. Multi-Language Support

### 5.1 Language Detection

```
USER FIRST MESSAGE
     │
     ▼
┌─────────────────────┐
│  Detect Language    │ ← AI-based detection
│  (Claude API)       │
└──────────┬──────────┘
           │
           ├── Confidence > 90%: Use detected language
           │
           └── Confidence < 90%: Confirm with user
               "It looks like you're writing in Spanish.
                Would you like to continue in Spanish?"
```

### 5.2 Conversation Translation

| Direction | When | How |
|-----------|------|-----|
| User → AI | Every message | Original preserved, AI responds in user's language |
| AI → User | Every response | Generated in user's language |
| Full transcript → Reviewer | On demand / submission | Translated to reviewer's language |
| Audit trail | Always | Both original and translated stored |

### 5.3 Knowledge Base Language Handling

- Documents indexed in original language
- Cross-language search supported (query translated before search)
- Answers generated in user's language regardless of source document language

---

## 6. Access Points & Placement

### 6.1 Ethics Portal Widget (Public)

**Characteristics:**
- Floating chat bubble (bottom-right)
- No login required
- Client-branded
- Available on all Ethics Portal pages

**Capabilities:**
- Report intake (anonymous)
- Policy Q&A (anonymous)
- Case status check (with access code)
- Basic inquiries

**UI:**
```
┌──────────────────────────────────────────────┐
│                                              │
│            [Ethics Portal Content]           │
│                                              │
│                                              │
│                                              │
│                                         ┌──┐ │
│                                         │💬│ │ ← Chat bubble
│                                         └──┘ │
└──────────────────────────────────────────────┘

On click:
┌──────────────────────────────────────────────┐
│                                   ┌────────┐ │
│                                   │ Chat   │ │
│                                   │ Window │ │
│                                   │        │ │
│                                   │ ────── │ │
│                                   │ [type] │ │
│                                   └────────┘ │
└──────────────────────────────────────────────┘
```

### 6.2 Employee Portal Embedded (Authenticated)

**Characteristics:**
- Full chat experience in Employee Portal
- SSO authenticated
- Full feature set
- Proactive prompts

**Capabilities:**
- All features from widget
- Disclosure assistance
- Full case history
- Proactive notifications

**UI:**
```
┌──────────────────────────────────────────────┐
│ ┌──────────┐                                 │
│ │ My Tasks │                                 │
│ │ Cases    │  ┌────────────────────────────┐ │
│ │ Disclose │  │                            │ │
│ │ Policies │  │    [Embedded Chat]         │ │
│ │          │  │                            │ │
│ │ ───────  │  │    Full conversation       │ │
│ │ Ask AI 💬│  │    history visible         │ │
│ └──────────┘  │                            │ │
│               │    [Type message...]       │ │
│               └────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### 6.3 Standalone Page

**Characteristics:**
- Dedicated URL (`/chatbot`)
- Deep-linkable
- Mobile-optimized
- Both anonymous and authenticated

**Use Cases:**
- Notification links: `/chatbot?context=disclosure-reminder&id=123`
- Marketing/awareness campaigns
- Mobile-first users

---

## 7. Proactive Capabilities

### 7.1 Notification-Triggered

| Trigger Event | Chatbot Context |
|---------------|-----------------|
| COI disclosure due | Pre-load disclosure type, employee info |
| Campaign assignment | Pre-load campaign details, due date |
| New message on case | Pre-load case context, show message |
| Inquiry answered | Pre-load inquiry, display response |
| Policy attestation due | Pre-load policy, guide through attestation |

**Flow:**
```
EMAIL/IN-APP NOTIFICATION
"Your annual COI disclosure is due in 7 days"
[Complete Now →]
     │
     ▼
CHATBOT OPENS WITH CONTEXT
"Hi [Name]! I'm here to help you complete your
Conflicts of Interest disclosure.

You have until [Date] to submit.

Shall we get started?"
```

### 7.2 Contextual Prompts

| Location | Prompt | Frequency |
|----------|--------|-----------|
| Ethics Portal homepage | "Need help finding something?" | Once per session |
| Policy page | "Questions about this policy?" | On scroll to bottom |
| After 30s inactivity | "I'm here if you need help." | Max once per hour |

**Design Principles:**
- Subtle, not intrusive
- Ignorable (small, non-modal)
- Never block content
- Respect "don't show again"

### 7.3 Reactive (Default)

- Chat icon visible but dormant
- Opens only when clicked
- No unsolicited messages

---

## 8. Continuity & Draft Management

### 8.1 Auto-Save

- Every message saved immediately
- Draft state captured after each user input
- Resume token generated for anonymous users

### 8.2 Resume Flow

```
RETURNING USER (within timeout)
     │
     ├── Authenticated: Check for active/paused conversations
     │   "Welcome back! You have an unfinished report.
     │    Would you like to continue?"
     │   [Continue] [Start Fresh]
     │
     └── Anonymous: Prompt for access code (if applicable)
         OR detect via session if same device/browser
```

### 8.3 Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `resume_timeout_hours` | 48 | How long before conversations expire |
| `save_abandoned_conversations` | true | Keep abandoned for analytics |
| `max_resume_attempts` | 3 | Before suggesting start fresh |

### 8.4 Abandonment Tracking

```
CONVERSATION ABANDONMENT:
├── User closes window without submitting
├── Session timeout (30 min inactivity)
├── Browser navigation away
└── Explicit abandon ("Cancel", "Start over")

WHAT'S CAPTURED:
├── How far they got in flow
├── Last message content
├── Time spent
├── Whether they resumed later
└── Whether they completed via other channel
```

---

## 9. Human Handoff

### 9.1 Hotline Handoff

```
USER: "I'd rather talk to someone"
     │
     ▼
CHATBOT:
"I completely understand. Here's how you can reach our hotline:

📞 1-800-XXX-XXXX
⏰ Available 24/7

Your conversation has been saved with reference code: CHAT-2026-00042

When you call, you can share this code and the operator will have
your information ready. This can save time during the call.

Would you like me to keep this window open while you call?"
```

### 9.2 Operator Draft Lookup

**Operator Console Integration:**
- Caller mentions chatbot code
- Operator enters code in Console
- Draft conversation and extracted data displayed
- Operator can continue from where chatbot left off

### 9.3 Live Chat (Future)

- Not in MVP
- Could add in-app live chat if client staffs it
- Would integrate with Operator Console

---

## 10. Permissions & Visibility

### 10.1 Conversation Access

| Role | Own Conversations | Team Conversations | All Conversations |
|------|-------------------|--------------------|--------------------|
| Employee | View only | ✗ | ✗ |
| Compliance Officer | ✗ | Scoped | Scoped |
| Admin | ✗ | ✓ | ✓ |

### 10.2 Inquiry Access

| Permission | Compliance Officer | Admin |
|------------|-------------------|-------|
| View all inquiries | Scoped | ✓ |
| Assign inquiries | ✓ | ✓ |
| Respond to inquiries | ✓ | ✓ |
| Configure chatbot | ✗ | ✓ |
| Manage knowledge base | Limited | ✓ |

### 10.3 Knowledge Base Access

| Permission | Compliance Officer | Admin |
|------------|-------------------|-------|
| View documents | ✓ | ✓ |
| Upload documents | ✓ | ✓ |
| Approve documents | ✗ | ✓ |
| Delete documents | ✗ | ✓ |
| Manage FAQs | ✓ | ✓ |

---

## 11. Compliance & Audit

### 11.1 Consent Capture

**Before First Interaction:**

```
┌────────────────────────────────────────────┐
│                                            │
│  Before we begin, please note:             │
│                                            │
│  • This conversation uses AI to help       │
│    answer your questions                   │
│  • Your conversation will be recorded      │
│    for compliance purposes                 │
│  • You can request human assistance        │
│    at any time                             │
│                                            │
│  [View full terms]                         │
│                                            │
│  ┌────────────────────────────────────┐   │
│  │ I understand and agree to continue │   │
│  └────────────────────────────────────┘   │
│                                            │
│  [Cancel]                                  │
└────────────────────────────────────────────┘
```

**Consent Record (Immutable):**
- Exact text shown
- Timestamp
- IP address
- User agent
- Linked to conversation

### 11.2 Audit Trail

**Captured for Every Conversation:**
- Full transcript (original + translated)
- All timestamps
- IP addresses
- Session identifiers
- AI model version used
- Confidence scores for AI responses
- All entity creation events
- All file uploads/attachments

### 11.3 Data Residency

**Configuration Per Client:**
- Conversation data storage region
- Follows same tenant isolation as platform
- Embeddings/vectors co-located with data
- AI API calls may route to regional endpoints

### 11.4 Retention

| Data Type | Default Retention | Configurable |
|-----------|-------------------|--------------|
| Completed conversations | 7 years | Yes |
| Abandoned conversations | 90 days | Yes |
| Consent logs | 7 years | No (regulatory) |
| Inquiry threads | 7 years | Yes |
| Knowledge base versions | Indefinite | Yes |

---

## 12. Integration Points

### 12.1 Internal Modules

| Module | Integration | Direction |
|--------|-------------|-----------|
| **RIU System** | Creates RIU (type: chatbot_transcript) on completion | Chatbot → RIU |
| Case Management (PRD-005) | Links RIU to Case via `riu_case_associations` when outcome requires Case | Chatbot → RIU → Cases |
| Disclosures (PRD-006) | Creates disclosures (creates disclosure_response RIU) | Chatbot → Disclosures |
| Policy Management (PRD-009) | Sources knowledge base | Policies → Chatbot |
| HRIS (PRD-010) | Employee lookup | HRIS → Chatbot |
| Notifications | Triggers proactive prompts | Notifications → Chatbot |
| Employee Portal (PRD-003) | Embedded chat | Shared UI |
| Operator Console (PRD-002) | Draft handoff (lookup by RIU reference) | Chatbot → Console |

### 12.2 External APIs

| API | Purpose | Notes |
|-----|---------|-------|
| Claude API | Conversation AI, embeddings | Primary AI provider |
| Translation API | Multi-language support | Same as Case Management |
| File Storage (S3) | Attachments, documents | Multi-tenant buckets |

### 12.3 Webhook Events

```
CHATBOT_CONVERSATION_STARTED
CHATBOT_CONVERSATION_COMPLETED
CHATBOT_RIU_CREATED           ← Always fired on conversation completion
CHATBOT_CASE_CREATED          ← Only when outcome requires Case
CHATBOT_RIU_CASE_LINKED       ← When RIU linked to Case
CHATBOT_DISCLOSURE_CREATED
CHATBOT_INQUIRY_CREATED
CHATBOT_INQUIRY_ASSIGNED
CHATBOT_INQUIRY_ANSWERED
CHATBOT_HANDOFF_REQUESTED
```

---

## 13. API Endpoints

### 13.1 Conversation Management

```
# Start new conversation
POST   /api/v1/chatbot/conversations
Body: {
  conversation_type: "INTAKE" | "POLICY_QA" | "STATUS_CHECK" | "DISCLOSURE" | "INQUIRY",
  access_point: "ETHICS_PORTAL_WIDGET" | "EMPLOYEE_PORTAL" | "STANDALONE",
  entry_context?: { ... },
  language?: "en" | "es" | "fr" | ...
}
Returns: { conversation_id, access_code (if anonymous), welcome_message }

# Get conversation
GET    /api/v1/chatbot/conversations/{id}
Returns: Full conversation object with transcript

# Send message
POST   /api/v1/chatbot/conversations/{id}/messages
Body: {
  content: "User message text",
  attachments?: [file_ids]
}
Returns: {
  user_message: { ... },
  assistant_response: {
    content: "AI response",
    citations?: [...],
    confidence?: 85,
    tier?: 1 | 2 | 3,
    suggested_actions?: [...]
  }
}

# Check for resumable conversation
GET    /api/v1/chatbot/conversations/resumable
Query: ?access_code=ABC123 OR authenticated
Returns: { has_resumable: true, conversation_id, summary }

# Abandon conversation
DELETE /api/v1/chatbot/conversations/{id}
Body: { reason?: "USER_EXIT" | "START_OVER" }

# Complete conversation (submit)
# Per RIU→Case architecture: ALWAYS creates RIU, Case creation is outcome-based
POST   /api/v1/chatbot/conversations/{id}/complete
Body: { submission_type: "CASE" | "DISCLOSURE" | "INQUIRY" | "NONE" }
Returns: {
  riu_id,                    // Always returned - RIU is always created
  riu_reference_number,      // RIU reference
  resulting_case_id?,        // Only if Case was created
  resulting_entity_type,     // CASE, DISCLOSURE, INQUIRY, NONE
  reference_number?          // Case/Disclosure/Inquiry reference if created
}
```

### 13.2 Anonymous Access

```
# Verify access code
POST   /api/v1/chatbot/verify-access-code
Body: { access_code: "ABC123" }
Returns: { valid: true, conversation_type: "INTAKE", has_case: true }

# Get case status via access code
GET    /api/v1/chatbot/case-status/{access_code}
Returns: {
  reference_number: "ETH-2026-00042",
  status: "Under Investigation",
  last_updated: "2026-01-15T...",
  unread_messages: 2,
  messages: [...]
}

# Send message to case via access code
POST   /api/v1/chatbot/case-status/{access_code}/messages
Body: { content: "...", attachments?: [...] }
```

### 13.3 Knowledge Base

```
# Semantic search
GET    /api/v1/chatbot/search
Query: ?query=gift+policy+limit&limit=10
Returns: {
  results: [{
    document_id,
    document_title,
    chunk_text,
    relevance_score,
    source_url
  }]
}

# List knowledge base documents
GET    /api/v1/knowledge-base/documents
Query: ?type=POLICY&status=ACTIVE&page=1&limit=25
Returns: { documents: [...], total, page }

# Upload document
POST   /api/v1/knowledge-base/documents
Body: FormData { file, document_type, title, description, ... }
Returns: { document_id, status: "PENDING_INDEX" }

# Get document
GET    /api/v1/knowledge-base/documents/{id}
Returns: Full document object

# Update document
PATCH  /api/v1/knowledge-base/documents/{id}
Body: { title?, description?, is_active?, ... }

# Delete document
DELETE /api/v1/knowledge-base/documents/{id}

# Re-index document
POST   /api/v1/knowledge-base/documents/{id}/reindex

# Sync policies from Policy Module
POST   /api/v1/knowledge-base/sync-policies
Returns: { synced_count, new_count, updated_count }
```

### 13.4 FAQ Management

```
GET    /api/v1/knowledge-base/faqs
POST   /api/v1/knowledge-base/faqs
GET    /api/v1/knowledge-base/faqs/{id}
PATCH  /api/v1/knowledge-base/faqs/{id}
DELETE /api/v1/knowledge-base/faqs/{id}
POST   /api/v1/knowledge-base/faqs/reorder
       Body: { faq_ids: [...] }
```

### 13.5 Inquiries

```
# List inquiries
GET    /api/v1/inquiries
Query: ?status=PENDING&assigned_to=me&page=1&limit=25
Returns: { inquiries: [...], total, page }

# Get inquiry detail
GET    /api/v1/inquiries/{id}
Returns: Full inquiry with conversation context

# Assign inquiry
PATCH  /api/v1/inquiries/{id}/assign
Body: { assigned_to_id }

# Respond to inquiry
POST   /api/v1/inquiries/{id}/respond
Body: {
  response_text,
  response_attachments?: [...],
  response_policies_cited?: [...]
}

# Close inquiry
POST   /api/v1/inquiries/{id}/close
Body: { closure_reason }

# Escalate to case
POST   /api/v1/inquiries/{id}/escalate-to-case
Body: { escalation_reason, category_id?, severity? }
Returns: { case_id, case_reference_number }
```

### 13.6 Configuration

```
# Get chatbot configuration
GET    /api/v1/chatbot/config
Returns: Full configuration object

# Update configuration
PATCH  /api/v1/chatbot/config
Body: { ... partial config updates }

# Get supported languages
GET    /api/v1/chatbot/languages
Returns: { supported: ["en", "es", "fr", ...] }

# Test AI response
POST   /api/v1/chatbot/test
Body: { query: "test question", include_sources: true }
Returns: { response, confidence, sources, tier }
```

### 13.7 Analytics

```
# Conversation metrics
GET    /api/v1/chatbot/analytics/conversations
Query: ?start_date=...&end_date=...&group_by=day
Returns: {
  total_conversations,
  by_type: { INTAKE: N, POLICY_QA: N, ... },
  completion_rate,
  average_duration,
  abandonment_rate,
  by_period: [...]
}

# Inquiry metrics
GET    /api/v1/chatbot/analytics/inquiries
Returns: {
  total_inquiries,
  pending_count,
  average_response_time,
  sla_compliance_rate
}

# Knowledge base metrics
GET    /api/v1/chatbot/analytics/knowledge-base
Returns: {
  document_count,
  top_cited_documents: [...],
  search_success_rate,
  unanswered_queries: [...]
}

# RIU metrics (per RIU→Case architecture)
GET    /api/v1/chatbot/analytics/rius
Query: ?start_date=...&end_date=...&group_by=day
Returns: {
  total_rius_created,
  by_outcome: { SUBMITTED: N, ESCALATED: N, RESOLVED: N, ABANDONED: N },
  case_creation_rate,         // % of RIUs that resulted in Cases
  rius_without_cases: N,      // Q&A resolved, no action needed
  common_qa_topics: [...],    // From non-Case RIUs
  drop_off_analysis: {...}    // Where abandoned RIUs stopped
}
```

---

## 14. Acceptance Criteria

### 14.1 Functional Acceptance

| ID | Criterion | Priority |
|----|-----------|----------|
| **RIU→Case Architecture** | | |
| AC-R1 | Every completed conversation creates RIU (type: chatbot_transcript) | P0 |
| AC-R2 | RIU is immutable after creation (conversation preserved) | P0 |
| AC-R3 | Case created only when outcome requires it (intake, escalation, AI flag) | P0 |
| AC-R4 | RIU linked to Case via riu_case_associations with association_type 'primary' | P0 |
| AC-R5 | Policy Q&A-only conversations create RIU but no Case | P0 |
| AC-R6 | Abandoned conversations create RIU with status ABANDONED | P1 |
| AC-R7 | Activity logged on RIU: "System created RIU from chatbot {type}" | P0 |
| **Intake** | | |
| AC-01 | Employee can complete speak-up report via guided conversation | P0 |
| AC-02 | Anonymous reporter receives access code for status checks | P0 |
| AC-03 | Completed intake creates RIU first, then Case linked via riu_case_associations | P0 |
| AC-04 | Attachments can be uploaded mid-conversation | P0 |
| AC-05 | Chatbot suggests category based on narrative | P1 |
| **Policy Q&A** | | |
| AC-06 | Tier 1 responses include citations and source links | P0 |
| AC-07 | Tier 2 asks clarifying questions before providing guidance | P0 |
| AC-08 | Tier 3 creates CHATBOT_INQUIRY with full context | P0 |
| AC-09 | One-click escalation to human always visible | P0 |
| AC-10 | Confidence level displayed appropriately | P1 |
| **Case Status** | | |
| AC-11 | Anonymous access via access code works | P0 |
| AC-12 | Case status and timeline displayed correctly | P0 |
| AC-13 | Two-way messaging works through chatbot | P0 |
| AC-14 | New messages highlighted | P0 |
| **Disclosures** | | |
| AC-15 | Disclosure completed conversationally | P0 |
| AC-16 | Creates Disclosure entity with all fields | P0 |
| AC-17 | Pre-loads context from notification | P1 |
| **Inquiries** | | |
| AC-18 | Inquiry submitted with context | P0 |
| AC-19 | Compliance can view, assign, respond | P0 |
| AC-20 | Response delivered in chatbot | P0 |
| AC-21 | SLA tracking works | P1 |
| **Knowledge Base** | | |
| AC-22 | Semantic search returns relevant results | P0 |
| AC-23 | Documents indexable (PDF, DOCX, TXT) | P0 |
| AC-24 | FAQ entries work | P1 |
| AC-25 | Policy module auto-sync works | P1 |
| **Multi-Language** | | |
| AC-26 | Language auto-detected | P0 |
| AC-27 | Conversation conducted in detected language | P0 |
| AC-28 | Translations stored for reviewers | P0 |
| **Continuity** | | |
| AC-29 | Conversation auto-saved | P0 |
| AC-30 | Resume works within timeout | P0 |
| AC-31 | Abandoned conversations logged | P1 |
| **Handoff** | | |
| AC-32 | Hotline number displayed on request | P0 |
| AC-33 | Draft reference code provided | P0 |
| AC-34 | Operator can lookup draft by code | P1 |
| **Compliance** | | |
| AC-35 | Consent captured before conversation | P0 |
| AC-36 | Full audit trail stored | P0 |
| AC-37 | Consent log immutable | P0 |
| **Access Points** | | |
| AC-38 | Ethics Portal widget works | P0 |
| AC-39 | Employee Portal embedded chat works | P0 |
| AC-40 | Standalone page works | P0 |
| AC-41 | Notification deep-links work | P1 |
| **Proactive** | | |
| AC-42 | Disclosure reminder opens with context | P1 |
| AC-43 | Contextual prompts display appropriately | P2 |

### 14.2 Performance Targets

| Metric | Target |
|--------|--------|
| First response time | < 2 seconds |
| Subsequent message response | < 3 seconds |
| Semantic search latency | < 500ms |
| Conversation load (resume) | < 1 second |
| Document indexing | < 30 seconds per document |
| Concurrent conversations | > 500 per tenant |
| Uptime | > 99.5% |

### 14.3 Security Requirements

| Requirement | Implementation |
|-------------|----------------|
| Tenant isolation | RLS on all tables |
| Encryption at rest | AES-256 |
| Encryption in transit | TLS 1.3 |
| Access code entropy | Cryptographically random, 12+ chars |
| Session timeout | 30 minutes inactivity |
| Rate limiting | 60 messages/minute per session |
| File upload scanning | Virus scan before indexing |

---

## 15. Error Handling & Edge Cases

### 15.1 AI Errors

| Scenario | Handling |
|----------|----------|
| AI timeout | "I'm having trouble processing that. Let me try again." + retry |
| AI error | "I encountered an issue. Would you like to try again or speak to someone?" |
| Repeated failures | Offer hotline handoff immediately |

### 15.2 Conversation Errors

| Scenario | Handling |
|----------|----------|
| Invalid access code | "I couldn't find a report with that code. Please check and try again." |
| Session expired | "Your session has expired. Would you like to start over?" |
| File upload fail | "I couldn't upload that file. Please try again or continue without it." |
| Unsupported file type | "I can't process that file type. Supported formats: PDF, DOCX, TXT, JPG, PNG" |

### 15.3 Edge Cases

| Scenario | Handling |
|----------|----------|
| Very long message | Accept up to 10,000 chars, suggest breaking up longer narratives |
| Multiple languages in one message | Respond in detected majority language |
| Offensive content | Professional response, continue conversation, flag for review |
| Legal threats | Direct to Legal contact, do not provide legal advice |
| Mental health crisis | Provide crisis resources, encourage professional help |

---

## 16. UI/UX Guidelines

### 16.1 Chat Message Display

```
┌─────────────────────────────────────────────────┐
│                                        10:42 AM │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │ Hi! I'm here to help you report a        │  │
│  │ concern or ask questions about our       │  │
│  │ policies.                                │  │
│  │                                          │  │
│  │ What would you like to do today?         │  │
│  │                                          │  │
│  │ [Report a concern]                       │  │
│  │ [Ask a policy question]                  │  │
│  │ [Check my case status]                   │  │
│  └──────────────────────────────────────────┘  │
│                                        🤖 10:42 │
│                                                 │
│                    ┌───────────────────────────┐│
│                    │ I want to report          ││
│                    │ something that happened   ││
│                    └───────────────────────────┘│
│                                       👤 10:43  │
└─────────────────────────────────────────────────┘
```

### 16.2 Citation Display

```
┌──────────────────────────────────────────────────┐
│ Based on our Gift & Entertainment Policy:        │
│                                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │ 📄 "Employees may not accept gifts valued    │ │
│ │    at more than $100 USD from any single     │ │
│ │    vendor..."                                │ │
│ │                                              │ │
│ │    — Gift Policy v2.3, Section 4.2          │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ [View Full Policy →]                             │
└──────────────────────────────────────────────────┘
```

### 16.3 Confidence Indicator

```
Tier 1 (High Confidence):
┌──────────────────────────────────┐
│ ✓ This is based on our policy   │
└──────────────────────────────────┘

Tier 2 (Medium Confidence):
┌──────────────────────────────────┐
│ ⚠️ This is general guidance     │
│    I'd recommend confirming     │
│    with the compliance team     │
└──────────────────────────────────┘

Tier 3 (Low/Escalated):
┌──────────────────────────────────┐
│ 👤 I've sent this to our        │
│    compliance team for you      │
└──────────────────────────────────┘
```

---

## 17. Appendix A: Sample Conversations

### A.1 Report Intake Flow

```
CHATBOT: Hi! I'm here to help you report a concern. Before we
         begin, please note that this conversation uses AI and
         will be recorded for compliance purposes.

         [I understand and agree to continue]

USER: [clicks agree]

CHATBOT: Thank you. Would you like to remain anonymous? Your
         report will be treated the same either way.

         [Yes, remain anonymous] [No, I'll share my info]

USER: [Yes, remain anonymous]

CHATBOT: Understood. I've generated an access code for you:

         🔑 ABC-XYZ-123

         Please save this code - you'll need it to check your
         report status later.

         Now, please tell me what happened or what you're
         concerned about. Take your time.

USER: My manager has been approving expense reports for
      dinners that I don't think happened. I saw receipts
      for restaurants when I know the team was working
      from home those days.

CHATBOT: Thank you for sharing that. It takes courage to
         report concerns like this. I have a few questions
         to help us understand the situation better.

         Where does your manager work? You can select a
         location or describe it.

         [Chicago Office] [New York Office] [Type location...]

USER: Chicago Office

CHATBOT: Got it - Chicago Office.

         When did you first notice this happening?

USER: About 3 months ago, maybe September

CHATBOT: And is this still happening, or was it a one-time thing?

USER: It's been happening regularly. I saw another one last week.

CHATBOT: I understand. Can you tell me who is involved?
         Just first names or titles are fine if you're
         not comfortable sharing full names.

USER: My manager Sarah. She's the Director of Marketing.

CHATBOT: Thank you. Anyone else involved that you know of?

USER: I don't think so. Just her.

CHATBOT: Based on what you've described, this sounds like it
         may involve expense fraud. Does that seem right to you?

         [Yes, that sounds right] [No, it's something else]

USER: [Yes, that sounds right]

CHATBOT: Do you have any documents, screenshots, or other
         evidence you'd like to share? You can drag and
         drop files here.

         [Upload files] [No, continue without]

USER: [uploads expense_report.pdf]

CHATBOT: Got it, I've received expense_report.pdf.

         Anything else to add?

USER: [No, continue without]

CHATBOT: Here's a summary of your report:

         📍 Location: Chicago Office
         📅 Timeframe: September 2025 - Present (ongoing)
         👤 Subject: Sarah, Director of Marketing
         📁 Category: Expense Fraud
         📎 Attachments: 1 file

         Summary: Concern about manager approving expense
         reports for dinners that may not have occurred.

         Is this accurate, or would you like to change anything?

         [Submit Report] [Make Changes]

USER: [Submit Report]

CHATBOT: Your report has been submitted.

         Reference: ETH-2026-00042

         🔑 Remember your access code: ABC-XYZ-123

         What happens next:
         • Your report will be reviewed within 24-48 hours
         • You can check status anytime using your access code
         • We may reach out with follow-up questions

         Thank you for speaking up. Is there anything else
         I can help you with?

         [Check Status Later] [Report Another Concern] [Exit]

# Behind the scenes (RIU→Case flow):
# 1. RIU created (type: chatbot_transcript, status: received)
# 2. Case created (status: new, source_channel: CHATBOT)
# 3. riu_case_associations record created (association_type: 'primary')
# 4. Activity logged on RIU: "System created RIU from chatbot intake"
# 5. Activity logged on Case: "System created Case from chatbot RIU"
```

### A.2 Policy Q&A (Tier 2 Example)

```
USER: Can I accept Super Bowl tickets from our biggest vendor?

CHATBOT: That's a great question! To give you accurate
         guidance, I need to understand a few things:

         1. What's the approximate value of the tickets?
         2. Is this vendor a government entity?
         3. Would you be going alone or with colleagues?

USER: The tickets are probably worth about $2,000 each.
      Not government. Just me.

CHATBOT: Thanks for the details. Based on our Gift &
         Entertainment Policy:

         ⚠️ This situation requires careful consideration.

         Key factors:
         • $2,000 exceeds our standard $100 gift limit
         • High-value entertainment from vendors requires
           pre-approval from Compliance
         • There may be additional considerations given
           the vendor relationship

         My recommendation:
         You should NOT accept these tickets without first
         getting written approval from the Compliance team.

         📄 See: Gift Policy Section 4.2, Vendor Entertainment
         Guidelines Section 2.1

         Would you like me to:
         [Send this question to Compliance for confirmation]
         [View the full policy]
         [I have another question]

# Behind the scenes (RIU→Case flow for Q&A):
# If user is satisfied → Conversation completes
#   - RIU created (type: chatbot_transcript, outcome: RESOLVED)
#   - NO Case created (Q&A resolved, no action needed)
#   - RIU preserved for analytics (common questions, policy citations)
#
# If user escalates → "Send this question to Compliance"
#   - RIU created (type: chatbot_transcript, outcome: ESCALATED)
#   - Inquiry created, linked to RIU
#   - Case creation configurable (depends on client settings)
```

---

## 18. Appendix B: Prompt Templates

### B.1 Report Intake System Prompt

```
You are a helpful assistant guiding employees through
submitting an ethics/compliance report. Your role is to:

1. Make the employee feel safe and heard
2. Gather necessary information through natural conversation
3. Ask one question at a time
4. Be patient and non-judgmental
5. Never provide legal advice
6. Encourage them to share what they're comfortable with

Information to collect:
- Location of incident
- Timeframe (when, ongoing?)
- People involved (subjects)
- Category of concern
- Supporting details or evidence

If the employee seems distressed, acknowledge their feelings
and remind them they can call the hotline for human support.

Always maintain confidentiality and thank them for speaking up.
```

### B.2 Policy Q&A System Prompt

```
You are a knowledgeable assistant helping employees understand
company policies. Your role is to:

1. Answer questions based ONLY on provided policy documents
2. Always cite specific sections when answering
3. Be clear when you're quoting vs. interpreting
4. Ask clarifying questions for situational guidance
5. Indicate confidence level in your responses
6. Offer to escalate to human compliance when uncertain

Response format:
- For direct policy questions: Quote the relevant section
- For situational questions: Ask clarifying questions first
- For complex scenarios: Recommend human consultation

Never:
- Provide legal advice
- Make up policy content
- Guarantee outcomes
- Dismiss concerns

If confidence is below 70%, explicitly offer human escalation.
```

---

*End of Employee Chatbot PRD*
