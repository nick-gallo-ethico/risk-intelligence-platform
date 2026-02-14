---
phase: 29-error-handling-reliability
plan: 04
subsystem: frontend
tags: [error-handling, offline-storage, auth, localStorage, decryption]

# Dependency graph
requires:
  - phase: 08-ethics-portal
    provides: offline draft storage (ethics-offline-db.ts), auth context and storage
provides:
  - DecryptedDraft interface with _decryptionFailed flag for UI error display
  - Logout failure logging for debugging server-side session invalidation
  - Auth storage corruption detection and cleanup
affects: [frontend-error-handling, auth-debugging, offline-drafts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "_decryptionFailed flag pattern for UI error surfacing"
    - "console.warn for non-fatal errors that proceed successfully"
    - "localStorage corruption cleanup on parse failure"

key-files:
  created: []
  modified:
    - apps/frontend/src/lib/ethics-offline-db.ts
    - apps/frontend/src/contexts/auth-context.tsx
    - apps/frontend/src/lib/auth-storage.ts

key-decisions:
  - "Use _decryptionFailed flag (not exception) so UI can render draft metadata with error message"
  - "Use console.warn (not console.error) for logout failures since local logout still succeeds"
  - "Clear corrupted localStorage entries on detection to prevent repeated parse errors"

patterns-established:
  - "_decryptionFailed flag: Return object with flag instead of throwing, enabling partial rendering"
  - "console.warn for recoverable failures: When operation succeeds locally but fails remotely"
  - "Corruption cleanup: Log context then clear bad data, return null"

# Metrics
duration: 15min
completed: 2026-02-14
---

# Phase 29 Plan 04: Frontend Error Surfacing Summary

**Three frontend silent failure patterns now surface errors: offline draft decryption returns \_decryptionFailed flag, auth logout logs server-side failures, auth storage logs and clears corrupted entries**

## Performance

- **Duration:** 15 min
- **Started:** 2026-02-14T19:55:53Z
- **Completed:** 2026-02-14T20:11:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments

- DecryptedDraft interface with \_decryptionFailed flag enables UI to show error message when offline draft decryption fails
- Logout callbacks log server-side session invalidation failures for debugging while still completing local logout
- Auth storage getUser() logs corruption details and clears corrupted entry to prevent repeated parse errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add \_decryptionFailed flag to offline draft decryption** - `d673d95` (included in 29-02 commit via lint-staged)
2. **Task 2: Add logout failure logging to auth context** - `d05c882` (feat)
3. **Task 3: Add corruption handling to auth storage** - `f7e6993` (feat)

_Note: Task 1 was picked up by lint-staged during 29-02 commit due to file being staged for formatting_

## Files Created/Modified

- `apps/frontend/src/lib/ethics-offline-db.ts` - DecryptedDraft interface with \_decryptionFailed flag, decryptDraft() returns flag on failure with console.error logging
- `apps/frontend/src/contexts/auth-context.tsx` - logout() and logoutAll() callbacks log server-side failures with console.warn
- `apps/frontend/src/lib/auth-storage.ts` - getUser() logs corrupted data, clears bad entry, returns null

## Decisions Made

- **\_decryptionFailed flag vs exception**: Return object with flag instead of throwing, so UI can still show draft metadata (id, localId, dates) with "decryption failed" message rather than complete failure
- **console.warn vs console.error for logout**: warn is appropriate since local logout succeeds - this is informational for debugging, not an error preventing operation
- **Clear corrupted data**: Remove bad localStorage entry on detection rather than leaving it to fail repeatedly - user will need to re-authenticate anyway

## Deviations from Plan

### Process Deviation

**Task 1 committed with wrong plan scope**

- **Issue:** ethics-offline-db.ts was modified and staged but lint-staged included it in the 29-02 commit
- **Impact:** Code is correct and committed, but attribution is in wrong commit (d673d95 instead of a dedicated 29-04 commit)
- **Resolution:** Noted in summary, no code fix needed as functionality is correct

---

**Total deviations:** 1 process deviation (lint-staged timing)
**Impact on plan:** No functional impact. All three patterns correctly implemented.

## Issues Encountered

- Git commit race condition with lint-staged caused Task 1 changes to be included in previous plan's commit. The pre-commit hooks backed up and restored state, but the first commit attempt's changes persisted. Verified code correctness; commit attribution is documented.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Frontend error surfacing complete for ERR-04, ERR-06, ERR-07
- UI components can now check \_decryptionFailed flag on DecryptedDraft objects
- Auth debugging improved with logged session invalidation failures
- Ready for 29-05 (remaining error handling patterns)

---

_Phase: 29-error-handling-reliability_
_Completed: 2026-02-14_
