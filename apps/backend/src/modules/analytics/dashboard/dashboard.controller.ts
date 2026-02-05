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
import { WidgetDataService } from "./widget-data.service";
import {
  CreateDashboardDto,
  UpdateDashboardDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  UserDashboardConfigDto,
  DashboardQueryDto,
  DateRangeDto,
} from "./dto/dashboard.dto";
import {
  BatchWidgetDataRequestDto,
  WidgetDataResponse,
  BatchWidgetDataResponse,
} from "./dto/widget-data.dto";
import { DashboardWidget as PrismaDashboardWidget } from "@prisma/client";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { TenantGuard } from "../../../common/guards/tenant.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { TenantId } from "../../../common/decorators/tenant-id.decorator";
import { DashboardType, DateRangePreset } from "@prisma/client";

interface AuthUser {
  id: string;
  organizationId: string;
}

/**
 * Query DTO for widget data requests.
 */
class WidgetDataQueryDto {
  preset?: DateRangePreset;
  start?: string;
  end?: string;
  forceRefresh?: boolean;
}

/**
 * Query DTO for dashboard data requests.
 */
class DashboardDataQueryDto {
  preset?: DateRangePreset;
  start?: string;
  end?: string;
}

/**
 * Controller for dashboard configuration management.
 */
@Controller("api/v1/analytics/dashboards")
@UseGuards(JwtAuthGuard, TenantGuard)
export class DashboardController {
  constructor(
    private readonly dashboardConfigService: DashboardConfigService,
    private readonly widgetDataService: WidgetDataService,
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

  // ====================
  // Widget Data
  // ====================

  /**
   * Get data for all widgets in a dashboard.
   * Fetches widget data in parallel for efficient dashboard loading.
   */
  @Get(":dashboardId/data")
  async getDashboardData(
    @TenantId() organizationId: string,
    @CurrentUser() user: AuthUser,
    @Param("dashboardId", ParseUUIDPipe) dashboardId: string,
    @Query() query: DashboardDataQueryDto,
  ): Promise<Record<string, WidgetDataResponse>> {
    const dashboard = await this.dashboardConfigService.getDashboard(
      organizationId,
      dashboardId,
    );

    const dateRange = this.parseDateRange(query);

    const responses = await this.widgetDataService.getBatchWidgetData(
      organizationId,
      user.id,
      dashboard.widgets as unknown as PrismaDashboardWidget[],
      dateRange,
    );

    // Return as map by widget ID for easier frontend consumption
    return responses.widgets.reduce(
      (acc, r) => {
        acc[r.widgetId] = r;
        return acc;
      },
      {} as Record<string, WidgetDataResponse>,
    );
  }

  /**
   * Batch fetch data for multiple widgets.
   * Can request data from widgets across different dashboards.
   */
  @Post("widgets/data/batch")
  async batchWidgetData(
    @TenantId() organizationId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: BatchWidgetDataRequestDto,
  ): Promise<BatchWidgetDataResponse> {
    // Load widget configs
    const widgetIds = dto.widgets.map((w) => w.widgetId);
    const widgets = await this.dashboardConfigService.getWidgetsByIds(
      organizationId,
      widgetIds,
    );

    const dateRange = dto.globalDateRange || {
      preset: DateRangePreset.LAST_30_DAYS,
    };

    return this.widgetDataService.getBatchWidgetData(
      organizationId,
      user.id,
      widgets,
      dateRange,
    );
  }

  /**
   * Get data for a single widget.
   */
  @Get("widgets/:widgetId/data")
  async getWidgetData(
    @TenantId() organizationId: string,
    @CurrentUser() user: AuthUser,
    @Param("widgetId", ParseUUIDPipe) widgetId: string,
    @Query() query: WidgetDataQueryDto,
  ): Promise<WidgetDataResponse> {
    const widget = await this.dashboardConfigService.getWidget(
      organizationId,
      widgetId,
    );

    return this.widgetDataService.getWidgetData(
      organizationId,
      user.id,
      widget,
      this.parseDateRange(query),
      query.forceRefresh === true,
    );
  }

  /**
   * Parse date range query parameters into DateRangeDto.
   */
  private parseDateRange(query: {
    preset?: DateRangePreset;
    start?: string;
    end?: string;
  }): DateRangeDto {
    return {
      preset: query.preset || DateRangePreset.LAST_30_DAYS,
      start: query.start,
      end: query.end,
    };
  }
}
