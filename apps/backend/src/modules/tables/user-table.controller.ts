import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Res,
  UseGuards,
  HttpStatus,
  ParseUUIDPipe,
  StreamableFile,
} from "@nestjs/common";
import { Response } from "express";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { Roles, UserRole } from "../../common/decorators/roles.decorator";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { UserTableService } from "./user-table.service";
import {
  CreateTableDto,
  UpdateTableDto,
  ScheduleTableDto,
  ShareTableDto,
  CloneTableDto,
  TableQueryDto,
  ExportTableDto,
} from "./dto";

/**
 * Interface for authenticated user from JWT token.
 */
interface AuthUser {
  id: string;
  organizationId: string;
  role: UserRole;
}

/**
 * UserTableController
 *
 * REST API for user-created data tables (RS.48).
 *
 * Endpoints:
 * - POST   /api/v1/tables          - Create a new table
 * - GET    /api/v1/tables          - List user's tables
 * - GET    /api/v1/tables/:id      - Get table definition
 * - PUT    /api/v1/tables/:id      - Update table
 * - DELETE /api/v1/tables/:id      - Delete table (soft delete)
 * - POST   /api/v1/tables/:id/execute   - Execute table query
 * - POST   /api/v1/tables/:id/refresh   - Refresh cached results
 * - POST   /api/v1/tables/:id/export    - Export data
 * - POST   /api/v1/tables/:id/schedule  - Configure delivery schedule
 * - POST   /api/v1/tables/:id/share     - Update sharing settings
 * - POST   /api/v1/tables/:id/clone     - Clone table
 */
@Controller("tables")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class UserTableController {
  constructor(private readonly tableService: UserTableService) {}

  /**
   * Create a new user data table.
   */
  @Post()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
    UserRole.INVESTIGATOR,
    UserRole.POLICY_AUTHOR,
  )
  async create(
    @Body() dto: CreateTableDto,
    @CurrentUser() user: AuthUser,
    @TenantId() organizationId: string,
  ) {
    return this.tableService.create(dto, user.id, organizationId);
  }

  /**
   * List tables visible to the current user.
   */
  @Get()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
    UserRole.INVESTIGATOR,
    UserRole.POLICY_AUTHOR,
    UserRole.EMPLOYEE,
  )
  async findAll(
    @Query() query: TableQueryDto,
    @CurrentUser() user: AuthUser,
    @TenantId() organizationId: string,
  ) {
    return this.tableService.findMany(query, user.id, organizationId);
  }

  /**
   * Get a table by ID.
   */
  @Get(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
    UserRole.INVESTIGATOR,
    UserRole.POLICY_AUTHOR,
    UserRole.EMPLOYEE,
  )
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @TenantId() organizationId: string,
  ) {
    return this.tableService.findById(id, user.id, organizationId);
  }

  /**
   * Update a table definition.
   */
  @Put(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
    UserRole.INVESTIGATOR,
    UserRole.POLICY_AUTHOR,
  )
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateTableDto,
    @CurrentUser() user: AuthUser,
    @TenantId() organizationId: string,
  ) {
    return this.tableService.update(id, dto, user.id, organizationId);
  }

  /**
   * Delete a table (soft delete).
   */
  @Delete(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
    UserRole.INVESTIGATOR,
    UserRole.POLICY_AUTHOR,
  )
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @TenantId() organizationId: string,
  ) {
    await this.tableService.delete(id, user.id, organizationId);
    return { message: "Table deleted successfully" };
  }

  /**
   * Execute table query and return results.
   */
  @Post(":id/execute")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
    UserRole.INVESTIGATOR,
    UserRole.POLICY_AUTHOR,
    UserRole.EMPLOYEE,
  )
  async execute(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @TenantId() organizationId: string,
    @Query("limit") limit?: number,
    @Query("offset") offset?: number,
  ) {
    return this.tableService.execute(id, user.id, organizationId, {
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  /**
   * Refresh table results (re-execute and cache).
   */
  @Post(":id/refresh")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
    UserRole.INVESTIGATOR,
    UserRole.POLICY_AUTHOR,
  )
  async refresh(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
    @TenantId() organizationId: string,
  ) {
    return this.tableService.refresh(id, user.id, organizationId);
  }

  /**
   * Export table data to CSV, Excel, or PDF.
   */
  @Post(":id/export")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
    UserRole.INVESTIGATOR,
    UserRole.POLICY_AUTHOR,
    UserRole.EMPLOYEE,
  )
  async export(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ExportTableDto,
    @CurrentUser() user: AuthUser,
    @TenantId() organizationId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | { content: string; filename: string }> {
    const result = await this.tableService.export(
      id,
      dto,
      user.id,
      organizationId,
    );

    if (result.buffer) {
      // Binary file (Excel)
      const contentType =
        dto.format === "excel"
          ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : "application/pdf";

      res.set({
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      });

      return new StreamableFile(result.buffer);
    }

    // CSV - return as text
    if (result.content) {
      res.set({
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${result.filename}"`,
      });

      res.status(HttpStatus.OK).send(result.content);
      return { content: result.content, filename: result.filename };
    }

    throw new Error("Export failed - no content generated");
  }

  /**
   * Configure scheduled delivery for a table.
   */
  @Post(":id/schedule")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
    UserRole.INVESTIGATOR,
    UserRole.POLICY_AUTHOR,
  )
  async schedule(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ScheduleTableDto,
    @CurrentUser() user: AuthUser,
    @TenantId() organizationId: string,
  ) {
    return this.tableService.schedule(id, dto, user.id, organizationId);
  }

  /**
   * Update sharing settings for a table.
   */
  @Post(":id/share")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
    UserRole.INVESTIGATOR,
    UserRole.POLICY_AUTHOR,
  )
  async share(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ShareTableDto,
    @CurrentUser() user: AuthUser,
    @TenantId() organizationId: string,
  ) {
    return this.tableService.share(id, dto, user.id, organizationId);
  }

  /**
   * Clone a table with a new name.
   */
  @Post(":id/clone")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.TRIAGE_LEAD,
    UserRole.INVESTIGATOR,
    UserRole.POLICY_AUTHOR,
  )
  async clone(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CloneTableDto,
    @CurrentUser() user: AuthUser,
    @TenantId() organizationId: string,
  ) {
    return this.tableService.clone(id, dto, user.id, organizationId);
  }
}
