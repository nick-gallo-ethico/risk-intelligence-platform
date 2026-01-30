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
import { Case, CaseStatus, AuditEntityType } from "@prisma/client";
import { CasesService } from "./cases.service";
import { CreateCaseDto, UpdateCaseDto, CaseQueryDto } from "./dto";
import { JwtAuthGuard } from "../../common/guards";
import { CurrentUser } from "../../common/decorators";
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";
import { ActivityService } from "../../common/services/activity.service";
import { ActivityListResponseDto } from "../../common/dto";

/**
 * REST API controller for case management.
 * All endpoints require authentication and are scoped to user's organization.
 */
@Controller("cases")
@UseGuards(JwtAuthGuard)
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
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateCaseDto,
    @CurrentUser() user: RequestUser,
  ): Promise<Case> {
    return this.casesService.create(dto, user.id, user.organizationId);
  }

  /**
   * GET /api/v1/cases
   * Returns paginated list of cases with optional filtering.
   */
  @Get()
  async findAll(
    @Query() query: CaseQueryDto,
    @CurrentUser() user: RequestUser,
  ): Promise<{ data: Case[]; total: number; limit: number; offset: number }> {
    return this.casesService.findAll(query, user.organizationId);
  }

  /**
   * GET /api/v1/cases/:id
   * Returns a single case by ID.
   */
  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<Case> {
    return this.casesService.findOne(id, user.organizationId);
  }

  /**
   * GET /api/v1/cases/reference/:referenceNumber
   * Returns a case by reference number (e.g., ETH-2026-00001).
   */
  @Get("reference/:referenceNumber")
  async findByReference(
    @Param("referenceNumber") referenceNumber: string,
    @CurrentUser() user: RequestUser,
  ): Promise<Case> {
    return this.casesService.findByReferenceNumber(
      referenceNumber,
      user.organizationId,
    );
  }

  /**
   * PUT /api/v1/cases/:id
   * Updates a case (full update).
   */
  @Put(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCaseDto,
    @CurrentUser() user: RequestUser,
  ): Promise<Case> {
    return this.casesService.update(id, dto, user.id, user.organizationId);
  }

  /**
   * PATCH /api/v1/cases/:id
   * Partially updates a case.
   */
  @Patch(":id")
  async partialUpdate(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCaseDto,
    @CurrentUser() user: RequestUser,
  ): Promise<Case> {
    return this.casesService.update(id, dto, user.id, user.organizationId);
  }

  /**
   * PATCH /api/v1/cases/:id/status
   * Updates case status with rationale.
   */
  @Patch(":id/status")
  async updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { status: CaseStatus; rationale?: string },
    @CurrentUser() user: RequestUser,
  ): Promise<Case> {
    return this.casesService.updateStatus(
      id,
      body.status,
      body.rationale,
      user.id,
      user.organizationId,
    );
  }

  /**
   * POST /api/v1/cases/:id/close
   * Closes a case with rationale.
   */
  @Post(":id/close")
  @HttpCode(HttpStatus.OK)
  async close(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() body: { rationale: string },
    @CurrentUser() user: RequestUser,
  ): Promise<Case> {
    return this.casesService.close(
      id,
      body.rationale,
      user.id,
      user.organizationId,
    );
  }

  /**
   * GET /api/v1/cases/:id/activity
   * Returns activity timeline for a specific case.
   */
  @Get(":id/activity")
  async getActivity(
    @Param("id", ParseUUIDPipe) id: string,
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @CurrentUser() user: RequestUser,
  ): Promise<ActivityListResponseDto> {
    // First verify the case exists and user has access
    await this.casesService.findOne(id, user.organizationId);

    return this.activityService.getEntityTimeline(
      AuditEntityType.CASE,
      id,
      user.organizationId,
      { page, limit },
    );
  }
}
