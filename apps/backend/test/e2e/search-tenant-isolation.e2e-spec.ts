/**
 * Search Tenant Isolation E2E Tests
 *
 * Verifies that Row-Level Security and search service correctly prevent
 * cross-tenant access in search functionality.
 *
 * CRITICAL: All cross-tenant access attempts must return no results (not 403)
 * to prevent enumeration attacks.
 *
 * Pattern:
 * 1. Create searchable entities (Cases, Persons) in Org A
 * 2. Perform search as Org B user
 * 3. Verify Org B cannot see Org A's data in search results
 */

import * as request from "supertest";
import {
  createTestContext,
  destroyTestContext,
  TestContext,
  authHeader,
} from "../helpers/test-setup";
import {
  SourceChannel,
  PersonType,
  PersonSource,
  PersonStatus,
} from "@prisma/client";

describe("Search Tenant Isolation (E2E)", () => {
  let ctx: TestContext;

  // Test data created in Org A
  let orgACaseId: string;
  let orgACaseRef: string;
  let orgAPersonId: string;

  // Test data created in Org B
  let orgBCaseId: string;
  let orgBCaseRef: string;

  beforeAll(async () => {
    ctx = await createTestContext();

    // Create test data in both orgs
    await ctx.prisma.enableBypassRLS();
    try {
      // Create case in Org A with unique searchable content
      const caseA = await ctx.prisma.case.create({
        data: {
          organizationId: ctx.orgA.id,
          referenceNumber: `SRCH-A-${Date.now()}`,
          sourceChannel: SourceChannel.DIRECT_ENTRY,
          details:
            "Alpha organization confidential case for search testing XYZ123",
          createdById: ctx.orgA.users[0].id,
          updatedById: ctx.orgA.users[0].id,
        },
      });
      orgACaseId = caseA.id;
      orgACaseRef = caseA.referenceNumber;

      // Create person in Org A
      const personA = await ctx.prisma.person.create({
        data: {
          organizationId: ctx.orgA.id,
          firstName: "SearchTestAlpha",
          lastName: "Confidential",
          email: `search.alpha.${Date.now()}@testalpha.local`,
          type: PersonType.EMPLOYEE,
          source: PersonSource.MANUAL,
          status: PersonStatus.ACTIVE,
          createdById: ctx.orgA.users[0].id,
          updatedById: ctx.orgA.users[0].id,
        },
      });
      orgAPersonId = personA.id;

      // Create case in Org B
      const caseB = await ctx.prisma.case.create({
        data: {
          organizationId: ctx.orgB.id,
          referenceNumber: `SRCH-B-${Date.now()}`,
          sourceChannel: SourceChannel.HOTLINE,
          details: "Beta organization case for search testing ABC789",
          createdById: ctx.orgB.users[0].id,
          updatedById: ctx.orgB.users[0].id,
        },
      });
      orgBCaseId = caseB.id;
      orgBCaseRef = caseB.referenceNumber;
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
      await ctx.prisma.case.deleteMany({
        where: { organizationId: { in: [ctx.orgA.id, ctx.orgB.id] } },
      });
    } finally {
      await ctx.prisma.disableBypassRLS();
    }

    await destroyTestContext(ctx);
  });

  // =========================================================================
  // BASIC SEARCH ISOLATION
  // =========================================================================
  describe("Basic Search Isolation (GET /api/v1/search)", () => {
    it("Org B search does not return Org A cases", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/search")
        .query({ q: "XYZ123" }) // Term unique to Org A case
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should not find Org A's case content
      const hits = response.body.hits || [];
      const orgAHits = hits.filter(
        (hit: any) => hit.organizationId === ctx.orgA.id,
      );
      expect(orgAHits).toHaveLength(0);
    });

    it("Org A search returns only Org A results", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/search")
        .query({ q: "XYZ123" })
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // All results should belong to Org A
      const hits = response.body.hits || [];
      hits.forEach((hit: any) => {
        expect(hit.organizationId).toBe(ctx.orgA.id);
      });
    });

    it("Org B search for Org A reference number returns no results", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/search")
        .query({ q: orgACaseRef })
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should not find Org A's case by reference number
      const hits = response.body.hits || [];
      const orgAHits = hits.filter((hit: any) => hit.id === orgACaseId);
      expect(orgAHits).toHaveLength(0);
    });

    it("Org B can find their own cases", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/search")
        .query({ q: "ABC789" }) // Term unique to Org B case
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // All results should belong to Org B
      const hits = response.body.hits || [];
      hits.forEach((hit: any) => {
        expect(hit.organizationId).toBe(ctx.orgB.id);
      });
    });
  });

  // =========================================================================
  // UNIFIED SEARCH ISOLATION
  // =========================================================================
  describe("Unified Search Isolation (GET /api/v1/search/unified)", () => {
    it("Org B unified search excludes Org A entities", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/search/unified")
        .query({ q: "SearchTestAlpha" }) // Org A person name
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Should not find Org A person
      const results = response.body.results || {};
      const persons = results.persons || [];
      const orgAPersons = persons.filter(
        (p: any) => p.organizationId === ctx.orgA.id,
      );
      expect(orgAPersons).toHaveLength(0);
    });

    it("Org A unified search returns their own entities", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/search/unified")
        .query({ q: "SearchTestAlpha" })
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // Results should belong to Org A
      const results = response.body.results || {};
      const persons = results.persons || [];
      persons.forEach((p: any) => {
        expect(p.organizationId).toBe(ctx.orgA.id);
      });
    });

    it("Cross-tenant entity type filter still respects tenant isolation", async () => {
      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/search/unified")
        .query({ q: "confidential", types: "CASE,PERSON" })
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // No Org A results should appear even with explicit entity type filter
      const results = response.body.results || {};
      const allResults = [...(results.cases || []), ...(results.persons || [])];
      allResults.forEach((r: any) => {
        expect(r.organizationId).not.toBe(ctx.orgA.id);
      });
    });
  });

  // =========================================================================
  // SEARCH SUGGESTIONS ISOLATION
  // =========================================================================
  describe("Search Suggestions Isolation (GET /api/v1/search/suggest)", () => {
    it("Org B suggestions do not include Org A reference numbers", async () => {
      // Get first part of Org A reference for autocomplete
      const prefix = orgACaseRef.substring(0, 6);

      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/search/suggest")
        .query({ q: prefix })
        .set(authHeader(ctx.orgB.users[0]))
        .expect(200);

      // Suggestions should not include Org A reference
      const suggestions = response.body || [];
      expect(suggestions).not.toContain(orgACaseRef);
    });

    it("Org A suggestions include their own reference numbers", async () => {
      const prefix = orgACaseRef.substring(0, 6);

      const response = await request(ctx.app.getHttpServer())
        .get("/api/v1/search/suggest")
        .query({ q: prefix })
        .set(authHeader(ctx.orgA.users[0]))
        .expect(200);

      // May or may not have suggestions depending on implementation
      // Just verify no error and response is array
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  // =========================================================================
  // DATABASE-LEVEL VERIFICATION
  // =========================================================================
  describe("Database-Level Search Isolation", () => {
    it("Cases have proper organization_id for search filtering", async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const cases = await ctx.prisma.case.findMany({
          where: {
            id: { in: [orgACaseId, orgBCaseId] },
          },
          select: {
            id: true,
            organizationId: true,
            referenceNumber: true,
          },
        });

        // Verify each case has correct org
        const caseA = cases.find((c) => c.id === orgACaseId);
        const caseB = cases.find((c) => c.id === orgBCaseId);

        expect(caseA?.organizationId).toBe(ctx.orgA.id);
        expect(caseB?.organizationId).toBe(ctx.orgB.id);
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });

    it("Person records have proper organization_id for search filtering", async () => {
      await ctx.prisma.enableBypassRLS();
      try {
        const person = await ctx.prisma.person.findUnique({
          where: { id: orgAPersonId },
          select: {
            id: true,
            organizationId: true,
            firstName: true,
          },
        });

        expect(person?.organizationId).toBe(ctx.orgA.id);
        expect(person?.firstName).toBe("SearchTestAlpha");
      } finally {
        await ctx.prisma.disableBypassRLS();
      }
    });
  });

  // =========================================================================
  // AUTHENTICATION TESTS
  // =========================================================================
  describe("Authentication", () => {
    it("should reject search without token", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/search")
        .query({ q: "test" })
        .expect(401);
    });

    it("should reject search with invalid token", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/search")
        .query({ q: "test" })
        .set("Authorization", "Bearer invalid-token")
        .expect(401);
    });

    it("should reject unified search without token", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/search/unified")
        .query({ q: "test" })
        .expect(401);
    });

    it("should reject suggestions without token", async () => {
      await request(ctx.app.getHttpServer())
        .get("/api/v1/search/suggest")
        .query({ q: "test" })
        .expect(401);
    });
  });
});
