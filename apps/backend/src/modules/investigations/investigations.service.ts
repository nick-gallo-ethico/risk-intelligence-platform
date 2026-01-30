import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import {
  Prisma,
  Investigation,
  InvestigationStatus,
  AuditEntityType,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import {
  CreateInvestigationDto,
  UpdateInvestigationDto,
  InvestigationQueryDto,
  AssignInvestigationDto,
  TransitionInvestigationDto,
  InvestigationFindingsDto,
  CloseInvestigationDto,
} from "./dto";

/**
 * Assignment history entry structure stored in JSON field
 */
interface AssignmentHistoryEntry {
  assignedTo: string[];
  primaryInvestigatorId: string | null;
  assignedAt: string; // ISO date string
  assignedById: string;
}

/**
 * Service for managing investigations.
 * All queries are scoped to the user's organization via RLS and explicit filtering.
 */
@Injectable()
export class InvestigationsService {
  private readonly logger = new Logger(InvestigationsService.name);

  /**
   * Valid status transitions for the investigation workflow.
   * ON_HOLD is handled specially as it can return to previous state.
   */
  private readonly validTransitions: Record<
    InvestigationStatus,
    InvestigationStatus[]
  > = {
    [InvestigationStatus.NEW]: [
      InvestigationStatus.ASSIGNED,
      InvestigationStatus.ON_HOLD,
    ],
    [InvestigationStatus.ASSIGNED]: [
      InvestigationStatus.INVESTIGATING,
      InvestigationStatus.ON_HOLD,
    ],
    [InvestigationStatus.INVESTIGATING]: [
      InvestigationStatus.PENDING_REVIEW,
      InvestigationStatus.ON_HOLD,
    ],
    [InvestigationStatus.PENDING_REVIEW]: [
      InvestigationStatus.CLOSED,
      InvestigationStatus.INVESTIGATING,
      InvestigationStatus.ON_HOLD,
    ],
    [InvestigationStatus.ON_HOLD]: [
      // ON_HOLD can return to any non-terminal state
      InvestigationStatus.NEW,
      InvestigationStatus.ASSIGNED,
      InvestigationStatus.INVESTIGATING,
      InvestigationStatus.PENDING_REVIEW,
    ],
    [InvestigationStatus.CLOSED]: [], // Terminal - no transitions out
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  // -------------------------------------------------------------------------
  // CREATE - Create new investigation for a case
  // -------------------------------------------------------------------------

  /**
   * Creates a new investigation for a case.
   * Auto-generates investigation number and sets initial status to NEW.
   */
  async create(
    dto: CreateInvestigationDto,
    caseId: string,
    userId: string,
    organizationId: string,
  ): Promise<Investigation> {
    this.logger.debug(
      `Creating investigation for case ${caseId} in org ${organizationId}`,
    );

    // Verify case exists and belongs to organization
    const parentCase = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId, // CRITICAL: Verify org ownership
      },
      select: {
        id: true,
        referenceNumber: true,
        organizationId: true,
      },
    });

    if (!parentCase) {
      throw new NotFoundException(`Case with ID ${caseId} not found`);
    }

    // Generate next investigation number for this case
    const investigationNumber = await this.getNextInvestigationNumber(
      caseId,
      organizationId,
    );

    const investigation = await this.prisma.investigation.create({
      data: {
        caseId,
        organizationId: parentCase.organizationId, // Denormalize from case
        investigationNumber,
        categoryId: dto.categoryId,
        investigationType: dto.investigationType,
        department: dto.department,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        templateId: dto.templateId,
        status: InvestigationStatus.NEW,
        createdById: userId,
        updatedById: userId,
      },
    });

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.INVESTIGATION,
      entityId: investigation.id,
      action: "created",
      actionDescription: `Created investigation #${investigationNumber} for case ${parentCase.referenceNumber}`,
      actorUserId: userId,
      organizationId,
      context: { caseId, investigationNumber },
    });

    return investigation;
  }

  // -------------------------------------------------------------------------
  // FIND ALL FOR CASE - Paginated list of investigations for a case
  // -------------------------------------------------------------------------

  /**
   * Returns paginated list of investigations for a specific case.
   */
  async findAllForCase(
    caseId: string,
    query: InvestigationQueryDto,
    organizationId: string,
  ): Promise<{
    data: Investigation[];
    total: number;
    limit: number;
    page: number;
  }> {
    const {
      limit = 20,
      page = 1,
      status,
      assignedToId,
      department,
      sortBy = "investigationNumber",
      sortOrder = "asc",
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause - ALWAYS includes organizationId
    const where: Prisma.InvestigationWhereInput = {
      caseId,
      organizationId, // CRITICAL: Tenant isolation
    };

    if (status) {
      where.status = status;
    }

    if (assignedToId) {
      where.assignedTo = { has: assignedToId };
    }

    if (department) {
      where.department = department;
    }

    const [data, total] = await Promise.all([
      this.prisma.investigation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
      }),
      this.prisma.investigation.count({ where }),
    ]);

    return { data, total, limit, page };
  }

  // -------------------------------------------------------------------------
  // FIND ONE - Get single investigation with relations
  // -------------------------------------------------------------------------

  /**
   * Returns a single investigation by ID with case and assignee details.
   * Throws NotFoundException if not found or belongs to different org.
   */
  async findOne(id: string, organizationId: string): Promise<Investigation> {
    const investigation = await this.prisma.investigation.findFirst({
      where: {
        id,
        organizationId, // CRITICAL: Tenant isolation
      },
      include: {
        case: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            severity: true,
          },
        },
        primaryInvestigator: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        assignedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Return 404 for both "not found" AND "wrong org" to prevent enumeration
    if (!investigation) {
      throw new NotFoundException(`Investigation with ID ${id} not found`);
    }

    return investigation;
  }

  // -------------------------------------------------------------------------
  // UPDATE - Update investigation fields
  // -------------------------------------------------------------------------

  /**
   * Updates an investigation's fields.
   */
  async update(
    id: string,
    dto: UpdateInvestigationDto,
    userId: string,
    organizationId: string,
  ): Promise<Investigation> {
    // Verify investigation exists and belongs to org
    const existing = await this.findOne(id, organizationId);

    const updated = await this.prisma.investigation.update({
      where: { id },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        updatedById: userId,
      },
    });

    // Build description of changed fields
    const changedFields = Object.keys(dto).filter(
      (key) => dto[key as keyof UpdateInvestigationDto] !== undefined,
    );

    await this.activityService.log({
      entityType: AuditEntityType.INVESTIGATION,
      entityId: id,
      action: "updated",
      actionDescription: `Updated investigation #${existing.investigationNumber}: ${changedFields.join(", ")}`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: {
          fields: changedFields.map((f) => existing[f as keyof Investigation]),
        },
        newValue: { ...dto } as Record<string, unknown>,
      },
    });

    return updated;
  }

  // -------------------------------------------------------------------------
  // ASSIGN - Assign investigators to investigation
  // -------------------------------------------------------------------------

  /**
   * Assigns investigators to an investigation.
   * Automatically transitions from NEW to ASSIGNED.
   */
  async assign(
    id: string,
    dto: AssignInvestigationDto,
    userId: string,
    organizationId: string,
  ): Promise<Investigation> {
    const existing = await this.findOne(id, organizationId);

    // Validate primary investigator is in assignedTo list
    if (!dto.assignedTo.includes(dto.primaryInvestigatorId)) {
      throw new BadRequestException(
        "Primary investigator must be in the assigned investigators list",
      );
    }

    // Build new assignment history entry
    const now = new Date();
    const newHistoryEntry: AssignmentHistoryEntry = {
      assignedTo: dto.assignedTo,
      primaryInvestigatorId: dto.primaryInvestigatorId,
      assignedAt: now.toISOString(),
      assignedById: userId,
    };

    // Append to existing history (or create new array)
    const existingHistory =
      (existing.assignmentHistory as unknown as AssignmentHistoryEntry[]) || [];
    const updatedHistory = [
      ...existingHistory,
      newHistoryEntry,
    ] as unknown as Prisma.InputJsonValue;

    // Determine new status - transition from NEW to ASSIGNED
    const newStatus =
      existing.status === InvestigationStatus.NEW
        ? InvestigationStatus.ASSIGNED
        : existing.status;

    const updated = await this.prisma.investigation.update({
      where: { id },
      data: {
        assignedTo: dto.assignedTo,
        primaryInvestigatorId: dto.primaryInvestigatorId,
        assignedAt: now,
        assignedById: userId,
        assignmentHistory: updatedHistory,
        status: newStatus,
        statusChangedAt:
          newStatus !== existing.status ? now : existing.statusChangedAt,
        updatedById: userId,
      },
    });

    // Log assignment activity
    await this.activityService.log({
      entityType: AuditEntityType.INVESTIGATION,
      entityId: id,
      action: "assigned",
      actionDescription: `Assigned ${dto.assignedTo.length} investigator(s) to investigation #${existing.investigationNumber}`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: {
          assignedTo: existing.assignedTo,
          primaryInvestigatorId: existing.primaryInvestigatorId,
        },
        newValue: {
          assignedTo: dto.assignedTo,
          primaryInvestigatorId: dto.primaryInvestigatorId,
        },
      },
    });

    // Log status change if it occurred
    if (newStatus !== existing.status) {
      await this.activityService.log({
        entityType: AuditEntityType.INVESTIGATION,
        entityId: id,
        action: "status_changed",
        actionDescription: `Status auto-changed from ${existing.status} to ${newStatus} due to assignment`,
        actorUserId: userId,
        organizationId,
        changes: {
          oldValue: { status: existing.status },
          newValue: { status: newStatus },
        },
      });
    }

    return updated;
  }

  // -------------------------------------------------------------------------
  // TRANSITION - Change investigation status
  // -------------------------------------------------------------------------

  /**
   * Transitions investigation to a new status.
   * Validates transition rules and requires rationale.
   */
  async transition(
    id: string,
    dto: TransitionInvestigationDto,
    userId: string,
    organizationId: string,
  ): Promise<Investigation> {
    const existing = await this.findOne(id, organizationId);

    // Validate status transition
    if (!this.isValidTransition(existing.status, dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${existing.status} to ${dto.status}`,
      );
    }

    // Special validation: CLOSED requires findings
    if (dto.status === InvestigationStatus.CLOSED) {
      if (!existing.findingsSummary || !existing.outcome) {
        throw new BadRequestException(
          "Findings summary and outcome are required before closing an investigation",
        );
      }
    }

    const now = new Date();

    const updated = await this.prisma.investigation.update({
      where: { id },
      data: {
        status: dto.status,
        statusRationale: dto.rationale,
        statusChangedAt: now,
        updatedById: userId,
        // Set closure fields if transitioning to CLOSED
        ...(dto.status === InvestigationStatus.CLOSED && {
          closedAt: now,
          closedById: userId,
        }),
      },
    });

    await this.activityService.log({
      entityType: AuditEntityType.INVESTIGATION,
      entityId: id,
      action: "status_changed",
      actionDescription: `Changed status from ${existing.status} to ${dto.status}. Reason: ${dto.rationale}`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: { status: existing.status },
        newValue: { status: dto.status, rationale: dto.rationale },
      },
    });

    return updated;
  }

  // -------------------------------------------------------------------------
  // RECORD FINDINGS - Document investigation findings
  // -------------------------------------------------------------------------

  /**
   * Records findings for an investigation.
   */
  async recordFindings(
    id: string,
    dto: InvestigationFindingsDto,
    userId: string,
    organizationId: string,
  ): Promise<Investigation> {
    const existing = await this.findOne(id, organizationId);

    const now = new Date();

    const updated = await this.prisma.investigation.update({
      where: { id },
      data: {
        findingsSummary: dto.findingsSummary,
        findingsDetail: dto.findingsDetail,
        outcome: dto.outcome,
        rootCause: dto.rootCause,
        lessonsLearned: dto.lessonsLearned,
        findingsDate: now,
        updatedById: userId,
      },
    });

    await this.activityService.log({
      entityType: AuditEntityType.INVESTIGATION,
      entityId: id,
      action: "findings_recorded",
      actionDescription: `Recorded findings for investigation #${existing.investigationNumber} with outcome: ${dto.outcome}`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: {
          findingsSummary: existing.findingsSummary,
          outcome: existing.outcome,
        },
        newValue: {
          findingsSummary: dto.findingsSummary,
          outcome: dto.outcome,
        },
      },
    });

    return updated;
  }

  // -------------------------------------------------------------------------
  // CLOSE - Close investigation with required fields
  // -------------------------------------------------------------------------

  /**
   * Closes an investigation.
   * Requires findings summary and outcome.
   */
  async close(
    id: string,
    dto: CloseInvestigationDto,
    userId: string,
    organizationId: string,
  ): Promise<Investigation> {
    const existing = await this.findOne(id, organizationId);

    // Validate current status allows closing
    if (!this.isValidTransition(existing.status, InvestigationStatus.CLOSED)) {
      throw new BadRequestException(
        `Cannot close investigation from ${existing.status} status`,
      );
    }

    const now = new Date();

    const updated = await this.prisma.investigation.update({
      where: { id },
      data: {
        findingsSummary: dto.findingsSummary,
        outcome: dto.outcome,
        closureNotes: dto.closureNotes,
        findingsDate: existing.findingsDate || now,
        status: InvestigationStatus.CLOSED,
        statusChangedAt: now,
        closedAt: now,
        closedById: userId,
        updatedById: userId,
      },
    });

    await this.activityService.log({
      entityType: AuditEntityType.INVESTIGATION,
      entityId: id,
      action: "closed",
      actionDescription: `Closed investigation #${existing.investigationNumber} with outcome: ${dto.outcome}`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: { status: existing.status },
        newValue: {
          status: InvestigationStatus.CLOSED,
          outcome: dto.outcome,
          closureNotes: dto.closureNotes,
        },
      },
    });

    return updated;
  }

  // -------------------------------------------------------------------------
  // HELPERS
  // -------------------------------------------------------------------------

  /**
   * Gets the next investigation number for a case.
   */
  async getNextInvestigationNumber(
    caseId: string,
    organizationId: string,
  ): Promise<number> {
    const count = await this.prisma.investigation.count({
      where: {
        caseId,
        organizationId, // CRITICAL: Tenant isolation
      },
    });
    return count + 1;
  }

  /**
   * Validates if a status transition is allowed.
   */
  private isValidTransition(
    from: InvestigationStatus,
    to: InvestigationStatus,
  ): boolean {
    if (from === to) {
      return false; // No self-transitions
    }
    return this.validTransitions[from]?.includes(to) ?? false;
  }
}
