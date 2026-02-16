/**
 * TENANT GUARD - UNIT TESTS
 *
 * Tests for the TenantGuard.
 * Key test scenarios:
 * - Allow access when organizationId is present
 * - Throw ForbiddenException when organizationId is missing
 * - Throw ForbiddenException when organizationId is empty string
 * - Throw ForbiddenException when organizationId is null
 */

import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { TenantGuard } from "./tenant.guard";

describe("TenantGuard", () => {
  let guard: TenantGuard;

  // Helper to create mock ExecutionContext
  const createMockExecutionContext = (
    organizationId: string | undefined | null,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ organizationId }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TenantGuard],
    }).compile();

    guard = module.get<TenantGuard>(TenantGuard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("canActivate()", () => {
    it("should allow access when organizationId is present", () => {
      // Arrange
      const mockContext = createMockExecutionContext("org-uuid-123-456-789");

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
    });

    it("should throw ForbiddenException when organizationId is missing", () => {
      // Arrange
      const mockContext = createMockExecutionContext(undefined);

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        "Organization context not available. Ensure you are authenticated with a valid tenant.",
      );
    });

    it("should throw ForbiddenException when organizationId is empty string", () => {
      // Arrange
      const mockContext = createMockExecutionContext("");

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        "Organization context not available. Ensure you are authenticated with a valid tenant.",
      );
    });

    it("should throw ForbiddenException when organizationId is null", () => {
      // Arrange
      const mockContext = createMockExecutionContext(null);

      // Act & Assert
      expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockContext)).toThrow(
        "Organization context not available. Ensure you are authenticated with a valid tenant.",
      );
    });

    it("should extract organizationId from request via switchToHttp", () => {
      // Arrange
      const expectedOrgId = "tenant-abc-def";
      const mockRequest = { organizationId: expectedOrgId };
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(mockRequest),
        }),
      } as unknown as ExecutionContext;

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
      expect(mockContext.switchToHttp).toHaveBeenCalled();
    });
  });
});
