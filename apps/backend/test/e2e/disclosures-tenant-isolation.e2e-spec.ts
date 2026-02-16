/**
 * Disclosures Tenant Isolation E2E Tests
 *
 * Verifies that Row-Level Security prevents cross-tenant access
 * for disclosure form templates and conflict management endpoints.
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

describe("Disclosures Tenant Isolation (E2E)", () => {
  let ctx: TestContext;
  let orgAFormTemplateId: string;
  let orgAConflictAlertId: string;
  let orgAExclusionId: string;
  let orgAPersonId: string;

  beforeAll(async () => {
    ctx = await createTestContext();

    // Create test data in Org A
    await ctx.prisma.enableBypassRLS();
    try {
      // Create disclosure form template in Org A
      const formTemplate = await ctx.prisma.disclosureFormTemplate.create({
        data: {
          organizationId: ctx.orgA.id,
          name: "Test Form Template Org A",
          description: "Form template for isolation testing",
          fields: [
            {
              id: "field1",
              type: "text",
              label: "Test Field",
              required: true,
            },
          ],
          status: "DRAFT",
          version: 1,
          createdById: ctx.orgA.users[0].id,
        },
      });
      orgAFormTemplateId = formTemplate.id;

      // Create a person for conflict testing
      const person = await ctx.prisma.person.create({
        data: {
          organizationId: ctx.orgA.id,
          firstName: "Test",
          lastName: "Person",
          email: "testperson@testalpha.local",
        },
      });
      orgAPersonId = person.id;

      // Create conflict alert in Org A
      const conflictAlert = await ctx.prisma.conflictAlert.create({
        data: {
          organizationId: ctx.orgA.id,
          conflictType: "SELF_DEALING",
          severity: "HIGH",
          status: "PENDING",
          personId: orgAPersonId,
          description: "Test conflict for isolation testing",
          matchedEntityName: "Test Company",
          confidence: 0.95,
        },
      });
      orgAConflictAlertId = conflictAlert.id;

      // Create conflict exclusion in Org A
      const exclusion = await ctx.prisma.conflictExclusion.create({
        data: {
          organizationId: ctx.orgA.id,
          personId: orgAPersonId,
          conflictType: "SELF_DEALING",
          reason: "Pre-approved exception for testing",
          isActive: true,
          createdById: ctx.orgA.users[0].id,
        },
      });
      orgAExclusionId = exclusion.id;
    } finally {
      await ctx.prisma.disableBypassRLS();
    }
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await ctx.prisma.enableBypassRLS();
    try {
      await ctx.prisma.conflictExclusion.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
      await ctx.prisma.conflictAlert.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
      await ctx.prisma.person.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
      await ctx.prisma.disclosureFormTemplate.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }

    await destroyTestContext(ctx);
  });

  describe("Form Template Listing Isolation", () => {
    it("GET /disclosure-forms returns only templates in caller organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/disclosure-forms")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should contain Org A template
      const templates = response.body.data || response.body;
      const ids = templates.map((t: { id: string }) => t.id);
      expect(ids).toContain(orgAFormTemplateId);
    });

    it("Org B cannot see Org A templates via GET /disclosure-forms", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/disclosure-forms")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should not contain Org A template
      const templates = response.body.data || response.body;
      const ids = templates.map((t: { id: string }) => t.id);
      expect(ids).not.toContain(orgAFormTemplateId);
    });
  });

  describe("Form Template Access by ID Isolation", () => {
    it("GET /disclosure-forms/:id returns 404 for template in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/disclosure-forms/${orgAFormTemplateId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it("GET /disclosure-forms/:id succeeds for template in same organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/disclosure-forms/${orgAFormTemplateId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.id).toBe(orgAFormTemplateId);
    });
  });

  describe("Form Template Update Isolation", () => {
    it("PUT /disclosure-forms/:id returns 404 for template in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .put(`/api/v1/disclosure-forms/${orgAFormTemplateId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ name: "Hacked Template Name" })
        .expect(404);

      // Verify the template was not modified
      await ctx.prisma.enableBypassRLS();
      const template = await ctx.prisma.disclosureFormTemplate.findUnique({
        where: { id: orgAFormTemplateId },
      });
      await ctx.prisma.disableBypassRLS();

      expect(template?.name).toBe("Test Form Template Org A");
    });
  });

  describe("Form Template Delete Isolation", () => {
    it("DELETE /disclosure-forms/:id returns 404 for template in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .delete(`/api/v1/disclosure-forms/${orgAFormTemplateId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);

      // Verify the template still exists
      await ctx.prisma.enableBypassRLS();
      const template = await ctx.prisma.disclosureFormTemplate.findUnique({
        where: { id: orgAFormTemplateId },
      });
      await ctx.prisma.disableBypassRLS();

      expect(template).not.toBeNull();
    });
  });

  describe("Form Template Action Isolation", () => {
    it("POST /disclosure-forms/:id/publish returns 404 for template in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/disclosure-forms/${orgAFormTemplateId}/publish`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ changelog: "Unauthorized publish" })
        .expect(404);
    });

    it("POST /disclosure-forms/:id/clone returns 404 for template in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/disclosure-forms/${orgAFormTemplateId}/clone`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ name: "Cloned Template" })
        .expect(404);
    });

    it("POST /disclosure-forms/:id/archive returns 404 for template in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/disclosure-forms/${orgAFormTemplateId}/archive`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });
  });

  describe("Form Template Versions Isolation", () => {
    it("GET /disclosure-forms/:id/versions returns 404 for template in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/disclosure-forms/${orgAFormTemplateId}/versions`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it("GET /disclosure-forms/:id/translations returns 404 for template in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/disclosure-forms/${orgAFormTemplateId}/translations`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });
  });

  describe("Conflict Alert Listing Isolation", () => {
    it("GET /conflicts returns only conflicts in caller organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/conflicts")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should contain Org A conflict
      const conflicts =
        response.body.items || response.body.data || response.body;
      const ids = conflicts.map((c: { id: string }) => c.id);
      expect(ids).toContain(orgAConflictAlertId);
    });

    it("Org B cannot see Org A conflicts via GET /conflicts", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/conflicts")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should not contain Org A conflict
      const conflicts =
        response.body.items || response.body.data || response.body;
      const ids = conflicts.map((c: { id: string }) => c.id);
      expect(ids).not.toContain(orgAConflictAlertId);
    });
  });

  describe("Conflict Alert Access by ID Isolation", () => {
    it("GET /conflicts/:id returns 404 for conflict in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/conflicts/${orgAConflictAlertId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it("GET /conflicts/:id succeeds for conflict in same organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/conflicts/${orgAConflictAlertId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.id).toBe(orgAConflictAlertId);
    });
  });

  describe("Conflict Alert Action Isolation", () => {
    it("POST /conflicts/:id/dismiss returns 404 for conflict in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/conflicts/${orgAConflictAlertId}/dismiss`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          category: "FALSE_POSITIVE",
          reason: "Unauthorized dismissal",
        })
        .expect(404);

      // Verify the conflict was not dismissed
      await ctx.prisma.enableBypassRLS();
      const conflict = await ctx.prisma.conflictAlert.findUnique({
        where: { id: orgAConflictAlertId },
      });
      await ctx.prisma.disableBypassRLS();

      expect(conflict?.status).toBe("PENDING");
    });

    it("POST /conflicts/:id/escalate returns 404 for conflict in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .post(`/api/v1/conflicts/${orgAConflictAlertId}/escalate`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          notes: "Unauthorized escalation",
        })
        .expect(404);
    });
  });

  describe("Conflict Exclusion Listing Isolation", () => {
    it("GET /conflicts/exclusions returns only exclusions in caller organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/conflicts/exclusions")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should contain Org A exclusion
      const exclusions =
        response.body.items || response.body.data || response.body;
      const ids = exclusions.map((e: { id: string }) => e.id);
      expect(ids).toContain(orgAExclusionId);
    });

    it("Org B cannot see Org A exclusions via GET /conflicts/exclusions", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/conflicts/exclusions")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should not contain Org A exclusion
      const exclusions =
        response.body.items || response.body.data || response.body;
      const ids = exclusions.map((e: { id: string }) => e.id);
      expect(ids).not.toContain(orgAExclusionId);
    });
  });

  describe("Conflict Exclusion Delete Isolation", () => {
    it("DELETE /conflicts/exclusions/:id returns 404 for exclusion in different organization", async () => {
      await request(ctx.app.getHttpServer())
        .delete(`/api/v1/conflicts/exclusions/${orgAExclusionId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);

      // Verify the exclusion still exists and is active
      await ctx.prisma.enableBypassRLS();
      const exclusion = await ctx.prisma.conflictExclusion.findUnique({
        where: { id: orgAExclusionId },
      });
      await ctx.prisma.disableBypassRLS();

      expect(exclusion).not.toBeNull();
      expect(exclusion?.isActive).toBe(true);
    });
  });

  describe("Authentication Boundary", () => {
    it("returns 401 for requests without token to disclosure-forms", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/disclosure-forms")
        .expect(401);
    });

    it("returns 401 for requests without token to conflicts", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/conflicts")
        .expect(401);
    });

    it("returns 401 for invalid token", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/disclosure-forms")
        .set("Authorization", "Bearer invalid-token-xyz")
        .expect(401);
    });
  });
});
