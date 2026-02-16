import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import {
  QueryEntityType,
  QueryFilter,
  FilterOperator,
  QuerySort,
  QueryGroupBy,
  ParsedQuery,
  DateRangePreset,
} from "../dto/ai-query.dto";
import {
  FieldWhitelistService,
  FieldDefinition,
} from "./field-whitelist.service";

/**
 * PrismaQueryBuilderService builds safe Prisma queries from AI-parsed structures.
 *
 * Features:
 * - WHERE clause construction with field validation
 * - ORDER BY construction
 * - GROUP BY construction
 * - Date range parsing and handling
 * - Type coercion for Prisma compatibility
 *
 * SECURITY: All field access is validated via FieldWhitelistService.
 */
@Injectable()
export class PrismaQueryBuilderService {
  private readonly logger = new Logger(PrismaQueryBuilderService.name);

  constructor(private readonly fieldWhitelist: FieldWhitelistService) {}

  /**
   * Get the Prisma model name for an entity type.
   */
  getPrismaModelName(entityType: QueryEntityType): string {
    const modelNames: Record<QueryEntityType, string> = {
      [QueryEntityType.CASE]: "case",
      [QueryEntityType.RIU]: "riskIntelligenceUnit",
      [QueryEntityType.CAMPAIGN]: "campaign",
      [QueryEntityType.PERSON]: "person",
      [QueryEntityType.DISCLOSURE]: "disclosureSubmission",
      [QueryEntityType.INVESTIGATION]: "investigation",
    };
    return modelNames[entityType];
  }

  /**
   * Build Prisma where clause from parsed query filters.
   * SECURITY: All field names are validated against whitelist.
   */
  buildWhereClause(
    entityType: QueryEntityType,
    filters: QueryFilter[],
    organizationId: string,
  ): Record<string, unknown> {
    // Always include organization filter for tenant isolation
    const where: Record<string, unknown> = {
      organizationId,
    };

    for (const filter of filters) {
      const fieldDef = this.fieldWhitelist.validateField(
        entityType,
        filter.field,
        "filter",
      );
      const prismaField = fieldDef.prismaField;
      const condition = this.toPrismaCondition(filter, fieldDef);

      if (condition !== undefined) {
        where[prismaField] = condition;
      }
    }

    return where;
  }

  /**
   * Build Prisma orderBy from parsed query.
   */
  buildOrderBy(
    entityType: QueryEntityType,
    orderBy?: QuerySort[],
  ): Array<Record<string, "asc" | "desc">> | undefined {
    if (!orderBy || orderBy.length === 0) {
      return undefined;
    }

    return orderBy.map((sort) => {
      const fieldDef = this.fieldWhitelist.validateField(
        entityType,
        sort.field,
        "sort",
      );
      return { [fieldDef.prismaField]: sort.direction };
    });
  }

  /**
   * Build groupBy fields from parsed query.
   */
  buildGroupBy(
    entityType: QueryEntityType,
    groupBy?: QueryGroupBy[],
  ): string[] | undefined {
    if (!groupBy || groupBy.length === 0) {
      return undefined;
    }

    return groupBy.map((group) => {
      const fieldDef = this.fieldWhitelist.validateField(
        entityType,
        group.field,
        "group",
      );
      return fieldDef.prismaField;
    });
  }

  /**
   * Parse date range preset into start/end dates.
   */
  parseTimeRange(
    preset?: DateRangePreset,
    customStart?: string,
    customEnd?: string,
  ): { start: Date; end: Date } | undefined {
    if (!preset) {
      return undefined;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start: Date;
    let end: Date = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1); // End of today

    switch (preset) {
      case DateRangePreset.TODAY:
        start = today;
        break;

      case DateRangePreset.YESTERDAY:
        start = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        end = new Date(today.getTime() - 1);
        break;

      case DateRangePreset.LAST_7_DAYS:
        start = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;

      case DateRangePreset.LAST_30_DAYS:
        start = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;

      case DateRangePreset.LAST_90_DAYS:
        start = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;

      case DateRangePreset.THIS_MONTH:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      case DateRangePreset.LAST_MONTH:
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;

      case DateRangePreset.THIS_QUARTER: {
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        start = new Date(now.getFullYear(), quarterMonth, 1);
        break;
      }

      case DateRangePreset.LAST_QUARTER: {
        const lastQuarterMonth = Math.floor(now.getMonth() / 3) * 3 - 3;
        const year =
          lastQuarterMonth < 0 ? now.getFullYear() - 1 : now.getFullYear();
        const month =
          lastQuarterMonth < 0 ? lastQuarterMonth + 12 : lastQuarterMonth;
        start = new Date(year, month, 1);
        end = new Date(year, month + 3, 0, 23, 59, 59, 999);
        break;
      }

      case DateRangePreset.THIS_YEAR:
        start = new Date(now.getFullYear(), 0, 1);
        break;

      case DateRangePreset.LAST_YEAR:
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
        break;

      case DateRangePreset.CUSTOM:
        if (!customStart || !customEnd) {
          throw new BadRequestException(
            "Custom date range requires start and end dates",
          );
        }
        start = new Date(customStart);
        end = new Date(customEnd);
        break;

      default:
        return undefined;
    }

    return { start, end };
  }

  /**
   * Build complete Prisma query args from parsed query.
   */
  buildPrismaQueryArgs(
    parsedQuery: ParsedQuery,
    organizationId: string,
  ): {
    where: Record<string, unknown>;
    orderBy?: Array<Record<string, "asc" | "desc">>;
    take?: number;
    skip?: number;
  } {
    const where = this.buildWhereClause(
      parsedQuery.entityType,
      parsedQuery.filters,
      organizationId,
    );

    // Add date range to where clause if specified
    if (parsedQuery.dateRange) {
      const fieldDef = this.fieldWhitelist.validateField(
        parsedQuery.entityType,
        parsedQuery.dateRange.field,
        "filter",
      );
      where[fieldDef.prismaField] = {
        gte: new Date(parsedQuery.dateRange.start),
        lte: new Date(parsedQuery.dateRange.end),
      };
    }

    return {
      where,
      orderBy: this.buildOrderBy(parsedQuery.entityType, parsedQuery.orderBy),
      take: parsedQuery.limit,
    };
  }

  /**
   * Convert a filter to Prisma condition.
   */
  private toPrismaCondition(
    filter: QueryFilter,
    fieldDef: FieldDefinition,
  ): unknown {
    const { operator, value, valueTo } = filter;

    // Validate enum values
    if (fieldDef.type === "enum" && fieldDef.enumValues) {
      if (
        operator === FilterOperator.IN ||
        operator === FilterOperator.NOT_IN
      ) {
        const values = Array.isArray(value) ? value : [value];
        for (const v of values) {
          if (!fieldDef.enumValues.includes(String(v).toUpperCase())) {
            throw new BadRequestException(
              `Invalid enum value: ${v}. Allowed: ${fieldDef.enumValues.join(", ")}`,
            );
          }
        }
      } else if (
        operator !== FilterOperator.IS_NULL &&
        operator !== FilterOperator.IS_NOT_NULL
      ) {
        if (!fieldDef.enumValues.includes(String(value).toUpperCase())) {
          throw new BadRequestException(
            `Invalid enum value: ${value}. Allowed: ${fieldDef.enumValues.join(", ")}`,
          );
        }
      }
    }

    switch (operator) {
      case FilterOperator.EQUALS:
        return value;

      case FilterOperator.NOT_EQUALS:
        return { not: value };

      case FilterOperator.GREATER_THAN:
        return { gt: this.coerceValue(value, fieldDef.type) };

      case FilterOperator.GREATER_THAN_OR_EQUAL:
        return { gte: this.coerceValue(value, fieldDef.type) };

      case FilterOperator.LESS_THAN:
        return { lt: this.coerceValue(value, fieldDef.type) };

      case FilterOperator.LESS_THAN_OR_EQUAL:
        return { lte: this.coerceValue(value, fieldDef.type) };

      case FilterOperator.CONTAINS:
        return { contains: String(value), mode: "insensitive" };

      case FilterOperator.STARTS_WITH:
        return { startsWith: String(value), mode: "insensitive" };

      case FilterOperator.ENDS_WITH:
        return { endsWith: String(value), mode: "insensitive" };

      case FilterOperator.IN:
        return { in: Array.isArray(value) ? value : [value] };

      case FilterOperator.NOT_IN:
        return { notIn: Array.isArray(value) ? value : [value] };

      case FilterOperator.IS_NULL:
        return null;

      case FilterOperator.IS_NOT_NULL:
        return { not: null };

      case FilterOperator.BETWEEN:
        return {
          gte: this.coerceValue(value, fieldDef.type),
          lte: this.coerceValue(valueTo, fieldDef.type),
        };

      default:
        this.logger.warn(`Unknown filter operator: ${operator}`);
        return undefined;
    }
  }

  /**
   * Coerce value to appropriate type for Prisma.
   */
  private coerceValue(value: unknown, type: FieldDefinition["type"]): unknown {
    if (value === null || value === undefined) {
      return value;
    }

    switch (type) {
      case "number":
        return typeof value === "number" ? value : Number(value);

      case "date":
        return value instanceof Date ? value : new Date(String(value));

      case "boolean":
        if (typeof value === "boolean") return value;
        return value === "true" || value === "1";

      case "enum":
        return String(value).toUpperCase();

      default:
        return value;
    }
  }
}
