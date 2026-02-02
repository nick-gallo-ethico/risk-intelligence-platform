# Feature Landscape: Enterprise Compliance Management Platform

**Domain:** Enterprise Compliance Management SaaS (Ethics Hotlines, Case Management, Disclosures, Policy Management)
**Researched:** 2026-02-02
**Confidence:** MEDIUM-HIGH (Multiple authoritative sources cross-referenced; competitor features verified via Gartner, G2, official sites)

---

## Executive Summary

The enterprise compliance management software market is experiencing rapid consolidation and AI transformation. Key findings:

1. **AI is becoming table stakes** - By mid-2026, AI-powered control validation and evidence generation are expected to be standard. Platforms without meaningful AI will appear dated.

2. **Market is fragmented vs. unified** - Competitors like NAVEX grew through acquisition, resulting in disconnected modules. This creates opportunity for a natively unified platform.

3. **UX expectations have shifted** - Users now expect HubSpot/Salesforce-quality interfaces, not 2010-era enterprise software. "Quieter, focused interfaces" are the 2026 trend.

4. **Investigation-centric vs. intake-centric** - HR Acuity excels at investigations while EQS dominates whistleblowing intake. Few platforms do both well.

5. **Healthcare compliance is specialized** - HIPAA requirements drive specific feature needs (PHI protection, breach reporting workflows, audit trails for regulators).

---

## Table Stakes Features

Features users expect. Missing any of these = product feels incomplete and buyers will immediately notice.

### Case Management & Investigations

| Feature | Why Expected | Complexity | Confidence | Notes |
|---------|--------------|------------|------------|-------|
| **Case intake from multiple channels** | All competitors offer hotline + web | Medium | HIGH | Phone, web form, email minimum; chatbot differentiator |
| **Case assignment & routing** | Basic workflow requirement | Medium | HIGH | Manual and rule-based auto-assignment |
| **Investigation tracking** | Core use case for compliance teams | High | HIGH | Status, timeline, notes, documents |
| **Findings & outcomes documentation** | Required for defensibility | Medium | HIGH | Substantiated/Unsubstantiated/Inconclusive outcomes |
| **Audit trail for all actions** | Regulatory requirement | Medium | HIGH | Immutable, timestamped, user-attributed |
| **Role-based access control (RBAC)** | Security/compliance requirement | Medium | HIGH | Investigator, admin, read-only, etc. |
| **Search & filtering** | Basic usability | Medium | HIGH | By status, category, date, assignee |
| **Document/evidence attachment** | Investigation necessity | Low | HIGH | File upload, versioning, access control |
| **Case notes & documentation** | Core investigator workflow | Low | HIGH | Rich text, multiple note types |
| **SLA tracking & alerts** | Operational necessity | Medium | HIGH | Due dates, overdue flags, reminder notifications |
| **Case status workflows** | All competitors offer | Medium | HIGH | Configurable stages and transitions |
| **Reporter communication (2-way)** | Standard for whistleblowing | Medium | HIGH | Anonymous relay with access codes |

### Whistleblowing & Ethics Hotline

| Feature | Why Expected | Complexity | Confidence | Notes |
|---------|--------------|------------|------------|-------|
| **Anonymous reporting option** | Regulatory requirement (EU Directive) | Medium | HIGH | True anonymity with no IP/device tracking |
| **24/7 hotline availability** | Industry standard | Low (outsourceable) | HIGH | NAVEX, EQS, HR Acuity all offer |
| **Multilingual support** | Global workforce requirement | Medium | HIGH | EQS offers 80+ languages; minimum 20+ |
| **Access code for anonymous status checks** | Standard anonymous follow-up mechanism | Low | HIGH | All competitors offer |
| **Encryption (data at rest and in transit)** | Security requirement | Medium | HIGH | 2048-bit standard |
| **EU Whistleblowing Directive compliance** | Regulatory requirement for EU customers | Medium | HIGH | Required by 2024; now enforced |
| **GDPR compliance** | Regulatory requirement | Medium | HIGH | Data handling, retention, deletion |
| **Anonymous two-way messaging** | Standard for follow-up without identity reveal | Medium | HIGH | Protect identity while enabling dialogue |

### Disclosures & Conflict of Interest

| Feature | Why Expected | Complexity | Confidence | Notes |
|---------|--------------|------------|------------|-------|
| **Configurable disclosure forms** | Different organizations need different questions | Medium | HIGH | COI, gifts, outside employment |
| **Campaign/distribution management** | Annual disclosure cycles are standard | Medium | HIGH | Target audience, due dates, reminders |
| **Completion tracking dashboard** | Admin visibility requirement | Low | HIGH | Who completed, who hasn't, overdue |
| **Automated reminders** | Operational necessity | Low | HIGH | Email/notification before due date |
| **Threshold-based case creation** | Risk-based review | Medium | MEDIUM | Gift > $X triggers review |
| **Audit trail for submissions** | Compliance requirement | Low | HIGH | Who submitted what, when |
| **Historical disclosure records** | Year-over-year comparison need | Low | HIGH | Archive past disclosures |

### Policy Management

| Feature | Why Expected | Complexity | Confidence | Notes |
|---------|--------------|------------|------------|-------|
| **Policy document storage** | Basic repository need | Low | HIGH | Centralized, organized |
| **Version control** | Legal/compliance requirement | Medium | HIGH | Track changes, preserve history |
| **Policy attestation/acknowledgment** | Compliance requirement | Medium | HIGH | Track who read and signed |
| **Attestation tracking dashboard** | Admin visibility | Low | HIGH | Completion rates, overdue |
| **Policy distribution campaigns** | Operational necessity | Medium | HIGH | Push policies to employees |
| **Policy search** | Basic usability | Low | HIGH | Find relevant policies quickly |
| **Access control by role/group** | Security requirement | Medium | HIGH | Some policies restricted |

### Analytics & Reporting

| Feature | Why Expected | Complexity | Confidence | Notes |
|---------|--------------|------------|------------|-------|
| **Dashboard with KPI cards** | Executive visibility | Medium | HIGH | Open cases, time to close, trends |
| **Standard reports library** | Buyer expectation | Medium | HIGH | Pre-built common reports |
| **Export to PDF/Excel** | Basic data extraction | Low | HIGH | All competitors offer |
| **Filter/drill-down capability** | Data exploration need | Medium | HIGH | Click to see underlying records |
| **Trend analysis over time** | Program effectiveness tracking | Medium | HIGH | Charts showing change |
| **Category/severity breakdowns** | Standard compliance metrics | Low | HIGH | Distribution charts |

### Security & Compliance

| Feature | Why Expected | Complexity | Confidence | Notes |
|---------|--------------|------------|------------|-------|
| **SSO integration** | Enterprise requirement | Medium | HIGH | SAML, OIDC, Azure AD |
| **Multi-factor authentication (MFA)** | Security standard | Low | HIGH | Required for enterprise |
| **SOC 2 Type II certification** | Enterprise procurement requirement | High (process) | HIGH | Case IQ, HR Acuity certified |
| **HIPAA compliance** | Healthcare vertical requirement | High | HIGH | PHI protection, BAAs |
| **Data encryption** | Security baseline | Medium | HIGH | At rest and in transit |
| **Role-based permissions** | Access control | Medium | HIGH | Granular permissions |
| **Session management** | Security requirement | Low | HIGH | Timeout, concurrent session limits |

---

## Differentiators

Features that set products apart. Not expected, but create competitive advantage when present.

### AI-Powered Features (Emerging Differentiators - Becoming Table Stakes by late 2026)

| Feature | Value Proposition | Complexity | Confidence | Competitor Status |
|---------|-------------------|------------|------------|-------------------|
| **AI case summarization** | Save investigator time; consistent quality | Medium | HIGH | NAVEX announced Dec 2025; HR Acuity's olivER; Case IQ's Clairia |
| **AI-powered note cleanup** | Convert bullets to formal narrative | Medium | MEDIUM | Ethico differentiator if done well |
| **AI translation (compliance-trained)** | Accurate translation preserving context | Medium | HIGH | EQS offers 80+ languages with AI; NAVEX added in 2025 |
| **AI risk scoring** | Automated triage prioritization | High | MEDIUM | Limited competitors; mostly rules-based |
| **AI-suggested questions during intake** | Improve report quality | High | LOW | Few competitors offer real-time assist |
| **AI document analysis** | Find relevant info in uploaded docs | High | MEDIUM | Advanced feature; few offer |
| **Natural language search/querying** | "Show me harassment cases from EMEA" | High | HIGH | 2026 expectation from AI-first platforms |
| **AI policy Q&A** | Employees get answers without reading full policy | High | MEDIUM | Chatbot differentiator |
| **AI pattern detection across cases** | Surface recurring issues | High | MEDIUM | HR Acuity benchmarking; emerging |

### Modern UX Differentiators

| Feature | Value Proposition | Complexity | Confidence | Notes |
|---------|-------------------|------------|------------|-------|
| **Saved views/custom filters** | HubSpot-style personalization | Medium | HIGH | Major UX differentiator vs. legacy platforms |
| **Unified "My Work" queue** | Single view across all assigned items | Medium | MEDIUM | Cross-module aggregation; HubSpot pattern |
| **Modern, clean interface** | User adoption, reduced training | High | HIGH | 2026 UX trend: "quieter, focused interfaces" |
| **Drag-and-drop dashboards** | Self-service analytics | High | HIGH | HR Acuity offers; HubSpot-style |
| **Configurable columns** | User personalization | Low | HIGH | Expected by HubSpot/Salesforce users |
| **Mobile PWA** | Field access, manager approval on-the-go | High | MEDIUM | Limited competitors offer true PWA |
| **White-label portal** | Brand consistency for clients | Medium | HIGH | EQS, Ethico offer; enterprise need |
| **In-app notifications** | Real-time awareness | Medium | HIGH | Better than email-only |

### Investigation Excellence

| Feature | Value Proposition | Complexity | Confidence | Notes |
|---------|-------------------|------------|------------|-------|
| **Investigation templates by category** | Consistent, complete investigations | Medium | HIGH | HR Acuity strength; Case IQ offers |
| **Checklist-driven investigations** | Ensure nothing missed | Medium | HIGH | Defensibility requirement |
| **Remediation plan library** | Reusable corrective actions | Medium | MEDIUM | Limited competitors; Ethico differentiator |
| **Subject tracking across cases** | Pattern detection for repeat offenders | High | HIGH | HR Acuity's "repeat offender" analytics |
| **Case merge capability** | Consolidate related reports | Medium | HIGH | All competitors offer some version |
| **Multi-investigator collaboration** | Team investigations | Medium | HIGH | Assignment to multiple; primary designated |
| **Interview documentation** | Structured interview capture | Medium | HIGH | HR Acuity strength |

### Integration & Extensibility

| Feature | Value Proposition | Complexity | Confidence | Notes |
|---------|-------------------|------------|------------|-------|
| **HRIS integration** | Auto-sync employee data | High | HIGH | Workday, SAP, BambooHR; all competitors integrate |
| **Custom fields (unlimited, reportable)** | Organizational flexibility | Medium | HIGH | Critical for enterprise; competitors limit |
| **Webhook/event notifications** | Real-time integration | Medium | MEDIUM | Advanced integration pattern |
| **REST API** | System integration | Medium | HIGH | Expected for enterprise |
| **SSO with multiple providers** | Enterprise auth flexibility | Medium | HIGH | SAML, OIDC, Azure AD, Okta |
| **Data import/migration tools** | Competitor data migration | High | MEDIUM | Ethico differentiator for switching cost reduction |

### Healthcare-Specific (Vertical Differentiators)

| Feature | Value Proposition | Complexity | Confidence | Notes |
|---------|-------------------|------------|------------|-------|
| **HIPAA-specific workflows** | Healthcare compliance | High | HIGH | Breach notification, PHI handling |
| **PHI detection/redaction** | Protect patient data | High | MEDIUM | AI-assisted; differentiator |
| **Healthcare category taxonomy** | Appropriate classifications | Low | HIGH | EMTALA, Stark, kickback categories |
| **Sanction screening integration** | OIG/SAM exclusion checks | Medium | MEDIUM | Healthcare-specific need |
| **BAA (Business Associate Agreement) support** | HIPAA requirement | Low | HIGH | Standard for healthcare vendors |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Over-complicated workflow builders** | Compliance teams aren't developers; unused complexity | Pre-built templates with simple customization; "sensible defaults" |
| **Mandatory AI acceptance** | Compliance decisions require human judgment; regulatory concern | AI-assist that requires human review; optional, not blocking |
| **Rigid reporting that requires IT** | Compliance officers need self-service | Drag-and-drop report builder; saved views |
| **Email-only notifications** | Missed, buried in inbox | In-app notification center + email as fallback |
| **Monolithic modules requiring all-or-nothing** | Customers want to start small | Modular pricing; can adopt incrementally |
| **Complex pricing tiers** | Procurement friction | Transparent, predictable pricing |
| **"AI black box" decisions** | Regulators require explainability | Transparent AI with reasoning shown; human override |
| **Overly aggressive chatbot** | Users find intrusive; reduces trust | Non-intrusive AI (optional panels, not blocking) |
| **Auto-closing cases without human review** | Legal/compliance risk | AI can suggest closure; human must confirm |
| **Live chat requiring 24/7 staffing** | Compliance teams are small (1-5 people) | Async model with inquiry queue; hotline for urgent |
| **Feature bloat for edge cases** | Complexity tax on all users | 80/20 rule; configurability for the 20% |
| **Per-seat pricing for entire org** | Drives down adoption | Role-based tiers; unlimited viewers |
| **Requiring training before use** | Delays time-to-value | Intuitive UX; contextual help; optional training |

---

## Feature Dependencies

```
Foundation Layer (Must Build First)
├── Multi-tenancy (RLS, organization isolation)
├── User/Employee entities (separate: auth vs HRIS)
├── RBAC (role-based access control)
├── Unified audit log
└── Core API patterns

Case Management (Core Module)
├── RIU (Risk Intelligence Unit) entity ─────────────┐
├── Case entity (mutable work container)             │
├── Investigation entity                             │ Requires
├── Subject tracking                                 │ Foundation
├── Case-RIU associations (many-to-many)             │
├── Basic workflow (status transitions)              │
└── Reporter communication (anonymous relay)         │

Intake Channels (Parallel Development OK)
├── Web Form Intake ─────────────────────────────────┤
├── Operator Console (hotline intake) ───────────────┤ Creates
├── Employee Chatbot ────────────────────────────────┤ RIUs
└── Email intake (future) ───────────────────────────┘

Disclosures Module
├── Depends on: Case Management (for escalation)
├── Depends on: Campaign/distribution engine
├── COI disclosure forms
├── Gift/entertainment tracking
└── Threshold-based case creation

Policy Management Module
├── Depends on: Campaign/distribution engine
├── Document repository
├── Version control
├── Attestation tracking
└── Policy-Case linking (for violations)

Analytics Module
├── Depends on: All data-producing modules
├── Dashboard builder
├── Standard reports
├── Cross-module reporting
└── AI-powered queries (natural language)

AI Features (Can Layer On)
├── Summarization (Case, Investigation, RIU)
├── Translation (at intake, on-demand)
├── Risk scoring
├── Pattern detection
└── Natural language querying
    All AI → Depends on data being available

Campaign/Distribution Engine (Shared)
├── Used by: Disclosures
├── Used by: Policy attestations
├── Used by: Surveys
└── Target audience, scheduling, reminders
```

---

## Competitor Feature Matrix

| Feature Category | NAVEX | EQS/Integrity Line | Case IQ | HR Acuity | Ethico (Planned) |
|-----------------|-------|-------------------|---------|-----------|-----------------|
| **Case Management** | Strong | Basic | Strong | Excellent | Strong (planned) |
| **Hotline/Intake** | Strong | Excellent | Good | Excellent | Strong (existing + new) |
| **Investigations** | Good | Basic | Good | Excellent | Strong (planned) |
| **Disclosures/COI** | Strong | Strong | Basic | Limited | Strong (planned) |
| **Policy Management** | Strong (PolicyTech) | Basic | Limited | Limited | Strong (planned) |
| **Analytics** | Good | Good | Excellent (Yellowfin) | Excellent | Strong (planned) |
| **AI Features** | New (Dec 2025) | Strong (translation) | Strong (Clairia) | Strong (olivER) | Native (AI-first) |
| **Modern UX** | Legacy feel | Modern | Modern | Modern | Modern (planned) |
| **Unified Platform** | Fragmented (acquisitions) | Unified | Unified | Focused (HR only) | Unified (planned) |
| **Healthcare Focus** | General | General | General | HR focus | Healthcare focus |
| **Pricing** | $2,600+/mo | Contact | Contact | Contact | TBD |

### Competitor Strengths to Learn From

**NAVEX:**
- PolicyTech is industry standard for policy management
- Broad feature coverage across compliance domains
- Strong regulatory intelligence (RCM announced Dec 2025)
- Large customer base (13,000 organizations)

**EQS Integrity Line:**
- Excellent whistleblowing/anonymous reporting
- Strong EU Whistleblowing Directive compliance
- 80+ language AI translation
- True end-to-end encryption
- Clean, modern interface

**Case IQ:**
- Yellowfin BI integration for analytics
- 75+ chart types for data visualization
- AI assistant "Clairia" for case guidance
- Strong investigation documentation
- SOC 2 Type II certified

**HR Acuity:**
- Purpose-built for employee relations
- olivER AI assistant (best-in-class)
- Proprietary three-step methodology
- Benchmarking against industry peers
- Ranked #1 in multiple G2 categories (2025-2026)
- Repeat offender pattern detection

### Competitor Weaknesses to Exploit

**NAVEX:**
- Fragmented from acquisitions (inconsistent UX)
- Legacy interface feel ("2010-era enterprise software")
- Higher cost ($2,600+/month)
- Limited customization (per user feedback)
- Customer support concerns noted

**EQS:**
- Weaker case management/investigations
- EU-focused (less US market presence)
- Limited disclosure management

**Case IQ:**
- Limited policy management
- Limited disclosure management
- Investigation-focused, not end-to-end

**HR Acuity:**
- HR/ER focused only (not full compliance)
- No policy management
- No disclosure management
- Limited whistleblowing (compared to EQS)

---

## MVP Recommendation

For MVP, prioritize these features to achieve competitive parity with fastest time-to-value:

### Must Have for MVP (Table Stakes)

1. **Case Management Core**
   - Case creation, assignment, status tracking
   - Investigation documentation
   - Findings and outcomes
   - Audit trail

2. **Intake Channel (at least one)**
   - Web form submission (simpler than operator console)
   - Anonymous and identified reporting
   - Access code for status checks

3. **Basic Reporting**
   - Dashboard with key metrics
   - Case list with filters
   - Export capability

4. **Security Foundation**
   - SSO integration
   - Role-based access
   - Multi-tenancy with RLS

5. **Reporter Communication**
   - Two-way messaging
   - Anonymous relay

### Include in MVP for Differentiation

1. **AI Summarization** - Competitor parity by late 2025; must have
2. **Modern UX with Saved Views** - Major differentiator vs. NAVEX legacy
3. **Unified "My Work" Queue** - HubSpot-style cross-module view

### Defer to Post-MVP

| Feature | Reason to Defer | When to Add |
|---------|-----------------|-------------|
| Operator Console | Complex; existing Ethico system works | Phase 2 |
| Disclosures/COI | Separate module; not core case management | Phase 2 |
| Policy Management | Separate module; competitors have strong offerings | Phase 3 |
| Advanced AI (pattern detection) | Needs data volume; complex | Phase 3+ |
| Employee Chatbot | Complex; requires AI infrastructure | Phase 2-3 |
| Mobile PWA | Nice-to-have; web works on mobile | Phase 3 |
| Benchmarking against peers | Needs data from multiple customers | Phase 4+ |

---

## Sources

### Official Vendor Sources (HIGH confidence)
- [NAVEX Platform](https://www.navex.com/en-us/platform/)
- [EQS Integrity Line](https://www.integrityline.com/product/)
- [Case IQ Platform Features](https://www.caseiq.com/platform/features)
- [HR Acuity Platform](https://www.hracuity.com/platform/)
- [NAVEX PolicyTech](https://www.navex.com/en-us/platform/employee-compliance/policytech-policy-management-software/)
- [NAVEX COI Disclosure Management](https://www.navex.com/en-us/platform/employee-compliance/coi-disclosure-management/)

### Industry Analysis (MEDIUM confidence)
- [Gartner Peer Insights - Whistleblowing Software](https://www.gartner.com/reviews/market/whistleblowing-software)
- [Gartner Peer Insights - NAVEX](https://www.gartner.com/reviews/market/corporate-compliance-and-oversight-solutions/vendor/navex)
- [G2 HR Acuity Reviews](https://www.g2.com/products/hr-acuity/reviews)
- [G2 Case IQ Reviews](https://www.g2.com/products/case-iq/reviews)
- [Best Whistleblowing Software - HR Acuity](https://www.hracuity.com/blog/best-whistleblower-hotline-2026/)
- [Top Whistleblowing Software - SpeakUp](https://www.speakup.com/blog/top-whistleblowing-software-tools)

### Market Trends (MEDIUM confidence)
- [NAVEX 2026 Compliance Trends](https://www.navex.com/en-us/blog/article/introducing-top-10-trends-risk-compliance-2026/)
- [Compliance Management Software Market - Research and Markets](https://www.researchandmarkets.com/report/compliance-management-software)
- [Best Compliance Management Software - Monday.com](https://monday.com/blog/service/compliance-management-software/)
- [UX Design Trends 2026 - UX Design Institute](https://www.uxdesigninstitute.com/blog/the-top-ux-design-trends-in-2026/)

### AI & Technology Trends (MEDIUM confidence)
- [AI Compliance Tools - Drata](https://drata.com/blog/best-ai-compliance-tools)
- [How AI Agents Will Redefine Compliance in 2026](https://fintech.global/2025/12/09/how-ai-agents-will-redefine-compliance-in-2026/)
- [AI in Compliance Function - White & Case](https://www.whitecase.com/insight-our-thinking/2025-global-compliance-risk-benchmarking-survey-artificial-intelligence)

### Healthcare Compliance (MEDIUM confidence)
- [HIPAA Compliance Software - HIPAA Journal](https://www.hipaajournal.com/hipaa-compliance-software/)
- [Healthcare Compliance Software Guide](https://wtt-solutions.com/blog/healthcare-compliance-software)
- [Top HIPAA Compliance Software 2026 - Sprinto](https://sprinto.com/blog/hipaa-compliance-software/)

---

## Confidence Assessment

| Category | Confidence | Rationale |
|----------|------------|-----------|
| Table Stakes Features | HIGH | Multiple competitor feature pages verified; consistent across sources |
| Competitor Capabilities | MEDIUM-HIGH | Official sites + Gartner/G2 reviews; some features may be outdated |
| AI Feature Trends | MEDIUM | Rapidly evolving; announcements from late 2025; may change by implementation |
| Pricing Information | LOW | Limited public pricing; NAVEX $2,600/mo from SelectHub; others "contact sales" |
| Market Size/Growth | MEDIUM | Analyst reports; $31B to $70B projection from Research and Markets |
| UX Expectations | MEDIUM-HIGH | General UX trends verified; compliance-specific UX less documented |

---

## Quality Gate Checklist

- [x] Categories are clear (table stakes vs differentiators vs anti-features)
- [x] Complexity noted for each feature (Low/Medium/High)
- [x] Dependencies between features identified
- [x] Competitor comparison included
- [x] Healthcare-specific features addressed
- [x] AI features categorized with confidence levels
- [x] MVP recommendation provided
- [x] Sources documented with confidence levels
