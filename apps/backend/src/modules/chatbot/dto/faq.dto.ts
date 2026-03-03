import {
  IsString,
  IsOptional,
  IsArray,
  IsInt,
  IsEnum,
  MaxLength,
  Min,
  Max,
  ValidateNested,
  IsUUID,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { FaqStatus } from "../entities/faq-entry.entity";

/**
 * DTO for related policy reference in FAQ.
 */
export class RelatedPolicyDto {
  @ApiProperty({ description: "Policy ID" })
  @IsUUID()
  policyId: string;

  @ApiProperty({ description: "Policy title for display" })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: "Specific section reference" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  section?: string;

  @ApiPropertyOptional({ description: "Policy version number" })
  @IsInt()
  @IsOptional()
  @Min(1)
  version?: number;
}

/**
 * DTO for creating a new FAQ entry.
 */
export class CreateFaqDto {
  @ApiProperty({ description: "The FAQ question" })
  @IsString()
  @MaxLength(1000)
  question: string;

  @ApiProperty({ description: "The FAQ answer" })
  @IsString()
  @MaxLength(10000)
  answer: string;

  @ApiPropertyOptional({ description: "Related policies supporting this FAQ" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelatedPolicyDto)
  @IsOptional()
  relatedPolicies?: RelatedPolicyDto[];

  @ApiPropertyOptional({ description: "Category for organization" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: "Tags for filtering", default: [] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: "Priority (higher = matched first)",
    default: 0,
  })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({
    description: "FAQ status",
    enum: FaqStatus,
    default: FaqStatus.DRAFT,
  })
  @IsEnum(FaqStatus)
  @IsOptional()
  status?: FaqStatus;
}

/**
 * DTO for updating an existing FAQ entry.
 */
export class UpdateFaqDto {
  @ApiPropertyOptional({ description: "The FAQ question" })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  question?: string;

  @ApiPropertyOptional({ description: "The FAQ answer" })
  @IsString()
  @IsOptional()
  @MaxLength(10000)
  answer?: string;

  @ApiPropertyOptional({ description: "Related policies supporting this FAQ" })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelatedPolicyDto)
  @IsOptional()
  relatedPolicies?: RelatedPolicyDto[];

  @ApiPropertyOptional({ description: "Category for organization" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: "Tags for filtering" })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: "Priority (higher = matched first)" })
  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(1000)
  priority?: number;

  @ApiPropertyOptional({ description: "FAQ status", enum: FaqStatus })
  @IsEnum(FaqStatus)
  @IsOptional()
  status?: FaqStatus;
}

/**
 * DTO for searching FAQs.
 */
export class FaqSearchDto {
  @ApiProperty({ description: "Search query to match against questions" })
  @IsString()
  @MaxLength(500)
  query: string;

  @ApiPropertyOptional({ description: "Filter by category" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: "Filter by tags" })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: "Minimum similarity score (0-1)",
    default: 0.7,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  @Max(1)
  minSimilarity?: number;

  @ApiPropertyOptional({ description: "Maximum number of results", default: 5 })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  limit?: number;
}

/**
 * DTO for listing FAQs with pagination.
 */
export class ListFaqsDto {
  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ description: "Page size", default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number;

  @ApiPropertyOptional({ description: "Filter by category" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: "Filter by status", enum: FaqStatus })
  @IsEnum(FaqStatus)
  @IsOptional()
  status?: FaqStatus;

  @ApiPropertyOptional({ description: "Search text in question/answer" })
  @IsString()
  @IsOptional()
  search?: string;
}

/**
 * Response interface for FAQ list.
 */
export interface FaqListResponse {
  faqs: FaqResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Response DTO for a single FAQ entry.
 */
export interface FaqResponseDto {
  id: string;
  organizationId: string;
  question: string;
  answer: string;
  relatedPolicies?: RelatedPolicyDto[];
  category?: string;
  tags: string[];
  priority: number;
  status: FaqStatus;
  viewCount: number;
  helpfulCount: number;
  helpfulnessRatio?: number;
  similarityScore?: number;
  createdById: string;
  updatedById?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for recording FAQ feedback (helpful/not helpful).
 */
export class FaqFeedbackDto {
  @ApiProperty({ description: "Whether the FAQ was helpful" })
  helpful: boolean;
}
