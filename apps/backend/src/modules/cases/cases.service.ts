import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Prisma, Case, CaseStatus, AuditEntityType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import { CreateCaseDto, UpdateCaseDto, CaseQueryDto } from "./dto";
import { CaseCreatedEvent, CaseUpdatedEvent } from "../events/events";
import { CaseQueryService } from "./services/case-query.service";
import { CaseStatusService } from "./services/case-status.service";

/**
 * CasesService - Thin coordinator for case management operations.
 *
 * Delegates to specialized sub-services:
 * - CaseQueryService: Query operations (findAll, findOne, findByReferenceNumber)
 * - CaseStatusService: Status transitions (updateStatus, close)
 *
 * Retains core create/update operations and reference number generation.
 */
@Injectable()
export class CasesService {
  private readonly logger = new Logger(CasesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
    private readonly caseQueryService: CaseQueryService,
    private readonly caseStatusService: CaseStatusService,
  ) {}

  // ============================================================================
  // Query Operations - Delegate to CaseQueryService
  // ============================================================================

  /**
   * Returns paginated list of cases for the current organization.
   * Supports full-text search using PostgreSQL tsvector when search query is provided.
   */
  async findAll(
    query: CaseQueryDto,
    organizationId: string,
  ): Promise<{ data: Case[]; total: number; limit: number; offset: number }> {
    return this.caseQueryService.findAll(query, organizationId);
  }

  /**
   * Returns a single case by ID.
   * Throws NotFoundException if not found or belongs to different org (RLS handles this).
   */
  async findOne(id: string, organizationId: string): Promise<Case> {
    return this.caseQueryService.findOne(id, organizationId);
  }

  /**
   * Finds a case by reference number.
   */
  async findByReferenceNumber(
    referenceNumber: string,
    organizationId: string,
  ): Promise<Case> {
    return this.caseQueryService.findByReferenceNumber(
      referenceNumber,
      organizationId,
    );
  }

  // ============================================================================
  // Status Operations - Delegate to CaseStatusService
  // ============================================================================

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
    return this.caseStatusService.updateStatus(
      id,
      status,
      rationale,
      userId,
      organizationId,
    );
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
    return this.caseStatusService.close(id, rationale, userId, organizationId);
  }

  // ============================================================================
  // Core Operations - Retained in CasesService
  // ============================================================================

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
   * Updates a case.
   */
  async update(
    id: string,
    dto: UpdateCaseDto,
    userId: string,
    organizationId: string,
  ): Promise<Case> {
    // Verify case exists and belongs to this org
    const existing = await this.caseQueryService.findOne(id, organizationId);

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
