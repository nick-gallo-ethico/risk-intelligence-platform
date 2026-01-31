import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { ActivityService } from "../../common/services/activity.service";
import {
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
  UserResponseDto,
  UserListResponseDto,
} from "./dto";
import { AuditEntityType } from "@prisma/client";

/**
 * Service for managing users within an organization.
 *
 * All operations are scoped by organizationId for tenant isolation.
 * Admin-only operations are enforced at the controller level via guards.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  // -------------------------------------------------------------------------
  // CREATE - Create new user within organization
  // -------------------------------------------------------------------------

  /**
   * Creates a new user within the organization.
   *
   * @param dto - User creation data
   * @param creatorId - ID of the user creating this user
   * @param organizationId - Organization ID from JWT
   * @returns Created user response
   * @throws ConflictException if email already exists in organization
   */
  async create(
    dto: CreateUserDto,
    creatorId: string,
    organizationId: string,
  ): Promise<UserResponseDto> {
    this.logger.debug(`Creating user ${dto.email} for org ${organizationId}`);

    // Check if email already exists in this organization
    const existing = await this.prisma.user.findFirst({
      where: {
        organizationId,
        email: dto.email.toLowerCase(),
      },
    });

    if (existing) {
      throw new ConflictException("A user with this email already exists");
    }

    // Hash password if provided
    let passwordHash: string | null = null;
    if (dto.password) {
      passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        organizationId,
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
        isActive: true,
        // departmentId and businessUnitId will be added when those entities exist
      },
    });

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.USER,
      entityId: user.id,
      action: "created",
      actionDescription: `Created user ${user.firstName} ${user.lastName} (${user.email}) with role ${user.role}`,
      actorUserId: creatorId,
      organizationId,
      metadata: { role: user.role },
    });

    // TODO: Send welcome email (stub for now)
    this.logger.debug(`Welcome email would be sent to ${user.email}`);

    return this.mapToResponseDto(user);
  }

  // -------------------------------------------------------------------------
  // FIND ALL - Paginated list with filters
  // -------------------------------------------------------------------------

  /**
   * Retrieves a paginated list of users with optional filters.
   *
   * @param query - Query filters and pagination
   * @param organizationId - Organization ID from JWT
   * @returns Paginated user list
   */
  async findAll(
    query: UserQueryDto,
    organizationId: string,
  ): Promise<UserListResponseDto> {
    const {
      role,
      isActive,
      search,
      page = 1,
      limit = 20,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = query;

    const skip = (page - 1) * limit;

    // Build where clause - ALWAYS includes organizationId
    const where: Record<string, unknown> = {
      organizationId, // CRITICAL: Always filter by tenant
    };

    if (role) {
      where.role = role;
    }

    if (typeof isActive === "boolean") {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: "insensitive" } },
        { lastName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    // Validate sort field to prevent injection
    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "firstName",
      "lastName",
      "email",
      "role",
      "lastLoginAt",
    ];
    const safeSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : "createdAt";

    // Parallel query for data and count
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [safeSortBy]: sortOrder },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items: items.map(this.mapToResponseDto),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // -------------------------------------------------------------------------
  // FIND ONE - Get single user by ID
  // -------------------------------------------------------------------------

  /**
   * Retrieves a single user by ID.
   *
   * @param id - User UUID
   * @param organizationId - Organization ID from JWT
   * @returns User response
   * @throws NotFoundException if user not found or not in organization
   */
  async findOne(id: string, organizationId: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        organizationId, // CRITICAL: Include org filter to prevent cross-tenant access
      },
    });

    // IMPORTANT: Return 404 for both "not found" AND "wrong org"
    // This prevents enumeration attacks
    if (!user) {
      throw new NotFoundException("User not found");
    }

    return this.mapToResponseDto(user);
  }

  // -------------------------------------------------------------------------
  // UPDATE - Update user details
  // -------------------------------------------------------------------------

  /**
   * Updates an existing user.
   *
   * @param id - User UUID to update
   * @param dto - Update data
   * @param updaterId - ID of the user performing the update
   * @param organizationId - Organization ID from JWT
   * @returns Updated user response
   * @throws NotFoundException if user not found
   * @throws ForbiddenException if trying to deactivate self via isActive=false
   */
  async update(
    id: string,
    dto: UpdateUserDto,
    updaterId: string,
    organizationId: string,
  ): Promise<UserResponseDto> {
    // Verify user exists and belongs to this org
    const existing = await this.findOne(id, organizationId);

    // Prevent self-deactivation via update
    if (dto.isActive === false && id === updaterId) {
      throw new ForbiddenException("You cannot deactivate your own account");
    }

    // Capture old values for activity log
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    if (dto.firstName !== undefined && dto.firstName !== existing.firstName) {
      oldValues.firstName = existing.firstName;
      newValues.firstName = dto.firstName;
    }
    if (dto.lastName !== undefined && dto.lastName !== existing.lastName) {
      oldValues.lastName = existing.lastName;
      newValues.lastName = dto.lastName;
    }
    if (dto.role !== undefined && dto.role !== existing.role) {
      oldValues.role = existing.role;
      newValues.role = dto.role;
    }
    if (dto.isActive !== undefined && dto.isActive !== existing.isActive) {
      oldValues.isActive = existing.isActive;
      newValues.isActive = dto.isActive;
    }

    // Perform update
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        // departmentId and businessUnitId will be added when those entities exist
      },
    });

    // Build human-readable description of changes
    const changes: string[] = [];
    if (newValues.firstName) {
      changes.push(`name to "${dto.firstName} ${updated.lastName}"`);
    }
    if (newValues.lastName && !newValues.firstName) {
      changes.push(`name to "${updated.firstName} ${dto.lastName}"`);
    }
    if (newValues.role) {
      changes.push(`role from ${oldValues.role} to ${newValues.role}`);
    }
    if (newValues.isActive !== undefined) {
      changes.push(
        newValues.isActive ? "reactivated account" : "deactivated account",
      );
    }

    const description =
      changes.length > 0
        ? `Updated ${updated.firstName} ${updated.lastName}: ${changes.join(", ")}`
        : `Updated user ${updated.firstName} ${updated.lastName}`;

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.USER,
      entityId: id,
      action: "updated",
      actionDescription: description,
      actorUserId: updaterId,
      organizationId,
      changes: {
        oldValue: oldValues,
        newValue: newValues,
      },
    });

    return this.mapToResponseDto(updated);
  }

  // -------------------------------------------------------------------------
  // DEACTIVATE - Soft delete user
  // -------------------------------------------------------------------------

  /**
   * Deactivates a user (soft delete by setting isActive = false).
   *
   * @param id - User UUID to deactivate
   * @param updaterId - ID of the user performing the deactivation
   * @param organizationId - Organization ID from JWT
   * @throws NotFoundException if user not found
   * @throws ForbiddenException if trying to deactivate self
   */
  async deactivate(
    id: string,
    updaterId: string,
    organizationId: string,
  ): Promise<void> {
    // Verify user exists and belongs to this org
    const existing = await this.findOne(id, organizationId);

    // Prevent self-deactivation
    if (id === updaterId) {
      throw new ForbiddenException("You cannot deactivate your own account");
    }

    // Check if already deactivated
    if (!existing.isActive) {
      this.logger.debug(`User ${id} is already deactivated`);
      return;
    }

    // Soft delete by setting isActive = false
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    // Log activity
    await this.activityService.log({
      entityType: AuditEntityType.USER,
      entityId: id,
      action: "deactivated",
      actionDescription: `Deactivated user ${existing.firstName} ${existing.lastName} (${existing.email})`,
      actorUserId: updaterId,
      organizationId,
      changes: {
        oldValue: { isActive: true },
        newValue: { isActive: false },
      },
    });
  }

  // -------------------------------------------------------------------------
  // HELPER METHODS
  // -------------------------------------------------------------------------

  /**
   * Maps a Prisma User record to UserResponseDto.
   * Excludes sensitive fields like passwordHash.
   */
  private mapToResponseDto = (user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): UserResponseDto => {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as UserResponseDto["role"],
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      // department and businessUnit will be added when those relations exist
    };
  };
}
