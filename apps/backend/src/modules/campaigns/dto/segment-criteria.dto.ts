import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Supported operators for segment conditions.
 * These map to Prisma filter operators.
 */
export enum SegmentOperator {
  // String/general operators
  EQUALS = "equals",
  NOT_EQUALS = "not_equals",
  CONTAINS = "contains",
  NOT_CONTAINS = "not_contains",
  STARTS_WITH = "starts_with",
  ENDS_WITH = "ends_with",

  // Numeric operators
  GREATER_THAN = "gt",
  GREATER_THAN_OR_EQUALS = "gte",
  LESS_THAN = "lt",
  LESS_THAN_OR_EQUALS = "lte",

  // Array operators
  IN = "in",
  NOT_IN = "not_in",

  // Boolean operators
  IS_TRUE = "is_true",
  IS_FALSE = "is_false",

  // Null checks
  IS_NULL = "is_null",
  IS_NOT_NULL = "is_not_null",
}

/**
 * Supported fields for segment targeting.
 * These map to Employee model fields.
 */
export enum SegmentField {
  // Location
  LOCATION_ID = "locationId",
  LOCATION_CODE = "locationCode",
  LOCATION_REGION = "location.region",
  LOCATION_COUNTRY = "location.country",

  // Organization structure
  DIVISION_ID = "divisionId",
  BUSINESS_UNIT_ID = "businessUnitId",
  DEPARTMENT_ID = "departmentId",
  TEAM_ID = "teamId",

  // Position
  JOB_TITLE = "jobTitle",
  JOB_LEVEL = "jobLevel",

  // Employment
  EMPLOYMENT_STATUS = "employmentStatus",
  EMPLOYMENT_TYPE = "employmentType",
  WORK_MODE = "workMode",

  // Compliance
  COMPLIANCE_ROLE = "complianceRole",

  // Manager
  MANAGER_ID = "managerId",

  // Language
  PRIMARY_LANGUAGE = "primaryLanguage",

  // Dates
  HIRE_DATE = "hireDate",
}

/**
 * Logic type for combining conditions.
 */
export enum SegmentLogic {
  AND = "AND",
  OR = "OR",
}

/**
 * A single condition in a segment criteria.
 */
export class SegmentCondition {
  @ApiProperty({
    enum: SegmentField,
    description: "The employee field to filter on",
    example: SegmentField.BUSINESS_UNIT_ID,
  })
  @IsEnum(SegmentField)
  field: SegmentField;

  @ApiProperty({
    enum: SegmentOperator,
    description: "The comparison operator",
    example: SegmentOperator.EQUALS,
  })
  @IsEnum(SegmentOperator)
  operator: SegmentOperator;

  @ApiPropertyOptional({
    description:
      "The value to compare against (optional for IS_NULL, IS_NOT_NULL, IS_TRUE, IS_FALSE)",
    example: "uuid-here",
  })
  @IsOptional()
  value?: string | string[] | number | boolean;
}

/**
 * A group of conditions combined with AND/OR logic.
 * Supports nesting for complex queries.
 */
export class SegmentConditionGroup {
  @ApiProperty({
    enum: SegmentLogic,
    description: "How to combine conditions in this group",
    example: SegmentLogic.AND,
  })
  @IsEnum(SegmentLogic)
  logic: SegmentLogic;

  @ApiProperty({
    type: [SegmentCondition],
    description: "Array of conditions to evaluate",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegmentCondition)
  conditions: SegmentCondition[];

  @ApiPropertyOptional({
    type: [SegmentConditionGroup],
    description: "Nested condition groups for complex queries",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegmentConditionGroup)
  groups?: SegmentConditionGroup[];
}

/**
 * Root segment criteria structure.
 */
export class SegmentCriteria {
  @ApiProperty({
    enum: SegmentLogic,
    description: "Top-level logic for combining conditions",
    default: SegmentLogic.AND,
  })
  @IsEnum(SegmentLogic)
  logic: SegmentLogic = SegmentLogic.AND;

  @ApiPropertyOptional({
    type: [SegmentCondition],
    description: "Top-level conditions",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegmentCondition)
  conditions?: SegmentCondition[];

  @ApiPropertyOptional({
    type: [SegmentConditionGroup],
    description: "Nested condition groups",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SegmentConditionGroup)
  groups?: SegmentConditionGroup[];
}

/**
 * DTO for creating a new segment.
 */
export class CreateSegmentDto {
  @ApiProperty({
    description: "Segment name",
    example: "US Healthcare Employees",
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    description: "Segment description",
    example: "All active employees in US healthcare locations",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    type: SegmentCriteria,
    description: "Segment targeting criteria",
  })
  @ValidateNested()
  @Type(() => SegmentCriteria)
  criteria: SegmentCriteria;

  @ApiPropertyOptional({
    description: "Whether segment is active",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

/**
 * DTO for updating an existing segment.
 */
export class UpdateSegmentDto {
  @ApiPropertyOptional({
    description: "Segment name",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({
    description: "Segment description",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: SegmentCriteria,
    description: "Segment targeting criteria",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SegmentCriteria)
  criteria?: SegmentCriteria;

  @ApiPropertyOptional({
    description: "Whether segment is active",
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
