import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ReportDataSource } from "@prisma/client";
import {
  ColumnDefinition,
  FilterDefinition,
  ReportQueryResult,
} from "./types/report.types";

/**
 * QueryBuilderService
 *
 * Generates and executes Prisma queries from report definitions.
 * Supports:
 * - Dynamic column selection
 * - Various filter operators
 * - Sorting and pagination
 * - Aggregations (groupBy)
 *
 * All queries are automatically scoped to organizationId for tenant isolation.
 */
@Injectable()
export class QueryBuilderService {
  private readonly logger = new Logger(QueryBuilderService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Execute a query based on report parameters.
   * Returns data rows and total count (for pagination).
   */
  async executeQuery(params: {
    organizationId: string;
    dataSource: ReportDataSource;
    columns: ColumnDefinition[];
    filters?: FilterDefinition[];
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    limit?: number;
    offset?: number;
  }): Promise<ReportQueryResult> {
    const model = this.getModelForDataSource(params.dataSource);
    const where = this.buildWhereClause(params.organizationId, params.filters);
    const select = this.buildSelectClause(params.columns);
    const orderBy = params.sortBy
      ? { [params.sortBy]: params.sortOrder || "desc" }
      : { createdAt: "desc" as const };

    this.logger.debug(
      `Executing query on ${model} for org:${params.organizationId}`,
    );

    // Access Prisma delegate dynamically by model name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (this.prisma as any)[model];

    const [data, total] = await Promise.all([
      delegate.findMany({
        where,
        select,
        orderBy,
        take: params.limit || 1000,
        skip: params.offset || 0,
      }),
      delegate.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Execute an aggregation query with grouping.
   * Useful for summary reports (count by status, avg by category, etc.)
   */
  async executeAggregation(params: {
    organizationId: string;
    dataSource: ReportDataSource;
    filters?: FilterDefinition[];
    groupBy: string[];
    aggregations: {
      field: string;
      type: "count" | "sum" | "avg" | "min" | "max";
    }[];
  }): Promise<Record<string, unknown>[]> {
    const model = this.getModelForDataSource(params.dataSource);
    const where = this.buildWhereClause(params.organizationId, params.filters);

    // Build aggregation object for Prisma groupBy
    const aggregationArgs: Record<string, unknown> = {};
    for (const agg of params.aggregations) {
      const aggKey = `_${agg.type}`;
      if (!aggregationArgs[aggKey]) {
        aggregationArgs[aggKey] = {};
      }
      (aggregationArgs[aggKey] as Record<string, boolean>)[agg.field] = true;
    }

    this.logger.debug(
      `Executing aggregation on ${model} grouped by ${params.groupBy.join(", ")}`,
    );

    // Access Prisma delegate dynamically by model name
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (this.prisma as any)[model];

    const result = await delegate.groupBy({
      by: params.groupBy,
      where,
      ...aggregationArgs,
    });

    return result;
  }

  /**
   * Map ReportDataSource enum to Prisma model name.
   */
  private getModelForDataSource(dataSource: ReportDataSource): string {
    const mapping: Record<ReportDataSource, string> = {
      CASES: "case",
      RIUS: "riskIntelligenceUnit",
      INVESTIGATIONS: "investigation",
      DISCLOSURES: "formSubmission", // Disclosure forms are stored as FormSubmissions
      POLICIES: "policy",
      AUDIT_LOGS: "auditLog",
      USERS: "user",
      CAMPAIGNS: "campaign",
    };

    const model = mapping[dataSource];
    if (!model) {
      throw new BadRequestException(
        `Unsupported data source: ${dataSource}. Model may not exist yet.`,
      );
    }

    return model;
  }

  /**
   * Build Prisma where clause from filters.
   * Always includes organizationId for tenant isolation.
   */
  private buildWhereClause(
    organizationId: string,
    filters?: FilterDefinition[],
  ): Record<string, unknown> {
    const where: Record<string, unknown> = { organizationId };

    if (!filters || filters.length === 0) {
      return where;
    }

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
        default:
          this.logger.warn(`Unknown filter operator: ${filter.operator}`);
      }
    }

    return where;
  }

  /**
   * Build Prisma select clause from column definitions.
   * Always includes id for row identification.
   */
  private buildSelectClause(
    columns: ColumnDefinition[],
  ): Record<string, boolean> {
    const select: Record<string, boolean> = { id: true };

    for (const col of columns) {
      // Handle nested fields (e.g., 'category.name')
      if (col.field.includes(".")) {
        const [relation] = col.field.split(".");
        select[relation] = true;
      } else {
        select[col.field] = true;
      }
    }

    return select;
  }
}
