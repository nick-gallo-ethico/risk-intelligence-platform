import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import {
  CreateUserDto,
  UpdateUserDto,
  UserQueryDto,
  UserResponseDto,
  UserListResponseDto,
} from "./dto";
import { JwtAuthGuard, TenantGuard, RolesGuard } from "../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../common/decorators";
import { RequestUser } from "../auth/interfaces/jwt-payload.interface";

/**
 * REST API controller for user management.
 * All endpoints require authentication and are scoped to user's organization.
 *
 * RBAC:
 * - SYSTEM_ADMIN: Full access (create, update, delete)
 * - All authenticated users: Can list users and view details
 * - Any authenticated user: Can access /me endpoint
 */
@ApiTags("Users")
@ApiBearerAuth("JWT")
@Controller("users")
@UseGuards(JwtAuthGuard, TenantGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /api/v1/users/me
   * Returns the current authenticated user's profile.
   *
   * IMPORTANT: This route MUST be defined before /:id to avoid
   * "me" being interpreted as a UUID parameter.
   */
  @Get("me")
  @ApiOperation({
    summary: "Get current user profile",
    description: "Returns the authenticated user's own profile information",
  })
  @ApiResponse({
    status: 200,
    description: "Current user profile",
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getCurrentUser(
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(user.id, organizationId);
  }

  /**
   * POST /api/v1/users
   * Creates a new user in the organization.
   */
  @Post()
  @Roles(UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a new user",
    description:
      "Creates a new user within the organization. Requires SYSTEM_ADMIN role.",
  })
  @ApiResponse({
    status: 201,
    description: "User created successfully",
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - requires SYSTEM_ADMIN role",
  })
  @ApiResponse({ status: 409, description: "Email already exists" })
  async create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<UserResponseDto> {
    return this.usersService.create(dto, user.id, organizationId);
  }

  /**
   * GET /api/v1/users
   * Returns paginated list of users with optional filtering.
   */
  @Get()
  @ApiOperation({
    summary: "List users",
    description:
      "Returns paginated list of users with optional filtering by role, status, and search",
  })
  @ApiResponse({
    status: 200,
    description: "List of users with pagination",
    type: UserListResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(
    @Query() query: UserQueryDto,
    @TenantId() organizationId: string,
  ): Promise<UserListResponseDto> {
    return this.usersService.findAll(query, organizationId);
  }

  /**
   * GET /api/v1/users/:id
   * Returns a single user by ID.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get user by ID",
    description: "Returns a single user by their UUID",
  })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiResponse({
    status: 200,
    description: "User found",
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "User not found" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<UserResponseDto> {
    return this.usersService.findOne(id, organizationId);
  }

  /**
   * PATCH /api/v1/users/:id
   * Updates a user's information.
   */
  @Patch(":id")
  @Roles(UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Update user",
    description:
      "Updates a user's information. Requires SYSTEM_ADMIN role. Users cannot deactivate themselves.",
  })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiResponse({
    status: 200,
    description: "User updated successfully",
    type: UserResponseDto,
  })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - requires SYSTEM_ADMIN role or self-deactivation attempted",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, dto, user.id, organizationId);
  }

  /**
   * DELETE /api/v1/users/:id
   * Deactivates a user (soft delete).
   */
  @Delete(":id")
  @Roles(UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Deactivate user",
    description:
      "Deactivates a user (soft delete). Requires SYSTEM_ADMIN role. Users cannot deactivate themselves.",
  })
  @ApiParam({ name: "id", description: "User UUID" })
  @ApiResponse({ status: 204, description: "User deactivated successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description:
      "Forbidden - requires SYSTEM_ADMIN role or self-deactivation attempted",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async deactivate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<void> {
    return this.usersService.deactivate(id, user.id, organizationId);
  }
}
