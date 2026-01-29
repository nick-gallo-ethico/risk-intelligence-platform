# Testing Strategy

**Version:** 2.0
**Last Updated:** January 2026
**Status:** Ready for Implementation

---

## Table of Contents

1. [Testing Philosophy](#1-testing-philosophy)
2. [Test Pyramid](#2-test-pyramid)
3. [Unit Testing](#3-unit-testing)
4. [Integration Testing](#4-integration-testing)
5. [End-to-End Testing](#5-end-to-end-testing)
6. [Performance Testing](#6-performance-testing)
7. [Security Testing](#7-security-testing)
8. [Accessibility Testing](#8-accessibility-testing)
9. [Test Data Management](#9-test-data-management)
10. [CI/CD Integration](#10-cicd-integration)
11. [Exception Lifecycle Management Tests](#11-exception-lifecycle-management-tests) *(New)*
12. [Regulatory Framework Management Tests](#12-regulatory-framework-management-tests) *(New)*
13. [Risk & Incident Linkage Tests](#13-risk--incident-linkage-tests) *(New)*
14. [Employee Policy Hub Tests](#14-employee-policy-hub-tests) *(New)*
15. [External Integration Tests](#15-external-integration-tests) *(New)*
16. [External Partner Portal Tests](#16-external-partner-portal-tests) *(New)*
17. [Conditional Workflow Tests](#17-conditional-workflow-tests) *(New)*
18. [Real-time Audit Dashboard Tests](#18-real-time-audit-dashboard-tests) *(New)*
19. [AI Feature Tests](#19-ai-feature-tests) *(New)*
20. [Quiz & Engagement Testing](#20-quiz--engagement-testing) *(New)*

---

## 1. Testing Philosophy

### 1.1 Core Principles

| Principle | Description |
|-----------|-------------|
| **Test Early, Test Often** | Write tests alongside code, not after |
| **Fast Feedback** | Unit tests complete in <30s, full suite <10min |
| **Deterministic** | Tests produce same result every time |
| **Independent** | Tests don't depend on each other's state |
| **Readable** | Tests serve as documentation |

### 1.2 Coverage Targets

| Metric | Target | Minimum |
|--------|--------|---------|
| Line Coverage | 85% | 80% |
| Branch Coverage | 80% | 75% |
| Function Coverage | 90% | 85% |
| Statement Coverage | 85% | 80% |

### 1.3 Test Types by Frequency

```
┌─────────────────────────────────────────────────────────────────┐
│                        Test Frequency                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Every Commit     │  Unit Tests, Lint, Type Check               │
│                   │                                              │
│  Every PR         │  + Integration Tests, Coverage Report       │
│                   │                                              │
│  Daily (Nightly)  │  + E2E Tests, Performance Regression        │
│                   │                                              │
│  Weekly           │  + Load Tests, Security Scans               │
│                   │                                              │
│  Pre-Release      │  + Full E2E, Accessibility, Penetration     │
│                   │                                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Test Pyramid

```
                    /\
                   /  \     E2E Tests (Cypress/Playwright)
                  /    \    ~10% of tests
                 /------\   User flows, critical paths
                /        \
               /          \  Integration Tests (Supertest)
              /            \ ~30% of tests
             /--------------\ API endpoints, DB operations
            /                \
           /                  \  Unit Tests (Jest)
          /                    \ ~60% of tests
         /----------------------\ Business logic, utilities
```

### 2.1 Test Distribution

| Layer | Percentage | Count (Target) | Execution Time |
|-------|------------|----------------|----------------|
| Unit | 60% | ~300 tests | <30 seconds |
| Integration | 30% | ~150 tests | <3 minutes |
| E2E | 10% | ~50 tests | <10 minutes |

---

## 3. Unit Testing

### 3.1 Backend Unit Tests (Jest)

**Configuration:**
```typescript
// apps/backend/jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/*.dto.ts',
    '!**/*.entity.ts',
  ],
  coverageDirectory: '../coverage',
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 85,
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
};
```

**Example Service Test:**
```typescript
// apps/backend/src/modules/policies/policies.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { PoliciesService } from './policies.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PolicyStatus } from '@prisma/client';

describe('PoliciesService', () => {
  let service: PoliciesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    policy: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PoliciesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PoliciesService>(PoliciesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a policy with draft status', async () => {
      const createDto = {
        title: 'Test Policy',
        policyType: 'Ethics',
        content: { type: 'doc', content: [] },
      };
      const userId = 'user-123';
      const tenantId = 'tenant-123';

      const expectedPolicy = {
        id: 'policy-123',
        ...createDto,
        status: PolicyStatus.DRAFT,
        ownerId: userId,
        tenantId,
        versionNumber: '1.0',
      };

      mockPrismaService.policy.create.mockResolvedValue(expectedPolicy);

      const result = await service.create(createDto, userId, tenantId);

      expect(result).toEqual(expectedPolicy);
      expect(mockPrismaService.policy.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: createDto.title,
          status: PolicyStatus.DRAFT,
          ownerId: userId,
          tenantId,
        }),
      });
    });

    it('should throw error if title exceeds 200 characters', async () => {
      const createDto = {
        title: 'A'.repeat(201),
        policyType: 'Ethics',
      };

      await expect(service.create(createDto, 'user-123', 'tenant-123'))
        .rejects.toThrow('Title must not exceed 200 characters');
    });
  });

  describe('findAll', () => {
    it('should return paginated policies for tenant', async () => {
      const tenantId = 'tenant-123';
      const filters = { page: 1, limit: 25 };
      const mockPolicies = [
        { id: 'policy-1', title: 'Policy 1' },
        { id: 'policy-2', title: 'Policy 2' },
      ];

      mockPrismaService.policy.findMany.mockResolvedValue(mockPolicies);

      const result = await service.findAll(tenantId, filters);

      expect(result.data).toEqual(mockPolicies);
      expect(mockPrismaService.policy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId },
          skip: 0,
          take: 25,
        })
      );
    });

    it('should filter by status when provided', async () => {
      const tenantId = 'tenant-123';
      const filters = { status: PolicyStatus.PUBLISHED, page: 1, limit: 25 };

      mockPrismaService.policy.findMany.mockResolvedValue([]);

      await service.findAll(tenantId, filters);

      expect(mockPrismaService.policy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId, status: PolicyStatus.PUBLISHED },
        })
      );
    });
  });
});
```

### 3.2 Frontend Unit Tests (Vitest)

**Configuration:**
```typescript
// apps/frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
      ],
      thresholds: {
        branches: 75,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
  },
});
```

**Example Component Test:**
```typescript
// apps/frontend/src/components/StatusBadge.test.tsx

import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';

describe('StatusBadge', () => {
  it('renders draft status with gray color', () => {
    render(<StatusBadge status="DRAFT" />);

    const badge = screen.getByText('Draft');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-700');
  });

  it('renders published status with green color', () => {
    render(<StatusBadge status="PUBLISHED" />);

    const badge = screen.getByText('Published');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-green-100', 'text-green-700');
  });

  it('renders in-review status with amber color', () => {
    render(<StatusBadge status="IN_REVIEW" />);

    const badge = screen.getByText('In Review');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-amber-100', 'text-amber-700');
  });

  it('renders archived status with muted styling', () => {
    render(<StatusBadge status="ARCHIVED" />);

    const badge = screen.getByText('Archived');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('bg-gray-50', 'text-gray-500');
  });
});
```

**Example Hook Test:**
```typescript
// apps/frontend/src/hooks/useAutoSave.test.ts

import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from './useAutoSave';

describe('useAutoSave', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not save immediately on content change', () => {
    const saveFn = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave(saveFn, 30000));

    act(() => {
      result.current.triggerSave({ title: 'Test' });
    });

    expect(saveFn).not.toHaveBeenCalled();
    expect(result.current.isSaving).toBe(false);
  });

  it('should save after debounce period', async () => {
    const saveFn = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave(saveFn, 30000));

    act(() => {
      result.current.triggerSave({ title: 'Test' });
    });

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    expect(saveFn).toHaveBeenCalledWith({ title: 'Test' });
  });

  it('should reset timer on subsequent changes', () => {
    const saveFn = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave(saveFn, 30000));

    act(() => {
      result.current.triggerSave({ title: 'First' });
    });

    act(() => {
      jest.advanceTimersByTime(15000);
    });

    act(() => {
      result.current.triggerSave({ title: 'Second' });
    });

    act(() => {
      jest.advanceTimersByTime(15000);
    });

    expect(saveFn).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(15000);
    });

    expect(saveFn).toHaveBeenCalledWith({ title: 'Second' });
    expect(saveFn).toHaveBeenCalledTimes(1);
  });

  it('should update lastSaved timestamp on successful save', async () => {
    const saveFn = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useAutoSave(saveFn, 30000));

    expect(result.current.lastSaved).toBeNull();

    act(() => {
      result.current.triggerSave({ title: 'Test' });
    });

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });

    expect(result.current.lastSaved).toBeInstanceOf(Date);
  });

  it('should set error on failed save', async () => {
    const error = new Error('Network error');
    const saveFn = jest.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useAutoSave(saveFn, 30000));

    act(() => {
      result.current.triggerSave({ title: 'Test' });
    });

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });

    expect(result.current.error).toBe(error);
  });
});
```

---

## 4. Integration Testing

### 4.1 API Integration Tests (Supertest)

**Configuration:**
```typescript
// apps/backend/test/jest-e2e.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};
```

**Example Integration Test:**
```typescript
// apps/backend/test/policies.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('PoliciesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let tenantId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Setup test data
    const tenant = await prisma.tenant.create({
      data: { name: 'Test Tenant', slug: 'test-tenant' },
    });
    tenantId = tenant.id;

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        tenantId: tenant.id,
        role: 'POLICY_AUTHOR',
        passwordHash: await bcrypt.hash('password123', 12),
      },
    });

    // Get auth token
    const loginResponse = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await prisma.policy.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  describe('POST /api/v1/policies', () => {
    it('should create a new policy', async () => {
      const createDto = {
        title: 'Test Policy',
        policyType: 'Ethics',
        content: { type: 'doc', content: [] },
      };

      const response = await request(app.getHttpServer())
        .post('/api/v1/policies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        title: 'Test Policy',
        policyType: 'Ethics',
        status: 'DRAFT',
        versionNumber: '1.0',
      });
      expect(response.body.id).toBeDefined();
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/policies')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ title: '' }) // Missing required fields
        .expect(400);

      expect(response.body.message).toContain('title should not be empty');
    });

    it('should return 401 without auth token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/policies')
        .send({ title: 'Test' })
        .expect(401);
    });
  });

  describe('GET /api/v1/policies', () => {
    beforeAll(async () => {
      // Create test policies
      await prisma.policy.createMany({
        data: [
          { title: 'Policy A', policyType: 'Ethics', tenantId, ownerId: 'user-123', status: 'DRAFT' },
          { title: 'Policy B', policyType: 'HR', tenantId, ownerId: 'user-123', status: 'PUBLISHED' },
          { title: 'Policy C', policyType: 'Ethics', tenantId, ownerId: 'user-123', status: 'PUBLISHED' },
        ],
      });
    });

    it('should return paginated list of policies', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/policies')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 25,
      });
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/policies?status=PUBLISHED')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.every(p => p.status === 'PUBLISHED')).toBe(true);
    });

    it('should search by title', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/policies?search=Policy A')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Policy A');
    });
  });
});
```

### 4.2 Tenant Isolation Tests

```typescript
// apps/backend/test/tenant-isolation.e2e-spec.ts

describe('Tenant Isolation (e2e)', () => {
  let app: INestApplication;
  let tenantAToken: string;
  let tenantBToken: string;
  let tenantAPolicyId: string;

  beforeAll(async () => {
    // Setup two tenants with users and policies
    // ...
  });

  it('tenant A cannot see tenant B policies', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/policies')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .expect(200);

    const tenantBPolicies = response.body.data.filter(
      p => p.tenantId !== tenantAId
    );
    expect(tenantBPolicies).toHaveLength(0);
  });

  it('tenant A cannot access tenant B policy by ID', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/policies/${tenantBPolicyId}`)
      .set('Authorization', `Bearer ${tenantAToken}`)
      .expect(404);
  });

  it('tenant A cannot update tenant B policy', async () => {
    await request(app.getHttpServer())
      .put(`/api/v1/policies/${tenantBPolicyId}`)
      .set('Authorization', `Bearer ${tenantAToken}`)
      .send({ title: 'Hacked Title' })
      .expect(404);

    // Verify policy unchanged
    const policy = await prisma.policy.findUnique({
      where: { id: tenantBPolicyId },
    });
    expect(policy.title).not.toBe('Hacked Title');
  });

  it('RLS prevents direct SQL cross-tenant access', async () => {
    // This test verifies RLS at the database level
    // Set tenant context for tenant A
    await prisma.$executeRaw`SELECT set_tenant_context(${tenantAId})`;

    // Try to select tenant B's policy - should return empty
    const results = await prisma.policy.findMany({
      where: { id: tenantBPolicyId },
    });

    expect(results).toHaveLength(0);
  });
});
```

---

## 5. End-to-End Testing

### 5.1 Cypress Configuration

```typescript
// apps/frontend/cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    supportFile: 'cypress/support/e2e.ts',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: true,
    screenshotOnRunFailure: true,
    retries: {
      runMode: 2,
      openMode: 0,
    },
    env: {
      apiUrl: 'http://localhost:3000',
    },
  },
});
```

### 5.2 Critical User Flows

```typescript
// apps/frontend/cypress/e2e/auth.cy.ts

describe('Authentication', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should login with email and password', () => {
    cy.get('[data-testid="email-input"]').type('admin@demo.ethico.com');
    cy.get('[data-testid="password-input"]').type('Demo123!');
    cy.get('[data-testid="login-button"]').click();

    cy.url().should('eq', Cypress.config().baseUrl + '/');
    cy.get('[data-testid="user-menu"]').should('contain', 'Demo Admin');
  });

  it('should show error for invalid credentials', () => {
    cy.get('[data-testid="email-input"]').type('wrong@example.com');
    cy.get('[data-testid="password-input"]').type('wrongpassword');
    cy.get('[data-testid="login-button"]').click();

    cy.get('[data-testid="error-message"]')
      .should('be.visible')
      .and('contain', 'Invalid email or password');
  });

  it('should redirect to login when accessing protected route', () => {
    cy.visit('/policies');
    cy.url().should('include', '/login');
  });
});
```

```typescript
// apps/frontend/cypress/e2e/policy-lifecycle.cy.ts

describe('Policy Lifecycle', () => {
  beforeEach(() => {
    cy.login('author@demo.ethico.com', 'Demo123!');
  });

  it('should create, edit, and submit a policy for approval', () => {
    // Create new policy
    cy.visit('/policies');
    cy.get('[data-testid="new-policy-button"]').click();

    cy.get('[data-testid="policy-title"]').type('Test Policy');
    cy.get('[data-testid="policy-type-select"]').click();
    cy.get('[data-testid="policy-type-option-Ethics"]').click();

    // Edit in ProseMirror editor
    cy.get('.ProseMirror').type('This is the policy content.');

    // Wait for auto-save
    cy.get('[data-testid="save-status"]').should('contain', 'Saved');

    // Submit for approval
    cy.get('[data-testid="submit-button"]').click();
    cy.get('[data-testid="workflow-select"]').click();
    cy.get('[data-testid="workflow-option-simple"]').click();
    cy.get('[data-testid="confirm-submit"]').click();

    // Verify status changed
    cy.get('[data-testid="policy-status"]').should('contain', 'In Review');
  });
});
```

```typescript
// apps/frontend/cypress/e2e/approval-workflow.cy.ts

describe('Approval Workflow', () => {
  it('should complete approval workflow end-to-end', () => {
    // Login as author and create policy
    cy.login('author@demo.ethico.com', 'Demo123!');
    cy.createPolicy('Workflow Test Policy', 'Ethics');
    cy.submitForApproval();

    // Login as reviewer and approve
    cy.logout();
    cy.login('reviewer@demo.ethico.com', 'Demo123!');
    cy.visit('/approvals');

    cy.get('[data-testid="approval-item"]')
      .contains('Workflow Test Policy')
      .click();

    cy.get('[data-testid="approve-button"]').click();
    cy.get('[data-testid="approval-comment"]').type('Looks good!');
    cy.get('[data-testid="confirm-approve"]').click();

    // Verify policy is published
    cy.logout();
    cy.login('author@demo.ethico.com', 'Demo123!');
    cy.visit('/policies');

    cy.get('[data-testid="policy-row"]')
      .contains('Workflow Test Policy')
      .parent()
      .find('[data-testid="policy-status"]')
      .should('contain', 'Published');
  });
});
```

### 5.3 Custom Cypress Commands

```typescript
// apps/frontend/cypress/support/commands.ts

Cypress.Commands.add('login', (email: string, password: string) => {
  cy.session([email, password], () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type(email);
    cy.get('[data-testid="password-input"]').type(password);
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('not.include', '/login');
  });
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-testid="user-menu"]').click();
  cy.get('[data-testid="logout-button"]').click();
});

Cypress.Commands.add('createPolicy', (title: string, type: string) => {
  cy.visit('/policies/new');
  cy.get('[data-testid="policy-title"]').type(title);
  cy.get('[data-testid="policy-type-select"]').click();
  cy.get(`[data-testid="policy-type-option-${type}"]`).click();
  cy.get('.ProseMirror').type('Test content');
  cy.get('[data-testid="save-status"]').should('contain', 'Saved');
});

Cypress.Commands.add('submitForApproval', () => {
  cy.get('[data-testid="submit-button"]').click();
  cy.get('[data-testid="workflow-select"]').click();
  cy.get('[data-testid="workflow-option-simple"]').click();
  cy.get('[data-testid="confirm-submit"]').click();
});
```

---

## 6. Performance Testing

### 6.1 k6 Load Testing

```javascript
// tests/performance/load-test.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const policyListDuration = new Trend('policy_list_duration');

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 users
    { duration: '3m', target: 50 },   // Stay at 50 users
    { duration: '1m', target: 100 },  // Ramp up to 100 users
    { duration: '3m', target: 100 },  // Stay at 100 users
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],  // 95% of requests under 300ms
    errors: ['rate<0.01'],              // Error rate under 1%
    policy_list_duration: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export function setup() {
  // Login and get token
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    email: 'admin@demo.ethico.com',
    password: 'Demo123!',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  return { token: loginRes.json('accessToken') };
}

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  };

  // Test policy list endpoint
  const listStart = Date.now();
  const listRes = http.get(`${BASE_URL}/api/v1/policies?page=1&limit=25`, { headers });
  policyListDuration.add(Date.now() - listStart);

  check(listRes, {
    'policy list status is 200': (r) => r.status === 200,
    'policy list has data': (r) => r.json('data') !== undefined,
  }) || errorRate.add(1);

  // Test policy detail endpoint
  const policyId = listRes.json('data.0.id');
  if (policyId) {
    const detailRes = http.get(`${BASE_URL}/api/v1/policies/${policyId}`, { headers });
    check(detailRes, {
      'policy detail status is 200': (r) => r.status === 200,
    }) || errorRate.add(1);
  }

  sleep(1);
}
```

### 6.2 Performance Benchmarks

| Endpoint | Target p95 | Target p99 | Max RPS |
|----------|------------|------------|---------|
| GET /api/v1/policies | 200ms | 400ms | 500 |
| GET /api/v1/policies/:id | 100ms | 200ms | 1000 |
| POST /api/v1/policies | 300ms | 500ms | 200 |
| PUT /api/v1/policies/:id | 200ms | 400ms | 200 |
| POST /api/v1/auth/login | 500ms | 1000ms | 100 |
| GET /api/v1/attestations/dashboard | 500ms | 1000ms | 100 |

### 6.3 Frontend Performance

```javascript
// tests/performance/lighthouse.js

const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

async function runLighthouse() {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'json',
    port: chrome.port,
    onlyCategories: ['performance'],
  };

  const pages = [
    { url: 'http://localhost:5173', name: 'Dashboard' },
    { url: 'http://localhost:5173/policies', name: 'Policy List' },
    { url: 'http://localhost:5173/policies/new', name: 'Policy Editor' },
  ];

  const results = [];

  for (const page of pages) {
    const runnerResult = await lighthouse(page.url, options);
    const score = runnerResult.lhr.categories.performance.score * 100;

    results.push({
      page: page.name,
      score,
      fcp: runnerResult.lhr.audits['first-contentful-paint'].numericValue,
      lcp: runnerResult.lhr.audits['largest-contentful-paint'].numericValue,
      tti: runnerResult.lhr.audits['interactive'].numericValue,
      cls: runnerResult.lhr.audits['cumulative-layout-shift'].numericValue,
    });

    // Assert thresholds
    if (score < 80) {
      console.error(`${page.name} performance score ${score} is below threshold 80`);
      process.exitCode = 1;
    }
  }

  console.table(results);
  await chrome.kill();
}

runLighthouse();
```

---

## 7. Security Testing

### 7.1 OWASP ZAP Integration

```yaml
# .github/workflows/security.yml

name: Security Scan

on:
  schedule:
    - cron: '0 2 * * 1'  # Weekly on Monday at 2 AM
  workflow_dispatch:

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start Application
        run: |
          docker-compose up -d
          npm ci
          npm run db:migrate:deploy
          npm run db:seed
          npm run start &
          sleep 30

      - name: OWASP ZAP Scan
        uses: zaproxy/action-full-scan@v0.7.0
        with:
          target: 'http://localhost:3000'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a'

      - name: Upload ZAP Report
        uses: actions/upload-artifact@v4
        with:
          name: zap-report
          path: report_html.html
```

### 7.2 Dependency Vulnerability Scanning

```yaml
# In CI pipeline
- name: Check for vulnerabilities
  run: |
    npm audit --production --audit-level=high
    cd apps/backend && npm audit --production --audit-level=high
    cd ../frontend && npm audit --production --audit-level=high
```

### 7.3 SQL Injection Tests

```typescript
// apps/backend/test/security/sql-injection.e2e-spec.ts

describe('SQL Injection Prevention', () => {
  const sqlInjectionPayloads = [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "1; DELETE FROM policies WHERE 1=1; --",
    "admin'--",
    "' UNION SELECT * FROM users --",
  ];

  it.each(sqlInjectionPayloads)(
    'should safely handle SQL injection attempt: %s',
    async (payload) => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/policies?search=${encodeURIComponent(payload)}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Should either return 400 (validation) or 200 (safe query)
      expect([200, 400]).toContain(response.status);

      // Verify database is intact
      const count = await prisma.policy.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  );
});
```

---

## 8. Accessibility Testing

### 8.1 Automated Accessibility (axe-core)

```typescript
// apps/frontend/cypress/e2e/accessibility.cy.ts

describe('Accessibility', () => {
  beforeEach(() => {
    cy.login('admin@demo.ethico.com', 'Demo123!');
    cy.injectAxe();
  });

  const pages = [
    { path: '/', name: 'Dashboard' },
    { path: '/policies', name: 'Policy List' },
    { path: '/policies/new', name: 'Policy Editor' },
    { path: '/users', name: 'User Management' },
    { path: '/approvals', name: 'Approvals' },
  ];

  pages.forEach(({ path, name }) => {
    it(`${name} should have no critical accessibility violations`, () => {
      cy.visit(path);
      cy.checkA11y(null, {
        includedImpacts: ['critical', 'serious'],
      });
    });
  });

  it('should support keyboard navigation', () => {
    cy.visit('/policies');

    // Tab through main navigation
    cy.get('body').tab();
    cy.focused().should('have.attr', 'data-testid', 'skip-link');

    cy.focused().tab();
    cy.focused().should('have.attr', 'data-testid', 'nav-dashboard');
  });
});
```

### 8.2 WCAG 2.1 AA Checklist

| Category | Requirement | Test Method |
|----------|-------------|-------------|
| Perceivable | Color contrast >= 4.5:1 | axe-core |
| Perceivable | Alt text for images | axe-core |
| Perceivable | Captions for video | Manual |
| Operable | Keyboard accessible | Cypress |
| Operable | Focus visible | Cypress |
| Operable | Skip links | Cypress |
| Understandable | Error identification | Cypress |
| Understandable | Labels for inputs | axe-core |
| Robust | Valid HTML | HTML validator |
| Robust | ARIA usage | axe-core |

---

## 9. Test Data Management

### 9.1 Test Fixtures

```typescript
// apps/backend/test/fixtures/index.ts

export const testTenant = {
  id: 'test-tenant-id',
  name: 'Test Tenant',
  slug: 'test-tenant',
};

export const testUsers = {
  admin: {
    id: 'admin-user-id',
    email: 'admin@test.com',
    firstName: 'Admin',
    lastName: 'User',
    role: 'SYSTEM_ADMIN',
    tenantId: testTenant.id,
  },
  author: {
    id: 'author-user-id',
    email: 'author@test.com',
    firstName: 'Author',
    lastName: 'User',
    role: 'POLICY_AUTHOR',
    tenantId: testTenant.id,
  },
  reviewer: {
    id: 'reviewer-user-id',
    email: 'reviewer@test.com',
    firstName: 'Reviewer',
    lastName: 'User',
    role: 'POLICY_REVIEWER',
    tenantId: testTenant.id,
  },
};

export const testPolicies = {
  draft: {
    id: 'draft-policy-id',
    title: 'Draft Policy',
    status: 'DRAFT',
    policyType: 'Ethics',
    tenantId: testTenant.id,
    ownerId: testUsers.author.id,
  },
  published: {
    id: 'published-policy-id',
    title: 'Published Policy',
    status: 'PUBLISHED',
    policyType: 'HR',
    tenantId: testTenant.id,
    ownerId: testUsers.author.id,
  },
};
```

### 9.2 Database Seeding for Tests

```typescript
// apps/backend/test/setup.ts

import { PrismaClient } from '@prisma/client';
import { testTenant, testUsers, testPolicies } from './fixtures';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clean database
  await prisma.attestation.deleteMany();
  await prisma.distributionCampaign.deleteMany();
  await prisma.policyWorkflow.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.workflow.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // Seed test data
  await prisma.tenant.create({ data: testTenant });
  await prisma.user.createMany({ data: Object.values(testUsers) });
  await prisma.policy.createMany({ data: Object.values(testPolicies) });
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

---

## 10. CI/CD Integration

### 10.1 Test Stages in Pipeline

```yaml
# Excerpt from .github/workflows/ci.yml

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  unit-tests:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run db:migrate:deploy
      - run: npm run test:e2e

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [unit-tests, integration-tests]
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - name: Start app
        run: npm run start &
      - name: Run Cypress
        run: npx cypress run

  performance-tests:
    runs-on: ubuntu-latest
    needs: e2e-tests
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - name: Start app
        run: npm run start &
      - name: Run k6
        run: k6 run tests/performance/load-test.js
```

### 10.2 Test Reports

| Report | Location | Format |
|--------|----------|--------|
| Unit Test Results | `apps/*/coverage/` | HTML, LCOV |
| Integration Results | `test-results/` | JUnit XML |
| E2E Videos | `cypress/videos/` | MP4 |
| E2E Screenshots | `cypress/screenshots/` | PNG |
| Performance | `k6-results/` | JSON, HTML |
| Accessibility | `a11y-reports/` | HTML |

---

## 11. Exception Lifecycle Management Tests

### 11.1 Exception Request Unit Tests

```typescript
// apps/backend/src/modules/exceptions/exceptions.service.spec.ts

describe('ExceptionsService', () => {
  let service: ExceptionsService;
  let prisma: PrismaService;

  describe('createException', () => {
    it('should create exception with pending status', async () => {
      const createDto = {
        policyId: 'policy-123',
        justification: 'Business need for Q1 campaign',
        exceptionType: 'TEMPORARY',
        expirationDate: new Date('2026-03-31'),
        businessUnit: 'Sales EMEA',
      };

      const result = await service.createException(createDto, 'user-123', 'tenant-123');

      expect(result.status).toBe('PENDING');
      expect(result.requestedBy).toBe('user-123');
      expect(mockPrismaService.policyException.create).toHaveBeenCalled();
    });

    it('should require expiration date for temporary exceptions', async () => {
      const createDto = {
        policyId: 'policy-123',
        justification: 'Reason',
        exceptionType: 'TEMPORARY',
        // Missing expirationDate
      };

      await expect(service.createException(createDto, 'user-123', 'tenant-123'))
        .rejects.toThrow('Expiration date required for temporary exceptions');
    });

    it('should validate justification minimum length', async () => {
      const createDto = {
        policyId: 'policy-123',
        justification: 'Short', // Too short
        exceptionType: 'PERMANENT',
      };

      await expect(service.createException(createDto, 'user-123', 'tenant-123'))
        .rejects.toThrow('Justification must be at least 50 characters');
    });
  });

  describe('approveException', () => {
    it('should update status to approved and set approver', async () => {
      const exceptionId = 'exception-123';
      const approverId = 'approver-123';
      const comment = 'Approved with conditions';

      mockPrismaService.policyException.findUnique.mockResolvedValue({
        id: exceptionId,
        status: 'PENDING',
        tenantId: 'tenant-123',
      });

      await service.approveException(exceptionId, approverId, comment, 'tenant-123');

      expect(mockPrismaService.policyException.update).toHaveBeenCalledWith({
        where: { id: exceptionId },
        data: expect.objectContaining({
          status: 'APPROVED',
          approvedBy: approverId,
          approvalComment: comment,
          approvedAt: expect.any(Date),
        }),
      });
    });

    it('should prevent approving own exception request', async () => {
      const exceptionId = 'exception-123';
      const requesterId = 'user-123';

      mockPrismaService.policyException.findUnique.mockResolvedValue({
        id: exceptionId,
        status: 'PENDING',
        requestedBy: requesterId,
        tenantId: 'tenant-123',
      });

      await expect(service.approveException(exceptionId, requesterId, 'OK', 'tenant-123'))
        .rejects.toThrow('Cannot approve your own exception request');
    });
  });

  describe('checkExpiringExceptions', () => {
    it('should return exceptions expiring within specified days', async () => {
      const daysAhead = 7;

      await service.checkExpiringExceptions('tenant-123', daysAhead);

      expect(mockPrismaService.policyException.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: 'APPROVED',
          expirationDate: {
            gte: expect.any(Date),
            lte: expect.any(Date),
          },
        }),
      });
    });
  });
});
```

### 11.2 Exception Integration Tests

```typescript
// apps/backend/test/exceptions.e2e-spec.ts

describe('Exceptions API (e2e)', () => {
  describe('POST /api/v1/exceptions', () => {
    it('should create exception request', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/exceptions')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          policyId: testPolicyId,
          justification: 'This exception is required for the Q1 product launch campaign in EMEA region due to specific regulatory requirements.',
          exceptionType: 'TEMPORARY',
          expirationDate: '2026-03-31',
          businessUnit: 'Sales EMEA',
        })
        .expect(201);

      expect(response.body.status).toBe('PENDING');
    });

    it('should notify approver on exception request', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/exceptions')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(validExceptionDto);

      expect(mockNotificationService.sendExceptionRequestNotification)
        .toHaveBeenCalled();
    });
  });

  describe('PUT /api/v1/exceptions/:id/approve', () => {
    it('should require EXCEPTION_APPROVE permission', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/exceptions/${exceptionId}/approve`)
        .set('Authorization', `Bearer ${employeeToken}`) // No approve permission
        .send({ comment: 'Approved' })
        .expect(403);
    });

    it('should allow compliance officer to approve', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/exceptions/${exceptionId}/approve`)
        .set('Authorization', `Bearer ${complianceOfficerToken}`)
        .send({ comment: 'Approved with conditions' })
        .expect(200);
    });
  });

  describe('GET /api/v1/exceptions/register', () => {
    it('should return exception register with filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/exceptions/register')
        .query({ status: 'APPROVED', businessUnit: 'Sales' })
        .set('Authorization', `Bearer ${complianceOfficerToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.every(e => e.status === 'APPROVED')).toBe(true);
    });
  });
});
```

### 11.3 Exception E2E Tests

```typescript
// apps/frontend/cypress/e2e/exceptions.cy.ts

describe('Exception Management', () => {
  it('should complete exception request flow', () => {
    // Employee requests exception
    cy.login('employee@demo.ethico.com', 'Demo123!');
    cy.visit('/policies/policy-123');

    cy.get('[data-testid="request-exception-button"]').click();
    cy.get('[data-testid="exception-type-temporary"]').click();
    cy.get('[data-testid="business-unit-select"]').click();
    cy.get('[data-testid="business-unit-sales-emea"]').click();
    cy.get('[data-testid="expiration-date"]').type('2026-03-31');
    cy.get('[data-testid="justification-textarea"]')
      .type('This exception is required for the Q1 product launch campaign...');
    cy.get('[data-testid="submit-exception"]').click();

    cy.get('[data-testid="success-message"]')
      .should('contain', 'Exception request submitted');

    // Compliance officer approves
    cy.logout();
    cy.login('compliance@demo.ethico.com', 'Demo123!');
    cy.visit('/exceptions');

    cy.get('[data-testid="exception-row"]')
      .contains('Code of Conduct')
      .click();

    cy.get('[data-testid="approve-radio"]').click();
    cy.get('[data-testid="approval-comment"]').type('Approved for Q1 campaign');
    cy.get('[data-testid="submit-decision"]').click();

    cy.get('[data-testid="exception-status"]')
      .should('contain', 'Approved');
  });
});
```

---

## 12. Regulatory Framework Management Tests

### 12.1 Regulatory Framework Unit Tests

```typescript
// apps/backend/src/modules/regulatory/regulatory.service.spec.ts

describe('RegulatoryService', () => {
  describe('importFramework', () => {
    it('should import predefined framework with requirements', async () => {
      const frameworkId = 'GDPR';

      const result = await service.importFramework(frameworkId, 'tenant-123');

      expect(result.name).toBe('GDPR');
      expect(result.requirements.length).toBeGreaterThan(0);
      expect(mockPrismaService.regulatoryFramework.create).toHaveBeenCalled();
    });

    it('should prevent duplicate framework imports', async () => {
      mockPrismaService.regulatoryFramework.findFirst.mockResolvedValue({
        id: 'existing',
        frameworkId: 'GDPR',
      });

      await expect(service.importFramework('GDPR', 'tenant-123'))
        .rejects.toThrow('Framework already imported');
    });
  });

  describe('createMapping', () => {
    it('should create policy-to-requirement mapping', async () => {
      const mappingDto = {
        requirementId: 'req-123',
        policyId: 'policy-123',
        sectionReference: '3.1',
        notes: 'Covers data collection minimization',
      };

      await service.createMapping(mappingDto, 'tenant-123');

      expect(mockPrismaService.regulatoryMapping.create).toHaveBeenCalledWith({
        data: expect.objectContaining(mappingDto),
      });
    });
  });

  describe('calculateCoverage', () => {
    it('should calculate coverage percentage correctly', async () => {
      mockPrismaService.regulatoryRequirement.count.mockResolvedValue(100);
      mockPrismaService.regulatoryMapping.count.mockResolvedValue(87);

      const result = await service.calculateCoverage('framework-123', 'tenant-123');

      expect(result.coverage).toBe(87);
      expect(result.totalRequirements).toBe(100);
      expect(result.mappedRequirements).toBe(87);
    });
  });

  describe('identifyGaps', () => {
    it('should return unmapped requirements', async () => {
      const result = await service.identifyGaps('framework-123', 'tenant-123');

      expect(result.gaps).toBeInstanceOf(Array);
      expect(result.gaps.every(g => g.mappedPolicies.length === 0)).toBe(true);
    });
  });
});
```

### 12.2 Regulatory Framework E2E Tests

```typescript
// apps/frontend/cypress/e2e/regulatory-framework.cy.ts

describe('Regulatory Framework Management', () => {
  beforeEach(() => {
    cy.login('compliance@demo.ethico.com', 'Demo123!');
  });

  it('should import a new regulatory framework', () => {
    cy.visit('/regulatory-frameworks');
    cy.get('[data-testid="import-framework-button"]').click();

    cy.get('[data-testid="framework-gdpr"]').click();
    cy.get('[data-testid="confirm-import"]').click();

    cy.get('[data-testid="framework-card-gdpr"]')
      .should('be.visible')
      .and('contain', 'GDPR');
  });

  it('should map policy to regulatory requirement', () => {
    cy.visit('/regulatory-frameworks/gdpr');

    cy.get('[data-testid="requirement-5.1.c"]').click();
    cy.get('[data-testid="add-mapping-button"]').click();

    cy.get('[data-testid="policy-search"]').type('Data Privacy');
    cy.get('[data-testid="policy-result-data-privacy"]').click();
    cy.get('[data-testid="section-select"]').click();
    cy.get('[data-testid="section-3.1"]').click();
    cy.get('[data-testid="save-mapping"]').click();

    cy.get('[data-testid="requirement-5.1.c"]')
      .should('contain', 'MAPPED');
  });

  it('should display coverage report', () => {
    cy.visit('/regulatory-frameworks/gdpr/report');

    cy.get('[data-testid="coverage-percentage"]')
      .should('be.visible');
    cy.get('[data-testid="gap-list"]')
      .should('be.visible');
    cy.get('[data-testid="export-pdf-button"]').click();

    cy.readFile('cypress/downloads/gdpr-compliance-report.pdf')
      .should('exist');
  });
});
```

---

## 13. Risk & Incident Linkage Tests

### 13.1 Linkage Service Unit Tests

```typescript
// apps/backend/src/modules/linkage/linkage.service.spec.ts

describe('LinkageService', () => {
  describe('createLinkage', () => {
    it('should create policy-to-risk linkage', async () => {
      const linkageDto = {
        policyId: 'policy-123',
        linkedRecordId: 'RISK-2024-0089',
        linkedRecordType: 'RISK',
        relationshipType: 'MITIGATES',
        notes: 'Policy addresses this risk',
      };

      await service.createLinkage(linkageDto, 'tenant-123');

      expect(mockPrismaService.policyLinkage.create).toHaveBeenCalled();
    });

    it('should validate MyCM record exists via API', async () => {
      mockMyCMService.validateRecord.mockResolvedValue(false);

      await expect(service.createLinkage({
        policyId: 'policy-123',
        linkedRecordId: 'INVALID-ID',
        linkedRecordType: 'RISK',
      }, 'tenant-123'))
        .rejects.toThrow('Record not found in MyCM');
    });
  });

  describe('getLinkedRecords', () => {
    it('should return all linked records for a policy', async () => {
      const result = await service.getLinkedRecords('policy-123', 'tenant-123');

      expect(result.risks).toBeInstanceOf(Array);
      expect(result.incidents).toBeInstanceOf(Array);
      expect(result.investigations).toBeInstanceOf(Array);
      expect(result.cases).toBeInstanceOf(Array);
    });
  });

  describe('getPoliciesLinkedToRecord', () => {
    it('should return policies linked to a specific record', async () => {
      const result = await service.getPoliciesLinkedToRecord(
        'RISK-2024-0089',
        'RISK',
        'tenant-123'
      );

      expect(result.policies).toBeInstanceOf(Array);
    });
  });

  describe('getCrossModuleAnalytics', () => {
    it('should calculate policy mentions in records', async () => {
      const result = await service.getCrossModuleAnalytics('tenant-123', {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-01-20'),
      });

      expect(result).toEqual(expect.objectContaining({
        policyMentions: expect.any(Array),
        incidentCorrelation: expect.any(Array),
        topPoliciesByIncidents: expect.any(Array),
      }));
    });
  });
});
```

---

## 14. Employee Policy Hub Tests

### 14.1 Policy Hub Service Tests

```typescript
// apps/backend/src/modules/policy-hub/policy-hub.service.spec.ts

describe('PolicyHubService', () => {
  describe('getMyPolicies', () => {
    it('should return policies assigned to user role', async () => {
      const userId = 'user-123';
      const userRole = 'ENGINEER';

      const result = await service.getMyPolicies(userId, 'tenant-123');

      expect(result.policies).toBeInstanceOf(Array);
      expect(mockPrismaService.policy.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          OR: [
            { targetRoles: { has: userRole } },
            { targetAllEmployees: true },
          ],
        }),
      });
    });

    it('should include attestation status for each policy', async () => {
      const result = await service.getMyPolicies('user-123', 'tenant-123');

      result.policies.forEach(policy => {
        expect(policy).toHaveProperty('attestationStatus');
        expect(['PENDING', 'COMPLETED', 'OVERDUE', 'NOT_REQUIRED'])
          .toContain(policy.attestationStatus);
      });
    });
  });

  describe('getTeamPolicies', () => {
    it('should return team compliance overview for manager', async () => {
      const managerId = 'manager-123';

      const result = await service.getTeamPolicies(managerId, 'tenant-123');

      expect(result.teamMembers).toBeInstanceOf(Array);
      expect(result.overallCompliance).toBeGreaterThanOrEqual(0);
      expect(result.overallCompliance).toBeLessThanOrEqual(100);
    });

    it('should only return direct reports', async () => {
      const managerId = 'manager-123';

      await service.getTeamPolicies(managerId, 'tenant-123');

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { managerId },
      });
    });
  });

  describe('getQuickActions', () => {
    it('should return pending actions count', async () => {
      const result = await service.getQuickActions('user-123', 'tenant-123');

      expect(result).toEqual(expect.objectContaining({
        pendingReviews: expect.any(Number),
        pendingAttestations: expect.any(Number),
        overdueTasks: expect.any(Number),
      }));
    });
  });
});
```

### 14.2 Policy Hub E2E Tests

```typescript
// apps/frontend/cypress/e2e/policy-hub.cy.ts

describe('Employee Policy Hub', () => {
  it('should display personalized dashboard', () => {
    cy.login('employee@demo.ethico.com', 'Demo123!');
    cy.visit('/policy-hub');

    cy.get('[data-testid="quick-actions"]').should('be.visible');
    cy.get('[data-testid="my-policies-section"]').should('be.visible');
    cy.get('[data-testid="my-tasks-section"]').should('be.visible');
  });

  it('should show team policies for managers', () => {
    cy.login('manager@demo.ethico.com', 'Demo123!');
    cy.visit('/policy-hub/team');

    cy.get('[data-testid="team-compliance-overview"]').should('be.visible');
    cy.get('[data-testid="team-member-list"]').should('be.visible');
    cy.get('[data-testid="team-member-row"]').should('have.length.at.least', 1);
  });

  it('should search and filter policies', () => {
    cy.login('employee@demo.ethico.com', 'Demo123!');
    cy.visit('/policy-hub/library');

    cy.get('[data-testid="policy-search"]').type('privacy');
    cy.get('[data-testid="department-filter"]').click();
    cy.get('[data-testid="department-option-it"]').click();

    cy.get('[data-testid="policy-card"]')
      .should('contain', 'Privacy');
  });

  it('should compare policy versions', () => {
    cy.login('reviewer@demo.ethico.com', 'Demo123!');
    cy.visit('/policy-hub/library');

    cy.get('[data-testid="policy-card-data-privacy"]').click();
    cy.get('[data-testid="compare-versions-button"]').click();
    cy.get('[data-testid="version-1.0"]').click();
    cy.get('[data-testid="version-2.0"]').click();
    cy.get('[data-testid="start-comparison"]').click();

    cy.get('[data-testid="comparison-view"]').should('be.visible');
    cy.get('[data-testid="diff-highlight"]').should('exist');
  });
});
```

---

## 15. External Integration Tests

### 15.1 SharePoint Integration Tests

```typescript
// apps/backend/src/modules/integrations/sharepoint.service.spec.ts

describe('SharePointService', () => {
  describe('syncPolicies', () => {
    it('should sync published policies to SharePoint search index', async () => {
      const policies = [
        { id: '1', title: 'Policy A', status: 'PUBLISHED', content: '...' },
        { id: '2', title: 'Policy B', status: 'PUBLISHED', content: '...' },
      ];

      mockPrismaService.policy.findMany.mockResolvedValue(policies);

      await service.syncPolicies('tenant-123');

      expect(mockSharePointClient.indexDocument).toHaveBeenCalledTimes(2);
    });

    it('should not sync draft policies', async () => {
      const policies = [
        { id: '1', title: 'Policy A', status: 'DRAFT' },
      ];

      mockPrismaService.policy.findMany.mockResolvedValue(policies);

      await service.syncPolicies('tenant-123');

      expect(mockSharePointClient.indexDocument).not.toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    it('should verify SharePoint API connectivity', async () => {
      mockSharePointClient.getMe.mockResolvedValue({ id: 'user-id' });

      const result = await service.testConnection('tenant-123');

      expect(result.connected).toBe(true);
    });
  });
});
```

### 15.2 LMS Integration Tests

```typescript
// apps/backend/src/modules/integrations/lms.service.spec.ts

describe('LMSService', () => {
  describe('syncCourseCompletion', () => {
    it('should import LMS completions as attestation records', async () => {
      const lmsCompletions = [
        { userId: 'user-123', courseId: 'course-abc', completedAt: new Date() },
      ];

      mockLMSClient.getCompletions.mockResolvedValue(lmsCompletions);
      mockPrismaService.lmsCourseMapping.findFirst.mockResolvedValue({
        policyId: 'policy-123',
      });

      await service.syncCourseCompletion('tenant-123');

      expect(mockPrismaService.attestation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          policyId: 'policy-123',
          source: 'LMS_IMPORT',
        }),
      });
    });
  });

  describe('exportQuizAsCourse', () => {
    it('should create LMS course from policy quiz', async () => {
      const quizId = 'quiz-123';

      await service.exportQuizAsCourse(quizId, 'tenant-123');

      expect(mockLMSClient.createCourse).toHaveBeenCalled();
    });
  });
});
```

### 15.3 Integration Marketplace Tests

```typescript
// apps/backend/test/integration-marketplace.e2e-spec.ts

describe('Integration Marketplace API', () => {
  describe('GET /api/v1/integrations/marketplace', () => {
    it('should list available integrations', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/integrations/marketplace')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        hris: expect.any(Array),
        lms: expect.any(Array),
        communication: expect.any(Array),
        grc: expect.any(Array),
      }));
    });
  });

  describe('POST /api/v1/integrations/:type/install', () => {
    it('should install integration and store credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/integrations/workday/install')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          apiUrl: 'https://wd2-impl-services1.workday.com',
          username: 'ISU_user',
          password: 'encrypted_password',
        })
        .expect(201);

      expect(response.body.status).toBe('CONNECTED');
    });

    it('should require SYSTEM_ADMIN role', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/integrations/workday/install')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(validConfig)
        .expect(403);
    });
  });
});
```

---

## 16. External Partner Portal Tests

### 16.1 Portal Authentication Tests

```typescript
// apps/backend/src/modules/external-portal/portal-auth.service.spec.ts

describe('PortalAuthService', () => {
  describe('generateMagicLink', () => {
    it('should create magic link token with expiration', async () => {
      const email = 'vendor@acme.com';
      const portalId = 'portal-123';

      const result = await service.generateMagicLink(email, portalId);

      expect(result.token).toBeDefined();
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(mockPrismaService.magicLinkToken.create).toHaveBeenCalled();
    });

    it('should set 15-minute expiration by default', async () => {
      const result = await service.generateMagicLink('test@example.com', 'portal-123');

      const expiresIn = result.expiresAt.getTime() - Date.now();
      expect(expiresIn).toBeLessThanOrEqual(15 * 60 * 1000);
      expect(expiresIn).toBeGreaterThan(14 * 60 * 1000);
    });
  });

  describe('validateMagicLink', () => {
    it('should validate unexpired token', async () => {
      const token = 'valid-token';
      mockPrismaService.magicLinkToken.findUnique.mockResolvedValue({
        token,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        used: false,
      });

      const result = await service.validateMagicLink(token);

      expect(result.valid).toBe(true);
    });

    it('should reject expired token', async () => {
      const token = 'expired-token';
      mockPrismaService.magicLinkToken.findUnique.mockResolvedValue({
        token,
        expiresAt: new Date(Date.now() - 1000),
        used: false,
      });

      const result = await service.validateMagicLink(token);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('TOKEN_EXPIRED');
    });

    it('should reject already-used token', async () => {
      const token = 'used-token';
      mockPrismaService.magicLinkToken.findUnique.mockResolvedValue({
        token,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        used: true,
      });

      const result = await service.validateMagicLink(token);

      expect(result.valid).toBe(false);
      expect(result.reason).toBe('TOKEN_ALREADY_USED');
    });
  });
});
```

### 16.2 External Portal E2E Tests

```typescript
// apps/frontend/cypress/e2e/external-portal.cy.ts

describe('External Partner Portal', () => {
  describe('Admin Portal Management', () => {
    beforeEach(() => {
      cy.login('admin@demo.ethico.com', 'Demo123!');
    });

    it('should create new external portal', () => {
      cy.visit('/admin/portals');
      cy.get('[data-testid="create-portal-button"]').click();

      cy.get('[data-testid="portal-name"]').type('Vendor Compliance Portal');
      cy.get('[data-testid="portal-slug"]').type('vendors');
      cy.get('[data-testid="policy-checkbox-vendor-coc"]').check();
      cy.get('[data-testid="policy-checkbox-data-processing"]').check();
      cy.get('[data-testid="auth-type-magic-link"]').click();
      cy.get('[data-testid="publish-portal"]').click();

      cy.get('[data-testid="portal-card-vendors"]')
        .should('contain', 'Active');
    });

    it('should invite external user to portal', () => {
      cy.visit('/admin/portals/vendors');
      cy.get('[data-testid="invite-user-button"]').click();

      cy.get('[data-testid="invite-email"]').type('vendor@acme.com');
      cy.get('[data-testid="invite-name"]').type('John Smith');
      cy.get('[data-testid="invite-company"]').type('Acme Supplies');
      cy.get('[data-testid="send-invite"]').click();

      cy.get('[data-testid="success-message"]')
        .should('contain', 'Invitation sent');
    });
  });

  describe('External User Experience', () => {
    it('should access portal via magic link', () => {
      // Simulate magic link click
      cy.visit('/portal/vendors/auth?token=test-magic-token');

      cy.url().should('include', '/portal/vendors');
      cy.get('[data-testid="portal-header"]')
        .should('contain', 'Vendor Compliance Portal');
    });

    it('should complete external attestation', () => {
      cy.visit('/portal/vendors/auth?token=test-magic-token');

      cy.get('[data-testid="pending-attestation-card"]')
        .contains('Vendor Code of Conduct')
        .click();

      // Read policy
      cy.get('[data-testid="policy-content"]').scrollTo('bottom');

      // Accept attestation
      cy.get('[data-testid="attestation-checkbox"]').check();
      cy.get('[data-testid="submit-attestation"]').click();

      cy.get('[data-testid="attestation-status"]')
        .should('contain', 'Completed');
    });
  });
});
```

---

## 17. Conditional Workflow Tests

### 17.1 Workflow Condition Engine Tests

```typescript
// apps/backend/src/modules/workflows/condition-engine.service.spec.ts

describe('ConditionEngineService', () => {
  describe('evaluateCondition', () => {
    it('should evaluate tag-based condition correctly', async () => {
      const condition = {
        field: 'regulatoryTags',
        operator: 'contains',
        value: 'GDPR',
      };
      const policy = {
        regulatoryTags: ['GDPR', 'Privacy'],
      };

      const result = await service.evaluateCondition(condition, policy);

      expect(result).toBe(true);
    });

    it('should evaluate region-based condition', async () => {
      const condition = {
        field: 'targetRegions',
        operator: 'includes',
        value: 'EU',
      };
      const policy = {
        targetRegions: ['US', 'UK'],
      };

      const result = await service.evaluateCondition(condition, policy);

      expect(result).toBe(false);
    });

    it('should handle compound OR conditions', async () => {
      const conditions = [
        { field: 'policyType', operator: 'equals', value: 'Privacy' },
        { field: 'regulatoryTags', operator: 'contains', value: 'GDPR' },
      ];
      const policy = {
        policyType: 'Ethics',
        regulatoryTags: ['GDPR'],
      };

      const result = await service.evaluateCompoundCondition(conditions, 'OR', policy);

      expect(result).toBe(true); // Second condition matches
    });

    it('should handle compound AND conditions', async () => {
      const conditions = [
        { field: 'policyType', operator: 'equals', value: 'Privacy' },
        { field: 'regulatoryTags', operator: 'contains', value: 'GDPR' },
      ];
      const policy = {
        policyType: 'Ethics',
        regulatoryTags: ['GDPR'],
      };

      const result = await service.evaluateCompoundCondition(conditions, 'AND', policy);

      expect(result).toBe(false); // First condition fails
    });
  });

  describe('determineNextStep', () => {
    it('should route to conditional step when condition met', async () => {
      const workflow = {
        steps: [
          { id: 'step-1', type: 'REVIEW' },
          {
            id: 'step-conditional',
            type: 'CONDITION',
            conditions: [{ field: 'regulatoryTags', operator: 'contains', value: 'GDPR' }],
            thenStep: 'step-dpo',
            elseStep: 'step-compliance',
          },
          { id: 'step-dpo', type: 'REVIEW', assignee: 'DPO' },
          { id: 'step-compliance', type: 'REVIEW', assignee: 'Compliance' },
        ],
      };
      const policy = { regulatoryTags: ['GDPR'] };

      const result = await service.determineNextStep(workflow, 'step-conditional', policy);

      expect(result.nextStepId).toBe('step-dpo');
    });
  });
});
```

### 17.2 Workflow Analytics Tests

```typescript
// apps/backend/src/modules/workflows/workflow-analytics.service.spec.ts

describe('WorkflowAnalyticsService', () => {
  describe('getWorkflowPerformance', () => {
    it('should calculate average duration by workflow type', async () => {
      const result = await service.getWorkflowPerformance('tenant-123', {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-01-20'),
      });

      expect(result.byWorkflow).toEqual(expect.arrayContaining([
        expect.objectContaining({
          workflowId: expect.any(String),
          avgDuration: expect.any(Number),
          completedCount: expect.any(Number),
          onTimePercentage: expect.any(Number),
        }),
      ]));
    });
  });

  describe('identifyBottlenecks', () => {
    it('should identify slowest workflow steps', async () => {
      const result = await service.identifyBottlenecks('workflow-123', 'tenant-123');

      expect(result.bottlenecks).toEqual(expect.arrayContaining([
        expect.objectContaining({
          stepId: expect.any(String),
          avgDuration: expect.any(Number),
          percentageOfTotal: expect.any(Number),
        }),
      ]));
    });
  });
});
```

---

## 18. Real-time Audit Dashboard Tests

### 18.1 Audit Stream Tests

```typescript
// apps/backend/src/modules/audit/audit-stream.service.spec.ts

describe('AuditStreamService', () => {
  describe('streamAuditEvents', () => {
    it('should emit events via WebSocket', async () => {
      const mockSocket = { emit: jest.fn() };

      await service.emitAuditEvent({
        type: 'POLICY_PUBLISHED',
        userId: 'user-123',
        resourceId: 'policy-123',
        timestamp: new Date(),
      }, mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('audit:event', expect.any(Object));
    });
  });

  describe('getRealtimeMetrics', () => {
    it('should calculate live compliance metrics', async () => {
      const result = await service.getRealtimeMetrics('tenant-123');

      expect(result).toEqual(expect.objectContaining({
        attestationRate: expect.any(Number),
        policyCoverage: expect.any(Number),
        overdueCount: expect.any(Number),
      }));
    });
  });
});
```

### 18.2 Audit Alert Tests

```typescript
// apps/backend/src/modules/audit/audit-alerts.service.spec.ts

describe('AuditAlertsService', () => {
  describe('checkAlertRules', () => {
    it('should trigger alert for failed login threshold', async () => {
      const events = [
        { type: 'LOGIN_FAILED', ip: '192.168.1.1', timestamp: new Date() },
        { type: 'LOGIN_FAILED', ip: '192.168.1.1', timestamp: new Date() },
        { type: 'LOGIN_FAILED', ip: '192.168.1.1', timestamp: new Date() },
      ];

      const alertRule = {
        eventType: 'LOGIN_FAILED',
        threshold: 3,
        windowMinutes: 5,
        groupBy: 'ip',
      };

      const result = await service.checkAlertRule(alertRule, events);

      expect(result.triggered).toBe(true);
      expect(mockNotificationService.sendSecurityAlert).toHaveBeenCalled();
    });

    it('should trigger attestation rate drop alert', async () => {
      mockPrismaService.attestation.aggregate.mockResolvedValue({
        _count: { _all: 50 }, // 50% completion
      });

      const alertRule = {
        metricType: 'ATTESTATION_RATE',
        threshold: 70, // Alert if below 70%
        scope: 'department',
        scopeId: 'finance',
      };

      const result = await service.checkMetricAlert(alertRule, 'tenant-123');

      expect(result.triggered).toBe(true);
    });
  });

  describe('createAlertRule', () => {
    it('should create and store alert rule', async () => {
      const ruleDto = {
        name: 'Failed Login Alert',
        eventType: 'LOGIN_FAILED',
        threshold: 3,
        windowMinutes: 5,
        actions: ['EMAIL_SECURITY', 'BLOCK_IP'],
      };

      await service.createAlertRule(ruleDto, 'tenant-123');

      expect(mockPrismaService.auditAlertRule.create).toHaveBeenCalled();
    });
  });
});
```

---

## 19. AI Feature Tests

### 19.1 Auto-Tagging Tests

```typescript
// apps/backend/src/modules/ai/auto-tagging.service.spec.ts

describe('AutoTaggingService', () => {
  describe('generateTagSuggestions', () => {
    it('should return tag suggestions with confidence scores', async () => {
      const policyContent = 'This policy addresses anti-bribery and corruption...';

      mockAIProvider.generateCompletion.mockResolvedValue(JSON.stringify({
        tags: [
          { name: 'Anti-Bribery', confidence: 0.95 },
          { name: 'Ethics', confidence: 0.88 },
          { name: 'Compliance', confidence: 0.85 },
        ],
      }));

      const result = await service.generateTagSuggestions(policyContent, 'tenant-123');

      expect(result.suggestions).toHaveLength(3);
      expect(result.suggestions[0].confidence).toBeGreaterThan(0.9);
    });

    it('should categorize suggestions by confidence level', async () => {
      const result = await service.generateTagSuggestions('policy content', 'tenant-123');

      expect(result.highConfidence).toBeDefined();
      expect(result.mediumConfidence).toBeDefined();
      expect(result.lowConfidence).toBeDefined();
    });
  });

  describe('applyTagSuggestions', () => {
    it('should update policy with selected tags', async () => {
      const policyId = 'policy-123';
      const selectedTags = ['Anti-Bribery', 'Ethics'];

      await service.applyTagSuggestions(policyId, selectedTags, 'tenant-123');

      expect(mockPrismaService.policy.update).toHaveBeenCalledWith({
        where: { id: policyId },
        data: { tags: selectedTags },
      });
    });
  });
});
```

### 19.2 Summarization Tests

```typescript
// apps/backend/src/modules/ai/summarization.service.spec.ts

describe('SummarizationService', () => {
  describe('generateSummary', () => {
    it('should generate executive summary', async () => {
      const policyContent = 'Long policy content...';

      mockAIProvider.generateCompletion.mockResolvedValue(JSON.stringify({
        executiveSummary: 'This policy prohibits bribery...',
        keyRequirements: ['Never offer bribes', 'Report violations'],
        applicability: 'All employees and contractors',
        violations: 'Disciplinary action up to termination',
      }));

      const result = await service.generateSummary(policyContent, {
        length: 'BRIEF',
        readingLevel: 'GENERAL',
      });

      expect(result.executiveSummary).toBeDefined();
      expect(result.keyRequirements).toBeInstanceOf(Array);
    });

    it('should respect length parameter', async () => {
      const shortResult = await service.generateSummary('content', { length: 'BRIEF' });
      const longResult = await service.generateSummary('content', { length: 'DETAILED' });

      expect(shortResult.executiveSummary.length)
        .toBeLessThan(longResult.executiveSummary.length);
    });
  });
});
```

### 19.3 Regulatory Mapping Assistance Tests

```typescript
// apps/backend/src/modules/ai/regulatory-mapping.service.spec.ts

describe('RegulatoryMappingService', () => {
  describe('suggestMappings', () => {
    it('should suggest relevant regulatory requirements', async () => {
      const policyContent = 'This policy covers data minimization and consent...';
      const framework = 'GDPR';

      const result = await service.suggestMappings(policyContent, framework, 'tenant-123');

      expect(result.suggestions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          requirementId: expect.any(String),
          confidence: expect.any(Number),
          reason: expect.any(String),
        }),
      ]));
    });
  });
});
```

---

## 20. Quiz & Engagement Testing

### 20.1 Quiz Generation Tests

```typescript
// apps/backend/src/modules/quiz/quiz-generation.service.spec.ts

describe('QuizGenerationService', () => {
  describe('generateQuiz', () => {
    it('should generate questions from policy content', async () => {
      const policyContent = 'Data must be retained for no more than 3 years...';
      const options = {
        questionCount: 5,
        difficulty: 'INTERMEDIATE',
        questionTypes: ['MULTIPLE_CHOICE', 'TRUE_FALSE'],
      };

      mockAIProvider.generateCompletion.mockResolvedValue(JSON.stringify({
        questions: [
          {
            question: 'What is the maximum data retention period?',
            type: 'MULTIPLE_CHOICE',
            options: ['1 year', '2 years', '3 years', 'Indefinite'],
            correctAnswer: '3 years',
          },
        ],
      }));

      const result = await service.generateQuiz(policyContent, options, 'tenant-123');

      expect(result.questions).toHaveLength(5);
      expect(result.questions[0]).toHaveProperty('correctAnswer');
    });

    it('should validate generated questions have correct structure', async () => {
      const result = await service.generateQuiz('content', { questionCount: 3 }, 'tenant-123');

      result.questions.forEach(q => {
        expect(q).toHaveProperty('question');
        expect(q).toHaveProperty('type');
        expect(q).toHaveProperty('correctAnswer');

        if (q.type === 'MULTIPLE_CHOICE') {
          expect(q.options).toHaveLength(4);
        }
      });
    });
  });
});
```

### 20.2 Quiz Attempt and Scoring Tests

```typescript
// apps/backend/src/modules/quiz/quiz-attempt.service.spec.ts

describe('QuizAttemptService', () => {
  describe('submitAttempt', () => {
    it('should calculate score correctly', async () => {
      const quizId = 'quiz-123';
      const answers = [
        { questionId: 'q1', answer: '3 years' },
        { questionId: 'q2', answer: 'True' },
        { questionId: 'q3', answer: 'Wrong answer' },
      ];

      mockPrismaService.quizQuestion.findMany.mockResolvedValue([
        { id: 'q1', correctAnswer: '3 years' },
        { id: 'q2', correctAnswer: 'True' },
        { id: 'q3', correctAnswer: 'Explicit consent' },
      ]);

      const result = await service.submitAttempt(quizId, answers, 'user-123', 'tenant-123');

      expect(result.score).toBe(67); // 2/3 = 66.67%
      expect(result.correctCount).toBe(2);
      expect(result.totalQuestions).toBe(3);
    });

    it('should determine pass/fail based on threshold', async () => {
      mockPrismaService.quiz.findUnique.mockResolvedValue({
        passingScore: 80,
      });

      const result = await service.submitAttempt('quiz-123', [
        { questionId: 'q1', answer: 'Correct' },
        { questionId: 'q2', answer: 'Wrong' },
      ], 'user-123', 'tenant-123');

      expect(result.passed).toBe(false); // 50% < 80%
    });

    it('should track attempt count', async () => {
      mockPrismaService.quizAttempt.count.mockResolvedValue(2);
      mockPrismaService.quiz.findUnique.mockResolvedValue({
        maxAttempts: 3,
      });

      const result = await service.submitAttempt('quiz-123', [], 'user-123', 'tenant-123');

      expect(result.attemptNumber).toBe(3);
      expect(result.attemptsRemaining).toBe(0);
    });

    it('should block attempts when max reached', async () => {
      mockPrismaService.quizAttempt.count.mockResolvedValue(3);
      mockPrismaService.quiz.findUnique.mockResolvedValue({
        maxAttempts: 3,
      });

      await expect(service.submitAttempt('quiz-123', [], 'user-123', 'tenant-123'))
        .rejects.toThrow('Maximum attempts reached');
    });
  });
});
```

### 20.3 Certificate Generation Tests

```typescript
// apps/backend/src/modules/quiz/certificate.service.spec.ts

describe('CertificateService', () => {
  describe('generateCertificate', () => {
    it('should generate certificate for passed quiz', async () => {
      const attemptId = 'attempt-123';

      mockPrismaService.quizAttempt.findUnique.mockResolvedValue({
        id: attemptId,
        passed: true,
        score: 95,
        user: { firstName: 'John', lastName: 'Doe' },
        quiz: { policy: { title: 'Data Privacy Policy' } },
      });

      const result = await service.generateCertificate(attemptId, 'tenant-123');

      expect(result.certificateId).toBeDefined();
      expect(result.pdfUrl).toBeDefined();
      expect(mockPrismaService.certificate.create).toHaveBeenCalled();
    });

    it('should not generate certificate for failed quiz', async () => {
      mockPrismaService.quizAttempt.findUnique.mockResolvedValue({
        passed: false,
      });

      await expect(service.generateCertificate('attempt-123', 'tenant-123'))
        .rejects.toThrow('Cannot generate certificate for failed attempt');
    });

    it('should set expiration date if configured', async () => {
      mockPrismaService.quizAttempt.findUnique.mockResolvedValue({
        passed: true,
        quiz: { certificateValidityMonths: 12 },
      });

      const result = await service.generateCertificate('attempt-123', 'tenant-123');

      expect(result.validUntil).toBeDefined();
      expect(new Date(result.validUntil).getTime())
        .toBeGreaterThan(Date.now() + 11 * 30 * 24 * 60 * 60 * 1000);
    });
  });
});
```

### 20.4 Quiz Analytics Tests

```typescript
// apps/backend/src/modules/quiz/quiz-analytics.service.spec.ts

describe('QuizAnalyticsService', () => {
  describe('getQuizPerformance', () => {
    it('should calculate overall pass rate', async () => {
      const result = await service.getQuizPerformance('tenant-123', {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2026-01-20'),
      });

      expect(result.overallPassRate).toBeGreaterThanOrEqual(0);
      expect(result.overallPassRate).toBeLessThanOrEqual(100);
    });

    it('should identify hardest questions', async () => {
      const result = await service.getQuestionAnalysis('quiz-123', 'tenant-123');

      expect(result.questions).toEqual(expect.arrayContaining([
        expect.objectContaining({
          questionId: expect.any(String),
          correctRate: expect.any(Number),
        }),
      ]));

      // Verify sorted by correctRate ascending
      const rates = result.questions.map(q => q.correctRate);
      expect(rates).toEqual([...rates].sort((a, b) => a - b));
    });
  });
});
```

### 20.5 Quiz E2E Tests

```typescript
// apps/frontend/cypress/e2e/quiz.cy.ts

describe('Quiz and Certification', () => {
  describe('Admin Quiz Configuration', () => {
    beforeEach(() => {
      cy.login('compliance@demo.ethico.com', 'Demo123!');
    });

    it('should create quiz with AI-generated questions', () => {
      cy.visit('/policies/data-privacy/quiz/configure');

      cy.get('[data-testid="enable-quiz"]').check();
      cy.get('[data-testid="passing-score"]').clear().type('80');
      cy.get('[data-testid="max-attempts"]').clear().type('3');

      cy.get('[data-testid="generate-questions-ai"]').click();
      cy.get('[data-testid="question-count"]').clear().type('5');
      cy.get('[data-testid="difficulty-intermediate"]').click();
      cy.get('[data-testid="confirm-generate"]').click();

      cy.get('[data-testid="generated-question"]', { timeout: 30000 })
        .should('have.length', 5);

      cy.get('[data-testid="save-quiz"]').click();
      cy.get('[data-testid="success-message"]')
        .should('contain', 'Quiz saved');
    });
  });

  describe('Employee Quiz Experience', () => {
    beforeEach(() => {
      cy.login('employee@demo.ethico.com', 'Demo123!');
    });

    it('should complete quiz and receive certificate', () => {
      cy.visit('/attestation/data-privacy');

      // Read policy
      cy.get('[data-testid="policy-content"]').scrollTo('bottom');

      // Start quiz
      cy.get('[data-testid="start-quiz"]').click();

      // Answer questions
      cy.get('[data-testid="quiz-question"]').each(($question, index) => {
        cy.wrap($question)
          .find('[data-testid="answer-option"]')
          .first()
          .click();
        cy.get('[data-testid="next-question"]').click();
      });

      // Submit quiz
      cy.get('[data-testid="submit-quiz"]').click();

      // Check result
      cy.get('[data-testid="quiz-result"]').should('be.visible');

      // Download certificate (if passed)
      cy.get('[data-testid="download-certificate"]').click();
      cy.readFile('cypress/downloads/certificate.pdf')
        .should('exist');
    });

    it('should show retry option on failure', () => {
      cy.visit('/attestation/data-privacy');
      cy.get('[data-testid="start-quiz"]').click();

      // Intentionally answer incorrectly
      cy.get('[data-testid="quiz-question"]').each(() => {
        cy.get('[data-testid="answer-option"]').last().click();
        cy.get('[data-testid="next-question"]').click();
      });

      cy.get('[data-testid="submit-quiz"]').click();

      cy.get('[data-testid="quiz-failed"]').should('be.visible');
      cy.get('[data-testid="attempts-remaining"]')
        .should('contain', '2 attempts remaining');
      cy.get('[data-testid="retry-quiz"]').should('be.visible');
    });
  });
});
```

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | January 2026 | Engineering Team | Initial testing strategy |
| 2.0 | January 2026 | Engineering Team | Added test cases for 12 new features: Exception Lifecycle, Regulatory Framework, Risk/Incident Linkage, Employee Policy Hub, SharePoint/LMS/Marketplace Integrations, External Partner Portals, Conditional Workflows, Real-time Audit Dashboard, AI Auto-Tagging/Summarization, Quiz & Engagement Testing |

---

## Appendix: Test Commands

```bash
# Unit Tests
npm run test                          # All unit tests
npm run test:backend                  # Backend only
npm run test:frontend                 # Frontend only
npm run test -- --watch              # Watch mode
npm run test -- --coverage           # With coverage

# Integration Tests
npm run test:e2e                      # All integration tests
npm run test:e2e -- --grep "auth"    # Filter by pattern

# E2E Tests
npx cypress open                      # Interactive mode
npx cypress run                       # Headless mode
npx cypress run --spec "cypress/e2e/auth.cy.ts"  # Single spec

# Performance Tests
k6 run tests/performance/load-test.js
k6 run --vus 100 --duration 5m tests/performance/load-test.js

# Security Tests
npm audit
npx snyk test
```
