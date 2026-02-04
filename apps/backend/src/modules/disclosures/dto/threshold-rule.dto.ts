import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsBoolean,
  IsInt,
  ValidateNested,
  Min,
  Max,
  MinLength,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DisclosureType } from '@prisma/client';

// ===========================================
// Threshold Action and Apply Mode Enums
// ===========================================

/**
 * Threshold action types matching Prisma enum.
 * Using const object pattern per project standards (07-01 decision).
 */
export const ThresholdActionDto = {
  FLAG_REVIEW: 'FLAG_REVIEW',
  CREATE_CASE: 'CREATE_CASE',
  REQUIRE_APPROVAL: 'REQUIRE_APPROVAL',
  NOTIFY: 'NOTIFY',
} as const;

export type ThresholdActionDto =
  (typeof ThresholdActionDto)[keyof typeof ThresholdActionDto];

/**
 * Threshold apply mode types matching Prisma enum.
 */
export const ThresholdApplyModeDto = {
  FORWARD_ONLY: 'FORWARD_ONLY',
  RETROACTIVE: 'RETROACTIVE',
  RETROACTIVE_DATE: 'RETROACTIVE_DATE',
} as const;

export type ThresholdApplyModeDto =
  (typeof ThresholdApplyModeDto)[keyof typeof ThresholdApplyModeDto];

// ===========================================
// Condition Operator Enum
// ===========================================

/**
 * Operators for condition evaluation.
 */
export const ConditionOperator = {
  EQUALS: 'eq',
  NOT_EQUALS: 'neq',
  GREATER_THAN: 'gt',
  GREATER_THAN_OR_EQUALS: 'gte',
  LESS_THAN: 'lt',
  LESS_THAN_OR_EQUALS: 'lte',
  CONTAINS: 'contains',
  NOT_CONTAINS: 'not_contains',
  IN: 'in',
  NOT_IN: 'not_in',
} as const;

export type ConditionOperator =
  (typeof ConditionOperator)[keyof typeof ConditionOperator];

// ===========================================
// Rule Condition DTO
// ===========================================

/**
 * Single condition in a threshold rule.
 * Conditions can be combined with AND/OR conjunctions.
 */
export class RuleConditionDto {
  @ApiProperty({
    description:
      'Field path to evaluate (e.g., disclosureValue, relatedParty.type)',
    example: 'disclosureValue',
  })
  @IsString()
  field: string;

  @ApiProperty({
    enum: Object.values(ConditionOperator),
    description: 'Comparison operator',
    example: 'gte',
  })
  @IsString()
  operator: ConditionOperator;

  @ApiProperty({
    description: 'Value to compare against (number, string, or array)',
    example: 500,
  })
  value: unknown;

  @ApiPropertyOptional({
    enum: ['AND', 'OR'],
    description: 'How to combine with next condition',
    example: 'AND',
  })
  @IsOptional()
  @IsString()
  conjunction?: 'AND' | 'OR';
}

// ===========================================
// Aggregate Configuration DTO
// ===========================================

/**
 * Time window configuration for aggregate calculations.
 */
export class TimeWindowDto {
  @ApiProperty({
    enum: ['rolling', 'calendar'],
    description: 'Type of time window',
    example: 'rolling',
  })
  @IsString()
  type: 'rolling' | 'calendar';

  @ApiProperty({
    enum: ['days', 'months', 'years'],
    description: 'Period unit',
    example: 'months',
  })
  @IsString()
  period: 'days' | 'months' | 'years';

  @ApiProperty({
    description: 'Number of periods',
    example: 12,
  })
  @IsInt()
  @Min(1)
  @Max(365)
  value: number;
}

/**
 * Aggregate configuration for multi-dimensional threshold calculation (RS.38).
 * Enables rolling window aggregates across multiple dimensions.
 */
export class AggregateConfigDto {
  @ApiPropertyOptional({
    type: [String],
    description:
      'Dimensions for aggregation (person, entity, category, department)',
    example: ['person', 'entity'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dimensions?: string[];

  @ApiPropertyOptional({
    type: TimeWindowDto,
    description: 'Time window for rolling aggregates',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimeWindowDto)
  timeWindow?: TimeWindowDto;

  @ApiPropertyOptional({
    type: [String],
    description: 'Fields to group by for aggregate',
    example: ['relatedCompany'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupBy?: string[];

  @ApiPropertyOptional({
    description: 'Field to aggregate (default: disclosureValue)',
    example: 'disclosureValue',
  })
  @IsOptional()
  @IsString()
  aggregateField?: string;

  @ApiPropertyOptional({
    enum: ['SUM', 'COUNT', 'AVG', 'MAX'],
    description: 'Aggregate function to apply',
    example: 'SUM',
  })
  @IsOptional()
  @IsString()
  aggregateFunction?: 'SUM' | 'COUNT' | 'AVG' | 'MAX';
}

// ===========================================
// Action Configuration DTO
// ===========================================

/**
 * Configuration for the action to take when a threshold is triggered.
 */
export class ActionConfigDto {
  @ApiPropertyOptional({
    description: 'Template ID for auto-created case',
  })
  @IsOptional()
  @IsString()
  caseTemplateId?: string;

  @ApiPropertyOptional({
    description:
      'Title template for auto-created case (supports {{personName}} etc.)',
    example: 'Gift threshold exceeded: {{personName}}',
  })
  @IsOptional()
  @IsString()
  caseTitle?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'User IDs to notify',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notifyUsers?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Roles to notify (all users with role)',
    example: ['COMPLIANCE_OFFICER'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notifyRoles?: string[];

  @ApiPropertyOptional({
    description: 'Workflow template ID for approval routing',
  })
  @IsOptional()
  @IsString()
  workflowTemplateId?: string;
}

// ===========================================
// Create/Update DTOs
// ===========================================

/**
 * DTO for creating a threshold rule.
 */
export class CreateThresholdRuleDto {
  @ApiProperty({
    description: 'Rule name',
    example: 'Gift Value Exceeds $500',
    minLength: 3,
    maxLength: 200,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Rule description',
    example:
      'Triggers case creation when gift value exceeds $500 in rolling 12 months',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    enum: DisclosureType,
    isArray: true,
    description: 'Disclosure types this rule applies to',
    example: ['GIFT', 'TRAVEL'],
  })
  @IsArray()
  @IsEnum(DisclosureType, { each: true })
  disclosureTypes: DisclosureType[];

  @ApiProperty({
    type: [RuleConditionDto],
    description: 'Rule conditions',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  conditions: RuleConditionDto[];

  @ApiPropertyOptional({
    type: AggregateConfigDto,
    description: 'Aggregate configuration for rolling window calculations',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AggregateConfigDto)
  aggregateConfig?: AggregateConfigDto;

  @ApiProperty({
    enum: Object.values(ThresholdActionDto),
    description: 'Action to take when rule triggers',
    example: 'CREATE_CASE',
  })
  @IsString()
  action: ThresholdActionDto;

  @ApiPropertyOptional({
    type: ActionConfigDto,
    description: 'Additional configuration for the action',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ActionConfigDto)
  actionConfig?: ActionConfigDto;

  @ApiPropertyOptional({
    enum: Object.values(ThresholdApplyModeDto),
    description: 'How to handle retroactive evaluation',
    default: 'FORWARD_ONLY',
  })
  @IsOptional()
  @IsString()
  applyMode?: ThresholdApplyModeDto;

  @ApiPropertyOptional({
    description: 'Rule priority (higher = evaluated first)',
    minimum: 0,
    maximum: 100,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;
}

/**
 * DTO for updating a threshold rule.
 */
export class UpdateThresholdRuleDto {
  @ApiPropertyOptional({
    description: 'Rule name',
    minLength: 3,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Rule description',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    enum: DisclosureType,
    isArray: true,
    description: 'Disclosure types this rule applies to',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(DisclosureType, { each: true })
  disclosureTypes?: DisclosureType[];

  @ApiPropertyOptional({
    type: [RuleConditionDto],
    description: 'Rule conditions',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RuleConditionDto)
  conditions?: RuleConditionDto[];

  @ApiPropertyOptional({
    type: AggregateConfigDto,
    description: 'Aggregate configuration for rolling window calculations',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AggregateConfigDto)
  aggregateConfig?: AggregateConfigDto;

  @ApiPropertyOptional({
    enum: Object.values(ThresholdActionDto),
    description: 'Action to take when rule triggers',
  })
  @IsOptional()
  @IsString()
  action?: ThresholdActionDto;

  @ApiPropertyOptional({
    type: ActionConfigDto,
    description: 'Additional configuration for the action',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ActionConfigDto)
  actionConfig?: ActionConfigDto;

  @ApiPropertyOptional({
    description: 'Whether rule is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Rule priority (higher = evaluated first)',
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;
}

// ===========================================
// Response DTOs
// ===========================================

/**
 * Response DTO for threshold rule.
 */
export class ThresholdRuleResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  organizationId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty({ type: [String] })
  disclosureTypes: string[];

  @ApiProperty({ type: [RuleConditionDto] })
  conditions: RuleConditionDto[];

  @ApiPropertyOptional({ type: AggregateConfigDto })
  aggregateConfig?: AggregateConfigDto;

  @ApiProperty()
  action: string;

  @ApiPropertyOptional({ type: ActionConfigDto })
  actionConfig?: ActionConfigDto;

  @ApiProperty()
  applyMode: string;

  @ApiProperty()
  priority: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Statistics
  @ApiPropertyOptional({
    description: 'Number of times this rule has triggered',
  })
  triggerCount?: number;

  @ApiPropertyOptional({
    description: 'When rule last triggered',
  })
  lastTriggeredAt?: Date;
}

// ===========================================
// Evaluation Result Types
// ===========================================

/**
 * Breakdown of aggregate calculation for transparency.
 */
export interface AggregateBreakdown {
  relatedDisclosures: {
    id: string;
    date: Date;
    value: number;
  }[];
  totalValue: number;
  windowStart: Date;
  windowEnd: Date;
}

/**
 * Details of a single triggered rule.
 */
export interface TriggeredRule {
  ruleId: string;
  ruleName: string;
  action: ThresholdActionDto;
  evaluatedValue: number;
  thresholdValue: number;
  aggregateBreakdown?: AggregateBreakdown;
}

/**
 * Result of threshold evaluation for a disclosure.
 */
export interface ThresholdEvaluationResult {
  triggered: boolean;
  triggeredRules: TriggeredRule[];
  recommendedAction: ThresholdActionDto | null;
}
