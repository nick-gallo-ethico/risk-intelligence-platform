# Phase 27: Security Hardening - Research

**Researched:** 2026-02-14
**Domain:** NestJS Security (Guards, Middleware, CSRF, CORS, Body Limits)
**Confidence:** HIGH

## Summary

This phase hardens the security layer by addressing six specific requirements identified in the Unified Audit Report: testing untested guards/middleware (SEC-01), fixing WebSocket CORS wildcards (SEC-02), closing nullable organizationId RLS gaps (SEC-03), adding CSRF protection (SEC-04), configuring body size limits (SEC-05), and adding non-Error exception logging (SEC-06).

The codebase already has strong security foundations: Helmet headers, ValidationPipe with whitelist, ThrottlerModule with Redis, RLS via TenantMiddleware with parameterized queries, and JWT auth with 15min/7day tokens. The main gaps are **testing coverage** for the security layer (all 4 guards/middleware have zero tests) and **configuration hardening** (CORS wildcards, missing CSRF, no body limits).

The research confirms that all requirements are achievable with NestJS built-in capabilities and existing patterns in the codebase. Unit tests should follow the established pattern in `activity.service.spec.ts`, using Jest mocks and `Test.createTestingModule`. CSRF protection should use `@tekuconcept/nestjs-csurf`. Body limits are configured via `NestFactory.create()` options.

**Primary recommendation:** Implement all 6 security hardening requirements using existing NestJS patterns; prioritize guard/middleware tests as they validate the entire auth and tenant isolation layer.

## Standard Stack

The established libraries/tools for this domain:

### Core (Already in Use)

| Library            | Version | Purpose                | Why Standard                    |
| ------------------ | ------- | ---------------------- | ------------------------------- |
| `@nestjs/testing`  | ^10.3.0 | Test module creation   | Official NestJS testing utility |
| `jest`             | ^29.7.0 | Test runner            | Default NestJS test framework   |
| `@nestjs/passport` | ^10.0.3 | Auth guard integration | Official Passport integration   |
| `@nestjs/jwt`      | ^10.2.0 | JWT operations         | Official JWT module             |

### Supporting (To Add)

| Library                     | Version | Purpose         | When to Use                                        |
| --------------------------- | ------- | --------------- | -------------------------------------------------- |
| `@tekuconcept/nestjs-csurf` | latest  | CSRF protection | State-changing requests (POST, PUT, PATCH, DELETE) |

### Alternatives Considered

| Instead of                  | Could Use            | Tradeoff                                                                                   |
| --------------------------- | -------------------- | ------------------------------------------------------------------------------------------ |
| `@tekuconcept/nestjs-csurf` | Raw `csurf`          | NestJS module provides cleaner integration with guards/decorators                          |
| JWT-only CSRF protection    | Cookie double-submit | JWT in Authorization header mitigates CSRF but cookie-based refresh tokens need protection |

**Installation:**

```bash
cd apps/backend
npm install @tekuconcept/nestjs-csurf
```

## Architecture Patterns

### Recommended Test Structure for Guards/Middleware

```
apps/backend/src/common/
├── guards/
│   ├── jwt-auth.guard.ts
│   ├── jwt-auth.guard.spec.ts      # NEW
│   ├── roles.guard.ts
│   ├── roles.guard.spec.ts         # NEW
│   ├── tenant.guard.ts
│   └── tenant.guard.spec.ts        # NEW
├── middleware/
│   ├── tenant.middleware.ts
│   └── tenant.middleware.spec.ts   # NEW
└── filters/
    ├── http-exception.filter.ts    # MODIFY (add non-Error logging)
    └── http-exception.filter.spec.ts # NEW
```

### Pattern 1: Guard Unit Testing Pattern

**What:** Test guards in isolation using mocked ExecutionContext
**When to use:** All CanActivate guards (JwtAuthGuard, TenantGuard, RolesGuard)
**Example:**

```typescript
// Source: NestJS official docs + codebase activity.service.spec.ts pattern
import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { TenantGuard } from "./tenant.guard";

describe("TenantGuard", () => {
  let guard: TenantGuard;

  const mockExecutionContext = (
    organizationId: string | undefined,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ organizationId }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantGuard],
    }).compile();

    guard = module.get<TenantGuard>(TenantGuard);
  });

  it("should allow access when organizationId is present", () => {
    const context = mockExecutionContext("org-uuid-123");
    expect(guard.canActivate(context)).toBe(true);
  });

  it("should throw ForbiddenException when organizationId is missing", () => {
    const context = mockExecutionContext(undefined);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
```

### Pattern 2: Middleware Unit Testing Pattern

**What:** Test middleware by invoking `use()` with mock req/res/next
**When to use:** TenantMiddleware
**Example:**

```typescript
// Source: NestJS docs + codebase patterns
import { Test, TestingModule } from "@nestjs/testing";
import { TenantMiddleware } from "./tenant.middleware";
import { PrismaService } from "../../modules/prisma/prisma.service";
import { ConfigService } from "@nestjs/config";

describe("TenantMiddleware", () => {
  let middleware: TenantMiddleware;
  let prismaService: jest.Mocked<PrismaService>;

  const mockRequest = (authHeader?: string) => ({
    headers: { authorization: authHeader },
    path: "/api/v1/cases",
    organizationId: undefined,
    userId: undefined,
  });

  const mockResponse = {};
  const mockNext = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantMiddleware,
        {
          provide: PrismaService,
          useValue: { $executeRaw: jest.fn() },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("test-secret") },
        },
      ],
    }).compile();

    middleware = module.get<TenantMiddleware>(TenantMiddleware);
    prismaService = module.get(PrismaService);
  });

  it("should set RLS context for valid token", async () => {
    // Create valid JWT token
    const validToken = createTestToken({
      organizationId: "org-123",
      sub: "user-456",
    });
    const req = mockRequest(`Bearer ${validToken}`);

    await middleware.use(req as any, mockResponse as any, mockNext);

    expect(req.organizationId).toBe("org-123");
    expect(req.userId).toBe("user-456");
    expect(prismaService.$executeRaw).toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalled();
  });

  it("should set null RLS context for invalid token", async () => {
    const req = mockRequest("Bearer invalid-token");

    await middleware.use(req as any, mockResponse as any, mockNext);

    expect(req.organizationId).toBeUndefined();
    expect(prismaService.$executeRaw).toHaveBeenCalled(); // Sets null tenant
    expect(mockNext).toHaveBeenCalled();
  });
});
```

### Pattern 3: WebSocket CORS Hardening

**What:** Replace wildcard fallback with explicit throw
**When to use:** All 3 WebSocket gateways
**Example:**

```typescript
// Source: Security best practices
const corsOrigin = process.env.CORS_ORIGIN;
if (!corsOrigin) {
  throw new Error('CORS_ORIGIN environment variable is required for WebSocket gateway');
}

@WebSocketGateway({
  namespace: '/ai',
  cors: {
    origin: corsOrigin,
    credentials: true,
  },
})
```

### Pattern 4: CSRF Protection Configuration

**What:** Add CSRF middleware for state-changing requests
**When to use:** POST, PUT, PATCH, DELETE endpoints
**Example:**

```typescript
// Source: https://github.com/TekuConcept/nestjs-csurf
import * as cookieParser from "cookie-parser";
import { CsurfModule } from "@tekuconcept/nestjs-csurf";

// In AppModule imports:
CsurfModule.forRoot({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  },
});

// In main.ts (before CSRF module):
app.use(cookieParser());

// Skip CSRF for certain routes (e.g., login which creates session):
// Use @CsrfDisable() decorator on routes that should skip
```

### Pattern 5: Body Size Limits Configuration

**What:** Configure JSON and URL-encoded body size limits
**When to use:** main.ts bootstrap
**Example:**

```typescript
// Source: NestJS docs + GitHub issues #9427, #10407
import * as bodyParser from "body-parser";

// In main.ts after NestFactory.create:
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

// For file uploads, use @UseInterceptors with FilesInterceptor:
// FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }) // 50MB
```

### Anti-Patterns to Avoid

- **Wildcard CORS with credentials:** Never use `origin: "*"` with `credentials: true` - this is an exploitable CORS misconfiguration
- **Nullable organizationId on tenant data:** All tenant-scoped models must have required `organizationId` or be explicitly documented as system-wide with application-level access control
- **Swallowing non-Error exceptions:** Always log exceptions, even when they don't have a stack trace
- **Testing guards without mocking Reflector:** The `getAllAndOverride` method must be mocked for guards that read metadata

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem               | Don't Build             | Use Instead                              | Why                                                                                |
| --------------------- | ----------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------- |
| CSRF protection       | Custom token validation | `@tekuconcept/nestjs-csurf`              | Handles token generation, validation, cookie management, and has NestJS decorators |
| JWT mock tokens       | Manual token string     | `JwtService.sign()` with test secret     | Real token structure, proper expiration                                            |
| ExecutionContext mock | Full mock object        | Minimal mock with `switchToHttp()` chain | Guards only access what they need                                                  |
| Body size limiting    | Custom middleware       | `body-parser` with limit option          | Battle-tested, handles edge cases                                                  |

**Key insight:** Security features should use well-tested libraries rather than custom implementations to avoid subtle vulnerabilities.

## Common Pitfalls

### Pitfall 1: Testing AuthGuard("jwt") without Passport

**What goes wrong:** JwtAuthGuard extends AuthGuard("jwt") which delegates to Passport. Mocking the guard itself doesn't test the actual Passport strategy integration.
**Why it happens:** Developers mock the guard return value instead of testing the actual token validation path.
**How to avoid:** Test JwtAuthGuard unit tests for metadata handling (@Public decorator), but also have E2E tests that validate real token flow.
**Warning signs:** Tests pass but invalid tokens slip through in production.

### Pitfall 2: Missing RLS Session Variable Verification

**What goes wrong:** TenantMiddleware sets `app.current_organization` but tests don't verify it was actually set.
**Why it happens:** Mock of `$executeRaw` doesn't capture the actual SQL.
**How to avoid:** Use `toHaveBeenCalledWith` with a matcher that captures the Prisma raw query template.
**Warning signs:** Test passes but RLS isn't actually enforced.

### Pitfall 3: CSRF Token Reading Location Mismatch

**What goes wrong:** Frontend sends CSRF token in one location (e.g., header) but backend expects it in another (e.g., body).
**Why it happens:** Default token locations vary between CSRF libraries.
**How to avoid:** Explicitly configure token source locations and document for frontend team.
**Warning signs:** CSRF validation fails for legitimate requests.

### Pitfall 4: Body Parser Order Matters

**What goes wrong:** Custom body-parser middleware doesn't take effect because NestJS default parser already consumed the body.
**Why it happens:** NestJS applies default body-parser before custom middleware.
**How to avoid:** Use `NestFactory.create(AppModule, { bodyParser: false })` then manually configure.
**Warning signs:** Large payloads still accepted despite limit configuration.

### Pitfall 5: WebSocket CORS Fallback in Development

**What goes wrong:** Removing the wildcard fallback breaks local development where CORS_ORIGIN isn't set.
**Why it happens:** Developers rely on wildcards for convenience.
**How to avoid:** Use `CORS_ORIGIN=http://localhost:5173` in `.env.example` and validate env var exists.
**Warning signs:** WebSocket connections fail in development after security fix.

## Code Examples

Verified patterns from the existing codebase:

### Example 1: Unit Test Structure (from activity.service.spec.ts)

```typescript
// Source: apps/backend/src/common/services/activity.service.spec.ts
describe("ActivityService", () => {
  let service: ActivityService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      auditLog: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create activity log with correct organization", async () => {
    // Arrange, Act, Assert pattern
  });
});
```

### Example 2: E2E Test with Auth (from tenant-isolation.e2e-spec.ts)

```typescript
// Source: apps/backend/test/tenant-isolation.e2e-spec.ts
it("should return 401 for invalid token", async () => {
  await request(ctx.app.getHttpServer())
    .get("/api/v1/auth/me")
    .set("Authorization", "Bearer invalid-token")
    .expect(401);
});

it("RLS context is set correctly from JWT organizationId", async () => {
  const responseA = await request(ctx.app.getHttpServer())
    .get("/api/v1/auth/me")
    .set(authHeader(ctx.orgA.users[0]))
    .expect(200);

  expect(responseA.body.organizationId).toBe(ctx.orgA.id);
});
```

### Example 3: Current TenantGuard (to be tested)

```typescript
// Source: apps/backend/src/common/guards/tenant.guard.ts
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const organizationId = request.organizationId;

    if (!organizationId) {
      throw new ForbiddenException(
        "Organization context not available. Ensure you are authenticated with a valid tenant.",
      );
    }

    return true;
  }
}
```

### Example 4: Current WebSocket CORS (to be fixed)

```typescript
// Source: apps/backend/src/modules/ai/ai.gateway.ts:75-81
@WebSocketGateway({
  namespace: "/ai",
  cors: {
    origin: process.env.CORS_ORIGIN || "*", // PROBLEM: wildcard fallback
    credentials: true,
  },
})
```

### Example 5: Current HttpExceptionFilter else branch (to be fixed)

```typescript
// Source: apps/backend/src/common/filters/http-exception.filter.ts:70-74
} else {
  status = HttpStatus.INTERNAL_SERVER_ERROR;
  message = "Internal server error";
  error = "Internal Server Error";
  // PROBLEM: No logging here - exception is silently dropped
}
```

## State of the Art

| Old Approach              | Current Approach                    | When Changed | Impact                                    |
| ------------------------- | ----------------------------------- | ------------ | ----------------------------------------- |
| `csurf` npm package       | `@tekuconcept/nestjs-csurf`         | 2024         | Better NestJS integration with decorators |
| Manual body-parser limits | NestFactory options with bodyParser | NestJS 10+   | Cleaner configuration                     |
| Wildcard CORS             | Explicit origin validation          | Always       | Security requirement, not optional        |

**Deprecated/outdated:**

- Original `csurf` package: Use `@tekuconcept/nestjs-csurf` for NestJS-native integration
- `app.use(express.json({ limit }))`: Use `body-parser` import or NestFactory options

## Requirements Mapping

| Requirement                     | Finding                                                                                                                  | Implementation Approach                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- | -------------- | -------------------------------------------------- |
| SEC-01: Guard/middleware tests  | Zero tests exist for jwt-auth.guard, roles.guard, tenant.guard, tenant.middleware                                        | Create unit test files following activity.service.spec.ts pattern          |
| SEC-02: WebSocket CORS          | 3 gateways use `                                                                                                         |                                                                            | "\*"` fallback | Replace with explicit throw if CORS_ORIGIN missing |
| SEC-03: Nullable organizationId | 7 models: ReportTemplate, AiContextFile, PromptTemplate, ProjectTemplate, QuizAttempt, Certificate, KnowledgeBaseArticle | Make required OR add `isSystem` flag with application-level access control |
| SEC-04: CSRF protection         | No CSRF configured                                                                                                       | Install `@tekuconcept/nestjs-csurf`, configure in AppModule                |
| SEC-05: Body size limits        | No limits configured in main.ts                                                                                          | Add `body-parser` with 10MB JSON, 50MB file limits                         |
| SEC-06: Non-Error logging       | HttpExceptionFilter else branch (line 70-74) drops exceptions                                                            | Add `this.logger.error()` call                                             |

## Open Questions

Things that couldn't be fully resolved:

1. **System-wide vs tenant-scoped models**
   - What we know: 7 models have nullable organizationId. Some (ReportTemplate, PromptTemplate, ProjectTemplate) have `isSystem` flag suggesting intentional system-wide scope.
   - What's unclear: Whether these should remain nullable with app-level access control or be migrated to required.
   - Recommendation: Document each model's intended scope. Models with `isSystem=true` can remain nullable; others should be required.

2. **CSRF and SPA architecture**
   - What we know: JWT-based auth with tokens in Authorization header mitigates traditional CSRF. But refresh tokens may use cookies.
   - What's unclear: Exact refresh token flow (HTTP-only cookie vs localStorage).
   - Recommendation: Review auth module's refresh token implementation. If cookies used, CSRF protection is mandatory.

3. **File upload size limits**
   - What we know: 50MB is a reasonable limit for document uploads.
   - What's unclear: Whether this matches business requirements for specific file types.
   - Recommendation: 50MB default, configurable via environment variable.

## Sources

### Primary (HIGH confidence)

- apps/backend/src/common/guards/\*.ts - Current guard implementations
- apps/backend/src/common/middleware/tenant.middleware.ts - Current middleware implementation
- apps/backend/src/common/filters/http-exception.filter.ts - Current filter implementation
- apps/backend/src/common/services/activity.service.spec.ts - Existing test patterns
- apps/backend/test/tenant-isolation.e2e-spec.ts - Existing E2E patterns
- apps/backend/prisma/schema.prisma - Nullable organizationId models

### Secondary (MEDIUM confidence)

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing) - Official testing guide
- [NestJS Guards Documentation](https://docs.nestjs.com/guards) - Guard implementation patterns
- [NestJS CSRF Documentation](https://docs.nestjs.com/security/csrf) - CSRF protection guidance
- [nestjs-csurf GitHub](https://github.com/TekuConcept/nestjs-csurf) - CSRF module documentation
- [NestJS Body Size GitHub Issue #9427](https://github.com/nestjs/nest/issues/9427) - Body parser limit configuration

### Tertiary (LOW confidence)

- WebSearch results for NestJS testing best practices 2026 - General patterns

## Metadata

**Confidence breakdown:**

- Guard/middleware testing patterns: HIGH - Based on existing codebase patterns and official NestJS docs
- WebSocket CORS fix: HIGH - Simple configuration change with clear requirement
- Nullable organizationId fix: MEDIUM - Some models may intentionally be system-wide
- CSRF protection: MEDIUM - Depends on refresh token implementation details
- Body size limits: HIGH - Well-documented NestJS configuration

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days - stable domain)
