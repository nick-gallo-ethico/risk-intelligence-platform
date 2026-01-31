# Testing Patterns

**Analysis Date:** 2026-01-30

## Test Framework

**Runner:**
- Backend: Jest 29.7.0
- Frontend: Vitest 1.2.1
- Config files:
  - Backend unit: `apps/backend/package.json` (jest config inline)
  - Backend E2E: `apps/backend/test/jest-e2e.json`
  - Frontend: Vitest configured in `apps/frontend/package.json`

**Assertion Library:**
- Backend: Jest expect (built-in)
- Frontend: Testing Library with `@testing-library/react` 14.1.2

**Run Commands:**

```bash
# Backend unit tests
npm run test:backend              # Run all backend unit tests
npm run test:backend -- --watch   # Watch mode
npm run test:backend -- --cov     # Coverage report

# Backend E2E tests
npm run test:e2e                  # Run all E2E tests
npm run test:tenant-isolation     # Run tenant isolation tests only
npm run test:security             # Run security tests only

# Frontend tests
npm run test:frontend             # Run all frontend tests
npm run test:frontend -- --watch  # Watch mode
npm run test:frontend -- --coverage  # Coverage report

# All tests
npm run test                      # Run all unit tests (backend + frontend)
npm run verify                    # lint + typecheck + test (full verification)
```

## Test File Organization

**Location:**
- Backend unit: Co-located with source in same directory: `src/modules/cases/cases.service.spec.ts`
- Backend E2E: Separate directory: `test/e2e/{entity}.e2e-spec.ts`
- Frontend unit: Co-located in `__tests__` subdirectory: `src/components/cases/__tests__/case-header.test.tsx`
- Frontend E2E: Separate: `e2e/{feature}.spec.ts` (using Playwright)

**Naming:**
- Unit tests: `{entity}.spec.ts` (backend), `{component}.test.tsx` (frontend)
- E2E tests: `{entity}.e2e-spec.ts`
- Test suites: `describe('EntityService')`, `describe('CaseHeader')`

**Structure:**
```
apps/backend/
├── src/
│   └── modules/
│       └── cases/
│           ├── cases.service.ts
│           ├── cases.service.spec.ts          # Unit test co-located
│           ├── cases.controller.ts
│           └── dto/
└── test/
    ├── helpers/
    │   ├── global-setup.ts
    │   └── global-teardown.ts
    └── e2e/
        └── cases/
            ├── cases.e2e-spec.ts              # E2E test separate

apps/frontend/
├── src/
│   └── components/
│       └── cases/
│           ├── case-header.tsx
│           └── __tests__/
│               └── case-header.test.tsx       # Unit test in __tests__
└── e2e/
    ├── playwright.config.ts
    └── features/
        └── cases.spec.ts                      # E2E test separate
```

## Test Structure

**Unit Test Suite Organization:**

```typescript
describe('EntityService', () => {
  // -------------------------------------------------------
  // 1. TEST DATA FIXTURES (at top of describe block)
  // -------------------------------------------------------
  const mockOrgId = 'org-test-123';
  const mockUserId = 'user-test-123';

  const mockEntity = {
    id: 'entity-123',
    organizationId: mockOrgId,
    // ... other fields
  };

  // -------------------------------------------------------
  // 2. MOCK SETUP (before describe or before each)
  // -------------------------------------------------------
  const mockPrismaService = {
    entity: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockActivityService = {
    log: jest.fn(),
  };

  // -------------------------------------------------------
  // 3. MODULE SETUP (beforeEach)
  // -------------------------------------------------------
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntityService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ActivityService, useValue: mockActivityService },
      ],
    }).compile();

    service = module.get<EntityService>(EntityService);
    jest.clearAllMocks();
  });

  // -------------------------------------------------------
  // 4. TEST GROUPS BY METHOD (describe blocks)
  // -------------------------------------------------------
  describe('create', () => {
    it('should create entity with correct organization', async () => {
      // Arrange
      mockPrismaService.entity.create.mockResolvedValue(mockEntity);

      // Act
      const result = await service.create(dto, mockUserId, mockOrgId);

      // Assert
      expect(result).toEqual(mockEntity);
      expect(mockPrismaService.entity.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: mockOrgId,
          createdById: mockUserId,
        }),
      });
    });

    it('should log activity on create', async () => {
      // Arrange
      mockPrismaService.entity.create.mockResolvedValue(mockEntity);

      // Act
      await service.create(dto, mockUserId, mockOrgId);

      // Assert
      expect(mockActivityService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'ENTITY',
          action: 'created',
          actorUserId: mockUserId,
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return entity when found in organization', async () => {
      mockPrismaService.entity.findFirst.mockResolvedValue(mockEntity);

      const result = await service.findOne('id', mockOrgId);

      expect(result).toEqual(mockEntity);
    });

    it('should throw NotFoundException when entity in different org', async () => {
      mockPrismaService.entity.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('id', 'other-org'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
```

**Patterns:**
- Use AAA pattern (Arrange, Act, Assert) with comments
- Group related tests with `describe()` blocks
- One assertion focus per test (prefer one `expect()` though multiple for complex operations ok)
- Use `mockResolvedValue()` for async functions
- Use `jest.clearAllMocks()` in beforeEach to reset state
- Test names are descriptive sentences: `should return entity when found in organization`

## Mocking

**Framework:** Jest built-in mocking

**Backend Patterns:**
```typescript
// Mock Prisma service
const mockPrismaService = {
  entity: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

// Use in test setup
const module: TestingModule = await Test.createTestingModule({
  providers: [
    EntityService,
    { provide: PrismaService, useValue: mockPrismaService },
  ],
}).compile();

// In test
it('should call prisma.entity.create', async () => {
  mockPrismaService.entity.create.mockResolvedValue(mockEntity);

  await service.create(dto, userId, orgId);

  expect(mockPrismaService.entity.create).toHaveBeenCalledWith({
    data: expect.objectContaining({ organizationId: orgId }),
  });
});
```

**Frontend Patterns:**
```typescript
// Mock Next.js router
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

// Mock API calls (use MSW for more complex scenarios)
vi.mock('@/lib/api', () => ({
  casesApi: {
    list: vi.fn().mockResolvedValue({ items: [] }),
    get: vi.fn().mockResolvedValue(mockCase),
  },
}));

// In test
it('navigates when button clicked', async () => {
  render(<CaseHeader caseData={mockCase} />);

  const btn = screen.getByRole('button', { name: /edit/i });
  await userEvent.click(btn);

  expect(mockPush).toHaveBeenCalledWith('/cases/123/edit');
});
```

**What to Mock:**
- External services (Prisma, HTTP clients, APIs)
- Next.js router, navigation
- Third-party libraries
- Async dependencies

**What NOT to Mock:**
- Pure business logic functions
- Utility functions in the same module
- Validation logic
- Existing well-tested libraries
- UI primitives (buttons, inputs)

## Fixtures and Factories

**Test Data:**

Backend fixtures in test files:
```typescript
const mockOrgId = 'org-test-123';
const mockUserId = 'user-test-123';
const mockCaseId = 'case-test-123';

const mockCase = {
  id: mockCaseId,
  referenceNumber: 'ETH-2026-00001',
  organizationId: mockOrgId,
  status: CaseStatus.NEW,
  createdById: mockUserId,
  createdAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-15'),
  // ... other fields
};

const mockCreateCaseDto: CreateCaseDto = {
  sourceChannel: 'HOTLINE',
  caseType: 'REPORT',
  reporterType: 'EMPLOYEE',
  reporterName: 'John Doe',
  reporterEmail: 'john@example.com',
  details: 'Case details',
};
```

Frontend fixtures:
```typescript
const mockCase: Case = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  referenceNumber: 'ETH-2026-00001',
  organizationId: 'org-123',
  status: 'NEW',
  severity: 'HIGH',
  summary: 'This is a test case summary',
  details: 'Detailed case information',
  createdAt: '2026-01-15T10:00:00Z',
  updatedAt: '2026-01-15T10:30:00Z',
  createdBy: {
    id: 'user-123',
    firstName: 'Jane',
    lastName: 'Admin',
    email: 'jane@example.com',
  },
};
```

**Location:**
- Test fixtures: Defined at top of test file (not in separate file unless shared by 5+ tests)
- Shared factories: Create `test/fixtures/` directory with factory functions
- Use factory pattern for generating variations:

```typescript
function createMockCase(overrides?: Partial<Case>): Case {
  return {
    id: 'case-123',
    referenceNumber: 'ETH-2026-00001',
    organizationId: 'org-123',
    status: 'NEW',
    severity: 'HIGH',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides, // Allow overrides
  };
}

// Use in test
const highSeverityCase = createMockCase({ severity: 'CRITICAL' });
const closedCase = createMockCase({ status: 'CLOSED' });
```

## Coverage

**Requirements:**
- Backend: 80% line coverage minimum, 75% branch coverage minimum (configured via Jest)
- Frontend: 75% line coverage minimum
- Target 85%+ for critical modules (auth, multi-tenancy, case management)

**View Coverage:**

```bash
# Backend
npm run test:backend -- --cov
# View at: apps/backend/coverage/lcov-report/index.html

# Frontend
npm run test:frontend -- --coverage
# View at: apps/frontend/coverage/index.html
```

**Key Gaps to Cover:**
- Tenant isolation tests (cross-tenant access must be blocked)
- Error cases (exceptions, validation failures)
- State machine transitions (only valid transitions allowed)
- Activity logging (all mutations logged with correct data)

## Test Types

**Unit Tests (60% of tests):**
- Location: `src/modules/{entity}/{entity}.service.spec.ts`
- Scope: Test single service/function in isolation
- Mocking: All dependencies mocked
- Duration: <1ms per test
- Example:
  ```typescript
  describe('CasesService.create', () => {
    it('should create case with reference number', async () => {
      mockPrismaService.case.create.mockResolvedValue(mockCase);
      const result = await service.create(dto, userId, orgId);
      expect(result.referenceNumber).toMatch(/^ETH-\d{4}-\d{5}$/);
    });
  });
  ```

**Integration Tests (30% of tests):**
- Location: `test/e2e/` with realistic setup
- Scope: Test module interactions (service + Prisma + activity logging)
- Mocking: Real database in test environment, external APIs mocked
- Duration: 10-100ms per test
- Example:
  ```typescript
  describe('CasesService with database', () => {
    beforeEach(async () => {
      await prisma.case.deleteMany(); // Clean DB
    });

    it('should persist case to database and log activity', async () => {
      const result = await service.create(dto, userId, orgId);

      const persisted = await prisma.case.findUnique({ where: { id: result.id } });
      expect(persisted).toBeDefined();

      const activity = await prisma.activity.findFirst({
        where: { entityId: result.id }
      });
      expect(activity.action).toBe('created');
    });
  });
  ```

**E2E Tests (10% of tests):**
- Backend: `test/e2e/{entity}.e2e-spec.ts` using Supertest
- Frontend: `e2e/{feature}.spec.ts` using Playwright
- Scope: Full request/response cycle, full user journey
- Real database + real API
- Duration: 100ms-2s per test
- Must include:
  - Authentication tests (401 without token)
  - Authorization tests (403 for wrong role)
  - Tenant isolation tests (404 for cross-tenant access)
  - Validation tests (400 for bad input)

**Backend E2E Pattern:**
```typescript
describe('CasesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ ...}));
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('should create case and return 201', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/cases')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        sourceChannel: 'HOTLINE',
        caseType: 'REPORT',
        reporterName: 'John Doe',
        // ... required fields
      })
      .expect(201);

    expect(response.body.referenceNumber).toBeDefined();
    expect(response.body.status).toBe('NEW');
  });

  describe('Tenant Isolation', () => {
    it('Org B cannot access Org A case', async () => {
      // Create case in Org A
      const caseA = await prisma.case.create({
        data: { organizationId: orgA.id, ... }
      });

      // Try to access from Org B
      await request(app.getHttpServer())
        .get(`/api/v1/cases/${caseA.id}`)
        .set('Authorization', `Bearer ${orgBToken}`)
        .expect(404); // IMPORTANT: 404 not 403
    });
  });
});
```

**Frontend E2E Pattern (Playwright):**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Case Management', () => {
  test('should create case with form submission', async ({ page }) => {
    await page.goto('/cases/new');

    await page.fill('input[name="reporterName"]', 'John Doe');
    await page.selectOption('select[name="sourceChannel"]', 'HOTLINE');
    await page.click('button:has-text("Create Case")');

    await page.waitForURL('/cases/*');
    await expect(page.locator('h1')).toContainText('ETH-2026-');
  });
});
```

## Common Patterns

**Async Testing (Backend):**
```typescript
// Use jest.fn().mockResolvedValue() for successful async
it('should return case', async () => {
  mockPrismaService.case.findFirst.mockResolvedValue(mockCase);

  const result = await service.findOne(id, orgId);

  expect(result).toEqual(mockCase);
});

// Use jest.fn().mockRejectedValue() for errors
it('should throw on database error', async () => {
  mockPrismaService.case.findFirst.mockRejectedValue(
    new Error('Database connection failed')
  );

  await expect(service.findOne(id, orgId)).rejects.toThrow();
});
```

**Async Testing (Frontend):**
```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should load and display case', async () => {
  render(<CaseDetail caseId="123" />);

  // Wait for async load
  await waitFor(() => {
    expect(screen.getByText('ETH-2026-00001')).toBeInTheDocument();
  });
});

it('should handle user interaction', async () => {
  const user = userEvent.setup();
  render(<Button onClick={onClick}>Click me</Button>);

  await user.click(screen.getByRole('button'));

  expect(onClick).toHaveBeenCalled();
});
```

**Error Testing:**
```typescript
// Backend
it('should throw NotFoundException for missing entity', async () => {
  mockPrismaService.case.findFirst.mockResolvedValue(null);

  await expect(
    service.findOne('non-existent', orgId)
  ).rejects.toThrow(NotFoundException);
});

// Frontend
it('should display error message on API failure', async () => {
  vi.mocked(casesApi.get).mockRejectedValue(
    new Error('Network error')
  );

  render(<CaseDetail caseId="123" />);

  await waitFor(() => {
    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });
});
```

**Validation Testing:**
```typescript
// Test DTO validation
it('should reject create without required fields', async () => {
  const invalidDto = {
    // missing required 'name' field
  };

  // Validation happens in controller via ValidationPipe
  const response = await request(app.getHttpServer())
    .post('/api/v1/entities')
    .send(invalidDto)
    .expect(400);

  expect(response.body.message).toContain('name');
});
```

**Multi-Tenant Testing (CRITICAL):**
```typescript
describe('Tenant Isolation', () => {
  const orgA = { id: 'org-a-123' };
  const orgB = { id: 'org-b-123' };

  let tokenA: string;
  let tokenB: string;
  let caseInOrgA: Case;

  beforeAll(async () => {
    // Setup two orgs and users
    tokenA = createToken(orgA.id);
    tokenB = createToken(orgB.id);

    // Create entity in Org A
    caseInOrgA = await prisma.case.create({
      data: { organizationId: orgA.id, ... }
    });
  });

  it('Org A can list their cases', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/cases')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(response.body.items).toContainEqual(
      expect.objectContaining({ id: caseInOrgA.id })
    );
  });

  it('Org B cannot see Org A case in list', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/cases')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(response.body.items).not.toContainEqual(
      expect.objectContaining({ id: caseInOrgA.id })
    );
  });

  it('Org B cannot access Org A case by ID', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/cases/${caseInOrgA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(404); // 404 prevents enumeration attack
  });

  it('Org B cannot modify Org A case', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/cases/${caseInOrgA.id}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ status: 'CLOSED' })
      .expect(404);

    // Verify case was NOT modified
    const updated = await prisma.case.findUnique({
      where: { id: caseInOrgA.id }
    });
    expect(updated.status).toBe('NEW'); // Original status unchanged
  });
});
```

---

*Testing analysis: 2026-01-30*
