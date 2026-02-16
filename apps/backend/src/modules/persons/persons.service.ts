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
  Employee,
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
      // Denormalized Employee fields
      businessUnitId: dto.businessUnitId,
      businessUnitName: dto.businessUnitName,
      jobTitle: dto.jobTitle,
      employmentStatus: dto.employmentStatus,
      locationId: dto.locationId,
      locationName: dto.locationName,
      // Manager hierarchy
      managerId: dto.managerId,
      managerName: dto.managerName,
      // External contact details
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
    // Denormalized Employee fields
    if (dto.businessUnitId !== undefined)
      data.businessUnitId = dto.businessUnitId;
    if (dto.businessUnitName !== undefined)
      data.businessUnitName = dto.businessUnitName;
    if (dto.jobTitle !== undefined) data.jobTitle = dto.jobTitle;
    if (dto.employmentStatus !== undefined)
      data.employmentStatus = dto.employmentStatus;
    if (dto.locationId !== undefined) data.locationId = dto.locationId;
    if (dto.locationName !== undefined) data.locationName = dto.locationName;
    // Manager hierarchy
    if (dto.managerId !== undefined) data.managerId = dto.managerId;
    if (dto.managerName !== undefined) data.managerName = dto.managerName;
    // External contact details
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

  // Employee Linkage Methods

  /**
   * Creates Person records from multiple employees efficiently using batch queries.
   * Eliminates N+1 query pattern by fetching all relations in 3 queries.
   *
   * @param employees - Array of Employee records to create Person records from
   * @param userId - The user initiating the creation
   * @param organizationId - The organization ID
   * @returns Array of created Person records
   */
  async createFromEmployeeBatch(
    employees: Employee[],
    userId: string,
    organizationId: string,
  ): Promise<Person[]> {
    if (employees.length === 0) {
      return [];
    }

    // Step 1: Collect all unique relation IDs
    const managerIds = [
      ...new Set(
        employees.map((e) => e.managerId).filter((id): id is string => !!id),
      ),
    ];
    const businessUnitIds = [
      ...new Set(
        employees
          .map((e) => e.businessUnitId)
          .filter((id): id is string => !!id),
      ),
    ];
    const locationIds = [
      ...new Set(
        employees.map((e) => e.locationId).filter((id): id is string => !!id),
      ),
    ];

    // Step 2: Check existing persons to avoid duplicates
    const existingPersons = await this.prisma.person.findMany({
      where: {
        organizationId,
        employeeId: { in: employees.map((e) => e.id) },
        type: PersonType.EMPLOYEE,
      },
      select: { id: true, employeeId: true },
    });
    const existingEmployeeIds = new Set(
      existingPersons.map((p) => p.employeeId),
    );

    // Filter to only new employees
    const newEmployees = employees.filter(
      (e) => !existingEmployeeIds.has(e.id),
    );
    if (newEmployees.length === 0) {
      this.logger.debug(
        `All ${employees.length} employees already have Person records`,
      );
      return [];
    }

    // Step 3: Batch fetch all relations in parallel (3 queries total)
    const [managerEmployees, businessUnits, locations] = await Promise.all([
      managerIds.length > 0
        ? this.prisma.employee.findMany({
            where: { id: { in: managerIds }, organizationId },
            select: { id: true, firstName: true, lastName: true },
          })
        : Promise.resolve([]),
      businessUnitIds.length > 0
        ? this.prisma.businessUnit.findMany({
            where: { id: { in: businessUnitIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
      locationIds.length > 0
        ? this.prisma.location.findMany({
            where: { id: { in: locationIds } },
            select: { id: true, name: true },
          })
        : Promise.resolve([]),
    ]);

    // Step 4: Create lookup maps for O(1) access
    const managerMap = new Map(
      managerEmployees.map((m) => [m.id, `${m.firstName} ${m.lastName}`]),
    );
    const buMap = new Map(businessUnits.map((b) => [b.id, b.name]));
    const locMap = new Map(locations.map((l) => [l.id, l.name]));

    // Step 5: Create all persons in a transaction (atomic batch creation)
    const persons = await this.prisma.$transaction(
      newEmployees.map((employee) =>
        this.prisma.person.create({
          data: {
            organizationId,
            type: PersonType.EMPLOYEE,
            source: PersonSource.HRIS_SYNC,
            firstName: employee.firstName,
            lastName: employee.lastName,
            email: employee.email,
            phone: employee.phone ?? undefined,
            employeeId: employee.id,
            businessUnitId: employee.businessUnitId ?? undefined,
            businessUnitName: employee.businessUnitId
              ? buMap.get(employee.businessUnitId)
              : undefined,
            jobTitle: employee.jobTitle,
            employmentStatus: employee.employmentStatus,
            locationId: employee.locationId ?? undefined,
            locationName: employee.locationId
              ? locMap.get(employee.locationId)
              : undefined,
            managerId: employee.managerId ?? undefined,
            managerName: employee.managerId
              ? managerMap.get(employee.managerId)
              : undefined,
            anonymityTier: AnonymityTier.OPEN,
            createdById: userId,
            updatedById: userId,
          },
        }),
      ),
    );

    // Step 6: Log batch creation
    this.logger.log(
      `Created ${persons.length} Person records from ${employees.length} employees (batch)`,
    );

    // Emit events for each person
    for (const person of persons) {
      this.emitEvent("person.created", {
        organizationId,
        actorUserId: userId,
        personId: person.id,
        type: person.type,
        source: person.source,
        employeeId: person.employeeId,
      });
    }

    return persons;
  }

  /**
   * Creates a Person record from an Employee, including manager chain.
   * Used during HRIS sync to create Person records for employees.
   * If the employee's manager doesn't have a Person record, recursively creates it.
   *
   * Note: For bulk operations, prefer createFromEmployeeBatch for better performance.
   *
   * @param employee - The Employee record to create a Person from
   * @param userId - The user initiating the creation
   * @param organizationId - The organization ID
   * @returns The created Person record
   */
  async createFromEmployee(
    employee: Employee,
    userId: string,
    organizationId: string,
  ): Promise<Person> {
    // Check if Person already exists for this employee
    const existing = await this.findByEmployeeId(employee.id, organizationId);
    if (existing) {
      this.logger.debug(
        `Person already exists for employee ${employee.id}, returning existing`,
      );
      return existing;
    }

    // If employee has a manager, ensure manager's Person record exists first
    let managerPersonId: string | undefined;
    let managerPersonName: string | undefined;

    if (employee.managerId) {
      const managerEmployee = await this.prisma.employee.findFirst({
        where: {
          id: employee.managerId,
          organizationId,
        },
      });

      if (managerEmployee) {
        // Recursively create manager's Person record if needed
        const managerPerson = await this.createFromEmployee(
          managerEmployee,
          userId,
          organizationId,
        );
        managerPersonId = managerPerson.id;
        managerPersonName = this.getDisplayName(managerPerson);
      }
    }

    // Get business unit name if business unit ID exists
    let businessUnitName: string | undefined;
    if (employee.businessUnitId) {
      const businessUnit = await this.prisma.businessUnit.findFirst({
        where: { id: employee.businessUnitId },
      });
      businessUnitName = businessUnit?.name;
    }

    // Get location name if location ID exists
    let locationNameValue: string | undefined;
    if (employee.locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: employee.locationId },
      });
      locationNameValue = location?.name;
    }

    // Create the Person record
    const person = await this.prisma.person.create({
      data: {
        organizationId,
        type: PersonType.EMPLOYEE,
        source: PersonSource.HRIS_SYNC,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone ?? undefined,
        employeeId: employee.id,
        // Denormalized Employee fields
        businessUnitId: employee.businessUnitId ?? undefined,
        businessUnitName: businessUnitName,
        jobTitle: employee.jobTitle,
        employmentStatus: employee.employmentStatus,
        locationId: employee.locationId ?? undefined,
        locationName: locationNameValue,
        // Manager hierarchy
        managerId: managerPersonId,
        managerName: managerPersonName,
        anonymityTier: AnonymityTier.OPEN,
        createdById: userId,
        updatedById: userId,
      },
    });

    // Log activity
    const displayName = this.getDisplayName(person);
    await this.activityService.log({
      entityType: AuditEntityType.PERSON,
      entityId: person.id,
      action: "created",
      actionDescription: `Created person ${displayName} from HRIS employee record`,
      actorUserId: userId,
      organizationId,
    });

    // Emit event
    this.emitEvent("person.created", {
      organizationId,
      actorUserId: userId,
      personId: person.id,
      type: person.type,
      source: person.source,
      employeeId: employee.id,
    });

    this.logger.log(`Created Person ${person.id} from Employee ${employee.id}`);

    return person;
  }

  /**
   * Syncs a Person record with updates from its linked Employee.
   * Used when HRIS data changes (job title, manager, location, etc.).
   * Does NOT change type or source (they remain EMPLOYEE/HRIS_SYNC).
   *
   * @param personId - The Person ID to sync
   * @param employee - The updated Employee data
   * @param userId - The user initiating the sync
   * @param organizationId - The organization ID
   * @returns The updated Person record
   */
  async syncFromEmployee(
    personId: string,
    employee: Employee,
    userId: string,
    organizationId: string,
  ): Promise<Person> {
    // Verify person exists
    const existing = await this.findOne(personId, organizationId);

    if (existing.type !== PersonType.EMPLOYEE) {
      throw new ConflictException(
        `Cannot sync non-employee Person ${personId} from Employee data`,
      );
    }

    // Resolve manager Person ID if manager changed
    let managerPersonId: string | null = null;
    let managerPersonName: string | null = null;

    if (employee.managerId) {
      const managerPerson = await this.findByEmployeeId(
        employee.managerId,
        organizationId,
      );
      if (managerPerson) {
        managerPersonId = managerPerson.id;
        managerPersonName = this.getDisplayName(managerPerson);
      } else {
        // Manager's Person doesn't exist yet - create it
        const managerEmployee = await this.prisma.employee.findFirst({
          where: { id: employee.managerId, organizationId },
        });
        if (managerEmployee) {
          const newManagerPerson = await this.createFromEmployee(
            managerEmployee,
            userId,
            organizationId,
          );
          managerPersonId = newManagerPerson.id;
          managerPersonName = this.getDisplayName(newManagerPerson);
        }
      }
    }

    // Get business unit name
    let businessUnitName: string | null = null;
    if (employee.businessUnitId) {
      const businessUnit = await this.prisma.businessUnit.findFirst({
        where: { id: employee.businessUnitId },
      });
      businessUnitName = businessUnit?.name ?? null;
    }

    // Get location name
    let locationNameValue: string | null = null;
    if (employee.locationId) {
      const location = await this.prisma.location.findFirst({
        where: { id: employee.locationId },
      });
      locationNameValue = location?.name ?? null;
    }

    // Update the Person record
    const updated = await this.prisma.person.update({
      where: { id: personId },
      data: {
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        phone: employee.phone,
        businessUnitId: employee.businessUnitId,
        businessUnitName: businessUnitName,
        jobTitle: employee.jobTitle,
        employmentStatus: employee.employmentStatus,
        locationId: employee.locationId,
        locationName: locationNameValue,
        managerId: managerPersonId,
        managerName: managerPersonName,
        updatedById: userId,
      },
    });

    // Log activity
    const displayName = this.getDisplayName(updated);
    await this.activityService.log({
      entityType: AuditEntityType.PERSON,
      entityId: personId,
      action: "synced_from_hris",
      actionDescription: `Synced person ${displayName} from HRIS employee update`,
      actorUserId: userId,
      organizationId,
    });

    // Emit event
    this.emitEvent("person.updated", {
      organizationId,
      actorUserId: userId,
      personId: personId,
      syncedFromEmployee: true,
      employeeId: employee.id,
    });

    this.logger.log(`Synced Person ${personId} from Employee ${employee.id}`);

    return updated;
  }

  /**
   * Finds a Person by their linked Employee ID.
   * Returns null if no Person exists for this Employee.
   *
   * @param employeeId - The Employee ID to search for
   * @param organizationId - The organization ID
   * @returns The Person record or null
   */
  async findByEmployeeId(
    employeeId: string,
    organizationId: string,
  ): Promise<Person | null> {
    return this.prisma.person.findFirst({
      where: {
        employeeId,
        organizationId,
        type: PersonType.EMPLOYEE,
      },
    });
  }

  /**
   * Gets the manager chain for a Person using a recursive CTE.
   * Fetches the entire hierarchy in a single database query.
   * Returns an array starting with the Person's direct manager up to maxDepth.
   *
   * @param personId - The Person ID to get the manager chain for
   * @param organizationId - The organization ID
   * @param maxDepth - Maximum depth to traverse (default 10, prevents infinite loops)
   * @returns Array of Person records representing the manager chain
   */
  async getManagerChain(
    personId: string,
    organizationId: string,
    maxDepth: number = 10,
  ): Promise<Person[]> {
    // Use recursive CTE to fetch entire chain in single query
    // Note: Column names use snake_case as defined in @@map in schema.prisma
    const chain = await this.prisma.$queryRaw<Person[]>`
      WITH RECURSIVE manager_chain AS (
        -- Base case: get the person's direct manager
        SELECT p.*, 1 AS depth
        FROM persons p
        WHERE p.id = (
          SELECT manager_id FROM persons WHERE id = ${personId} AND organization_id = ${organizationId}
        )
        AND p.organization_id = ${organizationId}

        UNION ALL

        -- Recursive case: get each manager's manager
        SELECT p.*, mc.depth + 1
        FROM persons p
        INNER JOIN manager_chain mc ON p.id = mc.manager_id
        WHERE mc.depth < ${maxDepth}
        AND p.organization_id = ${organizationId}
      )
      SELECT
        id,
        organization_id AS "organizationId",
        type,
        source,
        first_name AS "firstName",
        last_name AS "lastName",
        email,
        phone,
        employee_id AS "employeeId",
        business_unit_id AS "businessUnitId",
        business_unit_name AS "businessUnitName",
        job_title AS "jobTitle",
        employment_status AS "employmentStatus",
        location_id AS "locationId",
        location_name AS "locationName",
        manager_id AS "managerId",
        manager_name AS "managerName",
        company,
        title,
        relationship,
        anonymity_tier AS "anonymityTier",
        status,
        merged_into_primary_id AS "mergedIntoPrimaryId",
        merged_at AS "mergedAt",
        merged_by_id AS "mergedById",
        notes,
        created_by_id AS "createdById",
        updated_by_id AS "updatedById",
        created_at AS "createdAt",
        updated_at AS "updatedAt"
      FROM manager_chain
      ORDER BY depth ASC
    `;

    return chain;
  }

  /**
   * Gets direct reports for a Person (people who have this Person as their manager).
   * Useful for org chart navigation and team views.
   * Results are bounded to prevent unbounded queries on large organizations.
   *
   * @param personId - The Person ID to get direct reports for
   * @param organizationId - The organization ID
   * @param options - Optional limit parameter (default 100 to prevent unbounded queries)
   * @returns Array of Person records who report to this Person
   */
  async getDirectReports(
    personId: string,
    organizationId: string,
    options: { limit?: number } = {},
  ): Promise<Person[]> {
    const limit = options.limit ?? 100;

    return this.prisma.person.findMany({
      where: {
        managerId: personId,
        organizationId,
        status: PersonStatus.ACTIVE,
      },
      take: limit,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  }

  // Private Helper Methods

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
