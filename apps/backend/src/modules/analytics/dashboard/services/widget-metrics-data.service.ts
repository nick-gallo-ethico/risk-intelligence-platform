import { Injectable, Inject } from "@nestjs/common";
import { CACHE_MANAGER, Cache } from "@nestjs/cache-manager";
import { PrismaService } from "../../../prisma/prisma.service";
import { DashboardWidget } from "@prisma/client";
import {
  KpiData,
  ListData,
  QuickActionsData,
  ResolvedDateRange,
} from "../dto/widget-data.dto";
import { WidgetQueryConfig } from "../entities/dashboard-config.entity";

/**
 * Service for fetching metrics, SLA, activity, and quick action widget data.
 *
 * Extracts metrics-related data fetching logic from WidgetDataService
 * to reduce complexity and enable better testing.
 */
@Injectable()
export class WidgetMetricsDataService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  // Public: Compliance Health Metrics

  /**
   * Computes the overall compliance health score.
   * Score is based on:
   * - Open case ratio (weight: 30%)
   * - SLA compliance rate (weight: 40%)
   * - Campaign completion rate (weight: 30%)
   */
  async computeComplianceHealth(
    organizationId: string,
    dateRange: ResolvedDateRange,
  ): Promise<KpiData> {
    // Get case metrics
    const totalCases = await this.prisma.case.count({
      where: { organizationId },
    });
    const openCases = await this.prisma.case.count({
      where: { organizationId, status: { not: "CLOSED" } },
    });
    const caseScore = totalCases > 0 ? (1 - openCases / totalCases) * 100 : 100;

    // Get SLA metrics (simplified - cases closed in period)
    const closedCases = await this.prisma.case.count({
      where: {
        organizationId,
        status: "CLOSED",
        createdAt: { gte: dateRange.startDate, lte: dateRange.endDate },
      },
    });
    // Simplified SLA - assume 90% compliance
    const slaScore = closedCases > 0 ? 90 : 100;

    // Get campaign completion rate
    const activeAssignments = await this.prisma.campaignAssignment.count({
      where: {
        organizationId,
        campaign: { status: "ACTIVE" },
      },
    });
    const completedAssignments = await this.prisma.campaignAssignment.count({
      where: {
        organizationId,
        campaign: { status: "ACTIVE" },
        status: "COMPLETED",
      },
    });
    const campaignScore =
      activeAssignments > 0
        ? (completedAssignments / activeAssignments) * 100
        : 100;

    // Weighted average
    const healthScore = Math.round(
      caseScore * 0.3 + slaScore * 0.4 + campaignScore * 0.3,
    );

    // Determine status
    const status: "success" | "warning" | "danger" =
      healthScore >= 80 ? "success" : healthScore >= 60 ? "warning" : "danger";

    return {
      type: "kpi",
      value: healthScore,
      label: "Compliance Health",
      status,
    };
  }

  // Public: SLA Metrics

  /**
   * Fetches SLA metrics - counts cases at risk of breaching SLA.
   */
  async fetchSlaMetrics(
    organizationId: string,
    userId: string,
    queryConfig: WidgetQueryConfig | null,
    dateRange: ResolvedDateRange,
  ): Promise<KpiData> {
    const filters = queryConfig?.filters || {};
    const isMyFilter = filters.assignedToMe;

    const whereClause: Record<string, unknown> = {
      organizationId,
      createdAt: {
        gte: dateRange.startDate,
        lte: dateRange.endDate,
      },
      status: { not: "CLOSED" },
    };

    if (isMyFilter) {
      whereClause.assignedTo = { has: userId };
    }

    // Count cases at risk (older than 20 days and still open)
    const atRiskCount = await this.prisma.case.count({
      where: {
        ...whereClause,
        createdAt: { lt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      },
    });

    return {
      type: "kpi",
      value: atRiskCount,
      label: "SLA Alerts",
      status: atRiskCount > 0 ? "danger" : "success",
    };
  }

  // Public: Activity Data

  /**
   * Fetches recent activity from the audit log.
   */
  async fetchActivityData(
    organizationId: string,
    queryConfig: WidgetQueryConfig | null,
    dateRange: ResolvedDateRange,
  ): Promise<ListData> {
    const limit = queryConfig?.limit || 8;

    // Get recent activity from audit log
    const activities = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: dateRange.startDate,
          lte: dateRange.endDate,
        },
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        actionDescription: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        actorUser: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    return {
      type: "list",
      items: activities.map((a) => ({
        id: a.id,
        title: a.actionDescription || a.action,
        subtitle: a.actorUser
          ? `${a.actorUser.firstName} ${a.actorUser.lastName}`
          : "System",
        timestamp: a.createdAt,
        url: `/${a.entityType.toLowerCase()}s/${a.entityId}`,
        icon: this.getActivityIcon(a.action),
      })),
      total: activities.length,
    };
  }

  // Public: Quick Actions

  /**
   * Returns role-appropriate quick actions based on widget configuration.
   */
  getQuickActions(widget: DashboardWidget): QuickActionsData {
    // Return role-appropriate quick actions based on widget title
    const title = widget.title.toLowerCase();

    if (title.includes("board") || title.includes("cco")) {
      return {
        type: "quick_actions",
        actions: [
          {
            id: "generate-report",
            label: "Generate Report",
            icon: "file-text",
            action: "/reports/new",
            enabled: true,
          },
          {
            id: "view-trends",
            label: "View Trends",
            icon: "trending-up",
            action: "/analytics/trends",
            enabled: true,
          },
          {
            id: "export-data",
            label: "Export Data",
            icon: "download",
            action: "/analytics/export",
            enabled: true,
          },
        ],
      };
    }

    if (title.includes("investigator") || title.includes("quick actions")) {
      return {
        type: "quick_actions",
        actions: [
          {
            id: "create-case",
            label: "New Case",
            icon: "plus-circle",
            action: "/cases/new",
            enabled: true,
          },
          {
            id: "my-tasks",
            label: "My Tasks",
            icon: "check-square",
            action: "/tasks",
            enabled: true,
          },
          {
            id: "search",
            label: "Search",
            icon: "search",
            action: "/search",
            enabled: true,
          },
        ],
      };
    }

    if (title.includes("launch") || title.includes("campaign")) {
      return {
        type: "quick_actions",
        actions: [
          {
            id: "new-campaign",
            label: "New Campaign",
            icon: "send",
            action: "/campaigns/new",
            enabled: true,
          },
          {
            id: "send-reminder",
            label: "Send Reminder",
            icon: "bell",
            action: "/campaigns/reminders",
            enabled: true,
          },
          {
            id: "view-responses",
            label: "View Responses",
            icon: "inbox",
            action: "/disclosures",
            enabled: true,
          },
        ],
      };
    }

    return {
      type: "quick_actions",
      actions: [],
    };
  }

  // Private: Helper Methods

  private getActivityIcon(action: string): string {
    const iconMap: Record<string, string> = {
      created: "plus-circle",
      updated: "edit",
      deleted: "trash",
      assigned: "user-plus",
      commented: "message-circle",
      status_changed: "refresh-cw",
      closed: "check-circle",
    };
    return iconMap[action] || "activity";
  }
}
