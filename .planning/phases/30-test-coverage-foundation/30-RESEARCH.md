# Phase 30: Test Coverage Foundation - Research

**Researched:** 2026-02-14
**Domain:** NestJS unit testing, Prisma mocking, Vitest + React Testing Library, MSW, Error Boundaries
**Confidence:** HIGH

## Summary

This research focuses on implementing test coverage for an existing NestJS + Next.js codebase. The platform already has established testing patterns (see `apps/backend/examples/test-pattern.spec.ts` and existing tests like `investigations.service.spec.ts`), so this phase is about **scaling what works**, not introducing new patterns.

Key findings:

1. **Established patterns exist** - The codebase has canonical test patterns in `apps/backend/examples/` that MUST be followed
2. **Prisma mocking is straightforward** - Manual mocks of the Prisma service work well in existing tests
3. **8 auth services need tests** - Auth module has `AuthService`, `MfaService`, `SsoService`, `TokenRefreshService`, `SsoConfigService`, `DomainService`, `DomainVerificationService`, `RecoveryCodesService`
4. **Frontend has partial test coverage** - Some component tests exist using Vitest + RTL, but no MSW setup yet
5. **Error boundaries need creation** - No existing error boundary components found

**Primary recommendation:** Follow the established testing patterns exactly. Create tests for auth services first (security-critical), then core entity services, then campaigns/policies. Add MSW setup and error boundaries in parallel.

## Standard Stack

### Backend Testing (NestJS + Jest)

| Library         | Version | Purpose            | Why Standard                          |
| --------------- | ------- | ------------------ | ------------------------------------- |
| Jest            | 29.7.0  | Test runner        | NestJS default, already configured    |
| @nestjs/testing | 10.3.0  | Test utilities     | Provides `Test.createTestingModule()` |
| supertest       | 6.3.4   | HTTP assertions    | E2E test standard                     |
| ts-jest         | 29.1.1  | TypeScript support | Already configured                    |

### Frontend Testing (Next.js + Vitest)

| Library                     | Version | Purpose                     | Why Standard                         |
| --------------------------- | ------- | --------------------------- | ------------------------------------ |
| Vitest                      | 1.2.1   | Test runner                 | Already configured, faster than Jest |
| @testing-library/react      | 14.1.2  | Component testing           | Standard for React                   |
| @testing-library/user-event | 14.6.1  | User interaction simulation | More realistic than fireEvent        |
| jsdom                       | 24.0.0  | DOM environment             | Already configured                   |

### Additional Libraries Needed

| Library | Version | Purpose     | When to Use                                |
| ------- | ------- | ----------- | ------------------------------------------ |
| msw     | ^2.x    | API mocking | Frontend component tests needing API calls |

**Installation:**

```bash
# Frontend only - backend already has all testing deps
cd apps/frontend
npm install -D msw
```

### Alternatives Considered

| Instead of          | Could Use                | Tradeoff                                   |
| ------------------- | ------------------------ | ------------------------------------------ |
| Manual Prisma mocks | prisma-mock library      | Manual is simpler and already established  |
| MSW                 | nock, axios-mock-adapter | MSW works at network level, more realistic |
| Vitest              | Jest                     | Vitest already configured, faster          |

## Architecture Patterns

### Existing Test Structure

```
apps/backend/
├── src/modules/
│   ├── auth/
│   │   ├── auth.service.ts          # Needs tests
│   │   ├── auth.service.spec.ts     # To create
│   │   ├── mfa/
│   │   │   ├── mfa.service.ts       # Needs tests
│   │   │   └── mfa.service.spec.ts  # To create
│   │   └── ...
│   ├── cases/
│   │   ├── cases.service.ts         # Needs tests
│   │   └── cases.service.spec.ts    # To create
│   └── investigations/
│       ├── investigations.service.ts
│       └── investigations.service.spec.ts  # EXISTS - Reference!
└── examples/
    ├── test-pattern.spec.ts         # CANONICAL - Follow exactly
    └── e2e-test-pattern.spec.ts     # CANONICAL - Follow for E2E

apps/frontend/
├── src/
│   ├── components/
│   │   ├── cases/
│   │   │   └── __tests__/           # Some tests exist
│   │   ├── dashboard/               # Needs tests
│   │   └── errors/                  # To create (error boundaries)
│   └── test/
│       └── setup.ts                 # Vitest setup
```

### Pattern 1: NestJS Service Unit Test (ESTABLISHED)

**What:** Test service methods with mocked dependencies
**When to use:** Every service needs this
**Example:**

```typescript
// Source: apps/backend/examples/test-pattern.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../modules/prisma/prisma.service";
import { ActivityService } from "../common/services/activity.service";

describe("ExampleService", () => {
  let service: ExampleService;
  let prisma: jest.Mocked<PrismaService>;
  let activityService: jest.Mocked<ActivityService>;

  // Test data fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";

  // Mock setup - create manual mocks
  const mockPrismaService = {
    example: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockActivityService = {
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExampleService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ActivityService, useValue: mockActivityService },
      ],
    }).compile();

    service = module.get<ExampleService>(ExampleService);
    prisma = module.get(PrismaService);
    activityService = module.get(ActivityService);

    jest.clearAllMocks();
  });

  describe("create", () => {
    it("should create with correct organization", async () => {
      // Arrange
      mockPrismaService.example.create.mockResolvedValue(mockEntity);

      // Act
      const result = await service.create(dto, mockUserId, mockOrgId);

      // Assert
      expect(prisma.example.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrgId, // CRITICAL
        }),
      });
    });
  });
});
```

### Pattern 2: Testing EventEmitter2 Emissions

**What:** Verify services emit correct events
**When to use:** Services that emit events (CasesService, RiusService, PoliciesService)
**Example:**

```typescript
import { EventEmitter2 } from '@nestjs/event-emitter';

const mockEventEmitter = {
  emit: jest.fn(),
};

// In test module setup
{ provide: EventEmitter2, useValue: mockEventEmitter },

// In test
it('should emit case.created event', async () => {
  await service.create(dto, userId, orgId);

  expect(mockEventEmitter.emit).toHaveBeenCalledWith(
    'case.created',
    expect.objectContaining({
      organizationId: orgId,
      caseId: expect.any(String),
    })
  );
});
```

### Pattern 3: Testing withBypassRLS (Auth Services)

**What:** Test services that bypass RLS for cross-tenant lookups
**When to use:** AuthService.login(), AuthService.refreshTokens()
**Example:**

```typescript
const mockPrismaService = {
  user: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  session: {
    create: jest.fn(),
  },
  withBypassRLS: jest.fn((callback) => callback()), // Execute callback immediately
};

it("should bypass RLS for login", async () => {
  mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
  mockPrismaService.session.create.mockResolvedValue(mockSession);

  await service.login(loginDto);

  expect(mockPrismaService.withBypassRLS).toHaveBeenCalled();
});
```

### Pattern 4: Frontend Component Test with Vitest

**What:** Test React components in isolation
**When to use:** All component tests
**Example:**

```typescript
// Source: apps/frontend/src/components/cases/__tests__/editable-field.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ComponentName', () => {
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<Component prop="value" />);
    expect(screen.getByText('expected')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<Component onSave={mockOnSave} />);

    await user.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalled();
    });
  });
});
```

### Pattern 5: MSW Setup for API Mocking

**What:** Mock API calls at the network level
**When to use:** Component tests that need API responses
**Example:**

```typescript
// apps/frontend/src/test/mocks/handlers.ts
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/v1/cases", () => {
    return HttpResponse.json({
      data: [{ id: "1", referenceNumber: "ETH-2026-00001" }],
      total: 1,
    });
  }),

  http.get("/api/v1/cases/:id", ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      referenceNumber: "ETH-2026-00001",
      status: "OPEN",
    });
  }),
];

// apps/frontend/src/test/mocks/server.ts
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);

// apps/frontend/src/test/setup.ts (updated)
import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Pattern 6: Error Boundary Component

**What:** React component that catches JS errors in child tree
**When to use:** Wrap major route segments, data-fetching components
**Example:**

```typescript
// apps/frontend/src/components/errors/error-boundary.tsx
'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error reporting service
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### Anti-Patterns to Avoid

- **Testing implementation details:** Test behavior, not internal state
- **Not testing tenant isolation:** EVERY service test must verify `organizationId` filtering
- **Mocking too much:** Only mock external dependencies, not the unit under test
- **Skipping activity log assertions:** Verify `activityService.log` is called correctly
- **Using real database in unit tests:** Always mock Prisma for unit tests
- **Not resetting mocks:** Use `jest.clearAllMocks()` in `beforeEach`

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem             | Don't Build          | Use Instead                   | Why                                  |
| ------------------- | -------------------- | ----------------------------- | ------------------------------------ |
| API mocking         | Custom interceptors  | MSW                           | Network-level, realistic, maintained |
| Prisma type mocking | Complex manual types | Manual mocks with `jest.fn()` | Simpler, already established pattern |
| Test fixtures       | Random generators    | Static fixtures per test file | Predictable, debuggable              |
| Async assertions    | Custom waitFor       | RTL's `waitFor`               | Battle-tested, handles edge cases    |
| DOM queries         | querySelector        | RTL queries (getByRole, etc.) | Accessibility-based, maintainable    |

**Key insight:** The codebase already has working patterns. Don't introduce new testing libraries or approaches - scale what exists.

## Common Pitfalls

### Pitfall 1: Testing with Wrong Organization ID

**What goes wrong:** Tests pass but service has tenant leak
**Why it happens:** Test doesn't verify `organizationId` in queries
**How to avoid:**

```typescript
// ALWAYS verify org filtering
expect(prisma.case.findFirst).toHaveBeenCalledWith({
  where: expect.objectContaining({
    organizationId: mockOrgId, // CRITICAL
  }),
});
```

**Warning signs:** Tests pass but `organizationId` not in assertions

### Pitfall 2: Not Testing Status Transitions

**What goes wrong:** Invalid state transitions allowed
**Why it happens:** Only testing happy path
**How to avoid:**

```typescript
// Test both valid AND invalid transitions
it("should reject DRAFT -> CLOSED transition", async () => {
  await expect(
    service.changeStatus(id, "CLOSED", userId, orgId),
  ).rejects.toThrow(BadRequestException);
});
```

**Warning signs:** State machine bugs in production

### Pitfall 3: Forgetting Event Emission Tests

**What goes wrong:** Events not emitted, downstream services don't react
**Why it happens:** Focus on return value, not side effects
**How to avoid:**

```typescript
// Always verify events
expect(mockEventEmitter.emit).toHaveBeenCalledWith(
  "case.created",
  expect.objectContaining({ caseId: result.id }),
);
```

**Warning signs:** Audit logs missing, search index stale

### Pitfall 4: Mock Leakage Between Tests

**What goes wrong:** Tests pass/fail depending on run order
**Why it happens:** Mock state not reset
**How to avoid:**

```typescript
beforeEach(() => {
  jest.clearAllMocks(); // ALWAYS
});
```

**Warning signs:** Flaky tests, "works on my machine"

### Pitfall 5: Testing Too Many Things at Once

**What goes wrong:** Test failures hard to diagnose
**Why it happens:** Integration test disguised as unit test
**How to avoid:** One assertion focus per test, mock collaborators
**Warning signs:** Tests over 50 lines, multiple service calls

### Pitfall 6: Error Boundary Not Resetting

**What goes wrong:** Error state persists after retry
**Why it happens:** State not cleared on retry click
**How to avoid:**

```typescript
handleRetry = () => {
  this.setState({ hasError: false, error: null });
};
```

**Warning signs:** "Try again" button does nothing

## Code Examples

### Auth Service Test Skeleton

```typescript
// apps/backend/src/modules/auth/auth.service.spec.ts
import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

jest.mock("bcrypt");

describe("AuthService", () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;

  const mockUser = {
    id: "user-123",
    email: "test@example.com",
    passwordHash: "hashed-password",
    isActive: true,
    organizationId: "org-123",
    organization: { isActive: true },
    firstName: "Test",
    lastName: "User",
    role: "COMPLIANCE_OFFICER",
  };

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    withBypassRLS: jest.fn((cb) => cb()),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn().mockResolvedValue("mock-token"),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              if (key === "jwt.accessTokenExpiry") return "15m";
              if (key === "jwt.refreshTokenExpiry") return "7d";
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);

    jest.clearAllMocks();
  });

  describe("login", () => {
    it("should return tokens and user on valid credentials", async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.session.create.mockResolvedValue({ id: "session-123" });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result.user.email).toBe("test@example.com");
    });

    it("should throw UnauthorizedException on invalid password", async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: "test@example.com", password: "wrong" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should throw UnauthorizedException on inactive organization", async () => {
      mockPrismaService.user.findFirst.mockResolvedValue({
        ...mockUser,
        organization: { isActive: false },
      });

      await expect(
        service.login({ email: "test@example.com", password: "password123" }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("should bypass RLS for login", async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      mockPrismaService.session.create.mockResolvedValue({ id: "session-123" });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await service.login({
        email: "test@example.com",
        password: "password123",
      });

      expect(mockPrismaService.withBypassRLS).toHaveBeenCalled();
    });
  });
});
```

### MSW Handlers for Cases

```typescript
// apps/frontend/src/test/mocks/handlers/cases.ts
import { http, HttpResponse } from "msw";

const mockCases = [
  {
    id: "case-1",
    referenceNumber: "ETH-2026-00001",
    status: "OPEN",
    severity: "HIGH",
    createdAt: "2026-01-15T10:00:00Z",
    organizationId: "org-test",
  },
  {
    id: "case-2",
    referenceNumber: "ETH-2026-00002",
    status: "INVESTIGATING",
    severity: "MEDIUM",
    createdAt: "2026-01-16T14:30:00Z",
    organizationId: "org-test",
  },
];

export const casesHandlers = [
  http.get("/api/v1/cases", ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    let filtered = mockCases;
    if (status) {
      filtered = mockCases.filter((c) => c.status === status);
    }

    return HttpResponse.json({
      data: filtered,
      total: filtered.length,
      limit: 20,
      offset: 0,
    });
  }),

  http.get("/api/v1/cases/:id", ({ params }) => {
    const caseItem = mockCases.find((c) => c.id === params.id);
    if (!caseItem) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(caseItem);
  }),

  http.post("/api/v1/cases", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        id: "case-new",
        referenceNumber: "ETH-2026-00003",
        status: "NEW",
        ...body,
      },
      { status: 201 },
    );
  }),
];
```

### Error Boundary Test

```typescript
// apps/frontend/src/components/errors/__tests__/error-boundary.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ErrorBoundary } from '../error-boundary';

// Component that throws
function ThrowingComponent() {
  throw new Error('Test error');
}

// Suppress console.error for cleaner test output
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});
afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
  });

  it('recovers when Try again is clicked', async () => {
    const user = userEvent.setup();
    let shouldThrow = true;

    function MaybeThrow() {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div>Recovered</div>;
    }

    const { rerender } = render(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    shouldThrow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    // Force re-render
    rerender(
      <ErrorBoundary>
        <MaybeThrow />
      </ErrorBoundary>
    );

    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });
});
```

## State of the Art

| Old Approach       | Current Approach      | When Changed | Impact                           |
| ------------------ | --------------------- | ------------ | -------------------------------- |
| Enzyme             | React Testing Library | 2020+        | Test behavior not implementation |
| Manual fetch mocks | MSW                   | 2021+        | Network-level, realistic         |
| Jest for frontend  | Vitest                | 2023+        | Faster, ESM native               |
| Snapshot testing   | Explicit assertions   | 2021+        | More maintainable                |

**Deprecated/outdated:**

- Enzyme: React 18 incompatible, use RTL
- Jest for frontend: Vitest already configured, don't switch back
- Shallow rendering: Doesn't test real behavior

## Open Questions

1. **TOTP mocking in MFA tests**
   - What we know: MfaService uses `otplib` for TOTP
   - What's unclear: Best way to mock time-based codes
   - Recommendation: Mock `totp.verify()` to return `{ valid: true/false }`

2. **JWT signing in auth tests**
   - What we know: AuthService uses JwtService for tokens
   - What's unclear: Whether to mock or use real signing
   - Recommendation: Mock `signAsync` to return predictable tokens

3. **WebSocket tests**
   - What we know: Platform has WebSocket features
   - What's unclear: Out of scope for this phase
   - Recommendation: Defer to later phase focused on real-time features

## Services Requiring Tests

### Auth Module (TEST-01)

| Service                     | Methods to Test                                                                                    | Complexity |
| --------------------------- | -------------------------------------------------------------------------------------------------- | ---------- |
| `AuthService`               | login, refreshTokens, revokeAllSessions, revokeSession, createSsoSession                           | HIGH       |
| `MfaService`                | initiateMfaSetup, verifyAndEnableMfa, verifyMfa, disableMfa, regenerateRecoveryCodes, getMfaStatus | HIGH       |
| `SsoService`                | findOrCreateSsoUser, linkSsoToExistingUser, jitProvisionUser                                       | MEDIUM     |
| `TokenRefreshService`       | refreshAccessToken, refreshWebSocketToken, revokeAllUserSessions                                   | MEDIUM     |
| `SsoConfigService`          | getSsoConfig, updateSsoConfig                                                                      | LOW        |
| `DomainService`             | getDomain, addDomain, removeDomain, findOrganizationByEmailDomain                                  | MEDIUM     |
| `DomainVerificationService` | initiateDnsVerification, checkDnsVerification                                                      | MEDIUM     |
| `RecoveryCodesService`      | generateRecoveryCodes, hashRecoveryCodes, verifyRecoveryCode                                       | LOW        |

### Core Services (TEST-02)

| Service                 | Methods to Test                                                                      | Complexity           |
| ----------------------- | ------------------------------------------------------------------------------------ | -------------------- |
| `CasesService`          | create, findAll, findOne, update, updateStatus, close, generateReferenceNumber       | HIGH                 |
| `RiusService`           | create, findOne, update (immutability enforcement), updateStatus, updateAiEnrichment | HIGH                 |
| `InvestigationsService` | create, findOne, findAllForCase, assign, transition, close, recordFindings           | MEDIUM (tests exist) |

### Campaigns/Policies (TEST-03)

| Service            | Methods to Test                                                           | Complexity |
| ------------------ | ------------------------------------------------------------------------- | ---------- |
| `CampaignsService` | create, findAll, findOne, update, launch, pause, resume, cancel, complete | HIGH       |
| `PoliciesService`  | create, findById, findAll, updateDraft, publish, retire, getVersions      | HIGH       |

### Frontend (TEST-04)

| Component/Feature    | What to Test                            | Priority |
| -------------------- | --------------------------------------- | -------- |
| MSW Setup            | Handler configuration, server lifecycle | HIGH     |
| Dashboard Components | Render, data display, quick actions     | MEDIUM   |
| Case List            | Render, pagination, filtering, search   | HIGH     |
| Case Detail          | Render, editable fields, status updates | HIGH     |
| Error Boundaries     | Error catching, fallback UI, recovery   | HIGH     |

## Sources

### Primary (HIGH confidence)

- `apps/backend/examples/test-pattern.spec.ts` - Canonical unit test pattern
- `apps/backend/examples/e2e-test-pattern.spec.ts` - Canonical E2E pattern
- `apps/backend/src/modules/investigations/investigations.service.spec.ts` - Working example
- `apps/backend/src/modules/investigation-notes/investigation-notes.service.spec.ts` - Working example
- `apps/frontend/src/components/cases/__tests__/editable-field.test.tsx` - Frontend pattern

### Secondary (MEDIUM confidence)

- NestJS Testing Documentation - https://docs.nestjs.com/fundamentals/testing
- MSW Documentation - https://mswjs.io/docs/
- React Testing Library - https://testing-library.com/docs/react-testing-library/intro/

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - Already configured and working
- Architecture patterns: HIGH - Canonical examples exist in codebase
- Pitfalls: HIGH - Observed from existing tests and NestJS best practices

**Research date:** 2026-02-14
**Valid until:** 90 days (stable testing patterns)
