import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { AuditService } from "../audit.service";
import { AuditDescriptionService } from "../audit-description.service";
import {
  InvestigationCreatedEvent,
  InvestigationStatusChangedEvent,
  InvestigationAssignedEvent,
} from "../../events/events";
import {
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";

/**
 * Event handler for Investigation audit logging.
 *
 * Subscribes to investigation.* events using @OnEvent decorator.
 * Each handler builds a natural language description and logs to the audit table.
 *
 * All handlers run async to avoid blocking the main request.
 */
@Injectable()
export class InvestigationAuditHandler {
  private readonly logger = new Logger(InvestigationAuditHandler.name);

  constructor(
    private readonly auditService: AuditService,
    private readonly descriptionService: AuditDescriptionService,
  ) {}

  @OnEvent("investigation.created", { async: true })
  async handleInvestigationCreated(
    event: InvestigationCreatedEvent,
  ): Promise<void> {
    this.logger.debug(
      `Handling investigation.created event for ${event.investigationId}`,
    );

    const description =
      await this.descriptionService.buildInvestigationCreatedDescription({
        actorUserId: event.actorUserId,
        investigationId: event.investigationId,
        caseId: event.caseId,
        investigationNumber: event.investigationNumber,
      });

    await this.auditService.log({
      organizationId: event.organizationId,
      entityType: AuditEntityType.INVESTIGATION,
      entityId: event.investigationId,
      action: "created",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: description,
      actorUserId: event.actorUserId,
      actorType: this.mapActorType(event.actorType),
      context: {
        caseId: event.caseId,
        investigationNumber: event.investigationNumber,
      },
      requestId: event.correlationId,
    });
  }

  @OnEvent("investigation.status_changed", { async: true })
  async handleInvestigationStatusChanged(
    event: InvestigationStatusChangedEvent,
  ): Promise<void> {
    this.logger.debug(
      `Handling investigation.status_changed event for ${event.investigationId}`,
    );

    const description =
      await this.descriptionService.buildInvestigationStatusChangedDescription({
        actorUserId: event.actorUserId,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
      });

    await this.auditService.log({
      organizationId: event.organizationId,
      entityType: AuditEntityType.INVESTIGATION,
      entityId: event.investigationId,
      action: "status_changed",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: description,
      actorUserId: event.actorUserId,
      actorType: this.mapActorType(event.actorType),
      changes: {
        status: { old: event.previousStatus, new: event.newStatus },
      },
      context: {
        caseId: event.caseId,
      },
      requestId: event.correlationId,
    });
  }

  @OnEvent("investigation.assigned", { async: true })
  async handleInvestigationAssigned(
    event: InvestigationAssignedEvent,
  ): Promise<void> {
    this.logger.debug(
      `Handling investigation.assigned event for ${event.investigationId}`,
    );

    const description =
      await this.descriptionService.buildInvestigationAssignedDescription({
        actorUserId: event.actorUserId,
        previousInvestigatorId: event.previousInvestigatorId,
        newInvestigatorId: event.newInvestigatorId,
      });

    await this.auditService.log({
      organizationId: event.organizationId,
      entityType: AuditEntityType.INVESTIGATION,
      entityId: event.investigationId,
      action: "assigned",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: description,
      actorUserId: event.actorUserId,
      actorType: this.mapActorType(event.actorType),
      changes: {
        primaryInvestigatorId: {
          old: event.previousInvestigatorId,
          new: event.newInvestigatorId,
        },
      },
      context: {
        caseId: event.caseId,
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
