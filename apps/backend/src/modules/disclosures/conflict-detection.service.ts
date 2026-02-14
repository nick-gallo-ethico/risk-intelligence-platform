/**
 * ConflictDetectionService - Coordinator for conflict detection operations
 *
 * Thin coordinator that delegates to:
 * - ConflictMatchingService: Fuzzy matching and individual conflict checks
 * - ConflictExclusionService: Exclusion management
 *
 * RS.41-RS.45: Six-way conflict detection, fuzzy matching, contextual
 * presentation, categorized dismissals, and entity timeline.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  ConflictType,
  ConflictStatus,
  ExclusionScope,
  ConflictAlert,
  Prisma,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import {
  ConflictAlertDto,
  ConflictCheckResult,
  DismissConflictDto,
  DismissalCategory,
  MatchDetails,
  SeverityFactors,
  EntityTimelineDto,
  EntityTimelineItem,
  EntityTimelineEventType,
  ConflictQueryDto,
  ConflictAlertPageDto,
  ConflictExclusionDto,
} from "./dto/conflict.dto";
import {
  ConflictMatchingService,
  FuzzyMatchConfig,
  DEFAULT_FUZZY_CONFIG,
  DetectedConflict,
} from "./services/conflict-matching.service";
import { ConflictExclusionService } from "./services/conflict-exclusion.service";

@Injectable()
export class ConflictDetectionService {
  private readonly logger = new Logger(ConflictDetectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly matchingService: ConflictMatchingService,
    private readonly exclusionService: ConflictExclusionService,
  ) {}

  // ===========================================
  // Main Detection Entry Point
  // ===========================================

  /**
   * Detects conflicts for a disclosure.
   * RS.41: Six-way conflict detection across systems.
   */
  async detectConflicts(
    disclosureId: string,
    personId: string,
    organizationId: string,
    config: Partial<FuzzyMatchConfig> = {},
  ): Promise<ConflictCheckResult> {
    const fuzzyConfig = { ...DEFAULT_FUZZY_CONFIG, ...config };

    this.logger.log(
      `Starting conflict detection for disclosure ${disclosureId}`,
    );

    // Get disclosure details
    const disclosure = await this.prisma.riuDisclosureExtension.findUnique({
      where: { riuId: disclosureId },
      include: {
        riu: {
          select: {
            id: true,
            referenceNumber: true,
            details: true,
          },
        },
      },
    });

    if (!disclosure) {
      throw new NotFoundException(`Disclosure ${disclosureId} not found`);
    }

    const detectedConflicts: DetectedConflict[] = [];
    const appliedExclusionIds: string[] = [];
    let excludedConflictCount = 0;

    // Get entity names to check from disclosure
    const entitiesToCheck: string[] = [];
    if (disclosure.relatedCompany) {
      entitiesToCheck.push(disclosure.relatedCompany);
    }
    if (disclosure.relatedPersonName) {
      entitiesToCheck.push(disclosure.relatedPersonName);
    }

    // Run all conflict detection checks
    for (const entityName of entitiesToCheck) {
      const conflicts = await this.runAllChecks(
        entityName,
        personId,
        disclosureId,
        organizationId,
        fuzzyConfig,
      );

      for (const conflict of conflicts) {
        const isExcluded = await this.exclusionService.isExcluded(
          personId,
          conflict.matchedEntity,
          conflict.conflictType,
          organizationId,
        );

        if (isExcluded.excluded) {
          excludedConflictCount++;
          if (isExcluded.exclusionId) {
            appliedExclusionIds.push(isExcluded.exclusionId);
          }
        } else {
          detectedConflicts.push(conflict);
        }
      }
    }

    // Save detected conflicts to database
    const savedAlerts: ConflictAlertDto[] = [];
    for (const conflict of detectedConflicts) {
      const alert = await this.prisma.conflictAlert.create({
        data: {
          organizationId,
          disclosureId,
          conflictType: conflict.conflictType,
          severity: conflict.severity,
          status: ConflictStatus.OPEN,
          summary: conflict.summary,
          matchedEntity: conflict.matchedEntity,
          matchConfidence: conflict.matchConfidence,
          matchDetails: conflict.matchDetails as Prisma.InputJsonValue,
          severityFactors: conflict.severityFactors
            ? (conflict.severityFactors as unknown as Prisma.InputJsonValue)
            : undefined,
        },
      });

      savedAlerts.push(this.mapAlertToDto(alert));
    }

    // Emit event if conflicts detected
    if (savedAlerts.length > 0) {
      this.eventEmitter.emit("conflict.detected", {
        organizationId,
        disclosureId,
        personId,
        conflictCount: savedAlerts.length,
        conflicts: savedAlerts,
      });

      this.logger.log(
        `Detected ${savedAlerts.length} conflicts for disclosure ${disclosureId}`,
      );
    }

    return {
      disclosureId,
      personId,
      checkedAt: new Date(),
      conflictCount: savedAlerts.length,
      conflicts: savedAlerts,
      excludedConflictCount,
      appliedExclusionIds: [...new Set(appliedExclusionIds)],
    };
  }

  /**
   * Runs all conflict checks for an entity.
   */
  private async runAllChecks(
    entityName: string,
    personId: string,
    disclosureId: string,
    organizationId: string,
    config: FuzzyMatchConfig,
  ): Promise<DetectedConflict[]> {
    const [selfDealing, hris, cases, patterns] = await Promise.all([
      this.matchingService.checkSelfDealing(
        entityName,
        personId,
        disclosureId,
        organizationId,
        config,
      ),
      this.matchingService.checkHrisMatch(
        entityName,
        personId,
        organizationId,
        config,
      ),
      this.matchingService.checkPriorCases(entityName, organizationId, config),
      this.matchingService.checkRelationshipPatterns(
        entityName,
        personId,
        organizationId,
        config,
      ),
    ]);

    return [...selfDealing, ...hris, ...cases, ...patterns];
  }

  // ===========================================
  // Dismissal Workflow (RS.44)
  // ===========================================

  /**
   * Dismisses a conflict alert with optional exclusion creation.
   * RS.44: Categorized dismissals with exclusion list management.
   */
  async dismissConflict(
    alertId: string,
    dto: DismissConflictDto,
    userId: string,
    organizationId: string,
  ): Promise<ConflictAlertDto> {
    const alert = await this.prisma.conflictAlert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) {
      throw new NotFoundException(`Conflict alert ${alertId} not found`);
    }

    if (alert.status !== ConflictStatus.OPEN) {
      throw new BadRequestException(
        `Cannot dismiss alert with status ${alert.status}`,
      );
    }

    // Validate dismissal category
    if (
      !Object.values(DismissalCategory).includes(
        dto.category as DismissalCategory,
      )
    ) {
      throw new BadRequestException(
        `Invalid dismissal category: ${dto.category}`,
      );
    }

    let exclusionId: string | undefined;

    // Create exclusion if requested
    if (dto.createExclusion) {
      exclusionId = await this.createExclusionFromAlert(
        alert,
        dto,
        userId,
        organizationId,
        alertId,
      );
    }

    // Update the alert
    const updated = await this.prisma.conflictAlert.update({
      where: { id: alertId },
      data: {
        status: ConflictStatus.DISMISSED,
        dismissedCategory: dto.category,
        dismissedReason: dto.reason,
        dismissedBy: userId,
        dismissedAt: new Date(),
        exclusionId,
      },
    });

    // Log audit entry
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.DISCLOSURE,
      entityId: alert.disclosureId,
      action: "conflict_dismissed",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Dismissed conflict alert (${alert.conflictType}) with category: ${dto.category}`,
      actorUserId: userId,
      actorType: ActorType.USER,
      changes: {
        status: { old: alert.status, new: ConflictStatus.DISMISSED },
        dismissedCategory: { old: null, new: dto.category },
      },
    });

    this.logger.log(
      `Dismissed conflict alert ${alertId} with category ${dto.category}`,
    );

    return this.mapAlertToDto(updated);
  }

  /**
   * Creates an exclusion from a dismissed alert.
   */
  private async createExclusionFromAlert(
    alert: ConflictAlert,
    dto: DismissConflictDto,
    userId: string,
    organizationId: string,
    alertId: string,
  ): Promise<string | undefined> {
    // Get the person associated with this disclosure
    const disclosure = await this.prisma.riuDisclosureExtension.findUnique({
      where: { riuId: alert.disclosureId },
      include: {
        riu: {
          select: { createdById: true },
        },
      },
    });

    if (!disclosure?.riu?.createdById) {
      throw new BadRequestException(
        "Cannot create exclusion: disclosure has no associated person",
      );
    }

    // Get the Person record for this user
    const person = await this.prisma.person.findFirst({
      where: {
        organizationId,
        email: {
          not: null,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (person) {
      const exclusion = await this.exclusionService.createExclusion(
        {
          personId: person.id,
          matchedEntity: alert.matchedEntity,
          conflictType: alert.conflictType,
          reason: dto.reason,
          notes: dto.exclusionNotes,
          scope: dto.exclusionScope ?? ExclusionScope.PERMANENT,
          expiresAt: dto.exclusionExpiresAt,
        },
        userId,
        organizationId,
        alertId,
      );
      return exclusion.id;
    }

    return undefined;
  }

  // ===========================================
  // Escalation
  // ===========================================

  /**
   * Escalates a conflict alert to a case.
   */
  async escalateConflict(
    alertId: string,
    dto: { existingCaseId?: string; notes?: string },
    userId: string,
    organizationId: string,
  ): Promise<ConflictAlertDto> {
    const alert = await this.prisma.conflictAlert.findFirst({
      where: { id: alertId, organizationId },
    });

    if (!alert) {
      throw new NotFoundException(`Conflict alert ${alertId} not found`);
    }

    if (alert.status !== ConflictStatus.OPEN) {
      throw new BadRequestException(
        `Cannot escalate alert with status ${alert.status}`,
      );
    }

    const updated = await this.prisma.conflictAlert.update({
      where: { id: alertId },
      data: {
        status: ConflictStatus.ESCALATED,
        escalatedToCaseId: dto.existingCaseId,
      },
    });

    this.logger.log(`Escalated conflict alert ${alertId}`);

    return this.mapAlertToDto(updated);
  }

  // ===========================================
  // Entity Timeline (RS.45)
  // ===========================================

  /**
   * Gets the full timeline for an entity across disclosures and cases.
   * RS.45: Full entity timeline history view.
   */
  async getEntityTimeline(
    entityName: string,
    organizationId: string,
  ): Promise<EntityTimelineDto> {
    const events: EntityTimelineItem[] = [];
    const uniquePersonIds = new Set<string>();

    // Get disclosures mentioning this entity
    const disclosures = await this.prisma.riuDisclosureExtension.findMany({
      where: {
        organizationId,
        OR: [
          { relatedCompany: { contains: entityName, mode: "insensitive" } },
          { relatedPersonName: { contains: entityName, mode: "insensitive" } },
        ],
      },
      include: {
        riu: {
          select: {
            id: true,
            referenceNumber: true,
            createdAt: true,
            createdById: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    for (const disclosure of disclosures) {
      if (disclosure.riu?.createdById) {
        uniquePersonIds.add(disclosure.riu.createdById);
      }

      events.push({
        eventType: EntityTimelineEventType.DISCLOSURE_SUBMITTED,
        occurredAt: disclosure.createdAt,
        description: `Disclosure submitted involving "${disclosure.relatedCompany || disclosure.relatedPersonName}"`,
        disclosureId: disclosure.riuId,
      });
    }

    // Get conflict alerts for this entity
    const alerts = await this.prisma.conflictAlert.findMany({
      where: {
        organizationId,
        matchedEntity: { contains: entityName, mode: "insensitive" },
      },
      orderBy: { createdAt: "desc" },
    });

    for (const alert of alerts) {
      events.push({
        eventType:
          alert.status === ConflictStatus.DISMISSED
            ? EntityTimelineEventType.CONFLICT_DISMISSED
            : alert.status === ConflictStatus.ESCALATED
              ? EntityTimelineEventType.CONFLICT_ESCALATED
              : EntityTimelineEventType.CONFLICT_DETECTED,
        occurredAt: alert.createdAt,
        description: alert.summary,
        conflictAlertId: alert.id,
        disclosureId: alert.disclosureId,
        caseId: alert.escalatedToCaseId ?? undefined,
      });
    }

    // Get case subjects mentioning this entity
    const subjects = await this.prisma.subject.findMany({
      where: {
        organizationId,
        externalName: { contains: entityName, mode: "insensitive" },
      },
      include: {
        case: {
          select: {
            id: true,
            referenceNumber: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    for (const subject of subjects) {
      events.push({
        eventType: EntityTimelineEventType.CASE_INVOLVEMENT,
        occurredAt: subject.createdAt,
        description: `Named as ${subject.role} in case ${subject.case.referenceNumber}`,
        caseId: subject.caseId,
      });
    }

    // Sort all events by date descending
    events.sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );

    // Calculate date range
    const dates = events.map((e) => new Date(e.occurredAt));
    const earliest =
      dates.length > 0
        ? new Date(Math.min(...dates.map((d) => d.getTime())))
        : null;
    const latest =
      dates.length > 0
        ? new Date(Math.max(...dates.map((d) => d.getTime())))
        : null;

    return {
      entityName,
      totalEvents: events.length,
      events,
      statistics: {
        totalDisclosures: disclosures.length,
        totalConflicts: alerts.length,
        totalCases: subjects.length,
        uniquePersons: uniquePersonIds.size,
        dateRange: { earliest, latest },
      },
    };
  }

  // ===========================================
  // Query Methods
  // ===========================================

  /**
   * Queries conflict alerts with filters.
   */
  async findAlerts(
    organizationId: string,
    query: ConflictQueryDto,
  ): Promise<ConflictAlertPageDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ConflictAlertWhereInput = {
      organizationId,
    };

    if (query.status?.length) {
      where.status = { in: query.status };
    }

    if (query.conflictType?.length) {
      where.conflictType = { in: query.conflictType };
    }

    if (query.severity?.length) {
      where.severity = { in: query.severity };
    }

    if (query.disclosureId) {
      where.disclosureId = query.disclosureId;
    }

    if (query.matchedEntity) {
      where.matchedEntity = {
        contains: query.matchedEntity,
        mode: "insensitive",
      };
    }

    if (query.minConfidence !== undefined) {
      where.matchConfidence = { gte: query.minConfidence };
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.conflictAlert.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: {
          dismissedByUser: {
            select: { id: true, firstName: true, lastName: true },
          },
          escalatedCase: {
            select: { id: true, referenceNumber: true, status: true },
          },
        },
      }),
      this.prisma.conflictAlert.count({ where }),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return {
      items: items.map((item) => this.mapAlertToDto(item)),
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  /**
   * Gets a single conflict alert by ID.
   */
  async findAlertById(
    alertId: string,
    organizationId: string,
  ): Promise<ConflictAlertDto | null> {
    const alert = await this.prisma.conflictAlert.findFirst({
      where: { id: alertId, organizationId },
      include: {
        dismissedByUser: {
          select: { id: true, firstName: true, lastName: true },
        },
        escalatedCase: {
          select: { id: true, referenceNumber: true, status: true },
        },
      },
    });

    return alert ? this.mapAlertToDto(alert) : null;
  }

  // ===========================================
  // Delegated Exclusion Methods
  // ===========================================

  /**
   * Creates a conflict exclusion.
   * Delegates to ConflictExclusionService.
   */
  async createExclusion(
    dto: {
      personId: string;
      matchedEntity: string;
      conflictType: ConflictType;
      reason: string;
      notes?: string;
      scope?: ExclusionScope;
      expiresAt?: string;
    },
    userId: string,
    organizationId: string,
    sourceAlertId?: string,
  ) {
    return this.exclusionService.createExclusion(
      dto,
      userId,
      organizationId,
      sourceAlertId,
    );
  }

  /**
   * Finds exclusions with pagination and filters.
   * Delegates to ConflictExclusionService.
   */
  async findExclusions(
    organizationId: string,
    options: {
      personId?: string;
      conflictType?: ConflictType;
      activeOnly?: boolean;
      page?: number;
      pageSize?: number;
    },
  ): Promise<{
    items: ConflictExclusionDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.exclusionService.findExclusions(organizationId, options);
  }

  /**
   * Deactivates an exclusion.
   * Delegates to ConflictExclusionService.
   */
  async deactivateExclusion(
    exclusionId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    return this.exclusionService.deactivateExclusion(
      exclusionId,
      userId,
      organizationId,
    );
  }

  /**
   * Maps exclusion to DTO.
   * Delegates to ConflictExclusionService.
   */
  mapExclusionToDto(exclusion: any): ConflictExclusionDto {
    return this.exclusionService.mapExclusionToDto(exclusion);
  }

  // ===========================================
  // Delegated Matching Methods (for external callers)
  // ===========================================

  /**
   * Exposes fuzzy match for external callers.
   */
  fuzzyMatch(str1: string, str2: string, config?: FuzzyMatchConfig) {
    return this.matchingService.fuzzyMatch(str1, str2, config);
  }

  /**
   * Exposes calculate similarity for external callers.
   */
  calculateSimilarity(str1: string, str2: string): number {
    return this.matchingService.calculateSimilarity(str1, str2);
  }

  // ===========================================
  // Helpers
  // ===========================================

  /**
   * Maps a database alert to DTO.
   */
  private mapAlertToDto(
    alert: ConflictAlert & {
      dismissedByUser?: {
        id: string;
        firstName: string;
        lastName: string;
      } | null;
      escalatedCase?: {
        id: string;
        referenceNumber: string;
        status: string;
      } | null;
    },
  ): ConflictAlertDto {
    return {
      id: alert.id,
      organizationId: alert.organizationId,
      disclosureId: alert.disclosureId,
      conflictType: alert.conflictType,
      severity: alert.severity,
      status: alert.status,
      summary: alert.summary,
      matchedEntity: alert.matchedEntity,
      matchConfidence: alert.matchConfidence,
      matchDetails: alert.matchDetails as unknown as MatchDetails,
      severityFactors: alert.severityFactors
        ? (alert.severityFactors as unknown as SeverityFactors)
        : undefined,
      dismissedCategory: alert.dismissedCategory as
        | DismissalCategory
        | undefined,
      dismissedReason: alert.dismissedReason ?? undefined,
      dismissedBy: alert.dismissedBy ?? undefined,
      dismissedAt: alert.dismissedAt ?? undefined,
      escalatedToCaseId: alert.escalatedToCaseId ?? undefined,
      exclusionId: alert.exclusionId ?? undefined,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
      dismissedByUser: alert.dismissedByUser ?? undefined,
      escalatedCase: alert.escalatedCase
        ? {
            id: alert.escalatedCase.id,
            referenceNumber: alert.escalatedCase.referenceNumber,
            status: alert.escalatedCase.status,
          }
        : undefined,
    };
  }
}
