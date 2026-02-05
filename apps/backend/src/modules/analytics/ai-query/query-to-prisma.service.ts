import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import {
  QueryEntityType,
  QueryFilter,
  FilterOperator,
  QuerySort,
  QueryGroupBy,
  ParsedQuery,
  DateRangePreset,
} from "./dto/ai-query.dto";

/**
 * Field whitelist definition with type information for validation.
 */
interface FieldDefinition {
  prismaField: string;
  type: "string" | "number" | "date" | "boolean" | "enum";
  enumValues?: string[];
  /** Whether this field can be used in filters */
  filterable: boolean;
  /** Whether this field can be used in ORDER BY */
  sortable: boolean;
  /** Whether this field can be used in GROUP BY */
  groupable: boolean;
}

type EntityFieldWhitelist = Record<string, FieldDefinition>;

/**
 * QueryToPrismaService converts AI-parsed query structures into safe Prisma queries.
 *
 * SECURITY: This service whitelists allowed fields per entity type to prevent:
 * - SQL injection via field names
 * - Access to sensitive/internal fields
 * - Data exposure through unintended joins
 *
 * All field names are validated against whitelists before being used in queries.
 */
@Injectable()
export class QueryToPrismaService {
  private readonly logger = new Logger(QueryToPrismaService.name);

  /**
   * Whitelisted fields for each entity type.
   * SECURITY: Only fields in this whitelist can be queried.
   */
  private readonly ALLOWED_FIELDS: Record<
    QueryEntityType,
    EntityFieldWhitelist
  > = {
    [QueryEntityType.CASE]: {
      id: {
        prismaField: "id",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      referenceNumber: {
        prismaField: "referenceNumber",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      status: {
        prismaField: "status",
        type: "enum",
        enumValues: ["NEW", "IN_PROGRESS", "PENDING", "CLOSED", "MERGED"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      outcome: {
        prismaField: "outcome",
        type: "enum",
        enumValues: [
          "SUBSTANTIATED",
          "UNSUBSTANTIATED",
          "INCONCLUSIVE",
          "NO_ACTION_REQUIRED",
        ],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      pipelineStage: {
        prismaField: "pipelineStage",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      createdAt: {
        prismaField: "createdAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      updatedAt: {
        prismaField: "updatedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      outcomeAt: {
        prismaField: "outcomeAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      assigneeId: {
        prismaField: "assigneeId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      categoryId: {
        prismaField: "categoryId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      severity: {
        prismaField: "severity",
        type: "enum",
        enumValues: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      businessUnitId: {
        prismaField: "businessUnitId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      locationId: {
        prismaField: "locationId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
    },

    [QueryEntityType.RIU]: {
      id: {
        prismaField: "id",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      referenceNumber: {
        prismaField: "referenceNumber",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      type: {
        prismaField: "type",
        type: "enum",
        enumValues: [
          "HOTLINE_REPORT",
          "WEB_FORM_SUBMISSION",
          "DISCLOSURE_RESPONSE",
          "EMAIL_INTAKE",
          "CHATBOT_TRANSCRIPT",
        ],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      sourceChannel: {
        prismaField: "sourceChannel",
        type: "enum",
        enumValues: ["PHONE", "WEB_FORM", "EMAIL", "CHATBOT", "PROXY"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      reporterType: {
        prismaField: "reporterType",
        type: "enum",
        enumValues: ["ANONYMOUS", "CONFIDENTIAL", "IDENTIFIED"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      status: {
        prismaField: "status",
        type: "enum",
        enumValues: ["PENDING_QA", "IN_QA", "RELEASED", "REJECTED"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      severity: {
        prismaField: "severity",
        type: "enum",
        enumValues: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      categoryId: {
        prismaField: "categoryId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      createdAt: {
        prismaField: "createdAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      releasedAt: {
        prismaField: "releasedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      locationCity: {
        prismaField: "locationCity",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      locationState: {
        prismaField: "locationState",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: true,
      },
    },

    [QueryEntityType.CAMPAIGN]: {
      id: {
        prismaField: "id",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      name: {
        prismaField: "name",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      type: {
        prismaField: "type",
        type: "enum",
        enumValues: ["DISCLOSURE", "ATTESTATION", "TRAINING", "SURVEY"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      status: {
        prismaField: "status",
        type: "enum",
        enumValues: [
          "DRAFT",
          "SCHEDULED",
          "ACTIVE",
          "PAUSED",
          "COMPLETED",
          "CANCELLED",
        ],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      launchAt: {
        prismaField: "launchAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      launchedAt: {
        prismaField: "launchedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      dueDate: {
        prismaField: "dueDate",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      createdAt: {
        prismaField: "createdAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      updatedAt: {
        prismaField: "updatedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      audienceMode: {
        prismaField: "audienceMode",
        type: "enum",
        enumValues: ["ALL", "SEGMENT", "MANUAL"],
        filterable: true,
        sortable: false,
        groupable: true,
      },
    },

    [QueryEntityType.PERSON]: {
      id: {
        prismaField: "id",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      type: {
        prismaField: "type",
        type: "enum",
        enumValues: [
          "EMPLOYEE",
          "SUBJECT",
          "WITNESS",
          "EXTERNAL_CONTACT",
          "UNKNOWN",
        ],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      source: {
        prismaField: "source",
        type: "enum",
        enumValues: ["HRIS", "MANUAL", "INTAKE", "DISCLOSURE"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      businessUnitId: {
        prismaField: "businessUnitId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      businessUnitName: {
        prismaField: "businessUnitName",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      jobTitle: {
        prismaField: "jobTitle",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      employmentStatus: {
        prismaField: "employmentStatus",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      locationId: {
        prismaField: "locationId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      locationName: {
        prismaField: "locationName",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      createdAt: {
        prismaField: "createdAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      updatedAt: {
        prismaField: "updatedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
    },

    [QueryEntityType.DISCLOSURE]: {
      id: {
        prismaField: "id",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      type: {
        prismaField: "type",
        type: "enum",
        enumValues: [
          "CONFLICT_OF_INTEREST",
          "GIFT",
          "ENTERTAINMENT",
          "OUTSIDE_ACTIVITY",
          "FINANCIAL_INTEREST",
        ],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      status: {
        prismaField: "status",
        type: "enum",
        enumValues: ["PENDING", "APPROVED", "REJECTED", "REQUIRES_REVIEW"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      riskLevel: {
        prismaField: "riskLevel",
        type: "enum",
        enumValues: ["LOW", "MEDIUM", "HIGH"],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      submittedAt: {
        prismaField: "submittedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      reviewedAt: {
        prismaField: "reviewedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      createdAt: {
        prismaField: "createdAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      updatedAt: {
        prismaField: "updatedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      businessUnitId: {
        prismaField: "businessUnitId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
    },

    [QueryEntityType.INVESTIGATION]: {
      id: {
        prismaField: "id",
        type: "string",
        filterable: true,
        sortable: true,
        groupable: false,
      },
      caseId: {
        prismaField: "caseId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      status: {
        prismaField: "status",
        type: "enum",
        enumValues: [
          "PENDING",
          "IN_PROGRESS",
          "ON_HOLD",
          "COMPLETED",
          "CANCELLED",
        ],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      assigneeId: {
        prismaField: "assigneeId",
        type: "string",
        filterable: true,
        sortable: false,
        groupable: true,
      },
      outcome: {
        prismaField: "outcome",
        type: "enum",
        enumValues: [
          "SUBSTANTIATED",
          "UNSUBSTANTIATED",
          "INCONCLUSIVE",
          "REFERRED",
        ],
        filterable: true,
        sortable: true,
        groupable: true,
      },
      startedAt: {
        prismaField: "startedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      completedAt: {
        prismaField: "completedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      createdAt: {
        prismaField: "createdAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
      updatedAt: {
        prismaField: "updatedAt",
        type: "date",
        filterable: true,
        sortable: true,
        groupable: true,
      },
    },
  };

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
   * Validate and get field definition.
   * @throws BadRequestException if field is not allowed
   */
  validateField(
    entityType: QueryEntityType,
    fieldName: string,
    operation: "filter" | "sort" | "group",
  ): FieldDefinition {
    const whitelist = this.ALLOWED_FIELDS[entityType];
    if (!whitelist) {
      throw new BadRequestException(`Unknown entity type: ${entityType}`);
    }

    const fieldDef = whitelist[fieldName];
    if (!fieldDef) {
      this.logger.warn(
        `Attempted access to non-whitelisted field: ${entityType}.${fieldName}`,
      );
      throw new BadRequestException(`Field not allowed: ${fieldName}`);
    }

    if (operation === "filter" && !fieldDef.filterable) {
      throw new BadRequestException(`Field ${fieldName} cannot be filtered`);
    }
    if (operation === "sort" && !fieldDef.sortable) {
      throw new BadRequestException(`Field ${fieldName} cannot be sorted`);
    }
    if (operation === "group" && !fieldDef.groupable) {
      throw new BadRequestException(`Field ${fieldName} cannot be grouped`);
    }

    return fieldDef;
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
      const fieldDef = this.validateField(entityType, filter.field, "filter");
      const prismaField = fieldDef.prismaField;
      const condition = this.toPrismaCondition(filter, fieldDef);

      if (condition !== undefined) {
        where[prismaField] = condition;
      }
    }

    return where;
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
      const fieldDef = this.validateField(entityType, sort.field, "sort");
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
      const fieldDef = this.validateField(entityType, group.field, "group");
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
   * Get allowed fields for an entity type (for AI prompt construction).
   */
  getAllowedFields(entityType: QueryEntityType): string[] {
    const whitelist = this.ALLOWED_FIELDS[entityType];
    return whitelist ? Object.keys(whitelist) : [];
  }

  /**
   * Get field metadata for AI prompt construction.
   */
  getFieldMetadata(entityType: QueryEntityType): Array<{
    field: string;
    type: string;
    enumValues?: string[];
  }> {
    const whitelist = this.ALLOWED_FIELDS[entityType];
    if (!whitelist) return [];

    return Object.entries(whitelist).map(([field, def]) => ({
      field,
      type: def.type,
      enumValues: def.enumValues,
    }));
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
      const fieldDef = this.validateField(
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
}
