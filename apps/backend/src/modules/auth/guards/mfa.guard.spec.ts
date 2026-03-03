/**
 * MFA GUARD - UNIT TESTS
 *
 * Tests for the MfaGuard which requires MFA verification for protected operations.
 * Key test scenarios:
 * - Throw UnauthorizedException when no user in request
 * - Allow access when MFA is disabled for user
 * - Allow access when MFA enabled AND mfaVerified is true in JWT
 * - Throw UnauthorizedException when MFA enabled but mfaVerified is false/undefined
 * - Call mfaService.isMfaEnabled with correct userId
 * - Handle mfaService errors gracefully
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { MfaGuard } from "./mfa.guard";
import { RequestUser } from "../interfaces/jwt-payload.interface";
import { UserRole } from "@prisma/client";

// Mock MfaService to avoid ESM import issues with otplib
const mockMfaService = {
  isMfaEnabled: jest.fn(),
};

jest.mock("../mfa/mfa.service", () => ({
  MfaService: jest.fn().mockImplementation(() => mockMfaService),
}));

// Import after mock
import { MfaService } from "../mfa/mfa.service";

describe("MfaGuard", () => {
  let guard: MfaGuard;
  let mfaService: jest.Mocked<MfaService>;

  // Helper to create mock request user
  const createMockUser = (
    overrides: Partial<RequestUser> = {},
  ): RequestUser => ({
    id: "user-uuid-123",
    email: "test@example.com",
    organizationId: "org-uuid-456",
    role: UserRole.COMPLIANCE_OFFICER,
    sessionId: "session-uuid-789",
    firstName: "Test",
    lastName: "User",
    mfaVerified: false,
    ...overrides,
  });

  // Helper to create mock execution context
  const createMockContext = (user?: RequestUser | null): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const mockMfaService = {
      isMfaEnabled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaGuard,
        {
          provide: MfaService,
          useValue: mockMfaService,
        },
      ],
    }).compile();

    guard = module.get<MfaGuard>(MfaGuard);
    mfaService = module.get(MfaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("canActivate()", () => {
    describe("authentication checks", () => {
      it("should throw UnauthorizedException when no user in request", async () => {
        // Arrange
        const context = createMockContext(undefined);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(guard.canActivate(context)).rejects.toThrow(
          "Authentication required",
        );
      });

      it("should throw UnauthorizedException when user is null", async () => {
        // Arrange
        const context = createMockContext(null);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(guard.canActivate(context)).rejects.toThrow(
          "Authentication required",
        );
      });

      it("should not call mfaService when no user is present", async () => {
        // Arrange
        const context = createMockContext(undefined);

        // Act
        try {
          await guard.canActivate(context);
        } catch {
          // Expected to throw
        }

        // Assert
        expect(mfaService.isMfaEnabled).not.toHaveBeenCalled();
      });
    });

    describe("MFA disabled scenarios", () => {
      it("should allow access when MFA is disabled for user", async () => {
        // Arrange
        const user = createMockUser({ mfaVerified: false });
        const context = createMockContext(user);
        mfaService.isMfaEnabled.mockResolvedValue(false);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(mfaService.isMfaEnabled).toHaveBeenCalledWith("user-uuid-123");
      });

      it("should allow access when MFA disabled regardless of mfaVerified value", async () => {
        // Arrange - MFA disabled, but mfaVerified is true (shouldn't matter)
        const user = createMockUser({ mfaVerified: true });
        const context = createMockContext(user);
        mfaService.isMfaEnabled.mockResolvedValue(false);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe("MFA enabled scenarios", () => {
      it("should allow access when MFA enabled AND mfaVerified is true", async () => {
        // Arrange
        const user = createMockUser({ mfaVerified: true });
        const context = createMockContext(user);
        mfaService.isMfaEnabled.mockResolvedValue(true);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
      });

      it("should throw UnauthorizedException when MFA enabled but mfaVerified is false", async () => {
        // Arrange
        const user = createMockUser({ mfaVerified: false });
        const context = createMockContext(user);
        mfaService.isMfaEnabled.mockResolvedValue(true);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(guard.canActivate(context)).rejects.toThrow(
          "MFA verification required",
        );
      });

      it("should throw UnauthorizedException when MFA enabled but mfaVerified is undefined", async () => {
        // Arrange - simulate legacy JWT without mfaVerified field
        const user = createMockUser();
        // Override mfaVerified to be undefined by type coercion
        (user as unknown as { mfaVerified: undefined }).mfaVerified = undefined;
        const context = createMockContext(user);
        mfaService.isMfaEnabled.mockResolvedValue(true);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          UnauthorizedException,
        );
        await expect(guard.canActivate(context)).rejects.toThrow(
          "MFA verification required",
        );
      });

      it("should call mfaService.isMfaEnabled with correct userId", async () => {
        // Arrange
        const user = createMockUser({ id: "specific-user-id" });
        const context = createMockContext(user);
        mfaService.isMfaEnabled.mockResolvedValue(false);

        // Act
        await guard.canActivate(context);

        // Assert
        expect(mfaService.isMfaEnabled).toHaveBeenCalledWith(
          "specific-user-id",
        );
        expect(mfaService.isMfaEnabled).toHaveBeenCalledTimes(1);
      });
    });

    describe("error handling", () => {
      it("should propagate mfaService.isMfaEnabled errors", async () => {
        // Arrange
        const user = createMockUser();
        const context = createMockContext(user);
        const dbError = new Error("Database connection failed");
        mfaService.isMfaEnabled.mockRejectedValue(dbError);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          "Database connection failed",
        );
      });

      it("should allow original error to bubble up from mfaService", async () => {
        // Arrange
        const user = createMockUser();
        const context = createMockContext(user);
        const customError = new Error("User not found");
        mfaService.isMfaEnabled.mockRejectedValue(customError);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(customError);
      });
    });

    describe("user role scenarios", () => {
      it("should check MFA for SYSTEM_ADMIN role", async () => {
        // Arrange
        const user = createMockUser({
          role: UserRole.SYSTEM_ADMIN,
          mfaVerified: true,
        });
        const context = createMockContext(user);
        mfaService.isMfaEnabled.mockResolvedValue(true);

        // Act
        const result = await guard.canActivate(context);

        // Assert
        expect(result).toBe(true);
        expect(mfaService.isMfaEnabled).toHaveBeenCalled();
      });

      it("should check MFA for EMPLOYEE role", async () => {
        // Arrange
        const user = createMockUser({
          role: UserRole.EMPLOYEE,
          mfaVerified: false,
        });
        const context = createMockContext(user);
        mfaService.isMfaEnabled.mockResolvedValue(true);

        // Act & Assert
        await expect(guard.canActivate(context)).rejects.toThrow(
          "MFA verification required",
        );
      });
    });

    describe("async behavior", () => {
      it("should properly await mfaService.isMfaEnabled", async () => {
        // Arrange
        const user = createMockUser({ mfaVerified: true });
        const context = createMockContext(user);

        // Simulate async delay
        mfaService.isMfaEnabled.mockImplementation(
          () =>
            new Promise((resolve) => {
              setTimeout(() => resolve(true), 10);
            }),
        );

        // Act
        const resultPromise = guard.canActivate(context);

        // Assert - should be a promise
        expect(resultPromise).toBeInstanceOf(Promise);
        const result = await resultPromise;
        expect(result).toBe(true);
      });

      it("should handle concurrent calls correctly", async () => {
        // Arrange
        const user1 = createMockUser({
          id: "user-1",
          mfaVerified: true,
        });
        const user2 = createMockUser({
          id: "user-2",
          mfaVerified: false,
        });
        const context1 = createMockContext(user1);
        const context2 = createMockContext(user2);

        mfaService.isMfaEnabled.mockImplementation(
          (userId: string) =>
            new Promise((resolve) => {
              setTimeout(
                () => resolve(userId === "user-1" || userId === "user-2"),
                5,
              );
            }),
        );

        // Act
        const [result1Promise, result2Promise] = [
          guard.canActivate(context1),
          guard.canActivate(context2).catch((e) => e),
        ];

        // Assert
        const [result1, result2] = await Promise.all([
          result1Promise,
          result2Promise,
        ]);
        expect(result1).toBe(true);
        expect(result2).toBeInstanceOf(UnauthorizedException);
      });
    });
  });
});
