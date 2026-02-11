import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
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
import {
  RiuFormDataResponse,
  FormSection,
  FormField,
  FormFieldType,
} from "./types/riu-form-data.types";
import {
  HotlineRiuService,
  CreateHotlineExtensionDto,
  DisclosureRiuService,
  CreateDisclosureExtensionDto,
  ThresholdConfig,
  WebFormRiuService,
  CreateWebFormExtensionDto,
} from "./extensions";

/**
 * Service for managing Risk Intelligence Units (RIUs).
 *
 * CRITICAL: RIU content is IMMUTABLE after creation.
 * - Only status, language handling, and AI enrichment fields can be modified.
 * - Corrections and updates should go on the linked Case, not the RIU.
 * - This preserves the original intake record for audit purposes.
 *
 * The HubSpot Parallel: RIUs are like Contacts - immutable intake records.
 * Cases are like Deals - mutable work containers.
 */
@Injectable()
export class RiusService {
  private readonly logger = new Logger(RiusService.name);

  constructor(
    private prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
    private readonly hotlineRiuService: HotlineRiuService,
    private readonly disclosureRiuService: DisclosureRiuService,
    private readonly webFormRiuService: WebFormRiuService,
  ) {}

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

      // Type Classification
      type: dto.type,
      sourceChannel: dto.sourceChannel,

      // Content
      details: dto.details,
      summary: dto.summary,

      // Reporter
      reporterType: dto.reporterType,
      anonymousAccessCode: dto.anonymousAccessCode,
      reporterName: dto.reporterName,
      reporterEmail: dto.reporterEmail,
      reporterPhone: dto.reporterPhone,

      // Classification
      categoryId: dto.categoryId,
      severity: dto.severity,

      // Location
      locationName: dto.locationName,
      locationAddress: dto.locationAddress,
      locationCity: dto.locationCity,
      locationState: dto.locationState,
      locationZip: dto.locationZip,
      locationCountry: dto.locationCountry,

      // Campaign
      campaignId: dto.campaignId,
      campaignAssignmentId: dto.campaignAssignmentId,

      // Custom Data
      customFields: dto.customFields as Prisma.InputJsonValue,
      formResponses: dto.formResponses as Prisma.InputJsonValue,

      // Migration
      sourceSystem: dto.sourceSystem,
      sourceRecordId: dto.sourceRecordId,

      // Language
      languageDetected: dto.languageDetected,
      languageConfirmed: dto.languageConfirmed,
      languageEffective,

      // Demo support
      demoUserSessionId: dto.demoUserSessionId,
      isBaseData: dto.isBaseData,
    };

    const riu = await this.prisma.riskIntelligenceUnit.create({ data });

    // Log activity with natural language description
    await this.activityService.log({
      entityType: AuditEntityType.RIU,
      entityId: riu.id,
      action: "created",
      actionDescription: `Created RIU ${referenceNumber} via ${riu.sourceChannel}`,
      actorUserId: userId,
      organizationId,
    });

    // Emit event for subscribers (audit, search indexing, notifications)
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
   * Returns paginated list of RIUs for the current organization.
   */
  async findAll(
    query: RiuQueryDto,
    organizationId: string,
  ): Promise<{
    data: RiskIntelligenceUnit[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const {
      limit = 20,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const where = this.buildWhereClause(query, organizationId);

    const [data, total] = await Promise.all([
      this.prisma.riskIntelligenceUnit.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          category: {
            select: { id: true, name: true, code: true },
          },
        },
      }),
      this.prisma.riskIntelligenceUnit.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  /**
   * Returns a single RIU by ID.
   * Throws NotFoundException if not found or belongs to different org.
   */
  async findOne(
    id: string,
    organizationId: string,
  ): Promise<RiskIntelligenceUnit> {
    const riu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        category: {
          select: { id: true, name: true, code: true },
        },
        caseAssociations: {
          include: {
            case: {
              select: { id: true, referenceNumber: true, status: true },
            },
          },
        },
      },
    });

    if (!riu) {
      throw new NotFoundException(`RIU with ID ${id} not found`);
    }

    return riu;
  }

  /**
   * Finds a RIU by reference number.
   */
  async findByReferenceNumber(
    referenceNumber: string,
    organizationId: string,
  ): Promise<RiskIntelligenceUnit> {
    const riu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: {
        referenceNumber,
        organizationId,
      },
    });

    if (!riu) {
      throw new NotFoundException(`RIU ${referenceNumber} not found`);
    }

    return riu;
  }

  /**
   * Finds a RIU by anonymous access code.
   * Used for anonymous reporters to check status.
   */
  async findByAccessCode(
    accessCode: string,
    organizationId: string,
  ): Promise<RiskIntelligenceUnit | null> {
    return this.prisma.riskIntelligenceUnit.findFirst({
      where: {
        anonymousAccessCode: accessCode,
        organizationId,
      },
      select: {
        id: true,
        referenceNumber: true,
        status: true,
        type: true,
        sourceChannel: true,
        reporterType: true,
        anonymousAccessCode: true,
        severity: true,
        createdAt: true,
        // Don't include sensitive content for anonymous access
      } as Prisma.RiskIntelligenceUnitSelect,
    });
  }

  /**
   * Updates a RIU - ENFORCES IMMUTABILITY.
   *
   * Only status, language handling, and AI enrichment fields can be modified.
   * Attempts to modify immutable fields will throw BadRequestException.
   *
   * @throws BadRequestException if attempting to modify immutable fields
   */
  async update(
    id: string,
    dto: UpdateRiuDto,
    userId: string,
    organizationId: string,
  ): Promise<RiskIntelligenceUnit> {
    // Check for attempts to modify immutable fields
    const attemptedImmutableChanges = getImmutableFieldsInObject(dto);

    if (attemptedImmutableChanges.length > 0) {
      throw new BadRequestException(
        `Cannot modify immutable RIU fields: ${attemptedImmutableChanges.join(", ")}. ` +
          `RIU content is frozen at intake. Corrections should go on the linked Case.`,
      );
    }

    // Verify RIU exists and belongs to this org
    const existing = await this.findOne(id, organizationId);

    // Track status change
    const statusChanged = dto.status && dto.status !== existing.status;
    const oldStatus = existing.status;

    // Build update data
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
    // Recompute effective language if either changed
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

    // Log status change if applicable
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

      // Emit status change event
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
   * Validates status transitions and tracks changes.
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
   * Updates AI enrichment fields - allowed even though content is immutable.
   * This is a system operation, not a user correction.
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
    // Verify RIU exists
    await this.findOne(id, organizationId);

    const updated = await this.prisma.riskIntelligenceUnit.update({
      where: { id },
      data: {
        ...enrichment,
        aiGeneratedAt: new Date(),
      },
    });

    // Emit AI enrichment event
    this.emitEvent("riu.ai.enriched", {
      organizationId,
      riuId: id,
      aiModelVersion: enrichment.aiModelVersion,
    });

    return updated;
  }

  /**
   * Returns a single RIU by ID with its type-specific extension.
   * Includes the appropriate extension based on RIU type.
   */
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
    const riu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        category: {
          select: { id: true, name: true, code: true },
        },
        caseAssociations: {
          include: {
            case: {
              select: { id: true, referenceNumber: true, status: true },
            },
          },
        },
        hotlineExtension: true,
        disclosureExtension: true,
        webFormExtension: true,
      },
    });

    if (!riu) {
      throw new NotFoundException(`RIU with ID ${id} not found`);
    }

    return riu;
  }

  /**
   * Creates a type-specific extension for an RIU based on its type.
   * Factory method that routes to the appropriate extension service.
   *
   * @param riuId - The RIU ID
   * @param type - The RIU type
   * @param extensionData - Type-specific extension data
   * @param organizationId - The organization ID
   * @param thresholdConfig - Optional threshold config for disclosures
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

  /**
   * Updates language fields.
   * languageEffective is automatically computed.
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

  /**
   * Generates next reference number for organization.
   * Format: RIU-YYYY-NNNNN
   */
  private async generateReferenceNumber(
    organizationId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `RIU-${year}-`;

    // Find the highest reference number for this year and org
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

  /**
   * Builds Prisma where clause from query parameters.
   */
  private buildWhereClause(
    query: RiuQueryDto,
    organizationId: string,
  ): Prisma.RiskIntelligenceUnitWhereInput {
    const where: Prisma.RiskIntelligenceUnitWhereInput = {
      organizationId,
    };

    // Type filters
    if (query.type) {
      where.type = query.type;
    }

    if (query.sourceChannel) {
      where.sourceChannel = query.sourceChannel;
    }

    if (query.reporterType) {
      where.reporterType = query.reporterType;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.severity) {
      where.severity = query.severity;
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.createdById) {
      where.createdById = query.createdById;
    }

    // Date range filters
    if (query.createdAfter || query.createdBefore) {
      const dateFilter: Prisma.DateTimeFilter = {};

      if (query.createdAfter) {
        dateFilter.gte = new Date(query.createdAfter);
      }

      if (query.createdBefore) {
        dateFilter.lte = new Date(query.createdBefore);
      }

      where.createdAt = dateFilter;
    }

    // Text search on reference number
    if (query.search) {
      where.referenceNumber = {
        contains: query.search,
        mode: "insensitive",
      };
    }

    return where;
  }

  /**
   * Returns RIU intake form data structured by logical sections.
   * Section structure varies by RIU type.
   */
  async getFormData(
    organizationId: string,
    riuId: string,
  ): Promise<RiuFormDataResponse> {
    const riu = await this.prisma.riskIntelligenceUnit.findFirst({
      where: { id: riuId, organizationId },
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        hotlineExtension: true,
        disclosureExtension: true,
        webFormExtension: true,
      },
    });

    if (!riu) {
      throw new NotFoundException(`RIU with ID ${riuId} not found`);
    }

    return this.structureFormData(riu);
  }

  /**
   * Structures RIU data into sections based on RIU type
   */
  private structureFormData(
    riu: RiskIntelligenceUnit & {
      category?: { id: string; name: string; code: string | null } | null;
      createdBy?: { id: string; firstName: string; lastName: string } | null;
      hotlineExtension?: {
        callDuration: number | null;
        interpreterUsed: boolean;
        interpreterLanguage: string | null;
        callerDemeanor: string | null;
        callbackRequested: boolean;
        callbackNumber: string | null;
        operatorNotes: string | null;
        qaStatus: string;
      } | null;
      disclosureExtension?: {
        disclosureType: string;
        disclosureSubtype: string | null;
        disclosureValue: unknown;
        disclosureCurrency: string | null;
        relatedPersonName: string | null;
        relatedCompany: string | null;
        relationshipType: string | null;
        effectiveDate: Date | null;
        expirationDate: Date | null;
        thresholdTriggered: boolean;
        conflictDetected: boolean;
        conflictReason: string | null;
      } | null;
      webFormExtension?: {
        formName: string | null;
        submissionSource: string | null;
        submissionDuration: number | null;
        attachmentCount: number;
      } | null;
    },
  ): RiuFormDataResponse {
    const sections: FormSection[] = [];

    switch (riu.type) {
      case RiuType.HOTLINE_REPORT:
        sections.push(...this.buildHotlineSections(riu));
        break;
      case RiuType.WEB_FORM_SUBMISSION:
        sections.push(...this.buildWebFormSections(riu));
        break;
      case RiuType.DISCLOSURE_RESPONSE:
        sections.push(...this.buildDisclosureSections(riu));
        break;
      default:
        sections.push(...this.buildGenericSections(riu));
    }

    return {
      riuId: riu.id,
      riuType: riu.type,
      referenceNumber: riu.referenceNumber,
      sections,
    };
  }

  /**
   * Build sections for HOTLINE_REPORT type
   */
  private buildHotlineSections(
    riu: RiskIntelligenceUnit & {
      category?: { id: string; name: string; code: string | null } | null;
      hotlineExtension?: {
        callDuration: number | null;
        interpreterUsed: boolean;
        interpreterLanguage: string | null;
        callerDemeanor: string | null;
        callbackRequested: boolean;
        callbackNumber: string | null;
        operatorNotes: string | null;
        qaStatus: string;
      } | null;
    },
  ): FormSection[] {
    const sections: FormSection[] = [];
    const ext = riu.hotlineExtension;

    // Report Information Section
    sections.push({
      id: "report-info",
      title: "Report Information",
      fields: [
        this.createField("Reference Number", riu.referenceNumber, "text"),
        this.createField(
          "Source Channel",
          this.formatSourceChannel(riu.sourceChannel),
          "text",
        ),
        this.createField("Created At", riu.createdAt, "datetime"),
        this.createField("Status", this.formatStatus(riu.status), "text"),
        ext?.callDuration
          ? this.createField(
              "Call Duration",
              `${Math.floor(ext.callDuration / 60)}m ${ext.callDuration % 60}s`,
              "text",
            )
          : null,
      ].filter((f): f is FormField => f !== null),
    });

    // Reporter Details Section
    sections.push({
      id: "reporter-details",
      title: "Reporter Details",
      fields: [
        this.createField(
          "Reporter Type",
          this.formatReporterType(riu.reporterType),
          "text",
        ),
        riu.reporterName
          ? this.createField("Reporter Name", riu.reporterName, "text")
          : null,
        riu.reporterEmail
          ? this.createField("Reporter Email", riu.reporterEmail, "text")
          : null,
        riu.reporterPhone
          ? this.createField("Reporter Phone", riu.reporterPhone, "text")
          : null,
        ext?.callbackRequested
          ? this.createField(
              "Callback Requested",
              ext.callbackRequested,
              "boolean",
            )
          : null,
        ext?.callbackNumber
          ? this.createField("Callback Number", ext.callbackNumber, "text")
          : null,
      ].filter((f): f is FormField => f !== null),
    });

    // Incident Details Section
    sections.push({
      id: "incident-details",
      title: "Incident Details",
      fields: [
        this.createField("Details", riu.details, "textarea"),
        riu.summary
          ? this.createField("Summary", riu.summary, "textarea")
          : null,
        this.buildLocationField(riu),
        ext?.callerDemeanor
          ? this.createField("Caller Demeanor", ext.callerDemeanor, "text")
          : null,
        ext?.interpreterUsed
          ? this.createField("Interpreter Used", ext.interpreterUsed, "boolean")
          : null,
        ext?.interpreterLanguage
          ? this.createField(
              "Interpreter Language",
              ext.interpreterLanguage,
              "text",
            )
          : null,
      ].filter((f): f is FormField => f !== null),
    });

    // Classification Section
    sections.push({
      id: "classification",
      title: "Classification",
      fields: [
        riu.category
          ? this.createField("Category", riu.category.name, "text")
          : null,
        this.createField("Severity", riu.severity, "text"),
      ].filter((f): f is FormField => f !== null),
    });

    // Processing Section (hotline-specific)
    if (ext) {
      sections.push({
        id: "processing",
        title: "Processing",
        fields: [
          this.createField(
            "QA Status",
            this.formatQaStatus(ext.qaStatus),
            "text",
          ),
          ext.operatorNotes
            ? this.createField("Operator Notes", ext.operatorNotes, "textarea")
            : null,
        ].filter((f): f is FormField => f !== null),
      });
    }

    // Custom Fields Section (if any)
    const customSection = this.buildCustomFieldsSection(riu);
    if (customSection.fields.length > 0) {
      sections.push(customSection);
    }

    return sections;
  }

  /**
   * Build sections for WEB_FORM_SUBMISSION type
   */
  private buildWebFormSections(
    riu: RiskIntelligenceUnit & {
      category?: { id: string; name: string; code: string | null } | null;
      webFormExtension?: {
        formName: string | null;
        submissionSource: string | null;
        submissionDuration: number | null;
        attachmentCount: number;
      } | null;
    },
  ): FormSection[] {
    const sections: FormSection[] = [];
    const ext = riu.webFormExtension;

    // Submission Information Section
    sections.push({
      id: "submission-info",
      title: "Submission Information",
      fields: [
        this.createField("Reference Number", riu.referenceNumber, "text"),
        ext?.formName
          ? this.createField("Form Name", ext.formName, "text")
          : null,
        this.createField(
          "Source Channel",
          this.formatSourceChannel(riu.sourceChannel),
          "text",
        ),
        ext?.submissionSource
          ? this.createField("Submission Source", ext.submissionSource, "text")
          : null,
        this.createField("Submitted At", riu.createdAt, "datetime"),
        ext?.submissionDuration
          ? this.createField(
              "Time to Complete",
              `${Math.floor(ext.submissionDuration / 60)}m ${ext.submissionDuration % 60}s`,
              "text",
            )
          : null,
        ext?.attachmentCount !== undefined
          ? this.createField("Attachments", ext.attachmentCount, "number")
          : null,
      ].filter((f): f is FormField => f !== null),
    });

    // Reporter Details Section
    sections.push({
      id: "reporter-details",
      title: "Reporter Details",
      fields: [
        this.createField(
          "Reporter Type",
          this.formatReporterType(riu.reporterType),
          "text",
        ),
        riu.reporterName
          ? this.createField("Reporter Name", riu.reporterName, "text")
          : null,
        riu.reporterEmail
          ? this.createField("Reporter Email", riu.reporterEmail, "text")
          : null,
        riu.reporterPhone
          ? this.createField("Reporter Phone", riu.reporterPhone, "text")
          : null,
      ].filter((f): f is FormField => f !== null),
    });

    // Report Details Section
    sections.push({
      id: "report-details",
      title: "Report Details",
      fields: [
        this.createField("Details", riu.details, "textarea"),
        riu.summary
          ? this.createField("Summary", riu.summary, "textarea")
          : null,
        this.buildLocationField(riu),
      ].filter((f): f is FormField => f !== null),
    });

    // Classification Section
    sections.push({
      id: "classification",
      title: "Classification",
      fields: [
        riu.category
          ? this.createField("Category", riu.category.name, "text")
          : null,
        this.createField("Severity", riu.severity, "text"),
        this.createField("Status", this.formatStatus(riu.status), "text"),
      ].filter((f): f is FormField => f !== null),
    });

    // Custom Fields Section (if any)
    const customSection = this.buildCustomFieldsSection(riu);
    if (customSection.fields.length > 0) {
      sections.push(customSection);
    }

    return sections;
  }

  /**
   * Build sections for DISCLOSURE_RESPONSE type
   */
  private buildDisclosureSections(
    riu: RiskIntelligenceUnit & {
      category?: { id: string; name: string; code: string | null } | null;
      disclosureExtension?: {
        disclosureType: string;
        disclosureSubtype: string | null;
        disclosureValue: unknown;
        disclosureCurrency: string | null;
        relatedPersonName: string | null;
        relatedCompany: string | null;
        relationshipType: string | null;
        effectiveDate: Date | null;
        expirationDate: Date | null;
        thresholdTriggered: boolean;
        conflictDetected: boolean;
        conflictReason: string | null;
      } | null;
    },
  ): FormSection[] {
    const sections: FormSection[] = [];
    const ext = riu.disclosureExtension;

    // Disclosure Information Section
    sections.push({
      id: "disclosure-info",
      title: "Disclosure Information",
      fields: [
        this.createField("Reference Number", riu.referenceNumber, "text"),
        ext
          ? this.createField(
              "Disclosure Type",
              this.formatDisclosureType(ext.disclosureType),
              "text",
            )
          : null,
        ext?.disclosureSubtype
          ? this.createField("Subtype", ext.disclosureSubtype, "text")
          : null,
        this.createField("Submitted At", riu.createdAt, "datetime"),
        this.createField("Status", this.formatStatus(riu.status), "text"),
      ].filter((f): f is FormField => f !== null),
    });

    // Disclosure Details Section
    if (ext) {
      sections.push({
        id: "disclosure-details",
        title: "Disclosure Details",
        fields: [
          this.createField("Details", riu.details, "textarea"),
          ext.disclosureValue !== null && ext.disclosureValue !== undefined
            ? this.createField(
                "Value",
                this.formatCurrency(
                  ext.disclosureValue,
                  ext.disclosureCurrency,
                ),
                "currency",
              )
            : null,
          ext.relatedPersonName
            ? this.createField("Related Person", ext.relatedPersonName, "text")
            : null,
          ext.relatedCompany
            ? this.createField("Related Company", ext.relatedCompany, "text")
            : null,
          ext.relationshipType
            ? this.createField(
                "Relationship Type",
                ext.relationshipType,
                "text",
              )
            : null,
          ext.effectiveDate
            ? this.createField("Effective Date", ext.effectiveDate, "date")
            : null,
          ext.expirationDate
            ? this.createField("Expiration Date", ext.expirationDate, "date")
            : null,
        ].filter((f): f is FormField => f !== null),
      });

      // Review Status Section
      sections.push({
        id: "review-status",
        title: "Review Status",
        fields: [
          this.createField(
            "Threshold Triggered",
            ext.thresholdTriggered,
            "boolean",
          ),
          this.createField(
            "Conflict Detected",
            ext.conflictDetected,
            "boolean",
          ),
          ext.conflictReason
            ? this.createField(
                "Conflict Reason",
                ext.conflictReason,
                "textarea",
              )
            : null,
        ].filter((f): f is FormField => f !== null),
      });
    }

    // Classification Section
    sections.push({
      id: "classification",
      title: "Classification",
      fields: [
        riu.category
          ? this.createField("Category", riu.category.name, "text")
          : null,
        this.createField("Severity", riu.severity, "text"),
      ].filter((f): f is FormField => f !== null),
    });

    // Custom Fields Section (if any)
    const customSection = this.buildCustomFieldsSection(riu);
    if (customSection.fields.length > 0) {
      sections.push(customSection);
    }

    return sections;
  }

  /**
   * Build generic sections for other RIU types (fallback)
   */
  private buildGenericSections(
    riu: RiskIntelligenceUnit & {
      category?: { id: string; name: string; code: string | null } | null;
    },
  ): FormSection[] {
    const sections: FormSection[] = [];

    // Basic Information Section
    sections.push({
      id: "basic-info",
      title: "Report Information",
      fields: [
        this.createField("Reference Number", riu.referenceNumber, "text"),
        this.createField("Type", riu.type, "text"),
        this.createField(
          "Source Channel",
          this.formatSourceChannel(riu.sourceChannel),
          "text",
        ),
        this.createField("Created At", riu.createdAt, "datetime"),
        this.createField("Status", this.formatStatus(riu.status), "text"),
      ],
    });

    // Content Section
    sections.push({
      id: "content",
      title: "Details",
      fields: [
        this.createField("Details", riu.details, "textarea"),
        riu.summary
          ? this.createField("Summary", riu.summary, "textarea")
          : null,
      ].filter((f): f is FormField => f !== null),
    });

    // Classification Section
    sections.push({
      id: "classification",
      title: "Classification",
      fields: [
        riu.category
          ? this.createField("Category", riu.category.name, "text")
          : null,
        this.createField("Severity", riu.severity, "text"),
      ].filter((f): f is FormField => f !== null),
    });

    return sections;
  }

  /**
   * Build custom fields section from RIU customFields JSON
   */
  private buildCustomFieldsSection(riu: RiskIntelligenceUnit): FormSection {
    const fields: FormField[] = [];

    if (riu.customFields && typeof riu.customFields === "object") {
      const customData = riu.customFields as Record<string, unknown>;
      for (const [key, value] of Object.entries(customData)) {
        if (value !== null && value !== undefined && value !== "") {
          const label = this.formatFieldLabel(key);
          const fieldType = this.inferFieldType(value);
          fields.push(
            this.createField(
              label,
              value as string | number | boolean,
              fieldType,
            ),
          );
        }
      }
    }

    if (riu.formResponses && typeof riu.formResponses === "object") {
      const formData = riu.formResponses as Record<string, unknown>;
      for (const [key, value] of Object.entries(formData)) {
        if (value !== null && value !== undefined && value !== "") {
          const label = this.formatFieldLabel(key);
          const fieldType = this.inferFieldType(value);
          fields.push(
            this.createField(
              label,
              value as string | number | boolean,
              fieldType,
            ),
          );
        }
      }
    }

    return {
      id: "custom-fields",
      title: "Additional Information",
      fields,
    };
  }

  /**
   * Helper to create a form field
   */
  private createField(
    label: string,
    value: string | number | boolean | Date | null,
    type: FormFieldType,
  ): FormField {
    let formattedValue: string | string[] | number | boolean | null = null;

    if (value === null || value === undefined) {
      formattedValue = null;
    } else if (value instanceof Date) {
      formattedValue = value.toISOString();
    } else if (typeof value === "boolean") {
      formattedValue = value;
    } else if (typeof value === "number") {
      formattedValue = value;
    } else {
      formattedValue = String(value);
    }

    return { label, value: formattedValue, type };
  }

  /**
   * Build location field from RIU location fields
   */
  private buildLocationField(riu: RiskIntelligenceUnit): FormField | null {
    const parts = [
      riu.locationName,
      riu.locationAddress,
      riu.locationCity,
      riu.locationState,
      riu.locationZip,
      riu.locationCountry,
    ].filter((p) => p !== null && p !== undefined && p !== "");

    if (parts.length === 0) {
      return null;
    }

    return this.createField("Location", parts.join(", "), "text");
  }

  /**
   * Format source channel for display
   */
  private formatSourceChannel(channel: string): string {
    const channelMap: Record<string, string> = {
      HOTLINE: "Phone",
      WEB_FORM: "Web Form",
      PROXY: "Proxy",
      DIRECT_ENTRY: "Direct Entry",
      CHATBOT: "Chatbot",
      EMAIL: "Email",
      FAX: "Fax",
    };
    return channelMap[channel] || channel;
  }

  /**
   * Format status for display
   */
  private formatStatus(status: string): string {
    const statusMap: Record<string, string> = {
      PENDING_QA: "Pending QA",
      RELEASED: "Released",
      ARCHIVED: "Archived",
    };
    return statusMap[status] || status;
  }

  /**
   * Format reporter type for display
   */
  private formatReporterType(type: string): string {
    const typeMap: Record<string, string> = {
      ANONYMOUS: "Anonymous",
      IDENTIFIED: "Identified",
      CONFIDENTIAL: "Confidential",
    };
    return typeMap[type] || type;
  }

  /**
   * Format QA status for display
   */
  private formatQaStatus(status: string): string {
    const statusMap: Record<string, string> = {
      PENDING: "Pending",
      APPROVED: "Approved",
      REJECTED: "Rejected",
      NEEDS_REVISION: "Needs Revision",
    };
    return statusMap[status] || status;
  }

  /**
   * Format disclosure type for display
   */
  private formatDisclosureType(type: string): string {
    const typeMap: Record<string, string> = {
      COI: "Conflict of Interest",
      GIFT_ENTERTAINMENT: "Gift & Entertainment",
      OUTSIDE_ACTIVITY: "Outside Activity",
      RELATIONSHIP: "Relationship Disclosure",
      FINANCIAL_INTEREST: "Financial Interest",
      OTHER: "Other",
    };
    return typeMap[type] || type;
  }

  /**
   * Format currency value
   */
  private formatCurrency(value: unknown, currency?: string | null): string {
    if (value === null || value === undefined) return "";
    const numValue =
      typeof value === "number" ? value : parseFloat(String(value));
    if (isNaN(numValue)) return String(value);
    const currencyCode = currency || "USD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
    }).format(numValue);
  }

  /**
   * Format field label from camelCase or snake_case to Title Case
   */
  private formatFieldLabel(key: string): string {
    return key
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /**
   * Infer field type from value
   */
  private inferFieldType(value: unknown): FormFieldType {
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number") return "number";
    if (Array.isArray(value)) return "multiselect";
    if (typeof value === "string") {
      if (value.length > 100) return "textarea";
      if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return "datetime";
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return "date";
    }
    return "text";
  }

  /**
   * Safely emits an event. Failures are logged but don't crash the request.
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
