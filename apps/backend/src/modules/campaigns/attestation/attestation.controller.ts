import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AttestationCampaignService } from "./attestation-campaign.service";
import { AttestationResponseService } from "./attestation-response.service";
import {
  CreateAttestationCampaignDto,
  SubmitAttestationDto,
} from "./dto/attestation.dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../../common/guards/tenant.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles, UserRole } from "../../../common/decorators/roles.decorator";
import { TenantId } from "../../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequestUser } from "../../auth/interfaces/jwt-payload.interface";

/**
 * Controller for attestation-specific campaign operations.
 *
 * Handles:
 * - Creating attestation campaigns from policies
 * - Submitting attestation responses
 * - Viewing pending and completed attestations
 */
@ApiTags("attestations")
@ApiBearerAuth()
@Controller("attestations")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class AttestationController {
  constructor(
    private readonly attestationCampaignService: AttestationCampaignService,
    private readonly attestationResponseService: AttestationResponseService,
  ) {}

  // ==================== Campaign Management ====================

  @Post("campaigns")
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Create an attestation campaign from a policy" })
  @ApiResponse({
    status: 201,
    description: "Attestation campaign created successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid request (policy not published, missing quiz config)",
  })
  @ApiResponse({ status: 404, description: "Policy version not found" })
  async createAttestationCampaign(
    @Body() dto: CreateAttestationCampaignDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.attestationCampaignService.createFromPolicy(
      dto,
      user.id,
      organizationId,
    );
  }

  @Get("campaigns/policy/:policyId")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({ summary: "Get all attestation campaigns for a policy" })
  @ApiParam({ name: "policyId", description: "Policy ID" })
  @ApiResponse({
    status: 200,
    description: "Returns list of attestation campaigns with statistics",
  })
  async getPolicyCampaigns(
    @Param("policyId", ParseUUIDPipe) policyId: string,
    @TenantId() organizationId: string,
  ) {
    return this.attestationCampaignService.getPolicyCampaigns(
      policyId,
      organizationId,
    );
  }

  @Get("campaigns/:campaignId")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({ summary: "Get attestation campaign details" })
  @ApiParam({ name: "campaignId", description: "Campaign ID" })
  @ApiResponse({
    status: 200,
    description: "Returns campaign details with policy information",
  })
  async getCampaignById(
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    @TenantId() organizationId: string,
  ) {
    return this.attestationCampaignService.getCampaignById(
      campaignId,
      organizationId,
    );
  }

  @Get("campaigns/:campaignId/statistics")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({ summary: "Get attestation campaign statistics" })
  @ApiParam({ name: "campaignId", description: "Campaign ID" })
  @ApiResponse({
    status: 200,
    description: "Returns completion and refusal statistics",
  })
  async getCampaignStatistics(
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    @TenantId() organizationId: string,
  ) {
    return this.attestationCampaignService.getCampaignStatistics(
      campaignId,
      organizationId,
    );
  }

  @Post("campaigns/:campaignId/launch")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Launch an attestation campaign" })
  @ApiParam({ name: "campaignId", description: "Campaign ID" })
  @ApiResponse({
    status: 200,
    description: "Campaign launched and assignments created",
  })
  async launchCampaign(
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    return this.attestationCampaignService.launchCampaign(
      campaignId,
      user.id,
      organizationId,
    );
  }

  // ==================== Attestation Submission ====================

  @Post("submit")
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.MANAGER,
    UserRole.DEPARTMENT_ADMIN,
    UserRole.INVESTIGATOR,
    UserRole.TRIAGE_LEAD,
    UserRole.POLICY_AUTHOR,
    UserRole.POLICY_REVIEWER,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.SYSTEM_ADMIN,
  )
  @ApiOperation({ summary: "Submit an attestation response" })
  @ApiResponse({
    status: 200,
    description: "Attestation submitted successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid submission (quiz failed, already completed)",
  })
  @ApiResponse({
    status: 403,
    description: "Assignment does not belong to user",
  })
  @ApiResponse({ status: 404, description: "Assignment not found" })
  async submitAttestation(
    @Body() dto: SubmitAttestationDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    // Note: employeeId would need to be retrieved from user context or database lookup
    // For now, we pass user.id as the actor and let the service handle employee lookup
    return this.attestationResponseService.submitAttestation(
      dto,
      user.id, // Using user.id - service should look up associated employeeId
      organizationId,
      user.id,
    );
  }

  // ==================== Employee-Facing Endpoints ====================

  @Get("my-pending")
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.MANAGER,
    UserRole.DEPARTMENT_ADMIN,
    UserRole.INVESTIGATOR,
    UserRole.TRIAGE_LEAD,
    UserRole.POLICY_AUTHOR,
    UserRole.POLICY_REVIEWER,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.SYSTEM_ADMIN,
  )
  @ApiOperation({ summary: "Get current user's pending attestations" })
  @ApiResponse({
    status: 200,
    description: "Returns list of pending attestation assignments",
  })
  async getMyPendingAttestations(
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    // Note: employeeId would need to be retrieved from user context or database lookup
    return this.attestationResponseService.getPendingAttestations(
      user.id, // Using user.id - service should look up associated employeeId
      organizationId,
    );
  }

  @Get("my-history")
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.MANAGER,
    UserRole.DEPARTMENT_ADMIN,
    UserRole.INVESTIGATOR,
    UserRole.TRIAGE_LEAD,
    UserRole.POLICY_AUTHOR,
    UserRole.POLICY_REVIEWER,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.SYSTEM_ADMIN,
  )
  @ApiOperation({ summary: "Get current user's attestation history" })
  @ApiQuery({ name: "skip", required: false, type: Number })
  @ApiQuery({ name: "take", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Returns list of completed attestation assignments",
  })
  async getMyAttestationHistory(
    @Query("skip") skip: string | undefined,
    @Query("take") take: string | undefined,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    // Note: employeeId would need to be retrieved from user context or database lookup
    return this.attestationResponseService.getAttestationHistory(
      user.id, // Using user.id - service should look up associated employeeId
      organizationId,
      {
        skip: skip ? parseInt(skip, 10) : undefined,
        take: take ? parseInt(take, 10) : undefined,
      },
    );
  }

  @Get("assignment/:assignmentId")
  @Roles(
    UserRole.EMPLOYEE,
    UserRole.MANAGER,
    UserRole.DEPARTMENT_ADMIN,
    UserRole.INVESTIGATOR,
    UserRole.TRIAGE_LEAD,
    UserRole.POLICY_AUTHOR,
    UserRole.POLICY_REVIEWER,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.SYSTEM_ADMIN,
  )
  @ApiOperation({ summary: "Get assignment details for attestation UI" })
  @ApiParam({ name: "assignmentId", description: "Assignment ID" })
  @ApiResponse({
    status: 200,
    description: "Returns assignment with policy content and campaign config",
  })
  @ApiResponse({
    status: 403,
    description: "Assignment does not belong to user",
  })
  @ApiResponse({ status: 404, description: "Assignment not found" })
  async getAssignmentForAttestation(
    @Param("assignmentId", ParseUUIDPipe) assignmentId: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ) {
    // Note: employeeId would need to be retrieved from user context or database lookup
    return this.attestationResponseService.getAssignmentForAttestation(
      assignmentId,
      user.id, // Using user.id - service should look up associated employeeId
      organizationId,
    );
  }
}
