/**
 * CaseStatusService - Status transition and closure operations for Cases
 *
 * Handles all status-related operations including:
 * - Status transitions with validation
 * - Case closure (soft-close to CLOSED status)
 * - Status transition rule enforcement
 *
 * Extracted from CasesService for maintainability.
 */

import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Case, CaseStatus, AuditEntityType } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivityService } from "../../../common/services/activity.service";
import { CaseStatusChangedEvent } from "../../events/events";
import { CaseQueryService } from "./case-query.service";

@Injectable()
export class CaseStatusService {
  private readonly logger = new Logger(CaseStatusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
    private readonly caseQueryService: CaseQueryService,
  ) {}

  /**
   * Updates case status with rationale.
   */
  async updateStatus(
    id: string,
    status: CaseStatus,
    rationale: string | undefined,
    userId: string,
    organizationId: string,
  ): Promise<Case> {
    // Verify case exists
    const existing = await this.caseQueryService.findOne(id, organizationId);

    // Validate status transition
    this.validateStatusTransition(existing.status, status);

    const oldStatus = existing.status;

    const updated = await this.prisma.case.update({
      where: { id },
      data: {
        status,
        statusRationale: rationale,
        updatedById: userId,
      },
    });

    // Log status change with natural language description
    await this.activityService.log({
      entityType: AuditEntityType.CASE,
      entityId: id,
      action: "status_changed",
      actionDescription: `Changed status from ${oldStatus} to ${status} on case ${existing.referenceNumber}`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: { status: oldStatus },
        newValue: { status, rationale },
      },
    });

    // Emit event for subscribers (workflow engine, notifications, SLA tracking)
    this.emitEvent(
      CaseStatusChangedEvent.eventName,
      new CaseStatusChangedEvent({
        organizationId,
        actorUserId: userId,
        actorType: "USER",
        caseId: id,
        previousStatus: oldStatus,
        newStatus: status,
        rationale,
      }),
    );

    return updated;
  }

  /**
   * Soft-closes a case by setting status to CLOSED.
   * Cases are never hard-deleted for audit purposes.
   */
  async close(
    id: string,
    rationale: string,
    userId: string,
    organizationId: string,
  ): Promise<Case> {
    // Verify case exists
    const existing = await this.caseQueryService.findOne(id, organizationId);

    // Validate status transition
    this.validateStatusTransition(existing.status, CaseStatus.CLOSED);

    const updated = await this.prisma.case.update({
      where: { id },
      data: {
        status: CaseStatus.CLOSED,
        statusRationale: rationale,
        updatedById: userId,
      },
    });

    // Log close action with natural language description
    await this.activityService.log({
      entityType: AuditEntityType.CASE,
      entityId: id,
      action: "closed",
      actionDescription: `Closed case ${existing.referenceNumber}`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: { status: existing.status },
        newValue: { status: CaseStatus.CLOSED, rationale },
      },
    });

    // Emit event for subscribers (workflow engine, notifications)
    this.emitEvent(
      CaseStatusChangedEvent.eventName,
      new CaseStatusChangedEvent({
        organizationId,
        actorUserId: userId,
        actorType: "USER",
        caseId: id,
        previousStatus: existing.status,
        newStatus: CaseStatus.CLOSED,
        rationale,
      }),
    );

    return updated;
  }

  /**
   * Validates status transitions.
   */
  validateStatusTransition(current: CaseStatus, next: CaseStatus): void {
    if (current === next) {
      throw new BadRequestException(`Case is already in ${current} status`);
    }
  }

  /**
   * Safely emits an event. Failures are logged but don't crash the request.
   * Events are fire-and-forget - request success is independent of event delivery.
   */
  private emitEvent(eventName: string, event: object): void {
    try {
      this.eventEmitter.emit(eventName, event);
    } catch (error) {
      this.logger.error(
        `Failed to emit event ${eventName}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't rethrow - request should succeed even if event emission fails
    }
  }
}
