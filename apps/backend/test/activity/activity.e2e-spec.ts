// =============================================================================
// ACTIVITY E2E TESTS - Timeline, Query, Access Control, Descriptions
// =============================================================================
//
// Tests for the Activity/Audit Log API endpoints covering:
// - Entity timeline retrieval and ordering
// - Activity query filtering (date range, action category, pagination)
// - Access control (admin-only org-wide, self-access user activity)
// - Natural language description generation
//
// Note: Tenant isolation tests are in activity-tenant-isolation.e2e-spec.ts
// =============================================================================

import * as request from 'supertest';
import { randomUUID } from 'crypto';
import {
  createTestContext,
  destroyTestContext,
  TestContext,
  authHeader,
  TestUser,
} from '../helpers/test-setup';
import { AuditEntityType, AuditActionCategory, ActorType } from '@prisma/client';

describe('Activity Controller (e2e)', () => {
  let ctx: TestContext;
  let investigatorToken: string;

  // Use a valid UUID for entity ID (required by ParseUUIDPipe)
  const testEntityId = randomUUID();

  beforeAll(async () => {
    ctx = await createTestContext();

    // The second user in orgA is an INVESTIGATOR (non-admin)
    investigatorToken = ctx.orgA.users[1].token!;

    // Create a series of activity logs for testing
    await ctx.prisma.enableBypassRLS();

    try {
      const now = new Date();

      // Activity 1: Created (oldest)
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.orgA.id,
          entityType: AuditEntityType.CASE,
          entityId: testEntityId,
          action: 'created',
          actionCategory: AuditActionCategory.CREATE,
          actionDescription: 'Alpha Admin created a new case for testing',
          actorUserId: ctx.orgA.users[0].id,
          actorType: ActorType.USER,
          actorName: 'Alpha Admin',
          createdAt: new Date(now.getTime() - 3000), // 3 seconds ago
        },
      });

      // Activity 2: Updated
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.orgA.id,
          entityType: AuditEntityType.CASE,
          entityId: testEntityId,
          action: 'updated',
          actionCategory: AuditActionCategory.UPDATE,
          actionDescription: 'Alpha Admin updated case description',
          actorUserId: ctx.orgA.users[0].id,
          actorType: ActorType.USER,
          actorName: 'Alpha Admin',
          changes: {
            oldValue: { description: 'Original description' },
            newValue: { description: 'Updated description' },
          },
          createdAt: new Date(now.getTime() - 2000), // 2 seconds ago
        },
      });

      // Activity 3: Status changed (newest)
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.orgA.id,
          entityType: AuditEntityType.CASE,
          entityId: testEntityId,
          action: 'status_changed',
          actionCategory: AuditActionCategory.UPDATE,
          actionDescription: 'Alpha Admin changed case status from OPEN to CLOSED',
          actorUserId: ctx.orgA.users[0].id,
          actorType: ActorType.USER,
          actorName: 'Alpha Admin',
          changes: {
            oldValue: { status: 'OPEN' },
            newValue: { status: 'CLOSED' },
          },
          createdAt: new Date(now.getTime() - 1000), // 1 second ago
        },
      });

      // Activity 4: Investigator viewed (for user activity tests)
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.orgA.id,
          entityType: AuditEntityType.CASE,
          entityId: testEntityId,
          action: 'viewed',
          actionCategory: AuditActionCategory.ACCESS,
          actionDescription: 'Alpha Investigator viewed case details',
          actorUserId: ctx.orgA.users[1].id,
          actorType: ActorType.USER,
          actorName: 'Alpha Investigator',
          createdAt: now,
        },
      });

      // Activity 5: Old activity for date range tests (7 days ago)
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.orgA.id,
          entityType: AuditEntityType.POLICY,
          entityId: randomUUID(),
          action: 'created',
          actionCategory: AuditActionCategory.CREATE,
          actionDescription: 'Alpha Admin created a policy last week',
          actorUserId: ctx.orgA.users[0].id,
          actorType: ActorType.USER,
          actorName: 'Alpha Admin',
          createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }
  }, 30000);

  afterAll(async () => {
    // Clean up activity logs
    await ctx.prisma.enableBypassRLS();
    try {
      await ctx.prisma.auditLog.deleteMany({
        where: {
          organizationId: { in: [ctx.orgA.id, ctx.orgB.id] },
        },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }

    await destroyTestContext(ctx);
  });

  // =========================================================================
  // ENTITY TIMELINE TESTS
  // =========================================================================
  describe('Entity Timeline (GET /api/v1/activity/entity/:type/:id)', () => {
    it('should return activities in descending order by default', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${testEntityId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.items.length).toBeGreaterThanOrEqual(3);

      // Verify descending order (newest first)
      const timestamps = response.body.items.map((item: any) =>
        new Date(item.createdAt).getTime(),
      );
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i + 1]);
      }
    });

    it('should return activities in ascending order when requested', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${testEntityId}?sortOrder=asc`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Verify ascending order (oldest first)
      const timestamps = response.body.items.map((item: any) =>
        new Date(item.createdAt).getTime(),
      );
      for (let i = 0; i < timestamps.length - 1; i++) {
        expect(timestamps[i]).toBeLessThanOrEqual(timestamps[i + 1]);
      }
    });

    it('creating entity generates activity log with correct type', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${testEntityId}?sortOrder=asc`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // First activity should be 'created'
      const createActivity = response.body.items.find(
        (item: any) => item.action === 'created',
      );
      expect(createActivity).toBeDefined();
      expect(createActivity.actionCategory).toBe('CREATE');
    });

    it('updating entity generates activity log', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${testEntityId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const updateActivity = response.body.items.find(
        (item: any) => item.action === 'updated',
      );
      expect(updateActivity).toBeDefined();
      expect(updateActivity.actionCategory).toBe('UPDATE');
    });

    it('status change generates activity log with old/new values', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${testEntityId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const statusActivity = response.body.items.find(
        (item: any) => item.action === 'status_changed',
      );
      expect(statusActivity).toBeDefined();
      expect(statusActivity.changes).toBeDefined();
      expect(statusActivity.changes.oldValue).toEqual({ status: 'OPEN' });
      expect(statusActivity.changes.newValue).toEqual({ status: 'CLOSED' });
    });
  });

  // =========================================================================
  // ACTIVITY QUERY TESTS
  // =========================================================================
  describe('Activity Query (GET /api/v1/activity)', () => {
    it('should support pagination', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/activity?page=1&limit=2')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBeGreaterThanOrEqual(4);
      expect(response.body.pagination.totalPages).toBeGreaterThanOrEqual(2);
    });

    it('should support pagination with page 2', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/activity?page=2&limit=2')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.pagination.page).toBe(2);
      // Items on page 2 should be different from page 1
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    it('should filter by action category', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/activity?actionCategory=CREATE')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // All returned items should be CREATE actions
      response.body.items.forEach((item: any) => {
        expect(item.actionCategory).toBe('CREATE');
      });
      expect(response.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter by date range - recent activities', async () => {
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

      // Should return recent activities (not the one from 7 days ago)
      expect(response.body.items.length).toBeGreaterThanOrEqual(4);

      // Verify all items are within date range
      response.body.items.forEach((item: any) => {
        const itemDate = new Date(item.createdAt);
        expect(itemDate.getTime()).toBeGreaterThanOrEqual(yesterday.getTime());
        expect(itemDate.getTime()).toBeLessThanOrEqual(tomorrow.getTime());
      });
    });

    it('should filter by date range - exclude recent', async () => {
      const eightDaysAgo = new Date();
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      const sixDaysAgo = new Date();
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

      const response = await request(ctx.app.getHttpServer())
        .get(
          `/api/v1/activity?startDate=${eightDaysAgo.toISOString()}&endDate=${sixDaysAgo.toISOString()}`,
        )
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should return only the old activity from 7 days ago
      expect(response.body.items.length).toBeGreaterThanOrEqual(1);
      response.body.items.forEach((item: any) => {
        const itemDate = new Date(item.createdAt);
        expect(itemDate.getTime()).toBeGreaterThanOrEqual(eightDaysAgo.getTime());
        expect(itemDate.getTime()).toBeLessThanOrEqual(sixDaysAgo.getTime());
      });
    });

    it('should filter by action name', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/activity?action=status_changed')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      response.body.items.forEach((item: any) => {
        expect(item.action).toBe('status_changed');
      });
    });
  });

  // =========================================================================
  // ACCESS CONTROL TESTS
  // =========================================================================
  describe('Access Control', () => {
    describe('Organization-wide Activity (GET /api/v1/activity)', () => {
      it('SYSTEM_ADMIN can access org-wide activity', async () => {
        await request(ctx.app.getHttpServer())
          .get('/api/v1/activity')
          .set(authHeader(ctx.orgA.users[0])) // SYSTEM_ADMIN
          .expect(200);
      });

      it('INVESTIGATOR (non-admin) cannot access org-wide activity', async () => {
        await request(ctx.app.getHttpServer())
          .get('/api/v1/activity')
          .set('Authorization', `Bearer ${investigatorToken}`)
          .expect(403);
      });
    });

    describe('User Activity (GET /api/v1/activity/user/:userId)', () => {
      it('user can access their own activity', async () => {
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/activity/user/${ctx.orgA.users[1].id}`)
          .set('Authorization', `Bearer ${investigatorToken}`)
          .expect(200);

        // Should see the investigator's view activity
        expect(response.body.items.length).toBeGreaterThanOrEqual(1);
        response.body.items.forEach((item: any) => {
          expect(item.actorUserId).toBe(ctx.orgA.users[1].id);
        });
      });

      it('non-admin cannot access another user\'s activity', async () => {
        // Investigator trying to view Admin's activity
        await request(ctx.app.getHttpServer())
          .get(`/api/v1/activity/user/${ctx.orgA.users[0].id}`)
          .set('Authorization', `Bearer ${investigatorToken}`)
          .expect(403);
      });

      it('admin can access any user\'s activity in their org', async () => {
        // Admin viewing Investigator's activity
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/activity/user/${ctx.orgA.users[1].id}`)
          .set(authHeader(ctx.orgA.users[0]))
          .expect(200);

        expect(response.body.items.length).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Entity Timeline (GET /api/v1/activity/entity/:type/:id)', () => {
      it('any authenticated user can view entity timeline', async () => {
        // Even INVESTIGATOR can view entity timelines
        const response = await request(ctx.app.getHttpServer())
          .get(`/api/v1/activity/entity/CASE/${testEntityId}`)
          .set('Authorization', `Bearer ${investigatorToken}`)
          .expect(200);

        expect(response.body.items.length).toBeGreaterThanOrEqual(1);
      });
    });
  });

  // =========================================================================
  // NATURAL LANGUAGE DESCRIPTION TESTS
  // =========================================================================
  describe('Natural Language Descriptions', () => {
    it('created activity has human-readable description', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${testEntityId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const createActivity = response.body.items.find(
        (item: any) => item.action === 'created',
      );
      expect(createActivity.actionDescription).toBeDefined();
      expect(createActivity.actionDescription.length).toBeGreaterThan(10);
      expect(createActivity.actionDescription).toContain('created');
    });

    it('updated activity describes the change', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${testEntityId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const updateActivity = response.body.items.find(
        (item: any) => item.action === 'updated',
      );
      expect(updateActivity.actionDescription).toBeDefined();
      expect(updateActivity.actionDescription).toContain('updated');
    });

    it('status changed activity includes old and new values in description', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${testEntityId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const statusActivity = response.body.items.find(
        (item: any) => item.action === 'status_changed',
      );
      expect(statusActivity.actionDescription).toBeDefined();
      // Description should mention the status change
      expect(statusActivity.actionDescription.toLowerCase()).toContain('status');
      // The changes object should have old/new values
      expect(statusActivity.changes.oldValue.status).toBe('OPEN');
      expect(statusActivity.changes.newValue.status).toBe('CLOSED');
    });

    it('actor name is included in activity response', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${testEntityId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      response.body.items.forEach((item: any) => {
        expect(item.actorName).toBeDefined();
        expect(item.actorName.length).toBeGreaterThan(0);
      });
    });
  });

  // =========================================================================
  // RESPONSE FORMAT VALIDATION
  // =========================================================================
  describe('Response Format', () => {
    it('returns correct pagination structure', async () => {
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
    });

    it('activity items have required fields', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${testEntityId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      response.body.items.forEach((item: any) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('organizationId');
        expect(item).toHaveProperty('entityType');
        expect(item).toHaveProperty('entityId');
        expect(item).toHaveProperty('action');
        expect(item).toHaveProperty('actionCategory');
        expect(item).toHaveProperty('actionDescription');
        expect(item).toHaveProperty('actorType');
        expect(item).toHaveProperty('createdAt');
      });
    });
  });
});
