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
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { Roles, CurrentUser, UserRole } from '../../../common/decorators';
import { InvestigationTemplateService } from './template.service';
import { TemplateAssignmentService } from './template-assignment.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  TemplateQueryDto,
  ImportTemplateDto,
  DuplicateTemplateDto,
  CreateCategoryMappingDto,
  UpdateCategoryMappingDto,
} from './dto/template.dto';

/**
 * Authenticated user context from JWT.
 */
interface AuthUser {
  id: string;
  organizationId: string;
  role: UserRole;
}

/**
 * InvestigationTemplateController handles REST endpoints for template management.
 *
 * All endpoints require authentication and appropriate role permissions.
 * Templates are organization-scoped via the user's organizationId.
 */
@Controller('investigation-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvestigationTemplateController {
  constructor(
    private readonly templateService: InvestigationTemplateService,
    private readonly assignmentService: TemplateAssignmentService,
  ) {}

  /**
   * Create a new investigation template.
   *
   * @param user - Authenticated user context
   * @param dto - Template creation data
   * @returns Created template
   */
  @Post()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateTemplateDto) {
    return this.templateService.create(user.organizationId, user.id, dto);
  }

  /**
   * List all templates accessible to the user.
   *
   * Filters by tier, category, and pagination.
   * Access control:
   * - OFFICIAL: Visible to all users
   * - TEAM: Visible to team members
   * - PERSONAL: Visible only to creator
   *
   * @param user - Authenticated user context
   * @param query - Filter and pagination parameters
   * @returns Paginated list of templates
   */
  @Get()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  async findAll(@CurrentUser() user: AuthUser, @Query() query: TemplateQueryDto) {
    return this.templateService.findAll(user.organizationId, user.id, query);
  }

  /**
   * Get a single template by ID.
   *
   * @param user - Authenticated user context
   * @param id - Template UUID
   * @returns Template details
   */
  @Get(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  async findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templateService.findById(user.organizationId, id);
  }

  /**
   * Update an existing template.
   *
   * Permission rules:
   * - PERSONAL templates: Only creator can edit
   * - TEAM/OFFICIAL: Require COMPLIANCE_OFFICER or SYSTEM_ADMIN
   *
   * @param user - Authenticated user context
   * @param id - Template UUID
   * @param dto - Update data
   * @returns Updated template
   */
  @Put(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  async update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templateService.update(user.organizationId, id, user.id, dto);
  }

  /**
   * Publish a template, optionally creating a new version.
   *
   * If createNewVersion is true and template has active instances,
   * creates a new version and deactivates the old one.
   *
   * @param user - Authenticated user context
   * @param id - Template UUID
   * @param createNewVersion - Whether to create new version if instances exist
   * @returns Published template (new version if created)
   */
  @Post(':id/publish')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async publish(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('createNewVersion') createNewVersion?: string,
  ) {
    return this.templateService.publish(
      user.organizationId,
      id,
      user.id,
      createNewVersion === 'true',
    );
  }

  /**
   * Archive a template (soft delete).
   *
   * Archived templates remain visible for historical reference
   * but cannot be used for new investigations.
   *
   * @param user - Authenticated user context
   * @param id - Template UUID
   * @returns Archived template
   */
  @Post(':id/archive')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async archive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templateService.archive(user.organizationId, id, user.id);
  }

  /**
   * Unarchive a previously archived template.
   *
   * @param user - Authenticated user context
   * @param id - Template UUID
   * @returns Unarchived template
   */
  @Post(':id/unarchive')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async unarchive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.templateService.unarchive(user.organizationId, id);
  }

  /**
   * Duplicate a template for customization.
   *
   * Creates a copy as PERSONAL tier, allowing the user
   * to customize without affecting the original.
   *
   * @param user - Authenticated user context
   * @param id - Template UUID to duplicate
   * @param dto - Optional new name
   * @returns Duplicated template
   */
  @Post(':id/duplicate')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  async duplicate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DuplicateTemplateDto,
  ) {
    return this.templateService.duplicate(
      user.organizationId,
      id,
      user.id,
      dto.name,
    );
  }

  /**
   * Export a template to JSON for sharing.
   *
   * Removes organization-specific data so the template
   * can be imported into another organization.
   *
   * @param user - Authenticated user context
   * @param id - Template UUID
   * @returns JSON string wrapped in { template: ... }
   */
  @Get(':id/export')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async exportTemplate(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const json = await this.templateService.exportTemplate(
      user.organizationId,
      id,
    );
    return { template: json };
  }

  /**
   * Import a template from JSON.
   *
   * Regenerates all section/item IDs to avoid conflicts.
   * Can import as OFFICIAL (admin) or PERSONAL (default).
   *
   * @param user - Authenticated user context
   * @param dto - Import parameters including JSON string
   * @returns Imported template
   */
  @Post('import')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async importTemplate(
    @CurrentUser() user: AuthUser,
    @Body() dto: ImportTemplateDto,
  ) {
    return this.templateService.importTemplate(
      user.organizationId,
      user.id,
      dto.templateJson,
      dto.importAsOfficial,
    );
  }

  // ===========================================
  // Category-Template Mapping Endpoints
  // ===========================================

  /**
   * Create a category-to-template mapping.
   *
   * Links a category to a template with a requirement level.
   * Multiple templates can be mapped to a single category with priority ordering.
   *
   * @param user - Authenticated user context
   * @param dto - Mapping data including categoryId, templateId, requirement
   * @returns Created mapping with category and template details
   */
  @Post('mappings')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async createMapping(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCategoryMappingDto,
  ) {
    return this.assignmentService.createMapping(
      user.organizationId,
      user.id,
      dto,
    );
  }

  /**
   * Get all category-template mappings.
   *
   * Returns all active mappings in the organization.
   *
   * @param user - Authenticated user context
   * @returns Array of mappings with category and template details
   */
  @Get('mappings')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  async findAllMappings(@CurrentUser() user: AuthUser) {
    return this.assignmentService.findAllMappings(user.organizationId);
  }

  /**
   * Get mappings for a specific category.
   *
   * @param user - Authenticated user context
   * @param categoryId - Category UUID
   * @returns Array of mappings for the category
   */
  @Get('mappings/by-category/:categoryId')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  async findMappingsByCategory(
    @CurrentUser() user: AuthUser,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
  ) {
    return this.assignmentService.findMappingsByCategory(
      user.organizationId,
      categoryId,
    );
  }

  /**
   * Get mappings for a specific template.
   *
   * @param user - Authenticated user context
   * @param templateId - Template UUID
   * @returns Array of categories mapped to this template
   */
  @Get('mappings/by-template/:templateId')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async findMappingsByTemplate(
    @CurrentUser() user: AuthUser,
    @Param('templateId', ParseUUIDPipe) templateId: string,
  ) {
    return this.assignmentService.findMappingsByTemplate(
      user.organizationId,
      templateId,
    );
  }

  /**
   * Update a category-template mapping.
   *
   * @param user - Authenticated user context
   * @param id - Mapping UUID
   * @param dto - Update data
   * @returns Updated mapping
   */
  @Put('mappings/:id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async updateMapping(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryMappingDto,
  ) {
    return this.assignmentService.updateMapping(user.organizationId, id, dto);
  }

  /**
   * Delete a category-template mapping.
   *
   * @param user - Authenticated user context
   * @param id - Mapping UUID
   */
  @Delete('mappings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async deleteMapping(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.assignmentService.deleteMapping(user.organizationId, id);
  }

  // ===========================================
  // Template Recommendation Endpoints
  // ===========================================

  /**
   * Get template recommendations for a category.
   *
   * Returns all applicable templates with their requirement levels.
   * Checks direct category mappings first, then parent categories,
   * then falls back to organization default.
   *
   * @param user - Authenticated user context
   * @param categoryId - Optional category UUID
   * @returns Template recommendations
   */
  @Get('recommend')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  async getRecommendation(
    @CurrentUser() user: AuthUser,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.assignmentService.getTemplateForCase(
      user.organizationId,
      categoryId || null,
    );
  }

  /**
   * Check if a template is required for a category.
   *
   * Used for validation when creating investigations.
   *
   * @param user - Authenticated user context
   * @param categoryId - Optional category UUID
   * @returns { required: boolean }
   */
  @Get('is-required')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  async isRequired(
    @CurrentUser() user: AuthUser,
    @Query('categoryId') categoryId?: string,
  ) {
    const required = await this.assignmentService.isTemplateRequired(
      user.organizationId,
      categoryId || null,
    );
    return { required };
  }
}
