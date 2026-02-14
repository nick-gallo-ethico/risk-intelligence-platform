# Testing Patterns

**Analysis Date:** 2026-02-13

## Test Framework

**Runner:**

- Jest 29.7.0
- Config: `apps/backend/package.json` (unit), `apps/backend/test/jest-e2e.json` (E2E)

**Assertion Library:**

- Jest built-in matchers
- NestJS Testing utilities (`@nestjs/testing`)

**Run Commands:**

```bash
npm test                          # Run all unit tests
npm run test:watch                # Watch mode
npm run test:cov                  # Generate coverage report
npm run test:debug                # Debug mode
npm run test:e2e                  # Run E2E tests
npm run test:tenant-isolation     # Run tenant isolation security tests
npm run test:security             # Run security-specific tests
```

**Single Test File:**

```bash
npm test -- --testPathPattern="activity.service.spec"
```

## Test File Organization

**Location:**

- Unit tests: Co-located with source files (e.g., `activity.service.spec.ts` next to `activity.service.ts`)
- E2E tests: `apps/backend/test/` directory
- Test helpers: `apps/backend/test/helpers/`

**Naming:**

- Unit: `*.spec.ts` (e.g., `investigation.service.spec.ts`)
- E2E: `*.e2e-spec.ts` (e.g., `tenant-isolation.e2e-spec.ts`)
- Pattern files: `apps/backend/examples/test-pattern.spec.ts`, `apps/backend/examples/e2e-test-pattern.spec.ts`

**Structure:**

```
apps/backend/
├── src/
│   └── modules/
│       └── investigations/
│           ├── investigations.service.ts
│           └── investigations.service.spec.ts  # Unit test
└── test/
    ├── investigations/
    │   └── investigations.e2e-spec.ts         # E2E test
    ├── tenant-isolation.e2e-spec.ts           # Security test
    ├── helpers/
    │   ├── global-setup.ts
    │   └── global-teardown.ts
    └── jest-e2e.json
```

## Test Structure

**Suite Organization (Unit Tests):**

```typescript
describe('ServiceName', () => {
  let service: ServiceName;
  let prisma: jest.Mocked<PrismaService>;
  let activityService: jest.Mocked<ActivityService>;

  // Test data fixtures
  const mockOrgId = 'org-test-123';
  const mockUserId = 'user-test-123';

  // Mock setup
  const mockPrismaService = {
    entity: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceName,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ActivityService, useValue: mockActivityService },
      ],
    }).compile();

    service = module.get<ServiceName>(ServiceName);
    prisma = module.get(PrismaService);
    activityService = module.get(ActivityService);

    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do the expected behavior', async () => {
      // Arrange
      mockPrismaService.entity.create.mockResolvedValue(mockEntity);

      // Act
      const result = await service.create(dto, userId, orgId);

      // Assert
      expect(result).toEqual(mockEntity);
      expect(prisma.entity.create).toHaveBeenCalledWith(...);
    });
  });
});
```

**Patterns:**

- Arrange-Act-Assert structure
- Group related tests with nested `describe()` blocks
- One assertion concept per test
- Clear test names: `'should create entity with correct organization and user'`

## Mocking

**Framework:** Jest built-in mocking

**Patterns:**

**Service Mocking:**

```typescript
const mockPrismaService = {
  investigation: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  case: {
    findFirst: jest.fn(),
  },
};

const mockActivityService = {
  log: jest.fn(),
};
```

**Mock Return Values:**

```typescript
mockPrismaService.investigation.findFirst.mockResolvedValue(mockEntity);
mockPrismaService.investigation.findFirst.mockResolvedValue(null); // Not found
mockPrismaService.investigation.create.mockRejectedValue(new Error("DB error"));
```

**What to Mock:**

- All dependencies (PrismaService, ActivityService, etc.)
- External services (AI providers, email, storage)
- Time-dependent functions (use `jest.useFakeTimers()`)

**What NOT to Mock:**

- The service under test
- DTOs (use real objects)
- Simple utility functions
- Types and interfaces

**Clearing Mocks:**

```typescript
beforeEach(() => {
  jest.clearAllMocks(); // Reset call counts and return values
});

afterEach(() => {
  jest.clearAllMocks(); // Alternative placement
});
```

## Fixtures and Factories

**Test Data:**

```typescript
// Test data fixtures at top of describe block
const mockOrgId = "org-test-123";
const mockUserId = "user-test-123";
const mockEntityId = "entity-test-123";

const mockEntity = {
  id: mockEntityId,
  name: "Test Entity",
  status: InvestigationStatus.NEW,
  organizationId: mockOrgId,
  createdById: mockUserId,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCreateDto = {
  categoryId: "category-123",
  investigationType: "FORMAL",
  department: "HR",
};
```

**Location:**

- Defined at top of `describe()` block
- Shared across tests in that suite
- Use `mockResolvedValue()` to set per-test variations

**Factory Pattern (when needed):**

```typescript
function createMockInvestigation(overrides = {}) {
  return {
    id: "inv-123",
    investigationNumber: 1,
    status: InvestigationStatus.NEW,
    organizationId: mockOrgId,
    ...overrides,
  };
}
```

## Coverage

**Requirements:**

- Target: 85% line coverage (80% minimum)
- Target: 80% branch coverage (75% minimum)
- Enforced via: `npm run test:cov`

**View Coverage:**

```bash
npm run test:cov
# Opens coverage/lcov-report/index.html
```

**Coverage Config:**

```json
{
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage"
}
```

**Exclusions:**

- `dist/` directory (compiled)
- `node_modules/`
- `.eslintrc.js`
- Test files themselves

## Test Types

**Unit Tests:**

- Scope: Single service/class in isolation
- All dependencies mocked
- Fast execution (<100ms per test)
- Test business logic, validation, transformations
- Location: Co-located with source (`*.spec.ts`)

**Example:**

```typescript
describe("InvestigationsService", () => {
  describe("create", () => {
    it("should create investigation with correct organization", async () => {
      mockPrismaService.case.findFirst.mockResolvedValue(mockCase);
      mockPrismaService.investigation.create.mockResolvedValue(
        mockInvestigation,
      );

      const result = await service.create(dto, caseId, userId, orgId);

      expect(prisma.investigation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: orgId, // CRITICAL
        }),
      });
    });
  });
});
```

**Integration Tests:**

- Not currently used (E2E tests serve this role)
- Would test service + database without full app
- Planned but not implemented

**E2E Tests:**

- Scope: Full request/response cycle through HTTP
- Real database (test database)
- Authentication and authorization
- Tenant isolation verification (CRITICAL)
- Location: `apps/backend/test/*.e2e-spec.ts`

**Example:**

```typescript
describe("InvestigationsController (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    // Create test orgs, users, generate JWT tokens
  });

  afterAll(async () => {
    // Clean up test data
    await app.close();
  });

  describe("Tenant Isolation", () => {
    it("Org B cannot access Org A entity", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/investigations/${orgAEntityId}`)
        .set("Authorization", `Bearer ${tokenB}`)
        .expect(404); // Not 403 - prevents enumeration
    });
  });
});
```

## Common Patterns

**Async Testing:**

```typescript
it("should handle async operation", async () => {
  mockService.create.mockResolvedValue(result);
  const output = await service.create(input);
  expect(output).toEqual(result);
});
```

**Error Testing:**

```typescript
it("should throw NotFoundException when entity not found", async () => {
  mockPrismaService.investigation.findFirst.mockResolvedValue(null);

  await expect(service.findOne("non-existent-id", orgId)).rejects.toThrow(
    NotFoundException,
  );
});
```

**Parameterized Tests:**

```typescript
it.each([
  ['created', AuditActionCategory.CREATE],
  ['updated', AuditActionCategory.UPDATE],
  ['deleted', AuditActionCategory.DELETE],
])('should infer %s as %s', async (action, expectedCategory) => {
  const input = { action, ... };
  await service.log(input);
  expect(prismaService.auditLog.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({ actionCategory: expectedCategory }),
    })
  );
});
```

**State Machine Testing:**

```typescript
describe("status transitions", () => {
  it("should allow valid transition DRAFT -> ACTIVE", async () => {
    mockPrismaService.entity.findFirst.mockResolvedValue({ status: "DRAFT" });
    await service.changeStatus(id, "ACTIVE", rationale, userId, orgId);
    expect(prisma.entity.update).toHaveBeenCalled();
  });

  it("should reject invalid transition DRAFT -> ARCHIVED", async () => {
    mockPrismaService.entity.findFirst.mockResolvedValue({ status: "DRAFT" });
    await expect(
      service.changeStatus(id, "ARCHIVED", rationale, userId, orgId),
    ).rejects.toThrow(ForbiddenException);
  });
});
```

**Pagination Testing:**

```typescript
it("should return paginated results", async () => {
  mockPrismaService.entity.findMany.mockResolvedValue([mockEntity]);
  mockPrismaService.entity.count.mockResolvedValue(50);

  const result = await service.findAll(orgId, { page: 2, limit: 25 });

  expect(prisma.entity.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      skip: 25, // (page 2 - 1) * limit 25
      take: 25,
    }),
  );
  expect(result.pagination).toEqual({
    page: 2,
    limit: 25,
    total: 50,
    totalPages: 2,
  });
});
```

**Activity Logging Testing:**

```typescript
it("should log activity on create", async () => {
  mockPrismaService.entity.create.mockResolvedValue(mockEntity);

  await service.create(dto, userId, orgId);

  expect(activityService.log).toHaveBeenCalledWith({
    entityType: AuditEntityType.ENTITY,
    entityId: mockEntity.id,
    action: "created",
    actionDescription: expect.stringContaining("Created"),
    actorUserId: userId,
    organizationId: orgId,
  });
});
```

**Tenant Isolation Testing (CRITICAL):**

```typescript
it("should throw NotFoundException when entity belongs to different org", async () => {
  mockPrismaService.entity.findFirst.mockResolvedValue(null);

  await expect(service.findOne(entityId, "different-org-id")).rejects.toThrow(
    NotFoundException,
  );

  expect(prisma.entity.findFirst).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        id: entityId,
        organizationId: "different-org-id", // Query included org filter
      }),
    }),
  );
});

it("should always filter by organizationId", async () => {
  await service.findAll(orgId);

  expect(prisma.entity.findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        organizationId: orgId, // CRITICAL
      }),
    }),
  );
});
```

## E2E Test Patterns

**Authentication:**

```typescript
it("should reject requests without token", async () => {
  await request(app.getHttpServer()).get("/api/v1/investigations").expect(401);
});

it("should accept requests with valid token", async () => {
  await request(app.getHttpServer())
    .get("/api/v1/investigations")
    .set("Authorization", `Bearer ${validToken}`)
    .expect(200);
});
```

**Validation:**

```typescript
it("should reject invalid input", async () => {
  await request(app.getHttpServer())
    .post("/api/v1/investigations")
    .set("Authorization", `Bearer ${token}`)
    .send({
      /* missing required fields */
    })
    .expect(400);
});

it("should reject unknown fields (whitelist)", async () => {
  await request(app.getHttpServer())
    .post("/api/v1/investigations")
    .set("Authorization", `Bearer ${token}`)
    .send({
      name: "Valid",
      organizationId: "hacker-org", // Should be rejected
    })
    .expect(400);
});
```

**Tenant Isolation (E2E):**

```typescript
describe("Tenant Isolation", () => {
  it("Org B cannot list Org A entities", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/investigations")
      .set("Authorization", `Bearer ${tokenB}`)
      .expect(200);

    const orgAEntities = response.body.items.filter(
      (e) => e.organizationId === orgA.id,
    );
    expect(orgAEntities).toHaveLength(0);
  });

  it("Org B cannot update Org A entity", async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/investigations/${orgAEntityId}`)
      .set("Authorization", `Bearer ${tokenB}`)
      .send({ name: "Hacked" })
      .expect(404);

    // Verify entity was NOT modified
    const entity = await prisma.investigation.findUnique({
      where: { id: orgAEntityId },
    });
    expect(entity?.name).toBe("Original Name");
  });
});
```

## E2E Test Configuration

**Config File:** `apps/backend/test/jest-e2e.json`

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": { "^.+\\.(t|j)s$": "ts-jest" },
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/../src/$1",
    "^@common/(.*)$": "<rootDir>/../src/common/$1",
    "^@modules/(.*)$": "<rootDir>/../src/modules/$1",
    "^@config/(.*)$": "<rootDir>/../src/config/$1"
  },
  "maxWorkers": 1,
  "globalSetup": "<rootDir>/helpers/global-setup.ts",
  "globalTeardown": "<rootDir>/helpers/global-teardown.ts",
  "testTimeout": 30000
}
```

**Key Settings:**

- `maxWorkers: 1` - Run tests serially to avoid database conflicts
- `testTimeout: 30000` - 30 second timeout for slow E2E tests
- `globalSetup`/`globalTeardown` - Database setup/cleanup
- Path aliases match main `tsconfig.json`

## Test Coverage Gaps

**Untested Areas:**

- Some E2E tests reference examples but actual test files are limited
- Frontend tests not analyzed (backend focus)
- Performance/load testing not present
- Security audits automated via `npm audit` but not comprehensive penetration testing

**Priority Additions:**

- More E2E coverage for all CRUD operations
- Integration tests for external services (AI, email, storage)
- Contract tests for API compatibility

---

_Testing analysis: 2026-02-13_
