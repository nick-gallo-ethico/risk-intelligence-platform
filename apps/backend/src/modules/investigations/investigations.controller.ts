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
import { JwtAuthGuard } from "../../common/guards";
import { CurrentUser } from "../../common/decorators";
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";

/**
 * Controller for nested investigation routes under cases.
 * Handles: POST /api/v1/cases/:caseId/investigations
 *          GET /api/v1/cases/:caseId/investigations
 */
@Controller("cases/:caseId/investigations")
@UseGuards(JwtAuthGuard)
export class CaseInvestigationsController {
  constructor(private readonly investigationsService: InvestigationsService) {}

  /**
   * POST /api/v1/cases/:caseId/investigations
   * Creates a new investigation for a case.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param("caseId", ParseUUIDPipe) caseId: string,
    @Body() dto: CreateInvestigationDto,
    @CurrentUser() user: RequestUser,
  ): Promise<Investigation> {
    return this.investigationsService.create(
      dto,
      caseId,
      user.id,
      user.organizationId,
    );
  }

  /**
   * GET /api/v1/cases/:caseId/investigations
   * Returns paginated list of investigations for a case.
   */
  @Get()
  async findAllForCase(
    @Param("caseId", ParseUUIDPipe) caseId: string,
    @Query() query: InvestigationQueryDto,
    @CurrentUser() user: RequestUser,
  ): Promise<{
    data: Investigation[];
    total: number;
    limit: number;
    page: number;
  }> {
    return this.investigationsService.findAllForCase(
      caseId,
      query,
      user.organizationId,
    );
  }
}

/**
 * Controller for standalone investigation routes.
 * Handles direct access to investigations by ID.
 */
@Controller("investigations")
@UseGuards(JwtAuthGuard)
export class InvestigationsController {
  constructor(private readonly investigationsService: InvestigationsService) {}

  /**
   * GET /api/v1/investigations/:id
   * Returns a single investigation with case and assignee details.
   */
  @Get(":id")
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<Investigation> {
    return this.investigationsService.findOne(id, user.organizationId);
  }

  /**
   * PATCH /api/v1/investigations/:id
   * Updates an investigation's fields.
   */
  @Patch(":id")
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateInvestigationDto,
    @CurrentUser() user: RequestUser,
  ): Promise<Investigation> {
    return this.investigationsService.update(
      id,
      dto,
      user.id,
      user.organizationId,
    );
  }

  /**
   * POST /api/v1/investigations/:id/assign
   * Assigns investigators to an investigation.
   */
  @Post(":id/assign")
  @HttpCode(HttpStatus.OK)
  async assign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AssignInvestigationDto,
    @CurrentUser() user: RequestUser,
  ): Promise<Investigation> {
    return this.investigationsService.assign(
      id,
      dto,
      user.id,
      user.organizationId,
    );
  }

  /**
   * POST /api/v1/investigations/:id/transition
   * Changes the investigation status.
   */
  @Post(":id/transition")
  @HttpCode(HttpStatus.OK)
  async transition(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: TransitionInvestigationDto,
    @CurrentUser() user: RequestUser,
  ): Promise<Investigation> {
    return this.investigationsService.transition(
      id,
      dto,
      user.id,
      user.organizationId,
    );
  }

  /**
   * POST /api/v1/investigations/:id/findings
   * Records findings for an investigation.
   */
  @Post(":id/findings")
  @HttpCode(HttpStatus.OK)
  async recordFindings(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: InvestigationFindingsDto,
    @CurrentUser() user: RequestUser,
  ): Promise<Investigation> {
    return this.investigationsService.recordFindings(
      id,
      dto,
      user.id,
      user.organizationId,
    );
  }

  /**
   * POST /api/v1/investigations/:id/close
   * Closes an investigation with findings and outcome.
   */
  @Post(":id/close")
  @HttpCode(HttpStatus.OK)
  async close(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CloseInvestigationDto,
    @CurrentUser() user: RequestUser,
  ): Promise<Investigation> {
    return this.investigationsService.close(
      id,
      dto,
      user.id,
      user.organizationId,
    );
  }
}
