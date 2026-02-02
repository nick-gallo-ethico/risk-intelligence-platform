# Ethico Risk Intelligence Platform
## PRD-014: Search & Discovery

**Document ID:** PRD-014
**Version:** 1.0
**Priority:** P1 - High (Core Infrastructure)
**Development Phase:** Phase 2
**Last Updated:** February 2026

**Cross-References:**
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md`
- Core Data Model: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`
- Authentication & Multi-tenancy: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md`
- AI Integration Patterns: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AI-INTEGRATION.md`
- Case Management: `02-MODULES/05-CASE-MANAGEMENT/PRD.md`
- Analytics & Reporting: `02-MODULES/07-ANALYTICS-REPORTING/PRD.md`
- Policy Management: `02-MODULES/09-POLICY-MANAGEMENT/PRD.md`
- Disclosures: `02-MODULES/06-DISCLOSURES/PRD.md`

> **Tech Stack:** NestJS (backend) + Next.js (frontend) + shadcn/ui + Tailwind CSS + Elasticsearch 8+.
> See `01-SHARED-INFRASTRUCTURE/` docs for implementation patterns and standards.

> **Architecture Note:** This module implements the search architecture defined in `00-PLATFORM/WORKING-DECISIONS.md` - Hybrid approach with PostgreSQL FTS for MVP, Elasticsearch for advanced search, and pgvector for semantic/AI search.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [AI-First Considerations](#ai-first-considerations)
3. [User Stories](#user-stories)
4. [Feature Specifications](#feature-specifications)
5. [Data Model](#data-model)
6. [Elasticsearch Index Mappings](#elasticsearch-index-mappings)
7. [API Specifications](#api-specifications)
8. [UI/UX Specifications](#uiux-specifications)
9. [Migration Considerations](#migration-considerations)
10. [Integration Points](#integration-points)
11. [Non-Functional Requirements](#non-functional-requirements)
12. [Checklist Verification](#checklist-verification)

---

## Executive Summary

### Purpose

The Search & Discovery module provides a powerful, unified search experience across all platform entities. Users can find information instantly through global search, entity-specific search, faceted filtering, and AI-powered natural language queries. This module is foundational infrastructure that enables users to navigate and discover information efficiently across Cases, RIUs, Policies, Disclosures, Employees, and more.

### Design Philosophy

> "Find anything in under 3 seconds."

Unlike competitors with fragmented, module-siloed search, Ethico provides:
- **Global omnisearch** - One search bar to find anything across all modules
- **Instant results** - Type-ahead suggestions and real-time results
- **Smart ranking** - Relevance scoring that understands context and recency
- **Natural language** - Ask questions like "harassment cases from last month"
- **Related discovery** - AI suggests related cases, policies, and subjects
- **Permission-aware** - Results filtered by user's access rights automatically

### Target Users

| Role | Primary Use Cases |
|------|-------------------|
| CCO / Compliance Officer | Cross-entity discovery, pattern identification |
| Investigator | Case search, subject lookup, policy reference |
| Triage Lead | Queue management, case assignment lookup |
| Policy Author | Policy search, version lookup |
| HR Manager | Disclosure search, employee attestation status |
| Employee | Policy search, case status lookup |

### Key Differentiators vs. Competitors

| Capability | NAVEX | EQS | Case IQ | **Ethico** |
|------------|-------|-----|---------|------------|
| Global omnisearch | No | No | No | Full cross-entity |
| Natural language queries | No | No | No | AI-powered |
| Faceted filtering | Basic | Basic | Basic | Advanced with custom fields |
| Search suggestions | No | No | Limited | Autocomplete + recent + AI |
| Related content discovery | No | No | No | AI-suggested connections |
| Search analytics | No | No | No | Usage patterns, popular queries |
| Saved searches | Limited | No | Yes | Full saved views integration |
| Result highlighting | No | Yes | No | Context-aware snippets |
| Real-time indexing | Delayed | Delayed | Delayed | Near real-time (<1s) |

---

## AI-First Considerations

### Conversational Interface

Users can interact with search via natural language. The AI understands entity types, relationships, and temporal context:

| User Intent | Example Phrases | AI Response |
|-------------|-----------------|-------------|
| Find cases | "Show me harassment cases from last month" | Filtered case list with facets |
| Find by subject | "Cases involving John Smith" | Subject-linked cases with timeline |
| Policy lookup | "What's our policy on gifts?" | Relevant policies with excerpts |
| Status check | "Open cases assigned to me" | Personalized filtered results |
| Pattern search | "Retaliation cases in EMEA" | Geographic/category filtered results |
| Historical lookup | "Cases closed in Q4 2025" | Date-range filtered results |
| Comparison | "Similar cases to this one" | AI-identified related cases |
| Discovery | "What else should I know about this?" | Related entities, patterns |

**Example Conversations:**
```
User: "Show me open harassment cases in the Chicago office"
AI: "I found 12 open harassment cases from the Chicago location.

     Summary:
     - 5 are in Investigation status
     - 4 are Pending Assignment
     - 3 are On Hold

     The oldest case is 45 days old (CASE-2025-1234).
     Would you like me to show cases by severity or investigator?"

User: "Which ones are overdue?"
AI: "3 cases are past their SLA deadline:
     - CASE-2025-1234: 15 days overdue, High severity
     - CASE-2025-1267: 8 days overdue, Medium severity
     - CASE-2025-1289: 2 days overdue, Medium severity

     Click to view details or I can summarize the investigation status."
```

### AI Assistance Points

| User Action | AI Can Help By | Confidence Level |
|-------------|----------------|------------------|
| Type search query | Parse natural language to structured filters | High |
| View search results | Suggest related entities and patterns | Medium |
| Refine search | Offer filter suggestions based on results | High |
| No results | Suggest alternative queries or spellings | High |
| Subject search | Identify all cases involving this person | High |
| Policy search | Extract relevant sections and summaries | Medium |

### Data Requirements for AI Context

**Minimum Context:**
- User's query text
- User's role and permissions
- Organization settings (language, timezone)

**Enhanced Context (Improves Quality):**
- User's recent searches and views
- Current page context (if searching within entity)
- Popular searches in organization
- Entity relationships (RIU-Case links, subjects)

**Cross-Module Context:**
- Case subjects and their history
- Policy versions and attestation status
- Disclosure responses and campaigns

---

## User Personas

### Ethico Staff (Operator Console)
- **Hotline Operator** - Quick case lookup by access code, caller lookup
- **QA Reviewer** - Find cases pending review, batch operations
- **Implementation Specialist** - Historical data discovery, migration verification

### Client Admin (Client Platform)
- **CCO / Compliance Officer** - Cross-entity discovery, trend identification
- **Investigator** - Case and subject search, policy reference
- **Triage Lead** - Queue management, workload analysis
- **Policy Author** - Policy search, version tracking
- **System Admin** - User and configuration lookup
- **HR Manager** - Disclosure and attestation search

### End User (Ethics Portal, Self-Service)
- **Employee** - Policy search, case status check
- **Anonymous Reporter** - Case status lookup via access code
- **Manager** - Team disclosure status, proxy case lookup

---

## User Stories

### Epic 1: Global Search

#### Client Admin Stories

**US-SRH-001: Global Omnisearch**

As a **Compliance Officer**, I want to search across all entity types from a single search bar so that I can quickly find any information regardless of where it lives in the system.

**Acceptance Criteria:**
- [ ] Search bar is persistent in top navigation across all pages
- [ ] Results include Cases, RIUs, Policies, Disclosures, Employees, Users
- [ ] Results grouped by entity type with counts
- [ ] Each result shows entity type badge, title, snippet, and metadata
- [ ] Results filtered by user's visibility permissions
- [ ] Search executes on Enter or after 300ms typing pause

**AI Enhancement:**
- AI parses natural language queries into structured filters
- AI suggests entity type if ambiguous ("cases" vs "policies")

**Ralph Task Readiness:**
- [ ] Entry point: `apps/backend/src/modules/search/search.controller.ts`
- [ ] Pattern: `apps/backend/examples/controller-pattern.ts`
- [ ] Tests: Verify cross-entity search returns correctly typed results

---

**US-SRH-002: Search Suggestions and Autocomplete**

As a **Triage Lead**, I want to see search suggestions as I type so that I can find common searches quickly and reduce typos.

**Acceptance Criteria:**
- [ ] Suggestions appear after 150ms of typing (3+ characters)
- [ ] Suggestions include: recent searches, popular queries, entity matches
- [ ] Recent searches scoped to current user
- [ ] Popular queries scoped to organization
- [ ] Entity matches show preview (case number, policy title, employee name)
- [ ] Arrow keys navigate suggestions, Enter selects
- [ ] Escape clears suggestions

**AI Enhancement:**
- AI ranks suggestions by relevance to user's role and history
- AI corrects common misspellings

---

**US-SRH-003: Faceted Search Results**

As an **Investigator**, I want to filter search results by entity type, status, date range, and category so that I can narrow down to exactly what I need.

**Acceptance Criteria:**
- [ ] Facets displayed in left sidebar of search results
- [ ] Available facets: Entity Type, Status, Category, Severity, Date Range, Location, Business Unit, Assignee
- [ ] Facet counts update in real-time as filters applied
- [ ] Multiple values within a facet use OR logic
- [ ] Multiple facets use AND logic
- [ ] Clear individual facets or all filters at once
- [ ] URL reflects current filter state for sharing

**AI Enhancement:**
- AI suggests most useful facets based on result set
- AI highlights facet values with unusual counts

---

**US-SRH-004: Search Result Highlighting**

As a **Policy Author**, I want search results to highlight matching text so that I can quickly see why each result matched.

**Acceptance Criteria:**
- [ ] Matching terms highlighted in result snippets
- [ ] Snippets show context around matches (50-100 chars each side)
- [ ] Multiple matches in same document show multiple snippets
- [ ] Stemmed matches highlighted (search "investigating" matches "investigation")
- [ ] Exact phrase matches indicated differently than word matches

---

**US-SRH-005: Search Within Entity**

As an **Investigator**, I want to search within a specific case's notes, attachments, and interviews so that I can find specific information in large investigations.

**Acceptance Criteria:**
- [ ] Search bar on Case detail page searches within that case
- [ ] Searches: notes, interviews, attachments (content), messages
- [ ] Results show source (Note #3, Interview with John Smith)
- [ ] Clicking result scrolls to that section
- [ ] Accessible via keyboard shortcut (Cmd/Ctrl + F)

---

### Epic 2: Entity-Specific Search

#### Client Admin Stories

**US-SRH-010: Case Search View**

As an **Investigator**, I want a dedicated case search interface with case-specific filters so that I can efficiently manage my case workload.

**Acceptance Criteria:**
- [ ] Case list page has advanced search panel
- [ ] Filters: Status, Category, Severity, Assigned To, Location, Business Unit, Date Opened, Date Closed, SLA Status, Outcome, Tags
- [ ] Quick filters for common views (My Cases, Unassigned, Overdue)
- [ ] Results show case number, title, status, severity, assignee, days open
- [ ] Bulk selection for actions (assign, export, close)
- [ ] Pagination with configurable page size (25, 50, 100)

**AI Enhancement:**
- AI suggests "Similar Cases" based on current filters

---

**US-SRH-011: Subject Search**

As an **Investigator**, I want to search for subjects across all cases so that I can identify patterns and repeat offenders.

**Acceptance Criteria:**
- [ ] Search subjects by name, email, department, or employee ID
- [ ] Results show subject with all linked cases
- [ ] Each case shows subject's role (accused, witness, victim)
- [ ] Timeline view of subject's involvement across cases
- [ ] HRIS-linked subjects show employment status
- [ ] Partial name matching supported

**AI Enhancement:**
- AI identifies potential duplicate subjects (similar names)
- AI generates subject summary across all cases

---

**US-SRH-012: Policy Search**

As a **Policy Author**, I want to search policies by title, content, category, or status so that I can quickly find and reference policies.

**Acceptance Criteria:**
- [ ] Search policy title and body content
- [ ] Filter by: Status (Draft, Published, Archived), Category, Owner, Last Updated, Version
- [ ] Results show policy title, status, version, last updated
- [ ] Content snippets show matching text
- [ ] Click result opens policy viewer
- [ ] Include published translations in search

**AI Enhancement:**
- AI suggests related policies
- AI generates policy summary on hover

---

**US-SRH-013: Disclosure Search**

As an **HR Manager**, I want to search disclosure responses so that I can find specific conflicts of interest or gifts reported by employees.

**Acceptance Criteria:**
- [ ] Search by employee name, relationship party, or disclosure content
- [ ] Filter by: Campaign, Disclosure Type (COI, Gift, Outside Employment), Status, Amount Range, Date
- [ ] Results show employee, disclosure type, status, date
- [ ] Link to full disclosure response
- [ ] Filter by "Requires Review" flag

---

**US-SRH-014: Employee Search**

As a **Triage Lead**, I want to search employees from our HRIS so that I can assign cases to the right person and look up employee context.

**Acceptance Criteria:**
- [ ] Search by name, email, employee ID, department, location
- [ ] Results show employee name, title, department, location, manager
- [ ] Show employment status (Active, Terminated, Leave)
- [ ] Quick link to related cases (as subject or related party)
- [ ] Quick link to attestation/disclosure status
- [ ] Indicate if employee is also a platform user

---

### Epic 3: Saved Searches & Views

#### Client Admin Stories

**US-SRH-020: Save Search as View**

As a **Compliance Officer**, I want to save my search filters as a named view so that I can quickly return to frequently-used searches.

**Acceptance Criteria:**
- [ ] "Save View" button available on any search results page
- [ ] Provide name and optional description
- [ ] Saved view includes: query, all filters, sort order, visible columns
- [ ] Saved views appear in Views dropdown and sidebar
- [ ] Up to 25 saved views per user per module
- [ ] Edit and delete existing views

**AI Enhancement:**
- AI suggests view name based on filters applied

---

**US-SRH-021: Shared Views**

As a **Compliance Officer**, I want to share my saved views with my team so that we can standardize on common search patterns.

**Acceptance Criteria:**
- [ ] Option to share view with specific users or roles
- [ ] Shared views appear in recipient's view list marked as shared
- [ ] Changes by owner propagate to all shared users
- [ ] Recipients see data filtered by their own permissions
- [ ] Admin can create organization-wide default views

---

**US-SRH-022: Set Default View**

As an **Investigator**, I want to set my default view for each module so that I see my preferred search results immediately on navigation.

**Acceptance Criteria:**
- [ ] Mark any saved view as default for that module
- [ ] Default view loads automatically on module navigation
- [ ] Organization admin can set role-based defaults
- [ ] User preference overrides organization default
- [ ] Clear indicator when viewing a saved view vs. ad-hoc search

---

### Epic 4: Natural Language Search

#### Client Admin Stories

**US-SRH-030: Natural Language Query Parsing**

As a **CCO**, I want to type natural language queries so that I can search without learning filter syntax.

**Acceptance Criteria:**
- [ ] Recognize entity types ("cases", "policies", "disclosures")
- [ ] Recognize statuses ("open", "closed", "overdue", "pending")
- [ ] Recognize temporal references ("last month", "Q4 2025", "this year")
- [ ] Recognize categories ("harassment", "fraud", "safety")
- [ ] Recognize location/region ("Chicago", "EMEA", "remote")
- [ ] Recognize assignee references ("assigned to me", "unassigned")
- [ ] Show parsed interpretation before executing

**AI Enhancement:**
- Claude parses natural language to structured query
- Show confidence level for ambiguous interpretations
- Offer alternative interpretations if uncertain

---

**US-SRH-031: Conversational Search Refinement**

As a **Compliance Officer**, I want to refine my search through follow-up questions so that I can iteratively narrow down results.

**Acceptance Criteria:**
- [ ] After initial results, show "Refine search" prompt
- [ ] Natural language follow-ups understood in context
- [ ] "Also show closed cases" adds to existing filters
- [ ] "But not in EMEA" removes from results
- [ ] "Sort by date" changes ordering
- [ ] Conversation history shown for reference
- [ ] "Start over" clears context

---

### Epic 5: Related Content Discovery

#### Client Admin Stories

**US-SRH-040: Similar Cases**

As an **Investigator**, I want to see cases similar to the one I'm viewing so that I can learn from past investigations and identify patterns.

**Acceptance Criteria:**
- [ ] "Similar Cases" panel on Case detail page
- [ ] Similarity based on: category, location, subjects, keywords
- [ ] Show up to 5 similar cases with similarity score
- [ ] Explain why each case is similar ("Same location and category")
- [ ] Click to view or add as related case

**AI Enhancement:**
- AI uses semantic similarity (pgvector embeddings)
- AI explains relationship in natural language

---

**US-SRH-041: Related Policies**

As an **Investigator**, I want to see policies relevant to my case so that I can reference applicable rules during investigation.

**Acceptance Criteria:**
- [ ] "Related Policies" panel on Case detail page
- [ ] Policies linked by category mapping
- [ ] Show policy title, version, and relevant section
- [ ] Expandable excerpt of relevant content
- [ ] "Cite in Findings" quick action

**AI Enhancement:**
- AI identifies policy sections most relevant to case content
- AI generates "Applicable Policies" summary

---

**US-SRH-042: Subject History**

As an **Investigator**, I want to see all cases involving a subject so that I understand their history with the organization.

**Acceptance Criteria:**
- [ ] "Subject History" panel when subject is selected
- [ ] Timeline of all cases where subject appears
- [ ] Show role in each case (accused, witness, victim)
- [ ] Show outcome of closed cases
- [ ] Privacy filters apply (don't show cases user can't access)

**AI Enhancement:**
- AI generates subject summary across cases
- AI flags patterns (repeat allegations, department trends)

---

### Epic 6: Search Analytics

#### Ethico Staff Stories

**US-SRH-050: Search Usage Analytics**

As an **Implementation Specialist**, I want to see what users are searching for so that I can optimize the platform and identify training needs.

**Acceptance Criteria:**
- [ ] Dashboard showing: top queries, zero-result queries, popular facets
- [ ] Time-based trends (daily, weekly, monthly)
- [ ] Breakdown by user role and module
- [ ] Scoped to organization (for client admins) or platform (for Ethico staff)
- [ ] Export to CSV

**AI Enhancement:**
- AI clusters similar queries to show true intent
- AI recommends content improvements based on zero-result queries

---

**US-SRH-051: Zero-Result Queries Analysis**

As a **System Admin**, I want to see searches that returned no results so that I can improve content or add synonyms.

**Acceptance Criteria:**
- [ ] List of queries with zero results, sorted by frequency
- [ ] Show query text, count, and date range
- [ ] Suggest similar successful queries
- [ ] Link to add synonym or update taxonomy
- [ ] Exclude obvious typos and gibberish

---

### End User Stories

**US-SRH-060: Anonymous Case Lookup**

As an **Anonymous Reporter**, I want to look up my case status using my access code so that I can check progress without identifying myself.

**Acceptance Criteria:**
- [ ] Access code lookup on Ethics Portal
- [ ] Valid code shows: case status, messages from investigator
- [ ] Invalid code shows generic "not found" (no hints)
- [ ] Rate limiting prevents code enumeration (5 attempts per IP per hour)
- [ ] No activity logged that could identify reporter

---

**US-SRH-061: Employee Policy Search**

As an **Employee**, I want to search published policies in the employee portal so that I can find answers to compliance questions.

**Acceptance Criteria:**
- [ ] Search bar on Employee Portal home page
- [ ] Only searches published, active policies
- [ ] Results show policy title and relevant excerpt
- [ ] Click opens policy viewer (read-only)
- [ ] Suggested policies based on common employee questions

**AI Enhancement:**
- AI answers policy questions directly when possible
- AI shows relevant policy section, not just document

---

## Feature Specifications

### F1: Global Search Bar

**Description:**
Persistent search bar in the top navigation that searches across all entity types the user can access.

**User Flow:**
1. User clicks search bar or presses `/` keyboard shortcut
2. User types query (suggestions appear after 3 characters)
3. User presses Enter or clicks suggestion
4. Results page shows grouped results with facets
5. User refines with filters or clicks result
6. System tracks search for analytics

**Business Rules:**
- Search executes after 300ms typing pause or Enter
- Minimum 2 characters required for search
- Maximum 500 characters for query
- Results limited to entities user has permission to view
- organization_id filter applied automatically via RLS

**Components:**
```
┌─────────────────────────────────────────────────────────────────┐
│  [Search icon] Search cases, policies, people...   [Cmd+/]     │
├─────────────────────────────────────────────────────────────────┤
│  RECENT SEARCHES                                                │
│  ○ harassment cases Q4                                          │
│  ○ policy anti-retaliation                                      │
│                                                                 │
│  SUGGESTIONS                                                    │
│  📁 CASE-2025-1234 - Harassment allegation in Marketing        │
│  📄 Anti-Harassment Policy v2.1                                 │
│  👤 John Smith (Engineering)                                    │
│                                                                 │
│  POPULAR IN YOUR ORGANIZATION                                   │
│  → open cases assigned to me                                    │
│  → overdue investigations                                       │
└─────────────────────────────────────────────────────────────────┘
```

**AI Integration:**
- Natural language parsing on all queries
- Typo correction and synonym expansion
- Query intent classification

**Error Handling:**
| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| Query too short | "Enter at least 2 characters" | Block search |
| Search timeout | "Search took too long. Try narrowing your query." | Log error, suggest filters |
| Zero results | "No results found. Try different keywords or filters." | Show suggestions |
| Service unavailable | "Search is temporarily unavailable. Please try again." | Fallback to basic PostgreSQL search |

---

### F2: Search Results Page

**Description:**
Full-page search results with faceted filtering, result grouping, and action capabilities.

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Search: "harassment cases Chicago"                    [Clear]  │
│  Parsed as: Category=Harassment, Location=Chicago, Type=Cases  │
├─────────────┬───────────────────────────────────────────────────┤
│  FILTERS    │  12 Results                          [Save View]  │
│             │                                                   │
│  Entity Type│  ┌─────────────────────────────────────────────┐ │
│  ○ All (12) │  │ 📁 CASE-2025-1234                    Open   │ │
│  ○ Cases (12)│ │ Harassment allegation in Marketing Dept     │ │
│  ○ Policies │  │ ...filed complaint about hostile work env...│ │
│             │  │ 45 days old • High • Assigned: S. Chen      │ │
│  Status     │  └─────────────────────────────────────────────┘ │
│  ☑ Open (8) │                                                   │
│  ☐ Closed(4)│  ┌─────────────────────────────────────────────┐ │
│             │  │ 📁 CASE-2025-1267                    Open   │ │
│  Severity   │  │ Bullying report from Customer Service       │ │
│  ☑ High (3) │  │ ...pattern of harassment by supervisor...   │ │
│  ☑ Medium(6)│  │ 28 days old • Medium • Assigned: J. Doe     │ │
│  ☐ Low (3)  │  └─────────────────────────────────────────────┘ │
│             │                                                   │
│  Date Range │  [Load More]                                      │
│  [Last 30 d]│                                                   │
│             │                                                   │
│  Location   │  ──────────────────────────────────────────────── │
│  ☑ Chicago  │  RELATED CONTENT (AI-suggested)                  │
│  ☐ New York │  📄 Anti-Harassment Policy v2.1                  │
│             │  👤 3 subjects appear in multiple cases           │
└─────────────┴───────────────────────────────────────────────────┘
```

**User Flow:**
1. Results load grouped by entity type (if mixed) or as list (if single type)
2. User clicks facet to filter results
3. Facet counts update in real-time
4. User clicks result to open detail view
5. "Save View" creates saved search

**Business Rules:**
- Default sort: Relevance (BM25 + recency boost)
- Alternative sorts: Date (newest/oldest), Alphabetical, Severity
- Facets show only values present in results
- Facet counts reflect current filter state
- Maximum 1000 results returned (paginated)

---

### F3: Entity-Specific Search Interfaces

**Description:**
Dedicated search interfaces for each major entity type with type-specific filters and columns.

**Case Search Columns:**
| Column | Description | Sortable |
|--------|-------------|----------|
| Case Number | Reference number (CASE-2025-XXXX) | Yes |
| Title | Case title/summary | Yes |
| Status | Current status badge | Yes |
| Category | Primary category | Yes |
| Severity | High/Medium/Low badge | Yes |
| Assigned To | Investigator name | Yes |
| Location | Location name | Yes |
| Days Open | Calculated from created_at | Yes |
| SLA Status | On Track/Warning/Overdue | Yes |
| Created | Date created | Yes |

**Case Search Filters:**
| Filter | Type | Options |
|--------|------|---------|
| Status | Multi-select | Open, In Progress, Pending Review, Closed, On Hold |
| Category | Multi-select | From organization's category list |
| Subcategory | Multi-select | Filtered by selected categories |
| Severity | Multi-select | Critical, High, Medium, Low |
| Assigned To | User picker | Organization users |
| Assigned Team | Team picker | Organization teams |
| Location | Hierarchy picker | Organization locations |
| Business Unit | Hierarchy picker | Organization business units |
| Date Opened | Date range | Preset ranges + custom |
| Date Closed | Date range | Preset ranges + custom |
| SLA Status | Multi-select | On Track, Warning, Overdue |
| Outcome | Multi-select | Substantiated, Unsubstantiated, Inconclusive, etc. |
| Source Channel | Multi-select | Hotline, Web Form, Chatbot, Proxy |
| Has Subjects | Boolean | Yes/No |
| Tags | Multi-select | Organization tags |

---

### F4: Saved Searches

**Description:**
Persist search configurations for quick access and sharing.

**Components:**
```
SavedSearch {
  id
  organization_id
  created_by_id
  name
  description
  entity_type          // 'all' | 'case' | 'policy' | 'disclosure' | etc.
  query_text           // Original search text
  parsed_query         // Structured query object
  filters              // JSON of applied filters
  sort_field
  sort_direction
  visible_columns      // For list views
  is_default           // Default view for this module
  shared_with          // User IDs or Role IDs
  is_organization_wide // Visible to all org users
  usage_count          // Track popularity
  last_used_at
  created_at
  updated_at
}
```

---

### F5: Natural Language Search

**Description:**
AI-powered query parsing that converts natural language to structured search.

**Query Parsing Pipeline:**
```
1. User input: "open harassment cases in Chicago from last month"
                                    │
2. AI Processing:                   ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  Claude API                                                  │
   │  System: Parse search query into structured filters          │
   │  User: {query}                                               │
   │  Response: {                                                 │
   │    "entity_type": "case",                                    │
   │    "filters": {                                              │
   │      "status": ["OPEN"],                                     │
   │      "category": ["Harassment"],                             │
   │      "location": ["Chicago"],                                │
   │      "created_at": {"gte": "2026-01-01", "lte": "2026-01-31"}│
   │    },                                                        │
   │    "confidence": 0.95,                                       │
   │    "interpretation": "Open harassment cases in Chicago..."   │
   │  }                                                           │
   └─────────────────────────────────────────────────────────────┘
                                    │
3. Display confirmation:            ▼
   "Showing open harassment cases in Chicago from January 2026"
   [Edit Filters]
                                    │
4. Execute structured search        ▼
```

**Supported Query Patterns:**
| Pattern | Example | Parsed To |
|---------|---------|-----------|
| Entity type | "cases", "policies", "disclosures" | entity_type filter |
| Status | "open", "closed", "pending", "overdue" | status filter |
| Category | "harassment", "fraud", "safety" | category filter |
| Severity | "high priority", "critical", "low severity" | severity filter |
| Location | "Chicago", "EMEA", "headquarters" | location filter |
| Time | "last month", "Q4", "this year", "since January" | date_range filter |
| Assignee | "assigned to me", "unassigned", "John's cases" | assigned_to filter |
| Outcome | "substantiated", "closed without finding" | outcome filter |
| Combination | "overdue high severity cases in EMEA" | Multiple filters |

---

### F6: Related Content Discovery

**Description:**
AI-powered suggestions for related entities based on content similarity and entity relationships.

**Similarity Calculation:**
```
Similar Case Score =
  (category_match * 0.3) +
  (location_match * 0.2) +
  (subject_overlap * 0.25) +
  (semantic_similarity * 0.25)
```

**Semantic Similarity (pgvector):**
- Generate embeddings for case descriptions using Claude
- Store in pgvector column on Case entity
- Query for nearest neighbors
- Filter by organization_id and user permissions

**Entity Relationship Mapping:**
| From Entity | Related Entity | Relationship |
|-------------|----------------|--------------|
| Case | Cases | Same subjects, same category |
| Case | Policies | Category mapping, AI-identified |
| Case | RIUs | Direct links via riu_case_associations |
| Policy | Policies | Same category, supersedes |
| Policy | Cases | Violations, references |
| Subject | Cases | Appears in (accused, witness, victim) |
| Employee | Disclosures | Submitted by |
| Employee | Attestations | Assigned to |

---

### F7: Search Analytics

**Description:**
Track and analyze search behavior to improve content and user experience.

**Tracked Events:**
| Event | Data Captured |
|-------|---------------|
| search_executed | query, filters, result_count, response_time |
| result_clicked | query, result_id, result_position, entity_type |
| facet_applied | facet_name, facet_value, result_count_change |
| search_refined | original_query, refined_query, method |
| zero_results | query, filters, suggested_alternatives |
| view_saved | query, filters, view_name |

**Analytics Dashboards:**
- **Search Volume**: Queries per day/week/month
- **Top Queries**: Most frequent search terms
- **Zero Results**: Queries with no results
- **Click-through Rate**: Results clicked / Searches
- **Refinement Rate**: Searches requiring refinement
- **Popular Facets**: Most-used filter combinations

---

## Data Model

### Entities

#### SavedSearch

**Purpose:** Stores user-created saved searches and views for quick access.

```prisma
model SavedSearch {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Creator
  created_by_id         String
  created_by            User     @relation(fields: [created_by_id], references: [id])

  // Search Definition
  name                  String                    // User-provided name
  description           String?                   // Optional description
  entity_type           SearchEntityType          // What type of entity this searches
  query_text            String?                   // Original search text (if any)
  parsed_query          Json?                     // AI-parsed structured query
  filters               Json                      // Applied filter values
  sort_field            String   @default("relevance")
  sort_direction        SortDirection @default(DESC)
  visible_columns       String[]                  // Which columns to show

  // Sharing
  is_default            Boolean  @default(false) // Default view for this module
  shared_with_users     String[]                 // User IDs
  shared_with_roles     String[]                 // Role names
  is_organization_wide  Boolean  @default(false)

  // Usage Tracking
  usage_count           Int      @default(0)
  last_used_at          DateTime?

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Indexes
  @@index([organization_id])
  @@index([organization_id, created_by_id])
  @@index([organization_id, entity_type])
  @@index([organization_id, is_organization_wide])
}

enum SearchEntityType {
  ALL
  CASE
  RIU
  POLICY
  DISCLOSURE
  ATTESTATION
  EMPLOYEE
  USER
  CAMPAIGN
  SUBJECT
}

enum SortDirection {
  ASC
  DESC
}
```

---

#### SearchHistory

**Purpose:** Tracks user search history for suggestions and analytics.

```prisma
model SearchHistory {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // User (nullable for anonymous searches)
  user_id               String?
  user                  User?    @relation(fields: [user_id], references: [id])
  session_id            String?                   // For anonymous users

  // Search Details
  query_text            String                    // Raw query text
  query_normalized      String                    // Lowercased, trimmed
  entity_type           SearchEntityType?         // If entity-specific search
  filters               Json?                     // Applied filters
  parsed_query          Json?                     // AI interpretation

  // Results
  result_count          Int
  first_result_clicked  String?                   // ID of first clicked result
  clicked_results       String[]                  // All clicked result IDs
  time_to_first_click   Int?                      // Milliseconds

  // Performance
  search_duration_ms    Int                       // Time to get results
  index_used            String?                   // 'elasticsearch' | 'postgresql' | 'pgvector'

  // Context
  source_page           String?                   // Where search was initiated
  user_agent            String?
  ip_address            String?                   // Hashed for privacy

  // Timestamp
  created_at            DateTime @default(now())

  // Indexes
  @@index([organization_id, created_at])
  @@index([organization_id, user_id, created_at])
  @@index([organization_id, query_normalized])
  @@index([query_normalized, result_count])       // For zero-result analysis
}
```

---

#### SearchSynonym

**Purpose:** Custom synonyms and query expansions per organization.

```prisma
model SearchSynonym {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Synonym Definition
  term                  String                    // The search term
  synonyms              String[]                  // Equivalent terms
  is_bidirectional      Boolean  @default(true)  // A→B also means B→A

  // Scope
  entity_types          SearchEntityType[]        // Apply to specific types only
  is_system             Boolean  @default(false) // System-managed, not editable

  // Metadata
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String?

  // Indexes
  @@unique([organization_id, term])
  @@index([organization_id])
}
```

---

#### PopularSearch

**Purpose:** Aggregated popular searches per organization for suggestions.

```prisma
model PopularSearch {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Search Pattern
  query_normalized      String                    // Normalized query
  entity_type           SearchEntityType?

  // Metrics
  search_count          Int      @default(1)     // Number of times searched
  click_count           Int      @default(0)     // Number of result clicks
  last_searched_at      DateTime

  // Time Window
  period_start          DateTime                  // Rolling window start
  period_days           Int      @default(30)    // Window size

  // Indexes
  @@unique([organization_id, query_normalized, period_start])
  @@index([organization_id, search_count])
  @@index([organization_id, last_searched_at])
}
```

---

#### SearchAnalytics (Fact Table)

**Purpose:** Aggregated search metrics for analytics dashboards.

```prisma
model SearchAnalyticsFact {
  id                    String   @id @default(uuid())
  organization_id       String
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Dimensions
  date                  DateTime                  // Day-level granularity
  entity_type           SearchEntityType?
  source_page           String?

  // Metrics
  total_searches        Int      @default(0)
  unique_users          Int      @default(0)
  zero_result_searches  Int      @default(0)
  avg_results_count     Float    @default(0)
  avg_response_time_ms  Float    @default(0)
  click_through_rate    Float    @default(0)
  refinement_rate       Float    @default(0)

  // Top Queries (denormalized for fast access)
  top_queries           Json?                     // [{query, count}]
  top_zero_result_queries Json?                   // [{query, count}]

  // Indexes
  @@unique([organization_id, date, entity_type])
  @@index([organization_id, date])
}
```

---

#### Entity Embedding (for Semantic Search)

```prisma
// Extension to existing entities - add embedding column

model Case {
  // ... existing fields ...

  // Semantic Search
  embedding             Unsupported("vector(1536)")?  // pgvector
  embedding_model       String?                        // Model used
  embedding_updated_at  DateTime?
}

model Policy {
  // ... existing fields ...

  // Semantic Search
  embedding             Unsupported("vector(1536)")?
  embedding_model       String?
  embedding_updated_at  DateTime?
}
```

---

### Entity Relationships Diagram

```
┌──────────────────┐       ┌──────────────────┐
│   Organization   │───────│      User        │
└────────┬─────────┘       └────────┬─────────┘
         │                          │
         │ 1                        │ 1
         │                          │
         ▼ *                        ▼ *
┌──────────────────┐       ┌──────────────────┐
│   SavedSearch    │◄──────│  SearchHistory   │
└──────────────────┘       └──────────────────┘
         │
         │
         ▼
┌──────────────────┐       ┌──────────────────┐
│  SearchSynonym   │       │  PopularSearch   │
└──────────────────┘       └──────────────────┘

                           ┌──────────────────┐
                           │SearchAnalyticsFact│
                           └──────────────────┘

Indexed Entities (Elasticsearch):
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│      Case        │  │      Policy      │  │    Disclosure    │
└──────────────────┘  └──────────────────┘  └──────────────────┘
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│       RIU        │  │     Employee     │  │       User       │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## Elasticsearch Index Mappings

### Tenant Isolation Strategy

**Index Naming Convention:** `org_{organizationId}_{entity_type}`

Examples:
- `org_abc123_cases`
- `org_abc123_policies`
- `org_abc123_disclosures`

**Rationale:** Per-tenant indices ensure:
- Complete data isolation at infrastructure level
- Independent scaling per tenant
- Tenant-specific settings (analyzers, synonyms)
- Easy data deletion on tenant offboarding

### Case Index Mapping

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "reference_number": { "type": "keyword" },
      "organization_id": { "type": "keyword" },
      "business_unit_id": { "type": "keyword" },

      "title": {
        "type": "text",
        "analyzer": "english",
        "fields": {
          "keyword": { "type": "keyword" },
          "autocomplete": {
            "type": "text",
            "analyzer": "autocomplete"
          }
        }
      },

      "description": {
        "type": "text",
        "analyzer": "english"
      },

      "ai_summary": {
        "type": "text",
        "analyzer": "english"
      },

      "status": { "type": "keyword" },
      "severity": { "type": "keyword" },

      "category": {
        "type": "object",
        "properties": {
          "id": { "type": "keyword" },
          "name": { "type": "keyword" },
          "path": { "type": "keyword" }
        }
      },

      "location": {
        "type": "object",
        "properties": {
          "id": { "type": "keyword" },
          "name": { "type": "keyword" },
          "country": { "type": "keyword" },
          "path": { "type": "keyword" }
        }
      },

      "assigned_to": {
        "type": "object",
        "properties": {
          "id": { "type": "keyword" },
          "name": { "type": "text" },
          "email": { "type": "keyword" }
        }
      },

      "subjects": {
        "type": "nested",
        "properties": {
          "id": { "type": "keyword" },
          "name": { "type": "text" },
          "type": { "type": "keyword" },
          "employee_id": { "type": "keyword" }
        }
      },

      "source_channel": { "type": "keyword" },
      "outcome": { "type": "keyword" },
      "sla_status": { "type": "keyword" },

      "tags": { "type": "keyword" },

      "days_open": { "type": "integer" },

      "created_at": { "type": "date" },
      "updated_at": { "type": "date" },
      "closed_at": { "type": "date" },

      "created_by": {
        "type": "object",
        "properties": {
          "id": { "type": "keyword" },
          "name": { "type": "text" }
        }
      },

      "custom_fields": { "type": "flattened" },

      "_permissions": {
        "type": "object",
        "properties": {
          "visible_to_users": { "type": "keyword" },
          "visible_to_roles": { "type": "keyword" },
          "visible_to_business_units": { "type": "keyword" }
        }
      }
    }
  },
  "settings": {
    "analysis": {
      "analyzer": {
        "autocomplete": {
          "type": "custom",
          "tokenizer": "autocomplete_tokenizer",
          "filter": ["lowercase"]
        }
      },
      "tokenizer": {
        "autocomplete_tokenizer": {
          "type": "edge_ngram",
          "min_gram": 2,
          "max_gram": 20,
          "token_chars": ["letter", "digit"]
        }
      }
    },
    "number_of_shards": 1,
    "number_of_replicas": 1
  }
}
```

### Policy Index Mapping

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "organization_id": { "type": "keyword" },

      "title": {
        "type": "text",
        "analyzer": "english",
        "fields": {
          "keyword": { "type": "keyword" },
          "autocomplete": {
            "type": "text",
            "analyzer": "autocomplete"
          }
        }
      },

      "content": {
        "type": "text",
        "analyzer": "english"
      },

      "ai_summary": {
        "type": "text",
        "analyzer": "english"
      },

      "status": { "type": "keyword" },
      "version": { "type": "keyword" },
      "version_number": { "type": "integer" },

      "category": {
        "type": "object",
        "properties": {
          "id": { "type": "keyword" },
          "name": { "type": "keyword" }
        }
      },

      "owner": {
        "type": "object",
        "properties": {
          "id": { "type": "keyword" },
          "name": { "type": "text" }
        }
      },

      "tags": { "type": "keyword" },

      "effective_date": { "type": "date" },
      "review_date": { "type": "date" },
      "created_at": { "type": "date" },
      "updated_at": { "type": "date" },
      "published_at": { "type": "date" },

      "translations": {
        "type": "nested",
        "properties": {
          "language": { "type": "keyword" },
          "title": { "type": "text" },
          "content": { "type": "text" }
        }
      }
    }
  }
}
```

### Employee Index Mapping

```json
{
  "mappings": {
    "properties": {
      "id": { "type": "keyword" },
      "organization_id": { "type": "keyword" },
      "hris_employee_id": { "type": "keyword" },

      "full_name": {
        "type": "text",
        "fields": {
          "keyword": { "type": "keyword" },
          "autocomplete": {
            "type": "text",
            "analyzer": "autocomplete"
          }
        }
      },

      "first_name": { "type": "text" },
      "last_name": { "type": "text" },
      "email": { "type": "keyword" },

      "job_title": { "type": "text" },
      "department": { "type": "keyword" },
      "location": {
        "type": "object",
        "properties": {
          "id": { "type": "keyword" },
          "name": { "type": "keyword" }
        }
      },
      "business_unit": {
        "type": "object",
        "properties": {
          "id": { "type": "keyword" },
          "name": { "type": "keyword" }
        }
      },

      "manager": {
        "type": "object",
        "properties": {
          "id": { "type": "keyword" },
          "name": { "type": "text" }
        }
      },

      "employment_status": { "type": "keyword" },
      "employment_type": { "type": "keyword" },

      "hire_date": { "type": "date" },
      "termination_date": { "type": "date" },

      "has_platform_user": { "type": "boolean" },
      "case_count": { "type": "integer" }
    }
  }
}
```

### Index Management

**Indexing Strategy:**
- **Real-time:** Near real-time indexing (<1 second) for entity creates/updates
- **Bulk:** Nightly full reindex for consistency verification
- **Refresh Interval:** 1 second (balance between freshness and performance)

**Indexing Service Pattern:**
```typescript
@Injectable()
export class SearchIndexingService {

  async indexCase(case: Case, organizationId: string): Promise<void> {
    const indexName = `org_${organizationId}_cases`;
    const document = this.transformCaseToDocument(case);

    await this.elasticsearchService.index({
      index: indexName,
      id: case.id,
      document,
      refresh: 'wait_for', // Ensure immediate searchability
    });

    // Update embedding if content changed
    if (this.shouldUpdateEmbedding(case)) {
      await this.updateCaseEmbedding(case);
    }
  }

  async deleteCase(caseId: string, organizationId: string): Promise<void> {
    const indexName = `org_${organizationId}_cases`;

    await this.elasticsearchService.delete({
      index: indexName,
      id: caseId,
    });
  }
}
```

---

## API Specifications

### Endpoints

#### Global Search

```
POST /api/v1/search

Request:
{
  "query": "harassment cases Chicago",
  "entity_types": ["case", "policy"],  // Optional: filter to specific types
  "filters": {                          // Optional: structured filters
    "status": ["OPEN", "IN_PROGRESS"],
    "severity": ["HIGH"],
    "created_at": {
      "gte": "2026-01-01",
      "lte": "2026-01-31"
    }
  },
  "sort": {
    "field": "relevance",              // relevance | created_at | updated_at
    "direction": "desc"
  },
  "page": 1,
  "limit": 25,
  "include_facets": true,
  "include_suggestions": true,
  "natural_language": true              // Enable AI parsing
}

Response (200):
{
  "data": {
    "query_interpretation": {
      "original": "harassment cases Chicago",
      "parsed": {
        "entity_type": "case",
        "filters": {
          "category": ["Harassment"],
          "location": ["Chicago"]
        }
      },
      "confidence": 0.95,
      "natural_language_summary": "Showing harassment cases in Chicago"
    },
    "results": [
      {
        "id": "case-uuid-123",
        "entity_type": "case",
        "reference_number": "CASE-2025-1234",
        "title": "Harassment allegation in Marketing Department",
        "snippet": "...filed complaint about <em>hostile work environment</em>...",
        "status": "OPEN",
        "severity": "HIGH",
        "created_at": "2025-12-15T10:30:00Z",
        "score": 15.234,
        "highlights": {
          "description": ["...pattern of <em>harassment</em> by supervisor..."]
        },
        "metadata": {
          "assigned_to": "Sarah Chen",
          "days_open": 45
        }
      }
    ],
    "facets": {
      "entity_type": [
        { "value": "case", "count": 12 },
        { "value": "policy", "count": 3 }
      ],
      "status": [
        { "value": "OPEN", "count": 8 },
        { "value": "CLOSED", "count": 4 }
      ],
      "severity": [
        { "value": "HIGH", "count": 3 },
        { "value": "MEDIUM", "count": 6 },
        { "value": "LOW", "count": 3 }
      ],
      "category": [
        { "value": "Harassment", "count": 12 }
      ],
      "location": [
        { "value": "Chicago", "count": 12 }
      ]
    },
    "suggestions": {
      "did_you_mean": null,
      "related_queries": [
        "harassment cases EMEA",
        "open harassment investigations"
      ]
    },
    "related_content": [
      {
        "type": "policy",
        "id": "policy-uuid-456",
        "title": "Anti-Harassment Policy v2.1",
        "reason": "Relevant to harassment cases"
      }
    ]
  },
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 12,
    "pages": 1
  },
  "performance": {
    "took_ms": 45,
    "index_used": "elasticsearch"
  }
}

Errors:
- 400: Invalid query or filter syntax
- 401: Not authenticated
- 429: Rate limit exceeded
```

---

#### Search Suggestions

```
GET /api/v1/search/suggestions?q=harass&limit=10

Response (200):
{
  "data": {
    "recent_searches": [
      {
        "query": "harassment cases Q4",
        "searched_at": "2026-02-01T14:30:00Z"
      }
    ],
    "entity_matches": [
      {
        "type": "case",
        "id": "case-uuid-123",
        "title": "CASE-2025-1234: Harassment allegation",
        "subtitle": "Open • High • Marketing"
      },
      {
        "type": "policy",
        "id": "policy-uuid-456",
        "title": "Anti-Harassment Policy",
        "subtitle": "Published • v2.1"
      }
    ],
    "query_completions": [
      "harassment cases",
      "harassment investigations",
      "harassment policy"
    ],
    "popular_queries": [
      {
        "query": "open harassment cases",
        "count": 45
      }
    ]
  }
}
```

---

#### Entity-Specific Search

```
GET /api/v1/cases/search?q=keyword&status=OPEN&category=uuid&page=1&limit=25

Response (200):
{
  "data": [
    {
      "id": "case-uuid-123",
      "reference_number": "CASE-2025-1234",
      "title": "...",
      "status": "OPEN",
      "severity": "HIGH",
      "category": {
        "id": "cat-uuid",
        "name": "Harassment"
      },
      "assigned_to": {
        "id": "user-uuid",
        "name": "Sarah Chen"
      },
      "created_at": "2025-12-15T10:30:00Z",
      "days_open": 45,
      "sla_status": "OVERDUE"
    }
  ],
  "facets": { ... },
  "pagination": { ... }
}
```

---

#### Saved Searches

```
POST /api/v1/search/saved

Request:
{
  "name": "My Open Cases",
  "description": "Cases assigned to me that are open",
  "entity_type": "case",
  "query_text": "assigned to me",
  "filters": {
    "status": ["OPEN", "IN_PROGRESS"],
    "assigned_to": ["current_user"]
  },
  "sort_field": "created_at",
  "sort_direction": "desc",
  "visible_columns": ["reference_number", "title", "status", "severity", "days_open"],
  "is_default": true
}

Response (201):
{
  "id": "saved-search-uuid",
  "name": "My Open Cases",
  "description": "Cases assigned to me that are open",
  ...
}
```

```
GET /api/v1/search/saved

Response (200):
{
  "data": [
    {
      "id": "saved-search-uuid",
      "name": "My Open Cases",
      "entity_type": "case",
      "is_default": true,
      "is_shared": false,
      "usage_count": 45,
      "last_used_at": "2026-02-01T14:30:00Z",
      "created_at": "2025-12-01T10:00:00Z"
    }
  ]
}
```

```
GET /api/v1/search/saved/{id}/execute

Response: Same as POST /api/v1/search with saved filters applied
```

---

#### Similar Content

```
GET /api/v1/cases/{id}/similar?limit=5

Response (200):
{
  "data": [
    {
      "id": "case-uuid-456",
      "reference_number": "CASE-2025-0987",
      "title": "Similar harassment allegation",
      "similarity_score": 0.85,
      "similarity_reasons": [
        "Same category (Harassment)",
        "Same location (Chicago)",
        "Similar description content"
      ]
    }
  ]
}
```

---

#### Subject Search

```
GET /api/v1/subjects/search?q=John+Smith&include_cases=true

Response (200):
{
  "data": [
    {
      "id": "subject-uuid-123",
      "name": "John Smith",
      "employee_id": "emp-uuid",
      "department": "Engineering",
      "cases": [
        {
          "id": "case-uuid-1",
          "reference_number": "CASE-2025-1234",
          "role": "accused",
          "status": "OPEN"
        },
        {
          "id": "case-uuid-2",
          "reference_number": "CASE-2024-5678",
          "role": "witness",
          "status": "CLOSED"
        }
      ],
      "total_case_count": 2,
      "ai_summary": "Subject has appeared in 2 cases over 6 months. One case as accused (harassment), one as witness (safety)."
    }
  ]
}
```

---

#### Search Analytics

```
GET /api/v1/search/analytics?period=30d

Response (200):
{
  "data": {
    "summary": {
      "total_searches": 1234,
      "unique_users": 45,
      "zero_result_rate": 0.05,
      "avg_results": 23.4,
      "avg_response_time_ms": 120
    },
    "trends": [
      { "date": "2026-02-01", "searches": 45 },
      { "date": "2026-01-31", "searches": 52 }
    ],
    "top_queries": [
      { "query": "open cases", "count": 156 },
      { "query": "harassment", "count": 89 }
    ],
    "zero_result_queries": [
      { "query": "empolyee handbook", "count": 12, "suggested": "employee handbook" }
    ],
    "popular_filters": [
      { "filter": "status:OPEN", "count": 234 },
      { "filter": "severity:HIGH", "count": 123 }
    ]
  }
}
```

---

#### Natural Language Query Parsing

```
POST /api/v1/search/parse

Request:
{
  "query": "show me harassment cases from Chicago that are still open from last quarter"
}

Response (200):
{
  "data": {
    "original_query": "show me harassment cases from Chicago that are still open from last quarter",
    "parsed": {
      "entity_type": "case",
      "filters": {
        "category": ["Harassment"],
        "location": ["Chicago"],
        "status": ["OPEN", "IN_PROGRESS"],
        "created_at": {
          "gte": "2025-10-01",
          "lte": "2025-12-31"
        }
      }
    },
    "interpretation": "Open harassment cases in Chicago from Q4 2025",
    "confidence": 0.92,
    "ambiguities": [],
    "alternatives": [
      {
        "interpretation": "All harassment cases (including closed) from Chicago in Q4 2025",
        "filters": { ... }
      }
    ]
  }
}
```

---

## UI/UX Specifications

### Navigation Placement

The search bar is positioned in the top navigation bar and is accessible from all pages:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo]    [Search bar (centered, 400px)]              [Notifications] [User]│
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Screens

#### Global Search Bar (Collapsed)

```
┌────────────────────────────────────────────────────┐
│  🔍 Search cases, policies, people...     Cmd+/   │
└────────────────────────────────────────────────────┘
```

#### Global Search Bar (Expanded with Suggestions)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔍 harass                                                         [×]     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  RECENT SEARCHES                                                             │
│  ⏱️ harassment cases Q4                                                      │
│  ⏱️ harassment policy                                                        │
│                                                                              │
│  CASES                                                                       │
│  📁 CASE-2025-1234 - Harassment allegation in Marketing                     │
│     Open • High • 45 days old                                               │
│  📁 CASE-2025-0987 - Harassment complaint HR                                │
│     In Progress • Medium • 12 days old                                      │
│                                                                              │
│  POLICIES                                                                    │
│  📄 Anti-Harassment Policy v2.1                                             │
│     Published • Updated Jan 2026                                            │
│                                                                              │
│  QUERY SUGGESTIONS                                                           │
│  → harassment cases                                                          │
│  → harassment investigations                                                 │
│  → harassment training                                                       │
│                                                                              │
│  Press Enter to search all, or click a result                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Search Results Page

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back                                                                      │
│                                                                              │
│  🔍 "harassment cases Chicago"                              [Clear Search]  │
│  Showing: Open harassment cases in Chicago (12 results)                     │
│                                                                              │
├────────────────────┬────────────────────────────────────────────────────────┤
│                    │                                                        │
│  FILTERS           │  Sort by: [Relevance ▼]                [Save View]    │
│                    │                                                        │
│  Entity Type       │  ┌──────────────────────────────────────────────────┐ │
│  ● All (12)        │  │ 📁 CASE-2025-1234                        OPEN    │ │
│  ○ Cases (12)      │  │    Harassment allegation in Marketing Dept       │ │
│  ○ Policies (0)    │  │                                                   │ │
│                    │  │    "...filed complaint about <b>hostile work</b>  │ │
│  ─────────────     │  │    <b>environment</b> involving repeated..."      │ │
│                    │  │                                                   │ │
│  Status            │  │    🏷️ High  📍 Chicago  👤 S. Chen  ⏱️ 45 days  │ │
│  ☑ Open (8)        │  └──────────────────────────────────────────────────┘ │
│  ☐ In Progress (2) │                                                        │
│  ☐ Closed (4)      │  ┌──────────────────────────────────────────────────┐ │
│                    │  │ 📁 CASE-2025-1267                        OPEN    │ │
│  ─────────────     │  │    Bullying report from Customer Service         │ │
│                    │  │                                                   │ │
│  Severity          │  │    "...pattern of <b>harassment</b> by           │ │
│  ☑ High (3)        │  │    supervisor over past 3 months..."             │ │
│  ☑ Medium (6)      │  │                                                   │ │
│  ☐ Low (3)         │  │    🏷️ Medium  📍 Chicago  👤 J. Doe  ⏱️ 28 days │ │
│                    │  └──────────────────────────────────────────────────┘ │
│  ─────────────     │                                                        │
│                    │  ┌──────────────────────────────────────────────────┐ │
│  Date Range        │  │ 📁 CASE-2025-1289                        OPEN    │ │
│  [Last 30 days ▼]  │  │    Hostile environment allegation                │ │
│                    │  │    ...                                           │ │
│  ─────────────     │  └──────────────────────────────────────────────────┘ │
│                    │                                                        │
│  Category          │  [Load More Results]                                   │
│  ☑ Harassment (12) │                                                        │
│  ☐ Retaliation (0) │  ────────────────────────────────────────────────────  │
│                    │                                                        │
│  ─────────────     │  RELATED CONTENT (AI-suggested)                        │
│                    │                                                        │
│  Location          │  📄 Anti-Harassment Policy v2.1                        │
│  ☑ Chicago (12)    │     Relevant to harassment cases                      │
│  ☐ New York (0)    │                                                        │
│                    │  👥 3 subjects appear in multiple cases                │
│  ─────────────     │     Click to view subject analysis                    │
│                    │                                                        │
│  [Clear All]       │                                                        │
│                    │                                                        │
└────────────────────┴────────────────────────────────────────────────────────┘
```

#### Case Search View (Entity-Specific)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Cases                                                                       │
│                                                                              │
│  [My Cases] [Unassigned] [Overdue] [All Cases] [+ New View]                │
│                                                                              │
│  🔍 Search cases...                            [Filters ▼] [Columns ▼]     │
│                                                                              │
├──────────────────────────────────────────────────────────────────────────────┤
│  ☐ | Case #       | Title              | Status | Severity | Assignee | Days│
├──────────────────────────────────────────────────────────────────────────────┤
│  ☐ | CASE-2025-1234| Harassment allegation| Open | High    | S. Chen  | 45  │
│  ☐ | CASE-2025-1267| Bullying report     | Open  | Medium  | J. Doe   | 28  │
│  ☐ | CASE-2025-1289| Hostile environment | Open  | Medium  | -        | 15  │
│  ...                                                                         │
├──────────────────────────────────────────────────────────────────────────────┤
│  Showing 1-25 of 156 cases                        [◀ Previous] [Next ▶]    │
└──────────────────────────────────────────────────────────────────────────────┘
```

### AI Panel Design

On search results and detail pages, an AI assistance panel is available:

**Location:** Right sidebar, collapsible
**Content:**
- Natural language search interpretation
- Suggested refinements
- Related content suggestions
- "Ask about these results" chat interface

**User Controls:**
- Toggle panel visibility
- Provide feedback on suggestions
- Copy AI-generated summaries

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` or `Cmd+K` | Focus global search bar |
| `Escape` | Close search dropdown / clear search |
| `Enter` | Execute search or select suggestion |
| `↓` `↑` | Navigate suggestions |
| `Tab` | Switch between result groups |
| `Cmd+S` | Save current search as view |

---

## Migration Considerations

### Data Mapping from Competitor Systems

| Source System | Source Field | Target Field | Transformation |
|---------------|--------------|--------------|----------------|
| NAVEX | case_number | reference_number | Prefix with "NAVEX-" |
| NAVEX | full_text | description | Direct map, index in ES |
| EQS | report_id | reference_number | Prefix with "EQS-" |
| Case IQ | case_text | description | Direct map |
| Any | tags | tags | Normalize to lowercase array |

### Handling Sparse Data

| Field | If Missing | Default/Fallback |
|-------|------------|------------------|
| title | Generate from first 100 chars of description | "Case [reference_number]" |
| ai_summary | Queue for AI generation | null |
| category | Leave null, allow later classification | null |
| embedding | Queue for embedding generation | null |

### Post-Migration Indexing

After data migration:
1. Run full reindex job for all migrated entities
2. Generate AI summaries for cases without them
3. Generate embeddings for semantic search
4. Build initial synonym list from migrated data

---

## Integration Points

### Internal Module Integrations

| Module | Integration Type | Data Exchanged |
|--------|------------------|----------------|
| Case Management | Index/Query | Case entities, real-time updates |
| RIU Management | Index/Query | RIU entities for search |
| Policy Management | Index/Query | Policy documents, versions |
| Disclosures | Index/Query | Disclosure responses |
| Employee/HRIS | Index/Query | Employee records |
| Analytics | Feed | Search analytics data |
| Audit Log | Write | Search activity tracking |
| AI Service | Request | Natural language parsing, embeddings |

### External System Integrations

| System | Integration Method | Sync Frequency |
|--------|-------------------|----------------|
| Elasticsearch | REST API | Real-time |
| PostgreSQL | Prisma ORM | Real-time |
| pgvector | SQL extension | On-demand |
| Redis | Caching | Real-time |

---

## Non-Functional Requirements

### Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Search response time (p50) | < 200ms | Elasticsearch query time |
| Search response time (p95) | < 500ms | End-to-end including parsing |
| Suggestion latency | < 100ms | Time to show autocomplete |
| Indexing latency | < 1 second | Time from save to searchable |
| Natural language parsing | < 2 seconds | AI processing time |

### Scalability

| Metric | Target |
|--------|--------|
| Documents per tenant | 1 million |
| Concurrent searches | 100 per tenant |
| Index size per tenant | 10 GB |
| Total platform indices | 10,000 |

### Reliability

| Metric | Target |
|--------|--------|
| Search availability | 99.9% |
| Indexing availability | 99.5% |
| Fallback to PostgreSQL | < 10 seconds failover |

### Security

- All data filtered by organization_id (RLS)
- Search results filtered by user permissions
- No cross-tenant data leakage
- Search history encrypted at rest
- PII in search logs redacted after 90 days
- Rate limiting: 100 searches per minute per user

---

## Checklist Verification

### AI-First Checklist Compliance

**Schema Design:**
- [x] Semantic field naming used throughout
- [x] Narrative fields (description, ai_summary) included
- [x] Activity log via SearchHistory
- [x] Source tracking fields included (for migrations)
- [x] AI enrichment fields (embeddings, parsed_query)
- [x] Graceful degradation for sparse data

**Feature Design:**
- [x] Chat interaction examples documented
- [x] AI assistance opportunities identified
- [x] Conversation storage in SearchHistory
- [x] AI action audit via search analytics
- [x] Migration impact assessed
- [x] Structured + unstructured data captured

**API Design:**
- [x] AI-friendly responses with context
- [x] Bulk operations supported (batch indexing)
- [x] Natural language search available

**UI Design:**
- [x] AI panel space allocated
- [x] Context preservation designed (saved searches)
- [x] Self-service configuration enabled

**Cross-Cutting:**
- [x] organization_id on all tables
- [x] business_unit_id where applicable
- [x] Audit trail complete
- [x] PII handling documented

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **Omnisearch** | Global search across all entity types |
| **Facet** | Filter dimension with count (e.g., Status: Open (45)) |
| **Relevance** | BM25 score indicating match quality |
| **Embedding** | Vector representation for semantic similarity |
| **Synonym** | Equivalent terms for query expansion |
| **Zero-result query** | Search that returns no results |
| **Saved search** | Persisted filter configuration |
| **Natural language search** | AI-parsed human language query |

### Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | February 2026 | Initial draft | Architecture Team |

---

*End of Search & Discovery PRD*
