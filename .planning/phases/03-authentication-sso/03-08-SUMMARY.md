---
phase: 03-authentication-sso
plan: 08
subsystem: authentication
tags: [mfa, totp, security, recovery-codes]
dependency-graph:
  requires: ["03-01", "03-02"]
  provides: ["MfaService", "MfaController", "MfaGuard", "RecoveryCodesService"]
  affects: ["auth-flow", "sensitive-operations"]
tech-stack:
  added: ["otplib@13.2.1", "qrcode@1.5.4", "@types/qrcode"]
  patterns: ["TOTP RFC 6238", "recovery codes", "audit logging"]
key-files:
  created:
    - apps/backend/src/modules/auth/mfa/mfa.service.ts
    - apps/backend/src/modules/auth/mfa/mfa.controller.ts
    - apps/backend/src/modules/auth/mfa/mfa.module.ts
    - apps/backend/src/modules/auth/mfa/recovery-codes.service.ts
    - apps/backend/src/modules/auth/mfa/dto/mfa.dto.ts
    - apps/backend/src/modules/auth/mfa/index.ts
    - apps/backend/src/modules/auth/guards/mfa.guard.ts
  modified:
    - apps/backend/package.json
    - apps/backend/src/modules/auth/auth.module.ts
    - apps/backend/src/modules/auth/guards/index.ts
decisions:
  - id: "03-08-01"
    decision: "otplib v13 with NobleCryptoPlugin and ScureBase32Plugin"
    rationale: "Modern maintained library, plugin architecture for crypto"
  - id: "03-08-02"
    decision: "10 recovery codes, 8 hex chars each, SHA-256 hashed"
    rationale: "Industry standard count, secure hashing prevents database exposure"
  - id: "03-08-03"
    decision: "verify(token, {secret}) API pattern"
    rationale: "otplib v13 uses 2-argument verify signature"
  - id: "03-08-04"
    decision: "Rate limits: 3/min for verify, 5-10/hour for setup operations"
    rationale: "Strict on verify to prevent brute force, reasonable for setup"
metrics:
  duration: "15 min"
  completed: "2026-02-03"
---

# Phase 03 Plan 08: MFA/TOTP with Recovery Codes Summary

TOTP-based MFA with recovery codes using otplib v13 and secure audit logging.

## What Was Built

### Core Services

**MfaService** (`apps/backend/src/modules/auth/mfa/mfa.service.ts`)
- TOTP generation using `otplib` v13 with `NobleCryptoPlugin` and `ScureBase32Plugin`
- QR code generation using `qrcode` library
- Verify-before-enable pattern to prevent lockout
- Recovery code integration for backup access
- All operations logged to audit trail with SECURITY category

**RecoveryCodesService** (`apps/backend/src/modules/auth/mfa/recovery-codes.service.ts`)
- Generates 10 cryptographically secure 8-character hex codes
- SHA-256 hashing before database storage
- One-time use with index-based removal

### API Endpoints

**MfaController** (`apps/backend/src/modules/auth/mfa/mfa.controller.ts`)
| Endpoint | Method | Rate Limit | Description |
|----------|--------|------------|-------------|
| `/api/v1/auth/mfa/status` | GET | None | Get MFA status |
| `/api/v1/auth/mfa/setup` | POST | 5/hour | Initiate setup (returns QR) |
| `/api/v1/auth/mfa/setup/verify` | POST | 10/hour | Verify and enable |
| `/api/v1/auth/mfa/verify` | POST | 3/min | Verify during login |
| `/api/v1/auth/mfa` | DELETE | 3/hour | Disable MFA |
| `/api/v1/auth/mfa/recovery-codes/regenerate` | POST | 3/hour | Regenerate codes |

### Security Components

**MfaGuard** (`apps/backend/src/modules/auth/guards/mfa.guard.ts`)
- Protects sensitive operations requiring MFA
- Checks `mfaVerified` flag in JWT
- Allows access if MFA not enabled

## Key Implementation Details

### otplib v13 API
```typescript
// Configure with plugins
this.totp = new TOTP({
  digits: 6,
  period: 30,
  crypto: new NobleCryptoPlugin(),
  base32: new ScureBase32Plugin(),
});

// Verify with 2-argument signature
const result = await this.totp.verify(token, { secret });
if (result.valid) { ... }
```

### Recovery Code Flow
1. Generate 10 codes with `crypto.randomBytes(4).toString('hex').toUpperCase()`
2. Hash with SHA-256 before storing in `user.mfaRecoveryCodes`
3. On verify: hash input, find index in stored array
4. If found: splice out used code, log to audit

### Audit Events
- `MFA_ENABLED` - User enabled MFA
- `MFA_DISABLED` - User disabled MFA
- `MFA_RECOVERY_CODE_USED` - Recovery code consumed
- `MFA_RECOVERY_CODES_REGENERATED` - New codes generated

## Files Created/Modified

### Created (7 files)
- `apps/backend/src/modules/auth/mfa/dto/mfa.dto.ts` - DTOs with validation
- `apps/backend/src/modules/auth/mfa/recovery-codes.service.ts` - Recovery code logic
- `apps/backend/src/modules/auth/mfa/mfa.service.ts` - TOTP operations
- `apps/backend/src/modules/auth/mfa/mfa.controller.ts` - API endpoints
- `apps/backend/src/modules/auth/mfa/mfa.module.ts` - Module definition
- `apps/backend/src/modules/auth/mfa/index.ts` - Barrel export
- `apps/backend/src/modules/auth/guards/mfa.guard.ts` - MFA protection guard

### Modified (3 files)
- `apps/backend/package.json` - Added otplib, qrcode, @types/qrcode
- `apps/backend/src/modules/auth/auth.module.ts` - Import/export MfaModule
- `apps/backend/src/modules/auth/guards/index.ts` - Export MfaGuard

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Use otplib v13 (not speakeasy) | speakeasy unmaintained 7+ years; otplib actively maintained |
| Use plugin architecture | NobleCrypto for HMAC, ScureBase32 for encoding |
| 10 recovery codes | Industry standard (GitHub, Google use 10-12) |
| SHA-256 hashing | Prevents recovery code exposure from DB breach |
| Strict verify rate limit (3/min) | Prevent brute force on 6-digit code |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] otplib v13 API breaking changes**
- **Found during:** Task 2 - MfaService implementation
- **Issue:** Plan referenced `authenticator` export from otplib (v12 API), but v13 uses class-based TOTP with plugin architecture
- **Fix:** Rewrote MfaService to use `new TOTP({...plugins})` pattern with `NobleCryptoPlugin` and `ScureBase32Plugin`
- **Files modified:** `mfa.service.ts`
- **Commit:** feac266

**2. [Rule 1 - Bug] verify() signature changed**
- **Found during:** Task 2 - TypeScript compilation
- **Issue:** v13 uses `verify(token, {secret})` instead of `verify({token, secret})`
- **Fix:** Updated all verify calls to use 2-argument signature
- **Files modified:** `mfa.service.ts`
- **Commit:** feac266

## Verification Results

| Check | Status |
|-------|--------|
| TypeScript compiles | PASS |
| Tests pass (178/178) | PASS |
| otplib installed | PASS (v13.2.1) |
| qrcode installed | PASS (v1.5.4) |
| Recovery codes hashed | PASS (SHA-256) |
| Audit events logged | PASS (SECURITY category) |

## Next Steps

1. **Auth flow integration** - Add MFA check after password login
2. **JWT mfaVerified flag** - Include in token payload after MFA verify
3. **Organization MFA policy** - Enforce MFA requirement per `TenantSsoConfig.mfaRequired`
4. **Frontend** - MFA setup wizard, recovery code display
