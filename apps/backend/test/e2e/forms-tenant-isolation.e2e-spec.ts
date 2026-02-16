/**
 * Forms Tenant Isolation E2E Tests
 *
 * Verifies that forms module properly enforces tenant isolation:
 * - Form definitions are organization-scoped
 * - Form submissions are tenant-isolated
 * - Cross-tenant form access returns 404
 * - Form template cloning respects tenant boundaries
 *
 * TEST-04: Tenant isolation verification for forms module.
 */

import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { PrismaService } from "../../src/modules/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { JwtKeyService } from "../../src/modules/auth/services/jwt-key.service";
import { FormType, FormSubmissionStatus } from "@prisma/client";
import {
  createTestApp,
  createTestUser,
  cleanupTestData,
  E2ETestUser,
  E2ETestOrg,
} from "./test-helpers";

describe("Forms Tenant Isolation (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let jwtKeyService: JwtKeyService;

  // Org A (primary test org)
  let userA: E2ETestUser;
  let tenantA: E2ETestOrg;
  let formDefinitionA: { id: string; name: string };
  let submissionA: { id: string };

  // Org B (cross-tenant test org)
  let userB: E2ETestUser;
  let tenantB: E2ETestOrg;
  let formDefinitionB: { id: string; name: string };
  let submissionB: { id: string };

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
        name: "Forms Test Org A",
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
        name: "Forms Test Org B",
      },
      jwtKeyService,
    );
    userB = setupB.user;
    tenantB = setupB.tenant;

    // Create test data for each org
    await prisma.enableBypassRLS();
    try {
      // Form definition for Org A
      const formA = await prisma.formDefinition.create({
        data: {
          organizationId: tenantA.id,
          name: "Org A Intake Form",
          description: "Test form for Org A - CONFIDENTIAL",
          formType: FormType.INTAKE,
          version: 1,
          isActive: true,
          isPublished: true,
          schema: {
            fields: [
              { name: "description", type: "text", label: "Description" },
            ],
          },
          createdById: userA.id,
        },
      });
      formDefinitionA = { id: formA.id, name: formA.name };

      // Form submission for Org A
      const subA = await prisma.formSubmission.create({
        data: {
          organizationId: tenantA.id,
          formDefinitionId: formA.id,
          formDefinitionVersion: 1,
          data: { description: "Org A submission data - CONFIDENTIAL" },
          status: FormSubmissionStatus.SUBMITTED,
          submittedById: userA.id,
        },
      });
      submissionA = { id: subA.id };

      // Form definition for Org B
      const formB = await prisma.formDefinition.create({
        data: {
          organizationId: tenantB.id,
          name: "Org B Intake Form",
          description: "Test form for Org B - CONFIDENTIAL",
          formType: FormType.INTAKE,
          version: 1,
          isActive: true,
          isPublished: true,
          schema: {
            fields: [
              { name: "description", type: "text", label: "Description" },
            ],
          },
          createdById: userB.id,
        },
      });
      formDefinitionB = { id: formB.id, name: formB.name };

      // Form submission for Org B
      const subB = await prisma.formSubmission.create({
        data: {
          organizationId: tenantB.id,
          formDefinitionId: formB.id,
          formDefinitionVersion: 1,
          data: { description: "Org B submission data - CONFIDENTIAL" },
          status: FormSubmissionStatus.SUBMITTED,
          submittedById: userB.id,
        },
      });
      submissionB = { id: subB.id };
    } finally {
      await prisma.disableBypassRLS();
    }
  }, 60000);

  afterAll(async () => {
    // Clean up test data
    await prisma.enableBypassRLS();
    try {
      // Delete form submissions first (FK constraint)
      await prisma.formSubmission.deleteMany({
        where: {
          organizationId: { in: [tenantA.id, tenantB.id] },
        },
      });

      // Delete form definitions
      await prisma.formDefinition.deleteMany({
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

  describe("Form Definition Isolation", () => {
    it("should return only Org A form definitions when queried by Org A user", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/forms/definitions")
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);

      // All returned forms should belong to Org A
      const formIds = response.body.map((f: { id: string }) => f.id);
      expect(formIds).toContain(formDefinitionA.id);
      expect(formIds).not.toContain(formDefinitionB.id);
    });

    it("should return 404 when Org B user tries to access Org A form definition", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/forms/definitions/${formDefinitionA.id}`)
        .set("Authorization", `Bearer ${userB.token}`)
        .expect(404);
    });

    it("should return 404 when Org A user tries to access Org B form definition", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/forms/definitions/${formDefinitionB.id}`)
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(404);
    });

    it("should not allow Org B to update Org A form definition", async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/forms/definitions/${formDefinitionA.id}`)
        .set("Authorization", `Bearer ${userB.token}`)
        .send({ name: "Hijacked Form" })
        .expect(404);

      // Verify form was not modified
      await prisma.enableBypassRLS();
      const form = await prisma.formDefinition.findUnique({
        where: { id: formDefinitionA.id },
      });
      await prisma.disableBypassRLS();

      expect(form?.name).toBe("Org A Intake Form");
    });

    it("should not allow Org B to publish Org A form", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/forms/definitions/${formDefinitionA.id}/publish`)
        .set("Authorization", `Bearer ${userB.token}`)
        .expect(404);
    });

    it("should not allow Org B to clone Org A form", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/forms/definitions/${formDefinitionA.id}/clone`)
        .set("Authorization", `Bearer ${userB.token}`)
        .send({ name: "Stolen Form Clone" })
        .expect(404);
    });

    it("should not allow Org B to deactivate Org A form", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/forms/definitions/${formDefinitionA.id}/deactivate`)
        .set("Authorization", `Bearer ${userB.token}`)
        .expect(404);
    });
  });

  describe("Form Submission Isolation", () => {
    it("should return 404 when Org B user tries to access Org A submission", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/forms/submissions/${submissionA.id}`)
        .set("Authorization", `Bearer ${userB.token}`)
        .expect(404);
    });

    it("should return only Org A submissions for Org A form", async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/forms/definitions/${formDefinitionA.id}/submissions`)
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      expect(response.body).toBeDefined();

      // Verify no cross-tenant submission IDs
      const submissions = Array.isArray(response.body)
        ? response.body
        : response.body.submissions || [];
      const submissionIds = submissions.map((s: { id: string }) => s.id);
      expect(submissionIds).not.toContain(submissionB.id);
    });

    it("should return 404 when Org B lists submissions for Org A form", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/forms/definitions/${formDefinitionA.id}/submissions`)
        .set("Authorization", `Bearer ${userB.token}`)
        .expect(404);
    });

    it("should not allow Org B to update status of Org A submission", async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/forms/submissions/${submissionA.id}/status`)
        .set("Authorization", `Bearer ${userB.token}`)
        .send({ status: "APPROVED" })
        .expect(404);
    });

    it("should create submission in caller's org only", async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/forms/definitions/${formDefinitionA.id}/submit`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          data: { description: "New test submission" },
        });

      // Should succeed for own org
      expect([200, 201]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        // Verify submission was created in correct org
        await prisma.enableBypassRLS();
        const submission = await prisma.formSubmission.findUnique({
          where: { id: response.body.id },
        });
        await prisma.disableBypassRLS();

        expect(submission?.organizationId).toBe(tenantA.id);
        expect(submission?.organizationId).not.toBe(tenantB.id);

        // Clean up test submission
        await prisma.enableBypassRLS();
        await prisma.formSubmission.delete({ where: { id: response.body.id } });
        await prisma.disableBypassRLS();
      }
    });
  });

  describe("Form Submit to Cross-Tenant Form", () => {
    it("should return 404 when Org A tries to submit to Org B form", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/forms/definitions/${formDefinitionB.id}/submit`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          data: { description: "Malicious cross-tenant submission" },
        })
        .expect(404);
    });

    it("should return 404 when Org A tries to save draft on Org B form", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/forms/definitions/${formDefinitionB.id}/draft`)
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          data: { description: "Malicious cross-tenant draft" },
        })
        .expect(404);
    });
  });

  describe("Entity Submissions Isolation", () => {
    it("should only return Org A entity submissions for Org A user", async () => {
      // Create a submission linked to an entity
      await prisma.enableBypassRLS();
      const entitySubmission = await prisma.formSubmission.create({
        data: {
          organizationId: tenantA.id,
          formDefinitionId: formDefinitionA.id,
          formDefinitionVersion: 1,
          data: { description: "Entity-linked submission" },
          status: FormSubmissionStatus.SUBMITTED,
          entityType: "case",
          entityId: "test-case-id",
          submittedById: userA.id,
        },
      });
      await prisma.disableBypassRLS();

      try {
        const response = await request(app.getHttpServer())
          .get("/api/v1/forms/entity/case/test-case-id/submissions")
          .set("Authorization", `Bearer ${userA.token}`)
          .expect(200);

        expect(response.body).toBeDefined();

        // Verify no cross-tenant data
        const submissions = Array.isArray(response.body)
          ? response.body
          : response.body.submissions || [];
        submissions.forEach((sub: { organizationId?: string }) => {
          if (sub.organizationId) {
            expect(sub.organizationId).toBe(tenantA.id);
          }
        });
      } finally {
        // Clean up
        await prisma.enableBypassRLS();
        await prisma.formSubmission.delete({
          where: { id: entitySubmission.id },
        });
        await prisma.disableBypassRLS();
      }
    });
  });

  describe("Form Schema Isolation", () => {
    it("should not allow Org B to see Org A form schema", async () => {
      // Trying to get form definition (includes schema) should return 404
      await request(app.getHttpServer())
        .get(`/api/v1/forms/definitions/${formDefinitionA.id}`)
        .set("Authorization", `Bearer ${userB.token}`)
        .expect(404);
    });
  });
});
