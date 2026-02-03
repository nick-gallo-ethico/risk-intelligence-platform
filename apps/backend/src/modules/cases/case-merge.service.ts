// =============================================================================
// CASE MERGE SERVICE - Handles merging of related cases
// =============================================================================
//
// This service handles:
// 1. Merging two cases atomically with full audit trail
// 2. Moving all associations (RIUs, subjects, investigations) to primary case
// 3. Converting source case to tombstone (isMerged=true, CLOSED status)
//
// KEY DESIGN DECISIONS:
// - Merge is atomic (all-or-nothing via transaction)
// - Source case becomes tombstone (never deleted for audit trail)
// - RIU associations change to MERGED_FROM type
// - Full audit trail of what was moved and why
// =============================================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Case,
  CaseStatus,
  AuditEntityType,
  RiuAssociationType,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import { MergeCaseDto, MergeResultDto, MergeHistoryDto } from "./dto/merge-case.dto";

/**
 * Service for merging related cases.
 *
 * When cases are merged:
 * 1. Source case becomes a tombstone (isMerged=true, status=CLOSED)
 * 2. All RIU associations move to target with type=MERGED_FROM
 * 3. All subjects move to target case
 * 4. All investigations reassign to target case
 * 5. Full audit trail recorded on both cases
 *
 * @example
 * ```typescript
 * // Merge case B into case A
 * const result = await caseMergeService.merge(
 *   { sourceCaseId: caseBId, targetCaseId: caseAId, reason: "Related reports" },
 *   userId,
 *   organizationId,
 * );
 * // Case B is now a tombstone pointing to Case A
 * // All RIUs, subjects, investigations moved to Case A
 * ```
 */
@Injectable()
export class CaseMergeService {
  private readonly logger = new Logger(CaseMergeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // -------------------------------------------------------------------------
  // MERGE - Merge two cases atomically
  // -------------------------------------------------------------------------

  /**
   * Merges source case into target case atomically.
   *
   * @param dto - Merge parameters (sourceCaseId, targetCaseId, reason)
   * @param userId - User performing the merge
   * @param organizationId - Organization ID (tenant isolation)
   * @returns MergeResultDto with counts of moved associations
   *
   * @throws NotFoundException if either case not found
   * @throws BadRequestException if source already merged or same case
   */
  async merge(
    dto: MergeCaseDto,
    userId: string,
    organizationId: string,
  ): Promise<MergeResultDto> {
    const { sourceCaseId, targetCaseId, reason } = dto;

    // Validate: can't merge case into itself
    if (sourceCaseId === targetCaseId) {
      throw new BadRequestException("Cannot merge a case into itself");
    }

    // Verify both cases exist and belong to this org
    const [sourceCase, targetCase] = await Promise.all([
      this.prisma.case.findFirst({
        where: { id: sourceCaseId, organizationId },
      }),
      this.prisma.case.findFirst({
        where: { id: targetCaseId, organizationId },
      }),
    ]);

    if (!sourceCase) {
      throw new NotFoundException(`Source case with ID ${sourceCaseId} not found`);
    }

    if (!targetCase) {
      throw new NotFoundException(`Target case with ID ${targetCaseId} not found`);
    }

    // Validate: source case not already merged
    if (sourceCase.isMerged) {
      throw new BadRequestException(
        `Case ${sourceCase.referenceNumber} has already been merged into another case`,
      );
    }

    // Validate: target case not already merged (can't merge into a tombstone)
    if (targetCase.isMerged) {
      throw new BadRequestException(
        `Cannot merge into case ${targetCase.referenceNumber} as it is already merged into another case`,
      );
    }

    const now = new Date();

    // Perform merge atomically in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Move RIU associations to target case
      const riuAssociations = await tx.riuCaseAssociation.updateMany({
        where: { caseId: sourceCaseId },
        data: {
          caseId: targetCaseId,
          associationType: RiuAssociationType.MERGED_FROM,
        },
      });

      // 2. Move subjects to target case
      const subjects = await tx.subject.updateMany({
        where: { caseId: sourceCaseId },
        data: { caseId: targetCaseId },
      });

      // 3. Reassign investigations to target case
      const investigations = await tx.investigation.updateMany({
        where: { caseId: sourceCaseId },
        data: { caseId: targetCaseId },
      });

      // 4. Move case messages to target case
      await tx.caseMessage.updateMany({
        where: { caseId: sourceCaseId },
        data: { caseId: targetCaseId },
      });

      // 5. Move interactions to target case
      await tx.interaction.updateMany({
        where: { caseId: sourceCaseId },
        data: { caseId: targetCaseId },
      });

      // 6. Update source case to tombstone
      await tx.case.update({
        where: { id: sourceCaseId },
        data: {
          status: CaseStatus.CLOSED,
          statusRationale: `Merged into ${targetCase.referenceNumber}: ${reason}`,
          isMerged: true,
          mergedIntoCaseId: targetCaseId,
          mergedAt: now,
          mergedById: userId,
          mergedReason: reason,
          updatedById: userId,
        },
      });

      // 7. Update target case (touch updatedAt)
      await tx.case.update({
        where: { id: targetCaseId },
        data: { updatedById: userId },
      });

      return {
        riuAssociationsMoved: riuAssociations.count,
        subjectsMoved: subjects.count,
        investigationsMoved: investigations.count,
      };
    });

    // Log activity on source case (tombstone)
    await this.activityService.log({
      entityType: AuditEntityType.CASE,
      entityId: sourceCaseId,
      action: "merged",
      actionDescription: `Merged case ${sourceCase.referenceNumber} into ${targetCase.referenceNumber}`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: {
          status: sourceCase.status,
          isMerged: false,
        },
        newValue: {
          status: CaseStatus.CLOSED,
          isMerged: true,
          mergedInto: targetCase.referenceNumber,
          reason,
          moved: {
            riuAssociations: result.riuAssociationsMoved,
            subjects: result.subjectsMoved,
            investigations: result.investigationsMoved,
          },
        },
      },
    });

    // Log activity on target case (received merge)
    await this.activityService.log({
      entityType: AuditEntityType.CASE,
      entityId: targetCaseId,
      action: "received_merge",
      actionDescription: `Received merge from case ${sourceCase.referenceNumber}`,
      actorUserId: userId,
      organizationId,
      changes: {
        newValue: {
          mergedFrom: sourceCase.referenceNumber,
          reason,
          received: {
            riuAssociations: result.riuAssociationsMoved,
            subjects: result.subjectsMoved,
            investigations: result.investigationsMoved,
          },
        },
      },
    });

    // Emit event for subscribers
    this.emitEvent("case.merged", {
      organizationId,
      actorUserId: userId,
      sourceCaseId,
      sourceReferenceNumber: sourceCase.referenceNumber,
      targetCaseId,
      targetReferenceNumber: targetCase.referenceNumber,
      reason,
      riuAssociationsMoved: result.riuAssociationsMoved,
      subjectsMoved: result.subjectsMoved,
      investigationsMoved: result.investigationsMoved,
      timestamp: now,
    });

    this.logger.log(
      `Merged case ${sourceCase.referenceNumber} into ${targetCase.referenceNumber}`,
    );

    return {
      sourceCaseId,
      targetCaseId,
      sourceReferenceNumber: sourceCase.referenceNumber,
      targetReferenceNumber: targetCase.referenceNumber,
      riuAssociationsMoved: result.riuAssociationsMoved,
      subjectsMoved: result.subjectsMoved,
      investigationsMoved: result.investigationsMoved,
      mergedAt: now,
    };
  }

  // -------------------------------------------------------------------------
  // GET MERGE HISTORY - Get cases that were merged into this case
  // -------------------------------------------------------------------------

  /**
   * Gets the merge history for a case.
   * Returns all cases that were merged into this case.
   *
   * @param caseId - The primary case ID to get merge history for
   * @param organizationId - Organization ID (tenant isolation)
   * @returns Array of merge history entries
   */
  async getMergeHistory(
    caseId: string,
    organizationId: string,
  ): Promise<MergeHistoryDto[]> {
    // Verify case exists
    const existing = await this.prisma.case.findFirst({
      where: { id: caseId, organizationId },
    });

    if (!existing) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    // Get all cases that were merged into this case
    const mergedCases = await this.prisma.case.findMany({
      where: {
        organizationId,
        mergedIntoCaseId: caseId,
        isMerged: true,
      },
      orderBy: { mergedAt: "desc" },
      include: {
        mergedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return mergedCases.map((merged) => ({
      mergedCaseId: merged.id,
      mergedCaseReferenceNumber: merged.referenceNumber,
      reason: merged.mergedReason ?? "No reason provided",
      mergedBy: merged.mergedBy,
      mergedAt: merged.mergedAt!,
    }));
  }

  // -------------------------------------------------------------------------
  // GET PRIMARY CASE - Follow merge chain to find ultimate primary case
  // -------------------------------------------------------------------------

  /**
   * Follows the merge chain to find the ultimate primary case.
   * Useful when a case has been merged multiple times.
   *
   * @param caseId - Starting case ID
   * @param organizationId - Organization ID (tenant isolation)
   * @returns The ultimate primary case (non-tombstone)
   */
  async getPrimaryCase(
    caseId: string,
    organizationId: string,
  ): Promise<Case> {
    const initialCase = await this.prisma.case.findFirst({
      where: { id: caseId, organizationId },
    });

    if (!initialCase) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    let currentCase: Case = initialCase;

    // Follow merge chain until we find a non-merged case
    let iterations = 0;
    const maxIterations = 100; // Safety limit to prevent infinite loops

    while (currentCase.isMerged && currentCase.mergedIntoCaseId && iterations < maxIterations) {
      const nextCase: Case | null = await this.prisma.case.findFirst({
        where: {
          id: currentCase.mergedIntoCaseId,
          organizationId,
        },
      });

      if (!nextCase) {
        // Merge chain broken - return current case
        this.logger.warn(
          `Merge chain broken: case ${currentCase.id} points to missing case ${currentCase.mergedIntoCaseId}`,
        );
        break;
      }

      currentCase = nextCase;
      iterations++;
    }

    if (iterations >= maxIterations) {
      this.logger.error(`Merge chain exceeded max iterations for case ${caseId}`);
    }

    return currentCase;
  }

  // -------------------------------------------------------------------------
  // CAN MERGE - Check if two cases can be merged
  // -------------------------------------------------------------------------

  /**
   * Checks if two cases can be merged.
   *
   * @returns Object with canMerge boolean and reason if not
   */
  async canMerge(
    sourceCaseId: string,
    targetCaseId: string,
    organizationId: string,
  ): Promise<{ canMerge: boolean; reason?: string }> {
    if (sourceCaseId === targetCaseId) {
      return { canMerge: false, reason: "Cannot merge a case into itself" };
    }

    const [sourceCase, targetCase] = await Promise.all([
      this.prisma.case.findFirst({
        where: { id: sourceCaseId, organizationId },
      }),
      this.prisma.case.findFirst({
        where: { id: targetCaseId, organizationId },
      }),
    ]);

    if (!sourceCase) {
      return { canMerge: false, reason: "Source case not found" };
    }

    if (!targetCase) {
      return { canMerge: false, reason: "Target case not found" };
    }

    if (sourceCase.isMerged) {
      return {
        canMerge: false,
        reason: `Source case ${sourceCase.referenceNumber} has already been merged`,
      };
    }

    if (targetCase.isMerged) {
      return {
        canMerge: false,
        reason: `Target case ${targetCase.referenceNumber} is a tombstone (already merged)`,
      };
    }

    return { canMerge: true };
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
