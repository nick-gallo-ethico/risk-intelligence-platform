---
phase: 02
plan: 06
subsystem: demo-access
tags: [demo, users, authentication, seeding, provisioning]
requires: ["02-01"]
provides: ["demo-users", "prospect-provisioning", "demo-api"]
affects: ["02-07", "03-authentication-sso"]
tech-stack:
  added:
    - "@nestjs/schedule (cron)"
    - "uuid (prospect email generation)"
  patterns:
    - "Sales rep provisioning pattern"
    - "Time-limited demo accounts"
    - "Scheduled account expiry"
key-files:
  created:
    - apps/backend/prisma/seeders/user.seeder.ts
    - apps/backend/src/modules/demo/demo.module.ts
    - apps/backend/src/modules/demo/demo.service.ts
    - apps/backend/src/modules/demo/demo.controller.ts
    - apps/backend/src/modules/demo/demo.scheduler.ts
    - apps/backend/src/modules/demo/dto/provision-prospect.dto.ts
    - apps/backend/prisma/migrations/20260203070140_add_demo_account_entity/
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/prisma/seed.ts
decisions:
  - key: demo-email-pattern
    value: "demo-{role}@acme.local for sales reps, prospect-{uuid}@demo.local for prospects"
    rationale: "Clear distinction between permanent and temporary accounts"
  - key: prospect-expiry-default
    value: "14 days"
    rationale: "Typical sales demo cycle length"
  - key: expiry-check-frequency
    value: "Hourly via @Cron"
    rationale: "Balance between promptness and resource usage"
  - key: sales-rep-identification
    value: "Pattern match on email (demo-*@acme.local)"
    rationale: "Simple check without schema changes; all demo users can provision"
metrics:
  duration: "11 min"
  completed: "2026-02-03"
---

# Phase 02 Plan 06: Demo User System & Prospect Provisioning Summary

**One-liner:** 9 permanent demo users with role presets and sales rep provisioning for time-limited prospect accounts with automatic expiry.

## What Was Built

### 1. DemoAccount Entity (Prisma Schema)
Added `DemoAccount` model to track prospect account provisioning:
- Links prospect user to originating sales rep (attribution)
- Configurable expiry with status tracking (ACTIVE/EXPIRED/REVOKED)
- Access tracking (lastAccessAt, accessCount)
- Added DEMO_ACCOUNT to AuditEntityType for activity logging

### 2. Demo User Seeder (`user.seeder.ts`)
Creates 9 permanent demo users representing different role presets:
| Email | Role | Purpose |
|-------|------|---------|
| demo-admin@acme.local | SYSTEM_ADMIN | Full system access |
| demo-cco@acme.local | COMPLIANCE_OFFICER | Executive oversight |
| demo-triage@acme.local | TRIAGE_LEAD | Case routing |
| demo-investigator@acme.local | INVESTIGATOR | Case investigation |
| demo-investigator2@acme.local | INVESTIGATOR | Junior investigator |
| demo-policy@acme.local | POLICY_AUTHOR | Policy creation |
| demo-reviewer@acme.local | POLICY_REVIEWER | Policy approval |
| demo-manager@acme.local | MANAGER | Department view |
| demo-employee@acme.local | EMPLOYEE | Self-service portal |

All have password `Password123!` and can provision prospect accounts.

### 3. DemoService (`demo.service.ts`)
Prospect account management:
- `provisionProspectAccount()`: Create time-limited prospect accounts
- `extendExpiry()`: Extend account expiry date
- `revokeAccount()`: Manually deactivate accounts
- `getSalesRepProspects()`: List provisioned accounts
- `processExpiredAccounts()`: Auto-expire past-due accounts
- `recordAccess()`: Track prospect logins

### 4. DemoController (`demo.controller.ts`)
REST API endpoints:
- `POST /api/v1/demo/prospects` - Provision new prospect
- `GET /api/v1/demo/prospects` - List sales rep's prospects
- `PATCH /api/v1/demo/prospects/:id/extend` - Extend expiry
- `POST /api/v1/demo/prospects/:id/revoke` - Revoke account
- `GET /api/v1/demo/credentials` - Public credentials endpoint

### 5. DemoScheduler (`demo.scheduler.ts`)
Hourly cron job (`@Cron(CronExpression.EVERY_HOUR)`) to:
- Find ACTIVE accounts past expiry date
- Set status to EXPIRED and deactivate user
- Log expiry count

### 6. DemoModule (`demo.module.ts`)
Wires all components together:
- Imports PrismaModule, ScheduleModule
- Exports DemoService for use by other modules

## Technical Decisions

1. **Sales Rep Identification**: Uses email pattern matching (`demo-*@acme.local`) rather than a database flag. All demo users can provision prospects.

2. **Prospect Email Generation**: `prospect-{uuid-prefix}@demo.local` ensures uniqueness without collisions.

3. **Default Role**: COMPLIANCE_OFFICER provides best demo experience with broad visibility.

4. **Non-blocking Operations**: Activity logging and access recording are wrapped in try-catch to avoid breaking main flows.

## Deviations from Plan

None - plan executed exactly as written.

## Files Changed

| File | Change |
|------|--------|
| `apps/backend/prisma/schema.prisma` | Added DemoAccount model, DemoAccountStatus enum, User relations |
| `apps/backend/prisma/seed.ts` | Replaced inline users with seedDemoUsers() call |
| `apps/backend/prisma/seeders/user.seeder.ts` | New - 9 demo users with upsert |
| `apps/backend/src/modules/demo/*` | New - DemoModule, Service, Controller, Scheduler, DTOs |
| `apps/backend/prisma/migrations/...` | New - DemoAccount table migration |

## Verification Results

- TypeScript compilation: PASSED
- Prisma schema validation: PASSED
- Migration applied successfully
- All 9 demo users created via seeder
- DemoAccount entity tracks prospects correctly

## Next Phase Readiness

### Required for Phase 02-07 (RIU & Case Seeding):
- Demo users are available for case creation (createdById)
- Organization exists with categories

### Integration Points:
- Auth module can hook into `recordAccess()` for login tracking
- Future: DemoService can be extended for prospect login notification
