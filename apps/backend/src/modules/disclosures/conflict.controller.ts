import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ConflictStatus, ConflictType, ConflictSeverity } from '@prisma/client';
import { ConflictDetectionService } from './conflict-detection.service';
import {
  ConflictQueryDto,
  ConflictAlertDto,
  ConflictAlertPageDto,
  DismissConflictDto,
  EscalateConflictDto,
  CreateExclusionDto,
  ConflictExclusionDto,
  EntityTimelineDto,
} from './dto/conflict.dto';
import { UserRole, Roles } from '../../common/decorators/roles.decorator';

// TODO: Add guards when auth module is integrated
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { RolesGuard } from '../auth/guards/roles.guard';
// import { CurrentUser } from '../auth/decorators/current-user.decorator';
// import { TenantId } from '../auth/decorators/tenant-id.decorator';

// Temporary hardcoded values for development
const TEMP_ORG_ID = '00000000-0000-0000-0000-000000000001';
const TEMP_USER_ID = '00000000-0000-0000-0000-000000000001';

/**
 * ConflictController provides REST endpoints for conflict management.
 * RS.42-RS.43: Conflict detection, contextual presentation, dismissals
 * RS.49: Entity timeline history view
 *
 * Endpoints:
 * - GET /api/v1/conflicts - List conflicts with filters
 * - GET /api/v1/conflicts/:id - Get single conflict
 * - POST /api/v1/conflicts/:id/dismiss - Dismiss conflict
 * - POST /api/v1/conflicts/:id/escalate - Escalate to case
 * - GET /api/v1/conflicts/entity/:name - Entity timeline
 * - POST /api/v1/conflicts/exclusions - Create exclusion
 * - GET /api/v1/conflicts/exclusions - List exclusions
 * - DELETE /api/v1/conflicts/exclusions/:id - Deactivate exclusion
 */
@ApiTags('conflicts')
@Controller('conflicts')
// @UseGuards(JwtAuthGuard, RolesGuard)
export class ConflictController {
  constructor(
    private readonly conflictDetectionService: ConflictDetectionService,
  ) {}

  // ===========================================
  // Conflict Alert Endpoints
  // ===========================================

  /**
   * List conflict alerts with filters.
   * Supports filtering by status, type, severity, matched entity, confidence, and date range.
   */
  @Get()
  @ApiOperation({ summary: 'List conflict alerts with filters' })
  @ApiQuery({ name: 'status', required: false, enum: ConflictStatus, isArray: true })
  @ApiQuery({ name: 'conflictType', required: false, enum: ConflictType, isArray: true })
  @ApiQuery({ name: 'severity', required: false, enum: ConflictSeverity, isArray: true })
  @ApiQuery({ name: 'matchedEntity', required: false, type: String })
  @ApiQuery({ name: 'minConfidence', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated list of conflict alerts' })
  // @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  async findAll(
    @Query() query: ConflictQueryDto,
    // @TenantId() orgId: string,
  ): Promise<ConflictAlertPageDto> {
    return this.conflictDetectionService.findAlerts(TEMP_ORG_ID, query);
  }

  /**
   * Get a single conflict alert by ID with full context.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get conflict alert by ID' })
  @ApiParam({ name: 'id', type: 'string', description: 'Conflict alert UUID' })
  @ApiResponse({ status: 200, description: 'Conflict alert details' })
  @ApiResponse({ status: 404, description: 'Conflict alert not found' })
  // @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    // @TenantId() orgId: string,
  ): Promise<ConflictAlertDto> {
    const alert = await this.conflictDetectionService.findAlertById(id, TEMP_ORG_ID);
    if (!alert) {
      throw new NotFoundException(`Conflict alert ${id} not found`);
    }
    return alert;
  }

  /**
   * Dismiss a conflict alert with categorization.
   * RS.44: Categorized dismissals with optional exclusion creation.
   */
  @Post(':id/dismiss')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Dismiss a conflict alert with category and reason' })
  @ApiParam({ name: 'id', type: 'string', description: 'Conflict alert UUID' })
  @ApiResponse({ status: 200, description: 'Conflict dismissed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid dismissal request' })
  @ApiResponse({ status: 404, description: 'Conflict alert not found' })
  // @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async dismissConflict(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DismissConflictDto,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ): Promise<ConflictAlertDto> {
    return this.conflictDetectionService.dismissConflict(
      id,
      dto,
      TEMP_USER_ID,
      TEMP_ORG_ID,
    );
  }

  /**
   * Escalate a conflict alert to a case for investigation.
   * Creates a new case or links to an existing case.
   */
  @Post(':id/escalate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Escalate conflict to case for investigation' })
  @ApiParam({ name: 'id', type: 'string', description: 'Conflict alert UUID' })
  @ApiResponse({ status: 200, description: 'Conflict escalated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid escalation request' })
  @ApiResponse({ status: 404, description: 'Conflict alert not found' })
  // @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async escalateConflict(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EscalateConflictDto,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ): Promise<ConflictAlertDto> {
    return this.conflictDetectionService.escalateConflict(
      id,
      dto,
      TEMP_USER_ID,
      TEMP_ORG_ID,
    );
  }

  // ===========================================
  // Entity Timeline Endpoint (RS.49)
  // ===========================================

  /**
   * Get entity timeline history showing all interactions with a named entity.
   * RS.49: Full entity timeline across disclosures, conflicts, and cases.
   */
  @Get('entity/:name')
  @ApiOperation({ summary: 'Get entity timeline history' })
  @ApiParam({ name: 'name', type: 'string', description: 'Entity name to search' })
  @ApiResponse({ status: 200, description: 'Entity timeline with all historical events' })
  // @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  async getEntityTimeline(
    @Param('name') entityName: string,
    // @TenantId() orgId: string,
  ): Promise<EntityTimelineDto> {
    return this.conflictDetectionService.getEntityTimeline(
      decodeURIComponent(entityName),
      TEMP_ORG_ID,
    );
  }

  // ===========================================
  // Exclusion Management Endpoints
  // ===========================================

  /**
   * List active conflict exclusions.
   * Returns all exclusion rules currently in effect.
   */
  @Get('exclusions')
  @ApiOperation({ summary: 'List active conflict exclusions' })
  @ApiQuery({ name: 'personId', required: false, type: String })
  @ApiQuery({ name: 'conflictType', required: false, enum: ConflictType })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of conflict exclusions' })
  // @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER, UserRole.INVESTIGATOR)
  async listExclusions(
    @Query('personId') personId?: string,
    @Query('conflictType') conflictType?: ConflictType,
    @Query('activeOnly') activeOnly?: boolean,
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    // @TenantId() orgId: string,
  ): Promise<{ items: ConflictExclusionDto[]; total: number; page: number; pageSize: number }> {
    return this.conflictDetectionService.findExclusions(TEMP_ORG_ID, {
      personId,
      conflictType,
      activeOnly: activeOnly === true || activeOnly === ('true' as unknown as boolean),
      page: page ? Number(page) : 1,
      pageSize: pageSize ? Number(pageSize) : 20,
    });
  }

  /**
   * Create a conflict exclusion directly (not from dismissal).
   * Used for pre-approved exceptions or proactive exclusions.
   */
  @Post('exclusions')
  @ApiOperation({ summary: 'Create a conflict exclusion' })
  @ApiResponse({ status: 201, description: 'Exclusion created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid exclusion request or duplicate' })
  // @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async createExclusion(
    @Body() dto: CreateExclusionDto,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ): Promise<ConflictExclusionDto> {
    const exclusion = await this.conflictDetectionService.createExclusion(
      dto,
      TEMP_USER_ID,
      TEMP_ORG_ID,
    );
    return this.conflictDetectionService.mapExclusionToDto(exclusion);
  }

  /**
   * Deactivate a conflict exclusion.
   * Soft delete - sets isActive to false rather than removing.
   */
  @Delete('exclusions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a conflict exclusion' })
  @ApiParam({ name: 'id', type: 'string', description: 'Exclusion UUID' })
  @ApiResponse({ status: 204, description: 'Exclusion deactivated' })
  @ApiResponse({ status: 404, description: 'Exclusion not found' })
  // @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async deactivateExclusion(
    @Param('id', ParseUUIDPipe) id: string,
    // @CurrentUser() user: User,
    // @TenantId() orgId: string,
  ): Promise<void> {
    await this.conflictDetectionService.deactivateExclusion(
      id,
      TEMP_USER_ID,
      TEMP_ORG_ID,
    );
  }
}
