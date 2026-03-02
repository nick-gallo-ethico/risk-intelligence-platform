import { Controller, Get, Patch, Post, Body, UseGuards } from "@nestjs/common";
import { JwtAuthGuard, RolesGuard, TenantGuard } from "../../../common/guards";
import { Roles, UserRole, TenantId } from "../../../common/decorators";
import { SlaConfigService } from "./sla-config.service";
import { UpdateCaseSlaConfigDto } from "./dto/sla-config.dto";

/**
 * SlaConfigController provides REST endpoints for managing case SLA configuration.
 *
 * Endpoints:
 * - GET /sla/config - Get current SLA configuration for the organization
 * - PATCH /sla/config - Update SLA configuration (partial update)
 * - POST /sla/config/reset - Reset to default configuration
 *
 * All endpoints require SYSTEM_ADMIN or COMPLIANCE_OFFICER role.
 */
@Controller("sla")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class SlaConfigController {
  constructor(private readonly slaConfigService: SlaConfigService) {}

  /**
   * Get current SLA configuration for the organization.
   * Returns default configuration if none has been set.
   */
  @Get("config")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async getConfig(@TenantId() organizationId: string) {
    return this.slaConfigService.getConfig(organizationId);
  }

  /**
   * Update SLA configuration for the organization.
   * Supports partial updates - only provided fields will be updated.
   */
  @Patch("config")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async updateConfig(
    @TenantId() organizationId: string,
    @Body() dto: UpdateCaseSlaConfigDto,
  ) {
    return this.slaConfigService.updateConfig(organizationId, dto);
  }

  /**
   * Reset SLA configuration to default values.
   */
  @Post("config/reset")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async resetConfig(@TenantId() organizationId: string) {
    return this.slaConfigService.resetConfig(organizationId);
  }
}
