import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { IndexingService } from "../indexing/indexing.service";
import {
  CaseCreatedEvent,
  CaseUpdatedEvent,
  CaseStatusChangedEvent,
} from "../../events/events/case.events";

/**
 * CaseIndexingHandler listens to case events and queues index updates.
 *
 * This handler bridges the event system with the search indexing pipeline.
 * All index operations are queued for async processing (2-5s eventual consistency).
 */
@Injectable()
export class CaseIndexingHandler {
  private readonly logger = new Logger(CaseIndexingHandler.name);

  constructor(private indexingService: IndexingService) {}

  @OnEvent("case.created", { async: true })
  async handleCaseCreated(event: CaseCreatedEvent): Promise<void> {
    this.logger.log(`Queueing index for new case: ${event.caseId}`);
    await this.indexingService.queueIndex({
      organizationId: event.organizationId,
      entityType: "cases",
      entityId: event.caseId,
      operation: "create",
    });
  }

  @OnEvent("case.updated", { async: true })
  async handleCaseUpdated(event: CaseUpdatedEvent): Promise<void> {
    this.logger.debug(`Queueing index update for case: ${event.caseId}`);
    await this.indexingService.queueIndex({
      organizationId: event.organizationId,
      entityType: "cases",
      entityId: event.caseId,
      operation: "update",
    });
  }

  @OnEvent("case.status_changed", { async: true })
  async handleCaseStatusChanged(event: CaseStatusChangedEvent): Promise<void> {
    this.logger.debug(
      `Queueing index update for case status change: ${event.caseId}`,
    );
    await this.indexingService.queueIndex({
      organizationId: event.organizationId,
      entityType: "cases",
      entityId: event.caseId,
      operation: "update",
    });
  }
}
