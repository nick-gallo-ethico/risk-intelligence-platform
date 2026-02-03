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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, TenantGuard, RolesGuard } from '../../../common/guards';
import { CurrentUser, TenantId, Roles, UserRole } from '../../../common/decorators';
import { RequestUser } from '../../auth/interfaces/jwt-payload.interface';
import { InvestigationInterviewService } from './interview.service';
import {
  CreateInterviewDto,
  UpdateInterviewDto,
  InterviewQueryDto,
  CreateInterviewTemplateDto,
  UpdateInterviewTemplateDto,
} from './dto/interview.dto';

@ApiTags('Investigation Interviews')
@ApiBearerAuth('JWT')
@Controller('investigation-interviews')
@UseGuards(JwtAuthGuard, TenantGuard, RolesGuard)
export class InvestigationInterviewController {
  constructor(
    private readonly interviewService: InvestigationInterviewService,
  ) {}

  // ===== Interviews =====

  @Post()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Create a new investigation interview' })
  @ApiResponse({ status: 201, description: 'Interview created successfully' })
  async create(
    @TenantId() organizationId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateInterviewDto,
  ) {
    return this.interviewService.create(organizationId, user.id, dto);
  }

  @Get()
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'List all interviews with filtering' })
  @ApiResponse({ status: 200, description: 'List of interviews' })
  async findAll(
    @TenantId() organizationId: string,
    @Query() query: InterviewQueryDto,
  ) {
    return this.interviewService.findAll(organizationId, query);
  }

  @Get(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Get an interview by ID' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({ status: 200, description: 'Interview found' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  async findOne(
    @TenantId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.interviewService.findById(organizationId, id);
  }

  @Put(':id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Update an interview' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({ status: 200, description: 'Interview updated successfully' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  async update(
    @TenantId() organizationId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInterviewDto,
  ) {
    return this.interviewService.update(organizationId, id, user.id, dto);
  }

  @Post(':id/start')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Start an interview (transition to IN_PROGRESS)' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({ status: 200, description: 'Interview started' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async start(
    @TenantId() organizationId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.interviewService.start(organizationId, id, user.id);
  }

  @Post(':id/complete')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Complete an interview (transition to COMPLETED)' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({ status: 200, description: 'Interview completed' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  async complete(
    @TenantId() organizationId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('summary') summary?: string,
  ) {
    return this.interviewService.complete(organizationId, id, user.id, summary);
  }

  @Post(':id/cancel')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Cancel an interview' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({ status: 200, description: 'Interview cancelled' })
  async cancel(
    @TenantId() organizationId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.interviewService.cancel(organizationId, id, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Delete an interview' })
  @ApiParam({ name: 'id', description: 'Interview ID' })
  @ApiResponse({ status: 204, description: 'Interview deleted' })
  @ApiResponse({ status: 404, description: 'Interview not found' })
  async delete(
    @TenantId() organizationId: string,
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.interviewService.delete(organizationId, id, user.id);
  }

  // ===== Interview Templates =====

  @Post('templates')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Create an interview template' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  async createTemplate(
    @TenantId() organizationId: string,
    @CurrentUser() user: RequestUser,
    @Body() dto: CreateInterviewTemplateDto,
  ) {
    return this.interviewService.createTemplate(organizationId, user.id, dto);
  }

  @Get('templates')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'List all interview templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async findAllTemplates(
    @TenantId() organizationId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.interviewService.findAllTemplates(organizationId, categoryId);
  }

  @Get('templates/:id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Get a template by ID' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template found' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async findTemplateById(
    @TenantId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.interviewService.findTemplateById(organizationId, id);
  }

  @Put('templates/:id')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Update an interview template' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async updateTemplate(
    @TenantId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInterviewTemplateDto,
  ) {
    return this.interviewService.updateTemplate(organizationId, id, dto);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  @ApiOperation({ summary: 'Delete an interview template (soft delete)' })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({ status: 204, description: 'Template deleted' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async deleteTemplate(
    @TenantId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.interviewService.deleteTemplate(organizationId, id);
  }

  // ===== Person History =====

  @Get('by-person/:personId')
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  @ApiOperation({ summary: 'Get all interviews for a person' })
  @ApiParam({ name: 'personId', description: 'Person ID' })
  @ApiResponse({ status: 200, description: 'List of interviews for the person' })
  async findByPerson(
    @TenantId() organizationId: string,
    @Param('personId', ParseUUIDPipe) personId: string,
  ) {
    return this.interviewService.findInterviewsByPerson(organizationId, personId);
  }
}
