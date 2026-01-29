# Ethico Risk Intelligence Platform
## PRD-003: Ethics Portal

**Document ID:** PRD-003
**Version:** 1.0
**Priority:** P0 - Critical (Employee-Facing Experience)
**Development Phase:** 12-16 Weeks
**Last Updated:** January 2026

---

## 1. Executive Summary

The Ethics Portal is the unified employee-facing experience layer for the Ethico Risk Intelligence Platform. It serves as a single entry point that routes users to appropriate sub-portals based on their context and authentication status.

### Architectural Position

> **The Ethics Portal is a presentation layer, not a system.** It orchestrates capabilities that live in other modules (Case Management, Disclosures, Policy Management) without owning their domain logic.

| Employee Action | Portal Responsibility | Domain PRD Ownership |
|-----------------|----------------------|----------------------|
| Submit a concern | Form UX, intake flow, confirmation | Case Management (PRD-005) owns entity creation, routing, status lifecycle |
| File a disclosure | Form UX, contextual guidance, draft saving | Disclosures (PRD-006) owns entity model, approval workflows, aggregation logic |
| Attest to policy | Presentation, signature capture | Policy Management (PRD-009) owns versioning, attestation tracking, compliance reporting |
| Check case status | Display status, show messages | Case Management (PRD-005) owns status definitions, communication handling |
| Ask chatbot a question | Conversation UX | Policy Management owns policy content; Case/Disclosure owns context for escalation |

### Module Scope

| In Scope | Out of Scope (Other PRDs) |
|----------|---------------------------|
| Portal architecture & routing | Case entity & lifecycle (PRD-005) |
| Authentication & SSO | Investigation workflow (PRD-005) |
| Public landing page & CMS | Disclosure entity & approval (PRD-006) |
| Report submission UX | Policy versioning (PRD-009) |
| Case status & communication UI | Operator Console (PRD-002) |
| Employee Portal dashboard | Analytics dashboards (PRD-007) |
| Manager Portal features | HRIS integration core (PRD-010) |
| AI Chatbot conversation UX | |
| Notification preferences | |
| Branding & white-labeling | |
| PWA & mobile experience | |

### MVP Timeline

| Phase | Weeks | Focus |
|-------|-------|-------|
| **Phase 1** | 1-6 | Core portal, authentication, report submission |
| **Phase 2** | 7-10 | Employee Portal, Manager Portal, basic CMS |
| **Phase 3** | 11-14 | Chatbot, Policy Hub, advanced CMS |
| **Phase 4** | 15-16 | Polish, PWA optimization, analytics |

---

## 2. Portal Architecture

### 2.1 Unified Entry Point

The Ethics Portal presents a single entry point (`ethics.{company}.com` or custom domain) that branches to three sub-portal experiences:

```
                    ┌─────────────────────────────────────┐
                    │         ETHICS PORTAL               │
                    │     (Public Landing Page)           │
                    │                                     │
                    │  ┌─────────────────────────────┐   │
                    │  │  • Report a Concern         │   │
                    │  │  • Check Case Status        │   │
                    │  │  • File a Disclosure        │   │
                    │  │  • View Policies            │   │
                    │  │  • Chat with Assistant      │   │
                    │  │  • Employee Login           │   │
                    │  └─────────────────────────────┘   │
                    └─────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│  ANONYMOUS PORTAL   │  │  EMPLOYEE PORTAL    │  │  MANAGER PORTAL     │
│                     │  │  (SSO Required)     │  │  (SSO + Role)       │
│  • Submit report    │  │                     │  │                     │
│  • Check status     │  │  • My Cases         │  │  • Team Dashboard   │
│  • Chat (limited)   │  │  • My Disclosures   │  │  • Proxy Reporting  │
│                     │  │  • Policies         │  │  • Completion Status│
│  No login required  │  │  • Attestations     │  │                     │
│  Access code flow   │  │  • Notifications    │  │  Configurable per   │
│                     │  │  • Chat (full)      │  │  client             │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

### 2.2 URL Structure

| URL Pattern | Purpose | Auth Required |
|-------------|---------|---------------|
| `ethics.{client}.com` | Public landing page | No |
| `ethics.{client}.com/report` | Submit anonymous/identified report | No |
| `ethics.{client}.com/status` | Check case status with access code | No |
| `ethics.{client}.com/chat` | Chatbot (limited for anonymous) | No |
| `ethics.{client}.com/login` | SSO redirect | Yes |
| `ethics.{client}.com/portal` | Employee Portal home | Yes |
| `ethics.{client}.com/portal/cases` | My cases | Yes |
| `ethics.{client}.com/portal/disclosures` | My disclosures | Yes |
| `ethics.{client}.com/portal/policies` | Policy Hub | Yes |
| `ethics.{client}.com/manager` | Manager Portal | Yes + Manager role |
| `ethics.{client}.com/admin` | Portal administration | Yes + Admin role |

### 2.3 Custom Domain Support

Clients can configure:
- **Subdomain:** `ethics.acmecorp.com` (default pattern)
- **Custom domain:** `speakup.acmecorp.com` or `integrity.acmecorp.com`
- **Path-based:** `acmecorp.com/ethics` (requires client DNS/proxy configuration)

Technical requirements:
- Automatic SSL certificate provisioning (Let's Encrypt or client-provided)
- DNS verification flow for custom domains
- Fallback to Ethico-hosted domain if custom fails

### 2.4 Progressive Web App (PWA)

The Ethics Portal is delivered as a PWA with:

| Capability | Implementation |
|------------|----------------|
| **Installable** | Add to home screen on mobile/desktop |
| **Offline support** | Cache static assets, queue submissions for sync |
| **Push notifications** | Case updates, disclosure reminders, attestation deadlines |
| **Background sync** | Retry failed submissions when connectivity restored |

**Service Worker Strategy:**
- Cache-first for static assets (CSS, JS, images)
- Network-first for API calls with offline fallback
- Stale-while-revalidate for content pages

**Offline Capabilities:**
- View previously loaded cases/disclosures
- Draft report submission (synced when online)
- Read cached policies
- Queue attestation signatures

---

## 3. Entity Model

The Ethics Portal owns presentation-layer entities only. Domain entities (Case, Disclosure, Policy) are owned by their respective PRDs.

### 3.1 Portal Configuration

Per-tenant portal settings:

```
PORTAL_CONFIGURATION
├── Core Fields
│   ├── id (UUID)
│   ├── organization_id (tenant)
│   ├── portal_status (ACTIVE, MAINTENANCE, DISABLED)
│   ├── created_at, updated_at
│
├── Domain Configuration
│   ├── default_domain (ethico-hosted)
│   ├── custom_domain (client-provided, nullable)
│   ├── custom_domain_verified (boolean)
│   ├── custom_domain_ssl_status (PENDING, ACTIVE, FAILED)
│   ├── ssl_certificate_expiry
│
├── Branding
│   ├── logo_url
│   ├── logo_alt_text
│   ├── favicon_url
│   ├── primary_color (hex)
│   ├── secondary_color (hex)
│   ├── accent_color (hex)
│   ├── background_color (hex)
│   ├── text_color (hex)
│   ├── font_family (from approved list or custom)
│   ├── custom_css (advanced, optional)
│
├── Channel Configuration
│   ├── channels_enabled[] (WEB_FORM, HOTLINE, CHATBOT, EMAIL, PROXY)
│   ├── hotline_number
│   ├── hotline_hours (JSONB - schedule)
│   ├── email_address (for email intake, if enabled)
│   ├── chatbot_enabled (boolean)
│   ├── proxy_reporting_enabled (boolean)
│
├── Language Configuration
│   ├── default_language (ISO 639-1)
│   ├── available_languages[] (ISO 639-1 codes)
│   ├── auto_detect_language (boolean)
│   ├── show_language_picker (boolean)
│
├── Feature Toggles
│   ├── anonymous_reporting_enabled (boolean, default true)
│   ├── identified_reporting_enabled (boolean, default true)
│   ├── case_status_check_enabled (boolean, default true)
│   ├── policy_hub_enabled (boolean)
│   ├── disclosure_portal_enabled (boolean)
│   ├── manager_portal_enabled (boolean)
│   ├── manager_team_visibility_enabled (boolean)
│   ├── manager_completion_dashboard_enabled (boolean)
│
├── Analytics Configuration
│   ├── tracking_level (NONE, BASIC, FULL)
│   ├── google_analytics_id (nullable)
│   ├── custom_tracking_script (nullable)
│
├── Maintenance Mode
│   ├── maintenance_mode (boolean)
│   ├── maintenance_message (rich text)
│   ├── maintenance_start_at
│   ├── maintenance_end_at
│
├── SEO Configuration
│   ├── seo_title
│   ├── seo_description
│   ├── seo_keywords[]
│   ├── robots_txt_content
│   ├── sitemap_enabled (boolean)
│
└── Metadata
    ├── created_at, created_by
    └── updated_at, updated_by
```

### 3.2 Content Block (CMS)

Drag-and-drop content management:

```
CONTENT_BLOCK
├── id (UUID)
├── organization_id
├── page_id (FK to ContentPage)
├── block_type (HERO, TEXT, VIDEO, IMAGE, CTA_BUTTON, ACCORDION,
│              CARD_GRID, CONTACT_INFO, FORM_EMBED, DIVIDER, SPACER)
├── order (display sequence)
│
├── Content
│   ├── content (JSONB - block-type-specific schema)
│   │   Examples:
│   │   HERO: { heading, subheading, background_image, cta_text, cta_url }
│   │   TEXT: { body (rich text), alignment }
│   │   VIDEO: { video_url, caption, autoplay }
│   │   CTA_BUTTON: { text, url, style, icon }
│   │   ACCORDION: { items: [{ title, content }] }
│   │   CARD_GRID: { cards: [{ icon, title, description, link }] }
│   ├── translations (JSONB - content per language)
│
├── Visibility
│   ├── is_visible (boolean)
│   ├── visibility_conditions (JSONB - show/hide rules)
│   ├── requires_auth (boolean)
│
└── Metadata
    ├── created_at, created_by
    ├── updated_at, updated_by
    └── published_at

CONTENT_PAGE
├── id (UUID)
├── organization_id
├── page_type (LANDING, ABOUT, RESOURCES, CUSTOM)
├── slug (URL path)
├── title
├── description
├── is_published (boolean)
├── published_at
├── template (FULL_WIDTH, SIDEBAR, TWO_COLUMN)
│
├── SEO
│   ├── meta_title
│   ├── meta_description
│   ├── og_image_url
│
└── Metadata
    ├── created_at, created_by
    └── updated_at, updated_by
```

### 3.3 Notification Preference

User-level notification settings:

```
NOTIFICATION_PREFERENCE
├── id (UUID)
├── user_id (FK to User)
├── organization_id
│
├── Case Notifications
│   ├── case_status_change (EMAIL, PUSH, BOTH, NONE)
│   ├── case_message_received (EMAIL, PUSH, BOTH, NONE)
│   ├── case_assigned_to_me (EMAIL, PUSH, BOTH, NONE)
│
├── Disclosure Notifications
│   ├── disclosure_decision (EMAIL, PUSH, BOTH, NONE)
│   ├── disclosure_condition_due (EMAIL, PUSH, BOTH, NONE)
│   ├── campaign_reminder (EMAIL, PUSH, BOTH, NONE)
│
├── Policy Notifications
│   ├── attestation_required (EMAIL, PUSH, BOTH, NONE)
│   ├── policy_update (EMAIL, PUSH, BOTH, NONE)
│
├── Digest Settings
│   ├── digest_enabled (boolean)
│   ├── digest_frequency (DAILY, WEEKLY, NONE)
│   ├── digest_day_of_week (for weekly)
│   ├── digest_time (preferred delivery time)
│
├── Push Subscription
│   ├── push_enabled (boolean)
│   ├── push_subscription (JSONB - web push subscription object)
│
└── Metadata
    ├── created_at
    └── updated_at
```

### 3.4 Proxy Delegation (Self-Service)

Executive-to-EA delegation:

```
PROXY_DELEGATION
├── id (UUID)
├── organization_id
│
├── Parties
│   ├── delegator_id (FK to User - the executive)
│   ├── delegator_name
│   ├── delegator_email
│   ├── delegate_id (FK to User - the EA/proxy)
│   ├── delegate_name
│   ├── delegate_email
│
├── Scope
│   ├── scope_type (ALL_DISCLOSURES, SPECIFIC_TYPES, SPECIFIC_CAMPAIGNS)
│   ├── disclosure_types[] (if SPECIFIC_TYPES)
│   ├── campaign_ids[] (if SPECIFIC_CAMPAIGNS)
│   ├── include_case_submission (boolean - can delegate submit cases?)
│
├── Validity
│   ├── start_date
│   ├── end_date (null = indefinite)
│   ├── is_active (boolean)
│   ├── requires_confirmation (boolean - delegate must accept)
│   ├── confirmed_at
│   ├── revoked_at
│   ├── revoked_by
│   ├── revocation_reason
│
├── Notifications
│   ├── notify_delegator_on_submission (boolean)
│   ├── notify_delegator_on_decision (boolean)
│
├── Audit
│   ├── created_via (SELF_SERVICE, ADMIN)
│   ├── created_at
│   ├── created_by
│   └── updated_at
```

### 3.5 Chat Session

Chatbot conversation tracking:

```
CHAT_SESSION
├── id (UUID)
├── organization_id
│
├── User Context
│   ├── user_id (FK to User, null if anonymous)
│   ├── anonymous_session_id (for unauthenticated users)
│   ├── is_authenticated (boolean)
│   ├── user_agent
│   ├── ip_address (hashed for privacy)
│   ├── language
│
├── Session
│   ├── started_at
│   ├── ended_at
│   ├── session_status (ACTIVE, COMPLETED, ESCALATED, ABANDONED)
│   ├── escalated_to (CASE, DISCLOSURE, HUMAN)
│   ├── escalated_at
│   ├── escalation_reason
│
├── Outcome
│   ├── outcome_type (ANSWERED, CREATED_CASE, CREATED_DISCLOSURE,
│   │                 ESCALATED_HUMAN, ABANDONED)
│   ├── linked_case_id (if created case)
│   ├── linked_disclosure_id (if created disclosure)
│   ├── satisfaction_rating (1-5, if collected)
│   ├── feedback_text
│
└── Metadata
    ├── message_count
    ├── avg_response_time_ms
    ├── policies_referenced[]
    └── created_at

CHAT_MESSAGE
├── id (UUID)
├── chat_session_id (FK)
├── organization_id
│
├── Message
│   ├── role (USER, ASSISTANT, SYSTEM)
│   ├── content (text)
│   ├── content_type (TEXT, RICH_TEXT, FORM, CONFIRMATION)
│   ├── attachments[] (file references)
│
├── AI Context
│   ├── model_used (e.g., "claude-3-sonnet")
│   ├── tokens_used
│   ├── sources_cited[] (policy IDs, if RAG)
│   ├── confidence_score
│   ├── was_edited (boolean - if human modified)
│
├── Interaction
│   ├── user_action (CLICKED_BUTTON, SELECTED_OPTION, TYPED_RESPONSE)
│   ├── action_data (JSONB)
│
└── Metadata
    ├── created_at
    └── sequence_number
```

### 3.6 Anonymous Reporter Session

Access code management:

```
ANONYMOUS_REPORTER_SESSION
├── id (UUID)
├── organization_id
│
├── Access Code
│   ├── access_code (hashed, unique)
│   ├── access_code_display (last 4 chars for reference)
│   ├── access_code_created_at
│   ├── access_code_expires_at (null = never)
│
├── Contact Relay (encrypted, never exposed to client)
│   ├── relay_email (anonymized email for relaying)
│   ├── reporter_email_encrypted (original email, if provided)
│   ├── reporter_phone_encrypted (original phone, if provided)
│   ├── email_verified (boolean)
│   ├── phone_verified (boolean)
│
├── Linked Records
│   ├── case_id (FK to Case)
│   ├── disclosure_id (FK to Disclosure, if applicable)
│
├── Activity
│   ├── last_accessed_at
│   ├── access_count
│   ├── messages_sent
│   ├── messages_received
│
└── Metadata
    ├── created_at
    └── updated_at
```

### 3.7 Media Asset

CMS media management:

```
MEDIA_ASSET
├── id (UUID)
├── organization_id
│
├── File
│   ├── file_name
│   ├── file_type (MIME type)
│   ├── file_size
│   ├── storage_path (S3)
│   ├── cdn_url
│   ├── thumbnail_url (for images/videos)
│
├── Metadata
│   ├── alt_text
│   ├── caption
│   ├── tags[]
│   ├── folder (for organization)
│
├── Usage
│   ├── used_in_pages[] (FK references)
│   ├── used_in_blocks[] (FK references)
│
├── Status
│   ├── virus_scan_status (PENDING, CLEAN, INFECTED)
│   ├── is_public (boolean)
│
└── Audit
    ├── uploaded_at
    ├── uploaded_by
    └── updated_at
```

---

## 4. Authentication & Authorization

### 4.1 Authentication Methods

| Method | Use Case | Implementation |
|--------|----------|----------------|
| **SAML 2.0** | Enterprise SSO (Okta, Azure AD, OneLogin) | SP-initiated flow, JIT provisioning |
| **OIDC** | Modern SSO providers | Authorization code flow with PKCE |
| **Google Workspace** | Google-based organizations | OAuth 2.0 with Google APIs |
| **Microsoft 365** | Microsoft-based organizations | OAuth 2.0 with Microsoft Graph |
| **Magic Link** | Organizations without SSO | Email-based passwordless login |
| **Access Code** | Anonymous reporters | Code-based status check (not full auth) |

### 4.2 SSO Integration Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         SSO LOGIN FLOW                                    │
└──────────────────────────────────────────────────────────────────────────┘

1. User clicks "Employee Login" on Ethics Portal
         │
         ▼
2. Portal redirects to client's IdP (SAML/OIDC)
         │
         ▼
3. User authenticates with corporate credentials
         │
         ▼
4. IdP returns assertion/token with claims:
   • email
   • employee_id
   • department (optional)
   • manager_email (optional)
   • groups/roles (optional)
         │
         ▼
5. Portal validates assertion/token
         │
         ├─── First login? ──► JIT Provisioning
         │                     • Create User record
         │                     • Link to HRIS data
         │                     • Assign default role
         │
         ▼
6. Create session JWT with:
   • user_id
   • organization_id
   • roles[]
   • permissions[]
   • language_preference
   • session_expiry
         │
         ▼
7. Redirect to Employee Portal or original destination
```

### 4.3 Just-In-Time (JIT) Provisioning

When a new user authenticates via SSO:

1. **Check HRIS match:** Look up employee by email or employee_id in HRIS data
2. **Create User record:** If HRIS match found, populate from HRIS
3. **Assign role:** Default to EMPLOYEE role unless group claims indicate otherwise
4. **Set preferences:** Use HRIS language preference if available
5. **Log provisioning:** Audit trail for compliance

### 4.4 Anonymous Access Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                      ANONYMOUS ACCESS CODE FLOW                          │
└──────────────────────────────────────────────────────────────────────────┘

REPORT SUBMISSION:
1. Anonymous user submits report
         │
         ▼
2. System generates access code (8-12 alphanumeric characters)
   Format: ETH-XXXX-XXXX (readable, easy to type)
         │
         ▼
3. Access code displayed prominently:
   ┌────────────────────────────────────────┐
   │  Your Access Code                      │
   │  ┌──────────────────────────────────┐  │
   │  │     ETH-A7K9-M3X2                │  │
   │  └──────────────────────────────────┘  │
   │                                        │
   │  Save this code! You'll need it to:   │
   │  • Check your case status             │
   │  • Receive updates                    │
   │  • Communicate with investigators     │
   │                                        │
   │  [Copy to Clipboard]  [Email to Me]   │
   └────────────────────────────────────────┘
         │
         ├── If email provided ──► Send confirmation with access code
         │                         (via anonymized relay)
         ▼
4. Store AnonymousReporterSession with hashed access code

STATUS CHECK:
1. User enters access code on /status page
         │
         ▼
2. System validates code (hash comparison)
         │
         ├── Valid ──► Show case status, messages, follow-up form
         │
         └── Invalid ──► "Code not found" (no hint if close match)
```

### 4.5 Session Management

| Setting | Value | Rationale |
|---------|-------|-----------|
| Session duration | 8 hours | Standard workday |
| Idle timeout | 30 minutes (configurable) | Security best practice |
| Remember device | 30 days (optional) | Reduces friction for trusted devices |
| Concurrent sessions | Allowed | Multi-device support |
| Session revocation | Immediate on password change | Security |

### 4.6 HRIS Integration for Employee Context

On authenticated login, portal fetches employee context from HRIS:

```typescript
interface EmployeeContext {
  employee_id: string;
  email: string;
  name: string;
  department: string;
  location: string;
  manager_id: string;
  manager_name: string;
  manager_email: string;
  job_title: string;
  job_level: string;
  hire_date: string;
  preferred_language: string;
  cost_center: string;
  business_unit: string;
  // Client-configurable additional fields
  custom_fields: Record<string, unknown>;
}
```

This context is used for:
- Pre-filling disclosure forms
- Routing reports to appropriate reviewers
- Determining manager visibility
- Language preference
- Policy applicability

---

## 5. Public Landing Page

### 5.1 CMS-Driven Structure

The public landing page is fully configurable via CMS with these standard sections:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [LOGO]                                    [Language ▼]  [Employee Login]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        HERO SECTION (CMS Block)                            │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │  "Speak up. We're listening."                                       │  │
│   │                                                                     │  │
│   │  Our commitment to integrity starts with you.                       │  │
│   │                                                                     │  │
│   │  [Report a Concern]    [Check Status]                               │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                     CHANNEL CARDS (CMS Block - Card Grid)                  │
│   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐           │
│   │  📞 Call Us      │  │  💬 Chat        │  │  📝 Web Form     │           │
│   │                 │  │                 │  │                 │           │
│   │  1-800-ETHICS   │  │  Get guidance   │  │  Submit online  │           │
│   │  24/7 available │  │  from our AI    │  │  at your pace   │           │
│   │                 │  │  assistant      │  │                 │           │
│   │  [Call Now]     │  │  [Start Chat]   │  │  [Start Form]   │           │
│   └─────────────────┘  └─────────────────┘  └─────────────────┘           │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                      VALUES SECTION (CMS Block - Text)                     │
│   Our Commitment                                                           │
│   ─────────────────                                                        │
│   At [Company], we believe in transparency, accountability...             │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                     VIDEO SECTION (CMS Block - Video)                      │
│   ┌─────────────────────────────────────────┐                              │
│   │                                         │                              │
│   │            CEO Message Video            │                              │
│   │                ▶️                        │                              │
│   │                                         │                              │
│   └─────────────────────────────────────────┘                              │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        FAQ SECTION (CMS Block - Accordion)                 │
│   ▸ What happens when I submit a report?                                  │
│   ▸ Will my identity be protected?                                        │
│   ▸ What if I'm not sure it's worth reporting?                            │
│   ▸ Can I check the status of my report?                                  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                    CONTACT SECTION (CMS Block - Contact Info)              │
│   Need help?                                                               │
│   📞 1-800-ETHICS  │  📧 ethics@company.com  │  🌐 ethics.company.com      │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  Footer: [Privacy Policy] [Terms] [Accessibility] [© 2026 Company Name]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Branding Customization

Clients can customize:

| Element | Customization Options |
|---------|----------------------|
| **Logo** | Upload PNG/SVG, set alt text, control size |
| **Colors** | Primary, secondary, accent, background, text (hex or brand picker) |
| **Typography** | Font family from approved list (Inter, Roboto, Open Sans, Lato, Poppins) or custom web font |
| **Hero** | Background image, video, or solid color |
| **Imagery** | Custom photos, icons, or use Ethico default library |
| **Footer** | Logo, links, copyright text |
| **Favicon** | Custom favicon and PWA icons |

### 5.3 Channel Configuration

Clients enable/disable channels via admin:

```typescript
interface ChannelConfig {
  web_form: {
    enabled: boolean;
    button_text: string; // e.g., "Submit Online"
    description: string;
  };
  hotline: {
    enabled: boolean;
    phone_number: string;
    hours: Schedule; // operating hours
    button_text: string;
  };
  chatbot: {
    enabled: boolean;
    greeting_message: string;
    avatar_url: string;
  };
  email: {
    enabled: boolean;
    email_address: string;
  };
  manager_proxy: {
    enabled: boolean;
    visible_on_landing: boolean; // or only after login
  };
}
```

### 5.4 Language Detection & Selection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LANGUAGE SELECTION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

1. User visits portal
         │
         ▼
2. Check browser's Accept-Language header
         │
         ├─── Supported language? ──► Use detected language
         │
         └─── Not supported? ──► Use portal default language
         │
         ▼
3. Display language picker (if enabled) in header
         │
         ▼
4. User changes language
         │
         ├─── Anonymous? ──► Store in localStorage
         │
         └─── Authenticated? ──► Store in user preferences (persisted)
         │
         ▼
5. All content renders in selected language
   • CMS content (from translations)
   • Form labels and options
   • Chatbot responses
   • System messages
```

### 5.5 Accessibility Requirements (WCAG 2.1 AA)

| Requirement | Implementation |
|-------------|----------------|
| **Keyboard navigation** | All interactive elements focusable, logical tab order |
| **Screen reader support** | ARIA labels, landmarks, live regions |
| **Color contrast** | Minimum 4.5:1 for normal text, 3:1 for large text |
| **Focus indicators** | Visible focus rings on all interactive elements |
| **Skip links** | "Skip to main content" link at top |
| **Form labels** | All inputs have associated labels |
| **Error identification** | Clear error messages, focus on first error |
| **Resize support** | Functional up to 200% zoom |
| **Motion preferences** | Respect `prefers-reduced-motion` |
| **Alternative text** | All images have meaningful alt text |

---

## 6. Report Submission Flow

### 6.1 Submission Entry Points

| Entry Point | Path | Pre-conditions |
|-------------|------|----------------|
| Landing page CTA | `/report` | None |
| Chatbot escalation | `/report?from=chat&session={id}` | Chatbot context passed |
| Deep link from campaign | `/report?campaign={code}` | Campaign context loaded |
| Employee Portal | `/portal/report` | Authenticated |

### 6.2 Anonymous vs. Identified Decision

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      REPORTER IDENTITY CHOICE                               │
└─────────────────────────────────────────────────────────────────────────────┘

"How would you like to submit your report?"

┌─────────────────────────────┐    ┌─────────────────────────────┐
│  🔒 Stay Anonymous          │    │  👤 Share My Identity       │
│                             │    │                             │
│  Your identity will be      │    │  Share your name and        │
│  completely protected.      │    │  contact information        │
│  We cannot see who you      │    │  with investigators.        │
│  are.                       │    │                             │
│                             │    │  This may help us           │
│  You'll receive an          │    │  investigate more           │
│  access code to check       │    │  effectively.               │
│  status and communicate.    │    │                             │
│                             │    │                             │
│  [Continue Anonymously]     │    │  [Share My Identity]        │
└─────────────────────────────┘    └─────────────────────────────┘

                ┌─────────────────────────────┐
                │  Already have an access     │
                │  code? [Check Status]       │
                └─────────────────────────────┘
```

### 6.3 Web Form Experience

The form wizard adapts based on client configuration:

```
STEP 1: Reporter Information (if identified)
────────────────────────────────────────────
• Name*
• Email*
• Phone (optional)
• Your relationship to [Company]*
  └─ Employee, Former Employee, Contractor, Vendor, Other

STEP 2: Location
────────────────────────────────────────────
"Where did this occur?"
• [Searchable location dropdown from client's location list]
  └─ Or: "I don't know" / "Multiple locations"
• If manual: Address, City, State/Province, Country

STEP 3: What Happened
────────────────────────────────────────────
"Please describe what you observed or experienced"
• [Large text area with formatting options]
• Helpful prompts:
  - Who was involved?
  - When did this happen?
  - Where did it occur?
  - Were there any witnesses?

STEP 4: Category
────────────────────────────────────────────
"What type of concern is this?"
• Primary category* (from client's category list)
• Secondary category (optional)

[Category-specific questions appear here if configured]

STEP 5: Subjects
────────────────────────────────────────────
"Who is this report about?"
• [HRIS lookup or manual entry]
• Add multiple subjects
• For each: Name, Role/Title, Department (if known)

STEP 6: Supporting Information (Optional)
────────────────────────────────────────────
• Upload documents, photos, or other evidence
• File types: PDF, DOC, XLS, JPG, PNG, MP4 (configurable)
• Max size: 50MB per file (configurable)

STEP 7: Review & Submit
────────────────────────────────────────────
• Summary of all entered information
• [Edit] buttons for each section
• Consent checkbox: "I confirm this report is truthful..."
• [Submit Report]
```

### 6.4 Form Logic (Template + Custom)

**Standard Templates:**
Templates provide pre-configured question sets per category:

| Template | Triggered By | Additional Questions |
|----------|--------------|---------------------|
| Harassment | Category = "Harassment" | Frequency, dates, witnesses |
| Financial | Category = "Fraud" | Amount, account info, evidence |
| Safety | Category = "Safety" | Injury occurred?, reported to supervisor? |

**Simple Branching:**
```javascript
// Example: Show witness questions if "Yes" to witnesses
{
  "question_id": "witnesses_present",
  "type": "YES_NO",
  "label": "Were there any witnesses?",
  "branches": {
    "YES": ["witness_name", "witness_contact", "witness_relationship"]
  }
}
```

**Advanced Logic (Premium):**
- Calculated fields
- Complex multi-condition branching
- Validation rules (regex, range checks)
- API-driven lookups

### 6.5 Access Code Generation & Delivery

On successful submission:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SUBMISSION COMPLETE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

  ✅ Your report has been submitted

  ─────────────────────────────────────────────────────────────────────────

  YOUR ACCESS CODE

  ┌─────────────────────────────────────────────────────────────────────────┐
  │                                                                         │
  │                        ETH-A7K9-M3X2                                   │
  │                                                                         │
  └─────────────────────────────────────────────────────────────────────────┘

  ⚠️  IMPORTANT: Save this code somewhere safe!

  You'll need this code to:
  • Check the status of your report
  • Receive and respond to messages from investigators
  • Provide additional information if needed

  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐
  │  📋 Copy to Clipboard            │  │  📧 Send to My Email             │
  └──────────────────────────────────┘  └──────────────────────────────────┘

  ─────────────────────────────────────────────────────────────────────────

  What happens next?

  1. Your report will be reviewed and assigned to an investigator
  2. You may receive questions via email (if provided) or through this portal
  3. Check back anytime at: ethics.company.com/status

  ─────────────────────────────────────────────────────────────────────────

  [Return to Home]                                        [Check Status]
```

If email provided (anonymous with email relay):
- Send confirmation email with access code
- Email comes from `noreply@ethics-relay.ethico.com` (anonymized)
- Subsequent investigator messages forwarded through relay

### 6.6 Chatbot-Guided Intake

Integration point with chatbot:

```
CHATBOT INTAKE FLOW

User: "I want to report something"
         │
         ▼
Bot: "I can help you with that. I'll ask a few questions to understand
      your concern. First, would you like to stay anonymous or share
      your identity?"
         │
         ▼
Bot: [Presents identity choice buttons]
         │
         ▼
Bot: "Can you tell me what happened? Take your time - you can share
      as much or as little detail as you're comfortable with."
         │
         ▼
User: [Describes situation in natural language]
         │
         ▼
Bot: [AI extracts: category suggestion, key details, potential subjects]
     "Based on what you've shared, this sounds like it may involve
      [Harassment]. Is that right?"
         │
         ▼
Bot: [Continues through structured questions conversationally]
         │
         ▼
Bot: "I have enough information to create your report. Here's a summary:
      [Summary]

      Would you like to submit this now, or would you prefer to
      complete the full form for more details?"
         │
         ├─── "Submit now" ──► Create Case, show access code
         │
         └─── "Full form" ──► Transfer to form wizard, pre-fill answers
```

---

## 7. Case Status & Communication

### 7.1 Access Code Lookup Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CHECK YOUR REPORT STATUS                            │
└─────────────────────────────────────────────────────────────────────────────┘

  Enter the access code you received when you submitted your report:

  ┌─────────────────────────────────────────────────────────────────────────┐
  │  ETH-____-____                                                         │
  └─────────────────────────────────────────────────────────────────────────┘

  [Check Status]

  ─────────────────────────────────────────────────────────────────────────

  Lost your access code?

  If you provided an email address, we can resend your access code.

  [Resend Access Code]  ──► Enter email ──► If match, resend via relay
```

### 7.2 Status Display

References Case Management (PRD-005) for status definitions:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  YOUR REPORT: ETH-A7K9-M3X2                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STATUS: Under Investigation                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  [✓ Received]───[✓ Assigned]───[● Investigating]───[ Resolved ]           │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  TIMELINE                                                                  │
│  ─────────                                                                 │
│  Jan 15, 2026 • Your report was received                                  │
│  Jan 16, 2026 • Your report was assigned to an investigator               │
│  Jan 18, 2026 • Investigator has a question for you                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MESSAGES                                                    [1 unread]    │
│  ────────                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  From: Compliance Team                           Jan 18, 2026       │  │
│  │                                                                     │  │
│  │  Thank you for your report. We have a few clarifying questions:     │  │
│  │                                                                     │  │
│  │  1. You mentioned the incident occurred in "the breakroom."         │  │
│  │     Could you specify which building/floor?                         │  │
│  │                                                                     │  │
│  │  2. Approximately what time of day did this occur?                  │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐  │
│  │  Reply to investigator...                                          │  │
│  │                                                                     │  │
│  │                                                                     │  │
│  │                                                   [Send Message]    │  │
│  └─────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROVIDE ADDITIONAL INFORMATION                                            │
│  ─────────────────────────────────                                         │
│  Have new information to add to your report?                               │
│                                                                             │
│  [Add Follow-Up Information]                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Two-Way Messaging (Anonymized Relay)

**Architecture:**

```
REPORTER                        ETHICO RELAY                     INVESTIGATOR
                                     │
[real email] ─────────────────────►  │  ◄──────────────────── [sends message]
   (stored,                          │                         in platform
    encrypted,                       │
    hidden)                          │
                                     │
              ◄──────────────────────┤
              [message               │
               forwarded from        │
               relay@ethico.com]     │
                                     │
[reply to email] ────────────────►   │ ─────────────────────► [sees reply
                                     │                         in platform]
```

**Email Relay Details:**
- From address: `case-{hash}@relay.ethico.com`
- Subject: `Re: Your Report [Reference: ETH-A7K9]`
- Reply-to: same relay address
- No client branding in relay emails (maintains anonymity from email provider)

### 7.4 Multi-Channel Follow-Up

Reporters can add information via:

| Channel | How It Works |
|---------|--------------|
| **Portal** | Enter access code, click "Add Follow-Up Information" |
| **Email reply** | Reply to any relay email, content synced to case |
| **Hotline** | Call hotline, provide access code, operator adds info |

All channels sync to the same case timeline, visible to investigators.

---

## 8. Employee Portal (Authenticated)

### 8.1 Portal Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [LOGO]                     Employee Portal        [🔔 2]  [👤 John Smith ▼]│
├──────────────┬──────────────────────────────────────────────────────────────┤
│              │                                                              │
│  Dashboard   │  Welcome back, John                                         │
│              │                                                              │
│  My Cases    │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│              │                                                              │
│  My          │  ACTION REQUIRED                                            │
│  Disclosures │  ┌─────────────────────────────────────────────────────────┐│
│              │  │  📋 Annual COI Disclosure                    Due: 5 days ││
│  Policies    │  │     Complete your annual Conflicts of Interest form     ││
│              │  │                                          [Complete Now] ││
│  Settings    │  └─────────────────────────────────────────────────────────┘│
│              │  ┌─────────────────────────────────────────────────────────┐│
│              │  │  ✅ Code of Conduct Attestation               Due: 3 days ││
│              │  │     Review and acknowledge the updated Code of Conduct  ││
│              │  │                                          [Review Now]   ││
│              │  └─────────────────────────────────────────────────────────┘│
│              │                                                              │
│              │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│              │                                                              │
│              │  QUICK ACTIONS                                              │
│              │  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│              │  │ 📝 Submit  │  │ 🎁 Report  │  │ 📚 View    │            │
│              │  │ a Concern  │  │ a Gift     │  │ Policies   │            │
│              │  └────────────┘  └────────────┘  └────────────┘            │
│              │                                                              │
│              │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│              │                                                              │
│              │  RECENT ACTIVITY                                            │
│              │  • Jan 20: Your gift disclosure was cleared                 │
│              │  • Jan 18: New message on case ETH-2026-00042               │
│              │  • Jan 15: Anti-Bribery Policy updated                      │
│              │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

### 8.2 My Cases Section

Employee view of their submitted cases:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MY CASES                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ETH-2026-00042                              Status: Investigating   │   │
│  │  Workplace Safety Concern                                           │   │
│  │  Submitted: Jan 10, 2026                     Last Update: Jan 18    │   │
│  │                                                                     │   │
│  │  📬 1 new message                                                   │   │
│  │                                                                     │   │
│  │  [View Details]                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ETH-2025-00891                              Status: Closed          │   │
│  │  Policy Question                                                    │   │
│  │  Submitted: Nov 5, 2025                      Resolved: Nov 12       │   │
│  │                                                                     │   │
│  │  [View Details]                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [Submit New Report]                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.3 My Disclosures Section

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MY DISCLOSURES                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PENDING ACTIONS                                                           │
│  ────────────────                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📋 Annual COI Disclosure 2026                         Due: 5 days   │   │
│  │  Campaign: Annual Compliance Certification                          │   │
│  │                                                                     │   │
│  │  [Complete Now]  [Save Draft]                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  PENDING REVIEW                                                            │
│  ──────────────                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  DIS-2026-00015                              Status: Pending Review  │   │
│  │  Gift Received - Conference Speaker Gift                           │   │
│  │  Submitted: Jan 12, 2026                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  REQUIRING ACTION                                                          │
│  ─────────────────                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  DIS-2025-00892                              Status: With Conditions │   │
│  │  Outside Board Position                                             │   │
│  │  Approved: Dec 15, 2025                                             │   │
│  │                                                                     │   │
│  │  ⚠️ 1 condition requires your action                                │   │
│  │     "Provide quarterly earnings reports" - Due: Jan 31              │   │
│  │                                                                     │   │
│  │  [Complete Condition]                                               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  HISTORY                                                                   │
│  ───────                                                                   │
│  [Show all past disclosures ▼]                                             │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [Submit New Disclosure]                                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.4 Policy Hub

Integrated policy library with attestations:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  POLICY HUB                                                [🔍 Search...]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  REQUIRING YOUR ATTESTATION                                                │
│  ───────────────────────────                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📄 Code of Conduct v3.2                             Due: 3 days     │   │
│  │  Updated January 2026                                               │   │
│  │                                                                     │   │
│  │  [Read & Attest]                                                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ALL POLICIES                                              [Filter ▼]      │
│  ────────────                                                              │
│                                                                             │
│  ▸ Code of Conduct                                         ✅ Attested     │
│  ▸ Anti-Bribery & Corruption Policy                        ✅ Attested     │
│  ▸ Conflicts of Interest Policy                            ✅ Attested     │
│  ▸ Data Privacy Policy                                     📄 View Only    │
│  ▸ Workplace Safety Guidelines                             📄 View Only    │
│  ▸ Social Media Policy                                     📄 View Only    │
│  ▸ Information Security Policy                             ⚠️ Due Jan 30   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  💬 Have a question about a policy? [Ask the Assistant]                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 8.5 Settings & Preferences

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  SETTINGS                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PROFILE                                                                   │
│  ───────                                                                   │
│  Name: John Smith                                                          │
│  Email: john.smith@company.com                                             │
│  Department: Engineering                                                   │
│  Location: San Francisco, CA                                               │
│  Manager: Jane Doe                                                         │
│                                                                             │
│  (Profile data synced from HR system)                                      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  LANGUAGE                                                                  │
│  ────────                                                                  │
│  Preferred Language: [English ▼]                                           │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  NOTIFICATIONS                                                             │
│  ─────────────                                                             │
│                                                                             │
│  Case Updates                                                              │
│  ├─ Status changes              [Email ▼]                                  │
│  ├─ New messages                [Email + Push ▼]                           │
│  └─ Case assigned to me         [Email ▼]                                  │
│                                                                             │
│  Disclosure Updates                                                        │
│  ├─ Decision made               [Email ▼]                                  │
│  ├─ Condition due               [Email + Push ▼]                           │
│  └─ Campaign reminders          [Email ▼]                                  │
│                                                                             │
│  Policy Updates                                                            │
│  ├─ Attestation required        [Email ▼]                                  │
│  └─ Policy updated              [None ▼]                                   │
│                                                                             │
│  Digest                                                                    │
│  ├─ Enable weekly digest        [✓]                                        │
│  └─ Delivery day                [Monday ▼]                                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  DELEGATION (for Executives)                                               │
│  ────────────────────────────                                              │
│  Allow someone to submit disclosures on your behalf                        │
│                                                                             │
│  Current Delegates:                                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Sarah Johnson (Executive Assistant)                                │   │
│  │  Scope: All Disclosures                                             │   │
│  │  Since: Jan 1, 2026                           [Revoke]              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [+ Add Delegate]                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Manager Portal

### 9.1 Configurable Feature Matrix

Clients enable Manager Portal features:

| Feature | Description | Default |
|---------|-------------|---------|
| **Proxy Reporting** | Submit reports on behalf of direct reports | Enabled |
| **Team Disclosure Status** | View disclosure completion for direct reports | Disabled |
| **Team Attestation Status** | View policy attestation status for team | Disabled |
| **Team Training Status** | View training completion for team | Disabled |
| **Compliance Dashboard** | Aggregate compliance metrics for team | Disabled |

### 9.2 Manager Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [LOGO]                     Manager Portal         [🔔 2]  [👤 Jane Doe ▼] │
├──────────────┬──────────────────────────────────────────────────────────────┤
│              │                                                              │
│  Dashboard   │  Your Team Compliance Overview                              │
│              │                                                              │
│  Proxy       │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Reporting   │                                                              │
│              │  DISCLOSURE CAMPAIGNS                                        │
│  Team        │  ┌─────────────────────────────────────────────────────────┐│
│  Compliance  │  │  Annual COI Disclosure 2026                            ││
│              │  │                                                         ││
│              │  │  Your Team: 12 employees                                ││
│              │  │  ████████████░░░░░░░░░░░░░░░░  8/12 complete (67%)      ││
│              │  │                                                         ││
│              │  │  ⚠️ 4 team members have not completed                   ││
│              │  │     • John Smith - not started                          ││
│              │  │     • Lisa Wong - in progress                           ││
│              │  │     • Mike Johnson - not started                        ││
│              │  │     • Anna Lee - not started                            ││
│              │  │                                                         ││
│              │  │  [Send Reminder]                         [View Details] ││
│              │  └─────────────────────────────────────────────────────────┘│
│              │                                                              │
│              │  POLICY ATTESTATIONS                                        │
│              │  ┌─────────────────────────────────────────────────────────┐│
│              │  │  Code of Conduct v3.2                                  ││
│              │  │  ████████████████████████████  12/12 complete (100%)   ││
│              │  └─────────────────────────────────────────────────────────┘│
│              │                                                              │
│              │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│              │                                                              │
│              │  QUICK ACTIONS                                              │
│              │  [Submit Report on Behalf of Team Member]                   │
│              │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

### 9.3 Proxy Reporting Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SUBMIT REPORT ON BEHALF OF TEAM MEMBER                   │
└─────────────────────────────────────────────────────────────────────────────┘

  As a manager, you can submit a concern on behalf of a team member who
  may not be comfortable submitting directly.

  ⚠️  Note: Your identity as the submitter will be recorded for audit
      purposes, but you can choose whether to share the original
      reporter's identity with investigators.

  ─────────────────────────────────────────────────────────────────────────

  STEP 1: Who is the original reporter?

  ○ My team member wants to remain anonymous
    (You'll describe the concern, but not identify who told you)

  ○ My team member consents to being identified
    (Select team member from list)

    [Select Team Member ▼]

  ─────────────────────────────────────────────────────────────────────────

  YOUR INFORMATION (Recorded for audit)

  Submitting Manager: Jane Doe (jane.doe@company.com)
  Your Department: Engineering
  Submission Date: January 20, 2026

  ─────────────────────────────────────────────────────────────────────────

  [Continue to Report Details]
```

---

## 10. AI Chatbot

### 10.1 Conversation Architecture

The chatbot provides tiered capabilities based on authentication:

| User Type | Capabilities |
|-----------|--------------|
| **Anonymous** | Intake guidance, policy Q&A (public policies only), status check help |
| **Authenticated Employee** | Full intake, policy Q&A (all applicable policies), case/disclosure help, attestation help |
| **Authenticated Manager** | Above + proxy submission guidance, team compliance questions |

### 10.2 Chatbot UI

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          💬 ETHICS ASSISTANT                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🤖 Hi! I'm the Ethics Assistant. I can help you:                   │   │
│  │                                                                     │   │
│  │  • Submit a concern or report                                       │   │
│  │  • Answer questions about policies                                  │   │
│  │  • Check the status of your report                                  │   │
│  │  • Guide you through disclosures                                    │   │
│  │                                                                     │   │
│  │  What would you like help with?                                     │   │
│  │                                                                     │   │
│  │  [Report a Concern]  [Policy Question]  [Check Status]              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  👤 I have a question about the gift policy                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  🤖 I can help with that! Our Gift & Entertainment Policy sets      │   │
│  │  guidelines for giving and receiving gifts in business contexts.    │   │
│  │                                                                     │   │
│  │  Here are the key points:                                           │   │
│  │                                                                     │   │
│  │  • Gifts under $50 generally don't require approval                 │   │
│  │  • Cash or cash equivalents are never acceptable                    │   │
│  │  • Gifts from government officials require Legal review             │   │
│  │                                                                     │   │
│  │  📄 Source: Gift & Entertainment Policy (Section 3.2)               │   │
│  │                                                                     │   │
│  │  What specific situation can I help you with?                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  Type a message...                                          [Send]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.3 RAG Integration with Policies

The chatbot uses Retrieval-Augmented Generation to answer policy questions:

```
USER QUESTION
    │
    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          POLICY RAG PIPELINE                                │
└─────────────────────────────────────────────────────────────────────────────┘
    │
    ▼
1. QUERY EMBEDDING
   • Embed user question using embedding model
    │
    ▼
2. VECTOR SEARCH
   • Search policy embeddings (pgvector)
   • Filter by: organization_id, visibility rules, user role
   • Return top-k relevant chunks
    │
    ▼
3. CONTEXT ASSEMBLY
   • Gather retrieved policy chunks
   • Include policy metadata (title, version, section)
   • Add conversation history
    │
    ▼
4. LLM GENERATION
   • Claude generates response grounded in retrieved policies
   • Cites sources inline: "According to the Anti-Bribery Policy (Section 2.1)..."
    │
    ▼
5. SOURCE ATTRIBUTION
   • Extract policy references
   • Format as clickable links
   • Log for audit
    │
    ▼
RESPONSE WITH CITATIONS
```

### 10.4 Handoff to Human

When chatbot cannot resolve:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🤖 I want to make sure you get the right help. This situation might       │
│  need a human review.                                                       │
│                                                                             │
│  Would you like me to:                                                      │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📝 Create a formal report                                          │   │
│  │  I'll transfer what you've shared to a report form                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📞 Speak with someone directly                                     │   │
│  │  Call our hotline: 1-800-ETHICS                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  📧 Send an email                                                   │   │
│  │  Contact: ethics@company.com                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.5 Conversation Logging & Audit

All chatbot interactions are logged for:
- Quality improvement
- Audit compliance
- Training data (anonymized)
- Issue escalation tracking

Logged data:
- Session ID and timestamps
- User type (anonymous/authenticated)
- Messages (both user and assistant)
- Policies cited
- Outcomes (resolved, escalated, abandoned)
- Satisfaction rating (if collected)

---

## 11. Content Management System

### 11.1 Page Builder Components

Drag-and-drop blocks available:

| Component | Description | Customization |
|-----------|-------------|---------------|
| **Hero** | Full-width banner with heading, subheading, CTA | Background image/video/color, text alignment |
| **Text** | Rich text content block | Formatting, columns, alignment |
| **Image** | Single image with caption | Size, alignment, link |
| **Video** | Embedded video (YouTube, Vimeo, or uploaded) | Autoplay, size, caption |
| **CTA Button** | Action button | Style (primary/secondary/outline), icon, link |
| **Card Grid** | Grid of cards with icons | 2-4 columns, icon style |
| **Accordion** | Expandable FAQ sections | Multiple items, expand behavior |
| **Contact Info** | Contact details block | Phone, email, hours |
| **Divider** | Visual separator | Style (line, dots, none), spacing |
| **Spacer** | Vertical spacing | Height in pixels or viewport units |
| **Form Embed** | Embedded form | Form selection, styling |

### 11.2 Page Editor Interface

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PAGE EDITOR: Landing Page                   [Preview]  [Save]  [Publish]  │
├──────────────┬──────────────────────────────────────────────────────────────┤
│              │                                                              │
│  + Add Block │  ┌─────────────────────────────────────────────────────────┐│
│              │  │  HERO                                          [⋮] [×] ││
│  ────────────│  │                                                         ││
│              │  │  ┌─────────────────────────────────────────────────┐   ││
│  Components  │  │  │  Heading: "Speak up. We're listening."         │   ││
│  • Hero      │  │  │  Subheading: "Our commitment to integrity..."  │   ││
│  • Text      │  │  │  CTA Button: "Report a Concern"                │   ││
│  • Image     │  │  │  Background: [Upload Image]                    │   ││
│  • Video     │  │  └─────────────────────────────────────────────────┘   ││
│  • CTA       │  └─────────────────────────────────────────────────────────┘│
│  • Cards     │                                                              │
│  • FAQ       │  ┌─────────────────────────────────────────────────────────┐│
│  • Contact   │  │  CARD GRID                                     [⋮] [×] ││
│  • Divider   │  │                                                         ││
│  • Spacer    │  │  [Card 1]  [Card 2]  [Card 3]                          ││
│              │  │   Phone     Chat      Web Form                          ││
│              │  └─────────────────────────────────────────────────────────┘│
│              │                                                              │
│              │  ┌─────────────────────────────────────────────────────────┐│
│              │  │  TEXT                                          [⋮] [×] ││
│              │  │                                                         ││
│              │  │  [Rich text editor with formatting toolbar]            ││
│              │  └─────────────────────────────────────────────────────────┘│
│              │                                                              │
│              │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ │
│              │  [+ Drop new block here]                                    │
│              │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

### 11.3 Media Management

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  MEDIA LIBRARY                                              [+ Upload New]  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  [Search media...]                           [All Types ▼]  [All Folders ▼]│
│                                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│  │           │  │           │  │           │  │           │               │
│  │  [img]    │  │  [img]    │  │  [video]  │  │  [img]    │               │
│  │           │  │           │  │           │  │           │               │
│  │  logo.png │  │ hero.jpg  │  │ ceo.mp4   │  │ office... │               │
│  │  45 KB    │  │ 1.2 MB    │  │ 25 MB     │  │ 890 KB    │               │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘               │
│                                                                             │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│  │           │  │           │  │           │  │           │               │
│  │  [img]    │  │  [pdf]    │  │  [img]    │  │  [img]    │               │
│  │           │  │           │  │           │  │           │               │
│  │ team.jpg  │  │ guide.pdf │  │ icon1.svg │  │ icon2.svg │               │
│  │ 2.1 MB    │  │ 540 KB    │  │ 12 KB     │  │ 15 KB     │               │
│  └───────────┘  └───────────┘  └───────────┘  └───────────┘               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.4 Translation Management

For multi-language portals:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  TRANSLATION: Hero Block                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Base Language: English (US)                                               │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  HEADING                                                            │   │
│  │                                                                     │   │
│  │  English:  "Speak up. We're listening."                             │   │
│  │                                                                     │   │
│  │  Spanish:  "Habla. Te escuchamos."                           [✓]   │   │
│  │  French:   "Exprimez-vous. Nous vous écoutons."              [✓]   │   │
│  │  German:   "Sprechen Sie. Wir hören zu."                     [✓]   │   │
│  │  Chinese:  "请发言。我们在倾听。"                              [✓]   │   │
│  │  Japanese: ""                                                 [!]   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  SUBHEADING                                                         │   │
│  │  ...                                                                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Missing translations: 2                                                   │
│  [Auto-translate with AI]  [Export for Translation]  [Import Translations] │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 11.5 Preview & Publishing

```
CONTENT WORKFLOW

  [Draft] ───► [Preview] ───► [Schedule] ───► [Publish]
      │            │              │               │
      │            │              │               ▼
      │            │              │         Live on portal
      │            │              │
      │            │              ▼
      │            │         Scheduled publish at date/time
      │            │
      │            ▼
      │       Preview URL (shareable, expires in 24h)
      │       Desktop / Tablet / Mobile views
      │
      ▼
  Auto-save every 30 seconds
  Version history retained
```

---

## 12. Localization

### 12.1 Supported Languages

Initial support (expandable):

| Language | Code | Status |
|----------|------|--------|
| English (US) | en-US | Base |
| English (UK) | en-GB | Supported |
| Spanish | es | Supported |
| French | fr | Supported |
| German | de | Supported |
| Portuguese (Brazil) | pt-BR | Supported |
| Chinese (Simplified) | zh-CN | Supported |
| Chinese (Traditional) | zh-TW | Supported |
| Japanese | ja | Supported |
| Korean | ko | Supported |
| Italian | it | Supported |
| Dutch | nl | Supported |
| Polish | pl | Supported |
| Russian | ru | Supported |
| Arabic | ar | Supported (RTL) |
| Hebrew | he | Supported (RTL) |

### 12.2 Detection Logic

```
LANGUAGE DETECTION FLOW

1. Check URL parameter (?lang=es)
   └─► If present and valid, use it
           │
2. Check user preference (cookie/localStorage)
   └─► If set, use it
           │
3. For authenticated users: Check HRIS preferred_language
   └─► If set, use it
           │
4. Check browser Accept-Language header
   └─► Parse and match to supported languages
           │
5. Use organization default language
           │
           ▼
   Store selection for future visits
```

### 12.3 Content Types & Translation

| Content Type | Translation Method |
|--------------|-------------------|
| **CMS Content** | Manual or AI-assisted translation in editor |
| **Form Labels** | Stored in form definition, per language |
| **System UI** | i18n files, professionally translated |
| **Email Templates** | Per-language templates in notification system |
| **Policy Content** | Managed by Policy Management module |
| **Chatbot Responses** | AI generates in user's language |
| **User-Submitted Content** | Stored in original language, AI translation on-demand |

### 12.4 RTL Support

For Arabic, Hebrew, and other RTL languages:
- CSS `direction: rtl` applied to document
- Layout mirrors (navigation on right, content flows right-to-left)
- Icons with directional meaning flip (arrows, etc.)
- Numbers and embedded LTR text handled correctly

---

## 13. Notification System

### 13.1 Notification Channels

| Channel | Use Cases | Implementation |
|---------|-----------|----------------|
| **Email** | All notification types | SendGrid/SES integration |
| **Push (PWA)** | Real-time alerts for authenticated users | Web Push API |
| **In-App** | Badge counts, notification center | Real-time via WebSocket |

### 13.2 Notification Events

**Case Notifications:**

| Event | Recipients | Default Channel |
|-------|------------|-----------------|
| Case submitted confirmation | Reporter | Email |
| Case status change | Reporter | Email |
| New message from investigator | Reporter | Email + Push |
| Case assigned | Investigator | Email + In-App |
| Case resolved | Reporter | Email |

**Disclosure Notifications:**

| Event | Recipients | Default Channel |
|-------|------------|-----------------|
| Campaign invitation | Employee | Email |
| Campaign reminder | Employee | Email |
| Disclosure decision made | Employee | Email |
| Condition added | Employee | Email + Push |
| Condition due reminder | Employee | Email |
| Condition overdue | Employee + Manager | Email |

**Policy Notifications:**

| Event | Recipients | Default Channel |
|-------|------------|-----------------|
| Attestation required | Employee | Email |
| Attestation reminder | Employee | Email |
| Policy updated | Affected employees | Email |

**Manager Notifications:**

| Event | Recipients | Default Channel |
|-------|------------|-----------------|
| Team member overdue on campaign | Manager | Email |
| Team compliance summary (weekly) | Manager | Email |

### 13.3 Email Template Structure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           [CLIENT LOGO]                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Subject: {{subject}}                                                       │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Hi {{recipient_name}},                                                     │
│                                                                             │
│  {{body_content}}                                                           │
│                                                                             │
│  {{#if cta_button}}                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [{{cta_text}}]                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│  {{/if}}                                                                    │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  {{footer_content}}                                                         │
│                                                                             │
│  This message was sent by {{client_name}} Ethics & Compliance.             │
│  [Manage notification preferences]                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 13.4 Digest Emails

Weekly digest for employees who opt in:

```
Subject: Your Weekly Ethics & Compliance Summary

Hi {{name}},

Here's what happened this week:

📋 DISCLOSURES
• 1 disclosure cleared
• 0 pending your action

📄 POLICIES
• Anti-Corruption Policy updated - review required by Feb 15
• Code of Conduct attestation complete ✓

📝 CASES
• No updates this week

────────────────────────────────────────────────

Have questions? [Contact Compliance] or [Chat with Assistant]
```

---

## 14. Admin Configuration

### 14.1 Portal Settings Dashboard

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PORTAL ADMINISTRATION                                                      │
├──────────────┬──────────────────────────────────────────────────────────────┤
│              │                                                              │
│  Overview    │  PORTAL STATUS                                              │
│              │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  Branding    │                                                              │
│              │  Status: ● Live                                              │
│  Channels    │  URL: ethics.acmecorp.com                                   │
│              │  Last Published: Jan 20, 2026 at 2:15 PM                    │
│  Content     │                                                              │
│              │  ────────────────────────────────────────────────────────── │
│  Languages   │                                                              │
│              │  QUICK STATS (Last 30 Days)                                 │
│  Features    │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│              │  │  Reports    │  │  Page Views │  │  Chatbot    │         │
│  Analytics   │  │     47      │  │    2,341    │  │  Sessions   │         │
│              │  │  +12% ▲     │  │   +5% ▲     │  │     189     │         │
│  Access      │  └─────────────┘  └─────────────┘  └─────────────┘         │
│              │                                                              │
│  Maintenance │  ────────────────────────────────────────────────────────── │
│              │                                                              │
│              │  MAINTENANCE MODE                                           │
│              │  [ ] Enable maintenance mode                                │
│              │                                                              │
│              │  Message: [                                    ]            │
│              │                                                              │
│              │  [Save]                                                      │
│              │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

### 14.2 Branding Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  BRANDING                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LOGO                                                                      │
│  ─────                                                                     │
│  ┌─────────────────┐                                                       │
│  │  [Current Logo] │  [Upload New]  [Remove]                               │
│  └─────────────────┘                                                       │
│  Alt text: [Acme Corp Logo                          ]                      │
│                                                                             │
│  FAVICON                                                                   │
│  ───────                                                                   │
│  ┌────┐                                                                    │
│  │[ico]│  [Upload]                                                         │
│  └────┘                                                                    │
│                                                                             │
│  COLORS                                                                    │
│  ──────                                                                    │
│  Primary:     [■ #1a73e8]  Secondary:  [■ #5f6368]  Accent:    [■ #34a853] │
│  Background:  [■ #ffffff]  Text:       [■ #202124]                         │
│                                                                             │
│  [Use brand color picker] or [Enter hex codes]                             │
│                                                                             │
│  TYPOGRAPHY                                                                │
│  ──────────                                                                │
│  Font Family: [Inter ▼]                                                    │
│               Inter, Roboto, Open Sans, Lato, Poppins, Custom...           │
│                                                                             │
│  CUSTOM CSS (Advanced)                                                     │
│  ─────────────────────                                                     │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  /* Add custom styles here */                                       │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Preview Changes]  [Save]                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.3 Channel Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  CHANNELS                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Configure which reporting channels are available on your portal.          │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [✓] WEB FORM                                                              │
│      Button text: [Submit Online                    ]                      │
│      Description: [Submit a report at your own pace ]                      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [✓] HOTLINE                                                               │
│      Phone number: [1-800-ETHICS                    ]                      │
│      Display hours: [✓] Show operating hours                               │
│      Hours: [Monday-Friday, 8am-8pm EST             ]                      │
│      Button text: [Call Us                          ]                      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [✓] CHATBOT                                                               │
│      Greeting: [Hi! I'm here to help...            ]                       │
│      Avatar: [Upload]                                                       │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [ ] EMAIL                                                                 │
│      Email address: [                               ]                      │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  [✓] MANAGER PROXY                                                         │
│      [✓] Show on landing page                                              │
│      [ ] Only show after login                                             │
│                                                                             │
│  [Save]                                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.4 Feature Toggles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  FEATURES                                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  REPORTING OPTIONS                                                         │
│  ─────────────────                                                         │
│  [✓] Allow anonymous reporting                                             │
│  [✓] Allow identified reporting                                            │
│  [✓] Allow case status check via access code                               │
│                                                                             │
│  PORTAL SECTIONS                                                           │
│  ───────────────                                                           │
│  [✓] Policy Hub (view and attest to policies)                              │
│  [✓] Disclosure Portal (submit and manage disclosures)                     │
│                                                                             │
│  MANAGER PORTAL                                                            │
│  ──────────────                                                            │
│  [✓] Enable Manager Portal                                                 │
│  [✓] Proxy reporting                                                       │
│  [ ] Team disclosure visibility                                            │
│  [ ] Team attestation visibility                                           │
│  [ ] Team compliance dashboard                                             │
│                                                                             │
│  EMPLOYEE FEATURES                                                         │
│  ─────────────────                                                         │
│  [✓] Self-service delegation                                               │
│      (Employees can grant submission proxy to others)                      │
│                                                                             │
│  [Save]                                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.5 Analytics Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ANALYTICS & TRACKING                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Choose the level of analytics tracking for your portal:                   │
│                                                                             │
│  ○ NONE                                                                    │
│    No tracking. No analytics data collected.                               │
│                                                                             │
│  ● BASIC (Privacy-Friendly)                                                │
│    Aggregate page views and form submissions only.                         │
│    No individual user tracking. GDPR-friendly.                             │
│                                                                             │
│  ○ FULL                                                                    │
│    User journeys, drop-off analysis, search queries,                       │
│    chatbot conversations, detailed funnel analytics.                       │
│    Requires cookie consent banner.                                         │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  EXTERNAL ANALYTICS                                                        │
│  ──────────────────                                                        │
│  Google Analytics ID: [UA-XXXXXXXXX                 ]                      │
│                                                                             │
│  Custom Tracking Script:                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  <!-- Add your tracking script here -->                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  [Save]                                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 14.6 Offboarding Configuration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  EMPLOYEE OFFBOARDING                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Configure what happens when an employee leaves the organization:          │
│                                                                             │
│  PORTAL ACCESS                                                             │
│  ─────────────                                                             │
│  ● Immediate deactivation                                                  │
│    Access removed as soon as HRIS marks employee as terminated             │
│                                                                             │
│  ○ Grace period                                                            │
│    Allow access for [30] days after termination for pending items          │
│                                                                             │
│  ○ Manual review                                                           │
│    Admin manually deactivates access                                       │
│                                                                             │
│  PENDING ITEMS                                                             │
│  ─────────────                                                             │
│  [✓] Auto-complete pending disclosure campaigns as "Exception - Termed"   │
│  [✓] Auto-complete pending attestations as "Exception - Termed"            │
│  [ ] Notify compliance of pending items at offboarding                     │
│                                                                             │
│  HISTORICAL DATA                                                           │
│  ───────────────                                                           │
│  [✓] Retain submitted disclosures and cases (anonymized after 7 years)    │
│  [✓] Retain attestation records                                            │
│                                                                             │
│  [Save]                                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 15. API Endpoints

Portal-specific endpoints. References Case Management, Disclosures, and Policy Management APIs for domain operations.

### 15.1 Portal Configuration

```
GET     /api/v1/portal/config                         # Get portal config (public)
GET     /api/v1/portal/config/admin                   # Get full config (admin)
PATCH   /api/v1/portal/config                         # Update config
POST    /api/v1/portal/config/verify-domain           # Verify custom domain
```

### 15.2 Content Management

```
GET     /api/v1/portal/pages                          # List pages
POST    /api/v1/portal/pages                          # Create page
GET     /api/v1/portal/pages/{id}                     # Get page
PATCH   /api/v1/portal/pages/{id}                     # Update page
DELETE  /api/v1/portal/pages/{id}                     # Delete page
POST    /api/v1/portal/pages/{id}/publish             # Publish page
POST    /api/v1/portal/pages/{id}/preview             # Generate preview URL

GET     /api/v1/portal/pages/{id}/blocks              # List blocks
POST    /api/v1/portal/pages/{id}/blocks              # Add block
PATCH   /api/v1/portal/blocks/{id}                    # Update block
DELETE  /api/v1/portal/blocks/{id}                    # Delete block
POST    /api/v1/portal/pages/{id}/blocks/reorder      # Reorder blocks

GET     /api/v1/portal/media                          # List media
POST    /api/v1/portal/media                          # Upload media
DELETE  /api/v1/portal/media/{id}                     # Delete media
```

### 15.3 Authentication

```
POST    /api/v1/auth/sso/initiate                     # Start SSO flow
POST    /api/v1/auth/sso/callback                     # SSO callback
POST    /api/v1/auth/magic-link/request               # Request magic link
POST    /api/v1/auth/magic-link/verify                # Verify magic link
POST    /api/v1/auth/access-code/verify               # Verify access code
POST    /api/v1/auth/access-code/resend               # Resend access code
POST    /api/v1/auth/logout                           # Logout
GET     /api/v1/auth/session                          # Get current session
```

### 15.4 Anonymous Reporter

```
POST    /api/v1/anonymous/session                     # Create session (on report submit)
GET     /api/v1/anonymous/session/{code}              # Get session by access code
POST    /api/v1/anonymous/session/{code}/message      # Send message
GET     /api/v1/anonymous/session/{code}/messages     # Get messages
POST    /api/v1/anonymous/session/{code}/followup     # Add follow-up info
```

### 15.5 Chatbot

```
POST    /api/v1/chat/session                          # Start chat session
POST    /api/v1/chat/session/{id}/message             # Send message
GET     /api/v1/chat/session/{id}/messages            # Get message history
POST    /api/v1/chat/session/{id}/end                 # End session
POST    /api/v1/chat/session/{id}/rate                # Rate session
POST    /api/v1/chat/session/{id}/escalate            # Escalate to form/human
```

### 15.6 Notification Preferences

```
GET     /api/v1/user/notifications/preferences        # Get preferences
PATCH   /api/v1/user/notifications/preferences        # Update preferences
POST    /api/v1/user/notifications/push/subscribe     # Subscribe to push
DELETE  /api/v1/user/notifications/push/unsubscribe   # Unsubscribe from push
```

### 15.7 Delegation

```
GET     /api/v1/user/delegations                      # List my delegations (as delegator)
POST    /api/v1/user/delegations                      # Create delegation
GET     /api/v1/user/delegations/{id}                 # Get delegation
PATCH   /api/v1/user/delegations/{id}                 # Update delegation
DELETE  /api/v1/user/delegations/{id}                 # Revoke delegation
GET     /api/v1/user/delegations/as-delegate          # List delegations where I'm delegate
POST    /api/v1/user/delegations/{id}/accept          # Accept delegation
```

### 15.8 Employee Portal

```
GET     /api/v1/employee/dashboard                    # Get dashboard data
GET     /api/v1/employee/pending-actions              # Get pending actions
GET     /api/v1/employee/recent-activity              # Get recent activity
```

### 15.9 Manager Portal

```
GET     /api/v1/manager/dashboard                     # Get manager dashboard
GET     /api/v1/manager/team                          # Get team members
GET     /api/v1/manager/team/disclosures              # Get team disclosure status
GET     /api/v1/manager/team/attestations             # Get team attestation status
POST    /api/v1/manager/team/{id}/remind              # Send reminder to team member
```

### 15.10 Analytics (Internal)

```
POST    /api/v1/analytics/event                       # Track event
GET     /api/v1/analytics/portal/summary              # Get portal analytics (admin)
GET     /api/v1/analytics/portal/detailed             # Get detailed analytics (admin)
```

---

## 16. Key Wireframes

### 16.1 Public Landing Page

See Section 5.1 for detailed wireframe.

**Key Elements:**
- Hero section with primary CTA
- Channel cards (configurable)
- Values/mission statement
- FAQ accordion
- Footer with links

### 16.2 Report Submission Wizard

See Section 6.3 for step-by-step flow.

**Key Screens:**
1. Identity choice (anonymous/identified)
2. Reporter information (if identified)
3. Location selection
4. Narrative capture
5. Category selection + dynamic questions
6. Subject entry
7. File upload
8. Review & submit
9. Confirmation with access code

### 16.3 Case Status Check

See Section 7.2 for detailed wireframe.

**Key Elements:**
- Access code entry
- Status timeline visualization
- Message thread
- Follow-up form

### 16.4 Employee Portal Dashboard

See Section 8.1 for detailed wireframe.

**Key Elements:**
- Action required items
- Quick action buttons
- Recent activity feed
- Navigation sidebar

### 16.5 Manager Portal Dashboard

See Section 9.2 for detailed wireframe.

**Key Elements:**
- Team compliance overview
- Campaign completion charts
- Team member list with status
- Reminder actions

### 16.6 Chatbot Conversation

See Section 10.2 for detailed wireframe.

**Key Elements:**
- Message bubbles with role distinction
- Quick action buttons
- Source citations
- Handoff options

### 16.7 CMS Page Editor

See Section 11.2 for detailed wireframe.

**Key Elements:**
- Component palette
- Drag-and-drop canvas
- Block configuration panel
- Preview/publish controls

### 16.8 Mobile PWA Experience

Responsive adaptations:
- Hamburger menu for navigation
- Full-width forms
- Touch-friendly buttons (48px minimum)
- Bottom navigation for key actions
- Swipe gestures for message navigation

---

## 17. Acceptance Criteria

### 17.1 Functional Requirements

| ID | Criterion | Priority |
|----|-----------|----------|
| AC-01 | Anonymous user can submit report without creating account | P0 |
| AC-02 | Access code is generated and displayed on submission | P0 |
| AC-03 | Access code allows status check and two-way messaging | P0 |
| AC-04 | SSO login works with SAML, OIDC, Google, Microsoft | P0 |
| AC-05 | Magic link fallback works for orgs without SSO | P0 |
| AC-06 | Employee Portal shows pending actions on dashboard | P0 |
| AC-07 | Chatbot answers policy questions with source citations | P0 |
| AC-08 | Chatbot can guide user through report submission | P0 |
| AC-09 | CMS allows drag-and-drop page building | P1 |
| AC-10 | Branding customization applies to all pages | P0 |
| AC-11 | Multi-language support with language picker | P1 |
| AC-12 | Manager can submit proxy report for direct report | P0 |
| AC-13 | Manager sees team compliance dashboard (if enabled) | P1 |
| AC-14 | Self-service delegation allows exec-to-EA proxy | P1 |
| AC-15 | PWA installable and works offline for basic functions | P1 |
| AC-16 | Push notifications delivered for configured events | P1 |
| AC-17 | Notification preferences saved and respected | P1 |
| AC-18 | Analytics tracking respects configured privacy level | P1 |
| AC-19 | Maintenance banner can be toggled by admin | P2 |
| AC-20 | Custom domain with SSL works correctly | P1 |
| AC-21 | Form branching logic shows/hides questions correctly | P0 |
| AC-22 | Email relay preserves reporter anonymity | P0 |
| AC-23 | Multi-channel follow-up syncs to same case | P0 |
| AC-24 | WCAG 2.1 AA compliance verified | P0 |

### 17.2 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Landing page load (LCP) | < 2.5 seconds | Lighthouse |
| Time to Interactive (TTI) | < 3.5 seconds | Lighthouse |
| Form submission | < 2 seconds | API response |
| Chatbot response | < 3 seconds | First token |
| Status check | < 1 second | API response |
| PWA install prompt | Immediate | Browser native |
| Offline detection | < 1 second | Service worker |
| Search (policy hub) | < 500ms | API response |
| Page editor save | < 1 second | API response |

### 17.3 Accessibility Checklist

| Requirement | Test Method |
|-------------|-------------|
| Keyboard navigation for all interactions | Manual testing |
| Screen reader compatibility | NVDA/VoiceOver testing |
| Color contrast 4.5:1 minimum | Automated scan |
| Focus visible on all interactive elements | Visual inspection |
| Form labels associated with inputs | Automated scan |
| Error messages announced to screen readers | NVDA testing |
| No content inaccessible at 200% zoom | Browser zoom test |
| Reduced motion respected | Media query test |
| Alt text on all images | Automated scan |
| Skip to main content link | Manual test |
| ARIA landmarks present | Automated scan |
| Heading hierarchy correct | Automated scan |

---

## 18. MVP Scope & Phasing

### 18.1 Phase 1: Core Portal (Weeks 1-6)

**Deliverables:**
- Public landing page with configurable sections
- Anonymous report submission with access code
- Identified report submission
- Case status check flow
- Two-way messaging (email relay)
- Basic branding configuration
- SSO integration (SAML + OIDC)
- Magic link fallback
- Mobile-responsive design

**Not Included:**
- Chatbot
- CMS page builder
- Manager Portal
- Self-service delegation
- Push notifications
- Advanced analytics

### 18.2 Phase 2: Employee & Manager Portal (Weeks 7-10)

**Deliverables:**
- Employee Portal dashboard
- My Cases section
- My Disclosures section
- Notification preferences
- Manager Portal (proxy reporting)
- Team compliance dashboard (basic)
- Basic CMS (text/image blocks)
- Multi-language support

**Not Included:**
- Policy Hub
- Full CMS capabilities
- Chatbot
- PWA features
- Advanced delegation

### 18.3 Phase 3: AI & Advanced Features (Weeks 11-14)

**Deliverables:**
- AI Chatbot (intake + policy Q&A)
- Policy Hub with attestations
- Full CMS page builder
- Push notifications (PWA)
- Self-service delegation
- Advanced form branching

**Not Included:**
- PWA offline mode
- Advanced analytics dashboard
- Custom tracking integration

### 18.4 Phase 4: Polish & Optimization (Weeks 15-16)

**Deliverables:**
- PWA offline capabilities
- Performance optimization
- Analytics dashboard
- Custom tracking integration
- Accessibility audit remediation
- Documentation and training materials

---

## Appendix A: Component Library (shadcn/ui)

The Ethics Portal uses shadcn/ui components for consistency:

| Component | Usage |
|-----------|-------|
| `Button` | CTAs, form actions, navigation |
| `Card` | Content blocks, dashboard items |
| `Input` | Text fields, search |
| `Textarea` | Narrative capture |
| `Select` | Dropdowns, language picker |
| `Checkbox` | Multi-select, consent |
| `Radio Group` | Single-select options |
| `Dialog` | Modals, confirmations |
| `Sheet` | Side panels, mobile nav |
| `Accordion` | FAQs, expandable sections |
| `Tabs` | Portal navigation, content sections |
| `Toast` | Notifications, success/error |
| `Progress` | Status timeline, completion |
| `Avatar` | User icons, chatbot |
| `Badge` | Status indicators, counts |
| `Skeleton` | Loading states |
| `Alert` | Warnings, info messages |
| `Calendar` | Date picker |
| `Command` | Search, command palette |
| `Popover` | Tooltips, info bubbles |

---

## Appendix B: Branding Configuration Schema

```typescript
interface BrandingConfig {
  // Logo
  logo: {
    url: string;
    altText: string;
    width?: number;
    height?: number;
  };

  // Favicon & PWA Icons
  favicon: string;
  pwaIcons: {
    "192x192": string;
    "512x512": string;
  };

  // Colors
  colors: {
    primary: string;      // Main brand color (buttons, links)
    secondary: string;    // Secondary actions
    accent: string;       // Highlights, notifications
    background: string;   // Page background
    surface: string;      // Card backgrounds
    text: string;         // Primary text
    textMuted: string;    // Secondary text
    border: string;       // Borders, dividers
    success: string;      // Success states
    warning: string;      // Warning states
    error: string;        // Error states
  };

  // Typography
  typography: {
    fontFamily: string;   // e.g., "Inter, sans-serif"
    headingFontFamily?: string;
    baseFontSize: string; // e.g., "16px"
    lineHeight: string;   // e.g., "1.5"
  };

  // Custom CSS
  customCss?: string;

  // Footer
  footer: {
    copyrightText: string;
    links: Array<{
      label: string;
      url: string;
    }>;
    showPoweredBy: boolean;
  };
}
```

---

## Appendix C: Email Template Specifications

### C.1 Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{recipient_name}}` | Recipient's name | "John" |
| `{{recipient_email}}` | Recipient's email | "john@company.com" |
| `{{client_name}}` | Organization name | "Acme Corp" |
| `{{client_logo}}` | Logo URL | "https://..." |
| `{{portal_url}}` | Portal base URL | "https://ethics.acme.com" |
| `{{case_reference}}` | Case reference number | "ETH-2026-00042" |
| `{{access_code}}` | Access code | "ETH-A7K9-M3X2" |
| `{{disclosure_type}}` | Type of disclosure | "Conflicts of Interest" |
| `{{due_date}}` | Due date | "January 31, 2026" |
| `{{policy_name}}` | Policy name | "Code of Conduct" |

### C.2 Template Types

| Template | Subject Pattern | Trigger |
|----------|-----------------|---------|
| `report_confirmation` | Your Report Has Been Submitted | Case created |
| `case_status_update` | Update on Your Report | Status change |
| `new_message` | New Message on Your Report | Investigator message |
| `disclosure_decision` | Decision on Your Disclosure | Disclosure cleared/rejected |
| `campaign_invitation` | Action Required: {campaign_name} | Campaign launch |
| `campaign_reminder` | Reminder: {campaign_name} | Scheduled reminder |
| `condition_due` | Action Required: Condition Due | Condition approaching due |
| `attestation_required` | Review Required: {policy_name} | Attestation assigned |
| `access_code_resend` | Your Access Code | Requested resend |

---

## Appendix D: Chatbot Conversation Flows

### D.1 Report Submission Flow

```
START
  │
  ▼
"How can I help you today?"
[Report a Concern] [Policy Question] [Check Status]
  │
  ├── Report a Concern ──►
  │
  ▼
"Would you like to stay anonymous or share your identity?"
[Stay Anonymous] [Share Identity]
  │
  ├── Stay Anonymous ──►
  │
  ▼
"Tell me what happened. Take your time."
[Free text input]
  │
  ▼
[AI extracts: category, severity, key details]
  │
  ▼
"Based on what you've shared, this sounds like {category}. Is that right?"
[Yes] [No, it's more about...]
  │
  ▼
"Where did this happen?"
[Location dropdown or type]
  │
  ▼
"Is there anyone specific involved you can name?"
[Add names] [Prefer not to say]
  │
  ▼
"Anything else you'd like to add?"
[Add more] [I'm done]
  │
  ▼
"Here's a summary of your report. Ready to submit?"
[Summary display]
[Submit] [Edit] [Add More]
  │
  ▼
"Your report has been submitted! Access code: ETH-XXXX-XXXX"
[Copy Code] [Check Status Later]
  │
  ▼
END
```

### D.2 Policy Q&A Flow

```
START
  │
  ▼
"What policy question can I help with?"
[Free text input]
  │
  ▼
[RAG retrieval from policy documents]
  │
  ▼
"Based on our {Policy Name}, here's what I found:
 {Answer with citations}

 Source: {Policy Name} Section X.X"
  │
  ▼
"Did this answer your question?"
[Yes, thanks] [I have another question] [I need to talk to someone]
  │
  ├── I need to talk to someone ──►
  │
  ▼
"I can connect you with our Compliance team."
[Call Hotline] [Send Email] [Submit a Report]
  │
  ▼
END
```

---

*End of Ethics Portal PRD*
