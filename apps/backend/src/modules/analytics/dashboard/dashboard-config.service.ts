import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { DashboardType, DateRangePreset, Prisma } from "@prisma/client";
import {
  CreateDashboardDto,
  UpdateDashboardDto,
  CreateWidgetDto,
  UpdateWidgetDto,
  UserDashboardConfigDto,
  DashboardQueryDto,
} from "./dto/dashboard.dto";
import {
  Dashboard,
  DashboardWithWidgets,
  DEFAULT_WIDGET_CONFIGS,
  GRID_CONFIG,
  ResponsiveLayouts,
} from "./entities/dashboard-config.entity";

/**
 * Service for managing dashboard configurations.
 *
 * Provides CRUD operations for dashboards, widgets, and user configurations.
 * Supports role-based default dashboards with customization.
 */
@Injectable()
export class DashboardConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ====================
  // Dashboard CRUD
  // ====================

  /**
   * Creates a new dashboard with optional widgets.
   */
  async createDashboard(
    organizationId: string,
    userId: string,
    dto: CreateDashboardDto,
  ): Promise<DashboardWithWidgets> {
    const { widgets, ...dashboardData } = dto;

    // Check for duplicate name
    const existing = await this.prisma.dashboard.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name: dto.name,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Dashboard with name "${dto.name}" already exists`,
      );
    }

    // Create dashboard with widgets in transaction
    const dashboard = await this.prisma.$transaction(async (tx) => {
      const created = await tx.dashboard.create({
        data: {
          organizationId,
          createdById: userId,
          name: dashboardData.name,
          description: dashboardData.description,
          dashboardType: dashboardData.dashboardType,
          layouts: dashboardData.layouts as Prisma.InputJsonValue,
          isSystem: false,
          isDefault: false,
        },
      });

      // Create widgets if provided
      if (widgets && widgets.length > 0) {
        await tx.dashboardWidget.createMany({
          data: widgets.map((w) => ({
            dashboardId: created.id,
            organizationId,
            widgetType: w.widgetType,
            title: w.title,
            dataSource: w.dataSource,
            queryConfig: w.queryConfig as unknown as Prisma.InputJsonValue,
            layoutItem: w.layoutItem as unknown as Prisma.InputJsonValue,
            chartType: w.chartType,
            displayConfig: w.displayConfig as unknown as Prisma.InputJsonValue,
            useDashboardDateRange: w.useDashboardDateRange ?? true,
            dateRangeOverride:
              w.dateRangeOverride as unknown as Prisma.InputJsonValue,
            refreshInterval: w.refreshInterval,
          })),
        });
      }

      return created;
    });

    // Emit event
    this.eventEmitter.emit("dashboard.created", {
      dashboardId: dashboard.id,
      organizationId,
      userId,
      dashboardType: dashboard.dashboardType,
    });

    return this.getDashboard(organizationId, dashboard.id);
  }

  /**
   * Gets a single dashboard with widgets.
   */
  async getDashboard(
    organizationId: string,
    id: string,
  ): Promise<DashboardWithWidgets> {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id, organizationId },
      include: { widgets: true },
    });

    if (!dashboard) {
      throw new NotFoundException("Dashboard not found");
    }

    return dashboard as unknown as DashboardWithWidgets;
  }

  /**
   * Updates a dashboard (excluding widgets).
   */
  async updateDashboard(
    organizationId: string,
    id: string,
    dto: UpdateDashboardDto,
  ): Promise<DashboardWithWidgets> {
    const existing = await this.getDashboard(organizationId, id);

    // Prevent editing system dashboards
    if (existing.isSystem) {
      throw new ForbiddenException("Cannot modify system dashboards");
    }

    // Check for duplicate name if changing
    if (dto.name && dto.name !== existing.name) {
      const duplicate = await this.prisma.dashboard.findUnique({
        where: {
          organizationId_name: {
            organizationId,
            name: dto.name,
          },
        },
      });

      if (duplicate) {
        throw new BadRequestException(
          `Dashboard with name "${dto.name}" already exists`,
        );
      }
    }

    // Handle default toggle
    if (dto.isDefault === true) {
      await this.prisma.dashboard.updateMany({
        where: {
          organizationId,
          dashboardType: existing.dashboardType,
          isDefault: true,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    await this.prisma.dashboard.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.layouts && { layouts: dto.layouts as Prisma.InputJsonValue }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });

    // Emit event
    this.eventEmitter.emit("dashboard.updated", {
      dashboardId: id,
      organizationId,
      changes: dto,
    });

    return this.getDashboard(organizationId, id);
  }

  /**
   * Deletes a dashboard and its widgets.
   */
  async deleteDashboard(organizationId: string, id: string): Promise<void> {
    const existing = await this.getDashboard(organizationId, id);

    if (existing.isSystem) {
      throw new ForbiddenException("Cannot delete system dashboards");
    }

    await this.prisma.dashboard.delete({ where: { id } });

    this.eventEmitter.emit("dashboard.deleted", {
      dashboardId: id,
      organizationId,
    });
  }

  /**
   * Lists dashboards with optional filters.
   */
  async listDashboards(
    organizationId: string,
    query: DashboardQueryDto,
  ): Promise<{ data: Dashboard[]; total: number }> {
    const where: Prisma.DashboardWhereInput = {
      organizationId,
      ...(query.dashboardType && { dashboardType: query.dashboardType }),
      ...(query.includeSystem === false && { isSystem: false }),
      ...(query.defaultsOnly && { isDefault: true }),
    };

    const [data, total] = await Promise.all([
      this.prisma.dashboard.findMany({
        where,
        orderBy: [{ isSystem: "desc" }, { isDefault: "desc" }, { name: "asc" }],
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
      this.prisma.dashboard.count({ where }),
    ]);

    return { data: data as unknown as Dashboard[], total };
  }

  // ====================
  // User Config
  // ====================

  /**
   * Gets user's configuration for a specific dashboard.
   */
  async getUserConfig(
    organizationId: string,
    userId: string,
    dashboardId: string,
  ) {
    const config = await this.prisma.userDashboardConfig.findUnique({
      where: {
        userId_dashboardId: { userId, dashboardId },
      },
    });

    return config;
  }

  /**
   * Saves user's dashboard configuration.
   */
  async saveUserConfig(
    organizationId: string,
    userId: string,
    dashboardId: string,
    dto: UserDashboardConfigDto,
  ) {
    // Verify dashboard exists
    await this.getDashboard(organizationId, dashboardId);

    const config = await this.prisma.userDashboardConfig.upsert({
      where: {
        userId_dashboardId: { userId, dashboardId },
      },
      create: {
        organizationId,
        userId,
        dashboardId,
        isHome: dto.isHome ?? false,
        layoutOverrides: dto.layoutOverrides as Prisma.InputJsonValue,
        widgetOverrides: dto.widgetOverrides as Prisma.InputJsonValue,
        refreshInterval: dto.refreshInterval ?? 5,
        dateRangePreset: dto.dateRangePreset ?? DateRangePreset.LAST_30_DAYS,
      },
      update: {
        ...(dto.isHome !== undefined && { isHome: dto.isHome }),
        ...(dto.layoutOverrides !== undefined && {
          layoutOverrides: dto.layoutOverrides as Prisma.InputJsonValue,
        }),
        ...(dto.widgetOverrides !== undefined && {
          widgetOverrides: dto.widgetOverrides as Prisma.InputJsonValue,
        }),
        ...(dto.refreshInterval !== undefined && {
          refreshInterval: dto.refreshInterval,
        }),
        ...(dto.dateRangePreset !== undefined && {
          dateRangePreset: dto.dateRangePreset,
        }),
      },
    });

    return config;
  }

  /**
   * Sets a dashboard as user's home dashboard.
   * Unsets any previous home dashboard.
   */
  async setHomeDashboard(
    organizationId: string,
    userId: string,
    dashboardId: string,
  ) {
    // Verify dashboard exists
    await this.getDashboard(organizationId, dashboardId);

    // Unset previous home dashboards
    await this.prisma.userDashboardConfig.updateMany({
      where: {
        organizationId,
        userId,
        isHome: true,
      },
      data: { isHome: false },
    });

    // Set new home dashboard
    return this.saveUserConfig(organizationId, userId, dashboardId, {
      isHome: true,
    });
  }

  /**
   * Gets all dashboards configured by a user.
   */
  async getUserDashboards(organizationId: string, userId: string) {
    const configs = await this.prisma.userDashboardConfig.findMany({
      where: { organizationId, userId },
      include: { dashboard: { include: { widgets: true } } },
      orderBy: [{ isHome: "desc" }, { createdAt: "desc" }],
    });

    return configs.map((c) => ({
      ...c.dashboard,
      userConfig: {
        id: c.id,
        isHome: c.isHome,
        layoutOverrides: c.layoutOverrides,
        widgetOverrides: c.widgetOverrides,
        refreshInterval: c.refreshInterval,
        dateRangePreset: c.dateRangePreset,
      },
    }));
  }

  /**
   * Gets user's home dashboard, or the default for their role.
   */
  async getHomeDashboard(
    organizationId: string,
    userId: string,
    defaultType?: DashboardType,
  ) {
    // First try user's explicit home dashboard
    const homeConfig = await this.prisma.userDashboardConfig.findFirst({
      where: { organizationId, userId, isHome: true },
      include: { dashboard: { include: { widgets: true } } },
    });

    if (homeConfig) {
      return {
        ...homeConfig.dashboard,
        userConfig: homeConfig,
      };
    }

    // Fall back to default for dashboard type
    const dashboardType = defaultType || DashboardType.CCO;
    const defaultDashboard = await this.getDefaultDashboard(
      organizationId,
      dashboardType,
    );

    return defaultDashboard;
  }

  // ====================
  // Default Dashboards
  // ====================

  /**
   * Gets the default dashboard for a given type.
   */
  async getDefaultDashboard(
    organizationId: string,
    dashboardType: DashboardType,
  ): Promise<DashboardWithWidgets | null> {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: {
        organizationId,
        dashboardType,
        isDefault: true,
      },
      include: { widgets: true },
    });

    return dashboard as unknown as DashboardWithWidgets | null;
  }

  /**
   * Ensures default dashboards exist for an organization.
   * Creates system dashboards if they don't exist.
   */
  async ensureDefaultDashboards(
    organizationId: string,
    createdById: string,
  ): Promise<void> {
    const dashboardTypes = [
      DashboardType.CCO,
      DashboardType.INVESTIGATOR,
      DashboardType.CAMPAIGN_MANAGER,
    ];

    for (const dashboardType of dashboardTypes) {
      const existing = await this.prisma.dashboard.findFirst({
        where: { organizationId, dashboardType, isSystem: true },
      });

      if (!existing) {
        const widgets = DEFAULT_WIDGET_CONFIGS[dashboardType];
        const layouts = this.generateDefaultLayouts(widgets);

        await this.prisma.$transaction(async (tx) => {
          const dashboard = await tx.dashboard.create({
            data: {
              organizationId,
              createdById,
              name: `${dashboardType} Dashboard`,
              description: `Default ${dashboardType.toLowerCase().replace("_", " ")} dashboard`,
              dashboardType,
              layouts: layouts as Prisma.InputJsonValue,
              isSystem: true,
              isDefault: true,
            },
          });

          if (widgets.length > 0) {
            await tx.dashboardWidget.createMany({
              data: widgets.map((w) => ({
                dashboardId: dashboard.id,
                organizationId,
                widgetType: w.widgetType,
                title: w.title,
                dataSource: w.dataSource,
                layoutItem: w.layoutItem as unknown as Prisma.InputJsonValue,
                chartType: w.chartType,
                useDashboardDateRange: true,
              })),
            });
          }
        });
      }
    }
  }

  /**
   * Generates responsive layouts from widget layout items.
   */
  private generateDefaultLayouts(
    widgets: Array<{
      layoutItem: { i: string; x: number; y: number; w: number; h: number };
    }>,
  ): ResponsiveLayouts {
    const lgLayouts = widgets.map((w) => w.layoutItem);

    // Scale down for smaller screens
    const mdLayouts = lgLayouts.map((l) => ({
      ...l,
      x: Math.min(l.x, GRID_CONFIG.cols.md - l.w),
    }));

    const smLayouts = lgLayouts.map((l) => ({
      ...l,
      x: Math.min(
        l.x,
        GRID_CONFIG.cols.sm - Math.min(l.w, GRID_CONFIG.cols.sm),
      ),
      w: Math.min(l.w, GRID_CONFIG.cols.sm),
    }));

    const xsLayouts = lgLayouts.map((l, idx) => ({
      ...l,
      x: 0,
      y: idx,
      w: GRID_CONFIG.cols.xs,
    }));

    return { lg: lgLayouts, md: mdLayouts, sm: smLayouts, xs: xsLayouts };
  }

  // ====================
  // Widget Management
  // ====================

  /**
   * Adds a widget to a dashboard.
   */
  async addWidget(
    organizationId: string,
    dashboardId: string,
    dto: CreateWidgetDto,
  ) {
    const dashboard = await this.getDashboard(organizationId, dashboardId);

    if (dashboard.isSystem) {
      throw new ForbiddenException("Cannot modify system dashboard widgets");
    }

    const widget = await this.prisma.dashboardWidget.create({
      data: {
        dashboardId,
        organizationId,
        widgetType: dto.widgetType,
        title: dto.title,
        dataSource: dto.dataSource,
        queryConfig: dto.queryConfig as unknown as Prisma.InputJsonValue,
        layoutItem: dto.layoutItem as unknown as Prisma.InputJsonValue,
        chartType: dto.chartType,
        displayConfig: dto.displayConfig as unknown as Prisma.InputJsonValue,
        useDashboardDateRange: dto.useDashboardDateRange ?? true,
        dateRangeOverride:
          dto.dateRangeOverride as unknown as Prisma.InputJsonValue,
        refreshInterval: dto.refreshInterval,
      },
    });

    this.eventEmitter.emit("dashboard.widget.added", {
      dashboardId,
      widgetId: widget.id,
      organizationId,
    });

    return widget;
  }

  /**
   * Updates a widget configuration.
   */
  async updateWidget(
    organizationId: string,
    dashboardId: string,
    widgetId: string,
    dto: UpdateWidgetDto,
  ) {
    const dashboard = await this.getDashboard(organizationId, dashboardId);

    if (dashboard.isSystem) {
      throw new ForbiddenException("Cannot modify system dashboard widgets");
    }

    const widget = await this.prisma.dashboardWidget.findFirst({
      where: { id: widgetId, dashboardId, organizationId },
    });

    if (!widget) {
      throw new NotFoundException("Widget not found");
    }

    const updated = await this.prisma.dashboardWidget.update({
      where: { id: widgetId },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.dataSource !== undefined && { dataSource: dto.dataSource }),
        ...(dto.queryConfig !== undefined && {
          queryConfig: dto.queryConfig as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.layoutItem !== undefined && {
          layoutItem: dto.layoutItem as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.chartType !== undefined && { chartType: dto.chartType }),
        ...(dto.displayConfig !== undefined && {
          displayConfig: dto.displayConfig as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.useDashboardDateRange !== undefined && {
          useDashboardDateRange: dto.useDashboardDateRange,
        }),
        ...(dto.dateRangeOverride !== undefined && {
          dateRangeOverride:
            dto.dateRangeOverride as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.refreshInterval !== undefined && {
          refreshInterval: dto.refreshInterval,
        }),
      },
    });

    this.eventEmitter.emit("dashboard.widget.updated", {
      dashboardId,
      widgetId,
      organizationId,
    });

    return updated;
  }

  /**
   * Removes a widget from a dashboard.
   */
  async removeWidget(
    organizationId: string,
    dashboardId: string,
    widgetId: string,
  ): Promise<void> {
    const dashboard = await this.getDashboard(organizationId, dashboardId);

    if (dashboard.isSystem) {
      throw new ForbiddenException("Cannot modify system dashboard widgets");
    }

    const widget = await this.prisma.dashboardWidget.findFirst({
      where: { id: widgetId, dashboardId, organizationId },
    });

    if (!widget) {
      throw new NotFoundException("Widget not found");
    }

    await this.prisma.dashboardWidget.delete({ where: { id: widgetId } });

    this.eventEmitter.emit("dashboard.widget.removed", {
      dashboardId,
      widgetId,
      organizationId,
    });
  }

  /**
   * Batch updates widget positions (for drag-drop operations).
   */
  async updateWidgetPositions(
    organizationId: string,
    dashboardId: string,
    positions: Array<{ widgetId: string; layoutItem: Record<string, unknown> }>,
  ): Promise<void> {
    const dashboard = await this.getDashboard(organizationId, dashboardId);

    if (dashboard.isSystem) {
      throw new ForbiddenException("Cannot modify system dashboard widgets");
    }

    await this.prisma.$transaction(
      positions.map(({ widgetId, layoutItem }) =>
        this.prisma.dashboardWidget.updateMany({
          where: { id: widgetId, dashboardId, organizationId },
          data: { layoutItem: layoutItem as Prisma.InputJsonValue },
        }),
      ),
    );

    this.eventEmitter.emit("dashboard.layout.updated", {
      dashboardId,
      organizationId,
    });
  }

  /**
   * Gets a single widget by ID.
   */
  async getWidget(organizationId: string, widgetId: string) {
    const widget = await this.prisma.dashboardWidget.findFirst({
      where: { id: widgetId, organizationId },
    });

    if (!widget) {
      throw new NotFoundException("Widget not found");
    }

    return widget;
  }

  /**
   * Gets multiple widgets by IDs.
   * Returns widgets in the same order as input IDs.
   */
  async getWidgetsByIds(organizationId: string, widgetIds: string[]) {
    const widgets = await this.prisma.dashboardWidget.findMany({
      where: {
        id: { in: widgetIds },
        organizationId,
      },
    });

    // Return in same order as input IDs
    return widgetIds
      .map((id) => widgets.find((w) => w.id === id))
      .filter((w): w is NonNullable<typeof w> => w !== undefined);
  }
}
