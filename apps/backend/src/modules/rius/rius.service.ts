/**
 * RiusService - Thin Coordinator for Risk Intelligence Unit operations
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
 * - RiuUpdateService: Update operations (status, AI enrichment, language)
 * - Extension services: Type-specific data handling
 */

import { Injectable, Logger } from "@nestjs/common";
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
import { RiuUpdateService } from "./services/riu-update.service";

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
    private readonly riuUpdateService: RiuUpdateService,
  ) {}

  // Creation

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

  // Query Operations (delegated)

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

  // Update Operations (delegated to RiuUpdateService)

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
    return this.riuUpdateService.update(id, dto, userId, organizationId);
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
    return this.riuUpdateService.updateStatus(
      id,
      newStatus,
      userId,
      organizationId,
    );
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
    return this.riuUpdateService.updateAiEnrichment(
      id,
      enrichment,
      organizationId,
    );
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
    return this.riuUpdateService.updateLanguage(
      id,
      languageConfirmed,
      userId,
      organizationId,
    );
  }

  // Private Helpers

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
