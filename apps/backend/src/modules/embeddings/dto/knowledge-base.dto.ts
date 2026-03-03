import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

/**
 * Status of a knowledge base document.
 */
export enum KnowledgeBaseDocStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  EMBEDDED = "EMBEDDED",
  FAILED = "FAILED",
}

/**
 * DTO for creating a knowledge base document.
 */
export class CreateKnowledgeBaseDocDto {
  @ApiProperty({ description: "Document title" })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: "Document description" })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: "Category for organization" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;
}

/**
 * DTO for updating a knowledge base document.
 */
export class UpdateKnowledgeBaseDocDto {
  @ApiPropertyOptional({ description: "Document title" })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ description: "Document description" })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ description: "Category for organization" })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;
}

/**
 * Knowledge base document response.
 */
export interface KnowledgeBaseDocResponse {
  id: string;
  organizationId: string;
  title: string;
  description?: string;
  category?: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: KnowledgeBaseDocStatus;
  chunkCount: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
}

/**
 * List knowledge base documents response.
 */
export interface KnowledgeBaseListResponse {
  documents: KnowledgeBaseDocResponse[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Query params for listing knowledge base documents.
 */
export class ListKnowledgeBaseDocsDto {
  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Page size", default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20;

  @ApiPropertyOptional({ description: "Filter by category" })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: "Filter by status" })
  @IsEnum(KnowledgeBaseDocStatus)
  @IsOptional()
  status?: KnowledgeBaseDocStatus;
}
