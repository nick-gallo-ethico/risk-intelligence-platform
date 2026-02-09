/**
 * GoLiveController - Go-Live Readiness API
 *
 * Endpoints for managing go-live readiness:
 * - GET /status - Get current go-live status
 * - POST /initialize - Initialize tracking for project
 * - GET /gates - Get detailed gate status
 * - PATCH /gates/:gateId - Update gate status
 * - GET /items - Get detailed readiness items
 * - PATCH /items/:itemId - Update readiness item
 * - POST /signoff/client - Record client sign-off
 * - POST /signoff/internal - Record internal approval
 * - GET /signoff - Get sign-off details
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
} from "@nestjs/common";
import { GoLiveService } from "./go-live.service";
import {
  UpdateGateDto,
  UpdateReadinessItemDto,
  ClientSignoffDto,
  InternalApprovalDto,
} from "./dto/go-live.dto";

@Controller("internal/implementations/:projectId/go-live")
export class GoLiveController {
  constructor(private readonly goLiveService: GoLiveService) {}

  /**
   * Get current go-live status for a project
   */
  @Get("status")
  async getStatus(@Param("projectId", ParseUUIDPipe) projectId: string) {
    return this.goLiveService.getGoLiveStatus(projectId);
  }

  /**
   * Initialize go-live tracking for a project
   */
  @Post("initialize")
  async initialize(@Param("projectId", ParseUUIDPipe) projectId: string) {
    await this.goLiveService.initializeGoLive(projectId);
    return { success: true, message: "Go-live tracking initialized" };
  }

  /**
   * Get detailed gate status with definitions
   */
  @Get("gates")
  async getGates(@Param("projectId", ParseUUIDPipe) projectId: string) {
    return this.goLiveService.getGateDetails(projectId);
  }

  /**
   * Update a hard gate status
   */
  @Patch("gates/:gateId")
  async updateGate(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("gateId") gateId: string,
    @Body() dto: UpdateGateDto,
  ) {
    // TODO: Get user ID from auth context when auth is implemented
    const checkedById = "internal-user-placeholder";
    await this.goLiveService.updateGate(projectId, gateId, dto, checkedById);
    return { success: true, message: `Gate ${gateId} updated` };
  }

  /**
   * Get detailed readiness items with definitions
   */
  @Get("items")
  async getItems(@Param("projectId", ParseUUIDPipe) projectId: string) {
    return this.goLiveService.getReadinessItemDetails(projectId);
  }

  /**
   * Update a readiness item
   */
  @Patch("items/:itemId")
  async updateReadinessItem(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateReadinessItemDto,
  ) {
    // TODO: Get user ID from auth context when auth is implemented
    const completedById = "internal-user-placeholder";
    await this.goLiveService.updateReadinessItem(
      projectId,
      itemId,
      dto,
      completedById,
    );
    return { success: true, message: `Readiness item ${itemId} updated` };
  }

  /**
   * Record client sign-off for below-threshold launch
   */
  @Post("signoff/client")
  async recordClientSignoff(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() dto: ClientSignoffDto,
  ) {
    await this.goLiveService.recordClientSignoff(projectId, dto);
    return { success: true, message: "Client sign-off recorded" };
  }

  /**
   * Record internal approval after client sign-off
   */
  @Post("signoff/internal")
  async recordInternalApproval(
    @Param("projectId", ParseUUIDPipe) projectId: string,
    @Body() dto: InternalApprovalDto,
  ) {
    // TODO: Get user ID from auth context when auth is implemented
    const approverId = "internal-user-placeholder";
    await this.goLiveService.recordInternalApproval(projectId, dto, approverId);
    return { success: true, message: "Internal approval recorded" };
  }

  /**
   * Get sign-off details for a project
   */
  @Get("signoff")
  async getSignoff(@Param("projectId", ParseUUIDPipe) projectId: string) {
    const signoff = await this.goLiveService.getSignoffDetails(projectId);
    if (!signoff) {
      return { exists: false, signoff: null };
    }
    return { exists: true, signoff };
  }
}
