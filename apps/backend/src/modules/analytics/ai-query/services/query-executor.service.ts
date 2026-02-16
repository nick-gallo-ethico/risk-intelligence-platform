import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { QueryToPrismaService } from "../query-to-prisma.service";
import {
  VisualizationType,
  QueryIntent,
  ParsedQuery,
  QueryResultData,
  KpiResultData,
  TableResultData,
  ChartResultData,
} from "../dto/ai-query.dto";
import { getDynamicPrismaModel } from "../../../../common/types/prisma.types";

/**
 * QueryExecutorService handles database query execution for AI-powered analytics.
 *
 * Responsibilities:
 * - Execute queries based on intent type (COUNT, LIST, DISTRIBUTION, etc.)
 * - Run Prisma queries with tenant isolation
 * - Handle pagination and aggregations
 * - Determine appropriate visualization type
 *
 * SECURITY:
 * - All queries are scoped by organizationId (tenant isolation)
 * - Uses QueryToPrismaService for field validation
 */
@Injectable()
export class QueryExecutorService {
  private readonly logger = new Logger(QueryExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queryToPrisma: QueryToPrismaService,
  ) {}

  /**
   * Execute query based on intent type.
   *
   * @param parsedQuery - Structured query from parser
   * @param organizationId - Tenant organization ID
   * @param limit - Maximum results to return
   * @returns Query data and suggested visualization type
   */
  async executeQueryByIntent(
    parsedQuery: ParsedQuery,
    organizationId: string,
    limit?: number,
  ): Promise<{ data: QueryResultData; visualizationType: VisualizationType }> {
    const modelName = this.queryToPrisma.getPrismaModelName(
      parsedQuery.entityType,
    );
    const queryArgs = this.queryToPrisma.buildPrismaQueryArgs(
      parsedQuery,
      organizationId,
    );

    switch (parsedQuery.intent) {
      case QueryIntent.COUNT:
        return this.executeCountQuery(modelName, queryArgs, parsedQuery);

      case QueryIntent.LIST:
        return this.executeListQuery(
          modelName,
          queryArgs,
          parsedQuery,
          limit || parsedQuery.limit || 50,
        );

      case QueryIntent.DISTRIBUTION:
        return this.executeDistributionQuery(modelName, queryArgs, parsedQuery);

      case QueryIntent.TREND:
        return this.executeTrendQuery(modelName, queryArgs, parsedQuery);

      case QueryIntent.AGGREGATE:
        return this.executeAggregateQuery(modelName, queryArgs, parsedQuery);

      case QueryIntent.COMPARISON:
        return this.executeComparisonQuery(modelName, queryArgs, parsedQuery);

      default:
        return this.executeListQuery(
          modelName,
          queryArgs,
          parsedQuery,
          limit || 50,
        );
    }
  }

  /**
   * Execute COUNT query - returns single number.
   */
  private async executeCountQuery(
    modelName: string,
    queryArgs: { where: Record<string, unknown> },
    parsedQuery: ParsedQuery,
  ): Promise<{ data: KpiResultData; visualizationType: VisualizationType }> {
    const count = await getDynamicPrismaModel(this.prisma, modelName).count({
      where: queryArgs.where,
    });

    // Get previous period count for comparison if date range specified
    let previousValue: number | undefined;
    let changePercent: number | undefined;
    let changeDirection: "up" | "down" | "unchanged" | undefined;

    if (parsedQuery.dateRange) {
      const start = new Date(parsedQuery.dateRange.start);
      const end = new Date(parsedQuery.dateRange.end);
      const duration = end.getTime() - start.getTime();

      const previousWhere = {
        ...queryArgs.where,
        [parsedQuery.dateRange.field]: {
          gte: new Date(start.getTime() - duration),
          lt: start,
        },
      };

      previousValue = await getDynamicPrismaModel(this.prisma, modelName).count(
        {
          where: previousWhere,
        },
      );

      if (previousValue !== undefined && previousValue > 0) {
        changePercent = ((count - previousValue) / previousValue) * 100;
        changeDirection =
          changePercent > 0 ? "up" : changePercent < 0 ? "down" : "unchanged";
      }
    }

    return {
      data: {
        type: "kpi",
        value: count,
        label: `Total ${parsedQuery.entityType}s`,
        previousValue,
        changePercent: changePercent
          ? Math.round(changePercent * 10) / 10
          : undefined,
        changeDirection,
        format: "number",
      },
      visualizationType: VisualizationType.KPI,
    };
  }

  /**
   * Execute LIST query - returns table of records.
   */
  private async executeListQuery(
    modelName: string,
    queryArgs: {
      where: Record<string, unknown>;
      orderBy?: Array<Record<string, "asc" | "desc">>;
    },
    parsedQuery: ParsedQuery,
    limit: number,
  ): Promise<{ data: TableResultData; visualizationType: VisualizationType }> {
    const [records, totalCount] = await Promise.all([
      getDynamicPrismaModel(this.prisma, modelName).findMany({
        where: queryArgs.where,
        orderBy: queryArgs.orderBy || [{ createdAt: "desc" }],
        take: Math.min(limit, 1000),
      }),
      getDynamicPrismaModel(this.prisma, modelName).count({
        where: queryArgs.where,
      }),
    ]);

    // Build columns from select fields or all available fields
    const fields =
      parsedQuery.selectFields ||
      this.queryToPrisma.getAllowedFields(parsedQuery.entityType).slice(0, 8);

    const columns = fields.map((field) => ({
      key: field,
      label: this.formatFieldLabel(field),
      dataType: this.inferDataType(field) as
        | "string"
        | "number"
        | "date"
        | "boolean",
      sortable: true,
    }));

    // Filter records to only include allowed fields
    const rows = records.map((record: Record<string, unknown>) => {
      const row: Record<string, unknown> = {};
      for (const field of fields) {
        row[field] = record[field];
      }
      return row;
    });

    return {
      data: {
        type: "table",
        columns,
        rows,
        totalCount,
        pageSize: limit,
      },
      visualizationType: VisualizationType.TABLE,
    };
  }

  /**
   * Execute DISTRIBUTION query - returns grouped counts.
   */
  private async executeDistributionQuery(
    modelName: string,
    queryArgs: { where: Record<string, unknown> },
    parsedQuery: ParsedQuery,
  ): Promise<{ data: ChartResultData; visualizationType: VisualizationType }> {
    const groupField = parsedQuery.groupBy?.[0]?.field || "status";

    // Use Prisma groupBy for distribution
    const results = await getDynamicPrismaModel(this.prisma, modelName).groupBy(
      {
        by: [groupField],
        where: queryArgs.where,
        _count: true,
        orderBy: {
          _count: {
            [groupField]: "desc",
          },
        },
      },
    );

    const data: ChartResultData = {
      type: "chart",
      chartType: "pie",
      title: `${this.formatFieldLabel(parsedQuery.entityType)} by ${this.formatFieldLabel(groupField)}`,
      series: [
        {
          name: this.formatFieldLabel(groupField),
          data: results.map(
            (r: Record<string, unknown> & { _count: number }) => ({
              label: String(r[groupField] || "Unknown"),
              value: r._count,
            }),
          ),
        },
      ],
    };

    // Use bar chart for many categories, pie for few
    const visualizationType =
      results.length > 6
        ? VisualizationType.BAR_CHART
        : VisualizationType.PIE_CHART;

    return { data, visualizationType };
  }

  /**
   * Execute TREND query - returns time series data.
   */
  private async executeTrendQuery(
    modelName: string,
    queryArgs: { where: Record<string, unknown> },
    parsedQuery: ParsedQuery,
  ): Promise<{ data: ChartResultData; visualizationType: VisualizationType }> {
    // For trend queries, we need to group by time periods
    // This is a simplified version - in production, use raw SQL for date truncation
    const dateField = parsedQuery.dateRange?.field || "createdAt";
    const dateTrunc = parsedQuery.groupBy?.[0]?.dateTrunc || "month";

    const results = await getDynamicPrismaModel(
      this.prisma,
      modelName,
    ).findMany({
      where: queryArgs.where,
      select: {
        [dateField]: true,
      },
      orderBy: {
        [dateField]: "asc",
      },
    });

    // Group by time period
    const groupedData = this.groupByTimePeriod(
      results as Array<Record<string, unknown>>,
      dateField,
      dateTrunc,
    );

    return {
      data: {
        type: "chart",
        chartType: "line",
        title: `${this.formatFieldLabel(parsedQuery.entityType)} trend`,
        series: [
          {
            name: `${this.formatFieldLabel(parsedQuery.entityType)}s`,
            data: groupedData,
          },
        ],
        xAxisLabel: "Date",
        yAxisLabel: "Count",
      },
      visualizationType: VisualizationType.LINE_CHART,
    };
  }

  /**
   * Execute AGGREGATE query - returns computed values.
   */
  private async executeAggregateQuery(
    modelName: string,
    queryArgs: { where: Record<string, unknown> },
    parsedQuery: ParsedQuery,
  ): Promise<{ data: KpiResultData; visualizationType: VisualizationType }> {
    const aggregation = parsedQuery.aggregations?.[0];
    if (!aggregation) {
      // Default to count
      return this.executeCountQuery(modelName, queryArgs, parsedQuery);
    }

    // Build aggregation query
    switch (aggregation.function) {
      case "count":
        const count = await getDynamicPrismaModel(this.prisma, modelName).count(
          {
            where: queryArgs.where,
          },
        );
        return {
          data: {
            type: "kpi",
            value: count,
            label: aggregation.alias || "Count",
            format: "number",
          },
          visualizationType: VisualizationType.KPI,
        };

      case "avg":
      case "sum":
      case "min":
      case "max":
        if (!aggregation.field) {
          throw new BadRequestException(
            `Aggregation ${aggregation.function} requires a field`,
          );
        }
        const result = (await getDynamicPrismaModel(
          this.prisma,
          modelName,
        ).aggregate({
          where: queryArgs.where,
          [`_${aggregation.function}`]: {
            [aggregation.field]: true,
          },
        })) as Record<string, Record<string, number> | undefined>;
        const value =
          result[`_${aggregation.function}`]?.[aggregation.field] || 0;
        return {
          data: {
            type: "kpi",
            value,
            label:
              aggregation.alias ||
              `${aggregation.function}(${aggregation.field})`,
            format: "number",
          },
          visualizationType: VisualizationType.KPI,
        };

      default:
        return this.executeCountQuery(modelName, queryArgs, parsedQuery);
    }
  }

  /**
   * Execute COMPARISON query - compares multiple groups.
   */
  private async executeComparisonQuery(
    modelName: string,
    queryArgs: { where: Record<string, unknown> },
    parsedQuery: ParsedQuery,
  ): Promise<{ data: ChartResultData; visualizationType: VisualizationType }> {
    // Similar to distribution but formatted for comparison
    const result = await this.executeDistributionQuery(
      modelName,
      queryArgs,
      parsedQuery,
    );

    // Force bar chart for comparisons
    return {
      data: { ...result.data, chartType: "bar" },
      visualizationType: VisualizationType.BAR_CHART,
    };
  }

  /**
   * Group records by time period for trend analysis.
   */
  private groupByTimePeriod(
    records: Array<Record<string, unknown>>,
    dateField: string,
    period: "day" | "week" | "month" | "quarter" | "year",
  ): Array<{ label: string; value: number }> {
    const groups = new Map<string, number>();

    for (const record of records) {
      const date = new Date(record[dateField] as string);
      const key = this.formatDateForPeriod(date, period);
      groups.set(key, (groups.get(key) || 0) + 1);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value }));
  }

  /**
   * Format date for grouping period.
   */
  private formatDateForPeriod(
    date: Date,
    period: "day" | "week" | "month" | "quarter" | "year",
  ): string {
    const year = date.getFullYear();
    const month = date.getMonth();

    switch (period) {
      case "day":
        return date.toISOString().slice(0, 10);
      case "week":
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return `Week of ${startOfWeek.toISOString().slice(0, 10)}`;
      case "month":
        return `${year}-${String(month + 1).padStart(2, "0")}`;
      case "quarter":
        return `${year} Q${Math.floor(month / 3) + 1}`;
      case "year":
        return String(year);
      default:
        return date.toISOString().slice(0, 10);
    }
  }

  /**
   * Format field name as label.
   */
  private formatFieldLabel(field: string): string {
    return field
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/Id$/, "")
      .trim();
  }

  /**
   * Infer data type from field name.
   */
  private inferDataType(field: string): string {
    if (field.endsWith("At") || field.includes("Date")) {
      return "date";
    }
    if (field.endsWith("Count") || field === "value") {
      return "number";
    }
    if (field.startsWith("is") || field.startsWith("has")) {
      return "boolean";
    }
    return "string";
  }
}
