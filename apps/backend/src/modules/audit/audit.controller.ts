import {
  Controller,
  Get,
  Query,
  Param,
  UseGuards,
  ParseEnumPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles, UserRole } from "../../common/decorators/roles.decorator";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { AuditService } from "./audit.service";
import { AuditLogQueryDto } from "./dto/audit-log-query.dto";
import { AuditEntityType } from "@prisma/client";

/**
 * Controller for querying audit logs.
 *
 * Access is restricted to SYSTEM_ADMIN and COMPLIANCE_OFFICER roles
 * for general queries, with INVESTIGATOR access for entity-specific timelines.
 */
@Controller("audit")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /**
   * Query audit logs with filtering and pagination.
   *
   * GET /api/v1/audit?entityType=CASE&limit=50&offset=0
   *
   * Restricted to System Admins and Compliance Officers.
   */
  @Get()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async query(@TenantId() orgId: string, @Query() query: AuditLogQueryDto) {
    return this.auditService.query(orgId, query);
  }

  /**
   * Get audit log timeline for a specific entity.
   *
   * GET /api/v1/audit/entity/CASE/123e4567-e89b-12d3-a456-426614174000
   *
   * Available to System Admins, Compliance Officers, and Investigators
   * (so investigators can see the history of cases they're working on).
   */
  @Get("entity/:entityType/:entityId")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async getByEntity(
    @TenantId() orgId: string,
    @Param("entityType", new ParseEnumPipe(AuditEntityType))
    entityType: AuditEntityType,
    @Param("entityId") entityId: string,
    @Query("limit", new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.auditService.findByEntity(orgId, entityType, entityId, limit);
  }
}
