import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard, TenantGuard } from '../../common/guards';
import { CurrentUser, TenantId, Roles, UserRole } from '../../common/decorators';
import { DisclosureFormService } from './disclosure-form.service';
import {
  CreateFormTemplateDto,
  UpdateFormTemplateDto,
  PublishFormTemplateDto,
  CloneFormTemplateDto,
  FormTemplateQueryDto,
  FormTemplateResponseDto,
  FormTemplateListItemDto,
  FormTemplateVersionDto,
  FormTemplateTranslationDto,
} from './dto/form-template.dto';

/**
 * Controller for disclosure form template management.
 *
 * Provides REST endpoints for CRUD operations on disclosure form templates,
 * implementing RS.32 (version-on-publish) and RS.33 (translation support).
 *
 * Routes:
 * - POST   /api/v1/disclosure-forms              - Create new template
 * - GET    /api/v1/disclosure-forms              - List templates with filters
 * - GET    /api/v1/disclosure-forms/:id          - Get template by ID
 * - PUT    /api/v1/disclosure-forms/:id          - Update template
 * - DELETE /api/v1/disclosure-forms/:id          - Delete draft template
 * - POST   /api/v1/disclosure-forms/:id/publish  - Publish template
 * - POST   /api/v1/disclosure-forms/:id/clone    - Clone template
 * - POST   /api/v1/disclosure-forms/:id/archive  - Archive template
 * - GET    /api/v1/disclosure-forms/:id/versions - Get version history
 * - GET    /api/v1/disclosure-forms/:id/translations - Get translations
 * - GET    /api/v1/disclosure-forms/published/:name - Get published by name
 */
@Controller('api/v1/disclosure-forms')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class DisclosureFormController {
  constructor(private readonly formService: DisclosureFormService) {}

  /**
   * Create a new disclosure form template.
   * Creates in DRAFT status - must be published to be used in campaigns.
   */
  @Post()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async create(
    @Body() dto: CreateFormTemplateDto,
    @CurrentUser('id') userId: string,
    @TenantId() organizationId: string,
  ): Promise<FormTemplateResponseDto> {
    return this.formService.create(organizationId, dto, userId);
  }

  /**
   * List form templates with optional filters.
   */
  @Get()
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async findMany(
    @Query() query: FormTemplateQueryDto,
    @TenantId() organizationId: string,
  ): Promise<FormTemplateListItemDto[]> {
    return this.formService.findMany(organizationId, query);
  }

  /**
   * Get a form template by ID.
   */
  @Get(':id')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<FormTemplateResponseDto> {
    return this.formService.findById(organizationId, id);
  }

  /**
   * Update a form template (DRAFT only).
   */
  @Put(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormTemplateDto,
    @CurrentUser('id') userId: string,
    @TenantId() organizationId: string,
  ): Promise<FormTemplateResponseDto> {
    return this.formService.update(organizationId, id, dto, userId);
  }

  /**
   * Delete a draft form template.
   */
  @Delete(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<void> {
    return this.formService.delete(organizationId, id);
  }

  /**
   * Publish a form template (RS.32: version-on-publish).
   * If the template has existing submissions, creates a new version.
   */
  @Post(':id/publish')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PublishFormTemplateDto,
    @CurrentUser('id') userId: string,
    @TenantId() organizationId: string,
  ): Promise<{ id: string; version: number }> {
    return this.formService.publish(organizationId, id, dto, userId);
  }

  /**
   * Clone a form template (RS.33: supports translation creation).
   */
  @Post(':id/clone')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async clone(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloneFormTemplateDto,
    @CurrentUser('id') userId: string,
    @TenantId() organizationId: string,
  ): Promise<FormTemplateResponseDto> {
    return this.formService.clone(organizationId, id, dto, userId);
  }

  /**
   * Archive a form template.
   * Checks for active campaigns before allowing archive.
   */
  @Post(':id/archive')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @TenantId() organizationId: string,
  ): Promise<void> {
    return this.formService.archive(organizationId, id, userId);
  }

  /**
   * Get version history for a form template.
   */
  @Get(':id/versions')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async getVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<FormTemplateVersionDto[]> {
    return this.formService.getVersions(organizationId, id);
  }

  /**
   * Get translations for a form template.
   */
  @Get(':id/translations')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async getTranslations(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ): Promise<FormTemplateTranslationDto[]> {
    return this.formService.getTranslations(organizationId, id);
  }

  /**
   * Get the latest published version of a template by name.
   * Useful for campaign creation to fetch the current published form.
   */
  @Get('published/:name')
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async getPublishedTemplate(
    @Param('name') name: string,
    @Query('language') language: string | undefined,
    @TenantId() organizationId: string,
  ): Promise<FormTemplateResponseDto> {
    return this.formService.getPublishedTemplate(organizationId, name, language);
  }
}
