// =============================================================================
// ROLES GUARD - UNIT TESTS
// =============================================================================
//
// Tests for the RolesGuard.
// Key test scenarios:
// - Allow access when no roles are specified (no @Roles decorator)
// - Allow access when user has one of the required roles
// - Throw ForbiddenException when user is missing from request
// - Throw ForbiddenException when user lacks required role
// - Check both handler and class level for roles metadata
// - Allow access when user.role matches any role in requiredRoles array
// =============================================================================

import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "./roles.guard";
import { ROLES_KEY, UserRole } from "../decorators/roles.decorator";

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  // Mock handler and class for reflector
  const mockHandler = jest.fn();
  const mockClass = jest.fn();

  // Helper to create mock ExecutionContext with user
  const createMockExecutionContext = (user: any): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => mockHandler,
      getClass: () => mockClass,
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    const mockReflector = {
      getAllAndOverride: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("canActivate()", () => {
    describe("when no roles are specified", () => {
      it("should allow access when requiredRoles is undefined", () => {
        // Arrange
        const mockUser = { id: "user-uuid-123", role: UserRole.EMPLOYEE };
        const mockContext = createMockExecutionContext(mockUser);
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

        // Act
        const result = guard.canActivate(mockContext);

        // Assert
        expect(result).toBe(true);
      });

      it("should allow access when requiredRoles is empty array", () => {
        // Arrange
        const mockUser = { id: "user-uuid-123", role: UserRole.EMPLOYEE };
        const mockContext = createMockExecutionContext(mockUser);
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue([]);

        // Act
        const result = guard.canActivate(mockContext);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe("when user has required role", () => {
      it("should allow access when user has exact required role", () => {
        // Arrange
        const mockUser = {
          id: "user-uuid-123",
          role: UserRole.COMPLIANCE_OFFICER,
        };
        const mockContext = createMockExecutionContext(mockUser);
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
          UserRole.COMPLIANCE_OFFICER,
        ]);

        // Act
        const result = guard.canActivate(mockContext);

        // Assert
        expect(result).toBe(true);
      });

      it("should allow access when user.role matches any role in requiredRoles array", () => {
        // Arrange
        const mockUser = {
          id: "user-uuid-123",
          role: UserRole.INVESTIGATOR,
        };
        const mockContext = createMockExecutionContext(mockUser);
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
          UserRole.COMPLIANCE_OFFICER,
          UserRole.INVESTIGATOR,
          UserRole.TRIAGE_LEAD,
        ]);

        // Act
        const result = guard.canActivate(mockContext);

        // Assert
        expect(result).toBe(true);
      });

      it("should allow SYSTEM_ADMIN when required role is SYSTEM_ADMIN", () => {
        // Arrange
        const mockUser = {
          id: "user-uuid-123",
          role: UserRole.SYSTEM_ADMIN,
        };
        const mockContext = createMockExecutionContext(mockUser);
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
          UserRole.SYSTEM_ADMIN,
        ]);

        // Act
        const result = guard.canActivate(mockContext);

        // Assert
        expect(result).toBe(true);
      });
    });

    describe("when user lacks required role", () => {
      it("should throw ForbiddenException when user lacks required role", () => {
        // Arrange
        const mockUser = {
          id: "user-uuid-123",
          role: UserRole.EMPLOYEE,
        };
        const mockContext = createMockExecutionContext(mockUser);
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
          UserRole.COMPLIANCE_OFFICER,
        ]);

        // Act & Assert
        expect(() => guard.canActivate(mockContext)).toThrow(
          ForbiddenException,
        );
        expect(() => guard.canActivate(mockContext)).toThrow(
          "Access denied. Required roles: COMPLIANCE_OFFICER",
        );
      });

      it("should throw ForbiddenException with all required roles in message", () => {
        // Arrange
        const mockUser = {
          id: "user-uuid-123",
          role: UserRole.EMPLOYEE,
        };
        const mockContext = createMockExecutionContext(mockUser);
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
          UserRole.COMPLIANCE_OFFICER,
          UserRole.SYSTEM_ADMIN,
        ]);

        // Act & Assert
        expect(() => guard.canActivate(mockContext)).toThrow(
          "Access denied. Required roles: COMPLIANCE_OFFICER, SYSTEM_ADMIN",
        );
      });
    });

    describe("when user is missing from request", () => {
      it("should throw ForbiddenException when user is undefined", () => {
        // Arrange
        const mockContext = createMockExecutionContext(undefined);
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
          UserRole.COMPLIANCE_OFFICER,
        ]);

        // Act & Assert
        expect(() => guard.canActivate(mockContext)).toThrow(
          ForbiddenException,
        );
        expect(() => guard.canActivate(mockContext)).toThrow(
          "User not found in request",
        );
      });

      it("should throw ForbiddenException when user is null", () => {
        // Arrange
        const mockContext = createMockExecutionContext(null);
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
          UserRole.COMPLIANCE_OFFICER,
        ]);

        // Act & Assert
        expect(() => guard.canActivate(mockContext)).toThrow(
          ForbiddenException,
        );
        expect(() => guard.canActivate(mockContext)).toThrow(
          "User not found in request",
        );
      });
    });

    describe("reflector metadata checking", () => {
      it("should check both handler and class level for roles metadata", () => {
        // Arrange
        const mockUser = {
          id: "user-uuid-123",
          role: UserRole.COMPLIANCE_OFFICER,
        };
        const mockContext = createMockExecutionContext(mockUser);
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
          UserRole.COMPLIANCE_OFFICER,
        ]);

        // Act
        guard.canActivate(mockContext);

        // Assert
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
          mockHandler,
          mockClass,
        ]);
      });

      it("should call reflector.getAllAndOverride with ROLES_KEY", () => {
        // Arrange
        const mockUser = { id: "user-uuid-123", role: UserRole.EMPLOYEE };
        const mockContext = createMockExecutionContext(mockUser);
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

        // Act
        guard.canActivate(mockContext);

        // Assert
        expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(1);
        expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
          ROLES_KEY,
          expect.any(Array),
        );
      });
    });

    describe("role matching logic", () => {
      it("should use some() to check if user.role matches any required role", () => {
        // Arrange - user has POLICY_AUTHOR which is in the required roles
        const mockUser = {
          id: "user-uuid-123",
          role: UserRole.POLICY_AUTHOR,
        };
        const mockContext = createMockExecutionContext(mockUser);
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
          UserRole.POLICY_AUTHOR,
          UserRole.POLICY_REVIEWER,
        ]);

        // Act
        const result = guard.canActivate(mockContext);

        // Assert
        expect(result).toBe(true);
      });

      it("should reject when user role does not match any required role", () => {
        // Arrange
        const mockUser = {
          id: "user-uuid-123",
          role: UserRole.MANAGER,
        };
        const mockContext = createMockExecutionContext(mockUser);
        (reflector.getAllAndOverride as jest.Mock).mockReturnValue([
          UserRole.POLICY_AUTHOR,
          UserRole.POLICY_REVIEWER,
        ]);

        // Act & Assert
        expect(() => guard.canActivate(mockContext)).toThrow(
          ForbiddenException,
        );
      });
    });
  });

  describe("ROLES_KEY constant", () => {
    it("should have correct value", () => {
      expect(ROLES_KEY).toBe("roles");
    });
  });

  describe("UserRole enum", () => {
    it("should have all expected roles defined", () => {
      expect(UserRole.SYSTEM_ADMIN).toBe("SYSTEM_ADMIN");
      expect(UserRole.COMPLIANCE_OFFICER).toBe("COMPLIANCE_OFFICER");
      expect(UserRole.TRIAGE_LEAD).toBe("TRIAGE_LEAD");
      expect(UserRole.INVESTIGATOR).toBe("INVESTIGATOR");
      expect(UserRole.POLICY_AUTHOR).toBe("POLICY_AUTHOR");
      expect(UserRole.POLICY_REVIEWER).toBe("POLICY_REVIEWER");
      expect(UserRole.DEPARTMENT_ADMIN).toBe("DEPARTMENT_ADMIN");
      expect(UserRole.MANAGER).toBe("MANAGER");
      expect(UserRole.EMPLOYEE).toBe("EMPLOYEE");
    });
  });
});
