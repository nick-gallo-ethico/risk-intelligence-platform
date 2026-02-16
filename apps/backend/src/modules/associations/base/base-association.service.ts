import { Logger, BadRequestException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { AuditService, CreateAuditLogDto } from "../../audit/audit.service";
import {
  AssociationConfig,
  AssociationAuditContext,
  AssociationEventContext,
  DeleteResult,
} from "./association.types";
import { getDynamicPrismaModel } from "../../../common/types/prisma.types";

/**
 * Abstract base class for association services.
 *
 * Provides common CRUD operations, event emission, and audit logging
 * for all association types (PersonCase, CaseCase, PersonPerson, PersonRiu).
 *
 * Generic parameters:
 * - TCreateDto: The DTO type for creating an association
 * - TEntity: The Prisma entity type returned by queries
 * - TLabel: The enum type for association labels
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class MyAssociationService extends BaseAssociationService<
 *   CreateMyAssociationDto,
 *   MyAssociation,
 *   MyLabel
 * > {
 *   constructor(
 *     prisma: PrismaService,
 *     eventEmitter: EventEmitter2,
 *     auditService: AuditService,
 *   ) {
 *     super(prisma, eventEmitter, auditService, {
 *       associationType: "my-association",
 *       prismaModelName: "myAssociation",
 *       eventPrefix: "association.my-association",
 *       primaryAuditEntityType: "MY_ENTITY",
 *     });
 *   }
 * }
 * ```
 */
export abstract class BaseAssociationService<
  TCreateDto,
  TEntity extends { id: string },
  TLabel,
> {
  protected readonly logger: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly eventEmitter: EventEmitter2,
    protected readonly auditService: AuditService,
    protected readonly config: AssociationConfig,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  /**
   * Validate the create DTO before creating the association.
   * Subclasses should implement validation logic (e.g., preventing self-associations).
   *
   * @throws BadRequestException if validation fails
   */
  protected abstract validateCreate(
    dto: TCreateDto,
    organizationId: string,
  ): void | Promise<void>;

  /**
   * Build the Prisma create data from the DTO.
   * Subclasses define how the DTO maps to the database model.
   */
  protected abstract buildCreateData(
    dto: TCreateDto,
    userId: string,
    organizationId: string,
  ): Record<string, unknown>;

  /**
   * Build the Prisma include clause for create/find operations.
   * Defines which relations to include in the response.
   */
  protected abstract getCreateInclude(): Record<string, unknown>;

  /**
   * Build the audit context for a create operation.
   * Returns the entity type, ID, action description, and context.
   */
  protected abstract buildCreateAuditContext(
    dto: TCreateDto,
    entity: TEntity,
  ): AssociationAuditContext;

  /**
   * Build the event payload for a create operation.
   */
  protected abstract buildCreateEventPayload(
    dto: TCreateDto,
    entity: TEntity,
    organizationId: string,
  ): AssociationEventContext;

  /**
   * Get the primary entity ID for a delete audit log.
   * For example, for PersonCase this would be the caseId.
   */
  protected abstract getDeleteAuditEntityId(entity: TEntity): string;

  /**
   * Build the audit description for a delete operation.
   */
  protected abstract buildDeleteAuditDescription(entity: TEntity): string;

  /**
   * Build the audit context for a delete operation.
   */
  protected abstract buildDeleteAuditContext(
    entity: TEntity,
  ): Record<string, unknown>;

  /**
   * Build the event payload for a delete operation.
   */
  protected abstract buildDeleteEventPayload(
    entity: TEntity,
    organizationId: string,
  ): AssociationEventContext;

  /**
   * Get the label value from an entity for logging/audit purposes.
   */
  protected abstract getEntityLabel(entity: TEntity): TLabel;

  /**
   * Create a new association.
   *
   * This method:
   * 1. Validates the DTO (via subclass implementation)
   * 2. Creates the association in the database
   * 3. Logs the action
   * 4. Emits an event
   * 5. Creates an audit log entry
   *
   * @param dto The creation DTO
   * @param userId The ID of the user creating the association
   * @param organizationId The tenant organization ID
   * @returns The created association entity
   */
  async create(
    dto: TCreateDto,
    userId: string,
    organizationId: string,
  ): Promise<TEntity> {
    // Validate (may throw BadRequestException)
    await this.validateCreate(dto, organizationId);

    // Build the create data
    const createData = this.buildCreateData(dto, userId, organizationId);
    const include = this.getCreateInclude();

    // Create the association using dynamic Prisma model access
    const model = getDynamicPrismaModel(
      this.prisma,
      this.config.prismaModelName,
    );
    const entity = (await model.create({
      data: createData,
      include,
    })) as TEntity;

    // Log the action
    const label = this.getEntityLabel(entity);
    this.logger.log(
      `Created ${this.config.associationType} association: ${entity.id} (${label})`,
    );

    // Emit event
    const eventPayload = this.buildCreateEventPayload(
      dto,
      entity,
      organizationId,
    );
    this.eventEmitter.emit(`${this.config.eventPrefix}.created`, eventPayload);

    // Audit log
    const auditContext = this.buildCreateAuditContext(dto, entity);
    await this.logAudit(
      auditContext.entityType,
      auditContext.entityId,
      auditContext.action,
      auditContext.actionDescription,
      auditContext.actionCategory,
      userId,
      organizationId,
      auditContext.context,
    );

    return entity;
  }

  /**
   * Delete an association by ID.
   *
   * @param associationId The ID of the association to delete
   * @param userId The ID of the user performing the deletion
   * @param organizationId The tenant organization ID
   * @returns A result object indicating success
   * @throws BadRequestException if the association is not found
   */
  async delete(
    associationId: string,
    userId: string,
    organizationId: string,
  ): Promise<DeleteResult> {
    // Find the association first
    const entity = await this.findByIdOrThrow(associationId, organizationId);

    // Delete it
    const deleteModel = getDynamicPrismaModel(
      this.prisma,
      this.config.prismaModelName,
    );
    await deleteModel.delete({
      where: { id: associationId },
    });

    // Log the action
    const label = this.getEntityLabel(entity);
    this.logger.log(
      `Deleted ${this.config.associationType} association: ${associationId} (${label})`,
    );

    // Emit event
    const eventPayload = this.buildDeleteEventPayload(entity, organizationId);
    this.eventEmitter.emit(`${this.config.eventPrefix}.removed`, eventPayload);

    // Audit log
    const auditEntityId = this.getDeleteAuditEntityId(entity);
    const auditDescription = this.buildDeleteAuditDescription(entity);
    const auditContext = this.buildDeleteAuditContext(entity);

    await this.logAudit(
      this.config.primaryAuditEntityType,
      auditEntityId,
      "association_deleted",
      auditDescription,
      "DELETE",
      userId,
      organizationId,
      auditContext,
    );

    return { success: true };
  }

  /**
   * Find an association by ID or throw if not found.
   *
   * @param associationId The association ID
   * @param organizationId The tenant organization ID
   * @returns The association entity
   * @throws BadRequestException if not found
   */
  protected async findByIdOrThrow(
    associationId: string,
    organizationId: string,
  ): Promise<TEntity> {
    const findModel = getDynamicPrismaModel(
      this.prisma,
      this.config.prismaModelName,
    );
    const entity = await findModel.findFirst({
      where: { id: associationId, organizationId },
      include: this.getCreateInclude(),
    });

    if (!entity) {
      throw new BadRequestException("Association not found");
    }

    return entity as TEntity;
  }

  /**
   * Emit an event with the configured prefix.
   *
   * @param eventSuffix The event suffix (e.g., "created", "updated", "removed")
   * @param payload The event payload
   */
  protected emitEvent(
    eventSuffix: string,
    payload: AssociationEventContext,
  ): void {
    this.eventEmitter.emit(
      `${this.config.eventPrefix}.${eventSuffix}`,
      payload,
    );
  }

  /**
   * Log an audit entry for an association action.
   *
   * @param entityType The audit entity type
   * @param entityId The entity ID being audited
   * @param action The action identifier
   * @param actionDescription Human-readable description
   * @param actionCategory The action category (CREATE, UPDATE, DELETE)
   * @param userId The actor user ID
   * @param organizationId The tenant organization ID
   * @param context Additional context data
   */
  protected async logAudit(
    entityType: CreateAuditLogDto["entityType"],
    entityId: string,
    action: string,
    actionDescription: string,
    actionCategory: CreateAuditLogDto["actionCategory"],
    userId: string,
    organizationId: string,
    context?: Record<string, unknown>,
  ): Promise<void> {
    await this.auditService.log({
      entityType,
      entityId,
      action,
      actionDescription,
      actionCategory,
      actorUserId: userId,
      actorType: "USER",
      organizationId,
      context,
    });
  }
}
