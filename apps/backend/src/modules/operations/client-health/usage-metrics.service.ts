/**
 * Usage Metrics Service
 *
 * Collects and stores daily usage metrics for health score calculation.
 * Aggregates login, case, campaign, and support ticket data per tenant per day.
 *
 * @see health-metrics.types.ts for metric definitions
 * @see RESEARCH.md for collection patterns
 */

import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { subDays, startOfDay, endOfDay } from "date-fns";

/**
 * Login metrics for health score calculation.
 */
export interface LoginMetrics {
  /** Number of users who logged in within the period */
  activeUsers: number;
  /** Total number of enabled users */
  totalUsers: number;
}

/**
 * Case metrics for health score calculation.
 */
export interface CaseMetrics {
  /** Cases created in the period */
  casesCreated: number;
  /** Cases closed in the period */
  casesClosed: number;
  /** Cases closed with investigation on-time (SLA compliant) */
  casesOnTime: number;
  /** Cases currently overdue (open with breached SLA) */
  casesOverdue: number;
}

/**
 * Campaign metrics for health score calculation.
 */
export interface CampaignMetrics {
  /** Number of active campaigns */
  campaignsActive: number;
  /** Total campaign assignments */
  assignmentsTotal: number;
  /** Completed campaign assignments */
  assignmentsCompleted: number;
}

@Injectable()
export class UsageMetricsService {
  private readonly logger = new Logger(UsageMetricsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Collect and store daily usage metrics for a tenant.
   * Upserts to handle recalculation for the same date.
   *
   * @param organizationId - Tenant ID
   * @param forDate - Date to collect metrics for (defaults to today)
   */
  async collectDailyMetrics(
    organizationId: string,
    forDate: Date = new Date(),
  ): Promise<void> {
    const dateStart = startOfDay(forDate);
    const dateEnd = endOfDay(forDate);
    const thirtyDaysAgo = subDays(forDate, 30);

    // Collect all metrics in parallel for efficiency
    const [login, cases, campaigns, support] = await Promise.all([
      this.getLoginMetrics(organizationId, thirtyDaysAgo, forDate),
      this.getCaseMetrics(organizationId, dateStart, dateEnd),
      this.getCampaignMetrics(organizationId),
      this.getSupportTicketCount(organizationId, thirtyDaysAgo, forDate),
    ]);

    // Upsert daily metrics record
    await this.prisma.usageMetric.upsert({
      where: {
        organizationId_metricDate: {
          organizationId,
          metricDate: dateStart,
        },
      },
      create: {
        organizationId,
        metricDate: dateStart,
        activeUsers: login.activeUsers,
        totalUsers: login.totalUsers,
        casesCreated: cases.casesCreated,
        casesClosed: cases.casesClosed,
        casesOnTime: cases.casesOnTime,
        casesOverdue: cases.casesOverdue,
        campaignsActive: campaigns.campaignsActive,
        assignmentsTotal: campaigns.assignmentsTotal,
        assignmentsCompleted: campaigns.assignmentsCompleted,
        supportTickets: support,
      },
      update: {
        activeUsers: login.activeUsers,
        totalUsers: login.totalUsers,
        casesCreated: cases.casesCreated,
        casesClosed: cases.casesClosed,
        casesOnTime: cases.casesOnTime,
        casesOverdue: cases.casesOverdue,
        campaignsActive: campaigns.campaignsActive,
        assignmentsTotal: campaigns.assignmentsTotal,
        assignmentsCompleted: campaigns.assignmentsCompleted,
        supportTickets: support,
      },
    });

    this.logger.debug(
      `Collected metrics for org ${organizationId} on ${dateStart.toISOString()}`,
    );
  }

  /**
   * Get login metrics for a period.
   * Active users = users who logged in within the period.
   *
   * @param organizationId - Tenant ID
   * @param startDate - Period start
   * @param endDate - Period end
   * @returns Login metrics
   */
  async getLoginMetrics(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<LoginMetrics> {
    const [activeUsers, totalUsers] = await Promise.all([
      this.prisma.user.count({
        where: {
          organizationId,
          lastLoginAt: { gte: startDate, lte: endDate },
          isActive: true,
        },
      }),
      this.prisma.user.count({
        where: {
          organizationId,
          isActive: true,
        },
      }),
    ]);

    return { activeUsers, totalUsers };
  }

  /**
   * Get case metrics for a period.
   * Uses Case status for created/closed, Investigation slaStatus for on-time/overdue.
   *
   * @param organizationId - Tenant ID
   * @param startDate - Period start
   * @param endDate - Period end
   * @returns Case metrics
   */
  async getCaseMetrics(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CaseMetrics> {
    const [created, closed, closedWithInvestigations, overdue] =
      await Promise.all([
        // Cases created in period
        this.prisma.case.count({
          where: {
            organizationId,
            createdAt: { gte: startDate, lte: endDate },
          },
        }),

        // Cases closed in period (status = CLOSED)
        this.prisma.case.count({
          where: {
            organizationId,
            status: "CLOSED",
            updatedAt: { gte: startDate, lte: endDate },
          },
        }),

        // Cases closed with investigations that were on-time
        // A case is "on-time" if its primary investigation was ON_TRACK or WARNING when closed
        this.prisma.case.count({
          where: {
            organizationId,
            status: "CLOSED",
            updatedAt: { gte: startDate, lte: endDate },
            investigations: {
              some: {
                slaStatus: { in: ["ON_TRACK", "WARNING"] },
              },
            },
          },
        }),

        // Cases currently open with overdue investigations
        this.prisma.case.count({
          where: {
            organizationId,
            status: { in: ["NEW", "OPEN"] },
            investigations: {
              some: {
                slaStatus: "OVERDUE",
              },
            },
          },
        }),
      ]);

    return {
      casesCreated: created,
      casesClosed: closed,
      casesOnTime: closedWithInvestigations,
      casesOverdue: overdue,
    };
  }

  /**
   * Get campaign metrics (current state).
   * Counts active campaigns and assignment completion rates.
   *
   * @param organizationId - Tenant ID
   * @returns Campaign metrics
   */
  async getCampaignMetrics(organizationId: string): Promise<CampaignMetrics> {
    const [activeCampaigns, assignmentStats] = await Promise.all([
      this.prisma.campaign.count({
        where: {
          organizationId,
          status: "ACTIVE",
        },
      }),
      this.prisma.campaignAssignment.groupBy({
        by: ["status"],
        where: {
          organizationId,
        },
        _count: true,
      }),
    ]);

    const total = assignmentStats.reduce((sum, s) => sum + s._count, 0);
    const completed =
      assignmentStats.find((s) => s.status === "COMPLETED")?._count || 0;

    return {
      campaignsActive: activeCampaigns,
      assignmentsTotal: total,
      assignmentsCompleted: completed,
    };
  }

  /**
   * Get support ticket count for a period.
   * Placeholder for integration with external support system.
   *
   * @param organizationId - Tenant ID
   * @param startDate - Period start
   * @param endDate - Period end
   * @returns Number of support tickets
   */
  async getSupportTicketCount(
    organizationId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<number> {
    // TODO: Integrate with actual support system (Zendesk, Intercom, etc.)
    // For now, return 0 as placeholder
    // The supportTickets field can be updated via API when integration is ready
    this.logger.debug(
      `Support ticket count requested for org ${organizationId} (${startDate.toISOString()} - ${endDate.toISOString()}) - returning 0 (placeholder)`,
    );
    return 0;
  }

  /**
   * Get historical usage metrics for a tenant.
   *
   * @param organizationId - Tenant ID
   * @param days - Number of days of history (default 30)
   * @returns Array of daily metrics
   */
  async getMetricsHistory(organizationId: string, days: number = 30) {
    const startDate = subDays(new Date(), days);
    return this.prisma.usageMetric.findMany({
      where: {
        organizationId,
        metricDate: { gte: startDate },
      },
      orderBy: { metricDate: "asc" },
    });
  }
}
