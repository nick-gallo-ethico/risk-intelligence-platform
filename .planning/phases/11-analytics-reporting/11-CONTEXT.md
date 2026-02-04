# Phase 11: Analytics & Reporting - Context

**Gathered:** 2026-02-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver data-driven insights through pre-built dashboards, custom dashboard builder, AI natural language queries, board reports, "My Work" unified queue, flat file exports, scheduled delivery, and migration connectors. Also addresses accumulated tech debt and ensures Acme Co. demo data is "lived-in" for all platform features.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Architecture

**Role-based defaults:**
- CCO Dashboard → COMPLIANCE_OFFICER, SYSTEM_ADMIN
- Investigator Dashboard → INVESTIGATOR, TRIAGE_LEAD
- Campaign Manager Dashboard → DEPARTMENT_ADMIN, MANAGER

**Pre-built widgets per dashboard:**

| CCO Dashboard | Investigator Dashboard | Campaign Manager Dashboard |
|---------------|------------------------|---------------------------|
| Compliance Health Score (1x1) | My Assignments (2x2) | Active Campaigns (2x2) |
| RIU Intake Trends (2x1) | Case Pipeline (2x1) | Disclosure Trends (2x1) |
| Case Pipeline (2x1) | SLA Alerts (1x1) | Non-Responders (1x1) |
| Campaign Completion (2x1) | Recent Activity (1x2) | Conflict Alerts (1x2) |
| SLA Performance (1x1) | Unassigned Queue (2x1) | Campaign Calendar (2x1) |
| Top Risk Categories (1x1) | Investigation Progress (1x1) | Attestation Completion (1x1) |
| Recent High-Severity (1x2) | Quick Actions (1x1) | Quick Launch (1x1) |
| Board Report Quick Gen (1x1) | | |

**Customization model:**
- UserDashboardConfig stored per user
- Users can add/remove/rearrange widgets
- Admin-managed dashboard templates (no auto-propagation to existing users)
- Multiple dashboards per user allowed, one designated as "home"

**Refresh strategy:**
- Polling with configurable interval (1-30 min, default 5 min)
- Per-widget override capability
- Pause polling when tab is hidden
- Manual refresh always available (R keyboard shortcut)
- Delta fetching where supported, batch requests, Redis cache layer

**Responsive behavior:**
- Full grid + drag-drop on desktop (≥1280px)
- 2-column grid on tablet with drag-drop
- Single column stack on mobile (<768px), no drag-drop
- Widgets simplify on mobile (charts → sparklines, tables → top 5 rows)

**Widget sharing:**
- Two scopes: PERSONAL (user only) and ORG_PUBLISHED (shared)
- Only COMPLIANCE_OFFICER and SYSTEM_ADMIN can publish to org library
- Widgets backed by SavedDataset (reusable query definitions)
- Adding org widget creates reference (updates propagate); user can detach for personal copy

**Date range controls:**
- Global dashboard picker (default: Last 30 days)
- Per-widget override with toggle "Use dashboard date range"
- Override widgets show badge indicator
- Presets: Today, Last 7/30/90 days, Last 12 months, YTD, Custom

**Period comparison:**
- Optional comparison mode per widget
- Shows % change and comparison data when enabled

**Drill-down behavior:**
- Click chart segment → navigate to filtered entity list
- URL encodes filters for bookmarkable deep links
- Shift+click → open in new tab

**No dashboard alerts for v1:**
- Alerting handled by Phase 7 notification system
- Dashboards focus on visualization, notifications handle alerting

**Permissions:**
- Strict RLS everywhere — widgets only show data user can access
- Same rules as entity lists, no exceptions
- Investigator sees assigned cases only in all widgets

### Export & Print

**Multi-format export:**
| Format | Use Case | Libraries |
|--------|----------|-----------|
| PDF | Distribution, archival | Puppeteer |
| PPTX | Board presentations | pptxgenjs |
| XLSX | Data analysis | ExcelJS (streaming) |

**Board Report enhancement:**
- PDF + PPTX combo generation
- AI-generated executive summary as first page/slide
- Schedulable for monthly auto-delivery

### Widget Library (Extended Set)

Chart types: Line, Bar, Donut/Pie, Area, Stacked bar, Sparkline, KPI card, Table, List, Heatmap, Funnel, Sankey, Treemap, Gauge, Scatter

Layout library: react-grid-layout

### AI Query Interface

**Location:**
- Command palette (Cmd+K) opens AI anywhere
- Dashboards have "Ask AI" button
- Results can be saved as widgets or reports

**Result presentation:**
- Auto-select best format based on query result type:
  - Single number → KPI card
  - Small list (<20) → Table
  - Large list (20+) → Paginated table
  - Time series → Line/bar chart
  - Distribution → Pie/donut
  - Comparison → Horizontal bar
  - Yes/No → Plain text
- User can toggle between formats
- Natural language summary always included

**Response structure:**
- `summary`: One-line natural language summary
- `visualization`: Auto-selected chart with data
- `interpretedQuery`: What AI understood (for transparency)
- `canSaveToDashboard`: Boolean
- `alternateFormats`: Available format toggles

**Query capabilities:**
- Cross-entity linked queries (cases → RIUs → persons, disclosures → persons → cases)
- History + smart suggestions based on context and role
- Clarification dialog when AI can't understand or finds no results
- Strict RLS — same permission rules as dashboards

**Persistence:**
- Save AI queries to report library
- Can re-run on demand, schedule delivery, or add as dashboard widget

### My Work Unified Queue

**Task types aggregated:**
- Case assignments
- Investigation steps
- Remediation tasks
- Disclosure reviews
- Campaign responses
- Approval requests

**Sorting:**
- Priority-weighted due date (default)
- Overdue first, then priority × days until due
- High-priority due tomorrow beats low-priority due today

**Sections:**
- "My Tasks" — assigned to user
- "Available" — user can claim based on role/region

**Filtering & grouping:**
- Full filter panel: task type, entity type, priority, due date range, status
- Group by: entity, type, due date
- Saved views support for custom filter combinations

**Notifications integration:**
- Separate but linked
- Notifications = alerts about events
- My Work = actionable tasks
- Task assignment notification links to My Work item

**Actions available:**
- View details
- Mark complete
- Reassign
- Snooze
- Add note
- Bulk actions for multi-select

### Flat File Export

**Format options:**
1. **Normalized (Multi-sheet)** — One sheet per entity, relationships via IDs
2. **Denormalized (Single sheet)** — Flattened view, all related data inline

**Pre-built export templates:**
| Template | Root Entity | Use Case |
|----------|-------------|----------|
| Case Summary | Case | Auditors, board reports |
| Investigation Detail | Investigation | Investigation oversight |
| RIU Intake Report | RIU | Intake analysis |
| Campaign Compliance | CampaignAssignment | Compliance tracking |
| Person Involvement | Person | Pattern detection, HR |

**Tagged fields system:**
- Field-level tags: AUDIT, BOARD, PII, SENSITIVE, EXTERNAL, MIGRATION
- Export templates filter by tags (include/exclude)
- Admins configure field tags in Settings → Export Configuration

**Scheduled exports:**
- Configure schedule (daily/weekly/monthly)
- Recipients list
- Format selection
- Delivery via email or saved to cloud

**Export audit trail:**
- Full audit: who, what fields, when, IP, optional reason
- Permanent retention
- Searchable by auditors

### Migration Connectors

**Scope:** One-time migration (not ongoing sync)

**Connector priority:**
| Connector | Priority |
|-----------|----------|
| NAVEX EthicsPoint | P0 |
| EQS/Conversant | P0 |
| Legacy Ethico | P0 |
| Generic CSV | P0 |
| OneTrust Ethics | P1 |
| STAR (Compliance 360) | P1 |

**Migration flow:**
1. Upload → User uploads export file(s)
2. Detect → System auto-detects format
3. Map → Smart field mapping with suggestions
4. Validate → Check integrity, flag issues
5. Preview → Show sample before commit
6. Import → Background job with progress
7. Verify → Summary report
8. Rollback → Available for 7 days

**Screenshot-to-form AI:**
- Dual entry points: Migration Assistant + General Form Builder
- Upload screenshot/PDF/photo → AI extracts fields → generates form definition
- Same AI engine, two contexts
- Competitor-specific hints for migration context

### Reports Everywhere (HubSpot Pattern)

**Entry points for report creation:**
1. Entity lists → "Create Report from Filters" button
2. Saved views → "Convert to Report" action
3. Dedicated Reports section → full builder from scratch
4. Dashboard widget → "View as Report" menu option
5. AI query result → "Save as Report" button

**Relationship:**
- Saved View = filtered list for daily work (no visualization)
- Report = visualization + scheduling
- Widget = report embedded in dashboard

### Tech Debt (Comprehensive Pass)

**Backend infrastructure:**
- WebSocket E2E testing
- Auth edge cases
- Queue monitoring
- Error handling improvements

**Frontend performance:**
- Bundle splitting
- Lazy loading
- Caching
- Virtualized lists for large datasets

**Data layer optimization:**
- Query optimization
- Index tuning
- ES mapping improvements
- Cache strategy refinement

### Acme Co. Demo Data Update

**Full data coverage:**
- Dashboards with real metrics from all phases
- Saved reports demonstrating templates
- Scheduled export configurations
- AI query history showing conversation patterns
- Unified work queue with items from all task types

**Curated demo scenarios (5-10):**
- "Show board report" with executive summary data
- "Run AI query" with compelling results
- "View my work queue" with priority-ordered tasks
- "Generate compliance export" with realistic data
- "Migrate from NAVEX" demo with sample import

### Claude's Discretion

- Exact chart library choice (Recharts, Visx, Chart.js)
- Dashboard grid breakpoints and widget minimum sizes
- AI query prompt engineering and model selection
- Export file naming conventions
- Migration field mapping heuristics
- Cache TTL values for dashboard data
- Background job concurrency limits

</decisions>

<specifics>
## Specific Ideas

- "I want the HubSpot experience — filter any list, one click to save as report"
- Widget sharing follows HubSpot pattern: personal → publish to org → others add reference
- AI should choose visualization format automatically, user can override
- Board report = PDF + PPTX combo with AI executive summary
- "Migrate from NAVEX in under an hour" as sales pitch
- Same screenshot-to-form AI for both migration and general form building
- My Work queue should feel like a unified inbox, not scattered task lists

</specifics>

<deferred>
## Deferred Ideas

- Real-time WebSocket dashboard updates (v1.x) — polling is sufficient for compliance data
- Dashboard threshold alerts (v1.x) — Phase 7 notification system handles alerting
- Ctrl+click side panel preview for drill-down (v1.x) — navigation works for v1
- Ongoing sync with competitor systems — one-time migration is the use case
- Custom template builder for exports (v1.x) — pre-built templates cover common cases

</deferred>

---

*Phase: 11-analytics-reporting*
*Context gathered: 2026-02-04*
