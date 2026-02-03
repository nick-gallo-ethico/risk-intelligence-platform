import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../../audit/audit.service';
import { PersonPersonLabel, PersonPersonSource } from '@prisma/client';

export interface CreatePersonPersonAssociationDto {
  personAId: string;
  personBId: string;
  label: PersonPersonLabel;
  source: PersonPersonSource;
  isDirectional?: boolean;
  aToB?: string; // A's relationship to B (e.g., "manager_of")
  bToA?: string; // B's relationship to A (e.g., "reports_to")
  effectiveFrom?: Date;
  effectiveUntil?: Date;
  notes?: string;
}

/**
 * Directional relationship labels where A->B differs from B->A.
 */
const DIRECTIONAL_LABELS: PersonPersonLabel[] = [
  PersonPersonLabel.MANAGER_OF,
  PersonPersonLabel.REPORTS_TO,
];

/**
 * PersonPersonAssociationService manages Person-to-Person relationships.
 *
 * Per CONTEXT.md decision, sources include:
 * - HRIS: Manager hierarchy from HRIS sync (manager_of, reports_to)
 * - DISCLOSURE: From disclosure forms (spouse, business_partner, family_member)
 * - INVESTIGATION: Discovered during investigation
 * - MANUAL: Manually entered by user
 *
 * Used for:
 * - COI (Conflict of Interest) detection
 * - Relationship mapping
 * - Pattern detection across related individuals
 *
 * For symmetric relationships (spouse, friend), personAId < personBId alphabetically.
 * For asymmetric relationships (manager_of), isDirectional=true with aToB/bToA descriptors.
 */
@Injectable()
export class PersonPersonAssociationService {
  private readonly logger = new Logger(PersonPersonAssociationService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
  ) {}

  /**
   * Check if a label is directional (asymmetric).
   */
  isDirectionalLabel(label: PersonPersonLabel): boolean {
    return DIRECTIONAL_LABELS.includes(label);
  }

  /**
   * Create association between two Persons.
   *
   * For symmetric relationships, normalizes so personAId < personBId alphabetically.
   * For directional relationships, preserves order and sets aToB/bToA descriptors.
   *
   * @throws BadRequestException if personA equals personB
   */
  async create(
    dto: CreatePersonPersonAssociationDto,
    userId: string,
    organizationId: string,
  ) {
    // Prevent self-association
    if (dto.personAId === dto.personBId) {
      throw new BadRequestException('Cannot create relationship from person to themselves');
    }

    const isDirectional = dto.isDirectional ?? this.isDirectionalLabel(dto.label);

    // For symmetric relationships, normalize order
    let personAId = dto.personAId;
    let personBId = dto.personBId;
    if (!isDirectional && dto.personAId > dto.personBId) {
      personAId = dto.personBId;
      personBId = dto.personAId;
    }

    const association = await this.prisma.personPersonAssociation.create({
      data: {
        organizationId,
        personAId,
        personBId,
        label: dto.label,
        source: dto.source,
        isDirectional,
        aToB: dto.aToB,
        bToA: dto.bToA,
        effectiveFrom: dto.effectiveFrom || new Date(),
        effectiveUntil: dto.effectiveUntil,
        notes: dto.notes,
        createdById: userId,
      },
      include: {
        personA: { select: { id: true, firstName: true, lastName: true } },
        personB: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    this.logger.log(
      `Created Person-Person association: ${personAId} -[${dto.label}]- ${personBId}`,
    );

    this.eventEmitter.emit('association.person-person.created', {
      organizationId,
      associationId: association.id,
      personAId,
      personBId,
      label: dto.label,
      source: dto.source,
    });

    await this.auditService.log({
      entityType: 'PERSON',
      entityId: personAId,
      action: 'relationship_created',
      actionDescription: `Relationship (${dto.label}) created with another person`,
      actionCategory: 'CREATE',
      actorUserId: userId,
      actorType: 'USER',
      organizationId,
      context: { personBId, label: dto.label, source: dto.source },
    });

    return association;
  }

  /**
   * Create manager-report relationship (convenience method).
   * Automatically sets directional flags and aToB/bToA.
   */
  async createManagerRelationship(
    managerId: string,
    reportId: string,
    source: PersonPersonSource,
    userId: string,
    organizationId: string,
    options?: { effectiveFrom?: Date; effectiveUntil?: Date; notes?: string },
  ) {
    return this.create(
      {
        personAId: managerId,
        personBId: reportId,
        label: PersonPersonLabel.MANAGER_OF,
        source,
        isDirectional: true,
        aToB: 'manager_of',
        bToA: 'reports_to',
        ...options,
      },
      userId,
      organizationId,
    );
  }

  /**
   * Find all relationships for a Person.
   */
  async findByPerson(personId: string, organizationId: string) {
    const [asA, asB] = await Promise.all([
      this.prisma.personPersonAssociation.findMany({
        where: { organizationId, personAId: personId },
        include: {
          personB: { select: { id: true, firstName: true, lastName: true, type: true } },
        },
      }),
      this.prisma.personPersonAssociation.findMany({
        where: { organizationId, personBId: personId },
        include: {
          personA: { select: { id: true, firstName: true, lastName: true, type: true } },
        },
      }),
    ]);

    return { asA, asB };
  }

  /**
   * Check if two persons have a relationship.
   */
  async checkRelationship(
    personAId: string,
    personBId: string,
    organizationId: string,
  ): Promise<boolean> {
    // Check both directions for symmetric relationships
    const count = await this.prisma.personPersonAssociation.count({
      where: {
        organizationId,
        OR: [
          { personAId, personBId },
          { personAId: personBId, personBId: personAId },
        ],
      },
    });

    return count > 0;
  }

  /**
   * Find specific relationship between two persons.
   */
  async findRelationship(
    personAId: string,
    personBId: string,
    organizationId: string,
  ) {
    // Check both directions
    return this.prisma.personPersonAssociation.findMany({
      where: {
        organizationId,
        OR: [
          { personAId, personBId },
          { personAId: personBId, personBId: personAId },
        ],
      },
      include: {
        personA: { select: { id: true, firstName: true, lastName: true } },
        personB: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Find relationships by label.
   */
  async findByLabel(
    personId: string,
    label: PersonPersonLabel,
    organizationId: string,
  ) {
    return this.prisma.personPersonAssociation.findMany({
      where: {
        organizationId,
        label,
        OR: [{ personAId: personId }, { personBId: personId }],
      },
      include: {
        personA: { select: { id: true, firstName: true, lastName: true } },
        personB: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Find relationships by source.
   */
  async findBySource(
    personId: string,
    source: PersonPersonSource,
    organizationId: string,
  ) {
    return this.prisma.personPersonAssociation.findMany({
      where: {
        organizationId,
        source,
        OR: [{ personAId: personId }, { personBId: personId }],
      },
      include: {
        personA: { select: { id: true, firstName: true, lastName: true } },
        personB: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * Find active relationships (not expired).
   */
  async findActiveRelationships(personId: string, organizationId: string) {
    const now = new Date();
    return this.prisma.personPersonAssociation.findMany({
      where: {
        organizationId,
        OR: [{ personAId: personId }, { personBId: personId }],
        effectiveFrom: { lte: now },
        AND: [
          {
            OR: [
              { effectiveUntil: null },
              { effectiveUntil: { gt: now } },
            ],
          },
        ],
      },
      include: {
        personA: { select: { id: true, firstName: true, lastName: true } },
        personB: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  /**
   * End a relationship (set effectiveUntil).
   */
  async endRelationship(
    associationId: string,
    userId: string,
    organizationId: string,
    effectiveUntil?: Date,
  ) {
    const association = await this.prisma.personPersonAssociation.findFirst({
      where: { id: associationId, organizationId },
    });

    if (!association) {
      throw new BadRequestException('Relationship not found');
    }

    if (association.effectiveUntil) {
      throw new BadRequestException('Relationship has already ended');
    }

    const updated = await this.prisma.personPersonAssociation.update({
      where: { id: associationId },
      data: {
        effectiveUntil: effectiveUntil || new Date(),
      },
      include: {
        personA: { select: { id: true, firstName: true, lastName: true } },
        personB: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    this.logger.log(`Ended Person-Person relationship: ${associationId}`);

    await this.auditService.log({
      entityType: 'PERSON',
      entityId: association.personAId,
      action: 'relationship_ended',
      actionDescription: `Relationship (${association.label}) ended`,
      actionCategory: 'UPDATE',
      actorUserId: userId,
      actorType: 'USER',
      organizationId,
      context: {
        personBId: association.personBId,
        label: association.label,
      },
    });

    return updated;
  }

  /**
   * Get COI-relevant relationships for a person.
   * Returns relationships that could indicate conflicts of interest.
   */
  async getCOIRelationships(personId: string, organizationId: string) {
    const coiLabels: PersonPersonLabel[] = [
      PersonPersonLabel.SPOUSE,
      PersonPersonLabel.DOMESTIC_PARTNER,
      PersonPersonLabel.FAMILY_MEMBER,
      PersonPersonLabel.BUSINESS_PARTNER,
      PersonPersonLabel.CLOSE_PERSONAL_FRIEND,
    ];

    const now = new Date();
    return this.prisma.personPersonAssociation.findMany({
      where: {
        organizationId,
        label: { in: coiLabels },
        OR: [{ personAId: personId }, { personBId: personId }],
        effectiveFrom: { lte: now },
        AND: [
          {
            OR: [
              { effectiveUntil: null },
              { effectiveUntil: { gt: now } },
            ],
          },
        ],
      },
      include: {
        personA: { select: { id: true, firstName: true, lastName: true, company: true } },
        personB: { select: { id: true, firstName: true, lastName: true, company: true } },
      },
    });
  }

  /**
   * Delete association (rare - typically only for data correction).
   */
  async delete(associationId: string, userId: string, organizationId: string) {
    const association = await this.prisma.personPersonAssociation.findFirst({
      where: { id: associationId, organizationId },
    });

    if (!association) {
      throw new BadRequestException('Relationship not found');
    }

    await this.prisma.personPersonAssociation.delete({
      where: { id: associationId },
    });

    this.logger.log(`Deleted Person-Person association: ${associationId}`);

    await this.auditService.log({
      entityType: 'PERSON',
      entityId: association.personAId,
      action: 'relationship_deleted',
      actionDescription: `Relationship (${association.label}) deleted`,
      actionCategory: 'DELETE',
      actorUserId: userId,
      actorType: 'USER',
      organizationId,
      context: {
        personBId: association.personBId,
        label: association.label,
      },
    });
  }
}
