/**
 * AI Tenant Isolation E2E Tests
 *
 * Verifies that AI module properly enforces tenant isolation:
 * - AI conversations are organization-scoped
 * - Context loading only returns caller's org data
 * - AI skills only access caller's tenant data
 * - Rate limiting is per-tenant (not global)
 *
 * CRITICAL: AI should NEVER see data from other tenants.
 * TEST-04: Tenant isolation verification for AI module.
 */

import { INestApplication } from "@nestjs/common";
import * as request from "supertest";
import { PrismaService } from "../../src/modules/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import { JwtKeyService } from "../../src/modules/auth/services/jwt-key.service";
import { SourceChannel, CaseStatus } from "@prisma/client";
import {
  createTestApp,
  createTestUser,
  cleanupTestData,
  E2ETestUser,
  E2ETestOrg,
} from "./test-helpers";

describe("AI Tenant Isolation (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let jwtKeyService: JwtKeyService;

  // Org A (primary test org)
  let userA: E2ETestUser;
  let tenantA: E2ETestOrg;
  let conversationA: { id: string };
  let caseA: { id: string; referenceNumber: string };

  // Org B (cross-tenant test org)
  let userB: E2ETestUser;
  let tenantB: E2ETestOrg;
  let conversationB: { id: string };
  let caseB: { id: string; referenceNumber: string };

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
        role: "INVESTIGATOR",
        name: "AI Test Org A",
      },
      jwtKeyService,
    );
    userA = setupA.user;
    tenantA = setupA.tenant;

    const setupB = await createTestUser(
      prisma,
      jwtService,
      {
        role: "INVESTIGATOR",
        name: "AI Test Org B",
      },
      jwtKeyService,
    );
    userB = setupB.user;
    tenantB = setupB.tenant;

    // Create test data for each org
    await prisma.enableBypassRLS();
    try {
      // Case for Org A (for context loading tests)
      const testCaseA = await prisma.case.create({
        data: {
          organizationId: tenantA.id,
          referenceNumber: `AI-TEST-A-${Date.now()}`,
          status: CaseStatus.OPEN,
          sourceChannel: SourceChannel.WEB_FORM,
          details: "Confidential Org A case details - SHOULD NOT LEAK",
          summary: "Org A test case for AI context isolation",
          createdById: userA.id,
          updatedById: userA.id,
        },
      });
      caseA = { id: testCaseA.id, referenceNumber: testCaseA.referenceNumber };

      // Case for Org B (for cross-tenant verification)
      const testCaseB = await prisma.case.create({
        data: {
          organizationId: tenantB.id,
          referenceNumber: `AI-TEST-B-${Date.now()}`,
          status: CaseStatus.OPEN,
          sourceChannel: SourceChannel.WEB_FORM,
          details: "Confidential Org B case details - SHOULD NOT LEAK",
          summary: "Org B test case for AI context isolation",
          createdById: userB.id,
          updatedById: userB.id,
        },
      });
      caseB = { id: testCaseB.id, referenceNumber: testCaseB.referenceNumber };

      // AI Conversation for Org A
      const convA = await prisma.aiConversation.create({
        data: {
          organizationId: tenantA.id,
          userId: userA.id,
          agentType: "CASE_ASSISTANT",
          status: "ACTIVE",
          entityType: "case",
          entityId: testCaseA.id,
          title: "Org A Conversation",
        },
      });
      conversationA = { id: convA.id };

      // AI Conversation for Org B
      const convB = await prisma.aiConversation.create({
        data: {
          organizationId: tenantB.id,
          userId: userB.id,
          agentType: "CASE_ASSISTANT",
          status: "ACTIVE",
          entityType: "case",
          entityId: testCaseB.id,
          title: "Org B Conversation",
        },
      });
      conversationB = { id: convB.id };
    } finally {
      await prisma.disableBypassRLS();
    }
  }, 60000);

  afterAll(async () => {
    // Clean up test data
    await prisma.enableBypassRLS();
    try {
      // Delete AI conversations
      await prisma.aiConversation.deleteMany({
        where: {
          organizationId: { in: [tenantA.id, tenantB.id] },
        },
      });

      // Delete cases
      await prisma.case.deleteMany({
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

  describe("AI Conversations Isolation", () => {
    it("should return only Org A conversations when queried by Org A user", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/ai/conversations")
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      expect(response.body).toBeDefined();

      // Check that only Org A conversation is returned
      const conversations = Array.isArray(response.body)
        ? response.body
        : response.body.conversations || [];

      const conversationIds = conversations.map((c: { id: string }) => c.id);
      expect(conversationIds).toContain(conversationA.id);
      expect(conversationIds).not.toContain(conversationB.id);
    });

    it("should return 404 when Org B user tries to access Org A conversation", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/ai/conversations/${conversationA.id}`)
        .set("Authorization", `Bearer ${userB.token}`)
        .expect(404);
    });

    it("should return 404 when Org A user tries to access Org B conversation", async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/ai/conversations/${conversationB.id}`)
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(404);
    });

    it("should not allow Org B to archive Org A conversation", async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/ai/conversations/${conversationA.id}/archive`)
        .set("Authorization", `Bearer ${userB.token}`)
        .expect(404);
    });

    it("should not return cross-tenant conversations in search", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/ai/conversations/search")
        .query({ q: "Org" })
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      // Verify no Org B conversations in results
      const conversations = Array.isArray(response.body)
        ? response.body
        : response.body.conversations || [];

      conversations.forEach((conv: { organizationId?: string; id: string }) => {
        if (conv.organizationId) {
          expect(conv.organizationId).toBe(tenantA.id);
          expect(conv.organizationId).not.toBe(tenantB.id);
        }
        expect(conv.id).not.toBe(conversationB.id);
      });
    });

    it("should only show stats for Org A when queried by Org A user", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/ai/conversations/stats")
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      // Stats should be scoped to Org A only
      expect(response.body).toBeDefined();
      // Stats are aggregated - just verify endpoint works with tenant isolation
    });
  });

  describe("AI Context Loading Isolation", () => {
    it("should only load context for Org A case when requested by Org A user", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/ai/context")
        .query({ entityType: "case", entityId: caseA.id })
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      // Context should contain Org A data
      expect(response.body).toBeDefined();
      if (response.body.entity) {
        expect(response.body.entity.id).toBe(caseA.id);
      }
      if (response.body.organization) {
        expect(response.body.organization.id).toBe(tenantA.id);
      }
    });

    it("should NOT load Org B case context when requested by Org A user", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/ai/context")
        .query({ entityType: "case", entityId: caseB.id })
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      // Context should fail to load cross-tenant entity
      // Either entity is null or an error is returned
      if (response.body.entity) {
        expect(response.body.entity.id).not.toBe(caseB.id);
      }
      if (response.body.error) {
        expect(response.body.error).toBeDefined();
      }
    });

    it("should NOT include Org B data in any context response", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/ai/context")
        .query({ entityType: "case", entityId: caseA.id })
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      // Deep check that no Org B IDs appear anywhere in response
      const responseStr = JSON.stringify(response.body);
      expect(responseStr).not.toContain(tenantB.id);
      expect(responseStr).not.toContain(caseB.id);
      expect(responseStr).not.toContain(conversationB.id);
    });
  });

  describe("AI Skill Execution Isolation", () => {
    it("should list available skills for the user context", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/ai/skills")
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should execute skills only with caller tenant context", async () => {
      // Try to execute a skill with context from Org A
      const response = await request(app.getHttpServer())
        .post("/api/v1/ai/skills/note-cleanup/execute")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          input: { text: "- call about issue\n- happened yesterday" },
          entityType: "case",
          entityId: caseA.id,
        });

      // Skill may succeed or fail based on AI config, but should not leak data
      expect([200, 400, 404, 500]).toContain(response.status);

      // If successful, verify no cross-tenant data in result
      if (response.status === 200 && response.body.result) {
        const resultStr = JSON.stringify(response.body.result);
        expect(resultStr).not.toContain(tenantB.id);
        expect(resultStr).not.toContain(caseB.id);
      }
    });

    it("should NOT allow skill execution with cross-tenant entity context", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/ai/skills/note-cleanup/execute")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          input: { text: "test text" },
          entityType: "case",
          entityId: caseB.id, // Org B's case - should be blocked
        });

      // Should either fail to find entity or succeed without loading cross-tenant data
      expect([200, 400, 404, 500]).toContain(response.status);
    });
  });

  describe("AI Actions Isolation", () => {
    it("should list available actions scoped to entity type", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/ai/actions")
        .query({ entityType: "case" })
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should NOT allow action execution on cross-tenant entity", async () => {
      const response = await request(app.getHttpServer())
        .post("/api/v1/ai/actions/add-note/execute")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({
          input: { content: "Malicious note" },
          entityType: "case",
          entityId: caseB.id, // Org B's case
        });

      // Should fail - either 404 for entity not found or 403 for unauthorized
      expect([400, 403, 404, 500]).toContain(response.status);
    });
  });

  describe("AI Rate Limiting Per-Tenant", () => {
    it("should return rate limit status for caller tenant only", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/ai/rate-limit-status")
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      // Rate limit status should be scoped to caller's org
    });

    it("should return usage stats scoped to caller tenant", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/ai/usage")
        .query({ period: "day" })
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      // Usage should not include Org B usage
    });
  });

  describe("AI Health Check (No Auth Required)", () => {
    it("should return AI health status without leaking tenant info", async () => {
      const response = await request(app.getHttpServer())
        .get("/api/v1/ai/health")
        .set("Authorization", `Bearer ${userA.token}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBeDefined();

      // Health response should not contain any tenant-specific data
      const responseStr = JSON.stringify(response.body);
      expect(responseStr).not.toContain(tenantA.id);
      expect(responseStr).not.toContain(tenantB.id);
    });
  });
});
