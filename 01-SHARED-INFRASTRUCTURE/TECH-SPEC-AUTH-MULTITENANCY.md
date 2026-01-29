# Technical Specification: Authentication & Multi-Tenancy

**Version:** 2.0
**Last Updated:** January 2026
**Status:** Draft
**Author:** Architecture Team

**Applies To:** All modules (Case Management, Disclosures, Policy Management, etc.)

**Key Consumers:**
- All API endpoints (JWT validation, tenant context)
- All database queries (RLS enforcement)
- All cache operations (tenant-prefixed keys)
- All Elasticsearch indices (tenant-scoped)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication Architecture](#2-authentication-architecture)
3. [SSO Integration](#3-sso-integration)
4. [JWT Token Management](#4-jwt-token-management)
5. [Multi-Tenancy Architecture](#5-multi-tenancy-architecture)
6. [Row-Level Security (RLS)](#6-row-level-security-rls)
7. [RBAC Implementation](#7-rbac-implementation)
8. [Session Management](#8-session-management)
9. [Exception Lifecycle Authorization](#9-exception-lifecycle-authorization)
10. [External Portal Authentication](#10-external-portal-authentication)
11. [Security Considerations](#11-security-considerations)
12. [API Specifications](#12-api-specifications)
13. [Database Schema](#13-database-schema)
14. [Implementation Guide](#14-implementation-guide)

---

## 1. Overview

### 1.1 Purpose

This document provides detailed technical specifications for implementing authentication and multi-tenancy in the Ethico Policy Management Platform. It covers SSO integration, JWT token handling, PostgreSQL Row-Level Security, and role-based access control.

### 1.2 Scope

- Microsoft Azure AD SSO integration
- Google OAuth 2.0 integration
- Local email/password authentication (fallback)
- JWT token lifecycle management
- Multi-tenant data isolation using PostgreSQL RLS
- Role-based access control (RBAC) with 7 roles
- Session management and token refresh
- **Exception lifecycle authorization (request, approval, renewal)**
- **External partner portal authentication (magic links, limited access)**

### 1.3 Key Design Principles

1. **Defense in Depth**: Multiple layers of tenant isolation
2. **Zero Trust**: Verify tenant context at every layer
3. **Fail Secure**: Default deny on authorization failures
4. **Audit Everything**: Log all authentication and authorization events

---

## 2. Authentication Architecture

### 2.1 High-Level Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   Frontend  │────▶│   Backend   │────▶│  PostgreSQL │
│             │     │   (React)   │     │  (NestJS)   │     │    + RLS    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │                    │
       │  1. Login Click   │                   │                    │
       │──────────────────▶│                   │                    │
       │                   │  2. Redirect to   │                    │
       │◀──────────────────│     IdP           │                    │
       │                   │                   │                    │
       │  3. IdP Login     │                   │                    │
       │──────────────────▶│                   │                    │
       │                   │                   │                    │
       │  4. Callback      │                   │                    │
       │     with code     │                   │                    │
       │──────────────────▶│  5. Exchange code │                    │
       │                   │──────────────────▶│                    │
       │                   │                   │  6. Lookup/Create  │
       │                   │                   │     User           │
       │                   │                   │───────────────────▶│
       │                   │                   │                    │
       │                   │  7. JWT Tokens    │                    │
       │                   │◀──────────────────│                    │
       │  8. Set Cookies   │                   │                    │
       │◀──────────────────│                   │                    │
       │                   │                   │                    │
```

### 2.2 Authentication Methods

| Method | Priority | Use Case |
|--------|----------|----------|
| Microsoft Azure AD SSO | Primary | Enterprise customers with M365 |
| Google OAuth 2.0 | Primary | Google Workspace customers |
| Email/Password | Fallback | Demos, small teams, SSO failures |

### 2.3 Technology Stack

- **Passport.js**: Authentication middleware
- **@nestjs/passport**: NestJS integration
- **passport-azure-ad**: Microsoft SSO strategy
- **passport-google-oauth20**: Google OAuth strategy
- **passport-local**: Email/password strategy
- **bcrypt**: Password hashing (cost factor 12)
- **jsonwebtoken**: JWT generation/verification

---

## 3. SSO Integration

### 3.1 Microsoft Azure AD Configuration

#### 3.1.1 Azure AD App Registration

```typescript
// Configuration interface
interface AzureADConfig {
  clientId: string;           // Application (client) ID
  clientSecret: string;       // Client secret
  tenantId: string;          // Azure AD tenant ID (use 'common' for multi-tenant)
  redirectUri: string;        // Callback URL
  scopes: string[];          // OpenID Connect scopes
}

// Default scopes
const AZURE_SCOPES = [
  'openid',
  'profile',
  'email',
  'User.Read',
  'offline_access'  // Required for refresh tokens
];
```

#### 3.1.2 Azure AD Strategy Implementation

```typescript
// apps/backend/src/modules/auth/strategies/azure-ad.strategy.ts

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { OIDCStrategy, IProfile, VerifyCallback } from 'passport-azure-ad';
import { AuthService } from '../auth.service';

@Injectable()
export class AzureADStrategy extends PassportStrategy(OIDCStrategy, 'azure-ad') {
  constructor(private authService: AuthService) {
    super({
      identityMetadata: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0/.well-known/openid-configuration`,
      clientID: process.env.AZURE_CLIENT_ID,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
      responseType: 'code',
      responseMode: 'form_post',
      redirectUrl: process.env.AZURE_REDIRECT_URI,
      allowHttpForRedirectUrl: process.env.NODE_ENV === 'development',
      scope: ['openid', 'profile', 'email', 'User.Read'],
      passReqToCallback: true,
      loggingLevel: 'info',
      loggingNoPII: true,
    });
  }

  async validate(
    req: Request,
    profile: IProfile,
    done: VerifyCallback
  ): Promise<void> {
    try {
      // Extract user info from Azure AD profile
      const ssoUser = {
        email: profile._json.email || profile._json.preferred_username,
        firstName: profile._json.given_name,
        lastName: profile._json.family_name,
        ssoProvider: 'azure-ad',
        ssoId: profile.oid,
        azureTenantId: profile._json.tid,
      };

      // JIT provisioning - find or create user
      const user = await this.authService.findOrCreateSSOUser(ssoUser, req);

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
```

#### 3.1.3 Azure AD Callback Flow

```typescript
// apps/backend/src/modules/auth/auth.controller.ts

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('azure-ad')
  @UseGuards(AuthGuard('azure-ad'))
  async azureAdLogin() {
    // Passport handles redirect to Azure AD
  }

  @Post('azure-ad/callback')
  @UseGuards(AuthGuard('azure-ad'))
  async azureAdCallback(
    @Req() req: RequestWithUser,
    @Res() res: Response
  ) {
    const tokens = await this.authService.generateTokens(req.user);

    // Set HTTP-only cookies
    this.setAuthCookies(res, tokens);

    // Redirect to frontend
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback`);
  }

  private setAuthCookies(res: Response, tokens: TokenPair) {
    const cookieOptions: CookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    };

    res.cookie('access_token', tokens.accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
```

### 3.2 Google OAuth 2.0 Configuration

#### 3.2.1 Google OAuth Strategy

```typescript
// apps/backend/src/modules/auth/strategies/google.strategy.ts

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI,
      scope: ['email', 'profile', 'openid'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback
  ): Promise<void> {
    try {
      const ssoUser = {
        email: profile.emails[0].value,
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        ssoProvider: 'google',
        ssoId: profile.id,
        avatarUrl: profile.photos?.[0]?.value,
      };

      const user = await this.authService.findOrCreateSSOUser(ssoUser, req);

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  }
}
```

### 3.3 Just-In-Time (JIT) User Provisioning

```typescript
// apps/backend/src/modules/auth/auth.service.ts

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private tenantService: TenantService,
    private auditService: AuditService,
  ) {}

  async findOrCreateSSOUser(
    ssoUser: SSOUserData,
    req: Request
  ): Promise<User> {
    const { email, firstName, lastName, ssoProvider, ssoId } = ssoUser;

    // 1. Check if user exists by SSO ID
    let user = await this.prisma.user.findFirst({
      where: {
        ssoProvider,
        ssoId,
      },
      include: { tenant: true },
    });

    if (user) {
      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await this.auditService.log({
        action: 'USER_LOGIN',
        userId: user.id,
        tenantId: user.tenantId,
        metadata: { ssoProvider },
      });

      return user;
    }

    // 2. Check if user exists by email (might have been pre-provisioned)
    user = await this.prisma.user.findFirst({
      where: { email: email.toLowerCase() },
      include: { tenant: true },
    });

    if (user) {
      // Link SSO to existing account
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          ssoProvider,
          ssoId,
          firstName: firstName || user.firstName,
          lastName: lastName || user.lastName,
          lastLoginAt: new Date(),
        },
        include: { tenant: true },
      });

      await this.auditService.log({
        action: 'USER_SSO_LINKED',
        userId: user.id,
        tenantId: user.tenantId,
        metadata: { ssoProvider },
      });

      return user;
    }

    // 3. JIT Provisioning - Create new user
    // Determine tenant from email domain or request context
    const tenant = await this.tenantService.findByEmailDomain(email);

    if (!tenant) {
      throw new UnauthorizedException(
        'Your organization is not registered. Please contact your administrator.'
      );
    }

    if (!tenant.allowJitProvisioning) {
      throw new UnauthorizedException(
        'Just-in-time provisioning is disabled. Please contact your administrator.'
      );
    }

    // Create user with default Employee role
    user = await this.prisma.user.create({
      data: {
        email: email.toLowerCase(),
        firstName,
        lastName,
        ssoProvider,
        ssoId,
        tenantId: tenant.id,
        role: Role.EMPLOYEE,
        status: UserStatus.ACTIVE,
        lastLoginAt: new Date(),
      },
      include: { tenant: true },
    });

    await this.auditService.log({
      action: 'USER_JIT_PROVISIONED',
      userId: user.id,
      tenantId: tenant.id,
      metadata: { ssoProvider, email },
    });

    return user;
  }
}
```

### 3.4 Tenant Resolution from SSO

```typescript
// apps/backend/src/modules/tenants/tenant.service.ts

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  async findByEmailDomain(email: string): Promise<Tenant | null> {
    const domain = email.split('@')[1].toLowerCase();

    // Check domain mappings
    const domainMapping = await this.prisma.tenantDomain.findUnique({
      where: { domain },
      include: { tenant: true },
    });

    if (domainMapping?.verified) {
      return domainMapping.tenant;
    }

    return null;
  }

  async registerDomain(
    tenantId: string,
    domain: string
  ): Promise<TenantDomain> {
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    return this.prisma.tenantDomain.create({
      data: {
        tenantId,
        domain: domain.toLowerCase(),
        verified: false,
        verificationToken,
        verificationMethod: 'DNS_TXT',
      },
    });
  }

  async verifyDomain(
    tenantId: string,
    domain: string
  ): Promise<boolean> {
    const domainRecord = await this.prisma.tenantDomain.findFirst({
      where: { tenantId, domain },
    });

    if (!domainRecord) {
      throw new NotFoundException('Domain not found');
    }

    // Check DNS TXT record
    const verified = await this.checkDnsTxtRecord(
      domain,
      domainRecord.verificationToken
    );

    if (verified) {
      await this.prisma.tenantDomain.update({
        where: { id: domainRecord.id },
        data: { verified: true, verifiedAt: new Date() },
      });
    }

    return verified;
  }

  private async checkDnsTxtRecord(
    domain: string,
    expectedToken: string
  ): Promise<boolean> {
    try {
      const records = await dns.promises.resolveTxt(
        `_ethico-verify.${domain}`
      );
      return records.flat().includes(expectedToken);
    } catch {
      return false;
    }
  }
}
```

---

## 4. JWT Token Management

### 4.1 Token Structure

#### 4.1.1 Access Token Payload

```typescript
interface AccessTokenPayload {
  sub: string;           // User ID
  email: string;         // User email
  tenantId: string;      // Tenant ID (CRITICAL)
  role: Role;            // User role
  permissions: string[]; // Computed permissions
  sessionId: string;     // Session reference
  iat: number;           // Issued at
  exp: number;           // Expiration (15 minutes)
  type: 'access';
}
```

#### 4.1.2 Refresh Token Payload

```typescript
interface RefreshTokenPayload {
  sub: string;           // User ID
  tenantId: string;      // Tenant ID
  sessionId: string;     // Session reference
  iat: number;           // Issued at
  exp: number;           // Expiration (7 days)
  type: 'refresh';
}
```

### 4.2 Token Generation

```typescript
// apps/backend/src/modules/auth/jwt.service.ts

@Injectable()
export class JwtService {
  private readonly accessTokenSecret: string;
  private readonly refreshTokenSecret: string;

  constructor(private configService: ConfigService) {
    this.accessTokenSecret = configService.get('JWT_ACCESS_SECRET');
    this.refreshTokenSecret = configService.get('JWT_REFRESH_SECRET');
  }

  generateTokens(user: User, sessionId: string): TokenPair {
    const accessPayload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      permissions: this.computePermissions(user.role),
      sessionId,
      type: 'access',
    };

    const refreshPayload: RefreshTokenPayload = {
      sub: user.id,
      tenantId: user.tenantId,
      sessionId,
      type: 'refresh',
    };

    const accessToken = jwt.sign(accessPayload, this.accessTokenSecret, {
      expiresIn: '15m',
      algorithm: 'HS256',
    });

    const refreshToken = jwt.sign(refreshPayload, this.refreshTokenSecret, {
      expiresIn: '7d',
      algorithm: 'HS256',
    });

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const payload = jwt.verify(token, this.accessTokenSecret) as AccessTokenPayload;

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const payload = jwt.verify(token, this.refreshTokenSecret) as RefreshTokenPayload;

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      return payload;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private computePermissions(role: Role): string[] {
    return ROLE_PERMISSIONS[role] || [];
  }
}
```

### 4.3 Token Refresh Flow

```typescript
// apps/backend/src/modules/auth/auth.service.ts

@Injectable()
export class AuthService {
  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    // 1. Verify refresh token
    const payload = this.jwtService.verifyRefreshToken(refreshToken);

    // 2. Check if session is still valid (not revoked)
    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
      include: { user: true },
    });

    if (!session || session.revokedAt) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session has expired');
    }

    // 3. Check if user is still active
    if (session.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is not active');
    }

    // 4. Rotate refresh token (one-time use)
    const newSessionId = uuidv4();

    await this.prisma.session.update({
      where: { id: session.id },
      data: {
        revokedAt: new Date(),
        revokedReason: 'TOKEN_ROTATED',
      },
    });

    const newSession = await this.prisma.session.create({
      data: {
        id: newSessionId,
        userId: session.userId,
        tenantId: session.tenantId,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        previousSessionId: session.id,
      },
    });

    // 5. Generate new token pair
    return this.jwtService.generateTokens(session.user, newSessionId);
  }
}
```

### 4.4 Token Storage (Frontend)

```typescript
// apps/frontend/src/services/auth.service.ts

// Tokens are stored in HTTP-only cookies (set by backend)
// Frontend cannot access tokens directly - only sends them automatically

export class AuthService {
  // Check if user is authenticated by calling /auth/me
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Send cookies
      });

      if (!response.ok) {
        return null;
      }

      return response.json();
    } catch {
      return null;
    }
  }

  async logout(): Promise<void> {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    // Redirect to login
    window.location.href = '/login';
  }

  // Refresh is handled automatically by axios interceptor
  setupAxiosInterceptor(axiosInstance: AxiosInstance) {
    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await fetch('/api/auth/refresh', {
              method: 'POST',
              credentials: 'include',
            });

            // Retry original request
            return axiosInstance(originalRequest);
          } catch {
            // Refresh failed, redirect to login
            window.location.href = '/login';
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );
  }
}
```

---

## 5. Multi-Tenancy Architecture

### 5.1 Tenancy Model Comparison

| Approach | Isolation | Complexity | Cost | Our Choice |
|----------|-----------|------------|------|------------|
| Separate databases | Highest | High | High | No |
| Separate schemas | High | Medium | Medium | No |
| **Shared DB + RLS** | High | Low | Low | **Yes** |
| Application-level | Low | Low | Low | No |

### 5.2 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Application Layer                          │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │
│  │   Request   │──▶│   Tenant    │──▶│   Service   │                 │
│  │   Handler   │  │  Middleware │  │   Layer     │                  │
│  └─────────────┘  └─────────────┘  └─────────────┘                  │
│                          │                 │                         │
│                          ▼                 ▼                         │
│                   ┌─────────────────────────────┐                    │
│                   │      Prisma Client          │                    │
│                   │  (with $executeRaw for RLS) │                    │
│                   └─────────────────────────────┘                    │
├─────────────────────────────────────────────────────────────────────┤
│                           Database Layer                             │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │                    PostgreSQL 15+                                ││
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              ││
│  │  │  Session    │  │    RLS      │  │   Tables    │              ││
│  │  │  Variable   │──▶│  Policies   │──▶│  (tenant_id)│             ││
│  │  │app.tenant_id│  │             │  │             │              ││
│  │  └─────────────┘  └─────────────┘  └─────────────┘              ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### 5.3 Tenant Context Propagation

#### 5.3.1 Tenant Middleware

```typescript
// apps/backend/src/common/middleware/tenant.middleware.ts

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async use(req: RequestWithTenant, res: Response, next: NextFunction) {
    try {
      // Extract token from cookie or header
      const token = this.extractToken(req);

      if (!token) {
        // Allow public routes
        return next();
      }

      // Verify and decode token
      const payload = this.jwtService.verifyAccessToken(token);

      // Set tenant context on request
      req.tenantId = payload.tenantId;
      req.userId = payload.sub;
      req.userRole = payload.role;
      req.permissions = payload.permissions;

      // Set PostgreSQL session variable for RLS
      await this.prisma.$executeRaw`
        SELECT set_config('app.current_tenant_id', ${payload.tenantId}, true)
      `;

      // Also set user for audit purposes
      await this.prisma.$executeRaw`
        SELECT set_config('app.current_user_id', ${payload.sub}, true)
      `;

      next();
    } catch (error) {
      // Clear any tenant context on error
      req.tenantId = null;
      req.userId = null;
      next();
    }
  }

  private extractToken(req: Request): string | null {
    // Try cookie first
    if (req.cookies?.access_token) {
      return req.cookies.access_token;
    }

    // Try Authorization header
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
```

#### 5.3.2 Request Type Definition

```typescript
// apps/backend/src/common/types/request.types.ts

import { Request } from 'express';
import { Role } from '@prisma/client';

export interface RequestWithTenant extends Request {
  tenantId: string | null;
  userId: string | null;
  userRole: Role | null;
  permissions: string[] | null;
}
```

### 5.4 Tenant-Aware Service Pattern

```typescript
// apps/backend/src/modules/policies/policy.service.ts

@Injectable()
export class PolicyService {
  constructor(
    private prisma: PrismaService,
    @Inject(REQUEST) private request: RequestWithTenant,
  ) {}

  async findAll(pagination: PaginationDto): Promise<PaginatedResult<Policy>> {
    // RLS automatically filters by tenant_id
    // But we also verify tenant context is set
    this.ensureTenantContext();

    const [policies, total] = await Promise.all([
      this.prisma.policy.findMany({
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { updatedAt: 'desc' },
        include: {
          owner: { select: { id: true, firstName: true, lastName: true } },
          currentVersion: true,
        },
      }),
      this.prisma.policy.count(),
    ]);

    return { data: policies, total, ...pagination };
  }

  async findById(id: string): Promise<Policy> {
    this.ensureTenantContext();

    const policy = await this.prisma.policy.findUnique({
      where: { id },
      include: {
        owner: true,
        versions: { orderBy: { versionNumber: 'desc' } },
        comments: { include: { author: true } },
      },
    });

    if (!policy) {
      throw new NotFoundException('Policy not found');
    }

    // RLS ensures we can only see our tenant's policies
    // This check is defense-in-depth
    if (policy.tenantId !== this.request.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return policy;
  }

  async create(data: CreatePolicyDto): Promise<Policy> {
    this.ensureTenantContext();

    return this.prisma.policy.create({
      data: {
        ...data,
        tenantId: this.request.tenantId, // Explicitly set tenant
        ownerId: this.request.userId,
        status: PolicyStatus.DRAFT,
      },
    });
  }

  private ensureTenantContext(): void {
    if (!this.request.tenantId) {
      throw new UnauthorizedException('Tenant context not established');
    }
  }
}
```

---

## 6. Row-Level Security (RLS)

### 6.1 RLS Setup SQL

```sql
-- Enable RLS on all tenant-scoped tables

-- Function to get current tenant from session
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- Function to get current user from session
CREATE OR REPLACE FUNCTION current_user_id()
RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- ============================================
-- TENANTS TABLE (special - no tenant_id filter)
-- ============================================
-- No RLS needed - tenants are isolated by ID

-- ============================================
-- USERS TABLE
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see users in their tenant
CREATE POLICY users_tenant_isolation ON users
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================
-- POLICIES TABLE
-- ============================================
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

CREATE POLICY policies_tenant_isolation ON policies
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================
-- POLICY_VERSIONS TABLE
-- ============================================
ALTER TABLE policy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_versions_tenant_isolation ON policy_versions
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================
-- WORKFLOWS TABLE
-- ============================================
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY workflows_tenant_isolation ON workflows
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================
-- POLICY_WORKFLOWS TABLE
-- ============================================
ALTER TABLE policy_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY policy_workflows_tenant_isolation ON policy_workflows
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================
-- COMMENTS TABLE
-- ============================================
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY comments_tenant_isolation ON comments
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================
-- DISTRIBUTION_CAMPAIGNS TABLE
-- ============================================
ALTER TABLE distribution_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY distribution_campaigns_tenant_isolation ON distribution_campaigns
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================
-- ATTESTATIONS TABLE
-- ============================================
ALTER TABLE attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY attestations_tenant_isolation ON attestations
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================
-- TASKS TABLE
-- ============================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_tenant_isolation ON tasks
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================
-- AUDIT_LOGS TABLE
-- ============================================
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY audit_logs_tenant_isolation ON audit_logs
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================
-- SESSIONS TABLE
-- ============================================
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_tenant_isolation ON sessions
  FOR ALL
  USING (tenant_id = current_tenant_id());
```

### 6.2 RLS Bypass for System Operations

```sql
-- Create a service role that bypasses RLS for system operations
-- This should ONLY be used for migrations, system jobs, etc.

CREATE ROLE ethico_service_role;
ALTER ROLE ethico_service_role SET row_security = off;

-- Grant to specific operations
GRANT ethico_service_role TO postgres; -- For migrations

-- Application should NEVER use this role for normal operations
```

### 6.3 RLS Testing

```typescript
// apps/backend/src/modules/auth/__tests__/rls.integration.spec.ts

describe('Row Level Security', () => {
  let prisma: PrismaService;
  let tenant1: Tenant;
  let tenant2: Tenant;
  let user1: User;
  let user2: User;

  beforeAll(async () => {
    // Create two tenants
    tenant1 = await createTestTenant('tenant-1');
    tenant2 = await createTestTenant('tenant-2');

    // Create users in each tenant
    user1 = await createTestUser(tenant1.id);
    user2 = await createTestUser(tenant2.id);

    // Create policies in each tenant
    await createTestPolicy(tenant1.id, user1.id, 'Policy A');
    await createTestPolicy(tenant2.id, user2.id, 'Policy B');
  });

  it('should only return policies from current tenant', async () => {
    // Set tenant 1 context
    await prisma.$executeRaw`
      SELECT set_config('app.current_tenant_id', ${tenant1.id}, true)
    `;

    const policies = await prisma.policy.findMany();

    expect(policies).toHaveLength(1);
    expect(policies[0].title).toBe('Policy A');
    expect(policies.every(p => p.tenantId === tenant1.id)).toBe(true);
  });

  it('should prevent cross-tenant access via direct ID query', async () => {
    // Set tenant 1 context
    await prisma.$executeRaw`
      SELECT set_config('app.current_tenant_id', ${tenant1.id}, true)
    `;

    // Try to access tenant 2's policy by ID
    const tenant2Policy = await prisma.policy.findFirst({
      where: { tenantId: tenant2.id },
    });

    // RLS should filter this out
    expect(tenant2Policy).toBeNull();
  });

  it('should prevent cross-tenant data insertion', async () => {
    // Set tenant 1 context
    await prisma.$executeRaw`
      SELECT set_config('app.current_tenant_id', ${tenant1.id}, true)
    `;

    // Try to create policy in tenant 2
    await expect(
      prisma.policy.create({
        data: {
          title: 'Malicious Policy',
          tenantId: tenant2.id, // Trying to inject into different tenant
          ownerId: user1.id,
          status: 'DRAFT',
        },
      })
    ).rejects.toThrow(); // RLS should block this
  });
});
```

---

## 7. RBAC Implementation

### 7.1 Role Hierarchy

```
SYSTEM_ADMIN
    │
    ├── COMPLIANCE_OFFICER
    │       │
    │       ├── POLICY_AUTHOR
    │       │       │
    │       │       └── POLICY_REVIEWER
    │       │
    │       └── DEPARTMENT_ADMIN
    │
    └── READ_ONLY
            │
            └── EMPLOYEE
```

### 7.2 Permission Definitions

```typescript
// apps/backend/src/modules/auth/permissions.ts

export enum Permission {
  // Policy Permissions
  POLICY_CREATE = 'policy:create',
  POLICY_READ = 'policy:read',
  POLICY_UPDATE = 'policy:update',
  POLICY_DELETE = 'policy:delete',
  POLICY_PUBLISH = 'policy:publish',
  POLICY_ARCHIVE = 'policy:archive',

  // Workflow Permissions
  WORKFLOW_CREATE = 'workflow:create',
  WORKFLOW_READ = 'workflow:read',
  WORKFLOW_UPDATE = 'workflow:update',
  WORKFLOW_DELETE = 'workflow:delete',
  WORKFLOW_APPROVE = 'workflow:approve',
  WORKFLOW_REJECT = 'workflow:reject',

  // User Management Permissions
  USER_CREATE = 'user:create',
  USER_READ = 'user:read',
  USER_UPDATE = 'user:update',
  USER_DELETE = 'user:delete',
  USER_ASSIGN_ROLE = 'user:assign_role',

  // Distribution Permissions
  DISTRIBUTION_CREATE = 'distribution:create',
  DISTRIBUTION_READ = 'distribution:read',
  DISTRIBUTION_SEND = 'distribution:send',

  // Attestation Permissions
  ATTESTATION_READ = 'attestation:read',
  ATTESTATION_SUBMIT = 'attestation:submit',
  ATTESTATION_MANAGE = 'attestation:manage',

  // Report Permissions
  REPORT_VIEW = 'report:view',
  REPORT_EXPORT = 'report:export',
  REPORT_CREATE_CUSTOM = 'report:create_custom',

  // System Permissions
  TENANT_MANAGE = 'tenant:manage',
  SETTINGS_MANAGE = 'settings:manage',
  AUDIT_VIEW = 'audit:view',

  // AI Permissions
  AI_GENERATE = 'ai:generate',
  AI_BULK_UPDATE = 'ai:bulk_update',

  // Exception Permissions
  EXCEPTION_CREATE = 'exception:create',
  EXCEPTION_READ = 'exception:read',
  EXCEPTION_UPDATE = 'exception:update',
  EXCEPTION_APPROVE = 'exception:approve',
  EXCEPTION_REJECT = 'exception:reject',
  EXCEPTION_RENEW = 'exception:renew',
  EXCEPTION_REVOKE = 'exception:revoke',
  EXCEPTION_MANAGE = 'exception:manage',

  // External Portal Permissions
  PORTAL_CREATE = 'portal:create',
  PORTAL_READ = 'portal:read',
  PORTAL_UPDATE = 'portal:update',
  PORTAL_DELETE = 'portal:delete',
  PORTAL_INVITE = 'portal:invite',
  PORTAL_MANAGE = 'portal:manage',
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SYSTEM_ADMIN]: Object.values(Permission), // All permissions

  [Role.COMPLIANCE_OFFICER]: [
    Permission.POLICY_CREATE,
    Permission.POLICY_READ,
    Permission.POLICY_UPDATE,
    Permission.POLICY_DELETE,
    Permission.POLICY_PUBLISH,
    Permission.POLICY_ARCHIVE,
    Permission.WORKFLOW_CREATE,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_UPDATE,
    Permission.WORKFLOW_DELETE,
    Permission.WORKFLOW_APPROVE,
    Permission.WORKFLOW_REJECT,
    Permission.USER_READ,
    Permission.DISTRIBUTION_CREATE,
    Permission.DISTRIBUTION_READ,
    Permission.DISTRIBUTION_SEND,
    Permission.ATTESTATION_READ,
    Permission.ATTESTATION_MANAGE,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.REPORT_CREATE_CUSTOM,
    Permission.AUDIT_VIEW,
    Permission.AI_GENERATE,
    Permission.AI_BULK_UPDATE,
    // Exception management
    Permission.EXCEPTION_READ,
    Permission.EXCEPTION_APPROVE,
    Permission.EXCEPTION_REJECT,
    Permission.EXCEPTION_REVOKE,
    Permission.EXCEPTION_MANAGE,
    // External portal management
    Permission.PORTAL_CREATE,
    Permission.PORTAL_READ,
    Permission.PORTAL_UPDATE,
    Permission.PORTAL_DELETE,
    Permission.PORTAL_INVITE,
    Permission.PORTAL_MANAGE,
  ],

  [Role.POLICY_AUTHOR]: [
    Permission.POLICY_CREATE,
    Permission.POLICY_READ,
    Permission.POLICY_UPDATE,
    Permission.WORKFLOW_READ,
    Permission.USER_READ,
    Permission.DISTRIBUTION_READ,
    Permission.ATTESTATION_READ,
    Permission.REPORT_VIEW,
    Permission.AI_GENERATE,
  ],

  [Role.POLICY_REVIEWER]: [
    Permission.POLICY_READ,
    Permission.WORKFLOW_READ,
    Permission.WORKFLOW_APPROVE,
    Permission.WORKFLOW_REJECT,
    Permission.USER_READ,
    Permission.ATTESTATION_READ,
    Permission.REPORT_VIEW,
  ],

  [Role.DEPARTMENT_ADMIN]: [
    Permission.POLICY_READ,
    Permission.USER_READ,
    Permission.USER_UPDATE,
    Permission.DISTRIBUTION_READ,
    Permission.ATTESTATION_READ,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
  ],

  [Role.READ_ONLY]: [
    Permission.POLICY_READ,
    Permission.WORKFLOW_READ,
    Permission.USER_READ,
    Permission.ATTESTATION_READ,
    Permission.REPORT_VIEW,
  ],

  [Role.EMPLOYEE]: [
    Permission.POLICY_READ,
    Permission.ATTESTATION_READ,
    Permission.ATTESTATION_SUBMIT,
    // Exception requests
    Permission.EXCEPTION_CREATE,
    Permission.EXCEPTION_READ,
    Permission.EXCEPTION_UPDATE,
    Permission.EXCEPTION_RENEW,
  ],
};
```

### 7.3 RBAC Guards

```typescript
// apps/backend/src/common/guards/roles.guard.ts

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No role requirement
    }

    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const userRole = request.userRole;

    if (!userRole) {
      throw new UnauthorizedException('User role not found');
    }

    // Check if user's role is in required roles or is higher in hierarchy
    return this.hasRequiredRole(userRole, requiredRoles);
  }

  private hasRequiredRole(userRole: Role, requiredRoles: Role[]): boolean {
    // Direct match
    if (requiredRoles.includes(userRole)) {
      return true;
    }

    // Check hierarchy (admin can do everything)
    if (userRole === Role.SYSTEM_ADMIN) {
      return true;
    }

    // Compliance officer can do author/reviewer tasks
    if (userRole === Role.COMPLIANCE_OFFICER) {
      const complianceCanDo = [
        Role.POLICY_AUTHOR,
        Role.POLICY_REVIEWER,
        Role.DEPARTMENT_ADMIN,
        Role.READ_ONLY,
        Role.EMPLOYEE,
      ];
      return requiredRoles.some(r => complianceCanDo.includes(r));
    }

    return false;
  }
}

// apps/backend/src/common/guards/permissions.guard.ts

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const userPermissions = request.permissions || [];

    return requiredPermissions.every(
      permission => userPermissions.includes(permission)
    );
  }
}
```

### 7.4 Using RBAC Decorators

```typescript
// apps/backend/src/common/decorators/roles.decorator.ts

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

// Usage in controllers
@Controller('policies')
export class PolicyController {
  @Post()
  @Roles(Role.COMPLIANCE_OFFICER, Role.POLICY_AUTHOR)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async create(@Body() dto: CreatePolicyDto) {
    // ...
  }

  @Post(':id/publish')
  @RequirePermissions(Permission.POLICY_PUBLISH)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  async publish(@Param('id') id: string) {
    // ...
  }

  @Get()
  @Roles(Role.EMPLOYEE) // Everyone can read
  @UseGuards(JwtAuthGuard, RolesGuard)
  async findAll() {
    // ...
  }
}
```

---

## 8. Session Management

### 8.1 Session Schema

```prisma
model Session {
  id                String    @id @default(uuid())
  userId            String
  tenantId          String
  userAgent         String?
  ipAddress         String?
  createdAt         DateTime  @default(now())
  expiresAt         DateTime
  revokedAt         DateTime?
  revokedReason     String?
  previousSessionId String?   // For token rotation tracking

  user              User      @relation(fields: [userId], references: [id])
  tenant            Tenant    @relation(fields: [tenantId], references: [id])

  @@index([userId])
  @@index([tenantId])
  @@index([expiresAt])
}
```

### 8.2 Session Service

```typescript
// apps/backend/src/modules/auth/session.service.ts

@Injectable()
export class SessionService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async create(data: CreateSessionData): Promise<Session> {
    const session = await this.prisma.session.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Cache session for fast lookups
    await this.redisService.set(
      `session:${session.id}`,
      JSON.stringify(session),
      7 * 24 * 60 * 60 // 7 days in seconds
    );

    return session;
  }

  async validate(sessionId: string): Promise<Session | null> {
    // Try cache first
    const cached = await this.redisService.get(`session:${sessionId}`);
    if (cached) {
      const session = JSON.parse(cached) as Session;
      if (session.revokedAt || new Date(session.expiresAt) < new Date()) {
        return null;
      }
      return session;
    }

    // Fall back to database
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      return null;
    }

    // Update cache
    await this.redisService.set(
      `session:${sessionId}`,
      JSON.stringify(session),
      Math.floor((session.expiresAt.getTime() - Date.now()) / 1000)
    );

    return session;
  }

  async revoke(sessionId: string, reason: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    // Remove from cache
    await this.redisService.del(`session:${sessionId}`);
  }

  async revokeAllForUser(userId: string, reason: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    // Clear user's sessions from cache (would need to track keys)
    // For simplicity, let TTL handle cache expiration
  }

  async getActiveSessions(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

### 8.3 Logout Implementation

```typescript
// apps/backend/src/modules/auth/auth.controller.ts

@Controller('auth')
export class AuthController {
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @Req() req: RequestWithTenant,
    @Res() res: Response
  ) {
    // Revoke current session
    const token = req.cookies.access_token;
    const payload = this.jwtService.verifyAccessToken(token);

    await this.sessionService.revoke(payload.sessionId, 'USER_LOGOUT');

    // Clear cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    // Audit log
    await this.auditService.log({
      action: 'USER_LOGOUT',
      userId: req.userId,
      tenantId: req.tenantId,
    });

    res.json({ success: true });
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  async logoutAll(
    @Req() req: RequestWithTenant,
    @Res() res: Response
  ) {
    // Revoke all sessions for user
    await this.sessionService.revokeAllForUser(
      req.userId,
      'USER_LOGOUT_ALL'
    );

    // Clear cookies
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');

    await this.auditService.log({
      action: 'USER_LOGOUT_ALL',
      userId: req.userId,
      tenantId: req.tenantId,
    });

    res.json({ success: true });
  }
}
```

---

## 9. Exception Lifecycle Authorization

### 9.1 Overview

Policy exceptions allow employees to request temporary deviations from policy requirements. The authorization model ensures proper oversight while enabling legitimate business needs.

### 9.2 Exception Workflow Roles

| Role | Can Request | Can Approve | Can Revoke | Can Manage Register |
|------|-------------|-------------|------------|---------------------|
| Employee | ✅ Own requests | ❌ | ❌ | ❌ |
| Department Admin | ✅ | ✅ Department only | ❌ | ✅ Department view |
| Policy Author | ✅ | ✅ Owned policies | ❌ | ✅ Policy view |
| Compliance Officer | ✅ | ✅ All | ✅ | ✅ Full register |
| System Admin | ✅ | ✅ All | ✅ | ✅ Full register |

### 9.3 Exception Authorization Service

```typescript
// apps/backend/src/modules/exceptions/exception-auth.service.ts

import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, Permission } from '../auth/permissions';

@Injectable()
export class ExceptionAuthService {
  constructor(private prisma: PrismaService) {}

  async canRequestException(
    userId: string,
    policyId: string,
    tenantId: string
  ): Promise<boolean> {
    // All authenticated users can request exceptions for their own needs
    // Verify user belongs to tenant
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user || user.status !== 'ACTIVE') {
      return false;
    }

    // Verify policy exists and is published
    const policy = await this.prisma.policy.findFirst({
      where: { id: policyId, tenantId, status: 'PUBLISHED' },
    });

    return !!policy;
  }

  async canApproveException(
    userId: string,
    exceptionId: string,
    tenantId: string
  ): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, role: true, departmentId: true },
    });

    if (!user) return false;

    // System admin and compliance officer can approve any exception
    if ([Role.SYSTEM_ADMIN, Role.COMPLIANCE_OFFICER].includes(user.role)) {
      return true;
    }

    // Get exception details
    const exception = await this.prisma.policyException.findFirst({
      where: { id: exceptionId, tenantId },
      include: {
        policy: { select: { ownerId: true } },
        requestedBy: { select: { departmentId: true } },
      },
    });

    if (!exception) return false;

    // Cannot approve own requests
    if (exception.requestedById === userId) {
      return false;
    }

    // Policy author can approve exceptions for their policies
    if (user.role === Role.POLICY_AUTHOR && exception.policy.ownerId === userId) {
      return true;
    }

    // Department admin can approve for their department
    if (user.role === Role.DEPARTMENT_ADMIN &&
        user.departmentId === exception.requestedBy.departmentId) {
      return true;
    }

    return false;
  }

  async canViewException(
    userId: string,
    exceptionId: string,
    tenantId: string
  ): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { id: true, role: true, departmentId: true },
    });

    if (!user) return false;

    // Admin roles can view all
    if ([Role.SYSTEM_ADMIN, Role.COMPLIANCE_OFFICER].includes(user.role)) {
      return true;
    }

    const exception = await this.prisma.policyException.findFirst({
      where: { id: exceptionId, tenantId },
      include: {
        policy: { select: { ownerId: true } },
        requestedBy: { select: { id: true, departmentId: true } },
      },
    });

    if (!exception) return false;

    // Users can view their own requests
    if (exception.requestedById === userId) {
      return true;
    }

    // Policy owners can view exceptions for their policies
    if (exception.policy.ownerId === userId) {
      return true;
    }

    // Department admins can view department exceptions
    if (user.role === Role.DEPARTMENT_ADMIN &&
        user.departmentId === exception.requestedBy.departmentId) {
      return true;
    }

    return false;
  }

  async getExceptionApprovers(
    policyId: string,
    tenantId: string
  ): Promise<ApproverInfo[]> {
    // Get policy owner
    const policy = await this.prisma.policy.findFirst({
      where: { id: policyId, tenantId },
      select: {
        ownerId: true,
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Get all users who can approve
    const approvers = await this.prisma.user.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        role: { in: [Role.COMPLIANCE_OFFICER, Role.SYSTEM_ADMIN] },
      },
      select: { id: true, firstName: true, lastName: true, email: true, role: true },
    });

    const result: ApproverInfo[] = approvers.map((a) => ({
      id: a.id,
      name: `${a.firstName} ${a.lastName}`,
      email: a.email,
      role: a.role,
      approverType: 'role',
    }));

    // Add policy owner if they can approve
    if (policy?.owner) {
      result.push({
        id: policy.owner.id,
        name: `${policy.owner.firstName} ${policy.owner.lastName}`,
        email: policy.owner.email,
        role: Role.POLICY_AUTHOR,
        approverType: 'policy_owner',
      });
    }

    return result;
  }
}

interface ApproverInfo {
  id: string;
  name: string;
  email: string;
  role: Role;
  approverType: 'role' | 'policy_owner' | 'department_admin';
}
```

### 9.4 Exception Guard

```typescript
// apps/backend/src/common/guards/exception.guard.ts

@Injectable()
export class ExceptionApprovalGuard implements CanActivate {
  constructor(private exceptionAuthService: ExceptionAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithTenant>();
    const exceptionId = request.params.id || request.params.exceptionId;

    if (!exceptionId || !request.userId || !request.tenantId) {
      throw new ForbiddenException('Missing required context');
    }

    const canApprove = await this.exceptionAuthService.canApproveException(
      request.userId,
      exceptionId,
      request.tenantId
    );

    if (!canApprove) {
      throw new ForbiddenException('You are not authorized to approve this exception');
    }

    return true;
  }
}

// Usage in controller
@Controller('exceptions')
export class ExceptionController {
  @Post(':id/approve')
  @UseGuards(JwtAuthGuard, ExceptionApprovalGuard)
  async approveException(
    @Param('id') id: string,
    @Body() dto: ApproveExceptionDto,
    @Req() req: RequestWithTenant
  ) {
    return this.exceptionService.approve(id, dto, req.userId);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, ExceptionApprovalGuard)
  async rejectException(
    @Param('id') id: string,
    @Body() dto: RejectExceptionDto,
    @Req() req: RequestWithTenant
  ) {
    return this.exceptionService.reject(id, dto, req.userId);
  }
}
```

### 9.5 Exception Notification Rules

```typescript
// apps/backend/src/modules/exceptions/exception-notification.service.ts

interface NotificationRule {
  event: ExceptionEvent;
  recipients: RecipientType[];
  template: string;
}

type ExceptionEvent =
  | 'EXCEPTION_REQUESTED'
  | 'EXCEPTION_APPROVED'
  | 'EXCEPTION_REJECTED'
  | 'EXCEPTION_EXPIRING'
  | 'EXCEPTION_EXPIRED'
  | 'EXCEPTION_RENEWED'
  | 'EXCEPTION_REVOKED';

type RecipientType =
  | 'requestor'
  | 'approvers'
  | 'policy_owner'
  | 'compliance_team'
  | 'department_admin';

const NOTIFICATION_RULES: NotificationRule[] = [
  {
    event: 'EXCEPTION_REQUESTED',
    recipients: ['approvers', 'policy_owner'],
    template: 'exception-request',
  },
  {
    event: 'EXCEPTION_APPROVED',
    recipients: ['requestor', 'compliance_team'],
    template: 'exception-approved',
  },
  {
    event: 'EXCEPTION_REJECTED',
    recipients: ['requestor'],
    template: 'exception-rejected',
  },
  {
    event: 'EXCEPTION_EXPIRING',
    recipients: ['requestor', 'approvers'],
    template: 'exception-expiring',
  },
  {
    event: 'EXCEPTION_EXPIRED',
    recipients: ['requestor', 'compliance_team'],
    template: 'exception-expired',
  },
];
```

---

## 10. External Portal Authentication

### 10.1 Overview

External portals provide limited, time-bound access to policies for external parties (vendors, partners, regulators) without requiring full user accounts.

### 10.2 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     External Portal Authentication Flow                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. Admin creates portal       2. System generates          3. External     │
│     and invites external   ──▶    magic link with      ──▶    user clicks  │
│     user                          secure token                 link         │
│                                                                              │
│                                                                              │
│  4. Token validated            5. Limited session           6. Access       │
│     (expiration, usage    ◀──     created with         ◀──    granted to   │
│      limits checked)              restricted scope            portal        │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 10.3 External User Token Structure

```typescript
// apps/backend/src/modules/portals/types.ts

interface ExternalAccessToken {
  sub: string;              // External user ID
  type: 'external_access';
  portalId: string;         // Portal ID
  tenantId: string;         // Owner tenant
  email: string;            // External user email
  permissions: ExternalPermission[];
  policyIds: string[];      // Accessible policies
  exp: number;              // Short expiration (1 hour)
  iat: number;
}

interface MagicLinkToken {
  sub: string;              // External user ID
  type: 'magic_link';
  portalId: string;
  tenantId: string;
  inviteId: string;         // Invitation reference
  exp: number;              // Link expiration (24-48 hours)
  singleUse: boolean;       // If true, invalidated after first use
}

type ExternalPermission =
  | 'policy:view'           // View policy content
  | 'policy:download'       // Download policy as PDF
  | 'attestation:submit';   // Submit acknowledgment
```

### 10.4 Magic Link Service

```typescript
// apps/backend/src/modules/portals/magic-link.service.ts

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MagicLinkService {
  private readonly magicLinkSecret: string;
  private readonly baseUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.magicLinkSecret = configService.get('MAGIC_LINK_SECRET');
    this.baseUrl = configService.get('FRONTEND_URL');
  }

  async createInvitation(data: CreateInvitationDto): Promise<PortalInvitation> {
    const { portalId, email, tenantId, expiresIn = 48 } = data;

    // Verify portal exists
    const portal = await this.prisma.externalPortal.findFirst({
      where: { id: portalId, tenantId, status: 'ACTIVE' },
    });

    if (!portal) {
      throw new Error('Portal not found or inactive');
    }

    // Check if external user exists or create
    let externalUser = await this.prisma.externalUser.findFirst({
      where: { email: email.toLowerCase(), tenantId },
    });

    if (!externalUser) {
      externalUser = await this.prisma.externalUser.create({
        data: {
          email: email.toLowerCase(),
          tenantId,
          status: 'PENDING',
        },
      });
    }

    // Generate secure token
    const tokenValue = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + expiresIn * 60 * 60 * 1000);

    // Create invitation record
    const invitation = await this.prisma.portalInvitation.create({
      data: {
        portalId,
        externalUserId: externalUser.id,
        tenantId,
        token: this.hashToken(tokenValue),
        expiresAt,
        maxUses: 1,
        usedCount: 0,
        createdById: data.createdById,
      },
    });

    // Generate magic link JWT
    const magicLinkJwt = jwt.sign(
      {
        sub: externalUser.id,
        type: 'magic_link',
        portalId,
        tenantId,
        inviteId: invitation.id,
        singleUse: true,
      } as MagicLinkToken,
      this.magicLinkSecret,
      { expiresIn: `${expiresIn}h` }
    );

    return {
      id: invitation.id,
      email: externalUser.email,
      magicLink: `${this.baseUrl}/portal/access/${magicLinkJwt}`,
      expiresAt,
    };
  }

  async validateMagicLink(token: string): Promise<ExternalAccessResult> {
    try {
      // Verify JWT
      const payload = jwt.verify(token, this.magicLinkSecret) as MagicLinkToken;

      if (payload.type !== 'magic_link') {
        throw new Error('Invalid token type');
      }

      // Get invitation
      const invitation = await this.prisma.portalInvitation.findUnique({
        where: { id: payload.inviteId },
        include: {
          portal: {
            include: {
              policies: { select: { id: true } },
            },
          },
          externalUser: true,
        },
      });

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      // Check expiration
      if (invitation.expiresAt < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Check usage limits
      if (invitation.maxUses && invitation.usedCount >= invitation.maxUses) {
        throw new Error('Invitation has already been used');
      }

      // Mark as used (if single use)
      if (payload.singleUse) {
        await this.prisma.portalInvitation.update({
          where: { id: invitation.id },
          data: {
            usedCount: { increment: 1 },
            lastUsedAt: new Date(),
          },
        });
      }

      // Update external user status
      await this.prisma.externalUser.update({
        where: { id: invitation.externalUserId },
        data: { status: 'ACTIVE', lastAccessAt: new Date() },
      });

      // Generate external access token
      const accessToken = this.generateExternalAccessToken(
        invitation.externalUser,
        invitation.portal,
        invitation.portal.policies.map((p) => p.id)
      );

      return {
        accessToken,
        portal: invitation.portal,
        externalUser: invitation.externalUser,
      };
    } catch (error) {
      throw new Error(`Magic link validation failed: ${error.message}`);
    }
  }

  private generateExternalAccessToken(
    user: ExternalUser,
    portal: ExternalPortal,
    policyIds: string[]
  ): string {
    const permissions = this.getPortalPermissions(portal.accessLevel);

    const payload: ExternalAccessToken = {
      sub: user.id,
      type: 'external_access',
      portalId: portal.id,
      tenantId: portal.tenantId,
      email: user.email,
      permissions,
      policyIds,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    };

    return jwt.sign(payload, this.magicLinkSecret);
  }

  private getPortalPermissions(accessLevel: string): ExternalPermission[] {
    const levels: Record<string, ExternalPermission[]> = {
      view_only: ['policy:view'],
      download: ['policy:view', 'policy:download'],
      acknowledge: ['policy:view', 'policy:download', 'attestation:submit'],
    };

    return levels[accessLevel] || levels.view_only;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}

interface CreateInvitationDto {
  portalId: string;
  email: string;
  tenantId: string;
  expiresIn?: number; // hours
  createdById: string;
}

interface PortalInvitation {
  id: string;
  email: string;
  magicLink: string;
  expiresAt: Date;
}

interface ExternalAccessResult {
  accessToken: string;
  portal: ExternalPortal;
  externalUser: ExternalUser;
}
```

### 10.5 External Access Guard

```typescript
// apps/backend/src/common/guards/external-access.guard.ts

@Injectable()
export class ExternalAccessGuard implements CanActivate {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Try to get token from cookie or header
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('No access token provided');
    }

    try {
      const payload = jwt.verify(
        token,
        this.configService.get('MAGIC_LINK_SECRET')
      ) as ExternalAccessToken;

      if (payload.type !== 'external_access') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Verify portal is still active
      const portal = await this.prisma.externalPortal.findFirst({
        where: {
          id: payload.portalId,
          tenantId: payload.tenantId,
          status: 'ACTIVE',
        },
      });

      if (!portal) {
        throw new UnauthorizedException('Portal access revoked');
      }

      // Set external context on request
      request.externalUser = {
        id: payload.sub,
        email: payload.email,
        portalId: payload.portalId,
        tenantId: payload.tenantId,
        permissions: payload.permissions,
        policyIds: payload.policyIds,
      };

      request.isExternalAccess = true;

      return true;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Access token expired');
      }
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private extractToken(request: Request): string | null {
    if (request.cookies?.external_access_token) {
      return request.cookies.external_access_token;
    }

    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
```

### 10.6 External Policy Access Control

```typescript
// apps/backend/src/modules/portals/external-policy.guard.ts

@Injectable()
export class ExternalPolicyAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (!request.isExternalAccess) {
      return true; // Let other guards handle internal access
    }

    const policyId = request.params.id || request.params.policyId;

    if (!policyId) {
      return true;
    }

    // Check if policy is in allowed list
    const allowedPolicies = request.externalUser?.policyIds || [];

    if (!allowedPolicies.includes(policyId)) {
      throw new ForbiddenException('Access to this policy is not permitted');
    }

    return true;
  }
}

// Usage in controller
@Controller('portal/policies')
export class ExternalPolicyController {
  @Get(':id')
  @UseGuards(ExternalAccessGuard, ExternalPolicyAccessGuard)
  async getPolicy(@Param('id') id: string, @Req() req: Request) {
    // Only returns policy content, not internal metadata
    return this.policyService.getExternalView(id);
  }

  @Get(':id/download')
  @UseGuards(ExternalAccessGuard, ExternalPolicyAccessGuard)
  @RequireExternalPermission('policy:download')
  async downloadPolicy(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.policyService.generatePdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  }

  @Post(':id/acknowledge')
  @UseGuards(ExternalAccessGuard, ExternalPolicyAccessGuard)
  @RequireExternalPermission('attestation:submit')
  async acknowledgePolicy(
    @Param('id') id: string,
    @Body() dto: AcknowledgeDto,
    @Req() req: Request
  ) {
    return this.attestationService.createExternalAttestation({
      policyId: id,
      externalUserId: req.externalUser.id,
      ...dto,
    });
  }
}
```

### 10.7 Portal Session Management

```typescript
// apps/backend/src/modules/portals/portal-session.service.ts

@Injectable()
export class PortalSessionService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  async createSession(
    externalUserId: string,
    portalId: string,
    tenantId: string,
    ipAddress: string
  ): Promise<ExternalSession> {
    const sessionId = crypto.randomUUID();

    const session = await this.prisma.externalSession.create({
      data: {
        id: sessionId,
        externalUserId,
        portalId,
        tenantId,
        ipAddress,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    // Cache for fast lookups
    await this.redisService.set(
      `external_session:${sessionId}`,
      JSON.stringify(session),
      3600
    );

    return session;
  }

  async validateSession(sessionId: string): Promise<ExternalSession | null> {
    // Check cache
    const cached = await this.redisService.get(`external_session:${sessionId}`);

    if (cached) {
      const session = JSON.parse(cached);
      if (new Date(session.expiresAt) < new Date() || session.revokedAt) {
        return null;
      }
      return session;
    }

    // Fallback to database
    const session = await this.prisma.externalSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.expiresAt < new Date() || session.revokedAt) {
      return null;
    }

    return session;
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.externalSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    await this.redisService.del(`external_session:${sessionId}`);
  }

  async revokeAllPortalSessions(portalId: string): Promise<void> {
    await this.prisma.externalSession.updateMany({
      where: { portalId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Clear cache entries (in production, use Redis pattern delete)
  }
}
```

### 10.8 Portal RLS Policies

```sql
-- RLS for external portal tables

-- ============================================
-- EXTERNAL_PORTALS TABLE
-- ============================================
ALTER TABLE external_portals ENABLE ROW LEVEL SECURITY;

CREATE POLICY external_portals_tenant_isolation ON external_portals
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================
-- EXTERNAL_USERS TABLE
-- ============================================
ALTER TABLE external_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY external_users_tenant_isolation ON external_users
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================
-- PORTAL_INVITATIONS TABLE
-- ============================================
ALTER TABLE portal_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY portal_invitations_tenant_isolation ON portal_invitations
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================
-- EXTERNAL_SESSIONS TABLE
-- ============================================
ALTER TABLE external_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY external_sessions_tenant_isolation ON external_sessions
  FOR ALL
  USING (tenant_id = current_tenant_id());

-- ============================================
-- EXTERNAL_ATTESTATIONS TABLE
-- ============================================
ALTER TABLE external_attestations ENABLE ROW LEVEL SECURITY;

CREATE POLICY external_attestations_tenant_isolation ON external_attestations
  FOR ALL
  USING (tenant_id = current_tenant_id());
```

---

## 11. Security Considerations

### 9.1 Security Checklist

| Category | Requirement | Implementation |
|----------|-------------|----------------|
| Tokens | Short-lived access tokens | 15-minute expiration |
| Tokens | Secure token storage | HTTP-only, Secure, SameSite cookies |
| Tokens | Token rotation | Refresh tokens are single-use |
| Passwords | Strong hashing | bcrypt with cost factor 12 |
| Sessions | Session invalidation | Revocation on logout, password change |
| RLS | Database-level isolation | PostgreSQL RLS on all tenant tables |
| RBAC | Principle of least privilege | Fine-grained permissions |
| Audit | Authentication logging | All auth events logged |
| Input | Validation | Class-validator on all DTOs |
| Output | Sanitization | No sensitive data in responses |

### 9.2 Rate Limiting

```typescript
// apps/backend/src/common/guards/rate-limit.guard.ts

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    const key = `rate_limit:auth:${ip}`;

    const current = await this.redisService.incr(key);

    if (current === 1) {
      await this.redisService.expire(key, 60); // 1 minute window
    }

    if (current > 10) { // 10 attempts per minute
      throw new HttpException(
        'Too many authentication attempts',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }
}

// Apply to auth endpoints
@Controller('auth')
export class AuthController {
  @Post('login')
  @UseGuards(RateLimitGuard)
  async login(@Body() dto: LoginDto) {
    // ...
  }
}
```

### 9.3 Security Headers

```typescript
// apps/backend/src/main.ts

import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
  }));

  app.enableCors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  });

  await app.listen(3000);
}
```

### 9.4 Audit Logging

```typescript
// apps/backend/src/modules/audit/audit.service.ts

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(event: AuditEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        action: event.action,
        userId: event.userId,
        tenantId: event.tenantId,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        metadata: event.metadata,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        timestamp: new Date(),
      },
    });
  }
}

// Audit events to log
type AuditAction =
  | 'USER_LOGIN'
  | 'USER_LOGOUT'
  | 'USER_LOGOUT_ALL'
  | 'USER_LOGIN_FAILED'
  | 'USER_SSO_LINKED'
  | 'USER_JIT_PROVISIONED'
  | 'USER_PASSWORD_CHANGED'
  | 'USER_ROLE_CHANGED'
  | 'SESSION_CREATED'
  | 'SESSION_REVOKED'
  | 'TOKEN_REFRESHED'
  | 'PERMISSION_DENIED';
```

---

## 12. API Specifications

### 12.1 Authentication Endpoints

```yaml
# Authentication API

/api/auth/login:
  post:
    summary: Login with email/password
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [email, password]
            properties:
              email:
                type: string
                format: email
              password:
                type: string
                minLength: 8
    responses:
      200:
        description: Login successful
        headers:
          Set-Cookie:
            description: access_token and refresh_token cookies
      401:
        description: Invalid credentials
      429:
        description: Too many attempts

/api/auth/azure-ad:
  get:
    summary: Initiate Microsoft SSO login
    responses:
      302:
        description: Redirect to Microsoft login

/api/auth/azure-ad/callback:
  post:
    summary: Microsoft SSO callback
    responses:
      302:
        description: Redirect to frontend with tokens set

/api/auth/google:
  get:
    summary: Initiate Google OAuth login
    responses:
      302:
        description: Redirect to Google login

/api/auth/google/callback:
  get:
    summary: Google OAuth callback
    responses:
      302:
        description: Redirect to frontend with tokens set

/api/auth/refresh:
  post:
    summary: Refresh access token
    responses:
      200:
        description: New tokens set in cookies
      401:
        description: Invalid or expired refresh token

/api/auth/logout:
  post:
    summary: Logout current session
    security:
      - cookieAuth: []
    responses:
      200:
        description: Logged out successfully

/api/auth/logout-all:
  post:
    summary: Logout all sessions
    security:
      - cookieAuth: []
    responses:
      200:
        description: All sessions revoked

/api/auth/me:
  get:
    summary: Get current user info
    security:
      - cookieAuth: []
    responses:
      200:
        description: Current user data
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
      401:
        description: Not authenticated

/api/auth/sessions:
  get:
    summary: List active sessions
    security:
      - cookieAuth: []
    responses:
      200:
        description: List of active sessions
        content:
          application/json:
            schema:
              type: array
              items:
                $ref: '#/components/schemas/Session'

  delete:
    summary: Revoke a specific session
    security:
      - cookieAuth: []
    parameters:
      - name: sessionId
        in: query
        required: true
        schema:
          type: string
    responses:
      200:
        description: Session revoked
```

### 12.2 User Management Endpoints

```yaml
/api/users:
  get:
    summary: List users in tenant
    security:
      - cookieAuth: []
    parameters:
      - $ref: '#/components/parameters/page'
      - $ref: '#/components/parameters/limit'
      - name: role
        in: query
        schema:
          $ref: '#/components/schemas/Role'
      - name: status
        in: query
        schema:
          $ref: '#/components/schemas/UserStatus'
    responses:
      200:
        description: Paginated user list

  post:
    summary: Create new user
    security:
      - cookieAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/CreateUserDto'
    responses:
      201:
        description: User created
      403:
        description: Insufficient permissions

/api/users/{id}:
  get:
    summary: Get user by ID
    security:
      - cookieAuth: []
    responses:
      200:
        description: User details
      404:
        description: User not found

  patch:
    summary: Update user
    security:
      - cookieAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/UpdateUserDto'
    responses:
      200:
        description: User updated

  delete:
    summary: Deactivate user
    security:
      - cookieAuth: []
    responses:
      200:
        description: User deactivated

/api/users/{id}/role:
  patch:
    summary: Change user role
    security:
      - cookieAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [role]
            properties:
              role:
                $ref: '#/components/schemas/Role'
    responses:
      200:
        description: Role updated
      403:
        description: Cannot assign this role
```

### 12.3 Exception API Endpoints

```yaml
/api/exceptions:
  get:
    summary: List exception requests
    security:
      - cookieAuth: []
    parameters:
      - name: status
        in: query
        schema:
          type: string
          enum: [pending, approved, rejected, expired, revoked]
      - name: policyId
        in: query
        schema:
          type: string
      - name: departmentId
        in: query
        schema:
          type: string
    responses:
      200:
        description: List of exceptions (filtered by role access)

  post:
    summary: Request a policy exception
    security:
      - cookieAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [policyId, reason, expiresAt]
            properties:
              policyId:
                type: string
              reason:
                type: string
              businessJustification:
                type: string
              expiresAt:
                type: string
                format: date-time
              attachments:
                type: array
                items:
                  type: string
    responses:
      201:
        description: Exception request created
      403:
        description: Cannot request exceptions for this policy

/api/exceptions/{id}:
  get:
    summary: Get exception details
    security:
      - cookieAuth: []
    responses:
      200:
        description: Exception details
      403:
        description: Access denied
      404:
        description: Exception not found

/api/exceptions/{id}/approve:
  post:
    summary: Approve an exception request
    security:
      - cookieAuth: []
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              comments:
                type: string
              conditions:
                type: string
    responses:
      200:
        description: Exception approved
      403:
        description: Not authorized to approve

/api/exceptions/{id}/reject:
  post:
    summary: Reject an exception request
    security:
      - cookieAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [reason]
            properties:
              reason:
                type: string
    responses:
      200:
        description: Exception rejected
      403:
        description: Not authorized to reject

/api/exceptions/{id}/renew:
  post:
    summary: Request exception renewal
    security:
      - cookieAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [newExpiresAt, reason]
            properties:
              newExpiresAt:
                type: string
                format: date-time
              reason:
                type: string
    responses:
      200:
        description: Renewal request submitted
      403:
        description: Cannot renew this exception

/api/exceptions/{id}/revoke:
  post:
    summary: Revoke an approved exception
    security:
      - cookieAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [reason]
            properties:
              reason:
                type: string
    responses:
      200:
        description: Exception revoked
      403:
        description: Not authorized to revoke
```

### 12.4 External Portal API Endpoints

```yaml
/api/portals:
  get:
    summary: List external portals
    security:
      - cookieAuth: []
    responses:
      200:
        description: List of portals

  post:
    summary: Create external portal
    security:
      - cookieAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [name, accessLevel]
            properties:
              name:
                type: string
              description:
                type: string
              accessLevel:
                type: string
                enum: [view_only, download, acknowledge]
              policyIds:
                type: array
                items:
                  type: string
              expiresAt:
                type: string
                format: date-time
    responses:
      201:
        description: Portal created
      403:
        description: Insufficient permissions

/api/portals/{id}/invite:
  post:
    summary: Invite external user to portal
    security:
      - cookieAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [email]
            properties:
              email:
                type: string
                format: email
              expiresIn:
                type: integer
                description: Hours until link expires
                default: 48
              message:
                type: string
    responses:
      200:
        description: Invitation sent
        content:
          application/json:
            schema:
              type: object
              properties:
                invitationId:
                  type: string
                magicLink:
                  type: string
                expiresAt:
                  type: string

/api/portal/access/{token}:
  get:
    summary: Validate magic link and get access token
    responses:
      200:
        description: Access granted
        headers:
          Set-Cookie:
            description: external_access_token cookie
      401:
        description: Invalid or expired link

/api/portal/policies:
  get:
    summary: List accessible policies (external access)
    security:
      - externalAuth: []
    responses:
      200:
        description: List of policies accessible via portal

/api/portal/policies/{id}:
  get:
    summary: View policy content (external access)
    security:
      - externalAuth: []
    responses:
      200:
        description: Policy content
      403:
        description: Policy not accessible via this portal

/api/portal/policies/{id}/download:
  get:
    summary: Download policy as PDF (external access)
    security:
      - externalAuth: []
    responses:
      200:
        description: PDF file
        content:
          application/pdf:
            schema:
              type: string
              format: binary
      403:
        description: Download not permitted

/api/portal/policies/{id}/acknowledge:
  post:
    summary: Submit policy acknowledgment (external access)
    security:
      - externalAuth: []
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required: [acknowledged]
            properties:
              acknowledged:
                type: boolean
              signature:
                type: string
              comments:
                type: string
    responses:
      200:
        description: Acknowledgment recorded
      403:
        description: Acknowledgment not permitted
```

---

## 13. Database Schema

### 13.1 Prisma Schema

```prisma
// apps/backend/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// ENUMS
// ============================================

enum Role {
  SYSTEM_ADMIN
  COMPLIANCE_OFFICER
  POLICY_AUTHOR
  POLICY_REVIEWER
  DEPARTMENT_ADMIN
  READ_ONLY
  EMPLOYEE
}

enum UserStatus {
  ACTIVE
  INACTIVE
  PENDING
  SUSPENDED
}

enum SSOProvider {
  AZURE_AD
  GOOGLE
  NONE
}

// ============================================
// TENANT
// ============================================

model Tenant {
  id                    String    @id @default(uuid())
  name                  String
  slug                  String    @unique
  logoUrl               String?
  primaryColor          String?
  allowJitProvisioning  Boolean   @default(true)
  ssoEnabled            Boolean   @default(false)
  ssoProvider           SSOProvider @default(NONE)
  ssoConfig             Json?
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  // Relations
  users                 User[]
  domains               TenantDomain[]
  sessions              Session[]
  policies              Policy[]
  workflows             Workflow[]

  @@index([slug])
}

model TenantDomain {
  id                  String    @id @default(uuid())
  tenantId            String
  domain              String    @unique
  verified            Boolean   @default(false)
  verificationToken   String?
  verificationMethod  String?
  verifiedAt          DateTime?
  createdAt           DateTime  @default(now())

  tenant              Tenant    @relation(fields: [tenantId], references: [id])

  @@index([domain])
  @@index([tenantId])
}

// ============================================
// USER
// ============================================

model User {
  id              String      @id @default(uuid())
  tenantId        String
  email           String
  passwordHash    String?
  firstName       String
  lastName        String
  role            Role        @default(EMPLOYEE)
  status          UserStatus  @default(ACTIVE)
  avatarUrl       String?
  ssoProvider     SSOProvider @default(NONE)
  ssoId           String?
  departmentId    String?
  jobTitle        String?
  managerId       String?
  lastLoginAt     DateTime?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  // Relations
  tenant          Tenant      @relation(fields: [tenantId], references: [id])
  manager         User?       @relation("UserManager", fields: [managerId], references: [id])
  directReports   User[]      @relation("UserManager")
  sessions        Session[]
  ownedPolicies   Policy[]    @relation("PolicyOwner")
  comments        Comment[]
  attestations    Attestation[]
  assignedTasks   Task[]      @relation("TaskAssignee")
  createdTasks    Task[]      @relation("TaskCreator")

  @@unique([tenantId, email])
  @@unique([ssoProvider, ssoId])
  @@index([tenantId])
  @@index([email])
  @@index([role])
  @@index([status])
}

// ============================================
// SESSION
// ============================================

model Session {
  id                String    @id @default(uuid())
  userId            String
  tenantId          String
  userAgent         String?
  ipAddress         String?
  createdAt         DateTime  @default(now())
  expiresAt         DateTime
  revokedAt         DateTime?
  revokedReason     String?
  previousSessionId String?

  user              User      @relation(fields: [userId], references: [id])
  tenant            Tenant    @relation(fields: [tenantId], references: [id])

  @@index([userId])
  @@index([tenantId])
  @@index([expiresAt])
}

// ============================================
// AUDIT LOG
// ============================================

model AuditLog {
  id            String    @id @default(uuid())
  tenantId      String
  userId        String?
  action        String
  resourceType  String?
  resourceId    String?
  metadata      Json?
  ipAddress     String?
  userAgent     String?
  timestamp     DateTime  @default(now())

  @@index([tenantId])
  @@index([userId])
  @@index([action])
  @@index([timestamp])
  @@index([resourceType, resourceId])
}

// ============================================
// POLICY EXCEPTION
// ============================================

enum ExceptionStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
  REVOKED
}

model PolicyException {
  id                  String          @id @default(uuid())
  tenantId            String
  policyId            String
  requestedById       String
  status              ExceptionStatus @default(PENDING)
  reason              String
  businessJustification String?
  expiresAt           DateTime
  approvedById        String?
  approvedAt          DateTime?
  approverComments    String?
  approverConditions  String?
  rejectedById        String?
  rejectedAt          DateTime?
  rejectionReason     String?
  revokedById         String?
  revokedAt           DateTime?
  revokeReason        String?
  attachments         Json?
  createdAt           DateTime        @default(now())
  updatedAt           DateTime        @updatedAt

  tenant              Tenant          @relation(fields: [tenantId], references: [id])
  policy              Policy          @relation(fields: [policyId], references: [id])
  requestedBy         User            @relation("ExceptionRequester", fields: [requestedById], references: [id])
  approvedBy          User?           @relation("ExceptionApprover", fields: [approvedById], references: [id])

  @@index([tenantId])
  @@index([policyId])
  @@index([requestedById])
  @@index([status])
  @@index([expiresAt])
}

// ============================================
// EXTERNAL PORTAL
// ============================================

enum PortalStatus {
  ACTIVE
  INACTIVE
  EXPIRED
}

enum PortalAccessLevel {
  VIEW_ONLY
  DOWNLOAD
  ACKNOWLEDGE
}

model ExternalPortal {
  id            String            @id @default(uuid())
  tenantId      String
  name          String
  description   String?
  status        PortalStatus      @default(ACTIVE)
  accessLevel   PortalAccessLevel @default(VIEW_ONLY)
  expiresAt     DateTime?
  createdById   String
  createdAt     DateTime          @default(now())
  updatedAt     DateTime          @updatedAt

  tenant        Tenant            @relation(fields: [tenantId], references: [id])
  createdBy     User              @relation(fields: [createdById], references: [id])
  policies      PortalPolicy[]
  invitations   PortalInvitation[]
  sessions      ExternalSession[]

  @@index([tenantId])
  @@index([status])
}

model PortalPolicy {
  id        String         @id @default(uuid())
  portalId  String
  policyId  String

  portal    ExternalPortal @relation(fields: [portalId], references: [id])
  policy    Policy         @relation(fields: [policyId], references: [id])

  @@unique([portalId, policyId])
}

// ============================================
// EXTERNAL USER
// ============================================

enum ExternalUserStatus {
  PENDING
  ACTIVE
  SUSPENDED
}

model ExternalUser {
  id            String              @id @default(uuid())
  tenantId      String
  email         String
  firstName     String?
  lastName      String?
  organization  String?
  status        ExternalUserStatus  @default(PENDING)
  lastAccessAt  DateTime?
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  tenant        Tenant              @relation(fields: [tenantId], references: [id])
  invitations   PortalInvitation[]
  sessions      ExternalSession[]
  attestations  ExternalAttestation[]

  @@unique([tenantId, email])
  @@index([tenantId])
  @@index([email])
}

// ============================================
// PORTAL INVITATION
// ============================================

model PortalInvitation {
  id              String       @id @default(uuid())
  portalId        String
  externalUserId  String
  tenantId        String
  token           String       // Hashed token
  expiresAt       DateTime
  maxUses         Int          @default(1)
  usedCount       Int          @default(0)
  lastUsedAt      DateTime?
  createdById     String
  createdAt       DateTime     @default(now())

  portal          ExternalPortal @relation(fields: [portalId], references: [id])
  externalUser    ExternalUser   @relation(fields: [externalUserId], references: [id])
  tenant          Tenant         @relation(fields: [tenantId], references: [id])
  createdBy       User           @relation(fields: [createdById], references: [id])

  @@index([portalId])
  @@index([externalUserId])
  @@index([tenantId])
  @@index([expiresAt])
}

// ============================================
// EXTERNAL SESSION
// ============================================

model ExternalSession {
  id              String       @id @default(uuid())
  externalUserId  String
  portalId        String
  tenantId        String
  ipAddress       String?
  userAgent       String?
  expiresAt       DateTime
  revokedAt       DateTime?
  createdAt       DateTime     @default(now())

  externalUser    ExternalUser   @relation(fields: [externalUserId], references: [id])
  portal          ExternalPortal @relation(fields: [portalId], references: [id])
  tenant          Tenant         @relation(fields: [tenantId], references: [id])

  @@index([externalUserId])
  @@index([portalId])
  @@index([tenantId])
  @@index([expiresAt])
}

// ============================================
// EXTERNAL ATTESTATION
// ============================================

model ExternalAttestation {
  id              String       @id @default(uuid())
  policyId        String
  externalUserId  String
  portalId        String
  tenantId        String
  acknowledged    Boolean      @default(false)
  signature       String?
  comments        String?
  ipAddress       String?
  acknowledgedAt  DateTime?
  createdAt       DateTime     @default(now())

  policy          Policy         @relation(fields: [policyId], references: [id])
  externalUser    ExternalUser   @relation(fields: [externalUserId], references: [id])
  tenant          Tenant         @relation(fields: [tenantId], references: [id])

  @@unique([policyId, externalUserId])
  @@index([tenantId])
  @@index([policyId])
  @@index([externalUserId])
}
```

---

## 14. Implementation Guide

### 14.1 Week 1 Implementation Order

| Day | Task | Dependencies |
|-----|------|--------------|
| 1 | Project setup, Docker, Prisma schema | None |
| 1 | Basic User model and Tenant model | Prisma |
| 2 | RLS SQL scripts, apply to database | Prisma |
| 2 | Tenant middleware | RLS |
| 3 | Local auth (email/password) | User model |
| 3 | JWT service | Prisma, bcrypt |
| 4 | Microsoft SSO strategy | Passport |
| 4 | Google OAuth strategy | Passport |
| 5 | JIT provisioning | SSO strategies |
| 5 | Session management | JWT, Redis |

### 14.2 Week 2 Implementation Order (New Features)

| Day | Task | Dependencies |
|-----|------|--------------|
| 1 | Exception model and RLS | Week 1 complete |
| 1 | Exception authorization service | Exception model |
| 2 | Exception guards and controllers | Auth service |
| 2 | Exception notification service | Exception model |
| 3 | External portal model and RLS | Week 1 complete |
| 3 | Magic link service | External portal model |
| 4 | External access guards | Magic link service |
| 4 | Portal session management | External access |
| 5 | External attestation flow | Portal sessions |
| 5 | Integration testing | All above |

### 14.3 Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/ethico?schema=public

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars

# Microsoft Azure AD
AZURE_TENANT_ID=common
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret
AZURE_REDIRECT_URI=http://localhost:3000/api/auth/azure-ad/callback

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

# Frontend
FRONTEND_URL=http://localhost:5173

# Environment
NODE_ENV=development

# Magic Link (External Portals)
MAGIC_LINK_SECRET=your-magic-link-secret-min-32-chars
```

### 14.4 Testing Strategy

1. **Unit Tests**: JWT service, permission calculations, password hashing
2. **Integration Tests**: RLS policies, authentication flows
3. **E2E Tests**: Full login/logout flows, SSO redirects

### 14.5 Common Pitfalls

| Pitfall | Prevention |
|---------|------------|
| Forgetting tenant_id | TypeScript types enforce tenantId |
| RLS bypass in migrations | Use separate service role |
| Token in localStorage | Use HTTP-only cookies only |
| Weak JWT secrets | Enforce 32+ character secrets |
| Missing rate limiting | Apply to all auth endpoints |
| Audit gaps | Decorator for automatic audit logging |

---

## Appendix A: SSO Provider Configuration Guides

### A.1 Microsoft Azure AD Setup

1. Go to Azure Portal > Azure Active Directory > App registrations
2. Click "New registration"
3. Configure:
   - Name: Ethico Policy Platform
   - Supported account types: Accounts in any organizational directory
   - Redirect URI: Web - `https://your-domain.com/api/auth/azure-ad/callback`
4. After creation, note:
   - Application (client) ID
   - Directory (tenant) ID
5. Go to "Certificates & secrets" > "New client secret"
6. Add API permissions: `User.Read`, `openid`, `profile`, `email`

### A.2 Google OAuth Setup

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Click "Create Credentials" > "OAuth client ID"
3. Configure:
   - Application type: Web application
   - Name: Ethico Policy Platform
   - Authorized redirect URIs: `https://your-domain.com/api/auth/google/callback`
4. Note the Client ID and Client Secret
5. Configure OAuth consent screen with necessary scopes

---

## Appendix B: Security Audit Checklist

- [ ] Access tokens expire in 15 minutes or less
- [ ] Refresh tokens are single-use (rotated on each refresh)
- [ ] All cookies are HTTP-only, Secure, SameSite
- [ ] Passwords hashed with bcrypt (cost 12+)
- [ ] RLS enabled on all tenant-scoped tables
- [ ] Rate limiting on authentication endpoints
- [ ] Audit logging for all auth events
- [ ] Session invalidation on password change
- [ ] No sensitive data in JWT payload (use session IDs)
- [ ] CORS restricted to known origins
- [ ] Security headers configured (helmet)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevented (Prisma parameterized queries)
- [ ] Exception authorization properly enforces approval hierarchy
- [ ] Magic link tokens are hashed before storage
- [ ] External sessions have short expiration (1 hour)
- [ ] External users cannot access internal endpoints

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Architecture Team | Initial specification |
| 2.0 | January 2026 | Architecture Team | Added Exception Lifecycle Authorization (Section 9), External Portal Authentication (Section 10), new permissions for exceptions and portals, new database schemas, new API endpoints |

---

*End of Technical Specification*
