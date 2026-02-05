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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { AttestationCampaignService } from "./attestation-campaign.service";
import { AttestationResponseService } from "./attestation-response.service";
import {
  CreateAttestationCampaignDto,
  SubmitAttestationDto,
} from "./dto/attestation.dto";

// TODO: Add guards when auth module is integrated
// import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../../auth/guards/roles.guard';
// import { Roles } from '../../auth/decorators/roles.decorator';
// import { CurrentUser } from '../../auth/decorators/current-user.decorator';
// import { TenantId } from '../../auth/decorators/tenant-id.decorator';
// import { Role } from '@prisma/client';

// Temporary hardcoded values for development
const TEMP_ORG_ID = "00000000-0000-0000-0000-000000000001";
const TEMP_USER_ID = "00000000-0000-0000-0000-000000000001";
const TEMP_EMPLOYEE_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Controller for attestation-specific campaign operations.
 *
 * Handles:
 * - Creating attestation campaigns from policies
 * - Submitting attestation responses
 * - Viewing pending and completed attestations
 */
@ApiTags("attestations")
@Controller("attestations")
// @UseGuards(JwtAuthGuard, RolesGuard)
export class AttestationController {
  constructor(
    private readonly attestationCampaignService: AttestationCampaignService,
    private readonly attestationResponseService: AttestationResponseService,
  ) {}

  // ==================== Campaign Management ====================

  @Post("campaigns")
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
  // @Roles(Role.SYSTEM_ADMIN, Role.COMPLIANCE_OFFICER)
  async createAttestationCampaign(
    @Body() dto: CreateAttestationCampaignDto,
    // @CurrentUser('id') userId: string,
    // @TenantId() organizationId: string,
  ) {
    return this.attestationCampaignService.createFromPolicy(
      dto,
      TEMP_USER_ID,
      TEMP_ORG_ID,
    );
  }

  @Get("campaigns/policy/:policyId")
  @ApiOperation({ summary: "Get all attestation campaigns for a policy" })
  @ApiParam({ name: "policyId", description: "Policy ID" })
  @ApiResponse({
    status: 200,
    description: "Returns list of attestation campaigns with statistics",
  })
  // @Roles(Role.SYSTEM_ADMIN, Role.COMPLIANCE_OFFICER, Role.POLICY_AUTHOR)
  async getPolicyCampaigns(
    @Param("policyId", ParseUUIDPipe) policyId: string,
    // @TenantId() organizationId: string,
  ) {
    return this.attestationCampaignService.getPolicyCampaigns(
      policyId,
      TEMP_ORG_ID,
    );
  }

  @Get("campaigns/:campaignId")
  @ApiOperation({ summary: "Get attestation campaign details" })
  @ApiParam({ name: "campaignId", description: "Campaign ID" })
  @ApiResponse({
    status: 200,
    description: "Returns campaign details with policy information",
  })
  // @Roles(Role.SYSTEM_ADMIN, Role.COMPLIANCE_OFFICER, Role.POLICY_AUTHOR)
  async getCampaignById(
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    // @TenantId() organizationId: string,
  ) {
    return this.attestationCampaignService.getCampaignById(
      campaignId,
      TEMP_ORG_ID,
    );
  }

  @Get("campaigns/:campaignId/statistics")
  @ApiOperation({ summary: "Get attestation campaign statistics" })
  @ApiParam({ name: "campaignId", description: "Campaign ID" })
  @ApiResponse({
    status: 200,
    description: "Returns completion and refusal statistics",
  })
  // @Roles(Role.SYSTEM_ADMIN, Role.COMPLIANCE_OFFICER, Role.POLICY_AUTHOR)
  async getCampaignStatistics(
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    // @TenantId() organizationId: string,
  ) {
    return this.attestationCampaignService.getCampaignStatistics(
      campaignId,
      TEMP_ORG_ID,
    );
  }

  @Post("campaigns/:campaignId/launch")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Launch an attestation campaign" })
  @ApiParam({ name: "campaignId", description: "Campaign ID" })
  @ApiResponse({
    status: 200,
    description: "Campaign launched and assignments created",
  })
  // @Roles(Role.SYSTEM_ADMIN, Role.COMPLIANCE_OFFICER)
  async launchCampaign(
    @Param("campaignId", ParseUUIDPipe) campaignId: string,
    // @CurrentUser('id') userId: string,
    // @TenantId() organizationId: string,
  ) {
    return this.attestationCampaignService.launchCampaign(
      campaignId,
      TEMP_USER_ID,
      TEMP_ORG_ID,
    );
  }

  // ==================== Attestation Submission ====================

  @Post("submit")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Submit an attestation response" })
  @ApiResponse({
    status: 200,
    description: "Attestation submitted successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Invalid submission (quiz failed, already completed)",
  })
  @ApiResponse({ status: 403, description: "Assignment does not belong to user" })
  @ApiResponse({ status: 404, description: "Assignment not found" })
  // Any authenticated user can submit their own attestations
  async submitAttestation(
    @Body() dto: SubmitAttestationDto,
    // @CurrentUser('employeeId') employeeId: string,
    // @CurrentUser('id') userId: string,
    // @TenantId() organizationId: string,
  ) {
    return this.attestationResponseService.submitAttestation(
      dto,
      TEMP_EMPLOYEE_ID,
      TEMP_ORG_ID,
      TEMP_USER_ID,
    );
  }

  // ==================== Employee-Facing Endpoints ====================

  @Get("my-pending")
  @ApiOperation({ summary: "Get current user's pending attestations" })
  @ApiResponse({
    status: 200,
    description: "Returns list of pending attestation assignments",
  })
  // Any authenticated user can view their pending attestations
  async getMyPendingAttestations(
    // @CurrentUser('employeeId') employeeId: string,
    // @TenantId() organizationId: string,
  ) {
    return this.attestationResponseService.getPendingAttestations(
      TEMP_EMPLOYEE_ID,
      TEMP_ORG_ID,
    );
  }

  @Get("my-history")
  @ApiOperation({ summary: "Get current user's attestation history" })
  @ApiQuery({ name: "skip", required: false, type: Number })
  @ApiQuery({ name: "take", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "Returns list of completed attestation assignments",
  })
  // Any authenticated user can view their attestation history
  async getMyAttestationHistory(
    @Query("skip") skip?: string,
    @Query("take") take?: string,
    // @CurrentUser('employeeId') employeeId: string,
    // @TenantId() organizationId: string,
  ) {
    return this.attestationResponseService.getAttestationHistory(
      TEMP_EMPLOYEE_ID,
      TEMP_ORG_ID,
      {
        skip: skip ? parseInt(skip, 10) : undefined,
        take: take ? parseInt(take, 10) : undefined,
      },
    );
  }

  @Get("assignment/:assignmentId")
  @ApiOperation({ summary: "Get assignment details for attestation UI" })
  @ApiParam({ name: "assignmentId", description: "Assignment ID" })
  @ApiResponse({
    status: 200,
    description: "Returns assignment with policy content and campaign config",
  })
  @ApiResponse({ status: 403, description: "Assignment does not belong to user" })
  @ApiResponse({ status: 404, description: "Assignment not found" })
  // Any authenticated user can view their own assignment
  async getAssignmentForAttestation(
    @Param("assignmentId", ParseUUIDPipe) assignmentId: string,
    // @CurrentUser('employeeId') employeeId: string,
    // @TenantId() organizationId: string,
  ) {
    return this.attestationResponseService.getAssignmentForAttestation(
      assignmentId,
      TEMP_EMPLOYEE_ID,
      TEMP_ORG_ID,
    );
  }
}
