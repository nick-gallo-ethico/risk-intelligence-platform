# Ethico Risk Intelligence Platform
## PRD-011: Sales Demo Module

**Document ID:** PRD-011
**Version:** 1.0
**Priority:** P1 - Strategic (Sales Enablement)
**Development Phase:** Phase 2 (Post-Core Platform)
**Last Updated:** February 2026

**Cross-References:**
- Platform Vision: `00-PLATFORM/01-PLATFORM-VISION.md` (see Demo Environment section)
- Core Data Model: `01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md`
- Authentication & Multi-tenancy: `01-SHARED-INFRASTRUCTURE/TECH-SPEC-AUTH-MULTITENANCY.md`
- Case Management PRD: `02-MODULES/05-CASE-MANAGEMENT/PRD.md`
- Analytics PRD: `02-MODULES/07-ANALYTICS-REPORTING/PRD.md`

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [AI-First Considerations](#2-ai-first-considerations)
3. [User Stories](#3-user-stories)
4. [Feature Specifications](#4-feature-specifications)
5. [Data Model](#5-data-model)
6. [API Specifications](#6-api-specifications)
7. [UI/UX Specifications](#7-uiux-specifications)
8. [Demo Data Generation](#8-demo-data-generation)
9. [Integration Points](#9-integration-points)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Checklist Verification](#11-checklist-verification)

---

## 1. Executive Summary

### Purpose

The Sales Demo Module enables Ethico's sales team to provision on-demand demo environments ("Acme Co.") with realistic, pre-populated compliance data. This eliminates the need for shared demo environments that get polluted, enables customization for specific prospects, and provides analytics on prospect engagement during demos.

### Target Users

| Role | Primary Use Cases |
|------|-------------------|
| Sales Representative | Provision demos, share with prospects, track engagement |
| Sales Engineer | Customize scenarios, configure industry-specific data |
| Sales Manager | Monitor team demo usage, analyze prospect engagement |
| Ethico Admin | Manage demo templates, set quotas, cleanup policies |

### Key Differentiators

- **Instant Provisioning**: One-click demo tenant creation with realistic "lived-in" data
- **Industry Templates**: Pre-built scenarios for healthcare, finance, manufacturing, etc.
- **Customization Wizard**: Add prospect logos, adjust categories to match their business
- **Engagement Analytics**: See which features prospects explored during self-guided demos
- **AI-Powered Data**: AI generates realistic narratives for demo cases and disclosures
- **Clean Reset**: Refresh demo data without losing customizations

### Business Value

| Benefit | Impact |
|---------|--------|
| Faster demo setup | Reduce demo prep from hours to minutes |
| Personalized demos | Higher conversion through relevance |
| No demo pollution | Each rep has their own clean environment |
| Prospect insights | Know what resonates before follow-up calls |
| Scalable sales | Enable concurrent demos without conflicts |

---

## 2. AI-First Considerations

### Conversational Interface

How users might interact with this module via natural language chat:

| User Intent | Example Phrases | AI Response |
|-------------|-----------------|-------------|
| Create demo | "Create a demo for Acme Healthcare" | Provisions tenant with healthcare template, returns access URL |
| Customize data | "Add some harassment cases to the demo" | Generates realistic harassment cases appropriate for industry |
| Check usage | "What features did prospects explore in my demo yesterday?" | Returns engagement analytics summary |
| Reset demo | "Reset my Acme demo but keep the logo" | Clears data while preserving branding customizations |
| Suggest scenario | "What demo scenario would work for a bank?" | Recommends finance template with relevant compliance scenarios |

**Example Conversations:**

```
User: "I have a demo with Johnson & Johnson tomorrow. Set up a healthcare demo with FDA compliance scenarios."

AI: "I've created a demo tenant 'JNJ Healthcare Demo' with:
- Healthcare industry template
- 47 sample cases (including 12 FDA-related)
- Pre-configured disclosure campaign for clinical trial COIs
- HIPAA breach investigation example
- 6 months of trend data in analytics

Demo URL: https://demo-jnj-abc123.ethico.com
Prospect login: demo@jnj-demo.ethico.com / Welcome123!

Would you like me to:
1. Add the J&J logo?
2. Customize department names to match their org structure?
3. Add specific case scenarios you want to highlight?"

User: "Add their logo and create a retaliation case involving a senior manager"

AI: "Done. I've:
1. Added J&J logo from their public website
2. Created a realistic retaliation case:
   - Reporter: Anonymous R&D scientist
   - Accused: VP of Clinical Operations
   - Includes investigation notes and remediation plan
   - Shows AI summary feature

The case is pinned to appear first in your demo case list."
```

### AI Assistance Points

| User Action | AI Can Help By | Confidence Level |
|-------------|----------------|------------------|
| Demo creation | Suggesting industry-appropriate template | High |
| Data generation | Creating realistic case narratives | High |
| Customization | Generating department/location names matching prospect | Medium |
| Scenario selection | Recommending demos based on prospect profile | Medium |
| Engagement analysis | Summarizing prospect behavior patterns | High |
| Demo talking points | Generating feature highlights for specific scenarios | High |

### Data Requirements for AI Context

**Minimum Context:**
- Prospect company name
- Industry vertical
- Demo template selected

**Enhanced Context (Improves Quality):**
- Prospect company size (employee count)
- Geographic regions of operation
- Known compliance challenges
- Previous demos shown
- CRM opportunity data (if integrated)

**Cross-Module Context:**
- Real platform features available for demo
- Analytics dashboard configurations
- Policy templates available

---

## 3. User Stories

### Epic 1: Demo Tenant Provisioning

#### Ethico Staff Stories

**US-011-001: One-Click Demo Provisioning**

As a **Sales Representative**, I want to create a demo tenant with one click so that I can quickly prepare for prospect meetings.

**Acceptance Criteria:**
- [ ] Click "Create Demo" button from Sales Portal
- [ ] Select industry template (or "General")
- [ ] Enter prospect name (becomes tenant display name)
- [ ] System provisions tenant in < 30 seconds
- [ ] Receive demo URL and credentials immediately
- [ ] Demo data pre-populated based on template
- [ ] Demo marked with owner (creating user)

**AI Enhancement:**
- AI suggests template based on prospect company name (if recognized industry)

**Ralph Task Readiness:**
- [ ] Entry point: `apps/backend/src/modules/demo/demo.service.ts`
- [ ] Pattern reference: Organization provisioning in auth module
- [ ] Test: Demo tenant created with correct data, accessible via URL

---

**US-011-002: Industry-Specific Templates**

As a **Sales Engineer**, I want to select from industry-specific demo templates so that prospects see relevant scenarios.

**Acceptance Criteria:**
- [ ] Templates available: Healthcare, Finance, Manufacturing, Retail, Technology, Government, General
- [ ] Each template includes: pre-configured categories, sample cases, disclosure types, policies
- [ ] Template preview shows what data will be generated
- [ ] Templates maintained by Ethico admin (not per-user editable)
- [ ] Custom templates can be created by admin

**AI Enhancement:**
- AI can generate custom template data on-the-fly based on industry description

---

**US-011-003: Demo Credentials Management**

As a **Sales Representative**, I want to manage demo credentials so that I can share access with prospects securely.

**Acceptance Criteria:**
- [ ] Default demo user created: `demo@{tenant-slug}.ethico.com`
- [ ] Password auto-generated or customizable
- [ ] Can create additional demo users with different roles
- [ ] Can reset credentials at any time
- [ ] Credentials displayed in shareable format (not stored in URL)
- [ ] Optional: Magic link generation for passwordless access

---

### Epic 2: Demo Customization

**US-011-010: Add Prospect Branding**

As a **Sales Representative**, I want to add the prospect's logo and colors so that demos feel personalized.

**Acceptance Criteria:**
- [ ] Upload prospect logo (PNG, SVG, or URL fetch)
- [ ] Set primary brand color (hex picker)
- [ ] Preview changes before applying
- [ ] Branding appears throughout demo tenant
- [ ] Can revert to default Ethico branding

**AI Enhancement:**
- AI can fetch logo from prospect's website automatically
- AI can extract brand colors from logo

---

**US-011-011: Customize Organizational Structure**

As a **Sales Engineer**, I want to customize the demo org structure so that it matches the prospect's reality.

**Acceptance Criteria:**
- [ ] Edit department names
- [ ] Edit location names and hierarchy
- [ ] Edit business unit structure
- [ ] Changes reflected in all demo data
- [ ] Bulk update option (upload CSV)

**AI Enhancement:**
- AI can generate realistic org structure based on company size and industry

---

**US-011-012: Add Custom Demo Cases**

As a **Sales Engineer**, I want to add specific case scenarios so that I can demonstrate features relevant to the prospect's concerns.

**Acceptance Criteria:**
- [ ] Quick-add case with category, severity, and summary
- [ ] AI generates full case details from summary
- [ ] Can "pin" cases to appear prominently in demo
- [ ] Can add cases at specific pipeline stages
- [ ] Can add cases with specific AI features populated (summary, risk score)

---

**US-011-013: Scenario Builder**

As a **Sales Engineer**, I want to build specific demo scenarios so that I can tell a compelling story during the demo.

**Acceptance Criteria:**
- [ ] Create scenario with name and description
- [ ] Add ordered list of "demo stops" (specific records to show)
- [ ] Each stop has talking points
- [ ] Scenario generates checklist/script view
- [ ] Can share scenario with colleagues

**AI Enhancement:**
- AI can generate talking points for each feature demonstrated
- AI can suggest feature flow based on prospect pain points

---

### Epic 3: Demo Data Management

**US-011-020: Reset Demo Data**

As a **Sales Representative**, I want to reset my demo data so that I can reuse the environment for a new prospect.

**Acceptance Criteria:**
- [ ] "Reset Demo" button clears all transactional data
- [ ] Option to preserve: branding, org structure, categories
- [ ] Option for "full reset" to template defaults
- [ ] Confirmation required before reset
- [ ] Reset completes in < 60 seconds
- [ ] Activity log cleared (new demo session)

---

**US-011-021: Demo Expiration**

As an **Ethico Admin**, I want demos to auto-expire so that unused environments don't consume resources.

**Acceptance Criteria:**
- [ ] Default expiration: 30 days from creation
- [ ] Warning email at 7 days and 1 day before expiration
- [ ] Owner can extend expiration (up to 90 days total)
- [ ] Expired demos archived (recoverable for 7 days)
- [ ] Permanently deleted after 7-day archive period
- [ ] Admin can set different expiration rules per user tier

---

**US-011-022: Refresh Demo Data**

As a **Sales Representative**, I want to refresh demo data with new dates so that data looks current.

**Acceptance Criteria:**
- [ ] "Refresh Dates" shifts all timestamps to appear recent
- [ ] Maintains relative time relationships
- [ ] Analytics trends recalculated
- [ ] SLA indicators updated
- [ ] Can specify "as of" date

---

### Epic 4: Demo Sharing & Access

**US-011-030: Share Demo URL**

As a **Sales Representative**, I want to share a demo URL so that prospects can explore on their own.

**Acceptance Criteria:**
- [ ] Generate shareable URL with embedded token
- [ ] URL expires after configurable period (default 7 days)
- [ ] Optional: Require email capture before access
- [ ] Can track unique visitors via URL
- [ ] Can revoke access at any time

---

**US-011-031: Prospect Self-Registration**

As a **Sales Representative**, I want prospects to optionally self-register so that I can capture their contact info.

**Acceptance Criteria:**
- [ ] Enable/disable self-registration per demo
- [ ] Registration form: Name, Email, Company, Phone (optional)
- [ ] Data captured and synced to CRM (if integrated)
- [ ] Prospect receives their own credentials
- [ ] Multiple prospects can register for same demo

---

**US-011-032: Demo Access Restrictions**

As a **Sales Engineer**, I want to restrict demo access so that prospects only see approved features.

**Acceptance Criteria:**
- [ ] Enable/disable specific modules for demo
- [ ] Hide admin/configuration screens
- [ ] Prevent data export
- [ ] Read-only mode option
- [ ] Watermark "DEMO" on exports/screenshots

---

### Epic 5: Usage Analytics

**US-011-040: Track Prospect Engagement**

As a **Sales Representative**, I want to see what prospects explored so that I can tailor my follow-up.

**Acceptance Criteria:**
- [ ] Track pages visited and time spent
- [ ] Track features used (create case, run report, etc.)
- [ ] Track search queries executed
- [ ] Track documents opened
- [ ] Session timeline view

**AI Enhancement:**
- AI summarizes engagement: "Prospect spent 15 minutes exploring the analytics dashboard, particularly the 'Time to Close' chart"

---

**US-011-041: Engagement Reports**

As a **Sales Manager**, I want to see aggregate engagement metrics so that I can understand what features resonate.

**Acceptance Criteria:**
- [ ] Dashboard showing: total demos, active demos, prospect sessions
- [ ] Heatmap of feature engagement across all demos
- [ ] Comparison: engaged vs. closed-won deals
- [ ] Export engagement data
- [ ] Filter by time period, rep, industry

---

**US-011-042: Demo Effectiveness Analytics**

As a **Sales Manager**, I want to correlate demo engagement with deal outcomes so that I can optimize our demo strategy.

**Acceptance Criteria:**
- [ ] Link demo to CRM opportunity (if integrated)
- [ ] Track: demo created -> demo viewed -> proposal sent -> closed won/lost
- [ ] Identify features correlated with won deals
- [ ] A/B testing support for different templates

---

### Epic 6: Demo Administration

**US-011-050: Manage Demo Quotas**

As an **Ethico Admin**, I want to set demo quotas so that resources are managed appropriately.

**Acceptance Criteria:**
- [ ] Set max concurrent demos per user
- [ ] Set max demos per user per month
- [ ] Set max demo storage per user
- [ ] Alert when approaching limits
- [ ] Admin override for limits

---

**US-011-051: Demo Template Management**

As an **Ethico Admin**, I want to create and manage demo templates so that the sales team has consistent, high-quality scenarios.

**Acceptance Criteria:**
- [ ] Create template from scratch or clone existing
- [ ] Define: categories, sample data counts, policies
- [ ] Set template as default for industry
- [ ] Enable/disable templates
- [ ] Version templates (keep previous versions)

---

**US-011-052: Global Demo Settings**

As an **Ethico Admin**, I want to configure global demo settings so that all demos follow company standards.

**Acceptance Criteria:**
- [ ] Set default expiration period
- [ ] Set allowed modules for demos
- [ ] Set branding defaults (watermark, footer)
- [ ] Configure engagement tracking opt-in/out
- [ ] Set data retention policies

---

**US-011-053: Fallback Shared Demo**

As an **Ethico Admin**, I want to maintain a shared demo environment so that we have a fallback if provisioning fails.

**Acceptance Criteria:**
- [ ] Single "master" demo tenant always available
- [ ] Auto-resets nightly to clean state
- [ ] Read-only access for most users
- [ ] Admin can trigger manual reset
- [ ] Displayed as fallback option if provisioning fails

---

## 4. Feature Specifications

### F1: Demo Tenant Provisioning

**Description:**
Provision isolated demo tenants with pre-populated data based on industry templates. Each demo is a fully functional tenant with realistic data that can be customized for specific prospects.

**User Flow:**
1. User clicks "Create Demo" from Sales Portal
2. System displays template selection screen
3. User selects industry template and enters prospect name
4. User clicks "Create"
5. System provisions tenant asynchronously
6. System populates demo data based on template
7. System displays demo URL and credentials
8. Demo ready for use

**Business Rules:**
- Demo tenant names must be unique
- Demo slug generated from prospect name + random suffix
- User must have "demo_creator" permission
- Check quota before provisioning
- Demo organization tier = "DEMO" (special tier)

**AI Integration:**
- AI suggests template based on company name recognition
- AI generates company-appropriate data during provisioning

**Error Handling:**
| Error Condition | User Message | System Action |
|-----------------|--------------|---------------|
| Quota exceeded | "You've reached your demo limit. Delete an existing demo or contact your manager." | Log attempt, suggest deletion |
| Provisioning timeout | "Demo creation is taking longer than expected. We'll email you when ready." | Background job continues, notify on completion |
| Template not found | "Selected template unavailable. Using General template." | Fall back to General template |

---

### F2: Demo Customization Wizard

**Description:**
Step-by-step wizard for customizing demo tenant branding, organization structure, and data.

**User Flow:**
1. User selects demo from "My Demos" list
2. User clicks "Customize"
3. Wizard Step 1: Branding (logo, colors)
4. Wizard Step 2: Organization (departments, locations)
5. Wizard Step 3: Data (add/remove scenarios)
6. Wizard Step 4: Review and Apply
7. System applies customizations
8. Preview available at each step

**Business Rules:**
- Customizations are additive to template
- Changes saved as diff from template (enables reset)
- Logo must be < 2MB, valid image format
- Color must be valid hex code

---

### F3: Engagement Tracking

**Description:**
Track prospect activity within demo tenant for sales intelligence.

**User Flow:**
1. Prospect accesses demo via shared URL
2. System logs session start with source attribution
3. Every page view and action tracked
4. Session ends after 30 minutes of inactivity
5. Sales rep views engagement report

**Business Rules:**
- Tracking opt-in/out per demo (default: on)
- PII captured only if prospect self-registers
- Engagement data retained 90 days
- Anonymized aggregate data retained indefinitely

---

### F4: Demo Data Generation

**Description:**
AI-powered generation of realistic demo data including cases, disclosures, policies, and analytics data.

**User Flow:**
1. System receives data generation request
2. AI generates narratives appropriate for industry
3. Data inserted with realistic timestamps
4. Analytics fact tables pre-computed
5. Data verified for consistency

**Business Rules:**
- All demo data marked with `source_system = 'DEMO_GENERATED'`
- Names generated from faker library (no real people)
- Dates distributed realistically over 6-month period
- Case outcomes follow realistic distribution

---

## 5. Data Model

### Entities

#### DemoTenant

**Purpose:** Tracks demo tenant instances and their configuration.

```prisma
model DemoTenant {
  id                    String   @id @default(uuid())

  // Identity
  name                  String                    // Display name (e.g., "Acme Healthcare Demo")
  slug                  String   @unique         // URL slug (e.g., "acme-healthcare-abc123")
  prospect_company      String                    // Prospect company name
  description           String?                   // Notes about this demo

  // Ownership
  owner_user_id         String                    // Ethico user who created this demo
  owner_user            User     @relation(fields: [owner_user_id], references: [id])
  team_id               String?                   // Sales team (for reporting)

  // Template & Customization
  template_id           String                    // Template this demo was based on
  template              DemoTemplate @relation(fields: [template_id], references: [id])
  customizations        Json?                     // Diff from template (branding, org structure)
  industry              String                    // Industry vertical

  // Organization Reference
  organization_id       String   @unique         // The actual tenant organization
  organization          Organization @relation(fields: [organization_id], references: [id])

  // Branding
  logo_url              String?                   // Custom logo
  primary_color         String?                   // Hex color
  secondary_color       String?                   // Hex color

  // Access Control
  access_type           DemoAccessType            // PRIVATE, SHARED_LINK, SELF_REGISTER
  share_token           String?  @unique         // Token for shared URL access
  share_token_expires   DateTime?
  require_registration  Boolean  @default(false)
  allowed_modules       String[]                  // Which modules are enabled
  is_read_only          Boolean  @default(false)

  // Lifecycle
  status                DemoStatus                // PROVISIONING, ACTIVE, EXPIRED, ARCHIVED, DELETED
  expires_at            DateTime
  last_accessed_at      DateTime?
  last_reset_at         DateTime?

  // CRM Integration
  crm_opportunity_id    String?                   // Salesforce/HubSpot opportunity ID
  crm_account_id        String?                   // CRM account ID

  // AI Enrichment
  ai_scenario_summary   String?                   // AI-generated summary of demo scenarios
  ai_talking_points     Json?                     // AI-generated talking points
  ai_generated_at       DateTime?

  // Migration Support
  source_system         String?                   // If imported from another system
  source_record_id      String?
  migrated_at           DateTime?

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Relations
  demo_users            DemoUser[]
  engagement_sessions   DemoEngagementSession[]
  demo_scenarios        DemoScenario[]

  // Indexes
  @@index([owner_user_id])
  @@index([status, expires_at])
  @@index([team_id])
  @@index([industry])
}

enum DemoStatus {
  PROVISIONING
  ACTIVE
  EXPIRED
  ARCHIVED
  DELETED
}

enum DemoAccessType {
  PRIVATE           // Only owner and explicitly added users
  SHARED_LINK       // Anyone with link can access
  SELF_REGISTER     // Visitors can register for access
}
```

---

#### DemoTemplate

**Purpose:** Defines reusable demo configurations for different industries and scenarios.

```prisma
model DemoTemplate {
  id                    String   @id @default(uuid())

  // Identity
  name                  String                    // e.g., "Healthcare Compliance"
  slug                  String   @unique         // e.g., "healthcare"
  description           String
  industry              String                    // Primary industry
  industries            String[]                  // Additional applicable industries

  // Display
  icon                  String?                   // Icon identifier
  thumbnail_url         String?                   // Preview image
  sort_order            Int      @default(0)

  // Configuration
  categories            Json                      // Category definitions
  locations             Json                      // Location hierarchy
  departments           Json                      // Department list
  business_units        Json                      // BU structure

  // Sample Data Specifications
  data_spec             Json                      // Detailed spec for data generation
  // Structure:
  // {
  //   cases: { count: 50, distribution: {...} },
  //   disclosures: { count: 100, types: [...] },
  //   policies: { count: 15, categories: [...] },
  //   employees: { count: 500, departments: [...] }
  // }

  // Policies
  policy_templates      Json?                     // Sample policies to create

  // Analytics
  analytics_config      Json?                     // Pre-configured dashboards

  // Status
  is_active             Boolean  @default(true)
  is_default            Boolean  @default(false)  // Default for this industry

  // Versioning
  version               Int      @default(1)
  parent_version_id     String?                   // Previous version

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt
  created_by_id         String?

  // Relations
  demo_tenants          DemoTenant[]

  // Indexes
  @@index([industry])
  @@index([is_active])
}
```

---

#### DemoUser

**Purpose:** Demo-specific user accounts for prospect access.

```prisma
model DemoUser {
  id                    String   @id @default(uuid())
  demo_tenant_id        String
  demo_tenant           DemoTenant @relation(fields: [demo_tenant_id], references: [id])

  // User Reference
  user_id               String                    // Actual user in demo organization
  user                  User     @relation(fields: [user_id], references: [id])

  // Prospect Information (if self-registered)
  prospect_name         String?
  prospect_email        String?
  prospect_company      String?
  prospect_phone        String?
  prospect_title        String?

  // Access
  role                  DemoUserRole
  access_granted_at     DateTime @default(now())
  access_expires_at     DateTime?
  is_prospect           Boolean  @default(false)  // vs. Ethico internal

  // Tracking
  last_login_at         DateTime?
  login_count           Int      @default(0)

  // Timestamps
  created_at            DateTime @default(now())

  // Relations
  engagement_sessions   DemoEngagementSession[]

  // Indexes
  @@index([demo_tenant_id])
  @@index([prospect_email])
  @@unique([demo_tenant_id, user_id])
}

enum DemoUserRole {
  ADMIN               // Full access (usually demo owner)
  COMPLIANCE_OFFICER  // Standard demo role
  INVESTIGATOR        // Limited role for showing permissions
  EMPLOYEE            // Employee portal view
  READ_ONLY           // View only
}
```

---

#### DemoEngagementSession

**Purpose:** Tracks prospect sessions for engagement analytics.

```prisma
model DemoEngagementSession {
  id                    String   @id @default(uuid())
  demo_tenant_id        String
  demo_tenant           DemoTenant @relation(fields: [demo_tenant_id], references: [id])

  // User (if known)
  demo_user_id          String?
  demo_user             DemoUser? @relation(fields: [demo_user_id], references: [id])

  // Session Identity
  session_token         String   @unique         // Browser session identifier
  visitor_fingerprint   String?                   // Anonymous tracking ID

  // Source Attribution
  source_url            String?                   // Referrer
  share_token_used      String?                   // Which share link was used
  utm_source            String?
  utm_medium            String?
  utm_campaign          String?

  // Session Timing
  started_at            DateTime @default(now())
  ended_at              DateTime?
  last_activity_at      DateTime @default(now())
  duration_seconds      Int?                      // Computed on session end

  // Engagement Metrics (aggregated)
  pages_viewed          Int      @default(0)
  actions_taken         Int      @default(0)
  features_used         String[]                  // List of feature codes

  // Device Info
  ip_address            String?
  user_agent            String?
  device_type           String?                   // desktop, mobile, tablet
  browser               String?
  os                    String?

  // AI Summary
  ai_engagement_summary String?                   // AI-generated session summary
  ai_generated_at       DateTime?

  // Timestamps
  created_at            DateTime @default(now())

  // Relations
  events                DemoEngagementEvent[]

  // Indexes
  @@index([demo_tenant_id, started_at])
  @@index([demo_user_id])
}
```

---

#### DemoEngagementEvent

**Purpose:** Individual tracking events within a session.

```prisma
model DemoEngagementEvent {
  id                    String   @id @default(uuid())
  session_id            String
  session               DemoEngagementSession @relation(fields: [session_id], references: [id])

  // Event Details
  event_type            DemoEventType
  event_category        String                    // Module/feature category
  event_action          String                    // Specific action
  event_label           String?                   // Additional context

  // Page Context
  page_path             String
  page_title            String?

  // Entity Reference (if interacting with specific record)
  entity_type           String?                   // CASE, POLICY, etc.
  entity_id             String?

  // Timing
  timestamp             DateTime @default(now())
  time_on_page_seconds  Int?                      // For page views

  // Metadata
  metadata              Json?                     // Additional event data

  // Indexes (no created_at - timestamp is the time)
  @@index([session_id, timestamp])
  @@index([event_type])
}

enum DemoEventType {
  PAGE_VIEW
  FEATURE_USE           // Button click, form submit, etc.
  SEARCH
  EXPORT
  AI_INTERACTION        // Used AI feature
  VIDEO_WATCHED
  DOCUMENT_OPENED
}
```

---

#### DemoScenario

**Purpose:** Pre-built demo scripts with ordered steps and talking points.

```prisma
model DemoScenario {
  id                    String   @id @default(uuid())
  demo_tenant_id        String?                   // Null for template scenarios
  demo_tenant           DemoTenant? @relation(fields: [demo_tenant_id], references: [id])

  // Identity
  name                  String                    // e.g., "Whistleblower Protection Demo"
  description           String?

  // Classification
  scenario_type         ScenarioType
  industry              String?
  estimated_duration    Int?                      // Minutes

  // Steps
  steps                 Json                      // Ordered list of demo stops
  // Structure:
  // [
  //   {
  //     order: 1,
  //     title: "Dashboard Overview",
  //     path: "/dashboard",
  //     entity_type: null,
  //     entity_id: null,
  //     talking_points: ["...", "..."],
  //     features_to_highlight: ["widget_case_volume", "ai_summary"]
  //   }
  // ]

  // Sharing
  is_template           Boolean  @default(false)  // Can be copied to other demos
  is_public             Boolean  @default(false)  // Visible to all sales team

  // Owner
  created_by_id         String

  // AI Enrichment
  ai_talking_points     Json?                     // AI-generated talking points per step
  ai_generated_at       DateTime?

  // Timestamps
  created_at            DateTime @default(now())
  updated_at            DateTime @updatedAt

  // Indexes
  @@index([demo_tenant_id])
  @@index([scenario_type])
  @@index([is_template, is_public])
}

enum ScenarioType {
  OVERVIEW              // Platform overview
  CASE_MANAGEMENT       // Focus on cases
  DISCLOSURES           // Focus on COI/disclosures
  POLICY                // Focus on policy management
  ANALYTICS             // Focus on reporting
  INTEGRATION           // Focus on integrations
  CUSTOM                // Custom scenario
}
```

---

#### DemoActivity (Audit Log)

**Purpose:** Track administrative actions on demos.

```prisma
model DemoActivity {
  id                    String   @id @default(uuid())
  demo_tenant_id        String

  // Action Details
  action                String                    // created, customized, reset, shared, expired
  action_description    String                    // Natural language description

  // Actor
  actor_user_id         String
  actor_type            DemoActorType

  // Change Tracking
  changes               Json?                     // { old_value, new_value, fields_changed }

  // Metadata
  ip_address            String?
  user_agent            String?

  // Timestamp (immutable)
  created_at            DateTime @default(now())

  // Indexes
  @@index([demo_tenant_id, created_at])
  @@index([actor_user_id])
}

enum DemoActorType {
  SALES_REP
  SALES_ENGINEER
  ADMIN
  SYSTEM
}
```

---

### Entity Relationships Diagram

```
┌─────────────────┐
│  DemoTemplate   │
└────────┬────────┘
         │ 1
         │
         │ *
         ▼
┌─────────────────┐       1      ┌─────────────────┐
│   DemoTenant    │──────────────│  Organization   │
└────────┬────────┘              └─────────────────┘
         │
    ┌────┼────┬──────────┬───────────┐
    │    │    │          │           │
    ▼    │    ▼          ▼           ▼
┌───────┐│ ┌──────────┐ ┌─────────┐ ┌────────────┐
│DemoUser│ │DemoScenario│ │DemoActivity│ │DemoEngagement│
└───────┘│ └──────────┘ └─────────┘ │   Session   │
    │    │                          └──────┬──────┘
    │    │                                 │
    │    └─────────────────────────────────┘
    │                                      │
    │                                      ▼
    │                           ┌─────────────────┐
    └──────────────────────────►│DemoEngagement   │
                                │     Event       │
                                └─────────────────┘

User (Ethico Staff)
├── DemoTenant[] (as owner)
├── DemoUser[] (as demo participant)
└── DemoActivity[] (as actor)
```

---

## 6. API Specifications

### Demo Tenant Endpoints

#### Create Demo Tenant
```http
POST /api/v1/demo/tenants

Request:
{
  "name": "Acme Healthcare Demo",
  "prospect_company": "Acme Healthcare Inc.",
  "template_id": "uuid-healthcare-template",
  "industry": "healthcare",
  "description": "Demo for Q1 pipeline opportunity",
  "crm_opportunity_id": "0061R00001234567"
}

Response (202 Accepted):
{
  "id": "uuid-demo-tenant",
  "name": "Acme Healthcare Demo",
  "slug": "acme-healthcare-abc123",
  "status": "PROVISIONING",
  "estimated_ready_seconds": 30,
  "access_url": "https://demo-acme-healthcare-abc123.ethico.com",
  "credentials": {
    "email": "demo@acme-healthcare-abc123.ethico.com",
    "password": "Welcome123!",
    "temporary": true
  },
  "created_at": "2026-02-02T10:00:00Z"
}

Errors:
- 400: Validation error
- 403: Quota exceeded
- 409: Name already exists
```

---

#### List Demo Tenants
```http
GET /api/v1/demo/tenants?status=ACTIVE&page=1&limit=20

Query Parameters:
- status: ACTIVE | EXPIRED | ARCHIVED (optional, filter)
- industry: string (optional, filter)
- team_id: uuid (optional, filter - for managers)
- search: string (optional, search name/company)
- page: integer (default: 1)
- limit: integer (default: 20, max: 100)

Response (200):
{
  "data": [
    {
      "id": "uuid",
      "name": "Acme Healthcare Demo",
      "slug": "acme-healthcare-abc123",
      "prospect_company": "Acme Healthcare Inc.",
      "status": "ACTIVE",
      "industry": "healthcare",
      "template": {
        "id": "uuid",
        "name": "Healthcare Compliance"
      },
      "expires_at": "2026-03-02T10:00:00Z",
      "last_accessed_at": "2026-02-01T15:30:00Z",
      "engagement_summary": {
        "total_sessions": 5,
        "total_visitors": 3,
        "last_session_at": "2026-02-01T15:30:00Z"
      },
      "created_at": "2026-02-02T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 8,
    "pages": 1
  }
}
```

---

#### Get Demo Tenant Detail
```http
GET /api/v1/demo/tenants/{id}

Response (200):
{
  "id": "uuid",
  "name": "Acme Healthcare Demo",
  "slug": "acme-healthcare-abc123",
  "prospect_company": "Acme Healthcare Inc.",
  "description": "Demo for Q1 pipeline opportunity",
  "status": "ACTIVE",
  "industry": "healthcare",

  "template": {
    "id": "uuid",
    "name": "Healthcare Compliance",
    "version": 2
  },

  "organization_id": "uuid",
  "access_url": "https://demo-acme-healthcare-abc123.ethico.com",

  "branding": {
    "logo_url": "https://storage.ethico.com/demo/logos/acme.png",
    "primary_color": "#0066CC",
    "secondary_color": "#003366"
  },

  "access": {
    "type": "SHARED_LINK",
    "share_url": "https://demo.ethico.com/s/abc123xyz",
    "share_token_expires": "2026-02-09T10:00:00Z",
    "require_registration": false,
    "allowed_modules": ["cases", "disclosures", "policies", "analytics"],
    "is_read_only": false
  },

  "lifecycle": {
    "expires_at": "2026-03-02T10:00:00Z",
    "last_accessed_at": "2026-02-01T15:30:00Z",
    "last_reset_at": null
  },

  "crm": {
    "opportunity_id": "0061R00001234567",
    "account_id": "0011R00001234567"
  },

  "owner": {
    "id": "uuid",
    "name": "Jane Smith",
    "email": "jane.smith@ethico.com"
  },

  "demo_users": [
    {
      "id": "uuid",
      "role": "COMPLIANCE_OFFICER",
      "prospect_name": "John Doe",
      "prospect_email": "john.doe@acme.com",
      "last_login_at": "2026-02-01T15:30:00Z",
      "login_count": 3
    }
  ],

  "engagement_summary": {
    "total_sessions": 5,
    "total_visitors": 3,
    "total_page_views": 127,
    "total_duration_minutes": 45,
    "top_features": ["analytics_dashboard", "case_detail", "ai_summary"],
    "last_session_at": "2026-02-01T15:30:00Z"
  },

  "ai_scenario_summary": "Demo configured for healthcare compliance with focus on HIPAA breach scenarios and clinical trial COI disclosures.",

  "created_at": "2026-02-02T10:00:00Z",
  "updated_at": "2026-02-02T12:00:00Z"
}

Errors:
- 404: Demo not found
- 403: Not authorized (not owner/team member)
```

---

#### Update Demo Tenant
```http
PATCH /api/v1/demo/tenants/{id}

Request:
{
  "name": "Updated Demo Name",
  "description": "Updated description",
  "branding": {
    "logo_url": "https://example.com/new-logo.png",
    "primary_color": "#FF0000"
  },
  "access": {
    "type": "SELF_REGISTER",
    "require_registration": true,
    "allowed_modules": ["cases", "analytics"]
  }
}

Response (200):
{
  // Full demo tenant object
}
```

---

#### Delete Demo Tenant
```http
DELETE /api/v1/demo/tenants/{id}

Response (204):
// No content

Errors:
- 404: Demo not found
- 403: Not authorized
```

---

#### Reset Demo Data
```http
POST /api/v1/demo/tenants/{id}/reset

Request:
{
  "preserve_branding": true,
  "preserve_org_structure": true,
  "preserve_scenarios": true,
  "reset_type": "SOFT"  // SOFT (preserve settings) or HARD (full reset)
}

Response (202 Accepted):
{
  "message": "Demo reset in progress",
  "estimated_seconds": 45,
  "preserved": ["branding", "org_structure", "scenarios"]
}
```

---

#### Extend Demo Expiration
```http
POST /api/v1/demo/tenants/{id}/extend

Request:
{
  "extend_days": 30,
  "reason": "Prospect requested additional time for evaluation"
}

Response (200):
{
  "expires_at": "2026-04-02T10:00:00Z",
  "max_extension_remaining_days": 30
}

Errors:
- 400: Maximum extension exceeded
```

---

#### Generate Share Link
```http
POST /api/v1/demo/tenants/{id}/share-link

Request:
{
  "expires_in_days": 7,
  "access_type": "SHARED_LINK"  // or "SELF_REGISTER"
}

Response (200):
{
  "share_url": "https://demo.ethico.com/s/abc123xyz",
  "share_token": "abc123xyz",
  "expires_at": "2026-02-09T10:00:00Z"
}
```

---

#### Revoke Share Link
```http
DELETE /api/v1/demo/tenants/{id}/share-link

Response (204):
// No content
```

---

### Demo Template Endpoints

#### List Templates
```http
GET /api/v1/demo/templates?industry=healthcare

Response (200):
{
  "data": [
    {
      "id": "uuid",
      "name": "Healthcare Compliance",
      "slug": "healthcare",
      "description": "Complete healthcare compliance demo with HIPAA, FDA scenarios",
      "industry": "healthcare",
      "thumbnail_url": "https://storage.ethico.com/templates/healthcare.png",
      "is_default": true,
      "data_summary": {
        "cases": 50,
        "disclosures": 100,
        "policies": 15,
        "employees": 500
      }
    }
  ]
}
```

---

#### Get Template Detail
```http
GET /api/v1/demo/templates/{id}

Response (200):
{
  "id": "uuid",
  "name": "Healthcare Compliance",
  "slug": "healthcare",
  "description": "Complete healthcare compliance demo...",
  "industry": "healthcare",
  "industries": ["healthcare", "pharma", "biotech"],

  "categories": [
    { "code": "HIPAA", "name": "HIPAA Violations", "subcategories": [...] },
    { "code": "FDA", "name": "FDA Compliance", "subcategories": [...] }
  ],

  "data_spec": {
    "cases": {
      "count": 50,
      "distribution": {
        "by_status": { "OPEN": 15, "IN_PROGRESS": 20, "CLOSED": 15 },
        "by_category": { "HIPAA": 20, "FDA": 10, "COI": 10, "OTHER": 10 },
        "by_severity": { "HIGH": 10, "MEDIUM": 25, "LOW": 15 }
      }
    },
    "disclosures": {
      "count": 100,
      "types": ["clinical_trial_coi", "vendor_relationship", "outside_employment"]
    }
  }
}
```

---

### Engagement Analytics Endpoints

#### Get Engagement Summary
```http
GET /api/v1/demo/tenants/{id}/engagement/summary?period=7d

Query Parameters:
- period: 7d | 30d | 90d | all

Response (200):
{
  "period": "7d",
  "summary": {
    "total_sessions": 12,
    "unique_visitors": 4,
    "total_page_views": 287,
    "total_duration_minutes": 98,
    "avg_session_duration_minutes": 8.2,
    "bounce_rate": 0.15
  },
  "top_pages": [
    { "path": "/dashboard", "views": 45, "avg_time_seconds": 120 },
    { "path": "/cases", "views": 38, "avg_time_seconds": 180 },
    { "path": "/analytics", "views": 32, "avg_time_seconds": 240 }
  ],
  "top_features": [
    { "feature": "ai_summary", "uses": 15 },
    { "feature": "export_report", "uses": 8 },
    { "feature": "create_case", "uses": 5 }
  ],
  "visitor_breakdown": [
    { "name": "John Doe", "email": "john@acme.com", "sessions": 5, "pages": 127 },
    { "name": "Anonymous", "email": null, "sessions": 7, "pages": 160 }
  ]
}
```

---

#### Get Session Details
```http
GET /api/v1/demo/tenants/{id}/engagement/sessions/{session_id}

Response (200):
{
  "id": "uuid",
  "visitor": {
    "name": "John Doe",
    "email": "john@acme.com",
    "company": "Acme Healthcare"
  },
  "started_at": "2026-02-01T15:30:00Z",
  "ended_at": "2026-02-01T15:52:00Z",
  "duration_seconds": 1320,
  "device": {
    "type": "desktop",
    "browser": "Chrome",
    "os": "Windows"
  },
  "events": [
    {
      "timestamp": "2026-02-01T15:30:00Z",
      "type": "PAGE_VIEW",
      "page": "/dashboard",
      "time_on_page_seconds": 45
    },
    {
      "timestamp": "2026-02-01T15:30:45Z",
      "type": "FEATURE_USE",
      "action": "clicked_ai_summary",
      "entity_type": "CASE",
      "entity_id": "uuid"
    }
  ],
  "ai_summary": "Visitor explored the platform for 22 minutes, focusing primarily on case management and analytics. They used the AI summary feature 3 times and exported 2 reports. High engagement with the dashboard widgets."
}
```

---

### AI Endpoints

#### Generate Demo Scenario Talking Points
```http
POST /api/v1/demo/ai/talking-points

Request:
{
  "demo_tenant_id": "uuid",
  "scenario_type": "CASE_MANAGEMENT",
  "prospect_context": {
    "industry": "healthcare",
    "pain_points": ["slow investigations", "compliance reporting"],
    "company_size": "5000 employees"
  }
}

Response (200):
{
  "scenario_name": "Efficient Healthcare Investigations",
  "estimated_duration_minutes": 20,
  "talking_points": [
    {
      "feature": "Case Dashboard",
      "point": "Notice how the dashboard immediately shows compliance status across all your facilities...",
      "transition": "Let me show you what happens when a new report comes in..."
    }
  ],
  "suggested_cases_to_show": [
    { "id": "uuid", "title": "HIPAA Breach - Patient Data Exposure", "reason": "Demonstrates investigation workflow" }
  ]
}
```

---

#### Generate Custom Demo Cases
```http
POST /api/v1/demo/ai/generate-cases

Request:
{
  "demo_tenant_id": "uuid",
  "specifications": [
    {
      "category": "HARASSMENT",
      "severity": "HIGH",
      "summary": "Executive misconduct case involving VP",
      "include_investigation": true,
      "include_remediation": true
    }
  ]
}

Response (202 Accepted):
{
  "message": "Generating 1 demo case",
  "job_id": "uuid",
  "estimated_seconds": 10
}
```

---

## 7. UI/UX Specifications

### Navigation Placement

The Sales Demo module is accessible only to Ethico staff with sales permissions. It appears in:
- **Sales Portal** (dedicated internal portal): Primary navigation item
- **Main Platform** (Ethico staff mode): Under "Sales Tools" in admin menu

### Key Screens

#### Sales Portal Home

**Purpose:** Overview of all demo tenants owned by the user

**Layout:**
- Header: "My Demos" with "Create Demo" button
- Filter bar: Status, Industry, Search
- Grid/List toggle
- Demo cards showing:
  - Demo name and prospect
  - Status badge
  - Expiration countdown
  - Last activity
  - Quick actions (Open, Share, Reset)
- "Team Demos" tab for managers

#### Create Demo Wizard

**Purpose:** Guided demo creation flow

**Steps:**
1. **Template Selection**
   - Industry filter pills
   - Template cards with preview
   - "Start from Scratch" option

2. **Basic Info**
   - Prospect company name (required)
   - Demo name (auto-generated, editable)
   - Industry (pre-filled from template)
   - Description (optional)
   - CRM opportunity lookup (optional)

3. **Customization (Optional)**
   - Logo upload or URL
   - Brand colors
   - Org structure quick config

4. **Review & Create**
   - Summary of selections
   - "Create Demo" button
   - Estimated provisioning time

#### Demo Detail Page

**Purpose:** Manage and analyze a specific demo

**Layout:**
- **Header**: Demo name, status badge, prospect company, action buttons
- **Tabs**:
  - **Overview**: Quick stats, access info, recent activity
  - **Customization**: Branding, org structure, data management
  - **Scenarios**: Demo scripts and talking points
  - **Engagement**: Analytics dashboard
  - **Settings**: Access control, expiration, deletion

#### Engagement Analytics Dashboard

**Purpose:** Understand prospect behavior

**Components:**
- Session timeline (visual timeline of all visits)
- Page engagement heatmap
- Feature usage chart
- Visitor breakdown table
- AI-generated insights panel
- Export button

### AI Panel Design

**Location:** Right sidebar on demo detail page, collapsible

**Content:**
- AI-generated demo summary
- Suggested talking points based on prospect industry
- Engagement insights ("Prospect spent significant time on analytics - emphasize this in follow-up")
- Quick actions ("Generate retaliation case", "Create talking points")

**User Controls:**
- Regenerate button
- Edit AI content
- Copy to clipboard

---

## 8. Demo Data Generation

### Data Generation Principles

1. **Realistic Distribution**: Data follows realistic patterns (more medium cases than high, etc.)
2. **Temporal Consistency**: Events have logical time sequences
3. **AI-Generated Narratives**: Case details, investigation notes use AI for realistic content
4. **Industry Relevance**: Categories and scenarios match the selected industry
5. **No Real Data**: All names, companies use faker libraries

### Default Data Volumes by Template

| Data Type | General | Healthcare | Finance | Manufacturing |
|-----------|---------|------------|---------|---------------|
| Cases | 50 | 50 | 60 | 45 |
| Disclosures | 100 | 150 | 200 | 80 |
| Policies | 15 | 20 | 25 | 18 |
| Employees | 500 | 750 | 1000 | 600 |
| Reports | 6 months | 6 months | 6 months | 6 months |

### Data Distribution Rules

**Case Status Distribution:**
- Open: 30%
- In Progress: 40%
- Closed: 30%

**Case Severity Distribution:**
- High: 15%
- Medium: 55%
- Low: 30%

**Case Outcomes (for closed):**
- Substantiated: 35%
- Unsubstantiated: 45%
- Inconclusive: 20%

### AI-Generated Content

The following fields use AI generation:

| Entity | Fields |
|--------|--------|
| Case | description, ai_summary, finding_summary |
| Investigation | notes, interview_summaries |
| Disclosure | relationship_description |
| Policy | content, summary |

**AI Generation Prompt Template:**
```
Generate a realistic {entity_type} for a {industry} company demo.

Context:
- Category: {category}
- Severity: {severity}
- Time period: {date_range}

Requirements:
- Use fictional but realistic names
- Include specific details relevant to {industry}
- Maintain professional tone
- Length: {target_length} words
```

---

## 9. Integration Points

### Internal Module Integrations

| Module | Integration Type | Data Exchanged |
|--------|------------------|----------------|
| Organization | Tenant Creation | Demo creates special Organization with tier=DEMO |
| User | User Creation | Demo users created in demo Organization |
| Case Management | Data Generation | Demo cases use Case module schemas |
| Disclosures | Data Generation | Demo disclosures use Disclosure schemas |
| Analytics | Dashboard Data | Demo analytics pre-computed |
| AI Service | Content Generation | AI generates demo narratives |

### External System Integrations

| System | Integration Method | Purpose |
|--------|-------------------|---------|
| Salesforce | REST API | Link demos to opportunities, sync engagement |
| HubSpot | REST API | Link demos to deals, sync engagement |
| Slack | Webhook | Notifications for demo activity |

### CRM Integration Details

**Salesforce Integration:**
- Demo linked to Opportunity via `crm_opportunity_id`
- Engagement metrics synced to custom fields
- Activity logged as tasks

**Field Mapping:**
| Demo Field | Salesforce Field |
|------------|------------------|
| engagement_summary.total_sessions | Demo_Sessions__c |
| engagement_summary.total_duration_minutes | Demo_Time_Spent__c |
| engagement_summary.top_features | Demo_Features_Explored__c |

---

## 10. Non-Functional Requirements

### Performance

| Metric | Target |
|--------|--------|
| Demo provisioning | < 30 seconds |
| Demo reset | < 60 seconds |
| Demo list load | < 1 second |
| Engagement dashboard | < 2 seconds |
| Share link generation | < 1 second |

### Scalability

| Metric | Target |
|--------|--------|
| Concurrent demos | 500 active demos |
| Demo users per tenant | 50 users |
| Engagement events/day | 100,000 events |
| Storage per demo | 500 MB max |

### Security

- Demo tenants isolated via standard RLS
- Demo data never mixed with production data
- Share tokens cryptographically secure
- Engagement tracking respects privacy settings
- PII in prospect registration encrypted

### Availability

- Demo provisioning: 99.5% availability
- Demo access: 99.9% availability
- Fallback shared demo always available

### Data Retention

| Data Type | Retention |
|-----------|-----------|
| Active demo | Until expiration |
| Archived demo | 7 days |
| Engagement events | 90 days |
| Engagement aggregates | 1 year |

---

## 11. Checklist Verification

### AI-First Checklist Compliance

**Schema Design:**
- [x] Semantic field naming used throughout
- [x] Narrative fields (description, notes) included
- [x] Activity log designed (DemoActivity)
- [x] Source tracking fields included
- [x] AI enrichment fields included (ai_scenario_summary, ai_talking_points)
- [x] Graceful degradation for sparse data

**Feature Design:**
- [x] Chat interaction examples documented
- [x] AI assistance opportunities identified
- [x] Conversation storage planned (engagement events)
- [x] AI action audit designed (DemoActivity)
- [x] Migration impact assessed (source_system fields)
- [x] Structured + unstructured data captured

**API Design:**
- [x] AI-friendly responses with context
- [x] Bulk operations supported (batch provisioning not in MVP)
- [x] Natural language search available (via AI endpoints)

**UI Design:**
- [x] AI panel space allocated
- [x] Context preservation designed
- [x] Self-service configuration enabled

**Cross-Cutting:**
- [x] organization_id on demo Organization
- [x] business_unit_id not applicable (internal module)
- [x] Audit trail complete (DemoActivity)
- [x] PII handling documented (prospect registration)

---

## Appendix A: Demo Template Specifications

### Healthcare Template

**Categories:**
- HIPAA Violations
- FDA Compliance
- Clinical Trial Ethics
- Patient Safety
- Medical Records Privacy
- Billing & Coding Fraud

**Sample Case Scenarios:**
1. HIPAA breach via lost laptop
2. Clinical trial protocol deviation
3. Physician conflict of interest
4. Billing fraud allegation
5. Patient safety incident

### Finance Template

**Categories:**
- Securities Fraud
- Insider Trading
- Anti-Money Laundering
- Consumer Protection
- Fair Lending
- Data Privacy

**Sample Case Scenarios:**
1. Insider trading tip investigation
2. AML suspicious activity
3. Fair lending discrimination claim
4. Customer data breach
5. Vendor kickback allegation

### Manufacturing Template

**Categories:**
- Workplace Safety
- Environmental Compliance
- Quality Control Fraud
- Supply Chain Ethics
- Labor Violations
- Export Control

**Sample Case Scenarios:**
1. OSHA violation cover-up
2. Environmental discharge incident
3. Quality data falsification
4. Child labor in supply chain
5. Export control violation

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| **Demo Tenant** | Isolated tenant environment provisioned for sales demonstrations |
| **Demo Template** | Pre-configured data set for a specific industry |
| **Share Token** | Cryptographic token enabling URL-based demo access |
| **Engagement Session** | Single prospect visit to a demo environment |
| **Demo Scenario** | Scripted demo flow with talking points |
| **Lived-in Data** | Demo data that appears to have history (not freshly created) |

---

## Appendix C: Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | February 2026 | Initial draft | Claude |

---

*End of Sales Demo Module PRD*
