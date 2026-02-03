import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { Throttle, SkipThrottle } from "@nestjs/throttler";
import { Request } from "express";
import { AuthService } from "./auth.service";
import {
  LoginDto,
  AuthResponseDto,
  RefreshTokenDto,
  UserProfileDto,
} from "./dto";
import { Public } from "../../common/guards/jwt-auth.guard";
import { JwtAuthGuard } from "../../common/guards";
import { CurrentUser } from "../../common/decorators";
import { RequestUser } from "./interfaces/jwt-payload.interface";

// Rate limit tiers for auth endpoints:
// - Login: 5/min (strict - protects against brute force)
// - MFA verify: 3/min (strict - protects MFA bypass attempts)
// - Password reset: 3/hour (strict - prevents abuse)
// - Refresh: 30/min (moderate - normal app usage)
// - Logout: 10/min (moderate - batch logout scenarios)
// - SSO initiate: 10/min (moderate - redirect-based, less abuse risk)

@ApiTags("Auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/v1/auth/login
   * Authenticates user with email/password and returns JWT tokens.
   * Rate limited: 5 requests per minute (strict - protects against brute force)
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "User login",
    description:
      "Authenticates user with email/password and returns JWT tokens",
  })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 400, description: "Invalid credentials" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const userAgent = req.headers["user-agent"];
    const ipAddress =
      req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";

    return this.authService.login(loginDto, userAgent, ipAddress);
  }

  /**
   * POST /api/v1/auth/refresh
   * Refreshes access token using refresh token.
   * Implements token rotation - old refresh token is invalidated.
   * Rate limited: 30 requests per minute (moderate - normal app usage)
   */
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Refresh tokens",
    description:
      "Refreshes access token using refresh token. Implements token rotation - old refresh token is invalidated.",
  })
  @ApiResponse({
    status: 200,
    description: "Tokens refreshed successfully",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Invalid or expired refresh token" })
  async refresh(
    @Body() refreshDto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const userAgent = req.headers["user-agent"];
    const ipAddress =
      req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";

    return this.authService.refreshTokens(
      refreshDto.refreshToken,
      userAgent,
      ipAddress,
    );
  }

  /**
   * POST /api/v1/auth/logout
   * Revokes the current session (single device logout).
   * Rate limited: 10 requests per minute (moderate - batch logout scenarios)
   */
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth("JWT")
  @ApiOperation({
    summary: "Logout",
    description: "Revokes the current session (single device logout)",
  })
  @ApiResponse({ status: 204, description: "Logged out successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async logout(@CurrentUser() user: RequestUser): Promise<void> {
    await this.authService.revokeSession(user.sessionId);
  }

  /**
   * POST /api/v1/auth/logout-all
   * Revokes all sessions for the current user (logout from all devices).
   * Rate limited: 5 requests per minute (stricter - security sensitive operation)
   */
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post("logout-all")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth("JWT")
  @ApiOperation({
    summary: "Logout from all devices",
    description: "Revokes all sessions for the current user",
  })
  @ApiResponse({ status: 204, description: "All sessions revoked" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async logoutAll(@CurrentUser() user: RequestUser): Promise<void> {
    await this.authService.revokeAllSessions(user.id);
  }

  /**
   * GET /api/v1/auth/me
   * Returns the current authenticated user's profile.
   * Rate limited: uses default (100/min) - read-only endpoint
   */
  @UseGuards(JwtAuthGuard)
  @SkipThrottle({ default: false }) // Use global default rate limit
  @Get("me")
  @ApiBearerAuth("JWT")
  @ApiOperation({
    summary: "Get current user profile",
    description: "Returns the current authenticated user's profile",
  })
  @ApiResponse({
    status: 200,
    description: "User profile",
    type: UserProfileDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async me(@CurrentUser() user: RequestUser): Promise<UserProfileDto> {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      organizationId: user.organizationId,
    };
  }
}
