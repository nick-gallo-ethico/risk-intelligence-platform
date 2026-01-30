// =============================================================================
// CONTROLLER PATTERN - All NestJS controllers MUST follow this structure
// =============================================================================
//
// This is the canonical pattern for all controllers in the Risk Intelligence Platform.
// Copy this structure when creating new controllers.
//
// KEY REQUIREMENTS:
// 1. All routes protected by JwtAuthGuard and TenantGuard
// 2. All routes declare required roles
// 3. TenantId and CurrentUser come from decorators (never from body)
// 4. All inputs validated via DTOs
// 5. Proper HTTP status codes
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

// Guards
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { RolesGuard } from '../common/guards/roles.guard';

// Decorators
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TenantId } from '../common/decorators/tenant-id.decorator';

// DTOs and Types
import {
  CreateExampleDto,
  UpdateExampleDto,
  ExampleResponseDto,
  ExampleListResponseDto,
  ExampleQueryDto,
  ChangeStatusDto,
} from './dto';
import { Role } from '../common/enums/role.enum';
import { User } from '@prisma/client';

// Service
import { ExampleService } from './example.service';

@ApiTags('Examples')
@ApiBearerAuth()
@Controller('api/v1/examples')
@UseGuards(JwtAuthGuard, TenantGuard) // REQUIRED: Protect ALL routes
export class ExampleController {
  private readonly logger = new Logger(ExampleController.name);

  constructor(private readonly exampleService: ExampleService) {}

  // -------------------------------------------------------------------------
  // CREATE - POST /api/v1/examples
  // -------------------------------------------------------------------------
  @Post()
  @Roles(Role.COMPLIANCE_OFFICER, Role.SYSTEM_ADMIN) // Declare required roles
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new example' })
  @ApiResponse({ status: 201, description: 'Created', type: ExampleResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Body() dto: CreateExampleDto,
    @CurrentUser() user: User,           // User from JWT
    @TenantId() organizationId: string,  // Org from JWT - NEVER from body
  ): Promise<ExampleResponseDto> {
    this.logger.debug(`Creating example by user ${user.id}`);
    return this.exampleService.create(dto, user.id, organizationId);
  }

  // -------------------------------------------------------------------------
  // LIST - GET /api/v1/examples
  // -------------------------------------------------------------------------
  @Get()
  @Roles(Role.COMPLIANCE_OFFICER, Role.INVESTIGATOR, Role.READ_ONLY)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List examples with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Success', type: ExampleListResponseDto })
  async findAll(
    @Query() query: ExampleQueryDto,     // Validated query params
    @TenantId() organizationId: string,
  ): Promise<ExampleListResponseDto> {
    return this.exampleService.findAll(organizationId, {
      page: query.page,
      limit: query.limit,
      status: query.status,
      search: query.search,
    });
  }

  // -------------------------------------------------------------------------
  // GET ONE - GET /api/v1/examples/:id
  // -------------------------------------------------------------------------
  @Get(':id')
  @Roles(Role.COMPLIANCE_OFFICER, Role.INVESTIGATOR, Role.READ_ONLY)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get example by ID' })
  @ApiResponse({ status: 200, description: 'Success', type: ExampleResponseDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string, // Validate UUID format
    @TenantId() organizationId: string,
  ): Promise<ExampleResponseDto> {
    return this.exampleService.findOne(id, organizationId);
  }

  // -------------------------------------------------------------------------
  // UPDATE - PUT /api/v1/examples/:id
  // -------------------------------------------------------------------------
  @Put(':id')
  @Roles(Role.COMPLIANCE_OFFICER, Role.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update example' })
  @ApiResponse({ status: 200, description: 'Updated', type: ExampleResponseDto })
  @ApiResponse({ status: 404, description: 'Not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateExampleDto,
    @CurrentUser() user: User,
    @TenantId() organizationId: string,
  ): Promise<ExampleResponseDto> {
    return this.exampleService.update(id, dto, user.id, organizationId);
  }

  // -------------------------------------------------------------------------
  // DELETE - DELETE /api/v1/examples/:id
  // -------------------------------------------------------------------------
  @Delete(':id')
  @Roles(Role.SYSTEM_ADMIN) // Only admins can delete
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete example' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
    @TenantId() organizationId: string,
  ): Promise<void> {
    return this.exampleService.remove(id, user.id, organizationId);
  }

  // -------------------------------------------------------------------------
  // STATUS CHANGE - PUT /api/v1/examples/:id/status
  // -------------------------------------------------------------------------
  @Put(':id/status')
  @Roles(Role.COMPLIANCE_OFFICER, Role.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Change example status' })
  @ApiResponse({ status: 200, description: 'Status updated', type: ExampleResponseDto })
  async changeStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChangeStatusDto,
    @CurrentUser() user: User,
    @TenantId() organizationId: string,
  ): Promise<ExampleResponseDto> {
    return this.exampleService.changeStatus(
      id,
      dto.status,
      dto.rationale,
      user.id,
      organizationId,
    );
  }

  // -------------------------------------------------------------------------
  // ACTIVITY LOG - GET /api/v1/examples/:id/activity
  // -------------------------------------------------------------------------
  @Get(':id/activity')
  @Roles(Role.COMPLIANCE_OFFICER, Role.INVESTIGATOR, Role.READ_ONLY)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get activity log for example' })
  async getActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @TenantId() organizationId: string,
  ) {
    // First verify access to the entity
    await this.exampleService.findOne(id, organizationId);

    // Then return activity (could be a separate service method)
    // return this.exampleService.getActivity(id, organizationId);
  }
}

// =============================================================================
// NESTED CONTROLLER PATTERN - For child resources
// =============================================================================
//
// Example: /api/v1/cases/:caseId/investigations
//
// @Controller('api/v1/cases/:caseId/investigations')
// @UseGuards(JwtAuthGuard, TenantGuard)
// export class InvestigationsController {
//   @Post()
//   async create(
//     @Param('caseId', ParseUUIDPipe) caseId: string,
//     @Body() dto: CreateInvestigationDto,
//     @CurrentUser() user: User,
//     @TenantId() organizationId: string,
//   ) {
//     // First verify parent case exists and belongs to this org
//     await this.caseService.findOne(caseId, organizationId);
//
//     // Then create child entity
//     return this.investigationService.create(caseId, dto, user.id, organizationId);
//   }
// }
