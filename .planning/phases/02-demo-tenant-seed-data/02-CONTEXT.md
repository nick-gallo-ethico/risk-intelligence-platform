# Phase 2: Demo Tenant & Seed Data - Context

**Gathered:** 2026-02-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Create "Acme Co." demo tenant with 3 years of realistic compliance data — the living test bed that proves features work and enables sales demonstrations. Includes organization structure, historical data across all entity types, and a hybrid multi-user demo access model.

</domain>

<decisions>
## Implementation Decisions

### Organization Structure
- **Company profile:** Multi-industry conglomerate with 4 divisions: Healthcare (50%), Tech, Retail, Energy
- **Scale:** ~20,000 employees across 50+ global locations (US, EMEA, APAC)
- **Hierarchy:** 4 levels — Division → Business Unit → Department → Team
- **Reporting chains:** Full manager hierarchy (every employee has a manager up to division VP)
- **Job levels:** Standard corporate levels — IC, Manager, Director, VP, SVP, C-Suite
- **Compliance structure:** Centralized compliance team (CCO at top, investigators)
- **HR structure:** HR Business Partners mapped per division/region for case routing
- **Locations:** Real cities with fictional addresses (e.g., "Acme Tower, 123 Main St, Chicago")
- **Named personas:** Executives (CCO, division heads) are named and memorable; bulk employees generated
- **Work modes:** Division-specific patterns (Tech mostly remote, Healthcare mostly onsite, etc.)
- **Languages:** Multi-language workforce matching global footprint (EMEA local languages, APAC Mandarin/Japanese)
- **Worker types:** Employees only (no contractors)

### Data Volume
- **RIUs:** ~5,000 over 3 years (~140/month, ~4-5/day)
- **Cases:** ~4,500 (90% RIU-to-Case ratio, some RIUs merge)
- **Open cases:** ~10% open at any time (~150 active cases)
- **Campaigns:** ~20 campaigns (annual COI, quarterly attestations, ad-hoc surveys)
- **Policies:** 50+ policies with 2-5 versions per major policy
- **Investigations:** 1 per case typically; some require additional regulatory investigations (e.g., HIPAA)
- **Interviews:** 1-3 per investigation (subject, witnesses, reporter follow-up)
- **Disclosure completion:** High completion rates (~85% participation)
- **Remediation plans:** ~50% of substantiated cases have formal remediation

### Data Distribution
- **RIU channels:** Hotline-heavy (60% phone, 30% web, 10% other)
- **Anonymity:** 40% anonymous, 60% identified; category-based (harassment more anonymous)
- **Time distribution:** Realistic seasonality — spikes after reorgs, holidays, policy changes
- **Case duration:** Simple cases 2-4 days, complex 1-3 months, **aggregate average under 20-22 days**
- **SLA breaches:** Realistic 5-10% breach rate (shows SLA tracking value)
- **Priority distribution:** Pyramid (few critical, some high, many medium, most low)
- **Timestamps:** Time-zone realistic (EMEA cases filed during EMEA hours)

### Data Realism & Patterns
- **Narratives:** Realistic AI-generated complaint descriptions and interview notes
- **Hotspots:** Realistic variance — some departments/managers have higher case rates
- **Repeat subjects:** Included for pattern detection demos ("This person was involved in 3 cases")
- **Manager patterns:** Some managers are repeat subjects or have high team case rates
- **Outcome distribution:** Higher substantiation rate (~60%) showing action-oriented program
- **Retaliation:** Include retaliation patterns (follow-up reports after initial report)
- **Anonymous communication:** Realistic message exchanges (3-5 messages back and forth)
- **Escalations:** Tracked CCO/executive involvement on high-severity cases
- **External parties:** Some cases involve legal counsel, law enforcement
- **Reassignments:** Some cases transferred mid-investigation
- **Linked RIUs:** Some incidents have multiple reporters (case consolidation)
- **Disclosure conflicts:** Flagged COI, gift threshold violations creating review cases
- **Gift thresholds:** Include violations that auto-create cases
- **Attestation patterns:** Include stragglers who consistently complete late
- **Remediation completion:** Mix of on-time, late, and overdue steps
- **Reporter engagement:** Realistic variance (some responsive, some unresponsive)
- **Board metrics:** Compelling year-over-year improvement trends

### Demo-Ready Features
- **Flagship cases:** 5-10 named, memorable cases for sales team walkthroughs
- **Fresh items:** Recent unread cases in triage, pending approvals, notifications
- **AI enrichment:** Pre-populated summaries, risk scores on cases
- **Search:** Elasticsearch indices pre-built (no indexing during demos)
- **Determinism:** Fully deterministic — exact same data every reset
- **Edge cases:** Include very long narratives, Unicode, boundary dates for testing
- **Dashboard health:** Mix of good metrics and problem areas (shows platform value)
- **Categories:** Uniform distribution across divisions (simpler cross-org comparison)

### Multi-User Demo Model
- **Architecture:** Hybrid — shared read-only base data + isolated changes per user
- **Base data:** Curated 3-year history, never touched by user resets
- **User changes:** Isolated per sales rep/prospect, cleared on reset
- **Simultaneous demos:** Multiple users can demo without affecting each other

### Demo Access & Accounts
- **Sales rep accounts:** Pre-created permanent accounts
- **Prospect accounts:** Self-provisioned by sales reps, time-limited with configurable expiry
- **Attribution:** All prospect access tied to originating sales rep
- **Auto-expiry:** Prospect accounts expire automatically
- **Role presets:** Multiple accounts per role — demo-cco@, demo-investigator@, demo-employee@, etc.

### Demo Reset Behavior
- **Trigger:** Manual only (by sales rep or prospect playing in sandbox)
- **Scope:** Clears only user's isolated changes, base data untouched
- **Speed:** Target under 1 minute (under 5 minutes acceptable)
- **Confirmation:** Required before reset ("Are you sure?")
- **Undo:** 24-hour window to restore cleared changes
- **Cleanup:** Optional scheduled cleanup of changes older than 30 days
- **Scenarios:** Single baseline only (no multiple presets)
- **Date:** Real current date (historical data is truly historical)

### Demo Infrastructure
- **Environment:** Separate dedicated demo infrastructure (not shared with production)
- **Benefits:** Can preview features, isolated from production incidents, clean security story
- **Deployment:** Syncs with production but can run ahead for feature previews
- **UI marking:** No demo marking (looks exactly like production)
- **Mobile:** Demo-ready responsive design for tablets/in-person demos

### Demo Integrations
- **Email:** Redirects to per-user demo inbox (demo-inbox-{user}@...) — no spam risk
- **External systems:** Mock integrations (fake HRIS sync, mock SSO providers)
- **Export:** No data export from demo environment

### Claude's Discretion
- Division geographic footprints (realistic industry patterns)
- Employee tenure distribution and turnover rate
- Audit log depth (balance realism vs storage)
- Category trends over time (tied to business/world events)
- Activity volume per case (based on complexity)
- Policy-to-case linkage in findings
- Training scenario identification

</decisions>

<specifics>
## Specific Ideas

- "Lived-in home" approach — Acme Co. grows with each feature release; modules add their 3-year historical data + active items
- Data interconnects across modules (disclosures can trigger investigations, cases reference policies)
- Define cross-module ratios upfront (% cases → investigations, % disclosures requiring approval) for consistency
- Pattern consistency: problem locations, repeat offenders, seasonal trends designed now, applied as modules seed
- Aggregate case closure KPI (~20-22 days average) is a headline metric for demos
- Anonymous communication relay demonstrates "Chinese Wall" model without revealing reporter identity

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-demo-tenant-seed-data*
*Context gathered: 2026-02-03*
