import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { AuditService } from "../audit.service";
import { AuditDescriptionService } from "../audit-description.service";
import {
  CaseCreatedEvent,
  CaseUpdatedEvent,
  CaseStatusChangedEvent,
  CaseAssignedEvent,
} from "../../events/events";
import {
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";

/**
 * Event handler for Case audit logging.
 *
 * Subscribes to case.* events using @OnEvent decorator.
 * Each handler builds a natural language description and logs to the audit table.
 *
 * All handlers run async to avoid blocking the main request.
 */
@Injectable()
export class CaseAuditHandler {
  private readonly logger = new Logger(CaseAuditHandler.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly descriptionService: AuditDescriptionService,
  ) {}

  @OnEvent("case.created", { async: true })
  async handleCaseCreated(event: CaseCreatedEvent): Promise<void> {
    this.logger.debug(`Handling case.created event for ${event.caseId}`);

    const description =
      await this.descriptionService.buildCaseCreatedDescription({
        actorUserId: event.actorUserId,
        caseId: event.caseId,
        referenceNumber: event.referenceNumber,
        sourceChannel: event.sourceChannel,
      });

    await this.auditService.log({
      organizationId: event.organizationId,
      entityType: AuditEntityType.CASE,
      entityId: event.caseId,
      action: "created",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: description,
      actorUserId: event.actorUserId,
      actorType: this.mapActorType(event.actorType),
      context: {
        referenceNumber: event.referenceNumber,
        sourceChannel: event.sourceChannel,
        categoryId: event.categoryId,
        severity: event.severity,
      },
      requestId: event.correlationId,
    });
  }

  @OnEvent("case.updated", { async: true })
  async handleCaseUpdated(event: CaseUpdatedEvent): Promise<void> {
    this.logger.debug(`Handling case.updated event for ${event.caseId}`);

    const description =
      await this.descriptionService.buildCaseUpdatedDescription({
        actorUserId: event.actorUserId,
        changes: event.changes,
      });

    await this.auditService.log({
      organizationId: event.organizationId,
      entityType: AuditEntityType.CASE,
      entityId: event.caseId,
      action: "updated",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: description,
      actorUserId: event.actorUserId,
      actorType: this.mapActorType(event.actorType),
      changes: event.changes,
      requestId: event.correlationId,
    });
  }

  @OnEvent("case.status_changed", { async: true })
  async handleCaseStatusChanged(event: CaseStatusChangedEvent): Promise<void> {
    this.logger.debug(`Handling case.status_changed event for ${event.caseId}`);

    const description =
      await this.descriptionService.buildCaseStatusChangedDescription({
        actorUserId: event.actorUserId,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        rationale: event.rationale,
      });

    await this.auditService.log({
      organizationId: event.organizationId,
      entityType: AuditEntityType.CASE,
      entityId: event.caseId,
      action: "status_changed",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: description,
      actorUserId: event.actorUserId,
      actorType: this.mapActorType(event.actorType),
      changes: {
        status: { old: event.previousStatus, new: event.newStatus },
      },
      context: event.rationale ? { rationale: event.rationale } : undefined,
      requestId: event.correlationId,
    });
  }

  @OnEvent("case.assigned", { async: true })
  async handleCaseAssigned(event: CaseAssignedEvent): Promise<void> {
    this.logger.debug(`Handling case.assigned event for ${event.caseId}`);

    const description =
      await this.descriptionService.buildCaseAssignedDescription({
        actorUserId: event.actorUserId,
        caseId: event.caseId,
        previousAssigneeId: event.previousAssigneeId,
        newAssigneeId: event.newAssigneeId,
      });

    await this.auditService.log({
      organizationId: event.organizationId,
      entityType: AuditEntityType.CASE,
      entityId: event.caseId,
      action: "assigned",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: description,
      actorUserId: event.actorUserId,
      actorType: this.mapActorType(event.actorType),
      changes: {
        assignedTo: {
          old: event.previousAssigneeId,
          new: event.newAssigneeId,
        },
      },
      requestId: event.correlationId,
    });
  }

  /**
   * Maps event actor type string to Prisma ActorType enum.
   */
  private mapActorType(type: string): ActorType {
    const mapping: Record<string, ActorType> = {
      USER: ActorType.USER,
      SYSTEM: ActorType.SYSTEM,
      AI: ActorType.AI,
      INTEGRATION: ActorType.INTEGRATION,
      ANONYMOUS: ActorType.ANONYMOUS,
    };
    return mapping[type] || ActorType.SYSTEM;
  }
}
