import { Injectable, Logger } from "@nestjs/common";
import {
  Prisma,
  PolicyCaseLinkType,
  PolicyType,
  CaseStatus,
} from "@prisma/client";
import { PrismaService } from "../../../prisma/prisma.service";
import { ViolationStatItem } from "../dto/association.dto";

/**
 * Trend data point for violation statistics.
 */
export interface ViolationTrendDataPoint {
  period: string;
  violationCount: number;
  policyBreakdown: Array<{
    policyId: string;
    policyTitle: string;
    count: number;
  }>;
}

/**
 * Category breakdown for violations.
 */
export interface ViolationCategoryBreakdown {
  policyType: PolicyType;
  violationCount: number;
  policies: Array<{
    policyId: string;
    policyTitle: string;
    count: number;
  }>;
}

/**
 * Summary of violation analytics.
 */
export interface ViolationSummary {
  totalViolations: number;
  openCaseViolations: number;
  closedCaseViolations: number;
  topViolatedPolicy: {
    policyId: string;
    policyTitle: string;
    violationCount: number;
  } | null;
  violationsByPolicyType: Record<PolicyType, number>;
}

/**
 * Service for violation analytics and reporting.
 *
 * Provides:
 * - Violation statistics aggregated by policy
 * - Violation breakdown by policy category/type
 * - Violation trend analysis over time periods
 * - Summary metrics for compliance dashboards
 */
@Injectable()
export class ViolationAnalyticsService {
  private readonly logger = new Logger(ViolationAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns violation statistics aggregated by policy.
   * Useful for compliance dashboards to identify frequently violated policies.
   */
  async getViolationStats(
    organizationId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      policyType?: PolicyType;
    },
  ): Promise<ViolationStatItem[]> {
    const where = this.buildViolationWhereClause(organizationId, filters);

    // Get aggregated violations
    const violations = await this.prisma.policyCaseAssociation.groupBy({
      by: ["policyId"],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: "desc",
        },
      },
    });

    // Fetch policy details for the aggregated results
    if (violations.length === 0) {
      return [];
    }

    const policyIds = violations.map((v) => v.policyId);
    const policies = await this.prisma.policy.findMany({
      where: {
        id: { in: policyIds },
        organizationId,
      },
      select: {
        id: true,
        title: true,
        policyType: true,
      },
    });

    const policyMap = new Map(policies.map((p) => [p.id, p]));

    return violations
      .map((v) => {
        const policy = policyMap.get(v.policyId);
        if (!policy) return null;

        return {
          policyId: v.policyId,
          policyTitle: policy.title,
          policyType: policy.policyType,
          violationCount: v._count.id,
        };
      })
      .filter((item): item is ViolationStatItem => item !== null);
  }

  /**
   * Returns violations grouped by policy type/category.
   * Useful for understanding which policy categories are most frequently violated.
   */
  async getViolationsByCategory(
    organizationId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<ViolationCategoryBreakdown[]> {
    const where = this.buildViolationWhereClause(organizationId, filters);

    // Get all violations with policy info
    const associations = await this.prisma.policyCaseAssociation.findMany({
      where,
      select: {
        policyId: true,
        policy: {
          select: {
            id: true,
            title: true,
            policyType: true,
          },
        },
      },
    });

    // Group by policy type
    const categoryMap = new Map<
      PolicyType,
      {
        violationCount: number;
        policyBreakdown: Map<
          string,
          { policyId: string; policyTitle: string; count: number }
        >;
      }
    >();

    for (const assoc of associations) {
      const policyType = assoc.policy.policyType;

      if (!categoryMap.has(policyType)) {
        categoryMap.set(policyType, {
          violationCount: 0,
          policyBreakdown: new Map(),
        });
      }

      const category = categoryMap.get(policyType)!;
      category.violationCount++;

      if (!category.policyBreakdown.has(assoc.policyId)) {
        category.policyBreakdown.set(assoc.policyId, {
          policyId: assoc.policyId,
          policyTitle: assoc.policy.title,
          count: 0,
        });
      }
      category.policyBreakdown.get(assoc.policyId)!.count++;
    }

    // Convert to array and sort by violation count
    return Array.from(categoryMap.entries())
      .map(([policyType, data]) => ({
        policyType,
        violationCount: data.violationCount,
        policies: Array.from(data.policyBreakdown.values()).sort(
          (a, b) => b.count - a.count,
        ),
      }))
      .sort((a, b) => b.violationCount - a.violationCount);
  }

  /**
   * Returns violation trends over time periods.
   * Supports monthly or quarterly aggregation.
   */
  async getViolationTrends(
    organizationId: string,
    options: {
      startDate: Date;
      endDate: Date;
      periodType: "monthly" | "quarterly";
      policyType?: PolicyType;
    },
  ): Promise<ViolationTrendDataPoint[]> {
    const where = this.buildViolationWhereClause(organizationId, {
      startDate: options.startDate,
      endDate: options.endDate,
      policyType: options.policyType,
    });

    // Get all violations in date range
    const associations = await this.prisma.policyCaseAssociation.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        policyId: true,
        policy: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by period
    const periodMap = new Map<
      string,
      {
        violationCount: number;
        policyBreakdown: Map<
          string,
          { policyId: string; policyTitle: string; count: number }
        >;
      }
    >();

    for (const assoc of associations) {
      const period = this.getPeriodKey(assoc.createdAt, options.periodType);

      if (!periodMap.has(period)) {
        periodMap.set(period, {
          violationCount: 0,
          policyBreakdown: new Map(),
        });
      }

      const periodData = periodMap.get(period)!;
      periodData.violationCount++;

      if (!periodData.policyBreakdown.has(assoc.policyId)) {
        periodData.policyBreakdown.set(assoc.policyId, {
          policyId: assoc.policyId,
          policyTitle: assoc.policy.title,
          count: 0,
        });
      }
      periodData.policyBreakdown.get(assoc.policyId)!.count++;
    }

    // Generate all periods in range (including zeros)
    const allPeriods = this.generatePeriodKeys(
      options.startDate,
      options.endDate,
      options.periodType,
    );

    return allPeriods.map((period) => {
      const data = periodMap.get(period);
      return {
        period,
        violationCount: data?.violationCount ?? 0,
        policyBreakdown: data
          ? Array.from(data.policyBreakdown.values()).sort(
              (a, b) => b.count - a.count,
            )
          : [],
      };
    });
  }

  /**
   * Returns a summary of violation analytics.
   * Useful for dashboard overview cards.
   */
  async getViolationSummary(
    organizationId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<ViolationSummary> {
    const where = this.buildViolationWhereClause(organizationId, filters);

    // Get total violations
    const totalViolations = await this.prisma.policyCaseAssociation.count({
      where,
    });

    // Get violations by case status (NEW and OPEN are considered "open" cases)
    const [openViolations, closedViolations] = await Promise.all([
      this.prisma.policyCaseAssociation.count({
        where: {
          ...where,
          case: {
            status: { in: [CaseStatus.NEW, CaseStatus.OPEN] },
          },
        },
      }),
      this.prisma.policyCaseAssociation.count({
        where: {
          ...where,
          case: {
            status: CaseStatus.CLOSED,
          },
        },
      }),
    ]);

    // Get top violated policy
    const topStats = await this.getViolationStats(organizationId, filters);
    const topPolicy = topStats.length > 0 ? topStats[0] : null;

    // Get violations by policy type
    const violationsByType: Record<PolicyType, number> = {} as Record<
      PolicyType,
      number
    >;
    for (const policyType of Object.values(PolicyType)) {
      violationsByType[policyType] = 0;
    }

    const byCategory = await this.getViolationsByCategory(
      organizationId,
      filters,
    );
    for (const category of byCategory) {
      violationsByType[category.policyType] = category.violationCount;
    }

    return {
      totalViolations,
      openCaseViolations: openViolations,
      closedCaseViolations: closedViolations,
      topViolatedPolicy: topPolicy
        ? {
            policyId: topPolicy.policyId,
            policyTitle: topPolicy.policyTitle,
            violationCount: topPolicy.violationCount,
          }
        : null,
      violationsByPolicyType: violationsByType,
    };
  }

  /**
   * Builds the where clause for violation queries.
   */
  private buildViolationWhereClause(
    organizationId: string,
    filters?: {
      startDate?: Date;
      endDate?: Date;
      policyType?: PolicyType;
    },
  ): Prisma.PolicyCaseAssociationWhereInput {
    const where: Prisma.PolicyCaseAssociationWhereInput = {
      organizationId,
      linkType: PolicyCaseLinkType.VIOLATION,
    };

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    if (filters?.policyType) {
      where.policy = {
        policyType: filters.policyType,
      };
    }

    return where;
  }

  /**
   * Gets the period key for a date based on period type.
   */
  private getPeriodKey(
    date: Date,
    periodType: "monthly" | "quarterly",
  ): string {
    const year = date.getFullYear();

    if (periodType === "monthly") {
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      return `${year}-${month}`;
    }

    // Quarterly
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    return `${year}-Q${quarter}`;
  }

  /**
   * Generates all period keys between start and end dates.
   */
  private generatePeriodKeys(
    startDate: Date,
    endDate: Date,
    periodType: "monthly" | "quarterly",
  ): string[] {
    const periods: string[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      periods.push(this.getPeriodKey(current, periodType));

      if (periodType === "monthly") {
        current.setMonth(current.getMonth() + 1);
      } else {
        current.setMonth(current.getMonth() + 3);
      }
    }

    return periods;
  }
}
