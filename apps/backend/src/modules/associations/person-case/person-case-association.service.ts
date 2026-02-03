import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../../audit/audit.service';
import { PersonCaseLabel, EvidentiaryStatus } from '@prisma/client';

/**
 * Evidentiary labels use status field, not validity periods.
 * Per CONTEXT.md: "Person X was the subject of Case Y" is permanently true -
 * evidentiary associations don't "end", they have outcomes.
 */
const EVIDENTIARY_LABELS: PersonCaseLabel[] = [
  PersonCaseLabel.REPORTER,
  PersonCaseLabel.SUBJECT,
  PersonCaseLabel.WITNESS,
];

/**
 * Role labels use validity periods (startedAt, endedAt).
 * These can actually end when a person leaves the role.
 */
const ROLE_LABELS: PersonCaseLabel[] = [
  PersonCaseLabel.ASSIGNED_INVESTIGATOR,
  PersonCaseLabel.APPROVER,
  PersonCaseLabel.STAKEHOLDER,
  PersonCaseLabel.MANAGER_OF_SUBJECT,
  PersonCaseLabel.REVIEWER,
  PersonCaseLabel.LEGAL_COUNSEL,
];

export interface CreatePersonCaseAssociationDto {
  personId: string;
  caseId: string;
  label: PersonCaseLabel;
  notes?: string;
  evidentiaryStatus?: EvidentiaryStatus;
}

/**
 * PersonCaseAssociationService manages Person-to-Case associations.
 *
 * Per HubSpot V4 Associations pattern, associations are first-class entities
 * with labels, metadata, and distinct semantics based on the association type.
 *
 * Evidentiary associations (REPORTER, SUBJECT, WITNESS):
 *   - Use evidentiaryStatus field (ACTIVE, CLEARED, SUBSTANTIATED, WITHDRAWN)
 *   - Never "end" - they are permanent records with changing outcomes
 *
 * Role associations (ASSIGNED_INVESTIGATOR, LEGAL_COUNSEL, etc.):
 *   - Use validity periods (startedAt, endedAt)
 *   - Can end when person leaves the role
 */
@Injectable()
export class PersonCaseAssociationService {
  private readonly logger = new Logger(PersonCaseAssociationService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
  ) {}

  /**
   * Check if a label is an evidentiary association type.
   */
  isEvidentiaryLabel(label: PersonCaseLabel): boolean {
    return EVIDENTIARY_LABELS.includes(label);
  }

  /**
   * Check if a label is a role association type.
   */
  isRoleLabel(label: PersonCaseLabel): boolean {
    return ROLE_LABELS.includes(label);
  }

  /**
   * Create association between Person and Case.
   *
   * For evidentiary labels, automatically sets evidentiaryStatus to ACTIVE.
   * For role labels, sets startedAt to current timestamp.
   */
  async create(
    dto: CreatePersonCaseAssociationDto,
    userId: string,
    organizationId: string,
  ) {
    const isEvidentiary = this.isEvidentiaryLabel(dto.label);

    const association = await this.prisma.personCaseAssociation.create({
      data: {
        organizationId,
        personId: dto.personId,
        caseId: dto.caseId,
        label: dto.label,
        notes: dto.notes,
        ...(isEvidentiary && {
          evidentiaryStatus: dto.evidentiaryStatus || EvidentiaryStatus.ACTIVE,
          evidentiaryStatusAt: new Date(),
          evidentiaryStatusById: userId,
        }),
        createdById: userId,
      },
      include: { person: true, case: true },
    });

    this.logger.log(
      `Created Person-Case association: ${dto.personId} -> ${dto.caseId} (${dto.label})`,
    );

    this.eventEmitter.emit('association.person-case.created', {
      organizationId,
      associationId: association.id,
      personId: dto.personId,
      caseId: dto.caseId,
      label: dto.label,
    });

    await this.auditService.log({
      entityType: 'CASE',
      entityId: dto.caseId,
      action: 'association_created',
      actionDescription: `Person associated as ${dto.label}`,
      actionCategory: 'CREATE',
      actorUserId: userId,
      actorType: 'USER',
      organizationId,
      context: { personId: dto.personId, label: dto.label },
    });

    return association;
  }

  /**
   * Update evidentiary status (for REPORTER, SUBJECT, WITNESS associations).
   *
   * @throws BadRequestException if association doesn't exist or is not evidentiary type
   */
  async updateEvidentiaryStatus(
    associationId: string,
    newStatus: EvidentiaryStatus,
    userId: string,
    organizationId: string,
    reason?: string,
  ) {
    const association = await this.prisma.personCaseAssociation.findFirst({
      where: { id: associationId, organizationId },
    });

    if (!association) {
      throw new BadRequestException('Association not found');
    }

    if (!this.isEvidentiaryLabel(association.label)) {
      throw new BadRequestException(
        `Cannot set evidentiary status on ${association.label} association - use validity periods instead`,
      );
    }

    const oldStatus = association.evidentiaryStatus;

    const updated = await this.prisma.personCaseAssociation.update({
      where: { id: associationId },
      data: {
        evidentiaryStatus: newStatus,
        evidentiaryStatusAt: new Date(),
        evidentiaryStatusById: userId,
        evidentiaryReason: reason,
      },
      include: { person: true, case: true },
    });

    this.logger.log(
      `Updated evidentiary status: ${associationId} ${oldStatus} -> ${newStatus}`,
    );

    this.eventEmitter.emit('association.person-case.status-changed', {
      organizationId,
      associationId,
      personId: association.personId,
      caseId: association.caseId,
      label: association.label,
      oldStatus,
      newStatus,
    });

    await this.auditService.log({
      entityType: 'CASE',
      entityId: association.caseId,
      action: 'association_status_changed',
      actionDescription: `${association.label} status changed from ${oldStatus} to ${newStatus}`,
      actionCategory: 'UPDATE',
      actorUserId: userId,
      actorType: 'USER',
      organizationId,
      context: {
        associationId,
        personId: association.personId,
        label: association.label,
        oldStatus,
        newStatus,
        reason,
      },
    });

    return updated;
  }

  /**
   * End a role association (for ASSIGNED_INVESTIGATOR, LEGAL_COUNSEL, etc.).
   * Sets endedAt to current timestamp and optional reason.
   *
   * @throws BadRequestException if association doesn't exist or is evidentiary type
   */
  async endRoleAssociation(
    associationId: string,
    userId: string,
    organizationId: string,
    reason?: string,
  ) {
    const association = await this.prisma.personCaseAssociation.findFirst({
      where: { id: associationId, organizationId },
    });

    if (!association) {
      throw new BadRequestException('Association not found');
    }

    if (!this.isRoleLabel(association.label)) {
      throw new BadRequestException(
        `Cannot end ${association.label} association - evidentiary associations are permanent`,
      );
    }

    if (association.endedAt) {
      throw new BadRequestException('Association has already ended');
    }

    const updated = await this.prisma.personCaseAssociation.update({
      where: { id: associationId },
      data: {
        endedAt: new Date(),
        endedReason: reason,
      },
      include: { person: true, case: true },
    });

    this.logger.log(`Ended role association: ${associationId}`);

    this.eventEmitter.emit('association.person-case.ended', {
      organizationId,
      associationId,
      personId: association.personId,
      caseId: association.caseId,
      label: association.label,
    });

    await this.auditService.log({
      entityType: 'CASE',
      entityId: association.caseId,
      action: 'association_ended',
      actionDescription: `${association.label} role ended`,
      actionCategory: 'UPDATE',
      actorUserId: userId,
      actorType: 'USER',
      organizationId,
      context: {
        associationId,
        personId: association.personId,
        label: association.label,
        reason,
      },
    });

    return updated;
  }

  /**
   * Find all associations for a Case.
   * Includes person details for display.
   */
  async findByCase(caseId: string, organizationId: string) {
    return this.prisma.personCaseAssociation.findMany({
      where: { organizationId, caseId },
      include: { person: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Find all associations for a Person.
   * Includes case details for display.
   */
  async findByPerson(personId: string, organizationId: string) {
    return this.prisma.personCaseAssociation.findMany({
      where: { organizationId, personId },
      include: { case: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find associations by label.
   * For role associations, only returns active (not ended).
   */
  async findByLabel(
    caseId: string,
    label: PersonCaseLabel,
    organizationId: string,
  ) {
    return this.prisma.personCaseAssociation.findMany({
      where: {
        organizationId,
        caseId,
        label,
        // For role associations, only return active (not ended)
        ...(this.isRoleLabel(label) && { endedAt: null }),
      },
      include: { person: true },
    });
  }

  /**
   * Find associations by evidentiary status.
   */
  async findByEvidentiaryStatus(
    caseId: string,
    status: EvidentiaryStatus,
    organizationId: string,
  ) {
    return this.prisma.personCaseAssociation.findMany({
      where: {
        organizationId,
        caseId,
        evidentiaryStatus: status,
      },
      include: { person: true },
    });
  }

  /**
   * Get history of a person's involvement across cases.
   * Useful for pattern detection ("3 previous cases with this person as subject").
   */
  async getPersonCaseHistory(
    personId: string,
    label: PersonCaseLabel,
    organizationId: string,
  ) {
    return this.prisma.personCaseAssociation.findMany({
      where: {
        organizationId,
        personId,
        label,
      },
      include: {
        case: {
          select: {
            id: true,
            referenceNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
