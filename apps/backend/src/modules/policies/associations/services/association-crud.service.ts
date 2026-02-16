import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Prisma,
  PolicyCaseAssociation,
  PolicyCaseLinkType,
  AuditEntityType,
} from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { ActivityService } from "../../../../common/services/activity.service";
import {
  CreatePolicyCaseAssociationDto,
  UpdatePolicyCaseAssociationDto,
  PolicyCaseQueryDto,
} from "../dto/association.dto";
import { BaseEvent } from "../../../events/events/base.event";

/**
 * Emitted when a policy is linked to a case.
 * Subscribers: audit logging, notifications
 */
export class PolicyLinkedToCaseEvent extends BaseEvent {
  static readonly eventName = "policy.linked_to_case";

  readonly associationId: string;
  readonly policyId: string;
  readonly caseId: string;
  readonly linkType: PolicyCaseLinkType;

  constructor(data: Partial<PolicyLinkedToCaseEvent>) {
    super(data);
    if (!data.associationId) {
      throw new Error("PolicyLinkedToCaseEvent requires associationId");
    }
    if (!data.policyId) {
      throw new Error("PolicyLinkedToCaseEvent requires policyId");
    }
    if (!data.caseId) {
      throw new Error("PolicyLinkedToCaseEvent requires caseId");
    }
    if (!data.linkType) {
      throw new Error("PolicyLinkedToCaseEvent requires linkType");
    }

    this.associationId = data.associationId;
    this.policyId = data.policyId;
    this.caseId = data.caseId;
    this.linkType = data.linkType;
  }
}

/**
 * Emitted when a policy is unlinked from a case.
 * Subscribers: audit logging
 */
export class PolicyUnlinkedFromCaseEvent extends BaseEvent {
  static readonly eventName = "policy.unlinked_from_case";

  readonly associationId: string;
  readonly policyId: string;
  readonly caseId: string;

  constructor(data: Partial<PolicyUnlinkedFromCaseEvent>) {
    super(data);
    if (!data.associationId) {
      throw new Error("PolicyUnlinkedFromCaseEvent requires associationId");
    }
    if (!data.policyId) {
      throw new Error("PolicyUnlinkedFromCaseEvent requires policyId");
    }
    if (!data.caseId) {
      throw new Error("PolicyUnlinkedFromCaseEvent requires caseId");
    }

    this.associationId = data.associationId;
    this.policyId = data.policyId;
    this.caseId = data.caseId;
  }
}

/**
 * Standard include configuration for association queries.
 */
const ASSOCIATION_INCLUDE = {
  policy: {
    select: {
      id: true,
      title: true,
      policyType: true,
      status: true,
    },
  },
  policyVersion: {
    select: {
      id: true,
      version: true,
      versionLabel: true,
    },
  },
  case: {
    select: {
      id: true,
      referenceNumber: true,
      status: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
    },
  },
} as const;

/**
 * Service for CRUD operations on policy-case associations.
 *
 * Handles:
 * - Creating associations with duplicate prevention
 * - Updating association metadata
 * - Deleting associations
 * - Reading associations by policy, case, or ID
 * - Event emission for link/unlink operations
 */
@Injectable()
export class AssociationCrudService {
  private readonly logger = new Logger(AssociationCrudService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a policy-to-case association.
   *
   * - Verifies policy exists and belongs to organization
   * - Verifies case exists and belongs to organization
   * - Defaults to latest published version if policyVersionId not provided
   * - Prevents duplicate links (unique constraint: policyId + caseId)
   */
  async create(
    dto: CreatePolicyCaseAssociationDto,
    userId: string,
    organizationId: string,
  ): Promise<PolicyCaseAssociation> {
    // Verify policy exists and belongs to org
    const policy = await this.prisma.policy.findFirst({
      where: {
        id: dto.policyId,
        organizationId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!policy) {
      throw new NotFoundException(
        `Policy with ID ${dto.policyId} not found in organization`,
      );
    }

    // Verify case exists and belongs to org
    const caseEntity = await this.prisma.case.findFirst({
      where: {
        id: dto.caseId,
        organizationId,
      },
      select: {
        id: true,
        referenceNumber: true,
      },
    });

    if (!caseEntity) {
      throw new NotFoundException(
        `Case with ID ${dto.caseId} not found in organization`,
      );
    }

    // Determine policy version ID
    const policyVersionId = await this.resolvePolicyVersionId(
      dto.policyId,
      dto.policyVersionId,
      organizationId,
    );

    // Check for existing link
    const existingLink = await this.prisma.policyCaseAssociation.findFirst({
      where: {
        policyId: dto.policyId,
        caseId: dto.caseId,
        organizationId,
      },
    });

    if (existingLink) {
      throw new ConflictException("Policy already linked to this case");
    }

    // Create association
    const association = await this.prisma.policyCaseAssociation.create({
      data: {
        organizationId,
        policyId: dto.policyId,
        policyVersionId: policyVersionId || null,
        caseId: dto.caseId,
        linkType: dto.linkType,
        linkReason: dto.linkReason,
        violationDate: dto.violationDate ? new Date(dto.violationDate) : null,
        createdById: userId,
      },
      include: {
        ...ASSOCIATION_INCLUDE,
        policyVersion: {
          select: {
            id: true,
            version: true,
            versionLabel: true,
          },
        },
      },
    });

    // Log activity on case
    await this.activityService.log({
      entityType: AuditEntityType.CASE,
      entityId: dto.caseId,
      action: "policy_linked",
      actionDescription: `Policy linked: "${policy.title}" (${dto.linkType})`,
      actorUserId: userId,
      organizationId,
      context: {
        policyId: dto.policyId,
        policyVersionId,
        linkType: dto.linkType,
      },
    });

    // Log activity on policy
    await this.activityService.log({
      entityType: AuditEntityType.POLICY,
      entityId: dto.policyId,
      action: "linked_to_case",
      actionDescription: `Linked to case: ${caseEntity.referenceNumber} (${dto.linkType})`,
      actorUserId: userId,
      organizationId,
      context: {
        caseId: dto.caseId,
        caseReferenceNumber: caseEntity.referenceNumber,
        linkType: dto.linkType,
      },
    });

    // Emit event
    this.emitEvent(
      PolicyLinkedToCaseEvent.eventName,
      new PolicyLinkedToCaseEvent({
        organizationId,
        actorUserId: userId,
        actorType: "USER",
        associationId: association.id,
        policyId: dto.policyId,
        caseId: dto.caseId,
        linkType: dto.linkType,
      }),
    );

    this.logger.log(
      `Created policy-case association: ${dto.policyId} -> ${dto.caseId} (${dto.linkType})`,
    );

    return association;
  }

  /**
   * Updates a policy-case association.
   * Only linkType, linkReason, and violationDate can be updated.
   */
  async update(
    id: string,
    dto: UpdatePolicyCaseAssociationDto,
    userId: string,
    organizationId: string,
  ): Promise<PolicyCaseAssociation> {
    // Verify association exists and belongs to org
    const existing = await this.prisma.policyCaseAssociation.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        policy: {
          select: { title: true },
        },
        case: {
          select: { referenceNumber: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Policy-case association with ID ${id} not found`,
      );
    }

    // Build update data
    const data: Prisma.PolicyCaseAssociationUncheckedUpdateInput = {};
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    if (dto.linkType !== undefined && dto.linkType !== existing.linkType) {
      data.linkType = dto.linkType;
      changes.linkType = { old: existing.linkType, new: dto.linkType };
    }

    if (
      dto.linkReason !== undefined &&
      dto.linkReason !== existing.linkReason
    ) {
      data.linkReason = dto.linkReason;
      changes.linkReason = { old: existing.linkReason, new: dto.linkReason };
    }

    if (dto.violationDate !== undefined) {
      const newDate = dto.violationDate ? new Date(dto.violationDate) : null;
      data.violationDate = newDate;
      changes.violationDate = { old: existing.violationDate, new: newDate };
    }

    // Only update if there are changes
    if (Object.keys(data).length === 0) {
      return this.findById(id, organizationId);
    }

    const updated = await this.prisma.policyCaseAssociation.update({
      where: { id },
      data,
      include: ASSOCIATION_INCLUDE,
    });

    // Log activity
    if (Object.keys(changes).length > 0) {
      const changedFields = Object.keys(changes);
      await this.activityService.log({
        entityType: AuditEntityType.CASE,
        entityId: existing.caseId,
        action: "policy_link_updated",
        actionDescription: `Policy link updated: "${existing.policy.title}" - ${changedFields.join(", ")}`,
        actorUserId: userId,
        organizationId,
        changes: {
          oldValue: Object.fromEntries(
            changedFields.map((f) => [f, changes[f].old]),
          ),
          newValue: Object.fromEntries(
            changedFields.map((f) => [f, changes[f].new]),
          ),
        },
      });
    }

    this.logger.log(`Updated policy-case association: ${id}`);

    return updated;
  }

  /**
   * Deletes a policy-case association.
   */
  async delete(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    // Verify association exists and belongs to org
    const existing = await this.prisma.policyCaseAssociation.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        policy: {
          select: { title: true },
        },
        case: {
          select: { referenceNumber: true },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Policy-case association with ID ${id} not found`,
      );
    }

    // Delete association
    await this.prisma.policyCaseAssociation.delete({
      where: { id },
    });

    // Log activity on case
    await this.activityService.log({
      entityType: AuditEntityType.CASE,
      entityId: existing.caseId,
      action: "policy_unlinked",
      actionDescription: `Policy unlinked: "${existing.policy.title}"`,
      actorUserId: userId,
      organizationId,
      context: {
        policyId: existing.policyId,
      },
    });

    // Log activity on policy
    await this.activityService.log({
      entityType: AuditEntityType.POLICY,
      entityId: existing.policyId,
      action: "unlinked_from_case",
      actionDescription: `Unlinked from case: ${existing.case.referenceNumber}`,
      actorUserId: userId,
      organizationId,
      context: {
        caseId: existing.caseId,
      },
    });

    // Emit event
    this.emitEvent(
      PolicyUnlinkedFromCaseEvent.eventName,
      new PolicyUnlinkedFromCaseEvent({
        organizationId,
        actorUserId: userId,
        actorType: "USER",
        associationId: id,
        policyId: existing.policyId,
        caseId: existing.caseId,
      }),
    );

    this.logger.log(`Deleted policy-case association: ${id}`);
  }

  /**
   * Finds all associations for a policy.
   * Returns associations ordered by createdAt DESC.
   */
  async findByPolicy(
    policyId: string,
    organizationId: string,
  ): Promise<PolicyCaseAssociation[]> {
    // Verify policy exists
    const policy = await this.prisma.policy.findFirst({
      where: {
        id: policyId,
        organizationId,
      },
    });

    if (!policy) {
      throw new NotFoundException(
        `Policy with ID ${policyId} not found in organization`,
      );
    }

    return this.prisma.policyCaseAssociation.findMany({
      where: {
        policyId,
        organizationId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        case: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
          },
        },
        policyVersion: {
          select: {
            id: true,
            version: true,
            versionLabel: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Finds all associations for a case.
   * Returns associations ordered by linkType (VIOLATION first), then createdAt DESC.
   */
  async findByCase(
    caseId: string,
    organizationId: string,
  ): Promise<PolicyCaseAssociation[]> {
    // Verify case exists
    const caseEntity = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId,
      },
    });

    if (!caseEntity) {
      throw new NotFoundException(
        `Case with ID ${caseId} not found in organization`,
      );
    }

    const associations = await this.prisma.policyCaseAssociation.findMany({
      where: {
        caseId,
        organizationId,
      },
      orderBy: { createdAt: "desc" },
      include: {
        policy: {
          select: {
            id: true,
            title: true,
            policyType: true,
            status: true,
          },
        },
        policyVersion: {
          select: {
            id: true,
            version: true,
            versionLabel: true,
            content: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Sort by link type priority (VIOLATION > GOVERNING > REFERENCE)
    const typePriority: Record<PolicyCaseLinkType, number> = {
      [PolicyCaseLinkType.VIOLATION]: 0,
      [PolicyCaseLinkType.GOVERNING]: 1,
      [PolicyCaseLinkType.REFERENCE]: 2,
    };

    return associations.sort((a, b) => {
      const priorityDiff = typePriority[a.linkType] - typePriority[b.linkType];
      if (priorityDiff !== 0) return priorityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  /**
   * Finds a single association by ID.
   */
  async findById(
    id: string,
    organizationId: string,
  ): Promise<PolicyCaseAssociation> {
    const association = await this.prisma.policyCaseAssociation.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        policy: {
          select: {
            id: true,
            title: true,
            policyType: true,
            status: true,
          },
        },
        policyVersion: {
          select: {
            id: true,
            version: true,
            versionLabel: true,
            content: true,
          },
        },
        case: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!association) {
      throw new NotFoundException(
        `Policy-case association with ID ${id} not found`,
      );
    }

    return association;
  }

  /**
   * Queries associations with filtering and pagination.
   */
  async findAll(
    query: PolicyCaseQueryDto,
    organizationId: string,
  ): Promise<{ data: PolicyCaseAssociation[]; total: number }> {
    const { policyId, caseId, linkType, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PolicyCaseAssociationWhereInput = {
      organizationId,
    };

    if (policyId) {
      where.policyId = policyId;
    }

    if (caseId) {
      where.caseId = caseId;
    }

    if (linkType) {
      where.linkType = linkType;
    }

    const [data, total] = await Promise.all([
      this.prisma.policyCaseAssociation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        include: ASSOCIATION_INCLUDE,
      }),
      this.prisma.policyCaseAssociation.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Resolves policy version ID, defaulting to latest published version if not provided.
   */
  private async resolvePolicyVersionId(
    policyId: string,
    policyVersionId: string | undefined,
    organizationId: string,
  ): Promise<string | undefined> {
    if (!policyVersionId) {
      // Get latest published version
      const latestVersion = await this.prisma.policyVersion.findFirst({
        where: {
          policyId,
          organizationId,
          isLatest: true,
        },
        select: {
          id: true,
        },
      });
      return latestVersion?.id;
    }

    // Verify version exists and belongs to policy
    const version = await this.prisma.policyVersion.findFirst({
      where: {
        id: policyVersionId,
        policyId,
        organizationId,
      },
    });
    if (!version) {
      throw new NotFoundException(
        `Policy version with ID ${policyVersionId} not found`,
      );
    }

    return policyVersionId;
  }

  /**
   * Safely emits an event. Failures are logged but don't crash the request.
   */
  private emitEvent(eventName: string, event: BaseEvent): void {
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
