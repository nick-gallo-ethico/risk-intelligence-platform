import {
  Controller,
  Get,
  Post,
  Put,
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
import { PolicyCaseAssociation } from "@prisma/client";
import { PolicyCaseAssociationService } from "./policy-case-association.service";
import {
  CreatePolicyCaseAssociationDto,
  UpdatePolicyCaseAssociationDto,
  PolicyCaseQueryDto,
  ViolationStatsQueryDto,
  ViolationStatItem,
} from "./dto/association.dto";
import { JwtAuthGuard, TenantGuard, RolesGuard } from "../../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../../common/decorators";
import { RequestUser } from "../../auth/interfaces/jwt-payload.interface";

/**
 * REST API controller for policy-case associations.
 * Manages links between policies and cases for violation tracking,
 * reference documentation, and governance mapping.
 *
 * All endpoints require authentication and are scoped to user's organization.
 */
@ApiTags("Policy-Case Associations")
@ApiBearerAuth("JWT")
@Controller("policy-case-associations")
@UseGuards(JwtAuthGuard, TenantGuard)
export class PolicyCaseAssociationController {
  constructor(
    private readonly associationService: PolicyCaseAssociationService,
  ) {}

  // =========================================================================
  // CREATE
  // =========================================================================

  /**
   * POST /api/v1/policy-case-associations
   * Creates a policy-to-case association.
   */
  @Post()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create policy-case link",
    description:
      "Links a policy (specific version) to a case for violation tracking, reference, or governance. " +
      "Requires read access to the policy and update access to the case.",
  })
  @ApiResponse({ status: 201, description: "Association created successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - insufficient permissions",
  })
  @ApiResponse({ status: 404, description: "Policy or case not found" })
  @ApiResponse({
    status: 409,
    description: "Policy already linked to this case",
  })
  async create(
    @Body() dto: CreatePolicyCaseAssociationDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<PolicyCaseAssociation> {
    return this.associationService.create(dto, user.id, organizationId);
  }

  // =========================================================================
  // READ
  // =========================================================================

  /**
   * GET /api/v1/policy-case-associations
   * Returns paginated list of associations with optional filtering.
   */
  @Get()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.POLICY_AUTHOR,
    UserRole.POLICY_REVIEWER,
  )
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "List policy-case associations",
    description:
      "Returns paginated list of associations with optional filtering by policy, case, or link type",
  })
  @ApiResponse({
    status: 200,
    description: "List of associations with pagination",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll(
    @Query() query: PolicyCaseQueryDto,
    @TenantId() organizationId: string,
  ): Promise<{ data: PolicyCaseAssociation[]; total: number }> {
    return this.associationService.findAll(query, organizationId);
  }

  /**
   * GET /api/v1/policy-case-associations/:id
   * Returns a single association by ID.
   */
  @Get(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.POLICY_AUTHOR,
    UserRole.POLICY_REVIEWER,
  )
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Get association by ID",
    description:
      "Returns a single policy-case association with full relation details",
  })
  @ApiParam({ name: "id", description: "Association UUID" })
  @ApiResponse({ status: 200, description: "Association found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Association not found" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<PolicyCaseAssociation> {
    return this.associationService.findById(id, organizationId);
  }

  /**
   * GET /api/v1/policy-case-associations/by-policy/:policyId
   * Returns all associations for a specific policy.
   */
  @Get("by-policy/:policyId")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
    UserRole.POLICY_REVIEWER,
  )
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Get associations for a policy",
    description: "Returns all cases linked to a specific policy",
  })
  @ApiParam({ name: "policyId", description: "Policy UUID" })
  @ApiResponse({
    status: 200,
    description: "List of associations for the policy",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Policy not found" })
  async findByPolicy(
    @Param("policyId", ParseUUIDPipe) policyId: string,
    @TenantId() organizationId: string,
  ): Promise<PolicyCaseAssociation[]> {
    return this.associationService.findByPolicy(policyId, organizationId);
  }

  /**
   * GET /api/v1/policy-case-associations/by-case/:caseId
   * Returns all associations for a specific case.
   */
  @Get("by-case/:caseId")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.POLICY_REVIEWER,
  )
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Get associations for a case",
    description:
      "Returns all policies linked to a specific case, ordered by link type (violations first)",
  })
  @ApiParam({ name: "caseId", description: "Case UUID" })
  @ApiResponse({
    status: 200,
    description: "List of associations for the case",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Case not found" })
  async findByCase(
    @Param("caseId", ParseUUIDPipe) caseId: string,
    @TenantId() organizationId: string,
  ): Promise<PolicyCaseAssociation[]> {
    return this.associationService.findByCase(caseId, organizationId);
  }

  // =========================================================================
  // STATISTICS
  // =========================================================================

  /**
   * GET /api/v1/policy-case-associations/violation-stats
   * Returns violation statistics aggregated by policy.
   */
  @Get("violation-stats")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Get violation statistics",
    description:
      "Returns violation counts aggregated by policy. Useful for compliance dashboards to identify frequently violated policies.",
  })
  @ApiResponse({ status: 200, description: "Violation statistics by policy" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({
    status: 403,
    description: "Forbidden - requires admin or compliance role",
  })
  async getViolationStats(
    @Query() query: ViolationStatsQueryDto,
    @TenantId() organizationId: string,
  ): Promise<ViolationStatItem[]> {
    return this.associationService.getViolationStats(organizationId, {
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      policyType: query.policyType,
    });
  }

  // =========================================================================
  // UPDATE
  // =========================================================================

  /**
   * PUT /api/v1/policy-case-associations/:id
   * Updates a policy-case association.
   */
  @Put(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Update policy-case link",
    description:
      "Updates the link type, reason, or violation date of an existing association",
  })
  @ApiParam({ name: "id", description: "Association UUID" })
  @ApiResponse({ status: 200, description: "Association updated successfully" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Association not found" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePolicyCaseAssociationDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<PolicyCaseAssociation> {
    return this.associationService.update(id, dto, user.id, organizationId);
  }

  // =========================================================================
  // DELETE
  // =========================================================================

  /**
   * DELETE /api/v1/policy-case-associations/:id
   * Deletes a policy-case association.
   */
  @Delete(":id")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Delete policy-case link",
    description: "Removes the link between a policy and a case",
  })
  @ApiParam({ name: "id", description: "Association UUID" })
  @ApiResponse({ status: 204, description: "Association deleted successfully" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  @ApiResponse({ status: 404, description: "Association not found" })
  async delete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<void> {
    return this.associationService.delete(id, user.id, organizationId);
  }
}
