/**
 * THROTTLE BEHIND PROXY GUARD - UNIT TESTS
 *
 * Tests for the ThrottleBehindProxyGuard which extracts client IP from X-Forwarded-For header.
 * Key test scenarios:
 * - Extract IP from X-Forwarded-For header (first IP in comma-separated list)
 * - Extract IP from X-Real-IP header (fallback)
 * - Fall back to request.ip when no proxy headers
 * - Handle malformed X-Forwarded-For gracefully
 * - Generate correct rate limiting keys for auth endpoints
 */

import { ExecutionContext } from "@nestjs/common";
import { ThrottleBehindProxyGuard } from "./throttle-behind-proxy.guard";
import { Request } from "express";

/**
 * Test harness class to expose protected methods for testing.
 * This avoids NestJS DI complexity for ThrottlerGuard which requires
 * THROTTLER:MODULE_OPTIONS injection token.
 */
class TestableThrottleBehindProxyGuard extends ThrottleBehindProxyGuard {
  public async testGetTracker(req: Request): Promise<string> {
    return this.getTracker(req);
  }

  public testGenerateKey(
    context: ExecutionContext,
    tracker: string,
    throttlerName: string,
  ): string {
    return this.generateKey(context, tracker, throttlerName);
  }
}

describe("ThrottleBehindProxyGuard", () => {
  let guard: TestableThrottleBehindProxyGuard;

  // Helper to create mock request
  const createMockRequest = (options: {
    headers?: Record<string, string | string[]>;
    ip?: string;
    socketRemoteAddress?: string;
    path?: string;
    body?: Record<string, unknown>;
    user?: { sub: string };
  }): Request => {
    return {
      headers: options.headers || {},
      ip: options.ip,
      socket: { remoteAddress: options.socketRemoteAddress },
      path: options.path || "/api/v1/test",
      body: options.body || {},
      user: options.user,
    } as unknown as Request;
  };

  // Helper to create mock execution context
  const createMockContext = (request: Request): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: <T = Request>() => request as T,
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
      getType: () => "http",
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    // Instantiate directly without NestJS DI to avoid module options dependency
    guard = new TestableThrottleBehindProxyGuard(
      {} as never, // options
      {} as never, // storageService
      { getAllAndOverride: jest.fn() } as never, // reflector
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getTracker()", () => {
    describe("X-Forwarded-For header", () => {
      it("should use X-Forwarded-For header when present (single IP)", async () => {
        // Arrange
        const request = createMockRequest({
          headers: { "x-forwarded-for": "203.0.113.195" },
          ip: "10.0.0.1",
        });

        // Act
        const tracker = await guard.testGetTracker(request);

        // Assert
        expect(tracker).toBe("203.0.113.195");
      });

      it("should use first IP from X-Forwarded-For with multiple IPs (comma-separated)", async () => {
        // Arrange - common pattern: client, proxy1, proxy2
        const request = createMockRequest({
          headers: {
            "x-forwarded-for": "203.0.113.195, 70.41.3.18, 150.172.238.178",
          },
          ip: "10.0.0.1",
        });

        // Act
        const tracker = await guard.testGetTracker(request);

        // Assert
        expect(tracker).toBe("203.0.113.195");
      });

      it("should trim whitespace from X-Forwarded-For IP", async () => {
        // Arrange
        const request = createMockRequest({
          headers: { "x-forwarded-for": "  203.0.113.195  " },
          ip: "10.0.0.1",
        });

        // Act
        const tracker = await guard.testGetTracker(request);

        // Assert
        expect(tracker).toBe("203.0.113.195");
      });

      it("should handle X-Forwarded-For as array (multiple headers)", async () => {
        // Arrange - some proxies add multiple headers as array
        const request = createMockRequest({
          headers: {
            "x-forwarded-for": [
              "203.0.113.195",
              "70.41.3.18",
            ] as unknown as string,
          },
          ip: "10.0.0.1",
        });

        // Act
        const tracker = await guard.testGetTracker(request);

        // Assert
        expect(tracker).toBe("203.0.113.195");
      });
    });

    describe("X-Real-IP header", () => {
      it("should use X-Real-IP when X-Forwarded-For is not present", async () => {
        // Arrange
        const request = createMockRequest({
          headers: { "x-real-ip": "198.51.100.178" },
          ip: "10.0.0.1",
        });

        // Act
        const tracker = await guard.testGetTracker(request);

        // Assert
        expect(tracker).toBe("198.51.100.178");
      });

      it("should handle X-Real-IP as array", async () => {
        // Arrange
        const request = createMockRequest({
          headers: {
            "x-real-ip": ["198.51.100.178", "10.0.0.2"] as unknown as string,
          },
          ip: "10.0.0.1",
        });

        // Act
        const tracker = await guard.testGetTracker(request);

        // Assert
        expect(tracker).toBe("198.51.100.178");
      });

      it("should prefer X-Forwarded-For over X-Real-IP", async () => {
        // Arrange
        const request = createMockRequest({
          headers: {
            "x-forwarded-for": "203.0.113.195",
            "x-real-ip": "198.51.100.178",
          },
          ip: "10.0.0.1",
        });

        // Act
        const tracker = await guard.testGetTracker(request);

        // Assert
        expect(tracker).toBe("203.0.113.195");
      });
    });

    describe("fallback behavior", () => {
      it("should fall back to request.ip when no proxy headers", async () => {
        // Arrange
        const request = createMockRequest({
          headers: {},
          ip: "192.0.2.1",
        });

        // Act
        const tracker = await guard.testGetTracker(request);

        // Assert
        expect(tracker).toBe("192.0.2.1");
      });

      it("should fall back to socket.remoteAddress when request.ip is undefined", async () => {
        // Arrange
        const request = createMockRequest({
          headers: {},
          ip: undefined,
          socketRemoteAddress: "192.0.2.50",
        });

        // Act
        const tracker = await guard.testGetTracker(request);

        // Assert
        expect(tracker).toBe("192.0.2.50");
      });

      it("should return 'unknown' when no IP sources available", async () => {
        // Arrange
        const request = createMockRequest({
          headers: {},
          ip: undefined,
          socketRemoteAddress: undefined,
        });

        // Act
        const tracker = await guard.testGetTracker(request);

        // Assert
        expect(tracker).toBe("unknown");
      });
    });

    describe("edge cases", () => {
      it("should handle empty X-Forwarded-For and fall back", async () => {
        // Arrange
        const request = createMockRequest({
          headers: { "x-forwarded-for": "" },
          ip: "192.0.2.1",
        });

        // Act
        const tracker = await guard.testGetTracker(request);

        // Assert - empty string is falsy, should fall back
        expect(tracker).toBe("192.0.2.1");
      });

      it("should handle IPv6 addresses", async () => {
        // Arrange
        const request = createMockRequest({
          headers: { "x-forwarded-for": "2001:db8:85a3::8a2e:370:7334" },
        });

        // Act
        const tracker = await guard.testGetTracker(request);

        // Assert
        expect(tracker).toBe("2001:db8:85a3::8a2e:370:7334");
      });
    });
  });

  describe("generateKey()", () => {
    describe("login endpoint tracking", () => {
      it("should include email in key for login endpoint", () => {
        // Arrange
        const request = createMockRequest({
          path: "/api/v1/auth/login",
          body: { email: "User@Example.com", password: "secret" },
        });
        const context = createMockContext(request);

        // Act
        const key = guard.testGenerateKey(context, "192.0.2.1", "default");

        // Assert
        expect(key).toBe("default:192.0.2.1:user@example.com");
      });

      it("should lowercase email in login key", () => {
        // Arrange
        const request = createMockRequest({
          path: "/api/v1/auth/login",
          body: { email: "ADMIN@EXAMPLE.COM" },
        });
        const context = createMockContext(request);

        // Act
        const key = guard.testGenerateKey(context, "192.0.2.1", "default");

        // Assert
        expect(key).toContain("admin@example.com");
      });

      it("should not include email if not provided in login body", () => {
        // Arrange
        const request = createMockRequest({
          path: "/api/v1/auth/login",
          body: {},
        });
        const context = createMockContext(request);

        // Act
        const key = guard.testGenerateKey(context, "192.0.2.1", "default");

        // Assert
        expect(key).toBe("default:192.0.2.1");
      });
    });

    describe("MFA endpoint tracking", () => {
      it("should include user ID in key for MFA endpoint when user present", () => {
        // Arrange
        const request = createMockRequest({
          path: "/api/v1/auth/mfa/verify",
          user: { sub: "user-uuid-123" },
        });
        const context = createMockContext(request);

        // Act
        const key = guard.testGenerateKey(context, "192.0.2.1", "default");

        // Assert
        expect(key).toBe("default:192.0.2.1:user-uuid-123");
      });

      it("should not include user ID if not present on MFA endpoint", () => {
        // Arrange
        const request = createMockRequest({
          path: "/api/v1/auth/mfa/setup",
        });
        const context = createMockContext(request);

        // Act
        const key = guard.testGenerateKey(context, "192.0.2.1", "default");

        // Assert
        expect(key).toBe("default:192.0.2.1");
      });
    });

    describe("other endpoints", () => {
      it("should use base key for non-auth endpoints", () => {
        // Arrange
        const request = createMockRequest({
          path: "/api/v1/cases",
          body: { email: "test@example.com" }, // Should not be included
        });
        const context = createMockContext(request);

        // Act
        const key = guard.testGenerateKey(context, "192.0.2.1", "default");

        // Assert
        expect(key).toBe("default:192.0.2.1");
      });

      it("should include throttler name in key", () => {
        // Arrange
        const request = createMockRequest({ path: "/api/v1/test" });
        const context = createMockContext(request);

        // Act
        const key = guard.testGenerateKey(context, "192.0.2.1", "strict");

        // Assert
        expect(key).toBe("strict:192.0.2.1");
      });
    });
  });
});
