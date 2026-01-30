// =============================================================================
// ACTIVITY TENANT ISOLATION E2E TESTS
// =============================================================================
//
// CRITICAL: These tests verify that Row-Level Security correctly prevents
// cross-tenant access to activity/audit logs. Activity logs often contain
// sensitive information about business operations - isolation is paramount.
//
// Pattern:
// 1. Create activity logs in Org A
// 2. Query as Org B user
// 3. Verify Org B cannot see Org A's activity
// =============================================================================

import * as request from 'supertest';
import { randomUUID } from 'crypto';
import {
  createTestContext,
  destroyTestContext,
  TestContext,
  authHeader,
} from '../helpers/test-setup';
import { AuditEntityType, AuditActionCategory, ActorType } from '@prisma/client';

describe('Activity Tenant Isolation (e2e)', () => {
  let ctx: TestContext;

  // Activity log IDs created in Org A for isolation testing
  let activityInOrgA: string;
  // Use a valid UUID for entity ID (required by ParseUUIDPipe)
  const entityIdInOrgA = randomUUID();

  beforeAll(async () => {
    ctx = await createTestContext();

    // Bypass RLS to create activity directly in Org A
    await ctx.prisma.enableBypassRLS();

    try {
      // Create activity log entries in Org A
      const activity = await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.orgA.id,
          entityType: AuditEntityType.CASE,
          entityId: entityIdInOrgA,
          action: 'created',
          actionCategory: AuditActionCategory.CREATE,
          actionDescription: 'Alpha Admin created a test case',
          actorUserId: ctx.orgA.users[0].id,
          actorType: ActorType.USER,
          actorName: 'Alpha Admin',
        },
      });
      activityInOrgA = activity.id;

      // Create additional activity for timeline testing
      await ctx.prisma.auditLog.create({
        data: {
          organizationId: ctx.orgA.id,
          entityType: AuditEntityType.CASE,
          entityId: entityIdInOrgA,
          action: 'status_changed',
          actionCategory: AuditActionCategory.UPDATE,
          actionDescription: 'Alpha Admin changed status from OPEN to IN_PROGRESS',
          actorUserId: ctx.orgA.users[0].id,
          actorType: ActorType.USER,
          actorName: 'Alpha Admin',
          changes: {
            oldValue: { status: 'OPEN' },
            newValue: { status: 'IN_PROGRESS' },
          },
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
  // TENANT ISOLATION - Organization Activity Endpoint
  // =========================================================================
  describe('Organization Activity Isolation (GET /api/v1/activity)', () => {
    it('Org B admin cannot see Org A activity logs in org-wide view', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/activity')
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Verify no Org A activities are returned
      const orgAActivities = response.body.items.filter(
        (item: any) => item.organizationId === ctx.orgA.id,
      );
      expect(orgAActivities).toHaveLength(0);

      // All returned activities should belong to Org B (if any)
      response.body.items.forEach((item: any) => {
        expect(item.organizationId).toBe(ctx.orgB.id);
      });
    });

    it('Org A admin can see their own activity logs', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get('/api/v1/activity')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should see at least the activities we created
      expect(response.body.items.length).toBeGreaterThanOrEqual(2);

      // All returned activities should belong to Org A
      response.body.items.forEach((item: any) => {
        expect(item.organizationId).toBe(ctx.orgA.id);
      });
    });
  });

  // =========================================================================
  // TENANT ISOLATION - Entity Timeline Endpoint
  // =========================================================================
  describe('Entity Timeline Isolation (GET /api/v1/activity/entity/:type/:id)', () => {
    it('Org B cannot see Org A entity timeline (returns empty)', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${entityIdInOrgA}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should return empty list - no access to Org A's entity timeline
      expect(response.body.items).toHaveLength(0);
    });

    it('Org A can see their own entity timeline', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/entity/CASE/${entityIdInOrgA}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should see the 2 activities we created
      expect(response.body.items.length).toBeGreaterThanOrEqual(2);

      // All activities should reference the correct entity
      response.body.items.forEach((item: any) => {
        expect(item.entityId).toBe(entityIdInOrgA);
        expect(item.organizationId).toBe(ctx.orgA.id);
      });
    });
  });

  // =========================================================================
  // TENANT ISOLATION - User Activity Endpoint
  // =========================================================================
  describe('User Activity Isolation (GET /api/v1/activity/user/:userId)', () => {
    it('Org B cannot view Org A user activity even if they know the user ID', async () => {
      // Org B admin tries to access Org A user's activity
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/user/${ctx.orgA.users[0].id}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should return empty - tenant isolation filters out Org A activities
      expect(response.body.items).toHaveLength(0);
    });

    it('Org A admin can view their own user activity', async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/activity/user/${ctx.orgA.users[0].id}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should see activities performed by this user
      expect(response.body.items.length).toBeGreaterThanOrEqual(2);

      // All activities should be by the correct user in the correct org
      response.body.items.forEach((item: any) => {
        expect(item.actorUserId).toBe(ctx.orgA.users[0].id);
        expect(item.organizationId).toBe(ctx.orgA.id);
      });
    });
  });

  // =========================================================================
  // AUTHENTICATION TESTS
  // =========================================================================
  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      await request(ctx.app.getHttpServer())
        .get('/api/v1/activity')
        .expect(401);
    });

    it('should reject requests with invalid token', async () => {
      await request(ctx.app.getHttpServer())
        .get('/api/v1/activity')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should accept requests with valid token', async () => {
      await request(ctx.app.getHttpServer())
        .get('/api/v1/activity')
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);
    });
  });
});
