/**
 * ReportExecutionService - Execute saved report configurations against the database
 *
 * Translates report configurations into Prisma queries with proper tenant isolation.
 * Supports:
 * - Simple listing queries with filtering, sorting, pagination
 * - Grouped aggregation queries (COUNT, SUM, AVG)
 * - Relationship field resolution via Prisma includes
 * - Computed fields (e.g., daysOpen)
 *
 * @see QueryToPrismaService for AI query pattern reference
 */

import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

/**
 * Filter condition for report queries
 */
export interface ReportFilter {
  field: string;
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "gte"
    | "lt"
    | "lte"
    | "contains"
    | "in"
    | "notIn"
    | "isNull"
    | "isNotNull"
    | "between";
  value: unknown;
  valueTo?: unknown; // For BETWEEN operator
}

/**
 * Aggregation configuration
 */
export interface ReportAggregation {
  function: "COUNT" | "SUM" | "AVG" | "MIN" | "MAX";
  field?: string; // Optional for COUNT (counts all rows)
}

/**
 * Complete report configuration
 */
export interface ReportConfig {
  entityType: string;
  columns: string[]; // Field IDs to select
  filters: ReportFilter[];
  groupBy?: string[]; // Fields to group by
  aggregation?: ReportAggregation;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  limit?: number;
  offset?: number;
}

/**
 * Column metadata in results
 */
export interface ResultColumn {
  key: string;
  label: string;
  type: string;
}

/**
 * Grouped data point for aggregation results
 */
export interface GroupedDataPoint {
  label: string;
  value: number;
  metadata?: Record<string, unknown>;
}

/**
 * Report execution result
 */
export interface ReportResult {
  columns: ResultColumn[];
  rows: Array<Record<string, unknown>>;
  totalCount: number;
  groupedData?: GroupedDataPoint[];
  summary: {
    totalRows: number;
    executionTimeMs: number;
  };
}

/**
 * Relationship field definition for joined queries
 */
interface RelationshipField {
  relation: string;
  field: string;
}

/**
 * Model name mapping: entityType (API) -> Prisma model name
 */
const ENTITY_MODEL_MAP: Record<string, string> = {
  cases: "case",
  rius: "riskIntelligenceUnit",
  persons: "person",
  campaigns: "campaign",
  policies: "policy",
  disclosures: "disclosureSubmission",
  investigations: "investigation",
};

/**
 * Human-readable labels for entity types
 */
const ENTITY_LABELS: Record<string, string> = {
  cases: "Cases",
  rius: "Risk Intelligence Units",
  persons: "Persons",
  campaigns: "Campaigns",
  policies: "Policies",
  disclosures: "Disclosures",
  investigations: "Investigations",
};

/**
 * Relationship field mappings for joined field resolution
 * Maps field names like "categoryName" to the actual relationship and field
 */
const RELATIONSHIP_MAP: Record<
  string,
  Record<string, RelationshipField>
> = {
  cases: {
    categoryName: { relation: "primaryCategory", field: "name" },
    assigneeName: { relation: "createdBy", field: "firstName" },
    businessUnitName: { relation: "organization", field: "name" },
    createdByName: { relation: "createdBy", field: "firstName" },
    updatedByName: { relation: "updatedBy", field: "firstName" },
  },
  rius: {
    categoryName: { relation: "category", field: "name" },
    createdByName: { relation: "createdBy", field: "firstName" },
  },
  investigations: {
    assigneeName: { relation: "primaryInvestigator", field: "firstName" },
    caseName: { relation: "case", field: "referenceNumber" },
  },
  campaigns: {
    createdByName: { relation: "createdBy", field: "firstName" },
  },
  policies: {
    ownerName: { relation: "owner", field: "firstName" },
    createdByName: { relation: "createdBy", field: "firstName" },
  },
  disclosures: {
    personName: { relation: "person", field: "firstName" },
  },
  persons: {
    businessUnitName: { relation: "businessUnit", field: "name" },
    locationName: { relation: "location", field: "name" },
  },
};

/**
 * Field label mappings for common fields
 */
const FIELD_LABELS: Record<string, string> = {
  id: "ID",
  referenceNumber: "Reference #",
  status: "Status",
  severity: "Severity",
  createdAt: "Created",
  updatedAt: "Updated",
  categoryName: "Category",
  assigneeName: "Assignee",
  businessUnitName: "Business Unit",
  locationName: "Location",
  pipelineStage: "Pipeline Stage",
  outcome: "Outcome",
  type: "Type",
  sourceChannel: "Source",
  reporterType: "Reporter Type",
  details: "Details",
  summary: "Summary",
  name: "Name",
  email: "Email",
  firstName: "First Name",
  lastName: "Last Name",
  daysOpen: "Days Open",
};

/**
 * Field type mappings for common fields
 */
const FIELD_TYPES: Record<string, string> = {
  id: "string",
  referenceNumber: "string",
  status: "enum",
  severity: "enum",
  createdAt: "date",
  updatedAt: "date",
  daysOpen: "number",
  name: "string",
  email: "string",
  details: "string",
  summary: "string",
  type: "enum",
  sourceChannel: "enum",
  reporterType: "enum",
  outcome: "enum",
};

/**
 * Computed fields that are calculated post-query
 */
const COMPUTED_FIELDS = ["daysOpen"];

@Injectable()
export class ReportExecutionService {
  private readonly logger = new Logger(ReportExecutionService.name);

  /** Default pagination limit */
  private readonly DEFAULT_LIMIT = 1000;

  /** Maximum rows allowed in a single query */
  private readonly MAX_LIMIT = 10000;

  /** Slow query threshold (ms) for warning logs */
  private readonly SLOW_QUERY_THRESHOLD_MS = 5000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Execute a report configuration and return formatted results.
   *
   * @param config Report configuration
   * @param organizationId Tenant ID for isolation
   * @returns Report results with columns, rows, and summary
   */
  async runReport(
    config: ReportConfig,
    organizationId: string,
  ): Promise<ReportResult> {
    const startTime = Date.now();

    try {
      // Validate entity type
      const modelName = this.getModelName(config.entityType);
      if (!modelName) {
        throw new BadRequestException(
          `Unknown entity type: ${config.entityType}`,
        );
      }

      // Check if this is a grouped aggregation query
      if (config.groupBy && config.groupBy.length > 0) {
        return this.runGroupedQuery(config, organizationId, startTime);
      }

      // Run standard list query
      return this.runListQuery(config, organizationId, startTime);
    } catch (error) {
      const executionTimeMs = Date.now() - startTime;
      this.logger.error(
        `Report execution failed after ${executionTimeMs}ms: ${error instanceof Error ? error.message : "Unknown error"}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Run a standard list query (no grouping)
   */
  private async runListQuery(
    config: ReportConfig,
    organizationId: string,
    startTime: number,
  ): Promise<ReportResult> {
    const modelName = this.getModelName(config.entityType)!;

    // Build where clause with tenant isolation
    const where = this.buildWhereClause(config.filters, organizationId);

    // Build select/include for columns
    const { select, include } = this.buildSelectInclude(
      config.entityType,
      config.columns,
    );

    // Build orderBy
    const orderBy = config.sortBy
      ? { [config.sortBy]: config.sortOrder || "asc" }
      : undefined;

    // Apply pagination limits
    const take = Math.min(config.limit || this.DEFAULT_LIMIT, this.MAX_LIMIT);
    const skip = config.offset || 0;

    // Execute queries in parallel
    const model = (this.prisma as unknown as Record<string, unknown>)[
      modelName
    ] as {
      findMany: (args: unknown) => Promise<unknown[]>;
      count: (args: { where: Record<string, unknown> }) => Promise<number>;
    };

    const [rows, totalCount] = await Promise.all([
      model.findMany({
        where,
        ...(Object.keys(select).length > 0 && { select }),
        ...(Object.keys(include).length > 0 && { include }),
        ...(orderBy && { orderBy }),
        take,
        skip,
      }) as Promise<Record<string, unknown>[]>,
      model.count({ where }),
    ]);

    // Post-process rows (flatten relationships, compute fields)
    const processedRows = this.postProcessRows(
      rows,
      config.entityType,
      config.columns,
    );

    // Build column metadata
    const columns = this.buildColumnMetadata(config.columns);

    const executionTimeMs = Date.now() - startTime;
    this.logSlowQuery(executionTimeMs, config);

    return {
      columns,
      rows: processedRows,
      totalCount,
      summary: {
        totalRows: processedRows.length,
        executionTimeMs,
      },
    };
  }

  /**
   * Run a grouped aggregation query
   */
  private async runGroupedQuery(
    config: ReportConfig,
    organizationId: string,
    startTime: number,
  ): Promise<ReportResult> {
    const modelName = this.getModelName(config.entityType)!;

    // Build where clause with tenant isolation
    const where = this.buildWhereClause(config.filters, organizationId);

    // Build groupBy fields
    const groupByFields = config.groupBy || [];

    // Determine aggregation
    const aggregation = config.aggregation || { function: "COUNT" };

    // Get the Prisma model
    const model = (this.prisma as unknown as Record<string, unknown>)[
      modelName
    ] as {
      groupBy: (args: unknown) => Promise<unknown[]>;
      count: (args: { where: Record<string, unknown> }) => Promise<number>;
    };

    // Build the aggregation args
    const aggregationArgs: Record<string, unknown> = {};
    if (aggregation.function === "COUNT") {
      aggregationArgs._count = { _all: true };
    } else if (aggregation.field) {
      const aggKey =
        `_${aggregation.function.toLowerCase()}` as "_sum" | "_avg" | "_min" | "_max";
      aggregationArgs[aggKey] = { [aggregation.field]: true };
    }

    // Execute groupBy query
    const groupedResults = (await model.groupBy({
      by: groupByFields,
      where,
      ...aggregationArgs,
      orderBy: groupByFields.map((field) => ({
        [field]: "asc",
      })),
    })) as Array<
      Record<string, unknown> & {
        _count?: { _all: number };
        _sum?: Record<string, number>;
        _avg?: Record<string, number>;
        _min?: Record<string, number>;
        _max?: Record<string, number>;
      }
    >;

    // Transform to groupedData format
    const groupedData: GroupedDataPoint[] = groupedResults.map((row) => {
      // Build label from group by fields
      const labelParts = groupByFields.map((field) => String(row[field] ?? "Unknown"));
      const label = labelParts.join(" / ");

      // Extract value based on aggregation type
      let value = 0;
      if (aggregation.function === "COUNT") {
        value = row._count?._all || 0;
      } else if (aggregation.field) {
        const aggKey =
          `_${aggregation.function.toLowerCase()}` as "_sum" | "_avg" | "_min" | "_max";
        value = (row[aggKey] as Record<string, number>)?.[aggregation.field] || 0;
      }

      // Build metadata from group fields
      const metadata: Record<string, unknown> = {};
      groupByFields.forEach((field) => {
        metadata[field] = row[field];
      });

      return { label, value, metadata };
    });

    // Get total count
    const totalCount = await model.count({ where });

    // Build column metadata for grouped results
    const columns: ResultColumn[] = [
      ...groupByFields.map((field) => ({
        key: field,
        label: FIELD_LABELS[field] || this.toTitleCase(field),
        type: FIELD_TYPES[field] || "string",
      })),
      {
        key: "value",
        label: aggregation.function === "COUNT" ? "Count" : `${aggregation.function}(${aggregation.field})`,
        type: "number",
      },
    ];

    // Build rows from grouped data for table display
    const rows = groupedResults.map((row) => {
      const result: Record<string, unknown> = {};
      groupByFields.forEach((field) => {
        result[field] = row[field];
      });
      if (aggregation.function === "COUNT") {
        result.value = row._count?._all || 0;
      } else if (aggregation.field) {
        const aggKey =
          `_${aggregation.function.toLowerCase()}` as "_sum" | "_avg" | "_min" | "_max";
        result.value = (row[aggKey] as Record<string, number>)?.[aggregation.field] || 0;
      }
      return result;
    });

    const executionTimeMs = Date.now() - startTime;
    this.logSlowQuery(executionTimeMs, config);

    return {
      columns,
      rows,
      totalCount,
      groupedData,
      summary: {
        totalRows: groupedResults.length,
        executionTimeMs,
      },
    };
  }

  /**
   * Get Prisma model name from entity type
   */
  private getModelName(entityType: string): string | undefined {
    return ENTITY_MODEL_MAP[entityType];
  }

  /**
   * Build Prisma where clause from filters with tenant isolation
   */
  private buildWhereClause(
    filters: ReportFilter[],
    organizationId: string,
  ): Record<string, unknown> {
    // Always include organization filter for tenant isolation
    const where: Record<string, unknown> = {
      organizationId,
    };

    for (const filter of filters) {
      // Skip computed fields in where clause
      if (COMPUTED_FIELDS.includes(filter.field)) {
        continue;
      }

      const condition = this.toPrismaCondition(filter);
      if (condition !== undefined) {
        where[filter.field] = condition;
      }
    }

    return where;
  }

  /**
   * Convert a filter to Prisma condition
   */
  private toPrismaCondition(filter: ReportFilter): unknown {
    const { operator, value, valueTo } = filter;

    switch (operator) {
      case "eq":
        return value;

      case "neq":
        return { not: value };

      case "gt":
        return { gt: value };

      case "gte":
        return { gte: value };

      case "lt":
        return { lt: value };

      case "lte":
        return { lte: value };

      case "contains":
        return { contains: String(value), mode: "insensitive" };

      case "in":
        return { in: Array.isArray(value) ? value : [value] };

      case "notIn":
        return { notIn: Array.isArray(value) ? value : [value] };

      case "isNull":
        return null;

      case "isNotNull":
        return { not: null };

      case "between":
        return {
          gte: value,
          lte: valueTo,
        };

      default:
        this.logger.warn(`Unknown filter operator: ${operator}`);
        return undefined;
    }
  }

  /**
   * Build Prisma select and include clauses from columns
   */
  private buildSelectInclude(
    entityType: string,
    columns: string[],
  ): { select: Record<string, unknown>; include: Record<string, unknown> } {
    const select: Record<string, boolean> = {};
    const include: Record<string, unknown> = {};
    const relationships = RELATIONSHIP_MAP[entityType] || {};

    // Always include id and organizationId
    select.id = true;

    for (const column of columns) {
      // Skip computed fields - they are calculated post-query
      if (COMPUTED_FIELDS.includes(column)) {
        // Need createdAt for daysOpen calculation
        if (column === "daysOpen") {
          select.createdAt = true;
        }
        continue;
      }

      // Check if this is a relationship field
      const relationshipDef = relationships[column];
      if (relationshipDef) {
        // Add the relationship to include with nested select
        include[relationshipDef.relation] = {
          select: { [relationshipDef.field]: true },
        };
      } else {
        // Regular field - add to select
        select[column] = true;
      }
    }

    // If we have includes, we can't use select at the same level
    // Instead, we need to include what we want to select too
    if (Object.keys(include).length > 0) {
      // Clear select and use include pattern
      return { select: {}, include: { ...include } };
    }

    return { select, include: {} };
  }

  /**
   * Post-process rows to flatten relationships and compute fields
   */
  private postProcessRows(
    rows: Record<string, unknown>[],
    entityType: string,
    columns: string[],
  ): Array<Record<string, unknown>> {
    const relationships = RELATIONSHIP_MAP[entityType] || {};

    return rows.map((row) => {
      const processed: Record<string, unknown> = { ...row };

      // Flatten relationship fields
      for (const column of columns) {
        const relationshipDef = relationships[column];
        if (relationshipDef) {
          const relationData = row[relationshipDef.relation] as Record<
            string,
            unknown
          > | null;
          processed[column] = relationData?.[relationshipDef.field] ?? null;
          // Remove the nested relation object
          delete processed[relationshipDef.relation];
        }
      }

      // Compute fields
      if (columns.includes("daysOpen")) {
        const createdAt = row.createdAt as Date | string | null;
        if (createdAt) {
          const createdDate =
            createdAt instanceof Date ? createdAt : new Date(createdAt);
          processed.daysOpen = Math.floor(
            (Date.now() - createdDate.getTime()) / 86400000,
          );
        } else {
          processed.daysOpen = null;
        }
      }

      return processed;
    });
  }

  /**
   * Build column metadata from column list
   */
  private buildColumnMetadata(columns: string[]): ResultColumn[] {
    return columns.map((column) => ({
      key: column,
      label: FIELD_LABELS[column] || this.toTitleCase(column),
      type: FIELD_TYPES[column] || "string",
    }));
  }

  /**
   * Convert camelCase to Title Case
   */
  private toTitleCase(str: string): string {
    return str
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }

  /**
   * Log slow queries as warnings
   */
  private logSlowQuery(executionTimeMs: number, config: ReportConfig): void {
    if (executionTimeMs > this.SLOW_QUERY_THRESHOLD_MS) {
      this.logger.warn(
        `Slow report query detected: ${executionTimeMs}ms for ${config.entityType} with ${config.filters.length} filters`,
        {
          entityType: config.entityType,
          filterCount: config.filters.length,
          groupBy: config.groupBy,
          limit: config.limit,
          executionTimeMs,
        },
      );
    }
  }

  /**
   * Get supported entity types
   */
  getSupportedEntityTypes(): Array<{ key: string; label: string }> {
    return Object.entries(ENTITY_LABELS).map(([key, label]) => ({
      key,
      label,
    }));
  }

  /**
   * Get available fields for an entity type
   */
  getAvailableFields(
    entityType: string,
  ): Array<{ key: string; label: string; type: string }> {
    const relationships = RELATIONSHIP_MAP[entityType] || {};
    const relationshipFields = Object.keys(relationships);

    // Combine standard fields with relationship fields
    const allFields = [
      "id",
      "referenceNumber",
      "status",
      "severity",
      "createdAt",
      "updatedAt",
      ...relationshipFields,
      ...COMPUTED_FIELDS,
    ];

    // Filter to unique and return with metadata
    const uniqueFields = [...new Set(allFields)];
    return uniqueFields.map((field) => ({
      key: field,
      label: FIELD_LABELS[field] || this.toTitleCase(field),
      type: FIELD_TYPES[field] || "string",
    }));
  }
}
