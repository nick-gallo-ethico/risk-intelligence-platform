# AI-First Design Checklist

**Purpose:** Use this checklist when creating or reviewing ANY PRD, schema, or feature specification. Claude Code should validate against this checklist before finalizing any design document.

**Last Updated:** January 2026

---

## Table of Contents

1. [Schema Design Checklist](#schema-design-checklist)
2. [Feature/PRD Checklist](#featureprd-checklist)
3. [API Design Checklist](#api-design-checklist)
4. [UI Design Checklist](#ui-design-checklist)
5. [Cross-Cutting Concerns](#cross-cutting-concerns)
6. [Quick Reference Card](#quick-reference-card)

---

## Schema Design Checklist

For every new entity or table, verify these items:

### Semantic Naming

- [ ] **Human-readable field names**: Field names are self-documenting without abbreviations
  - Good: `allegation_summary`, `investigation_outcome`, `reporter_relationship`
  - Bad: `field_1`, `alleg_sum`, `inv_out`, `rel_type`
- [ ] **Consistent naming convention**: All fields use snake_case
- [ ] **Clear relationship names**: Foreign keys describe the relationship
  - Good: `assigned_investigator_id`, `reporting_manager_id`
  - Bad: `user_id_2`, `person_fk`

### Narrative Context Fields

- [ ] **Description/notes field included**: Entity has a free-form text field for context
- [ ] **Rationale capture**: For status/decision fields, there's a companion `*_rationale` field
  - Example: `status` + `status_rationale`, `outcome` + `outcome_rationale`
- [ ] **Summary field for AI consumption**: Long-form content has a summary field AI can generate

### Activity Log Design

- [ ] **Activity log entity exists**: Every major entity has an associated `*_ACTIVITY` table
- [ ] **Natural language descriptions**: Activity log captures human-readable action descriptions
- [ ] **Actor tracking**: Activity logs track who performed the action (user_id, actor_type)
- [ ] **Context preservation**: Activity logs store enough context for AI to understand the action
- [ ] **Change tracking**: Field changes captured with old_value and new_value

### Source Tracking (Migration Support)

- [ ] **source_system field**: Tracks where the record came from (e.g., 'NAVEX', 'EQS', 'MANUAL')
- [ ] **source_record_id field**: Original ID from source system for reconciliation
- [ ] **migrated_at timestamp**: When the record was imported (null for native records)

### AI Enrichment Fields

- [ ] **AI-generated content attribution**: Fields for AI content have `ai_*` prefix or dedicated section
- [ ] **Model version tracking**: `ai_model_version` captures which model generated content
- [ ] **Generation timestamp**: `ai_generated_at` tracks when AI content was created
- [ ] **Confidence scores**: Where applicable, include `ai_confidence` field

### Data Quality

- [ ] **Graceful degradation**: Entity can accept sparse/minimal data from migrations
- [ ] **Required fields are truly required**: Only fields essential for system function are required
- [ ] **Default values sensible**: Nullable fields have reasonable defaults
- [ ] **Enum values documented**: All enums have clear value definitions

### Document Aggregation Readiness

- [ ] **JSON document shape defined**: Document the complete JSON structure for AI consumption
- [ ] **Nested data accessible**: Related data can be efficiently joined for AI context
- [ ] **PII fields identified**: Sensitive fields marked for AI redaction when needed

---

## Feature/PRD Checklist

For every new feature, verify these items:

### Conversational Interface

- [ ] **Chat interaction examples**: Document how users might accomplish this via natural language
  - Example: "Show me open cases assigned to my team"
  - Example: "Summarize the investigation findings for case #123"
  - Example: "What policies are due for review this quarter?"
- [ ] **Voice command compatibility**: Consider how feature works with voice input
- [ ] **Disambiguation handling**: Plan for ambiguous user intents

### AI Assistance Opportunities

- [ ] **AI assist points identified**: Document where AI can suggest, draft, summarize, or automate
- [ ] **Human-in-the-loop**: All AI actions are reviewable and editable by users
- [ ] **Confidence transparency**: AI suggestions show confidence level when applicable
- [ ] **Fallback to human**: Clear escalation path when AI cannot help

### Conversation Storage

- [ ] **AI interaction logging**: If AI is involved, interactions are logged for audit
- [ ] **Transcript storage**: Chat/conversation transcripts preserved
- [ ] **Context reconstruction**: Enough data stored to understand AI decisions later

### AI Action Audit

- [ ] **Input captured**: What data was provided to AI
- [ ] **Output captured**: What AI generated
- [ ] **Outcome tracked**: Whether user accepted, modified, or rejected AI output
- [ ] **Model attribution**: Which AI model version was used

### Migration Impact

- [ ] **Competitor mapping**: Document how this feature handles data from competitor systems
- [ ] **Sparse data handling**: Feature works with incomplete migrated data
- [ ] **AI enrichment post-migration**: Plan for AI to enhance imported records

### Structured + Unstructured Data

- [ ] **Both captured**: For decisions/outcomes, capture both the value AND the rationale
- [ ] **Searchable narrative**: Unstructured text is indexed for search
- [ ] **AI-extractable**: Unstructured content can be processed by AI for insights

---

## API Design Checklist

For every new endpoint, verify these items:

### AI-Friendly Responses

- [ ] **Context-rich payloads**: Responses include enough context for AI to understand and act
- [ ] **Relationships included**: Related entities embedded or linked clearly
- [ ] **Human-readable enums**: Enum values have labels, not just codes
- [ ] **Timestamps formatted**: ISO 8601 format for all dates/times

### Bulk Operations

- [ ] **Batch endpoints exist**: AI agents can process multiple records efficiently
- [ ] **Pagination consistent**: Standard page/limit/offset pattern
- [ ] **Bulk update support**: Update multiple records in single request where appropriate

### Natural Language Search

- [ ] **Full-text search**: Search endpoint supports natural language queries
- [ ] **Filter to query mapping**: Filters can be constructed from natural language
- [ ] **Semantic search ready**: Endpoint can leverage vector/embedding search

### Error Handling

- [ ] **Actionable error messages**: Errors explain what went wrong and how to fix
- [ ] **Error codes documented**: Consistent error code taxonomy
- [ ] **Retry guidance**: Transient errors indicate retry-ability

---

## UI Design Checklist

For every new screen/component, verify these items:

### AI Panel Space

- [ ] **AI suggestion area**: UI has designated space for AI suggestions/summaries
- [ ] **Non-intrusive placement**: AI panels don't block primary workflows
- [ ] **Dismissible/collapsible**: Users can hide AI assistance if desired

### Context Preservation

- [ ] **State captured**: UI state is captured so AI understands user context
- [ ] **History accessible**: User can see and reference recent actions
- [ ] **Breadcrumb trail**: Navigation context preserved for AI understanding

### Self-Service Principle

- [ ] **No backend-only settings**: All configuration accessible via UI
- [ ] **5-minute rule**: Non-technical user can configure in under 5 minutes
- [ ] **Inline help present**: Tooltips, hints, and documentation embedded
- [ ] **Plain language labels**: No technical jargon in user-facing text

### Accessibility

- [ ] **WCAG 2.1 AA compliant**: Meets accessibility standards
- [ ] **Keyboard navigable**: All actions accessible via keyboard
- [ ] **Screen reader compatible**: Proper ARIA labels and semantic HTML

---

## Cross-Cutting Concerns

### Multi-Tenancy

- [ ] **organization_id on all tables**: Every table has tenant identifier
- [ ] **RLS policies defined**: Row-level security configured
- [ ] **Cache keys include tenant**: All cache keys prefixed with tenant ID
- [ ] **Search indices per tenant**: Elasticsearch indices tenant-scoped
- [ ] **File storage per tenant**: Blob containers/paths include tenant

### Business Unit Support

- [ ] **business_unit_id where applicable**: Entities that need BU scoping have the field
- [ ] **BU hierarchy supported**: Parent/child BU relationships handled
- [ ] **BU-aware queries**: Queries can filter by BU when needed

### Audit Trail

- [ ] **Who**: Actor user ID captured
- [ ] **What**: Action and changed fields captured
- [ ] **When**: Timestamp captured
- [ ] **Why**: Rationale/context captured in natural language
- [ ] **Immutable**: Audit records cannot be modified or deleted

### PII Handling

- [ ] **Sensitive fields identified**: PII fields marked in schema
- [ ] **Redaction rules defined**: How PII is masked for different audiences
- [ ] **Retention policy set**: How long PII is retained
- [ ] **Export controls**: PII export requires appropriate permissions

---

## Quick Reference Card

### Entity Field Patterns

```
Standard Entity Structure:
├── id: uuid (PK)
├── organization_id: uuid (FK, required for multi-tenancy)
├── [business_unit_id: uuid (FK, optional)]
│
├── [Core business fields...]
│
├── description: text (narrative context)
├── notes: text (additional context)
├── [status]: enum + status_rationale: text
│
├── source_system: string (migration tracking)
├── source_record_id: string (migration tracking)
├── migrated_at: timestamp (migration tracking)
│
├── ai_summary: text (AI enrichment)
├── ai_generated_at: timestamp (AI enrichment)
├── ai_model_version: string (AI enrichment)
│
├── created_at: timestamp
├── updated_at: timestamp
├── created_by_id: uuid (FK)
└── updated_by_id: uuid (FK)
```

### Activity Log Pattern

```
EntityActivity:
├── id: uuid
├── entity_id: uuid (FK)
├── organization_id: uuid (FK)
│
├── action: string ('created', 'updated', 'status_changed', etc.)
├── action_description: text ("John assigned this case to Sarah")
│
├── actor_user_id: uuid (FK, nullable for system)
├── actor_type: enum ('user', 'system', 'ai', 'integration')
│
├── changes: json ({ old_value, new_value, fields_changed[] })
├── context: json (additional data AI might need)
│
└── created_at: timestamp (immutable)
```

### AI Assistance Pattern

```
AI Assist Points to Document:
├── Summarization: What can be summarized?
├── Generation: What can be drafted/created?
├── Suggestion: What can be recommended?
├── Classification: What can be categorized?
├── Translation: What needs multi-language?
├── Search: What needs semantic search?
└── Analysis: What patterns can be detected?
```

---

## Validation Process

When reviewing a document against this checklist:

1. **Read the document completely first**
2. **Check each applicable section** (not all sections apply to all documents)
3. **Note specific gaps** with line numbers or section references
4. **Propose concrete fixes** for each gap found
5. **Verify fixes maintain consistency** with existing documents

### Compliance Scoring

| Score | Status | Action |
|-------|--------|--------|
| 100% | Compliant | Ready for approval |
| 90-99% | Minor gaps | Fix before finalizing |
| 75-89% | Significant gaps | Revise and re-review |
| <75% | Major revision needed | Substantial rewrite required |

---

*End of AI-First Design Checklist*
