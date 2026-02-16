/**
 * AuthService Unit Tests
 *
 * Tests for authentication service covering:
 * - Login flow (valid/invalid credentials, inactive org/user)
 * - Token refresh (valid/expired/revoked sessions)
 * - Session management (revoke single, revoke all)
 * - RLS bypass verification for cross-tenant auth operations
 */

import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { AuthService } from "./auth.service";
import { PrismaService } from "../prisma/prisma.service";

// Mock bcrypt module
jest.mock("bcrypt", () => ({
  compare: jest.fn(),
}));

describe("AuthService", () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  // Test Data Fixtures
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockSessionId = "session-test-123";
  const mockEmail = "test@example.com";
  const mockPassword = "password123";
  const mockPasswordHash = "$2b$10$hashedpassword";

  const mockUser = {
    id: mockUserId,
    email: mockEmail,
    firstName: "Test",
    lastName: "User",
    role: "COMPLIANCE_OFFICER",
    organizationId: mockOrgId,
    passwordHash: mockPasswordHash,
    isActive: true,
    lastLoginAt: null,
    organization: {
      isActive: true,
    },
  };

  const mockSession = {
    id: mockSessionId,
    userId: mockUserId,
    organizationId: mockOrgId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    revokedAt: null,
    createdAt: new Date(),
    user: mockUser,
  };

  const mockAccessToken = "mock-access-token";
  const mockRefreshToken = "mock-refresh-token";

  // Mock Setup
  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    session: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    withBypassRLS: jest.fn((callback: () => Promise<any>) => callback()),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue(mockAccessToken),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        "jwt.accessTokenExpiry": "15m",
        "jwt.refreshTokenExpiry": "7d",
      };
      return config[key];
    }),
  };

  // Module Setup
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // describe('login') - Authentication tests
  describe("login", () => {
    const loginDto = { email: mockEmail, password: mockPassword };

    it("should return tokens and user on valid credentials", async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.session.create.mockResolvedValue(mockSession);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      // Act
      const result = await service.login(loginDto);

      // Assert
      expect(result).toMatchObject({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        user: {
          id: mockUserId,
          email: mockEmail,
          organizationId: mockOrgId,
        },
      });
    });

    it("should throw UnauthorizedException on user not found", async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("should throw UnauthorizedException on invalid password", async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        "Invalid email or password",
      );
    });

    it("should throw UnauthorizedException on inactive organization", async () => {
      // Arrange
      const userWithInactiveOrg = {
        ...mockUser,
        organization: { isActive: false },
      };
      mockPrismaService.user.findFirst.mockResolvedValue(userWithInactiveOrg);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        "Organization is inactive",
      );
    });

    it("should throw UnauthorizedException on user without password hash", async () => {
      // Arrange - SSO user without password
      const ssoUser = { ...mockUser, passwordHash: null };
      mockPrismaService.user.findFirst.mockResolvedValue(ssoUser);

      // Act & Assert
      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should bypass RLS for login (verify withBypassRLS called)", async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.session.create.mockResolvedValue(mockSession);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      // Act
      await service.login(loginDto);

      // Assert - withBypassRLS should have been called
      expect(mockPrismaService.withBypassRLS).toHaveBeenCalled();
      expect(mockPrismaService.withBypassRLS).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it("should create session after successful login", async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.session.create.mockResolvedValue(mockSession);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      // Act
      await service.login(loginDto);

      // Assert
      expect(mockPrismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: mockUserId,
          organizationId: mockOrgId,
        }),
      });
    });

    it("should update lastLoginAt after successful login", async () => {
      // Arrange
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.session.create.mockResolvedValue(mockSession);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        lastLoginAt: new Date(),
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      // Act
      await service.login(loginDto);

      // Assert
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { lastLoginAt: expect.any(Date) },
      });
    });

    it("should normalize email to lowercase", async () => {
      // Arrange
      const uppercaseEmailDto = {
        email: "TEST@EXAMPLE.COM",
        password: mockPassword,
      };
      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.session.create.mockResolvedValue(mockSession);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      // Act
      await service.login(uppercaseEmailDto);

      // Assert
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: "test@example.com",
          isActive: true,
        },
        include: {
          organization: { select: { isActive: true } },
        },
      });
    });
  });

  // describe('refreshTokens') - Token refresh tests
  describe("refreshTokens", () => {
    const validRefreshPayload = {
      sub: mockUserId,
      organizationId: mockOrgId,
      sessionId: mockSessionId,
      type: "refresh",
    };

    const mockSessionWithUser = {
      ...mockSession,
      user: {
        ...mockUser,
        organization: { isActive: true },
      },
    };

    it("should return new tokens for valid refresh token", async () => {
      // Arrange
      mockJwtService.verify.mockReturnValue(validRefreshPayload);
      mockPrismaService.session.findUnique.mockResolvedValue(
        mockSessionWithUser,
      );
      mockPrismaService.session.update.mockResolvedValue({
        ...mockSession,
        revokedAt: new Date(),
      });
      mockPrismaService.session.create.mockResolvedValue({
        ...mockSession,
        id: "new-session-id",
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce("new-access-token")
        .mockResolvedValueOnce("new-refresh-token");

      // Act
      const result = await service.refreshTokens(mockRefreshToken);

      // Assert
      expect(result).toMatchObject({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        user: {
          id: mockUserId,
          email: mockEmail,
        },
      });
    });

    it("should throw UnauthorizedException for expired session", async () => {
      // Arrange
      mockJwtService.verify.mockReturnValue(validRefreshPayload);
      const expiredSession = {
        ...mockSessionWithUser,
        expiresAt: new Date(Date.now() - 1000), // Expired
      };
      mockPrismaService.session.findUnique.mockResolvedValue(expiredSession);

      // Act & Assert
      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException for revoked session", async () => {
      // Arrange
      mockJwtService.verify.mockReturnValue(validRefreshPayload);
      const revokedSession = {
        ...mockSessionWithUser,
        revokedAt: new Date(), // Revoked
      };
      mockPrismaService.session.findUnique.mockResolvedValue(revokedSession);

      // Act & Assert
      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException for session not found", async () => {
      // Arrange
      mockJwtService.verify.mockReturnValue(validRefreshPayload);
      mockPrismaService.session.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException for invalid token type", async () => {
      // Arrange - access token instead of refresh token
      mockJwtService.verify.mockReturnValue({
        ...validRefreshPayload,
        type: "access",
      });

      // Act & Assert
      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        "Invalid token type",
      );
    });

    it("should throw UnauthorizedException for inactive user", async () => {
      // Arrange
      mockJwtService.verify.mockReturnValue(validRefreshPayload);
      const sessionWithInactiveUser = {
        ...mockSessionWithUser,
        user: {
          ...mockUser,
          isActive: false,
          organization: { isActive: true },
        },
      };
      mockPrismaService.session.findUnique.mockResolvedValue(
        sessionWithInactiveUser,
      );

      // Act & Assert
      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw UnauthorizedException for inactive organization during refresh", async () => {
      // Arrange
      mockJwtService.verify.mockReturnValue(validRefreshPayload);
      const sessionWithInactiveOrg = {
        ...mockSessionWithUser,
        user: {
          ...mockUser,
          organization: { isActive: false },
        },
      };
      mockPrismaService.session.findUnique.mockResolvedValue(
        sessionWithInactiveOrg,
      );

      // Act & Assert
      await expect(service.refreshTokens(mockRefreshToken)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should bypass RLS for refresh (verify withBypassRLS called)", async () => {
      // Arrange
      mockJwtService.verify.mockReturnValue(validRefreshPayload);
      mockPrismaService.session.findUnique.mockResolvedValue(
        mockSessionWithUser,
      );
      mockPrismaService.session.update.mockResolvedValue({
        ...mockSession,
        revokedAt: new Date(),
      });
      mockPrismaService.session.create.mockResolvedValue({
        ...mockSession,
        id: "new-session-id",
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce("new-access-token")
        .mockResolvedValueOnce("new-refresh-token");

      // Act
      await service.refreshTokens(mockRefreshToken);

      // Assert
      expect(mockPrismaService.withBypassRLS).toHaveBeenCalled();
    });

    it("should throw UnauthorizedException for invalid JWT", async () => {
      // Arrange
      mockJwtService.verify.mockImplementation(() => {
        throw new Error("jwt malformed");
      });

      // Act & Assert
      await expect(service.refreshTokens("invalid-token")).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.refreshTokens("invalid-token")).rejects.toThrow(
        "Invalid refresh token",
      );
    });

    it("should revoke old session during token rotation", async () => {
      // Arrange
      mockJwtService.verify.mockReturnValue(validRefreshPayload);
      mockPrismaService.session.findUnique.mockResolvedValue(
        mockSessionWithUser,
      );
      mockPrismaService.session.update.mockResolvedValue({
        ...mockSession,
        revokedAt: new Date(),
      });
      mockPrismaService.session.create.mockResolvedValue({
        ...mockSession,
        id: "new-session-id",
      });
      mockJwtService.signAsync
        .mockResolvedValueOnce("new-access-token")
        .mockResolvedValueOnce("new-refresh-token");

      // Act
      await service.refreshTokens(mockRefreshToken);

      // Assert - Old session should be revoked
      expect(mockPrismaService.session.update).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  // describe('revokeSession') - Single session revocation
  describe("revokeSession", () => {
    it("should mark session as revoked", async () => {
      // Arrange
      mockPrismaService.session.update.mockResolvedValue({
        ...mockSession,
        revokedAt: new Date(),
      });

      // Act
      await service.revokeSession(mockSessionId);

      // Assert
      expect(mockPrismaService.session.update).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  // describe('revokeAllSessions') - All sessions revocation
  describe("revokeAllSessions", () => {
    it("should revoke all sessions for user", async () => {
      // Arrange
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 5 });

      // Act
      await service.revokeAllSessions(mockUserId);

      // Assert
      expect(mockPrismaService.session.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          revokedAt: null,
        },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  // describe('createSsoSession') - SSO session creation
  describe("createSsoSession", () => {
    const ssoUser = {
      id: mockUserId,
      email: mockEmail,
      firstName: "Test",
      lastName: "User",
      role: "COMPLIANCE_OFFICER",
      organizationId: mockOrgId,
    };

    it("should create session and return tokens for SSO user", async () => {
      // Arrange
      mockPrismaService.session.create.mockResolvedValue(mockSession);
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      // Act
      const result = await service.createSsoSession(ssoUser);

      // Assert
      expect(result).toMatchObject({
        accessToken: mockAccessToken,
        refreshToken: mockRefreshToken,
        user: {
          id: mockUserId,
          email: mockEmail,
          organizationId: mockOrgId,
        },
      });
    });

    it("should pass user agent and IP to session", async () => {
      // Arrange
      mockPrismaService.session.create.mockResolvedValue(mockSession);
      mockJwtService.signAsync
        .mockResolvedValueOnce(mockAccessToken)
        .mockResolvedValueOnce(mockRefreshToken);

      // Act
      await service.createSsoSession(ssoUser, "Mozilla/5.0", "192.168.1.1");

      // Assert
      expect(mockPrismaService.session.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userAgent: "Mozilla/5.0",
          ipAddress: "192.168.1.1",
        }),
      });
    });
  });

  // describe('getOrganizationBySlug') - Organization lookup
  describe("getOrganizationBySlug", () => {
    const mockOrg = {
      id: mockOrgId,
      slug: "acme",
      name: "ACME Corp",
      isActive: true,
    };

    it("should return organization for valid slug", async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);

      // Act
      const result = await service.getOrganizationBySlug("acme");

      // Assert
      expect(result).toEqual(mockOrg);
      expect(mockPrismaService.organization.findUnique).toHaveBeenCalledWith({
        where: { slug: "acme" },
      });
    });

    it("should return null for non-existent slug", async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.getOrganizationBySlug("non-existent");

      // Assert
      expect(result).toBeNull();
    });

    it("should bypass RLS for organization lookup", async () => {
      // Arrange
      mockPrismaService.organization.findUnique.mockResolvedValue(mockOrg);

      // Act
      await service.getOrganizationBySlug("acme");

      // Assert
      expect(mockPrismaService.withBypassRLS).toHaveBeenCalled();
    });
  });
});
