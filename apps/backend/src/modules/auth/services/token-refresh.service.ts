/**
 * TokenRefreshService - Token Refresh and Rotation Management
 *
 * Handles JWT token refresh operations including:
 * - Standard refresh token flow with rotation
 * - WebSocket session refresh (graceful token update without disconnect)
 * - Token revocation checking
 * - User status validation
 *
 * Security features:
 * - Refresh token rotation (old token revoked, new token issued)
 * - Grace period for WebSocket refresh (5 minutes after expiry)
 * - User status check (inactive users cannot refresh)
 * - Session tracking for revocation
 */

import { Injectable, Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Result of a token refresh operation.
 */
export interface RefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Error codes for refresh failures.
 */
export const RefreshErrorCode = {
  TOKEN_NOT_FOUND: "TOKEN_NOT_FOUND",
  TOKEN_REVOKED: "TOKEN_REVOKED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  USER_INACTIVE: "USER_INACTIVE",
  INVALID_TOKEN: "INVALID_TOKEN",
  TOKEN_TOO_OLD: "TOKEN_TOO_OLD",
} as const;

@Injectable()
export class TokenRefreshService {
  private readonly logger = new Logger(TokenRefreshService.name);

  /**
   * Access token expiry time.
   */
  private readonly accessTokenExpiry: string;

  /**
   * Refresh token expiry time.
   */
  private readonly refreshTokenExpiry: string;

  /**
   * Grace period for WebSocket refresh after token expiry (5 minutes).
   */
  private readonly wsGracePeriodMs: number = 5 * 60 * 1000;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.accessTokenExpiry =
      this.configService.get<string>("JWT_ACCESS_EXPIRY") || "15m";
    this.refreshTokenExpiry =
      this.configService.get<string>("JWT_REFRESH_EXPIRY") || "7d";
  }

  /**
   * Refreshes an access token using a refresh token.
   * Implements refresh token rotation for security.
   *
   * @param refreshToken - The refresh token to use
   * @returns RefreshResult with new tokens or error
   */
  async refreshAccessToken(refreshToken: string): Promise<RefreshResult> {
    try {
      // Verify refresh token
      const refreshSecret = this.configService.get<string>("JWT_REFRESH_SECRET");
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: refreshSecret,
      });

      // Check if token is stored and not revoked
      const storedToken = await this.prisma.session.findFirst({
        where: {
          userId: payload.sub,
          revokedAt: null,
        },
        orderBy: { createdAt: "desc" },
      });

      if (!storedToken) {
        this.logger.warn(`Refresh token not found for user ${payload.sub}`);
        return {
          success: false,
          error: "Session not found or expired",
          errorCode: RefreshErrorCode.TOKEN_NOT_FOUND,
        };
      }

      if (storedToken.revokedAt) {
        this.logger.warn(
          `Attempt to use revoked token: ${storedToken.id} by user ${payload.sub}`,
        );
        return {
          success: false,
          error: "Session has been revoked",
          errorCode: RefreshErrorCode.TOKEN_REVOKED,
        };
      }

      if (new Date(storedToken.expiresAt) < new Date()) {
        this.logger.debug(`Session expired for user ${payload.sub}`);
        return {
          success: false,
          error: "Session has expired",
          errorCode: RefreshErrorCode.TOKEN_EXPIRED,
        };
      }

      // Get user and verify status
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
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

      if (!user) {
        return {
          success: false,
          error: "User not found",
          errorCode: RefreshErrorCode.USER_NOT_FOUND,
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          error: "User account is inactive",
          errorCode: RefreshErrorCode.USER_INACTIVE,
        };
      }

      // Generate new access token
      const newAccessToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          organizationId: user.organizationId,
          role: user.role,
          sessionId: storedToken.id,
          type: "access",
        },
        { expiresIn: this.accessTokenExpiry },
      );

      // Generate new refresh token (rotation)
      const newRefreshToken = this.jwtService.sign(
        {
          sub: user.id,
          organizationId: user.organizationId,
          sessionId: storedToken.id,
          type: "refresh",
        },
        {
          secret: refreshSecret,
          expiresIn: this.refreshTokenExpiry,
        },
      );

      // Update session expiry
      await this.prisma.session.update({
        where: { id: storedToken.id },
        data: {
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      this.logger.debug(`Refreshed tokens for user ${user.id}`);

      return {
        success: true,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      this.logger.error(`Token refresh failed: ${(error as Error).message}`);
      return {
        success: false,
        error: "Invalid refresh token",
        errorCode: RefreshErrorCode.INVALID_TOKEN,
      };
    }
  }

  /**
   * Refreshes a WebSocket session token without requiring refresh token.
   * Used for in-flight WebSocket connections where a full refresh flow
   * would cause disconnection.
   *
   * This method has a grace period - tokens can be refreshed up to 5 minutes
   * after expiry to allow seamless reconnection.
   *
   * @param currentToken - The current (possibly expired) access token
   * @returns RefreshResult with new access token or error
   */
  async refreshWebSocketToken(currentToken: string): Promise<RefreshResult> {
    try {
      // Decode without verifying (token may be expired but within grace period)
      const decoded = this.jwtService.decode(currentToken) as any;

      if (!decoded?.sub) {
        return {
          success: false,
          error: "Invalid token format",
          errorCode: RefreshErrorCode.INVALID_TOKEN,
        };
      }

      // Check token isn't too old (beyond grace period)
      if (decoded.exp) {
        const expiredAt = decoded.exp * 1000;
        const now = Date.now();

        if (now > expiredAt + this.wsGracePeriodMs) {
          this.logger.debug(
            `Token too old for WebSocket refresh: expired ${Math.round((now - expiredAt) / 1000)}s ago`,
          );
          return {
            success: false,
            error: "Token too old for WebSocket refresh - please re-authenticate",
            errorCode: RefreshErrorCode.TOKEN_TOO_OLD,
          };
        }
      }

      // Get user and verify status
      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        select: {
          id: true,
          email: true,
          role: true,
          organizationId: true,
          isActive: true,
        },
      });

      if (!user) {
        return {
          success: false,
          error: "User not found",
          errorCode: RefreshErrorCode.USER_NOT_FOUND,
        };
      }

      if (!user.isActive) {
        return {
          success: false,
          error: "User account is inactive",
          errorCode: RefreshErrorCode.USER_INACTIVE,
        };
      }

      // Verify session is still valid (if sessionId present)
      if (decoded.sessionId) {
        const session = await this.prisma.session.findUnique({
          where: { id: decoded.sessionId },
        });

        if (!session || session.revokedAt) {
          return {
            success: false,
            error: "Session has been revoked",
            errorCode: RefreshErrorCode.TOKEN_REVOKED,
          };
        }
      }

      // Generate new access token
      const newAccessToken = this.jwtService.sign(
        {
          sub: user.id,
          email: user.email,
          organizationId: user.organizationId,
          role: user.role,
          sessionId: decoded.sessionId,
          type: "access",
        },
        { expiresIn: this.accessTokenExpiry },
      );

      this.logger.debug(`WebSocket token refreshed for user ${user.id}`);

      return {
        success: true,
        accessToken: newAccessToken,
      };
    } catch (error) {
      this.logger.error(
        `WebSocket token refresh failed: ${(error as Error).message}`,
      );
      return {
        success: false,
        error: "Token refresh failed",
        errorCode: RefreshErrorCode.INVALID_TOKEN,
      };
    }
  }

  /**
   * Revokes all sessions for a user.
   * Use when user logs out or password is changed.
   *
   * @param userId - User ID to revoke sessions for
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    this.logger.debug(`Revoked all sessions for user ${userId}`);
  }

  /**
   * Revokes a specific session.
   *
   * @param sessionId - Session ID to revoke
   */
  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    this.logger.debug(`Revoked session ${sessionId}`);
  }
}
