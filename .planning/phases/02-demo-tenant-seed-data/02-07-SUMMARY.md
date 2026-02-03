---
phase: 02
plan: 07
subsystem: demo-reset
tags: [demo, reset, sessions, isolation, undo]

# Dependency Graph
requires: [02-05, 02-06]
provides:
  - DemoUserSession model
  - DemoArchivedChange model
  - Demo reset API endpoints
  - Session isolation for multi-user demos
  - 24-hour undo window
affects: [Phase 5+ demo operations]

# Tech Tracking
tech-stack:
  added: []
  patterns:
    - Copy-on-write session isolation
    - Archive-before-delete for undo support
    - FK-safe deletion order

# File Tracking
key-files:
  created:
    - apps/backend/src/modules/demo/demo-session.service.ts
    - apps/backend/src/modules/demo/demo-reset.service.ts
    - apps/backend/src/modules/demo/demo-reset.controller.ts
    - apps/backend/prisma/reset-demo.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/demo/demo.module.ts
    - apps/backend/src/modules/demo/index.ts
    - apps/backend/src/app.module.ts
    - apps/backend/package.json
    - apps/backend/prisma/seeders/case.seeder.ts
    - apps/backend/prisma/seeders/riu.seeder.ts
    - apps/backend/prisma/seeders/investigation.seeder.ts

# Decisions
decisions:
  - decision: "Copy-on-write pattern with demoUserSessionId field"
    rationale: "Enables session isolation without duplicating base data"
  - decision: "isBaseData boolean flag"
    rationale: "Clear distinction between immutable seed data and user changes"
  - decision: "24-hour undo window via DemoArchivedChange"
    rationale: "Safety net for accidental resets"
  - decision: "Confirmation token required for reset"
    rationale: "Prevent accidental data loss"

# Metrics
metrics:
  duration: 14 min
  completed: 2026-02-03
---

# Phase 02 Plan 07: Demo User Reset System Summary

**One-liner:** Hybrid multi-user demo reset with session isolation and 24-hour undo window

## What Was Built

Implemented a complete demo reset system that allows multiple sales reps and prospects to use the demo environment simultaneously without affecting each other. Each user's changes are tracked in isolated sessions, and resets only clear user-specific data while preserving the shared 3-year demo dataset.

### Schema Changes

Added two new models and tracking fields:

1. **DemoUserSession** - Tracks demo user sessions per organization
   - One session per user per organization
   - Tracks lastActivityAt for cleanup scheduling
   - Links to user's Cases, Investigations, and RIUs

2. **DemoArchivedChange** - Archives changes for 24-hour undo window
   - Stores complete entity snapshots
   - Expires after 24 hours for automatic cleanup
   - Supports restoration via undo endpoint

3. **Tracking fields on entities:**
   - `demoUserSessionId` - Links record to user's session (null for base data)
   - `isBaseData` - Boolean flag marking immutable seed data

### Services Created

1. **DemoSessionService** (`demo-session.service.ts`)
   - `getOrCreateSession()` - Upsert pattern for session management
   - `getSessionWithStats()` - Count user's changes by type
   - `getStaleSessions()` - Find inactive sessions for cleanup
   - `touchSession()` - Update activity timestamp

2. **DemoResetService** (`demo-reset.service.ts`)
   - `resetUserChanges()` - Archive then delete user data
   - `undoReset()` - Restore from archive within 24 hours
   - `getVerificationSummary()` - Confirm base data intact
   - `cleanupExpiredArchives()` - Remove old archives
   - FK-safe deletion order to avoid constraint violations

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/demo/session` | GET | Get session stats |
| `/api/v1/demo/reset/preview` | GET | Preview what reset will delete |
| `/api/v1/demo/reset` | POST | Execute reset (requires confirmation) |
| `/api/v1/demo/undo` | POST | Undo recent reset |
| `/api/v1/demo/verify` | GET | Verify reset success |

### CLI Tools

Added npm scripts for admin operations:
- `npm run seed:reset <userId>` - Reset specific user
- `npm run demo:cleanup` - Cleanup expired data
- `npm run demo:stats` - View data statistics

### Seeder Updates

Updated all seeders to mark base data:
- `case.seeder.ts` - Sets `isBaseData: true`
- `riu.seeder.ts` - Sets `isBaseData: true`
- `investigation.seeder.ts` - Sets `isBaseData: true`

## Commits

| Hash | Description |
|------|-------------|
| cadd323 | Add DemoUserSession and DemoArchivedChange schema models |
| 7dd5cfe | Create demo session service for tracking user changes |
| 0ae9989 | Create demo reset service with undo support |
| 4144910 | Create demo reset controller with confirmation endpoint |
| 71d64b7 | Register demo reset services in module |
| 01685b7 | Update seeders to mark base data as immutable |
| 7971aad | Create CLI reset script and npm commands |

## Deviations from Plan

None - plan executed exactly as written.

## Key Design Decisions

1. **Session isolation via demoUserSessionId**
   - User-created records link to their session
   - Base data has `demoUserSessionId: null` and `isBaseData: true`
   - Reset only deletes records matching user's session

2. **Archive-before-delete pattern**
   - Complete entity snapshots stored in DemoArchivedChange
   - 24-hour expiry for undo window
   - Restoration recreates entities from JSON snapshots

3. **FK-safe deletion order**
   - Delete children before parents
   - Order: audit logs, messages, notes, subjects, investigations, associations, cases, RIUs

4. **Confirmation token requirement**
   - Reset requires `confirmationToken: "CONFIRM_RESET"`
   - Prevents accidental data loss from API calls

## Verification

- [x] Schema validates: `npx prisma validate`
- [x] TypeScript compiles: `npx tsc --noEmit`
- [x] DemoUserSession and DemoArchivedChange models exist
- [x] Base data marked with `isBaseData: true` in seeders
- [x] Reset only deletes records where `isBaseData: false` AND `demoUserSessionId` matches
- [x] Confirmation token required for reset
- [x] 24-hour undo window via DemoArchivedChange
- [x] Verification endpoint confirms base data intact

## Next Phase Readiness

Phase 2 is now complete. The demo reset system enables:
- Multiple concurrent demo users without interference
- Fast resets (only user changes, not 3-year history)
- Safety net with 24-hour undo window
- Admin tooling for maintenance

Ready for Phase 3 to continue with authentication and SSO.
