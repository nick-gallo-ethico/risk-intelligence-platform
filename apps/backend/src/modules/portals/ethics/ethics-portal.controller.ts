/**
 * EthicsPortalController - Public Endpoints for Report Submission
 *
 * Provides PUBLIC endpoints for the Ethics Portal:
 * - No authentication required (access code IS the authorization for status/messaging)
 * - Rate limiting applied per endpoint
 * - Tenant isolation via slug parameter
 *
 * All endpoints are marked with @Public() to bypass JWT auth guard.
 *
 * Routes:
 * - GET  /api/v1/public/ethics/:tenantSlug/config     - Get portal configuration
 * - GET  /api/v1/public/ethics/:tenantSlug/categories - Get category tree
 * - GET  /api/v1/public/ethics/:tenantSlug/categories/:categoryId/form - Get form schema
 * - POST /api/v1/public/ethics/:tenantSlug/reports    - Submit report
 * - POST /api/v1/public/ethics/:tenantSlug/attachments - Upload attachment
 * - POST /api/v1/public/ethics/:tenantSlug/draft      - Save draft
 * - GET  /api/v1/public/ethics/:tenantSlug/draft/:draftCode - Get draft
 *
 * Access Code Endpoints:
 * - GET  /api/v1/public/access/:code/status   - Check report status
 * - GET  /api/v1/public/access/:code/messages - Get messages
 * - POST /api/v1/public/access/:code/messages - Send message
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { Throttle } from "@nestjs/throttler";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
  ApiQuery,
} from "@nestjs/swagger";
import { Public } from "../../../common/guards/jwt-auth.guard";
import { EthicsPortalService } from "./ethics-portal.service";
import {
  SubmitReportDto,
  SaveDraftDto,
  SendMessageDto,
  TenantSlugParamDto,
  CategoryIdParamDto,
  AccessCodeParamDto,
  DraftCodeParamDto,
  AttachmentUploadDto,
} from "./dto";
import {
  SubmissionResult,
  CategoryInfo,
  TenantEthicsConfig,
  AttachmentResult,
  DraftReport,
  ReportStatus,
  Message,
} from "./types";

// Maximum file size for attachments (25MB)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

// Allowed file types for attachments
const ALLOWED_FILE_TYPES =
  /^(application\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|vnd\.ms-excel|vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet)|image\/(jpeg|png|gif|webp)|text\/(plain|csv))$/;

/**
 * Public controller for Ethics Portal - tenant-scoped endpoints.
 *
 * Route: /api/v1/public/ethics/:tenantSlug
 */
@ApiTags("Ethics Portal (Public)")
@Controller("public/ethics/:tenantSlug")
@Public()
export class EthicsPortalController {
  constructor(private readonly ethicsPortalService: EthicsPortalService) {}

  /**
   * Get tenant portal configuration.
   *
   * Returns categories, branding, anonymity options, and demographic fields.
   * Cached for 5 minutes.
   *
   * Rate limit: 30/min
   */
  @Get("config")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Get Ethics Portal configuration for tenant" })
  @ApiParam({
    name: "tenantSlug",
    description: "Organization slug",
    example: "acme-corp",
  })
  @ApiResponse({ status: 200, description: "Portal configuration" })
  @ApiResponse({ status: 404, description: "Organization not found" })
  async getConfig(
    @Param() params: TenantSlugParamDto,
  ): Promise<TenantEthicsConfig> {
    return this.ethicsPortalService.getTenantConfig(params.tenantSlug);
  }

  /**
   * Get categories available for report submission.
   *
   * Returns hierarchical category tree with form schema references.
   *
   * Rate limit: 30/min
   */
  @Get("categories")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Get report categories for tenant" })
  @ApiParam({ name: "tenantSlug", description: "Organization slug" })
  @ApiResponse({ status: 200, description: "Category tree" })
  @ApiResponse({ status: 404, description: "Organization not found" })
  async getCategories(
    @Param() params: TenantSlugParamDto,
  ): Promise<CategoryInfo[]> {
    return this.ethicsPortalService.getCategoriesForTenant(params.tenantSlug);
  }

  /**
   * Get form schema for a specific category.
   *
   * Returns JSON Schema and UI Schema for dynamic form rendering.
   *
   * Rate limit: 30/min
   */
  @Get("categories/:categoryId/form")
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: "Get form schema for category" })
  @ApiParam({ name: "tenantSlug", description: "Organization slug" })
  @ApiParam({ name: "categoryId", description: "Category UUID" })
  @ApiResponse({ status: 200, description: "Form schema" })
  @ApiResponse({ status: 404, description: "Category not found" })
  async getFormSchema(
    @Param("tenantSlug") tenantSlug: string,
    @Param() params: CategoryIdParamDto,
  ): Promise<{
    schema: object;
    uiSchema: object | null;
    defaultValues: object | null;
  }> {
    return this.ethicsPortalService.getFormSchema(
      tenantSlug,
      params.categoryId,
    );
  }

  /**
   * Submit a new report via Ethics Portal.
   *
   * Creates an RIU and returns an access code for status checks.
   *
   * Rate limit: 5/min (prevent spam)
   */
  @Post("reports")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Submit a new report" })
  @ApiParam({ name: "tenantSlug", description: "Organization slug" })
  @ApiBody({ type: SubmitReportDto })
  @ApiResponse({ status: 201, description: "Report submitted successfully" })
  @ApiResponse({ status: 400, description: "Invalid report data" })
  @ApiResponse({ status: 404, description: "Organization not found" })
  async submitReport(
    @Param() params: TenantSlugParamDto,
    @Body() dto: SubmitReportDto,
  ): Promise<SubmissionResult> {
    return this.ethicsPortalService.submitReport(params.tenantSlug, dto);
  }

  /**
   * Upload an attachment for later inclusion in a report.
   *
   * Returns a temporary ID to include in report submission.
   * Files expire after 24 hours if not attached to a report.
   *
   * Rate limit: 10/min
   * Max file size: 25MB
   */
  @Post("attachments")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseInterceptors(FileInterceptor("file"))
  @ApiOperation({ summary: "Upload an attachment" })
  @ApiParam({ name: "tenantSlug", description: "Organization slug" })
  @ApiConsumes("multipart/form-data")
  @ApiQuery({ name: "isSensitive", required: false, type: Boolean })
  @ApiResponse({ status: 201, description: "Attachment uploaded" })
  @ApiResponse({ status: 400, description: "Invalid file" })
  async uploadAttachment(
    @Param() params: TenantSlugParamDto,
    @Query("isSensitive") isSensitive: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE }),
          new FileTypeValidator({ fileType: ALLOWED_FILE_TYPES }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<AttachmentResult> {
    return this.ethicsPortalService.uploadAttachment(
      params.tenantSlug,
      file,
      isSensitive === "true",
    );
  }

  /**
   * Save a draft report for later resume.
   *
   * Returns a draft code that can be used to retrieve the draft.
   * Drafts expire after 24 hours.
   *
   * Rate limit: 10/min
   */
  @Post("draft")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Save report draft" })
  @ApiParam({ name: "tenantSlug", description: "Organization slug" })
  @ApiBody({ type: SaveDraftDto })
  @ApiResponse({ status: 201, description: "Draft saved" })
  async saveDraft(
    @Param() params: TenantSlugParamDto,
    @Body() dto: SaveDraftDto,
  ): Promise<{ draftCode: string; expiresAt: Date }> {
    return this.ethicsPortalService.saveDraft(params.tenantSlug, dto);
  }

  /**
   * Retrieve a saved draft for resume.
   *
   * Rate limit: 10/min
   */
  @Get("draft/:draftCode")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Get saved draft" })
  @ApiParam({ name: "tenantSlug", description: "Organization slug" })
  @ApiParam({ name: "draftCode", description: "Draft code" })
  @ApiResponse({ status: 200, description: "Draft data" })
  @ApiResponse({ status: 404, description: "Draft not found or expired" })
  async getDraft(
    @Param("tenantSlug") tenantSlug: string,
    @Param() params: DraftCodeParamDto,
  ): Promise<DraftReport> {
    return this.ethicsPortalService.getDraft(tenantSlug, params.draftCode);
  }
}

/**
 * Public controller for access code operations.
 *
 * Route: /api/v1/public/access/:code
 *
 * These endpoints allow anonymous reporters to check status and communicate
 * using their access code as authorization.
 */
@ApiTags("Ethics Portal - Access Code (Public)")
@Controller("public/access/:code")
@Public()
export class EthicsAccessController {
  constructor(private readonly ethicsPortalService: EthicsPortalService) {}

  /**
   * Check report status by access code.
   *
   * Returns current status, whether case is linked, and unread message count.
   *
   * Rate limit: 10/min (5 failed attempts trigger 15min lockout at rate limiter level)
   */
  @Get("status")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Check report status via access code" })
  @ApiParam({
    name: "code",
    description: "12-character access code",
    example: "A2B3C4D5E6F7",
  })
  @ApiResponse({ status: 200, description: "Report status" })
  @ApiResponse({ status: 404, description: "Invalid access code" })
  async getStatus(@Param() params: AccessCodeParamDto): Promise<ReportStatus> {
    return this.ethicsPortalService.getReportStatus(params.code);
  }

  /**
   * Get messages for a report via access code.
   *
   * Returns all messages in chronological order.
   * Marks unread outbound (from investigator) messages as read.
   *
   * Rate limit: 10/min
   */
  @Get("messages")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: "Get messages via access code" })
  @ApiParam({ name: "code", description: "12-character access code" })
  @ApiResponse({ status: 200, description: "Messages list" })
  @ApiResponse({ status: 404, description: "Invalid access code" })
  async getMessages(
    @Param() params: AccessCodeParamDto,
  ): Promise<{ messages: Message[]; totalCount: number }> {
    const messages = await this.ethicsPortalService.getMessages(params.code);
    return { messages, totalCount: messages.length };
  }

  /**
   * Send a message from reporter via access code.
   *
   * Creates an inbound message on the linked case.
   * Emits event for investigator notification.
   *
   * Rate limit: 5/min
   */
  @Post("messages")
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: "Send message via access code" })
  @ApiParam({ name: "code", description: "12-character access code" })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({ status: 201, description: "Message sent" })
  @ApiResponse({ status: 400, description: "No case linked yet" })
  @ApiResponse({ status: 404, description: "Invalid access code" })
  async sendMessage(
    @Param() params: AccessCodeParamDto,
    @Body() dto: SendMessageDto,
  ): Promise<{ success: boolean }> {
    await this.ethicsPortalService.sendMessage(
      params.code,
      dto.content,
      dto.attachmentIds,
    );
    return { success: true };
  }
}
