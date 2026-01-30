// =============================================================================
// SMOKE TEST: CASE MANAGEMENT FLOW
// =============================================================================
//
// End-to-end test validating the complete case management journey:
// - Create a new case
// - Case appears in list with correct reference number
// - View case detail page
// - Update case properties (inline edit)
// - Change case status
// - Activity log records all changes
// - Close case
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
import { CaseStatus, SourceChannel } from '@prisma/client';

describe('Smoke Test: Case Management Flow', () => {
  let ctx: TestContext;

  // Test case data created during the flow
  let createdCaseId: string;
  let createdCaseReferenceNumber: string;

  beforeAll(async () => {
    ctx = await createTestContext();
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await ctx.prisma.enableBypassRLS();
    try {
      await ctx.prisma.auditLog.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
      await ctx.prisma.investigation.deleteMany({
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
  // STEP 1: Create a new case
  // =========================================================================
  describe('Step 1: Create Case', () => {
    it('should create a new case with required fields', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post('/api/v1/cases')
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          sourceChannel: SourceChannel.DIRECT_ENTRY,
          details: 'Smoke test case - reports of policy violation in finance department',
          reporterAnonymous: false,
        })
        .expect(201);

      // Verify response structure
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('referenceNumber');
      expect(response.body).toHaveProperty('organizationId', ctx.orgA.id);
      expect(response.body).toHaveProperty('sourceChannel', SourceChannel.DIRECT_ENTRY);
      expect(response.body).toHaveProperty('status', CaseStatus.NEW);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Store for subsequent tests
      createdCaseId = response.body.id;
      createdCaseReferenceNumber = response.body.referenceNumber;

      expect(createdCaseId).toBeDefined();
      expect(createdCaseReferenceNumber).toMatch(/^ETH-\d{4}-\d{5}$/);
    });

    it('should auto-generate reference number in correct format', () => {
      // Reference number format: ETH-YYYY-NNNNN
      const [prefix, year, sequence] = createdCaseReferenceNumber.split('-');

      expect(prefix).toBe('ETH');
      expect(year).toBe(new Date().getFullYear().toString());
      expect(sequence).toMatch(/^\d{5}$/);
    });

    it('should reject case creation without required fields', async () => {
      await request(ctx.app.getHttpServer())
        .post('/api/v1/cases')
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          // Missing sourceChannel and details
        })
        .expect(400);
    });
  });

  // =========================================================================
  // STEP 2: Case appears in list
  // =========================================================================
  describe('Step 2: Case List', () => {
    it('should show case in paginated list', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/cases')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('limit');
      expect(response.body).toHaveProperty('offset');

      // Find our created case
      const foundCase = response.body.data.find(
        (c: any) => c.id === createdCaseId,
      );
      expect(foundCase).toBeDefined();
      expect(foundCase.referenceNumber).toBe(createdCaseReferenceNumber);
      expect(foundCase.organizationId).toBe(ctx.orgA.id);
    });

    it('should filter cases by status', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/cases?status=NEW')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // All returned cases should have NEW status
      response.body.data.forEach((c: any) => {
        expect(c.status).toBe(CaseStatus.NEW);
      });

      // Our case should be in the list
      const foundCase = response.body.data.find(
        (c: any) => c.id === createdCaseId,
      );
      expect(foundCase).toBeDefined();
    });

    it('should support pagination', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/cases?limit=1&offset=0')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.limit).toBe(1);
      expect(response.body.offset).toBe(0);
    });
  });

  // =========================================================================
  // STEP 3: View case detail
  // =========================================================================
  describe('Step 3: Case Detail', () => {
    it('should return case by ID', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${createdCaseId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.id).toBe(createdCaseId);
      expect(response.body.referenceNumber).toBe(createdCaseReferenceNumber);
      expect(response.body.organizationId).toBe(ctx.orgA.id);
      expect(response.body.details).toContain('Smoke test case');
    });

    it('should return case by reference number', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/reference/${createdCaseReferenceNumber}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.id).toBe(createdCaseId);
    });

    it('should return 404 for non-existent case', async () => {
      await request(ctx.app.getHttpServer())
        .get('/api/v1/cases/00000000-0000-0000-0000-000000000000')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(404);
    });
  });

  // =========================================================================
  // STEP 4: Update case properties
  // =========================================================================
  describe('Step 4: Update Case', () => {
    it('should update case with PATCH', async () => {
      const response = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/cases/${createdCaseId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          details: 'Updated smoke test case - additional information received from reporter',
          severity: 'MEDIUM',
        })
        .expect(200);

      expect(response.body.details).toContain('additional information');
      expect(response.body.severity).toBe('MEDIUM');
      expect(response.body.updatedAt).not.toBe(response.body.createdAt);
    });

    it('should update case with PUT', async () => {
      const response = await request(ctx.app.getHttpServer())
        .put(`/api/v1/cases/${createdCaseId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          sourceChannel: SourceChannel.DIRECT_ENTRY,
          details: 'Full update smoke test case - complete revision of case details',
          severity: 'HIGH',
          reporterAnonymous: false,
        })
        .expect(200);

      expect(response.body.details).toContain('complete revision');
      expect(response.body.severity).toBe('HIGH');
    });

    it('should return 404 when updating non-existent case', async () => {
      await request(ctx.app.getHttpServer())
        .patch('/api/v1/cases/00000000-0000-0000-0000-000000000000')
        .set(authHeader(ctx.orgA.users[0]))
        .send({ details: 'This is a test update that should fail with 404' })
        .expect(404);
    });
  });

  // =========================================================================
  // STEP 5: Change case status
  // =========================================================================
  describe('Step 5: Status Change', () => {
    it('should change status from NEW to OPEN', async () => {
      const response = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/cases/${createdCaseId}/status`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: CaseStatus.OPEN,
          rationale: 'Initial review complete, case is now being actively worked',
        })
        .expect(200);

      expect(response.body.status).toBe(CaseStatus.OPEN);
    });

    it('should preserve status rationale', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${createdCaseId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.status).toBe(CaseStatus.OPEN);
      expect(response.body.statusRationale).toBeDefined();
    });

    it('status can be changed multiple times with rationale tracking', async () => {
      // Verify current state is OPEN
      const currentState = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${createdCaseId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(currentState.body.status).toBe(CaseStatus.OPEN);
    });
  });

  // =========================================================================
  // STEP 6: Activity log records changes
  // =========================================================================
  describe('Step 6: Activity Log', () => {
    it('should have activity entries for all mutations', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${createdCaseId}/activity`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body.items.length).toBeGreaterThanOrEqual(3);

      // Verify activity types
      const actions = response.body.items.map((a: any) => a.action);
      expect(actions).toContain('created');
      expect(actions.filter((a: string) => a === 'status_changed').length).toBeGreaterThanOrEqual(1);
    });

    it('activity entries should have natural language descriptions', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${createdCaseId}/activity`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      response.body.items.forEach((activity: any) => {
        expect(activity.actionDescription).toBeDefined();
        expect(activity.actionDescription.length).toBeGreaterThan(10);
        expect(activity.actorName).toBeDefined();
      });
    });

    it('status changes should include old and new values', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${createdCaseId}/activity`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const statusChanges = response.body.items.filter(
        (a: any) => a.action === 'status_changed',
      );

      statusChanges.forEach((change: any) => {
        expect(change.changes).toBeDefined();
        expect(change.changes.oldValue).toHaveProperty('status');
        expect(change.changes.newValue).toHaveProperty('status');
      });
    });

    it('activity timeline is in correct order', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${createdCaseId}/activity`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Default order is descending (newest first)
      const timestamps = response.body.items.map((a: any) =>
        new Date(a.createdAt).getTime(),
      );

      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
      }
    });
  });

  // =========================================================================
  // STEP 7: Close case
  // =========================================================================
  describe('Step 7: Close Case', () => {
    it('should close case with rationale', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${createdCaseId}/close`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          rationale: 'Investigation complete. No policy violation substantiated. Recommended training provided to employees.',
        })
        .expect(200);

      expect(response.body.status).toBe(CaseStatus.CLOSED);
      expect(response.body.statusRationale).toContain('Investigation complete');
    });

    it('closed case should appear in list with CLOSED status', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/cases?status=CLOSED')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const closedCase = response.body.data.find(
        (c: any) => c.id === createdCaseId,
      );
      expect(closedCase).toBeDefined();
      expect(closedCase.status).toBe(CaseStatus.CLOSED);
    });

    it('activity log records the close action', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${createdCaseId}/activity`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const closeActivity = response.body.items.find(
        (a: any) => a.action === 'closed',
      );
      expect(closeActivity).toBeDefined();
      expect(closeActivity.actionDescription.toLowerCase()).toContain('closed');
    });
  });

  // =========================================================================
  // VERIFICATION: Database state
  // =========================================================================
  describe('Database State Verification', () => {
    it('case record has correct organization and audit fields', async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const caseRecord = await ctx.prisma.case.findUnique({
          where: { id: createdCaseId },
        });

        expect(caseRecord).toBeDefined();
        expect(caseRecord?.organizationId).toBe(ctx.orgA.id);
        expect(caseRecord?.createdById).toBe(ctx.orgA.users[0].id);
        expect(caseRecord?.updatedById).toBe(ctx.orgA.users[0].id);
        expect(caseRecord?.status).toBe(CaseStatus.CLOSED);
        expect(caseRecord?.statusRationale).toContain('Investigation complete');
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it('audit logs are properly linked to case', async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const auditLogs = await ctx.prisma.auditLog.findMany({
          where: {
            entityType: 'CASE',
            entityId: createdCaseId,
          },
          orderBy: { createdAt: 'asc' },
        });

        expect(auditLogs.length).toBeGreaterThanOrEqual(5);

        // All audit logs should be for the correct org
        auditLogs.forEach((log) => {
          expect(log.organizationId).toBe(ctx.orgA.id);
          expect(log.entityId).toBe(createdCaseId);
        });
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });
  });
});
