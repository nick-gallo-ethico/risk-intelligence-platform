---
phase: 12-internal-operations-portal
plan: 13
subsystem: ops-console
tags: [next.js, react, impersonation, support-console, tenant-management]
dependency-graph:
  requires:
    - "12-06: ImpersonationModule backend"
    - "12-12: SupportConsoleService backend"
  provides:
    - "Ops Console Support UI with impersonation"
    - "TenantSwitcher component"
    - "ImpersonationBar component"
    - "useImpersonation hook"
  affects:
    - "12-18: Tech debt may address frontend patterns"
tech-stack:
  added:
    - "date-fns for time formatting"
  patterns:
    - "useImpersonation hook with session management"
    - "Persistent impersonation bar UX"
    - "Tenant search with quick select reasons"
key-files:
  created:
    - apps/ops-console/src/hooks/useImpersonation.ts
    - apps/ops-console/src/components/ImpersonationBar.tsx
    - apps/ops-console/src/components/TenantSwitcher.tsx
    - apps/ops-console/src/app/support/layout.tsx
    - apps/ops-console/src/app/support/page.tsx
    - apps/ops-console/src/app/support/[orgId]/page.tsx
  modified:
    - apps/ops-console/src/components/InternalLayout.tsx
decisions:
  - decision: "Impersonation session stored in localStorage"
    context: "Need to persist session across page reloads"
    rationale: "Browser-only storage, cleared on session end"
  - decision: "Warning state at 15 minutes remaining"
    context: "Per CONTEXT.md time limit awareness"
    rationale: "Gives operator time to complete or extend"
metrics:
  duration: "18 min"
  completed: "2026-02-06"
---

# Phase 12 Plan 13: Ops Console Support UI Summary

Support Console frontend with impersonation bar, tenant switcher, and debug views.

## One-Liner

Ops Console Support UI with persistent impersonation bar, tenant search with reason requirement, and comprehensive tenant debug views.

## Completed Tasks

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | App Structure | (prior) | package.json, next.config.js, layout.tsx |
| 2 | Impersonation Components | 87856b8 | useImpersonation.ts, ImpersonationBar.tsx, TenantSwitcher.tsx, InternalLayout.tsx |
| 3 | Support Console Pages | 77506f6 | support/page.tsx, support/[orgId]/page.tsx |

## Implementation Details

### useImpersonation Hook

Comprehensive React hook for managing impersonation sessions:

```typescript
// Key features
- Session validation with auto-refresh every 60s
- Local countdown timer for remaining seconds
- Start/end session mutations with error handling
- getHeaders() for API request headers (X-Impersonation-Session)
- Automatic session cleanup on expiry
```

### ImpersonationBar Component

Persistent visual indicator per CONTEXT.md requirements:

- Sticky at top of page when impersonating
- Shows organization name and reason
- Countdown timer with hours/minutes/seconds
- Warning state (yellow) when <15 minutes remaining
- One-click "End Session" button
- Aria labels for accessibility

### TenantSwitcher Component

Search and select tenants for impersonation:

- Search by name, domain, or ID (min 2 chars)
- Shows user/case counts for each tenant
- Quick-select common reasons (Support Ticket, Bug Investigation, etc.)
- Custom reason input with 10 character minimum
- Optional ticket reference field
- Loading and error states

### InternalLayout Integration

Updated layout with impersonation support:

- ImpersonationBar always at top when active
- Blue left border on sidebar when impersonating
- VPN Required banner hidden during impersonation (bar takes over)
- Navigation to Support Console, Implementation, Hotline, etc.

### Support Console Pages

**support/page.tsx:**
- Shows TenantSwitcher when not impersonating
- Shows quick access tools when impersonating (errors, config, jobs, search, database, activity)
- Links to tenant detail page

**support/[orgId]/page.tsx:**
- Comprehensive tenant detail view
- Quick stats: recent errors, pending jobs, features enabled, users
- Data counts: cases, policies, campaigns, creation date
- Recent error logs with level indicators
- Configuration status: SSO, MFA, HRIS integration
- Feature adoption badges

## API Integration Points

| Component | Endpoint | Method |
|-----------|----------|--------|
| useImpersonation | `/api/v1/internal/impersonation/sessions` | POST (start) |
| useImpersonation | `/api/v1/internal/impersonation/sessions/:id/validate` | POST |
| useImpersonation | `/api/v1/internal/impersonation/sessions/:id` | DELETE (end) |
| TenantSwitcher | `/api/v1/internal/support/tenants/search` | GET |
| TenantSwitcher | `/api/v1/internal/support/tenants/recent` | GET |
| TenantDetail | `/api/v1/internal/support/tenants/:orgId` | GET |
| TenantDetail | `/api/v1/internal/support/tenants/:orgId/errors` | GET |
| TenantDetail | `/api/v1/internal/support/tenants/:orgId/config` | GET |
| TenantDetail | `/api/v1/internal/support/tenants/:orgId/jobs` | GET |

## Verification Results

```bash
# TypeScript compiles
cd apps/ops-console && npx tsc --noEmit  # PASS

# Build succeeds
cd apps/ops-console && npm run build  # PASS
# Output: 11 routes generated including /support and /support/[orgId]
```

## Success Criteria Met

- [x] apps/ops-console is separate Next.js app
- [x] ImpersonationBar shows persistent visual indicator with colored border
- [x] Remaining session time displayed and updates (countdown timer)
- [x] TenantSwitcher enables searching by name/domain/ID
- [x] Reason required to start impersonation (min 10 chars)
- [x] Support Console shows errors, config, jobs, search index for impersonated tenant
- [x] X-Impersonation-Session header sent with all API requests

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Support Console UI is complete. Dependencies for 12-14 through 12-17 (Implementation Portal, Hotline Ops, Client Success, Training Portal) have been built in parallel commits. Ready for phase completion.

## Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| useImpersonation.ts | 188 | Session management hook |
| ImpersonationBar.tsx | 130 | Persistent impersonation indicator |
| TenantSwitcher.tsx | 386 | Tenant search and selection |
| InternalLayout.tsx | 128 | Layout with impersonation support |
| support/page.tsx | 145 | Support Console main page |
| support/[orgId]/page.tsx | 544 | Tenant detail view |
