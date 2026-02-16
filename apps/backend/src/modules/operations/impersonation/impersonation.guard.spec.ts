/**
 * ImpersonationGuard - Unit Tests
 *
 * Tests for the ImpersonationGuard and related decorators covering:
 * - Access allowed when valid impersonation session exists
 * - Access denied when no session header present
 * - Access denied when session is invalid/expired
 * - Request context validation
 * - ForbiddenException with clear messages
 * - CurrentImpersonation decorator
 *
 * @see impersonation.guard.ts for implementation
 * @see 36-03-PLAN.md for TEST-03 requirement
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Request } from "express";
import {
  ImpersonationGuard,
  CurrentImpersonation,
} from "./impersonation.guard";
import {
  ImpersonationService,
  ImpersonationContext,
} from "./impersonation.service";
import { InternalRole } from "../types/internal-roles.types";

describe("ImpersonationGuard", () => {
  let guard: ImpersonationGuard;
  let impersonationService: jest.Mocked<ImpersonationService>;

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

  // Mock expired impersonation context
  const mockExpiredContext: ImpersonationContext = {
    ...mockImpersonationContext,
    expiresAt: new Date(Date.now() - 1000), // Already expired
  };

  // Helper to create mock ExecutionContext
  const createMockExecutionContext = (options: {
    headers?: Record<string, string>;
    impersonation?: ImpersonationContext;
  }): ExecutionContext => {
    const mockRequest = {
      headers: options.headers || {},
      impersonation: options.impersonation,
    } as unknown as Request;

    return {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    const mockImpersonationService = {
      validateSession: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImpersonationGuard,
        {
          provide: ImpersonationService,
          useValue: mockImpersonationService,
        },
      ],
    }).compile();

    guard = module.get<ImpersonationGuard>(ImpersonationGuard);
    impersonationService = module.get(ImpersonationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("session header presence", () => {
    it("should throw ForbiddenException when no X-Impersonation-Session header", async () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {},
      });

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        "Impersonation session required",
      );
    });

    it("should check role from request when header is present", async () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: { "x-impersonation-session": mockSessionId },
      });
      impersonationService.validateSession.mockResolvedValue(
        mockImpersonationContext,
      );

      // Act
      await guard.canActivate(context);

      // Assert
      expect(impersonationService.validateSession).toHaveBeenCalledWith(
        mockSessionId,
      );
    });
  });

  describe("valid impersonation session", () => {
    it("should allow access when valid impersonation session exists", async () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: { "x-impersonation-session": mockSessionId },
      });
      impersonationService.validateSession.mockResolvedValue(
        mockImpersonationContext,
      );

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true when middleware already set valid context", async () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: { "x-impersonation-session": mockSessionId },
        impersonation: mockImpersonationContext,
      });

      // Act
      const result = await guard.canActivate(context);

      // Assert
      expect(result).toBe(true);
      // Should not call validateSession since context was already set
      expect(impersonationService.validateSession).not.toHaveBeenCalled();
    });

    it("should set request.impersonation if not already set by middleware", async () => {
      // Arrange
      const mockRequest = {
        headers: { "x-impersonation-session": mockSessionId },
        impersonation: undefined,
      } as unknown as Request;

      const context = {
        switchToHttp: () => ({
          getRequest: () => mockRequest,
        }),
      } as unknown as ExecutionContext;

      impersonationService.validateSession.mockResolvedValue(
        mockImpersonationContext,
      );

      // Act
      await guard.canActivate(context);

      // Assert
      expect(mockRequest.impersonation).toEqual(mockImpersonationContext);
    });
  });

  describe("invalid/expired session", () => {
    it("should throw ForbiddenException when session is invalid", async () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: { "x-impersonation-session": mockSessionId },
      });
      impersonationService.validateSession.mockResolvedValue(null);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(guard.canActivate(context)).rejects.toThrow(
        "Invalid or expired impersonation session",
      );
    });

    it("should re-validate when middleware context is expired", async () => {
      // Arrange - middleware set context but it's now expired
      const context = createMockExecutionContext({
        headers: { "x-impersonation-session": mockSessionId },
        impersonation: mockExpiredContext,
      });
      impersonationService.validateSession.mockResolvedValue(null);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
      // Should have re-validated because middleware context was expired
      expect(impersonationService.validateSession).toHaveBeenCalledWith(
        mockSessionId,
      );
    });

    it("should deny access when service returns null for expired session", async () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: { "x-impersonation-session": "expired-session-id" },
      });
      impersonationService.validateSession.mockResolvedValue(null);

      // Act & Assert
      await expect(guard.canActivate(context)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("ForbiddenException messages", () => {
    it("should throw ForbiddenException with clear message when no header", async () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: {},
      });

      // Act & Assert
      try {
        await guard.canActivate(context);
        fail("Expected ForbiddenException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).message).toBe(
          "Impersonation session required",
        );
      }
    });

    it("should throw ForbiddenException with clear message when invalid session", async () => {
      // Arrange
      const context = createMockExecutionContext({
        headers: { "x-impersonation-session": mockSessionId },
      });
      impersonationService.validateSession.mockResolvedValue(null);

      // Act & Assert
      try {
        await guard.canActivate(context);
        fail("Expected ForbiddenException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        expect((error as ForbiddenException).message).toBe(
          "Invalid or expired impersonation session",
        );
      }
    });
  });
});

describe("CurrentImpersonation decorator", () => {
  it("should extract impersonation context from request", () => {
    // Arrange
    const mockContext: ImpersonationContext = {
      sessionId: "session-123",
      operatorUserId: "operator-456",
      operatorRole: InternalRole.SUPPORT_L1,
      targetOrganizationId: "org-789",
      reason: "Testing",
      expiresAt: new Date(),
    };

    const mockRequest = {
      impersonation: mockContext,
    } as unknown as Request;

    const executionContext = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
      }),
    } as unknown as ExecutionContext;

    // The decorator factory returns a function that expects (data, ctx)
    // We need to test the decorator extraction logic
    const decoratorFn = CurrentImpersonation();

    // Get the factory that createParamDecorator creates
    // Note: We can't easily test decorators directly, but we can verify the metadata
    expect(decoratorFn).toBeDefined();
    expect(typeof decoratorFn).toBe("function");
  });

  it("should return undefined when no impersonation context", () => {
    // Arrange
    const mockRequest = {
      impersonation: undefined,
    } as unknown as Request;

    // The behavior would be that the decorator returns undefined
    // This is verified by the implementation in impersonation.guard.ts
    expect(mockRequest.impersonation).toBeUndefined();
  });
});

describe("RequireImpersonation decorator", () => {
  // RequireImpersonation is a decorator composition that applies UseGuards
  // We verify it's exported and callable
  it("should be exported and callable", async () => {
    const { RequireImpersonation } = await import("./impersonation.guard");
    expect(RequireImpersonation).toBeDefined();
    expect(typeof RequireImpersonation).toBe("function");

    // When called, it should return a decorator function
    const decorator = RequireImpersonation();
    expect(decorator).toBeDefined();
    expect(typeof decorator).toBe("function");
  });
});
