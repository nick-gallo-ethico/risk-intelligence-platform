import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  SegmentCriteria,
  SegmentCondition,
  SegmentConditionGroup,
  SegmentOperator,
  SegmentField,
  SegmentLogic,
} from "../dto/segment-criteria.dto";

/**
 * SegmentQueryBuilder converts segment JSON criteria into Prisma where clauses.
 * This enables dynamic audience targeting for campaigns based on employee attributes.
 *
 * @example
 * // Segment criteria:
 * {
 *   logic: 'AND',
 *   conditions: [
 *     { field: 'businessUnitId', operator: 'equals', value: 'uuid' },
 *     { field: 'employmentStatus', operator: 'equals', value: 'ACTIVE' }
 *   ]
 * }
 *
 * // Generates:
 * {
 *   AND: [
 *     { businessUnitId: 'uuid' },
 *     { employmentStatus: 'ACTIVE' }
 *   ]
 * }
 */
@Injectable()
export class SegmentQueryBuilder {
  /**
   * Convert segment criteria to Prisma where clause for Employee model.
   */
  buildWhereClause(
    criteria: SegmentCriteria,
    organizationId: string,
  ): Prisma.EmployeeWhereInput {
    const baseWhere: Prisma.EmployeeWhereInput = {
      organizationId,
      employmentStatus: "ACTIVE", // Always filter to active employees
    };

    if (!criteria) {
      return baseWhere;
    }

    const criteriaWhere = this.buildConditionGroup(criteria);

    if (Object.keys(criteriaWhere).length === 0) {
      return baseWhere;
    }

    return {
      AND: [baseWhere, criteriaWhere],
    };
  }

  /**
   * Build where clause from a condition group (supports nesting).
   */
  private buildConditionGroup(
    group: SegmentCriteria | SegmentConditionGroup,
  ): Prisma.EmployeeWhereInput {
    const conditions: Prisma.EmployeeWhereInput[] = [];

    // Process direct conditions
    if (group.conditions && group.conditions.length > 0) {
      for (const condition of group.conditions) {
        const where = this.buildCondition(condition);
        if (where) {
          conditions.push(where);
        }
      }
    }

    // Process nested groups recursively
    if (group.groups && group.groups.length > 0) {
      for (const nestedGroup of group.groups) {
        const nestedWhere = this.buildConditionGroup(nestedGroup);
        if (Object.keys(nestedWhere).length > 0) {
          conditions.push(nestedWhere);
        }
      }
    }

    if (conditions.length === 0) {
      return {};
    }

    // Combine with appropriate logic
    if (group.logic === SegmentLogic.OR) {
      return { OR: conditions };
    }

    return { AND: conditions };
  }

  /**
   * Build where clause for a single condition.
   */
  private buildCondition(
    condition: SegmentCondition,
  ): Prisma.EmployeeWhereInput | null {
    const { field, operator, value } = condition;

    // Handle nested fields (e.g., location.region)
    if (field.includes(".")) {
      return this.buildNestedCondition(field, operator, value);
    }

    // Map field to Prisma field name
    const prismaField = this.mapFieldToPrisma(field);
    if (!prismaField) {
      return null;
    }

    // Build the filter based on operator
    const filter = this.buildOperatorFilter(operator, value);
    if (!filter) {
      return null;
    }

    return { [prismaField]: filter };
  }

  /**
   * Build condition for nested relations (e.g., location.region).
   */
  private buildNestedCondition(
    field: string,
    operator: SegmentOperator,
    value: unknown,
  ): Prisma.EmployeeWhereInput | null {
    const parts = field.split(".");
    if (parts.length !== 2) {
      return null;
    }

    const [relation, nestedField] = parts;

    // Build the filter
    const filter = this.buildOperatorFilter(operator, value);
    if (!filter) {
      return null;
    }

    // Map relation names
    const relationMap: Record<string, string> = {
      location: "locationAssignment",
      team: "teamAssignment",
    };

    const prismaRelation = relationMap[relation];
    if (!prismaRelation) {
      return null;
    }

    return {
      [prismaRelation]: {
        [nestedField]: filter,
      },
    };
  }

  /**
   * Map segment field enum to Prisma field name.
   */
  private mapFieldToPrisma(field: SegmentField | string): string | null {
    const fieldMap: Record<string, string> = {
      [SegmentField.LOCATION_ID]: "locationId",
      [SegmentField.LOCATION_CODE]: "locationCode",
      [SegmentField.DIVISION_ID]: "divisionId",
      [SegmentField.BUSINESS_UNIT_ID]: "businessUnitId",
      [SegmentField.DEPARTMENT_ID]: "departmentId",
      [SegmentField.TEAM_ID]: "teamId",
      [SegmentField.JOB_TITLE]: "jobTitle",
      [SegmentField.JOB_LEVEL]: "jobLevel",
      [SegmentField.EMPLOYMENT_STATUS]: "employmentStatus",
      [SegmentField.EMPLOYMENT_TYPE]: "employmentType",
      [SegmentField.WORK_MODE]: "workMode",
      [SegmentField.COMPLIANCE_ROLE]: "complianceRole",
      [SegmentField.MANAGER_ID]: "managerId",
      [SegmentField.PRIMARY_LANGUAGE]: "primaryLanguage",
      [SegmentField.HIRE_DATE]: "hireDate",
    };

    return fieldMap[field] || null;
  }

  /**
   * Build Prisma filter based on operator.
   */
  private buildOperatorFilter(
    operator: SegmentOperator,
    value: unknown,
  ): unknown {
    switch (operator) {
      // String/general operators
      case SegmentOperator.EQUALS:
        return value;

      case SegmentOperator.NOT_EQUALS:
        return { not: value };

      case SegmentOperator.CONTAINS:
        return { contains: value as string, mode: "insensitive" };

      case SegmentOperator.NOT_CONTAINS:
        return { not: { contains: value as string, mode: "insensitive" } };

      case SegmentOperator.STARTS_WITH:
        return { startsWith: value as string, mode: "insensitive" };

      case SegmentOperator.ENDS_WITH:
        return { endsWith: value as string, mode: "insensitive" };

      // Numeric operators
      case SegmentOperator.GREATER_THAN:
        return { gt: value };

      case SegmentOperator.GREATER_THAN_OR_EQUALS:
        return { gte: value };

      case SegmentOperator.LESS_THAN:
        return { lt: value };

      case SegmentOperator.LESS_THAN_OR_EQUALS:
        return { lte: value };

      // Array operators
      case SegmentOperator.IN:
        return { in: Array.isArray(value) ? value : [value] };

      case SegmentOperator.NOT_IN:
        return { notIn: Array.isArray(value) ? value : [value] };

      // Boolean operators
      case SegmentOperator.IS_TRUE:
        return true;

      case SegmentOperator.IS_FALSE:
        return false;

      // Null checks
      case SegmentOperator.IS_NULL:
        return null;

      case SegmentOperator.IS_NOT_NULL:
        return { not: null };

      default:
        return null;
    }
  }

  /**
   * Validate segment criteria structure.
   * Returns array of validation errors, empty if valid.
   */
  validateCriteria(criteria: SegmentCriteria): string[] {
    const errors: string[] = [];

    if (!criteria) {
      errors.push("Criteria is required");
      return errors;
    }

    if (!criteria.logic) {
      errors.push("Logic (AND/OR) is required");
    }

    const hasConditions = criteria.conditions && criteria.conditions.length > 0;
    const hasGroups = criteria.groups && criteria.groups.length > 0;

    if (!hasConditions && !hasGroups) {
      errors.push("At least one condition or group is required");
    }

    // Validate conditions
    if (criteria.conditions) {
      for (let i = 0; i < criteria.conditions.length; i++) {
        const conditionErrors = this.validateCondition(
          criteria.conditions[i],
          `conditions[${i}]`,
        );
        errors.push(...conditionErrors);
      }
    }

    // Validate groups recursively
    if (criteria.groups) {
      for (let i = 0; i < criteria.groups.length; i++) {
        const groupErrors = this.validateGroup(
          criteria.groups[i],
          `groups[${i}]`,
        );
        errors.push(...groupErrors);
      }
    }

    return errors;
  }

  private validateCondition(
    condition: SegmentCondition,
    path: string,
  ): string[] {
    const errors: string[] = [];

    if (!condition.field) {
      errors.push(`${path}.field is required`);
    } else if (!Object.values(SegmentField).includes(condition.field)) {
      errors.push(`${path}.field has invalid value: ${condition.field}`);
    }

    if (!condition.operator) {
      errors.push(`${path}.operator is required`);
    } else if (!Object.values(SegmentOperator).includes(condition.operator)) {
      errors.push(`${path}.operator has invalid value: ${condition.operator}`);
    }

    // Value is optional for some operators
    const noValueOperators = [
      SegmentOperator.IS_TRUE,
      SegmentOperator.IS_FALSE,
      SegmentOperator.IS_NULL,
      SegmentOperator.IS_NOT_NULL,
    ];

    if (
      !noValueOperators.includes(condition.operator) &&
      condition.value === undefined
    ) {
      errors.push(`${path}.value is required for operator ${condition.operator}`);
    }

    return errors;
  }

  private validateGroup(group: SegmentConditionGroup, path: string): string[] {
    const errors: string[] = [];

    if (!group.logic) {
      errors.push(`${path}.logic is required`);
    }

    const hasConditions = group.conditions && group.conditions.length > 0;
    const hasGroups = group.groups && group.groups.length > 0;

    if (!hasConditions && !hasGroups) {
      errors.push(`${path} must have at least one condition or nested group`);
    }

    if (group.conditions) {
      for (let i = 0; i < group.conditions.length; i++) {
        const conditionErrors = this.validateCondition(
          group.conditions[i],
          `${path}.conditions[${i}]`,
        );
        errors.push(...conditionErrors);
      }
    }

    if (group.groups) {
      for (let i = 0; i < group.groups.length; i++) {
        const groupErrors = this.validateGroup(
          group.groups[i],
          `${path}.groups[${i}]`,
        );
        errors.push(...groupErrors);
      }
    }

    return errors;
  }
}
