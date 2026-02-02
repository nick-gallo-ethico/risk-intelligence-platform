# Ethico Risk Intelligence Platform
## PRD-015: Client Success Dashboard

**Document ID:** PRD-015
**Version:** 1.0
**Priority:** P2 - Medium (Internal Tool)
**Development Phase:** Phase 3
**Last Updated:** February 2026

**Cross-References:**
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md` (v3.2 - Client Success Metrics section)
- Core Data Model: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`
- Analytics Data Model: `01-SHARED-INFRASTRUCTURE/ANALYTICS-DATA-MODEL.md`
- Analytics & Reporting: `02-MODULES/07-ANALYTICS-REPORTING/PRD.md`
- Implementation Portal: `02-MODULES/10-IMPLEMENTATION-PORTAL/PRD.md`

> **Tech Stack:** NestJS (backend) + Next.js (frontend) + shadcn/ui + Tailwind CSS.
> See `01-SHARED-INFRASTRUCTURE/` docs for implementation patterns and standards.

> **Architecture Note:** This is an **Ethico-internal module** for Client Success Managers (CSMs), Account Executives, and Leadership to monitor client health, engagement, and renewal risk. Unlike client-facing modules, this module operates across multiple organizations to provide portfolio-level insights.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [AI-First Considerations](#ai-first-considerations)
3. [User Stories](#user-stories)
4. [Feature Specifications](#feature-specifications)
   - F1: Client Portfolio Dashboard
   - F2: Client Detail View
   - F3: Health Score Engine
   - F4: Usage Analytics
   - F5: Feature Adoption Tracking
   - F6: Churn Risk Prediction
   - F7: Client Benchmarking
   - F8: Proactive Alerts
   - F9: CSM Activity Tracking
   - F10: CRM Integration
5. [Data Model](#data-model)
6. [API Specifications](#api-specifications)
7. [UI/UX Specifications](#uiux-specifications)
8. [Migration Considerations](#migration-considerations)
9. [Integration Points](#integration-points)
10. [Non-Functional Requirements](#non-functional-requirements)
11. [Checklist Verification](#checklist-verification)

---

## Executive Summary

### Purpose

The Client Success Dashboard is an internal Ethico tool that provides Client Success Managers, Account Executives, and leadership with comprehensive visibility into client health, engagement, and renewal risk. It transforms raw usage data into actionable insights that drive retention, expansion, and customer satisfaction.

### Design Philosophy

> "Predict churn before it happens; identify expansion before it's requested."

Unlike external analytics dashboards, this module:
- Operates **cross-tenant** to view all clients in a CSM's portfolio
- Aggregates usage data without exposing client-specific sensitive content
- Predicts churn risk using AI analysis of engagement patterns
- Benchmarks clients against cohort averages
- Integrates with CRM systems for unified customer view

### Target Users

| Role | Primary Use Cases |
|------|-------------------|
| Client Success Manager (CSM) | Portfolio health monitoring, engagement tracking, proactive outreach |
| Account Executive (AE) | Renewal preparation, upsell opportunity identification, deal health |
| VP of Client Success | Team performance, portfolio risk overview, resource allocation |
| VP of Sales | Pipeline health, expansion opportunities, revenue forecasting |

### Key Differentiators

| Capability | Basic CSM Tools | **Ethico Client Success** |
|------------|-----------------|---------------------------|
| Health scoring | Manual tracking | Automated, AI-weighted |
| Usage analytics | Login counts only | Deep feature adoption analysis |
| Churn prediction | Reactive | Proactive AI prediction |
| Benchmarking | None | Cohort-based comparison |
| CRM integration | Manual sync | Real-time bidirectional |
| Playbook triggers | None | Automated action recommendations |

---

## AI-First Considerations

### Conversational Interface

CSMs can interact with the dashboard via natural language:

| User Intent | Example Phrases | AI Response |
|-------------|-----------------|-------------|
| Portfolio health | "Show me at-risk clients" | Filtered list with risk scores |
| Client status | "What's going on with Acme Corp?" | Health summary with recent activity |
| Churn analysis | "Why is Acme's health score dropping?" | Contributing factors analysis |
| Expansion signals | "Which clients are ready for upsell?" | Ranked list with signals |
| Benchmarking | "How does Acme compare to similar clients?" | Cohort comparison chart |
| Activity summary | "What did I do with clients last week?" | CSM activity summary |

**Example Conversation:**
```
CSM: "Show me clients whose health dropped more than 10 points this month"
AI: "I found 4 clients with significant health score drops:

    1. Acme Corp: 72 -> 58 (-14 points)
       - Primary driver: 40% drop in daily active users
       - Last CSM contact: 45 days ago
       - Renewal in 3 months

    2. Beta Industries: 85 -> 73 (-12 points)
       - Primary driver: Stopped using Case Management module
       - Support tickets up 200%
       - Renewal in 6 months

    Would you like me to draft outreach emails for these clients?"

CSM: "Yes, draft an email for Acme Corp"
AI: [Generates personalized outreach email with context]
```

### AI Assistance Points

| Feature | AI Capability | Confidence Level |
|---------|---------------|------------------|
| Churn prediction | ML model predicts 90-day churn probability | High (trained on historical data) |
| Health score drivers | Explains which factors are impacting score | High |
| Recommended actions | Suggests CSM playbook actions | Medium |
| Email drafts | Generates personalized outreach | Medium |
| Meeting prep | Summarizes client status for QBR | High |
| Expansion signals | Identifies usage patterns indicating growth | Medium |

### Data Requirements for AI Context

**Minimum Context:**
- 30 days of usage metrics
- Current health score and trend
- Contract details (renewal date, ARR)
- Recent CSM activities

**Enhanced Context (Improves Quality):**
- 90+ days of historical data
- Support ticket history
- NPS/CSAT survey responses
- Peer cohort benchmark data

**Cross-Module Context:**
- Case Management: Volume, resolution times
- Disclosures: Campaign completion rates
- Policy Management: Attestation compliance
- Analytics: Report usage, dashboard adoption

---

## User Personas

### Ethico Staff (Internal Users)

**Client Success Manager (CSM)**
- Manages portfolio of 15-30 client accounts
- Primary responsibility: retention, adoption, satisfaction
- Tracks health scores, conducts QBRs, drives feature adoption
- Needs: Early warning of issues, actionable insights, time-saving automation

**Account Executive (AE)**
- Focuses on renewals and expansion
- Works closely with CSM on account strategy
- Needs: Deal health indicators, expansion signals, competitive intelligence

**VP of Client Success**
- Oversees CSM team and overall retention metrics
- Reports to executive team on portfolio health
- Needs: Aggregate metrics, team performance, risk forecasting

**VP of Sales**
- Oversees revenue including renewals and expansion
- Needs: Pipeline visibility, ARR at risk, expansion opportunities

---

## User Stories

### Epic 1: Portfolio Visibility

#### US-015-001: View Client Portfolio Health

As a **Client Success Manager**, I want to see all my clients with their health scores in one view
so that I can quickly identify which clients need attention.

**Acceptance Criteria:**
- [ ] Portfolio dashboard shows all assigned clients
- [ ] Each client displays: name, health score, trend (up/down/flat), renewal date, ARR
- [ ] Health score color-coded: green (80+), yellow (60-79), red (<60)
- [ ] Sort by health score, renewal date, ARR, or last contact
- [ ] Filter by health status, contract tier, or custom tags
- [ ] Quick action buttons: Log activity, Schedule call, View details

**AI Enhancement:**
- AI highlights clients requiring immediate attention based on multiple signals
- AI suggests optimal order to address clients based on risk and opportunity

**Ralph Task Readiness:**
- [ ] Entry point: `apps/backend/src/modules/client-success/portfolio.controller.ts`
- [ ] Pattern reference: Analytics dashboard controller
- [ ] Test spec: Portfolio list filtering, sorting, health score display

---

#### US-015-002: View Client Health Trend

As a **Client Success Manager**, I want to see how a client's health score has changed over time
so that I can identify patterns and respond to deteriorating situations early.

**Acceptance Criteria:**
- [ ] Line chart shows health score over 90-day period
- [ ] Key events marked on timeline (e.g., renewal, implementation milestone, support escalation)
- [ ] Comparison to cohort average health trend available
- [ ] Drill-down to see which metrics drove changes on any date
- [ ] Export trend data for QBR presentations

**AI Enhancement:**
- AI provides narrative explanation of health score changes
- AI correlates external factors (support tickets, feature releases) with score changes

---

#### US-015-003: Executive Portfolio Summary

As a **VP of Client Success**, I want to see aggregate health metrics across all clients
so that I can report on portfolio health and allocate resources appropriately.

**Acceptance Criteria:**
- [ ] Summary metrics: Total clients, ARR at risk, average health score
- [ ] Distribution chart: clients by health score band
- [ ] Trend charts: portfolio health over time
- [ ] Breakdown by: tier, industry, CSM, region
- [ ] Comparison to previous period
- [ ] Filter to specific CSM portfolios

**AI Enhancement:**
- AI generates executive summary narrative
- AI predicts portfolio churn rate for upcoming quarter

---

### Epic 2: Usage Analytics

#### US-015-010: View Client Usage Metrics

As a **Client Success Manager**, I want to see detailed usage metrics for a client
so that I can understand their engagement level and identify adoption issues.

**Acceptance Criteria:**
- [ ] DAU/WAU/MAU metrics with trend
- [ ] Login frequency by user role
- [ ] Session duration and depth
- [ ] Peak usage hours (activity heatmap)
- [ ] Comparison to client's historical baseline
- [ ] Comparison to tier cohort average

**AI Enhancement:**
- AI identifies anomalies in usage patterns
- AI suggests engagement strategies based on usage profile

---

#### US-015-011: Track Feature Adoption

As a **Client Success Manager**, I want to see which features each client is using
so that I can drive adoption of underutilized features and identify expansion opportunities.

**Acceptance Criteria:**
- [ ] Feature adoption matrix: rows=features, columns=adoption status
- [ ] Adoption status: Not Licensed, Not Configured, Not Used, Light Use, Active Use
- [ ] Trend indicator for each feature
- [ ] Click to see specific metrics per feature (e.g., cases created, reports run)
- [ ] Filter by module or feature category
- [ ] Highlight features included in contract but not used

**AI Enhancement:**
- AI recommends features to promote based on client profile
- AI drafts feature adoption email campaigns

---

#### US-015-012: User Engagement Heatmap

As a **Client Success Manager**, I want to see which users at a client are active or inactive
so that I can identify champions and at-risk power users.

**Acceptance Criteria:**
- [ ] User list with last login, total sessions, primary activities
- [ ] Visual heatmap of user activity over past 30 days
- [ ] Flag users who haven't logged in for 14+ days
- [ ] Identify "champions" (highest engagement)
- [ ] Track key stakeholders (tagged as CCO, Admin, etc.)
- [ ] Alert when key stakeholder goes inactive

**AI Enhancement:**
- AI identifies potential new champions based on engagement patterns
- AI alerts when champion engagement drops

---

### Epic 3: Health Score & Risk

#### US-015-020: Configure Health Score Weights

As a **VP of Client Success**, I want to configure how health scores are calculated
so that the scoring reflects our business priorities.

**Acceptance Criteria:**
- [ ] View current health score formula with weights
- [ ] Adjust weights for: usage, feature adoption, support health, relationship, contract
- [ ] Preview impact of weight changes on current portfolio
- [ ] Save as new version (audit trail of formula changes)
- [ ] Set different weights by client tier or segment

**AI Enhancement:**
- AI suggests optimal weights based on historical churn correlation
- AI simulates health scores under different weight configurations

---

#### US-015-021: View Churn Risk Prediction

As a **Client Success Manager**, I want to see AI-predicted churn risk for my clients
so that I can take proactive action before clients decide to leave.

**Acceptance Criteria:**
- [ ] Churn risk score (0-100%) for each client
- [ ] Risk category: Low (<20%), Medium (20-50%), High (>50%)
- [ ] Contributing factors listed with impact weights
- [ ] Recommended actions based on risk factors
- [ ] Historical accuracy display (model performance metrics)
- [ ] 30/60/90 day risk horizons

**AI Enhancement:**
- AI explains risk factors in natural language
- AI generates proactive outreach recommendations
- AI compares to similar clients who churned vs. retained

---

#### US-015-022: Receive Proactive Health Alerts

As a **Client Success Manager**, I want to receive alerts when client health changes significantly
so that I can respond quickly to emerging issues.

**Acceptance Criteria:**
- [ ] Alert when health score drops 10+ points in a week
- [ ] Alert when key user goes inactive for 14+ days
- [ ] Alert when support ticket volume spikes
- [ ] Alert when feature usage drops significantly
- [ ] Configurable alert thresholds per client or globally
- [ ] Delivery via in-app notification, email, and Slack

**AI Enhancement:**
- AI prioritizes alerts by severity and opportunity cost
- AI suggests specific actions for each alert type

---

### Epic 4: Benchmarking & Insights

#### US-015-030: Benchmark Client Against Cohort

As a **Client Success Manager**, I want to compare a client's metrics to similar clients
so that I can contextualize their performance and identify improvement opportunities.

**Acceptance Criteria:**
- [ ] Select benchmark cohort: same tier, same industry, same size, custom
- [ ] Compare: health score, feature adoption, usage intensity, support volume
- [ ] Percentile ranking within cohort
- [ ] Gap analysis: where client underperforms cohort
- [ ] Success story examples: similar clients with high scores

**AI Enhancement:**
- AI identifies specific gaps with actionable recommendations
- AI finds "look-alike" success stories for coaching clients

---

#### US-015-031: View Industry Benchmarks

As a **VP of Client Success**, I want to see benchmarks by industry
so that I can set appropriate expectations and targets for different segments.

**Acceptance Criteria:**
- [ ] Aggregate metrics by industry: avg health, avg adoption, avg churn rate
- [ ] Best-in-class examples per industry
- [ ] Trend over time by industry
- [ ] Filter to own portfolio vs. all Ethico clients

**AI Enhancement:**
- AI identifies industry-specific patterns and risks
- AI suggests industry-specific playbooks

---

### Epic 5: CSM Activity Tracking

#### US-015-040: Log CSM Activity

As a **Client Success Manager**, I want to log my interactions with clients
so that I can track relationship health and share context with my team.

**Acceptance Criteria:**
- [ ] Quick log: call, email, meeting, QBR, training
- [ ] Add notes, outcomes, next steps
- [ ] Tag activity type: check-in, issue resolution, expansion discussion
- [ ] Link to specific client contacts
- [ ] Set follow-up reminders
- [ ] Activity visible in client timeline

**AI Enhancement:**
- AI suggests follow-up actions based on activity content
- AI drafts meeting summary from notes

---

#### US-015-041: View Client Timeline

As a **Client Success Manager**, I want to see a unified timeline of all client touchpoints
so that I can understand the full relationship context before engaging.

**Acceptance Criteria:**
- [ ] Timeline shows: CSM activities, support tickets, health score changes, key events
- [ ] Filter by activity type
- [ ] Search within timeline
- [ ] Click to expand activity details
- [ ] Export for QBR preparation

**AI Enhancement:**
- AI generates relationship summary from timeline
- AI identifies gaps in engagement (e.g., no contact in 60 days)

---

#### US-015-042: Track CSM Performance

As a **VP of Client Success**, I want to see CSM team performance metrics
so that I can coach my team and balance workloads.

**Acceptance Criteria:**
- [ ] CSM scorecard: retention rate, NPS, health score improvement, activity volume
- [ ] Portfolio distribution by CSM
- [ ] Activity metrics: calls, meetings, QBRs conducted
- [ ] Response time to alerts
- [ ] Comparison across CSMs (anonymized for team view)

**AI Enhancement:**
- AI identifies CSM coaching opportunities
- AI suggests workload rebalancing

---

### Epic 6: CRM Integration

#### US-015-050: Sync with Salesforce

As a **VP of Client Success**, I want client health data synced to Salesforce
so that our sales team has visibility and we have a single source of truth.

**Acceptance Criteria:**
- [ ] Bidirectional sync: health score, ARR, renewal date to/from Salesforce
- [ ] Create/update Salesforce records from Client Success Dashboard
- [ ] View Salesforce opportunity data in Client Success Dashboard
- [ ] Activity sync: CSM activities appear in Salesforce
- [ ] Configurable sync frequency and field mapping
- [ ] Conflict resolution rules when data differs

**AI Enhancement:**
- AI enriches Salesforce records with health insights
- AI alerts on CRM data quality issues

---

#### US-015-051: Sync with HubSpot

As a **VP of Client Success**, I want client health data synced to HubSpot
so that our customer success workflows are integrated.

**Acceptance Criteria:**
- [ ] Similar capabilities to Salesforce integration
- [ ] Map to HubSpot deals, companies, and contacts
- [ ] Sync CSM activities as HubSpot engagement records
- [ ] Trigger HubSpot workflows based on health changes

**AI Enhancement:**
- AI suggests HubSpot workflow automations based on patterns

---

## Feature Specifications

### F1: Client Portfolio Dashboard

**Description:**
The primary landing page for CSMs showing all clients with health scores, sorted by those needing attention.

**Components:**
1. **Summary Cards** - Total clients, at-risk count, avg health, ARR at risk
2. **Client Grid/List** - Sortable, filterable list with key metrics
3. **Quick Actions** - Log activity, schedule call, open CRM
4. **AI Insights Panel** - Proactive recommendations

**User Flow:**
1. CSM logs in and lands on portfolio dashboard
2. Dashboard loads with clients sorted by priority (AI-determined)
3. CSM scans for red/yellow health scores
4. CSM clicks client to see details or takes quick action
5. CSM logs activities as they work through portfolio

**Business Rules:**
- CSMs see only their assigned clients
- VPs see all clients with ability to filter by CSM
- Health scores refresh hourly
- "At risk" threshold configurable per organization

**AI Integration:**
- AI determines priority order based on urgency and impact
- AI generates daily briefing email with top actions

**Error Handling:**
| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| CRM sync failure | "CRM data may be stale" | Show last sync time, retry button |
| Health score calculation error | "Health score unavailable" | Show "N/A" with tooltip |

---

### F2: Client Detail View

**Description:**
Deep dive into a single client's health, usage, and relationship history.

**Components:**
1. **Header** - Client name, logo, health score, key metrics, quick actions
2. **Health Trend Chart** - 90-day health score with events
3. **Usage Metrics** - DAU/WAU/MAU, session data, feature adoption
4. **Activity Timeline** - CSM activities, support tickets, key events
5. **Contact List** - Key stakeholders with engagement status
6. **AI Panel** - Summary, risk factors, recommended actions

**Layout:**
```
+------------------------------------------------------------------+
| [Logo] Acme Corp                     Health: 72 [trend down]     |
| Tier: Enterprise | ARR: $120K | Renewal: 90 days | CSM: Jane Doe |
| [Log Activity] [Schedule Call] [Open in Salesforce] [More...]    |
+------------------------------------------------------------------+
| Health Trend (90 days)                | AI Insights              |
| [Chart with score line and events]    | - Usage down 15%         |
|                                       | - Champion inactive 20d   |
|                                       | - Recommend: Call Sarah   |
+---------------------------------------+--------------------------+
| Usage | Adoption | Timeline | Contacts | Contract | Notes        |
+------------------------------------------------------------------+
| [Tab content area]                                                |
+------------------------------------------------------------------+
```

---

### F3: Health Score Engine

**Description:**
Calculates composite health scores from multiple weighted metrics.

**Score Components:**

| Component | Description | Default Weight | Data Source |
|-----------|-------------|----------------|-------------|
| **Usage Health** | DAU/WAU/MAU, session depth, login frequency | 25% | Usage metrics |
| **Feature Adoption** | % of licensed features actively used | 20% | Feature tracking |
| **Support Health** | Ticket volume, severity, CSAT | 15% | Support system |
| **Relationship Health** | Contact frequency, stakeholder coverage | 15% | CSM activities |
| **Contract Health** | NPS, renewal likelihood, payment status | 15% | CRM data |
| **Outcome Metrics** | Cases resolved, campaigns completed | 10% | Platform data |

**Calculation:**
```
Health Score = SUM(component_score * component_weight)

Where each component_score is normalized 0-100:
- Usage: (actual_dau / expected_dau) * 100, capped at 100
- Adoption: (features_used / features_licensed) * 100
- Support: 100 - (ticket_score), where more tickets = lower score
- Relationship: based on recency and coverage of interactions
- Contract: NPS weighted + payment status + renewal signals
- Outcomes: based on case resolution rate, campaign completion
```

**Health Score Thresholds:**
| Score Range | Status | Color | Action |
|-------------|--------|-------|--------|
| 80-100 | Healthy | Green | Standard engagement |
| 60-79 | Monitor | Yellow | Increase touchpoints |
| 40-59 | At Risk | Orange | Intervention required |
| 0-39 | Critical | Red | Executive escalation |

**Configuration Options:**
- Adjust weights per component
- Set different weights by client tier or segment
- Override weights for individual clients
- Version control for formula changes

---

### F4: Usage Analytics

**Description:**
Detailed tracking of how clients use the platform.

**Metrics Tracked:**

| Metric | Definition | Calculation |
|--------|------------|-------------|
| DAU | Daily Active Users | Unique users with 1+ action per day |
| WAU | Weekly Active Users | Unique users with 1+ action per week |
| MAU | Monthly Active Users | Unique users with 1+ action per month |
| DAU/MAU Ratio | "Stickiness" | DAU/MAU - higher = more engaged |
| Session Duration | Avg time in app | Total session time / session count |
| Session Depth | Actions per session | Total actions / session count |
| Feature Breadth | Modules accessed | Unique modules used / modules licensed |
| Power Users | Heavy users | Users in top 20% by activity |

**Aggregation:**
- Per-user metrics rolled up to organization
- Stored in fact tables for historical analysis
- Calculated hourly, displayed with 1-hour lag

**Comparison Baselines:**
- Client's own historical average (past 90 days)
- Tier cohort average
- All-client average
- Best-in-tier benchmark

---

### F5: Feature Adoption Tracking

**Description:**
Tracks which platform features each client is using.

**Adoption Levels:**

| Level | Definition | Color |
|-------|------------|-------|
| Not Licensed | Feature not in contract | Gray |
| Not Configured | Licensed but not set up | Red |
| Not Used | Configured but 0 usage (30 days) | Orange |
| Light Use | <25% of expected usage | Yellow |
| Active Use | 25-75% of expected usage | Light Green |
| Power Use | >75% of expected usage | Dark Green |

**Features Tracked:**

| Module | Feature | Expected Usage Metric |
|--------|---------|----------------------|
| Case Management | Case Creation | 10+ cases/month |
| Case Management | Investigation Workflow | 5+ investigations/month |
| Disclosures | Campaign Launch | 1+ campaign/quarter |
| Disclosures | Disclosure Review | Process 80% within SLA |
| Policy Management | Policy Publish | 1+ policy/quarter |
| Policy Management | Attestation Campaign | 1+ campaign/year |
| Analytics | Dashboard Views | 20+ views/month |
| Analytics | Report Exports | 2+ exports/month |
| Chatbot | Conversation Volume | 10+ conversations/month |
| API | API Calls | Any usage = adopted |

**Adoption Score:**
```
Adoption Score = (actively_used_features / licensed_features) * 100
```

---

### F6: Churn Risk Prediction

**Description:**
AI-powered prediction of which clients are likely to churn.

**Model Inputs:**
- Usage trends (declining = risk)
- Feature adoption (low = risk)
- Support health (high tickets = risk)
- Relationship health (no contact = risk)
- Contract signals (NPS, payment issues)
- Historical patterns (time since implementation, seasonality)

**Model Output:**
- Churn probability (0-100%) for 30/60/90 day horizons
- Primary contributing factors
- Confidence score
- Similar client outcomes (retained vs. churned)

**Risk Factors Displayed:**

| Factor | Impact | Explanation |
|--------|--------|-------------|
| Usage Decline | High | DAU dropped 40% vs. 30-day avg |
| Champion Inactive | High | Primary contact no login in 21 days |
| Support Spike | Medium | 3x normal ticket volume |
| Adoption Gap | Medium | Only using 2 of 5 licensed modules |
| Contract Risk | Low | NPS score of 6 (passive) |

**Recommended Actions:**
Based on risk factors, AI suggests playbook actions:
- "Schedule call with primary contact"
- "Offer training on underutilized features"
- "Escalate to VP for executive outreach"
- "Request NPS follow-up interview"

---

### F7: Client Benchmarking

**Description:**
Compare client metrics to peer cohorts.

**Cohort Definitions:**

| Cohort Type | Definition |
|-------------|------------|
| Tier Cohort | Same contract tier (Starter, Pro, Enterprise) |
| Industry Cohort | Same industry vertical |
| Size Cohort | Similar employee count range |
| Tenure Cohort | Similar time as customer |
| Custom Cohort | User-defined criteria |

**Benchmark Metrics:**
- Health score percentile
- Usage intensity percentile
- Feature adoption percentile
- Support health percentile
- Time to value (implementation to active use)

**Visualization:**
- Radar chart comparing client to cohort avg
- Percentile bar showing position within cohort
- Gap analysis table highlighting underperformance areas

---

### F8: Proactive Alerts

**Description:**
Automated notifications when client metrics change significantly.

**Alert Types:**

| Alert | Trigger | Severity | Default Action |
|-------|---------|----------|----------------|
| Health Drop | Score drops 10+ points in 7 days | High | In-app + email |
| Key User Inactive | Stakeholder no login 14+ days | High | In-app + email |
| Support Spike | 3x normal ticket volume | Medium | In-app |
| Usage Decline | DAU drops 30% vs. avg | Medium | In-app |
| Feature Abandoned | Active feature goes unused 30 days | Low | In-app |
| Renewal Approaching | 90/60/30 days to renewal | Medium | In-app + email |
| Contract Utilization | <50% of licensed capacity used | Low | In-app |

**Alert Configuration:**
- Enable/disable per alert type
- Adjust thresholds (e.g., 15 points instead of 10)
- Choose delivery channels
- Set quiet hours
- Mute specific clients temporarily

**Alert Actions:**
- View client details
- Log activity (acknowledges alert)
- Snooze (1 day, 1 week)
- Dismiss (don't show again for this event)

---

### F9: CSM Activity Tracking

**Description:**
Log and track all CSM interactions with clients.

**Activity Types:**

| Type | Description | Fields |
|------|-------------|--------|
| Call | Phone/video call | Duration, attendees, outcome, notes |
| Email | Email exchange | Subject, outcome, follow-up |
| Meeting | In-person or formal meeting | Type (QBR, training, etc.), attendees |
| Training | Feature training session | Topic, attendees, completion |
| Support | Support escalation handling | Ticket reference, outcome |
| Internal | Internal discussion about client | Participants, decision |

**Activity Outcomes:**
- Successful engagement
- Issue identified
- Expansion opportunity
- Risk identified
- Follow-up required
- No action needed

**Follow-up Tracking:**
- Set reminder date
- Link to specific contact
- Auto-alert if overdue
- Track completion

---

### F10: CRM Integration

**Description:**
Bidirectional sync with Salesforce and HubSpot.

**Salesforce Integration:**

| Direction | Data | Sync Frequency |
|-----------|------|----------------|
| To Salesforce | Health score | Real-time |
| To Salesforce | Risk status | Real-time |
| To Salesforce | CSM activities | Real-time |
| From Salesforce | Account details | Hourly |
| From Salesforce | Opportunity data | Hourly |
| From Salesforce | Contact changes | Hourly |

**Field Mapping (Salesforce):**
```
Account.Health_Score__c <- client.health_score
Account.Health_Status__c <- client.health_status
Account.Churn_Risk__c <- client.churn_risk_score
Account.Last_CSM_Activity__c <- client.last_activity_date
Account.CSM_Owner__c <- client.csm_user_id
```

**HubSpot Integration:**
Similar patterns with HubSpot deals and companies.

**Conflict Resolution:**
- Ethico is source of truth for health data
- CRM is source of truth for contract data
- Most recent update wins for shared fields
- Audit log of all sync conflicts

---

## Data Model

### Entities

#### Client (Cross-Tenant Organization View)

**Purpose:** Represents a customer organization from Ethico's perspective for success management.

```prisma
model Client {
  id                    String   @id @default(uuid())

  // Link to Platform Organization
  organization_id       String   @unique
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Business Information
  name                  String                    // Display name for CSM view
  industry              String?
  employee_count        Int?
  region                String?

  // Contract Details
  contract_tier         ContractTier              // STARTER, PROFESSIONAL, ENTERPRISE
  contract_start_date   DateTime
  contract_end_date     DateTime?
  annual_recurring_revenue Decimal?              // ARR in USD
  licensed_modules      String[]                  // Modules included in contract
  licensed_user_count   Int?                      // Max users allowed

  // Assignment
  csm_user_id           String?                   // Ethico CSM responsible
  csm_user              EthicoUser? @relation("CSMAssignment", fields: [csm_user_id], references: [id])
  ae_user_id            String?                   // Account Executive
  ae_user               EthicoUser? @relation("AEAssignment", fields: [ae_user_id], references: [id])

  // Health Tracking
  current_health_score  Int?                      // 0-100
  health_status         HealthStatus              // HEALTHY, MONITOR, AT_RISK, CRITICAL
  health_trend          HealthTrend               // UP, DOWN, FLAT
  churn_risk_score      Int?                      // 0-100 probability

  // CRM Integration
  salesforce_account_id String?
  hubspot_company_id    String?
  crm_sync_enabled      Boolean  @default(false)
  last_crm_sync_at      DateTime?

  // Key Dates
  go_live_date          DateTime?                 // When they started using platform
  last_activity_at      DateTime?                 // Last platform activity
  last_csm_contact_at   DateTime?                 // Last CSM touchpoint
  next_renewal_date     DateTime?

  // Tags and Segmentation
  tags                  String[]                  // Custom tags
  segment               String?                   // Custom segment

  // AI Enrichment
  ai_summary            String?                   // AI-generated client summary
  ai_summary_generated_at DateTime?
  ai_risk_factors       Json?                     // AI-identified risk factors
  ai_recommended_actions Json?                    // AI-suggested next actions

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Relations
  health_scores         ClientHealthScore[]
  usage_metrics         ClientUsageMetric[]
  feature_adoptions     ClientFeatureAdoption[]
  activities            ClientActivity[]
  contacts              ClientContact[]
  alerts                ClientAlert[]
  notes                 ClientNote[]

  @@index([csm_user_id])
  @@index([health_status])
  @@index([next_renewal_date])
  @@index([contract_tier])
}

enum ContractTier {
  STARTER
  PROFESSIONAL
  ENTERPRISE
  CUSTOM
}

enum HealthStatus {
  HEALTHY        // 80+
  MONITOR        // 60-79
  AT_RISK        // 40-59
  CRITICAL       // <40
}

enum HealthTrend {
  UP
  DOWN
  FLAT
}
```

---

#### ClientHealthScore (Health Score History)

**Purpose:** Tracks daily health score snapshots for trend analysis.

```prisma
model ClientHealthScore {
  id                    String   @id @default(uuid())
  client_id             String
  client                Client   @relation(fields: [client_id], references: [id])

  // Score Data
  date                  DateTime @db.Date          // Score date
  overall_score         Int                        // 0-100 composite score

  // Component Scores
  usage_score           Int?                       // 0-100
  adoption_score        Int?                       // 0-100
  support_score         Int?                       // 0-100
  relationship_score    Int?                       // 0-100
  contract_score        Int?                       // 0-100
  outcome_score         Int?                       // 0-100

  // Weights Used (for audit)
  weights_version       String?                    // Reference to weight config version
  weights_snapshot      Json?                      // Actual weights used

  // Context
  notable_events        String[]                   // Events that day (support spike, etc.)

  // Timestamps
  created_at            DateTime @default(now())

  @@unique([client_id, date])
  @@index([client_id, date])
  @@index([date])
}
```

---

#### ClientUsageMetric (Usage Metrics)

**Purpose:** Stores aggregated usage metrics per client per day.

```prisma
model ClientUsageMetric {
  id                    String   @id @default(uuid())
  client_id             String
  client                Client   @relation(fields: [client_id], references: [id])

  // Time Period
  date                  DateTime @db.Date

  // User Metrics
  daily_active_users    Int      @default(0)
  weekly_active_users   Int      @default(0)      // Rolling 7-day
  monthly_active_users  Int      @default(0)      // Rolling 30-day
  total_users           Int      @default(0)      // All registered users
  new_users             Int      @default(0)      // New registrations that day

  // Session Metrics
  total_sessions        Int      @default(0)
  avg_session_duration_seconds Int?
  avg_session_depth     Float?                    // Actions per session

  // Activity Metrics
  total_actions         Int      @default(0)
  cases_created         Int      @default(0)
  cases_closed          Int      @default(0)
  reports_run           Int      @default(0)
  disclosures_submitted Int      @default(0)
  policies_viewed       Int      @default(0)
  chatbot_conversations Int      @default(0)

  // Login Distribution (for heatmap)
  logins_by_hour        Json?                     // { "0": 5, "1": 2, ... }
  logins_by_day_of_week Json?                     // { "mon": 50, "tue": 60, ... }

  // Timestamps
  created_at            DateTime @default(now())

  @@unique([client_id, date])
  @@index([client_id, date])
  @@index([date])
}
```

---

#### ClientFeatureAdoption (Feature Adoption Tracking)

**Purpose:** Tracks adoption status of each feature for each client.

```prisma
model ClientFeatureAdoption {
  id                    String   @id @default(uuid())
  client_id             String
  client                Client   @relation(fields: [client_id], references: [id])

  // Feature Identification
  feature_key           String                    // Unique feature identifier
  feature_name          String                    // Human-readable name
  module                String                    // Parent module

  // Licensing
  is_licensed           Boolean  @default(false)
  licensed_at           DateTime?

  // Configuration
  is_configured         Boolean  @default(false)
  configured_at         DateTime?

  // Usage
  adoption_status       AdoptionStatus
  last_used_at          DateTime?
  usage_30_days         Int      @default(0)     // Usage count in last 30 days
  usage_trend           UsageTrend               // INCREASING, DECREASING, STABLE, NO_USE

  // Benchmarking
  expected_usage        Int?                      // Expected usage for this tier
  adoption_percentile   Int?                      // vs. cohort

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  @@unique([client_id, feature_key])
  @@index([client_id])
  @@index([feature_key])
  @@index([adoption_status])
}

enum AdoptionStatus {
  NOT_LICENSED
  NOT_CONFIGURED
  NOT_USED
  LIGHT_USE
  ACTIVE_USE
  POWER_USE
}

enum UsageTrend {
  INCREASING
  DECREASING
  STABLE
  NO_USE
}
```

---

#### ClientActivity (CSM Activity Log)

**Purpose:** Tracks all CSM interactions with clients.

```prisma
model ClientActivity {
  id                    String   @id @default(uuid())
  client_id             String
  client                Client   @relation(fields: [client_id], references: [id])

  // Activity Details
  activity_type         ActivityType
  subject               String                    // Brief description
  description           String?                   // Detailed notes

  // Participants
  performed_by_id       String                    // Ethico user who logged activity
  performed_by          EthicoUser @relation(fields: [performed_by_id], references: [id])
  client_contacts       String[]                  // ClientContact IDs involved

  // Timing
  occurred_at           DateTime
  duration_minutes      Int?                      // For calls/meetings

  // Outcome
  outcome               ActivityOutcome?
  outcome_notes         String?

  // Follow-up
  follow_up_required    Boolean  @default(false)
  follow_up_date        DateTime?
  follow_up_completed   Boolean  @default(false)
  follow_up_completed_at DateTime?

  // CRM Sync
  salesforce_activity_id String?
  hubspot_engagement_id  String?

  // AI Enhancement
  ai_summary            String?                   // AI-generated summary
  ai_next_steps         String[]                  // AI-suggested follow-ups

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  @@index([client_id, occurred_at])
  @@index([performed_by_id])
  @@index([follow_up_date])
}

enum ActivityType {
  CALL
  EMAIL
  MEETING
  QBR                   // Quarterly Business Review
  TRAINING
  ONBOARDING
  SUPPORT_ESCALATION
  EXECUTIVE_TOUCHPOINT
  INTERNAL_DISCUSSION
  OTHER
}

enum ActivityOutcome {
  SUCCESSFUL_ENGAGEMENT
  ISSUE_IDENTIFIED
  EXPANSION_OPPORTUNITY
  RISK_IDENTIFIED
  FOLLOW_UP_REQUIRED
  NO_ACTION_NEEDED
}
```

---

#### ClientContact (Key Stakeholders)

**Purpose:** Tracks key contacts at each client organization.

```prisma
model ClientContact {
  id                    String   @id @default(uuid())
  client_id             String
  client                Client   @relation(fields: [client_id], references: [id])

  // Identity
  name                  String
  email                 String?
  phone                 String?
  title                 String?

  // Role
  role                  ContactRole               // CHAMPION, EXECUTIVE_SPONSOR, ADMIN, USER
  is_primary            Boolean  @default(false)  // Primary contact
  is_billing            Boolean  @default(false)  // Billing contact
  is_technical          Boolean  @default(false)  // Technical contact

  // Engagement Tracking
  last_platform_login   DateTime?                 // From platform User record
  last_csm_contact      DateTime?                 // Last CSM interaction
  engagement_status     EngagementStatus          // ACTIVE, DECLINING, INACTIVE

  // Platform Linkage
  user_id               String?                   // Link to platform User if applicable

  // CRM Sync
  salesforce_contact_id String?
  hubspot_contact_id    String?

  // Notes
  notes                 String?

  // Status
  is_active             Boolean  @default(true)
  left_company_at       DateTime?

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  @@index([client_id])
  @@index([email])
}

enum ContactRole {
  CHAMPION              // Power user, internal advocate
  EXECUTIVE_SPONSOR     // Budget holder, strategic contact
  ADMIN                 // System administrator
  USER                  // Regular user
  BILLING               // Finance contact
  OTHER
}

enum EngagementStatus {
  ACTIVE                // Regular platform activity
  DECLINING             // Activity dropping
  INACTIVE              // No activity 14+ days
}
```

---

#### ClientAlert (Proactive Alerts)

**Purpose:** Stores generated alerts for clients.

```prisma
model ClientAlert {
  id                    String   @id @default(uuid())
  client_id             String
  client                Client   @relation(fields: [client_id], references: [id])

  // Alert Details
  alert_type            AlertType
  severity              AlertSeverity
  title                 String
  description           String

  // Trigger Data
  trigger_metric        String?                   // Which metric triggered
  trigger_value         String?                   // Value that triggered
  trigger_threshold     String?                   // Threshold that was crossed

  // Context
  related_entity_type   String?                   // contact, feature, etc.
  related_entity_id     String?

  // AI Enhancement
  ai_analysis           String?                   // AI explanation of alert
  ai_recommended_action String?                   // AI-suggested response

  // Status
  status                AlertStatus
  acknowledged_at       DateTime?
  acknowledged_by_id    String?
  snoozed_until         DateTime?
  dismissed_at          DateTime?
  dismissed_by_id       String?
  resolved_at           DateTime?
  resolution_notes      String?

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  @@index([client_id, status])
  @@index([created_at])
  @@index([alert_type])
}

enum AlertType {
  HEALTH_DROP
  KEY_USER_INACTIVE
  SUPPORT_SPIKE
  USAGE_DECLINE
  FEATURE_ABANDONED
  RENEWAL_APPROACHING
  CONTRACT_UTILIZATION_LOW
  CHAMPION_RISK
  NPS_DETRACTOR
  PAYMENT_ISSUE
}

enum AlertSeverity {
  CRITICAL
  HIGH
  MEDIUM
  LOW
}

enum AlertStatus {
  NEW
  ACKNOWLEDGED
  SNOOZED
  DISMISSED
  RESOLVED
}
```

---

#### ClientNote (Free-form Notes)

**Purpose:** Stores free-form notes about clients.

```prisma
model ClientNote {
  id                    String   @id @default(uuid())
  client_id             String
  client                Client   @relation(fields: [client_id], references: [id])

  // Note Content
  title                 String?
  content               String
  note_type             NoteType                  // GENERAL, STRATEGY, RISK, OPPORTUNITY

  // Visibility
  is_private            Boolean  @default(false)  // Only visible to author

  // Author
  created_by_id         String
  created_by            EthicoUser @relation(fields: [created_by_id], references: [id])

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  @@index([client_id, created_at])
}

enum NoteType {
  GENERAL
  STRATEGY
  RISK
  OPPORTUNITY
  QBR_PREP
  INTERNAL
}
```

---

#### HealthScoreConfig (Score Configuration)

**Purpose:** Stores health score calculation configuration.

```prisma
model HealthScoreConfig {
  id                    String   @id @default(uuid())

  // Configuration Identity
  name                  String                    // Config name
  description           String?

  // Scope
  applies_to_tier       ContractTier?             // Null = all tiers
  applies_to_segment    String?                   // Null = all segments

  // Weights (must sum to 100)
  usage_weight          Int      @default(25)
  adoption_weight       Int      @default(20)
  support_weight        Int      @default(15)
  relationship_weight   Int      @default(15)
  contract_weight       Int      @default(15)
  outcome_weight        Int      @default(10)

  // Thresholds
  healthy_threshold     Int      @default(80)
  monitor_threshold     Int      @default(60)
  at_risk_threshold     Int      @default(40)

  // Status
  is_active             Boolean  @default(true)
  is_default            Boolean  @default(false)

  // Version Control
  version               Int      @default(1)
  previous_version_id   String?

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String

  @@index([is_active, is_default])
}
```

---

#### EthicoUser (Internal Ethico Staff)

**Purpose:** Represents Ethico internal staff who use the Client Success Dashboard.

```prisma
model EthicoUser {
  id                    String   @id @default(uuid())

  // Identity
  email                 String   @unique
  first_name            String
  last_name             String

  // Role
  role                  EthicoRole                // CSM, AE, VP_CS, VP_SALES, ADMIN

  // Status
  is_active             Boolean  @default(true)

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Relations
  csm_clients           Client[] @relation("CSMAssignment")
  ae_clients            Client[] @relation("AEAssignment")
  activities            ClientActivity[]
  notes                 ClientNote[]
}

enum EthicoRole {
  CSM
  SENIOR_CSM
  AE
  VP_CLIENT_SUCCESS
  VP_SALES
  ADMIN
}
```

---

### Entity Relationships Diagram

```
EthicoUser (Ethico Staff)
    │
    ├──< CSM Assignment >── Client
    │
    └──< AE Assignment >── Client
                              │
                              ├── ClientHealthScore[] (daily snapshots)
                              │
                              ├── ClientUsageMetric[] (daily metrics)
                              │
                              ├── ClientFeatureAdoption[] (per-feature)
                              │
                              ├── ClientActivity[] (CSM interactions)
                              │
                              ├── ClientContact[] (key stakeholders)
                              │
                              ├── ClientAlert[] (proactive alerts)
                              │
                              └── ClientNote[] (free-form notes)

Client ────── Organization (Platform)
              (1:1 relationship)
```

---

## API Specifications

### Client Endpoints

```
# Client Portfolio
GET    /api/v1/client-success/clients                    # List clients (filterable)
GET    /api/v1/client-success/clients/:id                # Get client details
PUT    /api/v1/client-success/clients/:id                # Update client (tags, segment)
GET    /api/v1/client-success/clients/:id/summary        # AI-generated summary

# Health Scores
GET    /api/v1/client-success/clients/:id/health         # Current health details
GET    /api/v1/client-success/clients/:id/health/history # Health score history
POST   /api/v1/client-success/clients/:id/health/refresh # Force recalculation

# Usage Analytics
GET    /api/v1/client-success/clients/:id/usage          # Usage metrics
GET    /api/v1/client-success/clients/:id/usage/users    # Per-user breakdown
GET    /api/v1/client-success/clients/:id/usage/heatmap  # Activity heatmap data

# Feature Adoption
GET    /api/v1/client-success/clients/:id/adoption       # Feature adoption matrix
GET    /api/v1/client-success/clients/:id/adoption/:feature  # Single feature details

# Benchmarking
GET    /api/v1/client-success/clients/:id/benchmark      # Compare to cohort
GET    /api/v1/client-success/benchmarks/industry/:industry  # Industry benchmarks
```

### Activity Endpoints

```
# CSM Activities
GET    /api/v1/client-success/clients/:id/activities     # List activities
POST   /api/v1/client-success/clients/:id/activities     # Log activity
PUT    /api/v1/client-success/activities/:id             # Update activity
GET    /api/v1/client-success/clients/:id/timeline       # Unified timeline

# Contacts
GET    /api/v1/client-success/clients/:id/contacts       # List contacts
POST   /api/v1/client-success/clients/:id/contacts       # Add contact
PUT    /api/v1/client-success/contacts/:id               # Update contact
DELETE /api/v1/client-success/contacts/:id               # Remove contact

# Notes
GET    /api/v1/client-success/clients/:id/notes          # List notes
POST   /api/v1/client-success/clients/:id/notes          # Add note
PUT    /api/v1/client-success/notes/:id                  # Update note
DELETE /api/v1/client-success/notes/:id                  # Delete note
```

### Alert Endpoints

```
GET    /api/v1/client-success/alerts                     # List all alerts
GET    /api/v1/client-success/clients/:id/alerts         # Client's alerts
PUT    /api/v1/client-success/alerts/:id/acknowledge     # Acknowledge alert
PUT    /api/v1/client-success/alerts/:id/snooze          # Snooze alert
PUT    /api/v1/client-success/alerts/:id/dismiss         # Dismiss alert
PUT    /api/v1/client-success/alerts/:id/resolve         # Resolve alert
```

### Analytics Endpoints

```
# Portfolio Analytics
GET    /api/v1/client-success/analytics/portfolio        # Portfolio summary
GET    /api/v1/client-success/analytics/health-distribution  # Health score distribution
GET    /api/v1/client-success/analytics/at-risk          # At-risk clients summary
GET    /api/v1/client-success/analytics/renewals         # Upcoming renewals

# Churn Prediction
GET    /api/v1/client-success/clients/:id/churn-risk     # Churn risk details
GET    /api/v1/client-success/analytics/churn-risk       # Portfolio churn risk

# CSM Performance
GET    /api/v1/client-success/analytics/csm-performance  # CSM metrics
GET    /api/v1/client-success/analytics/csm/:id/metrics  # Individual CSM metrics
```

### Configuration Endpoints

```
# Health Score Config
GET    /api/v1/client-success/config/health-score        # List configs
POST   /api/v1/client-success/config/health-score        # Create config
PUT    /api/v1/client-success/config/health-score/:id    # Update config
POST   /api/v1/client-success/config/health-score/:id/simulate  # Preview impact

# Alert Config
GET    /api/v1/client-success/config/alerts              # Alert settings
PUT    /api/v1/client-success/config/alerts              # Update settings
```

### CRM Sync Endpoints

```
POST   /api/v1/client-success/clients/:id/sync/salesforce   # Sync to Salesforce
POST   /api/v1/client-success/clients/:id/sync/hubspot      # Sync to HubSpot
GET    /api/v1/client-success/sync/status                   # Overall sync status
POST   /api/v1/client-success/sync/full                     # Trigger full sync
```

### AI Endpoints

```
POST   /api/v1/client-success/ai/chat                    # Natural language query
POST   /api/v1/client-success/clients/:id/ai/summary     # Generate client summary
POST   /api/v1/client-success/clients/:id/ai/actions     # Get recommended actions
POST   /api/v1/client-success/clients/:id/ai/email-draft # Draft outreach email
```

---

### Example API Requests/Responses

#### List Clients

```
GET /api/v1/client-success/clients?health_status=AT_RISK&csm_id=user_123&limit=10

Response (200):
{
  "data": [
    {
      "id": "client_abc",
      "name": "Acme Corporation",
      "industry": "Manufacturing",
      "contract_tier": "ENTERPRISE",
      "annual_recurring_revenue": 120000,
      "current_health_score": 58,
      "health_status": "AT_RISK",
      "health_trend": "DOWN",
      "churn_risk_score": 45,
      "next_renewal_date": "2026-05-15",
      "days_to_renewal": 102,
      "last_csm_contact_at": "2025-12-10T14:30:00Z",
      "csm": {
        "id": "user_123",
        "name": "Jane Smith"
      },
      "ai_risk_factors": [
        { "factor": "usage_decline", "impact": "high", "detail": "DAU down 40%" },
        { "factor": "champion_inactive", "impact": "high", "detail": "Sarah Chen no login 21 days" }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 4,
    "pages": 1
  }
}
```

#### Get Client Health Details

```
GET /api/v1/client-success/clients/client_abc/health

Response (200):
{
  "client_id": "client_abc",
  "overall_score": 58,
  "health_status": "AT_RISK",
  "health_trend": "DOWN",
  "trend_change": -14,
  "trend_period": "30 days",
  "components": {
    "usage": { "score": 45, "weight": 25, "status": "poor" },
    "adoption": { "score": 72, "weight": 20, "status": "fair" },
    "support": { "score": 55, "weight": 15, "status": "poor" },
    "relationship": { "score": 40, "weight": 15, "status": "poor" },
    "contract": { "score": 75, "weight": 15, "status": "fair" },
    "outcome": { "score": 80, "weight": 10, "status": "good" }
  },
  "benchmarks": {
    "tier_average": 78,
    "tier_percentile": 15,
    "industry_average": 75,
    "industry_percentile": 22
  },
  "ai_analysis": "Acme's health has declined significantly over the past month, primarily driven by a 40% drop in daily active users. The main champion, Sarah Chen (CCO), has not logged in for 21 days, which is concerning given the renewal in 3 months. Recommend immediate outreach to understand if there are underlying issues.",
  "ai_recommended_actions": [
    "Schedule call with Sarah Chen to understand reduced engagement",
    "Review recent support tickets for unresolved issues",
    "Offer executive business review with leadership"
  ]
}
```

#### Log CSM Activity

```
POST /api/v1/client-success/clients/client_abc/activities

Request:
{
  "activity_type": "CALL",
  "subject": "Check-in call with Sarah Chen",
  "description": "Discussed recent platform usage and upcoming renewal. Sarah mentioned team has been focused on year-end audit and plans to re-engage in January.",
  "occurred_at": "2026-02-01T10:00:00Z",
  "duration_minutes": 30,
  "client_contacts": ["contact_sarah"],
  "outcome": "SUCCESSFUL_ENGAGEMENT",
  "follow_up_required": true,
  "follow_up_date": "2026-02-15"
}

Response (201):
{
  "id": "activity_xyz",
  "client_id": "client_abc",
  "activity_type": "CALL",
  "subject": "Check-in call with Sarah Chen",
  "occurred_at": "2026-02-01T10:00:00Z",
  "outcome": "SUCCESSFUL_ENGAGEMENT",
  "follow_up_date": "2026-02-15",
  "ai_summary": "Call with CCO Sarah Chen. Year-end audit causing reduced usage. Plans to re-engage January. Follow-up scheduled Feb 15.",
  "ai_next_steps": [
    "Send summary email to Sarah",
    "Update health score notes",
    "Monitor login activity in January"
  ],
  "created_at": "2026-02-01T10:35:00Z"
}
```

---

## UI/UX Specifications

### Navigation Placement

The Client Success Dashboard is accessible only to Ethico internal staff via the Ethico Admin portal:

```
Ethico Admin Portal
├── Operations
│   ├── Operator Console
│   └── QA Dashboard
├── Client Management
│   ├── Client Success Dashboard  [← This module]
│   └── Implementation Portal
├── Sales
│   └── Demo Environment
└── Settings
```

### Key Screens

#### Portfolio Dashboard

```
+------------------------------------------------------------------+
| Client Success Dashboard                    [Jane Smith v] [Settings]|
+------------------------------------------------------------------+
| +-----------+ +------------+ +-------------+ +-----------+        |
| |  Total    | | At Risk    | | Avg Health  | | ARR at    |        |
| | Clients   | |            | |             | | Risk      |        |
| |   24      | |    4       | |    72       | |  $480K    |        |
| | +2 MTD    | | +1 vs LW   | | -3 vs LM    | | 12% total |        |
| +-----------+ +------------+ +-------------+ +-----------+        |
+------------------------------------------------------------------+
| [All Clients] [At Risk] [Renewals <90d] [My Clients] [+ Add View] |
+------------------------------------------------------------------+
| Filter: [Status v] [Tier v] [Industry v] [Search...]     [Export] |
+------------------------------------------------------------------+
|   Client          Health  Trend  Churn   ARR      Renewal  CSM    |
|   ---------------  ------  -----  ------  -------  -------  -----  |
|   Acme Corp        58      ↓ -14  45%    $120K    90d      Jane   |
|   Beta Industries  73      ↓ -12  32%    $85K     180d     Jane   |
|   Gamma LLC        85      → 0    8%     $45K     45d      John   |
|   Delta Inc        92      ↑ +5   3%     $200K    365d     Jane   |
|   [More rows...]                                                  |
+------------------------------------------------------------------+
| AI Insights                                                       |
| - 4 clients need immediate attention based on health trends       |
| - Acme Corp: Schedule call with Sarah Chen (inactive 21 days)     |
| - Beta Industries: Review Case Management module abandonment      |
| [View All Recommendations]                                        |
+------------------------------------------------------------------+
```

#### Client Detail View

```
+------------------------------------------------------------------+
| ← Back to Portfolio                                               |
+------------------------------------------------------------------+
| [Acme Logo] Acme Corporation                                      |
| Enterprise | Manufacturing | 5,000 employees | Chicago, IL        |
+------------------------------------------------------------------+
| Health Score        Churn Risk         ARR             Renewal    |
|    58               45%                $120,000        90 days    |
|    ↓ -14 (30d)      High               Year 3          May 15     |
+------------------------------------------------------------------+
| [Log Activity] [Schedule Call] [Draft Email] [Open in Salesforce] |
+------------------------------------------------------------------+
| [Overview] [Usage] [Adoption] [Timeline] [Contacts] [Notes]       |
+------------------------------------------------------------------+
|                                         | AI Panel               |
| Health Trend (90 days)                  |                        |
| [Line chart with score over time]       | Risk Factors:          |
|                                         | - Usage down 40%       |
| Component Scores:                       | - Champion inactive    |
| ▓▓▓▓▓▓▓▓▓░ Usage (45)                  | - No QBR in 6 months   |
| ▓▓▓▓▓▓▓▓░░ Adoption (72)               |                        |
| ▓▓▓▓▓▓░░░░ Support (55)                | Recommendations:       |
| ▓▓▓▓░░░░░░ Relationship (40)           | 1. Call Sarah Chen     |
| ▓▓▓▓▓▓▓░░░ Contract (75)               | 2. Offer QBR           |
| ▓▓▓▓▓▓▓▓░░ Outcomes (80)               | 3. Review support      |
|                                         |                        |
| vs. Enterprise Avg: 78 (15th %ile)     | [Draft Outreach Email] |
+------------------------------------------------------------------+
```

#### Usage Tab

```
+------------------------------------------------------------------+
| Usage Metrics                                    [Last 30 Days v] |
+------------------------------------------------------------------+
| +------------------+ +------------------+ +------------------+    |
| | Daily Active     | | Weekly Active    | | Monthly Active   |    |
| |    12            | |    28            | |    42            |    |
| | ↓ -40% vs avg    | | ↓ -25% vs avg    | | ↓ -15% vs avg    |    |
| +------------------+ +------------------+ +------------------+    |
+------------------------------------------------------------------+
| Activity Heatmap (logins by hour/day)                             |
| [Heatmap visualization]                                           |
+------------------------------------------------------------------+
| User Engagement                                                   |
| User              Role     Last Login  Sessions (30d)  Status     |
| Sarah Chen        CCO      21 days ago      2         Inactive    |
| Mike Johnson      Admin    2 days ago       18        Active      |
| Lisa Wang         Invest.  1 day ago        22        Active      |
| Tom Brown         Invest.  5 days ago       12        Declining   |
+------------------------------------------------------------------+
```

#### Adoption Tab

```
+------------------------------------------------------------------+
| Feature Adoption Matrix                                           |
+------------------------------------------------------------------+
| Module               Feature              Status      Usage (30d) |
| ─────────────────────────────────────────────────────────────────|
| Case Management      Case Creation        Active Use      45     |
|                      Investigation        Light Use       8      |
|                      Remediation          Not Used        0      |
| ─────────────────────────────────────────────────────────────────|
| Disclosures          Campaigns            Active Use      3      |
|                      Review Workflow      Active Use      28     |
| ─────────────────────────────────────────────────────────────────|
| Policy Management    Policy Editor        Not Configured  -      |
|                      Attestations         Not Licensed    -      |
| ─────────────────────────────────────────────────────────────────|
| Analytics            Dashboards           Light Use       5      |
|                      Reports              Not Used        0      |
+------------------------------------------------------------------+
| Adoption Score: 62%                                               |
| Licensed features used: 5 of 8                                    |
| Expansion opportunity: Policy Management (not configured)         |
+------------------------------------------------------------------+
```

### AI Panel Design

The AI panel appears on the right side of client detail views:

**Location:** Right sidebar, collapsible
**Content:**
- AI-generated client summary
- Risk factors with impact levels
- Recommended actions (clickable)
- Chat interface for questions

**User Controls:**
- Collapse/expand panel
- Refresh AI analysis
- Provide feedback on recommendations
- Copy insights to clipboard

---

## Migration Considerations

### Initial Data Population

When deploying the Client Success Dashboard:

1. **Client Records:** Auto-created from existing Organizations
2. **Historical Usage:** Backfill from platform analytics (90 days minimum)
3. **Health Scores:** Initial calculation on deployment
4. **Contacts:** Import from CRM if integration configured

### Data Mapping from CRM

| CRM Source | Client Success Field | Transformation |
|------------|---------------------|----------------|
| Salesforce Account.Name | client.name | Direct copy |
| Salesforce Account.Industry | client.industry | Map to taxonomy |
| Salesforce Account.AnnualRevenue | client.annual_recurring_revenue | Currency conversion if needed |
| Salesforce Account.OwnerId | client.ae_user_id | Map to EthicoUser |
| HubSpot Company.industry | client.industry | Map to taxonomy |

### Handling Missing Data

| Field | If Missing | Default/Fallback |
|-------|------------|------------------|
| Industry | Use "Other" | "Other" |
| ARR | Leave null | Exclude from ARR calculations |
| Contacts | Create placeholder | Mark for CSM to update |
| Usage data | Start from deployment | No historical baseline initially |

---

## Integration Points

### Internal Module Integrations

| Module | Integration Type | Data Exchanged |
|--------|------------------|----------------|
| Case Management | Read | Case volume, resolution times, outcomes |
| Disclosures | Read | Campaign completion rates, escalation rates |
| Policy Management | Read | Attestation completion, policy views |
| Analytics | Read | Report usage, dashboard views |
| Operator Console | Read | Call volume, QA metrics |
| Notifications | Write | Send alerts to CSMs |

### External System Integrations

| System | Integration Method | Sync Frequency |
|--------|-------------------|----------------|
| Salesforce | REST API + Webhooks | Real-time (health), Hourly (details) |
| HubSpot | REST API + Webhooks | Real-time (health), Hourly (details) |
| Slack | Webhooks | Real-time alerts |
| Email (SendGrid) | API | On-demand |

### Data Collection Flow

```
Platform Modules (Case, Disclosure, Policy, Analytics)
        │
        │ Usage events, completions, logins
        ▼
Analytics Service (aggregation)
        │
        │ Daily metrics aggregation
        ▼
Client Usage Metrics (stored)
        │
        │ Health score calculation (hourly)
        ▼
Client Health Scores (stored)
        │
        │ Alert evaluation
        ▼
Client Alerts (generated) ──► Notification Service ──► CSM
        │
        │ CRM sync (if enabled)
        ▼
Salesforce/HubSpot (updated)
```

---

## Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| Portfolio dashboard load | < 2 seconds |
| Client detail load | < 1 second |
| Health score calculation | < 30 seconds per client |
| Full portfolio recalc | < 5 minutes |
| AI summary generation | < 5 seconds |
| CRM sync latency | < 1 minute |

### Scalability

- Support 1,000+ client organizations
- Support 50+ concurrent CSM users
- Store 3+ years of historical metrics
- Process 100,000+ usage events per day

### Security

- Ethico staff only (no client access to this module)
- Role-based access (CSM sees own portfolio, VP sees all)
- Audit log for all data access
- CRM credentials encrypted at rest
- No client PII visible (aggregated metrics only)

### Reliability

- Health scores calculated every hour
- Alerts generated within 5 minutes of trigger
- CRM sync retries 3x on failure
- 99.9% uptime SLA

### Data Retention

- Health score history: 3 years
- Usage metrics: 3 years
- CSM activities: 7 years
- Alerts: 1 year

---

## Checklist Verification

### AI-First Checklist Compliance

**Schema Design:**
- [x] Semantic field naming used throughout
- [x] Narrative fields (description, notes) included
- [x] Activity log designed with natural language descriptions
- [x] Source tracking fields included (CRM sync)
- [x] AI enrichment fields included (ai_summary, ai_risk_factors, ai_recommended_actions)
- [x] Graceful degradation for sparse data

**Feature Design:**
- [x] Chat interaction examples documented
- [x] AI assistance opportunities identified
- [x] Conversation storage planned (via AI endpoints)
- [x] AI action audit designed (all AI calls logged)
- [x] Migration impact assessed
- [x] Structured + unstructured data captured

**API Design:**
- [x] AI-friendly responses with context
- [x] Bulk operations supported
- [x] Natural language query endpoint available

**UI Design:**
- [x] AI panel space allocated (right sidebar)
- [x] Context preservation designed
- [x] Self-service configuration enabled (health score weights)

### Cross-Cutting Compliance

- [x] organization_id on all client-linked tables (via client_id)
- [x] Audit trail complete (activities, alerts, CRM sync)
- [x] No PII exposure (aggregated metrics only)
- [x] Internal-only access enforced

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **ARR** | Annual Recurring Revenue - yearly contract value |
| **CSM** | Client Success Manager - Ethico staff responsible for client health |
| **AE** | Account Executive - Ethico sales responsible for renewals and expansion |
| **Health Score** | Composite metric (0-100) indicating client engagement and risk |
| **Churn Risk** | AI-predicted probability of client not renewing |
| **Champion** | Key contact who actively uses and advocates for the platform |
| **QBR** | Quarterly Business Review - formal client check-in meeting |
| **Cohort** | Group of similar clients for benchmarking purposes |
| **Adoption** | Extent to which client is using licensed features |
| **NPS** | Net Promoter Score - customer satisfaction metric |

### Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Feb 2026 | Initial draft | Claude |

---

*End of Client Success Dashboard PRD*
