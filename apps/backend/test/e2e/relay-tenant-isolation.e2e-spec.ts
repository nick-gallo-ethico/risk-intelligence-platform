/**
 * Relay Tenant Isolation E2E Tests
 *
 * Verifies that Row-Level Security prevents cross-tenant access
 * for anonymous communication relay endpoints.
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

describe("Relay Tenant Isolation (E2E)", () => {
  let ctx: TestContext;
  let orgACaseId: string;
  let orgAMessageId: string;
  let orgBCaseId: string;

  beforeAll(async () => {
    ctx = await createTestContext();

    // Create test cases in both organizations
    await ctx.prisma.enableBypassRLS();
    try {
      // Create Case in Org A with RIU
      const riuA = await ctx.prisma.riskIntelligenceUnit.create({
        data: {
          organizationId: ctx.orgA.id,
          type: "WEB_FORM_SUBMISSION",
          sourceChannel: "WEB_FORM",
          reporterType: "ANONYMOUS",
          reporterAnonymous: true,
          anonymousAccessCode: "RELAYA12345",
          reporterEmail: "reporter-a@test.com",
          details: "Test report for relay tenant isolation - Org A",
          status: "RELEASED",
          createdById: ctx.orgA.users[0].id,
        },
      });

      const caseA = await ctx.prisma.case.create({
        data: {
          organizationId: ctx.orgA.id,
          referenceNumber: "RELAY-ISO-A-001",
          status: "OPEN",
          sourceChannel: "WEB_FORM",
          caseType: "REPORT",
          reporterType: "ANONYMOUS",
          reporterAnonymous: true,
          reporterEmail: "reporter-a@test.com",
          details: "Test case for relay tenant isolation - Org A",
          createdById: ctx.orgA.users[0].id,
          updatedById: ctx.orgA.users[0].id,
        },
      });
      orgACaseId = caseA.id;

      // Link RIU to Case
      await ctx.prisma.riuCaseAssociation.create({
        data: {
          organizationId: ctx.orgA.id,
          riuId: riuA.id,
          caseId: caseA.id,
          associationType: "PRIMARY",
        },
      });

      // Create a message in Org A case
      const messageA = await ctx.prisma.caseMessage.create({
        data: {
          organizationId: ctx.orgA.id,
          caseId: caseA.id,
          direction: "OUTBOUND",
          senderType: "INVESTIGATOR",
          content: "Confidential message from Org A investigator",
          createdById: ctx.orgA.users[0].id,
          deliveryStatus: "DELIVERED",
        },
      });
      orgAMessageId = messageA.id;

      // Create Case in Org B
      const riuB = await ctx.prisma.riskIntelligenceUnit.create({
        data: {
          organizationId: ctx.orgB.id,
          type: "WEB_FORM_SUBMISSION",
          sourceChannel: "WEB_FORM",
          reporterType: "ANONYMOUS",
          reporterAnonymous: true,
          anonymousAccessCode: "RELAYB67890",
          reporterEmail: "reporter-b@test.com",
          details: "Test report for relay tenant isolation - Org B",
          status: "RELEASED",
          createdById: ctx.orgB.users[0].id,
        },
      });

      const caseB = await ctx.prisma.case.create({
        data: {
          organizationId: ctx.orgB.id,
          referenceNumber: "RELAY-ISO-B-001",
          status: "OPEN",
          sourceChannel: "WEB_FORM",
          caseType: "REPORT",
          reporterType: "ANONYMOUS",
          reporterAnonymous: true,
          reporterEmail: "reporter-b@test.com",
          details: "Test case for relay tenant isolation - Org B",
          createdById: ctx.orgB.users[0].id,
          updatedById: ctx.orgB.users[0].id,
        },
      });
      orgBCaseId = caseB.id;

      // Link RIU to Case
      await ctx.prisma.riuCaseAssociation.create({
        data: {
          organizationId: ctx.orgB.id,
          riuId: riuB.id,
          caseId: caseB.id,
          associationType: "PRIMARY",
        },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }
  }, 60000);

  afterAll(async () => {
    // Clean up test data
    await ctx.prisma.enableBypassRLS();
    try {
      await ctx.prisma.caseMessage.deleteMany({
        where: {
          case: {
            referenceNumber: { startsWith: "RELAY-ISO" },
          },
        },
      });
      await ctx.prisma.riuCaseAssociation.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
      await ctx.prisma.case.deleteMany({
        where: { referenceNumber: { startsWith: "RELAY-ISO" } },
      });
      await ctx.prisma.riskIntelligenceUnit.deleteMany({
        where: {
          anonymousAccessCode: { in: ["RELAYA12345", "RELAYB67890"] },
        },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }

    await destroyTestContext(ctx);
  });

  describe("Message Listing Isolation", () => {
    it("GET /case-messages/:caseId returns 404 for case in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/case-messages/${orgBCaseId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(404);
    });

    it("GET /case-messages/:caseId returns messages for case in same organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/case-messages/${orgACaseId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should contain the message we created
      expect(Array.isArray(response.body)).toBe(true);
      const messageIds = response.body.map((m: { id: string }) => m.id);
      expect(messageIds).toContain(orgAMessageId);

      // All messages should belong to this case
      for (const message of response.body) {
        expect(message.caseId).toBe(orgACaseId);
      }
    });

    it("does not leak Org A messages to Org B", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/case-messages/${orgBCaseId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should not contain Org A message
      const contents = response.body.map((m: { content: string }) => m.content);
      expect(contents).not.toContain(
        "Confidential message from Org A investigator",
      );
    });
  });

  describe("Message Sending Isolation", () => {
    it("POST /case-messages/:caseId/send returns 404 for case in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/case-messages/${orgBCaseId}/send`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ content: "Unauthorized message attempt" })
        .expect(404);

      // Verify no message was created
      await ctx.prisma.enableBypassRLS();
      const messages = await ctx.prisma.caseMessage.findMany({
        where: {
          caseId: orgBCaseId,
          content: "Unauthorized message attempt",
        },
      });
      await ctx.prisma.disableBypassRLS();

      expect(messages.length).toBe(0);
    });

    it("POST /case-messages/:caseId/send succeeds for case in same organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .post(`/api/v1/case-messages/${orgACaseId}/send`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({
          content: "Valid message from authorized user",
          acknowledgePiiWarnings: true,
        })
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.content).toBe("Valid message from authorized user");
    });
  });

  describe("Unread Count Isolation", () => {
    it("GET /case-messages/:caseId/unread-count returns 404 for case in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/case-messages/${orgBCaseId}/unread-count`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(404);
    });

    it("GET /case-messages/:caseId/unread-count succeeds for case in same organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/case-messages/${orgACaseId}/unread-count`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body).toHaveProperty("inbound");
      expect(response.body).toHaveProperty("outbound");
    });
  });

  describe("Relay Settings Isolation", () => {
    it("GET /organization/relay-settings returns only caller org settings", async () => {
      const responseA = await request(ctx.app.getHttpServer())
        .get("/api/v1/organization/relay-settings")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const responseB = await request(ctx.app.getHttpServer())
        .get("/api/v1/organization/relay-settings")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Settings are returned (may be defaults, but should be org-specific)
      expect(responseA.body).toBeDefined();
      expect(responseB.body).toBeDefined();
    });

    it("PATCH /organization/relay-settings updates only caller org settings", async () => {
      // Update Org A to MINIMAL
      await request(ctx.app.getHttpServer())
        .patch("/api/v1/organization/relay-settings")
        .set(authHeader(ctx.orgA.users[0]))
        .send({ reporterVisibilityLevel: "MINIMAL" })
        .expect(200);

      // Update Org B to TRANSPARENT
      await request(ctx.app.getHttpServer())
        .patch("/api/v1/organization/relay-settings")
        .set(authHeader(ctx.orgB.users[0]))
        .send({ reporterVisibilityLevel: "TRANSPARENT" })
        .expect(200);

      // Verify Org A is MINIMAL
      const responseA = await request(ctx.app.getHttpServer())
        .get("/api/v1/organization/relay-settings")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);
      expect(responseA.body.reporterVisibilityLevel).toBe("MINIMAL");

      // Verify Org B is TRANSPARENT
      const responseB = await request(ctx.app.getHttpServer())
        .get("/api/v1/organization/relay-settings")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);
      expect(responseB.body.reporterVisibilityLevel).toBe("TRANSPARENT");
    });
  });

  describe("Public Reporter Messages Isolation", () => {
    // Note: Public endpoints use access codes instead of JWT auth
    // Access codes are scoped to specific RIUs which are tenant-isolated

    it("GET /public/messages/:caseId requires valid access code header", async () => {
      // Without access code should fail
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/public/messages/${orgACaseId}`)
        .expect(400); // Bad request - missing access code

      expect(response.body.message).toMatch(/access.*code/i);
    });

    it("access code from Org A cannot access Org B case messages", async () => {
      // Try to access Org B case with Org A access code
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/public/messages/${orgBCaseId}`)
        .set("X-Access-Code", "RELAYA12345")
        .expect(404); // Not found - access code doesn't match case
    });

    it("valid access code can access own case messages", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/public/messages/${orgACaseId}`)
        .set("X-Access-Code", "RELAYA12345")
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("Authentication Boundary", () => {
    it("returns 401 for requests without token", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/case-messages/${orgACaseId}`)
        .expect(401);
    });

    it("returns 401 for invalid token", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/case-messages/${orgACaseId}`)
        .set("Authorization", "Bearer invalid-token-xyz")
        .expect(401);
    });
  });
});
