// =============================================================================
// INVESTIGATION TENANT ISOLATION E2E TESTS (CRITICAL SECURITY)
// =============================================================================
//
// These tests verify that Row-Level Security correctly prevents cross-tenant
// data access for Investigations. This is CRITICAL for platform security.
//
// Pattern for all isolation tests:
// 1. Create data in Org A
// 2. Query/mutate as Org B
// 3. Verify Org B cannot see or modify Org A's data
//
// IMPORTANT: Returns 404 (not 403) for cross-tenant access to prevent enumeration
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
  InvestigationOutcome,
  SourceChannel,
} from '@prisma/client';

describe('Investigation Tenant Isolation (e2e)', () => {
  let ctx: TestContext;

  // Test data created in Org A
  let orgACaseId: string;
  let orgAInvestigationId: string;

  // Test data created in Org B
  let orgBCaseId: string;

  beforeAll(async () => {
    ctx = await createTestContext();

    // Create test data directly in database with RLS bypass
    await ctx.prisma.enableBypassRLS();

    try {
      // Create a case in Org A
      const caseA = await ctx.prisma.case.create({
        data: {
          organizationId: ctx.orgA.id,
          referenceNumber: `ISOL-A-${Date.now()}`,
          sourceChannel: SourceChannel.DIRECT_ENTRY,
          details: 'Org A test case for isolation tests',
          createdById: ctx.orgA.users[0].id,
          updatedById: ctx.orgA.users[0].id,
        },
      });
      orgACaseId = caseA.id;

      // Create an investigation in Org A
      const investigationA = await ctx.prisma.investigation.create({
        data: {
          caseId: caseA.id,
          organizationId: ctx.orgA.id,
          investigationNumber: 1,
          investigationType: InvestigationType.FULL,
          status: InvestigationStatus.NEW,
          createdById: ctx.orgA.users[0].id,
          updatedById: ctx.orgA.users[0].id,
        },
      });
      orgAInvestigationId = investigationA.id;

      // Create a case in Org B
      const caseB = await ctx.prisma.case.create({
        data: {
          organizationId: ctx.orgB.id,
          referenceNumber: `ISOL-B-${Date.now()}`,
          sourceChannel: SourceChannel.HOTLINE,
          details: 'Org B test case for isolation tests',
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
  // LIST ISOLATION - Org B cannot see Org A's investigations
  // =========================================================================
  describe('List Isolation', () => {
    it('Org B cannot see Org A investigations when listing for case', async () => {
      // Org B tries to list investigations for Org A's case
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${orgACaseId}/investigations`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should return empty list (case doesn't belong to Org B)
      expect(response.body.data).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    it('Org A can see their own investigations', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${orgACaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].organizationId).toBe(ctx.orgA.id);
    });

    it('investigation list is filtered by organization', async () => {
      // First create an investigation in Org B to have something to list
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${orgBCaseId}/investigations`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ investigationType: InvestigationType.LIMITED })
        .expect(201);

      // Now list Org B's investigations - should not include Org A's
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${orgBCaseId}/investigations`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // All returned investigations should belong to Org B
      response.body.data.forEach((inv: any) => {
        expect(inv.organizationId).toBe(ctx.orgB.id);
      });

      // Verify Org A's investigation is NOT in the list
      const orgAInvestigations = response.body.data.filter(
        (inv: any) => inv.organizationId === ctx.orgA.id,
      );
      expect(orgAInvestigations).toHaveLength(0);
    });
  });

  // =========================================================================
  // READ ISOLATION - Org B cannot access Org A investigation by ID
  // =========================================================================
  describe('Read Isolation', () => {
    it('Org B cannot access Org A investigation by ID (returns 404)', async () => {
      // CRITICAL: Returns 404, not 403, to prevent enumeration attacks
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${orgAInvestigationId}`)
        .set(authHeader(ctx.orgB.users[0]))
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
  // CREATE ISOLATION - Org B cannot create investigation on Org A's case
  // =========================================================================
  describe('Create Isolation', () => {
    it('Org B cannot create investigation on Org A case (returns 404)', async () => {
      // Org B tries to create investigation on Org A's case
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${orgACaseId}/investigations`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ investigationType: InvestigationType.FULL })
        .expect(404);
    });

    it('Org A CAN create investigation on their own case', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${orgACaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ investigationType: InvestigationType.INQUIRY })
        .expect(201);

      expect(response.body.caseId).toBe(orgACaseId);
      expect(response.body.organizationId).toBe(ctx.orgA.id);
    });
  });

  // =========================================================================
  // UPDATE ISOLATION - Org B cannot update Org A's investigation
  // =========================================================================
  describe('Update Isolation', () => {
    it('Org B cannot update Org A investigation (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/investigations/${orgAInvestigationId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ investigationType: InvestigationType.LIMITED })
        .expect(404);

      // Verify investigation was NOT modified
      await ctx.prisma.enableBypassRLS();
      try {
        const investigation = await ctx.prisma.investigation.findUnique({
          where: { id: orgAInvestigationId },
        });
        expect(investigation?.investigationType).toBe(InvestigationType.FULL);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it('Org A CAN update their own investigation', async () => {
      const response = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/investigations/${orgAInvestigationId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ investigationType: InvestigationType.LIMITED })
        .expect(200);

      expect(response.body.investigationType).toBe(InvestigationType.LIMITED);
    });
  });

  // =========================================================================
  // ASSIGN ISOLATION - Org B cannot assign investigators to Org A's investigation
  // =========================================================================
  describe('Assign Isolation', () => {
    it('Org B cannot assign to Org A investigation (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${orgAInvestigationId}/assign`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          assignedTo: [ctx.orgB.users[0].id],
          primaryInvestigatorId: ctx.orgB.users[0].id,
        })
        .expect(404);

      // Verify investigation was NOT assigned
      await ctx.prisma.enableBypassRLS();
      try {
        const investigation = await ctx.prisma.investigation.findUnique({
          where: { id: orgAInvestigationId },
        });
        expect(investigation?.assignedTo).not.toContain(ctx.orgB.users[0].id);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it('Org A CAN assign to their own investigation', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${orgAInvestigationId}/assign`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          assignedTo: [ctx.orgA.users[0].id],
          primaryInvestigatorId: ctx.orgA.users[0].id,
        })
        .expect(200);

      expect(response.body.assignedTo).toContain(ctx.orgA.users[0].id);
    });
  });

  // =========================================================================
  // TRANSITION ISOLATION - Org B cannot change status of Org A's investigation
  // =========================================================================
  describe('Transition Isolation', () => {
    it('Org B cannot transition Org A investigation status (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${orgAInvestigationId}/transition`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          status: InvestigationStatus.ON_HOLD,
          rationale: 'Malicious cross-tenant status change attempt',
        })
        .expect(404);

      // Verify status was NOT changed
      await ctx.prisma.enableBypassRLS();
      try {
        const investigation = await ctx.prisma.investigation.findUnique({
          where: { id: orgAInvestigationId },
        });
        expect(investigation?.status).not.toBe(InvestigationStatus.ON_HOLD);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });
  });

  // =========================================================================
  // FINDINGS ISOLATION - Org B cannot record findings on Org A's investigation
  // =========================================================================
  describe('Findings Isolation', () => {
    it('Org B cannot record findings on Org A investigation (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${orgAInvestigationId}/findings`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          findingsSummary: 'Malicious cross-tenant findings attempt',
          outcome: InvestigationOutcome.SUBSTANTIATED,
        })
        .expect(404);

      // Verify findings were NOT recorded
      await ctx.prisma.enableBypassRLS();
      try {
        const investigation = await ctx.prisma.investigation.findUnique({
          where: { id: orgAInvestigationId },
        });
        expect(investigation?.findingsSummary).toBeNull();
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });
  });

  // =========================================================================
  // CLOSE ISOLATION - Org B cannot close Org A's investigation
  // =========================================================================
  describe('Close Isolation', () => {
    it('Org B cannot close Org A investigation (returns 404)', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${orgAInvestigationId}/close`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          findingsSummary: 'Malicious cross-tenant close attempt',
          outcome: InvestigationOutcome.INCONCLUSIVE,
        })
        .expect(404);

      // Verify investigation was NOT closed
      await ctx.prisma.enableBypassRLS();
      try {
        const investigation = await ctx.prisma.investigation.findUnique({
          where: { id: orgAInvestigationId },
        });
        expect(investigation?.status).not.toBe(InvestigationStatus.CLOSED);
        expect(investigation?.closedAt).toBeNull();
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });
  });

  // =========================================================================
  // DATABASE-LEVEL VERIFICATION
  // =========================================================================
  describe('Database-Level Isolation Verification', () => {
    it('direct database query confirms RLS organization scoping', async () => {
      // Query directly to verify the data exists at DB level
      await ctx.prisma.enableBypassRLS();
      try {
        const allInvestigations = await ctx.prisma.investigation.findMany({
          where: {
            organizationId: { in: [ctx.orgA.id, ctx.orgB.id] },
          },
        });

        // Should have investigations in both orgs
        const orgAInvestigations = allInvestigations.filter(
          (i) => i.organizationId === ctx.orgA.id,
        );
        const orgBInvestigations = allInvestigations.filter(
          (i) => i.organizationId === ctx.orgB.id,
        );

        expect(orgAInvestigations.length).toBeGreaterThan(0);

        // Each org's investigations should only reference their own cases
        for (const inv of orgAInvestigations) {
          const investigationCase = await ctx.prisma.case.findUnique({
            where: { id: inv.caseId },
          });
          expect(investigationCase?.organizationId).toBe(ctx.orgA.id);
        }

        for (const inv of orgBInvestigations) {
          const investigationCase = await ctx.prisma.case.findUnique({
            where: { id: inv.caseId },
          });
          expect(investigationCase?.organizationId).toBe(ctx.orgB.id);
        }
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it('investigation organizationId is denormalized correctly from case', async () => {
      // Create a new investigation via API and verify organizationId is set from case
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${orgACaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ investigationType: InvestigationType.FULL })
        .expect(201);

      // Verify the organizationId matches the case's organization
      expect(response.body.organizationId).toBe(ctx.orgA.id);

      // Double-check via direct database query
      await ctx.prisma.enableBypassRLS();
      try {
        const investigation = await ctx.prisma.investigation.findUnique({
          where: { id: response.body.id },
          include: { case: true },
        });
        expect(investigation?.organizationId).toBe(investigation?.case.organizationId);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });
  });
});
