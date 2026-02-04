---
phase: 09
plan: 08
subsystem: campaign-scheduling
tags: [campaigns, scheduling, bullmq, blackouts, waves]
requires: [09-07]
provides: [campaign-scheduling-service, scheduled-launches, wave-rollout, blackout-dates]
affects: [09-09, 09-10]
tech-stack:
  added: []
  patterns: [bullmq-processor, delayed-jobs, wave-distribution, blackout-enforcement]
key-files:
  created:
    - apps/backend/src/modules/campaigns/campaign-scheduling.service.ts
    - apps/backend/src/modules/campaigns/campaign-scheduling.processor.ts
  modified:
    - apps/backend/prisma/schema.prisma
    - apps/backend/src/modules/campaigns/campaigns.module.ts
    - apps/backend/src/modules/campaigns/index.ts
decisions:
  - key: wave-status-enum
    choice: "CampaignWaveStatus: PENDING, LAUNCHED, CANCELLED"
    rationale: Simple lifecycle for wave tracking
  - key: rollout-strategies
    choice: "IMMEDIATE, STAGGERED, PILOT_FIRST"
    rationale: Per RS.53, covers common compliance rollout patterns
  - key: blackout-recurrence
    choice: "YEARLY, QUARTERLY, MONTHLY recurring patterns"
    rationale: Handles common org blackout schedules like year-end freeze
  - key: wave-employee-distribution
    choice: "Shuffle and slice by percentage or count"
    rationale: Simple randomization ensures fair distribution across waves
  - key: processor-concurrency
    choice: "3 concurrent jobs"
    rationale: Balance between throughput and database load
metrics:
  duration: 22 min
  completed: 2026-02-04
---

# Phase 9 Plan 08: Campaign Scheduling Summary

**One-liner:** BullMQ-powered scheduled campaign launches with wave-based staggered rollout and org blackout enforcement per RS.53/RS.54.

## What Was Built

### 1. Schema Additions (Task 1)
Added to Prisma schema:
- **CampaignWaveStatus** enum: PENDING, LAUNCHED, CANCELLED
- **CampaignRolloutStrategy** enum: IMMEDIATE, STAGGERED, PILOT_FIRST
- **CampaignWave** model: Tracks individual waves with waveNumber, scheduledAt, audiencePercentage, employeeIds
- **OrgBlackoutDate** model: Org-configurable blackout periods with recurring pattern support
- Added `rolloutStrategy` and `rolloutConfig` fields to Campaign model
- Added `waveId` FK to CampaignAssignment for wave tracking

### 2. CampaignSchedulingService (Task 2)
Core scheduling service with:
- `scheduleLaunch()`: Schedule campaign for future date, validates against blackouts
- `createWaves()`: Create wave-based rollout with employee distribution
- `checkBlackouts()`: Validate date against active blackout periods
- `getNextAvailableDate()`: Find next available date after blackouts
- `extendDeadlines()`: Adjust campaign dates when blackouts occur
- **Blackout CRUD**: create, update, delete, list operations

Key features:
- Creates BullMQ delayed jobs for scheduled launches
- Handles recurring blackouts (YEARLY, QUARTERLY, MONTHLY)
- Location-scoped blackouts support
- Automatic deadline extension for blackout days
- Emits events: `campaign.scheduled`, `campaign.wave.scheduled`

### 3. CampaignSchedulingProcessor (Task 3)
BullMQ processor handling:
- **launch-campaign**: Main entry point for scheduled campaign launch
  - IMMEDIATE: Creates all assignments at once via CampaignsService
  - STAGGERED/PILOT_FIRST: Launches first wave, queues subsequent waves
- **launch-wave**: Launches specific wave within staggered campaign
  - Creates assignments with employee snapshots
  - Updates wave status to LAUNCHED
  - Queues next wave if applicable

Configuration:
- 3 concurrent jobs
- 3 retry attempts with exponential backoff (5s, 10s, 20s)
- Events: `campaign.launched`, `campaign.wave.launched`, `campaign.launch.failed`

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Wave distribution | Shuffle + slice | Fair random distribution across waves |
| Blackout storage | OrgBlackoutDate model | Per-org configuration with location scoping |
| Recurring pattern | String enum | Simple pattern matching for yearly/quarterly/monthly |
| Job queue | Existing BullMQ | Consistent with platform job infrastructure |
| Concurrency | 3 | Balance throughput vs database load |

## Files Changed

| File | Change | Lines |
|------|--------|-------|
| `prisma/schema.prisma` | Added enums, models, Campaign fields | +85 |
| `campaign-scheduling.service.ts` | **Created** | 848 |
| `campaign-scheduling.processor.ts` | **Created** | 430 |
| `campaigns.module.ts` | Queue registration, provider imports | +40 |
| `index.ts` | Export new services | +2 |

## Verification Results

- Prisma schema validates
- TypeScript compiles (campaign-scheduling files clean)
- Queue registered with proper retry/backoff config
- Processor handles launch-campaign and launch-wave jobs

## Deviations from Plan

None - plan executed exactly as written.

## Integration Points

### Upstream Dependencies
- `CampaignsService` for IMMEDIATE launch
- `PrismaService` for database operations
- `AuditService` for action logging
- BullMQ infrastructure from JobsModule

### Downstream Consumers
- Campaign creation UI can set `launchAt` and `rolloutConfig`
- Admin can manage blackout dates via service methods
- Monitoring receives events for campaign launch tracking

## Next Phase Readiness

Ready for:
- **09-09**: Campaign reminder service (uses scheduling patterns established here)
- **09-10**: Campaign analytics (tracks wave completion metrics)

No blockers identified.
