import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { InvestigationChecklistService } from "./checklist.service";
import {
  ApplyTemplateDto,
  CompleteItemDto,
  SkipItemDto,
  AddCustomItemDto,
  ChecklistProgressResponse,
} from "./dto/checklist.dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../../common/guards/tenant.guard";
import { RolesGuard } from "../../../common/guards/roles.guard";
import { Roles, UserRole } from "../../../common/decorators/roles.decorator";
import { TenantId } from "../../../common/decorators/tenant-id.decorator";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { RequestUser } from "../../auth/interfaces/jwt-payload.interface";

/**
 * Controller for investigation checklist progress management.
 *
 * Endpoints:
 * - POST /api/v1/investigation-checklists/apply - Apply template to investigation
 * - GET /api/v1/investigation-checklists/by-investigation/:investigationId - Get progress
 * - POST /api/v1/investigation-checklists/:investigationId/items/:itemId/complete - Complete item
 * - POST /api/v1/investigation-checklists/:investigationId/items/:itemId/skip - Skip item
 * - POST /api/v1/investigation-checklists/:investigationId/items/:itemId/uncomplete - Uncomplete item
 * - POST /api/v1/investigation-checklists/:investigationId/custom-items - Add custom item
 * - DELETE /api/v1/investigation-checklists/:investigationId - Delete checklist
 */
@ApiTags("investigation-checklists")
@ApiBearerAuth()
@Controller("investigation-checklists")
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class InvestigationChecklistController {
  constructor(
    private readonly checklistService: InvestigationChecklistService,
  ) {}

  /**
   * Apply a template to an investigation, creating checklist progress.
   */
  @Post("apply")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "Apply a checklist template to an investigation" })
  @ApiResponse({
    status: 201,
    description: "Checklist applied successfully",
  })
  async applyTemplate(
    @Body() dto: ApplyTemplateDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<ChecklistProgressResponse> {
    const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;

    return this.checklistService.applyTemplate(
      organizationId,
      user.id,
      userName,
      dto,
    );
  }

  /**
   * Get checklist progress for an investigation.
   */
  @Get("by-investigation/:investigationId")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "Get checklist progress for an investigation" })
  @ApiParam({ name: "investigationId", description: "Investigation UUID" })
  @ApiResponse({
    status: 200,
    description: "Checklist progress retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Checklist not found" })
  async getProgress(
    @Param("investigationId", ParseUUIDPipe) investigationId: string,
    @TenantId() organizationId: string,
  ): Promise<ChecklistProgressResponse> {
    const progress = await this.checklistService.getProgress(
      organizationId,
      investigationId,
    );

    if (!progress) {
      throw new NotFoundException("Checklist not found for this investigation");
    }

    return progress;
  }

  /**
   * Complete a checklist item with optional notes and attachments.
   */
  @Post(":investigationId/items/:itemId/complete")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "Mark a checklist item as complete" })
  @ApiParam({ name: "investigationId", description: "Investigation UUID" })
  @ApiParam({ name: "itemId", description: "Checklist item ID" })
  @ApiResponse({
    status: 200,
    description: "Item completed successfully",
  })
  async completeItem(
    @Param("investigationId", ParseUUIDPipe) investigationId: string,
    @Param("itemId") itemId: string,
    @Body() dto: CompleteItemDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<ChecklistProgressResponse> {
    const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;

    return this.checklistService.completeItem(
      organizationId,
      investigationId,
      itemId,
      user.id,
      userName,
      dto,
    );
  }

  /**
   * Skip a checklist item with a reason (mark as N/A).
   */
  @Post(":investigationId/items/:itemId/skip")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "Skip a checklist item with reason" })
  @ApiParam({ name: "investigationId", description: "Investigation UUID" })
  @ApiParam({ name: "itemId", description: "Checklist item ID" })
  @ApiResponse({
    status: 200,
    description: "Item skipped successfully",
  })
  async skipItem(
    @Param("investigationId", ParseUUIDPipe) investigationId: string,
    @Param("itemId") itemId: string,
    @Body() dto: SkipItemDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<ChecklistProgressResponse> {
    const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;

    return this.checklistService.skipItem(
      organizationId,
      investigationId,
      itemId,
      user.id,
      userName,
      dto,
    );
  }

  /**
   * Uncomplete a checklist item (revert completion status).
   */
  @Post(":investigationId/items/:itemId/uncomplete")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "Revert a completed checklist item" })
  @ApiParam({ name: "investigationId", description: "Investigation UUID" })
  @ApiParam({ name: "itemId", description: "Checklist item ID" })
  @ApiResponse({
    status: 200,
    description: "Item uncompleted successfully",
  })
  async uncompleteItem(
    @Param("investigationId", ParseUUIDPipe) investigationId: string,
    @Param("itemId") itemId: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<ChecklistProgressResponse> {
    return this.checklistService.uncompleteItem(
      organizationId,
      investigationId,
      itemId,
      user.id,
    );
  }

  /**
   * Add a custom item to a section.
   */
  @Post(":investigationId/custom-items")
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
    UserRole.TRIAGE_LEAD,
  )
  @ApiOperation({ summary: "Add a custom checklist item" })
  @ApiParam({ name: "investigationId", description: "Investigation UUID" })
  @ApiResponse({
    status: 201,
    description: "Custom item added successfully",
  })
  async addCustomItem(
    @Param("investigationId", ParseUUIDPipe) investigationId: string,
    @Body() dto: AddCustomItemDto,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<ChecklistProgressResponse> {
    const userName = `${user.firstName} ${user.lastName}`.trim() || user.email;

    return this.checklistService.addCustomItem(
      organizationId,
      investigationId,
      user.id,
      userName,
      dto,
    );
  }

  /**
   * Delete checklist progress for an investigation.
   */
  @Delete(":investigationId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: "Delete checklist for an investigation" })
  @ApiParam({ name: "investigationId", description: "Investigation UUID" })
  @ApiResponse({
    status: 204,
    description: "Checklist deleted successfully",
  })
  async deleteChecklist(
    @Param("investigationId", ParseUUIDPipe) investigationId: string,
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
  ): Promise<void> {
    await this.checklistService.deleteChecklist(
      organizationId,
      investigationId,
      user.id,
    );
  }
}
