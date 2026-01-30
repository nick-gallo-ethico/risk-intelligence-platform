import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { Case, AuditEntityType } from "@prisma/client";
import { CasesService } from "./cases.service";
import {
  CreateCaseDto,
  UpdateCaseDto,
  CaseQueryDto,
  ChangeCaseStatusDto,
} from "./dto";
import { JwtAuthGuard, TenantGuard, RolesGuard } from "../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../common/decorators";
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";
import { ActivityService } from "../../common/services/activity.service";
import { ActivityListResponseDto } from "../../common/dto";

/**
 * REST API controller for case management.
 * All endpoints require authentication and are scoped to user's organization.
 */
@ApiTags("Cases")
@ApiBearerAuth("JWT")
@Controller("cases")
@UseGuards(JwtAuthGuard, TenantGuard)
export class CasesController {
  constructor(
    private readonly casesService: CasesService,
    private readonly activityService: ActivityService,
  ) {}

  /**
   * POST /api/v1/cases
   * Creates a new case.
   */
  @Post()
  @Roles(
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.SYSTEM_ADMIN,
  )
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a new case",
    description: "Creates a new compliance case with intake information",
  })
  @ApiResponse({ status: 201, description: "Case created successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  async create(
    @Body() dto: CreateCaseDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Case> {
    return this.casesService.create(dto, user.id, organizationId);
  }

  /**
   * GET /api/v1/cases
   * Returns paginated list of cases with optional filtering.
   */
  @Get()
  @ApiOperation({
    summary: "List cases",
    description: "Returns paginated list of cases with optional filtering",
  })
  @ApiResponse({
    status: 200,
    description: "List of cases with pagination",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(
    @Query() query: CaseQueryDto,
    @TenantId() organizationId: string,
  ): Promise<{ data: Case[]; total: number; limit: number; offset: number }> {
    return this.casesService.findAll(query, organizationId);
  }

  /**
   * GET /api/v1/cases/:id
   * Returns a single case by ID.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get case by ID",
    description: "Returns a single case by its UUID",
  })
  @ApiParam({ name: "id", description: "Case UUID" })
  @ApiResponse({ status: 200, description: "Case found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Case not found" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<Case> {
    return this.casesService.findOne(id, organizationId);
  }

  /**
   * GET /api/v1/cases/reference/:referenceNumber
   * Returns a case by reference number (e.g., ETH-2026-00001).
   */
  @Get("reference/:referenceNumber")
  @ApiOperation({
    summary: "Get case by reference number",
    description:
      "Returns a case by its human-readable reference number (e.g., ETH-2026-00001)",
  })
  @ApiParam({
    name: "referenceNumber",
    description: "Case reference number",
    example: "ETH-2026-00001",
  })
  @ApiResponse({ status: 200, description: "Case found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Case not found" })
  async findByReference(
    @Param("referenceNumber") referenceNumber: string,
    @TenantId() organizationId: string,
  ): Promise<Case> {
    return this.casesService.findByReferenceNumber(
      referenceNumber,
      organizationId,
    );
  }

  /**
   * PUT /api/v1/cases/:id
   * Updates a case (full update).
   */
  @Put(":id")
  @Roles(
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.SYSTEM_ADMIN,
  )
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Update case",
    description: "Updates a case with full replacement of provided fields",
  })
  @ApiParam({ name: "id", description: "Case UUID" })
  @ApiResponse({ status: 200, description: "Case updated successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Case not found" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCaseDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Case> {
    return this.casesService.update(id, dto, user.id, organizationId);
  }

  /**
   * PATCH /api/v1/cases/:id
   * Partially updates a case.
   */
  @Patch(":id")
  @Roles(
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.SYSTEM_ADMIN,
  )
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Partial update case",
    description: "Partially updates a case - only provided fields are modified",
  })
  @ApiParam({ name: "id", description: "Case UUID" })
  @ApiResponse({ status: 200, description: "Case updated successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Case not found" })
  async partialUpdate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCaseDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Case> {
    return this.casesService.update(id, dto, user.id, organizationId);
  }

  /**
   * PATCH /api/v1/cases/:id/status
   * Updates case status with rationale.
   */
  @Patch(":id/status")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Change case status",
    description:
      "Updates case status with a required rationale for audit trail",
  })
  @ApiParam({ name: "id", description: "Case UUID" })
  @ApiResponse({ status: 200, description: "Status updated successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Case not found" })
  async updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ChangeCaseStatusDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Case> {
    return this.casesService.updateStatus(
      id,
      dto.status,
      dto.rationale,
      user.id,
      organizationId,
    );
  }

  /**
   * POST /api/v1/cases/:id/close
   * Closes a case with rationale.
   */
  @Post(":id/close")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Close case",
    description: "Closes a case with a required rationale",
  })
  @ApiParam({ name: "id", description: "Case UUID" })
  @ApiResponse({ status: 200, description: "Case closed successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Case not found" })
  async close(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { rationale: string },
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Case> {
    return this.casesService.close(id, body.rationale, user.id, organizationId);
  }

  /**
   * GET /api/v1/cases/:id/activity
   * Returns activity timeline for a specific case.
   */
  @Get(":id/activity")
  @ApiOperation({
    summary: "Get case activity timeline",
    description: "Returns paginated activity/audit log for a specific case",
  })
  @ApiParam({ name: "id", description: "Case UUID" })
  @ApiQuery({
    name: "page",
    required: false,
    description: "Page number",
    example: 1,
  })
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Items per page",
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: "Activity timeline",
    type: ActivityListResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Case not found" })
  async getActivity(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @TenantId() organizationId: string,
  ): Promise<ActivityListResponseDto> {
    // First verify the case exists and user has access
    await this.casesService.findOne(id, organizationId);

    return this.activityService.getEntityTimeline(
      AuditEntityType.CASE,
      id,
      organizationId,
      { page, limit },
    );
  }
}
