---
phase: 31-code-quality-performance
plan: 08
status: complete
subsystem: auth
tags: [jwt, rs256, security, key-rotation]
dependency-graph:
  requires: [31-01, 31-03]
  provides: [jwt-rs256-signing, key-rotation-mechanism]
  affects: [future-microservices, auth-infrastructure]
tech-stack:
  added: []
  patterns: [asymmetric-signing, key-rotation, dual-algorithm-migration]
key-files:
  created:
    - apps/backend/src/modules/auth/services/jwt-key.service.ts
  modified:
    - apps/backend/src/modules/auth/auth.module.ts
    - apps/backend/src/modules/auth/auth.service.ts
    - apps/backend/src/modules/auth/strategies/jwt.strategy.ts
    - apps/backend/src/config/configuration.ts
    - apps/backend/.env.example
decisions:
  - "RS256 auto-generated in development, env-configured in production"
  - "7-day key overlap period matches refresh token lifetime"
  - "Dual RS256/HS256 support during migration (existing tokens valid)"
  - "secretOrKeyProvider pattern for dynamic key resolution by kid"
metrics:
  duration: "~8 minutes"
  completed: "2026-02-15"
---

# Phase 31 Plan 08: JWT RS256 with Key Rotation Summary

JWT RS256 asymmetric signing with key rotation mechanism for improved security.

## One-liner

RS256 asymmetric JWT signing with kid-based key rotation and HS256 fallback for migration.

## What Was Built

### 1. JwtKeyService (326 lines)

New service managing RSA key pairs for JWT RS256 signing:

```typescript
// Key management methods
getSigningOptions(): JwtSigningOptions       // Get current signing config
getSigningKey(): string                      // Get private key for signing
getVerificationKey(kid?: string): string     // Get public key for verification
getKeyById(kid: string): JwtKeyPair          // Look up key by ID
rotateKey(): Promise<string>                 // Rotate to new key
getKeyStatus(): KeyStatusInfo                // Health check info
```

**Key Features:**

- **Development**: Auto-generates ephemeral RS256 keys on startup (no config needed)
- **Production**: Loads keys from environment variables
- **Rotation**: Old keys remain valid for 7 days (overlap period) after rotation
- **Migration**: Falls back to HS256 if RS256 not configured

### 2. RS256 Configuration

Updated `configuration.ts` with new jwt.rs256 section:

```typescript
jwt: {
  secret: "...",  // HS256 fallback
  rs256: {
    privateKey: process.env.JWT_RS256_PRIVATE_KEY,
    publicKey: process.env.JWT_RS256_PUBLIC_KEY,
    keyId: process.env.JWT_RS256_KEY_ID,
    rotationEnabled: true,
    keyOverlapDays: 7,
  },
  algorithm: "RS256",
}
```

### 3. Auth Module Integration

- Added `JwtKeyService` to providers and exports
- JwtModule configured to use RS256 when keys available
- Support for both algorithms during migration

### 4. JWT Strategy Updates

Dynamic key resolution using `secretOrKeyProvider`:

```typescript
secretOrKeyProvider: (request, rawJwtToken, done) => {
  const header = extractHeader(rawJwtToken);
  if (header?.kid) {
    // RS256: Look up key by kid
    done(null, jwtKeyService.getVerificationKey(header.kid));
  } else if (header?.alg === "RS256") {
    // RS256 without kid - use current key
    done(null, jwtKeyService.getVerificationKey());
  } else {
    // HS256 fallback
    done(null, configService.get("jwt.secret"));
  }
};
```

### 5. Auth Service Token Generation

Updated `generateTokens` to use RS256 when available:

```typescript
const signingOptions = this.jwtKeyService.getSigningOptions();

if (signingOptions.algorithm === "RS256") {
  accessSignOptions.algorithm = "RS256";
  accessSignOptions.privateKey = signingOptions.key;
  accessSignOptions.keyid = signingOptions.kid; // kid in JWT header
}
```

### 6. Environment Documentation

Comprehensive `.env.example` updates with:

- Key generation instructions (`openssl genrsa/rsa`)
- Base64 encoding for Docker/K8s environments
- Azure Key Vault integration notes
- Rotation configuration options

## Architecture Decisions

| Decision             | Rationale                                                       |
| -------------------- | --------------------------------------------------------------- |
| RS256 over HS256     | Private key never leaves auth service; public key distributable |
| 7-day key overlap    | Matches refresh token lifetime; no mass logout on rotation      |
| Auto-generate in dev | Zero-config development experience                              |
| HS256 fallback       | Graceful migration; existing tokens remain valid                |
| kid header           | Enables multi-key verification during rotation                  |

## Key Rotation Flow

```
1. Current state: Key A is signing key
2. rotateKey() called
3. Key B generated and set as current
4. Key A marked non-current, expiresAt = now + 7 days
5. New tokens signed with Key B (kid: B)
6. Old tokens with kid: A still verified (Key A not expired)
7. After 7 days, Key A removed from memory
```

## Migration Path

| Stage           | Action                                             |
| --------------- | -------------------------------------------------- |
| Pre-migration   | System uses HS256 with JWT_SECRET                  |
| Configure RS256 | Add JWT*RS256*\* env vars                          |
| Deploy          | New tokens use RS256, old HS256 tokens still valid |
| Wait 7+ days    | All HS256 tokens expired                           |
| Post-migration  | All tokens are RS256                               |

## Files Changed

| File                          | Change                                 |
| ----------------------------- | -------------------------------------- |
| `services/jwt-key.service.ts` | **New** - RS256 key management service |
| `services/index.ts`           | Export JwtKeyService                   |
| `auth.module.ts`              | Add provider, update JwtModule config  |
| `auth.service.ts`             | Use JwtKeyService for signing          |
| `strategies/jwt.strategy.ts`  | secretOrKeyProvider for dual-algo      |
| `config/configuration.ts`     | Add jwt.rs256 config section           |
| `.env.example`                | RS256 documentation and examples       |

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Hash    | Message                                                 |
| ------- | ------------------------------------------------------- |
| 1c9e317 | feat(31-08): add JwtKeyService for RS256 key management |
| d7d9385 | feat(31-08): integrate JwtKeyService with auth flow     |

## Verification

- [x] TypeScript compilation successful
- [x] JWT uses RS256 algorithm for signing new tokens
- [x] JwtKeyService manages keys with rotation support
- [x] Key rotation keeps old keys valid for token expiry duration
- [x] Dual-algorithm support enables migration without mass logout
- [x] Configuration documented in .env.example

## Next Phase Readiness

All success criteria met:

- JWT RS256 implementation complete
- Key rotation mechanism functional
- Migration path documented
- Phase 31 (Code Quality & Performance) now complete
