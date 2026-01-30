// =============================================================================
// SMOKE TEST: TENANT ISOLATION (CRITICAL SECURITY)
// =============================================================================
//
// End-to-end test validating multi-tenant data isolation:
// - Create data as Org A user
// - Login as Org B user
// - Verify Org B cannot see Org A's cases
// - Verify Org B cannot see Org A's investigations
// - Verify Org B cannot see Org A's activity logs
//
// This is the MOST CRITICAL smoke test - data leakage between tenants
// is a severe security vulnerability.
//
// Pattern: Returns 404 (not 403) for cross-tenant access to prevent enumeration
// =============================================================================

import * as request from 'supertest';
import {
  createTestContext,
  destroyTestContext,
  TestContext,
  authHeader,
} from '../helpers/test-setup';
import {
  InvestigationType,
  InvestigationStatus,
  SourceChannel,
  CaseStatus,
} from '@prisma/client';

describe('Smoke Test: Tenant Isolation (CRITICAL)', () => {
  let ctx: TestContext;

  // Org A test data
  let orgACaseId: string;
  let orgACaseRef: string;
  let orgAInvestigationId: string;

  // Org B test data
  let orgBCaseId: string;

  beforeAll(async () => {
    ctx = await createTestContext();

    // Create test data with RLS bypass
    await ctx.prisma.enableBypassRLS();

    try {
      // Clean up any leftover cases from previous test runs to avoid reference number conflicts
      await ctx.prisma.auditLog.deleteMany({});
      await ctx.prisma.investigation.deleteMany({});
      await ctx.prisma.case.deleteMany({});
      // Create test case in Org A
      const caseA = await ctx.prisma.case.create({
        data: {
          organizationId: ctx.orgA.id,
          referenceNumber: `ISOL-A-${Date.now()}`,
          sourceChannel: SourceChannel.HOTLINE,
          details: 'Org A confidential case - should NOT be visible to Org B',
          createdById: ctx.orgA.users[0].id,
          updatedById: ctx.orgA.users[0].id,
        },
      });
      orgACaseId = caseA.id;
      orgACaseRef = caseA.referenceNumber;

      // Create investigation in Org A
      const investigationA = await ctx.prisma.investigation.create({
        data: {
          caseId: caseA.id,
          organizationId: ctx.orgA.id,
          investigationNumber: 1,
          investigationType: InvestigationType.FULL,
          status: InvestigationStatus.INVESTIGATING,
          createdById: ctx.orgA.users[0].id,
          updatedById: ctx.orgA.users[0].id,
        },
      });
      orgAInvestigationId = investigationA.id;

      // Create activity log in Org A
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.orgA.id,
          entityType: 'CASE',
          entityId: orgACaseId,
          action: 'created',
          actionCategory: 'CREATE',
          actionDescription: 'Alpha Admin created a confidential case',
          actorUserId: ctx.orgA.users[0].id,
          actorType: 'USER',
          actorName: 'Alpha Admin',
        },
      });

      // Create test case in Org B (for positive test)
      const caseB = await ctx.prisma.case.create({
        data: {
          organizationId: ctx.orgB.id,
          referenceNumber: `ISOL-B-${Date.now()}`,
          sourceChannel: SourceChannel.DIRECT_ENTRY,
          details: 'Org B case - should be visible to Org B',
          createdById: ctx.orgB.users[0].id,
          updatedById: ctx.orgB.users[0].id,
        },
      });
      orgBCaseId = caseB.id;
    } finally {
      await ctx.prisma.disableBypassRLS();
    }
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await ctx.prisma.enableBypassRLS();
    try {
      await ctx.prisma.investigation.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
      await ctx.prisma.auditLog.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
      await ctx.prisma.case.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }

    await destroyTestContext(ctx);
  });

  // =========================================================================
  // CASE ISOLATION - Org B cannot see Org A's cases
  // =========================================================================
  describe('Case Isolation', () => {
    it('Org B cannot see Org A cases in list', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/cases')
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // No Org A cases should be visible
      const orgACases = response.body.data.filter(
        (c: any) => c.organizationId === ctx.orgA.id,
      );
      expect(orgACases).toHaveLength(0);

      // All visible cases should be Org B
      response.body.data.forEach((c: any) => {
        expect(c.organizationId).toBe(ctx.orgB.id);
      });
    });

    it('Org B cannot access Org A case by ID (returns 404)', async () => {
      // CRITICAL: Returns 404, not 403, to prevent enumeration
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${orgACaseId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it('Org B cannot access Org A case by reference number (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/reference/${orgACaseRef}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it('Org B cannot update Org A case (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/cases/${orgACaseId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ details: 'Malicious update attempt' })
        .expect(404);

      // Verify case was NOT modified
      await ctx.prisma.enableBypassRLS();
      try {
        const caseRecord = await ctx.prisma.case.findUnique({
          where: { id: orgACaseId },
        });
        expect(caseRecord?.details).not.toContain('Malicious');
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it('Org B cannot change Org A case status (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/cases/${orgACaseId}/status`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          status: CaseStatus.CLOSED,
          rationale: 'Malicious status change',
        })
        .expect(404);
    });

    it('Org B cannot close Org A case (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${orgACaseId}/close`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ rationale: 'Malicious close attempt' })
        .expect(404);
    });

    it('Org A CAN see their own case', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${orgACaseId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.id).toBe(orgACaseId);
      expect(response.body.organizationId).toBe(ctx.orgA.id);
    });
  });

  // =========================================================================
  // INVESTIGATION ISOLATION - Org B cannot see Org A's investigations
  // =========================================================================
  describe('Investigation Isolation', () => {
    it('Org B cannot list investigations on Org A case (returns empty)', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${orgACaseId}/investigations`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should return empty (case belongs to different org)
      expect(response.body.data).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('Org B cannot access Org A investigation by ID (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${orgAInvestigationId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it('Org B cannot create investigation on Org A case (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${orgACaseId}/investigations`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ investigationType: InvestigationType.FULL })
        .expect(404);
    });

    it('Org B cannot update Org A investigation (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/investigations/${orgAInvestigationId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ investigationType: InvestigationType.LIMITED })
        .expect(404);
    });

    it('Org B cannot assign to Org A investigation (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${orgAInvestigationId}/assign`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          assignedTo: [ctx.orgB.users[0].id],
          primaryInvestigatorId: ctx.orgB.users[0].id,
        })
        .expect(404);
    });

    it('Org B cannot transition Org A investigation status (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${orgAInvestigationId}/transition`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          status: InvestigationStatus.CLOSED,
          rationale: 'Malicious status transition',
        })
        .expect(404);
    });

    it('Org B cannot record findings on Org A investigation (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${orgAInvestigationId}/findings`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          findingsSummary: 'Malicious findings',
          outcome: 'SUBSTANTIATED',
        })
        .expect(404);
    });

    it('Org B cannot close Org A investigation (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${orgAInvestigationId}/close`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          findingsSummary: 'Malicious closure',
          outcome: 'INCONCLUSIVE',
        })
        .expect(404);
    });

    it('Org A CAN access their own investigation', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${orgAInvestigationId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.id).toBe(orgAInvestigationId);
      expect(response.body.organizationId).toBe(ctx.orgA.id);
    });
  });

  // =========================================================================
  // ACTIVITY LOG ISOLATION - Org B cannot see Org A's activity logs
  // =========================================================================
  describe('Activity Log Isolation', () => {
    it('Org B cannot see Org A activities in org-wide view', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/activity')
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // No Org A activities should be visible
      const orgAActivities = response.body.items.filter(
        (a: any) => a.organizationId === ctx.orgA.id,
      );
      expect(orgAActivities).toHaveLength(0);
    });

    it('Org B cannot see Org A entity timeline (returns empty)', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${orgACaseId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      expect(response.body.items).toHaveLength(0);
    });

    it('Org B cannot see case activity on Org A case (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${orgACaseId}/activity`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it('Org B cannot access Org A user activity (returns empty)', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/user/${ctx.orgA.users[0].id}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should return empty due to tenant isolation
      expect(response.body.items).toHaveLength(0);
    });

    it('Org A CAN see their own activity', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/activity')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // All returned activities should be Org A
      response.body.items.forEach((a: any) => {
        expect(a.organizationId).toBe(ctx.orgA.id);
      });
    });
  });

  // =========================================================================
  // DATABASE-LEVEL VERIFICATION
  // =========================================================================
  describe('Database-Level Isolation Verification', () => {
    it('data exists in database but is filtered by RLS', async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        // Verify Org A data exists
        const orgACases = await ctx.prisma.case.findMany({
          where: { organizationId: ctx.orgA.id },
        });
        expect(orgACases.length).toBeGreaterThan(0);

        // Verify Org B data exists
        const orgBCases = await ctx.prisma.case.findMany({
          where: { organizationId: ctx.orgB.id },
        });
        expect(orgBCases.length).toBeGreaterThan(0);

        // Data is physically present, RLS filters it in API
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it('case has correct organization_id enforced', async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const caseA = await ctx.prisma.case.findUnique({
          where: { id: orgACaseId },
        });
        expect(caseA?.organizationId).toBe(ctx.orgA.id);

        const caseB = await ctx.prisma.case.findUnique({
          where: { id: orgBCaseId },
        });
        expect(caseB?.organizationId).toBe(ctx.orgB.id);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it('investigation organization_id matches case organization_id', async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const investigation = await ctx.prisma.investigation.findUnique({
          where: { id: orgAInvestigationId },
          include: { case: true },
        });

        expect(investigation?.organizationId).toBe(ctx.orgA.id);
        expect(investigation?.organizationId).toBe(investigation?.case.organizationId);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });
  });

  // =========================================================================
  // TOKEN CONTEXT VERIFICATION
  // =========================================================================
  describe('Token Organization Context', () => {
    it('JWT contains correct organizationId', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/auth/me')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.organizationId).toBe(ctx.orgA.id);
    });

    it('different orgs get different organizationId in token', async () => {
      const responseA = await request(ctx.app.getHttpServer())
        .get('/api/v1/auth/me')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const responseB = await request(ctx.app.getHttpServer())
        .get('/api/v1/auth/me')
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      expect(responseA.body.organizationId).toBe(ctx.orgA.id);
      expect(responseB.body.organizationId).toBe(ctx.orgB.id);
      expect(responseA.body.organizationId).not.toBe(responseB.body.organizationId);
    });
  });

  // =========================================================================
  // POSITIVE TESTS - Each org CAN see their own data
  // Note: CRUD functionality is already tested in case-flow smoke tests.
  // Here we verify that orgs can access their pre-seeded test data.
  // =========================================================================
  describe('Positive Tests - Own Data Access', () => {
    it('Org A can read and update their own pre-seeded case', async () => {
      // Read the case created in beforeAll
      const readResponse = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${orgACaseId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(readResponse.body.id).toBe(orgACaseId);
      expect(readResponse.body.organizationId).toBe(ctx.orgA.id);

      // Update
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/cases/${orgACaseId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ details: 'Updated isolation test case details for verification' })
        .expect(200);

      // List and verify it's found
      const listResponse = await request(ctx.app.getHttpServer())
        .get('/api/v1/cases')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const foundCase = listResponse.body.data.find(
        (c: any) => c.id === orgACaseId,
      );
      expect(foundCase).toBeDefined();
      expect(foundCase.organizationId).toBe(ctx.orgA.id);
    });

    it('Org B can read their own pre-seeded case', async () => {
      const readResponse = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${orgBCaseId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      expect(readResponse.body.id).toBe(orgBCaseId);
      expect(readResponse.body.organizationId).toBe(ctx.orgB.id);
    });
  });
});
