import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsUUID,
  IsDateString,
  Min,
  Max,
  MaxLength,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PolicyCaseLinkType, PolicyType } from "@prisma/client";

// ===========================================
// Create Policy-Case Association DTO
// ===========================================

/**
 * DTO for creating a policy-to-case association.
 * Links a policy (specific version) to a case for violation tracking,
 * reference documentation, or governance mapping.
 */
export class CreatePolicyCaseAssociationDto {
  @ApiProperty({
    description: "Policy ID to link",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID("4", { message: "policyId must be a valid UUID" })
  policyId: string;

  @ApiPropertyOptional({
    description:
      "Specific policy version ID (defaults to latest published version)",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsUUID("4", { message: "policyVersionId must be a valid UUID" })
  @IsOptional()
  policyVersionId?: string;

  @ApiProperty({
    description: "Case ID to link to",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @IsUUID("4", { message: "caseId must be a valid UUID" })
  caseId: string;

  @ApiProperty({
    description: "Type of link between policy and case",
    enum: PolicyCaseLinkType,
    example: PolicyCaseLinkType.VIOLATION,
  })
  @IsEnum(PolicyCaseLinkType)
  linkType: PolicyCaseLinkType;

  @ApiPropertyOptional({
    description: "Reason for linking policy to case",
    maxLength: 2000,
    example:
      "Employee violated Section 3.2 of the gift policy by accepting vendor gifts over $100.",
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  linkReason?: string;

  @ApiPropertyOptional({
    description: "Date when violation occurred (for VIOLATION link type)",
    example: "2026-01-15",
  })
  @IsDateString({}, { message: "violationDate must be a valid ISO 8601 date" })
  @IsOptional()
  violationDate?: string;
}

// ===========================================
// Update Policy-Case Association DTO
// ===========================================

/**
 * DTO for updating a policy-to-case association.
 * All fields optional - only provided fields are updated.
 */
export class UpdatePolicyCaseAssociationDto {
  @ApiPropertyOptional({
    description: "Type of link between policy and case",
    enum: PolicyCaseLinkType,
    example: PolicyCaseLinkType.REFERENCE,
  })
  @IsEnum(PolicyCaseLinkType)
  @IsOptional()
  linkType?: PolicyCaseLinkType;

  @ApiPropertyOptional({
    description: "Reason for linking policy to case",
    maxLength: 2000,
    example: "Updated link reason after investigation findings.",
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  linkReason?: string;

  @ApiPropertyOptional({
    description: "Date when violation occurred (for VIOLATION link type)",
    example: "2026-01-15",
  })
  @IsDateString({}, { message: "violationDate must be a valid ISO 8601 date" })
  @IsOptional()
  violationDate?: string;
}

// ===========================================
// Policy-Case Query DTO
// ===========================================

/**
 * DTO for querying/filtering policy-case associations.
 * Supports pagination, filtering by policy, case, or link type.
 */
export class PolicyCaseQueryDto {
  // ===========================================
  // Filters
  // ===========================================

  @ApiPropertyOptional({
    description: "Filter by policy ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID("4", { message: "policyId must be a valid UUID" })
  @IsOptional()
  policyId?: string;

  @ApiPropertyOptional({
    description: "Filter by case ID",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  @IsUUID("4", { message: "caseId must be a valid UUID" })
  @IsOptional()
  caseId?: string;

  @ApiPropertyOptional({
    description: "Filter by link type",
    enum: PolicyCaseLinkType,
    example: PolicyCaseLinkType.VIOLATION,
  })
  @IsEnum(PolicyCaseLinkType)
  @IsOptional()
  linkType?: PolicyCaseLinkType;

  // ===========================================
  // Pagination
  // ===========================================

  @ApiPropertyOptional({
    description: "Page number (1-indexed)",
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;
}

// ===========================================
// Violation Stats Query DTO
// ===========================================

/**
 * DTO for querying violation statistics.
 * Supports filtering by date range and policy type.
 */
export class ViolationStatsQueryDto {
  @ApiPropertyOptional({
    description: "Start date for violation stats (ISO 8601)",
    example: "2026-01-01",
  })
  @IsDateString({}, { message: "startDate must be a valid ISO 8601 date" })
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: "End date for violation stats (ISO 8601)",
    example: "2026-12-31",
  })
  @IsDateString({}, { message: "endDate must be a valid ISO 8601 date" })
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: "Filter by policy type",
    enum: PolicyType,
    example: PolicyType.CODE_OF_CONDUCT,
  })
  @IsEnum(PolicyType)
  @IsOptional()
  policyType?: PolicyType;
}

// ===========================================
// Response Types (for documentation)
// ===========================================

/**
 * Violation statistics response item.
 * Used by getViolationStats endpoint.
 */
export interface ViolationStatItem {
  policyId: string;
  policyTitle: string;
  policyType: PolicyType;
  violationCount: number;
}
