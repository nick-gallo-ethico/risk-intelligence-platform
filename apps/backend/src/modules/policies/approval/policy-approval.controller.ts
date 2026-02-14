// =============================================================================
// POLICY APPROVAL CONTROLLER - Endpoints for policy approval workflows
// =============================================================================
//
// This controller exposes endpoints for:
// - Submitting policies for approval
// - Cancelling approval workflows
// - Getting approval status
// - Listing available workflow templates
//
// All endpoints are protected with role-based guards.
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
  ApiBearerAuth,
} from "@nestjs/swagger";
import { PolicyApprovalService } from "./policy-approval.service";
import { SubmitForApprovalDto, CancelApprovalDto } from "./dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../../common/guards/tenant.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles, UserRole } from "../../../common/decorators/roles.decorator";

// TODO: Add proper CurrentUser and TenantId decorators when auth is fully integrated
// For now, using temporary hardcoded values for development
const TEMP_ORG_ID = "00000000-0000-0000-0000-000000000001";
const TEMP_USER_ID = "00000000-0000-0000-0000-000000000001";

@ApiTags("policies")
@ApiBearerAuth()
@Controller("policies")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class PolicyApprovalController {
  constructor(private readonly approvalService: PolicyApprovalService) {}

  // =========================================================================
  // SUBMIT FOR APPROVAL
  // =========================================================================

  /**
   * Submit a policy for approval.
   * Starts a workflow instance for the policy.
   */
  @Post(":id/submit-for-approval")
  @HttpCode(HttpStatus.OK)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({
    summary: "Submit policy for approval",
    description:
      "Submits a DRAFT policy for approval by starting a workflow instance. " +
      "The policy must have draft content to be submitted.",
  })
  @ApiParam({ name: "id", description: "Policy ID", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Policy submitted for approval successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Policy not in DRAFT status or has no content",
  })
  @ApiResponse({
    status: 404,
    description: "Policy not found or no workflow configured",
  })
  async submitForApproval(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SubmitForApprovalDto,
    // @CurrentUser() user: RequestUser,
    // @TenantId() organizationId: string,
  ) {
    return this.approvalService.submitForApproval(
      id,
      dto.workflowTemplateId || null,
      dto.submissionNotes,
      TEMP_USER_ID, // user.id
      TEMP_ORG_ID, // organizationId
    );
  }

  // =========================================================================
  // CANCEL APPROVAL
  // =========================================================================

  /**
   * Cancel an active approval workflow.
   * Returns the policy to DRAFT status.
   */
  @Post(":id/cancel-approval")
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({
    summary: "Cancel approval workflow",
    description:
      "Cancels an active approval workflow for a policy, returning it to DRAFT status.",
  })
  @ApiParam({ name: "id", description: "Policy ID", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Approval workflow cancelled successfully",
  })
  @ApiResponse({ status: 400, description: "No active approval workflow" })
  @ApiResponse({ status: 404, description: "Policy not found" })
  async cancelApproval(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CancelApprovalDto,
    // @CurrentUser() user: RequestUser,
    // @TenantId() organizationId: string,
  ) {
    return this.approvalService.cancelApproval(
      id,
      dto.reason,
      TEMP_USER_ID, // user.id
      TEMP_ORG_ID, // organizationId
    );
  }

  // =========================================================================
  // GET APPROVAL STATUS
  // =========================================================================

  /**
   * Get the approval status for a policy.
   * Returns workflow instance state, current step, and reviewers.
   */
  @Get(":id/approval-status")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
    UserRole.POLICY_REVIEWER,
  )
  @ApiOperation({
    summary: "Get approval status",
    description:
      "Returns the current approval status for a policy, including workflow state, " +
      "current step, and reviewer information.",
  })
  @ApiParam({ name: "id", description: "Policy ID", type: "string" })
  @ApiResponse({
    status: 200,
    description: "Approval status retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Policy not found" })
  async getApprovalStatus(
    @Param("id", ParseUUIDPipe) id: string,
    // @TenantId() organizationId: string,
  ) {
    return this.approvalService.getApprovalStatus(
      id,
      TEMP_ORG_ID, // organizationId
    );
  }

  // =========================================================================
  // GET WORKFLOW TEMPLATES
  // =========================================================================

  /**
   * Get available workflow templates for policy approval.
   * Returns templates that can be used when submitting for approval.
   */
  @Get("workflow-templates")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({
    summary: "Get available workflow templates",
    description:
      "Returns workflow templates available for policy approval workflows.",
  })
  @ApiResponse({
    status: 200,
    description: "Workflow templates retrieved successfully",
  })
  async getWorkflowTemplates() {
    // @TenantId() organizationId: string,
    return this.approvalService.getAvailableWorkflowTemplates(
      TEMP_ORG_ID, // organizationId
    );
  }
}
