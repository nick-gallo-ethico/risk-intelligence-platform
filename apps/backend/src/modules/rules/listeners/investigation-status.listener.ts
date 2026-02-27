import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { InvestigationStatusChangedEvent } from "../../events/events/investigation.events";
import { CaseStatusChangedEvent } from "../../events/events/case.events";
import {
  ActorType,
  AuditActionCategory,
  AuditEntityType,
} from "@prisma/client";

/**
 * Closed investigation statuses that indicate completion.
 * Based on InvestigationStatus enum: NEW, ASSIGNED, INVESTIGATING, PENDING_REVIEW, CLOSED, ON_HOLD
 */
const CLOSED_INVESTIGATION_STATUSES = ["CLOSED"];

/**
 * Case statuses where auto-derivation should apply.
 * Based on CaseStatus enum: NEW, OPEN, CLOSED
 * Don't auto-derive if case is already CLOSED.
 */
const DERIVABLE_CASE_STATUSES = ["NEW", "OPEN"];

/**
 * InvestigationStatusListener derives case status from investigation states.
 *
 * Rule: When ALL investigations on a case are closed, the listener:
 * 1. Logs an audit entry noting all investigations completed
 * 2. Emits a CaseStatusChangedEvent for downstream processing
 *
 * Note: The actual CaseStatus enum only has NEW, OPEN, CLOSED.
 * Auto-deriving to CLOSED would skip human review, so we only emit
 * an event and audit log. Manual case closure is required.
 *
 * This implements RULE-06 from the requirements:
 * "When all investigations on a case are closed, case status auto-derives to PENDING_REVIEW"
 * Adapted: Since PENDING_REVIEW doesn't exist in CaseStatus, we flag for review via event.
 */
@Injectable()
export class InvestigationStatusListener {
  private readonly logger = new Logger(InvestigationStatusListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Handle investigation.status_changed events.
   * Check if all investigations are now closed and notify if so.
   */
  @OnEvent(InvestigationStatusChangedEvent.eventName, { async: true })
  async handleInvestigationStatusChanged(
    event: InvestigationStatusChangedEvent,
  ): Promise<void> {
    // Only process when investigation moves to a closed status
    if (!this.isClosedStatus(event.newStatus)) {
      this.logger.debug(
        `Investigation ${event.investigationId} moved to ${event.newStatus}, not a closed status`,
      );
      return;
    }

    this.logger.debug(
      `Investigation ${event.investigationId} closed, checking case ${event.caseId}`,
    );

    try {
      // Get the parent case and check if it's in a derivable status
      const parentCase = await this.prisma.case.findFirst({
        where: {
          id: event.caseId,
          organizationId: event.organizationId,
        },
        select: {
          id: true,
          status: true,
          referenceNumber: true,
        },
      });

      if (!parentCase) {
        this.logger.warn(
          `Case ${event.caseId} not found for investigation ${event.investigationId}`,
        );
        return;
      }

      // Don't process if case is already in a terminal status
      if (!DERIVABLE_CASE_STATUSES.includes(parentCase.status)) {
        this.logger.debug(
          `Case ${event.caseId} is in ${parentCase.status}, not a derivable status`,
        );
        return;
      }

      // Check if ALL investigations for this case are now closed
      const allInvestigationsClosed = await this.checkAllInvestigationsClosed(
        event.caseId,
        event.organizationId,
      );

      if (allInvestigationsClosed) {
        await this.flagCaseForReview(parentCase, event.organizationId);
      } else {
        this.logger.debug(
          `Case ${event.caseId} still has open investigations, not flagging for review`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing investigation status change: ${error}`,
      );
      // Don't throw - status derivation failure shouldn't block other listeners
    }
  }

  /**
   * Check if a status is considered "closed".
   */
  private isClosedStatus(status: string): boolean {
    return CLOSED_INVESTIGATION_STATUSES.includes(status.toUpperCase());
  }

  /**
   * Check if all investigations on a case are in closed status.
   */
  private async checkAllInvestigationsClosed(
    caseId: string,
    organizationId: string,
  ): Promise<boolean> {
    // Get all investigations for this case
    const investigations = await this.prisma.investigation.findMany({
      where: {
        caseId,
        organizationId,
      },
      select: { status: true },
    });

    // If no investigations, don't flag for review (edge case)
    if (investigations.length === 0) {
      return false;
    }

    // Check if ALL are in closed status
    return investigations.every((inv) => this.isClosedStatus(inv.status));
  }

  /**
   * Flag case for review when all investigations are complete.
   *
   * Since CaseStatus doesn't have PENDING_REVIEW, we:
   * 1. Create audit log entry marking all investigations complete
   * 2. Emit CaseStatusChangedEvent with rationale for downstream processing
   *
   * This allows notification systems to alert reviewers without
   * auto-closing the case.
   */
  private async flagCaseForReview(
    parentCase: { id: string; status: string; referenceNumber: string },
    organizationId: string,
  ): Promise<void> {
    const rationale = "All investigations completed (auto-derived)";

    // Log to audit - this creates a permanent record that investigations are done
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        entityType: AuditEntityType.CASE,
        entityId: parentCase.id,
        action: "investigations_completed",
        actionCategory: AuditActionCategory.SYSTEM,
        actionDescription: `All investigations closed for case ${parentCase.referenceNumber}. Case ready for review.`,
        actorType: ActorType.SYSTEM,
        changes: {
          allInvestigationsClosed: true,
          timestamp: new Date().toISOString(),
        },
        context: {
          reason: "All investigations completed",
          autoDerivation: true,
          caseStatus: parentCase.status,
        },
      },
    });

    // Emit event for downstream processing (notifications, workflow, etc.)
    // Use the same event type but with rationale indicating investigations complete
    this.eventEmitter.emit(
      CaseStatusChangedEvent.eventName,
      new CaseStatusChangedEvent({
        organizationId,
        caseId: parentCase.id,
        previousStatus: parentCase.status,
        newStatus: parentCase.status, // Status unchanged, but rationale signals completion
        rationale,
        actorUserId: null,
        actorType: "SYSTEM",
      }),
    );

    this.logger.log(
      `All investigations closed for case ${parentCase.referenceNumber}. ` +
        `Case flagged for review (status: ${parentCase.status})`,
    );
  }
}
