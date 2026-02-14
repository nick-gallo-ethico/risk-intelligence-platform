import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Prisma,
  Policy,
  PolicyVersion,
  PolicyStatus,
  AuditEntityType,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import {
  CreatePolicyDto,
  UpdatePolicyDto,
  PublishPolicyDto,
  PolicyQueryDto,
} from "./dto";
import {
  PolicyCreatedEvent,
  PolicyUpdatedEvent,
  PolicyPublishedEvent,
  PolicyRetiredEvent,
  PolicyStatusChangedEvent,
} from "./events/policy.events";

/**
 * Service for managing policies with version-on-publish pattern.
 *
 * Key design decisions:
 * - Drafts are mutable, versions are immutable
 * - Publishing creates a new PolicyVersion and clears draft
 * - Editing a published policy copies latest version to draft
 * - All queries are scoped to user's organization via RLS
 */
@Injectable()
export class PoliciesService {
  private readonly logger = new Logger(PoliciesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // =========================================================================
  // CREATE
  // =========================================================================

  /**
   * Creates a new policy in DRAFT status.
   * Generates a unique slug within the organization.
   */
  async create(
    dto: CreatePolicyDto,
    userId: string,
    organizationId: string,
  ): Promise<Policy> {
    const slug = await this.generateSlug(dto.title, organizationId);

    const data: Prisma.PolicyUncheckedCreateInput = {
      organizationId,
      title: dto.title,
      slug,
      policyType: dto.policyType,
      category: dto.category,
      status: PolicyStatus.DRAFT,
      currentVersion: 0,
      ownerId: dto.ownerId || userId,
      draftContent: dto.content,
      draftUpdatedAt: dto.content ? new Date() : null,
      draftUpdatedById: dto.content ? userId : null,
      effectiveDate: dto.effectiveDate ? new Date(dto.effectiveDate) : null,
      reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : null,
      createdById: userId,
    };

    const policy = await this.prisma.policy.create({
      data,
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.POLICY,
      entityId: policy.id,
      action: "created",
      actionDescription: `Created policy "${policy.title}"`,
      actorUserId: userId,
      organizationId,
    });

    // Emit event
    this.emitEvent(
      PolicyCreatedEvent.eventName,
      new PolicyCreatedEvent({
        organizationId,
        actorUserId: userId,
        actorType: "USER",
        policyId: policy.id,
        title: policy.title,
        ownerId: policy.ownerId,
      }),
    );

    return policy;
  }

  // =========================================================================
  // READ
  // =========================================================================

  /**
   * Returns a single policy by ID.
   * Returns null if not found or belongs to different organization.
   */
  async findById(id: string, organizationId: string): Promise<Policy | null> {
    const policy = await this.prisma.policy.findFirst({
      where: {
        id,
        organizationId,
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        versions: {
          where: { isLatest: true },
          take: 1,
          include: {
            publishedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return policy;
  }

  /**
   * Returns a single policy by ID, throwing if not found.
   */
  async findByIdOrFail(id: string, organizationId: string): Promise<Policy> {
    const policy = await this.findById(id, organizationId);
    if (!policy) {
      throw new NotFoundException(`Policy with ID ${id} not found`);
    }
    return policy;
  }

  /**
   * Returns paginated list of policies with filtering and sorting.
   */
  async findAll(
    query: PolicyQueryDto,
    organizationId: string,
  ): Promise<{ data: Policy[]; total: number; page: number; limit: number }> {
    const {
      page = 1,
      limit = 20,
      status,
      policyType,
      ownerId,
      search,
      sortBy = "updatedAt",
      sortOrder = "desc",
    } = query;

    const skip = (page - 1) * limit;

    const where: Prisma.PolicyWhereInput = {
      organizationId,
    };

    if (status) {
      where.status = status;
    }

    if (policyType) {
      where.policyType = policyType;
    }

    if (ownerId) {
      where.ownerId = ownerId;
    }

    if (search && search.trim()) {
      where.title = {
        contains: search.trim(),
        mode: "insensitive",
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.policy.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip,
        include: {
          owner: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.prisma.policy.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  // =========================================================================
  // UPDATE DRAFT
  // =========================================================================

  /**
   * Updates the draft content of a policy.
   *
   * Rules:
   * - Cannot update if status is PENDING_APPROVAL
   * - If PUBLISHED and no draft exists, copies latest version to draft first
   * - Updates draftContent, draftUpdatedAt, draftUpdatedById
   */
  async updateDraft(
    policyId: string,
    dto: UpdatePolicyDto,
    userId: string,
    organizationId: string,
  ): Promise<Policy> {
    const existing = await this.findByIdOrFail(policyId, organizationId);

    // Cannot edit during approval workflow
    if (existing.status === PolicyStatus.PENDING_APPROVAL) {
      throw new BadRequestException(
        "Cannot update policy while pending approval",
      );
    }

    // If published and no draft, initialize draft from latest version
    if (existing.status === PolicyStatus.PUBLISHED && !existing.draftContent) {
      const latestVersion = await this.prisma.policyVersion.findFirst({
        where: {
          policyId,
          organizationId,
          isLatest: true,
        },
      });

      if (latestVersion) {
        // Copy latest version content to draft
        await this.prisma.policy.update({
          where: { id: policyId },
          data: {
            draftContent: latestVersion.content,
            draftUpdatedAt: new Date(),
            draftUpdatedById: userId,
          },
        });
      }
    }

    // Build update data (updatedAt is auto-updated by Prisma)
    const data: Prisma.PolicyUncheckedUpdateInput = {};

    // Track changes for activity log
    const changes: Record<string, { old: unknown; new: unknown }> = {};

    if (dto.title !== undefined && dto.title !== existing.title) {
      data.title = dto.title;
      // Regenerate slug if title changes
      data.slug = await this.generateSlug(dto.title, organizationId, policyId);
      changes.title = { old: existing.title, new: dto.title };
    }

    if (
      dto.policyType !== undefined &&
      dto.policyType !== existing.policyType
    ) {
      data.policyType = dto.policyType;
      changes.policyType = { old: existing.policyType, new: dto.policyType };
    }

    if (dto.category !== undefined && dto.category !== existing.category) {
      data.category = dto.category;
      changes.category = { old: existing.category, new: dto.category };
    }

    if (dto.content !== undefined) {
      data.draftContent = dto.content;
      data.draftUpdatedAt = new Date();
      data.draftUpdatedById = userId;
      changes.draftContent = { old: "[content]", new: "[content]" };
    }

    if (dto.ownerId !== undefined && dto.ownerId !== existing.ownerId) {
      data.ownerId = dto.ownerId;
      changes.ownerId = { old: existing.ownerId, new: dto.ownerId };
    }

    if (dto.effectiveDate !== undefined) {
      const newDate = dto.effectiveDate ? new Date(dto.effectiveDate) : null;
      data.effectiveDate = newDate;
      changes.effectiveDate = {
        old: existing.effectiveDate,
        new: newDate,
      };
    }

    if (dto.reviewDate !== undefined) {
      const newDate = dto.reviewDate ? new Date(dto.reviewDate) : null;
      data.reviewDate = newDate;
      changes.reviewDate = { old: existing.reviewDate, new: newDate };
    }

    const updated = await this.prisma.policy.update({
      where: { id: policyId },
      data,
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Log activity if there were changes
    if (Object.keys(changes).length > 0) {
      const changedFields = Object.keys(changes);
      await this.activityService.log({
        entityType: AuditEntityType.POLICY,
        entityId: policyId,
        action: "updated",
        actionDescription: `Updated ${changedFields.join(", ")} on policy "${updated.title}"`,
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

      // Emit event
      this.emitEvent(
        PolicyUpdatedEvent.eventName,
        new PolicyUpdatedEvent({
          organizationId,
          actorUserId: userId,
          actorType: "USER",
          policyId,
          changes,
        }),
      );
    }

    return updated;
  }

  // =========================================================================
  // PUBLISH
  // =========================================================================

  /**
   * Publishes the current draft as a new immutable PolicyVersion.
   *
   * Process:
   * 1. Validate draft content exists
   * 2. Mark previous versions as not latest
   * 3. Create new PolicyVersion with incremented version number
   * 4. Update policy: status = PUBLISHED, clear draft, increment currentVersion
   * 5. Emit PolicyPublishedEvent
   */
  async publish(
    policyId: string,
    dto: PublishPolicyDto,
    userId: string,
    organizationId: string,
  ): Promise<PolicyVersion> {
    const existing = await this.findByIdOrFail(policyId, organizationId);

    if (!existing.draftContent) {
      throw new BadRequestException(
        "Cannot publish policy without draft content",
      );
    }

    const newVersion = existing.currentVersion + 1;
    const plainText = this.extractPlainText(existing.draftContent);

    // Use transaction to ensure atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Mark all previous versions as not latest
      await tx.policyVersion.updateMany({
        where: {
          policyId,
          organizationId,
          isLatest: true,
        },
        data: {
          isLatest: false,
        },
      });

      // Create new version
      const policyVersion = await tx.policyVersion.create({
        data: {
          organizationId,
          policyId,
          version: newVersion,
          versionLabel: dto.versionLabel || `v${newVersion}`,
          content: existing.draftContent!,
          plainText,
          summary: dto.summary,
          changeNotes: dto.changeNotes,
          publishedAt: new Date(),
          publishedById: userId,
          effectiveDate: dto.effectiveDate
            ? new Date(dto.effectiveDate)
            : new Date(),
          isLatest: true,
        },
        include: {
          publishedBy: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      });

      // Update policy (updatedAt is auto-updated by Prisma)
      const oldStatus = existing.status;
      await tx.policy.update({
        where: { id: policyId },
        data: {
          status: PolicyStatus.PUBLISHED,
          currentVersion: newVersion,
          draftContent: null,
          draftUpdatedAt: null,
          draftUpdatedById: null,
        },
      });

      return { policyVersion, oldStatus };
    });

    const { policyVersion, oldStatus } = result;

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.POLICY,
      entityId: policyId,
      action: "published",
      actionDescription: `Published policy "${existing.title}" as version ${newVersion}`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: { status: oldStatus, version: existing.currentVersion },
        newValue: { status: PolicyStatus.PUBLISHED, version: newVersion },
      },
    });

    // Emit event
    this.emitEvent(
      PolicyPublishedEvent.eventName,
      new PolicyPublishedEvent({
        organizationId,
        actorUserId: userId,
        actorType: "USER",
        policyId,
        policyVersionId: policyVersion.id,
        version: newVersion,
      }),
    );

    // Also emit status changed if status actually changed
    if (oldStatus !== PolicyStatus.PUBLISHED) {
      this.emitEvent(
        PolicyStatusChangedEvent.eventName,
        new PolicyStatusChangedEvent({
          organizationId,
          actorUserId: userId,
          actorType: "USER",
          policyId,
          fromStatus: oldStatus,
          toStatus: PolicyStatus.PUBLISHED,
        }),
      );
    }

    return policyVersion;
  }

  // =========================================================================
  // RETIRE
  // =========================================================================

  /**
   * Retires a policy, setting status to RETIRED and recording retiredAt.
   */
  async retire(
    policyId: string,
    userId: string,
    organizationId: string,
  ): Promise<Policy> {
    const existing = await this.findByIdOrFail(policyId, organizationId);

    if (existing.status === PolicyStatus.RETIRED) {
      throw new BadRequestException("Policy is already retired");
    }

    const oldStatus = existing.status;

    const updated = await this.prisma.policy.update({
      where: { id: policyId },
      data: {
        status: PolicyStatus.RETIRED,
        retiredAt: new Date(),
      },
      include: {
        owner: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.POLICY,
      entityId: policyId,
      action: "retired",
      actionDescription: `Retired policy "${existing.title}"`,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: { status: oldStatus },
        newValue: { status: PolicyStatus.RETIRED },
      },
    });

    // Emit event
    this.emitEvent(
      PolicyRetiredEvent.eventName,
      new PolicyRetiredEvent({
        organizationId,
        actorUserId: userId,
        actorType: "USER",
        policyId,
      }),
    );

    return updated;
  }

  // =========================================================================
  // VERSIONS
  // =========================================================================

  /**
   * Returns all versions of a policy, ordered by version number descending.
   */
  async getVersions(
    policyId: string,
    organizationId: string,
  ): Promise<PolicyVersion[]> {
    // First verify policy exists and belongs to org
    await this.findByIdOrFail(policyId, organizationId);

    return this.prisma.policyVersion.findMany({
      where: {
        policyId,
        organizationId,
      },
      orderBy: { version: "desc" },
      include: {
        publishedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  /**
   * Returns a specific version by ID.
   */
  async getVersion(
    policyVersionId: string,
    organizationId: string,
  ): Promise<PolicyVersion> {
    const version = await this.prisma.policyVersion.findFirst({
      where: {
        id: policyVersionId,
        organizationId,
      },
      include: {
        policy: true,
        publishedBy: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!version) {
      throw new NotFoundException(
        `Policy version with ID ${policyVersionId} not found`,
      );
    }

    return version;
  }

  // =========================================================================
  // HELPER METHODS
  // =========================================================================

  /**
   * Generates a unique slug from the title within the organization.
   * If the slug already exists, appends a number suffix.
   *
   * @param title - The policy title
   * @param organizationId - Organization ID for uniqueness check
   * @param excludePolicyId - Optional policy ID to exclude (for updates)
   */
  private async generateSlug(
    title: string,
    organizationId: string,
    excludePolicyId?: string,
  ): Promise<string> {
    // Convert to lowercase, replace non-alphanumeric with hyphens
    const baseSlug = title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens

    // Check if slug exists
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.policy.findFirst({
        where: {
          organizationId,
          slug,
          ...(excludePolicyId ? { id: { not: excludePolicyId } } : {}),
        },
      });

      if (!existing) {
        return slug;
      }

      // Append counter and try again
      slug = `${baseSlug}-${counter}`;
      counter++;

      // Safety limit
      if (counter > 1000) {
        throw new BadRequestException(
          "Unable to generate unique slug for policy",
        );
      }
    }
  }

  /**
   * Extracts plain text from HTML content for search indexing.
   * Strips HTML tags and collapses whitespace.
   */
  private extractPlainText(html: string): string {
    // Remove HTML tags
    let text = html.replace(/<[^>]*>/g, " ");

    // Decode common HTML entities
    text = text
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    // Collapse whitespace
    text = text.replace(/\s+/g, " ").trim();

    return text;
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
