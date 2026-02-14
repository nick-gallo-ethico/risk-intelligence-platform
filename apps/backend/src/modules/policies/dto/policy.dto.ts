import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsUUID,
  IsBoolean,
  IsDateString,
  Min,
  Max,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PolicyType, PolicyStatus, PolicyCaseLinkType } from "@prisma/client";

// ===========================================
// Create Policy DTO
// ===========================================

/**
 * DTO for creating a new policy.
 * Creates a policy in DRAFT status with optional initial content.
 */
export class CreatePolicyDto {
  @ApiProperty({
    description: "Policy title",
    example: "Code of Conduct",
    minLength: 1,
    maxLength: 500,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  @ApiProperty({
    description: "Type of policy",
    enum: PolicyType,
    example: PolicyType.CODE_OF_CONDUCT,
  })
  @IsEnum(PolicyType)
  policyType: PolicyType;

  @ApiPropertyOptional({
    description: "Optional category for additional classification",
    maxLength: 255,
    example: "Corporate Governance",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  category?: string;

  @ApiPropertyOptional({
    description: "Initial draft content (HTML)",
    example: "<h1>Code of Conduct</h1><p>This policy outlines...</p>",
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: "Policy owner user ID (defaults to current user)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID("4", { message: "ownerId must be a valid UUID" })
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({
    description: "Effective date when policy becomes active (ISO 8601)",
    example: "2026-03-01",
  })
  @IsDateString({}, { message: "effectiveDate must be a valid ISO 8601 date" })
  @IsOptional()
  effectiveDate?: string;

  @ApiPropertyOptional({
    description: "Scheduled review date (ISO 8601)",
    example: "2027-03-01",
  })
  @IsDateString({}, { message: "reviewDate must be a valid ISO 8601 date" })
  @IsOptional()
  reviewDate?: string;
}

// ===========================================
// Update Policy DTO
// ===========================================

/**
 * DTO for updating a policy.
 * All fields optional - only provided fields are updated.
 */
export class UpdatePolicyDto {
  @ApiPropertyOptional({
    description: "Policy title",
    minLength: 1,
    maxLength: 500,
    example: "Updated Code of Conduct",
  })
  @IsString()
  @IsOptional()
  @MinLength(1)
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({
    description: "Type of policy",
    enum: PolicyType,
    example: PolicyType.CODE_OF_CONDUCT,
  })
  @IsEnum(PolicyType)
  @IsOptional()
  policyType?: PolicyType;

  @ApiPropertyOptional({
    description: "Optional category for additional classification",
    maxLength: 255,
    example: "Corporate Governance",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  category?: string;

  @ApiPropertyOptional({
    description: "Draft content (HTML) - updates the working draft",
    example: "<h1>Code of Conduct</h1><p>Updated content...</p>",
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: "Policy owner user ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID("4", { message: "ownerId must be a valid UUID" })
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({
    description: "Effective date when policy becomes active (ISO 8601)",
    example: "2026-03-01",
  })
  @IsDateString({}, { message: "effectiveDate must be a valid ISO 8601 date" })
  @IsOptional()
  effectiveDate?: string;

  @ApiPropertyOptional({
    description: "Scheduled review date (ISO 8601)",
    example: "2027-03-01",
  })
  @IsDateString({}, { message: "reviewDate must be a valid ISO 8601 date" })
  @IsOptional()
  reviewDate?: string;
}

// ===========================================
// Publish Policy DTO
// ===========================================

/**
 * DTO for publishing a policy version.
 * Creates an immutable PolicyVersion snapshot from current draft.
 */
export class PublishPolicyDto {
  @ApiPropertyOptional({
    description: 'Version label (e.g., "v1.0", "2026 Update")',
    maxLength: 100,
    example: "v1.0",
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  versionLabel?: string;

  @ApiPropertyOptional({
    description: "Brief summary of the policy (AI-generated or manual)",
    maxLength: 2000,
    example:
      "This code of conduct establishes expected behavior standards for all employees.",
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  summary?: string;

  @ApiPropertyOptional({
    description: "Description of changes from previous version",
    maxLength: 5000,
    example:
      "Updated harassment policy section to include remote work scenarios.",
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  changeNotes?: string;

  @ApiPropertyOptional({
    description: "Effective date for this version (defaults to now)",
    example: "2026-03-01",
  })
  @IsDateString({}, { message: "effectiveDate must be a valid ISO 8601 date" })
  @IsOptional()
  effectiveDate?: string;

  @ApiPropertyOptional({
    description: "Whether this publish requires employees to re-attest",
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  requireReAttestation?: boolean;

  @ApiPropertyOptional({
    description:
      "Reason for requiring re-attestation (required if requireReAttestation is true)",
    maxLength: 1000,
    example: "Significant changes to harassment policy require acknowledgment.",
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  @ValidateIf((o) => o.requireReAttestation === true)
  reAttestationReason?: string;
}

// ===========================================
// Policy Query DTO
// ===========================================

/**
 * DTO for querying/filtering policies.
 * Supports pagination, filtering, search, and sorting.
 */
export class PolicyQueryDto {
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

  // ===========================================
  // Filters
  // ===========================================

  @ApiPropertyOptional({
    description: "Filter by policy status",
    enum: PolicyStatus,
    example: PolicyStatus.PUBLISHED,
  })
  @IsEnum(PolicyStatus)
  @IsOptional()
  status?: PolicyStatus;

  @ApiPropertyOptional({
    description: "Filter by policy type",
    enum: PolicyType,
    example: PolicyType.CODE_OF_CONDUCT,
  })
  @IsEnum(PolicyType)
  @IsOptional()
  policyType?: PolicyType;

  @ApiPropertyOptional({
    description: "Filter by policy owner user ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID("4", { message: "ownerId must be a valid UUID" })
  @IsOptional()
  ownerId?: string;

  // ===========================================
  // Search
  // ===========================================

  @ApiPropertyOptional({
    description: "Full-text search query (searches title and content)",
    maxLength: 200,
    example: "harassment policy",
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  search?: string;

  // ===========================================
  // Sorting
  // ===========================================

  @ApiPropertyOptional({
    description: "Field to sort by",
    example: "updatedAt",
    default: "updatedAt",
    enum: [
      "title",
      "createdAt",
      "updatedAt",
      "effectiveDate",
      "reviewDate",
      "policyType",
      "status",
    ],
  })
  @IsString()
  @IsOptional()
  sortBy?:
    | "title"
    | "createdAt"
    | "updatedAt"
    | "effectiveDate"
    | "reviewDate"
    | "policyType"
    | "status" = "updatedAt";

  @ApiPropertyOptional({
    description: "Sort order",
    example: "desc",
    default: "desc",
    enum: ["asc", "desc"],
  })
  @IsString()
  @IsOptional()
  sortOrder?: "asc" | "desc" = "desc";
}

// ===========================================
// Create Translation DTO
// ===========================================

/**
 * DTO for creating a policy translation.
 * Can be AI-generated (content optional) or human-provided (content required).
 */
export class CreateTranslationDto {
  @ApiProperty({
    description: "Policy version ID to translate",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID("4", { message: "policyVersionId must be a valid UUID" })
  policyVersionId: string;

  @ApiProperty({
    description: "Target language code (ISO 639-1)",
    example: "es",
    minLength: 2,
    maxLength: 5,
  })
  @IsString()
  @MinLength(2)
  @MaxLength(5)
  languageCode: string;

  @ApiPropertyOptional({
    description: "Language display name (derived if not provided)",
    maxLength: 100,
    example: "Spanish",
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  languageName?: string;

  @ApiPropertyOptional({
    description: "Translated content (HTML) - omit for AI translation",
    example: "<h1>Codigo de Conducta</h1><p>Esta politica describe...</p>",
  })
  @IsString()
  @IsOptional()
  content?: string;
}

// ===========================================
// Link Policy to Case DTO
// ===========================================

/**
 * DTO for linking a policy to a case.
 * Used for violation tracking, reference, or governance association.
 */
export class LinkPolicyToCaseDto {
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
