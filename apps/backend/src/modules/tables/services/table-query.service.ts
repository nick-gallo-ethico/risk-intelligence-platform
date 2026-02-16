import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserDataTable, Prisma } from "@prisma/client";
import {
  TableColumn,
  TableFilterCriteria,
  TableQueryResult,
  TableDataSource,
} from "../types/table.types";

/**
 * TableQueryService handles table data source query execution.
 *
 * Responsibilities:
 * - Execute queries against data sources
 * - Build Prisma where clauses from filters
 * - Build select clauses from columns
 * - Execute aggregation queries with groupBy
 * - Update cached results
 */
@Injectable()
export class TableQueryService {
  private readonly logger = new Logger(TableQueryService.name);

  // Map string data sources to Prisma model names
  private readonly dataSourceModelMap: Record<TableDataSource, string> = {
    cases: "case",
    investigations: "investigation",
    rius: "riskIntelligenceUnit",
    campaigns: "campaign",
    campaign_assignments: "campaignAssignment",
    disclosures: "formSubmission",
    employees: "employee",
    persons: "person",
    users: "user",
    audit_logs: "auditLog",
  };

  constructor(private prisma: PrismaService) {}

  /**
   * Execute the table query and return results.
   */
  async execute(
    table: UserDataTable,
    organizationId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<TableQueryResult> {
    const columns = table.columns as unknown as TableColumn[];
    const filters = (table.filters as unknown as TableFilterCriteria[]) || [];
    const groupBy = table.groupBy || [];
    const sortBy =
      (table.sortBy as unknown as {
        field: string;
        direction: "asc" | "desc";
      }[]) || [];

    // Use first data source for now (multi-source joins are complex)
    const primarySource = table.dataSources[0] as TableDataSource;
    if (!primarySource) {
      throw new BadRequestException("No data source configured for table");
    }

    const modelName = this.dataSourceModelMap[primarySource];
    if (!modelName) {
      throw new BadRequestException(
        `Unsupported data source: ${primarySource}`,
      );
    }

    // Build query
    const where = this.buildWhereClause(organizationId, filters);
    const select = this.buildSelectClause(columns);
    const orderBy =
      sortBy.length > 0
        ? sortBy.map((s) => ({ [s.field]: s.direction }))
        : [{ createdAt: "desc" as const }];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (this.prisma as any)[modelName];

    if (!delegate) {
      throw new BadRequestException(`Model ${modelName} not found`);
    }

    // Execute query
    if (groupBy.length > 0) {
      // Aggregation query
      const result = await this.executeAggregationQuery(
        delegate,
        where,
        groupBy,
        table.aggregates as unknown as { field: string; function: string }[],
      );

      return {
        data: result,
        total: result.length,
        columns,
        aggregations: result,
      };
    }

    // Standard query with pagination
    const [data, total] = await Promise.all([
      delegate.findMany({
        where,
        select,
        orderBy,
        take: options?.limit || 100,
        skip: options?.offset || 0,
      }),
      delegate.count({ where }),
    ]);

    return { data, total, columns };
  }

  /**
   * Refresh table results and update cache.
   */
  async refreshAndCache(
    tableId: string,
    table: UserDataTable,
    organizationId: string,
  ): Promise<TableQueryResult> {
    const result = await this.execute(table, organizationId);

    // Update cached results
    await this.prisma.userDataTable.update({
      where: { id: tableId },
      data: {
        cachedResults: result.data as unknown as Prisma.InputJsonValue,
        cacheExpiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min cache
        lastExecutedAt: new Date(),
      },
    });

    return result;
  }

  /**
   * Build Prisma where clause from filters.
   */
  buildWhereClause(
    organizationId: string,
    filters: TableFilterCriteria[],
  ): Record<string, unknown> {
    const where: Record<string, unknown> = { organizationId };

    for (const filter of filters) {
      switch (filter.operator) {
        case "eq":
          where[filter.field] = filter.value;
          break;
        case "neq":
          where[filter.field] = { not: filter.value };
          break;
        case "gt":
          where[filter.field] = { gt: filter.value };
          break;
        case "gte":
          where[filter.field] = { gte: filter.value };
          break;
        case "lt":
          where[filter.field] = { lt: filter.value };
          break;
        case "lte":
          where[filter.field] = { lte: filter.value };
          break;
        case "in":
          where[filter.field] = { in: filter.value as unknown[] };
          break;
        case "contains":
          where[filter.field] = { contains: filter.value, mode: "insensitive" };
          break;
        case "between":
          const [min, max] = filter.value as [unknown, unknown];
          where[filter.field] = { gte: min, lte: max };
          break;
        case "isNull":
          where[filter.field] = null;
          break;
        case "isNotNull":
          where[filter.field] = { not: null };
          break;
      }
    }

    return where;
  }

  /**
   * Build Prisma select clause from columns.
   */
  buildSelectClause(columns: TableColumn[]): Record<string, boolean> {
    const select: Record<string, boolean> = { id: true };

    for (const col of columns) {
      if (col.field.includes(".")) {
        // Handle nested fields
        const [relation] = col.field.split(".");
        select[relation] = true;
      } else {
        select[col.field] = true;
      }
    }

    return select;
  }

  /**
   * Execute aggregation query with groupBy.
   */
  private async executeAggregationQuery(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delegate: any,
    where: Record<string, unknown>,
    groupBy: string[],
    aggregates?: { field: string; function: string }[],
  ): Promise<Record<string, unknown>[]> {
    const aggArgs: Record<string, unknown> = {};

    if (aggregates) {
      for (const agg of aggregates) {
        const key = `_${agg.function}`;
        if (!aggArgs[key]) {
          aggArgs[key] = {};
        }
        (aggArgs[key] as Record<string, boolean>)[agg.field] = true;
      }
    }

    // Always include count
    if (!aggArgs["_count"]) {
      aggArgs["_count"] = { _all: true };
    }

    return delegate.groupBy({
      by: groupBy,
      where,
      ...aggArgs,
    });
  }
}
