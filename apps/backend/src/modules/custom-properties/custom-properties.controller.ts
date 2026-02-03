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
import { CustomPropertyEntityType } from '@prisma/client';
import { JwtAuthGuard, TenantGuard, RolesGuard } from '../../common/guards';
import { CurrentUser, TenantId, Roles, UserRole } from '../../common/decorators';
import { RequestUser } from '../auth/interfaces/jwt-payload.interface';
import { CustomPropertiesService } from './custom-properties.service';
import {
  CreateCustomPropertyDto,
  UpdateCustomPropertyDto,
} from './dto/custom-property.dto';

@Controller('custom-properties')
@UseGuards(JwtAuthGuard, TenantGuard)
export class CustomPropertiesController {
  constructor(
    private readonly customPropertiesService: CustomPropertiesService,
  ) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async create(
    @CurrentUser() user: RequestUser,
    @TenantId() organizationId: string,
    @Body() dto: CreateCustomPropertyDto,
  ) {
    return this.customPropertiesService.create(organizationId, user.id, dto);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async findAll(
    @TenantId() organizationId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.customPropertiesService.findAll(
      organizationId,
      includeInactive === 'true',
    );
  }

  @Get('by-entity/:entityType')
  async findByEntityType(
    @TenantId() organizationId: string,
    @Param('entityType') entityType: CustomPropertyEntityType,
  ) {
    return this.customPropertiesService.findByEntityType(
      organizationId,
      entityType,
    );
  }

  @Get('defaults/:entityType')
  async getDefaults(
    @TenantId() organizationId: string,
    @Param('entityType') entityType: CustomPropertyEntityType,
  ) {
    return this.customPropertiesService.getDefaultValues(
      organizationId,
      entityType,
    );
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(
    UserRole.SYSTEM_ADMIN,
    UserRole.COMPLIANCE_OFFICER,
    UserRole.INVESTIGATOR,
  )
  async findOne(
    @TenantId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.customPropertiesService.findById(organizationId, id);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async update(
    @TenantId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCustomPropertyDto,
  ) {
    return this.customPropertiesService.update(organizationId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async delete(
    @TenantId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.customPropertiesService.delete(organizationId, id);
  }

  @Put('reorder/:entityType')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SYSTEM_ADMIN, UserRole.COMPLIANCE_OFFICER)
  async reorder(
    @TenantId() organizationId: string,
    @Param('entityType') entityType: CustomPropertyEntityType,
    @Body() propertyOrders: { id: string; displayOrder: number }[],
  ) {
    await this.customPropertiesService.reorder(
      organizationId,
      entityType,
      propertyOrders,
    );
    return { success: true };
  }

  @Post('validate/:entityType')
  async validate(
    @TenantId() organizationId: string,
    @Param('entityType') entityType: CustomPropertyEntityType,
    @Body() values: Record<string, unknown>,
  ) {
    return this.customPropertiesService.validateValues(
      organizationId,
      entityType,
      values,
    );
  }
}
