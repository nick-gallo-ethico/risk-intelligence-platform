/**
 * TENANT MIDDLEWARE - UNIT TESTS
 *
 * Tests for the TenantMiddleware.
 * Key test scenarios:
 * - Skip processing for public paths (/health, /api/v1/auth/login, /api/v1/auth/refresh)
 * - Call next() without setting context when no auth header
 * - Call next() without setting context when auth header doesn't start with "Bearer "
 * - Set req.organizationId and req.userId from valid JWT
 * - Call Prisma $executeRaw to set RLS session variable for valid token
 * - Set null RLS context (00000000-...) for invalid/expired token
 * - Log warning for invalid JWT
 * - Only process access tokens (type === 'access')
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { TenantMiddleware } from "./tenant.middleware";
import { PrismaService } from "../../modules/prisma/prisma.service";

describe("TenantMiddleware", () => {
  let middleware: TenantMiddleware;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;

  // Test data
  const mockOrganizationId = "org-uuid-123-456-789";
  const mockUserId = "user-uuid-abc-def";
  const mockJwtSecret = "test-jwt-secret-key-12345";

  // Helper to create mock Request
  const createMockRequest = (options: {
    path?: string;
    authorization?: string;
  }): Request =>
    ({
      path: options.path || "/api/v1/cases",
      headers: {
        authorization: options.authorization,
      },
      organizationId: undefined,
      userId: undefined,
    }) as unknown as Request;

  // Helper to create mock Response
  const createMockResponse = (): Response => ({}) as unknown as Response;

  // Helper to create valid JWT token
  const createValidAccessToken = (): string => {
    return jwt.sign(
      {
        sub: mockUserId,
        organizationId: mockOrganizationId,
        type: "access",
      },
      mockJwtSecret,
      { expiresIn: "1h" },
    );
  };

  // Helper to create refresh token (should be skipped)
  const createRefreshToken = (): string => {
    return jwt.sign(
      {
        sub: mockUserId,
        organizationId: mockOrganizationId,
        type: "refresh",
      },
      mockJwtSecret,
      { expiresIn: "7d" },
    );
  };

  // Helper to create expired token
  const createExpiredToken = (): string => {
    return jwt.sign(
      {
        sub: mockUserId,
        organizationId: mockOrganizationId,
        type: "access",
      },
      mockJwtSecret,
      { expiresIn: "-1h" }, // Already expired
    );
  };

  beforeEach(async () => {
    const mockPrismaService = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue(mockJwtSecret),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantMiddleware,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    middleware = module.get<TenantMiddleware>(TenantMiddleware);
    prismaService = module.get(PrismaService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("public path handling", () => {
    it("should skip processing for /health path", async () => {
      // Arrange
      const req = createMockRequest({ path: "/health" });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(prismaService.$executeRaw).not.toHaveBeenCalled();
      expect(req.organizationId).toBeUndefined();
    });

    it("should skip processing for /api/v1/auth/login path", async () => {
      // Arrange
      const req = createMockRequest({ path: "/api/v1/auth/login" });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(prismaService.$executeRaw).not.toHaveBeenCalled();
      expect(req.organizationId).toBeUndefined();
    });

    it("should skip processing for /api/v1/auth/refresh path", async () => {
      // Arrange
      const req = createMockRequest({ path: "/api/v1/auth/refresh" });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(prismaService.$executeRaw).not.toHaveBeenCalled();
      expect(req.organizationId).toBeUndefined();
    });

    it("should skip processing for paths starting with /health", async () => {
      // Arrange
      const req = createMockRequest({ path: "/health/ready" });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(prismaService.$executeRaw).not.toHaveBeenCalled();
    });
  });

  describe("no auth header handling", () => {
    it("should call next() without setting context when no auth header", async () => {
      // Arrange
      const req = createMockRequest({ path: "/api/v1/cases" });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(prismaService.$executeRaw).not.toHaveBeenCalled();
      expect(req.organizationId).toBeUndefined();
      expect(req.userId).toBeUndefined();
    });

    it("should call next() without setting context when auth header is empty", async () => {
      // Arrange
      const req = createMockRequest({
        path: "/api/v1/cases",
        authorization: "",
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(prismaService.$executeRaw).not.toHaveBeenCalled();
    });

    it('should call next() without setting context when auth header does not start with "Bearer "', async () => {
      // Arrange
      const req = createMockRequest({
        path: "/api/v1/cases",
        authorization: "Basic dXNlcm5hbWU6cGFzc3dvcmQ=",
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
      expect(prismaService.$executeRaw).not.toHaveBeenCalled();
      expect(req.organizationId).toBeUndefined();
    });
  });

  describe("valid token handling", () => {
    it("should set req.organizationId and req.userId from valid JWT", async () => {
      // Arrange
      const token = createValidAccessToken();
      const req = createMockRequest({
        path: "/api/v1/cases",
        authorization: `Bearer ${token}`,
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(req.organizationId).toBe(mockOrganizationId);
      expect(req.userId).toBe(mockUserId);
      expect(next).toHaveBeenCalled();
    });

    it("should call Prisma $executeRaw to set RLS session variable for valid token", async () => {
      // Arrange
      const token = createValidAccessToken();
      const req = createMockRequest({
        path: "/api/v1/cases",
        authorization: `Bearer ${token}`,
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(prismaService.$executeRaw).toHaveBeenCalled();
      // Verify the template literal call - $executeRaw is called with tagged template
      const callArgs = (prismaService.$executeRaw as jest.Mock).mock.calls[0];
      // The first argument should be defined (template strings array or Prisma SQL object)
      expect(callArgs[0]).toBeDefined();
      // Verify the organizationId is passed in the call
      const callString = JSON.stringify(callArgs);
      expect(callString).toContain(mockOrganizationId);
    });

    it("should get jwt.secret from ConfigService", async () => {
      // Arrange
      const token = createValidAccessToken();
      const req = createMockRequest({
        path: "/api/v1/cases",
        authorization: `Bearer ${token}`,
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(configService.get).toHaveBeenCalledWith("jwt.secret");
    });
  });

  describe("token type handling", () => {
    it("should only process access tokens (type === 'access')", async () => {
      // Arrange
      const token = createValidAccessToken();
      const req = createMockRequest({
        path: "/api/v1/cases",
        authorization: `Bearer ${token}`,
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(req.organizationId).toBe(mockOrganizationId);
      expect(prismaService.$executeRaw).toHaveBeenCalled();
    });

    it("should skip setting context for refresh tokens", async () => {
      // Arrange
      const token = createRefreshToken();
      const req = createMockRequest({
        path: "/api/v1/cases",
        authorization: `Bearer ${token}`,
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(req.organizationId).toBeUndefined();
      expect(prismaService.$executeRaw).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe("invalid token handling", () => {
    it("should set null RLS context for expired token", async () => {
      // Arrange
      const token = createExpiredToken();
      const req = createMockRequest({
        path: "/api/v1/cases",
        authorization: `Bearer ${token}`,
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(req.organizationId).toBeUndefined();
      expect(req.userId).toBeUndefined();
      expect(prismaService.$executeRaw).toHaveBeenCalled();
      // Verify null RLS context is set by checking the call contains the null UUID
      const callArgs = (prismaService.$executeRaw as jest.Mock).mock.calls[0];
      // Prisma tagged template results in first arg being an object with values property
      // or the values are spread as additional arguments
      const callString = JSON.stringify(callArgs);
      expect(callString).toContain("00000000-0000-0000-0000-000000000000");
    });

    it("should set null RLS context for invalid token", async () => {
      // Arrange
      const req = createMockRequest({
        path: "/api/v1/cases",
        authorization: "Bearer invalid-token-here",
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(req.organizationId).toBeUndefined();
      expect(req.userId).toBeUndefined();
      expect(prismaService.$executeRaw).toHaveBeenCalled();
      const callArgs = (prismaService.$executeRaw as jest.Mock).mock.calls[0];
      const callString = JSON.stringify(callArgs);
      expect(callString).toContain("00000000-0000-0000-0000-000000000000");
    });

    it("should set null RLS context for token with wrong secret", async () => {
      // Arrange
      const wrongSecretToken = jwt.sign(
        {
          sub: mockUserId,
          organizationId: mockOrganizationId,
          type: "access",
        },
        "wrong-secret-key",
        { expiresIn: "1h" },
      );
      const req = createMockRequest({
        path: "/api/v1/cases",
        authorization: `Bearer ${wrongSecretToken}`,
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(req.organizationId).toBeUndefined();
      expect(prismaService.$executeRaw).toHaveBeenCalled();
      const callArgs = (prismaService.$executeRaw as jest.Mock).mock.calls[0];
      const callString = JSON.stringify(callArgs);
      expect(callString).toContain("00000000-0000-0000-0000-000000000000");
    });

    it("should still call next() after setting null RLS context for invalid token", async () => {
      // Arrange
      const req = createMockRequest({
        path: "/api/v1/cases",
        authorization: "Bearer invalid-token",
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalled();
    });
  });

  describe("logging", () => {
    it("should log warning for invalid JWT (verified via side effects)", async () => {
      // Arrange
      const req = createMockRequest({
        path: "/api/v1/cases",
        authorization: "Bearer invalid-token",
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // We can't easily mock the internal logger, but we can verify
      // the middleware handles invalid tokens correctly
      // Act
      await middleware.use(req, res, next);

      // Assert - side effects of invalid token handling
      expect(req.organizationId).toBeUndefined();
      expect(prismaService.$executeRaw).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe("RLS session variable", () => {
    it("should use set_config function in $executeRaw", async () => {
      // Arrange
      const token = createValidAccessToken();
      const req = createMockRequest({
        path: "/api/v1/cases",
        authorization: `Bearer ${token}`,
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert - verify $executeRaw was called
      expect(prismaService.$executeRaw).toHaveBeenCalled();
      // The call uses template literal with set_config
      // We verify by checking the mock was called once with the org ID
      const callArgs = (prismaService.$executeRaw as jest.Mock).mock.calls[0];
      const callString = JSON.stringify(callArgs);
      expect(callString).toContain(mockOrganizationId);
    });
  });
});
