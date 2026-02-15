---
phase: 32
plan: 05
subsystem: security-dto-validation
tags: [security, dto, validation, password, uuid, tenant-isolation]
depends_on:
  requires: [32-01, 32-02, 32-03, 32-04]
  provides: ["Secure DTO validation", "Random password generation", "UUID validation"]
  affects: [ai-module, auth-module, demo-module]
tech-stack:
  added: []
  patterns: ["@IsUUID for ID fields", "@MaxLength for password fields", "crypto.randomBytes for passwords"]
key-files:
  created: []
  modified:
    - apps/backend/src/modules/ai/dto/chat-message.dto.ts
    - apps/backend/src/modules/ai/services/ai-client.service.ts
    - apps/backend/src/modules/analytics/exports/services/report-ai-summary.service.ts
    - apps/backend/src/modules/auth/dto/login.dto.ts
    - apps/backend/src/modules/demo/demo.service.ts
    - apps/backend/src/modules/demo/demo.controller.ts
    - apps/backend/src/modules/demo/dto/provision-prospect.dto.ts
decisions:
  - decision: "organizationId removed from CreateChatDto - must come from authenticated context"
    rationale: "SEC-05: Prevents tenant spoofing via request body manipulation"
  - decision: "AiClientService accepts organizationId as separate parameter for logging"
    rationale: "Maintains logging capability without accepting from request body"
  - decision: "Permanent demo accounts use DEMO_ACCOUNT_PASSWORD environment variable"
    rationale: "Allows configuration without code changes, fallback to Demo2026!"
metrics:
  duration: "~10 minutes"
  completed: "2026-02-15"
---

# Phase 32 Plan 05: DTO Security Fixes Summary

**One-liner:** Fixed DTO security vulnerabilities: removed organizationId from chat DTO, added @IsUUID validation, @MaxLength(72) on passwords, and replaced hardcoded Password123! with crypto.randomBytes().

## What Was Done

### Task 1: Remove organizationId and Add @IsUUID to CreateChatDto
**Commit:** 46528b6

**SEC-05 Fix:** Removed `organizationId` field from `CreateChatDto` - this prevents tenant spoofing attacks where an attacker could include a different organizationId in the request body to access another tenant's data.

**SEC-08 Fix:** Added `@IsUUID('4')` validation to `entityId` field to prevent injection attacks.

**Changes:**
- `chat-message.dto.ts`: Removed organizationId field, added @IsUUID to entityId
- `ai-client.service.ts`: Updated `createChat()` and `streamChat()` to accept organizationId as a separate parameter
- `report-ai-summary.service.ts`: Updated calls to pass organizationId correctly

### Task 2: Add MaxLength to LoginDto Password
**Commit:** 0c46969

**SEC-07 Fix:** Added `@MaxLength(72)` to the password field in LoginDto. This prevents bcrypt CPU exhaustion attacks where malicious 1MB+ passwords could cause DoS by consuming excessive CPU cycles during hashing.

**Technical note:** bcrypt only uses the first 72 bytes of a password anyway, so this validation has no functional impact on legitimate users while protecting against attacks.

### Task 3: Replace Hardcoded Demo Password
**Commit:** 27cd802

**SEC-06 Fix:** Replaced all instances of hardcoded `Password123!` with secure alternatives:

1. **Prospect accounts:** Now use `crypto.randomBytes(18).toString('base64url')` generating 192-bit random passwords
2. **Permanent demo accounts:** Now use `DEMO_ACCOUNT_PASSWORD` environment variable with a safer fallback

**Changes:**
- `demo.service.ts`: Added `generateSecurePassword()` function using crypto.randomBytes
- `demo.controller.ts`: Updated to use generated passwords for prospects and env var for permanent accounts
- `ProvisionResult` interface now includes `plaintextPassword` field for secure credential sharing
- Updated DTO example to not include the hardcoded password

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Controller also had hardcoded password**
- **Found during:** Task 3
- **Issue:** `demo.controller.ts` had hardcoded Password123! in two places (prospect response and demo credentials endpoint)
- **Fix:** Updated controller to use generated password for prospects and environment variable for permanent accounts
- **Files modified:** `demo.controller.ts`
- **Commit:** 27cd802

**2. [Rule 2 - Missing Critical] DTO example had hardcoded password**
- **Found during:** Task 3
- **Issue:** `provision-prospect.dto.ts` had Password123! as an example value
- **Fix:** Changed example to a placeholder "xK8_Secure_rAnDoM"
- **Files modified:** `provision-prospect.dto.ts`
- **Commit:** 27cd802

## Security Issues Addressed

| Issue | Severity | Fix |
|-------|----------|-----|
| SEC-05: organizationId from request body | High | Removed from DTO, enforced from auth context |
| SEC-06: Hardcoded Password123! | Medium | crypto.randomBytes + environment variable |
| SEC-07: bcrypt CPU exhaustion | Medium | @MaxLength(72) on password fields |
| SEC-08: @IsUUID missing on ID fields | Medium | Added @IsUUID('4') validation |

## Files Modified

| File | Changes |
|------|---------|
| `ai/dto/chat-message.dto.ts` | Removed organizationId, added @IsUUID to entityId |
| `ai/services/ai-client.service.ts` | Accept organizationId as separate parameter |
| `analytics/exports/services/report-ai-summary.service.ts` | Updated createChat calls |
| `auth/dto/login.dto.ts` | Added @MaxLength(72) to password |
| `demo/demo.service.ts` | Added generateSecurePassword(), ProvisionResult.plaintextPassword |
| `demo/demo.controller.ts` | Use generated/env passwords instead of hardcoded |
| `demo/dto/provision-prospect.dto.ts` | Updated example password |

## Verification Results

All security fixes verified:

```bash
# No organizationId in chat DTO (except comment)
grep "organizationId" chat-message.dto.ts | grep -v "SEC-05" → no results

# @IsUUID on entityId
grep "@IsUUID" chat-message.dto.ts → found at line 31

# MaxLength(72) on password
grep "MaxLength" login.dto.ts → found at lines 1 and 19

# No Password123 in code (except comments explaining fix)
grep "Password123" demo/*.ts | grep -v "SEC-06" → no results
```

## Next Steps

- Plan 32-06: Remaining security fixes
- Plan 32-07: Additional SOC 2 compliance items
- Plan 32-08: Security documentation and audit trail
