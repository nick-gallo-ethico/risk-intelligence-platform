/**
 * IntakeController - Operator Hotline Intake Endpoints
 *
 * API endpoints for hotline operators to create and manage RIUs from calls.
 *
 * Endpoints:
 * - POST /api/v1/operator/intake - Create RIU from hotline call
 * - PUT /api/v1/operator/intake/:riuId - Update in-progress intake
 * - POST /api/v1/operator/intake/:riuId/submit-qa - Submit to QA queue
 * - GET /api/v1/operator/my-queue - Get operator's in-progress RIUs
 * - GET /api/v1/operator/follow-up/:accessCode - Look up existing case by access code
 * - POST /api/v1/operator/follow-up/:riuId/note - Add follow-up call note
 */

import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { JwtAuthGuard, RolesGuard } from "../../../common/guards";
import { Roles, UserRole } from "../../../common/decorators/roles.decorator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { User } from "@prisma/client";
import { IntakeService } from "./intake.service";
import {
  CreateIntakeDto,
  UpdateIntakeDto,
  FollowUpNoteDto,
} from "./dto/intake.dto";
import { IntakeResult, IntakeSummary, FollowUpContext } from "./types/intake.types";

@ApiTags("Operator Console - Intake")
@ApiBearerAuth()
@Controller("api/v1/operator")
@UseGuards(JwtAuthGuard, RolesGuard)
export class IntakeController {
  constructor(private readonly intakeService: IntakeService) {}

  /**
   * Create an RIU from a hotline call.
   */
  @Post("intake")
  @Roles(UserRole.OPERATOR, UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: "Create RIU from hotline call" })
  @ApiResponse({
    status: 201,
    description: "RIU created successfully",
    type: Object, // IntakeResult
  })
  @ApiResponse({ status: 400, description: "Invalid intake data" })
  @ApiResponse({ status: 403, description: "Requires OPERATOR role" })
  async createIntake(
    @Body() dto: CreateIntakeDto,
    @CurrentUser() user: User,
  ): Promise<IntakeResult> {
    return this.intakeService.createHotlineRiu(user.id, dto);
  }

  /**
   * Update an in-progress intake.
   * Only allowed before QA submission and by the creating operator.
   */
  @Put("intake/:riuId")
  @Roles(UserRole.OPERATOR, UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Update in-progress intake" })
  @ApiParam({ name: "riuId", description: "RIU ID" })
  @ApiResponse({ status: 204, description: "Intake updated" })
  @ApiResponse({ status: 400, description: "Invalid update data or wrong status" })
  @ApiResponse({ status: 403, description: "Not the creating operator" })
  @ApiResponse({ status: 404, description: "RIU not found" })
  async updateIntake(
    @Param("riuId") riuId: string,
    @Body() dto: UpdateIntakeDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.intakeService.updateIntake(user.id, riuId, dto);
  }

  /**
   * Submit an intake to the QA queue.
   */
  @Post("intake/:riuId/submit-qa")
  @Roles(UserRole.OPERATOR, UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Submit intake to QA queue" })
  @ApiParam({ name: "riuId", description: "RIU ID" })
  @ApiResponse({ status: 204, description: "Submitted to QA" })
  @ApiResponse({ status: 400, description: "Invalid status for QA submission" })
  @ApiResponse({ status: 403, description: "Not the creating operator" })
  @ApiResponse({ status: 404, description: "RIU not found" })
  async submitToQa(
    @Param("riuId") riuId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.intakeService.submitToQa(user.id, riuId);
  }

  /**
   * Get the operator's queue of in-progress intakes.
   */
  @Get("my-queue")
  @Roles(UserRole.OPERATOR, UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: "Get operator's in-progress intakes" })
  @ApiResponse({
    status: 200,
    description: "Operator's queue",
    type: [Object], // IntakeSummary[]
  })
  async getMyQueue(@CurrentUser() user: User): Promise<IntakeSummary[]> {
    return this.intakeService.getOperatorQueue(user.id);
  }

  /**
   * Look up existing RIU by access code for follow-up calls.
   * OPER-08: Support operators handling follow-up calls from reporters.
   */
  @Get("follow-up/:accessCode")
  @Roles(UserRole.OPERATOR, UserRole.SYSTEM_ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @ApiOperation({ summary: "Look up case by access code for follow-up" })
  @ApiParam({ name: "accessCode", description: "Reporter's access code" })
  @ApiResponse({
    status: 200,
    description: "Follow-up context",
    type: Object, // FollowUpContext
  })
  @ApiResponse({ status: 400, description: "Invalid access code format" })
  @ApiResponse({ status: 404, description: "No report found with access code" })
  async lookupByAccessCode(
    @Param("accessCode") accessCode: string,
    @CurrentUser() user: User,
  ): Promise<FollowUpContext> {
    return this.intakeService.lookupByAccessCode(user.id, accessCode);
  }

  /**
   * Add a follow-up note during a callback.
   * OPER-08: Add operator note during follow-up call.
   */
  @Post("follow-up/:riuId/note")
  @Roles(UserRole.OPERATOR, UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Add follow-up call note" })
  @ApiParam({ name: "riuId", description: "RIU ID" })
  @ApiResponse({ status: 204, description: "Note added" })
  @ApiResponse({ status: 400, description: "RIU not linked to a case" })
  @ApiResponse({ status: 404, description: "RIU not found" })
  async addFollowUpNote(
    @Param("riuId") riuId: string,
    @Body() dto: FollowUpNoteDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.intakeService.addFollowUpNote(user.id, riuId, dto);
  }
}
