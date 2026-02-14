/**
 * EthicsPortalService - Public Report Submission
 *
 * Provides services for the Ethics Portal public API:
 * - Anonymous report submission
 * - Category/form retrieval for report configuration
 * - Attachment handling with sensitivity tagging
 * - Draft save/resume for cross-device support
 * - Tenant configuration retrieval
 *
 * CRITICAL: This service handles PUBLIC endpoints.
 * - No authentication required
 * - Tenant isolation via slug lookup
 * - Rate limiting enforced at controller level
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import {
  RiuType,
  RiuSourceChannel,
  RiuReporterType,
  Severity,
  AttachmentEntityType,
} from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { RiusService } from "../../rius/rius.service";
import { RiuAccessService } from "../../rius/riu-access.service";
import { FormSchemaService } from "../../forms/form-schema.service";
import { BrandingService } from "../../branding/branding.service";
import { MessageRelayService } from "../../messaging/relay.service";
import { SubmitReportDto, SaveDraftDto } from "./dto/submit-report.dto";
import {
  SubmissionResult,
  CategoryInfo,
  TenantEthicsConfig,
  AttachmentResult,
  DraftReport,
  ReportStatus,
  Message,
  STATUS_LABEL_MAP,
  STATUS_DESCRIPTION_MAP,
} from "./types/ethics-portal.types";
import { customAlphabet } from "nanoid";

/** Cache TTL for tenant config (5 minutes) */
const CONFIG_CACHE_TTL = 5 * 60 * 1000;

/** Draft code alphabet (readable, no confusing chars) */
const DRAFT_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const generateDraftCode = customAlphabet(DRAFT_CODE_ALPHABET, 12);

/** Draft expiration time (24 hours) */
const DRAFT_EXPIRATION_HOURS = 24;

/**
 * Service for Ethics Portal public API operations.
 */
@Injectable()
export class EthicsPortalService {
  private readonly logger = new Logger(EthicsPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly riusService: RiusService,
    private readonly riuAccessService: RiuAccessService,
    private readonly formSchemaService: FormSchemaService,
    private readonly brandingService: BrandingService,
    private readonly relayService: MessageRelayService,
    private readonly eventEmitter: EventEmitter2,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Submit a new report via Ethics Portal.
   *
   * Creates an RIU with:
   * - source: WEB_FORM
   * - type: inferred from category (REPORT, DISCLOSURE, REQUEST_FOR_INFO)
   * - anonymityTier: from DTO
   * - Generated access code for status checks
   *
   * @param tenantSlug - Organization slug
   * @param dto - Report submission data
   * @returns Submission result with access code
   */
  async submitReport(
    tenantSlug: string,
    dto: SubmitReportDto,
  ): Promise<SubmissionResult> {
    // Resolve tenant slug to organization
    const org = await this.resolveOrganization(tenantSlug);

    // Validate category exists for this organization
    const category = await this.prisma.category.findFirst({
      where: {
        id: dto.categoryId,
        organizationId: org.id,
        isActive: true,
      },
    });

    if (!category) {
      throw new BadRequestException(`Invalid category: ${dto.categoryId}`);
    }

    // Validate anonymity tier requirements
    this.validateAnonymityTier(dto);

    // Generate access code for anonymous status checks
    const accessCode = await this.riuAccessService.generateAccessCode();

    // Infer RIU type from category
    const riuType = this.inferRiuType(category);

    // Create RIU via RiusService
    // For public submissions, use a system user ID
    const systemUserId = await this.getSystemUserId(org.id);

    const riu = await this.riusService.create(
      {
        type: riuType,
        sourceChannel: RiuSourceChannel.WEB_FORM,
        details: dto.content,
        summary: dto.summary,
        reporterType: dto.anonymityTier,
        anonymousAccessCode: accessCode,
        reporterName: dto.reporterContact?.name,
        reporterEmail: dto.reporterContact?.email,
        reporterPhone: dto.reporterContact?.phone,
        categoryId: dto.categoryId,
        severity: dto.urgencyFlag ? Severity.HIGH : Severity.MEDIUM,
        locationName: dto.incidentLocation?.name,
        locationAddress: dto.incidentLocation?.address,
        locationCity: dto.incidentLocation?.city,
        locationState: dto.incidentLocation?.state,
        locationZip: dto.incidentLocation?.zip,
        locationCountry: dto.incidentLocation?.country,
        formResponses: dto.formResponses,
        customFields: dto.demographics,
      },
      systemUserId,
      org.id,
    );

    // Link temporary attachments to the RIU
    if (dto.attachmentIds && dto.attachmentIds.length > 0) {
      await this.linkAttachmentsToRiu(
        org.id,
        riu.id,
        dto.attachmentIds,
        systemUserId,
      );
    }

    // Emit event for analytics and notifications
    this.emitEvent("ethics_portal.report_submitted", {
      organizationId: org.id,
      riuId: riu.id,
      referenceNumber: riu.referenceNumber,
      categoryId: dto.categoryId,
      anonymityTier: dto.anonymityTier,
      hasAttachments: (dto.attachmentIds?.length ?? 0) > 0,
    });

    this.logger.log(
      `Report submitted: ${riu.referenceNumber} for org ${tenantSlug}`,
    );

    return {
      accessCode,
      reportId: riu.id,
      confirmationNumber: riu.referenceNumber,
      referenceNumber: riu.referenceNumber,
      submittedAt: riu.createdAt,
      statusMessage:
        "Your report has been received. Save your access code to check status.",
    };
  }

  /**
   * Get categories available for report submission.
   *
   * @param tenantSlug - Organization slug
   * @returns Category tree structure
   */
  async getCategoriesForTenant(tenantSlug: string): Promise<CategoryInfo[]> {
    const org = await this.resolveOrganization(tenantSlug);

    // Get all active categories for organization
    const categories = await this.prisma.category.findMany({
      where: {
        organizationId: org.id,
        isActive: true,
      },
      orderBy: [
        { parentCategoryId: "asc" },
        { sortOrder: "asc" },
        { name: "asc" },
      ],
    });

    // Build tree structure
    const categoryMap = new Map<string, CategoryInfo>();
    const rootCategories: CategoryInfo[] = [];

    // First pass: create all category info objects
    for (const cat of categories) {
      const info: CategoryInfo = {
        id: cat.id,
        name: cat.name,
        description: cat.description,
        parentId: cat.parentCategoryId,
        // Form schema derived from moduleConfig if present
        formSchemaId:
          ((cat.moduleConfig as Record<string, unknown>)?.formSchemaId as
            | string
            | null) ?? null,
        icon: cat.icon,
        isActive: cat.isActive,
        children: [],
      };
      categoryMap.set(cat.id, info);
    }

    // Second pass: build tree structure
    for (const cat of categories) {
      const info = categoryMap.get(cat.id)!;
      if (cat.parentCategoryId && categoryMap.has(cat.parentCategoryId)) {
        const parent = categoryMap.get(cat.parentCategoryId)!;
        parent.children!.push(info);
      } else {
        rootCategories.push(info);
      }
    }

    return rootCategories;
  }

  /**
   * Get form schema for a specific category.
   *
   * @param tenantSlug - Organization slug
   * @param categoryId - Category UUID
   * @returns JSON Schema and UI Schema for the form
   */
  async getFormSchema(
    tenantSlug: string,
    categoryId: string,
  ): Promise<{
    schema: object;
    uiSchema: object | null;
    defaultValues: object | null;
  }> {
    const org = await this.resolveOrganization(tenantSlug);

    // Get category with form schema reference
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        organizationId: org.id,
        isActive: true,
      },
    });

    if (!category) {
      throw new NotFoundException(`Category ${categoryId} not found`);
    }

    // Check if category has a specific form schema in moduleConfig
    const formSchemaId = (category.moduleConfig as Record<string, unknown>)
      ?.formSchemaId as string | undefined;

    // If category has a specific form schema, fetch it
    if (formSchemaId) {
      const formDef = await this.formSchemaService.findById(
        org.id,
        formSchemaId,
      );
      return {
        schema: formDef.schema as object,
        uiSchema: (formDef.uiSchema as object) || null,
        defaultValues: (formDef.defaultValues as object) || null,
      };
    }

    // Return base schema for categories without specific forms
    return {
      schema: this.getBaseReportSchema(),
      uiSchema: null,
      defaultValues: null,
    };
  }

  /**
   * Upload an attachment for later inclusion in a report.
   *
   * Attachments are stored temporarily in cache until linked to an RIU.
   * For production, these would be stored in blob storage with cleanup.
   *
   * @param tenantSlug - Organization slug
   * @param file - Uploaded file
   * @param isSensitive - Whether file contains sensitive information
   * @returns Temporary attachment reference
   */
  async uploadAttachment(
    tenantSlug: string,
    file: Express.Multer.File,
    isSensitive: boolean,
  ): Promise<AttachmentResult> {
    const org = await this.resolveOrganization(tenantSlug);

    // Generate temporary ID for the attachment
    const tempId = `temp_${generateDraftCode()}_${Date.now()}`;

    // Store metadata in cache (file content would be in blob storage in production)
    const cacheKey = `temp_attachment:${org.id}:${tempId}`;
    await this.cacheManager.set(
      cacheKey,
      {
        id: tempId,
        organizationId: org.id,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        isSensitive,
        // In production, this would be a blob storage reference
        // For now, skip storing actual content
      },
      DRAFT_EXPIRATION_HOURS * 60 * 60 * 1000, // 24 hours
    );

    this.logger.debug(
      `Temporary attachment uploaded: ${tempId} (${file.originalname}, ${file.size} bytes)`,
    );

    return {
      tempId,
      fileName: file.originalname,
      size: file.size,
      contentType: file.mimetype,
      isSensitive,
    };
  }

  /**
   * Get tenant-specific Ethics Portal configuration.
   *
   * Cached for 5 minutes for performance.
   *
   * @param tenantSlug - Organization slug
   * @returns Portal configuration
   */
  async getTenantConfig(tenantSlug: string): Promise<TenantEthicsConfig> {
    const cacheKey = `ethics_config:${tenantSlug}`;

    // Check cache first
    const cached = await this.cacheManager.get<TenantEthicsConfig>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for ethics config: ${tenantSlug}`);
      return cached;
    }

    const org = await this.resolveOrganization(tenantSlug);

    // Get categories
    const categories = await this.getCategoriesForTenant(tenantSlug);

    // Get branding
    let branding: TenantEthicsConfig["branding"];
    try {
      const brandingConfig = await this.brandingService.getBrandingByOrgId(
        org.id,
      );
      branding = {
        logoUrl: brandingConfig.logoUrl,
        primaryColor: brandingConfig.primaryColor,
        footerText: brandingConfig.footerText,
      };
    } catch {
      branding = undefined;
    }

    // Extract welcome message from org settings
    const welcomeMessage =
      (org.settings?.ethicsPortalWelcomeMessage as string) ?? null;

    // Build config
    const config: TenantEthicsConfig = {
      tenantSlug,
      organizationName: org.name,
      isEnabled: true, // Could be controlled by org settings
      categories,
      welcomeMessage,
      anonymityOptions: {
        allowAnonymous: true,
        allowConfidential: true,
        allowOpen: true,
      },
      demographicFields: this.getDefaultDemographicFields(),
      branding,
    };

    // Cache result
    await this.cacheManager.set(cacheKey, config, CONFIG_CACHE_TTL);
    this.logger.debug(`Cached ethics config for: ${tenantSlug}`);

    return config;
  }

  /**
   * Save a draft report for later resume.
   *
   * Uses cache for storage with 24-hour expiration.
   * In production, this could be backed by Redis for cross-server support.
   *
   * @param tenantSlug - Organization slug
   * @param dto - Draft data
   * @returns Draft code for resume
   */
  async saveDraft(
    tenantSlug: string,
    dto: SaveDraftDto,
  ): Promise<{ draftCode: string; expiresAt: Date }> {
    await this.resolveOrganization(tenantSlug);

    const draftCode = `DRAFT-${generateDraftCode()}`;
    const expiresAt = new Date(
      Date.now() + DRAFT_EXPIRATION_HOURS * 60 * 60 * 1000,
    );

    // Store draft in cache
    const cacheKey = `ethics_draft:${tenantSlug}:${draftCode}`;
    await this.cacheManager.set(
      cacheKey,
      {
        draftCode,
        tenantSlug,
        data: dto,
        updatedAt: new Date(),
        expiresAt,
      },
      DRAFT_EXPIRATION_HOURS * 60 * 60 * 1000, // 24 hours
    );

    this.logger.debug(`Draft saved: ${draftCode} for org ${tenantSlug}`);

    return { draftCode, expiresAt };
  }

  /**
   * Retrieve a saved draft for resume.
   *
   * @param tenantSlug - Organization slug
   * @param draftCode - Draft code
   * @returns Draft data
   */
  async getDraft(tenantSlug: string, draftCode: string): Promise<DraftReport> {
    const cacheKey = `ethics_draft:${tenantSlug}:${draftCode}`;
    const draft = await this.cacheManager.get<DraftReport>(cacheKey);

    if (!draft) {
      throw new NotFoundException("Draft not found or expired");
    }

    return draft;
  }

  /**
   * Get report status by access code.
   *
   * @param accessCode - 12-character access code
   * @returns Report status
   */
  async getReportStatus(accessCode: string): Promise<ReportStatus> {
    const statusDto = await this.riuAccessService.checkStatus(accessCode);

    return {
      referenceNumber: statusDto.caseReferenceNumber ?? statusDto.accessCode,
      status: statusDto.status,
      statusLabel: STATUS_LABEL_MAP[statusDto.status] ?? "Processing",
      statusDescription:
        STATUS_DESCRIPTION_MAP[statusDto.status] ??
        "Your report is being processed.",
      canMessage: statusDto.caseLinked,
      hasUnreadMessages: statusDto.hasMessages,
      lastUpdated: statusDto.lastUpdatedAt,
    };
  }

  /**
   * Get messages for a report by access code.
   *
   * @param accessCode - 12-character access code
   * @returns Messages
   */
  async getMessages(accessCode: string): Promise<Message[]> {
    const messages = await this.relayService.getMessagesForReporter(accessCode);

    return messages.map((m) => ({
      id: m.id,
      direction: m.direction,
      content: m.content,
      createdAt: m.createdAt,
      readAt: m.readAt ?? null,
    }));
  }

  /**
   * Send a message from reporter via access code.
   *
   * @param accessCode - 12-character access code
   * @param content - Message content
   * @param attachmentIds - Optional attachment IDs
   */
  async sendMessage(
    accessCode: string,
    content: string,
    _attachmentIds?: string[],
  ): Promise<void> {
    await this.relayService.receiveFromReporter({
      accessCode,
      content,
    });

    // TODO: Handle attachmentIds when message attachments are implemented
  }

  // ============== Private Helper Methods ==============

  /**
   * Resolve organization from tenant slug.
   * @throws NotFoundException if organization not found
   */
  private async resolveOrganization(
    tenantSlug: string,
  ): Promise<{ id: string; name: string; settings: Record<string, unknown> }> {
    const org = await this.prisma.organization.findUnique({
      where: { slug: tenantSlug },
      select: {
        id: true,
        name: true,
        settings: true,
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization not found: ${tenantSlug}`);
    }

    return {
      id: org.id,
      name: org.name,
      settings: org.settings as Record<string, unknown>,
    };
  }

  /**
   * Validate anonymity tier requirements.
   * CONFIDENTIAL and OPEN require contact info.
   */
  private validateAnonymityTier(dto: SubmitReportDto): void {
    if (
      dto.anonymityTier !== RiuReporterType.ANONYMOUS &&
      !dto.reporterContact
    ) {
      throw new BadRequestException(
        `${dto.anonymityTier} reports require reporter contact information`,
      );
    }

    if (
      dto.anonymityTier !== RiuReporterType.ANONYMOUS &&
      dto.reporterContact &&
      !dto.reporterContact.email &&
      !dto.reporterContact.phone
    ) {
      throw new BadRequestException(
        "At least one contact method (email or phone) is required",
      );
    }
  }

  /**
   * Infer RIU type from category.
   */
  private inferRiuType(category: {
    code?: string | null;
    name: string;
  }): RiuType {
    const code = category.code?.toUpperCase() ?? "";
    const name = category.name.toUpperCase();

    // Check for disclosure-related categories
    if (
      code.includes("COI") ||
      code.includes("DISCLOSURE") ||
      name.includes("CONFLICT OF INTEREST") ||
      name.includes("DISCLOSURE")
    ) {
      return RiuType.DISCLOSURE_RESPONSE;
    }

    // Default to web form submission
    return RiuType.WEB_FORM_SUBMISSION;
  }

  /**
   * Get system user ID for public submissions.
   */
  private async getSystemUserId(organizationId: string): Promise<string> {
    // Find or create a system user for this organization
    let systemUser = await this.prisma.user.findFirst({
      where: {
        organizationId,
        email: "system@ethico.com",
      },
    });

    if (!systemUser) {
      systemUser = await this.prisma.user.create({
        data: {
          organizationId,
          email: "system@ethico.com",
          firstName: "System",
          lastName: "User",
          role: "SYSTEM_ADMIN",
          isActive: false, // System user cannot login
        },
      });
    }

    return systemUser.id;
  }

  /**
   * Link temporary attachments to an RIU.
   */
  private async linkAttachmentsToRiu(
    organizationId: string,
    riuId: string,
    tempIds: string[],
    systemUserId: string,
  ): Promise<void> {
    for (const tempId of tempIds) {
      const cacheKey = `temp_attachment:${organizationId}:${tempId}`;
      const tempAttachment = await this.cacheManager.get<{
        id: string;
        organizationId: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
        isSensitive: boolean;
      }>(cacheKey);

      if (tempAttachment) {
        // Create permanent attachment record
        // Note: RIU attachments are stored as CASE type since RIU will be linked to a Case
        await this.prisma.attachment.create({
          data: {
            organizationId,
            entityType: AttachmentEntityType.CASE,
            entityId: riuId, // Will be updated when RIU is linked to Case
            fileName: tempAttachment.fileName,
            fileKey: `riu/${riuId}/${tempId}-${tempAttachment.fileName}`,
            mimeType: tempAttachment.mimeType,
            fileSize: tempAttachment.fileSize,
            isEvidence: tempAttachment.isSensitive, // Map sensitive to evidence flag
            uploadedById: systemUserId,
          },
        });

        // Delete temporary cache entry
        await this.cacheManager.del(cacheKey);
      }
    }
  }

  /**
   * Get base report schema for categories without specific forms.
   */
  private getBaseReportSchema(): object {
    return {
      type: "object",
      properties: {
        content: {
          type: "string",
          title: "What would you like to report?",
          description: "Please provide as much detail as possible.",
          minLength: 10,
          maxLength: 50000,
        },
        incidentDate: {
          type: "string",
          format: "date",
          title: "When did this occur?",
        },
        incidentLocation: {
          type: "string",
          title: "Where did this occur?",
        },
        involvedParties: {
          type: "string",
          title: "Who was involved? (optional)",
          description: "Names or descriptions of people involved.",
        },
      },
      required: ["content"],
    };
  }

  /**
   * Get default demographic fields.
   */
  private getDefaultDemographicFields(): TenantEthicsConfig["demographicFields"] {
    return [
      {
        key: "department",
        label: "Department",
        required: false,
        type: "text",
      },
      {
        key: "location",
        label: "Location/Facility",
        required: false,
        type: "text",
      },
      {
        key: "employeeStatus",
        label: "Employment Status",
        required: false,
        type: "select",
        options: ["Current Employee", "Former Employee", "Contractor", "Other"],
      },
    ];
  }

  /**
   * Safely emit event - failures logged but don't crash request.
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
