/**
 * HotlineOpsController - Hotline Operations Endpoints
 *
 * Exposes internal API for hotline operations:
 * - Directive management (CRUD with versioning)
 * - Bulk QA actions (approve, reject, reassign)
 * - Operator status updates
 *
 * SECURITY NOTE:
 * These endpoints are for internal Ethico staff only.
 * Authentication via InternalUser (Azure AD SSO) is required.
 * All operations are cross-tenant with full audit logging.
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from "@nestjs/common";
import { DirectiveAdminService } from "./directive-admin.service";
import { BulkQaService } from "./bulk-qa.service";
import { OperatorStatusService } from "./operator-status.service";
import {
  CreateDirectiveDto,
  UpdateDirectiveDto,
  BulkQaActionDto,
  UpdateOperatorStatusDto,
} from "./dto/hotline-ops.dto";
import { OperatorStatus } from "./types/operator-status.types";

@Controller("api/v1/internal/hotline-ops")
export class HotlineOpsController {
  constructor(
    private readonly directiveAdminService: DirectiveAdminService,
    private readonly bulkQaService: BulkQaService,
    private readonly operatorStatusService: OperatorStatusService,
  ) {}

  // ===========================================
  // Directive Management Endpoints
  // ===========================================

  /**
   * List all directives across tenants.
   * Supports filtering by organization, stage, and active status.
   */
  @Get("directives")
  async listDirectives(
    @Query("orgId") organizationId?: string,
    @Query("stage") stage?: string,
    @Query("includeInactive") includeInactive?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.directiveAdminService.listAllDirectives({
      organizationId,
      stage,
      includeInactive: includeInactive === "true",
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Get pending directive drafts awaiting Ethico approval.
   */
  @Get("directives/pending-drafts")
  async getPendingDrafts(@Query("limit") limit?: string) {
    return this.directiveAdminService.getPendingDrafts(
      limit ? parseInt(limit, 10) : undefined,
    );
  }

  /**
   * Get a single directive by ID.
   */
  @Get("directives/:id")
  async getDirective(@Param("id", ParseUUIDPipe) id: string) {
    return this.directiveAdminService.getDirective(id);
  }

  /**
   * Create a new directive.
   * TODO: Get user ID from internal auth context.
   */
  @Post("directives")
  async createDirective(@Body() dto: CreateDirectiveDto) {
    // TODO: Extract user ID from internal auth guard
    const userId = "internal-user-placeholder";
    return this.directiveAdminService.createDirective(dto, userId);
  }

  /**
   * Update an existing directive.
   * Use approveAndPublish: true to approve a client draft.
   * TODO: Get user ID from internal auth context.
   */
  @Patch("directives/:id")
  async updateDirective(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateDirectiveDto,
  ) {
    // TODO: Extract user ID from internal auth guard
    const userId = "internal-user-placeholder";
    return this.directiveAdminService.updateDirective(id, dto, userId);
  }

  /**
   * Soft delete a directive.
   * TODO: Get user ID from internal auth context.
   */
  @Delete("directives/:id")
  async deleteDirective(@Param("id", ParseUUIDPipe) id: string) {
    // TODO: Extract user ID from internal auth guard
    const userId = "internal-user-placeholder";
    await this.directiveAdminService.deleteDirective(id, userId);
    return { success: true };
  }

  // ===========================================
  // QA Queue Endpoints
  // ===========================================

  /**
   * Get global QA queue across all tenants.
   * Returns hotline RIUs pending QA, sorted by age (oldest first).
   */
  @Get("qa-queue")
  async getGlobalQaQueue(
    @Query("status") qaStatus?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.bulkQaService.getGlobalQaQueue({
      qaStatus,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * Get QA queue statistics (counts by status).
   */
  @Get("qa-queue/stats")
  async getQueueStats() {
    return this.bulkQaService.getQueueStats();
  }

  /**
   * Perform bulk QA action on multiple RIUs.
   * Supports: APPROVE, REJECT, REASSIGN, CHANGE_PRIORITY.
   * TODO: Get user ID from internal auth context.
   */
  @Post("qa-queue/bulk-action")
  async performBulkAction(@Body() dto: BulkQaActionDto) {
    // TODO: Extract user ID from internal auth guard
    const userId = "internal-user-placeholder";
    return this.bulkQaService.performBulkAction(dto, userId);
  }

  /**
   * Get QA reviewer throughput metrics for a date range.
   */
  @Get("qa-queue/reviewer-metrics")
  async getReviewerMetrics(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
  ) {
    return this.bulkQaService.getReviewerMetrics(
      new Date(startDate),
      new Date(endDate),
    );
  }

  /**
   * Assign a single RIU to a QA reviewer.
   */
  @Post("qa-queue/:riuId/assign")
  async assignToReviewer(
    @Param("riuId", ParseUUIDPipe) riuId: string,
    @Body("reviewerId") reviewerId: string,
  ) {
    await this.bulkQaService.assignToReviewer(riuId, reviewerId);
    return { success: true };
  }

  // ===========================================
  // Operator Status Endpoints
  // ===========================================

  /**
   * Get live operator status board.
   * Returns counts by status and full operator list.
   */
  @Get("operator-status")
  async getStatusBoard() {
    return this.operatorStatusService.getStatusBoard();
  }

  /**
   * Get operators available for a specific language.
   * Used for skill-based call routing.
   */
  @Get("operator-status/by-language/:language")
  async getOperatorsByLanguage(@Param("language") language: string) {
    return this.operatorStatusService.getOperatorsByLanguage(language);
  }

  /**
   * Get available operators.
   */
  @Get("operator-status/available")
  async getAvailableOperators() {
    return this.operatorStatusService.getAvailableOperators();
  }

  /**
   * Get a single operator's status.
   */
  @Get("operator-status/:operatorId")
  async getOperatorStatus(
    @Param("operatorId", ParseUUIDPipe) operatorId: string,
  ) {
    return this.operatorStatusService.getOperatorStatus(operatorId);
  }

  /**
   * Update operator status.
   * Used by operators to set their availability.
   */
  @Patch("operator-status/:operatorId")
  async updateOperatorStatus(
    @Param("operatorId", ParseUUIDPipe) operatorId: string,
    @Body() dto: UpdateOperatorStatusDto,
  ) {
    await this.operatorStatusService.updateStatus(
      operatorId,
      dto.status as OperatorStatus,
      dto.languages,
    );
    return { success: true };
  }

  /**
   * Remove operator from status board (e.g., on logout).
   */
  @Delete("operator-status/:operatorId")
  async removeOperator(@Param("operatorId", ParseUUIDPipe) operatorId: string) {
    await this.operatorStatusService.removeOperator(operatorId);
    return { success: true };
  }
}
