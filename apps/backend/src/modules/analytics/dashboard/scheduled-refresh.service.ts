import { Injectable, Logger, Inject } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { PrismaService } from "../../prisma/prisma.service";
import { WidgetDataService } from "./widget-data.service";
import { DateRangePreset, DashboardWidget } from "@prisma/client";
import { DateRangeDto } from "./dto/dashboard.dto";

/**
 * Service for scheduled background dashboard data refresh.
 *
 * Pre-warms cache for frequently-accessed dashboards to reduce
 * load times and improve user experience.
 *
 * Features:
 * - Refreshes popular dashboards every 5 minutes
 * - Cleans up expired cache entries daily
 * - Pre-warms cache for new users on first dashboard access
 * - Invalidates cache when dashboard config changes
 */
@Injectable()
export class ScheduledRefreshService {
  private readonly logger = new Logger(ScheduledRefreshService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly widgetDataService: WidgetDataService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  /**
   * Refresh frequently-accessed dashboard data every 5 minutes.
   * Pre-populates cache for dashboards accessed in the last hour.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshPopularDashboards(): Promise<void> {
    this.logger.log("Starting scheduled dashboard refresh");

    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Find dashboards accessed in last hour
      const recentConfigs = await this.prisma.userDashboardConfig.findMany({
        where: {
          updatedAt: { gte: oneHourAgo },
        },
        include: {
          dashboard: {
            include: { widgets: true },
          },
          user: true,
        },
        take: 100, // Limit to prevent overload
      });

      this.logger.log(
        `Refreshing ${recentConfigs.length} recently-accessed dashboards`,
      );

      // Refresh in batches of 10
      const batchSize = 10;
      for (let i = 0; i < recentConfigs.length; i += batchSize) {
        const batch = recentConfigs.slice(i, i + batchSize);

        await Promise.all(
          batch.map(async (config) => {
            try {
              const dateRange = this.getDateRangeForPreset(
                config.dateRangePreset,
              );

              await this.widgetDataService.getBatchWidgetData(
                config.organizationId,
                config.userId,
                config.dashboard.widgets as DashboardWidget[],
                dateRange,
              );
            } catch (error) {
              this.logger.error(
                `Failed to refresh dashboard ${config.dashboardId} for user ${config.userId}: ${(error as Error).message}`,
              );
            }
          }),
        );

        // Small delay between batches to prevent overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      this.logger.log("Completed scheduled dashboard refresh");
    } catch (error) {
      this.logger.error(
        `Scheduled dashboard refresh failed: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Clean up and log cache statistics daily at 3 AM.
   * Redis handles TTL automatically, but this provides monitoring.
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupAndLogStats(): Promise<void> {
    this.logger.log("Starting daily cache cleanup and stats logging");

    try {
      const stats = await this.getCacheStats();
      this.logger.log(`Cache stats: ${JSON.stringify(stats)}`);
    } catch (error) {
      this.logger.error(
        `Cache cleanup/stats failed: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Invalidate cache for a specific dashboard.
   * Called when dashboard config changes.
   */
  async invalidateDashboardCache(
    orgId: string,
    dashboardId: string,
  ): Promise<void> {
    // Get all widgets for this dashboard
    const widgets = await this.prisma.dashboardWidget.findMany({
      where: { dashboardId, organizationId: orgId },
      select: { id: true },
    });

    // Invalidate each widget's cache
    await Promise.all(
      widgets.map((widget) =>
        this.widgetDataService.invalidateWidget(orgId, widget.id),
      ),
    );

    this.logger.log(
      `Invalidated cache for dashboard ${dashboardId} (${widgets.length} widgets)`,
    );
  }

  /**
   * Pre-warm cache for a new user's home dashboard.
   * Called when a user first accesses the dashboard system.
   */
  async prewarmUserDashboards(orgId: string, userId: string): Promise<void> {
    const userConfigs = await this.prisma.userDashboardConfig.findMany({
      where: { organizationId: orgId, userId },
      include: {
        dashboard: { include: { widgets: true } },
      },
    });

    // Just pre-warm the home dashboard for faster initial load
    const homeConfig = userConfigs.find((c) => c.isHome);

    if (homeConfig) {
      const dateRange = this.getDateRangeForPreset(homeConfig.dateRangePreset);

      try {
        await this.widgetDataService.getBatchWidgetData(
          orgId,
          userId,
          homeConfig.dashboard.widgets as DashboardWidget[],
          dateRange,
        );

        this.logger.log(
          `Pre-warmed home dashboard for user ${userId}: ${homeConfig.dashboard.widgets.length} widgets`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to pre-warm home dashboard for user ${userId}: ${(error as Error).message}`,
        );
      }
    }
  }

  /**
   * Convert DateRangePreset to DateRangeDto.
   */
  private getDateRangeForPreset(preset: DateRangePreset): DateRangeDto {
    return { preset };
  }

  /**
   * Get cache statistics for monitoring.
   */
  private async getCacheStats(): Promise<Record<string, unknown>> {
    // Basic stats - implementation depends on cache backend
    // For Redis, this would query INFO MEMORY
    // For in-memory cache, return basic metrics
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }
}
