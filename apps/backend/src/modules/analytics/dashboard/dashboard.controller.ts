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
} from "@nestjs/common";
import { DashboardConfigService } from "./dashboard-config.service";
import {
  CreateDashboardDto,
  UpdateDashboardDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  UserDashboardConfigDto,
  DashboardQueryDto,
} from "./dto/dashboard.dto";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../../common/guards/tenant.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { TenantId } from "../../../common/decorators/tenant-id.decorator";
import { DashboardType } from "@prisma/client";

interface AuthUser {
  id: string;
  organizationId: string;
}

/**
 * Controller for dashboard configuration management.
 */
@Controller("api/v1/analytics/dashboards")
@UseGuards(JwtAuthGuard, TenantGuard)
export class DashboardController {
  constructor(
    private readonly dashboardConfigService: DashboardConfigService,
  ) {}

  // ====================
  // Dashboard CRUD
  // ====================

  /**
   * List dashboards with optional filters.
   */
  @Get()
  async listDashboards(
    @TenantId() organizationId: string,
    @Query() query: DashboardQueryDto,
  ) {
    return this.dashboardConfigService.listDashboards(organizationId, query);
  }

  /**
   * Get a specific dashboard by ID.
   */
  @Get(":id")
  async getDashboard(
    @TenantId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.dashboardConfigService.getDashboard(organizationId, id);
  }

  /**
   * Create a new dashboard.
   */
  @Post()
  async createDashboard(
    @TenantId() organizationId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateDashboardDto,
  ) {
    return this.dashboardConfigService.createDashboard(
      organizationId,
      user.id,
      dto,
    );
  }

  /**
   * Update a dashboard.
   */
  @Put(":id")
  async updateDashboard(
    @TenantId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateDashboardDto,
  ) {
    return this.dashboardConfigService.updateDashboard(organizationId, id, dto);
  }

  /**
   * Delete a dashboard.
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDashboard(
    @TenantId() organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.dashboardConfigService.deleteDashboard(organizationId, id);
  }

  // ====================
  // Default Dashboards
  // ====================

  /**
   * Get the default dashboard for a given type.
   */
  @Get("defaults/:type")
  async getDefaultDashboard(
    @TenantId() organizationId: string,
    @Param("type") dashboardType: DashboardType,
  ) {
    return this.dashboardConfigService.getDefaultDashboard(
      organizationId,
      dashboardType,
    );
  }

  /**
   * Ensure default dashboards exist (admin only, typically called during org setup).
   */
  @Post("defaults/ensure")
  @HttpCode(HttpStatus.NO_CONTENT)
  async ensureDefaultDashboards(
    @TenantId() organizationId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.dashboardConfigService.ensureDefaultDashboards(
      organizationId,
      user.id,
    );
  }

  // ====================
  // User Configuration
  // ====================

  /**
   * Get user's configured dashboards.
   */
  @Get("user/configured")
  async getUserDashboards(
    @TenantId() organizationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.dashboardConfigService.getUserDashboards(
      organizationId,
      user.id,
    );
  }

  /**
   * Get user's home dashboard.
   */
  @Get("user/home")
  async getHomeDashboard(
    @TenantId() organizationId: string,
    @CurrentUser() user: AuthUser,
    @Query("defaultType") defaultType?: DashboardType,
  ) {
    return this.dashboardConfigService.getHomeDashboard(
      organizationId,
      user.id,
      defaultType,
    );
  }

  /**
   * Set a dashboard as user's home.
   */
  @Post("user/home/:dashboardId")
  async setHomeDashboard(
    @TenantId() organizationId: string,
    @CurrentUser() user: AuthUser,
    @Param("dashboardId", ParseUUIDPipe) dashboardId: string,
  ) {
    return this.dashboardConfigService.setHomeDashboard(
      organizationId,
      user.id,
      dashboardId,
    );
  }

  /**
   * Get user's config for a specific dashboard.
   */
  @Get(":dashboardId/config")
  async getUserConfig(
    @TenantId() organizationId: string,
    @CurrentUser() user: AuthUser,
    @Param("dashboardId", ParseUUIDPipe) dashboardId: string,
  ) {
    return this.dashboardConfigService.getUserConfig(
      organizationId,
      user.id,
      dashboardId,
    );
  }

  /**
   * Save user's config for a specific dashboard.
   */
  @Put(":dashboardId/config")
  async saveUserConfig(
    @TenantId() organizationId: string,
    @CurrentUser() user: AuthUser,
    @Param("dashboardId", ParseUUIDPipe) dashboardId: string,
    @Body() dto: UserDashboardConfigDto,
  ) {
    return this.dashboardConfigService.saveUserConfig(
      organizationId,
      user.id,
      dashboardId,
      dto,
    );
  }

  // ====================
  // Widget Management
  // ====================

  /**
   * Add a widget to a dashboard.
   */
  @Post(":dashboardId/widgets")
  async addWidget(
    @TenantId() organizationId: string,
    @Param("dashboardId", ParseUUIDPipe) dashboardId: string,
    @Body() dto: CreateWidgetDto,
  ) {
    return this.dashboardConfigService.addWidget(
      organizationId,
      dashboardId,
      dto,
    );
  }

  /**
   * Update a widget.
   */
  @Put(":dashboardId/widgets/:widgetId")
  async updateWidget(
    @TenantId() organizationId: string,
    @Param("dashboardId", ParseUUIDPipe) dashboardId: string,
    @Param("widgetId", ParseUUIDPipe) widgetId: string,
    @Body() dto: UpdateWidgetDto,
  ) {
    return this.dashboardConfigService.updateWidget(
      organizationId,
      dashboardId,
      widgetId,
      dto,
    );
  }

  /**
   * Remove a widget from a dashboard.
   */
  @Delete(":dashboardId/widgets/:widgetId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeWidget(
    @TenantId() organizationId: string,
    @Param("dashboardId", ParseUUIDPipe) dashboardId: string,
    @Param("widgetId", ParseUUIDPipe) widgetId: string,
  ): Promise<void> {
    await this.dashboardConfigService.removeWidget(
      organizationId,
      dashboardId,
      widgetId,
    );
  }

  /**
   * Batch update widget positions.
   */
  @Put(":dashboardId/widgets/positions")
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateWidgetPositions(
    @TenantId() organizationId: string,
    @Param("dashboardId", ParseUUIDPipe) dashboardId: string,
    @Body()
    positions: Array<{ widgetId: string; layoutItem: Record<string, unknown> }>,
  ): Promise<void> {
    await this.dashboardConfigService.updateWidgetPositions(
      organizationId,
      dashboardId,
      positions,
    );
  }
}
