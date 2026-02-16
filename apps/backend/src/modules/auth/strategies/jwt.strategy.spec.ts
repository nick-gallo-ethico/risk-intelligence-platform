import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import { UserRole } from "@prisma/client";
import { JwtStrategy } from "./jwt.strategy";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtKeyService } from "../services";
import { AccessTokenPayload } from "../interfaces/jwt-payload.interface";

describe("JwtStrategy", () => {
  let strategy: JwtStrategy;
  let prisma: jest.Mocked<PrismaService>;

  // -------------------------------------------------------------------------
  // Test Data Fixtures
  // -------------------------------------------------------------------------
  const mockUserId = "user-test-123";
  const mockOrgId = "org-test-456";
  const mockSessionId = "session-test-789";
  const mockEmail = "test@example.com";

  const mockUser = {
    id: mockUserId,
    email: mockEmail,
    firstName: "Test",
    lastName: "User",
    role: UserRole.COMPLIANCE_OFFICER,
    organizationId: mockOrgId,
    isActive: true,
  };

  const mockSession = {
    revokedAt: null,
    expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
  };

  const validAccessPayload: AccessTokenPayload = {
    sub: mockUserId,
    email: mockEmail,
    organizationId: mockOrgId,
    role: UserRole.COMPLIANCE_OFFICER,
    sessionId: mockSessionId,
    type: "access",
    mfaVerified: false,
  };

  // -------------------------------------------------------------------------
  // Mock Setup
  // -------------------------------------------------------------------------
  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
    },
    withBypassRLS: jest.fn((cb: () => Promise<unknown>) => cb()),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === "JWT_SECRET") return "test-secret";
      return undefined;
    }),
  };

  const mockJwtKeyService = {
    getVerificationKey: jest.fn(() => "test-public-key"),
    getAlgorithm: jest.fn(() => "RS256"),
  };

  // -------------------------------------------------------------------------
  // Module Setup
  // -------------------------------------------------------------------------
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtKeyService, useValue: mockJwtKeyService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    prisma = module.get(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // describe('validate') - Token Validation Tests
  // -------------------------------------------------------------------------
  describe("validate()", () => {
    it("should reject token with type='refresh' (only accept 'access')", async () => {
      // Arrange - Refresh token payload
      const refreshPayload = {
        ...validAccessPayload,
        type: "refresh" as const,
      };

      // Act & Assert
      await expect(
        strategy.validate(refreshPayload as unknown as AccessTokenPayload),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        strategy.validate(refreshPayload as unknown as AccessTokenPayload),
      ).rejects.toThrow("Invalid token type");
    });

    it("should reject token when user not found in database", async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
        "User not found or inactive",
      );
    });

    it("should reject token when user.isActive is false", async () => {
      // Arrange - User exists but is inactive
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      // Act & Assert
      await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
        "User not found or inactive",
      );
    });

    it("should reject token when organizationId mismatch", async () => {
      // Arrange - User has different org than token
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        organizationId: "different-org-id",
      });

      // Act & Assert
      await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
        "Organization mismatch",
      );
    });

    it("should reject token when session not found", async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
        "Session expired or revoked",
      );
    });

    it("should reject token when session is revoked", async () => {
      // Arrange - Session has revokedAt set
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        revokedAt: new Date(),
      });

      // Act & Assert
      await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
        "Session expired or revoked",
      );
    });

    it("should reject token when session is expired", async () => {
      // Arrange - Session expiresAt is in the past
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        expiresAt: new Date(Date.now() - 3600 * 1000), // 1 hour ago
      });

      // Act & Assert
      await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(strategy.validate(validAccessPayload)).rejects.toThrow(
        "Session expired or revoked",
      );
    });

    it("should return user object when token is valid", async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      // Act
      const result = await strategy.validate(validAccessPayload);

      // Assert
      expect(result).toEqual({
        id: mockUserId,
        email: mockEmail,
        firstName: "Test",
        lastName: "User",
        organizationId: mockOrgId,
        role: UserRole.COMPLIANCE_OFFICER,
        sessionId: mockSessionId,
        mfaVerified: false,
      });
    });

    it("should include organizationId, role, sessionId in returned user", async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      // Act
      const result = await strategy.validate(validAccessPayload);

      // Assert - Verify critical fields for authorization
      expect(result.organizationId).toBe(mockOrgId);
      expect(result.role).toBe(UserRole.COMPLIANCE_OFFICER);
      expect(result.sessionId).toBe(mockSessionId);
    });

    it("should handle mfaVerified: true in payload", async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      const mfaVerifiedPayload = {
        ...validAccessPayload,
        mfaVerified: true,
      };

      // Act
      const result = await strategy.validate(mfaVerifiedPayload);

      // Assert
      expect(result.mfaVerified).toBe(true);
    });

    it("should default mfaVerified to false when not present in payload", async () => {
      // Arrange - Payload without mfaVerified (legacy token)
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      const legacyPayload = {
        sub: mockUserId,
        email: mockEmail,
        organizationId: mockOrgId,
        role: UserRole.COMPLIANCE_OFFICER,
        sessionId: mockSessionId,
        type: "access" as const,
        // mfaVerified omitted (undefined)
      } as AccessTokenPayload;

      // Act
      const result = await strategy.validate(legacyPayload);

      // Assert - Should default to false
      expect(result.mfaVerified).toBe(false);
    });

    it("should query user by sub claim (userId)", async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      // Act
      await strategy.validate(validAccessPayload);

      // Assert - Verify correct query
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          organizationId: true,
          isActive: true,
        },
      });
    });

    it("should query session by sessionId from payload", async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      // Act
      await strategy.validate(validAccessPayload);

      // Assert - Verify correct session query
      expect(prisma.session.findUnique).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        select: { revokedAt: true, expiresAt: true },
      });
    });

    it("should use withBypassRLS for database queries", async () => {
      // Arrange
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      // Act
      await strategy.validate(validAccessPayload);

      // Assert - Verify RLS bypass was used
      expect(mockPrismaService.withBypassRLS).toHaveBeenCalled();
    });

    it("should handle SYSTEM_ADMIN role in payload", async () => {
      // Arrange
      const adminUser = {
        ...mockUser,
        role: UserRole.SYSTEM_ADMIN,
      };
      const adminPayload = {
        ...validAccessPayload,
        role: UserRole.SYSTEM_ADMIN,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(adminUser);
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      // Act
      const result = await strategy.validate(adminPayload);

      // Assert
      expect(result.role).toBe(UserRole.SYSTEM_ADMIN);
    });

    it("should handle EMPLOYEE role in payload", async () => {
      // Arrange
      const employeeUser = {
        ...mockUser,
        role: UserRole.EMPLOYEE,
      };
      const employeePayload = {
        ...validAccessPayload,
        role: UserRole.EMPLOYEE,
      };
      mockPrismaService.user.findUnique.mockResolvedValue(employeeUser);
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);

      // Act
      const result = await strategy.validate(employeePayload);

      // Assert
      expect(result.role).toBe(UserRole.EMPLOYEE);
    });
  });

  // -------------------------------------------------------------------------
  // describe('extractHeader') - Static Method Tests
  // -------------------------------------------------------------------------
  describe("extractHeader (static)", () => {
    it("should extract header from valid JWT", () => {
      // Arrange - Create a valid JWT header structure
      const header = { alg: "RS256", kid: "test-key-id" };
      const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
        "base64url",
      );
      const mockJwt = `${encodedHeader}.payload.signature`;

      // Act - Access static method via class
      const result = (
        JwtStrategy as unknown as {
          extractHeader: (
            token: string,
          ) => { alg?: string; kid?: string } | null;
        }
      ).extractHeader(mockJwt);

      // Assert
      expect(result).toEqual({ alg: "RS256", kid: "test-key-id" });
    });

    it("should return null for invalid JWT format", () => {
      // Arrange - Invalid JWT without proper parts
      const invalidJwt = "not-a-valid-jwt";

      // Act
      const result = (
        JwtStrategy as unknown as {
          extractHeader: (
            token: string,
          ) => { alg?: string; kid?: string } | null;
        }
      ).extractHeader(invalidJwt);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null for JWT with invalid base64 header", () => {
      // Arrange - JWT with corrupted header
      const corruptedJwt = "!!!invalid-base64!!!.payload.signature";

      // Act
      const result = (
        JwtStrategy as unknown as {
          extractHeader: (
            token: string,
          ) => { alg?: string; kid?: string } | null;
        }
      ).extractHeader(corruptedJwt);

      // Assert
      expect(result).toBeNull();
    });
  });
});
