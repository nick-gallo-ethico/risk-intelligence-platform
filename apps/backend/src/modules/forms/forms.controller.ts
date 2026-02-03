import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Ip,
  Headers,
  ParseEnumPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles, UserRole } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { TenantId } from '../../common/decorators/tenant-id.decorator';
import { FormSchemaService } from './form-schema.service';
import { FormSubmissionService } from './form-submission.service';
import {
  SubmitFormDto,
  CreateFormDefinitionDto,
  UpdateFormDefinitionDto,
} from './dto';
import { FormType, FormSubmissionStatus } from '@prisma/client';

/**
 * FormsController provides API endpoints for form management.
 *
 * Routes:
 * - /api/v1/forms/definitions - Form definition CRUD
 * - /api/v1/forms/definitions/:id/submit - Submit form
 * - /api/v1/forms/submissions - Submission management
 * - /api/v1/forms/public - Public endpoints (anonymous)
 */
@Controller('api/v1/forms')
export class FormsController {
  constructor(
    private schemaService: FormSchemaService,
    private submissionService: FormSubmissionService,
  ) {}

  // ============================================
  // Form Definition Endpoints
  // ============================================

  /**
   * Create a new form definition (draft).
   */
  @Post('definitions')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async createDefinition(
    @TenantId() orgId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: CreateFormDefinitionDto,
  ) {
    return this.schemaService.create(orgId, dto as any, user.id);
  }

  /**
   * List form definitions.
   */
  @Get('definitions')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async listDefinitions(
    @TenantId() orgId: string,
    @Query('type') formType?: FormType,
    @Query('published') published?: string,
  ) {
    return this.schemaService.findAll(orgId, {
      formType,
      isPublished: published === 'true' ? true : published === 'false' ? false : undefined,
    });
  }

  /**
   * Get a specific form definition.
   */
  @Get('definitions/:id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async getDefinition(@TenantId() orgId: string, @Param('id') id: string) {
    return this.schemaService.findById(orgId, id);
  }

  /**
   * Update a form definition.
   */
  @Patch('definitions/:id')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async updateDefinition(
    @TenantId() orgId: string,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() dto: UpdateFormDefinitionDto,
  ) {
    return this.schemaService.update(orgId, id, dto as any, user.id);
  }

  /**
   * Publish a form definition.
   */
  @Post('definitions/:id/publish')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.OK)
  async publishDefinition(@TenantId() orgId: string, @Param('id') id: string) {
    const result = await this.schemaService.publish(orgId, id);
    return {
      message: 'Form published successfully',
      id: result.id,
      version: result.version,
    };
  }

  /**
   * Deactivate a form definition.
   */
  @Post('definitions/:id/deactivate')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @HttpCode(HttpStatus.OK)
  async deactivateDefinition(@TenantId() orgId: string, @Param('id') id: string) {
    await this.schemaService.deactivate(orgId, id);
    return { message: 'Form deactivated successfully' };
  }

  /**
   * Clone a form definition.
   */
  @Post('definitions/:id/clone')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async cloneDefinition(
    @TenantId() orgId: string,
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body('name') newName: string,
  ) {
    return this.schemaService.clone(orgId, id, newName, user.id);
  }

  // ============================================
  // Submission Endpoints (Authenticated)
  // ============================================

  /**
   * Submit a form (authenticated user).
   */
  @Post('definitions/:id/submit')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async submitForm(
    @TenantId() orgId: string,
    @Param('id') formId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SubmitFormDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    return this.submissionService.submit({
      organizationId: orgId,
      formDefinitionId: formId,
      data: dto.data,
      entityType: dto.entityType,
      entityId: dto.entityId,
      submittedById: user.id,
      ipAddress: ip,
      userAgent,
    });
  }

  /**
   * Save form as draft (authenticated user).
   */
  @Post('definitions/:id/draft')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async saveDraft(
    @TenantId() orgId: string,
    @Param('id') formId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SubmitFormDto,
  ) {
    return this.submissionService.saveDraft({
      organizationId: orgId,
      formDefinitionId: formId,
      data: dto.data,
      entityType: dto.entityType,
      entityId: dto.entityId,
      submittedById: user.id,
    });
  }

  /**
   * Get a specific submission.
   */
  @Get('submissions/:id')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async getSubmission(@TenantId() orgId: string, @Param('id') id: string) {
    return this.submissionService.findById(orgId, id);
  }

  /**
   * List submissions for a form.
   */
  @Get('definitions/:id/submissions')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async listSubmissions(
    @TenantId() orgId: string,
    @Param('id') formId: string,
    @Query('status') status?: FormSubmissionStatus,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.submissionService.findByFormDefinition(orgId, formId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  /**
   * List submissions for an entity.
   */
  @Get('entity/:entityType/:entityId/submissions')
  @UseGuards(JwtAuthGuard, TenantGuard)
  async listEntitySubmissions(
    @TenantId() orgId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.submissionService.findByEntity(orgId, entityType, entityId);
  }

  /**
   * Update submission status (for approval workflow).
   */
  @Patch('submissions/:id/status')
  @UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.TRIAGE_LEAD)
  async updateSubmissionStatus(
    @TenantId() orgId: string,
    @Param('id') id: string,
    @Body('status', new ParseEnumPipe(FormSubmissionStatus)) status: FormSubmissionStatus,
  ) {
    return this.submissionService.updateStatus(orgId, id, status);
  }

  // ============================================
  // Public Endpoints (Anonymous)
  // ============================================

  /**
   * Check submission status by access code (anonymous).
   * No authentication required - access code serves as credential.
   */
  @Get('public/status/:accessCode')
  async checkStatus(@Param('accessCode') accessCode: string) {
    return this.submissionService.findByAccessCode(accessCode);
  }

  /**
   * Get published form by name for public display.
   * Note: Anonymous submission requires organization context
   * which will be resolved via org slug in the full implementation.
   */
  @Get('public/form/:orgSlug/:formName')
  async getPublicForm(
    @Param('orgSlug') orgSlug: string,
    @Param('formName') formName: string,
  ) {
    // TODO: Resolve organization by slug
    // This will be implemented when the public portal is built
    // For now, return a helpful error
    return {
      error: 'Public form access requires organization resolution',
      message: 'This endpoint will be implemented in the Ethics Portal phase',
      orgSlug,
      formName,
    };
  }
}
