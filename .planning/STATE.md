# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-15)

**Core value:** Users can manage their entire compliance workflow - from anonymous report intake to investigation closure to board reporting - in one AI-assisted platform, with every task unified into a single "My Work" view.
**Current focus:** v1.2 Production Hardening & Feature Completion

## Current Position

Phase: 33 of 36 (Slop Cleanup & Production Readiness)
Plan: 2 of 6 complete
Status: In progress
Last activity: 2026-02-16 — Completed 33-02-PLAN.md (Document Processing & File Validation)

Progress: v1.0 + v1.1 complete. v1.2 Phase 32 COMPLETE, Phase 33 IN PROGRESS (2/6 plans).

## Shipped Milestones

| Milestone                    | Phases | Plans | Requirements | Shipped    |
| ---------------------------- | ------ | ----- | ------------ | ---------- |
| v1.0 Feature Build           | 1-25.1 | 242+  | 149          | 2026-02-13 |
| v1.1 Code Review Remediation | 26-31  | 43    | 36           | 2026-02-15 |

## v1.2 Milestone Overview

**Phases:** 8 total (5 new remediation + 3 continued feature)
**Requirements:** 77 (55 Track 1 + 22 Track 2)
**Target:** D+ to B+ overall code quality grade

| Track                | Phases             | Requirements | Focus                                |
| -------------------- | ------------------ | ------------ | ------------------------------------ |
| Track 1: Remediation | 32, 33, 34, 35, 36 | 55           | Security, slop, perf, quality, tests |
| Track 2: Features    | 22, 23, 25.1       | 22           | Dark mode, help system, case detail  |

**Execution Order:**

1. Phase 32: Security & SOC 2 (CRITICAL) - 13 requirements [COMPLETE - 8/8 plans]
2. Phase 33: Slop Cleanup + Production - 16 requirements
3. Phase 34: Performance & Scalability - 11 requirements
4. Phase 35: Code Quality & Architecture - 5 requirements
5. Phase 36: Test Coverage Expansion - 10 requirements
6. Phase 22: Dark Mode & Theme - 7 requirements (existing plans)
7. Phase 23: Help & Support System - 5 requirements (existing plans)
8. Phase 25.1: Case Detail Vision - 10 requirements (existing plans)

## Accumulated Context

### Key Decisions

- v1.2 dual-track: code review remediation (6 dimensions, B+ target) + unfinished feature phases
- Pre-Series A code review found D+ overall grade - security D+, tests F, performance C
- Track 2 phases (22, 23, 25.1) use existing plans from v1.0 - do NOT re-plan
- Phase ordering: Security FIRST, then cleanup, perf, quality, tests, then features
- ESLint max-lines guardrail (warn at 500 LOC) prevents service bloat
- 32-01: Employee attestation endpoints allow all authenticated roles
- 32-01: userName derived from user.firstName + user.lastName in checklist controller
- 32-03: WebSocket JWT verification extracts context from verified payload only (SEC-02)
- 32-03: Use JwtKeyService.getAlgorithm() for algorithm-aware verification
- 32-04: RS256 only for JWT - removed HS256 from all verification points (CVE-2015-9235)
- 32-04: Fail closed on unknown algorithm - no fallback to weaker algorithms
- 32-04: Startup validation throws error if JWT_REFRESH_SECRET undefined
- 32-02: MigrationController and PolicyApprovalController secured with JWT guards and proper decorators
- 32-02: Used optional type for decorator parameters in multipart upload endpoints
- 32-05: organizationId removed from CreateChatDto - must come from authenticated context
- 32-05: AiClientService accepts organizationId as separate parameter for logging
- 32-05: Permanent demo accounts use DEMO_ACCOUNT_PASSWORD environment variable with fallback
- 32-05: @MaxLength(72) on password fields to prevent bcrypt CPU exhaustion
- 32-07: MessageRelayService audit logs use AuditActionCategory.ACCESS
- 32-07: MFA logs use user.id instead of user.email (PII minimization)
- 32-07: Operations middleware exemptions are specific internal/\* routes
- 32-06: mfaVerified stored in both access and refresh tokens for session persistence
- 32-06: MfaGuard checks user.mfaVerified from RequestUser (JWT payload)
- 33-01: Use ConfigService.getOrThrow for required config values (fail fast pattern)
- 33-01: Module-level Logger for useFactory initialization logging
- 33-02: Downgraded pdf-parse to v1.1.1 for CommonJS compatibility (v2.x is ESM-only)
- 33-02: Dynamic ESM import pattern for file-type in CommonJS: await import('file-type')
- 33-02: Dual file validation: extension blocklist + magic byte verification for defense in depth
- 33-02: Text files (.txt, .csv, .json, etc.) bypass magic byte check since they have no magic bytes

### Blockers

None currently.

## Session Continuity

Last session: 2026-02-16T00:37:55Z
Stopped at: Completed 33-02-PLAN.md (Document Processing & File Validation)
Resume file: None
Next action: Execute 33-03-PLAN.md
