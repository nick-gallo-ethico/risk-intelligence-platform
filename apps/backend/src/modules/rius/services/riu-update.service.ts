/**
 * RiuUpdateService - Update operations for RIUs
 *
 * Handles all update operations including:
 * - General updates with immutability enforcement
 * - Status changes with event emission
 * - AI enrichment updates
 * - Language handling
 *
 * CRITICAL: RIU content is IMMUTABLE after creation.
 * Only status, language handling, and AI enrichment fields can be modified.
 * Corrections should go on the linked Case, not the RIU.
 *
 * Extracted from RiusService for maintainability.
 */

import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Prisma,
  RiskIntelligenceUnit,
  RiuStatus,
  AuditEntityType,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ActivityService } from "../../../common/services/activity.service";
import { UpdateRiuDto } from "../dto";
import { getImmutableFieldsInObject } from "../types/riu.types";
import { RiuQueryService } from "./riu-query.service";

@Injectable()
export class RiuUpdateService {
  private readonly logger = new Logger(RiuUpdateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
    private readonly riuQueryService: RiuQueryService,
  ) {}

  /**
   * Updates a RIU - ENFORCES IMMUTABILITY.
   * Only status, language handling, and AI enrichment fields can be modified.
   */
  async update(
    id: string,
    dto: UpdateRiuDto,
    userId: string,
    organizationId: string,
  ): Promise<RiskIntelligenceUnit> {
    const attemptedImmutableChanges = getImmutableFieldsInObject(dto);

    if (attemptedImmutableChanges.length > 0) {
      throw new BadRequestException(
        `Cannot modify immutable RIU fields: ${attemptedImmutableChanges.join(", ")}. ` +
          `RIU content is frozen at intake. Corrections should go on the linked Case.`,
      );
    }

    const existing = await this.riuQueryService.findOne(id, organizationId);
    const statusChanged = dto.status && dto.status !== existing.status;
    const oldStatus = existing.status;

    const data: Prisma.RiskIntelligenceUnitUncheckedUpdateInput = {};

    // Status workflow
    if (dto.status !== undefined) {
      data.status = dto.status;
    }
    if (statusChanged) {
      data.statusChangedAt = new Date();
      data.statusChangedById = userId;
    }

    // Language handling
    if (dto.languageDetected !== undefined) {
      data.languageDetected = dto.languageDetected;
    }
    if (dto.languageConfirmed !== undefined) {
      data.languageConfirmed = dto.languageConfirmed;
    }
    if (
      dto.languageConfirmed !== undefined ||
      dto.languageDetected !== undefined
    ) {
      const newConfirmed = dto.languageConfirmed ?? existing.languageConfirmed;
      const newDetected = dto.languageDetected ?? existing.languageDetected;
      data.languageEffective = newConfirmed ?? newDetected ?? "en";
    }

    // AI Enrichment
    if (dto.aiSummary !== undefined) data.aiSummary = dto.aiSummary;
    if (dto.aiRiskScore !== undefined) data.aiRiskScore = dto.aiRiskScore;
    if (dto.aiTranslation !== undefined) data.aiTranslation = dto.aiTranslation;
    if (dto.aiLanguageDetected !== undefined)
      data.aiLanguageDetected = dto.aiLanguageDetected;
    if (dto.aiModelVersion !== undefined)
      data.aiModelVersion = dto.aiModelVersion;
    if (dto.aiGeneratedAt !== undefined) data.aiGeneratedAt = dto.aiGeneratedAt;
    if (dto.aiConfidenceScore !== undefined)
      data.aiConfidenceScore = dto.aiConfidenceScore;

    const updated = await this.prisma.riskIntelligenceUnit.update({
      where: { id },
      data,
    });

    if (statusChanged) {
      await this.activityService.log({
        entityType: AuditEntityType.RIU,
        entityId: id,
        action: "status_changed",
        actionDescription: `Changed RIU status from ${oldStatus} to ${dto.status}`,
        actorUserId: userId,
        organizationId,
        changes: {
          oldValue: { status: oldStatus },
          newValue: { status: dto.status },
        },
      });

      this.emitEvent("riu.status.changed", {
        organizationId,
        actorUserId: userId,
        riuId: id,
        previousStatus: oldStatus,
        newStatus: dto.status,
      });
    }

    return updated;
  }

  /**
   * Updates RIU status - convenience method.
   */
  async updateStatus(
    id: string,
    newStatus: RiuStatus,
    userId: string,
    organizationId: string,
  ): Promise<RiskIntelligenceUnit> {
    return this.update(id, { status: newStatus }, userId, organizationId);
  }

  /**
   * Updates AI enrichment fields - system operation.
   */
  async updateAiEnrichment(
    id: string,
    enrichment: {
      aiSummary?: string;
      aiRiskScore?: number;
      aiTranslation?: string;
      aiLanguageDetected?: string;
      aiConfidenceScore?: number;
      aiModelVersion?: string;
    },
    organizationId: string,
  ): Promise<RiskIntelligenceUnit> {
    await this.riuQueryService.findOne(id, organizationId);

    const updated = await this.prisma.riskIntelligenceUnit.update({
      where: { id },
      data: {
        ...enrichment,
        aiGeneratedAt: new Date(),
      },
    });

    this.emitEvent("riu.ai.enriched", {
      organizationId,
      riuId: id,
      aiModelVersion: enrichment.aiModelVersion,
    });

    return updated;
  }

  /**
   * Updates language fields.
   */
  async updateLanguage(
    id: string,
    languageConfirmed: string | null,
    userId: string,
    organizationId: string,
  ): Promise<RiskIntelligenceUnit> {
    const existing = await this.riuQueryService.findOne(id, organizationId);

    const languageEffective =
      languageConfirmed ?? existing.languageDetected ?? "en";

    const updated = await this.prisma.riskIntelligenceUnit.update({
      where: { id },
      data: {
        languageConfirmed,
        languageEffective,
      },
    });

    await this.activityService.log({
      entityType: AuditEntityType.RIU,
      entityId: id,
      action: "language_updated",
      actionDescription: languageConfirmed
        ? `Confirmed language as ${languageConfirmed} for RIU ${existing.referenceNumber}`
        : `Cleared language confirmation for RIU ${existing.referenceNumber}`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: { languageConfirmed: existing.languageConfirmed },
        newValue: { languageConfirmed },
      },
    });

    return updated;
  }

  /**
   * Emits an event with error handling.
   */
  private emitEvent(eventName: string, event: object): void {
    try {
      this.eventEmitter.emit(eventName, event);
    } catch (error) {
      this.logger.error(
        `Failed to emit event ${eventName}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
