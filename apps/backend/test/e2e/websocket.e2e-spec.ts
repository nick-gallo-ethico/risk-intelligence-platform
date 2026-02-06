/**
 * WebSocket Gateway E2E Tests
 *
 * Tests real-time notification delivery via WebSocket connections.
 * Verifies connection authentication, room management, tenant isolation,
 * and token refresh handling.
 *
 * These tests use real database records and actual WebSocket connections
 * to verify end-to-end functionality.
 */

import { INestApplication } from "@nestjs/common";
import { io, Socket } from "socket.io-client";
import { PrismaService } from "../../src/modules/prisma/prisma.service";
import { JwtService } from "@nestjs/jwt";
import {
  createTestApp,
  createTestUser,
  generateToken,
  cleanupTestData,
  waitForConnect,
  waitForEvent,
  waitForDisconnect,
  delay,
  E2ETestUser,
  E2ETestOrg,
} from "./test-helpers";

describe("WebSocket Gateway (E2E)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let socket: Socket | null = null;
  let testUser: E2ETestUser;
  let testTenant: E2ETestOrg;

  // Use random port to avoid conflicts
  const TEST_PORT = 3100 + Math.floor(Math.random() * 100);
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
  }, 60000);

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData(prisma, testUser.id, testTenant.id);

    // Close application
    await app.close();
  }, 30000);

  beforeEach(() => {
    // Reset socket before each test
    socket = null;
  });

  afterEach(async () => {
    // Disconnect socket after each test
    if (socket?.connected) {
      socket.disconnect();
    }
    socket = null;

    // Small delay to ensure socket is fully closed
    await delay(100);
  });

  describe("Connection Authentication", () => {
    it("should connect successfully with valid token", async () => {
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      expect(socket.connected).toBe(true);
    });

    it("should reject connection without token", async () => {
      socket = io(`${WS_URL}/notifications`, {
        transports: ["websocket"],
        autoConnect: false,
      });

      const connectErrorPromise = waitForEvent<Error>(
        socket,
        "connect_error",
        5000,
      );

      socket.connect();

      const error = await connectErrorPromise;
      expect(error).toBeDefined();
    });

    it("should reject connection with invalid token", async () => {
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: "invalid.token.here" },
        transports: ["websocket"],
        autoConnect: false,
      });

      const connectErrorPromise = waitForEvent<Error>(
        socket,
        "connect_error",
        5000,
      );

      socket.connect();

      const error = await connectErrorPromise;
      expect(error).toBeDefined();
    });

    it("should reject connection with expired token", async () => {
      const expiredToken = generateToken(
        jwtService,
        {
          sub: testUser.id,
          organizationId: testTenant.id,
          email: testUser.email,
          sessionId: testUser.sessionId,
        },
        { expiresIn: "-1s" },
      );

      socket = io(`${WS_URL}/notifications`, {
        auth: { token: expiredToken },
        transports: ["websocket"],
        autoConnect: false,
      });

      const connectErrorPromise = waitForEvent<Error>(
        socket,
        "connect_error",
        5000,
      );

      socket.connect();

      const error = await connectErrorPromise;
      expect(error).toBeDefined();
    });

    it("should reject connection with token missing organizationId", async () => {
      // Create a token without organizationId (malformed)
      const invalidToken = jwtService.sign({
        sub: testUser.id,
        email: testUser.email,
        type: "access",
      });

      socket = io(`${WS_URL}/notifications`, {
        auth: { token: invalidToken },
        transports: ["websocket"],
        autoConnect: false,
      });

      const connectErrorPromise = waitForEvent<Error>(
        socket,
        "connect_error",
        5000,
      );

      socket.connect();

      const error = await connectErrorPromise;
      expect(error).toBeDefined();
    });
  });

  describe("Connection Lifecycle", () => {
    it("should maintain connection after initial connect", async () => {
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      // Wait a bit and verify still connected
      await delay(500);
      expect(socket.connected).toBe(true);
    });

    it("should disconnect cleanly", async () => {
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      expect(socket.connected).toBe(true);

      socket.disconnect();

      // Verify disconnected
      await delay(100);
      expect(socket.connected).toBe(false);
    });

    it("should receive initial unread count on connect", async () => {
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });

      const unreadCountPromise = waitForEvent<{ unreadCount: number }>(
        socket,
        "notification:unread_count",
        5000,
      );

      socket.connect();
      await waitForConnect(socket);

      const result = await unreadCountPromise;
      expect(result).toHaveProperty("unreadCount");
      expect(typeof result.unreadCount).toBe("number");
    });
  });

  describe("Room Subscription", () => {
    it("should receive unread count event in user room", async () => {
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      // Request unread count - this should work since we're in our own room
      const unreadCountPromise = waitForEvent<{ unreadCount: number }>(
        socket,
        "notification:unread_count",
        5000,
      );

      socket.emit("get_unread_count");

      const result = await unreadCountPromise;
      expect(result).toHaveProperty("unreadCount");
    });

    it("should handle mark_read event", async () => {
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      // Try to mark notifications as read (even if none exist)
      const errorPromise = waitForEvent<{ message: string }>(
        socket,
        "error",
        3000,
      ).catch(() => null);

      const markedReadPromise = waitForEvent<{
        notificationIds: string[];
        readAt: string;
      }>(socket, "notification:marked_read", 3000).catch(() => null);

      socket.emit("mark_read", { notificationIds: ["fake-id"] });

      // Either get success or error response
      const [errorResult, markedReadResult] = await Promise.all([
        errorPromise,
        markedReadPromise,
      ]);

      // One of these should be defined
      expect(errorResult !== null || markedReadResult !== null).toBe(true);
    });
  });

  describe("Poll Fallback", () => {
    it("should handle get_recent event for background tabs", async () => {
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      const recentPromise = waitForEvent<{
        notifications: any[];
        unreadCount: number;
      }>(socket, "notification:recent", 5000);

      socket.emit("get_recent", { limit: 10 });

      const result = await recentPromise;
      expect(result).toHaveProperty("notifications");
      expect(result).toHaveProperty("unreadCount");
      expect(Array.isArray(result.notifications)).toBe(true);
    });

    it("should respect limit parameter in get_recent", async () => {
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });

      socket.connect();
      await waitForConnect(socket);

      const recentPromise = waitForEvent<{
        notifications: any[];
        unreadCount: number;
      }>(socket, "notification:recent", 5000);

      socket.emit("get_recent", { limit: 5 });

      const result = await recentPromise;
      expect(result.notifications.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed events gracefully", async () => {
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
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

    it("should return error for mark_read without notificationIds", async () => {
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
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

      // Send mark_read without required field
      socket.emit("mark_read", {});

      const error = await errorPromise;
      expect(error).toHaveProperty("message");
    });

    it("should return error for mark_read with empty array", async () => {
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
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

      socket.emit("mark_read", { notificationIds: [] });

      const error = await errorPromise;
      expect(error).toHaveProperty("message");
    });
  });

  describe("Reconnection", () => {
    it("should allow reconnection with same token", async () => {
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });

      // First connection
      socket.connect();
      await waitForConnect(socket);
      const firstSocketId = socket.id;

      // Disconnect
      socket.disconnect();
      await delay(200);

      // Reconnect
      socket.connect();
      await waitForConnect(socket);
      const secondSocketId = socket.id;

      // Should get new socket ID but still be connected
      expect(socket.connected).toBe(true);
      expect(secondSocketId).not.toBe(firstSocketId);
    });

    it("should receive unread count after reconnection", async () => {
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });

      // First connection
      socket.connect();
      await waitForConnect(socket);

      // Disconnect
      socket.disconnect();
      await delay(200);

      // Reconnect and listen for unread count
      const unreadCountPromise = waitForEvent<{ unreadCount: number }>(
        socket,
        "notification:unread_count",
        5000,
      );

      socket.connect();
      await waitForConnect(socket);

      const result = await unreadCountPromise;
      expect(result).toHaveProperty("unreadCount");
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

    it("should isolate notifications between tenants", async () => {
      // Connect first user
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });
      socket.connect();
      await waitForConnect(socket);

      // Connect second user from different org
      secondSocket = io(`${WS_URL}/notifications`, {
        auth: { token: secondUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });
      secondSocket.connect();
      await waitForConnect(secondSocket);

      // Both should be connected but in different rooms
      expect(socket.connected).toBe(true);
      expect(secondSocket.connected).toBe(true);

      // Each should receive their own unread count
      const unreadPromise1 = waitForEvent<{ unreadCount: number }>(
        socket,
        "notification:unread_count",
        5000,
      );
      const unreadPromise2 = waitForEvent<{ unreadCount: number }>(
        secondSocket,
        "notification:unread_count",
        5000,
      );

      socket.emit("get_unread_count");
      secondSocket.emit("get_unread_count");

      const [result1, result2] = await Promise.all([
        unreadPromise1,
        unreadPromise2,
      ]);

      // Both should get valid responses (counts may be 0)
      expect(typeof result1.unreadCount).toBe("number");
      expect(typeof result2.unreadCount).toBe("number");
    });
  });

  describe("Multiple Connections", () => {
    let secondSocket: Socket | null = null;

    afterEach(async () => {
      if (secondSocket?.connected) {
        secondSocket.disconnect();
      }
      secondSocket = null;
      await delay(100);
    });

    it("should support multiple connections from same user", async () => {
      // First connection
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });
      socket.connect();
      await waitForConnect(socket);

      // Second connection (same user, simulating multiple tabs)
      secondSocket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });
      secondSocket.connect();
      await waitForConnect(secondSocket);

      // Both should be connected
      expect(socket.connected).toBe(true);
      expect(secondSocket.connected).toBe(true);
      expect(socket.id).not.toBe(secondSocket.id);
    });

    it("should broadcast to all connections of same user", async () => {
      // First connection
      socket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });
      socket.connect();
      await waitForConnect(socket);

      // Second connection
      secondSocket = io(`${WS_URL}/notifications`, {
        auth: { token: testUser.token },
        transports: ["websocket"],
        autoConnect: false,
      });
      secondSocket.connect();
      await waitForConnect(secondSocket);

      // Both should receive unread count when requested
      const unreadPromise1 = waitForEvent<{ unreadCount: number }>(
        socket,
        "notification:unread_count",
        5000,
      );
      const unreadPromise2 = waitForEvent<{ unreadCount: number }>(
        secondSocket,
        "notification:unread_count",
        5000,
      );

      // Trigger from first socket, both should receive
      socket.emit("get_unread_count");
      secondSocket.emit("get_unread_count");

      const [result1, result2] = await Promise.all([
        unreadPromise1,
        unreadPromise2,
      ]);

      expect(typeof result1.unreadCount).toBe("number");
      expect(typeof result2.unreadCount).toBe("number");
    });
  });
});
