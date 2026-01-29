# PRD-004: Web Form Configuration
## Ethico Risk Intelligence Platform

**Document ID:** PRD-004
**Version:** 1.0 (Draft)
**Priority:** P0 - Critical (Foundation Module)
**Last Updated:** January 2026

---

## 1. Executive Summary

The Web Form Configuration module is the **shared foundation** for all employee-facing forms across the Ethico Risk Intelligence Platform. It provides a low-code visual form builder enabling Compliance Officers to create, configure, and manage forms without technical assistance.

### Scope

This module powers:
- **Case Intake Forms** (speak-up/hotline web reports)
- **Disclosure Forms** (COI, Gifts & Entertainment, Outside Employment)
- **Policy Attestations** (acknowledgment forms)
- **Surveys** (employee feedback, training evaluations)

### Key Design Principles

| Principle | Description |
|-----------|-------------|
| **Low-Code First** | Visual drag-and-drop builder for non-technical Compliance Officers |
| **Separation of Concerns** | Form logic (during completion) vs. Workflow engine (after submission) |
| **Version Safety** | Full version history with rollback capability |
| **Multi-Language Native** | AI-assisted translation with translation memory |
| **Compliance-Ready** | GDPR, field-level encryption, redaction, audit trails |

---

## 2. User Stories

### Client Admin

**Create new form with visual builder**
As a **Compliance Officer**, I want to create forms using a drag-and-drop builder
so that I can design intake forms without developer assistance.

Key behaviors:
- Drag question types from palette to canvas
- Preview form as employee will see it
- Configure question settings (required, validation, help text)
- Organize questions into sections
- Form saved as draft until published
- Activity logged: "Compliance Officer {name} created form {form_name}"

---

**Add conditional logic to form**
As a **Compliance Officer**, I want to add conditional display rules to questions
so that employees only see relevant questions based on their answers.

Key behaviors:
- Set "show if" rules based on other question answers
- Support multiple conditions (AND/OR)
- Visual indicator on questions with conditions
- Test conditions in preview mode
- Activity logged: "Compliance Officer {name} updated form logic"

---

**Configure form sections**
As a **Compliance Officer**, I want to organize questions into collapsible sections
so that long forms feel manageable to employees.

Key behaviors:
- Create named sections with descriptions
- Drag sections to reorder
- Set sections as repeatable (e.g., "Add another gift")
- Sections can have conditional display
- Activity logged: "Compliance Officer {name} configured form sections"

---

**Publish form version**
As a **Compliance Officer**, I want to publish a form so employees can complete it
so that changes go live in a controlled manner.

Key behaviors:
- Publishing creates immutable version
- Existing submissions stay with their form version
- Can revert to previous version
- Version history visible with diff view
- Activity logged: "Compliance Officer {name} published form version {version}"

---

**Configure form authentication**
As a **System Admin**, I want to configure how employees authenticate to complete forms
so that we support both SSO users and anonymous reporting.

Key behaviors:
- Options: SSO required, anonymous allowed, access code
- Anonymous can optionally provide email for updates
- SSO pre-fills employee information from HRIS
- Configuration applies per form
- Activity logged: "System Admin {name} configured form authentication"

---

**Translate form to multiple languages**
As a **Compliance Officer**, I want to translate forms into multiple languages
so that global employees can complete forms in their preferred language.

Key behaviors:
- AI suggests translations for question text
- Human review before publishing translations
- Translation memory for consistent terminology
- Preview form in each language
- Activity logged: "Compliance Officer {name} added {language} translation"

---

**Create form from template**
As a **Compliance Officer**, I want to create a form from a standard template
so that I don't have to start from scratch for common form types.

Key behaviors:
- Template library with COI, G&E, intake, attestation templates
- Copy template to organization and customize
- Templates marked as "from library"
- Activity logged: "Compliance Officer {name} created form from template {template}"

---

**View form analytics**
As a **Compliance Officer**, I want to view completion metrics for my forms
so that I can identify where employees struggle or abandon.

Key behaviors:
- Completion rate, average time, drop-off points
- Time spent per question (if enabled)
- Comparison across form versions
- Export analytics data
- organizationId enforced for data isolation

---

### End User

**Complete form as employee**
As an **Employee**, I want to complete assigned forms
so that I can meet my compliance obligations.

Key behaviors:
- Form loads with SSO-prefilled employee data
- Save draft and resume later
- Progress indicator shows completion
- Validation errors shown inline
- Confirmation message on submit
- Activity logged: "Employee completed form {form_name}"

---

**Complete form anonymously**
As an **Anonymous Reporter**, I want to complete a form without logging in
so that I can report concerns without identifying myself.

Key behaviors:
- No login required
- Optional email field for updates
- Access code generated for follow-up
- No employee data pre-filled
- Activity logged: "Anonymous user submitted form"

---

**Resume draft form submission**
As an **Employee**, I want to resume a form I started earlier
so that I can complete it when I have more time or information.

Key behaviors:
- Draft auto-saved periodically
- Draft visible in "My Forms" with resume option
- Draft expires after configured days (or never)
- Resume picks up exactly where left off
- Activity logged: "Employee resumed draft submission"

---

## 3. Entity Model

### 2.1 Form Definition (Template)

```
FORM_DEFINITION
├── Core Fields
│   ├── id (UUID)
│   ├── organization_id (tenant)
│   ├── business_unit_id (FK, nullable - for scoping forms to BU)
│   ├── name (e.g., "Annual COI Disclosure 2026")
│   ├── description
│   ├── form_type (CASE_INTAKE, DISCLOSURE, ATTESTATION, SURVEY, CUSTOM)
│   ├── form_code (short URL-safe code, e.g., "coi-2026")
│   ├── status (DRAFT, PUBLISHED, ARCHIVED)
│   ├── version (1, 2, 3...)
│   ├── is_current_version (boolean)
│
├── Sections[] (grouping of questions)
│   ├── id (UUID)
│   ├── title
│   ├── description
│   ├── order (display sequence)
│   ├── is_repeatable (boolean - e.g., "Add another gift")
│   ├── repeat_min (if repeatable)
│   ├── repeat_max (if repeatable)
│   ├── repeat_button_text (e.g., "Add Another Gift")
│   ├── conditional_display (JSONB - show if other answer = value)
│   ├── questions[]
│       ├── (see Question entity below)
│
├── Settings
│   ├── Authentication
│   │   ├── auth_mode (SSO_REQUIRED, ANONYMOUS_ALLOWED, ACCESS_CODE)
│   │   ├── allow_anonymous (boolean)
│   │   ├── anonymous_email_optional (boolean)
│   │   ├── require_employee_id (if no SSO)
│   │   ├── access_code_enabled (boolean)
│   │
│   ├── Submission
│   │   ├── allow_save_draft (boolean, default true)
│   │   ├── draft_expiry_days (null = no expiry)
│   │   ├── allow_edit_after_submit (boolean)
│   │   ├── edit_window_hours (if editable, how long)
│   │   ├── confirmation_message (rich text)
│   │   ├── confirmation_email_enabled (boolean)
│   │
│   ├── Branding
│   │   ├── header_logo_url
│   │   ├── header_text
│   │   ├── primary_color
│   │   ├── footer_text
│   │   ├── custom_css (optional)
│
├── Localization
│   ├── default_language (e.g., "en-US")
│   ├── available_languages[] (e.g., ["en-US", "es-ES", "de-DE"])
│   ├── translations (JSONB - see Translation entity)
│   ├── translation_status (per language: DRAFT, REVIEWED, APPROVED)
│
├── Distribution
│   ├── public_url (shareable link)
│   ├── embed_enabled (boolean)
│   ├── embed_code (iframe/JS snippet)
│   ├── qr_code_url (generated QR code image)
│   ├── portal_visible (show in Employee Portal)
│
├── Analytics Settings
│   ├── track_time_per_field (boolean)
│   ├── track_drop_off (boolean)
│   ├── track_completion_rate (boolean)
│
├── Compliance
│   ├── data_retention_days (null = org default)
│   ├── pii_fields[] (field IDs marked as PII)
│   ├── require_consent (boolean)
│   ├── consent_text (if required)
│   ├── allow_dsar_export (boolean)
│   ├── allow_erasure (boolean)
│
├── Metadata
    ├── created_at, updated_at
    ├── created_by, updated_by
    ├── published_at, published_by
    ├── archived_at, archived_by
    ├── parent_version_id (FK to previous version)
```

### 2.2 Question Entity

```
FORM_QUESTION
├── id (UUID)
├── form_definition_id (FK)
├── section_id (FK)
├── organization_id
│
├── Display
│   ├── question_text
│   ├── description (help text below question)
│   ├── placeholder_text
│   ├── order (within section)
│   ├── width (FULL, HALF, THIRD - for layout)
│
├── Type & Options
│   ├── question_type (see Question Types below)
│   ├── options[] (for SELECT, MULTI_SELECT, RADIO)
│   │   ├── value
│   │   ├── label
│   │   ├── order
│   │   ├── is_other (allows free text)
│   ├── options_source (STATIC, HRIS_LOOKUP, EXTERNAL_API)
│   ├── lookup_config (JSONB - for dynamic options)
│
├── Validation
│   ├── is_required (boolean)
│   ├── validation_rules (JSONB)
│   │   ├── min_length, max_length (for text)
│   │   ├── min_value, max_value (for numbers)
│   │   ├── regex_pattern (custom validation)
│   │   ├── file_types[] (for uploads)
│   │   ├── max_file_size_mb
│   │   ├── min_date, max_date (for dates)
│   ├── validation_message (custom error text)
│
├── Conditional Logic
│   ├── conditional_display (JSONB)
│   │   ├── rules[]
│   │   │   ├── field_id (question to check)
│   │   │   ├── operator (EQUALS, NOT_EQUALS, CONTAINS, GREATER_THAN, etc.)
│   │   │   ├── value
│   │   │   ├── logic (AND, OR with other rules)
│   ├── conditional_required (JSONB - same structure, for dynamic required)
│
├── Workflow Triggers
│   ├── triggers_review (boolean)
│   ├── trigger_values[] (which values trigger review)
│   ├── trigger_severity (HIGH, MEDIUM, LOW - if triggered)
│   ├── trigger_category_id (auto-categorize if triggered)
│
├── Data Handling
│   ├── is_pii (boolean)
│   ├── encrypt_at_rest (boolean)
│   ├── redactable (boolean)
│   ├── exclude_from_reports (boolean)
│
├── Aggregation (for repeatable sections)
│   ├── aggregation_type (SUM, COUNT, AVG, MIN, MAX, NONE)
│   ├── aggregation_field_name (e.g., "total_gift_value")
│
├── Metadata
    ├── created_at, updated_at
```

### 2.3 Question Types

| Type | Description | Validation Options |
|------|-------------|-------------------|
| **TEXT** | Single-line text input | min/max length, regex |
| **TEXTAREA** | Multi-line text input | min/max length |
| **RICH_TEXT** | Rich text editor (formatting) | min/max length |
| **NUMBER** | Numeric input | min/max value, decimals |
| **CURRENCY** | Number with currency selector | min/max, supported currencies |
| **DATE** | Date picker | min/max date, relative dates |
| **DATETIME** | Date and time picker | min/max, timezone handling |
| **DATE_RANGE** | Start and end date | min duration, max duration |
| **SELECT** | Single-select dropdown | static or dynamic options |
| **MULTI_SELECT** | Multi-select checkboxes | min/max selections |
| **RADIO** | Radio button group | required selection |
| **CHECKBOX** | Single checkbox (boolean) | must be checked |
| **YES_NO** | Yes/No toggle | required |
| **RATING** | Star rating (1-5 or 1-10) | min/max stars |
| **SLIDER** | Numeric slider | min/max, step |
| **FILE_UPLOAD** | Single file upload | file types, max size |
| **MULTI_FILE** | Multiple file uploads | max files, total size |
| **SIGNATURE** | Digital signature capture | required |
| **EMPLOYEE_LOOKUP** | Search employees from HRIS | single or multi-select |
| **LOCATION_LOOKUP** | Search locations from org data | single or multi-select |
| **EXTERNAL_PARTY** | Search/add external parties | links to External Party entity |
| **MATRIX** | Grid/matrix of options | row/column configuration |
| **SECTION_BREAK** | Visual separator | n/a |
| **STATIC_TEXT** | Display-only content | n/a |
| **CALCULATED** | Auto-calculated from other fields | formula expression |

### 2.4 Form Version

```
FORM_VERSION
├── id (UUID)
├── form_definition_id (FK - the "parent" form)
├── organization_id
├── version_number (1, 2, 3...)
├── status (DRAFT, PUBLISHED, ARCHIVED)
├── snapshot (JSONB - full form definition at this version)
├── change_summary (text - what changed)
├── published_at
├── published_by
├── created_at
├── created_by
```

### 2.5 Form Submission

```
FORM_SUBMISSION
├── id (UUID)
├── form_definition_id (FK)
├── form_version_id (FK - which version was used)
├── organization_id
├── business_unit_id (FK, nullable - from form definition or submitter)
├── reference_number (auto-generated, e.g., "SUB-2026-00042")
│
├── Submitter
│   ├── submitter_type (EMPLOYEE_SSO, EMPLOYEE_ANONYMOUS, EXTERNAL, PROXY)
│   ├── employee_id (if SSO)
│   ├── employee_email
│   ├── employee_name
│   ├── hris_snapshot (JSONB - employee data at submission time)
│   ├── anonymous_access_code (if anonymous)
│   ├── proxy_submitter_id (if proxy submission)
│   ├── ip_address
│   ├── user_agent
│
├── Content
│   ├── responses (JSONB - question_id: value pairs)
│   ├── attachments[] (file references)
│   ├── original_language
│   ├── submitted_at
│
├── Status
│   ├── status (DRAFT, SUBMITTED, PROCESSING, COMPLETED, CANCELLED)
│   ├── draft_saved_at (last auto-save)
│   ├── draft_expires_at
│
├── Routing (populated after submission)
│   ├── routed_to_entity_type (CASE, DISCLOSURE, ATTESTATION, etc.)
│   ├── routed_to_entity_id (FK to created entity)
│   ├── routed_at
│
├── Analytics
│   ├── started_at
│   ├── completed_at
│   ├── time_spent_seconds
│   ├── field_timings (JSONB - time per field)
│   ├── page_views (JSONB - if multi-page)
│
├── Migration Support (for imported submissions)
│   ├── source_system (e.g., 'NAVEX', 'EQS', 'CONVERCENT', 'MANUAL')
│   ├── source_record_id (original submission ID from source system)
│   └── migrated_at (when imported, null for native records)
│
├── Metadata
    ├── created_at, updated_at
```

### 2.6 Translation Memory

```
TRANSLATION_MEMORY
├── id (UUID)
├── organization_id
├── source_language
├── target_language
├── source_text (original text)
├── source_text_hash (for fast lookup)
├── translated_text
├── context (e.g., "question_text", "option_label")
├── status (AI_GENERATED, HUMAN_REVIEWED, APPROVED)
├── reviewed_by
├── reviewed_at
├── usage_count (how many times reused)
├── created_at, updated_at
```

### 2.7 Form Template Library

```
FORM_TEMPLATE
├── id (UUID)
├── organization_id (null = global/Ethico-provided)
├── name
├── description
├── form_type (CASE_INTAKE, DISCLOSURE, ATTESTATION, SURVEY)
├── industry_pack (GENERAL, HEALTHCARE, FINANCIAL_SERVICES, GOVERNMENT, etc.)
├── template_definition (JSONB - full form structure)
├── preview_image_url
├── is_active (boolean)
├── usage_count (how many times cloned)
├── created_at, updated_at
```

### 2.8 Form Activity Log

Immutable audit trail for form and submission actions:

```
FORM_ACTIVITY
├── id (UUID)
├── organization_id
├── entity_type (FORM_DEFINITION, FORM_SUBMISSION)
├── entity_id (FK to form or submission)
│
├── Activity
│   ├── activity_type (CREATED, EDITED, PUBLISHED, ARCHIVED, STARTED,
│   │                  DRAFT_SAVED, SUBMITTED, VIEWED, EXPORTED, REDACTED,
│   │                  VERSION_CREATED, ROLLBACK, TRANSLATED)
│   ├── description (natural language description of action)
│   └── details (JSONB - additional context)
│
├── Actor
│   ├── actor_id (FK to User, null if system/anonymous)
│   ├── actor_type (USER, SYSTEM, ANONYMOUS)
│   └── actor_name
│
├── Changes
│   ├── old_value (JSONB)
│   └── new_value (JSONB)
│
├── Context
│   ├── ip_address
│   ├── user_agent
│   └── session_id
│
└── created_at (immutable)

-- This table is APPEND-ONLY (no updates or deletes)
-- All entries ALSO written to unified AUDIT_LOG for cross-module queries
```

**AI-First Design Notes:**
- `source_system` enables migration tracking and data lineage
- Activity log captures natural language descriptions for AI context
- All activity logged to both `FORM_ACTIVITY` and unified `AUDIT_LOG`
- Form analytics data provides rich context for AI-driven insights

---

## 3. Form Builder UI

### 3.1 Builder Interface

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│ [← Back]  Form Name: Annual COI Disclosure 2026        [Preview ▼] │
│ ─────────────────────────────────────────────────────────────────── │
│                                                                     │
│ ┌─────────────┐  ┌────────────────────────────────┐  ┌───────────┐ │
│ │ COMPONENTS  │  │         CANVAS                 │  │ PROPERTIES│ │
│ │             │  │                                │  │           │ │
│ │ ○ Text      │  │  ┌──────────────────────────┐  │  │ Question  │ │
│ │ ○ Textarea  │  │  │ Section: Personal Info   │  │  │ Settings  │ │
│ │ ○ Number    │  │  │ ┌────────────────────┐   │  │  │           │ │
│ │ ○ Currency  │  │  │ │ Full Name *        │   │  │  │ Label:    │ │
│ │ ○ Date      │  │  │ │ [Text Field]       │   │  │  │ [_______] │ │
│ │ ○ Dropdown  │  │  │ └────────────────────┘   │  │  │           │ │
│ │ ○ Multi-sel │  │  │ ┌────────────────────┐   │  │  │ Required: │ │
│ │ ○ File      │  │  │ │ Department *       │   │  │  │ [✓]       │ │
│ │ ○ Employee  │  │  │ │ [HRIS Lookup]      │   │  │  │           │ │
│ │ ○ Location  │  │  │ └────────────────────┘   │  │  │ Logic:    │ │
│ │ ○ Signature │  │  └──────────────────────────┘  │  │ [+ Add]   │ │
│ │             │  │                                │  │           │ │
│ │ ─────────── │  │  [+ Add Section]               │  │           │ │
│ │ SECTIONS    │  │                                │  │           │ │
│ │ ○ Standard  │  │                                │  │           │ │
│ │ ○ Repeatable│  │                                │  │           │ │
│ │             │  │                                │  │           │ │
│ └─────────────┘  └────────────────────────────────┘  └───────────┘ │
│                                                                     │
│ ─────────────────────────────────────────────────────────────────── │
│ [Save Draft]                              [Publish] [Version: v3]  │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Drag-and-Drop Behavior

- Drag components from left panel to canvas
- Reorder questions within sections via drag
- Move questions between sections via drag
- Drag sections to reorder
- Visual drop indicators show valid drop zones

### 3.3 Conditional Logic Builder

**Visual rule builder (no code):**

```
┌─────────────────────────────────────────────────────────────┐
│ Show this question when:                                    │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Gift Value ▼]  [is greater than ▼]  [$100         ]   │ │
│ │                                                         │ │
│ │ [+ AND]  [+ OR]                                         │ │
│ │                                                         │ │
│ │ AND                                                     │ │
│ │ [Recipient Type ▼]  [equals ▼]  [Government Official ▼]│ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Cancel]  [Apply Rules]                                     │
└─────────────────────────────────────────────────────────────┘
```

**Supported operators:**
- Equals / Not Equals
- Contains / Does Not Contain
- Greater Than / Less Than / Between
- Is Empty / Is Not Empty
- Is One Of / Is Not One Of

### 3.4 Preview Mode

**Capabilities:**
- Interactive form filling (responses don't save)
- Test conditional logic in real-time
- View on different device sizes (desktop, tablet, mobile)
- Test personas (simulate different employee profiles)

**Test Personas:**
```
┌─────────────────────────────────────────┐
│ Preview as:                             │
│                                         │
│ ○ Anonymous User                        │
│ ○ Sales Employee - US                   │
│ ○ Manager - Germany                     │
│ ○ Executive - UK                        │
│ ○ [+ Create Custom Persona]             │
│                                         │
│ Current: Sales Employee - US            │
│ Department: Sales                       │
│ Location: New York, USA                 │
│ Level: Individual Contributor           │
└─────────────────────────────────────────┘
```

---

## 4. Versioning & Publishing

### 4.1 Version Lifecycle

```
                    ┌──────────────────┐
                    │   Create Form    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │   DRAFT (v1)     │◄──────┐
                    │   - Edit freely  │       │
                    │   - Preview      │       │
                    └────────┬─────────┘       │
                             │                 │
                        [Publish]              │
                             │                 │
                             ▼                 │
                    ┌──────────────────┐       │
                    │ PUBLISHED (v1)   │       │
                    │ - Live & active  │       │
                    │ - Locked         │       │
                    └────────┬─────────┘       │
                             │                 │
                        [Edit]                 │
                             │                 │
                             ▼                 │
                    ┌──────────────────┐       │
                    │   DRAFT (v2)     │───────┘
                    │   - New version  │
                    │   - v1 still live│
                    └────────┬─────────┘
                             │
                        [Publish]
                             │
                             ▼
                    ┌──────────────────┐
                    │ PUBLISHED (v2)   │
                    │ - Now live       │
                    │ - v1 archived    │
                    └──────────────────┘
```

### 4.2 Rollback Process

1. Navigate to Version History
2. Select previous version to preview
3. Click "Rollback to this version"
4. Confirm (warning about impact on active forms)
5. Creates new version with old content
6. Publishes immediately or saves as draft (user choice)

### 4.3 Version Comparison

Side-by-side diff showing:
- Added questions (green)
- Removed questions (red)
- Modified questions (yellow)
- Changed settings (highlighted)

---

## 5. Localization System

### 5.1 Translation Workflow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ 1. AI Translate │────►│ 2. Human Review │────►│ 3. Approve      │
│ - Auto-generate │     │ - Edit/refine   │     │ - Mark approved │
│ - All languages │     │ - Flag issues   │     │ - Goes live     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 5.2 Translation Memory

**How it works:**
1. When AI translates a phrase, it's stored in Translation Memory
2. Human edits update the memory entry
3. When same/similar phrase appears in another form, reuse approved translation
4. Reduces translation work over time

**Memory matching:**
- Exact match: 100% confidence, auto-apply
- Fuzzy match (>80%): Suggest with confidence score
- No match: Generate new AI translation

### 5.3 Language Management UI

```
┌─────────────────────────────────────────────────────────────────┐
│ Languages                                           [+ Add]     │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ ┌─────────┬────────────┬────────────┬───────────┬─────────────┐ │
│ │ Language│ Status     │ Progress   │ Last Edit │ Actions     │ │
│ ├─────────┼────────────┼────────────┼───────────┼─────────────┤ │
│ │ English │ ● Default  │ 100%       │ -         │ [Edit]      │ │
│ │ Spanish │ ● Approved │ 100%       │ Jan 15    │ [Edit] [↻]  │ │
│ │ German  │ ◐ Review   │ 85%        │ Jan 18    │ [Edit] [↻]  │ │
│ │ French  │ ○ Draft    │ 100%       │ Jan 20    │ [Edit] [↻]  │ │
│ └─────────┴────────────┴────────────┴───────────┴─────────────┘ │
│                                                                 │
│ [↻] = Regenerate AI translation                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Distribution & Access

### 6.1 Access Modes

| Mode | Authentication | Use Case |
|------|----------------|----------|
| **SSO Required** | Corporate SSO login | Disclosures, attestations |
| **Anonymous Allowed** | Optional email | Speak-up reports |
| **Access Code** | Unique code per campaign | Targeted distribution |
| **Public Link** | No auth (open) | General intake forms |

### 6.2 Distribution Channels

**1. Ethics Portal**
- Form listed in portal's form directory
- Searchable by employees
- Categorized by type

**2. Employee Portal (Authenticated)**
- "My Forms" section shows assigned/available forms
- Campaign forms appear with due dates
- Draft forms show "Continue" option

**3. Direct Links**
- Shareable URL: `https://ethics.company.com/forms/coi-2026`
- Short codes for verbal sharing: `ethics.company.com/f/COI26`
- QR codes (auto-generated, downloadable)

**4. Embed Widget**
```html
<!-- Iframe embed -->
<iframe
  src="https://ethics.company.com/embed/coi-2026"
  width="100%"
  height="800px"
></iframe>

<!-- JavaScript embed (more flexible) -->
<script src="https://ethics.company.com/embed.js"></script>
<div id="ethico-form" data-form="coi-2026"></div>
```

**5. Email Links**
- Campaign emails include direct form links
- Pre-authenticated via token (for SSO users)

---

## 7. Compliance & Data Protection

### 7.1 PII Handling

**Field-Level Controls:**
- Mark fields as PII during form design
- PII fields encrypted at rest (additional encryption layer)
- PII access logged in audit trail
- PII fields support redaction

### 7.2 Redaction

**Admin-initiated redaction:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Redact Submission: SUB-2026-00042                               │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ Select fields to redact:                                        │
│                                                                 │
│ [✓] Reporter Name: John Smith → [REDACTED]                      │
│ [✓] Email: john@company.com → [REDACTED]                        │
│ [ ] Department: Sales                                           │
│ [ ] Description: I witnessed...                                 │
│                                                                 │
│ Reason for redaction: [GDPR request from data subject      ▼]  │
│                                                                 │
│ ⚠️ Redaction is permanent and cannot be undone.                 │
│                                                                 │
│ [Cancel]                                      [Confirm Redaction]│
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Data Subject Rights

**DSAR (Data Subject Access Request):**
- Export all submissions for an employee
- Format: JSON or PDF
- Includes: responses, timestamps, versions

**Right to Erasure:**
- Delete all submissions for an employee
- Maintains audit record of deletion
- Cascades to linked entities (configurable)

### 7.4 Consent Tracking

- Configurable consent checkbox per form
- Consent text customizable
- Consent timestamp recorded
- Consent version tracked (if text changes)

### 7.5 Audit Trail

All form actions logged:
- Form created, edited, published, archived
- Submission started, saved, submitted
- Submission viewed, exported
- Fields redacted
- Access by user, timestamp, IP

---

## 8. Analytics

### 8.1 Form Analytics Dashboard

```
┌─────────────────────────────────────────────────────────────────┐
│ Form Analytics: Annual COI Disclosure 2026                      │
│ Period: [Last 30 Days ▼]                                        │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────┐│
│ │ Submissions │  │ Completion  │  │ Avg. Time   │  │ Drop-off ││
│ │    1,247    │  │   Rate      │  │             │  │   Rate   ││
│ │   ↑ 12%     │  │    89%      │  │  4m 32s     │  │   11%    ││
│ └─────────────┘  └─────────────┘  └─────────────┘  └──────────┘│
│                                                                 │
│ ─────────────────────────────────────────────────────────────── │
│                                                                 │
│ DROP-OFF ANALYSIS                                               │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Section 1: Personal Info        ████████████████░░  92%   │  │
│ │ Section 2: Conflict Details     ██████████████░░░░  85%   │  │
│ │ Section 3: Certification        █████████████░░░░░  89%   │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│ FIELD-LEVEL INSIGHTS                                            │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Slowest Fields:                                           │  │
│ │ 1. "Describe the conflict" - avg 2m 15s                   │  │
│ │ 2. "External party lookup" - avg 45s                      │  │
│ │ 3. "Financial value estimate" - avg 30s                   │  │
│ └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Metrics Tracked

| Metric | Description |
|--------|-------------|
| **Total Submissions** | Count of submitted forms |
| **Completion Rate** | Submitted / Started × 100% |
| **Average Time** | Mean time from start to submit |
| **Drop-off Rate** | Started but not submitted |
| **Drop-off Points** | Which section/field users abandon |
| **Field Completion** | % of submissions with field filled |
| **Time per Field** | Average time spent on each field |
| **Device Breakdown** | Desktop vs. Mobile vs. Tablet |
| **Language Usage** | Submissions by language |

---

## 9. Form Template Library

### 9.1 Standard Templates

| Template | Type | Description |
|----------|------|-------------|
| **Speak-Up Report** | CASE_INTAKE | General ethics reporting form |
| **Conflicts of Interest** | DISCLOSURE | Annual COI certification |
| **Gift Received** | DISCLOSURE | GT&E - gifts from third parties |
| **Gift Given** | DISCLOSURE | GT&E - gifts to third parties |
| **Outside Employment** | DISCLOSURE | Side jobs, consulting work |
| **Personal Relationship** | DISCLOSURE | Workplace relationships |
| **Policy Attestation** | ATTESTATION | Generic policy acknowledgment |
| **Code of Conduct** | ATTESTATION | Annual CoC certification |

### 9.2 Industry Packs

**Healthcare/HIPAA:**
- HIPAA Breach Report
- Patient Privacy Concern
- Medical Device Issue
- Pharmaceutical Interaction Disclosure

**Financial Services:**
- Personal Trading Disclosure
- Outside Business Activity
- Political Contribution
- Gift & Entertainment (enhanced thresholds)

**Government/Public Sector:**
- Ethics Violation Report
- Lobbying Activity
- Foreign Contact Disclosure
- Security Clearance Issue

**Manufacturing:**
- Safety Incident Report
- Environmental Concern
- Quality Issue Report
- Supplier Ethics Concern

### 9.3 Using Templates

1. Browse library by type or industry
2. Preview template
3. Clone to organization
4. Customize as needed
5. Publish

---

## 10. Integration Points

### 10.1 Workflow Engine (PRD-008)

**After submission, form data passed to Workflow Engine:**
```json
{
  "submission_id": "uuid",
  "form_type": "DISCLOSURE",
  "form_code": "coi-2026",
  "responses": { ... },
  "aggregations": {
    "total_gift_value": 250,
    "subject_count": 2
  },
  "triggers": ["HIGH_VALUE", "GOVERNMENT_PARTY"],
  "submitter": { ... }
}
```

**Workflow Engine determines:**
- Which entity to create (Case, Disclosure, etc.)
- Routing/assignment
- Approval workflow
- Notifications

### 10.2 HRIS Integration (PRD-010)

**Employee Lookup:**
- Search employees by name, email, employee ID
- Return: name, department, location, manager, level
- Real-time or cached (configurable)

**Location Lookup:**
- Search organization locations
- Return: name, address, region, country

### 10.3 External Party Integration

**From Disclosures module (PRD-006):**
- Search existing external parties
- Create new external parties inline
- Auto-link party to submission

### 10.4 File Storage

**Uploads stored in:**
- Azure Blob Storage (per-tenant containers)
- Virus scanned before storage
- Encrypted at rest
- Metadata stored in database

---

## 11. Permissions

### 11.1 Form Builder Permissions

| Permission | Compliance Officer | Admin | Viewer |
|------------|-------------------|-------|--------|
| View forms | ✓ | ✓ | ✓ |
| Create forms | ✓ | ✓ | ✗ |
| Edit forms | ✓ | ✓ | ✗ |
| Publish forms | ✓ | ✓ | ✗ |
| Archive forms | ✓ | ✓ | ✗ |
| Delete forms | ✗ | ✓ | ✗ |
| View submissions | ✓ | ✓ | Scoped |
| Export submissions | ✓ | ✓ | ✗ |
| Redact data | ✗ | ✓ | ✗ |
| Manage templates | ✗ | ✓ | ✗ |

### 11.2 Submission Access

- **Submitter:** View own submissions
- **Manager:** View direct reports' submissions (if configured)
- **Reviewer:** View assigned submissions
- **Compliance:** View all submissions
- **Admin:** View all + configure

---

## 12. API Endpoints

### 12.1 Form Definition APIs

```
GET     /api/v1/forms                           # List forms
POST    /api/v1/forms                           # Create form
GET     /api/v1/forms/{id}                      # Get form detail
PATCH   /api/v1/forms/{id}                      # Update form (draft)
DELETE  /api/v1/forms/{id}                      # Delete form (draft only)
POST    /api/v1/forms/{id}/publish              # Publish form
POST    /api/v1/forms/{id}/archive              # Archive form
POST    /api/v1/forms/{id}/clone                # Clone form
GET     /api/v1/forms/{id}/versions             # Get version history
POST    /api/v1/forms/{id}/rollback/{version}   # Rollback to version
GET     /api/v1/forms/{id}/preview              # Get preview data
```

### 12.2 Form Submission APIs

```
POST    /api/v1/forms/{id}/submissions          # Create/start submission
GET     /api/v1/submissions/{id}                # Get submission
PATCH   /api/v1/submissions/{id}                # Update draft submission
POST    /api/v1/submissions/{id}/submit         # Submit form
DELETE  /api/v1/submissions/{id}                # Delete draft
GET     /api/v1/submissions                     # List submissions (filtered)
POST    /api/v1/submissions/{id}/export         # Export submission
```

### 12.3 Template APIs

```
GET     /api/v1/form-templates                  # List templates
GET     /api/v1/form-templates/{id}             # Get template detail
POST    /api/v1/form-templates/{id}/clone       # Clone to organization
```

### 12.4 Translation APIs

```
GET     /api/v1/forms/{id}/translations         # Get all translations
POST    /api/v1/forms/{id}/translations/{lang}  # Add/update translation
POST    /api/v1/forms/{id}/translations/{lang}/generate  # AI generate
GET     /api/v1/translation-memory              # Get org translation memory
```

### 12.5 Analytics APIs

```
GET     /api/v1/forms/{id}/analytics            # Get form analytics
GET     /api/v1/forms/{id}/analytics/drop-off   # Get drop-off analysis
GET     /api/v1/forms/{id}/analytics/fields     # Get field-level analytics
```

---

## 13. Acceptance Criteria

### 13.1 Functional Acceptance

| ID | Criterion | Priority |
|----|-----------|----------|
| AC-01 | Compliance Officer can create form via drag-and-drop builder | P0 |
| AC-02 | All question types work correctly with validation | P0 |
| AC-03 | Conditional logic (AND/OR) shows/hides questions | P0 |
| AC-04 | Form preview shows conditional logic working | P0 |
| AC-05 | Test personas simulate different employee profiles | P1 |
| AC-06 | Forms can be published and versioned | P0 |
| AC-07 | Rollback restores previous version correctly | P0 |
| AC-08 | AI translation generates translations for all languages | P1 |
| AC-09 | Translation memory reuses approved translations | P2 |
| AC-10 | Employees can save draft and resume later | P0 |
| AC-11 | Draft auto-expires after configured period | P1 |
| AC-12 | SSO, anonymous, and access code auth work | P0 |
| AC-13 | Direct links and embed widgets work | P1 |
| AC-14 | PII fields encrypted at rest | P0 |
| AC-15 | Redaction permanently removes data | P1 |
| AC-16 | DSAR export works for employee data | P1 |
| AC-17 | Analytics show completion rates and drop-off | P1 |
| AC-18 | Repeatable sections support min/max limits | P0 |
| AC-19 | Aggregation calculates correctly for workflow | P1 |
| AC-20 | Submissions route to correct entity type | P0 |

### 13.2 Performance Targets

| Metric | Target |
|--------|--------|
| Form builder load | < 2 seconds |
| Form render (employee) | < 1 second |
| Auto-save draft | < 500ms |
| Form submission | < 2 seconds |
| AI translation (per language) | < 30 seconds |
| Template clone | < 3 seconds |
| Analytics load | < 2 seconds |

---

## 14. MVP Scope

### 14.1 Phase 1 (MVP) - Weeks 1-4

**Included:**
- Form builder with drag-and-drop
- All standard question types
- Basic conditional logic (single condition)
- Section grouping (non-repeatable)
- Form versioning (draft/published)
- Form preview (basic)
- SSO and anonymous authentication
- Direct links
- Auto-save drafts
- Basic form analytics (submission count)
- Standard template library (8 templates)
- Email notifications (confirmation)

**Not Included:**
- Multi-condition AND/OR logic
- Repeatable sections
- Test personas
- Version rollback
- AI translation
- Translation memory
- Embed widgets
- QR codes
- Field-level encryption
- Redaction
- DSAR export
- Industry packs
- Advanced analytics

### 14.2 Phase 2 - Weeks 5-8

**Added:**
- Multi-condition AND/OR logic
- Repeatable sections with aggregation
- Version rollback
- Test personas in preview
- Embed widgets
- QR code generation
- Advanced analytics (drop-off, field timing)

### 14.3 Phase 3 - Weeks 9-12

**Added:**
- AI translation with review workflow
- Translation memory
- Field-level encryption for PII
- Redaction capability
- DSAR export
- Industry template packs

---

## 15. Delegation & Proxy Submission

### 15.1 Delegation Types

| Type | Submitter | On Behalf Of | Use Case |
|------|-----------|--------------|----------|
| **Manager Proxy** | Manager | Direct report | Manager reports concern for team member |
| **EA Delegate** | Executive Assistant | Executive | EA submits disclosures for busy executives |
| **HR Proxy** | HR Business Partner | Any employee | HR enters reports received verbally |
| **Compliance Proxy** | Compliance Officer | Any employee | Compliance enters paper/email submissions |

### 15.2 Delegation Configuration

```
FORM_DELEGATION_CONFIG
├── form_definition_id (FK)
├── delegation_type (MANAGER, EA_DELEGATE, HR_PROXY, COMPLIANCE_PROXY)
├── enabled (boolean)
├── require_reason (boolean)
├── notify_subject (boolean - tell the employee someone submitted for them?)
├── allowed_roles[] (which roles can use this delegation)
```

### 15.3 EA Delegate Workflow

**Setup (Admin):**
1. Admin navigates to Delegation settings
2. Creates delegation: EA → Executive
3. Configures scope (all disclosures, specific types, specific campaigns)
4. Sets validity period (start/end dates)
5. Configures notifications (notify executive on submission/decision)

**Submission (EA):**
1. EA logs in, sees "Submit on behalf of" option
2. Selects executive from their delegator list
3. Form pre-fills executive's HRIS data
4. EA completes form as executive would
5. Submission tagged with:
   - `submitter_type: DELEGATE_PROXY`
   - `proxy_submitter_id: [EA's user ID]`
   - `on_behalf_of_id: [Executive's employee ID]`
6. Executive receives notification (if configured)

### 15.4 Manager Proxy Workflow

**Scenario:** Manager receives verbal report from employee who is uncomfortable submitting themselves.

1. Manager logs in, selects "Report on behalf of team member"
2. Manager selects employee from direct reports list
3. Form shows:
   - Employee's info (pre-filled, read-only)
   - Manager's info as submitter
   - Reason for proxy submission (required)
4. Manager completes report details as relayed by employee
5. Submission clearly marked as proxy:
   - Badge: "Submitted by Manager"
   - Audit trail shows manager as submitter
6. Employee can view their submission in Employee Portal

### 15.5 Proxy Visibility

| Viewer | Sees Proxy Indicator | Sees Submitter Identity |
|--------|---------------------|------------------------|
| Employee (subject) | Yes | Yes (their manager) |
| Reviewer | Yes | Yes |
| Reports | Yes | Configurable |

---

## 16. Mobile Experience

### 16.1 Mobile-First Design

**Responsive Breakpoints:**
- Desktop: 1024px+
- Tablet: 768px - 1023px
- Mobile: < 768px

**Mobile-Specific Adaptations:**

| Component | Desktop | Mobile |
|-----------|---------|--------|
| Question layout | Side-by-side possible | Stacked vertically |
| Dropdowns | Standard select | Native picker |
| Date fields | Calendar popup | Native date picker |
| File upload | Drag-and-drop + click | Camera/gallery access |
| Signature | Mouse/stylus | Touch signature |
| Multi-select | Checkboxes | Collapsible list |
| Progress | Horizontal bar | Vertical stepper |

### 16.2 Touch Optimization

**Touch Targets:**
- Minimum 44x44px touch targets (Apple HIG)
- Adequate spacing between interactive elements
- Clear visual feedback on touch

**Gestures:**
- Swipe between sections (optional, configurable)
- Pull-to-refresh for draft loading
- Pinch-to-zoom on signature pad

### 16.3 Mobile-Specific Features

**Camera Integration:**
```
┌─────────────────────────────────────┐
│ Upload Document                     │
│                                     │
│ ┌─────────────┐  ┌─────────────┐   │
│ │ 📷          │  │ 📁          │   │
│ │ Take Photo  │  │ Choose File │   │
│ └─────────────┘  └─────────────┘   │
│                                     │
│ ┌─────────────┐                     │
│ │ 🖼️          │                     │
│ │ Photo       │                     │
│ │ Library     │                     │
│ └─────────────┘                     │
└─────────────────────────────────────┘
```

**Progressive Section Loading:**
- On mobile, load one section at a time
- Reduces memory usage
- Faster initial render

**Offline Draft Indicator:**
```
┌─────────────────────────────────────┐
│ ⚠️ Draft saved locally              │
│ Will sync when connected            │
│ Last saved: 2 minutes ago           │
└─────────────────────────────────────┘
```
(Note: Full offline support not included, but local draft survives brief disconnections)

### 16.4 Mobile Form Layout

**Section Navigation (Mobile):**
```
┌─────────────────────────────────────┐
│ Annual COI Disclosure          ≡    │
├─────────────────────────────────────┤
│                                     │
│ Step 2 of 4                         │
│ ████████░░░░░░░░░░░                 │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ CONFLICT DETAILS                │ │
│ └─────────────────────────────────┘ │
│                                     │
│ External Party *                    │
│ ┌─────────────────────────────────┐ │
│ │ Search or add new...            │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Estimated Value *                   │
│ ┌─────────────────────────────────┐ │
│ │ $                           USD │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ─────────────────────────────────── │
│                                     │
│ [← Previous]           [Next →]     │
│                                     │
└─────────────────────────────────────┘
```

### 16.5 Mobile Analytics

**Track mobile-specific metrics:**
- Device type distribution
- Completion rate by device
- Drop-off points by device
- Time to complete by device
- Common mobile errors (e.g., file too large)

---

## 17. Multi-Path Branching

### 17.1 Branching Concept

Forms can have multiple paths leading to different endings:

```
┌─────────────────────────────────────────────────────────────┐
│ START                                                       │
│   │                                                         │
│   ▼                                                         │
│ ┌─────────────────────────────────────┐                     │
│ │ "Do you have conflicts to disclose?"│                     │
│ └─────────────────┬───────────────────┘                     │
│                   │                                         │
│         ┌────────┴────────┐                                │
│         ▼                  ▼                                │
│    ┌────────┐         ┌────────┐                           │
│    │  YES   │         │   NO   │                           │
│    └────┬───┘         └────┬───┘                           │
│         │                  │                                │
│         ▼                  ▼                                │
│ ┌───────────────┐  ┌───────────────────┐                   │
│ │ Section 2:    │  │ "Positive         │                   │
│ │ Conflict      │  │  Confirmation"    │                   │
│ │ Details       │  │ [Early End]       │                   │
│ └───────┬───────┘  └───────────────────┘                   │
│         │                                                   │
│         ▼                                                   │
│ ┌───────────────┐                                          │
│ │ Section 3:    │                                          │
│ │ Certification │                                          │
│ │ [Full End]    │                                          │
│ └───────────────┘                                          │
└─────────────────────────────────────────────────────────────┘
```

### 17.2 Branch Endpoints

| Endpoint Type | Description | Workflow Trigger |
|---------------|-------------|------------------|
| **Full Submit** | Standard submission, all data captured | Normal workflow |
| **Early End** | Positive confirmation (no disclosure) | Simplified workflow |
| **Redirect** | Send to different form | N/A |
| **Disqualify** | User doesn't meet criteria | Log only |

### 17.3 Branch Configuration

```
FORM_BRANCH
├── id (UUID)
├── form_definition_id (FK)
├── branch_name (e.g., "No Conflicts Path")
├── trigger_question_id (FK - question that triggers branch)
├── trigger_condition (JSONB - same as conditional logic)
├── target_type (SECTION, ENDPOINT, REDIRECT)
├── target_section_id (if SECTION)
├── target_endpoint (if ENDPOINT: FULL_SUBMIT, EARLY_END, DISQUALIFY)
├── redirect_form_id (if REDIRECT)
├── endpoint_message (confirmation text for early end)
├── order (evaluation priority)
```

### 17.4 Use Cases

1. **COI "No Conflicts" Path:**
   - Question: "Do you have conflicts to disclose?"
   - If NO → Early end with positive confirmation
   - If YES → Continue to conflict details

2. **Speak-Up Severity Routing:**
   - Question: "Is anyone in immediate danger?"
   - If YES → Critical path with emergency messaging
   - If NO → Standard reporting path

3. **Eligibility Screening:**
   - Question: "Are you a current employee?"
   - If NO → Disqualify with message about eligibility
   - If YES → Continue to form

---

## 18. Resolved Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Offline support | No | Online-only covers 95%+ of use cases; offline adds significant complexity |
| Form branching | Yes (Multi-Path) | Essential for "No conflicts" early exits and severity-based routing |
| Partial submission | No | Forms must be complete; drafts handle save-and-resume |
| API-driven forms | Future consideration | Focus on UI builder first; API can be added later |
| A/B testing | Future consideration | Not critical for MVP; can add for form optimization later |

---

*End of Web Form Configuration PRD*
