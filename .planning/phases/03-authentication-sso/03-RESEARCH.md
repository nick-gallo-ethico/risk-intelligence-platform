# Phase 3: Authentication & SSO - Research

**Researched:** 2026-02-02
**Domain:** Enterprise SSO (Azure AD, Google OAuth, SAML 2.0), domain verification, JIT user provisioning, MFA/TOTP, rate limiting
**Confidence:** HIGH

## Summary

Phase 3 adds enterprise authentication capabilities to the existing JWT-based auth system. The platform already has a functional email/password authentication flow with JWT access/refresh tokens, session management, and RLS integration. This phase extends it with SSO providers (Azure AD, Google OAuth, SAML 2.0), domain-based tenant routing, Just-In-Time user provisioning, TOTP-based MFA, and rate limiting on sensitive endpoints.

The NestJS/Passport ecosystem provides mature, well-documented strategies for all required identity providers. The key architectural decision is treating **domain verification as the source of truth for tenant routing** - verified domains map users to organizations automatically during SSO flows, enabling seamless JIT provisioning.

**Primary recommendation:** Use Passport.js strategies with NestJS wrapper for all SSO providers. Implement domain verification with DNS TXT records. Use otplib for TOTP generation, @nestjs/throttler for rate limiting. All auth events MUST be audited using the global AuditService from Phase 1.

## Standard Stack

### Core Libraries

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/passport | ^10.0.3 | Passport NestJS integration | Already installed, official NestJS module |
| passport | ^0.7.0 | Authentication middleware | Already installed, industry standard |
| passport-azure-ad | ^4.3.5 | Azure AD OIDC strategy | Official Microsoft library for Azure AD auth |
| passport-google-oauth20 | ^2.0.0 | Google OAuth 2.0 strategy | Official Passport strategy, well-maintained |
| @node-saml/passport-saml | ^5.0.0 | SAML 2.0 strategy | Actively maintained fork of deprecated passport-saml |
| otplib | ^12.0.1 | TOTP/HOTP generation | Modern, maintained replacement for speakeasy |
| qrcode | ^1.5.3 | QR code generation | For TOTP setup with authenticator apps |
| @nestjs/throttler | ^6.0.0 | Rate limiting | Official NestJS module with Redis support |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nest-lab/throttler-storage-redis | ^0.5.0 | Redis storage for throttler | Multi-instance deployments |
| dns | native | DNS resolution | Domain verification via TXT records |
| ioredis | ^5.9.2 | Redis client | Already installed for BullMQ, reuse for throttler |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| passport-azure-ad | @azure/msal-node | MSAL is newer but passport-azure-ad has better NestJS/Passport integration |
| @node-saml/passport-saml | samlify | samlify is alternative but passport-saml has larger community |
| otplib | speakeasy | speakeasy unmaintained for 7+ years; otplib actively maintained |
| Custom domain verification | WorkOS/Auth0 | Third-party adds cost; DNS TXT verification is straightforward |

**Installation:**
```bash
npm install passport-azure-ad @types/passport-azure-ad
npm install passport-google-oauth20 @types/passport-google-oauth20
npm install @node-saml/passport-saml
npm install otplib qrcode @types/qrcode
npm install @nestjs/throttler @nest-lab/throttler-storage-redis
```

## Architecture Patterns

### Recommended Project Structure

```
apps/backend/src/modules/auth/
├── auth.module.ts                    # Main auth module
├── auth.service.ts                   # Core auth service (existing)
├── auth.controller.ts                # Auth endpoints (existing + SSO)
├── strategies/
│   ├── jwt.strategy.ts               # Existing JWT strategy
│   ├── azure-ad.strategy.ts          # Azure AD OIDC strategy
│   ├── google.strategy.ts            # Google OAuth2 strategy
│   └── saml.strategy.ts              # Generic SAML 2.0 strategy
├── sso/
│   ├── sso.service.ts                # SSO orchestration (JIT, tenant routing)
│   ├── sso-config.service.ts         # Per-tenant SSO configuration
│   └── sso-provider.interface.ts     # Common SSO provider interface
├── domain/
│   ├── domain.service.ts             # Domain verification logic
│   ├── domain.controller.ts          # Domain management endpoints
│   └── domain-verification.service.ts # DNS TXT verification
├── mfa/
│   ├── mfa.service.ts                # TOTP generation and verification
│   ├── mfa.controller.ts             # MFA setup/verify endpoints
│   └── recovery-codes.service.ts     # Recovery code generation/validation
├── dto/
│   ├── login.dto.ts                  # Existing
│   ├── sso-callback.dto.ts           # SSO callback data
│   ├── domain-verification.dto.ts    # Domain verification DTOs
│   ├── mfa-setup.dto.ts              # MFA setup DTOs
│   └── index.ts
├── interfaces/
│   ├── jwt-payload.interface.ts      # Existing
│   ├── sso-user.interface.ts         # SSO user data from IdP
│   └── tenant-sso-config.interface.ts # Per-tenant SSO configuration
└── guards/
    └── mfa.guard.ts                  # MFA verification guard
```

### Pattern 1: Domain-Based Tenant Routing

**What:** Verified email domains map to organizations, enabling automatic tenant routing during SSO.

**When to use:** Every SSO callback to determine which tenant the user belongs to.

**Example:**
```typescript
// apps/backend/src/modules/auth/domain/domain.service.ts

@Injectable()
export class DomainService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findTenantByEmailDomain(email: string): Promise<Organization | null> {
    const domain = email.split('@')[1].toLowerCase();

    const tenantDomain = await this.prisma.tenantDomain.findFirst({
      where: {
        domain,
        verified: true,
      },
      include: { organization: true },
    });

    return tenantDomain?.organization ?? null;
  }

  async initiateVerification(
    organizationId: string,
    domain: string
  ): Promise<TenantDomain> {
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const tenantDomain = await this.prisma.tenantDomain.create({
      data: {
        organizationId,
        domain: domain.toLowerCase(),
        verified: false,
        verificationToken,
        verificationMethod: 'DNS_TXT',
      },
    });

    await this.auditService.log({
      entityType: 'ORGANIZATION',
      entityId: organizationId,
      action: 'DOMAIN_VERIFICATION_INITIATED',
      actionDescription: `Domain verification initiated for ${domain}`,
      actionCategory: AuditActionCategory.SECURITY,
    });

    return tenantDomain;
  }

  async verifyDomain(organizationId: string, domainId: string): Promise<boolean> {
    const tenantDomain = await this.prisma.tenantDomain.findFirst({
      where: { id: domainId, organizationId },
    });

    if (!tenantDomain) {
      throw new NotFoundException('Domain not found');
    }

    // Check DNS TXT record: _ethico-verify.domain.com
    const verified = await this.checkDnsTxtRecord(
      tenantDomain.domain,
      tenantDomain.verificationToken
    );

    if (verified) {
      await this.prisma.tenantDomain.update({
        where: { id: domainId },
        data: { verified: true, verifiedAt: new Date() },
      });

      await this.auditService.log({
        entityType: 'ORGANIZATION',
        entityId: organizationId,
        action: 'DOMAIN_VERIFIED',
        actionDescription: `Domain ${tenantDomain.domain} verified successfully`,
        actionCategory: AuditActionCategory.SECURITY,
      });
    }

    return verified;
  }

  private async checkDnsTxtRecord(
    domain: string,
    expectedToken: string
  ): Promise<boolean> {
    try {
      const records = await dns.promises.resolveTxt(`_ethico-verify.${domain}`);
      return records.flat().includes(`ethico-verify=${expectedToken}`);
    } catch {
      return false;
    }
  }
}
```

### Pattern 2: JIT User Provisioning with SSO

**What:** Automatically create user accounts when users first log in via SSO, mapping to tenant via verified domain.

**When to use:** SSO callback when user doesn't exist but their domain is verified for a tenant.

**Example:**
```typescript
// apps/backend/src/modules/auth/sso/sso.service.ts

@Injectable()
export class SsoService {
  constructor(
    private prisma: PrismaService,
    private domainService: DomainService,
    private auditService: AuditService,
  ) {}

  async findOrCreateSsoUser(ssoUser: SsoUserData): Promise<User> {
    // 1. Check if user exists by SSO ID (same provider)
    let user = await this.prisma.user.findFirst({
      where: {
        ssoProvider: ssoUser.provider,
        ssoId: ssoUser.ssoId,
      },
      include: { organization: true },
    });

    if (user) {
      await this.updateLastLogin(user);
      return user;
    }

    // 2. Check if user exists by email (link SSO to existing account)
    user = await this.prisma.user.findFirst({
      where: { email: ssoUser.email.toLowerCase() },
      include: { organization: true },
    });

    if (user) {
      return this.linkSsoToExistingUser(user, ssoUser);
    }

    // 3. JIT Provisioning - find tenant by verified domain
    const organization = await this.domainService.findTenantByEmailDomain(ssoUser.email);

    if (!organization) {
      throw new UnauthorizedException(
        'Your organization is not registered. Please contact your administrator.'
      );
    }

    // 4. Check if JIT provisioning is enabled for this tenant
    const ssoConfig = await this.prisma.tenantSsoConfig.findFirst({
      where: { organizationId: organization.id },
    });

    if (!ssoConfig?.jitProvisioningEnabled) {
      throw new UnauthorizedException(
        'Just-in-time provisioning is disabled. Contact your administrator.'
      );
    }

    // 5. Create new user with default role
    user = await this.prisma.user.create({
      data: {
        email: ssoUser.email.toLowerCase(),
        firstName: ssoUser.firstName,
        lastName: ssoUser.lastName,
        ssoProvider: ssoUser.provider,
        ssoId: ssoUser.ssoId,
        organizationId: organization.id,
        role: ssoConfig.defaultRole ?? UserRole.EMPLOYEE,
        isActive: true,
        emailVerifiedAt: new Date(), // SSO = verified email
        lastLoginAt: new Date(),
      },
      include: { organization: true },
    });

    await this.auditService.log({
      entityType: 'USER',
      entityId: user.id,
      organizationId: organization.id,
      action: 'USER_JIT_PROVISIONED',
      actionDescription: `User ${user.email} provisioned via ${ssoUser.provider} SSO`,
      actionCategory: AuditActionCategory.SECURITY,
    });

    return user;
  }
}
```

### Pattern 3: Multi-Provider SSO Strategy Factory

**What:** Dynamically select and configure SSO strategy based on tenant configuration.

**When to use:** When tenants can configure their own IdP (especially SAML).

**Example:**
```typescript
// apps/backend/src/modules/auth/strategies/saml.strategy.ts

import { PassportStrategy } from '@nestjs/passport';
import {
  Strategy,
  Profile,
  VerifyWithoutRequest
} from '@node-saml/passport-saml';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SamlStrategy extends PassportStrategy(Strategy, 'saml') {
  constructor(
    private ssoConfigService: SsoConfigService,
    private ssoService: SsoService,
  ) {
    // Use MultiSamlStrategy pattern for per-tenant configuration
    super({
      getSamlOptions: async (req, done) => {
        try {
          // Determine tenant from request (subdomain, email hint, etc.)
          const tenantSlug = req.params.tenant || req.query.tenant;
          const config = await this.ssoConfigService.getSamlConfig(tenantSlug);

          done(null, {
            callbackUrl: `${process.env.API_URL}/auth/saml/${tenantSlug}/callback`,
            entryPoint: config.idpEntryPoint,
            issuer: config.spEntityId,
            cert: config.idpCertificate,
            wantAssertionsSigned: true,
            wantAuthnResponseSigned: true,
            signatureAlgorithm: 'sha256',
          });
        } catch (error) {
          done(error);
        }
      },
    });
  }

  async validate(profile: Profile): Promise<SsoUserData> {
    return {
      email: profile.nameID || profile.email,
      firstName: profile.firstName || profile.givenName,
      lastName: profile.lastName || profile.surname,
      provider: 'saml',
      ssoId: profile.nameID,
      // Raw profile for debugging/auditing
      rawProfile: profile,
    };
  }
}
```

### Pattern 4: TOTP-Based MFA

**What:** Time-based One-Time Password implementation with recovery codes.

**When to use:** User opts in to MFA or organization requires it.

**Example:**
```typescript
// apps/backend/src/modules/auth/mfa/mfa.service.ts

import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import * as crypto from 'crypto';

@Injectable()
export class MfaService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {
    // Configure TOTP settings
    authenticator.options = {
      digits: 6,
      step: 30, // 30 second window
      window: 1, // Allow 1 step before/after for clock drift
    };
  }

  async initiateMfaSetup(userId: string): Promise<MfaSetupResponse> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    // Generate new secret
    const secret = authenticator.generateSecret();

    // Store temporarily (not enabled until verified)
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaSecret: secret,
        mfaEnabled: false, // Not enabled until verified
      },
    });

    // Generate QR code for authenticator app
    const otpAuthUrl = authenticator.keyuri(
      user.email,
      'Ethico Platform',
      secret
    );

    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);

    return {
      secret, // Show to user for manual entry
      qrCode: qrCodeDataUrl,
      otpAuthUrl,
    };
  }

  async enableMfa(
    userId: string,
    totpCode: string
  ): Promise<{ recoveryCodes: string[] }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (!user.mfaSecret) {
      throw new BadRequestException('MFA setup not initiated');
    }

    // Verify the TOTP code
    const isValid = authenticator.verify({
      token: totpCode,
      secret: user.mfaSecret,
    });

    if (!isValid) {
      throw new UnauthorizedException('Invalid verification code');
    }

    // Generate recovery codes
    const recoveryCodes = this.generateRecoveryCodes(10);
    const hashedCodes = recoveryCodes.map(code =>
      crypto.createHash('sha256').update(code).digest('hex')
    );

    // Enable MFA and store hashed recovery codes
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaVerifiedAt: new Date(),
        mfaRecoveryCodes: hashedCodes,
      },
    });

    await this.auditService.log({
      entityType: 'USER',
      entityId: userId,
      organizationId: user.organizationId,
      action: 'MFA_ENABLED',
      actionDescription: `User enabled two-factor authentication`,
      actionCategory: AuditActionCategory.SECURITY,
    });

    // Return plain recovery codes (only time user sees them)
    return { recoveryCodes };
  }

  async verifyMfa(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA not enabled');
    }

    // Try TOTP first
    const isValidTotp = authenticator.verify({
      token: code,
      secret: user.mfaSecret,
    });

    if (isValidTotp) {
      return true;
    }

    // Try recovery code
    return this.verifyRecoveryCode(user, code);
  }

  private generateRecoveryCodes(count: number): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      // Generate 8-character alphanumeric codes
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  private async verifyRecoveryCode(user: User, code: string): Promise<boolean> {
    const hashedInput = crypto.createHash('sha256').update(code).digest('hex');
    const codeIndex = user.mfaRecoveryCodes.indexOf(hashedInput);

    if (codeIndex === -1) {
      return false;
    }

    // Remove used recovery code
    const updatedCodes = [...user.mfaRecoveryCodes];
    updatedCodes.splice(codeIndex, 1);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaRecoveryCodes: updatedCodes },
    });

    await this.auditService.log({
      entityType: 'USER',
      entityId: user.id,
      organizationId: user.organizationId,
      action: 'MFA_RECOVERY_CODE_USED',
      actionDescription: `User used MFA recovery code (${updatedCodes.length} remaining)`,
      actionCategory: AuditActionCategory.SECURITY,
    });

    return true;
  }
}
```

### Pattern 5: Rate Limiting on Auth Endpoints

**What:** Protect authentication endpoints from brute-force and credential stuffing attacks.

**When to use:** All authentication endpoints, especially login, MFA verify, password reset.

**Example:**
```typescript
// apps/backend/src/modules/auth/auth.controller.ts

import { Throttle, SkipThrottle } from '@nestjs/throttler';

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private mfaService: MfaService,
  ) {}

  // Strict rate limit: 5 attempts per minute for login
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('login')
  @Public()
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    return this.authService.login(loginDto, req.headers['user-agent'], req.ip);
  }

  // Strict rate limit: 3 attempts per minute for MFA
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('mfa/verify')
  async verifyMfa(@Body() dto: VerifyMfaDto, @CurrentUser() user: RequestUser) {
    const isValid = await this.mfaService.verifyMfa(user.id, dto.code);
    if (!isValid) {
      throw new UnauthorizedException('Invalid MFA code');
    }
    // Issue new tokens with MFA-verified flag
    return this.authService.issueMfaVerifiedTokens(user);
  }

  // Strict rate limit: 3 attempts per hour for password reset
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @Post('password/reset-request')
  @Public()
  async requestPasswordReset(@Body() dto: PasswordResetRequestDto) {
    return this.authService.requestPasswordReset(dto.email);
  }

  // SSO endpoints - moderate rate limiting
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('azure-ad')
  @UseGuards(AuthGuard('azure-ad'))
  async azureAdLogin() {
    // Passport redirects to Azure AD
  }

  // Token refresh - more lenient
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post('refresh')
  @Public()
  async refreshTokens(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }
}
```

### Anti-Patterns to Avoid

- **Email as unique identifier for SSO:** Use SSO provider's unique ID (oid, sub) instead. Email can change.
- **Storing TOTP secret unencrypted:** Encrypt mfaSecret at rest using application-level encryption.
- **Trusting unverified domains:** Always verify domain ownership before allowing JIT provisioning.
- **Skipping signature validation on SAML:** Always validate SAML assertion signatures; CVE-2022-39299 exploited missing validation.
- **Single rate limit for all endpoints:** Use stricter limits for sensitive endpoints (login, MFA, password reset).
- **Hardcoding SSO configs:** Store per-tenant SSO configuration in database for flexibility.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| TOTP generation | Custom implementation | otplib | RFC 6238 compliance, clock drift handling, tested |
| SAML parsing | XML parsing | @node-saml/passport-saml | Signature validation, XXE prevention, replay protection |
| QR code generation | Canvas drawing | qrcode | Standard format for all authenticator apps |
| Rate limiting | Request counting | @nestjs/throttler | Redis support, distributed, NestJS integration |
| DNS verification | Raw DNS queries | dns module + structured approach | Proper error handling, timeout management |
| Recovery code generation | Simple random | crypto.randomBytes | Cryptographically secure randomness |

**Key insight:** Authentication has severe security implications. Even small implementation errors (like not validating SAML signatures) can lead to complete auth bypass. Use battle-tested libraries.

## Common Pitfalls

### Pitfall 1: SAML Signature Bypass (CVE-2022-39299)

**What goes wrong:** Attackers manipulate unsigned portions of SAML responses to impersonate users.

**Why it happens:** Improper XML signature validation, especially with SAML error messages.

**How to avoid:** Use @node-saml/passport-saml v5.0.0+ which patches this. Always enable `wantAssertionsSigned: true` and `wantAuthnResponseSigned: true`.

**Warning signs:** SAML working without certificate configuration, accepting unsigned assertions.

### Pitfall 2: JIT Provisioning to Wrong Tenant

**What goes wrong:** User gets provisioned to incorrect organization due to domain mismatch.

**Why it happens:** Using email domain without verifying domain ownership first.

**How to avoid:** ONLY allow JIT provisioning for verified domains. Require DNS TXT verification before enabling domain for a tenant.

**Warning signs:** Users appearing in wrong organizations, duplicate accounts across tenants.

### Pitfall 3: MFA Bypass via Token Reuse

**What goes wrong:** Attacker captures valid MFA code and reuses it within the time window.

**Why it happens:** TOTP codes are valid for 30+ seconds, allowing replay within window.

**How to avoid:** Track last-used TOTP timestamp per user. Reject codes with same or earlier timestamp than last used.

**Warning signs:** Multiple successful logins with same TOTP code in logs.

### Pitfall 4: Rate Limit Bypass via Distributed Attack

**What goes wrong:** Attackers use multiple IPs to bypass IP-based rate limiting.

**Why it happens:** Only tracking requests by IP, not by target (email, username).

**How to avoid:** Rate limit by BOTH source IP AND target identifier (email for login, userId for MFA).

**Warning signs:** Many failed logins for same account from different IPs.

### Pitfall 5: SSO Token Confusion

**What goes wrong:** Refresh token used as access token or vice versa.

**Why it happens:** Tokens look similar, no explicit type checking.

**How to avoid:** Include `type: 'access'` or `type: 'refresh'` in JWT payload. Verify type on every use. Already implemented in current codebase.

**Warning signs:** Tokens working in unexpected endpoints, unusual token lifetimes.

## Code Examples

### Azure AD Strategy Implementation

```typescript
// apps/backend/src/modules/auth/strategies/azure-ad.strategy.ts

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import {
  OIDCStrategy,
  IProfile,
  VerifyCallback
} from 'passport-azure-ad';
import { ConfigService } from '@nestjs/config';
import { SsoService } from '../sso/sso.service';

@Injectable()
export class AzureAdStrategy extends PassportStrategy(OIDCStrategy, 'azure-ad') {
  constructor(
    private configService: ConfigService,
    private ssoService: SsoService,
  ) {
    super({
      identityMetadata: `https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration`,
      clientID: configService.get<string>('AZURE_AD_CLIENT_ID'),
      clientSecret: configService.get<string>('AZURE_AD_CLIENT_SECRET'),
      responseType: 'code',
      responseMode: 'form_post',
      redirectUrl: `${configService.get<string>('API_URL')}/api/v1/auth/azure-ad/callback`,
      allowHttpForRedirectUrl: configService.get<string>('NODE_ENV') === 'development',
      scope: ['openid', 'profile', 'email'],
      passReqToCallback: false,
      loggingLevel: 'warn',
      loggingNoPII: true,
    });
  }

  async validate(profile: IProfile, done: VerifyCallback): Promise<void> {
    try {
      const ssoUser = {
        email: profile._json.email || profile._json.preferred_username,
        firstName: profile._json.given_name || '',
        lastName: profile._json.family_name || '',
        provider: 'azure-ad' as const,
        ssoId: profile.oid,
        azureTenantId: profile._json.tid,
      };

      const user = await this.ssoService.findOrCreateSsoUser(ssoUser);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
```

### Google OAuth Strategy Implementation

```typescript
// apps/backend/src/modules/auth/strategies/google.strategy.ts

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { SsoService } from '../sso/sso.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private ssoService: SsoService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: `${configService.get<string>('API_URL')}/api/v1/auth/google/callback`,
      scope: ['email', 'profile', 'openid'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const ssoUser = {
        email: profile.emails?.[0]?.value,
        firstName: profile.name?.givenName || '',
        lastName: profile.name?.familyName || '',
        provider: 'google' as const,
        ssoId: profile.id,
        avatarUrl: profile.photos?.[0]?.value,
      };

      if (!ssoUser.email) {
        throw new Error('Email not provided by Google');
      }

      const user = await this.ssoService.findOrCreateSsoUser(ssoUser);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
```

### Throttler Module Configuration

```typescript
// apps/backend/src/app.module.ts

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60000, // 1 minute
            limit: 100, // 100 requests per minute globally
          },
        ],
        storage: new ThrottlerStorageRedisService(
          configService.get<string>('REDIS_URL')
        ),
      }),
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

### Database Schema Additions

```prisma
// Addition to apps/backend/prisma/schema.prisma

/// TenantDomain maps email domains to organizations for SSO tenant routing.
/// Domains must be verified via DNS TXT record before enabling.
model TenantDomain {
  id                String    @id @default(uuid())
  organizationId    String    @map("organization_id")
  domain            String    @unique // e.g., "acme.com"
  verified          Boolean   @default(false)
  verifiedAt        DateTime? @map("verified_at")
  verificationToken String    @map("verification_token")
  verificationMethod String   @default("DNS_TXT") @map("verification_method")
  isPrimary         Boolean   @default(false) @map("is_primary")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([domain])
  @@map("tenant_domains")
}

/// TenantSsoConfig stores per-tenant SSO provider configuration.
model TenantSsoConfig {
  id                    String    @id @default(uuid())
  organizationId        String    @unique @map("organization_id")

  // SSO Provider Settings
  ssoProvider           String?   @map("sso_provider") // 'azure-ad', 'google', 'saml'
  ssoEnabled            Boolean   @default(false) @map("sso_enabled")

  // JIT Provisioning
  jitProvisioningEnabled Boolean  @default(true) @map("jit_provisioning_enabled")
  defaultRole           UserRole  @default(EMPLOYEE) @map("default_role")

  // Azure AD specific
  azureTenantId         String?   @map("azure_tenant_id")

  // SAML specific
  samlIdpEntityId       String?   @map("saml_idp_entity_id")
  samlIdpEntryPoint     String?   @map("saml_idp_entry_point")
  samlIdpCertificate    String?   @map("saml_idp_certificate") // PEM format
  samlSpEntityId        String?   @map("saml_sp_entity_id")

  // MFA Policy
  mfaRequired           Boolean   @default(false) @map("mfa_required")

  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@map("tenant_sso_configs")
}

// User model additions (add to existing User model)
// ssoProvider    String?   @map("sso_provider") // 'azure-ad', 'google', 'saml'
// ssoId          String?   @map("sso_id")       // Provider-specific user ID
// mfaEnabled     Boolean   @default(false) @map("mfa_enabled")
// mfaSecret      String?   @map("mfa_secret")   // Encrypted TOTP secret
// mfaVerifiedAt  DateTime? @map("mfa_verified_at")
// mfaRecoveryCodes String[] @default([]) @map("mfa_recovery_codes") // Hashed
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| passport-saml | @node-saml/passport-saml | 2023 | Original library deprecated; use @node-saml fork |
| speakeasy for TOTP | otplib | 2020+ | speakeasy unmaintained; otplib actively developed |
| In-process rate limiting | Redis-backed throttler | Multi-instance | Required for horizontal scaling |
| Static SAML config | Per-tenant SAML configs | Enterprise requirement | Each customer uses their own IdP |

**Deprecated/outdated:**
- passport-saml (original): Use @node-saml/passport-saml instead
- speakeasy: Use otplib instead (7+ years unmaintained)
- Single-tenant SSO: Enterprise customers require per-tenant IdP configuration

## Open Questions

1. **MFA Secret Encryption**
   - What we know: TOTP secret should be encrypted at rest
   - What's unclear: Should we use application-level encryption or rely on database-level encryption?
   - Recommendation: Use application-level encryption with a dedicated key. This allows key rotation without database migration.

2. **SSO Session Binding**
   - What we know: Users should be logged out when their IdP session ends
   - What's unclear: How to handle SAML Single Logout (SLO) reliably?
   - Recommendation: For MVP, don't implement SLO. Sessions expire naturally. Add SLO in future iteration if customers require it.

3. **Recovery Code Display**
   - What we know: Recovery codes are shown once when MFA is enabled
   - What's unclear: Should we allow regenerating recovery codes? If so, should it require MFA verification first?
   - Recommendation: Allow regeneration with MFA verification. Log as security event.

## Sources

### Primary (HIGH confidence)
- NestJS Authentication Documentation: https://docs.nestjs.com/security/authentication
- NestJS Rate Limiting Documentation: https://docs.nestjs.com/security/rate-limiting
- passport-azure-ad npm package: https://www.npmjs.com/package/passport-azure-ad
- @node-saml/passport-saml GitHub: https://github.com/node-saml/passport-saml
- otplib Documentation: https://www.npmjs.com/package/otplib

### Secondary (MEDIUM confidence)
- [Implement Azure AD Authentication in Nest JS](https://medium.com/@swagatachaudhuri/implement-azure-ad-authentication-in-nest-js-1fe947da2c99)
- [NestJS Authentication: Single Sign On with SAML 2.0](https://towardsdev.com/nestjs-authentication-single-sign-on-with-saml-2-0-8e95f0b8872c)
- [Two-factor authentication with NestJS](https://medium.com/@s.grekov.ivan/two-factor-authentication-with-nestjs-39245a5ab6)
- [Rate Limiting in NestJS Without Being That API](https://medium.com/@sparknp1/rate-limiting-in-nestjs-without-being-that-api-15682549d1bf)
- [The developer's guide to domain verification - WorkOS](https://workos.com/blog/the-developers-guide-to-domain-verification)

### Security References (HIGH confidence)
- [SAML Security Cheat Sheet - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/SAML_Security_Cheat_Sheet.html)
- [Common SAML security vulnerabilities - WorkOS](https://workos.com/guide/common-saml-security-vulnerabilities)
- [CVE-2022-39299 passport-saml vulnerability](https://github.com/doyensec/CVE-2022-39299_PoC_Generator)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official NestJS modules and widely-used Passport strategies
- Architecture: HIGH - Patterns documented in NestJS docs and production use
- Pitfalls: HIGH - Well-documented CVEs and OWASP guidance
- MFA implementation: MEDIUM - otplib is standard but specific NestJS patterns vary

**Research date:** 2026-02-02
**Valid until:** 60 days (stable domain, libraries well-established)
