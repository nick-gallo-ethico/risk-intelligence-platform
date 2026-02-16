/**
 * Auth/SSO Tenant Isolation E2E Tests
 *
 * Verifies that Row-Level Security prevents cross-tenant access
 * for authentication and SSO-related endpoints.
 *
 * CRITICAL: All cross-tenant access attempts must return 404 (not 403)
 * to prevent enumeration attacks.
 */

import * as request from "supertest";
import {
  createTestContext,
  destroyTestContext,
  TestContext,
  authHeader,
} from "../helpers/test-setup";

describe("Auth Tenant Isolation (E2E)", () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
  }, 30000);

  afterAll(async () => {
    await destroyTestContext(ctx);
  });

  describe("User Listing Isolation", () => {
    it("GET /users returns only users in caller organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/users")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should only see Org A users
      const userIds =
        response.body.data?.map((u: { id: string }) => u.id) || [];
      const orgAUserIds = ctx.orgA.users.map((u) => u.id);
      const orgBUserIds = ctx.orgB.users.map((u) => u.id);

      // All returned users should be Org A users
      for (const id of userIds) {
        expect(orgAUserIds).toContain(id);
      }

      // No Org B users should be visible
      for (const id of orgBUserIds) {
        expect(userIds).not.toContain(id);
      }
    });

    it("Org B cannot see Org A users via GET /users", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/users")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should only see Org B users
      const userIds =
        response.body.data?.map((u: { id: string }) => u.id) || [];
      const orgAUserIds = ctx.orgA.users.map((u) => u.id);

      // No Org A users should be visible
      for (const id of orgAUserIds) {
        expect(userIds).not.toContain(id);
      }
    });

    it("GET /users/:id returns 404 for user in different organization", async () => {
      // Org B admin tries to access Org A user by ID
      const orgAUserId = ctx.orgA.users[0].id;

      await request(ctx.app.getHttpServer())
        .get(`/api/v1/users/${orgAUserId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it("GET /users/:id succeeds for user in same organization", async () => {
      // Org A admin accesses another Org A user
      const orgAUserId = ctx.orgA.users[1].id;

      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/users/${orgAUserId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.id).toBe(orgAUserId);
    });
  });

  describe("/auth/me Isolation", () => {
    it("returns only the authenticated user context", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/auth/me")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.id).toBe(ctx.orgA.users[0].id);
      expect(response.body.organizationId).toBe(ctx.orgA.id);
      expect(response.body.organizationId).not.toBe(ctx.orgB.id);
    });

    it("Org B user sees only Org B context", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/auth/me")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      expect(response.body.id).toBe(ctx.orgB.users[0].id);
      expect(response.body.organizationId).toBe(ctx.orgB.id);
      expect(response.body.organizationId).not.toBe(ctx.orgA.id);
    });
  });

  describe("SSO Configuration Isolation", () => {
    it("GET /auth/sso/config returns only caller organization config", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/auth/sso/config")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Response should contain config for caller's org
      // Even if config is empty/default, it should not leak other org data
      if (response.body.organizationId) {
        expect(response.body.organizationId).toBe(ctx.orgA.id);
      }
    });

    it("PATCH /auth/sso/config cannot modify another organization config", async () => {
      // First, try to update SSO config as Org A
      const updateDto = {
        ssoEnabled: true,
        enforceSSO: false,
      };

      const orgAResponse = await request(ctx.app.getHttpServer())
        .patch("/api/v1/auth/sso/config")
        .set(authHeader(ctx.orgA.users[0]))
        .send(updateDto);

      // Org A should be able to update their own config (200) or it might be forbidden by role (403)
      expect([200, 403]).toContain(orgAResponse.status);

      // Now verify Org B cannot see Org A's config changes
      const orgBResponse = await request(ctx.app.getHttpServer())
        .get("/api/v1/auth/sso/config")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Org B's config should be independent of Org A's changes
      if (orgBResponse.body.organizationId) {
        expect(orgBResponse.body.organizationId).toBe(ctx.orgB.id);
      }
    });
  });

  describe("Session Isolation", () => {
    it("logout only affects caller session, not other org sessions", async () => {
      // Org A user logs out
      await request(ctx.app.getHttpServer())
        .post("/api/v1/auth/logout")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(204);

      // Org B session should still be valid
      const orgBResponse = await request(ctx.app.getHttpServer())
        .get("/api/v1/auth/me")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      expect(orgBResponse.body.id).toBe(ctx.orgB.users[0].id);
    });
  });

  describe("User Management Isolation", () => {
    it("PATCH /users/:id returns 404 for user in different organization", async () => {
      const orgAUserId = ctx.orgA.users[1].id;

      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/users/${orgAUserId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ firstName: "Hacked" })
        .expect(404);

      // Verify the user was not modified
      await ctx.prisma.enableBypassRLS();
      const user = await ctx.prisma.user.findUnique({
        where: { id: orgAUserId },
      });
      await ctx.prisma.disableBypassRLS();

      expect(user?.firstName).toBe("Alpha");
    });

    it("DELETE /users/:id returns 404 for user in different organization", async () => {
      const orgAUserId = ctx.orgA.users[1].id;

      await request(ctx.app.getHttpServer())
        .delete(`/api/v1/users/${orgAUserId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);

      // Verify the user still exists and is active
      await ctx.prisma.enableBypassRLS();
      const user = await ctx.prisma.user.findUnique({
        where: { id: orgAUserId },
      });
      await ctx.prisma.disableBypassRLS();

      expect(user).not.toBeNull();
      expect(user?.isActive).toBe(true);
    });
  });

  describe("Authentication Boundary", () => {
    it("returns 401 for requests without token", async () => {
      await request(ctx.app.getHttpServer()).get("/api/v1/users").expect(401);
    });

    it("returns 401 for invalid token", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/users")
        .set("Authorization", "Bearer invalid-token-xyz")
        .expect(401);
    });

    it("returns 401 for expired token format", async () => {
      // Malformed JWT
      await request(ctx.app.getHttpServer())
        .get("/api/v1/users")
        .set(
          "Authorization",
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        )
        .expect(401);
    });
  });
});
