import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PolicyIndexer } from "../../search/indexing/indexers";
import {
  PolicyCreatedEvent,
  PolicyUpdatedEvent,
  PolicyPublishedEvent,
  PolicyRetiredEvent,
} from "../events/policy.events";

/**
 * PolicySearchIndexListener subscribes to policy events and triggers
 * re-indexing in Elasticsearch.
 *
 * Event triggers:
 * - policy.created: Index new policy
 * - policy.updated: Re-index on draft changes
 * - policy.published: Re-index with new version content
 * - policy.retired: Re-index with retired status
 * - policy.translation.created: Re-index with new translation
 * - policy.translation.updated: Re-index with updated translation
 * - policy.case.linked: Re-index with updated case count
 * - policy.case.unlinked: Re-index with updated case count
 *
 * All handlers are async and catch errors to prevent blocking other listeners.
 */
@Injectable()
export class PolicySearchIndexListener {
  private readonly logger = new Logger(PolicySearchIndexListener.name);

  constructor(private readonly policyIndexer: PolicyIndexer) {}

  /**
   * Index a newly created policy.
   */
  @OnEvent("policy.created", { async: true })
  async onPolicyCreated(event: PolicyCreatedEvent): Promise<void> {
    try {
      this.logger.debug(`Indexing new policy: ${event.policyId}`);
      await this.policyIndexer.indexPolicy(event.policyId, event.organizationId);
    } catch (error) {
      this.logger.error(
        `Failed to index created policy ${event.policyId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Re-index policy on draft update.
   */
  @OnEvent("policy.updated", { async: true })
  async onPolicyUpdated(event: PolicyUpdatedEvent): Promise<void> {
    try {
      this.logger.debug(`Re-indexing updated policy: ${event.policyId}`);
      await this.policyIndexer.indexPolicy(event.policyId, event.organizationId);
    } catch (error) {
      this.logger.error(
        `Failed to re-index updated policy ${event.policyId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Re-index policy when a new version is published.
   * This is critical as it updates the searchable content to the new version.
   */
  @OnEvent("policy.published", { async: true })
  async onPolicyPublished(event: PolicyPublishedEvent): Promise<void> {
    try {
      this.logger.log(`Re-indexing published policy: ${event.policyId} (v${event.version})`);
      await this.policyIndexer.indexPolicy(event.policyId, event.organizationId);
    } catch (error) {
      this.logger.error(
        `Failed to re-index published policy ${event.policyId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Re-index policy when retired.
   */
  @OnEvent("policy.retired", { async: true })
  async onPolicyRetired(event: PolicyRetiredEvent): Promise<void> {
    try {
      this.logger.debug(`Re-indexing retired policy: ${event.policyId}`);
      await this.policyIndexer.indexPolicy(event.policyId, event.organizationId);
    } catch (error) {
      this.logger.error(
        `Failed to re-index retired policy ${event.policyId}: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Re-index policy when a translation is created.
   * Updates translationLanguages and translatedContent fields.
   */
  @OnEvent("policy.translation.created", { async: true })
  async onTranslationCreated(event: {
    organizationId: string;
    policyId: string;
    languageCode: string;
  }): Promise<void> {
    try {
      this.logger.debug(
        `Re-indexing policy ${event.policyId} after translation created (${event.languageCode})`,
      );
      await this.policyIndexer.indexPolicy(event.policyId, event.organizationId);
    } catch (error) {
      this.logger.error(
        `Failed to re-index policy ${event.policyId} after translation created: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Re-index policy when a translation is updated.
   */
  @OnEvent("policy.translation.updated", { async: true })
  async onTranslationUpdated(event: {
    organizationId: string;
    policyId: string;
    languageCode: string;
  }): Promise<void> {
    try {
      this.logger.debug(
        `Re-indexing policy ${event.policyId} after translation updated (${event.languageCode})`,
      );
      await this.policyIndexer.indexPolicy(event.policyId, event.organizationId);
    } catch (error) {
      this.logger.error(
        `Failed to re-index policy ${event.policyId} after translation updated: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Re-index policy when a case is linked.
   * Updates linkedCaseCount field.
   */
  @OnEvent("policy.case.linked", { async: true })
  async onPolicyCaseLinked(event: {
    organizationId: string;
    policyId: string;
    caseId: string;
  }): Promise<void> {
    try {
      this.logger.debug(
        `Re-indexing policy ${event.policyId} after case linked`,
      );
      await this.policyIndexer.indexPolicy(event.policyId, event.organizationId);
    } catch (error) {
      this.logger.error(
        `Failed to re-index policy ${event.policyId} after case linked: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Re-index policy when a case is unlinked.
   * Updates linkedCaseCount field.
   */
  @OnEvent("policy.case.unlinked", { async: true })
  async onPolicyCaseUnlinked(event: {
    organizationId: string;
    policyId: string;
    caseId: string;
  }): Promise<void> {
    try {
      this.logger.debug(
        `Re-indexing policy ${event.policyId} after case unlinked`,
      );
      await this.policyIndexer.indexPolicy(event.policyId, event.organizationId);
    } catch (error) {
      this.logger.error(
        `Failed to re-index policy ${event.policyId} after case unlinked: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
