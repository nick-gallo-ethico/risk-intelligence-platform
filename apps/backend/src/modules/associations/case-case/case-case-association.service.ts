import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../../audit/audit.service';
import { CaseCaseLabel } from '@prisma/client';

export interface CreateCaseCaseAssociationDto {
  sourceCaseId: string;
  targetCaseId: string;
  label: CaseCaseLabel;
  notes?: string;
}

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
export class CaseCaseAssociationService {
  private readonly logger = new Logger(CaseCaseAssociationService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
  ) {}

  /**
   * Create association between two Cases.
   *
   * @throws BadRequestException if source equals target or if association already exists
   */
  async create(
    dto: CreateCaseCaseAssociationDto,
    userId: string,
    organizationId: string,
  ) {
    // Prevent self-association
    if (dto.sourceCaseId === dto.targetCaseId) {
      throw new BadRequestException('Cannot create association from case to itself');
    }

    const association = await this.prisma.caseCaseAssociation.create({
      data: {
        organizationId,
        sourceCaseId: dto.sourceCaseId,
        targetCaseId: dto.targetCaseId,
        label: dto.label,
        notes: dto.notes,
        createdById: userId,
      },
      include: {
        sourceCase: { select: { id: true, referenceNumber: true } },
        targetCase: { select: { id: true, referenceNumber: true } },
      },
    });

    this.logger.log(
      `Created Case-Case association: ${dto.sourceCaseId} -[${dto.label}]-> ${dto.targetCaseId}`,
    );

    this.eventEmitter.emit('association.case-case.created', {
      organizationId,
      associationId: association.id,
      sourceCaseId: dto.sourceCaseId,
      targetCaseId: dto.targetCaseId,
      label: dto.label,
    });

    // Audit on both cases
    await Promise.all([
      this.auditService.log({
        entityType: 'CASE',
        entityId: dto.sourceCaseId,
        action: 'case_associated',
        actionDescription: `Associated as ${dto.label} to case ${association.targetCase.referenceNumber}`,
        actionCategory: 'CREATE',
        actorUserId: userId,
        actorType: 'USER',
        organizationId,
        context: { targetCaseId: dto.targetCaseId, label: dto.label },
      }),
      this.auditService.log({
        entityType: 'CASE',
        entityId: dto.targetCaseId,
        action: 'case_associated',
        actionDescription: `Associated from case ${association.sourceCase.referenceNumber} as ${dto.label}`,
        actionCategory: 'CREATE',
        actorUserId: userId,
        actorType: 'USER',
        organizationId,
        context: { sourceCaseId: dto.sourceCaseId, label: dto.label },
      }),
    ]);

    return association;
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
      orderBy: { createdAt: 'asc' },
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
      orderBy: { createdAt: 'asc' },
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

  /**
   * Delete association.
   */
  async delete(associationId: string, userId: string, organizationId: string) {
    const association = await this.prisma.caseCaseAssociation.findFirst({
      where: { id: associationId, organizationId },
      include: {
        sourceCase: { select: { referenceNumber: true } },
        targetCase: { select: { referenceNumber: true } },
      },
    });

    if (!association) {
      throw new BadRequestException('Association not found');
    }

    await this.prisma.caseCaseAssociation.delete({
      where: { id: associationId },
    });

    this.logger.log(`Deleted Case-Case association: ${associationId}`);

    await this.auditService.log({
      entityType: 'CASE',
      entityId: association.sourceCaseId,
      action: 'case_association_deleted',
      actionDescription: `Removed ${association.label} association to ${association.targetCase.referenceNumber}`,
      actionCategory: 'DELETE',
      actorUserId: userId,
      actorType: 'USER',
      organizationId,
      context: {
        targetCaseId: association.targetCaseId,
        label: association.label,
      },
    });
  }
}
