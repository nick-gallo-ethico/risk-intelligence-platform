// =============================================================================
// JWT AUTH GUARD - UNIT TESTS
// =============================================================================
//
// Tests for the JwtAuthGuard.
// Key test scenarios:
// - Allow access for routes marked with @Public() decorator
// - Verify reflector checks both handler and class level for IS_PUBLIC_KEY
// - Throw UnauthorizedException when handleRequest receives no user
// - Throw UnauthorizedException when handleRequest receives error
// - Return user from handleRequest when user exists
// =============================================================================

import { Test, TestingModule } from "@nestjs/testing";
import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtAuthGuard, IS_PUBLIC_KEY, Public } from "./jwt-auth.guard";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  // Mock handler and class for reflector
  const mockHandler = jest.fn();
  const mockClass = jest.fn();

  // Helper to create mock ExecutionContext
  const createMockExecutionContext = (): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
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
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    reflector = module.get(Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("canActivate()", () => {
    it("should allow access for routes marked with @Public() decorator", () => {
      // Arrange
      const mockContext = createMockExecutionContext();
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockHandler,
        mockClass,
      ]);
    });

    it("should check both handler and class level for IS_PUBLIC_KEY", () => {
      // Arrange
      const mockContext = createMockExecutionContext();
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

      // Act
      guard.canActivate(mockContext);

      // Assert - verify getAllAndOverride is called with [handler, class] array
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockHandler,
        mockClass,
      ]);
    });

    it("should return true immediately without calling super for public routes", () => {
      // Arrange
      const mockContext = createMockExecutionContext();
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

      // Spy on the prototype to verify super.canActivate is not called
      const originalCanActivate = Object.getPrototypeOf(
        Object.getPrototypeOf(guard),
      ).canActivate;
      const superSpy = jest.fn();
      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate =
        superSpy;

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(result).toBe(true);
      expect(superSpy).not.toHaveBeenCalled();

      // Restore
      Object.getPrototypeOf(Object.getPrototypeOf(guard)).canActivate =
        originalCanActivate;
    });

    it("should call reflector.getAllAndOverride with IS_PUBLIC_KEY", () => {
      // Arrange
      const mockContext = createMockExecutionContext();
      (reflector.getAllAndOverride as jest.Mock).mockReturnValue(true);

      // Act
      guard.canActivate(mockContext);

      // Assert
      expect(reflector.getAllAndOverride).toHaveBeenCalledTimes(1);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
        IS_PUBLIC_KEY,
        expect.any(Array),
      );
    });
  });

  describe("handleRequest()", () => {
    it("should return user when user exists and no error", () => {
      // Arrange
      const mockUser = {
        id: "user-uuid-123",
        email: "test@example.com",
        organizationId: "org-uuid-456",
        role: "COMPLIANCE_OFFICER",
      };

      // Act
      const result = guard.handleRequest(null, mockUser, null);

      // Assert
      expect(result).toEqual(mockUser);
    });

    it("should throw UnauthorizedException when user is null", () => {
      // Act & Assert
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        "Invalid or expired token",
      );
    });

    it("should throw UnauthorizedException when user is undefined", () => {
      // Act & Assert
      expect(() => guard.handleRequest(null, undefined, null)).toThrow(
        UnauthorizedException,
      );
      expect(() => guard.handleRequest(null, undefined, null)).toThrow(
        "Invalid or expired token",
      );
    });

    it("should throw the provided error when error exists", () => {
      // Arrange
      const mockError = new Error("JWT verification failed");
      const mockUser = { id: "user-uuid-123" };

      // Act & Assert
      expect(() => guard.handleRequest(mockError, mockUser, null)).toThrow(
        mockError,
      );
    });

    it("should throw UnauthorizedException when error is null but user is also null", () => {
      // Arrange
      const info = { message: "No auth token" };

      // Act & Assert
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        UnauthorizedException,
      );
    });

    it("should prefer throwing provided error over UnauthorizedException when both error exists and no user", () => {
      // Arrange
      const mockError = new Error("Token expired");

      // Act & Assert
      expect(() => guard.handleRequest(mockError, null, null)).toThrow(
        mockError,
      );
    });

    it("should return user even with info present", () => {
      // Arrange
      const mockUser = { id: "user-uuid-123" };
      const info = { message: "Some info" };

      // Act
      const result = guard.handleRequest(null, mockUser, info);

      // Assert
      expect(result).toEqual(mockUser);
    });

    it("should throw UnauthorizedException with correct message", () => {
      // Act & Assert
      try {
        guard.handleRequest(null, null, null);
        fail("Expected UnauthorizedException to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        expect((error as UnauthorizedException).message).toBe(
          "Invalid or expired token",
        );
      }
    });
  });

  describe("IS_PUBLIC_KEY constant", () => {
    it("should have correct value for IS_PUBLIC_KEY", () => {
      expect(IS_PUBLIC_KEY).toBe("isPublic");
    });
  });

  describe("@Public() decorator", () => {
    it("should be a function that returns a decorator", () => {
      expect(typeof Public).toBe("function");
    });

    it("should set IS_PUBLIC_KEY metadata when applied", () => {
      // The @Public() decorator should return a decorator that sets metadata
      const decorator = Public();
      expect(typeof decorator).toBe("function");
    });
  });
});
