/**
 * SupportConsoleController
 *
 * REST API for support console operations.
 * Provides debug access to tenant data via impersonation.
 *
 * Per CONTEXT.md:
 * - Tenant search does NOT require impersonation (find tenant to impersonate)
 * - All other endpoints REQUIRE active impersonation
 * - All actions are audited via ImpersonationService
 *
 * SECURITY:
 * - Uses ImpersonationGuard to enforce active session
 * - Session ID passed via X-Impersonation-Session header
 * - All tenant-specific operations validate impersonated org matches request
 *
 * @see CONTEXT.md for Support team requirements
 * @see support-console.service.ts for business logic
 */

import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  Req,
  Logger,
} from "@nestjs/common";
import { Request } from "express";
import { SupportConsoleService } from "./support-console.service";
import { TenantSearchDto, ErrorLogFiltersDto } from "./dto/support.dto";
import { ImpersonationGuard } from "../impersonation/impersonation.guard";

@Controller("internal/support")
export class SupportConsoleController {
  private readonly logger = new Logger(SupportConsoleController.name);

  constructor(private readonly supportService: SupportConsoleService) {}

  /**
   * Search for tenants by name, domain, or ID.
   *
   * This endpoint does NOT require impersonation - it's used
   * to find which tenant to impersonate.
   *
   * GET /api/v1/internal/support/tenants/search?query=acme
   */
  @Get("tenants/search")
  async searchTenants(@Query() dto: TenantSearchDto) {
    this.logger.debug(`Tenant search: ${dto.query}`);
    return this.supportService.searchTenants(dto);
  }

  /**
   * Get detailed tenant information.
   *
   * Requires active impersonation for the target organization.
   *
   * GET /api/v1/internal/support/tenants/:organizationId
   */
  @Get("tenants/:organizationId")
  @UseGuards(ImpersonationGuard)
  async getTenantDetails(
    @Param("organizationId") organizationId: string,
    @Req() req: Request,
  ) {
    this.setSessionContext(req);
    return this.supportService.getTenantDetails(organizationId);
  }

  /**
   * Get error logs for a tenant.
   *
   * Requires active impersonation.
   *
   * GET /api/v1/internal/support/tenants/:organizationId/errors?level=error&startDate=2024-01-01
   */
  @Get("tenants/:organizationId/errors")
  @UseGuards(ImpersonationGuard)
  async getErrorLogs(
    @Param("organizationId") organizationId: string,
    @Query() filters: ErrorLogFiltersDto,
    @Req() req: Request,
  ) {
    this.setSessionContext(req);
    return this.supportService.getErrorLogs(organizationId, filters);
  }

  /**
   * Get tenant configuration for debugging.
   *
   * Returns SSO config, feature flags, domains, and settings.
   * Requires active impersonation.
   *
   * GET /api/v1/internal/support/tenants/:organizationId/config
   */
  @Get("tenants/:organizationId/config")
  @UseGuards(ImpersonationGuard)
  async getTenantConfig(
    @Param("organizationId") organizationId: string,
    @Req() req: Request,
  ) {
    this.setSessionContext(req);
    return this.supportService.getTenantConfig(organizationId);
  }

  /**
   * Get job queue status for a tenant.
   *
   * Shows pending/processing export and migration jobs.
   * Requires active impersonation.
   *
   * GET /api/v1/internal/support/tenants/:organizationId/jobs
   */
  @Get("tenants/:organizationId/jobs")
  @UseGuards(ImpersonationGuard)
  async getJobQueueStatus(
    @Param("organizationId") organizationId: string,
    @Req() req: Request,
  ) {
    this.setSessionContext(req);
    return this.supportService.getJobQueueStatus(organizationId);
  }

  /**
   * Get search index status for a tenant.
   *
   * Compares database counts vs Elasticsearch counts.
   * Requires active impersonation.
   *
   * GET /api/v1/internal/support/tenants/:organizationId/search-index
   */
  @Get("tenants/:organizationId/search-index")
  @UseGuards(ImpersonationGuard)
  async getSearchIndexStatus(
    @Param("organizationId") organizationId: string,
    @Req() req: Request,
  ) {
    this.setSessionContext(req);
    return this.supportService.getSearchIndexStatus(organizationId);
  }

  /**
   * Set session context on the service for audit logging.
   *
   * Extracts session ID from request (set by ImpersonationMiddleware/Guard)
   * and passes it to the service.
   */
  private setSessionContext(req: Request): void {
    if (req.impersonation?.sessionId) {
      this.supportService.setSessionContext(req.impersonation.sessionId);
    }
  }
}
