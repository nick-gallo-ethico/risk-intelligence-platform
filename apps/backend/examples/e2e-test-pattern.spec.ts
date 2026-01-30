// =============================================================================
// E2E TEST PATTERN - All E2E tests MUST follow this structure
// =============================================================================
//
// This is the canonical pattern for E2E tests in the Risk Intelligence Platform.
// Copy this structure when creating new E2E tests.
//
// KEY REQUIREMENTS:
// 1. Test full request/response cycle
// 2. ALWAYS test tenant isolation
// 3. Use real database (test database)
// 4. Clean up after tests
// 5. Test authentication and authorization
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ExampleStatus } from '@prisma/client';

describe('ExampleController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  // -------------------------------------------------------------------------
  // Test Data - Two separate organizations for isolation testing
  // -------------------------------------------------------------------------
  const orgA = {
    id: 'org-a-test',
    name: 'Organization A',
    slug: 'org-a',
  };

  const orgB = {
    id: 'org-b-test',
    name: 'Organization B',
    slug: 'org-b',
  };

  const userA = {
    id: 'user-a-test',
    email: 'user-a@org-a.test',
    name: 'User A',
    organizationId: orgA.id,
    role: 'COMPLIANCE_OFFICER',
  };

  const userB = {
    id: 'user-b-test',
    email: 'user-b@org-b.test',
    name: 'User B',
    organizationId: orgB.id,
    role: 'COMPLIANCE_OFFICER',
  };

  let tokenA: string;
  let tokenB: string;
  let entityInOrgA: any;

  // -------------------------------------------------------------------------
  // Test Setup
  // -------------------------------------------------------------------------
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply same pipes as production
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // Create test organizations
    await prisma.organization.createMany({
      data: [orgA, orgB],
      skipDuplicates: true,
    });

    // Create test users
    await prisma.user.createMany({
      data: [
        { ...userA, passwordHash: 'not-used-in-tests' },
        { ...userB, passwordHash: 'not-used-in-tests' },
      ],
      skipDuplicates: true,
    });

    // Generate JWT tokens for each user
    tokenA = jwtService.sign({
      sub: userA.id,
      organizationId: orgA.id,
      role: userA.role,
    });

    tokenB = jwtService.sign({
      sub: userB.id,
      organizationId: orgB.id,
      role: userB.role,
    });

    // Create a test entity in Org A for isolation tests
    entityInOrgA = await prisma.example.create({
      data: {
        name: 'Org A Entity',
        description: 'This belongs to Org A only',
        status: ExampleStatus.DRAFT,
        organizationId: orgA.id,
        createdById: userA.id,
      },
    });
  });

  // -------------------------------------------------------------------------
  // Cleanup after all tests
  // -------------------------------------------------------------------------
  afterAll(async () => {
    // Clean up test data
    await prisma.example.deleteMany({
      where: {
        organizationId: { in: [orgA.id, orgB.id] },
      },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [userA.id, userB.id] } },
    });
    await prisma.organization.deleteMany({
      where: { id: { in: [orgA.id, orgB.id] } },
    });

    await app.close();
  });

  // =========================================================================
  // AUTHENTICATION TESTS
  // =========================================================================
  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/examples')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/examples')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should accept requests with valid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/examples')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);
    });
  });

  // =========================================================================
  // TENANT ISOLATION TESTS (CRITICAL)
  // =========================================================================
  describe('Tenant Isolation', () => {
    it('Org B cannot list Org A entities', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/examples')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      // Org B should see empty list (no Org A data)
      const orgAEntities = response.body.items.filter(
        (e: any) => e.organizationId === orgA.id,
      );
      expect(orgAEntities).toHaveLength(0);
    });

    it('Org B cannot access Org A entity by ID (returns 404, not 403)', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/examples/${entityInOrgA.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404); // IMPORTANT: 404 not 403 to prevent enumeration
    });

    it('Org B cannot update Org A entity', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/examples/${entityInOrgA.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ name: 'Hacked by Org B' })
        .expect(404);

      // Verify entity was NOT modified
      const entity = await prisma.example.findUnique({
        where: { id: entityInOrgA.id },
      });
      expect(entity?.name).toBe('Org A Entity');
    });

    it('Org B cannot delete Org A entity', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/examples/${entityInOrgA.id}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);

      // Verify entity still exists
      const entity = await prisma.example.findUnique({
        where: { id: entityInOrgA.id },
      });
      expect(entity).toBeDefined();
    });

    it('Org A CAN access their own entity', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/examples/${entityInOrgA.id}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      expect(response.body.id).toBe(entityInOrgA.id);
      expect(response.body.organizationId).toBe(orgA.id);
    });
  });

  // =========================================================================
  // CRUD TESTS
  // =========================================================================
  describe('CRUD Operations', () => {
    let createdEntityId: string;

    describe('POST /api/v1/examples', () => {
      it('should create entity with valid input', async () => {
        const response = await request(app.getHttpServer())
          .post('/api/v1/examples')
          .set('Authorization', `Bearer ${tokenA}`)
          .send({
            name: 'New Test Entity',
            description: 'Created via E2E test',
          })
          .expect(201);

        createdEntityId = response.body.id;
        expect(response.body.name).toBe('New Test Entity');
        expect(response.body.status).toBe(ExampleStatus.DRAFT);
        expect(response.body.organizationId).toBe(orgA.id);
      });

      it('should reject invalid input', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/examples')
          .set('Authorization', `Bearer ${tokenA}`)
          .send({
            // Missing required 'name' field
            description: 'Invalid',
          })
          .expect(400);
      });

      it('should reject unknown fields (whitelist validation)', async () => {
        await request(app.getHttpServer())
          .post('/api/v1/examples')
          .set('Authorization', `Bearer ${tokenA}`)
          .send({
            name: 'Valid Name',
            organizationId: 'hacker-org', // Should be stripped/rejected
            createdById: 'hacker-user',   // Should be stripped/rejected
          })
          .expect(400);
      });
    });

    describe('GET /api/v1/examples', () => {
      it('should return paginated list', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/examples')
          .set('Authorization', `Bearer ${tokenA}`)
          .expect(200);

        expect(response.body).toHaveProperty('items');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.items)).toBe(true);
      });

      it('should filter by status', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/examples?status=DRAFT')
          .set('Authorization', `Bearer ${tokenA}`)
          .expect(200);

        response.body.items.forEach((item: any) => {
          expect(item.status).toBe(ExampleStatus.DRAFT);
        });
      });

      it('should support pagination', async () => {
        const response = await request(app.getHttpServer())
          .get('/api/v1/examples?page=1&limit=5')
          .set('Authorization', `Bearer ${tokenA}`)
          .expect(200);

        expect(response.body.pagination.page).toBe(1);
        expect(response.body.pagination.limit).toBe(5);
      });
    });

    describe('PUT /api/v1/examples/:id', () => {
      it('should update entity', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/v1/examples/${createdEntityId}`)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ name: 'Updated Name' })
          .expect(200);

        expect(response.body.name).toBe('Updated Name');
      });

      it('should return 404 for non-existent entity', async () => {
        await request(app.getHttpServer())
          .put('/api/v1/examples/non-existent-id')
          .set('Authorization', `Bearer ${tokenA}`)
          .send({ name: 'Update' })
          .expect(404);
      });
    });

    describe('PUT /api/v1/examples/:id/status', () => {
      it('should change status with rationale', async () => {
        const response = await request(app.getHttpServer())
          .put(`/api/v1/examples/${createdEntityId}/status`)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({
            status: 'ACTIVE',
            rationale: 'Approved after thorough review by compliance team',
          })
          .expect(200);

        expect(response.body.status).toBe(ExampleStatus.ACTIVE);
      });

      it('should require rationale with minimum length', async () => {
        await request(app.getHttpServer())
          .put(`/api/v1/examples/${createdEntityId}/status`)
          .set('Authorization', `Bearer ${tokenA}`)
          .send({
            status: 'ARCHIVED',
            rationale: 'short', // Too short
          })
          .expect(400);
      });
    });

    describe('DELETE /api/v1/examples/:id', () => {
      it('should soft delete entity', async () => {
        await request(app.getHttpServer())
          .delete(`/api/v1/examples/${createdEntityId}`)
          .set('Authorization', `Bearer ${tokenA}`)
          .expect(204);

        // Verify soft delete (status changed, not actually removed)
        const entity = await prisma.example.findUnique({
          where: { id: createdEntityId },
        });
        expect(entity?.status).toBe(ExampleStatus.DELETED);
      });
    });
  });

  // =========================================================================
  // AUTHORIZATION TESTS
  // =========================================================================
  describe('Authorization', () => {
    let readOnlyToken: string;

    beforeAll(async () => {
      // Create read-only user
      const readOnlyUser = await prisma.user.create({
        data: {
          id: 'readonly-user-test',
          email: 'readonly@org-a.test',
          name: 'Read Only User',
          organizationId: orgA.id,
          role: 'READ_ONLY',
          passwordHash: 'not-used',
        },
      });

      readOnlyToken = jwtService.sign({
        sub: readOnlyUser.id,
        organizationId: orgA.id,
        role: 'READ_ONLY',
      });
    });

    afterAll(async () => {
      await prisma.user.delete({ where: { id: 'readonly-user-test' } });
    });

    it('READ_ONLY user can list entities', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/examples')
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .expect(200);
    });

    it('READ_ONLY user cannot create entities', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/examples')
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ name: 'Unauthorized Create' })
        .expect(403);
    });

    it('READ_ONLY user cannot update entities', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/examples/${entityInOrgA.id}`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .send({ name: 'Unauthorized Update' })
        .expect(403);
    });

    it('READ_ONLY user cannot delete entities', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/examples/${entityInOrgA.id}`)
        .set('Authorization', `Bearer ${readOnlyToken}`)
        .expect(403);
    });
  });
});
