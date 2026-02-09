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
} from '@nestjs/common';
import { InvestigationChecklistService } from './checklist.service';
import {
  ApplyTemplateDto,
  CompleteItemDto,
  SkipItemDto,
  AddCustomItemDto,
  ChecklistProgressResponse,
} from './dto/checklist.dto';

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
 *
 * Note: In production, these endpoints should use guards for authentication
 * and organization scoping. For now, organizationId and userId are stubbed.
 */
@Controller('investigation-checklists')
export class InvestigationChecklistController {
  constructor(
    private readonly checklistService: InvestigationChecklistService,
  ) {}

  /**
   * Apply a template to an investigation, creating checklist progress.
   */
  @Post('apply')
  async applyTemplate(
    @Body() dto: ApplyTemplateDto,
  ): Promise<ChecklistProgressResponse> {
    // TODO: Get from auth context when guards are implemented
    const organizationId = 'stub-org-id';
    const userId = 'stub-user-id';
    const userName = 'Stub User';

    return this.checklistService.applyTemplate(
      organizationId,
      userId,
      userName,
      dto,
    );
  }

  /**
   * Get checklist progress for an investigation.
   */
  @Get('by-investigation/:investigationId')
  async getProgress(
    @Param('investigationId', ParseUUIDPipe) investigationId: string,
  ): Promise<ChecklistProgressResponse> {
    // TODO: Get from auth context when guards are implemented
    const organizationId = 'stub-org-id';

    const progress = await this.checklistService.getProgress(
      organizationId,
      investigationId,
    );

    if (!progress) {
      throw new NotFoundException('Checklist not found for this investigation');
    }

    return progress;
  }

  /**
   * Complete a checklist item with optional notes and attachments.
   */
  @Post(':investigationId/items/:itemId/complete')
  async completeItem(
    @Param('investigationId', ParseUUIDPipe) investigationId: string,
    @Param('itemId') itemId: string,
    @Body() dto: CompleteItemDto,
  ): Promise<ChecklistProgressResponse> {
    // TODO: Get from auth context when guards are implemented
    const organizationId = 'stub-org-id';
    const userId = 'stub-user-id';
    const userName = 'Stub User';

    return this.checklistService.completeItem(
      organizationId,
      investigationId,
      itemId,
      userId,
      userName,
      dto,
    );
  }

  /**
   * Skip a checklist item with a reason (mark as N/A).
   */
  @Post(':investigationId/items/:itemId/skip')
  async skipItem(
    @Param('investigationId', ParseUUIDPipe) investigationId: string,
    @Param('itemId') itemId: string,
    @Body() dto: SkipItemDto,
  ): Promise<ChecklistProgressResponse> {
    // TODO: Get from auth context when guards are implemented
    const organizationId = 'stub-org-id';
    const userId = 'stub-user-id';
    const userName = 'Stub User';

    return this.checklistService.skipItem(
      organizationId,
      investigationId,
      itemId,
      userId,
      userName,
      dto,
    );
  }

  /**
   * Uncomplete a checklist item (revert completion status).
   */
  @Post(':investigationId/items/:itemId/uncomplete')
  async uncompleteItem(
    @Param('investigationId', ParseUUIDPipe) investigationId: string,
    @Param('itemId') itemId: string,
  ): Promise<ChecklistProgressResponse> {
    // TODO: Get from auth context when guards are implemented
    const organizationId = 'stub-org-id';
    const userId = 'stub-user-id';

    return this.checklistService.uncompleteItem(
      organizationId,
      investigationId,
      itemId,
      userId,
    );
  }

  /**
   * Add a custom item to a section.
   */
  @Post(':investigationId/custom-items')
  async addCustomItem(
    @Param('investigationId', ParseUUIDPipe) investigationId: string,
    @Body() dto: AddCustomItemDto,
  ): Promise<ChecklistProgressResponse> {
    // TODO: Get from auth context when guards are implemented
    const organizationId = 'stub-org-id';
    const userId = 'stub-user-id';
    const userName = 'Stub User';

    return this.checklistService.addCustomItem(
      organizationId,
      investigationId,
      userId,
      userName,
      dto,
    );
  }

  /**
   * Delete checklist progress for an investigation.
   */
  @Delete(':investigationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChecklist(
    @Param('investigationId', ParseUUIDPipe) investigationId: string,
  ): Promise<void> {
    // TODO: Get from auth context when guards are implemented
    const organizationId = 'stub-org-id';
    const userId = 'stub-user-id';

    await this.checklistService.deleteChecklist(
      organizationId,
      investigationId,
      userId,
    );
  }
}
