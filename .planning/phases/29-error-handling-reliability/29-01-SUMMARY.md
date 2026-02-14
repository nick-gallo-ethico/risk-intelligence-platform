---
phase: 29-error-handling-reliability
plan: 01
subsystem: error-handling
tags: [reliability, monitoring, logging, silent-failures]

dependency-graph:
  requires: []
  provides:
    [audit-failure-alerting, safe-attachment-deletion, ai-provider-logging]
  affects: [monitoring-integration, ops-visibility]

tech-stack:
  added: []
  patterns: [threshold-alerting, abort-on-failure, contextual-error-logging]

key-files:
  created: []
  modified:
    - apps/backend/src/modules/audit/audit.service.ts
    - apps/backend/src/modules/attachments/attachments.service.ts
    - apps/backend/src/modules/ai/services/provider-registry.service.ts

decisions:
  - id: audit-alert-threshold
    choice: "5 consecutive failures before alerting"
    rationale: "Balances sensitivity with noise reduction"
  - id: attachment-deletion-abort
    choice: "Abort DB deletion on storage failure (unless file missing)"
    rationale: "Prevents orphaned attachment records pointing to nonexistent files"
  - id: ai-provider-error-context
    choice: "Capture provider name before try block"
    rationale: "Ensures error message includes which provider failed"

metrics:
  duration: "15 minutes"
  completed: "2026-02-14"
---

# Phase 29 Plan 01: Service-Level Reliability Improvements Summary

**One-liner:** AuditService threshold alerting, safe attachment deletion that prevents orphans, and AI provider error logging with context.

## What Was Built

### Task 1: AuditService Failure Counting with Threshold Alerting

Added consecutive failure tracking to the AuditService to detect and alert on persistent audit logging issues.

**Changes to `audit.service.ts`:**

- Added `consecutiveFailures` counter (starts at 0)
- Added `FAILURE_THRESHOLD` constant (5)
- Injected `EventEmitter2` for monitoring event emission
- On successful audit log: reset counter to 0
- On failure: increment counter, check threshold
- When threshold reached: emit `monitoring.alert` event with:
  - `type: 'AUDIT_TRAIL_GAP'`
  - `severity: 'CRITICAL'`
  - `context: { lastError: ... }`
- Reset counter after alerting to prevent alert flooding

**Key code pattern:**

```typescript
if (this.consecutiveFailures >= this.FAILURE_THRESHOLD) {
  this.eventEmitter.emit("monitoring.alert", {
    type: "AUDIT_TRAIL_GAP",
    message: "5 consecutive audit log failures",
    severity: "CRITICAL",
    context: { lastError: error instanceof Error ? error.message : "Unknown" },
  });
  this.consecutiveFailures = 0;
}
```

### Task 2: Safe Attachment Deletion (Abort on Storage Failure)

Modified attachment deletion to abort the database deletion if storage deletion fails, preventing orphaned attachment records.

**Changes to `attachments.service.ts`:**

- Added `InternalServerErrorException` import
- Modified delete() method storage deletion logic:
  - If storage deletion fails: check if it's a "not found" error
  - If not found: proceed (file already missing, just clean up DB)
  - If other error: throw `InternalServerErrorException` and abort
  - Log error with fileKey context for debugging

**Key code pattern:**

```typescript
if (!isNotFound) {
  this.logger.error(
    `Storage deletion failed for ${attachment.fileKey}; aborting DB deletion to prevent orphan`,
    error,
  );
  throw new InternalServerErrorException(
    "Failed to delete file from storage. Please try again.",
  );
}
```

### Task 3: AI Provider tryGetProvider() Error Logging

Enhanced the tryGetProvider() method to log errors with provider name before returning null.

**Changes to `provider-registry.service.ts`:**

- Capture `providerName` before try block (resolves default if not specified)
- Log error with provider name, error message, and stack trace
- Return null after logging (preserves graceful degradation)

**Key code pattern:**

```typescript
tryGetProvider(name?: string): AIProvider | null {
  const providerName = name || this.defaultProviderName;
  try {
    return this.getProvider(providerName);
  } catch (error) {
    this.logger.error(
      `Failed to get AI provider '${providerName}': ${error instanceof Error ? error.message : "Unknown error"}`,
      error instanceof Error ? error.stack : undefined,
    );
    return null;
  }
}
```

## Verification Results

| Check              | Result |
| ------------------ | ------ |
| TypeScript compile | PASS   |
| Pre-commit hooks   | PASS   |
| Unit tests (274)   | PASS   |

## Deviations from Plan

**Note:** Task 2 (attachments.service.ts changes) was committed as part of a parallel execution (commit `d673d95` with message `feat(29-02)`). The changes were applied correctly, but the commit message references 29-02. This is a labeling artifact from concurrent plan execution, not a functional issue.

## Files Modified

| File                                                                | Change                                    |
| ------------------------------------------------------------------- | ----------------------------------------- |
| `apps/backend/src/modules/audit/audit.service.ts`                   | Added failure counter, threshold alerting |
| `apps/backend/src/modules/attachments/attachments.service.ts`       | Abort on storage failure, prevent orphans |
| `apps/backend/src/modules/ai/services/provider-registry.service.ts` | Error logging with provider name          |

## Commits

| Hash      | Description                                           |
| --------- | ----------------------------------------------------- |
| `120a652` | AuditService failure counting with threshold alerting |
| `d673d95` | (includes Task 2) Safe attachment deletion            |
| `520bc35` | AI provider tryGetProvider() error logging            |

## Audit Findings Addressed

| ID     | Finding                                             | Resolution                                   |
| ------ | --------------------------------------------------- | -------------------------------------------- |
| ERR-02 | AuditService swallows errors silently               | Added threshold alerting via EventEmitter    |
| ERR-03 | Attachment deletion continues after storage failure | Now aborts to prevent orphaned records       |
| ERR-08 | AI provider failures logged without context         | Now logs provider name before returning null |

## Next Phase Readiness

Ready to proceed with 29-02 (already started in parallel execution).
