// =============================================================================
// SMOKE TEST: INVESTIGATION FLOW
// =============================================================================
//
// End-to-end test validating the complete investigation workflow:
// - Create investigation on a case
// - Investigation appears in case detail panel
// - Assign investigator
// - Status transitions (NEW → ASSIGNED → INVESTIGATING)
// - Record findings
// - Close investigation
//
// This is a smoke test - it validates the happy path works correctly.
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
  InvestigationDepartment,
  InvestigationOutcome,
  SourceChannel,
} from '@prisma/client';

describe('Smoke Test: Investigation Flow', () => {
  let ctx: TestContext;

  // Test data created during the flow
  let testCaseId: string;
  let testInvestigationId: string;

  beforeAll(async () => {
    ctx = await createTestContext();

    // Create a test case for investigation tests
    await ctx.prisma.enableBypassRLS();
    try {
      const testCase = await ctx.prisma.case.create({
        data: {
          organizationId: ctx.orgA.id,
          referenceNumber: `SMOKE-INV-${Date.now()}`,
          sourceChannel: SourceChannel.HOTLINE,
          details: 'Test case for investigation smoke tests - reported misconduct in procurement',
          createdById: ctx.orgA.users[0].id,
          updatedById: ctx.orgA.users[0].id,
        },
      });
      testCaseId = testCase.id;
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
  // STEP 1: Create investigation on a case
  // =========================================================================
  describe('Step 1: Create Investigation', () => {
    it('should create investigation with required fields', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${testCaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          investigationType: InvestigationType.FULL,
          department: InvestigationDepartment.COMPLIANCE,
        })
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('caseId', testCaseId);
      expect(response.body).toHaveProperty('organizationId', ctx.orgA.id);
      expect(response.body).toHaveProperty('investigationType', InvestigationType.FULL);
      expect(response.body).toHaveProperty('department', InvestigationDepartment.COMPLIANCE);
      expect(response.body).toHaveProperty('status', InvestigationStatus.NEW);
      expect(response.body).toHaveProperty('investigationNumber', 1);

      testInvestigationId = response.body.id;
    });

    it('should auto-generate sequential investigation numbers', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${testCaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          investigationType: InvestigationType.LIMITED,
          department: InvestigationDepartment.LEGAL,
        })
        .expect(201);

      expect(response.body.investigationNumber).toBe(2);
    });

    it('should reject creation on non-existent case', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/v1/cases/00000000-0000-0000-0000-000000000000/investigations')
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          investigationType: InvestigationType.FULL,
        })
        .expect(404);
    });
  });

  // =========================================================================
  // STEP 2: Investigation appears in case detail panel (list)
  // =========================================================================
  describe('Step 2: Investigation List', () => {
    it('should list investigations for a case', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body.total).toBeGreaterThanOrEqual(2);

      // Find our investigation
      const foundInvestigation = response.body.data.find(
        (inv: any) => inv.id === testInvestigationId,
      );
      expect(foundInvestigation).toBeDefined();
      expect(foundInvestigation.investigationType).toBe(InvestigationType.FULL);
    });

    it('should filter investigations by status', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/investigations?status=NEW`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      response.body.data.forEach((inv: any) => {
        expect(inv.status).toBe(InvestigationStatus.NEW);
      });
    });

    it('should get single investigation by ID', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.id).toBe(testInvestigationId);
      expect(response.body.case).toBeDefined();
      expect(response.body.case.id).toBe(testCaseId);
    });
  });

  // =========================================================================
  // STEP 3: Assign investigator
  // =========================================================================
  describe('Step 3: Assign Investigator', () => {
    it('should assign primary investigator', async () => {
      const investigatorId = ctx.orgA.users[1].id; // INVESTIGATOR role

      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationId}/assign`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          assignedTo: [investigatorId],
          primaryInvestigatorId: investigatorId,
        })
        .expect(200);

      expect(response.body.assignedTo).toContain(investigatorId);
      expect(response.body.primaryInvestigatorId).toBe(investigatorId);
      expect(response.body.assignedAt).toBeDefined();
      expect(response.body.assignedById).toBe(ctx.orgA.users[0].id);
    });

    it('should auto-transition from NEW to ASSIGNED', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.status).toBe(InvestigationStatus.ASSIGNED);
    });

    it('should support multiple investigators', async () => {
      const adminId = ctx.orgA.users[0].id;
      const investigatorId = ctx.orgA.users[1].id;

      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationId}/assign`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          assignedTo: [adminId, investigatorId],
          primaryInvestigatorId: investigatorId,
        })
        .expect(200);

      expect(response.body.assignedTo).toContain(adminId);
      expect(response.body.assignedTo).toContain(investigatorId);
      expect(response.body.assignmentHistory).toBeDefined();
      expect(response.body.assignmentHistory.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // STEP 4: Status transitions
  // =========================================================================
  describe('Step 4: Status Transitions', () => {
    it('should transition from ASSIGNED to INVESTIGATING', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationId}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.INVESTIGATING,
          rationale: 'Beginning active investigation - interviews scheduled with key witnesses',
        })
        .expect(200);

      expect(response.body.status).toBe(InvestigationStatus.INVESTIGATING);
      expect(response.body.statusRationale).toContain('Beginning active investigation');
      expect(response.body.statusChangedAt).toBeDefined();
    });

    it('should transition to ON_HOLD when needed', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationId}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.ON_HOLD,
          rationale: 'Waiting for legal review of document subpoena',
        })
        .expect(200);

      expect(response.body.status).toBe(InvestigationStatus.ON_HOLD);
    });

    it('should return from ON_HOLD to INVESTIGATING', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationId}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.INVESTIGATING,
          rationale: 'Legal review complete, resuming investigation',
        })
        .expect(200);

      expect(response.body.status).toBe(InvestigationStatus.INVESTIGATING);
    });

    it('should transition to PENDING_REVIEW', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationId}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.PENDING_REVIEW,
          rationale: 'Investigation complete, findings ready for compliance review',
        })
        .expect(200);

      expect(response.body.status).toBe(InvestigationStatus.PENDING_REVIEW);
    });

    it('should reject invalid status transition', async () => {
      // Create a new investigation in NEW status
      const newInv = await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${testCaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ investigationType: InvestigationType.INQUIRY })
        .expect(201);

      // Try to transition directly from NEW to INVESTIGATING (invalid)
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${newInv.body.id}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.INVESTIGATING,
          rationale: 'Attempting to skip ASSIGNED status',
        })
        .expect(400);
    });

    it('should require rationale with minimum length', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationId}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.INVESTIGATING,
          rationale: 'short', // Too short
        })
        .expect(400);
    });
  });

  // =========================================================================
  // STEP 5: Record findings
  // =========================================================================
  describe('Step 5: Record Findings', () => {
    it('should record investigation findings', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationId}/findings`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          findingsSummary: 'Investigation revealed procedural violations in vendor selection process',
          findingsDetail:
            'Detailed analysis found that proper procurement protocols were not followed. ' +
            'Three vendors were selected without competitive bidding. ' +
            'Documentation was incomplete for purchases over $10,000.',
          outcome: InvestigationOutcome.SUBSTANTIATED,
          rootCause: 'Lack of training on updated procurement policies',
          lessonsLearned: 'Need to implement mandatory procurement training for all purchasing managers',
        })
        .expect(200);

      expect(response.body.findingsSummary).toContain('procedural violations');
      expect(response.body.findingsDetail).toContain('competitive bidding');
      expect(response.body.outcome).toBe(InvestigationOutcome.SUBSTANTIATED);
      expect(response.body.rootCause).toBeDefined();
      expect(response.body.lessonsLearned).toBeDefined();
      expect(response.body.findingsDate).toBeDefined();
    });

    it('findings should be visible when getting investigation', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.findingsSummary).toContain('procedural violations');
      expect(response.body.outcome).toBe(InvestigationOutcome.SUBSTANTIATED);
    });
  });

  // =========================================================================
  // STEP 6: Close investigation
  // =========================================================================
  describe('Step 6: Close Investigation', () => {
    it('should close investigation with final findings', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationId}/close`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          findingsSummary:
            'Final determination: Procurement violations substantiated. Remediation plan implemented.',
          outcome: InvestigationOutcome.SUBSTANTIATED,
          closureNotes:
            'Investigation closed following implementation of corrective actions. ' +
            'Three employees received additional training. ' +
            'Procurement policies updated and communicated organization-wide.',
        })
        .expect(200);

      expect(response.body.status).toBe(InvestigationStatus.CLOSED);
      expect(response.body.closedAt).toBeDefined();
      expect(response.body.closedById).toBe(ctx.orgA.users[0].id);
      expect(response.body.outcome).toBe(InvestigationOutcome.SUBSTANTIATED);
    });

    it('closed investigation should show CLOSED status', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.status).toBe(InvestigationStatus.CLOSED);
      expect(response.body.closedAt).toBeDefined();
    });

    it('should reject closing from invalid status', async () => {
      // Create a NEW investigation
      const newInv = await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${testCaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ investigationType: InvestigationType.LIMITED })
        .expect(201);

      // Try to close directly from NEW (invalid)
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${newInv.body.id}/close`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          findingsSummary: 'Cannot close without going through workflow',
          outcome: InvestigationOutcome.INCONCLUSIVE,
        })
        .expect(400);
    });
  });

  // =========================================================================
  // VERIFICATION: Activity log tracks investigation changes
  // =========================================================================
  describe('Investigation Activity Tracking', () => {
    it('should have activity entries for all investigation mutations', async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const auditLogs = await ctx.prisma.auditLog.findMany({
          where: {
            entityType: 'INVESTIGATION',
            entityId: testInvestigationId,
          },
          orderBy: { createdAt: 'asc' },
        });

        // Should have: created, assigned (x2), status changes, findings, closed
        expect(auditLogs.length).toBeGreaterThanOrEqual(6);

        // Verify activity types
        const actions = auditLogs.map((log) => log.action);
        expect(actions).toContain('created');
        expect(actions).toContain('assigned');
        expect(actions.filter((a) => a === 'status_changed').length).toBeGreaterThanOrEqual(3);
        expect(actions).toContain('findings_recorded');
        expect(actions).toContain('closed');

        // All logs should have natural language descriptions
        auditLogs.forEach((log) => {
          expect(log.actionDescription).toBeDefined();
          expect(log.actionDescription.length).toBeGreaterThan(10);
        });
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it('assignment changes are tracked with assignment history', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.assignmentHistory).toBeDefined();
      expect(Array.isArray(response.body.assignmentHistory)).toBe(true);
      expect(response.body.assignmentHistory.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // VERIFICATION: Database state
  // =========================================================================
  describe('Database State Verification', () => {
    it('investigation has correct organization and audit fields', async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const investigation = await ctx.prisma.investigation.findUnique({
          where: { id: testInvestigationId },
        });

        expect(investigation).toBeDefined();
        expect(investigation?.organizationId).toBe(ctx.orgA.id);
        expect(investigation?.caseId).toBe(testCaseId);
        expect(investigation?.createdById).toBe(ctx.orgA.users[0].id);
        expect(investigation?.status).toBe(InvestigationStatus.CLOSED);
        expect(investigation?.closedAt).toBeDefined();
        expect(investigation?.closedById).toBe(ctx.orgA.users[0].id);
        expect(investigation?.outcome).toBe(InvestigationOutcome.SUBSTANTIATED);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it('investigation organizationId matches case organizationId', async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const investigation = await ctx.prisma.investigation.findUnique({
          where: { id: testInvestigationId },
          include: { case: true },
        });

        expect(investigation?.organizationId).toBe(investigation?.case.organizationId);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });
  });
});
