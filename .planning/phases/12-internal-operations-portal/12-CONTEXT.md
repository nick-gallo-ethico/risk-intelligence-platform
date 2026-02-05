# Phase 12: Internal Operations Portal - Context

**Gathered:** 2026-02-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build internal tooling for Ethico teams: Support Console (issue diagnosis, cross-tenant access), Implementation Portal (onboarding workflows, data migration), Hotline Operations (directive management, QA oversight), and Client Success Dashboard (health monitoring). Also addresses accumulated tech debt. This is an internal ops subdomain (ops.ethico.com), not customer-facing.

</domain>

<decisions>
## Implementation Decisions

### Cross-Tenant Access Model
- **Full access** for support staff - can do anything the client can do (all changes audited)
- **No approval required** - staff with Support role can access immediately (role-based with full audit trail)
- **Banner + colored border** during impersonation - persistent visual indicator that can't be missed
- **No automatic timeout** - support exits manually when done (audited, no forced logout)
- **Full debug access** - errors, config, job queues, search indices, feature flags all visible
- **Single tenant search** - must enter client context first (no global cross-tenant content search)
- **No client notification** on support access (but internally audited)
- **No action restrictions** - support can do anything, accountability via audit logs
- **Both entry methods** - can enter from support ticket link OR manual tenant search
- **Separate admin subdomain (ops.ethico.com)** - security isolation, VPN-restricted, independent deployment, clean SOC 2 audit story

### Implementation Portal

#### Client Onboarding
- **Hybrid data entry** - clients fill basics (org structure, branding, pick template), Ethico configures complex settings
- **Full setup wizard with industry templates** - Healthcare (HIPAA), Financial Services (SOX), General Business templates with smart defaults
- **Progressive complexity** - start simple, surface advanced options as they mature
- **Checklist with phases** - different templates for PLG (Setup → First Policy → First Workflow → Invite Team → Active) vs Enterprise (Discovery → Configuration → Data Migration → UAT → Go-Live → Optimization)
- **Distinct templates** per customer type (SMB Quick Start, Enterprise Full, Industry-Specific)

#### Data Migration / Field Matching
- **Both modes** - AI-suggested mapping with confidence indicators (✅ high, ⚠️ low, ❌ unmapped), then visual mapper for user verification/override
- **Preview sample rows** before committing migration
- **Configurable entity types** - client chooses which to import (Policies, Attestations, Cases, Disclosures, Attachments, Audit trail)
- **Hybrid import sources** - file upload always available, direct API connectors for major competitors (NAVEX, EQS, etc.)
- **Record-level undo** - can delete individual imported records, no time limit

#### Go-Live Readiness
- **Hybrid gates**:
  - Hard gates (must pass): auth configured, admin trained, terms signed, contact designated
  - Readiness score (recommended 85%+): weighted points for data migration, test workflow, users invited, branding, categories, integrations, first policy
  - Client sign-off to proceed below threshold (with documented acknowledgment)

#### Project Management
- **Auto-escalation for blockers** - Day 2 reminder, Day 3 escalate to manager, Day 7 director. Category-based timing (internal 3d, client-side 5d, vendor 5d). Snooze with required reason
- **Full certification system** - modular (Platform Fundamentals required, specialty tracks optional), short courses + quizzes, 80% to pass, PDF certificates, expiration tracking for major versions
- **Full client visibility** - clients can log in and see their implementation checklist, status, blockers
- **At go-live handoff** - implementation owns until launch, then CSM takes over
- **Full collaboration** - multiple Ethico team members can work on same implementation, parallel tasks, shared ownership
- **Both reporting views** - portfolio pipeline view AND individual performance dashboards
- **Full activity log with native email** - send from portal (auto-logged), inbound via BCC logging, meeting notes with attendees, decisions with rationale, auto-logged phase transitions

### Client Health Metrics
- **Blended score** - both usage metrics (login frequency, feature adoption) AND outcome metrics (case resolution, SLA compliance, attestation rates)
- **Traffic light + numeric with drill-down** - Red/Amber/Green summary with precise score on hover/click
- **Configurable alerts per account** - high-touch accounts get proactive alerts on score drops, SMB/PLG dashboard only
- **Curated view only** for clients - CSM shares specific metrics in QBR reports, not live dashboard access
- **Peer comparison with configurable filtering** - compare against all customers (default) OR filter by size/industry. Minimum 5 peers for privacy. Show percentile, median, P25/P75 with visual indicator. Cache aggregates nightly
- **Binary feature flags** for adoption tracking - which features each tenant has used (yes/no)

### Hotline Operations
- **Both edit directives, Ethico approves** - clients can draft directive changes, Ethico reviews and publishes
- **Bulk QA actions** - approve, reject, reassign, and change priority in bulk
- **Global queue view** - see all QA items across all clients in one view
- **Support assists with case reassignment** - hotline ops doesn't control case assignment (happens after QA release), support helps clients via impersonation
- **Real-time dashboard** - calls in progress, queue depth, average handle time - live metrics
- **QA reviewer throughput + accuracy** - items reviewed per day/week AND error rates (overturned decisions)
- **Internal-only notes** - notes flagged as 'internal' never visible to client
- **Skill-based language routing** - track operator languages for call routing decisions
- **Live operator status board** - available, on call, on break, offline in real-time
- **Manual QA audit selection** - supervisor manually picks calls to review

### Claude's Discretion
- Support tier structure (single role vs tiered L1/L2/L3)
- SLA tracking for implementation milestones
- Renewal risk prediction (ML-based vs manual flags)

</decisions>

<specifics>
## Specific Ideas

### Architecture Reference
- Separate admin subdomain (ops.ethico.com) for security isolation - different deployment, VPN-only network restrictions, internal tools not in customer bundle
- Structure as `apps/ops-console/` in monorepo, sharing `packages/types/` for common interfaces
- Backend uses service-account credentials with RLS bypass where needed for legitimate cross-tenant operations

### Implementation Wizard UX Flow
```
What would you like to import?

☑️ Policies & procedures
☑️ Attestation records
☐ Cases / Investigations
☐ Disclosure forms (COI, gifts)
☐ Historical attachments
☐ Audit trail / activity logs

[Continue →]
```

### Field Mapping UX
```
Source          →    Target
employee_id     →    [Employee ID ▼] ✓ AI matched
dept_name       →    [Department ▼]  ✓ AI matched
pol_own_v2      →    [? Unmapped  ▼] ⚠ Review
```

### Go-Live Readiness Display
```
┌─────────────────────────────────────────────────────┐
│ HARD GATES (Blockers - must pass)                   │
│ ☑️ Authentication configured (SSO or password)      │
│ ☑️ At least 1 admin trained/certified               │
│ ☑️ Terms & data processing agreement signed         │
│ ☑️ Primary contact designated                       │
└─────────────────────────────────────────────────────┘
                        +
┌─────────────────────────────────────────────────────┐
│ READINESS SCORE (Recommended ≥85%)                  │
│ Current: 72% ████████░░ [Recommended: 85%+]         │
└─────────────────────────────────────────────────────┘
```

### Benchmark Display
```
┌─────────────────────────────────────────────────────────────┐
│ Attestation Completion Rate                                 │
│                                                             │
│ Your rate: 87%                    72nd percentile           │
│                                                             │
│ ├────────────────────●────────────────────┤                │
│ 68%                 81%                  89%                │
│ (25th)            (median)             (75th)               │
│                                                             │
│ Compared to: all customers (143 organizations)              │
└─────────────────────────────────────────────────────────────┘
```

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-internal-operations-portal*
*Context gathered: 2026-02-05*
