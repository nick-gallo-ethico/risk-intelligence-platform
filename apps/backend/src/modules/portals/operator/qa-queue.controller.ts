/**
 * QaQueueController - QA Review Queue Endpoints
 *
 * API endpoints for QA reviewers to process hotline RIUs.
 *
 * Endpoints:
 * - GET /api/v1/operator/qa-queue - Get QA queue with filters
 * - POST /api/v1/operator/qa-queue/:riuId/claim - Claim item for review
 * - GET /api/v1/operator/qa-queue/:riuId - Get QA item detail
 * - POST /api/v1/operator/qa-queue/:riuId/release - Release (approve) item
 * - POST /api/v1/operator/qa-queue/:riuId/reject - Reject item to operator
 * - POST /api/v1/operator/qa-queue/:riuId/abandon - Abandon claim
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
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
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard, RolesGuard } from "../../../common/guards";
import { Roles, UserRole } from "../../../common/decorators/roles.decorator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { User, Severity } from "@prisma/client";
import { QaQueueService } from "./qa-queue.service";
import {
  QaQueueFilters,
  QaItemDetail,
  QaEditsDto,
  PaginatedQaQueueResult,
} from "./types/qa-queue.types";

/**
 * DTO for QA queue query parameters.
 */
class QaQueueQueryDto {
  clientId?: string;
  severityMin?: Severity;
  operatorId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

/**
 * DTO for QA edits when releasing.
 */
class QaEditsBodyDto {
  summary?: string;
  categoryId?: string;
  severityScore?: Severity;
  editNotes?: string;
}

/**
 * DTO for QA rejection.
 */
class QaRejectBodyDto {
  reason: string;
}

@ApiTags("Operator Console - QA Queue")
@ApiBearerAuth()
@Controller("api/v1/operator/qa-queue")
@UseGuards(JwtAuthGuard, RolesGuard)
export class QaQueueController {
  constructor(private readonly qaQueueService: QaQueueService) {}

  /**
   * Get QA queue with filters.
   * Returns RIUs pending QA review, sorted by severity (high first).
   */
  @Get()
  @Roles(UserRole.TRIAGE_LEAD, UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: "Get QA queue with filters" })
  @ApiQuery({ name: "clientId", required: false, description: "Filter by client organization" })
  @ApiQuery({ name: "severityMin", required: false, enum: Severity, description: "Minimum severity" })
  @ApiQuery({ name: "operatorId", required: false, description: "Filter by creating operator" })
  @ApiQuery({ name: "dateFrom", required: false, description: "Filter from date (ISO)" })
  @ApiQuery({ name: "dateTo", required: false, description: "Filter to date (ISO)" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "Page number (default: 1)" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "Items per page (default: 20)" })
  @ApiResponse({
    status: 200,
    description: "Paginated QA queue",
    type: Object, // PaginatedQaQueueResult
  })
  async getQaQueue(@Query() query: QaQueueQueryDto): Promise<PaginatedQaQueueResult> {
    const filters: QaQueueFilters = {
      clientId: query.clientId,
      severityMin: query.severityMin,
      operatorId: query.operatorId,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      page: query.page ? Number(query.page) : 1,
      limit: query.limit ? Number(query.limit) : 20,
    };
    return this.qaQueueService.getQaQueue(filters);
  }

  /**
   * Claim an item for QA review.
   */
  @Post(":riuId/claim")
  @Roles(UserRole.TRIAGE_LEAD, UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Claim item for QA review" })
  @ApiParam({ name: "riuId", description: "RIU ID to claim" })
  @ApiResponse({ status: 204, description: "Item claimed" })
  @ApiResponse({ status: 404, description: "QA item not found" })
  @ApiResponse({ status: 409, description: "Item already claimed or not in PENDING status" })
  async claimForReview(
    @Param("riuId") riuId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.qaQueueService.claimForReview(user.id, riuId);
  }

  /**
   * Get full detail for a QA item.
   */
  @Get(":riuId")
  @Roles(UserRole.TRIAGE_LEAD, UserRole.SYSTEM_ADMIN)
  @ApiOperation({ summary: "Get QA item detail" })
  @ApiParam({ name: "riuId", description: "RIU ID" })
  @ApiResponse({
    status: 200,
    description: "QA item detail",
    type: Object, // QaItemDetail
  })
  @ApiResponse({ status: 404, description: "QA item not found" })
  async getItemDetail(@Param("riuId") riuId: string): Promise<QaItemDetail> {
    return this.qaQueueService.getItemDetail(riuId);
  }

  /**
   * Release (approve) an item from QA.
   * Optionally apply edits before release.
   */
  @Post(":riuId/release")
  @Roles(UserRole.TRIAGE_LEAD, UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Release (approve) item from QA" })
  @ApiParam({ name: "riuId", description: "RIU ID to release" })
  @ApiResponse({ status: 204, description: "Item released" })
  @ApiResponse({ status: 400, description: "Item not in IN_REVIEW status or wrong reviewer" })
  @ApiResponse({ status: 404, description: "QA item not found" })
  async releaseFromQa(
    @Param("riuId") riuId: string,
    @Body() body: QaEditsBodyDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    const edits: QaEditsDto | undefined = Object.keys(body).length > 0
      ? {
          summary: body.summary,
          categoryId: body.categoryId,
          severityScore: body.severityScore,
          editNotes: body.editNotes,
        }
      : undefined;
    await this.qaQueueService.releaseFromQa(user.id, riuId, edits);
  }

  /**
   * Reject an item back to the operator.
   */
  @Post(":riuId/reject")
  @Roles(UserRole.TRIAGE_LEAD, UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Reject item back to operator" })
  @ApiParam({ name: "riuId", description: "RIU ID to reject" })
  @ApiResponse({ status: 204, description: "Item rejected" })
  @ApiResponse({ status: 400, description: "Rejection reason required, wrong status, or wrong reviewer" })
  @ApiResponse({ status: 404, description: "QA item not found" })
  async rejectToOperator(
    @Param("riuId") riuId: string,
    @Body() body: QaRejectBodyDto,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.qaQueueService.rejectToOperator(user.id, riuId, body.reason);
  }

  /**
   * Abandon claim on an item (return to queue).
   */
  @Post(":riuId/abandon")
  @Roles(UserRole.TRIAGE_LEAD, UserRole.SYSTEM_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Abandon claim on item" })
  @ApiParam({ name: "riuId", description: "RIU ID to abandon" })
  @ApiResponse({ status: 204, description: "Claim abandoned" })
  @ApiResponse({ status: 400, description: "Item not in IN_REVIEW status or wrong reviewer" })
  @ApiResponse({ status: 404, description: "QA item not found" })
  async abandonClaim(
    @Param("riuId") riuId: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    await this.qaQueueService.abandonClaim(user.id, riuId);
  }
}
