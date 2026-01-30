// =============================================================================
// INVESTIGATION E2E TESTS - CRUD, Assignment, Status Transitions, Closure
// =============================================================================
//
// Tests for the Investigation API endpoints covering:
// - CRUD operations (create, list, get, update)
// - Assignment workflow (assign investigators, status auto-transition)
// - Status transitions with rationale requirement
// - Findings recording and closure with validation
// - Investigation number auto-generation
//
// Note: Tenant isolation tests are in investigations-tenant-isolation.e2e-spec.ts
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

describe('Investigations Controller (e2e)', () => {
  let ctx: TestContext;
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
          referenceNumber: `TEST-INV-${Date.now()}`,
          sourceChannel: SourceChannel.DIRECT_ENTRY,
          details: 'Test case for investigation E2E tests',
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
      // Delete investigations first (FK constraint)
      await ctx.prisma.investigation.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });

      // Delete audit logs
      await ctx.prisma.auditLog.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });

      // Delete test cases
      await ctx.prisma.case.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }

    await destroyTestContext(ctx);
  });

  // =========================================================================
  // AUTHENTICATION TESTS
  // =========================================================================
  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/investigations`)
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/investigations`)
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should accept requests with valid token', async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);
    });
  });

  // =========================================================================
  // CREATE INVESTIGATION TESTS
  // =========================================================================
  describe('Create Investigation (POST /api/v1/cases/:caseId/investigations)', () => {
    it('should create investigation with valid input', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${testCaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          investigationType: InvestigationType.FULL,
          department: InvestigationDepartment.HR,
        })
        .expect(201);

      testInvestigationId = response.body.id;

      expect(response.body.id).toBeDefined();
      expect(response.body.caseId).toBe(testCaseId);
      expect(response.body.organizationId).toBe(ctx.orgA.id);
      expect(response.body.investigationType).toBe(InvestigationType.FULL);
      expect(response.body.department).toBe(InvestigationDepartment.HR);
      expect(response.body.status).toBe(InvestigationStatus.NEW);
      expect(response.body.investigationNumber).toBe(1);
    });

    it('should auto-generate sequential investigation numbers', async () => {
      // Create second investigation
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

    it('should reject invalid investigation type', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${testCaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          investigationType: 'INVALID_TYPE',
        })
        .expect(400);
    });

    it('should return 404 for non-existent case', async () => {
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
  // LIST INVESTIGATIONS TESTS
  // =========================================================================
  describe('List Investigations (GET /api/v1/cases/:caseId/investigations)', () => {
    it('should return paginated list', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination parameters', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/investigations?page=1&limit=1`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(1);
    });

    it('should filter by status', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/investigations?status=NEW`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      response.body.data.forEach((inv: any) => {
        expect(inv.status).toBe(InvestigationStatus.NEW);
      });
    });

    it('should filter by department', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/investigations?department=HR`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      response.body.data.forEach((inv: any) => {
        expect(inv.department).toBe(InvestigationDepartment.HR);
      });
    });
  });

  // =========================================================================
  // GET SINGLE INVESTIGATION TESTS
  // =========================================================================
  describe('Get Investigation (GET /api/v1/investigations/:id)', () => {
    it('should return investigation with relations', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.id).toBe(testInvestigationId);
      expect(response.body.case).toBeDefined();
      expect(response.body.case.id).toBe(testCaseId);
      expect(response.body.case.referenceNumber).toBeDefined();
    });

    it('should return 404 for non-existent investigation', async () => {
      await request(ctx.app.getHttpServer())
        .get('/api/v1/investigations/00000000-0000-0000-0000-000000000000')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(404);
    });
  });

  // =========================================================================
  // UPDATE INVESTIGATION TESTS
  // =========================================================================
  describe('Update Investigation (PATCH /api/v1/investigations/:id)', () => {
    it('should update investigation fields', async () => {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const response = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/investigations/${testInvestigationId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          department: InvestigationDepartment.COMPLIANCE,
          dueDate: dueDate.toISOString(),
        })
        .expect(200);

      expect(response.body.department).toBe(InvestigationDepartment.COMPLIANCE);
      expect(response.body.dueDate).toBeDefined();
    });

    it('should return 404 for non-existent investigation', async () => {
      await request(ctx.app.getHttpServer())
        .patch('/api/v1/investigations/00000000-0000-0000-0000-000000000000')
        .set(authHeader(ctx.orgA.users[0]))
        .send({ department: InvestigationDepartment.HR })
        .expect(404);
    });
  });

  // =========================================================================
  // ASSIGNMENT WORKFLOW TESTS
  // =========================================================================
  describe('Assignment (POST /api/v1/investigations/:id/assign)', () => {
    it('should assign investigator(s) to investigation', async () => {
      const investigatorId = ctx.orgA.users[1].id; // INVESTIGATOR role user

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

    it('should auto-transition from NEW to ASSIGNED when first assigned', async () => {
      // Create a fresh investigation for this test
      const createResponse = await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${testCaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ investigationType: InvestigationType.INQUIRY })
        .expect(201);

      expect(createResponse.body.status).toBe(InvestigationStatus.NEW);

      const investigatorId = ctx.orgA.users[1].id;

      const assignResponse = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${createResponse.body.id}/assign`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          assignedTo: [investigatorId],
          primaryInvestigatorId: investigatorId,
        })
        .expect(200);

      expect(assignResponse.body.status).toBe(InvestigationStatus.ASSIGNED);
    });

    it('should track assignment history on reassignment', async () => {
      const adminId = ctx.orgA.users[0].id;
      const investigatorId = ctx.orgA.users[1].id;

      // First check current state (already assigned to investigator)
      const beforeResponse = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const beforeHistoryLength = Array.isArray(beforeResponse.body.assignmentHistory)
        ? beforeResponse.body.assignmentHistory.length
        : 0;

      // Reassign to admin
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationId}/assign`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          assignedTo: [adminId, investigatorId],
          primaryInvestigatorId: adminId,
        })
        .expect(200);

      expect(response.body.assignmentHistory).toBeDefined();
      expect(Array.isArray(response.body.assignmentHistory)).toBe(true);
      expect(response.body.assignmentHistory.length).toBeGreaterThan(beforeHistoryLength);
    });

    it('should reject if primary investigator not in assignedTo list', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationId}/assign`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          assignedTo: [ctx.orgA.users[0].id],
          primaryInvestigatorId: ctx.orgA.users[1].id, // Not in assignedTo
        })
        .expect(400);
    });

    it('should require at least one investigator', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationId}/assign`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          assignedTo: [],
          primaryInvestigatorId: ctx.orgA.users[0].id,
        })
        .expect(400);
    });
  });

  // =========================================================================
  // STATUS TRANSITION TESTS
  // =========================================================================
  describe('Status Transitions (POST /api/v1/investigations/:id/transition)', () => {
    let transitionTestInvestigationId: string;

    beforeAll(async () => {
      // Create and assign an investigation for transition tests
      const createResponse = await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${testCaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ investigationType: InvestigationType.FULL })
        .expect(201);

      transitionTestInvestigationId = createResponse.body.id;

      // Assign to transition to ASSIGNED status
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${transitionTestInvestigationId}/assign`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          assignedTo: [ctx.orgA.users[1].id],
          primaryInvestigatorId: ctx.orgA.users[1].id,
        })
        .expect(200);
    });

    it('should allow valid transition: ASSIGNED → INVESTIGATING', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${transitionTestInvestigationId}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.INVESTIGATING,
          rationale: 'Beginning investigation after initial assignment and case review',
        })
        .expect(200);

      expect(response.body.status).toBe(InvestigationStatus.INVESTIGATING);
      expect(response.body.statusRationale).toContain('Beginning investigation');
      expect(response.body.statusChangedAt).toBeDefined();
    });

    it('should allow valid transition: INVESTIGATING → ON_HOLD', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${transitionTestInvestigationId}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.ON_HOLD,
          rationale: 'Waiting for additional documentation from HR department',
        })
        .expect(200);

      expect(response.body.status).toBe(InvestigationStatus.ON_HOLD);
    });

    it('should allow returning from ON_HOLD to INVESTIGATING', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${transitionTestInvestigationId}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.INVESTIGATING,
          rationale: 'Received required documentation, resuming investigation',
        })
        .expect(200);

      expect(response.body.status).toBe(InvestigationStatus.INVESTIGATING);
    });

    it('should reject invalid transition', async () => {
      // Create a NEW investigation
      const newInvResponse = await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${testCaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ investigationType: InvestigationType.INQUIRY })
        .expect(201);

      // Try to transition directly from NEW to INVESTIGATING (invalid)
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${newInvResponse.body.id}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.INVESTIGATING,
          rationale: 'Trying to skip ASSIGNED status',
        })
        .expect(400);
    });

    it('should require rationale with minimum length', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${transitionTestInvestigationId}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.PENDING_REVIEW,
          rationale: 'short', // Too short (min 10 chars)
        })
        .expect(400);
    });

    it('should reject closing without findings', async () => {
      // Transition to PENDING_REVIEW first
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${transitionTestInvestigationId}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.PENDING_REVIEW,
          rationale: 'Investigation complete, ready for manager review',
        })
        .expect(200);

      // Try to close without findings - should fail
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${transitionTestInvestigationId}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.CLOSED,
          rationale: 'Attempting to close without recording findings first',
        })
        .expect(400);
    });
  });

  // =========================================================================
  // FINDINGS & CLOSURE TESTS
  // =========================================================================
  describe('Findings & Closure', () => {
    let findingsTestInvestigationId: string;

    beforeAll(async () => {
      // Create, assign, and transition an investigation to PENDING_REVIEW
      const createResponse = await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${testCaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ investigationType: InvestigationType.FULL })
        .expect(201);

      findingsTestInvestigationId = createResponse.body.id;

      // Assign
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${findingsTestInvestigationId}/assign`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          assignedTo: [ctx.orgA.users[0].id],
          primaryInvestigatorId: ctx.orgA.users[0].id,
        });

      // Transition through workflow
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${findingsTestInvestigationId}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.INVESTIGATING,
          rationale: 'Beginning investigation process',
        });

      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${findingsTestInvestigationId}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.PENDING_REVIEW,
          rationale: 'Investigation complete, moving to review',
        });
    });

    describe('Record Findings (POST /api/v1/investigations/:id/findings)', () => {
      it('should record investigation findings', async () => {
        const response = await request(ctx.app.getHttpServer())
          .post(`/api/v1/investigations/${findingsTestInvestigationId}/findings`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({
            findingsSummary: 'Investigation found no evidence of wrongdoing after thorough review',
            findingsDetail: 'Detailed analysis of all evidence and witness statements...',
            outcome: InvestigationOutcome.UNSUBSTANTIATED,
            rootCause: 'Miscommunication between departments',
            lessonsLearned: 'Implement clearer communication protocols',
          })
          .expect(200);

        expect(response.body.findingsSummary).toContain('no evidence');
        expect(response.body.outcome).toBe(InvestigationOutcome.UNSUBSTANTIATED);
        expect(response.body.findingsDate).toBeDefined();
      });
    });

    describe('Close Investigation (POST /api/v1/investigations/:id/close)', () => {
      it('should close investigation with findings and outcome', async () => {
        const response = await request(ctx.app.getHttpServer())
          .post(`/api/v1/investigations/${findingsTestInvestigationId}/close`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({
            findingsSummary: 'No policy violation found after complete review',
            outcome: InvestigationOutcome.NO_VIOLATION,
            closureNotes: 'Case closed with no further action required',
          })
          .expect(200);

        expect(response.body.status).toBe(InvestigationStatus.CLOSED);
        expect(response.body.closedAt).toBeDefined();
        expect(response.body.closedById).toBe(ctx.orgA.users[0].id);
        expect(response.body.outcome).toBe(InvestigationOutcome.NO_VIOLATION);
      });

      it('should reject closing from invalid status', async () => {
        // Create a NEW investigation
        const newInvResponse = await request(ctx.app.getHttpServer())
          .post(`/api/v1/cases/${testCaseId}/investigations`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({ investigationType: InvestigationType.INQUIRY })
          .expect(201);

        // Try to close directly from NEW (invalid)
        await request(ctx.app.getHttpServer())
          .post(`/api/v1/investigations/${newInvResponse.body.id}/close`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({
            findingsSummary: 'Cannot close without going through workflow',
            outcome: InvestigationOutcome.INCONCLUSIVE,
          })
          .expect(400);
      });

      it('should require findings summary with minimum length', async () => {
        // Create investigation and move to PENDING_REVIEW
        const createResponse = await request(ctx.app.getHttpServer())
          .post(`/api/v1/cases/${testCaseId}/investigations`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({ investigationType: InvestigationType.LIMITED })
          .expect(201);

        await request(ctx.app.getHttpServer())
          .post(`/api/v1/investigations/${createResponse.body.id}/assign`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({
            assignedTo: [ctx.orgA.users[0].id],
            primaryInvestigatorId: ctx.orgA.users[0].id,
          });

        await request(ctx.app.getHttpServer())
          .post(`/api/v1/investigations/${createResponse.body.id}/transition`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({
            status: InvestigationStatus.INVESTIGATING,
            rationale: 'Starting investigation work',
          });

        await request(ctx.app.getHttpServer())
          .post(`/api/v1/investigations/${createResponse.body.id}/transition`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({
            status: InvestigationStatus.PENDING_REVIEW,
            rationale: 'Ready for review',
          });

        // Try to close with too-short summary
        await request(ctx.app.getHttpServer())
          .post(`/api/v1/investigations/${createResponse.body.id}/close`)
          .set(authHeader(ctx.orgA.users[0]))
          .send({
            findingsSummary: 'short', // Too short (min 10 chars)
            outcome: InvestigationOutcome.INCONCLUSIVE,
          })
          .expect(400);
      });
    });
  });

  // =========================================================================
  // RESPONSE FORMAT VALIDATION
  // =========================================================================
  describe('Response Format', () => {
    it('investigation has all required fields', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/investigations/${testInvestigationId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('caseId');
      expect(response.body).toHaveProperty('organizationId');
      expect(response.body).toHaveProperty('investigationNumber');
      expect(response.body).toHaveProperty('investigationType');
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('list response has correct pagination structure', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');
      expect(typeof response.body.total).toBe('number');
      expect(typeof response.body.page).toBe('number');
      expect(typeof response.body.limit).toBe('number');
    });
  });
});
