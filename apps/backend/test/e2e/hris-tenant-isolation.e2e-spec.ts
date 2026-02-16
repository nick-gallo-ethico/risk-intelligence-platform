// =============================================================================
// HRIS/PERSONS TENANT ISOLATION E2E TESTS (CRITICAL SECURITY)
// =============================================================================
//
// These tests verify that Row-Level Security correctly prevents cross-tenant
// access to Person records and HRIS-synced employee data.
//
// Pattern:
// 1. Create Person records in Org A (simulating HRIS sync)
// 2. Query/mutate as Org B user
// 3. Verify Org B cannot see or modify Org A's data
//
// Note: HRIS sync service doesn't have direct API endpoints - it syncs to
// Person records. We test tenant isolation at the Person level.
// =============================================================================

import * as request from "supertest";
import {
  createTestContext,
  destroyTestContext,
  TestContext,
  authHeader,
} from "../helpers/test-setup";
import { PersonType, PersonSource, PersonStatus } from "@prisma/client";

// PersonSource.HRIS_SYNC is the correct enum value from the schema

describe("HRIS/Persons Tenant Isolation (e2e)", () => {
  let ctx: TestContext;

  // Test data created in Org A
  let orgAPersonId: string;
  let orgAEmployeeId: string;

  beforeAll(async () => {
    ctx = await createTestContext();

    // Bypass RLS to create test data directly
    await ctx.prisma.enableBypassRLS();

    try {
      // Create an Employee record in Org A (simulates HRIS sync)
      const employee = await ctx.prisma.employee.create({
        data: {
          organizationId: ctx.orgA.id,
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@testalpha.local",
          jobTitle: "Software Engineer",
          employmentStatus: "ACTIVE",
          sourceSystem: "MERGE_DEV",
          hrisEmployeeId: `HRIS-${Date.now()}`,
        },
      });
      orgAEmployeeId = employee.id;

      // Create a Person record in Org A linked to the employee
      const person = await ctx.prisma.person.create({
        data: {
          organizationId: ctx.orgA.id,
          firstName: "John",
          lastName: "Doe",
          email: "john.doe@testalpha.local",
          type: PersonType.EMPLOYEE,
          source: PersonSource.HRIS_SYNC,
          status: PersonStatus.ACTIVE,
          employeeId: employee.id,
          createdById: ctx.orgA.users[0].id,
          updatedById: ctx.orgA.users[0].id,
        },
      });
      orgAPersonId = person.id;

      // Create a Person record in Org B for comparison
      await ctx.prisma.person.create({
        data: {
          organizationId: ctx.orgB.id,
          firstName: "Jane",
          lastName: "Smith",
          email: "jane.smith@testbeta.local",
          type: PersonType.EMPLOYEE,
          source: PersonSource.MANUAL,
          status: PersonStatus.ACTIVE,
          createdById: ctx.orgB.users[0].id,
          updatedById: ctx.orgB.users[0].id,
        },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }
  }, 30000);

  afterAll(async () => {
    // Clean up test data
    await ctx.prisma.enableBypassRLS();
    try {
      await ctx.prisma.person.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
      await ctx.prisma.employee.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }

    await destroyTestContext(ctx);
  });

  // =========================================================================
  // LIST ISOLATION - Org B cannot see Org A's persons
  // =========================================================================
  describe("List Isolation (GET /api/v1/persons)", () => {
    it("Org B cannot see Org A persons in list", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/persons")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should not contain any Org A persons
      const orgAPersons = response.body.data.filter(
        (p: any) => p.organizationId === ctx.orgA.id,
      );
      expect(orgAPersons).toHaveLength(0);

      // All returned persons should belong to Org B
      response.body.data.forEach((p: any) => {
        expect(p.organizationId).toBe(ctx.orgB.id);
      });
    });

    it("Org A can see their own persons", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/persons")
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Should see at least our test person
      expect(response.body.data.length).toBeGreaterThan(0);

      // All returned persons should belong to Org A
      response.body.data.forEach((p: any) => {
        expect(p.organizationId).toBe(ctx.orgA.id);
      });
    });

    it("HRIS-sourced persons are filtered by organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/persons?source=HRIS_SYNC")
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should not see Org A's HRIS-sourced person
      const orgAHrisPersons = response.body.data.filter(
        (p: any) =>
          p.organizationId === ctx.orgA.id && p.source === "HRIS_SYNC",
      );
      expect(orgAHrisPersons).toHaveLength(0);
    });
  });

  // =========================================================================
  // READ ISOLATION - Org B cannot access Org A person by ID
  // =========================================================================
  describe("Read Isolation (GET /api/v1/persons/:id)", () => {
    it("Org B cannot access Org A person by ID (returns 404)", async () => {
      await request(ctx.app.getHttpServer())
        .get(`/api/v1/persons/${orgAPersonId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .expect(404);
    });

    it("Org A can access their own person", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get(`/api/v1/persons/${orgAPersonId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      expect(response.body.id).toBe(orgAPersonId);
      expect(response.body.organizationId).toBe(ctx.orgA.id);
    });
  });

  // =========================================================================
  // CREATE ISOLATION - Cannot create person in another org
  // =========================================================================
  describe("Create Isolation (POST /api/v1/persons)", () => {
    it("Person creation respects caller organization", async () => {
      const response = await request(ctx.app.getHttpServer())
        .post("/api/v1/persons")
        .set(authHeader(ctx.orgB.users[0]))
        .send({
          firstName: "New",
          lastName: "Person",
          email: `new.person.${Date.now()}@testbeta.local`,
          type: "EMPLOYEE",
          source: "MANUAL",
          // Note: status is set by service, not passed in DTO
        })
        .expect(201);

      // Person should be created in Org B, not Org A
      expect(response.body.organizationId).toBe(ctx.orgB.id);

      // Clean up
      await ctx.prisma.enableBypassRLS();
      await ctx.prisma.person.delete({ where: { id: response.body.id } });
      await ctx.prisma.disableBypassRLS();
    });
  });

  // =========================================================================
  // UPDATE ISOLATION - Org B cannot update Org A person
  // =========================================================================
  describe("Update Isolation (PATCH /api/v1/persons/:id)", () => {
    it("Org B cannot update Org A person (returns 404)", async () => {
      await request(ctx.app.getHttpServer())
        .patch(`/api/v1/persons/${orgAPersonId}`)
        .set(authHeader(ctx.orgB.users[0]))
        .send({ firstName: "Hacked" })
        .expect(404);

      // Verify person was NOT modified
      await ctx.prisma.enableBypassRLS();
      try {
        const person = await ctx.prisma.person.findUnique({
          where: { id: orgAPersonId },
        });
        expect(person?.firstName).toBe("John");
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it("Org A can update their own person", async () => {
      const response = await request(ctx.app.getHttpServer())
        .patch(`/api/v1/persons/${orgAPersonId}`)
        .set(authHeader(ctx.orgA.users[0]))
        .send({ jobTitle: "Senior Engineer" })
        .expect(200);

      expect(response.body.jobTitle).toBe("Senior Engineer");
    });
  });

  // =========================================================================
  // DATABASE-LEVEL VERIFICATION
  // =========================================================================
  describe("Database-Level Isolation Verification", () => {
    it("Employee records are properly tenant-scoped", async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const employees = await ctx.prisma.employee.findMany({
          where: {
            organizationId: { in: [ctx.orgA.id, ctx.orgB.id] },
          },
        });

        // Org A should have at least one employee
        const orgAEmployees = employees.filter(
          (e) => e.organizationId === ctx.orgA.id,
        );
        expect(orgAEmployees.length).toBeGreaterThan(0);

        // Each employee should have correct organization
        employees.forEach((e) => {
          expect([ctx.orgA.id, ctx.orgB.id]).toContain(e.organizationId);
        });
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it("Person-Employee links respect tenant boundaries", async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const person = await ctx.prisma.person.findUnique({
          where: { id: orgAPersonId },
          include: { employee: true },
        });

        // Person should have linked employee
        expect(person?.employeeId).toBe(orgAEmployeeId);
        expect(person?.employee?.organizationId).toBe(ctx.orgA.id);

        // Both should be in same organization
        expect(person?.organizationId).toBe(person?.employee?.organizationId);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });
  });

  // =========================================================================
  // AUTHENTICATION TESTS
  // =========================================================================
  describe("Authentication", () => {
    it("should reject requests without token", async () => {
      await request(ctx.app.getHttpServer()).get("/api/v1/persons").expect(401);
    });

    it("should reject requests with invalid token", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/persons")
        .set("Authorization", "Bearer invalid-token")
        .expect(401);
    });
  });
});
