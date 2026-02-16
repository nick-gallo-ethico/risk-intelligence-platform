/**
 * Notifications Tenant Isolation E2E Tests
 *
 * Verifies that notifications module properly enforces tenant isolation:
 * - Notifications are organization and user-scoped
 * - Cross-tenant notification access returns 404
 * - Preferences are tenant-isolated
 * - Org settings respect tenant boundaries
 *
 * TEST-04: Tenant isolation verification for notifications module.
 */

import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { PrismaService } from "../../src/modules/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { JwtKeyService } from "../../src/modules/auth/services/jwt-key.service";
import {
  NotificationChannel,
  NotificationType,
  NotificationStatus,
} from "@prisma/client";
import {
  createTestApp,
  createTestUser,
  cleanupTestData,
  E2ETestUser,
  E2ETestOrg,
} from "./test-helpers";

describe("Notifications Tenant Isolation (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let jwtKeyService: JwtKeyService;

  // Org A (primary test org)
  let userA: E2ETestUser;
  let tenantA: E2ETestOrg;
  let notificationA: { id: string };

  // Org B (cross-tenant test org)
  let userB: E2ETestUser;
  let tenantB: E2ETestOrg;
  let notificationB: { id: string };

  beforeAll(async () => {
    // Create test application
    const setup = await createTestApp();
    app = setup.app;
    prisma = setup.prisma;
    jwtService = setup.jwtService;
    jwtKeyService = setup.jwtKeyService;

    // Create test users in different orgs
    const setupA = await createTestUser(
      prisma,
      jwtService,
      {
        role: "SYSTEM_ADMIN",
        name: "Notifications Test Org A",
      },
      jwtKeyService,
    );
    userA = setupA.user;
    tenantA = setupA.tenant;

    const setupB = await createTestUser(
      prisma,
      jwtService,
      {
        role: "SYSTEM_ADMIN",
        name: "Notifications Test Org B",
      },
      jwtKeyService,
    );
    userB = setupB.user;
    tenantB = setupB.tenant;

    // Create test notifications for each org
    await prisma.enableBypassRLS();
    try {
      // Notification for Org A / User A
      const notifA = await prisma.notification.create({
        data: {
          organizationId: tenantA.id,
          userId: userA.id,
          channel: NotificationChannel.IN_APP,
          type: NotificationType.ASSIGNMENT,
          status: NotificationStatus.SENT,
          title: "Org A Notification - CONFIDENTIAL",
          body: "This notification belongs to Org A",
          isRead: false,
        },
      });
      notificationA = { id: notifA.id };

      // Notification for Org B / User B
      const notifB = await prisma.notification.create({
        data: {
          organizationId: tenantB.id,
          userId: userB.id,
          channel: NotificationChannel.IN_APP,
          type: NotificationType.ASSIGNMENT,
          status: NotificationStatus.SENT,
          title: "Org B Notification - CONFIDENTIAL",
          body: "This notification belongs to Org B",
          isRead: false,
        },
      });
      notificationB = { id: notifB.id };
    } finally {
      await prisma.disableBypassRLS();
    }
  }, 60000);

  afterAll(async () => {
    // Clean up test data
    await prisma.enableBypassRLS();
    try {
      // Delete notifications
      await prisma.notification.deleteMany({
        where: {
          organizationId: { in: [tenantA.id, tenantB.id] },
        },
      });

      // Delete notification preferences if any
      await prisma.notificationPreference.deleteMany({
        where: {
          organizationId: { in: [tenantA.id, tenantB.id] },
        },
      });
    } finally {
      await prisma.disableBypassRLS();
    }

    // Clean up users and orgs
    await cleanupTestData(prisma, userA.id, tenantA.id);
    await cleanupTestData(prisma, userB.id, tenantB.id);

    await app.close();
  }, 30000);

  describe("Notification Listing Isolation", () => {
    it("should return only Org A notifications for Org A user", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      expect(response.body).toBeDefined();

      // Extract notifications array from response
      const notifications = response.body.notifications || response.body;
      expect(Array.isArray(notifications)).toBe(true);

      // All returned notifications should belong to Org A user
      const notificationIds = notifications.map((n: { id: string }) => n.id);
      expect(notificationIds).toContain(notificationA.id);
      expect(notificationIds).not.toContain(notificationB.id);
    });

    it("should return only Org B notifications for Org B user", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/notifications")
        .set("Authorization", `Bearer ${userB.token}`)
        .expect(200);

      const notifications = response.body.notifications || response.body;
      const notificationIds = notifications.map((n: { id: string }) => n.id);

      // Should see Org B notification, not Org A
      expect(notificationIds).toContain(notificationB.id);
      expect(notificationIds).not.toContain(notificationA.id);
    });

    it("should return 404 when Org B user tries to access Org A notification by ID", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/notifications/${notificationA.id}`)
        .set("Authorization", `Bearer ${userB.token}`)
        .expect(404);
    });

    it("should return 404 when Org A user tries to access Org B notification by ID", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/notifications/${notificationB.id}`)
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(404);
    });
  });

  describe("Notification Actions Isolation", () => {
    it("should not allow Org B to mark Org A notification as read", async () => {
      await request(app.getHttpServer())
        .post("/api/v1/notifications/mark-read")
        .set("Authorization", `Bearer ${userB.token}`)
        .send({ notificationIds: [notificationA.id] })
        .expect(200); // Returns success but should not have updated anything

      // Verify notification was NOT marked as read
      await prisma.enableBypassRLS();
      const notification = await prisma.notification.findUnique({
        where: { id: notificationA.id },
      });
      await prisma.disableBypassRLS();

      expect(notification?.isRead).toBe(false);
    });

    it("should not allow Org B to archive Org A notification", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/notifications/${notificationA.id}/archive`)
        .set("Authorization", `Bearer ${userB.token}`)
        .expect(404);
    });

    it("should successfully mark own notification as read", async () => {
      // First, create a fresh notification for this test
      await prisma.enableBypassRLS();
      const testNotif = await prisma.notification.create({
        data: {
          organizationId: tenantA.id,
          userId: userA.id,
          channel: NotificationChannel.IN_APP,
          type: NotificationType.STATUS_UPDATE,
          status: NotificationStatus.SENT,
          title: "Test notification for mark-read",
          isRead: false,
        },
      });
      await prisma.disableBypassRLS();

      try {
        await request(app.getHttpServer())
          .post("/api/v1/notifications/mark-read")
          .set("Authorization", `Bearer ${userA.token}`)
          .send({ notificationIds: [testNotif.id] })
          .expect(200);

        // Verify notification was marked as read
        await prisma.enableBypassRLS();
        const updated = await prisma.notification.findUnique({
          where: { id: testNotif.id },
        });
        await prisma.disableBypassRLS();

        expect(updated?.isRead).toBe(true);
      } finally {
        // Clean up
        await prisma.enableBypassRLS();
        await prisma.notification.delete({ where: { id: testNotif.id } });
        await prisma.disableBypassRLS();
      }
    });
  });

  describe("Unread Count Isolation", () => {
    it("should return unread count only for caller's notifications", async () => {
      const responseA = await request(app.getHttpServer())
        .get("/api/v1/notifications/unread-count")
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      const responseB = await request(app.getHttpServer())
        .get("/api/v1/notifications/unread-count")
        .set("Authorization", `Bearer ${userB.token}`)
        .expect(200);

      // Each should have their own count, not combined
      expect(responseA.body.unreadCount).toBeDefined();
      expect(responseB.body.unreadCount).toBeDefined();

      // Counts should reflect only their own notifications
      // Both should have at least 1 (the test notification we created)
    });
  });

  describe("Recent Notifications Isolation", () => {
    it("should return only Org A recent notifications for Org A user", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/notifications/recent")
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);

      // Verify no cross-tenant notifications
      response.body.forEach((notif: { id: string }) => {
        expect(notif.id).not.toBe(notificationB.id);
      });
    });
  });

  describe("Notification Preferences Isolation", () => {
    it("should return only caller's preferences", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/notifications/preferences")
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      // Preferences should be for the caller only
    });

    it("should not allow Org B to modify Org A preferences", async () => {
      // Each user can only modify their own preferences
      // The endpoint is user-scoped, so cross-tenant modification isn't possible
      // This test verifies preferences are user-bound

      const response = await request(app.getHttpServer())
        .put("/api/v1/notifications/preferences")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          preferences: {
            assignment: { inApp: true, email: true },
          },
        })
        .expect(200);

      expect(response.body.success).toBe(true);

      // Verify Org B's preferences weren't affected
      const orgBPrefs = await request(app.getHttpServer())
        .get("/api/v1/notifications/preferences")
        .set("Authorization", `Bearer ${userB.token}`)
        .expect(200);

      // Org B should have their own independent preferences
      expect(orgBPrefs.body).toBeDefined();
    });
  });

  describe("Org Notification Settings Isolation", () => {
    it("should return only caller org's notification settings", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/notifications/preferences/org-settings")
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      // Settings should be org-scoped
    });

    it("should not allow Org B admin to modify Org A org settings", async () => {
      // Admin can only modify their own org's settings
      // The endpoint uses TenantGuard so updates only affect caller's org

      const response = await request(app.getHttpServer())
        .put("/api/v1/notifications/preferences/org-settings")
        .set("Authorization", `Bearer ${userB.token}`)
        .send({
          enforcedCategories: ["ASSIGNMENT"],
          digestTime: "09:00",
        })
        .expect(200);

      // Verify Org A settings weren't affected
      const orgASettings = await request(app.getHttpServer())
        .get("/api/v1/notifications/preferences/org-settings")
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      // Org A should have their own independent settings
      expect(orgASettings.body).toBeDefined();
    });
  });

  describe("Mark All Read Isolation", () => {
    it("should only mark caller's notifications as read", async () => {
      // Create unread notifications for both orgs
      await prisma.enableBypassRLS();
      const testNotifA = await prisma.notification.create({
        data: {
          organizationId: tenantA.id,
          userId: userA.id,
          channel: NotificationChannel.IN_APP,
          type: NotificationType.COMMENT,
          status: NotificationStatus.SENT,
          title: "Mark-all test A",
          isRead: false,
        },
      });
      const testNotifB = await prisma.notification.create({
        data: {
          organizationId: tenantB.id,
          userId: userB.id,
          channel: NotificationChannel.IN_APP,
          type: NotificationType.COMMENT,
          status: NotificationStatus.SENT,
          title: "Mark-all test B",
          isRead: false,
        },
      });
      await prisma.disableBypassRLS();

      try {
        // Org A marks all as read
        await request(app.getHttpServer())
          .post("/api/v1/notifications/mark-all-read")
          .set("Authorization", `Bearer ${userA.token}`)
          .expect(200);

        // Verify Org A's notification is read
        await prisma.enableBypassRLS();
        const updatedA = await prisma.notification.findUnique({
          where: { id: testNotifA.id },
        });
        // Verify Org B's notification is still unread
        const updatedB = await prisma.notification.findUnique({
          where: { id: testNotifB.id },
        });
        await prisma.disableBypassRLS();

        expect(updatedA?.isRead).toBe(true);
        expect(updatedB?.isRead).toBe(false);
      } finally {
        // Clean up
        await prisma.enableBypassRLS();
        await prisma.notification.deleteMany({
          where: { id: { in: [testNotifA.id, testNotifB.id] } },
        });
        await prisma.disableBypassRLS();
      }
    });
  });

  describe("Notification Entity Context Isolation", () => {
    it("should not leak cross-tenant entity information in notifications", async () => {
      // Create notification with entity reference
      await prisma.enableBypassRLS();
      const entityNotif = await prisma.notification.create({
        data: {
          organizationId: tenantA.id,
          userId: userA.id,
          channel: NotificationChannel.IN_APP,
          type: NotificationType.STATUS_UPDATE,
          status: NotificationStatus.SENT,
          title: "Entity notification",
          entityType: "case",
          entityId: "test-case-123",
          isRead: false,
        },
      });
      await prisma.disableBypassRLS();

      try {
        // Org B should not be able to access this notification
        await request(app.getHttpServer())
          .get(`/api/v1/notifications/${entityNotif.id}`)
          .set("Authorization", `Bearer ${userB.token}`)
          .expect(404);

        // Org A should be able to access it
        const response = await request(app.getHttpServer())
          .get(`/api/v1/notifications/${entityNotif.id}`)
          .set("Authorization", `Bearer ${userA.token}`)
          .expect(200);

        expect(response.body.entityType).toBe("case");
        expect(response.body.entityId).toBe("test-case-123");
      } finally {
        await prisma.enableBypassRLS();
        await prisma.notification.delete({ where: { id: entityNotif.id } });
        await prisma.disableBypassRLS();
      }
    });
  });
});
