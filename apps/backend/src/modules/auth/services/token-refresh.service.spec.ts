// =============================================================================
// TokenRefreshService Unit Tests
// =============================================================================
//
// Tests for token refresh service covering:
// - Access token refresh with rotation
// - WebSocket token refresh with grace period
// - Session validation (expired, revoked)
// - User status validation (inactive)
// - Session revocation
// =============================================================================

import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { TokenRefreshService, RefreshErrorCode } from "./token-refresh.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("TokenRefreshService", () => {
  let service: TokenRefreshService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  // -------------------------------------------------------------------------
  // Test Data Fixtures
  // -------------------------------------------------------------------------
  const mockOrgId = "org-test-123";
  const mockUserId = "user-test-123";
  const mockSessionId = "session-test-123";
  const mockEmail = "test@example.com";

  const mockUser = {
    id: mockUserId,
    email: mockEmail,
    firstName: "Test",
    lastName: "User",
    role: "COMPLIANCE_OFFICER",
    organizationId: mockOrgId,
    isActive: true,
  };

  const mockSession = {
    id: mockSessionId,
    userId: mockUserId,
    organizationId: mockOrgId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    revokedAt: null,
    createdAt: new Date(),
  };

  const mockRefreshPayload = {
    sub: mockUserId,
    organizationId: mockOrgId,
    sessionId: mockSessionId,
    type: "refresh",
  };

  const mockAccessPayload = {
    sub: mockUserId,
    email: mockEmail,
    organizationId: mockOrgId,
    role: "COMPLIANCE_OFFICER",
    sessionId: mockSessionId,
    type: "access",
    exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes from now
  };

  const mockAccessToken = "mock-access-token";
  const mockRefreshToken = "mock-refresh-token";

  // -------------------------------------------------------------------------
  // Mock Setup
  // -------------------------------------------------------------------------
  const mockPrismaService = {
    session: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  const mockJwtService = {
    verifyAsync: jest.fn(),
    sign: jest.fn().mockReturnValue(mockAccessToken),
    decode: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_ACCESS_EXPIRY: "15m",
        JWT_REFRESH_EXPIRY: "7d",
        JWT_REFRESH_SECRET: "test-refresh-secret",
      };
      return config[key];
    }),
  };

  // -------------------------------------------------------------------------
  // Module Setup
  // -------------------------------------------------------------------------
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenRefreshService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<TokenRefreshService>(TokenRefreshService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // describe('refreshAccessToken') - Standard refresh flow
  // -------------------------------------------------------------------------
  describe("refreshAccessToken", () => {
    it("should return new access token for valid session", async () => {
      // Arrange
      mockJwtService.verifyAsync.mockResolvedValue(mockRefreshPayload);
      mockPrismaService.session.findFirst.mockResolvedValue(mockSession);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.update.mockResolvedValue(mockSession);
      mockJwtService.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      // Act
      const result = await service.refreshAccessToken("valid-refresh-token");

      // Assert
      expect(result.success).toBe(true);
      expect(result.accessToken).toBe(mockAccessToken);
      expect(result.refreshToken).toBe(mockRefreshToken);
    });

    it("should return error for invalid session (not found)", async () => {
      // Arrange
      mockJwtService.verifyAsync.mockResolvedValue(mockRefreshPayload);
      mockPrismaService.session.findFirst.mockResolvedValue(null);

      // Act
      const result = await service.refreshAccessToken("orphan-refresh-token");

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(RefreshErrorCode.TOKEN_NOT_FOUND);
      expect(result.error).toContain("not found");
    });

    it("should return error for expired session", async () => {
      // Arrange
      mockJwtService.verifyAsync.mockResolvedValue(mockRefreshPayload);
      mockPrismaService.session.findFirst.mockResolvedValue({
        ...mockSession,
        expiresAt: new Date(Date.now() - 1000), // Expired
      });

      // Act
      const result = await service.refreshAccessToken("expired-session-token");

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(RefreshErrorCode.TOKEN_EXPIRED);
    });

    it("should return error for revoked session", async () => {
      // Arrange
      mockJwtService.verifyAsync.mockResolvedValue(mockRefreshPayload);
      mockPrismaService.session.findFirst.mockResolvedValue({
        ...mockSession,
        revokedAt: new Date(),
      });

      // Act
      const result = await service.refreshAccessToken("revoked-session-token");

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(RefreshErrorCode.TOKEN_REVOKED);
    });

    it("should verify JWT before processing", async () => {
      // Arrange
      mockJwtService.verifyAsync.mockRejectedValue(new Error("jwt malformed"));

      // Act
      const result = await service.refreshAccessToken("invalid-jwt");

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(RefreshErrorCode.INVALID_TOKEN);
      expect(mockJwtService.verifyAsync).toHaveBeenCalled();
    });

    it("should return error for user not found", async () => {
      // Arrange
      mockJwtService.verifyAsync.mockResolvedValue(mockRefreshPayload);
      mockPrismaService.session.findFirst.mockResolvedValue(mockSession);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.refreshAccessToken("valid-refresh-token");

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(RefreshErrorCode.USER_NOT_FOUND);
    });

    it("should return error for inactive user", async () => {
      // Arrange
      mockJwtService.verifyAsync.mockResolvedValue(mockRefreshPayload);
      mockPrismaService.session.findFirst.mockResolvedValue(mockSession);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      // Act
      const result = await service.refreshAccessToken("inactive-user-token");

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(RefreshErrorCode.USER_INACTIVE);
    });

    it("should extend session expiry on successful refresh", async () => {
      // Arrange
      mockJwtService.verifyAsync.mockResolvedValue(mockRefreshPayload);
      mockPrismaService.session.findFirst.mockResolvedValue(mockSession);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.update.mockResolvedValue(mockSession);
      mockJwtService.sign
        .mockReturnValueOnce(mockAccessToken)
        .mockReturnValueOnce(mockRefreshToken);

      // Act
      await service.refreshAccessToken("valid-refresh-token");

      // Assert
      expect(mockPrismaService.session.update).toHaveBeenCalledWith({
        where: { id: mockSessionId },
        data: { expiresAt: expect.any(Date) },
      });
    });
  });

  // -------------------------------------------------------------------------
  // describe('refreshWebSocketToken') - WebSocket refresh with grace period
  // -------------------------------------------------------------------------
  describe("refreshWebSocketToken", () => {
    it("should return WebSocket token for valid session", async () => {
      // Arrange
      mockJwtService.decode.mockReturnValue(mockAccessPayload);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockJwtService.sign.mockReturnValue(mockAccessToken);

      // Act
      const result = await service.refreshWebSocketToken("valid-access-token");

      // Assert
      expect(result.success).toBe(true);
      expect(result.accessToken).toBe(mockAccessToken);
    });

    it("should return error for invalid token format", async () => {
      // Arrange
      mockJwtService.decode.mockReturnValue(null);

      // Act
      const result = await service.refreshWebSocketToken("invalid-token");

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(RefreshErrorCode.INVALID_TOKEN);
    });

    it("should return error for token too old (beyond grace period)", async () => {
      // Arrange
      const expiredPayload = {
        ...mockAccessPayload,
        exp: Math.floor(Date.now() / 1000) - 600, // 10 minutes ago (beyond 5-min grace)
      };
      mockJwtService.decode.mockReturnValue(expiredPayload);

      // Act
      const result = await service.refreshWebSocketToken("too-old-token");

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(RefreshErrorCode.TOKEN_TOO_OLD);
    });

    it("should allow token within grace period", async () => {
      // Arrange - Token expired 2 minutes ago (within 5-min grace period)
      const recentlyExpiredPayload = {
        ...mockAccessPayload,
        exp: Math.floor(Date.now() / 1000) - 120, // 2 minutes ago
      };
      mockJwtService.decode.mockReturnValue(recentlyExpiredPayload);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.findUnique.mockResolvedValue(mockSession);
      mockJwtService.sign.mockReturnValue(mockAccessToken);

      // Act
      const result = await service.refreshWebSocketToken(
        "recently-expired-token",
      );

      // Assert
      expect(result.success).toBe(true);
    });

    it("should return error for revoked session", async () => {
      // Arrange
      mockJwtService.decode.mockReturnValue(mockAccessPayload);
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.session.findUnique.mockResolvedValue({
        ...mockSession,
        revokedAt: new Date(),
      });

      // Act
      const result = await service.refreshWebSocketToken(
        "revoked-session-token",
      );

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(RefreshErrorCode.TOKEN_REVOKED);
    });

    it("should return error for inactive user", async () => {
      // Arrange
      mockJwtService.decode.mockReturnValue(mockAccessPayload);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      // Act
      const result = await service.refreshWebSocketToken("inactive-user-token");

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(RefreshErrorCode.USER_INACTIVE);
    });

    it("should return error for user not found", async () => {
      // Arrange
      mockJwtService.decode.mockReturnValue(mockAccessPayload);
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.refreshWebSocketToken("orphan-token");

      // Assert
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe(RefreshErrorCode.USER_NOT_FOUND);
    });
  });

  // -------------------------------------------------------------------------
  // describe('revokeAllUserSessions') - Bulk session revocation
  // -------------------------------------------------------------------------
  describe("revokeAllUserSessions", () => {
    it("should revoke all sessions for specified user", async () => {
      // Arrange
      mockPrismaService.session.updateMany.mockResolvedValue({ count: 5 });

      // Act
      await service.revokeAllUserSessions(mockUserId);

      // Assert
      expect(mockPrismaService.session.updateMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          revokedAt: null,
        },
        data: {
          revokedAt: expect.any(Date),
        },
      });
    });
  });

  // -------------------------------------------------------------------------
  // describe('revokeSession') - Single session revocation
  // -------------------------------------------------------------------------
  describe("revokeSession", () => {
    it("should revoke a specific session", async () => {
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
});
