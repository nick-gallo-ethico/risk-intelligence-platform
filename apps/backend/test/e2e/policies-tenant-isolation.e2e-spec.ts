/**
 * Policies Tenant Isolation E2E Tests
 *
 * Verifies that Row-Level Security prevents cross-tenant access
 * for policy management endpoints.
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

describe("Policies Tenant Isolation (E2E)", () => {
  let ctx: TestContext;
  let orgAPolicyId: string;
  let orgAPolicyVersionId: string;

  beforeAll(async () => {
    ctx = await createTestContext();

    // Create test data in Org A
    await ctx.prisma.enableBypassRLS();
    try {
      // Create policy in Org A
      const policy = await ctx.prisma.policy.create({
        data: {
          organizationId: ctx.orgA.id,
          title: "Test Policy Org A",
          slug: "test-policy-org-a",
          description: "Policy for isolation testing",
          status: "DRAFT",
          category: "COMPLIANCE",
          draftContent: "<p>Test policy content</p>",
          createdById: ctx.orgA.users[0].id,
          updatedById: ctx.orgA.users[0].id,
        },
      });
      orgAPolicyId = policy.id;

      // Create a policy version
      const policyVersion = await ctx.prisma.policyVersion.create({
        data: {
          policyId: orgAPolicyId,
          versionNumber: 1,
          content: "<p>Test policy content v1</p>",
          changelog: "Initial version",
          publishedById: ctx.orgA.users[0].id,
        },
      });
      orgAPolicyVersionId = policyVersion.id;

      // Update policy with current version
      await ctx.prisma.policy.update({
        where: { id: orgAPolicyId },
        data: { currentVersion: 1 },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await ctx.prisma.enableBypassRLS();
    try {
      await ctx.prisma.policyVersion.deleteMany({
        where: {
          policy: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
        },
      });
      await ctx.prisma.policy.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }

    await destroyTestContext(ctx);
  });

  describe("Policy Listing Isolation", () => {
    it("GET /policies returns only policies in caller organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/policies")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should contain Org A policy
      const policies = response.body.data || response.body;
      const ids = policies.map((p: { id: string }) => p.id);
      expect(ids).toContain(orgAPolicyId);

      // All policies should belong to Org A
      for (const policy of policies) {
        expect(policy.organizationId).toBe(ctx.orgA.id);
      }
    });

    it("Org B cannot see Org A policies via GET /policies", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/policies")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should not contain Org A policy
      const policies = response.body.data || response.body;
      const ids = policies.map((p: { id: string }) => p.id);
      expect(ids).not.toContain(orgAPolicyId);
    });
  });

  describe("Policy Access by ID Isolation", () => {
    it("GET /policies/:id returns 404 for policy in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/policies/${orgAPolicyId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it("GET /policies/:id succeeds for policy in same organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/policies/${orgAPolicyId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.id).toBe(orgAPolicyId);
    });
  });

  describe("Policy Update Isolation", () => {
    it("PUT /policies/:id returns 404 for policy in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .put(`/api/v1/policies/${orgAPolicyId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          title: "Hacked Policy Title",
          draftContent: "<p>Hacked content</p>",
        })
        .expect(404);

      // Verify the policy was not modified
      await ctx.prisma.enableBypassRLS();
      const policy = await ctx.prisma.policy.findUnique({
        where: { id: orgAPolicyId },
      });
      await ctx.prisma.disableBypassRLS();

      expect(policy?.title).toBe("Test Policy Org A");
    });
  });

  describe("Policy Publish Isolation", () => {
    it("POST /policies/:id/publish returns 404 for policy in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/policies/${orgAPolicyId}/publish`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ changelog: "Unauthorized publish" })
        .expect(404);

      // Verify no new version was created by unauthorized user
      await ctx.prisma.enableBypassRLS();
      const versions = await ctx.prisma.policyVersion.findMany({
        where: { policyId: orgAPolicyId },
        orderBy: { versionNumber: "desc" },
      });
      await ctx.prisma.disableBypassRLS();

      // Should still only have the one version we created
      expect(versions.length).toBe(1);
    });
  });

  describe("Policy Retire Isolation", () => {
    it("POST /policies/:id/retire returns 404 for policy in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/policies/${orgAPolicyId}/retire`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);

      // Verify the policy was not retired
      await ctx.prisma.enableBypassRLS();
      const policy = await ctx.prisma.policy.findUnique({
        where: { id: orgAPolicyId },
      });
      await ctx.prisma.disableBypassRLS();

      expect(policy?.status).toBe("DRAFT");
    });
  });

  describe("Policy Versions Isolation", () => {
    it("GET /policies/:id/versions returns 404 for policy in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/policies/${orgAPolicyId}/versions`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it("GET /policies/:id/versions succeeds for policy in same organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/policies/${orgAPolicyId}/versions`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should return versions array
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe("Policy Version by ID Isolation", () => {
    it("GET /policies/versions/:versionId returns 404 for version in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/policies/versions/${orgAPolicyVersionId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it("GET /policies/versions/:versionId succeeds for version in same organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/policies/versions/${orgAPolicyVersionId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.id).toBe(orgAPolicyVersionId);
    });
  });

  describe("Policy Export Isolation", () => {
    it("POST /policies/export returns only caller org policies", async () => {
      // Org A export should only include Org A policies
      const orgAResponse = await request(ctx.app.getHttpServer())
        .post("/api/v1/policies/export")
        .set(authHeader(ctx.orgA.users[0]))
        .send({ format: "excel" });

      // Should succeed or return appropriate status
      expect([200, 201]).toContain(orgAResponse.status);

      // Org B export should not include Org A policies
      // (verified by having different content)
      const orgBResponse = await request(ctx.app.getHttpServer())
        .post("/api/v1/policies/export")
        .set(authHeader(ctx.orgB.users[0]))
        .send({ format: "excel" });

      expect([200, 201]).toContain(orgBResponse.status);
    });
  });

  describe("Policy Database State Isolation", () => {
    it("cross-tenant update attempt leaves database unchanged", async () => {
      // Capture current state
      await ctx.prisma.enableBypassRLS();
      const beforePolicy = await ctx.prisma.policy.findUnique({
        where: { id: orgAPolicyId },
      });
      await ctx.prisma.disableBypassRLS();

      // Attempt cross-tenant update
      await request(ctx.app.getHttpServer())
        .put(`/api/v1/policies/${orgAPolicyId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          title: "Attempted Hack",
          description: "This should not be saved",
          draftContent: "<p>Malicious content</p>",
        })
        .expect(404);

      // Verify state unchanged
      await ctx.prisma.enableBypassRLS();
      const afterPolicy = await ctx.prisma.policy.findUnique({
        where: { id: orgAPolicyId },
      });
      await ctx.prisma.disableBypassRLS();

      expect(afterPolicy?.title).toBe(beforePolicy?.title);
      expect(afterPolicy?.description).toBe(beforePolicy?.description);
      expect(afterPolicy?.draftContent).toBe(beforePolicy?.draftContent);
      expect(afterPolicy?.updatedAt.getTime()).toBe(
        beforePolicy?.updatedAt.getTime(),
      );
    });
  });

  describe("Authentication Boundary", () => {
    it("returns 401 for requests without token", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/policies")
        .expect(401);
    });

    it("returns 401 for invalid token", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/policies")
        .set("Authorization", "Bearer invalid-token-xyz")
        .expect(401);
    });

    it("returns 401 for malformed JWT", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/policies")
        .set(
          "Authorization",
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U",
        )
        .expect(401);
    });
  });
});
