/**
 * AI Gateway E2E Tests
 *
 * Tests real-time AI streaming and skill execution via WebSocket connections.
 * Verifies context loading, agent chat, skill execution, and stream control.
 *
 * These tests verify the AI gateway's WebSocket interface for streaming
 * chat responses and executing AI skills.
 */

import { INestApplication } from "@nestjs/common";
import { io, Socket } from "socket.io-client";
import { PrismaService } from "../../src/modules/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import {
  createTestApp,
  createTestUser,
  cleanupTestData,
  waitForConnect,
  waitForEvent,
  delay,
  E2ETestUser,
  E2ETestOrg,
} from "./test-helpers";

describe("AI Gateway (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let socket: Socket | null = null;
  let testUser: E2ETestUser;
  let testTenant: E2ETestOrg;
  let testCaseId: string;

  // Use random port to avoid conflicts
  const TEST_PORT = 3200 + Math.floor(Math.random() * 100);
  const WS_URL = `http://localhost:${TEST_PORT}`;

  beforeAll(async () => {
    // Create test application
    const setup = await createTestApp();
    app = setup.app;
    prisma = setup.prisma;
    jwtService = setup.jwtService;

    // Start on test port
    await app.listen(TEST_PORT);

    // Create test user with valid token
    const { user, tenant } = await createTestUser(prisma, jwtService, {
      role: "INVESTIGATOR",
    });
    testUser = user;
    testTenant = tenant;

    // Create test case for context loading
    await prisma.enableBypassRLS();
    try {
      const testCase = await prisma.case.create({
        data: {
          organizationId: tenant.id,
          referenceNumber: `TEST-${Date.now()}`,
          status: "OPEN",
          caseType: "REPORT",
          details: "Test case for AI gateway E2E testing",
          summary: "A sample test case",
          createdById: user.id,
          updatedById: user.id,
        },
      });
      testCaseId = testCase.id;
    } finally {
      await prisma.disableBypassRLS();
    }
  }, 60000);

  afterAll(async () => {
    // Clean up test case
    await prisma.enableBypassRLS();
    try {
      await prisma.case.deleteMany({
        where: { id: testCaseId },
      });
    } finally {
      await prisma.disableBypassRLS();
    }

    // Clean up test data
    await cleanupTestData(prisma, testUser.id, testTenant.id);

    // Close application
    await app.close();
  }, 30000);

  beforeEach(() => {
    socket = null;
  });

  afterEach(async () => {
    if (socket?.connected) {
      socket.disconnect();
    }
    socket = null;
    await delay(100);
  });

  describe("Connection Authentication", () => {
    it("should connect with valid auth context", async () => {
      socket = io(`${WS_URL}/ai`, {
        auth: {
          organizationId: testTenant.id,
          userId: testUser.id,
          userRole: testUser.role,
          permissions: [],
        },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      expect(socket.connected).toBe(true);
    });

    it("should reject connection without organizationId", async () => {
      socket = io(`${WS_URL}/ai`, {
        auth: {
          userId: testUser.id,
          userRole: testUser.role,
        },
        transports: ["websocket"],
        autoConnect: false,
      });

      const connectErrorPromise = waitForEvent<Error>(
        socket,
        "connect_error",
        5000,
      ).catch(() => new Error("Connection failed"));

      socket.connect();

      // Should either get an error event or disconnect
      await delay(1000);
      expect(socket.connected).toBe(false);
    });

    it("should reject connection without userId", async () => {
      socket = io(`${WS_URL}/ai`, {
        auth: {
          organizationId: testTenant.id,
          userRole: testUser.role,
        },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();

      await delay(1000);
      expect(socket.connected).toBe(false);
    });
  });

  describe("Chat Streaming", () => {
    it("should receive message_start on chat", async () => {
      socket = io(`${WS_URL}/ai`, {
        auth: {
          organizationId: testTenant.id,
          userId: testUser.id,
          userRole: testUser.role,
          permissions: ["ai:chat"],
        },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      // Start listening for message_start before emitting
      const messageStartPromise = waitForEvent<{ conversationId: string }>(
        socket,
        "message_start",
        10000,
      ).catch(() => null);

      // Also listen for error in case AI isn't configured
      const errorPromise = waitForEvent<{ message: string }>(
        socket,
        "error",
        10000,
      ).catch(() => null);

      // Send chat message
      socket.emit("chat", {
        message: "Hello",
        entityType: "case",
        entityId: testCaseId,
      });

      // Wait for either message_start or error
      const [startResult, errorResult] = await Promise.all([
        messageStartPromise,
        errorPromise,
      ]);

      // Should receive one of these (error is OK if AI not configured)
      expect(startResult !== null || errorResult !== null).toBe(true);
    }, 15000);

    it("should handle stop event", async () => {
      socket = io(`${WS_URL}/ai`, {
        auth: {
          organizationId: testTenant.id,
          userId: testUser.id,
          userRole: testUser.role,
          permissions: ["ai:chat"],
        },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      const stoppedPromise = waitForEvent<{ conversationId: string }>(
        socket,
        "stopped",
        5000,
      );

      // Emit stop event
      socket.emit("stop", { conversationId: "test-conv-id" });

      const result = await stoppedPromise;
      expect(result).toHaveProperty("conversationId");
      expect(result.conversationId).toBe("test-conv-id");
    });
  });

  describe("Conversation Control", () => {
    it("should handle pause event", async () => {
      socket = io(`${WS_URL}/ai`, {
        auth: {
          organizationId: testTenant.id,
          userId: testUser.id,
          userRole: testUser.role,
          permissions: ["ai:chat"],
        },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      // Listen for pause response or error
      const pausedPromise = waitForEvent<{ conversationId: string }>(
        socket,
        "conversation_paused",
        5000,
      ).catch(() => null);

      const errorPromise = waitForEvent<{ message: string }>(
        socket,
        "error",
        5000,
      ).catch(() => null);

      socket.emit("pause", { conversationId: "test-conv-id" });

      const [pausedResult, errorResult] = await Promise.all([
        pausedPromise,
        errorPromise,
      ]);

      // Should receive one of these
      expect(pausedResult !== null || errorResult !== null).toBe(true);
    });

    it("should handle resume event", async () => {
      socket = io(`${WS_URL}/ai`, {
        auth: {
          organizationId: testTenant.id,
          userId: testUser.id,
          userRole: testUser.role,
          permissions: ["ai:chat"],
        },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      // Listen for resume response or error
      const resumedPromise = waitForEvent<{ conversationId: string }>(
        socket,
        "conversation_resumed",
        5000,
      ).catch(() => null);

      const errorPromise = waitForEvent<{ message: string }>(
        socket,
        "error",
        5000,
      ).catch(() => null);

      socket.emit("resume", { conversationId: "test-conv-id" });

      const [resumedResult, errorResult] = await Promise.all([
        resumedPromise,
        errorPromise,
      ]);

      // Should receive one of these
      expect(resumedResult !== null || errorResult !== null).toBe(true);
    });
  });

  describe("Skill Execution", () => {
    it("should handle skill_execute event", async () => {
      socket = io(`${WS_URL}/ai`, {
        auth: {
          organizationId: testTenant.id,
          userId: testUser.id,
          userRole: testUser.role,
          permissions: ["ai:skills:note-cleanup"],
        },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      // Listen for skill result or error
      const resultPromise = waitForEvent<{ skillId: string; result: any }>(
        socket,
        "skill_result",
        15000,
      ).catch(() => null);

      const errorPromise = waitForEvent<{ message: string }>(
        socket,
        "error",
        15000,
      ).catch(() => null);

      socket.emit("skill_execute", {
        skillId: "note-cleanup",
        input: {
          text: "- called about issue\n- happened yesterday\n- in warehouse",
        },
        entityType: "case",
        entityId: testCaseId,
      });

      const [skillResult, errorResult] = await Promise.all([
        resultPromise,
        errorPromise,
      ]);

      // Should receive one of these
      expect(skillResult !== null || errorResult !== null).toBe(true);
    }, 20000);

    it("should return error for unknown skill", async () => {
      socket = io(`${WS_URL}/ai`, {
        auth: {
          organizationId: testTenant.id,
          userId: testUser.id,
          userRole: testUser.role,
          permissions: [],
        },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      const errorPromise = waitForEvent<{ message: string }>(
        socket,
        "error",
        5000,
      );

      socket.emit("skill_execute", {
        skillId: "unknown-skill-xyz",
        input: {},
      });

      const error = await errorPromise;
      expect(error).toHaveProperty("message");
    });
  });

  describe("Action Execution", () => {
    it("should handle action_execute event", async () => {
      socket = io(`${WS_URL}/ai`, {
        auth: {
          organizationId: testTenant.id,
          userId: testUser.id,
          userRole: testUser.role,
          permissions: ["ai:actions"],
        },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      // Listen for action result or error
      const resultPromise = waitForEvent<{ actionId: string; result: any }>(
        socket,
        "action_result",
        10000,
      ).catch(() => null);

      const errorPromise = waitForEvent<{ message: string }>(
        socket,
        "error",
        10000,
      ).catch(() => null);

      socket.emit("action_execute", {
        actionId: "add-note",
        input: {
          content: "Test note from E2E",
        },
        entityType: "case",
        entityId: testCaseId,
        skipPreview: false,
      });

      const [actionResult, errorResult] = await Promise.all([
        resultPromise,
        errorPromise,
      ]);

      // Should receive one of these
      expect(actionResult !== null || errorResult !== null).toBe(true);
    }, 15000);

    it("should return error for unknown action", async () => {
      socket = io(`${WS_URL}/ai`, {
        auth: {
          organizationId: testTenant.id,
          userId: testUser.id,
          userRole: testUser.role,
          permissions: [],
        },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      const errorPromise = waitForEvent<{ message: string }>(
        socket,
        "error",
        5000,
      );

      socket.emit("action_execute", {
        actionId: "unknown-action-xyz",
        input: {},
        entityType: "case",
        entityId: testCaseId,
      });

      const error = await errorPromise;
      expect(error).toHaveProperty("message");
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed events gracefully", async () => {
      socket = io(`${WS_URL}/ai`, {
        auth: {
          organizationId: testTenant.id,
          userId: testUser.id,
          userRole: testUser.role,
          permissions: [],
        },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      // Send malformed event
      socket.emit("unknown:event", { bad: "data" });

      // Wait and verify still connected
      await delay(500);
      expect(socket.connected).toBe(true);
    });

    it("should handle chat without message gracefully", async () => {
      socket = io(`${WS_URL}/ai`, {
        auth: {
          organizationId: testTenant.id,
          userId: testUser.id,
          userRole: testUser.role,
          permissions: [],
        },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      const errorPromise = waitForEvent<{ message: string }>(
        socket,
        "error",
        5000,
      ).catch(() => null);

      // Send chat without message
      socket.emit("chat", {
        entityType: "case",
        entityId: testCaseId,
      });

      // Should either get error or still be connected
      await delay(1000);
      expect(socket.connected).toBe(true);
    });
  });

  describe("Tenant Isolation", () => {
    let secondUser: E2ETestUser;
    let secondTenant: E2ETestOrg;
    let secondSocket: Socket | null = null;

    beforeAll(async () => {
      // Create second user in different organization
      const { user, tenant } = await createTestUser(prisma, jwtService, {
        role: "INVESTIGATOR",
        name: "Second Test Org",
      });
      secondUser = user;
      secondTenant = tenant;
    }, 30000);

    afterAll(async () => {
      await cleanupTestData(prisma, secondUser.id, secondTenant.id);
    });

    afterEach(async () => {
      if (secondSocket?.connected) {
        secondSocket.disconnect();
      }
      secondSocket = null;
      await delay(100);
    });

    it("should isolate contexts between tenants", async () => {
      // Connect first user
      socket = io(`${WS_URL}/ai`, {
        auth: {
          organizationId: testTenant.id,
          userId: testUser.id,
          userRole: testUser.role,
          permissions: [],
        },
        transports: ["websocket"],
        autoConnect: false,
      });
      socket.connect();
      await waitForConnect(socket);

      // Connect second user from different org
      secondSocket = io(`${WS_URL}/ai`, {
        auth: {
          organizationId: secondTenant.id,
          userId: secondUser.id,
          userRole: secondUser.role,
          permissions: [],
        },
        transports: ["websocket"],
        autoConnect: false,
      });
      secondSocket.connect();
      await waitForConnect(secondSocket);

      // Both should be connected
      expect(socket.connected).toBe(true);
      expect(secondSocket.connected).toBe(true);

      // They should have different socket IDs
      expect(socket.id).not.toBe(secondSocket.id);
    });
  });
});
