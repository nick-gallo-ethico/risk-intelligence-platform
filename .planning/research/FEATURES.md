# Feature Landscape: v2.0 Intelligence & Automation Layer

**Domain:** Intelligence/Automation Features for Enterprise Compliance Platform
**Researched:** 2026-02-24
**Research Type:** SUBSEQUENT MILESTONE - Adding capabilities to existing platform
**Confidence:** MEDIUM-HIGH (Verified across competitor platforms, industry sources, and official documentation)

---

## Executive Summary

This research focuses on the intelligence and automation features needed for v2.0 of the Ethico Risk Intelligence Platform. The existing platform (v1) already has:
- Case management with merge, export, activity timeline, status workflow
- Investigation workflow with templates, checklists, findings, interviews
- Campaign management with targeting, assignments, waves, reminders
- Disclosure forms with conflict detection, threshold rules
- Policy management with versioning, translations, approval workflows
- AI chat panel with Claude streaming, scoped agents, skills, actions
- Notifications (email + in-app + digest)
- HubSpot-style saved views across all modules
- Search (Elasticsearch + PostgreSQL FTS)
- Ethics portal, Employee portal, Operator console

**Key v2.0 Themes:**

1. **Rules/Automation Engines** - The market expects configurable routing, SLA enforcement, and escalation without developer intervention. NAVEX and Case IQ lead here; EQS is catching up.

2. **Anonymous Communication Relay** - Two-way anonymous messaging is table stakes. The "Chinese Wall" model (Ethico as relay) is the industry standard approach.

3. **RAG-Powered Employee Chatbot** - Policy Q&A with confidence tiers is emerging as a differentiator. NAVEX launched AI Assistant in late 2025; Ethena has Policy Bot.

4. **Disclosure Automation** - HRIS-triggered rolling campaigns (new hire, promotion) are expected by enterprise customers. Auto-clear and bulk operations reduce manual work.

5. **Manager Dashboards** - Team compliance visibility and proxy actions are increasingly expected for larger organizations.

6. **PWA Capabilities** - Offline form submission and push notifications for SLA alerts are differentiators, not yet table stakes.

7. **External Party Management** - Gift/entertainment vendor tracking with sanctions screening and transaction aggregation is a specialized feature primarily for financial services and healthcare.

8. **Cross-Case Pattern Detection** - Repeat subject alerts and trend identification are becoming expected; HR Acuity leads here.

---

## 1. Rules/Automation Engine

### Expected Behaviors from User Perspective

**Routing Rules:**
- When a case is created, automatically assign based on: category, severity, location, business unit, reporter type
- Support AND/OR logic: "IF category = Harassment AND location = EMEA THEN assign to EU Legal Team"
- Fallback routes when no rule matches (triage queue)
- Override capability for manual assignment after auto-route
- Rule preview: "Test this rule against recent cases to see what would have matched"

**SLA Enforcement:**
- Define SLA by case type: "Harassment cases must have initial response within 24 hours"
- Visual countdown timers on case cards (green/yellow/red status)
- Automated escalation when SLA approaches (warning) or breaches
- Escalation actions: notify supervisor, re-assign, add to priority queue, page on-call
- SLA metrics in dashboards: compliance rate, average breach duration, trend

**Escalation Triggers:**
- Keyword detection in intake: "retaliation", "CEO", "criminal"
- Severity-based: all Critical cases auto-escalate to CCO
- Time-based: no activity in 48 hours triggers reminder
- Combination rules: "Category = Financial Fraud AND Amount > $100K"

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Basic routing rules (if/then)** | All competitors offer | Medium | Case entity, User/Team entities | NAVEX, Case IQ, HR Acuity all have |
| **SLA definitions by case type** | Operational necessity | Medium | Case entity, Workflow module | Standard compliance requirement |
| **SLA countdown/status indicators** | Visual management | Low | UI components, Case entity | Color-coded: green/yellow/red |
| **Overdue case alerts (email)** | Basic notification | Low | Notification system (exists) | Extend existing notification |
| **Manual override of auto-assignment** | User control | Low | Assignment UI | Always allow human override |
| **Rule audit log** | Compliance requirement | Low | Audit system (exists) | Track rule changes |

### Differentiators

| Feature | Value Proposition | Complexity | Competitor Status | Notes |
|---------|-------------------|------------|-------------------|-------|
| **Rule preview/testing** | Reduce misconfigurations | Medium | Limited - most require "go live to see" | Test against historical data |
| **Multi-step escalation chains** | Progressive urgency | High | Case IQ offers; NAVEX limited | Notify > Reassign > Page > Auto-escalate |
| **AI-suggested routing rules** | Learn from historical patterns | High | No competitor offers | "Cases like this usually go to..." |
| **Natural language rule builder** | Non-technical users | High | No competitor offers | "Assign harassment cases to HR" |
| **SLA prediction (AI)** | Proactive management | High | Emerging | "This case likely to breach SLA based on..." |
| **Cross-module SLA** | Unified tracking | Medium | Limited | SLA for case + investigation + remediation |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Complex visual workflow builder** | Compliance teams aren't developers | Simple if/then UI; templates for common patterns |
| **Auto-close on SLA breach** | Legal risk; human judgment required | Auto-escalate, never auto-close |
| **Unlimited nesting in rules** | Maintenance nightmare | Max 3 levels of AND/OR; suggest splitting |
| **No fallback route** | Orphaned cases | Require default/fallback route |
| **Rules without audit trail** | Compliance violation | Log all rule changes with who/when |

---

## 2. Anonymous Communication Relay

### Expected Behaviors from User Perspective

**Chinese Wall Model:**
- Reporter provides contact info (email or phone) to Ethico system only
- Client users never see reporter contact info
- Messages from client appear in reporter's inbox with Ethico relay address
- Reporter replies to relay address; message appears in case
- Full conversation thread maintained on both sides
- Works for both identified and anonymous reporters

**Anonymous Status Checks:**
- Reporter receives unique access code at submission
- Can check status via web portal or phone
- Can add additional information to existing case
- Can receive and respond to questions from investigators
- Access code never expires (or very long expiry: 5+ years)

**Message Types:**
- Questions from investigator to reporter
- Updates from investigator to reporter (case status)
- Additional information from reporter
- Automated status notifications (case received, investigation started, closed)

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Access code for anonymous status check** | All competitors offer | Low | RIU entity, Portal | Standard 8-12 digit alphanumeric |
| **Web portal status check** | Standard UX | Low | Ethics Portal (exists) | Simple form: enter code, see status |
| **Two-way messaging (async)** | Regulatory expectation | Medium | Messaging entity, RIU | EU Directive requires follow-up capability |
| **Email relay (outbound)** | Standard communication | Medium | Email system (exists) | Send from noreply@ethico.com |
| **Message history on case** | Audit requirement | Low | Case/RIU entity | Full conversation visible to investigator |
| **Unsubscribe/opt-out for reporter** | Privacy requirement | Low | Message preferences | Reporter can stop communications |

### Differentiators

| Feature | Value Proposition | Complexity | Competitor Status | Notes |
|---------|-------------------|------------|-------------------|-------|
| **SMS relay** | Mobile-first reporters | Medium | HR Acuity announced; EQS has | Phone number hidden; messages proxied |
| **Automated translations in relay** | Multilingual workforce | Medium | EQS leads (80+ languages) | AI translate in-thread |
| **Rich media in messages** | Better communication | Medium | Limited competitor support | Images, documents in thread |
| **Voice message transcription** | Alternative input | High | No competitor offers | Voicemail to text in thread |
| **Proactive status updates** | Reporter engagement | Low | Some competitors; not universal | "Your case status changed to Under Investigation" |
| **Multiple access code per case** | Team anonymous reporting | Low | Limited | Group can track single report |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Real-time chat requiring staff** | Compliance teams are small | Async messaging with SLA |
| **Auto-reply bots in anonymous channel** | Trust issue; reporters expect human | Clear expectation: "Human will respond within X hours" |
| **Message read receipts** | Privacy concern for reporters | No read receipts; just delivery confirmation |
| **Reporter identity hints** | Defeats anonymity purpose | Never expose metadata (timezone, device, etc.) |
| **Short access code expiry** | Reporters lose access | 5+ year expiry; recovery mechanism |

---

## 3. RAG-Powered Compliance Chatbot

### Expected Behaviors from User Perspective

**Policy Q&A Flow:**
- Employee asks: "Can I accept a gift from a vendor?"
- Chatbot searches policy documents using RAG
- Returns answer with confidence tier:
  - **Tier 1 (High confidence)**: Direct answer with policy citation
  - **Tier 2 (Medium confidence)**: "Based on [Policy], the guidance is... but your situation may vary"
  - **Tier 3 (Low confidence/Complex)**: "I found relevant information, but recommend checking with Compliance"
- Always shows source document link
- One-click escalation to human at any point

**Knowledge Base:**
- Ingests published policies from Policy Management module
- Also ingests FAQ documents, training materials, custom uploads
- Version-aware: uses current published version, not drafts
- Tenant-isolated: never mixes organization data
- Refresh when policies update

**Escalation Path:**
- "Ask a human" button always visible
- Creates inquiry in queue (not a case, unless configured)
- Compliance team can respond async
- Response goes back to employee via chat interface

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Policy search by keyword** | Basic functionality | Low | Policy module (exists), Search (exists) | Simple keyword match |
| **Citation of source document** | Trust and verification | Low | RAG retrieval | Link to policy section |
| **Escalation to human** | Complex questions | Low | Inquiry/ticket system | Always available option |
| **Conversation history** | Context for follow-up | Low | Chatbot entity | Persisted per user |
| **Tenant data isolation** | Security requirement | Critical | Multi-tenancy (exists) | Never mix org data |

### Differentiators

| Feature | Value Proposition | Complexity | Competitor Status | Notes |
|---------|-------------------|------------|-------------------|-------|
| **Confidence tier display** | Transparency builds trust | Medium | NAVEX AI Assistant started this | Show "High/Medium/Low confidence" |
| **Situational guidance (Tier 2)** | More than simple lookup | High | Limited - most are Q&A only | "In your situation as a manager..." |
| **Proactive suggestions** | Surface relevant policies | Medium | No competitor offers | "You might also want to know about [Related Policy]" |
| **Multi-document reasoning** | Complex answers | High | Emerging | Synthesize from Code of Conduct + Gift Policy |
| **Follow-up questions** | Clarification | Medium | NAVEX has; others limited | "Can you tell me more about the gift amount?" |
| **Learning from escalations** | Continuous improvement | High | No competitor offers | When human corrects bot, improve future answers |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Black box answers** | Regulators require explainability | Always cite source; show reasoning |
| **Overconfident responses** | Legal liability | Conservative confidence; recommend human for complex |
| **Hallucinated policy content** | Critical compliance risk | Ground ALL responses in retrieved content; never generate |
| **No human fallback** | User frustration; compliance risk | Always-visible escalation button |
| **Auto-action from chatbot** | Compliance decisions need human | Chatbot informs; human decides |
| **Storing sensitive details** | Privacy risk | Don't ask for names/specifics in chatbot; direct to report |

---

## 4. Disclosure Automation

### Expected Behaviors from User Perspective

**Rolling Campaigns (HRIS-Triggered):**
- New hire: Automatically add to active disclosure campaigns when onboarding
- Promotion/role change: Trigger additional disclosure if new role requires it
- Annual renewal: Automatically re-issue disclosure 30 days before expiry
- Termination: Mark assignments as exempt (employee left)
- Manager change: Update approval routing

**Auto-Clear/Auto-Reject Rules:**
- Gift under $X with no relationship flag: Auto-clear, no case created
- "Nothing to disclose" attestation: Auto-complete, no review needed
- Gift over $Y OR relationship flag: Require manual review
- Pattern detection: Same vendor multiple times triggers alert

**Bulk Operations:**
- Bulk approve: Select multiple pending disclosures, apply decision
- Bulk remind: Send reminders to all overdue in one click
- Bulk exempt: Mark group as exempt (e.g., contractor cohort leaving)
- Bulk export: Download all disclosures for a campaign

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Manual campaign creation** | Already exists | - | Campaign module (exists) | Foundation for automation |
| **Email reminders** | Already exists | - | Notification system (exists) | Extend for triggers |
| **Threshold rules for case creation** | Already exists | - | Campaign module (exists) | Foundation for auto-clear |
| **Completion tracking dashboard** | Already exists | - | Analytics (exists) | Extend for automation metrics |

### Differentiators

| Feature | Value Proposition | Complexity | Competitor Status | Notes |
|---------|-------------------|------------|-------------------|-------|
| **HRIS-triggered enrollment** | Zero manual campaign management | High | NAVEX has; EQS limited | Integrate with HRIS sync events |
| **Auto-clear rules** | Reduce manual review burden | Medium | GAN Integrity offers | Configurable threshold + conditions |
| **Bulk approve/reject** | Efficiency for reviewers | Low | Most competitors have | Multi-select + action |
| **Pattern detection alerts** | Proactive risk identification | High | Limited | Same vendor/amount patterns |
| **Manager delegation** | Vacation coverage | Medium | HR Acuity has | Temporary delegation of approval |
| **Disclosure comparison (year-over-year)** | Trend identification | Medium | NAVEX has | Side-by-side comparison |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Auto-approve anything with disclosure** | Risk of missing conflicts | Auto-clear only for explicit "nothing to disclose" |
| **Auto-reject based on rules** | Legal risk; human judgment needed | Flag for review; never auto-reject |
| **Complex HRIS trigger rules** | Maintenance nightmare | Simple triggers: new hire, termination, role change |
| **Immediate enrollment for new hires** | Give time to settle | Configurable delay: 30/60/90 days after hire |

---

## 5. Manager Compliance Dashboard

### Expected Behaviors from User Perspective

**Team Metrics View:**
- See all direct reports' compliance status in one view
- Completion rates for: disclosures, attestations, training
- Overdue items highlighted
- Drill-down to individual employee details
- Historical completion rates (trend)

**Proxy Actions:**
- Submit disclosure on behalf of employee (with reason capture)
- Request exemption for employee
- Send reminder to specific employee
- Escalate non-compliance to HR

**Reminder Tools:**
- See who hasn't completed
- Send individual reminder (customizable message)
- Send bulk reminder to all overdue
- Schedule reminder for specific date

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **View own team's completion status** | Management expectation | Medium | Employee hierarchy, Campaign assignments | Filter by manager_id |
| **Overdue indicator** | Basic visibility | Low | Campaign assignments | Red highlight |
| **Send reminder to individual** | Manager responsibility | Low | Notification system (exists) | Simple button |
| **Drill-down to employee detail** | Context needed | Low | Employee profile | Click to see full status |

### Differentiators

| Feature | Value Proposition | Complexity | Competitor Status | Notes |
|---------|-------------------|------------|-------------------|-------|
| **Proxy submission** | Accessibility accommodation | Medium | Limited competitors | With audit trail |
| **Manager-level analytics** | Comparative performance | Medium | HR Acuity has benchmarking | Team vs. org average |
| **Delegation to another manager** | Vacation coverage | Medium | Limited | Temporary manager override |
| **Scheduled bulk reminders** | Proactive management | Low | Limited | "Remind all overdue every Monday" |
| **Compliance score by team** | Gamification/motivation | Medium | No competitor offers | Team leaderboard (optional) |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Manager can see disclosure content** | Privacy violation | Manager sees completion status only; not content |
| **Manager can approve own team** | Conflict of interest | Approvals go to Compliance, not direct manager |
| **Automatic HR escalation** | May be premature | Manager initiates escalation; not automatic |
| **Team-level SLA enforcement** | Unfair to individuals | Individual tracking; team metrics for awareness only |

---

## 6. PWA (Progressive Web App) Capabilities

### Expected Behaviors from User Perspective

**Offline Form Submission:**
- Employee starts disclosure form while connected
- Connection drops mid-form
- Form saves locally; notification "Will submit when online"
- Connection restored; form auto-submits
- User sees confirmation

**Push Notifications:**
- SLA approaching: "Case #1234 response due in 4 hours"
- Assignment notification: "New case assigned to you"
- Approval request: "Disclosure pending your review"
- Reporter message: "New message on Case #1234"
- Campaign reminder: "Annual disclosure due in 7 days"

**Mobile-Optimized Experience:**
- Responsive design for all form factors
- Touch-friendly navigation
- Reduced data usage for cellular
- Home screen installable
- Badge for unread notifications

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Responsive web design** | Mobile users exist | Low | Frontend (exists) | Already implemented |
| **Email notifications** | Basic communication | - | Notification system (exists) | Already implemented |

### Differentiators

| Feature | Value Proposition | Complexity | Competitor Status | Notes |
|---------|-------------------|------------|-------------------|-------|
| **Offline form save/submit** | Field workers; poor connectivity | High | Very few competitors | Service worker + IndexedDB |
| **Push notifications** | Immediate SLA awareness | Medium | Native apps have; few PWAs | Requires opt-in; FCM/APNs |
| **Home screen installable** | App-like experience | Low | Easy to add | Manifest + service worker |
| **Background sync** | Reliable offline operations | High | Limited competitors | Queue and retry |
| **Notification badges** | Unread indicator | Low | Standard PWA feature | Update count |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Native app requirement** | App store friction; maintenance burden | PWA gives 90% of benefits |
| **Offline for everything** | Complexity; stale data risk | Offline only for submission; view requires connection |
| **Excessive push notifications** | User disables; annoyance | Configurable; respect quiet hours |
| **Full offline case management** | Data sync complexity; conflict resolution | Offline submit only; view/edit requires connection |

---

## 7. External Party Management (GT&E Focus)

### Expected Behaviors from User Perspective

**Vendor/External Party Registry:**
- Maintain list of external parties (vendors, contractors, clients)
- Store risk rating, relationship type, key contacts
- Link to disclosures and transactions
- Track interaction history

**Sanctions Screening:**
- Automatic check against OFAC, OIG, SAM lists
- Alert when external party matches or fuzzy-matches
- Re-screen on schedule (monthly/quarterly)
- Clear audit trail of screening results

**Transaction Aggregation:**
- Track all gifts/entertainment with a given party
- Aggregate across employees: "Total gifts to Vendor X this year: $5,200"
- Per-employee caps: "You've given $400 of $500 limit to this vendor"
- Alert when approaching or exceeding thresholds

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Record external parties on disclosures** | Current design | Low | Disclosure module (exists) | Already captured |
| **Manual aggregation reports** | Basic analytics | Medium | Analytics (exists) | Can be built as report |

### Differentiators

| Feature | Value Proposition | Complexity | Competitor Status | Notes |
|---------|-------------------|------------|-------------------|-------|
| **External party master record** | Single source of truth | Medium | NAVEX has; GAN Integrity | Dedupe; link across disclosures |
| **Sanctions screening integration** | Regulatory requirement (healthcare) | High | Specialized vendors (Moody's, LSEG) | API integration |
| **Real-time aggregation** | Instant threshold visibility | Medium | Limited competitors | Update on each disclosure |
| **Risk rating workflow** | Due diligence process | High | GAN Integrity leads | Annual review cycle |
| **Relationship network visualization** | Pattern detection | High | No competitor offers | Who knows whom at vendor |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Build sanctions database in-house** | Maintenance nightmare; liability | Integrate with established providers |
| **Auto-block based on screening** | False positives; legal risk | Flag for human review |
| **Complex relationship mapping** | Rarely used; over-engineering | Simple hierarchy: organization > contacts |
| **Global tracking before need** | YAGNI; complexity | Start with US; add regions when customer need |

---

## 8. Cross-Case Pattern Detection

### Expected Behaviors from User Perspective

**Repeat Subject Alerts:**
- When creating/updating case, system checks if subject appears in other cases
- Alert: "John Smith appears in 3 other cases (2 open, 1 closed)"
- Click to see related cases
- Works for: employees (by ID), external names (fuzzy match), email, phone

**Trend Identification:**
- Dashboard widget: "Emerging trends"
- AI-identified: "Harassment reports from Manufacturing up 40% this quarter"
- Category concentration: "75% of cases from one location"
- Seasonal patterns: "Reports spike in January (post-holiday parties)"

**Pattern-Based Escalation:**
- Rule: "If subject has 3+ cases in 12 months, auto-escalate to CCO"
- Rule: "If location has 5+ cases in 30 days, alert Regional HR"
- Rule: "If category spikes 50% month-over-month, notify Compliance"

### Table Stakes

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Subject tracking on cases** | Already exists | - | Case module (exists) | Subject entity implemented |
| **Basic reporting by subject** | Can be built | Medium | Analytics (exists) | Filter cases by subject |
| **Category breakdown dashboard** | Already exists | - | Analytics (exists) | Standard widget |

### Differentiators

| Feature | Value Proposition | Complexity | Competitor Status | Notes |
|---------|-------------------|------------|-------------------|-------|
| **Automatic repeat subject alert** | Proactive pattern detection | Medium | HR Acuity leads here | Real-time check on case create |
| **Fuzzy name matching** | Catch variations (Bob vs Robert) | Medium | Limited competitors | Phonetic + ML matching |
| **AI trend identification** | Insights without queries | High | Emerging | "Here's what changed this month" |
| **Pattern-based escalation rules** | Automated response to trends | High | Limited | Combine with rules engine |
| **Cross-organization benchmarking** | Comparative insights | High | HR Acuity has | "Your harassment rate vs. industry" |
| **Subject timeline view** | Complete history | Low | Case IQ has | All interactions with one person |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Auto-terminate based on patterns** | Legal risk; discrimination concern | Alert and recommend; human decides |
| **Public subject "rap sheet"** | Privacy violation | Visible only to investigators with need-to-know |
| **Cross-tenant pattern detection** | Data isolation breach | Benchmarking only with anonymized aggregates |
| **Excessive alerting on patterns** | Alert fatigue | Configurable thresholds; weekly digest option |

---

## Feature Priority Matrix

### Build Order Recommendation

**Phase 1: Foundation Automation** (Highest ROI, builds on existing)
1. Routing rules engine (extends case management)
2. SLA enforcement with visual indicators
3. Anonymous communication relay (email first, then SMS)
4. Auto-clear rules for disclosures

**Phase 2: Intelligence Layer**
5. Repeat subject alerts
6. RAG-powered policy chatbot
7. HRIS-triggered disclosure campaigns
8. Manager compliance dashboard

**Phase 3: Advanced Automation**
9. Pattern-based escalation rules
10. AI trend identification
11. Push notifications (PWA)
12. Offline form submission

**Phase 4: Specialized (Customer-Driven)**
13. External party registry
14. Sanctions screening integration
15. Cross-organization benchmarking

### Complexity vs. Value Matrix

```
                    HIGH VALUE
                        |
    Pattern Detection   |   Routing Rules Engine
    Repeat Subject      |   SLA Enforcement
                        |   Auto-Clear Rules
                        |   Anonymous Relay
    ----------------+---+---+------------------
                    |       |
    Sanctions       |       |   RAG Chatbot
    Screening       |       |   HRIS Triggers
                    |       |   Manager Dashboard
                        |
                   LOW VALUE

        HIGH COMPLEXITY -------- LOW COMPLEXITY
```

---

## Competitor Implementation Reference

### NAVEX One

**Routing & Automation:**
- Rule-based assignment (category, location, severity)
- SLA tracking with configurable deadlines
- Escalation on breach (email notification)
- LIMITED: Complex workflow builder; requires professional services for advanced rules

**Anonymous Communication:**
- EthicsPoint access codes (standard)
- Two-way messaging via web portal
- Email relay available
- Phone callback scheduling

**AI Features (Dec 2025 launch):**
- AI Assistant for policy Q&A
- Case summarization
- Translation assistance
- EARLY: Not as mature as HR Acuity's olivER

### EQS Integrity Line

**Routing & Automation:**
- Drag-and-drop workflow customization (no-code)
- Auto-assignment by criteria
- SLA monitoring
- STRENGTH: EU Whistleblowing Directive compliance built-in

**Anonymous Communication:**
- Industry-leading anonymous channel
- 80+ languages with AI translation
- End-to-end encryption
- True anonymity (no metadata)

### Case IQ

**Routing & Automation:**
- Clairia AI assistant for case guidance
- Automated workflows and notifications
- Case linking and flags
- STRENGTH: 75 chart types for analytics

**Pattern Detection:**
- Case linking and flags highlight connections
- Personalized dashboards for pattern visibility
- LIMITATION: Less sophisticated than HR Acuity for repeat offender tracking

### HR Acuity

**Pattern Detection (Industry Leader):**
- Repeat offender identification
- Cross-case subject tracking
- Benchmarking against industry peers
- olivER AI for insights
- STRENGTH: Best-in-class employee relations analytics

**Manager Dashboards:**
- Team compliance visibility
- Training completion tracking
- Delegation and proxy capabilities

---

## Sources

### Official Vendor Documentation (HIGH confidence)
- [NAVEX AI Assistant](https://www.navex.com/en-us/platform/employee-compliance/ai-assistant/)
- [Case IQ Platform](https://www.caseiq.com/platform)
- [HR Acuity Whistleblower Hotline](https://www.hracuity.com/blog/best-whistleblower-hotline-2026/)
- [EQS vs NAVEX Comparison](https://www.eqs.com/navex-vs-eqs-compliance-software-comparison/)
- [GAN Integrity Disclosure Management](https://www.ganintegrity.com/use-case/disclosure-management/)
- [NAVEX COI Disclosure Management](https://www.navex.com/en-us/platform/employee-compliance/coi-disclosure-management/)

### Industry Analysis (MEDIUM-HIGH confidence)
- [Gartner Peer Insights - EQS vs NAVEX](https://www.gartner.com/reviews/market/corporate-compliance-and-oversight-solutions/compare/eqs-group-vs-navex)
- [Best Whistleblowing Software 2026 - WhistleLink](https://www.whistlelink.com/blog/best-whistleblowing-software-2024-top-rated-digital-solutions/)
- [Safecall Anonymous Two-Way Dialogue](https://www.safecall.co.uk/resource/anonymous-two-way-dialogue/)

### Automation & Rules Engine (MEDIUM confidence)
- [How Automated Escalation Rules Reduce Bottlenecks - Cflow](https://www.cflowapps.com/how-automated-escalation-rules-reduce-approval-bottlenecks/)
- [Business Rules Engines in Automation - Support Bench](https://www.supportbench.com/what-are-business-rules-engines-in-automation/)
- [SLA Software Guide 2026 - Monday.com](https://monday.com/blog/service/sla-software/)
- [Case Assignment Rules - Salesforce Patterns](https://www.saasguru.co/salesforce-case-assignment-rules/)

### AI/RAG (MEDIUM confidence)
- [Enterprise RAG Guide 2026 - Stack AI](https://www.stack-ai.com/blog/enterprise-rag-what-it-is-and-how-to-use-this-technology)
- [Ethena Policy Bot](https://www.goethena.com/post/introducing-policy-bot-an-interactive-chatbot-powered-by-ai/)
- [HR Chatbots Guide 2026 - Aisera](https://aisera.com/blog/hr-chatbot/)

### PWA & Mobile (MEDIUM confidence)
- [PWA Guide 2026 - Technocrat](https://atechnocrat.com/2026/01/31/progressive-web-apps-the-future-of-mobile-first-design-in-2026/)
- [PWA Best Practices - MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Best_practices)
- [Push Notifications for SaaS 2026 - EngageLab](https://www.engagelab.com/blog/push-notification-for-saas)

### Sanctions & GT&E (MEDIUM confidence)
- [Sanctions Compliance 2026 - AML Analytics](https://aml-analytics.com/2026/01/09/sanctions-complicance-in-2026/)
- [FINRA Gift Rules - StarCompliance](https://www.starcompliance.com/finra-gifting/)
- [GT&E Data to Track - GAN Integrity](https://www.ganintegrity.com/resources/blog/gifts-and-entertainment-data/)
- [Vendor Sanction Screening - Ethico](https://ethico.com/credential-screening-monitoring/vendor-third-party-risk-monitoring/)

---

## Quality Gate Checklist

- [x] Categories are clear (table stakes vs differentiators vs anti-features)
- [x] Complexity noted for each feature (Low/Medium/High)
- [x] Dependencies on existing features identified
- [x] Competitor approaches referenced where relevant
- [x] Build order recommendation provided
- [x] Sources documented with confidence levels
- [x] Anti-features clearly documented to avoid over-engineering
- [x] User perspective documented for each feature category

---

*End of v2.0 Intelligence Layer Feature Research*
