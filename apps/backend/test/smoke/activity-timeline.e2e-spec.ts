// =============================================================================
// SMOKE TEST: ACTIVITY TIMELINE
// =============================================================================
//
// End-to-end test validating activity/audit logging functionality:
// - All mutations create activity entries
// - Activity descriptions are natural language
// - Timeline displays in correct order
// - Filters work correctly
//
// This tests the AI-first design requirement that all changes are tracked
// with human-readable descriptions.
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

describe('Smoke Test: Activity Timeline', () => {
  let ctx: TestContext;

  // Test data for activity verification
  let testCaseId: string;
  let testInvestigationId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
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
  // SETUP: Create test data that generates activity logs
  // =========================================================================
  describe('Setup: Generate Activity Through Mutations', () => {
    it('should create case (generates CREATE activity)', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post('/api/v1/cases')
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          sourceChannel: SourceChannel.HOTLINE,
          details: 'Activity timeline test case - reports of financial irregularities',
        })
        .expect(201);

      testCaseId = response.body.id;
    });

    it('should update case (generates UPDATE activity)', async () => {
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/cases/${testCaseId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          details: 'Updated details - additional information received from anonymous source',
          severity: 'HIGH',
        })
        .expect(200);
    });

    it('should change case status (generates STATUS_CHANGED activity)', async () => {
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/cases/${testCaseId}/status`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: CaseStatus.OPEN,
          rationale: 'Initial assessment complete, case is now being actively worked',
        })
        .expect(200);
    });

    it('should create investigation (generates CREATE activity)', async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/cases/${testCaseId}/investigations`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          investigationType: InvestigationType.FULL,
          department: 'COMPLIANCE',
        })
        .expect(201);

      testInvestigationId = response.body.id;
    });

    it('should assign investigation (generates ASSIGNED activity)', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationId}/assign`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          assignedTo: [ctx.orgA.users[1].id],
          primaryInvestigatorId: ctx.orgA.users[1].id,
        })
        .expect(200);
    });

    it('should transition investigation status (generates STATUS_CHANGED activity)', async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/investigations/${testInvestigationId}/transition`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          status: InvestigationStatus.INVESTIGATING,
          rationale: 'Beginning detailed investigation with document review',
        })
        .expect(200);
    });
  });

  // =========================================================================
  // STEP 1: All mutations create activity entries
  // =========================================================================
  describe('Step 1: Mutations Generate Activity Entries', () => {
    it('case timeline shows all case-related activities', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/activity`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.items.length).toBeGreaterThanOrEqual(3);

      // Verify expected actions are present
      const actions = response.body.items.map((a: any) => a.action);
      expect(actions).toContain('created');
      expect(actions).toContain('updated');
      expect(actions).toContain('status_changed');
    });

    it('investigation activities are tracked', async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const investigationActivities = await ctx.prisma.auditLog.findMany({
          where: {
            entityType: 'INVESTIGATION',
            entityId: testInvestigationId,
          },
        });

        expect(investigationActivities.length).toBeGreaterThanOrEqual(3);

        const actions = investigationActivities.map((a) => a.action);
        expect(actions).toContain('created');
        expect(actions).toContain('assigned');
        expect(actions).toContain('status_changed');
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it('org-wide activity query includes all activities', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/activity')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should have activities from both case and investigation
      const caseActivities = response.body.items.filter(
        (a: any) => a.entityType === 'CASE' && a.entityId === testCaseId,
      );
      expect(caseActivities.length).toBeGreaterThanOrEqual(3);

      const investigationActivities = response.body.items.filter(
        (a: any) => a.entityType === 'INVESTIGATION' && a.entityId === testInvestigationId,
      );
      expect(investigationActivities.length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // STEP 2: Activity descriptions are natural language
  // =========================================================================
  describe('Step 2: Natural Language Descriptions', () => {
    it('all activities have human-readable actionDescription', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/activity`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      response.body.items.forEach((activity: any) => {
        expect(activity.actionDescription).toBeDefined();
        expect(typeof activity.actionDescription).toBe('string');
        expect(activity.actionDescription.length).toBeGreaterThan(10);

        // Should contain readable text, not just codes
        expect(activity.actionDescription).not.toMatch(/^[A-Z_]+$/);
      });
    });

    it('create activity describes what was created', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/activity`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const createActivity = response.body.items.find(
        (a: any) => a.action === 'created',
      );
      expect(createActivity).toBeDefined();
      expect(createActivity.actionDescription.toLowerCase()).toContain('created');
    });

    it('status change describes old and new status', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/activity`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const statusActivity = response.body.items.find(
        (a: any) => a.action === 'status_changed',
      );
      expect(statusActivity).toBeDefined();
      expect(statusActivity.actionDescription.toLowerCase()).toContain('status');
    });

    it('actor name is included and human-readable', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/activity`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      response.body.items.forEach((activity: any) => {
        expect(activity.actorName).toBeDefined();
        expect(activity.actorName.length).toBeGreaterThan(0);
        // Actor name should be a real name, not a UUID
        expect(activity.actorName).not.toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      });
    });

    it('changes object captures before/after for updates', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/activity`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const statusActivity = response.body.items.find(
        (a: any) => a.action === 'status_changed',
      );

      expect(statusActivity.changes).toBeDefined();
      expect(statusActivity.changes.oldValue).toHaveProperty('status');
      expect(statusActivity.changes.newValue).toHaveProperty('status');
    });
  });

  // =========================================================================
  // STEP 3: Timeline displays in correct order
  // =========================================================================
  describe('Step 3: Timeline Order', () => {
    it('default order is descending (newest first)', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/activity`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const timestamps = response.body.items.map((a: any) =>
        new Date(a.createdAt).getTime(),
      );

      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
      }
    });

    it('ascending order shows oldest first', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${testCaseId}?sortOrder=asc`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const timestamps = response.body.items.map((a: any) =>
        new Date(a.createdAt).getTime(),
      );

      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i + 1]);
      }
    });

    it('timeline reconstructs logical sequence of events', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${testCaseId}?sortOrder=asc`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const actions = response.body.items.map((a: any) => a.action);

      // First action should be 'created'
      expect(actions[0]).toBe('created');

      // Status change should come after creation
      const createIndex = actions.indexOf('created');
      const statusIndex = actions.indexOf('status_changed');
      expect(statusIndex).toBeGreaterThan(createIndex);
    });
  });

  // =========================================================================
  // STEP 4: Filters work correctly
  // =========================================================================
  describe('Step 4: Activity Filters', () => {
    it('filter by action category (CREATE)', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/activity?actionCategory=CREATE')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      response.body.items.forEach((activity: any) => {
        expect(activity.actionCategory).toBe('CREATE');
      });
    });

    it('filter by action category (UPDATE)', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/activity?actionCategory=UPDATE')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      response.body.items.forEach((activity: any) => {
        expect(activity.actionCategory).toBe('UPDATE');
      });
    });

    it('filter by action name', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/activity?action=status_changed')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      response.body.items.forEach((activity: any) => {
        expect(activity.action).toBe('status_changed');
      });
    });

    it('filter by date range', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const response = await request(ctx.app.getHttpServer())
        .get(
          `/api/v1/activity?startDate=${yesterday.toISOString()}&endDate=${tomorrow.toISOString()}`,
        )
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      response.body.items.forEach((activity: any) => {
        const activityDate = new Date(activity.createdAt);
        expect(activityDate.getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
        expect(activityDate.getTime()).toBeLessThanOrEqual(tomorrow.getTime());
      });
    });

    it('pagination works correctly', async () => {
      const page1 = await request(ctx.app.getHttpServer())
        .get('/api/v1/activity?page=1&limit=2')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(page1.body.items).toHaveLength(2);
      expect(page1.body.pagination.page).toBe(1);
      expect(page1.body.pagination.limit).toBe(2);

      const page2 = await request(ctx.app.getHttpServer())
        .get('/api/v1/activity?page=2&limit=2')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(page2.body.pagination.page).toBe(2);

      // Page 1 and Page 2 should have different items
      const page1Ids = page1.body.items.map((a: any) => a.id);
      const page2Ids = page2.body.items.map((a: any) => a.id);
      const overlap = page1Ids.filter((id: string) => page2Ids.includes(id));
      expect(overlap).toHaveLength(0);
    });
  });

  // =========================================================================
  // STEP 5: User activity tracking
  // =========================================================================
  describe('Step 5: User Activity Tracking', () => {
    it('user activity endpoint shows activities by specific user', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/user/${ctx.orgA.users[0].id}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.items.length).toBeGreaterThan(0);

      response.body.items.forEach((activity: any) => {
        expect(activity.actorUserId).toBe(ctx.orgA.users[0].id);
      });
    });

    it('tracks which user made each change', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/cases/${testCaseId}/activity`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      response.body.items.forEach((activity: any) => {
        expect(activity.actorUserId).toBeDefined();
        expect(activity.actorType).toBe('USER');
      });
    });
  });

  // =========================================================================
  // STEP 6: Response format validation
  // =========================================================================
  describe('Step 6: Response Format', () => {
    it('activity items have all required fields', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${testCaseId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      response.body.items.forEach((activity: any) => {
        expect(activity).toHaveProperty('id');
        expect(activity).toHaveProperty('organizationId');
        expect(activity).toHaveProperty('entityType');
        expect(activity).toHaveProperty('entityId');
        expect(activity).toHaveProperty('action');
        expect(activity).toHaveProperty('actionCategory');
        expect(activity).toHaveProperty('actionDescription');
        expect(activity).toHaveProperty('actorType');
        expect(activity).toHaveProperty('actorUserId');
        expect(activity).toHaveProperty('actorName');
        expect(activity).toHaveProperty('createdAt');
      });
    });

    it('pagination response has correct structure', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/activity')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('pagination');
      expect(response.body.pagination).toHaveProperty('page');
      expect(response.body.pagination).toHaveProperty('limit');
      expect(response.body.pagination).toHaveProperty('total');
      expect(response.body.pagination).toHaveProperty('totalPages');

      expect(typeof response.body.pagination.page).toBe('number');
      expect(typeof response.body.pagination.limit).toBe('number');
      expect(typeof response.body.pagination.total).toBe('number');
      expect(typeof response.body.pagination.totalPages).toBe('number');
    });
  });

  // =========================================================================
  // VERIFICATION: Database state
  // =========================================================================
  describe('Database State Verification', () => {
    it('audit logs have correct organization_id', async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const auditLogs = await ctx.prisma.auditLog.findMany({
          where: { entityId: testCaseId },
        });

        auditLogs.forEach((log) => {
          expect(log.organizationId).toBe(ctx.orgA.id);
        });
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it('audit logs preserve entity relationships', async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const caseLog = await ctx.prisma.auditLog.findFirst({
          where: {
            entityId: testCaseId,
            action: 'created',
          },
        });

        expect(caseLog).toBeDefined();
        expect(caseLog?.entityType).toBe('CASE');
        expect(caseLog?.entityId).toBe(testCaseId);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });
  });
});
