import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiProduces,
} from "@nestjs/swagger";
import { Throttle, SkipThrottle } from "@nestjs/throttler";
import { AuthGuard } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import { Request, Response } from "express";
import { AuthService } from "./auth.service";
import {
  LoginDto,
  AuthResponseDto,
  RefreshTokenDto,
  UserProfileDto,
} from "./dto";
import { Public } from "../../common/guards/jwt-auth.guard";
import { JwtAuthGuard, RolesGuard } from "../../common/guards";
import { CurrentUser, Roles } from "../../common/decorators";
import { UserRole } from "../../common/decorators/roles.decorator";
import { RequestUser } from "./interfaces/jwt-payload.interface";
import {
  SsoConfigService,
  UpdateSsoConfigDto,
  SsoConfigResponseDto,
} from "./sso";

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
  constructor(
    private readonly authService: AuthService,
    private readonly ssoConfigService: SsoConfigService,
    private readonly configService: ConfigService,
  ) {}

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

  // ===========================================
  // Azure AD SSO Endpoints
  // ===========================================

  /**
   * GET /api/v1/auth/azure-ad
   * Initiate Azure AD SSO login.
   * Redirects user to Microsoft login page.
   * Rate limited: 10 requests per minute (moderate - redirect-based, less abuse risk)
   */
  @Get("azure-ad")
  @UseGuards(AuthGuard("azure-ad"))
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Public()
  @ApiOperation({ summary: "Initiate Azure AD SSO login" })
  @ApiResponse({ status: 302, description: "Redirects to Microsoft login" })
  azureAdLogin(): void {
    // Passport handles the redirect to Azure AD
    // This method body never executes
  }

  /**
   * POST /api/v1/auth/azure-ad/callback
   * Handle Azure AD SSO callback.
   * Validates the authentication and issues JWT tokens.
   * Rate limited: 20 requests per minute (moderate - callback from Azure)
   */
  @Post("azure-ad/callback")
  @UseGuards(AuthGuard("azure-ad"))
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Azure AD SSO callback" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async azureAdCallback(
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    // User is already validated by AzureAdStrategy
    const user = req.user as any;

    if (!user) {
      throw new UnauthorizedException("Azure AD authentication failed");
    }

    const userAgent = req.headers["user-agent"];
    const ipAddress =
      req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";

    // Create session and generate JWT tokens using existing auth service
    return this.authService.createSsoSession(user, userAgent, ipAddress);
  }

  // ===========================================
  // Google OAuth SSO Endpoints
  // ===========================================

  /**
   * GET /api/v1/auth/google
   * Initiate Google OAuth SSO login.
   * Redirects user to Google login page.
   * Rate limited: 10 requests per minute (moderate - redirect-based, less abuse risk)
   */
  @Get("google")
  @UseGuards(AuthGuard("google"))
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Public()
  @ApiOperation({ summary: "Initiate Google OAuth SSO login" })
  @ApiResponse({ status: 302, description: "Redirects to Google login" })
  googleLogin(): void {
    // Passport handles the redirect to Google
    // This method body never executes
  }

  /**
   * GET /api/v1/auth/google/callback
   * Handle Google OAuth SSO callback.
   * Validates the authentication and issues JWT tokens.
   * Rate limited: 20 requests per minute (moderate - callback from Google)
   *
   * Note: Google OAuth uses GET (not POST) for the callback endpoint.
   * The authorization code is received in query params, which Passport
   * exchanges for tokens automatically.
   */
  @Get("google/callback")
  @UseGuards(AuthGuard("google"))
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Public()
  @ApiOperation({ summary: "Google OAuth SSO callback" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async googleCallback(
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    // User is already validated by GoogleStrategy
    const user = req.user as any;

    if (!user) {
      throw new UnauthorizedException("Google OAuth authentication failed");
    }

    const userAgent = req.headers["user-agent"];
    const ipAddress =
      req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";

    // Create session and generate JWT tokens using existing auth service
    return this.authService.createSsoSession(user, userAgent, ipAddress);
  }

  // ===========================================
  // SAML SSO Endpoints
  // ===========================================

  /**
   * GET /api/v1/auth/saml/:tenant
   * Initiate SAML SSO login for a specific tenant.
   * Redirects user to their organization's IdP.
   * Rate limited: 10 requests per minute (moderate - redirect-based)
   *
   * @param tenant - Organization slug (e.g., "acme")
   */
  @Get("saml/:tenant")
  @UseGuards(AuthGuard("saml"))
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Public()
  @ApiOperation({ summary: "Initiate SAML SSO login for tenant" })
  @ApiParam({ name: "tenant", description: "Organization slug" })
  @ApiResponse({ status: 302, description: "Redirects to IdP login" })
  samlLogin(@Param("tenant") tenant: string): void {
    // Passport handles the redirect to IdP
    // Tenant is used by SamlStrategy to load correct configuration
  }

  /**
   * POST /api/v1/auth/saml/:tenant/callback
   * Handle SAML SSO callback (Assertion Consumer Service).
   * Validates the SAML assertion and issues JWT tokens.
   * Rate limited: 20 requests per minute (moderate - callback from IdP)
   *
   * @param tenant - Organization slug
   */
  @Post("saml/:tenant/callback")
  @UseGuards(AuthGuard("saml"))
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "SAML SSO callback (ACS)" })
  @ApiParam({ name: "tenant", description: "Organization slug" })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async samlCallback(
    @Param("tenant") tenant: string,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    // User is already validated by SamlStrategy
    const user = req.user as any;

    if (!user) {
      throw new UnauthorizedException("SAML authentication failed");
    }

    // Verify user belongs to the correct tenant
    const organization = await this.authService.getOrganizationBySlug(tenant);
    if (!organization || user.organizationId !== organization.id) {
      throw new UnauthorizedException(
        "User does not belong to this organization",
      );
    }

    const userAgent = req.headers["user-agent"];
    const ipAddress =
      req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";

    // Create session and generate JWT tokens using existing auth service
    return this.authService.createSsoSession(user, userAgent, ipAddress);
  }

  /**
   * GET /api/v1/auth/saml/:tenant/metadata
   * Get SAML metadata for a tenant (SP metadata).
   * IdP administrators use this to configure the Service Provider.
   */
  @Get("saml/:tenant/metadata")
  @Public()
  @ApiOperation({ summary: "Get SAML SP metadata for tenant" })
  @ApiParam({ name: "tenant", description: "Organization slug" })
  @ApiProduces("application/xml")
  @ApiResponse({
    status: 200,
    description: "SAML SP metadata XML",
    content: { "application/xml": {} },
  })
  async getSamlMetadata(
    @Param("tenant") tenant: string,
    @Res() res: Response,
  ): Promise<void> {
    // Generate SAML SP metadata XML for IdP configuration
    const apiUrl = this.configService.get<string>(
      "API_URL",
      "http://localhost:3000",
    );

    const metadata = `<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata"
                  entityID="${apiUrl}/saml/${tenant}">
  <SPSSODescriptor AuthnRequestsSigned="false"
                   WantAssertionsSigned="true"
                   protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <NameIDFormat>urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress</NameIDFormat>
    <AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                              Location="${apiUrl}/api/v1/auth/saml/${tenant}/callback"
                              index="0" isDefault="true"/>
  </SPSSODescriptor>
</EntityDescriptor>`;

    res.set("Content-Type", "application/xml");
    res.send(metadata);
  }

  // ===========================================
  // SSO Configuration Endpoints
  // ===========================================

  /**
   * GET /api/v1/auth/sso/config
   * Get SSO configuration for the current organization.
   * Restricted to SYSTEM_ADMIN role.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @Get("sso/config")
  @ApiBearerAuth("JWT")
  @ApiOperation({
    summary: "Get SSO configuration",
    description: "Get SSO configuration for the current organization",
  })
  @ApiResponse({
    status: 200,
    description: "SSO configuration",
    type: SsoConfigResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - requires SYSTEM_ADMIN" })
  async getSsoConfig(
    @CurrentUser() user: { organizationId: string },
  ): Promise<SsoConfigResponseDto> {
    return this.ssoConfigService.getConfig(user.organizationId);
  }

  /**
   * PATCH /api/v1/auth/sso/config
   * Update SSO configuration for the current organization.
   * Restricted to SYSTEM_ADMIN role.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @Patch("sso/config")
  @ApiBearerAuth("JWT")
  @ApiOperation({
    summary: "Update SSO configuration",
    description: "Update SSO configuration for the current organization",
  })
  @ApiResponse({
    status: 200,
    description: "SSO configuration updated",
    type: SsoConfigResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - requires SYSTEM_ADMIN" })
  async updateSsoConfig(
    @Body() dto: UpdateSsoConfigDto,
    @CurrentUser() user: { sub: string; organizationId: string },
  ): Promise<SsoConfigResponseDto> {
    return this.ssoConfigService.updateConfig(
      user.organizationId,
      dto,
      user.sub,
    );
  }
}
