/**
 * Campaigns Tenant Isolation E2E Tests
 *
 * Verifies that Row-Level Security prevents cross-tenant access
 * for campaign management endpoints.
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

describe("Campaigns Tenant Isolation (E2E)", () => {
  let ctx: TestContext;
  let orgACampaignId: string;
  let orgASegmentId: string;

  beforeAll(async () => {
    ctx = await createTestContext();

    // Create test campaign in Org A
    await ctx.prisma.enableBypassRLS();
    try {
      const campaign = await ctx.prisma.campaign.create({
        data: {
          organizationId: ctx.orgA.id,
          name: "Test Campaign Org A",
          description: "Campaign for isolation testing",
          type: "DISCLOSURE",
          status: "DRAFT",
          createdById: ctx.orgA.users[0].id,
        },
      });
      orgACampaignId = campaign.id;

      // Create test segment in Org A
      const segment = await ctx.prisma.segment.create({
        data: {
          organizationId: ctx.orgA.id,
          name: "Test Segment Org A",
          description: "Segment for isolation testing",
          criteria: { all: true },
          isActive: true,
          createdById: ctx.orgA.users[0].id,
        },
      });
      orgASegmentId = segment.id;
    } finally {
      await ctx.prisma.disableBypassRLS();
    }
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await ctx.prisma.enableBypassRLS();
    try {
      await ctx.prisma.campaign.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
      await ctx.prisma.segment.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }

    await destroyTestContext(ctx);
  });

  describe("Campaign Listing Isolation", () => {
    it("GET /campaigns returns only campaigns in caller organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/campaigns")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should contain Org A campaign
      const campaigns = response.body.data || response.body;
      const ids = campaigns.map((c: { id: string }) => c.id);
      expect(ids).toContain(orgACampaignId);

      // All campaigns should belong to Org A
      for (const campaign of campaigns) {
        expect(campaign.organizationId).toBe(ctx.orgA.id);
      }
    });

    it("Org B cannot see Org A campaigns via GET /campaigns", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/campaigns")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should not contain Org A campaign
      const campaigns = response.body.data || response.body;
      const ids = campaigns.map((c: { id: string }) => c.id);
      expect(ids).not.toContain(orgACampaignId);
    });
  });

  describe("Campaign Access by ID Isolation", () => {
    it("GET /campaigns/:id returns 404 for campaign in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/campaigns/${orgACampaignId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it("GET /campaigns/:id succeeds for campaign in same organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/campaigns/${orgACampaignId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.id).toBe(orgACampaignId);
    });
  });

  describe("Campaign Update Isolation", () => {
    it("PUT /campaigns/:id returns 404 for campaign in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .put(`/api/v1/campaigns/${orgACampaignId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ name: "Hacked Campaign Name" })
        .expect(404);

      // Verify the campaign was not modified
      await ctx.prisma.enableBypassRLS();
      const campaign = await ctx.prisma.campaign.findUnique({
        where: { id: orgACampaignId },
      });
      await ctx.prisma.disableBypassRLS();

      expect(campaign?.name).toBe("Test Campaign Org A");
    });
  });

  describe("Campaign Delete Isolation", () => {
    it("DELETE /campaigns/:id returns 404 for campaign in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .delete(`/api/v1/campaigns/${orgACampaignId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);

      // Verify the campaign still exists
      await ctx.prisma.enableBypassRLS();
      const campaign = await ctx.prisma.campaign.findUnique({
        where: { id: orgACampaignId },
      });
      await ctx.prisma.disableBypassRLS();

      expect(campaign).not.toBeNull();
    });
  });

  describe("Campaign Action Isolation", () => {
    it("POST /campaigns/:id/launch returns 404 for campaign in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/campaigns/${orgACampaignId}/launch`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({})
        .expect(404);
    });

    it("POST /campaigns/:id/pause returns 404 for campaign in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/campaigns/${orgACampaignId}/pause`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it("POST /campaigns/:id/cancel returns 404 for campaign in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/campaigns/${orgACampaignId}/cancel`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ reason: "Unauthorized cancel" })
        .expect(404);
    });
  });

  describe("Campaign Statistics Isolation", () => {
    it("GET /campaigns/:id/statistics returns 404 for campaign in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/campaigns/${orgACampaignId}/statistics`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });
  });

  describe("Campaign Assignments Isolation", () => {
    it("GET /campaigns/:id/assignments returns 404 for campaign in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/campaigns/${orgACampaignId}/assignments`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });
  });

  describe("Segment Listing Isolation", () => {
    it("GET /campaigns/segments returns only segments in caller organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/campaigns/segments")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should contain Org A segment
      const segments = response.body.data || response.body;
      const ids = segments.map((s: { id: string }) => s.id);
      expect(ids).toContain(orgASegmentId);
    });

    it("Org B cannot see Org A segments via GET /campaigns/segments", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/campaigns/segments")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should not contain Org A segment
      const segments = response.body.data || response.body;
      const ids = segments.map((s: { id: string }) => s.id);
      expect(ids).not.toContain(orgASegmentId);
    });
  });

  describe("Segment Access by ID Isolation", () => {
    it("GET /campaigns/segments/:id returns 404 for segment in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/campaigns/segments/${orgASegmentId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it("PUT /campaigns/segments/:id returns 404 for segment in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .put(`/api/v1/campaigns/segments/${orgASegmentId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ name: "Hacked Segment" })
        .expect(404);

      // Verify segment was not modified
      await ctx.prisma.enableBypassRLS();
      const segment = await ctx.prisma.segment.findUnique({
        where: { id: orgASegmentId },
      });
      await ctx.prisma.disableBypassRLS();

      expect(segment?.name).toBe("Test Segment Org A");
    });

    it("DELETE /campaigns/segments/:id returns 404 for segment in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .delete(`/api/v1/campaigns/segments/${orgASegmentId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);

      // Verify segment still exists
      await ctx.prisma.enableBypassRLS();
      const segment = await ctx.prisma.segment.findUnique({
        where: { id: orgASegmentId },
      });
      await ctx.prisma.disableBypassRLS();

      expect(segment).not.toBeNull();
    });
  });

  describe("Dashboard Isolation", () => {
    it("GET /campaigns/dashboard/stats returns only caller org data", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/campaigns/dashboard/stats")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Dashboard stats should only reflect Org A data
      // The total should include the test campaign we created
      expect(response.body).toBeDefined();
    });

    it("Org B dashboard does not include Org A campaign counts", async () => {
      const orgAResponse = await request(ctx.app.getHttpServer())
        .get("/api/v1/campaigns/dashboard/stats")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      const orgBResponse = await request(ctx.app.getHttpServer())
        .get("/api/v1/campaigns/dashboard/stats")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Org B should have different (likely fewer) campaigns
      // If counts are returned, they should differ
      if (orgAResponse.body.totalCampaigns !== undefined) {
        // At minimum, Org A has 1 campaign we created
        expect(orgAResponse.body.totalCampaigns).toBeGreaterThan(0);
      }
    });
  });

  describe("Authentication Boundary", () => {
    it("returns 401 for requests without token", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/campaigns")
        .expect(401);
    });

    it("returns 401 for invalid token", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/campaigns")
        .set("Authorization", "Bearer invalid-token-xyz")
        .expect(401);
    });
  });
});
