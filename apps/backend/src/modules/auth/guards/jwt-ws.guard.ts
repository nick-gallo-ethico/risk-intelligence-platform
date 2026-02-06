/**
 * JwtWsGuard - WebSocket Authentication Guard
 *
 * Validates JWT tokens for WebSocket connections. Supports multiple token
 * extraction methods (auth object, Authorization header, query parameter).
 *
 * Key features:
 * - Token validation with proper error messages
 * - Proactive refresh notification when token is about to expire
 * - Attach user data to socket for downstream use
 * - Support for token refresh during session
 *
 * Usage:
 * @UseGuards(JwtWsGuard)
 * @SubscribeMessage('some-event')
 * handleEvent(@ConnectedSocket() client: Socket) { ... }
 */

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { WsException } from "@nestjs/websockets";
import { Socket } from "socket.io";
import { ConfigService } from "@nestjs/config";

/**
 * WebSocket exception codes for client handling.
 */
export const WsErrorCode = {
  UNAUTHORIZED: "UNAUTHORIZED",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  INVALID_TOKEN: "INVALID_TOKEN",
  MISSING_TOKEN: "MISSING_TOKEN",
} as const;

export type WsErrorCodeType = (typeof WsErrorCode)[keyof typeof WsErrorCode];

/**
 * User data attached to socket after authentication.
 */
export interface WsUserData {
  id: string;
  email: string;
  role: string;
  organizationId: string;
}

@Injectable()
export class JwtWsGuard implements CanActivate {
  private readonly logger = new Logger(JwtWsGuard.name);

  /**
   * Time before token expiry to notify client (60 seconds).
   */
  private readonly refreshBufferMs: number = 60 * 1000;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validates the JWT token from the WebSocket handshake.
   * Attaches user data to socket.data for downstream use.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      this.logger.warn(`WebSocket connection without token (${client.id})`);
      throw new WsException({
        code: WsErrorCode.MISSING_TOKEN,
        message: "Authentication token required",
      });
    }

    try {
      const secret = this.configService.get<string>("JWT_SECRET");
      const payload = await this.jwtService.verifyAsync(token, { secret });

      // Check if token is about to expire
      this.checkTokenExpiry(client, payload);

      // Attach user data to socket
      client.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        organizationId: payload.organizationId,
      } as WsUserData;

      client.data.tenantId = payload.organizationId;
      client.data.sessionId = payload.sessionId;

      return true;
    } catch (error) {
      return this.handleAuthError(client, error);
    }
  }

  /**
   * Extracts token from various sources in order of priority.
   *
   * Priority:
   * 1. auth.token (recommended for socket.io)
   * 2. Authorization header (Bearer token)
   * 3. query.token (fallback for older clients)
   */
  private extractToken(client: Socket): string | undefined {
    // Priority 1: auth object (recommended)
    const auth = client.handshake.auth;
    if (auth?.token && typeof auth.token === "string") {
      return auth.token;
    }

    // Priority 2: Authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }

    // Priority 3: Query parameter (fallback)
    const query = client.handshake.query;
    if (query.token && typeof query.token === "string") {
      return query.token;
    }

    return undefined;
  }

  /**
   * Checks if token is about to expire and emits refresh-needed event.
   * This allows clients to proactively refresh their token before disconnection.
   */
  private checkTokenExpiry(client: Socket, payload: any): void {
    if (!payload.exp) {
      return;
    }

    const expiresAt = payload.exp * 1000;
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    if (timeUntilExpiry > 0 && timeUntilExpiry < this.refreshBufferMs) {
      this.logger.debug(
        `Token for ${payload.sub} expires in ${timeUntilExpiry}ms, notifying client`,
      );

      client.emit("auth:refresh-needed", {
        expiresIn: timeUntilExpiry,
        expiresAt: new Date(expiresAt).toISOString(),
      });
    }
  }

  /**
   * Handles authentication errors with appropriate error codes.
   */
  private handleAuthError(client: Socket, error: any): never {
    const errorName = error?.name || "UnknownError";
    const errorMessage = error?.message || "Authentication failed";

    this.logger.warn(
      `WebSocket auth failed for ${client.id}: ${errorName} - ${errorMessage}`,
    );

    if (errorName === "TokenExpiredError") {
      throw new WsException({
        code: WsErrorCode.TOKEN_EXPIRED,
        message: "Token has expired - please refresh and reconnect",
      });
    }

    if (errorName === "JsonWebTokenError") {
      throw new WsException({
        code: WsErrorCode.INVALID_TOKEN,
        message: "Invalid token format",
      });
    }

    if (errorName === "NotBeforeError") {
      throw new WsException({
        code: WsErrorCode.INVALID_TOKEN,
        message: "Token not yet valid",
      });
    }

    throw new WsException({
      code: WsErrorCode.UNAUTHORIZED,
      message: "Authentication failed",
    });
  }
}

/**
 * Helper function to get user data from socket.
 * Use in WebSocket handlers after JwtWsGuard has validated the connection.
 */
export function getWsUser(client: Socket): WsUserData | undefined {
  return client.data.user;
}

/**
 * Helper function to get tenant ID from socket.
 */
export function getWsTenantId(client: Socket): string | undefined {
  return client.data.tenantId;
}
