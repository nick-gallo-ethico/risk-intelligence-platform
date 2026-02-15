# Phase 32: Security & SOC 2 Fixes - Research

**Researched:** 2026-02-15
**Domain:** Application Security, JWT Authentication, Multi-Tenancy, SOC 2 Compliance
**Confidence:** HIGH

## Summary

This phase addresses 13 critical security vulnerabilities identified in a pre-Series A code review. The codebase has significant authentication bypass vulnerabilities (7 unauthenticated controllers, WebSocket auth bypass), JWT algorithm confusion risks (CVE-2015-9235), and SOC 2 audit logging gaps. All issues stem from development shortcuts that must be remediated before production deployment.

The primary attack vectors are:

1. **Tenant Isolation Bypass:** Controllers using hardcoded `TEMP_ORG_ID` allow any request to access demo tenant data without authentication
2. **WebSocket Auth Bypass:** AI gateway trusts client-provided `organizationId`/`userId` from handshake instead of verifying JWT
3. **JWT Algorithm Confusion:** Accepting both RS256 and HS256 allows attackers to forge tokens using public key as HMAC secret
4. **Input Validation Gaps:** Missing `@MaxLength()` on passwords enables bcrypt CPU exhaustion; `@IsString()` on ID fields allows injection

**Primary recommendation:** Fix authentication guards on all controllers FIRST, then address JWT algorithm pinning and WebSocket auth, followed by DTO validation hardening.

## Standard Stack

The fixes use existing NestJS libraries already in the codebase:

### Core

| Library            | Version | Purpose                    | Why Standard                           |
| ------------------ | ------- | -------------------------- | -------------------------------------- |
| `@nestjs/passport` | 10.x    | JWT authentication         | Already integrated, proven pattern     |
| `@nestjs/jwt`      | 10.x    | Token signing/verification | RS256 support built-in                 |
| `class-validator`  | 0.14.x  | DTO validation             | Already used, adds @IsUUID, @MaxLength |
| `passport-jwt`     | 4.x     | JWT strategy               | Supports algorithm whitelisting        |

### Supporting

| Library  | Version  | Purpose                    | When to Use            |
| -------- | -------- | -------------------------- | ---------------------- |
| `crypto` | built-in | Random password generation | Demo account passwords |
| `uuid`   | 9.x      | UUID validation regex      | Verifying ID format    |

### Alternatives Considered

| Instead of              | Could Use    | Tradeoff                                  |
| ----------------------- | ------------ | ----------------------------------------- |
| class-validator @IsUUID | custom regex | @IsUUID is standard, handles all versions |
| crypto.randomBytes      | uuid v4      | crypto is built-in, no dependency         |

**No new installations needed** - all libraries already present.

## Architecture Patterns

### Pattern 1: Controller Authentication Guard Stack

**What:** Every controller endpoint MUST use the triple guard stack: `JwtAuthGuard`, `TenantGuard`, `RolesGuard`

**When to use:** ALL authenticated endpoints (everything except public routes)

**Example:**

```typescript
// Source: Existing pattern in apps/backend/src/modules/cases/cases.controller.ts
@Controller("api/v1/campaigns")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
export class CampaignsController {
  @Get()
  @Roles(Role.COMPLIANCE_OFFICER, Role.TRIAGE_LEAD)
  findAll(
    @TenantId() organizationId: string, // From JWT, not hardcoded
    @CurrentUser() user: RequestUser, // From JWT validation
    @Query() query: CampaignQueryDto,
  ) {
    return this.service.findAll(organizationId, query);
  }
}
```

**Anti-pattern to avoid:**

```typescript
// WRONG: Hardcoded tenant ID bypasses all security
const TEMP_ORG_ID = "00000000-0000-0000-0000-000000000001";
@Get()
findAll() {
  return this.service.findAll(TEMP_ORG_ID); // SECURITY HOLE
}
```

### Pattern 2: WebSocket JWT Verification

**What:** WebSocket gateways MUST verify JWT from handshake auth header, not trust client-provided context

**When to use:** All WebSocket gateways (AI, Notifications, Projects)

**Example:**

```typescript
// Source: Best practice from NestJS WebSocket authentication patterns
private async extractContext(client: Socket): Promise<SocketContext | null> {
  const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token) return null;

  try {
    // VERIFY JWT - don't trust client claims
    const payload = await this.jwtService.verifyAsync(token, {
      algorithms: ['RS256'],  // Pin to RS256 only
    });

    return {
      organizationId: payload.organizationId,  // From verified JWT
      userId: payload.sub,                     // From verified JWT
      userRole: payload.role,                  // From verified JWT
      permissions: this.getPermissionsForRole(payload.role),
    };
  } catch {
    return null;
  }
}
```

### Pattern 3: JWT Algorithm Pinning

**What:** JWT verification MUST explicitly allow only RS256 algorithm

**When to use:** All JWT verification (strategy, middleware, WebSocket)

**Example:**

```typescript
// Source: CVE-2015-9235 mitigation - https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/
// In jwt.strategy.ts - REMOVE HS256 from algorithms
const options: StrategyOptions = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  ignoreExpiration: false,
  secretOrKeyProvider,
  algorithms: ["RS256"], // ONLY RS256 - prevents algorithm confusion attack
};
```

### Pattern 4: Startup Validation for Required Secrets

**What:** Application MUST fail to start if critical secrets are undefined

**When to use:** JWT_REFRESH_SECRET, JWT_SECRET, database credentials

**Example:**

```typescript
// Source: Defense-in-depth pattern
// In auth.module.ts or bootstrap
const refreshSecret = configService.get<string>("JWT_REFRESH_SECRET");
if (!refreshSecret) {
  throw new Error("FATAL: JWT_REFRESH_SECRET is required but not defined");
}
```

### Pattern 5: MFA Verification in JWT Payload

**What:** Add `mfaVerified: boolean` to AccessTokenPayload, issue new token after MFA verification

**When to use:** After successful MFA verification during login flow

**Example:**

```typescript
// Source: Session-bound MFA pattern
interface AccessTokenPayload {
  sub: string;
  email: string;
  organizationId: string;
  role: UserRole;
  sessionId: string;
  mfaVerified: boolean;  // Add this field
  type: 'access';
}

// In MFA verify endpoint - issue new token with mfaVerified: true
async verifyMfa(userId: string, code: string): Promise<{ accessToken: string }> {
  const verified = await this.mfaService.verifyMfa(userId, code);
  if (!verified) throw new UnauthorizedException('Invalid MFA code');

  // Issue NEW token with mfaVerified: true
  return {
    accessToken: this.jwtService.sign({
      ...existingPayload,
      mfaVerified: true,
    }),
  };
}
```

### Recommended Project Structure

No structural changes needed - fixes are in-place modifications to existing files.

## Don't Hand-Roll

Problems with existing solutions to use:

| Problem               | Don't Build                | Use Instead                                    | Why                                   |
| --------------------- | -------------------------- | ---------------------------------------------- | ------------------------------------- |
| UUID validation       | Custom regex               | `@IsUUID('4')` from class-validator            | Handles edge cases, version-aware     |
| Random passwords      | `Math.random()`            | `crypto.randomBytes(32).toString('base64url')` | Cryptographically secure              |
| JWT verification      | Manual decode + verify     | `JwtService.verifyAsync()`                     | Handles algorithm, expiry, signature  |
| Password length limit | Manual string length check | `@MaxLength(72)` decorator                     | Composable, consistent error messages |

**Key insight:** All security primitives already exist in the stack - the bugs are from bypassing them, not from missing libraries.

## Common Pitfalls

### Pitfall 1: Forgetting TenantGuard on New Endpoints

**What goes wrong:** New endpoints added without TenantGuard allow cross-tenant data access
**Why it happens:** Copy-paste from unauthenticated example code
**How to avoid:** ESLint rule or PR checklist requiring guards on all controllers
**Warning signs:** Controller without `@UseGuards(JwtAuthGuard, TenantGuard)` decorator

### Pitfall 2: JWT Algorithm Array Allowing HS256

**What goes wrong:** Attacker forges tokens using public key as HMAC secret
**Why it happens:** "Migration support" code that accepts both algorithms
**How to avoid:** Pin to RS256 ONLY in production, remove HS256 from algorithms array
**Warning signs:** `algorithms: ['RS256', 'HS256']` in JWT options

### Pitfall 3: Trusting Client WebSocket Auth

**What goes wrong:** Client provides fake organizationId/userId in handshake
**Why it happens:** Development convenience - easier than JWT extraction
**How to avoid:** Always extract context from JWT, never from client.handshake.auth fields
**Warning signs:** `client.handshake.auth.organizationId` without JWT verification

### Pitfall 4: Undefined Secret Signs Valid Tokens

**What goes wrong:** `jwt.sign(payload, undefined)` creates tokens signed with empty string
**Why it happens:** Missing env var in deployment
**How to avoid:** Startup validation that throws if secret is undefined
**Warning signs:** `configService.get()` without fallback check

### Pitfall 5: bcrypt CPU Exhaustion

**What goes wrong:** 1MB password input causes multi-second hash computation
**Why it happens:** bcrypt hashes entire input (up to 72 bytes for most implementations)
**How to avoid:** `@MaxLength(72)` on password field in LoginDto
**Warning signs:** LoginDto with `@IsString()` but no `@MaxLength()`

### Pitfall 6: Blanket Middleware Exemption

**What goes wrong:** Entire `/operations/*` path exempted from tenant middleware
**Why it happens:** Operations module uses internal users, not tenant users
**How to avoid:** Exempt specific endpoints, not wildcard patterns
**Warning signs:** `exclude('api/v1/operations/(.*)')` in middleware config

## Code Examples

### Example 1: Fixed Controller with Guards

```typescript
// Source: Pattern from cases.controller.ts (correctly secured)
import { JwtAuthGuard, TenantGuard, RolesGuard } from "@common/guards";
import { Roles, TenantId, CurrentUser } from "@common/decorators";

@Controller("api/v1/campaigns")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
@ApiBearerAuth()
@ApiTags("campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @Roles(Role.COMPLIANCE_OFFICER, Role.SYSTEM_ADMIN)
  create(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.campaignsService.create(dto, user.id, organizationId);
  }

  @Get()
  @Roles(Role.COMPLIANCE_OFFICER, Role.TRIAGE_LEAD, Role.READ_ONLY)
  findAll(
    @TenantId() organizationId: string,
    @Query() query: CampaignQueryDto,
  ) {
    return this.campaignsService.findAll(organizationId, query);
  }
}
```

### Example 2: Secure WebSocket Context Extraction

```typescript
// Source: Best practice WebSocket JWT validation
import { JwtService } from "@nestjs/jwt";

@WebSocketGateway({ namespace: "/ai" })
export class AiGateway {
  constructor(
    private readonly jwtService: JwtService,
    private readonly jwtKeyService: JwtKeyService,
  ) {}

  private async extractContext(client: Socket): Promise<SocketContext | null> {
    // Extract token from auth header OR handshake auth.token
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      this.logger.warn("WebSocket connection rejected: no token");
      return null;
    }

    try {
      // Get verification key based on algorithm
      const verificationKey = this.jwtKeyService.getVerificationKey();

      // Verify JWT - NEVER trust client-provided claims
      const payload = await this.jwtService.verifyAsync(token, {
        secret: verificationKey,
        algorithms: ["RS256"], // Pin algorithm
      });

      // Verify this is an access token
      if (payload.type !== "access") {
        return null;
      }

      return {
        organizationId: payload.organizationId,
        userId: payload.sub,
        userRole: payload.role,
        permissions: this.getPermissionsForRole(payload.role),
      };
    } catch (error) {
      this.logger.warn(`WebSocket JWT verification failed: ${error.message}`);
      return null;
    }
  }
}
```

### Example 3: Login DTO with MaxLength

```typescript
// Source: bcrypt CPU exhaustion prevention
import { IsEmail, IsString, MinLength, MaxLength } from "class-validator";

export class LoginDto {
  @ApiProperty({ description: "User email address" })
  @IsEmail({}, { message: "Please provide a valid email address" })
  email: string;

  @ApiProperty({ description: "User password", minLength: 8, maxLength: 72 })
  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters" })
  @MaxLength(72, { message: "Password cannot exceed 72 characters" }) // ADD THIS
  password: string;
}
```

### Example 4: Random Demo Password Generation

```typescript
// Source: Secure password generation pattern
import * as crypto from "crypto";

function generateSecurePassword(): string {
  // Generate 24 random bytes = 32 base64url characters
  return crypto.randomBytes(24).toString("base64url");
}

// Usage in demo.service.ts
const password = generateSecurePassword(); // e.g., "Kj8_xB2pQm1nR5sT7vW9yA3c"
const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
```

### Example 5: UUID Validation on ID Fields

```typescript
// Source: class-validator best practices
import { IsUUID, IsOptional } from "class-validator";

export class CreateChatDto {
  // WRONG: @IsString() allows any string including SQL injection
  // @IsString()
  // organizationId: string;

  // RIGHT: @IsUUID validates UUID format
  @IsUUID("4", { message: "organizationId must be a valid UUID" })
  organizationId: string;

  @IsUUID("4")
  @IsOptional()
  entityId?: string;
}
```

### Example 6: MFA in JWT Payload

```typescript
// Source: Session-bound MFA pattern
export interface AccessTokenPayload {
  sub: string;
  email: string;
  organizationId: string;
  role: UserRole;
  sessionId: string;
  mfaVerified: boolean; // NEW FIELD
  type: "access";
}

// In MfaGuard - check mfaVerified before allowing access to sensitive routes
@Injectable()
export class MfaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Check if user has MFA enabled and verified in current session
    if (user.mfaEnabled && !user.mfaVerified) {
      throw new UnauthorizedException("MFA verification required");
    }

    return true;
  }
}
```

## State of the Art

| Old Approach       | Current Approach       | When Changed    | Impact                       |
| ------------------ | ---------------------- | --------------- | ---------------------------- |
| HS256 JWT signing  | RS256 asymmetric       | 2020+           | Prevents algorithm confusion |
| Trust client auth  | Verify JWT server-side | Always required | Prevents auth bypass         |
| Single algorithm   | Algorithm pinning      | CVE-2015-9235   | Prevents key confusion       |
| Optional MFA check | MFA in JWT payload     | 2024+           | Session-bound verification   |

**Deprecated/outdated:**

- **HS256 in production:** Use RS256 for asymmetric key management
- **algorithms: ['RS256', 'HS256']:** Pin to single algorithm in production

## Open Questions

1. **Operations Module Authentication**
   - What we know: Operations routes use InternalUser, not tenant User
   - What's unclear: Which specific endpoints need exemption vs. which need internal auth
   - Recommendation: Audit all /operations/\* endpoints, exempt only specific paths

2. **Existing Token Migration**
   - What we know: Some tokens may be signed with HS256
   - What's unclear: How many active sessions use HS256 tokens
   - Recommendation: Keep RS256/HS256 dual support for 7 days (refresh token lifetime), then remove HS256

3. **Sentry PII Logging**
   - What we know: Sentry may log request bodies containing emails
   - What's unclear: Current Sentry configuration and what data is captured
   - Recommendation: Audit Sentry scrubData and beforeSend configuration

## Sources

### Primary (HIGH confidence)

- Existing codebase patterns in `cases.controller.ts`, `auth.module.ts`, `jwt.strategy.ts`
- NestJS official documentation - [WebSocket Guards](https://docs.nestjs.com/websockets/guards)
- NestJS official documentation - [Validation](https://docs.nestjs.com/techniques/validation)

### Secondary (MEDIUM confidence)

- [Auth0: Critical vulnerabilities in JSON Web Token libraries](https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/) - CVE-2015-9235 JWT algorithm confusion
- [PortSwigger: Algorithm confusion attacks](https://portswigger.net/web-security/jwt/algorithm-confusion) - Attack methodology
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) - bcrypt limits
- [TheLinuxCode: npm bcrypt in 2026](https://thelinuxcode.com/npm-bcrypt-in-2026-password-hashing-that-fails-closed-and-how-to-ship-it-safely/) - bcrypt CPU exhaustion
- [InstaTunnel: The 1MB Password](https://instatunnel.my/blog/the-1mb-password-crashing-backends-via-hashing-exhaustion) - Hashing exhaustion attacks
- [SOC 2 Compliance Requirements (Sprinto)](https://sprinto.com/blog/soc-2-requirements/) - Audit logging requirements
- [Preet Mishra: Best Way to Authenticate WebSockets in NestJS](https://preetmishra.com/blog/the-best-way-to-authenticate-websockets-in-nestjs) - WebSocket JWT patterns
- [OneUpTime: How to Add Validation with class-validator in NestJS](https://oneuptime.com/blog/post/2026-02-02-nestjs-class-validator/view) - DTO validation

### Tertiary (LOW confidence)

- Community patterns for MFA in JWT - no authoritative source found

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - all libraries already in codebase
- Architecture patterns: HIGH - based on existing secure controllers in codebase
- Pitfalls: HIGH - verified against CVEs and official documentation

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - security patterns stable)

---

## Appendix: Files Requiring Modification

### Controllers with TEMP_ORG_ID (SEC-01)

1. `apps/backend/src/modules/campaigns/campaigns.controller.ts` - 25+ usages
2. `apps/backend/src/modules/campaigns/attestation/attestation.controller.ts` - 10+ usages
3. `apps/backend/src/modules/analytics/migration/migration.controller.ts` - 20+ usages
4. `apps/backend/src/modules/investigations/checklists/checklist.controller.ts` - 7 usages (uses `stub-org-id`)
5. `apps/backend/src/modules/disclosures/conflict.controller.ts` - 10+ usages
6. `apps/backend/src/modules/policies/approval/policy-approval.controller.ts` - 8 usages

### WebSocket Gateways (SEC-02)

1. `apps/backend/src/modules/ai/ai.gateway.ts` - `extractContext()` trusts client

### JWT Configuration (SEC-03, SEC-10)

1. `apps/backend/src/modules/auth/auth.module.ts` - algorithms array
2. `apps/backend/src/modules/auth/strategies/jwt.strategy.ts` - algorithms array
3. `apps/backend/src/common/middleware/tenant.middleware.ts` - HS256-only verification

### Token Services (SEC-04)

1. `apps/backend/src/modules/auth/services/token-refresh.service.ts` - undefined secret

### DTOs (SEC-05, SEC-07, SEC-08)

1. `apps/backend/src/modules/ai/dto/chat-message.dto.ts` - has `@IsString() organizationId`
2. `apps/backend/src/modules/auth/dto/login.dto.ts` - missing `@MaxLength(72)`
3. Multiple DTOs with `@IsString()` on ID fields (51 files found with @IsUUID usage for reference)

### Demo Service (SEC-06)

1. `apps/backend/src/modules/demo/demo.service.ts` - hardcoded `DEMO_PASSWORD`
2. `apps/backend/src/modules/demo/demo.controller.ts` - returns hardcoded password

### MFA (SEC-09)

1. `apps/backend/src/modules/auth/interfaces/jwt-payload.interface.ts` - add mfaVerified
2. `apps/backend/src/modules/auth/mfa/mfa.service.ts` - issue new token after verify

### Audit Logging (SEC-11)

1. `apps/backend/src/modules/messaging/relay.service.ts` - no audit logging

### Middleware Exemptions (SEC-12)

1. `apps/backend/src/app.module.ts` - blanket operations exemption

### PII in Logs (SEC-13)

1. `apps/backend/src/modules/auth/mfa/mfa.service.ts` - logs user.email
