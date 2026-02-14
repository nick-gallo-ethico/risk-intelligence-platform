import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { AuditService } from "../../audit/audit.service";
import {
  PersonCaseLabel,
  EvidentiaryStatus,
  PersonCaseAssociation,
  Person,
} from "@prisma/client";
import {
  BaseAssociationService,
  AssociationAuditContext,
  AssociationEventContext,
} from "../base";

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
 * Entity type with relations included.
 */
type PersonCaseAssociationWithRelations = PersonCaseAssociation & {
  person?: Person | null;
  case?: { id: string; referenceNumber?: string } | null;
};

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
export class PersonCaseAssociationService extends BaseAssociationService<
  CreatePersonCaseAssociationDto,
  PersonCaseAssociationWithRelations,
  PersonCaseLabel
> {
  constructor(
    prisma: PrismaService,
    eventEmitter: EventEmitter2,
    auditService: AuditService,
  ) {
    super(prisma, eventEmitter, auditService, {
      associationType: "person-case",
      prismaModelName: "personCaseAssociation",
      eventPrefix: "association.person-case",
      primaryAuditEntityType: "CASE",
    });
  }

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
   * No special validation needed for PersonCase.
   */
  protected validateCreate(): void {
    // No special validation needed
  }

  protected buildCreateData(
    dto: CreatePersonCaseAssociationDto,
    userId: string,
    organizationId: string,
  ): Record<string, unknown> {
    const isEvidentiary = this.isEvidentiaryLabel(dto.label);

    return {
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
    };
  }

  protected getCreateInclude(): Record<string, unknown> {
    return { person: true, case: true };
  }

  protected buildCreateAuditContext(
    dto: CreatePersonCaseAssociationDto,
  ): AssociationAuditContext {
    return {
      entityType: "CASE",
      entityId: dto.caseId,
      action: "association_created",
      actionDescription: `Person associated as ${dto.label}`,
      actionCategory: "CREATE",
      context: { personId: dto.personId, label: dto.label },
    };
  }

  protected buildCreateEventPayload(
    dto: CreatePersonCaseAssociationDto,
    entity: PersonCaseAssociationWithRelations,
    organizationId: string,
  ): AssociationEventContext {
    return {
      organizationId,
      associationId: entity.id,
      personId: dto.personId,
      caseId: dto.caseId,
      label: dto.label,
    };
  }

  protected getDeleteAuditEntityId(
    entity: PersonCaseAssociationWithRelations,
  ): string {
    return entity.caseId;
  }

  protected buildDeleteAuditDescription(
    entity: PersonCaseAssociationWithRelations,
  ): string {
    const personName = entity.person
      ? `${entity.person.firstName || ""} ${entity.person.lastName || ""}`.trim() ||
        entity.personId
      : entity.personId;
    return `${entity.label} association removed for ${personName}`;
  }

  protected buildDeleteAuditContext(
    entity: PersonCaseAssociationWithRelations,
  ): Record<string, unknown> {
    return {
      associationId: entity.id,
      personId: entity.personId,
      label: entity.label,
    };
  }

  protected buildDeleteEventPayload(
    entity: PersonCaseAssociationWithRelations,
    organizationId: string,
  ): AssociationEventContext {
    return {
      organizationId,
      associationId: entity.id,
      personId: entity.personId,
      caseId: entity.caseId,
      label: entity.label,
    };
  }

  protected getEntityLabel(
    entity: PersonCaseAssociationWithRelations,
  ): PersonCaseLabel {
    return entity.label;
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
      throw new BadRequestException("Association not found");
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

    this.emitEvent("status-changed", {
      organizationId,
      associationId,
      personId: association.personId,
      caseId: association.caseId,
      label: association.label,
      oldStatus,
      newStatus,
    });

    await this.logAudit(
      "CASE",
      association.caseId,
      "association_status_changed",
      `${association.label} status changed from ${oldStatus} to ${newStatus}`,
      "UPDATE",
      userId,
      organizationId,
      {
        associationId,
        personId: association.personId,
        label: association.label,
        oldStatus,
        newStatus,
        reason,
      },
    );

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
      throw new BadRequestException("Association not found");
    }

    if (!this.isRoleLabel(association.label)) {
      throw new BadRequestException(
        `Cannot end ${association.label} association - evidentiary associations are permanent`,
      );
    }

    if (association.endedAt) {
      throw new BadRequestException("Association has already ended");
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

    this.emitEvent("ended", {
      organizationId,
      associationId,
      personId: association.personId,
      caseId: association.caseId,
      label: association.label,
    });

    await this.logAudit(
      "CASE",
      association.caseId,
      "association_ended",
      `${association.label} role ended`,
      "UPDATE",
      userId,
      organizationId,
      {
        associationId,
        personId: association.personId,
        label: association.label,
        reason,
      },
    );

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
      orderBy: { createdAt: "asc" },
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
      orderBy: { createdAt: "desc" },
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
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Remove a person-case association.
   *
   * Note: For evidentiary associations (REPORTER, SUBJECT, WITNESS),
   * consider using updateEvidentiaryStatus to CLEARED instead,
   * to maintain audit trail.
   *
   * @throws BadRequestException if association doesn't exist
   */
  async remove(associationId: string, userId: string, organizationId: string) {
    return this.delete(associationId, userId, organizationId);
  }
}
