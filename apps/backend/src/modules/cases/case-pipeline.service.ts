// =============================================================================
// CASE PIPELINE SERVICE - Manages case workflow stages and outcomes
// =============================================================================
//
// This service handles:
// 1. Moving cases through configurable pipeline stages
// 2. Setting case outcomes
// 3. Updating case classification (corrections from RIU)
//
// KEY DESIGN DECISIONS:
// - Pipeline stages are tenant-configurable (stored in pipelineStage field)
// - Classification on Case can differ from RIU (this is where corrections go)
// - All stage/outcome changes include audit tracking with timestamps and user
// =============================================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Case, CaseOutcome, Severity, AuditEntityType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";

/**
 * Input for moving a case to a new pipeline stage.
 */
export interface MoveToStageInput {
  caseId: string;
  stage: string;
  notes?: string;
  userId: string;
  organizationId: string;
}

/**
 * Input for setting case outcome.
 */
export interface SetOutcomeInput {
  caseId: string;
  outcome: CaseOutcome;
  notes: string;
  userId: string;
  organizationId: string;
}

/**
 * Input for updating case classification.
 * Classification may differ from RIU - this is where corrections go.
 */
export interface UpdateClassificationInput {
  caseId: string;
  primaryCategoryId?: string | null;
  secondaryCategoryId?: string | null;
  severity?: Severity;
  notes: string;
  userId: string;
  organizationId: string;
}

/**
 * Service for managing case pipeline stages and outcomes.
 *
 * Cases flow through configurable pipeline stages (per tenant).
 * Classification on Case can differ from RIU - corrections go here.
 *
 * @example
 * ```typescript
 * // Move case to new stage
 * await casePipelineService.moveToStage({
 *   caseId: 'uuid',
 *   stage: 'Investigation',
 *   notes: 'Assigned to investigator',
 *   userId,
 *   organizationId,
 * });
 *
 * // Set case outcome
 * await casePipelineService.setOutcome({
 *   caseId: 'uuid',
 *   outcome: CaseOutcome.SUBSTANTIATED,
 *   notes: 'Evidence confirmed policy violation',
 *   userId,
 *   organizationId,
 * });
 * ```
 */
@Injectable()
export class CasePipelineService {
  private readonly logger = new Logger(CasePipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // -------------------------------------------------------------------------
  // MOVE TO STAGE - Move case to a new pipeline stage
  // -------------------------------------------------------------------------

  /**
   * Moves a case to a new pipeline stage.
   * Records timestamp, user, and optional notes for audit trail.
   *
   * @throws NotFoundException if case not found
   * @throws BadRequestException if already in target stage
   */
  async moveToStage(input: MoveToStageInput): Promise<Case> {
    const { caseId, stage, notes, userId, organizationId } = input;

    // Verify case exists and belongs to this org
    const existing = await this.prisma.case.findFirst({
      where: { id: caseId, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    // Check if already in target stage
    if (existing.pipelineStage === stage) {
      throw new BadRequestException(`Case is already in stage: ${stage}`);
    }

    const previousStage = existing.pipelineStage;
    const now = new Date();

    // Update case with new stage
    const updated = await this.prisma.case.update({
      where: { id: caseId },
      data: {
        pipelineStage: stage,
        pipelineStageAt: now,
        pipelineStageById: userId,
        updatedById: userId,
      },
    });

    // Log activity with natural language description
    await this.activityService.log({
      entityType: AuditEntityType.CASE,
      entityId: caseId,
      action: "pipeline_stage_changed",
      actionDescription: previousStage
        ? `Moved case ${existing.referenceNumber} from stage "${previousStage}" to "${stage}"`
        : `Set case ${existing.referenceNumber} to stage "${stage}"`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: { pipelineStage: previousStage },
        newValue: { pipelineStage: stage, notes },
      },
    });

    // Emit event for subscribers (workflow engine, notifications)
    this.emitEvent("case.pipeline_stage_changed", {
      organizationId,
      actorUserId: userId,
      caseId,
      referenceNumber: existing.referenceNumber,
      previousStage,
      newStage: stage,
      notes,
      timestamp: now,
    });

    this.logger.log(
      `Case ${existing.referenceNumber} moved to stage: ${stage}`,
    );

    return updated;
  }

  // -------------------------------------------------------------------------
  // SET OUTCOME - Set the final outcome of a case
  // -------------------------------------------------------------------------

  /**
   * Sets the outcome of a case.
   * Requires notes explaining the determination.
   *
   * @throws NotFoundException if case not found
   */
  async setOutcome(input: SetOutcomeInput): Promise<Case> {
    const { caseId, outcome, notes, userId, organizationId } = input;

    // Verify case exists and belongs to this org
    const existing = await this.prisma.case.findFirst({
      where: { id: caseId, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    const previousOutcome = existing.outcome;
    const now = new Date();

    // Update case with outcome
    const updated = await this.prisma.case.update({
      where: { id: caseId },
      data: {
        outcome,
        outcomeNotes: notes,
        outcomeAt: now,
        outcomeById: userId,
        updatedById: userId,
      },
    });

    // Log activity
    const actionDescription = previousOutcome
      ? `Changed case ${existing.referenceNumber} outcome from ${previousOutcome} to ${outcome}`
      : `Set case ${existing.referenceNumber} outcome to ${outcome}`;

    await this.activityService.log({
      entityType: AuditEntityType.CASE,
      entityId: caseId,
      action: "outcome_set",
      actionDescription,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: { outcome: previousOutcome },
        newValue: { outcome, notes },
      },
    });

    // Emit event
    this.emitEvent("case.outcome_set", {
      organizationId,
      actorUserId: userId,
      caseId,
      referenceNumber: existing.referenceNumber,
      previousOutcome,
      newOutcome: outcome,
      notes,
      timestamp: now,
    });

    this.logger.log(
      `Case ${existing.referenceNumber} outcome set to: ${outcome}`,
    );

    return updated;
  }

  // -------------------------------------------------------------------------
  // UPDATE CLASSIFICATION - Update case classification (corrections from RIU)
  // -------------------------------------------------------------------------

  /**
   * Updates the classification of a case.
   * Classification on Case can differ from the original RIU -
   * this is where corrections and re-categorizations are recorded.
   *
   * @throws NotFoundException if case not found
   */
  async updateClassification(input: UpdateClassificationInput): Promise<Case> {
    const {
      caseId,
      primaryCategoryId,
      secondaryCategoryId,
      severity,
      notes,
      userId,
      organizationId,
    } = input;

    // Verify case exists and belongs to this org
    const existing = await this.prisma.case.findFirst({
      where: { id: caseId, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    const now = new Date();
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    // Build update data and track changes
    const updateData: {
      primaryCategoryId?: string | null;
      secondaryCategoryId?: string | null;
      severity?: Severity;
      classificationNotes: string;
      classificationChangedAt: Date;
      classificationChangedById: string;
      updatedById: string;
    } = {
      classificationNotes: notes,
      classificationChangedAt: now,
      classificationChangedById: userId,
      updatedById: userId,
    };

    if (primaryCategoryId !== undefined) {
      changes["primaryCategoryId"] = {
        old: existing.primaryCategoryId,
        new: primaryCategoryId,
      };
      updateData.primaryCategoryId = primaryCategoryId;
    }

    if (secondaryCategoryId !== undefined) {
      changes["secondaryCategoryId"] = {
        old: existing.secondaryCategoryId,
        new: secondaryCategoryId,
      };
      updateData.secondaryCategoryId = secondaryCategoryId;
    }

    if (severity !== undefined) {
      changes["severity"] = { old: existing.severity, new: severity };
      updateData.severity = severity;
    }

    // Update case
    const updated = await this.prisma.case.update({
      where: { id: caseId },
      data: updateData,
    });

    // Build description of changes
    const changedFields = Object.keys(changes);
    const actionDescription =
      changedFields.length > 0
        ? `Updated classification (${changedFields.join(", ")}) on case ${existing.referenceNumber}`
        : `Added classification notes on case ${existing.referenceNumber}`;

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.CASE,
      entityId: caseId,
      action: "classification_updated",
      actionDescription,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: changes,
        newValue: { ...changes, notes },
      },
    });

    // Emit event
    this.emitEvent("case.classification_updated", {
      organizationId,
      actorUserId: userId,
      caseId,
      referenceNumber: existing.referenceNumber,
      changes,
      notes,
      timestamp: now,
    });

    this.logger.log(`Case ${existing.referenceNumber} classification updated`);

    return updated;
  }

  // -------------------------------------------------------------------------
  // GET PIPELINE HISTORY - Get stage transition history for a case
  // -------------------------------------------------------------------------

  /**
   * Gets the pipeline stage transition history for a case.
   * Returns audit log entries for pipeline stage changes.
   */
  async getPipelineHistory(
    caseId: string,
    organizationId: string,
  ): Promise<
    Array<{
      stage: string;
      changedAt: Date;
      changedBy: { id: string; firstName: string; lastName: string } | null;
      notes?: string;
    }>
  > {
    // Verify case exists
    const existing = await this.prisma.case.findFirst({
      where: { id: caseId, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    // Get audit logs for pipeline stage changes
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        entityType: AuditEntityType.CASE,
        entityId: caseId,
        action: "pipeline_stage_changed",
      },
      orderBy: { createdAt: "desc" },
      include: {
        actorUser: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return auditLogs.map((log) => {
      const changes = log.changes as { newValue?: { pipelineStage?: string; notes?: string } } | null;
      return {
        stage: changes?.newValue?.pipelineStage ?? "Unknown",
        changedAt: log.createdAt,
        changedBy: log.actorUser,
        notes: changes?.newValue?.notes,
      };
    });
  }

  // -------------------------------------------------------------------------
  // HELPER - Safe event emission
  // -------------------------------------------------------------------------

  private emitEvent(eventName: string, payload: object): void {
    try {
      this.eventEmitter.emit(eventName, payload);
    } catch (error) {
      this.logger.error(
        `Failed to emit event ${eventName}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
