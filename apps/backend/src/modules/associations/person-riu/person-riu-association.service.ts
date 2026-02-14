import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AuditService } from "../../audit/audit.service";
import { PersonRiuLabel, PersonRiuAssociation, Person } from "@prisma/client";
import {
  BaseAssociationService,
  AssociationAuditContext,
  AssociationEventContext,
} from "../base";

export interface CreatePersonRiuAssociationDto {
  personId: string;
  riuId: string;
  label: PersonRiuLabel;
  notes?: string;
  mentionContext?: string; // Quote from RIU where person was mentioned
}

/**
 * Entity type with relations included.
 */
type PersonRiuAssociationWithRelations = PersonRiuAssociation & {
  person?: Person | null;
  riu?: { id: string; referenceNumber?: string } | null;
};

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
export class PersonRiuAssociationService extends BaseAssociationService<
  CreatePersonRiuAssociationDto,
  PersonRiuAssociationWithRelations,
  PersonRiuLabel
> {
  constructor(
    prisma: PrismaService,
    eventEmitter: EventEmitter2,
    auditService: AuditService,
  ) {
    super(prisma, eventEmitter, auditService, {
      associationType: "person-riu",
      prismaModelName: "personRiuAssociation",
      eventPrefix: "association.person-riu",
      primaryAuditEntityType: "RIU",
    });
  }

  /**
   * No validation needed for PersonRiu - just basic CRUD.
   */
  protected validateCreate(): void {
    // No special validation needed
  }

  protected buildCreateData(
    dto: CreatePersonRiuAssociationDto,
    userId: string,
    organizationId: string,
  ): Record<string, unknown> {
    return {
      organizationId,
      personId: dto.personId,
      riuId: dto.riuId,
      label: dto.label,
      notes: dto.notes,
      mentionContext: dto.mentionContext,
      createdById: userId,
    };
  }

  protected getCreateInclude(): Record<string, unknown> {
    return { person: true, riu: true };
  }

  protected buildCreateAuditContext(
    dto: CreatePersonRiuAssociationDto,
  ): AssociationAuditContext {
    return {
      entityType: "RIU",
      entityId: dto.riuId,
      action: "person_associated",
      actionDescription: `Person associated as ${dto.label}`,
      actionCategory: "CREATE",
      context: { personId: dto.personId, label: dto.label },
    };
  }

  protected buildCreateEventPayload(
    dto: CreatePersonRiuAssociationDto,
    entity: PersonRiuAssociationWithRelations,
    organizationId: string,
  ): AssociationEventContext {
    return {
      organizationId,
      associationId: entity.id,
      personId: dto.personId,
      riuId: dto.riuId,
      label: dto.label,
    };
  }

  protected getDeleteAuditEntityId(
    entity: PersonRiuAssociationWithRelations,
  ): string {
    return entity.riuId;
  }

  protected buildDeleteAuditDescription(
    entity: PersonRiuAssociationWithRelations,
  ): string {
    return `Person association (${entity.label}) removed`;
  }

  protected buildDeleteAuditContext(
    entity: PersonRiuAssociationWithRelations,
  ): Record<string, unknown> {
    return { personId: entity.personId, label: entity.label };
  }

  protected buildDeleteEventPayload(
    entity: PersonRiuAssociationWithRelations,
    organizationId: string,
  ): AssociationEventContext {
    return {
      organizationId,
      associationId: entity.id,
      personId: entity.personId,
      riuId: entity.riuId,
      label: entity.label,
    };
  }

  protected getEntityLabel(
    entity: PersonRiuAssociationWithRelations,
  ): PersonRiuLabel {
    return entity.label;
  }

  /**
   * Find all associations for an RIU.
   * Includes person details for display.
   */
  async findByRiu(riuId: string, organizationId: string) {
    return this.prisma.personRiuAssociation.findMany({
      where: { organizationId, riuId },
      include: { person: true },
      orderBy: { createdAt: "asc" },
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
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Find associations by label.
   */
  async findByLabel(
    riuId: string,
    label: PersonRiuLabel,
    organizationId: string,
  ) {
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
      orderBy: { createdAt: "desc" },
      ...(options?.limit && { take: options.limit }),
    });
  }
}
