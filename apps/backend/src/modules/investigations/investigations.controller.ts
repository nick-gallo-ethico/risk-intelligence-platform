import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { Investigation } from "@prisma/client";
import { InvestigationsService } from "./investigations.service";
import {
  CreateInvestigationDto,
  UpdateInvestigationDto,
  InvestigationQueryDto,
  AssignInvestigationDto,
  TransitionInvestigationDto,
  InvestigationFindingsDto,
  CloseInvestigationDto,
} from "./dto";
import { JwtAuthGuard, TenantGuard, RolesGuard } from "../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../common/decorators";
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";

/**
 * Controller for nested investigation routes under cases.
 * Handles: POST /api/v1/cases/:caseId/investigations
 *          GET /api/v1/cases/:caseId/investigations
 */
@ApiTags("Investigations")
@ApiBearerAuth("JWT")
@Controller("cases/:caseId/investigations")
@UseGuards(JwtAuthGuard, TenantGuard)
export class CaseInvestigationsController {
  constructor(private readonly investigationsService: InvestigationsService) {}

  /**
   * POST /api/v1/cases/:caseId/investigations
   * Creates a new investigation for a case.
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
    summary: "Create investigation for case",
    description: "Creates a new investigation linked to a specific case",
  })
  @ApiParam({ name: "caseId", description: "Case UUID" })
  @ApiResponse({
    status: 201,
    description: "Investigation created successfully",
  })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Case not found" })
  async create(
    @Param("caseId", ParseUUIDPipe) caseId: string,
    @Body() dto: CreateInvestigationDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Investigation> {
    return this.investigationsService.create(
      dto,
      caseId,
      user.id,
      organizationId,
    );
  }

  /**
   * GET /api/v1/cases/:caseId/investigations
   * Returns paginated list of investigations for a case.
   */
  @Get()
  @ApiOperation({
    summary: "List investigations for case",
    description: "Returns paginated list of investigations for a specific case",
  })
  @ApiParam({ name: "caseId", description: "Case UUID" })
  @ApiResponse({ status: 200, description: "List of investigations" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Case not found" })
  async findAllForCase(
    @Param("caseId", ParseUUIDPipe) caseId: string,
    @Query() query: InvestigationQueryDto,
    @TenantId() organizationId: string,
  ): Promise<{
    data: Investigation[];
    total: number;
    limit: number;
    page: number;
  }> {
    return this.investigationsService.findAllForCase(
      caseId,
      query,
      organizationId,
    );
  }
}

/**
 * Controller for standalone investigation routes.
 * Handles direct access to investigations by ID.
 */
@ApiTags("Investigations")
@ApiBearerAuth("JWT")
@Controller("investigations")
@UseGuards(JwtAuthGuard, TenantGuard)
export class InvestigationsController {
  constructor(private readonly investigationsService: InvestigationsService) {}

  /**
   * GET /api/v1/investigations/:id
   * Returns a single investigation with case and assignee details.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get investigation by ID",
    description:
      "Returns a single investigation with case and assignee details",
  })
  @ApiParam({ name: "id", description: "Investigation UUID" })
  @ApiResponse({ status: 200, description: "Investigation found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Investigation not found" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<Investigation> {
    return this.investigationsService.findOne(id, organizationId);
  }

  /**
   * PATCH /api/v1/investigations/:id
   * Updates an investigation's fields.
   */
  @Patch(":id")
  @Roles(
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.SYSTEM_ADMIN,
  )
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Update investigation",
    description: "Updates investigation fields",
  })
  @ApiParam({ name: "id", description: "Investigation UUID" })
  @ApiResponse({ status: 200, description: "Investigation updated" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Investigation not found" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvestigationDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Investigation> {
    return this.investigationsService.update(id, dto, user.id, organizationId);
  }

  /**
   * POST /api/v1/investigations/:id/assign
   * Assigns investigators to an investigation.
   */
  @Post(":id/assign")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Assign investigators",
    description: "Assigns investigators to an investigation",
  })
  @ApiParam({ name: "id", description: "Investigation UUID" })
  @ApiResponse({ status: 200, description: "Investigators assigned" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Investigation not found" })
  async assign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignInvestigationDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Investigation> {
    return this.investigationsService.assign(id, dto, user.id, organizationId);
  }

  /**
   * POST /api/v1/investigations/:id/transition
   * Changes the investigation status.
   */
  @Post(":id/transition")
  @Roles(
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.SYSTEM_ADMIN,
  )
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Transition investigation status",
    description: "Changes the investigation status with a required rationale",
  })
  @ApiParam({ name: "id", description: "Investigation UUID" })
  @ApiResponse({ status: 200, description: "Status updated" })
  @ApiResponse({
    status: 400,
    description: "Validation error or invalid transition",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Investigation not found" })
  async transition(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: TransitionInvestigationDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Investigation> {
    return this.investigationsService.transition(
      id,
      dto,
      user.id,
      organizationId,
    );
  }

  /**
   * POST /api/v1/investigations/:id/findings
   * Records findings for an investigation.
   */
  @Post(":id/findings")
  @Roles(
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.SYSTEM_ADMIN,
  )
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Record investigation findings",
    description:
      "Records findings, outcome, and root cause for an investigation",
  })
  @ApiParam({ name: "id", description: "Investigation UUID" })
  @ApiResponse({ status: 200, description: "Findings recorded" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Investigation not found" })
  async recordFindings(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: InvestigationFindingsDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Investigation> {
    return this.investigationsService.recordFindings(
      id,
      dto,
      user.id,
      organizationId,
    );
  }

  /**
   * POST /api/v1/investigations/:id/close
   * Closes an investigation with findings and outcome.
   */
  @Post(":id/close")
  @Roles(
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.SYSTEM_ADMIN,
  )
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Close investigation",
    description:
      "Closes an investigation with required findings summary and outcome",
  })
  @ApiParam({ name: "id", description: "Investigation UUID" })
  @ApiResponse({ status: 200, description: "Investigation closed" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Investigation not found" })
  async close(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CloseInvestigationDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Investigation> {
    return this.investigationsService.close(id, dto, user.id, organizationId);
  }
}
