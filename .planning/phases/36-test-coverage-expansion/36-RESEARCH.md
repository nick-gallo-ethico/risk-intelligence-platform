# Phase 36: Test Coverage Expansion - Research

**Researched:** 2026-02-15
**Domain:** NestJS Testing, Jest, Vitest, Multi-tenant Isolation
**Confidence:** HIGH

## Summary

This research covers strategies for expanding backend test coverage from 7.9% to 60%+ and frontend from 13% to 40%+. The codebase already has established testing patterns in `apps/backend/examples/test-pattern.spec.ts` and `apps/backend/examples/e2e-test-pattern.spec.ts`, plus test infrastructure including `test/helpers/test-setup.ts` for tenant isolation E2E testing.

The testing stack is already configured: Jest 29.7 for backend unit tests, Supertest 6.3 for E2E, Vitest 1.2 for frontend with React Testing Library, and Playwright for E2E. The existing patterns are well-structured and should be followed consistently.

**Primary recommendation:** Follow existing codebase patterns exactly. The test infrastructure exists - the work is executing systematically across all untested modules, prioritizing guards, strategies, and tenant isolation.

## Standard Stack

The stack is already in place. No new dependencies needed.

### Core (Backend)

| Library         | Version | Purpose                                  | Why Standard                      |
| --------------- | ------- | ---------------------------------------- | --------------------------------- |
| jest            | ^29.7.0 | Test runner for unit & integration tests | NestJS default, excellent mocking |
| @nestjs/testing | ^10.3.0 | NestJS test utilities, TestingModule     | Native framework support          |
| supertest       | ^6.3.4  | HTTP E2E testing                         | Standard for NestJS E2E           |
| ts-jest         | ^29.1.1 | TypeScript transformation for Jest       | Enables TS in tests               |

### Core (Frontend)

| Library                     | Version  | Purpose                      | Why Standard                          |
| --------------------------- | -------- | ---------------------------- | ------------------------------------- |
| vitest                      | ^1.2.1   | Test runner for frontend     | Native Vite support, faster than Jest |
| @testing-library/react      | ^14.1.2  | Component testing            | User-centric testing approach         |
| @testing-library/user-event | ^14.6.1  | Simulating user interactions | Realistic interaction simulation      |
| msw                         | ^2.12.10 | API mocking                  | Network-level request interception    |
| @playwright/test            | ^1.58.0  | E2E browser testing          | Cross-browser, reliable               |

### Supporting

| Library                   | Version | Purpose                        | When to Use                            |
| ------------------------- | ------- | ------------------------------ | -------------------------------------- |
| @testing-library/jest-dom | ^6.9.1  | DOM assertions                 | Custom matchers like toBeInTheDocument |
| jsdom                     | ^24.0.0 | Browser environment for Vitest | Frontend unit tests                    |

**Installation:** Already installed. No action needed.

## Architecture Patterns

### Recommended Project Structure

Already established. Tests go next to source files:

```
src/
├── modules/
│   └── auth/
│       ├── guards/
│       │   ├── jwt-auth.guard.ts
│       │   └── jwt-auth.guard.spec.ts  # Co-located unit test
│       └── strategies/
│           ├── jwt.strategy.ts
│           └── jwt.strategy.spec.ts    # Co-located unit test
└── common/
    └── guards/
        ├── tenant.guard.ts
        └── tenant.guard.spec.ts

test/                                    # E2E tests & helpers
├── helpers/
│   ├── test-setup.ts                   # Creates test orgs A & B
│   ├── global-setup.ts                 # E2E environment setup
│   └── global-teardown.ts              # Cleanup
└── e2e/
    └── tenant-isolation.e2e-spec.ts    # E2E isolation tests
```

### Pattern 1: Unit Test for Guards

**What:** Testing NestJS guards in isolation with mocked dependencies
**When to use:** Every guard must have unit tests
**Example:**

```typescript
// Source: Existing jwt-auth.guard.spec.ts in codebase
describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  const createMockExecutionContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
      ],
    }).compile();
    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);
    jest.clearAllMocks();
  });

  it("should allow access for @Public() routes", () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);
    expect(guard.canActivate(createMockExecutionContext())).toBe(true);
  });

  it("should throw UnauthorizedException for invalid user", () => {
    expect(() => guard.handleRequest(null, null, null)).toThrow(
      UnauthorizedException,
    );
  });
});
```

### Pattern 2: Unit Test for Passport Strategies

**What:** Testing Passport strategy validate() methods with mocked Prisma
**When to use:** Every strategy must have unit tests
**Example:**

```typescript
// Pattern for testing jwt.strategy.ts
describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let prisma: MockProxy<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      user: { findUnique: jest.fn() },
      session: { findUnique: jest.fn() },
      withBypassRLS: jest.fn((cb) => cb()), // Important: mock RLS bypass
    };

    const module = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: { get: () => "secret" } },
        {
          provide: JwtKeyService,
          useValue: { getVerificationKey: () => "key" },
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prisma = module.get(PrismaService);
  });

  it("should reject refresh token type", async () => {
    await expect(
      strategy.validate({ type: "refresh", sub: "id" }),
    ).rejects.toThrow("Invalid token type");
  });

  it("should reject inactive user", async () => {
    prisma.user.findUnique.mockResolvedValue({ isActive: false });
    await expect(
      strategy.validate({ type: "access", sub: "id" }),
    ).rejects.toThrow("User not found or inactive");
  });
});
```

### Pattern 3: Service Test with Prisma Transaction Mocking

**What:** Testing services that use Prisma transactions
**When to use:** Services like case-merge.service.ts with $transaction
**Example:**

```typescript
// Source: Prisma official docs pattern
describe("CaseMergeService", () => {
  let service: CaseMergeService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrisma = {
    case: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    riuCaseAssociation: { updateMany: jest.fn() },
    subject: { updateMany: jest.fn() },
    investigation: { updateMany: jest.fn() },
    caseMessage: { updateMany: jest.fn() },
    interaction: { updateMany: jest.fn() },
    // KEY: Mock $transaction to execute callback with prisma
    $transaction: jest.fn((cb) => cb(mockPrisma)),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CaseMergeService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ActivityService, useValue: { log: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();
    service = module.get<CaseMergeService>(CaseMergeService);
  });

  it("should reject merging case into itself", async () => {
    await expect(
      service.merge({ sourceCaseId: "a", targetCaseId: "a" }, "u", "o"),
    ).rejects.toThrow("Cannot merge a case into itself");
  });

  it("should move associations in transaction", async () => {
    mockPrisma.case.findFirst.mockResolvedValue({
      id: "a",
      referenceNumber: "C-001",
    });
    mockPrisma.riuCaseAssociation.updateMany.mockResolvedValue({ count: 2 });
    // ... test merge flow
  });
});
```

### Pattern 4: Tenant Isolation E2E Test

**What:** Full HTTP request/response cycle testing cross-tenant access
**When to use:** Every module with tenanted data
**Example:**

```typescript
// Source: Existing e2e-test-pattern.spec.ts
describe("Tenant Isolation", () => {
  let ctx: TestContext;
  let entityInOrgA: any;

  beforeAll(async () => {
    ctx = await createTestContext(); // Creates orgA, orgB with users & tokens
    entityInOrgA = await ctx.prisma.entity.create({
      data: { organizationId: ctx.orgA.id },
    });
  });

  afterAll(async () => {
    await destroyTestContext(ctx);
  });

  it("Org B cannot access Org A entity (returns 404 not 403)", async () => {
    const response = await request(ctx.app.getHttpServer())
      .get(`/api/v1/entities/${entityInOrgA.id}`)
      .set("Authorization", `Bearer ${ctx.orgB.users[0].token}`)
      .expect(404); // CRITICAL: 404 prevents enumeration

    // Verify entity was not exposed
    expect(response.body.id).toBeUndefined();
  });

  it("Org B cannot update Org A entity", async () => {
    await request(ctx.app.getHttpServer())
      .put(`/api/v1/entities/${entityInOrgA.id}`)
      .set("Authorization", `Bearer ${ctx.orgB.users[0].token}`)
      .send({ name: "Hacked" })
      .expect(404);

    // Verify no modification
    const entity = await ctx.prisma.entity.findUnique({
      where: { id: entityInOrgA.id },
    });
    expect(entity?.name).not.toBe("Hacked");
  });
});
```

### Pattern 5: Frontend Component Test with Auth Context

**What:** Testing React components that depend on authentication
**When to use:** Auth pages, protected forms, settings pages
**Example:**

```typescript
// Source: React Testing Library + Vitest patterns
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '@/contexts/auth-context';
import { LoginForm } from '@/components/auth/login-form';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  http.post('/api/v1/auth/login', () => {
    return HttpResponse.json({ accessToken: 'mock-token' });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('LoginForm', () => {
  const renderWithAuth = (ui: React.ReactElement) => {
    return render(<AuthProvider>{ui}</AuthProvider>);
  };

  it('should submit login and redirect on success', async () => {
    const user = userEvent.setup();
    renderWithAuth(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'Password123!');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.queryByText(/invalid credentials/i)).not.toBeInTheDocument();
    });
  });

  it('should show error on invalid credentials', async () => {
    server.use(http.post('/api/v1/auth/login', () => HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })));
    // ... test error display
  });
});
```

### Anti-Patterns to Avoid

- **Testing implementation details:** Don't test private methods directly. Test through public API.
- **Excessive mocking:** If you're mocking more than 3-4 dependencies, the unit may be too complex.
- **Skipping tenant isolation tests:** Every module with tenanted data MUST have cross-tenant access tests.
- **Testing configuration:** Don't test that Jest/Vitest configuration works. Test behavior.
- **Forgetting to clear mocks:** Use `jest.clearAllMocks()` in afterEach to prevent test pollution.
- **Using real database in unit tests:** Unit tests mock Prisma. Only E2E tests use real database.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem           | Don't Build             | Use Instead                  | Why                                         |
| ----------------- | ----------------------- | ---------------------------- | ------------------------------------------- |
| Tenant test setup | Custom org creation     | `test/helpers/test-setup.ts` | Already handles tokens, RLS bypass, cleanup |
| Mocking Prisma    | Manual jest mocks       | jest-mock-extended mockDeep  | Type-safe, maintains Prisma types           |
| HTTP assertions   | Manual response parsing | supertest matchers           | Fluent API, status + body assertions        |
| DOM queries       | document.querySelector  | @testing-library queries     | User-centric, accessible                    |
| User interactions | fireEvent               | userEvent.setup()            | Simulates real browser behavior             |
| API mocking       | fetch mocks             | MSW                          | Network-level, works in browser/node        |

**Key insight:** The test infrastructure in `test/helpers/` already solves tenant isolation testing. Use `createTestContext()` to get two orgs with authenticated users - don't recreate this.

## Common Pitfalls

### Pitfall 1: Not Mocking RLS Bypass in Strategy Tests

**What goes wrong:** JwtStrategy calls `prisma.withBypassRLS()` - tests fail without mocking it
**Why it happens:** Overlooking that strategies run before tenant context is established
**How to avoid:** Always mock `withBypassRLS` to pass through the callback:

```typescript
const mockPrisma = {
  withBypassRLS: jest.fn((cb) => cb()),
  // ... other mocks
};
```

**Warning signs:** Tests hang or fail with "withBypassRLS is not a function"

### Pitfall 2: Testing Cross-Tenant Access with 403 Instead of 404

**What goes wrong:** Tests expect ForbiddenException when trying to access another tenant's data
**Why it happens:** Intuitive to think "access denied" = 403
**How to avoid:** Expect 404 Not Found - prevents enumeration attacks. Verify in E2E tests:

```typescript
await request(app)
  .get(`/api/v1/cases/${otherOrgCase.id}`)
  .set(authHeader)
  .expect(404);
```

**Warning signs:** Tests passing with 403, but this is a security vulnerability

### Pitfall 3: Not Cleaning Up Test Data in E2E

**What goes wrong:** Tests pass individually but fail in suite; DB fills with orphan data
**Why it happens:** afterAll cleanup not properly implemented or RLS blocking cleanup
**How to avoid:** Use `destroyTestContext()` from test-setup.ts which enables RLS bypass for cleanup
**Warning signs:** Tests fail with unique constraint violations on re-run

### Pitfall 4: Mocking Transaction Incorrectly

**What goes wrong:** $transaction mock doesn't execute the callback, tests don't cover actual logic
**Why it happens:** Mocking `$transaction: jest.fn()` without returning callback result
**How to avoid:** Mock $transaction to execute the callback:

```typescript
$transaction: jest.fn((cb) => cb(mockPrisma));
```

**Warning signs:** High coverage but bugs in transaction logic slip through

### Pitfall 5: Testing Guards Without Testing Error Messages

**What goes wrong:** Guard throws exception but with wrong message or code
**Why it happens:** Only testing that exception is thrown, not its content
**How to avoid:** Assert both exception type AND message:

```typescript
expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
expect(() => guard.canActivate(ctx)).toThrow("MFA verification required");
```

**Warning signs:** Frontend shows wrong error messages to users

### Pitfall 6: Skipping Async Guard Testing

**What goes wrong:** MfaGuard is async (calls mfaService.isMfaEnabled) - tests don't await
**Why it happens:** Assuming all guards are synchronous like TenantGuard
**How to avoid:** Check if guard.canActivate returns Promise and await:

```typescript
it("should require MFA when enabled", async () => {
  mfaService.isMfaEnabled.mockResolvedValue(true);
  await expect(guard.canActivate(ctx)).rejects.toThrow(
    "MFA verification required",
  );
});
```

**Warning signs:** Tests pass but guard behavior is wrong in production

## Code Examples

### Complete Guard Test File (MfaGuard)

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { MfaGuard } from "./mfa.guard";
import { MfaService } from "../mfa/mfa.service";

describe("MfaGuard", () => {
  let guard: MfaGuard;
  let mfaService: jest.Mocked<MfaService>;

  const createMockContext = (user?: { sub: string; mfaVerified?: boolean }) =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaGuard,
        { provide: MfaService, useValue: { isMfaEnabled: jest.fn() } },
      ],
    }).compile();

    guard = module.get<MfaGuard>(MfaGuard);
    mfaService = module.get(MfaService);
    jest.clearAllMocks();
  });

  describe("canActivate()", () => {
    it("should throw UnauthorizedException when no user", async () => {
      await expect(guard.canActivate(createMockContext())).rejects.toThrow(
        "Authentication required",
      );
    });

    it("should allow access when MFA is disabled", async () => {
      mfaService.isMfaEnabled.mockResolvedValue(false);
      const result = await guard.canActivate(
        createMockContext({ sub: "user-1" }),
      );
      expect(result).toBe(true);
      expect(mfaService.isMfaEnabled).toHaveBeenCalledWith("user-1");
    });

    it("should allow access when MFA enabled and verified", async () => {
      mfaService.isMfaEnabled.mockResolvedValue(true);
      const result = await guard.canActivate(
        createMockContext({ sub: "user-1", mfaVerified: true }),
      );
      expect(result).toBe(true);
    });

    it("should throw when MFA enabled but not verified", async () => {
      mfaService.isMfaEnabled.mockResolvedValue(true);
      await expect(
        guard.canActivate(createMockContext({ sub: "user-1" })),
      ).rejects.toThrow("MFA verification required");
    });

    it("should throw when MFA enabled and mfaVerified is false", async () => {
      mfaService.isMfaEnabled.mockResolvedValue(true);
      await expect(
        guard.canActivate(
          createMockContext({ sub: "user-1", mfaVerified: false }),
        ),
      ).rejects.toThrow("MFA verification required");
    });
  });
});
```

### Complete Strategy Test File (SAML)

```typescript
import { Test, TestingModule } from "@nestjs/testing";
import { SamlStrategy } from "./saml.strategy";
import { SsoService } from "../sso/sso.service";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";

describe("SamlStrategy", () => {
  let strategy: SamlStrategy;
  let ssoService: jest.Mocked<SsoService>;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockSsoService = {
      getSamlConfig: jest.fn(),
      findOrCreateUser: jest.fn(),
    };

    const mockPrisma = {
      organization: { findFirst: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SamlStrategy,
        { provide: SsoService, useValue: mockSsoService },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: { get: () => "http://localhost" } },
      ],
    }).compile();

    strategy = module.get<SamlStrategy>(SamlStrategy);
    ssoService = module.get(SsoService);
    prisma = module.get(PrismaService);
  });

  describe("validate()", () => {
    const mockProfile = {
      nameID: "user@example.com",
      email: "user@example.com",
      firstName: "Test",
      lastName: "User",
    };

    it("should create or find user from SAML profile", async () => {
      const mockUser = {
        id: "user-1",
        email: "user@example.com",
        organizationId: "org-1",
      };
      ssoService.findOrCreateUser.mockResolvedValue(mockUser);

      const result = await strategy.validate(mockProfile);

      expect(ssoService.findOrCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "user@example.com",
        }),
      );
      expect(result).toEqual(mockUser);
    });

    it("should throw when organization not found", async () => {
      ssoService.findOrCreateUser.mockRejectedValue(
        new Error("Organization not found"),
      );

      await expect(strategy.validate(mockProfile)).rejects.toThrow(
        "Organization not found",
      );
    });
  });
});
```

### Tenant Isolation E2E for Module

```typescript
import * as request from "supertest";
import {
  createTestContext,
  destroyTestContext,
  TestContext,
  authHeader,
} from "../helpers/test-setup";

describe("Campaigns Tenant Isolation (e2e)", () => {
  let ctx: TestContext;
  let campaignInOrgA: any;

  beforeAll(async () => {
    ctx = await createTestContext();

    // Create campaign in Org A
    campaignInOrgA = await ctx.prisma.campaign.create({
      data: {
        organizationId: ctx.orgA.id,
        name: "Org A Campaign",
        type: "DISCLOSURE",
        status: "DRAFT",
        createdById: ctx.orgA.users[0].id,
      },
    });
  });

  afterAll(async () => {
    await ctx.prisma.campaign.deleteMany({
      where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
    });
    await destroyTestContext(ctx);
  });

  describe("GET /api/v1/campaigns", () => {
    it("Org A sees only Org A campaigns", async () => {
      const res = await request(ctx.app.getHttpServer())
        .get("/api/v1/campaigns")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(
        res.body.items.every((c: any) => c.organizationId === ctx.orgA.id),
      ).toBe(true);
    });

    it("Org B does not see Org A campaigns", async () => {
      const res = await request(ctx.app.getHttpServer())
        .get("/api/v1/campaigns")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      expect(
        res.body.items.find((c: any) => c.id === campaignInOrgA.id),
      ).toBeUndefined();
    });
  });

  describe("GET /api/v1/campaigns/:id", () => {
    it("Org B cannot access Org A campaign by ID", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/campaigns/${campaignInOrgA.id}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });
  });

  describe("PUT /api/v1/campaigns/:id", () => {
    it("Org B cannot update Org A campaign", async () => {
      await request(ctx.app.getHttpServer())
        .put(`/api/v1/campaigns/${campaignInOrgA.id}`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ name: "Hacked Campaign" })
        .expect(404);

      // Verify no modification
      const campaign = await ctx.prisma.campaign.findUnique({
        where: { id: campaignInOrgA.id },
      });
      expect(campaign?.name).toBe("Org A Campaign");
    });
  });

  describe("DELETE /api/v1/campaigns/:id", () => {
    it("Org B cannot delete Org A campaign", async () => {
      await request(ctx.app.getHttpServer())
        .delete(`/api/v1/campaigns/${campaignInOrgA.id}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);

      // Verify not deleted
      const campaign = await ctx.prisma.campaign.findUnique({
        where: { id: campaignInOrgA.id },
      });
      expect(campaign).not.toBeNull();
    });
  });
});
```

## State of the Art

| Old Approach           | Current Approach                 | When Changed        | Impact                                   |
| ---------------------- | -------------------------------- | ------------------- | ---------------------------------------- |
| jest.mock() for Prisma | mockDeep from jest-mock-extended | 2024                | Type-safe mocks, catches schema changes  |
| fireEvent for clicks   | userEvent.setup()                | 2024                | Simulates real browser events            |
| Manual fetch mocking   | MSW                              | 2023                | Network-level, works in all environments |
| Separate test DB       | RLS bypass in test helpers       | Already in codebase | Cleaner isolation testing                |
| Coverage as a gate     | Coverage with quality checks     | 2025                | Focus on meaningful tests, not numbers   |

**Deprecated/outdated:**

- `@types/jest`: Jest 29+ includes its own types
- `jest.mock()` for Prisma: Use jest-mock-extended mockDeep instead
- Raw `fireEvent`: Use userEvent for realistic interactions

## Test Coverage Strategy

### Prioritization Order (Based on Requirements)

1. **Auth Guards (TEST-01)** - 6 guards, critical security surface
2. **Auth Strategies (TEST-02)** - 4 strategies, authentication core
3. **Impersonation (TEST-03)** - High-risk cross-tenant feature
4. **Tenant Isolation E2E (TEST-04)** - 12+ modules, security validation
5. **Case Merge (TEST-05)** - Complex transaction logic
6. **Conflict Detection (TEST-06)** - 6 conflict types, business logic
7. **AI Services (TEST-07)** - 7 services, external integration
8. **Workflow Engine (TEST-08)** - State machine, assignment strategies
9. **Frontend (TEST-09)** - Auth pages, forms, settings

### Coverage Targets

| Area               | Current              | Target      | Strategy                                               |
| ------------------ | -------------------- | ----------- | ------------------------------------------------------ |
| Auth Guards        | 60% (3/6 have tests) | 90%+        | Complete remaining 3: jwt-ws, mfa, throttle            |
| Auth Strategies    | 0%                   | 90%+        | All 4: jwt, azure-ad, google, saml                     |
| Impersonation      | 0%                   | 90%+        | Service, middleware, guard                             |
| Tenant Isolation   | 4 modules            | 16+ modules | Add 12 more E2E suites                                 |
| Case Services      | ~20%                 | 80%+        | case-merge, case-pipeline                              |
| Conflict Detection | 0%                   | 80%+        | 4 services (detection, matching, exclusion, threshold) |
| AI Services        | 0%                   | 70%+        | 7 services (mocking Claude API)                        |
| Workflow           | 0%                   | 70%+        | Engine + 4 assignment strategies                       |
| Frontend           | 13%                  | 40%+        | Auth, forms, settings pages                            |

### Existing Tests to Reference

These files already follow patterns to copy:

| File                        | Coverage | Pattern                                  |
| --------------------------- | -------- | ---------------------------------------- |
| `jwt-auth.guard.spec.ts`    | 90%+     | Guard testing with ExecutionContext mock |
| `tenant.guard.spec.ts`      | 90%+     | Simple guard, organizationId validation  |
| `roles.guard.spec.ts`       | 90%+     | Guard with Reflector                     |
| `tenant.middleware.spec.ts` | 90%+     | Middleware testing                       |
| `mfa.service.spec.ts`       | 80%+     | Service with Prisma mock                 |
| `cases.service.spec.ts`     | 70%+     | CRUD service with activity logging       |
| `test-setup.ts`             | N/A      | E2E helper for tenant isolation          |

## Open Questions

Things that couldn't be fully resolved:

1. **jest-prisma vs manual mocking**
   - What we know: jest-prisma enables automatic transaction rollback
   - What's unclear: Whether it's worth adding given existing mockDeep approach
   - Recommendation: Stick with current mockDeep pattern for consistency

2. **Frontend 40% coverage feasibility**
   - What we know: Current 13% is mostly E2E (Playwright)
   - What's unclear: How much component testing exists
   - Recommendation: Prioritize auth pages, forms, settings - these have clear test boundaries

3. **AI service testing without real API calls**
   - What we know: Anthropic SDK can be mocked
   - What's unclear: Best patterns for testing streaming responses
   - Recommendation: Mock at service boundary, test parsing/error handling

## Sources

### Primary (HIGH confidence)

- Existing codebase patterns: `apps/backend/examples/test-pattern.spec.ts`
- Existing codebase patterns: `apps/backend/examples/e2e-test-pattern.spec.ts`
- Existing test infrastructure: `apps/backend/test/helpers/test-setup.ts`
- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing) - Official framework docs

### Secondary (MEDIUM confidence)

- [Prisma Unit Testing Guide](https://www.prisma.io/docs/orm/prisma-client/testing/unit-testing) - Transaction mocking patterns
- [Testing Library Best Practices](https://testing-library.com/docs/react-testing-library/intro/) - User-centric testing
- [MSW Documentation](https://mswjs.io/docs/) - Network mocking for frontend tests

### Tertiary (LOW confidence)

- [From 0% to 80% Coverage with Jest](https://moldstud.com/articles/p-from-0-to-80-essential-steps-to-improve-code-coverage-with-jest) - General strategy guidance
- [jest-prisma GitHub](https://github.com/Quramy/jest-prisma) - Alternative transaction rollback approach

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Already configured in package.json, verified in codebase
- Architecture: HIGH - Established patterns exist in codebase examples
- Pitfalls: MEDIUM - Based on codebase patterns + official docs

**Research date:** 2026-02-15
**Valid until:** 30 days (stable testing ecosystem)
