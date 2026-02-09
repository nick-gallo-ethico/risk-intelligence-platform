/**
 * OrganizationController - Organization Settings API
 *
 * Provides endpoints for managing organization-level settings including
 * general configuration, branding, notifications, and security.
 *
 * Endpoints:
 * - GET  /api/v1/organization          - Get current organization
 * - PUT  /api/v1/organization          - Update general settings
 * - GET  /api/v1/organization/settings - Get complete settings
 * - PUT  /api/v1/organization/branding - Update branding settings
 * - PUT  /api/v1/organization/notification-settings - Update notification settings
 * - PUT  /api/v1/organization/security-settings - Update security settings
 *
 * All endpoints require authentication and are scoped to the user's organization
 * via the TenantGuard. Admin endpoints require SYSTEM_ADMIN or COMPLIANCE_OFFICER roles.
 *
 * @see OrganizationService for business logic
 */

import { Controller, Get, Put, Body, UseGuards, Logger } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../common/decorators";
import { OrganizationService } from "./organization.service";
import {
  OrganizationSettingsDto,
  OrganizationResponseDto,
  UpdateOrganizationDto,
  UpdateBrandingSettingsDto,
  UpdateNotificationSettingsDto,
  UpdateSecuritySettingsDto,
} from "./dto";

/**
 * User object from JWT token.
 */
interface JwtUser {
  id: string;
  email: string;
  organizationId: string;
  role: string;
}

/**
 * Organization settings controller.
 * Route: /api/v1/organization
 */
@Controller("organization")
@ApiTags("Organization")
@ApiBearerAuth("JWT")
@UseGuards(JwtAuthGuard, TenantGuard)
export class OrganizationController {
  private readonly logger = new Logger(OrganizationController.name);

  constructor(private readonly organizationService: OrganizationService) {}

  /**
   * GET /api/v1/organization
   * Get the current organization entity.
   *
   * @example GET /api/v1/organization
   */
  @Get()
  @ApiOperation({
    summary: "Get current organization",
    description:
      "Returns the current organization entity with basic information",
  })
  @ApiResponse({
    status: 200,
    description: "Organization entity",
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Organization not found" })
  async getOrganization(
    @TenantId() organizationId: string,
  ): Promise<OrganizationResponseDto> {
    this.logger.debug(`Getting organization: ${organizationId}`);
    return this.organizationService.getOrganization(organizationId);
  }

  /**
   * PUT /api/v1/organization
   * Update general organization settings.
   *
   * Requires SYSTEM_ADMIN or COMPLIANCE_OFFICER role.
   *
   * @example PUT /api/v1/organization
   *          Body: { name: "Acme Corp", timezone: "America/New_York" }
   */
  @Put()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({
    summary: "Update general settings",
    description:
      "Updates organization name, timezone, date format, and language",
  })
  @ApiResponse({
    status: 200,
    description: "Updated organization",
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - requires admin role" })
  @ApiResponse({ status: 404, description: "Organization not found" })
  async updateOrganization(
    @TenantId() organizationId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    this.logger.log(
      `User ${user.id} updating organization settings for: ${organizationId}`,
    );
    return this.organizationService.updateOrganization(organizationId, dto);
  }

  /**
   * GET /api/v1/organization/settings
   * Get complete organization settings.
   *
   * Returns aggregated settings from Organization, TenantBranding,
   * OrgNotificationSettings, and TenantSsoConfig tables.
   *
   * @example GET /api/v1/organization/settings
   */
  @Get("settings")
  @ApiOperation({
    summary: "Get organization settings",
    description:
      "Returns complete organization settings including branding, notifications, and security",
  })
  @ApiResponse({
    status: 200,
    description: "Complete organization settings",
    type: OrganizationSettingsDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Organization not found" })
  async getSettings(
    @TenantId() organizationId: string,
  ): Promise<OrganizationSettingsDto> {
    this.logger.debug(`Getting settings for organization: ${organizationId}`);
    return this.organizationService.getSettings(organizationId);
  }

  /**
   * PUT /api/v1/organization/branding
   * Update branding settings.
   *
   * Requires SYSTEM_ADMIN or COMPLIANCE_OFFICER role.
   *
   * @example PUT /api/v1/organization/branding
   *          Body: { brandingMode: "CO_BRANDED", primaryColor: "221 83% 53%" }
   */
  @Put("branding")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({
    summary: "Update branding settings",
    description:
      "Updates organization branding configuration (logo, colors, custom CSS)",
  })
  @ApiResponse({
    status: 200,
    description: "Updated organization settings",
    type: OrganizationSettingsDto,
  })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - requires admin role" })
  @ApiResponse({ status: 404, description: "Organization not found" })
  async updateBrandingSettings(
    @TenantId() organizationId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateBrandingSettingsDto,
  ): Promise<OrganizationSettingsDto> {
    this.logger.log(
      `User ${user.id} updating branding settings for: ${organizationId}`,
    );
    return this.organizationService.updateBrandingSettings(organizationId, dto);
  }

  /**
   * PUT /api/v1/organization/notification-settings
   * Update notification settings.
   *
   * Requires SYSTEM_ADMIN or COMPLIANCE_OFFICER role.
   *
   * @example PUT /api/v1/organization/notification-settings
   *          Body: { digestEnabled: true, defaultDigestTime: "09:00" }
   */
  @Put("notification-settings")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({
    summary: "Update notification settings",
    description:
      "Updates organization notification configuration (digest, quiet hours, enforced categories)",
  })
  @ApiResponse({
    status: 200,
    description: "Updated organization settings",
    type: OrganizationSettingsDto,
  })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - requires admin role" })
  @ApiResponse({ status: 404, description: "Organization not found" })
  async updateNotificationSettings(
    @TenantId() organizationId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateNotificationSettingsDto,
  ): Promise<OrganizationSettingsDto> {
    this.logger.log(
      `User ${user.id} updating notification settings for: ${organizationId}`,
    );
    return this.organizationService.updateNotificationSettings(
      organizationId,
      dto,
    );
  }

  /**
   * PUT /api/v1/organization/security-settings
   * Update security settings.
   *
   * Requires SYSTEM_ADMIN role only (security-sensitive).
   *
   * @example PUT /api/v1/organization/security-settings
   *          Body: { mfaRequired: true, sessionTimeoutMinutes: 30 }
   */
  @Put("security-settings")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN)
  @ApiOperation({
    summary: "Update security settings",
    description:
      "Updates organization security configuration (MFA, session timeout, password policy)",
  })
  @ApiResponse({
    status: 200,
    description: "Updated organization settings",
    type: OrganizationSettingsDto,
  })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - requires SYSTEM_ADMIN role",
  })
  @ApiResponse({ status: 404, description: "Organization not found" })
  async updateSecuritySettings(
    @TenantId() organizationId: string,
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateSecuritySettingsDto,
  ): Promise<OrganizationSettingsDto> {
    this.logger.log(
      `User ${user.id} updating security settings for: ${organizationId}`,
    );
    return this.organizationService.updateSecuritySettings(organizationId, dto);
  }
}
