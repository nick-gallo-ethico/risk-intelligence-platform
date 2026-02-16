/**
 * JWT WS GUARD - UNIT TESTS
 *
 * Tests for the JwtWsGuard (WebSocket JWT authentication).
 * Key test scenarios:
 * - Extract token from auth object (priority 1)
 * - Extract token from Authorization header (priority 2)
 * - Extract token from query string (priority 3)
 * - Throw WsException when no token provided
 * - Throw WsException when token is invalid/expired
 * - Set user on socket data when token is valid
 * - Handle token expiry notification
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import {
  JwtWsGuard,
  WsErrorCode,
  WsUserData,
  getWsUser,
  getWsTenantId,
} from "./jwt-ws.guard";

describe("JwtWsGuard", () => {
  let guard: JwtWsGuard;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  // Helper to create mock socket
  const createMockSocket = (options: {
    authToken?: string;
    authorizationHeader?: string;
    queryToken?: string;
  }): Socket => {
    const socket = {
      id: "socket-123",
      handshake: {
        auth: options.authToken ? { token: options.authToken } : {},
        headers: options.authorizationHeader
          ? { authorization: options.authorizationHeader }
          : {},
        query: options.queryToken ? { token: options.queryToken } : {},
      },
      data: {},
      emit: jest.fn(),
    } as unknown as Socket;
    return socket;
  };

  // Helper to create mock WebSocket execution context
  const createMockWsContext = (socket: Socket): ExecutionContext => {
    return {
      switchToWs: () => ({
        getClient: <T = unknown>() => socket as T,
        getData: <T = unknown>() => ({}) as T,
        getPattern: () => "test-event",
      }),
      switchToHttp: jest.fn(),
      switchToRpc: jest.fn(),
      getHandler: jest.fn(),
      getClass: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;
  };

  // Valid JWT payload
  const mockPayload = {
    sub: "user-uuid-123",
    email: "test@example.com",
    role: "COMPLIANCE_OFFICER",
    organizationId: "org-uuid-456",
    sessionId: "session-uuid-789",
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  };

  beforeEach(async () => {
    const mockJwtService = {
      verifyAsync: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue("test-jwt-secret"),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtWsGuard,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    guard = module.get<JwtWsGuard>(JwtWsGuard);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("canActivate()", () => {
    describe("token extraction", () => {
      it("should extract token from auth object (priority 1)", async () => {
        // Arrange
        const socket = createMockSocket({ authToken: "auth-object-token" });
        const context = createMockWsContext(socket);
        jwtService.verifyAsync.mockResolvedValue(mockPayload);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(jwtService.verifyAsync).toHaveBeenCalledWith(
          "auth-object-token",
          { secret: "test-jwt-secret" },
        );
      });

      it("should extract token from Authorization header (priority 2)", async () => {
        // Arrange
        const socket = createMockSocket({
          authorizationHeader: "Bearer header-token",
        });
        const context = createMockWsContext(socket);
        jwtService.verifyAsync.mockResolvedValue(mockPayload);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(jwtService.verifyAsync).toHaveBeenCalledWith("header-token", {
          secret: "test-jwt-secret",
        });
      });

      it("should extract token from query string (priority 3)", async () => {
        // Arrange
        const socket = createMockSocket({ queryToken: "query-token" });
        const context = createMockWsContext(socket);
        jwtService.verifyAsync.mockResolvedValue(mockPayload);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(jwtService.verifyAsync).toHaveBeenCalledWith("query-token", {
          secret: "test-jwt-secret",
        });
      });

      it("should prefer auth object over Authorization header", async () => {
        // Arrange
        const socket = createMockSocket({
          authToken: "auth-object-token",
          authorizationHeader: "Bearer header-token",
        });
        const context = createMockWsContext(socket);
        jwtService.verifyAsync.mockResolvedValue(mockPayload);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(jwtService.verifyAsync).toHaveBeenCalledWith(
          "auth-object-token",
          expect.any(Object),
        );
      });

      it("should prefer Authorization header over query string", async () => {
        // Arrange
        const socket = createMockSocket({
          authorizationHeader: "Bearer header-token",
          queryToken: "query-token",
        });
        const context = createMockWsContext(socket);
        jwtService.verifyAsync.mockResolvedValue(mockPayload);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(jwtService.verifyAsync).toHaveBeenCalledWith("header-token", {
          secret: "test-jwt-secret",
        });
      });
    });

    describe("missing token", () => {
      it("should throw WsException with MISSING_TOKEN code when no token provided", async () => {
        // Arrange
        const socket = createMockSocket({});
        const context = createMockWsContext(socket);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(WsException);
        try {
          await guard.canActivate(context);
        } catch (error) {
          expect(error).toBeInstanceOf(WsException);
          const wsError = error as WsException;
          const errorData = wsError.getError() as {
            code: string;
            message: string;
          };
          expect(errorData.code).toBe(WsErrorCode.MISSING_TOKEN);
          expect(errorData.message).toBe("Authentication token required");
        }
      });

      it("should ignore non-Bearer Authorization headers", async () => {
        // Arrange - only Basic auth header, no Bearer
        const socket = createMockSocket({
          authorizationHeader: "Basic credentials",
        });
        const context = createMockWsContext(socket);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(WsException);
      });
    });

    describe("invalid token", () => {
      it("should throw WsException with TOKEN_EXPIRED code on TokenExpiredError", async () => {
        // Arrange
        const socket = createMockSocket({ authToken: "expired-token" });
        const context = createMockWsContext(socket);
        const expiredError = new Error("jwt expired");
        expiredError.name = "TokenExpiredError";
        jwtService.verifyAsync.mockRejectedValue(expiredError);

        // Act & Assert
        try {
          await guard.canActivate(context);
          fail("Expected WsException to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(WsException);
          const wsError = error as WsException;
          const errorData = wsError.getError() as {
            code: string;
            message: string;
          };
          expect(errorData.code).toBe(WsErrorCode.TOKEN_EXPIRED);
          expect(errorData.message).toContain("expired");
        }
      });

      it("should throw WsException with INVALID_TOKEN code on JsonWebTokenError", async () => {
        // Arrange
        const socket = createMockSocket({ authToken: "malformed-token" });
        const context = createMockWsContext(socket);
        const jwtError = new Error("jwt malformed");
        jwtError.name = "JsonWebTokenError";
        jwtService.verifyAsync.mockRejectedValue(jwtError);

        // Act & Assert
        try {
          await guard.canActivate(context);
          fail("Expected WsException to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(WsException);
          const wsError = error as WsException;
          const errorData = wsError.getError() as {
            code: string;
            message: string;
          };
          expect(errorData.code).toBe(WsErrorCode.INVALID_TOKEN);
          expect(errorData.message).toBe("Invalid token format");
        }
      });

      it("should throw WsException with INVALID_TOKEN code on NotBeforeError", async () => {
        // Arrange
        const socket = createMockSocket({ authToken: "not-yet-valid-token" });
        const context = createMockWsContext(socket);
        const notBeforeError = new Error("jwt not active");
        notBeforeError.name = "NotBeforeError";
        jwtService.verifyAsync.mockRejectedValue(notBeforeError);

        // Act & Assert
        try {
          await guard.canActivate(context);
          fail("Expected WsException to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(WsException);
          const wsError = error as WsException;
          const errorData = wsError.getError() as {
            code: string;
            message: string;
          };
          expect(errorData.code).toBe(WsErrorCode.INVALID_TOKEN);
          expect(errorData.message).toBe("Token not yet valid");
        }
      });

      it("should throw WsException with UNAUTHORIZED code on unknown error", async () => {
        // Arrange
        const socket = createMockSocket({ authToken: "some-token" });
        const context = createMockWsContext(socket);
        jwtService.verifyAsync.mockRejectedValue(new Error("Unknown error"));

        // Act & Assert
        try {
          await guard.canActivate(context);
          fail("Expected WsException to be thrown");
        } catch (error) {
          expect(error).toBeInstanceOf(WsException);
          const wsError = error as WsException;
          const errorData = wsError.getError() as {
            code: string;
            message: string;
          };
          expect(errorData.code).toBe(WsErrorCode.UNAUTHORIZED);
          expect(errorData.message).toBe("Authentication failed");
        }
      });
    });

    describe("valid token", () => {
      it("should set user data on socket when token is valid", async () => {
        // Arrange
        const socket = createMockSocket({ authToken: "valid-token" });
        const context = createMockWsContext(socket);
        jwtService.verifyAsync.mockResolvedValue(mockPayload);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(socket.data.user).toEqual({
          id: "user-uuid-123",
          email: "test@example.com",
          role: "COMPLIANCE_OFFICER",
          organizationId: "org-uuid-456",
        } as WsUserData);
      });

      it("should set tenantId on socket data", async () => {
        // Arrange
        const socket = createMockSocket({ authToken: "valid-token" });
        const context = createMockWsContext(socket);
        jwtService.verifyAsync.mockResolvedValue(mockPayload);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(socket.data.tenantId).toBe("org-uuid-456");
      });

      it("should set sessionId on socket data", async () => {
        // Arrange
        const socket = createMockSocket({ authToken: "valid-token" });
        const context = createMockWsContext(socket);
        jwtService.verifyAsync.mockResolvedValue(mockPayload);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(socket.data.sessionId).toBe("session-uuid-789");
      });
    });

    describe("token expiry notification", () => {
      it("should emit auth:refresh-needed when token is about to expire", async () => {
        // Arrange
        const socket = createMockSocket({ authToken: "expiring-token" });
        const context = createMockWsContext(socket);
        // Token expires in 30 seconds (within 60 second buffer)
        const expiringPayload = {
          ...mockPayload,
          exp: Math.floor(Date.now() / 1000) + 30,
        };
        jwtService.verifyAsync.mockResolvedValue(expiringPayload);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(socket.emit).toHaveBeenCalledWith("auth:refresh-needed", {
          expiresIn: expect.any(Number),
          expiresAt: expect.any(String),
        });
      });

      it("should not emit auth:refresh-needed when token has plenty of time", async () => {
        // Arrange
        const socket = createMockSocket({ authToken: "valid-token" });
        const context = createMockWsContext(socket);
        // Token expires in 10 minutes (well outside 60 second buffer)
        jwtService.verifyAsync.mockResolvedValue(mockPayload);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(socket.emit).not.toHaveBeenCalledWith(
          "auth:refresh-needed",
          expect.any(Object),
        );
      });

      it("should handle payload without exp field", async () => {
        // Arrange
        const socket = createMockSocket({ authToken: "no-exp-token" });
        const context = createMockWsContext(socket);
        const noExpPayload = { ...mockPayload, exp: undefined };
        jwtService.verifyAsync.mockResolvedValue(noExpPayload);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(socket.emit).not.toHaveBeenCalled();
      });
    });

    describe("config service integration", () => {
      it("should get JWT_SECRET from config service", async () => {
        // Arrange
        const socket = createMockSocket({ authToken: "valid-token" });
        const context = createMockWsContext(socket);
        jwtService.verifyAsync.mockResolvedValue(mockPayload);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(configService.get).toHaveBeenCalledWith("JWT_SECRET");
      });
    });
  });

  describe("helper functions", () => {
    describe("getWsUser()", () => {
      it("should return user data from socket", () => {
        // Arrange
        const socket = {
          data: {
            user: {
              id: "user-123",
              email: "test@example.com",
              role: "EMPLOYEE",
              organizationId: "org-456",
            },
          },
        } as unknown as Socket;

        // Act
        const user = getWsUser(socket);

        // Assert
        expect(user).toEqual({
          id: "user-123",
          email: "test@example.com",
          role: "EMPLOYEE",
          organizationId: "org-456",
        });
      });

      it("should return undefined when no user on socket", () => {
        // Arrange
        const socket = { data: {} } as unknown as Socket;

        // Act
        const user = getWsUser(socket);

        // Assert
        expect(user).toBeUndefined();
      });
    });

    describe("getWsTenantId()", () => {
      it("should return tenantId from socket", () => {
        // Arrange
        const socket = {
          data: { tenantId: "tenant-123" },
        } as unknown as Socket;

        // Act
        const tenantId = getWsTenantId(socket);

        // Assert
        expect(tenantId).toBe("tenant-123");
      });

      it("should return undefined when no tenantId on socket", () => {
        // Arrange
        const socket = { data: {} } as unknown as Socket;

        // Act
        const tenantId = getWsTenantId(socket);

        // Assert
        expect(tenantId).toBeUndefined();
      });
    });
  });

  describe("WsErrorCode constants", () => {
    it("should have correct error code values", () => {
      expect(WsErrorCode.UNAUTHORIZED).toBe("UNAUTHORIZED");
      expect(WsErrorCode.TOKEN_EXPIRED).toBe("TOKEN_EXPIRED");
      expect(WsErrorCode.INVALID_TOKEN).toBe("INVALID_TOKEN");
      expect(WsErrorCode.MISSING_TOKEN).toBe("MISSING_TOKEN");
    });
  });
});
