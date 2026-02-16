import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { ConflictStatus, ConflictType, ConflictSeverity } from "@prisma/client";
import { ConflictDetectionService } from "./conflict-detection.service";
import {
  ConflictQueryDto,
  ConflictAlertDto,
  ConflictAlertPageDto,
  DismissConflictDto,
  EscalateConflictDto,
  CreateExclusionDto,
  ConflictExclusionDto,
  EntityTimelineDto,
} from "./dto/conflict.dto";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../common/guards/tenant.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles, UserRole } from "../../common/decorators/roles.decorator";
import { TenantId } from "../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";

/**
 * ConflictController provides REST endpoints for conflict management.
 * RS.42-RS.43: Conflict detection, contextual presentation, dismissals
 * RS.49: Entity timeline history view
 *
 * Endpoints:
 * - GET /api/v1/conflicts - List conflicts with filters
 * - GET /api/v1/conflicts/:id - Get single conflict
 * - POST /api/v1/conflicts/:id/dismiss - Dismiss conflict
 * - POST /api/v1/conflicts/:id/escalate - Escalate to case
 * - GET /api/v1/conflicts/entity/:name - Entity timeline
 * - POST /api/v1/conflicts/exclusions - Create exclusion
 * - GET /api/v1/conflicts/exclusions - List exclusions
 * - DELETE /api/v1/conflicts/exclusions/:id - Deactivate exclusion
 */
@ApiTags("conflicts")
@ApiBearerAuth()
@Controller("conflicts")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class ConflictController {
  constructor(
    private readonly conflictDetectionService: ConflictDetectionService,
  ) {}

  // Conflict Alert Endpoints

  /**
   * List conflict alerts with filters.
   * Supports filtering by status, type, severity, matched entity, confidence, and date range.
   */
  @Get()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  @ApiOperation({ summary: "List conflict alerts with filters" })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ConflictStatus,
    isArray: true,
  })
  @ApiQuery({
    name: "conflictType",
    required: false,
    enum: ConflictType,
    isArray: true,
  })
  @ApiQuery({
    name: "severity",
    required: false,
    enum: ConflictSeverity,
    isArray: true,
  })
  @ApiQuery({ name: "matchedEntity", required: false, type: String })
  @ApiQuery({ name: "minConfidence", required: false, type: Number })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Paginated list of conflict alerts",
  })
  async findAll(
    @Query() query: ConflictQueryDto,
    @TenantId() organizationId: string,
  ): Promise<ConflictAlertPageDto> {
    return this.conflictDetectionService.findAlerts(organizationId, query);
  }

  /**
   * Get a single conflict alert by ID with full context.
   */
  @Get(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  @ApiOperation({ summary: "Get conflict alert by ID" })
  @ApiParam({ name: "id", type: "string", description: "Conflict alert UUID" })
  @ApiResponse({ status: 200, description: "Conflict alert details" })
  @ApiResponse({ status: 404, description: "Conflict alert not found" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<ConflictAlertDto> {
    const alert = await this.conflictDetectionService.findAlertById(
      id,
      organizationId,
    );
    if (!alert) {
      throw new NotFoundException(`Conflict alert ${id} not found`);
    }
    return alert;
  }

  /**
   * Dismiss a conflict alert with categorization.
   * RS.44: Categorized dismissals with optional exclusion creation.
   */
  @Post(":id/dismiss")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({
    summary: "Dismiss a conflict alert with category and reason",
  })
  @ApiParam({ name: "id", type: "string", description: "Conflict alert UUID" })
  @ApiResponse({ status: 200, description: "Conflict dismissed successfully" })
  @ApiResponse({ status: 400, description: "Invalid dismissal request" })
  @ApiResponse({ status: 404, description: "Conflict alert not found" })
  async dismissConflict(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: DismissConflictDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<ConflictAlertDto> {
    return this.conflictDetectionService.dismissConflict(
      id,
      dto,
      user.id,
      organizationId,
    );
  }

  /**
   * Escalate a conflict alert to a case for investigation.
   * Creates a new case or links to an existing case.
   */
  @Post(":id/escalate")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Escalate conflict to case for investigation" })
  @ApiParam({ name: "id", type: "string", description: "Conflict alert UUID" })
  @ApiResponse({ status: 200, description: "Conflict escalated successfully" })
  @ApiResponse({ status: 400, description: "Invalid escalation request" })
  @ApiResponse({ status: 404, description: "Conflict alert not found" })
  async escalateConflict(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: EscalateConflictDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<ConflictAlertDto> {
    return this.conflictDetectionService.escalateConflict(
      id,
      dto,
      user.id,
      organizationId,
    );
  }

  // Entity Timeline Endpoint (RS.49)

  /**
   * Get entity timeline history showing all interactions with a named entity.
   * RS.49: Full entity timeline across disclosures, conflicts, and cases.
   */
  @Get("entity/:name")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  @ApiOperation({ summary: "Get entity timeline history" })
  @ApiParam({
    name: "name",
    type: "string",
    description: "Entity name to search",
  })
  @ApiResponse({
    status: 200,
    description: "Entity timeline with all historical events",
  })
  async getEntityTimeline(
    @Param("name") entityName: string,
    @TenantId() organizationId: string,
  ): Promise<EntityTimelineDto> {
    return this.conflictDetectionService.getEntityTimeline(
      decodeURIComponent(entityName),
      organizationId,
    );
  }

  // Exclusion Management Endpoints

  /**
   * List active conflict exclusions.
   * Returns all exclusion rules currently in effect.
   */
  @Get("exclusions")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  @ApiOperation({ summary: "List active conflict exclusions" })
  @ApiQuery({ name: "personId", required: false, type: String })
  @ApiQuery({ name: "conflictType", required: false, enum: ConflictType })
  @ApiQuery({ name: "activeOnly", required: false, type: Boolean })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "pageSize", required: false, type: Number })
  @ApiResponse({ status: 200, description: "List of conflict exclusions" })
  async listExclusions(
    @Query("personId") personId: string | undefined,
    @Query("conflictType") conflictType: ConflictType | undefined,
    @Query("activeOnly") activeOnly: boolean | undefined,
    @Query("page") page: number | undefined,
    @Query("pageSize") pageSize: number | undefined,
    @TenantId() organizationId: string,
  ): Promise<{
    items: ConflictExclusionDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.conflictDetectionService.findExclusions(organizationId, {
      personId,
      conflictType,
      activeOnly:
        activeOnly === true || activeOnly === ("true" as unknown as boolean),
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  /**
   * Create a conflict exclusion directly (not from dismissal).
   * Used for pre-approved exceptions or proactive exclusions.
   */
  @Post("exclusions")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Create a conflict exclusion" })
  @ApiResponse({ status: 201, description: "Exclusion created successfully" })
  @ApiResponse({
    status: 400,
    description: "Invalid exclusion request or duplicate",
  })
  async createExclusion(
    @Body() dto: CreateExclusionDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<ConflictExclusionDto> {
    const exclusion = await this.conflictDetectionService.createExclusion(
      dto,
      user.id,
      organizationId,
    );
    return this.conflictDetectionService.mapExclusionToDto(exclusion);
  }

  /**
   * Deactivate a conflict exclusion.
   * Soft delete - sets isActive to false rather than removing.
   */
  @Delete("exclusions/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Deactivate a conflict exclusion" })
  @ApiParam({ name: "id", type: "string", description: "Exclusion UUID" })
  @ApiResponse({ status: 204, description: "Exclusion deactivated" })
  @ApiResponse({ status: 404, description: "Exclusion not found" })
  async deactivateExclusion(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<void> {
    await this.conflictDetectionService.deactivateExclusion(
      id,
      user.id,
      organizationId,
    );
  }
}
