import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard, TenantGuard, RolesGuard } from "../../common/guards";
import {
  CurrentUser,
  TenantId,
  Roles,
  UserRole,
} from "../../common/decorators";
import { FaqService } from "./services/faq.service";
import { EscalationService } from "./services/escalation.service";
import {
  CreateFaqDto,
  UpdateFaqDto,
  AssignInquiryDto,
  ResolveInquiryDto,
} from "./dto";
import { FaqStatus } from "./entities/faq-entry.entity";

/**
 * ChatbotController provides REST endpoints for FAQ and inquiry management.
 *
 * FAQ endpoints allow compliance officers to manage curated FAQ entries
 * that take priority over RAG search in the employee chatbot.
 *
 * Inquiry endpoints allow compliance team to manage escalated chatbot
 * inquiries that require human attention.
 *
 * Endpoints:
 * - GET    /api/v1/chatbot/faq              - List FAQ entries
 * - POST   /api/v1/chatbot/faq              - Create FAQ entry
 * - GET    /api/v1/chatbot/faq/:id          - Get FAQ entry
 * - PUT    /api/v1/chatbot/faq/:id          - Update FAQ entry
 * - DELETE /api/v1/chatbot/faq/:id          - Archive FAQ entry
 * - POST   /api/v1/chatbot/faq/:id/helpful  - Mark FAQ as helpful
 *
 * - GET    /api/v1/chatbot/inquiries              - List pending inquiries
 * - GET    /api/v1/chatbot/inquiries/:id          - Get inquiry details
 * - PATCH  /api/v1/chatbot/inquiries/:id/assign   - Assign inquiry
 * - PATCH  /api/v1/chatbot/inquiries/:id/resolve  - Resolve inquiry
 */
@ApiTags("Chatbot")
@ApiBearerAuth("JWT")
@Controller("chatbot")
@UseGuards(JwtAuthGuard, TenantGuard)
export class ChatbotController {
  constructor(
    private readonly faqService: FaqService,
    private readonly escalationService: EscalationService,
  ) {}

  // ==================== FAQ Endpoints ====================

  /**
   * GET /api/v1/chatbot/faq
   * Returns paginated list of FAQ entries with optional filtering.
   */
  @Get("faq")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "List FAQ entries",
    description:
      "Returns paginated FAQ entries with optional status and category filtering",
  })
  @ApiQuery({ name: "status", required: false, enum: FaqStatus })
  @ApiQuery({ name: "category", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiResponse({ status: 200, description: "List of FAQ entries with total" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient role" })
  async listFaq(
    @TenantId() organizationId: string,
    @Query("status") status?: FaqStatus,
    @Query("category") category?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.faqService.findAll(organizationId, {
      status,
      category,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * POST /api/v1/chatbot/faq
   * Creates a new FAQ entry.
   */
  @Post("faq")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create FAQ entry",
    description: "Creates a new FAQ entry for chatbot priority matching",
  })
  @ApiResponse({ status: 201, description: "FAQ entry created" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient role" })
  async createFaq(
    @TenantId() organizationId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateFaqDto,
  ) {
    return this.faqService.create(organizationId, userId, dto);
  }

  /**
   * GET /api/v1/chatbot/faq/:id
   * Returns a single FAQ entry by ID.
   */
  @Get("faq/:id")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Get FAQ entry",
    description: "Returns a single FAQ entry by its ID",
  })
  @ApiParam({ name: "id", description: "FAQ entry ID" })
  @ApiResponse({ status: 200, description: "FAQ entry found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "FAQ entry not found" })
  async getFaq(@TenantId() organizationId: string, @Param("id") id: string) {
    return this.faqService.findById(id, organizationId);
  }

  /**
   * PUT /api/v1/chatbot/faq/:id
   * Updates an existing FAQ entry.
   */
  @Put("faq/:id")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Update FAQ entry",
    description: "Updates an existing FAQ entry",
  })
  @ApiParam({ name: "id", description: "FAQ entry ID" })
  @ApiResponse({ status: 200, description: "FAQ entry updated" })
  @ApiResponse({ status: 400, description: "Validation error" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient role" })
  @ApiResponse({ status: 404, description: "FAQ entry not found" })
  async updateFaq(
    @TenantId() organizationId: string,
    @CurrentUser("id") userId: string,
    @Param("id") id: string,
    @Body() dto: UpdateFaqDto,
  ) {
    return this.faqService.update(id, organizationId, userId, dto);
  }

  /**
   * DELETE /api/v1/chatbot/faq/:id
   * Archives a FAQ entry (soft delete).
   */
  @Delete("faq/:id")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Archive FAQ entry",
    description: "Archives a FAQ entry (soft delete, sets status to ARCHIVED)",
  })
  @ApiParam({ name: "id", description: "FAQ entry ID" })
  @ApiResponse({ status: 200, description: "FAQ entry archived" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient role" })
  async archiveFaq(
    @TenantId() organizationId: string,
    @Param("id") id: string,
  ) {
    await this.faqService.archive(id, organizationId);
    return { success: true };
  }

  /**
   * POST /api/v1/chatbot/faq/:id/helpful
   * Marks a FAQ entry as helpful (increments helpful count).
   */
  @Post("faq/:id/helpful")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Mark FAQ as helpful",
    description: "Increments the helpful count for a FAQ entry",
  })
  @ApiParam({ name: "id", description: "FAQ entry ID" })
  @ApiResponse({ status: 200, description: "FAQ marked as helpful" })
  async markFaqHelpful(
    @TenantId() organizationId: string,
    @Param("id") id: string,
  ) {
    await this.faqService.markHelpful(id, organizationId);
    return { success: true };
  }

  // ==================== Inquiry Endpoints ====================

  /**
   * GET /api/v1/chatbot/inquiries
   * Returns pending inquiries for compliance team queue.
   */
  @Get("inquiries")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "List pending inquiries",
    description:
      "Returns escalated chatbot inquiries awaiting compliance team response",
  })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "offset", required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: "List of inquiries with total count",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient role" })
  async listInquiries(
    @TenantId() organizationId: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
  ) {
    return this.escalationService.getPendingInquiries(organizationId, {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * GET /api/v1/chatbot/inquiries/:id
   * Returns a single inquiry by ID.
   */
  @Get("inquiries/:id")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Get inquiry details",
    description: "Returns details of a specific escalated inquiry",
  })
  @ApiParam({ name: "id", description: "Inquiry ID" })
  @ApiResponse({ status: 200, description: "Inquiry found" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Inquiry not found" })
  async getInquiry(
    @TenantId() organizationId: string,
    @Param("id") id: string,
  ) {
    return this.escalationService.getInquiry(id, organizationId);
  }

  /**
   * PATCH /api/v1/chatbot/inquiries/:id/assign
   * Assigns an inquiry to a compliance team member.
   */
  @Patch("inquiries/:id/assign")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Assign inquiry",
    description: "Assigns an escalated inquiry to a compliance team member",
  })
  @ApiParam({ name: "id", description: "Inquiry ID" })
  @ApiResponse({ status: 200, description: "Inquiry assigned" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient role" })
  @ApiResponse({ status: 404, description: "Inquiry not found" })
  async assignInquiry(
    @TenantId() organizationId: string,
    @Param("id") id: string,
    @Body() dto: AssignInquiryDto,
  ) {
    return this.escalationService.assignInquiry(
      id,
      organizationId,
      dto.assigneeId,
    );
  }

  /**
   * PATCH /api/v1/chatbot/inquiries/:id/resolve
   * Resolves an inquiry with compliance team response.
   */
  @Patch("inquiries/:id/resolve")
  @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: "Resolve inquiry",
    description: "Resolves an escalated inquiry with compliance team response",
  })
  @ApiParam({ name: "id", description: "Inquiry ID" })
  @ApiResponse({ status: 200, description: "Inquiry resolved" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - insufficient role" })
  @ApiResponse({ status: 404, description: "Inquiry not found" })
  async resolveInquiry(
    @TenantId() organizationId: string,
    @Param("id") id: string,
    @Body() dto: ResolveInquiryDto,
  ) {
    return this.escalationService.resolveInquiry(
      id,
      organizationId,
      dto.resolution,
    );
  }
}
