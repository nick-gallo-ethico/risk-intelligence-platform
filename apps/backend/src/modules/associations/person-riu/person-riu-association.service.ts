import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditService } from '../../audit/audit.service';
import { PersonRiuLabel } from '@prisma/client';

export interface CreatePersonRiuAssociationDto {
  personId: string;
  riuId: string;
  label: PersonRiuLabel;
  notes?: string;
  mentionContext?: string; // Quote from RIU where person was mentioned
}

/**
 * PersonRiuAssociationService manages Person-to-RIU associations.
 *
 * RIUs (Risk Intelligence Units) are immutable intake records, so these
 * associations are typically created at intake time and track who is
 * mentioned in the RIU (reporter, subject mentioned, witness mentioned).
 *
 * Unlike Person-Case associations, RIU associations don't have status
 * or validity periods since RIUs themselves are immutable.
 */
@Injectable()
export class PersonRiuAssociationService {
  private readonly logger = new Logger(PersonRiuAssociationService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
  ) {}

  /**
   * Create association between Person and RIU.
   * Typically called during intake when people are identified in the report.
   */
  async create(
    dto: CreatePersonRiuAssociationDto,
    userId: string,
    organizationId: string,
  ) {
    const association = await this.prisma.personRiuAssociation.create({
      data: {
        organizationId,
        personId: dto.personId,
        riuId: dto.riuId,
        label: dto.label,
        notes: dto.notes,
        mentionContext: dto.mentionContext,
        createdById: userId,
      },
      include: { person: true, riu: true },
    });

    this.logger.log(
      `Created Person-RIU association: ${dto.personId} -> ${dto.riuId} (${dto.label})`,
    );

    this.eventEmitter.emit('association.person-riu.created', {
      organizationId,
      associationId: association.id,
      personId: dto.personId,
      riuId: dto.riuId,
      label: dto.label,
    });

    await this.auditService.log({
      entityType: 'RIU',
      entityId: dto.riuId,
      action: 'person_associated',
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
   * Find all associations for an RIU.
   * Includes person details for display.
   */
  async findByRiu(riuId: string, organizationId: string) {
    return this.prisma.personRiuAssociation.findMany({
      where: { organizationId, riuId },
      include: { person: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Find all associations for a Person (RIU mentions).
   * Includes RIU details for display.
   */
  async findByPerson(personId: string, organizationId: string) {
    return this.prisma.personRiuAssociation.findMany({
      where: { organizationId, personId },
      include: { riu: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find associations by label.
   */
  async findByLabel(riuId: string, label: PersonRiuLabel, organizationId: string) {
    return this.prisma.personRiuAssociation.findMany({
      where: {
        organizationId,
        riuId,
        label,
      },
      include: { person: true },
    });
  }

  /**
   * Get count of RIUs where a person is mentioned.
   * Useful for "history alert" feature showing previous reports.
   */
  async getPersonRiuCount(
    personId: string,
    label: PersonRiuLabel,
    organizationId: string,
  ): Promise<number> {
    return this.prisma.personRiuAssociation.count({
      where: {
        organizationId,
        personId,
        label,
      },
    });
  }

  /**
   * Get history of a person's mentions across RIUs.
   * Useful for pattern detection ("3 previous reports mentioning this person").
   */
  async getPersonRiuHistory(
    personId: string,
    organizationId: string,
    options?: { label?: PersonRiuLabel; limit?: number },
  ) {
    return this.prisma.personRiuAssociation.findMany({
      where: {
        organizationId,
        personId,
        ...(options?.label && { label: options.label }),
      },
      include: {
        riu: {
          select: {
            id: true,
            referenceNumber: true,
            type: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(options?.limit && { take: options.limit }),
    });
  }

  /**
   * Delete association (rare - typically only for data correction).
   */
  async delete(associationId: string, userId: string, organizationId: string) {
    const association = await this.prisma.personRiuAssociation.findFirst({
      where: { id: associationId, organizationId },
    });

    if (!association) {
      throw new BadRequestException('Association not found');
    }

    await this.prisma.personRiuAssociation.delete({
      where: { id: associationId },
    });

    this.logger.log(`Deleted Person-RIU association: ${associationId}`);

    await this.auditService.log({
      entityType: 'RIU',
      entityId: association.riuId,
      action: 'person_association_deleted',
      actionDescription: `Person association (${association.label}) removed`,
      actionCategory: 'DELETE',
      actorUserId: userId,
      actorType: 'USER',
      organizationId,
      context: { personId: association.personId, label: association.label },
    });
  }
}
