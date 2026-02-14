/**
 * RiusService - Coordinator for Risk Intelligence Unit operations
 *
 * CRITICAL: RIU content is IMMUTABLE after creation.
 * - Only status, language handling, and AI enrichment fields can be modified.
 * - Corrections and updates should go on the linked Case, not the RIU.
 * - This preserves the original intake record for audit purposes.
 *
 * The HubSpot Parallel: RIUs are like Contacts - immutable intake records.
 * Cases are like Deals - mutable work containers.
 *
 * Delegates to:
 * - RiuQueryService: Read operations (find, list)
 * - RiuFormDataService: Form data structuring for UI
 * - Extension services: Type-specific data handling
 */

import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Prisma,
  RiskIntelligenceUnit,
  RiuStatus,
  RiuType,
  AuditEntityType,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import { CreateRiuDto, UpdateRiuDto, RiuQueryDto } from "./dto";
import {
  IMMUTABLE_RIU_FIELDS,
  getImmutableFieldsInObject,
} from "./types/riu.types";
import { RiuFormDataResponse } from "./types/riu-form-data.types";
import {
  HotlineRiuService,
  CreateHotlineExtensionDto,
  DisclosureRiuService,
  CreateDisclosureExtensionDto,
  ThresholdConfig,
  WebFormRiuService,
  CreateWebFormExtensionDto,
} from "./extensions";
import { RiuQueryService } from "./services/riu-query.service";
import { RiuFormDataService } from "./services/riu-form-data.service";

@Injectable()
export class RiusService {
  private readonly logger = new Logger(RiusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
    private readonly hotlineRiuService: HotlineRiuService,
    private readonly disclosureRiuService: DisclosureRiuService,
    private readonly webFormRiuService: WebFormRiuService,
    private readonly riuQueryService: RiuQueryService,
    private readonly riuFormDataService: RiuFormDataService,
  ) {}

  // ===========================================
  // Creation
  // ===========================================

  /**
   * Creates a new RIU with auto-generated reference number.
   * Format: RIU-YYYY-NNNNN (e.g., RIU-2026-00001)
   */
  async create(
    dto: CreateRiuDto,
    userId: string,
    organizationId: string,
  ): Promise<RiskIntelligenceUnit> {
    const referenceNumber = await this.generateReferenceNumber(organizationId);

    // Compute effective language (confirmed > detected > 'en')
    const languageEffective =
      dto.languageConfirmed ?? dto.languageDetected ?? "en";

    const data: Prisma.RiskIntelligenceUnitUncheckedCreateInput = {
      organizationId,
      referenceNumber,
      createdById: userId,
      type: dto.type,
      sourceChannel: dto.sourceChannel,
      details: dto.details,
      summary: dto.summary,
      reporterType: dto.reporterType,
      anonymousAccessCode: dto.anonymousAccessCode,
      reporterName: dto.reporterName,
      reporterEmail: dto.reporterEmail,
      reporterPhone: dto.reporterPhone,
      categoryId: dto.categoryId,
      severity: dto.severity,
      locationName: dto.locationName,
      locationAddress: dto.locationAddress,
      locationCity: dto.locationCity,
      locationState: dto.locationState,
      locationZip: dto.locationZip,
      locationCountry: dto.locationCountry,
      campaignId: dto.campaignId,
      campaignAssignmentId: dto.campaignAssignmentId,
      customFields: dto.customFields as Prisma.InputJsonValue,
      formResponses: dto.formResponses as Prisma.InputJsonValue,
      sourceSystem: dto.sourceSystem,
      sourceRecordId: dto.sourceRecordId,
      languageDetected: dto.languageDetected,
      languageConfirmed: dto.languageConfirmed,
      languageEffective,
      demoUserSessionId: dto.demoUserSessionId,
      isBaseData: dto.isBaseData,
    };

    const riu = await this.prisma.riskIntelligenceUnit.create({ data });

    await this.activityService.log({
      entityType: AuditEntityType.RIU,
      entityId: riu.id,
      action: "created",
      actionDescription: `Created RIU ${referenceNumber} via ${riu.sourceChannel}`,
      actorUserId: userId,
      organizationId,
    });

    this.emitEvent("riu.created", {
      organizationId,
      actorUserId: userId,
      riuId: riu.id,
      referenceNumber: riu.referenceNumber,
      type: riu.type,
      sourceChannel: riu.sourceChannel,
      categoryId: riu.categoryId,
      severity: riu.severity,
    });

    return riu;
  }

  /**
   * Creates a type-specific extension for an RIU based on its type.
   */
  async createExtension(
    riuId: string,
    type: RiuType,
    extensionData:
      | CreateHotlineExtensionDto
      | CreateDisclosureExtensionDto
      | CreateWebFormExtensionDto,
    organizationId: string,
    thresholdConfig?: ThresholdConfig,
  ): Promise<unknown> {
    switch (type) {
      case RiuType.HOTLINE_REPORT:
        return this.hotlineRiuService.createExtension(
          riuId,
          extensionData as CreateHotlineExtensionDto,
          organizationId,
        );
      case RiuType.DISCLOSURE_RESPONSE:
        return this.disclosureRiuService.createExtension(
          riuId,
          extensionData as CreateDisclosureExtensionDto,
          organizationId,
          thresholdConfig,
        );
      case RiuType.WEB_FORM_SUBMISSION:
        return this.webFormRiuService.createExtension(
          riuId,
          extensionData as CreateWebFormExtensionDto,
          organizationId,
        );
      default:
        this.logger.debug(`No extension required for RIU type ${type}`);
        return null;
    }
  }

  // ===========================================
  // Query Operations (delegated)
  // ===========================================

  async findAll(
    query: RiuQueryDto,
    organizationId: string,
  ): Promise<{
    data: RiskIntelligenceUnit[];
    total: number;
    limit: number;
    offset: number;
  }> {
    return this.riuQueryService.findAll(query, organizationId);
  }

  async findOne(
    id: string,
    organizationId: string,
  ): Promise<RiskIntelligenceUnit> {
    return this.riuQueryService.findOne(id, organizationId);
  }

  async findByReferenceNumber(
    referenceNumber: string,
    organizationId: string,
  ): Promise<RiskIntelligenceUnit> {
    return this.riuQueryService.findByReferenceNumber(
      referenceNumber,
      organizationId,
    );
  }

  async findByAccessCode(
    accessCode: string,
    organizationId: string,
  ): Promise<RiskIntelligenceUnit | null> {
    return this.riuQueryService.findByAccessCode(accessCode, organizationId);
  }

  async findOneWithExtension(
    id: string,
    organizationId: string,
  ): Promise<
    RiskIntelligenceUnit & {
      hotlineExtension?: unknown;
      disclosureExtension?: unknown;
      webFormExtension?: unknown;
    }
  > {
    return this.riuQueryService.findOneWithExtension(id, organizationId);
  }

  async getFormData(
    organizationId: string,
    riuId: string,
  ): Promise<RiuFormDataResponse> {
    return this.riuFormDataService.getFormData(organizationId, riuId);
  }

  // ===========================================
  // Update Operations (immutability enforced)
  // ===========================================

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

    const existing = await this.findOne(id, organizationId);
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
    await this.findOne(id, organizationId);

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
    const existing = await this.findOne(id, organizationId);

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

  // ===========================================
  // Private Helpers
  // ===========================================

  private async generateReferenceNumber(
    organizationId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RIU-${year}-`;

    const lastRiu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: {
        organizationId,
        referenceNumber: { startsWith: prefix },
      },
      orderBy: { referenceNumber: "desc" },
      select: { referenceNumber: true },
    });

    let nextNumber = 1;
    if (lastRiu) {
      const lastNumber = parseInt(lastRiu.referenceNumber.split("-")[2], 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
  }

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
