// =============================================================================
// TRANSLATION STALE LISTENER - Marks translations stale on version publish
// =============================================================================
//
// This listener subscribes to policy.published events and marks translations
// of the PREVIOUS version as stale. This notifies translators that the source
// content has changed and translations may need updating.
//
// KEY BEHAVIORS:
// - Only marks stale if there IS a previous version (version > 1)
// - Marks isStale: true on all translations of the previous version
// - Does NOT throw on errors (per project pattern - logged only)
// - Emits translations.marked_stale event for downstream consumers
// =============================================================================

import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { PolicyPublishedEvent } from "../events/policy.events";

/**
 * Event emitted when translations are marked stale.
 */
export class TranslationsMarkedStaleEvent {
  static readonly eventName = "translations.marked_stale";

  constructor(
    public readonly organizationId: string,
    public readonly policyId: string,
    public readonly previousVersionId: string,
    public readonly newVersionId: string,
    public readonly translationCount: number,
  ) {}
}

/**
 * TranslationStaleListener marks translations as stale when a new
 * policy version is published.
 *
 * When a policy publishes a new version, any translations for the
 * previous version become potentially out-of-date. This listener
 * marks them as isStale: true so translators know to review.
 */
@Injectable()
export class TranslationStaleListener {
  private readonly logger = new Logger(TranslationStaleListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Handles policy.published events.
   * Marks translations of the previous version as stale.
   *
   * @param event - The policy published event
   */
  @OnEvent(PolicyPublishedEvent.eventName, { async: true })
  async onPolicyPublished(event: PolicyPublishedEvent): Promise<void> {
    try {
      const { policyId, policyVersionId, organizationId } = event;

      this.logger.debug(
        `Processing policy publish for stale translation check: policy=${policyId}, version=${policyVersionId}`,
      );

      // Get the new version number
      const newVersion = await this.prisma.policyVersion.findUnique({
        where: { id: policyVersionId },
        select: { version: true },
      });

      if (!newVersion) {
        this.logger.warn(
          `Policy version ${policyVersionId} not found for stale check`,
        );
        return;
      }

      // If this is version 1, there's no previous version to mark stale
      if (newVersion.version <= 1) {
        this.logger.debug(
          `Policy version ${policyVersionId} is version 1, no previous translations to mark stale`,
        );
        return;
      }

      // Find the previous version
      const previousVersion = await this.prisma.policyVersion.findFirst({
        where: {
          policyId,
          organizationId,
          version: newVersion.version - 1,
        },
        select: { id: true },
      });

      if (!previousVersion) {
        this.logger.warn(
          `Previous version (${newVersion.version - 1}) not found for policy ${policyId}`,
        );
        return;
      }

      // Mark all translations for the previous version as stale
      const result = await this.prisma.policyVersionTranslation.updateMany({
        where: {
          policyVersionId: previousVersion.id,
          organizationId,
          isStale: false, // Only update those not already stale
        },
        data: {
          isStale: true,
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Marked ${result.count} translation(s) as stale for policy ${policyId} (previous version ${newVersion.version - 1})`,
        );

        // Emit event for downstream consumers (e.g., notifications to translators)
        this.emitEvent(
          TranslationsMarkedStaleEvent.eventName,
          new TranslationsMarkedStaleEvent(
            organizationId,
            policyId,
            previousVersion.id,
            policyVersionId,
            result.count,
          ),
        );
      } else {
        this.logger.debug(
          `No translations to mark stale for policy ${policyId} previous version`,
        );
      }
    } catch (error) {
      // Log but don't throw - publishing should succeed even if stale marking fails
      this.logger.error(
        `Failed to mark translations stale: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Safely emits an event. Failures are logged but don't crash.
   */
  private emitEvent(eventName: string, event: object): void {
    try {
      this.eventEmitter.emit(eventName, event);
    } catch (error) {
      this.logger.error(
        `Failed to emit event ${eventName}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
