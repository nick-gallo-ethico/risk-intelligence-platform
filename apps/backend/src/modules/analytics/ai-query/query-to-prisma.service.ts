import { Injectable, Logger } from "@nestjs/common";
import {
  QueryEntityType,
  QueryFilter,
  QuerySort,
  QueryGroupBy,
  ParsedQuery,
  DateRangePreset,
} from "./dto/ai-query.dto";
import {
  FieldWhitelistService,
  FieldDefinition,
  EntityFieldWhitelist,
} from "./services/field-whitelist.service";
import { PrismaQueryBuilderService } from "./services/prisma-query-builder.service";

// Re-export types for backward compatibility
export type { FieldDefinition, EntityFieldWhitelist };

/**
 * QueryToPrismaService converts AI-parsed query structures into safe Prisma queries.
 *
 * Architecture: Thin coordinator delegating to:
 * - FieldWhitelistService: Field security validation
 * - PrismaQueryBuilderService: Prisma query construction
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

  constructor(
    private readonly fieldWhitelist: FieldWhitelistService,
    private readonly queryBuilder: PrismaQueryBuilderService,
  ) {}

  /**
   * Get the Prisma model name for an entity type.
   */
  getPrismaModelName(entityType: QueryEntityType): string {
    return this.queryBuilder.getPrismaModelName(entityType);
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
    return this.fieldWhitelist.validateField(entityType, fieldName, operation);
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
    return this.queryBuilder.buildWhereClause(
      entityType,
      filters,
      organizationId,
    );
  }

  /**
   * Build Prisma orderBy from parsed query.
   */
  buildOrderBy(
    entityType: QueryEntityType,
    orderBy?: QuerySort[],
  ): Array<Record<string, "asc" | "desc">> | undefined {
    return this.queryBuilder.buildOrderBy(entityType, orderBy);
  }

  /**
   * Build groupBy fields from parsed query.
   */
  buildGroupBy(
    entityType: QueryEntityType,
    groupBy?: QueryGroupBy[],
  ): string[] | undefined {
    return this.queryBuilder.buildGroupBy(entityType, groupBy);
  }

  /**
   * Parse date range preset into start/end dates.
   */
  parseTimeRange(
    preset?: DateRangePreset,
    customStart?: string,
    customEnd?: string,
  ): { start: Date; end: Date } | undefined {
    return this.queryBuilder.parseTimeRange(preset, customStart, customEnd);
  }

  /**
   * Get allowed fields for an entity type (for AI prompt construction).
   */
  getAllowedFields(entityType: QueryEntityType): string[] {
    return this.fieldWhitelist.getAllowedFields(entityType);
  }

  /**
   * Get field metadata for AI prompt construction.
   */
  getFieldMetadata(entityType: QueryEntityType): Array<{
    field: string;
    type: string;
    enumValues?: string[];
  }> {
    return this.fieldWhitelist.getFieldMetadata(entityType);
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
    return this.queryBuilder.buildPrismaQueryArgs(parsedQuery, organizationId);
  }
}
