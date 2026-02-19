# Phase 37: Critical Integration Fixes - Research

**Researched:** 2026-02-19
**Domain:** NestJS DI, BullMQ job scheduling, JWT RS256 WebSocket authentication
**Confidence:** HIGH

## Summary

This phase addresses three integration issues discovered during the v1.2 milestone audit. All three are "wiring" problems where correct code exists but is not connected properly:

1. **RedisCacheModule DI failure (CRITICAL)**: A fully-functional `RedisCacheModule` was created in Phase 34 with `@Global()` decorator and proper exports, but was never imported in `AppModule`. This causes DI resolution failures for 7+ services that inject `CACHE_MANAGER`.

2. **Batch processor dead code (MEDIUM)**: The cursor-based `processRemindersInBatches()` method exists in `CampaignReminderService` but the scheduler cron job calls `findAssignmentsNeedingReminders()` instead, bypassing the scalable batch processing and risking heap exhaustion for large tenants.

3. **HS256 WebSocket guard dead code (MEDIUM)**: `JwtWsGuard` uses HS256 via `configService.get('JWT_SECRET')` but Phase 32 enforced RS256 for all JWT operations. The guard is never used (AiGateway handles WS auth correctly via JwtKeyService), making it dead code and a security trap if reused.

**Primary recommendation:** Three surgical fixes (1 import, 1 method call change, 2 file deletions) with no new code required.

## Standard Stack

These fixes use already-established patterns in the codebase:

### Core (Already Present)

| Library                   | Version | Purpose                          | Why Standard                          |
| ------------------------- | ------- | -------------------------------- | ------------------------------------- |
| @nestjs/cache-manager     | ^2.0.0  | Cache abstraction layer          | NestJS official caching solution      |
| cache-manager-ioredis-yet | ^2.0.0  | Redis store for cache-manager v5 | Maintained fork, v5 compatible        |
| @nestjs/bullmq            | ^10.0.0 | BullMQ integration               | NestJS official job queue integration |
| @nestjs/schedule          | ^4.0.0  | Cron scheduling                  | NestJS official scheduler             |

### Supporting (Already Present)

| Library       | Version        | Purpose              | When to Use                 |
| ------------- | -------------- | -------------------- | --------------------------- |
| JwtKeyService | N/A (internal) | RS256 key management | All JWT verification points |

**No new dependencies required.** All fixes use existing code and patterns.

## Architecture Patterns

### Pattern 1: Global Module Registration

**What:** Modules decorated with `@Global()` must still be imported in `AppModule` to be activated.
**When to use:** When a module provides infrastructure services (caching, logging, metrics) used across many modules.

```typescript
// Source: apps/backend/src/app.module.ts (existing pattern)
@Module({
  imports: [
    // ... other modules
    StorageModule, // Global infrastructure - already imported
    RedisCacheModule, // Global infrastructure - MUST ADD THIS IMPORT
  ],
})
export class AppModule {}
```

**Key insight:** `@Global()` makes providers available everywhere but the module itself must be imported once to bootstrap the providers.

### Pattern 2: Scheduler Calling Batch Processor

**What:** Cron-triggered methods should delegate to batch-aware processors for scalability.
**When to use:** When processing unbounded data sets (campaigns with 100K+ assignments).

```typescript
// Source: apps/backend/src/modules/campaigns/campaign-reminder.processor.ts
@Cron(CronExpression.EVERY_DAY_AT_8AM)
async scheduledReminderCheck(): Promise<void> {
  // CORRECT: Call batch processor (cursor-based, 100 per batch)
  await this.reminderService.processRemindersInBatches();

  // WRONG: Non-paginated method loads all into memory
  // await this.reminderService.findAssignmentsNeedingReminders();
}
```

### Pattern 3: RS256 WebSocket Authentication (via JwtKeyService)

**What:** WebSocket JWT verification must use `JwtKeyService.getVerificationKey()` and `getAlgorithm()` for RS256 compliance.
**When to use:** Any WebSocket endpoint requiring JWT authentication.

```typescript
// Source: apps/backend/src/modules/ai/ai.gateway.ts (lines 429-436)
// CORRECT pattern - already implemented in AiGateway:
const verificationKey = this.jwtKeyService.getVerificationKey();
const algorithm = this.jwtKeyService.getAlgorithm();

const payload = await this.jwtService.verifyAsync(token, {
  secret: verificationKey,
  algorithms: [algorithm],
});
```

### Anti-Patterns to Avoid

- **Using JWT_SECRET directly for verification**: This bypasses RS256 enforcement. Always use `JwtKeyService`.
- **Non-paginated queries on unbounded data**: Any table that can grow without limit (campaigns, assignments) needs cursor-based pagination.
- **Keeping dead security code**: Dead auth code is worse than no code - it may be copy-pasted and create vulnerabilities.

## Don't Hand-Roll

This phase requires no new implementations - all solutions already exist in the codebase.

| Problem             | Don't Build          | Use Instead                        | Why                                                        |
| ------------------- | -------------------- | ---------------------------------- | ---------------------------------------------------------- |
| Redis caching       | Custom Redis wrapper | RedisCacheModule                   | Already implements tenant isolation, fail-open pattern     |
| Batch processing    | New batch framework  | processRemindersInBatches()        | Already implements cursor pagination with 100-item batches |
| WS JWT verification | New guard            | JwtKeyService pattern in AiGateway | Already RS256-compliant                                    |

**Key insight:** The work was done in Phase 34 and Phase 32. This phase is purely about connecting existing code.

## Common Pitfalls

### Pitfall 1: Assuming @Global() is Self-Activating

**What goes wrong:** Module created with `@Global()` but never imported - DI fails at runtime.
**Why it happens:** `@Global()` makes providers available to other modules once the module is loaded, but the module itself needs to be imported in AppModule to load.
**How to avoid:** Always import global modules in AppModule, even if they're not directly used there.
**Warning signs:** `Nest could not resolve dependencies of [ServiceName] (CACHE_MANAGER)` errors at startup.

### Pitfall 2: Method Exists But Not Called

**What goes wrong:** Correct implementation exists but caller uses wrong method.
**Why it happens:** Parallel development - one developer creates the batch method, another implements the scheduler without knowing about it.
**How to avoid:** Integration testing that verifies the caller uses the expected callee.
**Warning signs:** Dead code analysis shows public method with zero callers.

### Pitfall 3: Security Code Drift

**What goes wrong:** Auth code written against old security model (HS256) becomes incompatible after security hardening (RS256).
**Why it happens:** Security migrations don't always update all code paths, especially unused ones.
**How to avoid:** Delete dead auth code rather than updating it. If not used, it shouldn't exist.
**Warning signs:** Auth code that doesn't inject `JwtKeyService` after Phase 32.

### Pitfall 4: Not Verifying DI Resolution

**What goes wrong:** Assume module import is working without testing actual resolution.
**Why it happens:** Module compiles but providers fail to resolve at runtime.
**How to avoid:** After adding RedisCacheModule, run smoke test or verify one affected service starts without DI errors.
**Warning signs:** Services work in isolation but fail in full application context.

## Code Examples

### Fix 1: Register RedisCacheModule in AppModule

```typescript
// Source: apps/backend/src/app.module.ts
// Add import at top of file:
import { RedisCacheModule } from './common/cache.module';

// Add to @Module imports array (after StorageModule):
@Module({
  imports: [
    // ... existing imports ...
    StorageModule, // Low-level file storage (used by AttachmentsModule)
    RedisCacheModule, // Phase 34: Global Redis-backed caching with tenant isolation
    // ... rest of imports ...
  ],
})
export class AppModule implements NestModule { ... }
```

**Verification:** After adding import, the following services should resolve CACHE_MANAGER without errors:

- `BrandingService` (branding.service.ts line 64)
- `OrganizationService` (organization.service.ts)
- `NotificationPreferenceService` (notifications/preference.service.ts)
- `OrgSettingsService` (notifications/org-settings.service.ts)
- `OperatorStatusService` (operations/hotline-ops/operator-status.service.ts)
- `EthicsPortalService` (portals/ethics/ethics-portal.service.ts)
- `TriagePreviewService` (disclosures/services/triage-preview.service.ts)

### Fix 2: Wire Batch Processor to Scheduler

```typescript
// Source: apps/backend/src/modules/campaigns/campaign-reminder.processor.ts
// In scheduledReminderCheck() at line 117-133:

// BEFORE (non-paginated, heap risk):
@Cron(CronExpression.EVERY_DAY_AT_8AM)
async scheduledReminderCheck(): Promise<void> {
  this.logger.log("Running scheduled reminder check");
  try {
    const reminders =
      await this.reminderService.findAssignmentsNeedingReminders();
    // ...
  }
}

// AFTER (cursor-based, scalable):
@Cron(CronExpression.EVERY_DAY_AT_8AM)
async scheduledReminderCheck(): Promise<void> {
  this.logger.log("Running scheduled reminder check");
  try {
    // Use cursor-based batch processor for scalability (Phase 34)
    const processed = await this.reminderService.processRemindersInBatches();
    this.logger.log(`Scheduled check processed ${processed} assignments`);
  } catch (error) {
    this.logger.error("Error in scheduled reminder check", error);
  }
}
```

**Note:** The `processRemindersInBatches()` method handles its own queuing via `queueRemindersBulk()`, so the caller doesn't need to call `queueReminders()` separately.

### Fix 3: Delete JwtWsGuard (Dead Code Removal)

```bash
# Delete the guard file
rm apps/backend/src/modules/auth/guards/jwt-ws.guard.ts

# Delete the test file
rm apps/backend/src/modules/auth/guards/jwt-ws.guard.spec.ts
```

**Verification:** After deletion:

1. `grep -r "JwtWsGuard" apps/backend/src` should return no results
2. Backend should compile without errors (guard was never imported anywhere)
3. WebSocket connections to AiGateway should continue working (uses JwtKeyService directly)

## State of the Art

| Old Approach               | Current Approach              | When Changed | Impact                                     |
| -------------------------- | ----------------------------- | ------------ | ------------------------------------------ |
| HS256 for JWT (symmetric)  | RS256 for JWT (asymmetric)    | Phase 32     | JwtWsGuard incompatible                    |
| Load all pending reminders | Cursor-based batch (100/page) | Phase 34     | findAssignmentsNeedingReminders() bypassed |
| In-memory caching          | Redis-backed caching          | Phase 34     | RedisCacheModule created but orphaned      |

**Deprecated/outdated:**

- `JwtWsGuard`: Uses HS256, incompatible with RS256 enforcement. Delete.
- `findAssignmentsNeedingReminders()` for full loads: Still exists for small queries, but scheduler must use batch processor.

## Open Questions

None. All three fixes are fully specified with no ambiguity:

1. **RedisCacheModule**: One import line in app.module.ts
2. **Batch processor**: One method call change in campaign-reminder.processor.ts
3. **JwtWsGuard**: Two file deletions (guard + spec)

## Sources

### Primary (HIGH confidence)

- `apps/backend/src/app.module.ts` - Verified RedisCacheModule not imported (line-by-line review)
- `apps/backend/src/common/cache.module.ts` - Verified @Global() and exports (full file review)
- `apps/backend/src/modules/campaigns/campaign-reminder.processor.ts` - Verified scheduledReminderCheck calls wrong method (lines 117-133)
- `apps/backend/src/modules/campaigns/campaign-reminder.service.ts` - Verified processRemindersInBatches exists (lines 139-222)
- `apps/backend/src/modules/auth/guards/jwt-ws.guard.ts` - Verified uses JWT_SECRET (line 83-84)
- `apps/backend/src/modules/ai/ai.gateway.ts` - Verified correct RS256 pattern (lines 429-436)
- `apps/backend/src/modules/auth/services/jwt-key.service.ts` - Verified RS256 key management (full file review)
- `.planning/milestones/v1.2-INTEGRATION.md` - Integration report with detailed findings

### Secondary (MEDIUM confidence)

- `.planning/v1.2-MILESTONE-AUDIT.md` - Audit report identifying gaps

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - all libraries already in use, verified in codebase
- Architecture: HIGH - patterns verified by reading existing code
- Pitfalls: HIGH - root causes identified from actual code analysis

**Research date:** 2026-02-19
**Valid until:** Permanent - these are bug fixes, not library choices

---

## Implementation Checklist

For the planner:

- [ ] Task 1: Import RedisCacheModule in AppModule (CRITICAL)
  - Add import statement
  - Add to imports array after StorageModule
  - Verify affected services resolve CACHE_MANAGER

- [ ] Task 2: Wire processRemindersInBatches to scheduler (MEDIUM)
  - Replace method call in scheduledReminderCheck()
  - Update log message format
  - No need to call queueReminders() separately

- [ ] Task 3: Delete JwtWsGuard and spec (MEDIUM)
  - Delete jwt-ws.guard.ts
  - Delete jwt-ws.guard.spec.ts
  - Verify no import references remain
  - Verify WebSocket connections still work

**Total effort estimate:** 30 minutes of actual code changes + verification
