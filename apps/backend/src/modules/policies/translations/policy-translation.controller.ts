// =============================================================================
// POLICY TRANSLATION CONTROLLER - REST API for translation management
// =============================================================================
//
// Endpoints:
// - POST /policies/versions/:versionId/translations - Create translation
// - GET /policies/versions/:versionId/translations - Get translations for version
// - PUT /policies/translations/:id - Update translation content
// - POST /policies/translations/:id/review - Review translation
// - POST /policies/translations/:id/refresh - Re-translate stale translation
// - GET /policies/translations/stale - Get all stale translations
// - GET /policies/translations/languages - Get available languages
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard, TenantGuard, RolesGuard } from "../../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../../common/decorators";
import { PolicyTranslationService } from "./policy-translation.service";
import {
  CreateTranslationDto,
  UpdateTranslationDto,
  ReviewTranslationDto,
} from "./dto";

/**
 * Controller for policy translation management.
 * Provides endpoints for creating, updating, reviewing, and refreshing translations.
 */
@Controller("policies")
@UseGuards(JwtAuthGuard, TenantGuard)
@ApiBearerAuth("JWT")
@ApiTags("Policies")
export class PolicyTranslationController {
  constructor(
    private readonly policyTranslationService: PolicyTranslationService,
  ) {}

  // =========================================================================
  // CREATE TRANSLATION
  // =========================================================================

  /**
   * Create a translation for a policy version.
   * Uses AI translation by default, or accepts manual content.
   */
  @Post("versions/:versionId/translations")
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({
    summary: "Create translation for policy version",
    description:
      "Creates a new translation using AI (default) or manual content. " +
      "Set useAI: false and provide content/title for manual translation.",
  })
  @ApiParam({
    name: "versionId",
    description: "Policy version ID to translate",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({ status: 201, description: "Translation created successfully" })
  @ApiResponse({
    status: 400,
    description: "Invalid input or AI translation failed",
  })
  @ApiResponse({ status: 404, description: "Policy version not found" })
  @ApiResponse({
    status: 409,
    description: "Translation already exists for language",
  })
  async createTranslation(
    @Param("versionId", ParseUUIDPipe) versionId: string,
    @Body() dto: CreateTranslationDto,
    @CurrentUser("id") userId: string,
    @TenantId() organizationId: string,
  ) {
    // Override policyVersionId from URL param
    dto.policyVersionId = versionId;
    return this.policyTranslationService.translate(dto, userId, organizationId);
  }

  // =========================================================================
  // GET TRANSLATIONS BY VERSION
  // =========================================================================

  /**
   * Get all translations for a policy version.
   */
  @Get("versions/:versionId/translations")
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
    UserRole.POLICY_REVIEWER,
    UserRole.EMPLOYEE,
  )
  @ApiOperation({
    summary: "Get translations for policy version",
    description: "Returns all translations for the specified policy version.",
  })
  @ApiParam({
    name: "versionId",
    description: "Policy version ID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({ status: 200, description: "List of translations" })
  async getVersionTranslations(
    @Param("versionId", ParseUUIDPipe) versionId: string,
    @TenantId() organizationId: string,
  ) {
    return this.policyTranslationService.findByVersion(
      versionId,
      organizationId,
    );
  }

  // =========================================================================
  // UPDATE TRANSLATION
  // =========================================================================

  /**
   * Update an existing translation's content.
   * If AI-generated, changes source to HUMAN after edit.
   */
  @Put("translations/:id")
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({
    summary: "Update translation content",
    description:
      "Updates translation content. If previously AI-generated, " +
      "changes source to HUMAN and resets isStale flag.",
  })
  @ApiParam({
    name: "id",
    description: "Translation ID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({ status: 200, description: "Translation updated successfully" })
  @ApiResponse({ status: 404, description: "Translation not found" })
  async updateTranslation(
    @Param("id", ParseUUIDPipe) translationId: string,
    @Body() dto: UpdateTranslationDto,
    @CurrentUser("id") userId: string,
    @TenantId() organizationId: string,
  ) {
    return this.policyTranslationService.updateTranslation(
      translationId,
      dto,
      userId,
      organizationId,
    );
  }

  // =========================================================================
  // REVIEW TRANSLATION
  // =========================================================================

  /**
   * Review a translation, changing its review status.
   */
  @Post("translations/:id/review")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({
    summary: "Review translation",
    description:
      "Updates the review status of a translation. " +
      "Statuses: PENDING_REVIEW, APPROVED, NEEDS_REVISION, PUBLISHED",
  })
  @ApiParam({
    name: "id",
    description: "Translation ID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "Translation reviewed successfully",
  })
  @ApiResponse({ status: 404, description: "Translation not found" })
  async reviewTranslation(
    @Param("id", ParseUUIDPipe) translationId: string,
    @Body() dto: ReviewTranslationDto,
    @CurrentUser("id") userId: string,
    @TenantId() organizationId: string,
  ) {
    return this.policyTranslationService.reviewTranslation(
      translationId,
      dto,
      userId,
      organizationId,
    );
  }

  // =========================================================================
  // REFRESH STALE TRANSLATION
  // =========================================================================

  /**
   * Re-translate a stale translation using AI.
   */
  @Post("translations/:id/refresh")
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
  )
  @ApiOperation({
    summary: "Refresh stale translation",
    description:
      "Re-translates a stale translation using AI. " +
      "Resets review status to PENDING_REVIEW.",
  })
  @ApiParam({
    name: "id",
    description: "Translation ID",
    type: "string",
    format: "uuid",
  })
  @ApiResponse({
    status: 200,
    description: "Translation refreshed successfully",
  })
  @ApiResponse({
    status: 400,
    description: "Translation is not stale or AI failed",
  })
  @ApiResponse({ status: 404, description: "Translation not found" })
  async refreshTranslation(
    @Param("id", ParseUUIDPipe) translationId: string,
    @CurrentUser("id") userId: string,
    @TenantId() organizationId: string,
  ) {
    return this.policyTranslationService.refreshStaleTranslation(
      translationId,
      userId,
      organizationId,
    );
  }

  // =========================================================================
  // GET STALE TRANSLATIONS
  // =========================================================================

  /**
   * Get all stale translations for the organization.
   */
  @Get("translations/stale")
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({
    summary: "Get stale translations",
    description:
      "Returns all translations that are marked as stale " +
      "(source content has been updated since translation).",
  })
  @ApiResponse({ status: 200, description: "List of stale translations" })
  async getStaleTranslations(@TenantId() organizationId: string) {
    return this.policyTranslationService.findStale(organizationId);
  }

  // =========================================================================
  // GET AVAILABLE LANGUAGES
  // =========================================================================

  /**
   * Get list of available languages for translation.
   */
  @Get("translations/languages")
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.POLICY_AUTHOR,
    UserRole.POLICY_REVIEWER,
    UserRole.EMPLOYEE,
  )
  @ApiOperation({
    summary: "Get available languages",
    description: "Returns list of supported languages for translation.",
  })
  @ApiResponse({
    status: 200,
    description: "List of languages with code and name",
    schema: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string", example: "es" },
          name: { type: "string", example: "Spanish" },
        },
      },
    },
  })
  getAvailableLanguages() {
    return this.policyTranslationService.getAvailableLanguages();
  }
}
