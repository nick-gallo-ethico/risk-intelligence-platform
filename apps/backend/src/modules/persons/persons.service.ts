import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  Prisma,
  Person,
  PersonType,
  PersonSource,
  PersonStatus,
  AnonymityTier,
  AuditEntityType,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import { CreatePersonDto, UpdatePersonDto, PersonQueryDto } from "./dto";

/**
 * Service for managing person records.
 * Person is the foundation for people-based pattern detection - employees,
 * external contacts, and anonymous reporters all become Person records.
 * All queries are automatically scoped to the user's organization via RLS.
 */
@Injectable()
export class PersonsService {
  private readonly logger = new Logger(PersonsService.name);

  constructor(
    private prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Creates a new person record.
   * Validates uniqueness of email within organization if provided.
   */
  async create(
    dto: CreatePersonDto,
    userId: string,
    organizationId: string,
  ): Promise<Person> {
    // Check email uniqueness if provided
    if (dto.email) {
      const existing = await this.findByEmail(dto.email, organizationId);
      if (existing) {
        throw new ConflictException(
          `Person with email ${dto.email} already exists in this organization`,
        );
      }
    }

    const data: Prisma.PersonUncheckedCreateInput = {
      organizationId,
      type: dto.type,
      source: dto.source,
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      phone: dto.phone,
      employeeId: dto.employeeId,
      company: dto.company,
      title: dto.title,
      relationship: dto.relationship,
      anonymityTier: dto.anonymityTier ?? AnonymityTier.OPEN,
      notes: dto.notes,
      createdById: userId,
      updatedById: userId,
    };

    const person = await this.prisma.person.create({ data });

    // Log activity with natural language description
    const displayName = this.getDisplayName(person);
    await this.activityService.log({
      entityType: AuditEntityType.PERSON,
      entityId: person.id,
      action: "created",
      actionDescription: `Created person ${displayName} (${person.type})`,
      actorUserId: userId,
      organizationId,
    });

    // Emit event for subscribers (search indexing, notifications)
    this.emitEvent("person.created", {
      organizationId,
      actorUserId: userId,
      personId: person.id,
      type: person.type,
      source: person.source,
    });

    return person;
  }

  /**
   * Returns paginated list of persons for the current organization.
   * Supports filtering by type, source, status, and search.
   */
  async findAll(
    query: PersonQueryDto,
    organizationId: string,
  ): Promise<{ data: Person[]; total: number; limit: number; offset: number }> {
    const {
      limit = 20,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const where = this.buildWhereClause(query, organizationId);

    const [data, total] = await Promise.all([
      this.prisma.person.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        take: limit,
        skip: offset,
      }),
      this.prisma.person.count({ where }),
    ]);

    return { data, total, limit, offset };
  }

  /**
   * Returns a single person by ID.
   * Throws NotFoundException if not found or belongs to different org.
   */
  async findOne(id: string, organizationId: string): Promise<Person> {
    const person = await this.prisma.person.findFirst({
      where: {
        id,
        organizationId,
      },
    });

    if (!person) {
      throw new NotFoundException(`Person with ID ${id} not found`);
    }

    return person;
  }

  /**
   * Finds a person by email within the organization.
   * Returns null if not found (used for intake matching).
   */
  async findByEmail(
    email: string,
    organizationId: string,
  ): Promise<Person | null> {
    return this.prisma.person.findFirst({
      where: {
        email: email.toLowerCase(),
        organizationId,
      },
    });
  }

  /**
   * Updates a person record.
   * type and source cannot be changed after creation.
   */
  async update(
    id: string,
    dto: UpdatePersonDto,
    userId: string,
    organizationId: string,
  ): Promise<Person> {
    // Verify person exists and belongs to this org
    const existing = await this.findOne(id, organizationId);

    // Check email uniqueness if being changed
    if (dto.email && dto.email !== existing.email) {
      const emailTaken = await this.findByEmail(dto.email, organizationId);
      if (emailTaken && emailTaken.id !== id) {
        throw new ConflictException(
          `Person with email ${dto.email} already exists in this organization`,
        );
      }
    }

    const data: Prisma.PersonUncheckedUpdateInput = {
      updatedById: userId,
    };

    // Only set fields that are provided
    if (dto.firstName !== undefined) data.firstName = dto.firstName;
    if (dto.lastName !== undefined) data.lastName = dto.lastName;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.employeeId !== undefined) data.employeeId = dto.employeeId;
    if (dto.company !== undefined) data.company = dto.company;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.relationship !== undefined) data.relationship = dto.relationship;
    if (dto.anonymityTier !== undefined) data.anonymityTier = dto.anonymityTier;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.notes !== undefined) data.notes = dto.notes;

    const updated = await this.prisma.person.update({
      where: { id },
      data,
    });

    // Build description of changed fields
    const changedFields = Object.keys(dto).filter(
      (key) => dto[key as keyof UpdatePersonDto] !== undefined,
    );
    const displayName = this.getDisplayName(updated);
    const description =
      changedFields.length > 0
        ? `Updated ${changedFields.join(", ")} on person ${displayName}`
        : `Updated person ${displayName}`;

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.PERSON,
      entityId: id,
      action: "updated",
      actionDescription: description,
      actorUserId: userId,
      organizationId,
      changes: {
        oldValue: { fields: changedFields },
        newValue: { ...dto },
      },
    });

    // Emit event for subscribers
    this.emitEvent("person.updated", {
      organizationId,
      actorUserId: userId,
      personId: id,
      changes: changedFields,
    });

    return updated;
  }

  /**
   * Gets or creates the singleton anonymous placeholder for an organization.
   * Used for pattern detection on anonymous reports while maintaining privacy.
   * Each organization has exactly one anonymous placeholder.
   */
  async getOrCreateAnonymousPlaceholder(
    organizationId: string,
    userId?: string,
  ): Promise<Person> {
    // Try to find existing placeholder
    const existing = await this.prisma.person.findFirst({
      where: {
        organizationId,
        type: PersonType.ANONYMOUS_PLACEHOLDER,
      },
    });

    if (existing) {
      return existing;
    }

    // Create singleton anonymous placeholder
    const placeholder = await this.prisma.person.create({
      data: {
        organizationId,
        type: PersonType.ANONYMOUS_PLACEHOLDER,
        source: PersonSource.INTAKE_CREATED,
        anonymityTier: AnonymityTier.ANONYMOUS,
        notes: "System-generated anonymous placeholder for pattern detection",
        createdById: userId,
        updatedById: userId,
      },
    });

    this.logger.log(
      `Created anonymous placeholder for organization ${organizationId}`,
    );

    // Log activity
    if (userId) {
      await this.activityService.log({
        entityType: AuditEntityType.PERSON,
        entityId: placeholder.id,
        action: "created",
        actionDescription:
          "Created anonymous placeholder for pattern detection",
        actorUserId: userId,
        organizationId,
      });
    }

    return placeholder;
  }

  /**
   * Builds Prisma where clause from query parameters.
   */
  private buildWhereClause(
    query: PersonQueryDto,
    organizationId: string,
  ): Prisma.PersonWhereInput {
    const where: Prisma.PersonWhereInput = {
      organizationId,
    };

    // Type filter
    if (query.type) {
      where.type = query.type;
    }

    // Source filter
    if (query.source) {
      where.source = query.source;
    }

    // Status filter
    if (query.status) {
      where.status = query.status;
    }

    // Anonymity tier filter
    if (query.anonymityTier) {
      where.anonymityTier = query.anonymityTier;
    }

    // Search filter (name or email)
    if (query.search && query.search.trim().length > 0) {
      const searchTerm = query.search.trim();
      where.OR = [
        { firstName: { contains: searchTerm, mode: "insensitive" } },
        { lastName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { company: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    return where;
  }

  /**
   * Gets a display name for a person.
   * Falls back through: name -> email -> company -> "Anonymous"
   */
  private getDisplayName(person: Person): string {
    if (person.firstName || person.lastName) {
      return [person.firstName, person.lastName].filter(Boolean).join(" ");
    }
    if (person.email) {
      return person.email;
    }
    if (person.company) {
      return person.company;
    }
    if (person.type === PersonType.ANONYMOUS_PLACEHOLDER) {
      return "Anonymous Placeholder";
    }
    return "Unknown Person";
  }

  /**
   * Safely emits an event. Failures are logged but don't crash the request.
   * Events are fire-and-forget - request success is independent of event delivery.
   */
  private emitEvent(eventName: string, event: object): void {
    try {
      this.eventEmitter.emit(eventName, event);
    } catch (error) {
      this.logger.error(
        `Failed to emit event ${eventName}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      // Don't rethrow - request should succeed even if event emission fails
    }
  }
}
