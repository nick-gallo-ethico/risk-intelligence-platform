import { Injectable, Logger } from "@nestjs/common";
import {
  EntitySchemaRegistryService,
  FieldSchema,
  FieldType,
} from "./entity-schema-registry.service";

/**
 * Result of filter validation.
 */
export interface FilterValidationResult {
  valid: boolean;
  errors: string[];
  normalizedFilter?: Record<string, unknown>;
}

/**
 * Valid filter operators for query building.
 */
export const FILTER_OPERATORS = [
  "eq", // equals
  "ne", // not equals
  "gt", // greater than
  "gte", // greater than or equal
  "lt", // less than
  "lte", // less than or equal
  "contains", // string contains
  "startsWith", // string starts with
  "endsWith", // string ends with
  "in", // value in array
  "notIn", // value not in array
  "isNull", // is null
  "isNotNull", // is not null
] as const;

export type FilterOperator = (typeof FILTER_OPERATORS)[number];

/**
 * FilterValidatorService validates AI-generated filters against entity schemas.
 *
 * This service handles:
 * - Filter field validation against schema
 * - Filter operator validation
 * - Field value type validation
 * - Filter normalization
 *
 * Used by:
 * - SchemaIntrospectionService: For filter validation
 * - AI Skills: Validating AI-generated query filters
 */
@Injectable()
export class FilterValidatorService {
  private readonly logger = new Logger(FilterValidatorService.name);

  constructor(
    private readonly entitySchemaRegistry: EntitySchemaRegistryService,
  ) {}

  /**
   * Validate a filter object against entity schema.
   * Checks that fields exist, types match, and operators are valid.
   *
   * @param entityName - Entity to validate against
   * @param filter - Filter object to validate
   * @param organizationId - Organization context
   * @returns Validation result with errors if any
   */
  validateFilter(
    entityName: string,
    filter: Record<string, unknown>,
    organizationId?: string,
  ): FilterValidationResult {
    const entity = this.entitySchemaRegistry.getEntitySchema(
      entityName,
      organizationId,
    );
    if (!entity) {
      return {
        valid: false,
        errors: [`Unknown entity: ${entityName}`],
      };
    }

    const errors: string[] = [];
    const normalizedFilter: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(filter)) {
      // Handle nested operators (e.g., { status: { eq: 'SUBMITTED' } })
      const [fieldName, operator] = this.parseFilterKey(key);
      const field = entity.fields.find((f) => f.name === fieldName);

      if (!field) {
        errors.push(`Unknown field: ${fieldName} on entity ${entityName}`);
        continue;
      }

      if (!field.filterable) {
        errors.push(`Field ${fieldName} is not filterable`);
        continue;
      }

      // Validate value type matches field type
      const typeError = this.validateFieldValue(field, value, operator);
      if (typeError) {
        errors.push(typeError);
        continue;
      }

      normalizedFilter[key] = value;
    }

    return {
      valid: errors.length === 0,
      errors,
      normalizedFilter: errors.length === 0 ? normalizedFilter : undefined,
    };
  }

  /**
   * Check if an operator is valid.
   *
   * @param operator - Operator to check
   * @returns Whether the operator is valid
   */
  isValidOperator(operator: string): operator is FilterOperator {
    return FILTER_OPERATORS.includes(operator as FilterOperator);
  }

  /**
   * Parse a filter key to extract field name and operator.
   * Supports both dot notation (status.eq) and underscore (status_eq).
   *
   * @param key - Filter key to parse
   * @returns Tuple of [fieldName, operator or null]
   */
  parseFilterKey(key: string): [string, FilterOperator | null] {
    // Support both dot notation (status.eq) and underscore (status_eq)
    const dotMatch = key.match(/^(.+)\.(\w+)$/);
    if (dotMatch) {
      const operator = dotMatch[2] as FilterOperator;
      if (FILTER_OPERATORS.includes(operator)) {
        return [dotMatch[1], operator];
      }
    }

    const underscoreMatch = key.match(/^(.+)_(\w+)$/);
    if (underscoreMatch) {
      const operator = underscoreMatch[2] as FilterOperator;
      if (FILTER_OPERATORS.includes(operator)) {
        return [underscoreMatch[1], operator];
      }
    }

    // No operator specified, assume equality
    return [key, null];
  }

  /**
   * Validate a field value against its schema type.
   *
   * @param field - Field schema
   * @param value - Value to validate
   * @param _operator - Filter operator (for context)
   * @returns Error message if invalid, null if valid
   */
  validateFieldValue(
    field: FieldSchema,
    value: unknown,
    _operator: FilterOperator | null,
  ): string | null {
    // Null checks for isNull/isNotNull operators
    if (value === null) {
      return null; // Valid for null checks
    }

    switch (field.type) {
      case "string":
      case "relation":
        if (typeof value !== "string" && !Array.isArray(value)) {
          return `Field ${field.name} expects string, got ${typeof value}`;
        }
        break;

      case "number":
        if (typeof value !== "number" && isNaN(Number(value))) {
          return `Field ${field.name} expects number, got ${typeof value}`;
        }
        break;

      case "boolean":
        if (
          typeof value !== "boolean" &&
          value !== "true" &&
          value !== "false"
        ) {
          return `Field ${field.name} expects boolean, got ${typeof value}`;
        }
        break;

      case "datetime":
        if (typeof value === "string") {
          const date = new Date(value);
          if (isNaN(date.getTime())) {
            return `Field ${field.name} expects valid date, got invalid date string`;
          }
        } else if (!(value instanceof Date)) {
          return `Field ${field.name} expects date, got ${typeof value}`;
        }
        break;

      case "enum":
        if (field.values && !field.values.includes(String(value))) {
          if (Array.isArray(value)) {
            const invalid = value.filter(
              (v) => !field.values!.includes(String(v)),
            );
            if (invalid.length > 0) {
              return `Field ${field.name} has invalid enum values: ${invalid.join(", ")}. Valid: ${field.values.join(", ")}`;
            }
          } else {
            return `Field ${field.name} has invalid enum value: ${value}. Valid: ${field.values.join(", ")}`;
          }
        }
        break;

      case "json":
        // JSON fields accept any structure
        break;
    }

    return null;
  }

  /**
   * Validate a field type.
   *
   * @param type - Type to validate
   * @returns Whether the type is a valid FieldType
   */
  isValidFieldType(type: string): type is FieldType {
    const validTypes: FieldType[] = [
      "string",
      "number",
      "boolean",
      "datetime",
      "enum",
      "relation",
      "json",
    ];
    return validTypes.includes(type as FieldType);
  }
}
