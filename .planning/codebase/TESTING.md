# Testing Patterns

**Analysis Date:** 2026-02-02

## Test Framework

**Backend:**
- Runner: Jest 29.7.0
- Config: `apps/backend/package.json` (inlined) + `test/jest-e2e.json` (E2E)
- Assertion library: Jest built-in + `@nestjs/testing`
- Supertest 6.3.4 for HTTP assertions in E2E tests

**Frontend:**
- Runner: Vitest 1.2.1
- Config: `apps/frontend/vitest.config.mts`
- Assertion library: Vitest built-in
- React Testing Library 14.1.2 for component assertions
- User Event 14.6.1 for user interaction simulation

**Run Commands:**

Backend:
```bash
npm run test                    # Run unit tests (spec files)
npm run test:watch             # Watch mode for unit tests
npm run test:cov               # Generate coverage report
npm run test:e2e               # Run E2E tests with jest-e2e.json config
npm run test:tenant-isolation  # Run tenant isolation security tests
npm run test:security          # Run security-focused tests
```

Frontend:
```bash
npm run test                    # Run Vitest suite
npm run test:watch             # Watch mode
npm run test:coverage          # Generate coverage report
```

Root:
```bash
npm run test                    # Run all tests (backend + frontend)
```

## Test File Organization

**Location:**
- Backend: Co-located in same directory as source
  - Unit tests: `feature.service.spec.ts` next to `feature.service.ts`
  - E2E tests: `test/{feature}/feature.e2e-spec.ts`
- Frontend: Co-located or `__tests__` subdirectory
  - Unit/component tests: `components/{feature}/__tests__/{component}.test.tsx`

**Naming:**
- Unit tests: `*.spec.ts` (matched by Jest regex `.*\.spec\.ts$`)
- E2E tests: `*.e2e-spec.ts` (matched by E2E regex `.e2e-spec.ts$`)
- Frontend tests: `*.test.tsx` or `*.spec.tsx`

**Structure:**
```
apps/backend/
├── src/
│   ├── common/
│   │   └── services/
│   │       ├── activity-description.service.ts
│   │       └── activity-description.service.spec.ts
│   └── modules/
│       └── investigations/
│           └── investigations.service.spec.ts
└── test/
    ├── helpers/
    │   ├── test-setup.ts           # Shared test utilities
    │   ├── global-setup.ts
    │   └── global-teardown.ts
    ├── activity/
    │   ├── activity.e2e-spec.ts
    │   └── activity-tenant-isolation.e2e-spec.ts
    └── investigations/
        └── investigations.e2e-spec.ts

apps/frontend/
├── src/
│   ├── components/cases/
│   │   ├── case-header.tsx
│   │   └── __tests__/
│   │       └── case-header.test.tsx
│   └── hooks/
│       ├── use-case-form-draft.ts
│       └── __tests__/
│           └── use-case-form-draft.test.ts
└── src/test/
    └── setup.ts                    # Global test setup
```

## Test Structure

**Backend Unit Test Pattern:**

```typescript
describe("ActivityDescriptionGenerator", () => {
  let generator: ActivityDescriptionGenerator;

  beforeEach(() => {
    generator = new ActivityDescriptionGenerator();
  });

  // Group related tests with nested describe blocks
  describe("create action", () => {
    it("should generate description for create action", () => {
      const context: DescriptionContext = {
        action: "created",
        entityType: "Case",
        actorName: "John Doe",
        actorType: "USER",
      };

      const result = generator.generate(context);

      expect(result).toBe("John Doe created Case");
    });
  });
});
```

**Key patterns:**
- One `describe` per class/service
- Nested `describe` for grouping related tests by method/feature
- Each test has clear name: `should {expected behavior} when {condition}`
- Arrange-Act-Assert (AAA) structure implicit (setup in describe, action/assertion in it)
- Use `beforeEach` for setup shared across multiple tests

**Backend E2E Test Pattern:**

```typescript
describe("Activity E2E", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();  // Creates 2 test orgs
  });

  afterAll(async () => {
    await destroyTestContext(ctx);
  });

  describe("GET /api/v1/activity", () => {
    it("should return organization activity for authorized user", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/activity")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(response.body).toHaveProperty("total");
    });

    it("should prevent cross-org access (tenant isolation)", async () => {
      // Create activity in orgA
      const activity = await ctx.prisma.auditLog.create({
        data: { organizationId: ctx.orgA.id, ... }
      });

      // User from orgB should NOT see it
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/activity")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      const ids = response.body.items.map(a => a.id);
      expect(ids).not.toContain(activity.id);
    });
  });
});
```

**Frontend Component Test Pattern:**

```typescript
describe("CaseHeader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders case reference number in heading", () => {
    render(<CaseHeader caseData={mockCase} isLoading={false} />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("ETH-2026-00001");
  });

  it("renders status badge with correct color", () => {
    render(<CaseHeader caseData={mockCase} isLoading={false} />);

    const statusBadge = screen.getByText("NEW");
    expect(statusBadge).toBeInTheDocument();
    expect(statusBadge).toHaveClass("bg-blue-100", "text-blue-800");
  });
});
```

## Mocking

**Framework:** Jest's built-in mocking system

**Backend Mocking Pattern:**

Mock services via `Test.createTestingModule`:
```typescript
const module: TestingModule = await Test.createTestingModule({
  providers: [
    ActivityService,
    {
      provide: PrismaService,
      useValue: {
        auditLog: {
          create: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
        },
        user: {
          findFirst: jest.fn(),
        },
      },
    },
    {
      provide: ActivityDescriptionGenerator,
      useValue: {
        generate: jest.fn(),
      },
    },
  ],
}).compile();

service = module.get<ActivityService>(ActivityService);
prismaService = module.get(PrismaService);
```

Mock setup example:
```typescript
const mockPrismaService = {
  auditLog: {
    create: jest.fn().mockResolvedValue(mockAuditLog),
    findMany: jest.fn().mockResolvedValue([mockAuditLog]),
    count: jest.fn().mockResolvedValue(1),
  },
};
```

Mock assertions:
```typescript
expect(prismaService.auditLog.create).toHaveBeenCalledWith({
  data: expect.objectContaining({
    organizationId: mockOrganizationId,
    entityType: AuditEntityType.CASE,
  }),
});
```

**Frontend Mocking Pattern (Vitest):**

Mock modules with `vi.mock()`:
```typescript
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    back: vi.fn(),
  }),
}));
```

Mock external APIs with `vi.fn()`:
```typescript
vi.mock("@/lib/cases-api", () => ({
  casesApi: {
    create: vi.fn().mockResolvedValue({ id: "case-123" }),
    getById: vi.fn().mockResolvedValue(mockCase),
  },
}));
```

## What to Mock

**Mock:**
- External API calls (use `.mockResolvedValue()` for success, `.mockRejectedValue()` for errors)
- Database calls (PrismaService methods)
- Authentication/authorization (JWT validation, Guards)
- Third-party services (storage, email, etc.)
- Next.js router and navigation functions
- Browser APIs (localStorage, sessionStorage)

**Do NOT Mock:**
- Business logic (validate that calculations are correct)
- Validation logic (test actual validator behavior)
- Date/time functions (use `jest.useFakeTimers()` if needed, not mocks)
- React hooks behavior (test actual behavior)
- Component rendering (test actual output)

**Partial Mocks (Real Implementations):**
For E2E tests, use real implementations:
```typescript
// Real Prisma queries against test database
const activity = await ctx.prisma.auditLog.create({
  data: { organizationId, ... }
});

// Real app instance with all middleware/guards
ctx.app = moduleFixture.createNestApplication();
```

## Fixtures and Factories

**Test Data Pattern:**

Create reusable mock objects at describe-level:
```typescript
const mockOrganizationId = "org-uuid-123";
const mockUserId = "user-uuid-456";
const mockEntityId = "entity-uuid-789";

const mockUser = {
  id: mockUserId,
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@example.com",
};

const mockAuditLog = {
  id: "audit-uuid-001",
  organizationId: mockOrganizationId,
  entityType: AuditEntityType.CASE,
  entityId: mockEntityId,
  action: "status_changed",
  actionDescription: "John Doe changed status from OPEN to CLOSED",
  // ... more fields
};
```

**Unique IDs for Parallel Tests:**
```typescript
// Use randomUUID() for test org creation to avoid collisions
const uniqueId = randomUUID().substring(0, 8);
const orgSlug = `test-org-alpha-${uniqueId}`;
```

**Frontend Fixtures:**
```typescript
const mockCase: Case = {
  id: "123e4567-e89b-12d3-a456-426614174000",
  referenceNumber: "ETH-2026-00001",
  organizationId: "org-123",
  status: "NEW",
  // ... other required fields
};
```

**Location:**
- Backend: Define in same test file or `test/helpers/test-setup.ts`
- Frontend: Define at top of test file or extract to `__tests__/fixtures.ts`

## Coverage

**Requirements:**
- Line coverage: 80% minimum (target: 85%)
- Branch coverage: 75% minimum (target: 80%)
- Function coverage: 80% minimum

**View Coverage:**
```bash
npm run test:cov                # Generates coverage/
cd apps/backend && open coverage/lcov-report/index.html
cd apps/frontend && open coverage/index.html
```

**Coverage Map:**
- Red: 0-40%
- Yellow: 40-80%
- Green: >80%

**What Must Be Tested:**
- All public methods (100% line coverage)
- All error paths (catch blocks, exceptions)
- All conditional branches (if/else, switch cases)
- All public API endpoints (E2E)
- Tenant isolation (cross-org access blocked)

**What Can Be Lower Coverage:**
- Very simple getters/setters (coverage >50% acceptable)
- Error handling that's hard to trigger in tests (aim for >70%)
- Boilerplate configuration (not tested directly)

## Test Types

**Unit Tests:**
- Scope: Single function or method in isolation
- Mocks: Dependencies mocked (PrismaService, external APIs)
- Location: `src/**/*.spec.ts`
- Example: `ActivityDescriptionGenerator.generate()` with mocked data
- Speed: <1 second per test

**Integration Tests:**
- Scope: Service + mocked persistence (database calls)
- Mocks: External APIs, but NOT Prisma
- Location: `src/**/*.spec.ts` (same as unit, just fewer mocks)
- Example: `ActivityService.log()` with real Prisma but mocked generator
- Speed: 1-5 seconds per test

**E2E Tests:**
- Scope: Full request → response pipeline
- Mocks: None (except external APIs like payment processors)
- Location: `test/**/*.e2e-spec.ts`
- Real components: App, Controllers, Services, Prisma, Database
- Example: POST `/api/v1/activity` endpoint with full auth, validation, logging
- Speed: 5-30 seconds per test
- Tenant isolation verified: Always include cross-org access test

**Security Tests:**
- Scope: Authorization, authentication, tenant isolation
- Location: `test/**/*-tenant-isolation.e2e-spec.ts` or `test/**/*-security.e2e-spec.ts`
- Must test: Cross-org access blocked, role-based access, guard validation
- Example: `activity-tenant-isolation.e2e-spec.ts` verifies orgB user cannot see orgA activity

## Common Patterns

**Async Testing:**

Jest patterns:
```typescript
// Using async/await (recommended)
it("should create activity", async () => {
  const result = await service.log(input);
  expect(result).toBeDefined();
});

// Using promises
it("should create activity", () => {
  return service.log(input).then((result) => {
    expect(result).toBeDefined();
  });
});

// E2E with Supertest
it("should return activity", () => {
  return request(app.getHttpServer())
    .get("/api/v1/activity")
    .expect(200);
});
```

**Error Testing:**

```typescript
it("should throw BadRequestException on invalid input", async () => {
  await expect(service.create(invalidInput)).rejects.toThrow(
    BadRequestException
  );
});

// For specific error message
it("should include validation errors", async () => {
  try {
    await service.create(invalidInput);
    fail("Should have thrown");
  } catch (error) {
    expect(error).toBeInstanceOf(BadRequestException);
    expect(error.message).toContain("validation failed");
  }
});
```

**Component Testing:**

Mock user interactions:
```typescript
it("should update draft on form change", async () => {
  const user = userEvent.setup();

  render(<CaseCreationForm />);

  const detailsInput = screen.getByPlaceholderText("Enter case details");
  await user.type(detailsInput, "Test details");

  await waitFor(() => {
    expect(localStorage.getItem("draft:case-creation")).toBeTruthy();
  });
});
```

**Mocking async operations:**
```typescript
it("should show loading state during submission", async () => {
  const mockSubmit = jest
    .fn()
    .mockImplementation(
      () =>
        new Promise((resolve) => setTimeout(() => resolve({}), 100))
    );

  render(<CaseCreationForm onSubmit={mockSubmit} />);

  // Assert loading state
  expect(screen.getByText("Saving...")).toBeInTheDocument();
});
```

**Clearing mocks between tests:**
```typescript
beforeEach(() => {
  vi.clearAllMocks();  // Clears call history
  jest.clearAllMocks(); // Jest equivalent
});
```

## Test Environment Setup

**Backend:**
- `test/helpers/global-setup.ts`: Runs before all tests (database setup)
- `test/helpers/global-teardown.ts`: Runs after all tests (cleanup)
- `test/helpers/test-setup.ts`: Shared utilities (`createTestContext`, `destroyTestContext`)
- E2E max workers: 1 (sequential to avoid database conflicts)
- E2E timeout: 30 seconds per test

**Frontend:**
- Setup file: `src/test/setup.ts`
- Vitest environment: jsdom
- Global configuration in `vitest.config.mts`

**Critical: Tenant Isolation Testing**

Every E2E test involving data access MUST verify tenant isolation:
```typescript
describe("Activity Tenant Isolation", () => {
  it("should prevent orgB user from seeing orgA activity", async () => {
    // Create activity in orgA
    const activity = await ctx.prisma.auditLog.create({
      data: {
        organizationId: ctx.orgA.id,
        entityType: AuditEntityType.CASE,
        // ... other fields
      }
    });

    // OrgB user tries to list activity
    const response = await request(ctx.app.getHttpServer())
      .get("/api/v1/activity")
      .set(authHeader(ctx.orgB.users[0]))
      .expect(200);

    // Should not contain orgA activity
    const itemIds = response.body.items.map(item => item.id);
    expect(itemIds).not.toContain(activity.id);
  });
});
```

---

*Testing analysis: 2026-02-02*
