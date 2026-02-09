import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma, Case, CaseStatus, AuditEntityType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import { CreateCaseDto, UpdateCaseDto, CaseQueryDto } from "./dto";
import {
  CaseCreatedEvent,
  CaseUpdatedEvent,
  CaseStatusChangedEvent,
} from "../events/events";

/**
 * Service for managing compliance cases.
 * All queries are automatically scoped to the user's organization via RLS.
 */
@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a new case with auto-generated reference number.
   * Format: ETH-YYYY-NNNNN (e.g., ETH-2026-00001)
   */
  async create(
    dto: CreateCaseDto,
    userId: string,
    organizationId: string,
  ): Promise<Case> {
    const referenceNumber = await this.generateReferenceNumber(organizationId);

    const data: Prisma.CaseUncheckedCreateInput = {
      referenceNumber,
      organizationId,
      createdById: userId,
      updatedById: userId,
      // Intake
      sourceChannel: dto.sourceChannel,
      caseType: dto.caseType,
      intakeOperatorId: dto.intakeOperatorId,
      firstTimeCaller: dto.firstTimeCaller,
      awarenessSource: dto.awarenessSource,
      interpreterUsed: dto.interpreterUsed,
      // Reporter
      reporterType: dto.reporterType,
      reporterAnonymous: dto.reporterAnonymous,
      reporterName: dto.reporterName,
      reporterEmail: dto.reporterEmail,
      reporterPhone: dto.reporterPhone,
      reporterRelationship: dto.reporterRelationship,
      proxySubmitterId: dto.proxySubmitterId,
      // Location
      locationName: dto.locationName,
      locationAddress: dto.locationAddress,
      locationCity: dto.locationCity,
      locationState: dto.locationState,
      locationZip: dto.locationZip,
      locationCountry: dto.locationCountry,
      locationManual: dto.locationManual,
      // Content
      details: dto.details,
      summary: dto.summary,
      addendum: dto.addendum,
      originalLanguage: dto.originalLanguage,
      // Classification
      primaryCategoryId: dto.primaryCategoryId,
      secondaryCategoryId: dto.secondaryCategoryId,
      severity: dto.severity,
      severityReason: dto.severityReason,
      tags: dto.tags,
      // Custom
      customFields: dto.customFields as Prisma.InputJsonValue,
      customQuestions: dto.customQuestions as Prisma.InputJsonValue,
      // Migration
      sourceSystem: dto.sourceSystem,
      sourceRecordId: dto.sourceRecordId,
    };

    const caseRecord = await this.prisma.case.create({ data });

    // Log activity with natural language description
    await this.activityService.log({
      entityType: AuditEntityType.CASE,
      entityId: caseRecord.id,
      action: "created",
      actionDescription: `Created case ${referenceNumber}`,
      actorUserId: userId,
      organizationId,
    });

    // Emit event for subscribers (audit, search indexing, notifications)
    this.emitEvent(
      CaseCreatedEvent.eventName,
      new CaseCreatedEvent({
        organizationId,
        actorUserId: userId,
        actorType: "USER",
        caseId: caseRecord.id,
        referenceNumber: caseRecord.referenceNumber,
        sourceChannel: caseRecord.sourceChannel,
        categoryId: caseRecord.primaryCategoryId ?? undefined,
        severity: caseRecord.severity,
      }),
    );

    return caseRecord;
  }

  /**
   * Returns paginated list of cases for the current organization.
   * Supports full-text search using PostgreSQL tsvector when search query is provided.
   */
  async findAll(
    query: CaseQueryDto,
    organizationId: string,
  ): Promise<{ data: Case[]; total: number; limit: number; offset: number }> {
    const {
      limit = 20,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    // If search query provided, use full-text search with raw SQL
    if (query.search && query.search.trim().length > 0) {
      return this.findAllWithFullTextSearch(query, organizationId);
    }

    const where = this.buildWhereClause(query, organizationId);
    const orderBy = this.buildOrderByClause(sortBy, sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.case.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          createdBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          primaryCategory: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.case.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  /**
   * Builds Prisma orderBy clause, handling relation fields.
   */
  private buildOrderByClause(
    sortBy: string,
    sortOrder: string,
  ): Record<string, unknown> {
    // Map frontend column IDs to Prisma orderBy format
    const relationSortMap: Record<string, Record<string, unknown>> = {
      primaryCategory: { primaryCategory: { name: sortOrder } },
      createdBy: { createdBy: { firstName: sortOrder } },
      team: { team: { name: sortOrder } },
      businessUnit: { businessUnit: { name: sortOrder } },
    };

    // Check if it's a relation field
    if (relationSortMap[sortBy]) {
      return relationSortMap[sortBy];
    }

    // Direct field sort
    return { [sortBy]: sortOrder };
  }

  /**
   * Performs full-text search on cases using PostgreSQL tsvector.
   * Uses plainto_tsquery for natural language search and ts_rank for relevance scoring.
   * Supports partial word matching with :* suffix.
   * CRITICAL: Tenant isolation (organizationId filter) always applies.
   */
  private async findAllWithFullTextSearch(
    query: CaseQueryDto,
    organizationId: string,
  ): Promise<{ data: Case[]; total: number; limit: number; offset: number }> {
    const { limit = 20, offset = 0 } = query;
    const searchTerm = query.search!.trim();

    // Build the search query with partial matching support
    // Convert "word1 word2" to "word1:* & word2:*" for prefix matching
    const searchWords = searchTerm
      .split(/\s+/)
      .filter((word) => word.length > 0)
      .map((word) => word.replace(/[^\w]/g, "")) // Remove special characters
      .filter((word) => word.length > 0);

    if (searchWords.length === 0) {
      // If no valid search words, return empty result
      return { data: [], total: 0, limit, offset };
    }

    const tsQuery = searchWords.map((word) => `${word}:*`).join(" & ");

    // Build additional WHERE conditions for filters (AND logic)
    const conditions: string[] = ["c.organization_id = $1"];
    const params: (string | number)[] = [organizationId];
    let paramIndex = 2;

    // Enum filters
    if (query.status) {
      conditions.push(`c.status = $${paramIndex}`);
      params.push(query.status);
      paramIndex++;
    }

    if (query.severity) {
      conditions.push(`c.severity = $${paramIndex}`);
      params.push(query.severity);
      paramIndex++;
    }

    if (query.sourceChannel) {
      conditions.push(`c.source_channel = $${paramIndex}`);
      params.push(query.sourceChannel);
      paramIndex++;
    }

    if (query.caseType) {
      conditions.push(`c.case_type = $${paramIndex}`);
      params.push(query.caseType);
      paramIndex++;
    }

    // User filters
    if (query.createdById) {
      conditions.push(`c.created_by_id = $${paramIndex}`);
      params.push(query.createdById);
      paramIndex++;
    }

    if (query.intakeOperatorId) {
      conditions.push(`c.intake_operator_id = $${paramIndex}`);
      params.push(query.intakeOperatorId);
      paramIndex++;
    }

    // Date range filters
    if (query.createdAfter) {
      conditions.push(`c.created_at >= $${paramIndex}`);
      params.push(query.createdAfter);
      paramIndex++;
    }

    if (query.createdBefore) {
      conditions.push(`c.created_at <= $${paramIndex}`);
      params.push(query.createdBefore);
      paramIndex++;
    }

    // Add full-text search condition
    conditions.push(`c.search_vector @@ to_tsquery('english', $${paramIndex})`);
    params.push(tsQuery);
    const tsQueryParamIndex = paramIndex;
    paramIndex++;

    const whereClause = conditions.join(" AND ");

    // Query for data with relevance ranking
    const dataQuery = `
      SELECT c.*,
             ts_rank(c.search_vector, to_tsquery('english', $${tsQueryParamIndex})) as search_rank
      FROM cases c
      WHERE ${whereClause}
      ORDER BY search_rank DESC, c.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    // Query for total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM cases c
      WHERE ${whereClause}
    `;

    const [dataResult, countResult] = await Promise.all([
      this.prisma.$queryRawUnsafe<Case[]>(dataQuery, ...params),
      this.prisma.$queryRawUnsafe<{ total: bigint }[]>(
        countQuery,
        ...params.slice(0, -2),
      ),
    ]);

    const total = Number(countResult[0]?.total ?? 0);

    return { data: dataResult, total, limit, offset };
  }

  /**
   * Returns a single case by ID.
   * Throws NotFoundException if not found or belongs to different org (RLS handles this).
   */
  async findOne(id: string, organizationId: string): Promise<Case> {
    const caseRecord = await this.prisma.case.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        updatedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        intakeOperator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case with ID ${id} not found`);
    }

    return caseRecord;
  }

  /**
   * Finds a case by reference number.
   */
  async findByReferenceNumber(
    referenceNumber: string,
    organizationId: string,
  ): Promise<Case> {
    const caseRecord = await this.prisma.case.findFirst({
      where: {
        referenceNumber,
        organizationId,
      },
    });

    if (!caseRecord) {
      throw new NotFoundException(`Case ${referenceNumber} not found`);
    }

    return caseRecord;
  }

  /**
   * Updates a case.
   */
  async update(
    id: string,
    dto: UpdateCaseDto,
    userId: string,
    organizationId: string,
  ): Promise<Case> {
    // Verify case exists and belongs to this org
    const existing = await this.findOne(id, organizationId);

    const data: Prisma.CaseUncheckedUpdateInput = {
      updatedById: userId,
    };

    // Only set fields that are provided
    if (dto.sourceChannel !== undefined) data.sourceChannel = dto.sourceChannel;
    if (dto.caseType !== undefined) data.caseType = dto.caseType;
    if (dto.intakeOperatorId !== undefined)
      data.intakeOperatorId = dto.intakeOperatorId;
    if (dto.firstTimeCaller !== undefined)
      data.firstTimeCaller = dto.firstTimeCaller;
    if (dto.awarenessSource !== undefined)
      data.awarenessSource = dto.awarenessSource;
    if (dto.interpreterUsed !== undefined)
      data.interpreterUsed = dto.interpreterUsed;
    if (dto.reporterType !== undefined) data.reporterType = dto.reporterType;
    if (dto.reporterAnonymous !== undefined)
      data.reporterAnonymous = dto.reporterAnonymous;
    if (dto.reporterName !== undefined) data.reporterName = dto.reporterName;
    if (dto.reporterEmail !== undefined) data.reporterEmail = dto.reporterEmail;
    if (dto.reporterPhone !== undefined) data.reporterPhone = dto.reporterPhone;
    if (dto.reporterRelationship !== undefined)
      data.reporterRelationship = dto.reporterRelationship;
    if (dto.proxySubmitterId !== undefined)
      data.proxySubmitterId = dto.proxySubmitterId;
    if (dto.locationName !== undefined) data.locationName = dto.locationName;
    if (dto.locationAddress !== undefined)
      data.locationAddress = dto.locationAddress;
    if (dto.locationCity !== undefined) data.locationCity = dto.locationCity;
    if (dto.locationState !== undefined) data.locationState = dto.locationState;
    if (dto.locationZip !== undefined) data.locationZip = dto.locationZip;
    if (dto.locationCountry !== undefined)
      data.locationCountry = dto.locationCountry;
    if (dto.locationManual !== undefined)
      data.locationManual = dto.locationManual;
    if (dto.details !== undefined) data.details = dto.details;
    if (dto.summary !== undefined) data.summary = dto.summary;
    if (dto.addendum !== undefined) data.addendum = dto.addendum;
    if (dto.originalLanguage !== undefined)
      data.originalLanguage = dto.originalLanguage;
    if (dto.primaryCategoryId !== undefined)
      data.primaryCategoryId = dto.primaryCategoryId;
    if (dto.secondaryCategoryId !== undefined)
      data.secondaryCategoryId = dto.secondaryCategoryId;
    if (dto.severity !== undefined) data.severity = dto.severity;
    if (dto.severityReason !== undefined)
      data.severityReason = dto.severityReason;
    if (dto.tags !== undefined) data.tags = dto.tags;
    if (dto.customFields !== undefined)
      data.customFields = dto.customFields as Prisma.InputJsonValue;
    if (dto.customQuestions !== undefined)
      data.customQuestions = dto.customQuestions as Prisma.InputJsonValue;
    if (dto.sourceSystem !== undefined) data.sourceSystem = dto.sourceSystem;
    if (dto.sourceRecordId !== undefined)
      data.sourceRecordId = dto.sourceRecordId;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.statusRationale !== undefined)
      data.statusRationale = dto.statusRationale;
    if (dto.qaNotes !== undefined) data.qaNotes = dto.qaNotes;

    const updated = await this.prisma.case.update({
      where: { id },
      data,
    });

    // Build description of changed fields
    const changedFields = Object.keys(dto).filter(
      (key) => dto[key as keyof UpdateCaseDto] !== undefined,
    );
    const description =
      changedFields.length > 0
        ? `Updated ${changedFields.join(", ")} on case ${existing.referenceNumber}`
        : `Updated case ${existing.referenceNumber}`;

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.CASE,
      entityId: id,
      action: "updated",
      actionDescription: description,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: { fields: changedFields },
        newValue: { ...dto },
      },
    });

    // Emit event for subscribers (audit, search re-indexing)
    // Build changes object with old/new values
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    for (const field of changedFields) {
      changes[field] = {
        old: existing[field as keyof Case],
        new: dto[field as keyof UpdateCaseDto],
      };
    }
    this.emitEvent(
      CaseUpdatedEvent.eventName,
      new CaseUpdatedEvent({
        organizationId,
        actorUserId: userId,
        actorType: "USER",
        caseId: id,
        changes,
      }),
    );

    return updated;
  }

  /**
   * Updates case status with rationale.
   */
  async updateStatus(
    id: string,
    status: CaseStatus,
    rationale: string | undefined,
    userId: string,
    organizationId: string,
  ): Promise<Case> {
    // Verify case exists
    const existing = await this.findOne(id, organizationId);

    // Validate status transition
    this.validateStatusTransition(existing.status, status);

    const oldStatus = existing.status;

    const updated = await this.prisma.case.update({
      where: { id },
      data: {
        status,
        statusRationale: rationale,
        updatedById: userId,
      },
    });

    // Log status change with natural language description
    await this.activityService.log({
      entityType: AuditEntityType.CASE,
      entityId: id,
      action: "status_changed",
      actionDescription: `Changed status from ${oldStatus} to ${status} on case ${existing.referenceNumber}`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: { status: oldStatus },
        newValue: { status, rationale },
      },
    });

    // Emit event for subscribers (workflow engine, notifications, SLA tracking)
    this.emitEvent(
      CaseStatusChangedEvent.eventName,
      new CaseStatusChangedEvent({
        organizationId,
        actorUserId: userId,
        actorType: "USER",
        caseId: id,
        previousStatus: oldStatus,
        newStatus: status,
        rationale,
      }),
    );

    return updated;
  }

  /**
   * Soft-closes a case by setting status to CLOSED.
   * Cases are never hard-deleted for audit purposes.
   */
  async close(
    id: string,
    rationale: string,
    userId: string,
    organizationId: string,
  ): Promise<Case> {
    // Verify case exists
    const existing = await this.findOne(id, organizationId);

    // Validate status transition
    this.validateStatusTransition(existing.status, CaseStatus.CLOSED);

    const updated = await this.prisma.case.update({
      where: { id },
      data: {
        status: CaseStatus.CLOSED,
        statusRationale: rationale,
        updatedById: userId,
      },
    });

    // Log close action with natural language description
    await this.activityService.log({
      entityType: AuditEntityType.CASE,
      entityId: id,
      action: "closed",
      actionDescription: `Closed case ${existing.referenceNumber}`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: { status: existing.status },
        newValue: { status: CaseStatus.CLOSED, rationale },
      },
    });

    // Emit event for subscribers (workflow engine, notifications)
    this.emitEvent(
      CaseStatusChangedEvent.eventName,
      new CaseStatusChangedEvent({
        organizationId,
        actorUserId: userId,
        actorType: "USER",
        caseId: id,
        previousStatus: existing.status,
        newStatus: CaseStatus.CLOSED,
        rationale,
      }),
    );

    return updated;
  }

  /**
   * Generates next reference number for organization.
   * Format: ETH-YYYY-NNNNN
   */
  private async generateReferenceNumber(
    organizationId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ETH-${year}-`;

    // Find the highest reference number for this year and org
    const lastCase = await this.prisma.case.findFirst({
      where: {
        organizationId,
        referenceNumber: { startsWith: prefix },
      },
      orderBy: { referenceNumber: "desc" },
      select: { referenceNumber: true },
    });

    let nextNumber = 1;
    if (lastCase) {
      const lastNumber = parseInt(lastCase.referenceNumber.split("-")[2], 10);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
  }

  /**
   * Builds Prisma where clause from query parameters.
   * Note: Full-text search is handled separately in findAllWithFullTextSearch().
   * All filters are combined with AND logic.
   */
  private buildWhereClause(
    query: CaseQueryDto,
    organizationId: string,
  ): Prisma.CaseWhereInput {
    const where: Prisma.CaseWhereInput = {
      organizationId,
    };

    // Process advanced filters from saved views (HubSpot-style)
    if (query.filters) {
      try {
        const conditions = JSON.parse(query.filters);
        if (Array.isArray(conditions)) {
          for (const condition of conditions) {
            this.applyFilterCondition(where, condition);
          }
        }
      } catch (e) {
        this.logger.warn(`Failed to parse filters: ${query.filters}`);
      }
    }

    // Simple enum filters (for backwards compatibility)
    if (query.status) {
      where.status = query.status;
    }

    if (query.severity) {
      where.severity = query.severity;
    }

    if (query.sourceChannel) {
      where.sourceChannel = query.sourceChannel;
    }

    if (query.caseType) {
      where.caseType = query.caseType;
    }

    // User filters
    if (query.createdById) {
      where.createdById = query.createdById;
    }

    if (query.intakeOperatorId) {
      where.intakeOperatorId = query.intakeOperatorId;
    }

    // Date range filters (combined into single createdAt filter)
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

    return where;
  }

  /**
   * Applies a single filter condition to the where clause.
   * Supports HubSpot-style operators: is, is_not, is_any_of, is_none_of, contains, etc.
   */
  private applyFilterCondition(
    where: Prisma.CaseWhereInput,
    condition: { propertyId: string; operator: string; value: unknown },
  ): void {
    const { propertyId, operator, value } = condition;

    // Map frontend property IDs to Prisma field names
    const fieldMap: Record<string, string> = {
      status: "status",
      severity: "severity",
      sourceChannel: "sourceChannel",
      caseType: "caseType",
      createdBy: "createdById",
      primaryCategory: "primaryCategoryId",
    };

    const field = fieldMap[propertyId] || propertyId;

    switch (operator) {
      case "is":
        (where as Record<string, unknown>)[field] = value;
        break;

      case "is_not":
        (where as Record<string, unknown>)[field] = { not: value };
        break;

      case "is_any_of":
        if (Array.isArray(value)) {
          (where as Record<string, unknown>)[field] = { in: value };
        }
        break;

      case "is_none_of":
        if (Array.isArray(value)) {
          (where as Record<string, unknown>)[field] = { notIn: value };
        }
        break;

      case "contains":
        (where as Record<string, unknown>)[field] = {
          contains: value,
          mode: "insensitive",
        };
        break;

      case "does_not_contain":
        (where as Record<string, unknown>)[field] = {
          not: { contains: value, mode: "insensitive" },
        };
        break;

      case "is_empty":
        (where as Record<string, unknown>)[field] = null;
        break;

      case "is_not_empty":
        (where as Record<string, unknown>)[field] = { not: null };
        break;

      default:
        this.logger.warn(`Unknown filter operator: ${operator}`);
    }
  }

  /**
   * Validates status transitions.
   */
  private validateStatusTransition(
    current: CaseStatus,
    next: CaseStatus,
  ): void {
    if (current === next) {
      throw new BadRequestException(`Case is already in ${current} status`);
    }
  }

  /**
   * Safely emits an event. Failures are logged but don't crash the request.
   * Events are fire-and-forget - request success is independent of event delivery.
   */
  private emitEvent(eventName: string, event: object): void {
    try {
      this.eventEmitter.emit(eventName, event);
    } catch (error) {
      this.logger.error(
        `Failed to emit event ${eventName}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't rethrow - request should succeed even if event emission fails
    }
  }
}
