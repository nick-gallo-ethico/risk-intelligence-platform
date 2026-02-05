import {
  Controller,
  Get,
  Post,
  Put,
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
import { Policy, PolicyVersion } from "@prisma/client";
import { PoliciesService } from "./policies.service";
import {
  CreatePolicyDto,
  UpdatePolicyDto,
  PublishPolicyDto,
  PolicyQueryDto,
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
 * REST API controller for policy management.
 * All endpoints require authentication and are scoped to user's organization.
 *
 * Supports:
 * - Policy CRUD with draft management
 * - Publishing policies to create immutable versions
 * - Version history retrieval
 * - Role-based access control
 */
@ApiTags("Policies")
@ApiBearerAuth("JWT")
@Controller("policies")
@UseGuards(JwtAuthGuard, TenantGuard)
export class PoliciesController {
  constructor(private readonly policiesService: PoliciesService) {}

  // =========================================================================
  // CREATE
  // =========================================================================

  /**
   * POST /api/v1/policies
   * Creates a new policy in DRAFT status.
   */
  @Post()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.POLICY_AUTHOR)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create a new policy",
    description: "Creates a new policy in DRAFT status with optional initial content",
  })
  @ApiResponse({ status: 201, description: "Policy created successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient permissions" })
  async create(
    @Body() dto: CreatePolicyDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Policy> {
    return this.policiesService.create(dto, user.id, organizationId);
  }

  // =========================================================================
  // READ
  // =========================================================================

  /**
   * GET /api/v1/policies
   * Returns paginated list of policies with optional filtering.
   */
  @Get()
  @ApiOperation({
    summary: "List policies",
    description: "Returns paginated list of policies with optional filtering and search",
  })
  @ApiResponse({ status: 200, description: "List of policies with pagination" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(
    @Query() query: PolicyQueryDto,
    @TenantId() organizationId: string,
  ): Promise<{ data: Policy[]; total: number; page: number; limit: number }> {
    return this.policiesService.findAll(query, organizationId);
  }

  /**
   * GET /api/v1/policies/:id
   * Returns a single policy by ID with latest version.
   */
  @Get(":id")
  @ApiOperation({
    summary: "Get policy by ID",
    description: "Returns a single policy by its UUID, including latest version",
  })
  @ApiParam({ name: "id", description: "Policy UUID" })
  @ApiResponse({ status: 200, description: "Policy found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Policy not found" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<Policy> {
    return this.policiesService.findByIdOrFail(id, organizationId);
  }

  // =========================================================================
  // UPDATE
  // =========================================================================

  /**
   * PUT /api/v1/policies/:id
   * Updates the draft content of a policy.
   */
  @Put(":id")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.POLICY_AUTHOR)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Update policy draft",
    description:
      "Updates the draft content of a policy. Cannot update while pending approval.",
  })
  @ApiParam({ name: "id", description: "Policy UUID" })
  @ApiResponse({ status: 200, description: "Policy updated successfully" })
  @ApiResponse({ status: 400, description: "Validation error or policy pending approval" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Policy not found" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePolicyDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Policy> {
    return this.policiesService.updateDraft(id, dto, user.id, organizationId);
  }

  // =========================================================================
  // PUBLISH
  // =========================================================================

  /**
   * POST /api/v1/policies/:id/publish
   * Publishes the current draft as a new immutable version.
   */
  @Post(":id/publish")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Publish policy",
    description:
      "Publishes the current draft as a new immutable PolicyVersion. Clears the draft after publishing.",
  })
  @ApiParam({ name: "id", description: "Policy UUID" })
  @ApiResponse({ status: 200, description: "Policy published, returns new PolicyVersion" })
  @ApiResponse({ status: 400, description: "No draft content to publish" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Policy not found" })
  async publish(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: PublishPolicyDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<PolicyVersion> {
    return this.policiesService.publish(id, dto, user.id, organizationId);
  }

  // =========================================================================
  // RETIRE
  // =========================================================================

  /**
   * POST /api/v1/policies/:id/retire
   * Retires a policy, marking it as no longer active.
   */
  @Post(":id/retire")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Retire policy",
    description: "Retires a policy, setting status to RETIRED",
  })
  @ApiParam({ name: "id", description: "Policy UUID" })
  @ApiResponse({ status: 200, description: "Policy retired successfully" })
  @ApiResponse({ status: 400, description: "Policy already retired" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Policy not found" })
  async retire(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<Policy> {
    return this.policiesService.retire(id, user.id, organizationId);
  }

  // =========================================================================
  // VERSIONS
  // =========================================================================

  /**
   * GET /api/v1/policies/:id/versions
   * Returns all versions of a policy.
   */
  @Get(":id/versions")
  @ApiOperation({
    summary: "Get policy versions",
    description: "Returns all versions of a policy, ordered by version number descending",
  })
  @ApiParam({ name: "id", description: "Policy UUID" })
  @ApiResponse({ status: 200, description: "List of policy versions" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Policy not found" })
  async getVersions(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<PolicyVersion[]> {
    return this.policiesService.getVersions(id, organizationId);
  }

  /**
   * GET /api/v1/policies/versions/:versionId
   * Returns a specific policy version by ID.
   */
  @Get("versions/:versionId")
  @ApiOperation({
    summary: "Get specific policy version",
    description: "Returns a specific policy version by its UUID",
  })
  @ApiParam({ name: "versionId", description: "Policy Version UUID" })
  @ApiResponse({ status: 200, description: "Policy version found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Policy version not found" })
  async getVersion(
    @Param("versionId", ParseUUIDPipe) versionId: string,
    @TenantId() organizationId: string,
  ): Promise<PolicyVersion> {
    return this.policiesService.getVersion(versionId, organizationId);
  }
}
