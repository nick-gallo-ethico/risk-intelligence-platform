import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AuditService } from "../../audit/audit.service";
import { CaseCaseLabel, CaseCaseAssociation } from "@prisma/client";
import {
  BaseAssociationService,
  AssociationAuditContext,
  AssociationEventContext,
} from "../base";

export interface CreateCaseCaseAssociationDto {
  sourceCaseId: string;
  targetCaseId: string;
  label: CaseCaseLabel;
  notes?: string;
}

/**
 * Entity type with relations included.
 */
type CaseCaseAssociationWithRelations = CaseCaseAssociation & {
  sourceCase?: { id: string; referenceNumber?: string; status?: string } | null;
  targetCase?: { id: string; referenceNumber?: string; status?: string } | null;
};

/**
 * CaseCaseAssociationService manages Case-to-Case associations.
 *
 * Per CONTEXT.md decision, supports:
 * - Hierarchy (PARENT/CHILD)
 * - Splits (SPLIT_FROM/SPLIT_TO)
 * - Escalations (ESCALATED_TO)
 * - Merges (MERGED_INTO)
 * - Other relations (RELATED, SUPERSEDES, FOLLOW_UP_TO)
 *
 * Direction matters: sourceCase -> targetCase with specific label.
 * For example, if Case A splits to create Case B:
 *   - Case A is sourceCaseId with label SPLIT_TO
 *   - Case B is targetCaseId
 *   - The reverse would be Case B with label SPLIT_FROM pointing to Case A
 */
@Injectable()
export class CaseCaseAssociationService extends BaseAssociationService<
  CreateCaseCaseAssociationDto,
  CaseCaseAssociationWithRelations,
  CaseCaseLabel
> {
  constructor(
    prisma: PrismaService,
    eventEmitter: EventEmitter2,
    auditService: AuditService,
  ) {
    super(prisma, eventEmitter, auditService, {
      associationType: "case-case",
      prismaModelName: "caseCaseAssociation",
      eventPrefix: "association.case-case",
      primaryAuditEntityType: "CASE",
    });
  }

  /**
   * Validate that source and target are different cases.
   * @throws BadRequestException if source equals target
   */
  protected validateCreate(dto: CreateCaseCaseAssociationDto): void {
    if (dto.sourceCaseId === dto.targetCaseId) {
      throw new BadRequestException(
        "Cannot create association from case to itself",
      );
    }
  }

  protected buildCreateData(
    dto: CreateCaseCaseAssociationDto,
    userId: string,
    organizationId: string,
  ): Record<string, unknown> {
    return {
      organizationId,
      sourceCaseId: dto.sourceCaseId,
      targetCaseId: dto.targetCaseId,
      label: dto.label,
      notes: dto.notes,
      createdById: userId,
    };
  }

  protected getCreateInclude(): Record<string, unknown> {
    return {
      sourceCase: { select: { id: true, referenceNumber: true } },
      targetCase: { select: { id: true, referenceNumber: true } },
    };
  }

  protected buildCreateAuditContext(
    dto: CreateCaseCaseAssociationDto,
    entity: CaseCaseAssociationWithRelations,
  ): AssociationAuditContext {
    const targetRef = entity.targetCase?.referenceNumber || dto.targetCaseId;
    return {
      entityType: "CASE",
      entityId: dto.sourceCaseId,
      action: "case_associated",
      actionDescription: `Associated as ${dto.label} to case ${targetRef}`,
      actionCategory: "CREATE",
      context: { targetCaseId: dto.targetCaseId, label: dto.label },
    };
  }

  protected buildCreateEventPayload(
    dto: CreateCaseCaseAssociationDto,
    entity: CaseCaseAssociationWithRelations,
    organizationId: string,
  ): AssociationEventContext {
    return {
      organizationId,
      associationId: entity.id,
      sourceCaseId: dto.sourceCaseId,
      targetCaseId: dto.targetCaseId,
      label: dto.label,
    };
  }

  protected getDeleteAuditEntityId(
    entity: CaseCaseAssociationWithRelations,
  ): string {
    return entity.sourceCaseId;
  }

  protected buildDeleteAuditDescription(
    entity: CaseCaseAssociationWithRelations,
  ): string {
    const targetRef = entity.targetCase?.referenceNumber || entity.targetCaseId;
    return `Removed ${entity.label} association to ${targetRef}`;
  }

  protected buildDeleteAuditContext(
    entity: CaseCaseAssociationWithRelations,
  ): Record<string, unknown> {
    return {
      targetCaseId: entity.targetCaseId,
      label: entity.label,
    };
  }

  protected buildDeleteEventPayload(
    entity: CaseCaseAssociationWithRelations,
    organizationId: string,
  ): AssociationEventContext {
    return {
      organizationId,
      associationId: entity.id,
      sourceCaseId: entity.sourceCaseId,
      targetCaseId: entity.targetCaseId,
      label: entity.label,
    };
  }

  protected getEntityLabel(
    entity: CaseCaseAssociationWithRelations,
  ): CaseCaseLabel {
    return entity.label;
  }

  /**
   * Override create to also log audit on the target case.
   */
  async create(
    dto: CreateCaseCaseAssociationDto,
    userId: string,
    organizationId: string,
  ): Promise<CaseCaseAssociationWithRelations> {
    const entity = await super.create(dto, userId, organizationId);

    // Also audit on the target case (bidirectional audit)
    const sourceRef = entity.sourceCase?.referenceNumber || dto.sourceCaseId;
    await this.logAudit(
      "CASE",
      dto.targetCaseId,
      "case_associated",
      `Associated from case ${sourceRef} as ${dto.label}`,
      "CREATE",
      userId,
      organizationId,
      { sourceCaseId: dto.sourceCaseId, label: dto.label },
    );

    return entity;
  }

  /**
   * Create bidirectional association (convenience method).
   * For example, creates both PARENT/CHILD links.
   */
  async createBidirectional(
    parentCaseId: string,
    childCaseId: string,
    userId: string,
    organizationId: string,
    notes?: string,
  ) {
    const [parentAssoc, childAssoc] = await Promise.all([
      this.create(
        {
          sourceCaseId: parentCaseId,
          targetCaseId: childCaseId,
          label: CaseCaseLabel.PARENT,
          notes,
        },
        userId,
        organizationId,
      ),
      this.create(
        {
          sourceCaseId: childCaseId,
          targetCaseId: parentCaseId,
          label: CaseCaseLabel.CHILD,
          notes,
        },
        userId,
        organizationId,
      ),
    ]);

    return { parentAssoc, childAssoc };
  }

  /**
   * Create split association (convenience method).
   * Creates both SPLIT_FROM and SPLIT_TO links.
   */
  async createSplit(
    originalCaseId: string,
    newCaseId: string,
    userId: string,
    organizationId: string,
    notes?: string,
  ) {
    const [splitToAssoc, splitFromAssoc] = await Promise.all([
      this.create(
        {
          sourceCaseId: originalCaseId,
          targetCaseId: newCaseId,
          label: CaseCaseLabel.SPLIT_TO,
          notes,
        },
        userId,
        organizationId,
      ),
      this.create(
        {
          sourceCaseId: newCaseId,
          targetCaseId: originalCaseId,
          label: CaseCaseLabel.SPLIT_FROM,
          notes,
        },
        userId,
        organizationId,
      ),
    ]);

    return { splitToAssoc, splitFromAssoc };
  }

  /**
   * Find all associations FROM a Case (outgoing).
   */
  async findFromCase(caseId: string, organizationId: string) {
    return this.prisma.caseCaseAssociation.findMany({
      where: { organizationId, sourceCaseId: caseId },
      include: {
        targetCase: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Find all associations TO a Case (incoming).
   */
  async findToCase(caseId: string, organizationId: string) {
    return this.prisma.caseCaseAssociation.findMany({
      where: { organizationId, targetCaseId: caseId },
      include: {
        sourceCase: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  /**
   * Find all associations for a Case (both incoming and outgoing).
   */
  async findByCase(caseId: string, organizationId: string) {
    const [outgoing, incoming] = await Promise.all([
      this.findFromCase(caseId, organizationId),
      this.findToCase(caseId, organizationId),
    ]);

    return { outgoing, incoming };
  }

  /**
   * Find child cases in hierarchy.
   */
  async findChildCases(parentCaseId: string, organizationId: string) {
    return this.prisma.caseCaseAssociation.findMany({
      where: {
        organizationId,
        sourceCaseId: parentCaseId,
        label: CaseCaseLabel.PARENT,
      },
      include: {
        targetCase: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
  }

  /**
   * Find parent case in hierarchy.
   */
  async findParentCase(childCaseId: string, organizationId: string) {
    const association = await this.prisma.caseCaseAssociation.findFirst({
      where: {
        organizationId,
        sourceCaseId: childCaseId,
        label: CaseCaseLabel.CHILD,
      },
      include: {
        targetCase: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return association?.targetCase || null;
  }

  /**
   * Find cases split from an original case.
   */
  async findSplitCases(originalCaseId: string, organizationId: string) {
    return this.prisma.caseCaseAssociation.findMany({
      where: {
        organizationId,
        sourceCaseId: originalCaseId,
        label: CaseCaseLabel.SPLIT_TO,
      },
      include: {
        targetCase: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
  }
}
