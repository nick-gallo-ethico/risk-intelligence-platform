/**
 * ImpersonationMiddleware - Unit Tests
 *
 * Tests for the ImpersonationMiddleware covering:
 * - Detection of X-Impersonation-Session header
 * - Session validation via ImpersonationService
 * - Request context modification when impersonation active
 * - RLS tenant context override via Prisma
 * - Response header setting for client UI
 * - Error handling for Redis/DB failures
 *
 * @see impersonation.middleware.ts for implementation
 * @see 36-03-PLAN.md for TEST-03 requirement
 */

import { Test, TestingModule } from "@nestjs/testing";
import { Request, Response, NextFunction } from "express";
import {
  ImpersonationMiddleware,
  isImpersonating,
  getEffectiveOrganizationId,
} from "./impersonation.middleware";
import {
  ImpersonationService,
  ImpersonationContext,
} from "./impersonation.service";
import { PrismaService } from "../../prisma/prisma.service";
import { InternalRole } from "../types/internal-roles.types";

describe("ImpersonationMiddleware", () => {
  let middleware: ImpersonationMiddleware;
  let impersonationService: jest.Mocked<ImpersonationService>;
  let prismaService: jest.Mocked<PrismaService>;

  // Test data
  const mockSessionId = "session-uuid-123-456-789";
  const mockOperatorUserId = "operator-uuid-abc-def";
  const mockTargetOrgId = "target-org-uuid-xyz";

  // Mock valid impersonation context
  const mockImpersonationContext: ImpersonationContext = {
    sessionId: mockSessionId,
    operatorUserId: mockOperatorUserId,
    operatorRole: InternalRole.SUPPORT_L1,
    targetOrganizationId: mockTargetOrgId,
    reason: "Support ticket investigation",
    ticketId: "TICKET-001",
    expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
  };

  // Helper to create mock Request
  const createMockRequest = (options: {
    headers?: Record<string, string>;
    organizationId?: string;
  }): Request =>
    ({
      headers: options.headers || {},
      organizationId: options.organizationId,
      impersonation: undefined,
    }) as unknown as Request;

  // Helper to create mock Response
  const createMockResponse = (): Response => {
    const headers: Record<string, string> = {};
    return {
      setHeader: jest.fn((name: string, value: string) => {
        headers[name] = value;
      }),
      getHeader: jest.fn((name: string) => headers[name]),
    } as unknown as Response;
  };

  beforeEach(async () => {
    const mockImpersonationService = {
      validateSession: jest.fn(),
    };

    const mockPrismaService = {
      $executeRawUnsafe: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImpersonationMiddleware,
        {
          provide: ImpersonationService,
          useValue: mockImpersonationService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    middleware = module.get<ImpersonationMiddleware>(ImpersonationMiddleware);
    impersonationService = module.get(ImpersonationService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("session detection", () => {
    it("should check for impersonation session on each request with header", async () => {
      // Arrange
      const req = createMockRequest({
        headers: { "x-impersonation-session": mockSessionId },
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();
      impersonationService.validateSession.mockResolvedValue(
        mockImpersonationContext,
      );

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(impersonationService.validateSession).toHaveBeenCalledWith(
        mockSessionId,
      );
      expect(next).toHaveBeenCalled();
    });

    it("should not call validateSession when no header present", async () => {
      // Arrange
      const req = createMockRequest({});
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(impersonationService.validateSession).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });

  describe("valid impersonation context", () => {
    it("should modify request.impersonation with impersonated identity when active", async () => {
      // Arrange
      const req = createMockRequest({
        headers: { "x-impersonation-session": mockSessionId },
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();
      impersonationService.validateSession.mockResolvedValue(
        mockImpersonationContext,
      );

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(req.impersonation).toBeDefined();
      expect(req.impersonation?.sessionId).toBe(mockSessionId);
      expect(req.impersonation?.targetOrganizationId).toBe(mockTargetOrgId);
      expect(req.impersonation?.operatorUserId).toBe(mockOperatorUserId);
      expect(req.impersonation?.operatorRole).toBe(InternalRole.SUPPORT_L1);
    });

    it("should override RLS tenant context via Prisma $executeRawUnsafe", async () => {
      // Arrange
      const req = createMockRequest({
        headers: { "x-impersonation-session": mockSessionId },
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();
      impersonationService.validateSession.mockResolvedValue(
        mockImpersonationContext,
      );

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(prismaService.$executeRawUnsafe).toHaveBeenCalled();
      const call = (prismaService.$executeRawUnsafe as jest.Mock).mock
        .calls[0][0];
      expect(call).toContain("set_config");
      expect(call).toContain("app.current_organization");
      expect(call).toContain(mockTargetOrgId);
    });

    it("should set X-Impersonation-Remaining response header", async () => {
      // Arrange
      const req = createMockRequest({
        headers: { "x-impersonation-session": mockSessionId },
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();
      impersonationService.validateSession.mockResolvedValue(
        mockImpersonationContext,
      );

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith(
        "X-Impersonation-Remaining",
        expect.any(String),
      );
      // Verify remaining time is positive
      const remainingCall = (res.setHeader as jest.Mock).mock.calls.find(
        (call) => call[0] === "X-Impersonation-Remaining",
      );
      const remainingSeconds = parseInt(remainingCall[1], 10);
      expect(remainingSeconds).toBeGreaterThan(0);
    });

    it("should set X-Impersonation-Org response header", async () => {
      // Arrange
      const req = createMockRequest({
        headers: { "x-impersonation-session": mockSessionId },
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();
      impersonationService.validateSession.mockResolvedValue(
        mockImpersonationContext,
      );

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith(
        "X-Impersonation-Org",
        mockTargetOrgId,
      );
    });

    it("should preserve original organizationId reference on request", async () => {
      // Arrange
      const originalOrgId = "original-org-uuid";
      const req = createMockRequest({
        headers: { "x-impersonation-session": mockSessionId },
        organizationId: originalOrgId,
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();
      impersonationService.validateSession.mockResolvedValue(
        mockImpersonationContext,
      );

      // Act
      await middleware.use(req, res, next);

      // Assert
      // Original organizationId preserved (not overwritten by middleware)
      expect(req.organizationId).toBe(originalOrgId);
      // Impersonation context set separately
      expect(req.impersonation?.targetOrganizationId).toBe(mockTargetOrgId);
    });
  });

  describe("invalid/expired session", () => {
    it("should pass through unchanged when no impersonation active", async () => {
      // Arrange
      const req = createMockRequest({});
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(req.impersonation).toBeUndefined();
      expect(prismaService.$executeRawUnsafe).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });

    it("should set X-Impersonation-Invalid header when session is invalid", async () => {
      // Arrange
      const req = createMockRequest({
        headers: { "x-impersonation-session": mockSessionId },
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();
      impersonationService.validateSession.mockResolvedValue(null);

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith(
        "X-Impersonation-Invalid",
        "true",
      );
      expect(req.impersonation).toBeUndefined();
    });

    it("should not override RLS context when session is invalid", async () => {
      // Arrange
      const req = createMockRequest({
        headers: { "x-impersonation-session": mockSessionId },
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();
      impersonationService.validateSession.mockResolvedValue(null);

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(prismaService.$executeRawUnsafe).not.toHaveBeenCalled();
    });
  });

  describe("next() behavior", () => {
    it("should call next() in all cases - valid session", async () => {
      // Arrange
      const req = createMockRequest({
        headers: { "x-impersonation-session": mockSessionId },
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();
      impersonationService.validateSession.mockResolvedValue(
        mockImpersonationContext,
      );

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should call next() in all cases - invalid session", async () => {
      // Arrange
      const req = createMockRequest({
        headers: { "x-impersonation-session": mockSessionId },
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();
      impersonationService.validateSession.mockResolvedValue(null);

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should call next() in all cases - no header", async () => {
      // Arrange
      const req = createMockRequest({});
      const res = createMockResponse();
      const next: NextFunction = jest.fn();

      // Act
      await middleware.use(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe("error handling", () => {
    it("should propagate validateSession errors (fail-fast behavior)", async () => {
      // Arrange
      const req = createMockRequest({
        headers: { "x-impersonation-session": mockSessionId },
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();
      impersonationService.validateSession.mockRejectedValue(
        new Error("Redis connection failed"),
      );

      // Act & Assert - errors propagate (fail-fast pattern for security)
      await expect(middleware.use(req, res, next)).rejects.toThrow(
        "Redis connection failed",
      );
      // next() should not be called when validation fails
      expect(next).not.toHaveBeenCalled();
    });

    it("should propagate Prisma RLS errors (fail-fast behavior)", async () => {
      // Arrange
      const req = createMockRequest({
        headers: { "x-impersonation-session": mockSessionId },
      });
      const res = createMockResponse();
      const next: NextFunction = jest.fn();
      impersonationService.validateSession.mockResolvedValue(
        mockImpersonationContext,
      );
      prismaService.$executeRawUnsafe.mockRejectedValue(
        new Error("Database connection lost"),
      );

      // Act & Assert - errors propagate (fail-fast pattern for security)
      await expect(middleware.use(req, res, next)).rejects.toThrow(
        "Database connection lost",
      );
      // next() should not be called when RLS setup fails
      expect(next).not.toHaveBeenCalled();
    });
  });
});

describe("isImpersonating helper", () => {
  it("should return true when valid impersonation context is present", () => {
    // Arrange
    const req = {
      impersonation: {
        sessionId: "session-123",
        operatorUserId: "operator-456",
        operatorRole: InternalRole.SUPPORT_L1,
        targetOrganizationId: "org-789",
        reason: "Testing",
        expiresAt: new Date(Date.now() + 60 * 1000), // 60 seconds from now
      },
    } as unknown as Request;

    // Act
    const result = isImpersonating(req);

    // Assert
    expect(result).toBe(true);
  });

  it("should return false when no impersonation context", () => {
    // Arrange
    const req = {
      impersonation: undefined,
    } as unknown as Request;

    // Act
    const result = isImpersonating(req);

    // Assert
    expect(result).toBe(false);
  });

  it("should return false when impersonation session is expired", () => {
    // Arrange
    const req = {
      impersonation: {
        sessionId: "session-123",
        operatorUserId: "operator-456",
        operatorRole: InternalRole.SUPPORT_L1,
        targetOrganizationId: "org-789",
        reason: "Testing",
        expiresAt: new Date(Date.now() - 1000), // Already expired
      },
    } as unknown as Request;

    // Act
    const result = isImpersonating(req);

    // Assert
    expect(result).toBe(false);
  });
});

describe("getEffectiveOrganizationId helper", () => {
  it("should return impersonated org if active", () => {
    // Arrange
    const req = {
      organizationId: "original-org-123",
      impersonation: {
        sessionId: "session-123",
        operatorUserId: "operator-456",
        operatorRole: InternalRole.SUPPORT_L1,
        targetOrganizationId: "impersonated-org-789",
        reason: "Testing",
        expiresAt: new Date(Date.now() + 60 * 1000),
      },
    } as unknown as Request;

    // Act
    const result = getEffectiveOrganizationId(req);

    // Assert
    expect(result).toBe("impersonated-org-789");
  });

  it("should return original org when no impersonation active", () => {
    // Arrange
    const req = {
      organizationId: "original-org-123",
      impersonation: undefined,
    } as unknown as Request;

    // Act
    const result = getEffectiveOrganizationId(req);

    // Assert
    expect(result).toBe("original-org-123");
  });

  it("should return original org when impersonation expired", () => {
    // Arrange
    const req = {
      organizationId: "original-org-123",
      impersonation: {
        sessionId: "session-123",
        operatorUserId: "operator-456",
        operatorRole: InternalRole.SUPPORT_L1,
        targetOrganizationId: "impersonated-org-789",
        reason: "Testing",
        expiresAt: new Date(Date.now() - 1000), // Expired
      },
    } as unknown as Request;

    // Act
    const result = getEffectiveOrganizationId(req);

    // Assert
    expect(result).toBe("original-org-123");
  });

  it("should return undefined when no org context at all", () => {
    // Arrange
    const req = {
      organizationId: undefined,
      impersonation: undefined,
    } as unknown as Request;

    // Act
    const result = getEffectiveOrganizationId(req);

    // Assert
    expect(result).toBeUndefined();
  });
});
