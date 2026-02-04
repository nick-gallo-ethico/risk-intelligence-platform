import {
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  ValidateNested,
  Min,
  IsUUID,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * "Mom test" friendly targeting modes.
 * Simple mode uses checkboxes, advanced mode allows complex rules.
 */
export enum TargetingMode {
  /** Target all active employees */
  ALL = "all",
  /** Simple checkbox-based targeting (departments, locations) */
  SIMPLE = "simple",
  /** Advanced rule-based targeting with full criteria */
  ADVANCED = "advanced",
}

/**
 * Simple targeting for "mom test" friendly UI.
 * Just checkboxes: select departments, locations, and optionally include teams.
 *
 * @example
 * // "Everyone in Finance and Legal departments"
 * { departments: ['uuid-finance', 'uuid-legal'] }
 *
 * // "US locations only"
 * { locations: ['uuid-ny', 'uuid-la', 'uuid-chicago'] }
 *
 * // "Finance department plus all their direct reports"
 * { departments: ['uuid-finance'], includeSubordinates: true }
 */
export class SimpleTargetingDto {
  @ApiPropertyOptional({
    description: "Department IDs to include",
    example: ["uuid-finance", "uuid-legal"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  departments?: string[];

  @ApiPropertyOptional({
    description: "Location IDs to include",
    example: ["uuid-new-york", "uuid-london"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  locations?: string[];

  @ApiPropertyOptional({
    description: "Business unit IDs to include",
    example: ["uuid-healthcare", "uuid-tech"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  businessUnits?: string[];

  @ApiPropertyOptional({
    description: "Division IDs to include",
    example: ["uuid-north-america"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  divisions?: string[];

  @ApiPropertyOptional({
    description: "Include all subordinates of matched employees (walks org hierarchy)",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  includeSubordinates?: boolean;
}

/**
 * Previous campaign response filter for targeting.
 * Example: "Everyone who completed last year's COI disclosure"
 */
export class PreviousCampaignResponseDto {
  @ApiProperty({
    description: "Campaign ID to check",
    example: "uuid-2025-coi",
  })
  @IsUUID("4")
  campaignId: string;

  @ApiProperty({
    description: "Response status to match (completed, pending, overdue)",
    example: "completed",
  })
  @IsString()
  status: string;
}

/**
 * Advanced targeting for power users.
 * Supports tenure, hierarchy depth, job titles, and custom HRIS attributes.
 *
 * @example
 * // "All managers hired 90+ days ago"
 * {
 *   tenureMinDays: 90,
 *   managerHierarchyDepth: 1
 * }
 *
 * // "Everyone except these specific people"
 * {
 *   exclusions: ['uuid-ceo', 'uuid-cfo']
 * }
 */
export class AdvancedTargetingDto {
  @ApiPropertyOptional({
    description: "Specific job titles to include (case insensitive contains)",
    example: ["Manager", "Director", "VP"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobTitles?: string[];

  @ApiPropertyOptional({
    description: "Manager hierarchy depth to include (1 = direct reports, 2 = direct + skip-level, etc.)",
    example: 2,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  managerHierarchyDepth?: number;

  @ApiPropertyOptional({
    description: "Minimum tenure in days (hired at least X days ago)",
    example: 90,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tenureMinDays?: number;

  @ApiPropertyOptional({
    description: "Maximum tenure in days (hired no more than X days ago)",
    example: 365,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tenureMaxDays?: number;

  @ApiPropertyOptional({
    description: "Compliance roles to include",
    example: ["CCO", "COMPLIANCE_OFFICER", "INVESTIGATOR"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  complianceRoles?: string[];

  @ApiPropertyOptional({
    description: "Job levels to include",
    example: ["MANAGER", "DIRECTOR", "VP", "C_LEVEL"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  jobLevels?: string[];

  @ApiPropertyOptional({
    description: "Primary languages to include (ISO 639-1 codes)",
    example: ["en", "es", "fr"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  primaryLanguages?: string[];

  @ApiPropertyOptional({
    description: "Work modes to include",
    example: ["REMOTE", "HYBRID"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workModes?: string[];

  @ApiPropertyOptional({
    description: "Custom HRIS attributes to filter on (organization-specific)",
    example: { certifications: ["HIPAA", "SOX"], clearanceLevel: "SECRET" },
  })
  @IsOptional()
  customAttributes?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: "Filter by previous campaign responses",
    type: [PreviousCampaignResponseDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PreviousCampaignResponseDto)
  previousCampaignResponses?: PreviousCampaignResponseDto[];

  @ApiPropertyOptional({
    description: "Employee IDs to explicitly exclude",
    example: ["uuid-ceo", "uuid-on-leave"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  exclusions?: string[];
}

/**
 * Unified targeting criteria DTO.
 * Supports three modes: all, simple (mom-test friendly), and advanced (power user).
 */
export class TargetingCriteriaDto {
  @ApiProperty({
    enum: TargetingMode,
    description: "Targeting mode: all employees, simple (checkboxes), or advanced (rules)",
    example: TargetingMode.SIMPLE,
  })
  @IsEnum(TargetingMode)
  mode: TargetingMode;

  @ApiPropertyOptional({
    description: "Simple targeting options (for mode=simple)",
    type: SimpleTargetingDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SimpleTargetingDto)
  simple?: SimpleTargetingDto;

  @ApiPropertyOptional({
    description: "Advanced targeting options (for mode=advanced)",
    type: AdvancedTargetingDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AdvancedTargetingDto)
  advanced?: AdvancedTargetingDto;
}

/**
 * Employee preview item for audience preview.
 */
export class AudienceEmployeePreviewDto {
  @ApiProperty({ description: "Employee ID" })
  id: string;

  @ApiProperty({ description: "Full name (firstName lastName)" })
  name: string;

  @ApiPropertyOptional({ description: "Department name" })
  department?: string;

  @ApiPropertyOptional({ description: "Location name" })
  location?: string;

  @ApiProperty({ description: "Work email" })
  email: string;

  @ApiPropertyOptional({ description: "Job title" })
  jobTitle?: string;
}

/**
 * Audience preview response.
 * Shows count and sample employees before campaign launch.
 */
export class AudiencePreviewDto {
  @ApiProperty({
    description: "Total number of employees matching criteria",
    example: 1247,
  })
  totalCount: number;

  @ApiProperty({
    description: "Sample of matching employees (paginated)",
    type: [AudienceEmployeePreviewDto],
  })
  employees: AudienceEmployeePreviewDto[];

  @ApiProperty({
    description: "Human-readable description of targeting criteria",
    example: "Everyone in Finance and Legal departments, US locations only, 90+ days tenure",
  })
  criteriaDescription: string;

  @ApiPropertyOptional({
    description: "Total pages available (for pagination)",
  })
  totalPages?: number;

  @ApiPropertyOptional({
    description: "Current page number",
  })
  currentPage?: number;
}

/**
 * Available targeting attribute from HRIS.
 * Used to populate the targeting UI with available options.
 */
export class TargetingAttributeDto {
  @ApiProperty({
    description: "Attribute key/field name",
    example: "departmentId",
  })
  key: string;

  @ApiProperty({
    description: "Human-readable label",
    example: "Department",
  })
  label: string;

  @ApiProperty({
    description: "Attribute type for UI rendering",
    example: "select",
  })
  type: "select" | "multiselect" | "text" | "number" | "date" | "boolean";

  @ApiPropertyOptional({
    description: "Available options for select/multiselect types",
    example: [
      { value: "uuid-finance", label: "Finance" },
      { value: "uuid-legal", label: "Legal" },
    ],
  })
  options?: { value: string; label: string }[];

  @ApiPropertyOptional({
    description: "Whether this is a custom HRIS attribute",
    default: false,
  })
  isCustom?: boolean;

  @ApiPropertyOptional({
    description: "Category for grouping in UI",
    example: "Organization Structure",
  })
  category?: string;
}

/**
 * Validation result for targeting criteria.
 */
export class TargetingValidationResultDto {
  @ApiProperty({
    description: "Whether the criteria is valid",
  })
  isValid: boolean;

  @ApiPropertyOptional({
    description: "Validation errors if any",
    type: [String],
  })
  errors?: string[];

  @ApiPropertyOptional({
    description: "Validation warnings (non-blocking)",
    type: [String],
  })
  warnings?: string[];

  @ApiPropertyOptional({
    description: "Estimated audience count",
  })
  estimatedCount?: number;
}
