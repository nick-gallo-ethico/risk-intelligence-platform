import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Prisma,
  RiskIntelligenceUnit,
  RiuType,
  SourceChannel,
  ReporterType,
  RiuStatus,
  DisclosureType,
  AuditEntityType,
  AuditActionCategory,
  ActorType,
  AssignmentStatus,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../audit/audit.service";
import { ThresholdService } from "./threshold.service";
import { ConflictDetectionService } from "./conflict-detection.service";
import {
  SaveDraftDto,
  DraftResponseDto,
  SubmitDisclosureDto,
  DisclosureResponseDto,
  DisclosureListItemDto,
  DisclosureListResponseDto,
  DisclosureQueryDto,
  DisclosureStatus,
  SubmissionResultDto,
  ApproveDisclosureDto,
  RejectDisclosureDto,
} from "./dto/disclosure-submission.dto";
import {
  ThresholdEvaluationResult,
  ThresholdActionDto,
} from "./dto/threshold-rule.dto";
import { ConflictAlertDto, DismissalCategory } from "./dto/conflict.dto";

/**
 * Disclosure draft stored in database.
 * Used for save/resume functionality.
 */
interface DisclosureDraft {
  id: string;
  organizationId: string;
  employeeId: string;
  assignmentId: string | null;
  formTemplateId: string | null;
  disclosureType: DisclosureType | null;
  formData: Prisma.JsonValue;
  completionPercentage: number;
  currentSection: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Service for managing disclosure submissions.
 *
 * This service orchestrates the full disclosure workflow:
 * - Draft save/resume for partial form completion
 * - Full submission with validation
 * - Automatic threshold evaluation (RS.35-RS.38)
 * - Automatic conflict detection (RS.41-RS.45)
 * - Campaign assignment completion
 * - Case creation when thresholds trigger
 *
 * The submission creates an RIU (Risk Intelligence Unit) with:
 * - Type: DISCLOSURE_RESPONSE
 * - Extension: RiuDisclosureExtension with type-specific data
 */
@Injectable()
export class DisclosureSubmissionService {
  private readonly logger = new Logger(DisclosureSubmissionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly thresholdService: ThresholdService,
    private readonly conflictDetectionService: ConflictDetectionService,
  ) {}

  // ===========================================
  // Draft Management
  // ===========================================

  /**
   * Saves a disclosure draft for later completion.
   * Creates or updates a draft based on employee context.
   */
  async saveDraft(
    dto: SaveDraftDto,
    employeeId: string,
    organizationId: string,
    _userId: string,
  ): Promise<DraftResponseDto> {
    // Check for existing draft for this employee and optional assignment
    const existingDraft = await this.prisma.disclosureDraft.findFirst({
      where: {
        organizationId,
        employeeId,
        ...(dto.assignmentId && { assignmentId: dto.assignmentId }),
        ...(!dto.assignmentId && { assignmentId: null }),
      },
    });

    let draft;

    if (existingDraft) {
      // Update existing draft
      draft = await this.prisma.disclosureDraft.update({
        where: { id: existingDraft.id },
        data: {
          formData: dto.formData as Prisma.InputJsonValue,
          disclosureType: dto.disclosureType,
          formTemplateId: dto.formTemplateId,
          completionPercentage: dto.completionPercentage ?? 0,
          currentSection: dto.currentSection,
        },
      });

      this.logger.debug(`Updated draft ${draft.id} for employee ${employeeId}`);
    } else {
      // Create new draft
      draft = await this.prisma.disclosureDraft.create({
        data: {
          organizationId,
          employeeId,
          assignmentId: dto.assignmentId,
          formTemplateId: dto.formTemplateId,
          disclosureType: dto.disclosureType,
          formData: dto.formData as Prisma.InputJsonValue,
          completionPercentage: dto.completionPercentage ?? 0,
          currentSection: dto.currentSection,
        },
      });

      // If assignment exists, mark as in progress
      if (dto.assignmentId) {
        await this.prisma.campaignAssignment.update({
          where: { id: dto.assignmentId },
          data: {
            status: AssignmentStatus.IN_PROGRESS,
            startedAt: new Date(),
          },
        });
      }

      this.logger.log(`Created draft ${draft.id} for employee ${employeeId}`);
    }

    return this.mapDraftToDto(draft);
  }

  /**
   * Gets a draft by ID.
   */
  async getDraft(
    draftId: string,
    employeeId: string,
    organizationId: string,
  ): Promise<DraftResponseDto | null> {
    const draft = await this.prisma.disclosureDraft.findFirst({
      where: {
        id: draftId,
        employeeId,
        organizationId,
      },
    });

    return draft ? this.mapDraftToDto(draft) : null;
  }

  /**
   * Gets drafts for an employee.
   */
  async getDraftsForEmployee(
    employeeId: string,
    organizationId: string,
  ): Promise<DraftResponseDto[]> {
    const drafts = await this.prisma.disclosureDraft.findMany({
      where: {
        employeeId,
        organizationId,
      },
      orderBy: { updatedAt: "desc" },
    });

    return drafts.map((d) => this.mapDraftToDto(d));
  }

  /**
   * Deletes a draft.
   */
  async deleteDraft(
    draftId: string,
    employeeId: string,
    organizationId: string,
  ): Promise<void> {
    const draft = await this.prisma.disclosureDraft.findFirst({
      where: {
        id: draftId,
        employeeId,
        organizationId,
      },
    });

    if (!draft) {
      throw new NotFoundException(`Draft ${draftId} not found`);
    }

    await this.prisma.disclosureDraft.delete({
      where: { id: draftId },
    });

    this.logger.log(`Deleted draft ${draftId} for employee ${employeeId}`);
  }

  // ===========================================
  // Submission
  // ===========================================

  /**
   * Submits a complete disclosure.
   *
   * This is the main entry point for disclosure submission. It:
   * 1. Validates the form data against the template
   * 2. Creates an RIU (Risk Intelligence Unit)
   * 3. Creates the RiuDisclosureExtension
   * 4. Evaluates threshold rules
   * 5. Runs conflict detection
   * 6. Completes campaign assignment (if applicable)
   * 7. Auto-creates case (if threshold triggers CREATE_CASE)
   * 8. Cleans up draft (if exists)
   *
   * @returns SubmissionResultDto with all results
   */
  async submitDisclosure(
    dto: SubmitDisclosureDto,
    employeeId: string,
    organizationId: string,
    userId: string,
  ): Promise<SubmissionResultDto> {
    this.logger.log(
      `Processing disclosure submission for employee ${employeeId}, type: ${dto.disclosureType}`,
    );

    // Get form template for version capture
    const formTemplate = await this.prisma.disclosureFormTemplate.findFirst({
      where: {
        id: dto.formTemplateId,
        organizationId,
      },
    });

    if (!formTemplate) {
      throw new NotFoundException(
        `Form template ${dto.formTemplateId} not found`,
      );
    }

    // Get employee details
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, organizationId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!employee) {
      throw new NotFoundException(`Employee ${employeeId} not found`);
    }

    // Generate RIU reference number
    const referenceNumber = await this.generateReferenceNumber(organizationId);

    // Create RIU and extension in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create RIU
      const riu = await tx.riskIntelligenceUnit.create({
        data: {
          organizationId,
          referenceNumber,
          type: RiuType.DISCLOSURE_RESPONSE,
          sourceChannel: SourceChannel.WEB_FORM,
          status: RiuStatus.RECEIVED,
          reporterType: ReporterType.IDENTIFIED,
          reporterName: `${employee.firstName} ${employee.lastName}`,
          reporterEmail: employee.email,
          details: dto.details || "Disclosure submission",
          campaignAssignmentId: dto.assignmentId,
          formResponses: dto.formData as Prisma.InputJsonValue,
          locationName: dto.locationName,
          locationAddress: dto.locationAddress,
          locationCity: dto.locationCity,
          locationState: dto.locationState,
          locationZip: dto.locationZip,
          locationCountry: dto.locationCountry,
          createdById: userId,
        },
      });

      // Create disclosure extension
      const extension = await tx.riuDisclosureExtension.create({
        data: {
          riuId: riu.id,
          organizationId,
          disclosureType: dto.disclosureType,
          disclosureSubtype: dto.disclosureSubtype,
          disclosureValue:
            dto.disclosureValue != null
              ? new Decimal(dto.disclosureValue)
              : undefined,
          disclosureCurrency: dto.disclosureCurrency ?? "USD",
          estimatedAnnualValue:
            dto.estimatedAnnualValue != null
              ? new Decimal(dto.estimatedAnnualValue)
              : undefined,
          relatedPersonId: dto.relatedPersonId,
          relatedPersonName: dto.relatedPersonName,
          relatedCompany: dto.relatedCompany,
          relationshipType: dto.relationshipType,
          effectiveDate: dto.effectiveDate
            ? new Date(dto.effectiveDate)
            : undefined,
          expirationDate: dto.expirationDate
            ? new Date(dto.expirationDate)
            : undefined,
          formTemplateId: dto.formTemplateId,
          formVersion: formTemplate.version,
        },
      });

      return { riu, extension };
    });

    const { riu, extension } = result;

    // Evaluate thresholds
    const thresholdEvaluation = await this.thresholdService.evaluateDisclosure(
      riu.id,
      organizationId,
      dto.disclosureType,
      {
        disclosureValue: dto.disclosureValue,
        disclosureType: dto.disclosureType,
        relatedCompany: dto.relatedCompany,
        relatedPersonName: dto.relatedPersonName,
        estimatedAnnualValue: dto.estimatedAnnualValue,
        ...dto.formData,
      },
      userId,
    );

    // Update extension with threshold results
    if (thresholdEvaluation.triggered) {
      await this.prisma.riuDisclosureExtension.update({
        where: { riuId: riu.id },
        data: {
          thresholdTriggered: true,
          thresholdAmount:
            thresholdEvaluation.triggeredRules[0]?.thresholdValue != null
              ? new Decimal(
                  thresholdEvaluation.triggeredRules[0].thresholdValue,
                )
              : undefined,
        },
      });
    }

    // Run conflict detection
    const conflictResult = await this.conflictDetectionService.detectConflicts(
      riu.id,
      userId,
      organizationId,
    );

    // Update extension with conflict results
    if (conflictResult.conflictCount > 0) {
      await this.prisma.riuDisclosureExtension.update({
        where: { riuId: riu.id },
        data: {
          conflictDetected: true,
          conflictReason: conflictResult.conflicts[0]?.summary,
        },
      });
    }

    // Handle auto-case creation if threshold triggered CREATE_CASE
    let autoCreatedCase:
      | { caseId: string; caseReferenceNumber: string; reason: string }
      | undefined;

    if (
      thresholdEvaluation.recommendedAction === ThresholdActionDto.CREATE_CASE
    ) {
      autoCreatedCase = await this.createCaseFromThreshold(
        riu,
        thresholdEvaluation,
        organizationId,
        userId,
      );
    }

    // Complete campaign assignment if applicable
    let assignmentUpdated = false;
    if (dto.assignmentId) {
      await this.prisma.campaignAssignment.update({
        where: { id: dto.assignmentId },
        data: {
          status: AssignmentStatus.COMPLETED,
          completedAt: new Date(),
          riuId: riu.id,
        },
      });
      assignmentUpdated = true;

      // Update campaign statistics
      const assignment = await this.prisma.campaignAssignment.findUnique({
        where: { id: dto.assignmentId },
        select: { campaignId: true },
      });

      if (assignment) {
        await this.updateCampaignStatistics(assignment.campaignId);
      }
    }

    // Clean up draft if submitted from one
    if (dto.draftId) {
      await this.prisma.disclosureDraft
        .delete({
          where: { id: dto.draftId },
        })
        .catch(() => {
          // Ignore if draft doesn't exist
        });
    }

    // Log audit entry
    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.DISCLOSURE,
      entityId: riu.id,
      action: "disclosure_submitted",
      actionCategory: AuditActionCategory.CREATE,
      actionDescription: `Submitted ${dto.disclosureType} disclosure (${referenceNumber})`,
      actorUserId: userId,
      actorType: ActorType.USER,
      changes: {
        thresholdTriggered: { old: null, new: thresholdEvaluation.triggered },
        conflictDetected: { old: null, new: conflictResult.conflictCount > 0 },
        autoCreatedCase: { old: null, new: autoCreatedCase?.caseId ?? null },
      },
    });

    // Emit submission event
    this.eventEmitter.emit("disclosure.submitted", {
      organizationId,
      riuId: riu.id,
      referenceNumber,
      disclosureType: dto.disclosureType,
      employeeId,
      userId,
      thresholdTriggered: thresholdEvaluation.triggered,
      conflictCount: conflictResult.conflictCount,
      autoCreatedCaseId: autoCreatedCase?.caseId,
    });

    this.logger.log(
      `Disclosure submitted: ${referenceNumber}, threshold: ${thresholdEvaluation.triggered}, conflicts: ${conflictResult.conflictCount}`,
    );

    // Build response
    return {
      disclosure: await this.buildDisclosureResponse(
        riu,
        extension,
        thresholdEvaluation,
        conflictResult.conflicts,
        autoCreatedCase,
      ),
      riuId: riu.id,
      riuReferenceNumber: referenceNumber,
      thresholdEvaluation,
      conflictCheckResult: {
        checkedAt: conflictResult.checkedAt,
        conflictCount: conflictResult.conflictCount,
        conflicts: conflictResult.conflicts,
        excludedConflictCount: conflictResult.excludedConflictCount,
      },
      autoCreatedCase,
      assignmentUpdated,
      assignmentId: dto.assignmentId,
    };
  }

  // ===========================================
  // Query Methods
  // ===========================================

  /**
   * Gets a disclosure by ID.
   */
  async getDisclosure(
    disclosureId: string,
    organizationId: string,
  ): Promise<DisclosureResponseDto | null> {
    const extension = await this.prisma.riuDisclosureExtension.findFirst({
      where: {
        riuId: disclosureId,
        organizationId,
      },
      include: {
        riu: {
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            caseAssociations: {
              include: {
                case: {
                  select: { id: true, referenceNumber: true },
                },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!extension) {
      return null;
    }

    // Get conflicts for this disclosure
    const conflicts = await this.prisma.conflictAlert.findMany({
      where: {
        disclosureId,
        organizationId,
      },
    });

    return this.mapExtensionToResponse(extension, conflicts);
  }

  /**
   * Finds disclosures with filters and pagination.
   */
  async findMany(
    query: DisclosureQueryDto,
    organizationId: string,
  ): Promise<DisclosureListResponseDto> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.RiuDisclosureExtensionWhereInput = {
      organizationId,
    };

    if (query.disclosureType) {
      where.disclosureType = query.disclosureType;
    }

    if (query.thresholdTriggered !== undefined) {
      where.thresholdTriggered = query.thresholdTriggered;
    }

    if (query.conflictDetected !== undefined) {
      where.conflictDetected = query.conflictDetected;
    }

    if (query.relatedCompany) {
      where.relatedCompany = {
        contains: query.relatedCompany,
        mode: "insensitive",
      };
    }

    if (query.relatedPersonName) {
      where.relatedPersonName = {
        contains: query.relatedPersonName,
        mode: "insensitive",
      };
    }

    if (query.submittedById) {
      where.riu = {
        ...(where.riu as Prisma.RiskIntelligenceUnitWhereInput),
        createdById: query.submittedById,
      };
    }

    if (query.campaignId) {
      // Filter by campaign via the campaign assignment relation
      const assignmentIds = await this.prisma.campaignAssignment.findMany({
        where: { organizationId, campaignId: query.campaignId },
        select: { id: true },
      });
      where.riu = {
        ...(where.riu as Prisma.RiskIntelligenceUnitWhereInput),
        campaignAssignmentId: { in: assignmentIds.map((a) => a.id) },
      };
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

    if (query.search) {
      where.OR = [
        { relatedCompany: { contains: query.search, mode: "insensitive" } },
        { relatedPersonName: { contains: query.search, mode: "insensitive" } },
        {
          riu: {
            referenceNumber: { contains: query.search, mode: "insensitive" },
          },
        },
      ];
    }

    // Determine sort field
    let orderBy: Prisma.RiuDisclosureExtensionOrderByWithRelationInput = {
      createdAt: "desc",
    };
    if (query.sortBy) {
      const order = query.sortOrder ?? "desc";
      switch (query.sortBy) {
        case "disclosureValue":
          orderBy = { disclosureValue: order };
          break;
        case "disclosureType":
          orderBy = { disclosureType: order };
          break;
        case "submittedAt":
        case "createdAt":
        default:
          orderBy = { createdAt: order };
          break;
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.riuDisclosureExtension.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
        include: {
          riu: {
            select: {
              id: true,
              referenceNumber: true,
              status: true,
              createdAt: true,
              createdBy: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: {
              // This would require a relation to ConflictAlert which may not exist
            },
          },
        },
      }),
      this.prisma.riuDisclosureExtension.count({ where }),
    ]);

    // Get conflict counts for each disclosure
    const disclosureIds = items.map((i) => i.riuId);
    const conflictCounts = await this.prisma.conflictAlert.groupBy({
      by: ["disclosureId"],
      where: {
        disclosureId: { in: disclosureIds },
        organizationId,
      },
      _count: true,
    });

    const conflictCountMap = new Map(
      conflictCounts.map((c) => [c.disclosureId, c._count]),
    );

    const totalPages = Math.ceil(total / pageSize);

    return {
      items: items.map((item) =>
        this.mapExtensionToListItem(
          item,
          conflictCountMap.get(item.riuId) ?? 0,
        ),
      ),
      total,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    };
  }

  // ===========================================
  // Approval Workflow
  // ===========================================

  /**
   * Approves a disclosure.
   */
  async approveDisclosure(
    disclosureId: string,
    dto: ApproveDisclosureDto,
    organizationId: string,
    userId: string,
  ): Promise<DisclosureResponseDto> {
    const disclosure = await this.getDisclosure(disclosureId, organizationId);

    if (!disclosure) {
      throw new NotFoundException(`Disclosure ${disclosureId} not found`);
    }

    // Update RIU status
    await this.prisma.riskIntelligenceUnit.update({
      where: { id: disclosureId },
      data: {
        status: RiuStatus.COMPLETED,
        statusChangedAt: new Date(),
        statusChangedById: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.DISCLOSURE,
      entityId: disclosureId,
      action: "disclosure_approved",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Approved disclosure${dto.approvalNotes ? ": " + dto.approvalNotes : ""}`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    this.eventEmitter.emit("disclosure.approved", {
      organizationId,
      disclosureId,
      userId,
    });

    return (await this.getDisclosure(disclosureId, organizationId))!;
  }

  /**
   * Rejects a disclosure.
   */
  async rejectDisclosure(
    disclosureId: string,
    dto: RejectDisclosureDto,
    organizationId: string,
    userId: string,
  ): Promise<DisclosureResponseDto> {
    const disclosure = await this.getDisclosure(disclosureId, organizationId);

    if (!disclosure) {
      throw new NotFoundException(`Disclosure ${disclosureId} not found`);
    }

    // Update RIU status
    await this.prisma.riskIntelligenceUnit.update({
      where: { id: disclosureId },
      data: {
        status: RiuStatus.CLOSED,
        statusChangedAt: new Date(),
        statusChangedById: userId,
      },
    });

    await this.auditService.log({
      organizationId,
      entityType: AuditEntityType.DISCLOSURE,
      entityId: disclosureId,
      action: "disclosure_rejected",
      actionCategory: AuditActionCategory.UPDATE,
      actionDescription: `Rejected disclosure: ${dto.rejectionReason}`,
      actorUserId: userId,
      actorType: ActorType.USER,
    });

    this.eventEmitter.emit("disclosure.rejected", {
      organizationId,
      disclosureId,
      userId,
      reason: dto.rejectionReason,
      requestResubmission: dto.requestResubmission,
    });

    return (await this.getDisclosure(disclosureId, organizationId))!;
  }

  // ===========================================
  // Private Helpers
  // ===========================================

  /**
   * Creates a case when threshold triggers CREATE_CASE action.
   */
  private async createCaseFromThreshold(
    riu: RiskIntelligenceUnit,
    thresholdResult: ThresholdEvaluationResult,
    organizationId: string,
    userId: string,
  ): Promise<{ caseId: string; caseReferenceNumber: string; reason: string }> {
    const caseRefNumber =
      await this.generateCaseReferenceNumber(organizationId);

    // Find the triggered rule that requested case creation
    const triggeringRule = thresholdResult.triggeredRules.find(
      (r) => r.action === ThresholdActionDto.CREATE_CASE,
    );

    const reason = triggeringRule
      ? `Threshold rule "${triggeringRule.ruleName}" triggered (value: ${triggeringRule.evaluatedValue}, threshold: ${triggeringRule.thresholdValue})`
      : "Threshold exceeded";

    // Create the case
    const newCase = await this.prisma.case.create({
      data: {
        organization: { connect: { id: organizationId } },
        referenceNumber: caseRefNumber,
        sourceChannel: SourceChannel.WEB_FORM,
        summary: `Auto-created from disclosure ${riu.referenceNumber}: ${reason}`,
        details: `This case was automatically created because a disclosure threshold was triggered.\n\n${reason}`,
        createdBy: { connect: { id: userId } },
        updatedBy: { connect: { id: userId } },
      },
    });

    // Create RIU-Case association
    await this.prisma.riuCaseAssociation.create({
      data: {
        organization: { connect: { id: organizationId } },
        riu: { connect: { id: riu.id } },
        case: { connect: { id: newCase.id } },
        associationType: "PRIMARY",
        createdBy: { connect: { id: userId } },
      },
    });

    this.logger.log(
      `Auto-created case ${caseRefNumber} from disclosure ${riu.referenceNumber}`,
    );

    return {
      caseId: newCase.id,
      caseReferenceNumber: caseRefNumber,
      reason,
    };
  }

  /**
   * Generates next RIU reference number.
   */
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

  /**
   * Generates next case reference number.
   */
  private async generateCaseReferenceNumber(
    organizationId: string,
  ): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CASE-${year}-`;

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
   * Updates campaign statistics after assignment completion.
   */
  private async updateCampaignStatistics(campaignId: string): Promise<void> {
    const [total, completed, overdue] = await Promise.all([
      this.prisma.campaignAssignment.count({ where: { campaignId } }),
      this.prisma.campaignAssignment.count({
        where: {
          campaignId,
          status: {
            in: [AssignmentStatus.COMPLETED, AssignmentStatus.SKIPPED],
          },
        },
      }),
      this.prisma.campaignAssignment.count({
        where: {
          campaignId,
          status: AssignmentStatus.OVERDUE,
        },
      }),
    ]);

    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: {
        totalAssignments: total,
        completedAssignments: completed,
        overdueAssignments: overdue,
        completionPercentage: percentage,
      },
    });
  }

  /**
   * Maps draft to DTO.
   */
  private mapDraftToDto(draft: DisclosureDraft): DraftResponseDto {
    return {
      id: draft.id,
      organizationId: draft.organizationId,
      employeeId: draft.employeeId,
      assignmentId: draft.assignmentId ?? undefined,
      formTemplateId: draft.formTemplateId ?? undefined,
      disclosureType: draft.disclosureType ?? undefined,
      formData: (draft.formData as Record<string, unknown>) ?? {},
      completionPercentage: draft.completionPercentage,
      currentSection: draft.currentSection ?? undefined,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
    };
  }

  /**
   * Builds full disclosure response.
   */
  private async buildDisclosureResponse(
    riu: RiskIntelligenceUnit,
    extension: {
      disclosureType: DisclosureType;
      disclosureSubtype: string | null;
      disclosureValue: Decimal | null;
      disclosureCurrency: string | null;
      estimatedAnnualValue: Decimal | null;
      thresholdTriggered: boolean;
      thresholdAmount: Decimal | null;
      conflictDetected: boolean;
      conflictReason: string | null;
      relatedPersonId: string | null;
      relatedPersonName: string | null;
      relatedCompany: string | null;
      relationshipType: string | null;
      effectiveDate: Date | null;
      expirationDate: Date | null;
      formTemplateId: string | null;
      formVersion: number | null;
      createdAt: Date;
    },
    thresholdEvaluation: ThresholdEvaluationResult,
    conflicts: ConflictAlertDto[],
    autoCreatedCase?: {
      caseId: string;
      caseReferenceNumber: string;
      reason: string;
    },
  ): Promise<DisclosureResponseDto> {
    // Determine status from RIU status
    let status: DisclosureStatus;
    switch (riu.status) {
      case RiuStatus.COMPLETED:
        status = DisclosureStatus.APPROVED;
        break;
      case RiuStatus.CLOSED:
        status = DisclosureStatus.REJECTED;
        break;
      case RiuStatus.RELEASED:
        status = DisclosureStatus.UNDER_REVIEW;
        break;
      default:
        status = DisclosureStatus.SUBMITTED;
    }

    return {
      id: riu.id,
      referenceNumber: riu.referenceNumber,
      organizationId: riu.organizationId,
      status,
      disclosureType: extension.disclosureType,
      disclosureSubtype: extension.disclosureSubtype ?? undefined,
      disclosureValue: extension.disclosureValue
        ? Number(extension.disclosureValue)
        : undefined,
      disclosureCurrency: extension.disclosureCurrency ?? undefined,
      estimatedAnnualValue: extension.estimatedAnnualValue
        ? Number(extension.estimatedAnnualValue)
        : undefined,
      thresholdTriggered: extension.thresholdTriggered,
      thresholdAmount: extension.thresholdAmount
        ? Number(extension.thresholdAmount)
        : undefined,
      conflictDetected: extension.conflictDetected,
      conflictReason: extension.conflictReason ?? undefined,
      relatedPersonId: extension.relatedPersonId ?? undefined,
      relatedPersonName: extension.relatedPersonName ?? undefined,
      relatedCompany: extension.relatedCompany ?? undefined,
      relationshipType: extension.relationshipType ?? undefined,
      effectiveDate: extension.effectiveDate ?? undefined,
      expirationDate: extension.expirationDate ?? undefined,
      formTemplateId: extension.formTemplateId ?? undefined,
      formVersion: extension.formVersion ?? undefined,
      formData: (riu.formResponses as Record<string, unknown>) ?? {},
      campaignId: riu.campaignId ?? undefined,
      campaignAssignmentId: riu.campaignAssignmentId ?? undefined,
      thresholdEvaluation,
      conflicts,
      caseId: autoCreatedCase?.caseId,
      caseReferenceNumber: autoCreatedCase?.caseReferenceNumber,
      createdAt: riu.createdAt,
      updatedAt: extension.createdAt,
      submittedAt: riu.createdAt,
      submittedById: riu.createdById,
    };
  }

  /**
   * Maps extension to response DTO.
   */
  private mapExtensionToResponse(
    extension: {
      riuId: string;
      organizationId: string;
      disclosureType: DisclosureType;
      disclosureSubtype: string | null;
      disclosureValue: Decimal | null;
      disclosureCurrency: string | null;
      estimatedAnnualValue: Decimal | null;
      thresholdTriggered: boolean;
      thresholdAmount: Decimal | null;
      conflictDetected: boolean;
      conflictReason: string | null;
      relatedPersonId: string | null;
      relatedPersonName: string | null;
      relatedCompany: string | null;
      relationshipType: string | null;
      effectiveDate: Date | null;
      expirationDate: Date | null;
      formTemplateId: string | null;
      formVersion: number | null;
      createdAt: Date;
      riu: {
        id: string;
        referenceNumber: string;
        status: RiuStatus;
        organizationId: string;
        createdAt: Date;
        createdById: string;
        formResponses: Prisma.JsonValue;
        campaignId: string | null;
        campaignAssignmentId: string | null;
        caseAssociations?: Array<{
          case: {
            id: string;
            referenceNumber: string;
          };
        }>;
      };
    },
    conflicts: Array<{
      id: string;
      organizationId: string;
      disclosureId: string;
      conflictType: string;
      severity: string;
      status: string;
      summary: string;
      matchedEntity: string;
      matchConfidence: number;
      matchDetails: Prisma.JsonValue;
      severityFactors: Prisma.JsonValue | null;
      dismissedCategory: string | null;
      dismissedReason: string | null;
      dismissedBy: string | null;
      dismissedAt: Date | null;
      escalatedToCaseId: string | null;
      exclusionId: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ): DisclosureResponseDto {
    const riu = extension.riu;

    // Determine status from RIU status
    let status: DisclosureStatus;
    switch (riu.status) {
      case RiuStatus.COMPLETED:
        status = DisclosureStatus.APPROVED;
        break;
      case RiuStatus.CLOSED:
        status = DisclosureStatus.REJECTED;
        break;
      case RiuStatus.RELEASED:
        status = DisclosureStatus.UNDER_REVIEW;
        break;
      default:
        status = DisclosureStatus.SUBMITTED;
    }

    // Get case info if linked
    const caseAssoc = riu.caseAssociations?.[0];

    return {
      id: riu.id,
      referenceNumber: riu.referenceNumber,
      organizationId: riu.organizationId,
      status,
      disclosureType: extension.disclosureType,
      disclosureSubtype: extension.disclosureSubtype ?? undefined,
      disclosureValue: extension.disclosureValue
        ? Number(extension.disclosureValue)
        : undefined,
      disclosureCurrency: extension.disclosureCurrency ?? undefined,
      estimatedAnnualValue: extension.estimatedAnnualValue
        ? Number(extension.estimatedAnnualValue)
        : undefined,
      thresholdTriggered: extension.thresholdTriggered,
      thresholdAmount: extension.thresholdAmount
        ? Number(extension.thresholdAmount)
        : undefined,
      conflictDetected: extension.conflictDetected,
      conflictReason: extension.conflictReason ?? undefined,
      relatedPersonId: extension.relatedPersonId ?? undefined,
      relatedPersonName: extension.relatedPersonName ?? undefined,
      relatedCompany: extension.relatedCompany ?? undefined,
      relationshipType: extension.relationshipType ?? undefined,
      effectiveDate: extension.effectiveDate ?? undefined,
      expirationDate: extension.expirationDate ?? undefined,
      formTemplateId: extension.formTemplateId ?? undefined,
      formVersion: extension.formVersion ?? undefined,
      formData: (riu.formResponses as Record<string, unknown>) ?? {},
      campaignId: riu.campaignId ?? undefined,
      campaignAssignmentId: riu.campaignAssignmentId ?? undefined,
      thresholdEvaluation: undefined, // Not loaded in query
      conflicts: conflicts.map((c) => this.mapConflictToDto(c)),
      caseId: caseAssoc?.case?.id,
      caseReferenceNumber: caseAssoc?.case?.referenceNumber,
      createdAt: riu.createdAt,
      updatedAt: extension.createdAt,
      submittedAt: riu.createdAt,
      submittedById: riu.createdById,
    };
  }

  /**
   * Maps extension to list item DTO.
   */
  private mapExtensionToListItem(
    extension: {
      riuId: string;
      createdAt: Date;
      disclosureType: DisclosureType;
      disclosureSubtype: string | null;
      disclosureValue: Decimal | null;
      disclosureCurrency: string | null;
      relatedCompany: string | null;
      relatedPersonName: string | null;
      thresholdTriggered: boolean;
      conflictDetected: boolean;
      riu: {
        id: string;
        referenceNumber: string;
        status: RiuStatus;
        createdAt: Date;
        createdBy?: {
          id: string;
          firstName: string;
          lastName: string;
          email: string;
        };
      };
    },
    conflictCount: number,
  ): DisclosureListItemDto {
    const riu = extension.riu;

    // Determine status from RIU status
    let status: DisclosureStatus;
    switch (riu.status) {
      case RiuStatus.COMPLETED:
        status = DisclosureStatus.APPROVED;
        break;
      case RiuStatus.CLOSED:
        status = DisclosureStatus.REJECTED;
        break;
      case RiuStatus.RELEASED:
        status = DisclosureStatus.UNDER_REVIEW;
        break;
      default:
        status = DisclosureStatus.SUBMITTED;
    }

    return {
      id: riu.id,
      referenceNumber: riu.referenceNumber,
      status,
      disclosureType: extension.disclosureType,
      disclosureSubtype: extension.disclosureSubtype ?? undefined,
      disclosureValue: extension.disclosureValue
        ? Number(extension.disclosureValue)
        : undefined,
      disclosureCurrency: extension.disclosureCurrency ?? undefined,
      relatedCompany: extension.relatedCompany ?? undefined,
      relatedPersonName: extension.relatedPersonName ?? undefined,
      thresholdTriggered: extension.thresholdTriggered,
      conflictDetected: extension.conflictDetected,
      conflictCount,
      createdAt: extension.createdAt,
      submittedAt: riu.createdAt,
      submittedBy: riu.createdBy ?? {
        id: "",
        firstName: "",
        lastName: "",
        email: "",
      },
    };
  }

  /**
   * Maps conflict alert to DTO.
   */
  private mapConflictToDto(conflict: {
    id: string;
    organizationId: string;
    disclosureId: string;
    conflictType: string;
    severity: string;
    status: string;
    summary: string;
    matchedEntity: string;
    matchConfidence: number;
    matchDetails: Prisma.JsonValue;
    severityFactors: Prisma.JsonValue | null;
    dismissedCategory: string | null;
    dismissedReason: string | null;
    dismissedBy: string | null;
    dismissedAt: Date | null;
    escalatedToCaseId: string | null;
    exclusionId: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): ConflictAlertDto {
    return {
      id: conflict.id,
      organizationId: conflict.organizationId,
      disclosureId: conflict.disclosureId,
      conflictType: conflict.conflictType as ConflictAlertDto["conflictType"],
      severity: conflict.severity as ConflictAlertDto["severity"],
      status: conflict.status as ConflictAlertDto["status"],
      summary: conflict.summary,
      matchedEntity: conflict.matchedEntity,
      matchConfidence: conflict.matchConfidence,
      matchDetails: conflict.matchDetails as ConflictAlertDto["matchDetails"],
      severityFactors: conflict.severityFactors
        ? (conflict.severityFactors as unknown as ConflictAlertDto["severityFactors"])
        : undefined,
      dismissedCategory:
        (conflict.dismissedCategory as DismissalCategory | undefined) ??
        undefined,
      dismissedReason: conflict.dismissedReason ?? undefined,
      dismissedBy: conflict.dismissedBy ?? undefined,
      dismissedAt: conflict.dismissedAt ?? undefined,
      escalatedToCaseId: conflict.escalatedToCaseId ?? undefined,
      exclusionId: conflict.exclusionId ?? undefined,
      createdAt: conflict.createdAt,
      updatedAt: conflict.updatedAt,
    };
  }
}
