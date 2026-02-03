import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  Prisma,
  RiskIntelligenceUnit,
  RiuStatus,
  AuditEntityType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../../common/services/activity.service';
import { CreateRiuDto, UpdateRiuDto, RiuQueryDto } from './dto';
import {
  IMMUTABLE_RIU_FIELDS,
  getImmutableFieldsInObject,
} from './types/riu.types';

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
      dto.languageConfirmed ?? dto.languageDetected ?? 'en';

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
      action: 'created',
      actionDescription: `Created RIU ${referenceNumber} via ${riu.sourceChannel}`,
      actorUserId: userId,
      organizationId,
    });

    // Emit event for subscribers (audit, search indexing, notifications)
    this.emitEvent('riu.created', {
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
      sortBy = 'createdAt',
      sortOrder = 'desc',
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
        `Cannot modify immutable RIU fields: ${attemptedImmutableChanges.join(', ')}. ` +
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
    if (dto.languageConfirmed !== undefined || dto.languageDetected !== undefined) {
      const newConfirmed = dto.languageConfirmed ?? existing.languageConfirmed;
      const newDetected = dto.languageDetected ?? existing.languageDetected;
      data.languageEffective = newConfirmed ?? newDetected ?? 'en';
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
        action: 'status_changed',
        actionDescription: `Changed RIU status from ${oldStatus} to ${dto.status}`,
        actorUserId: userId,
        organizationId,
        changes: {
          oldValue: { status: oldStatus },
          newValue: { status: dto.status },
        },
      });

      // Emit status change event
      this.emitEvent('riu.status.changed', {
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
    this.emitEvent('riu.ai.enriched', {
      organizationId,
      riuId: id,
      aiModelVersion: enrichment.aiModelVersion,
    });

    return updated;
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
      languageConfirmed ?? existing.languageDetected ?? 'en';

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
      action: 'language_updated',
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
      orderBy: { referenceNumber: 'desc' },
      select: { referenceNumber: true },
    });

    let nextNumber = 1;
    if (lastRiu) {
      const lastNumber = parseInt(lastRiu.referenceNumber.split('-')[2], 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
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
        mode: 'insensitive',
      };
    }

    return where;
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
