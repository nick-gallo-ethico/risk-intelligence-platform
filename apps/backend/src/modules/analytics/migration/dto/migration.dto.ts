import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MigrationSourceType,
  MigrationJobStatus,
} from '@prisma/client';

/**
 * Target entity types for field mapping
 */
export enum TargetEntityType {
  CASE = 'Case',
  RIU = 'RIU',
  PERSON = 'Person',
  INVESTIGATION = 'Investigation',
}

/**
 * Transform functions available for field mapping
 */
export enum TransformFunction {
  UPPERCASE = 'uppercase',
  LOWERCASE = 'lowercase',
  TRIM = 'trim',
  PARSE_DATE = 'parseDate',
  PARSE_DATE_US = 'parseDateUS', // MM/DD/YYYY
  PARSE_DATE_EU = 'parseDateEU', // DD/MM/YYYY
  PARSE_DATE_ISO = 'parseDateISO', // YYYY-MM-DD
  MAP_CATEGORY = 'mapCategory',
  MAP_SEVERITY = 'mapSeverity',
  MAP_STATUS = 'mapStatus',
  PARSE_BOOLEAN = 'parseBoolean',
  PARSE_NUMBER = 'parseNumber',
  SPLIT_COMMA = 'splitComma', // Split CSV values
  EXTRACT_EMAIL = 'extractEmail',
  EXTRACT_PHONE = 'extractPhone',
}

/**
 * DTO for creating a new migration job
 */
export class CreateMigrationJobDto {
  @IsEnum(MigrationSourceType)
  sourceType: MigrationSourceType;

  @IsString()
  fileName: string;

  @IsString()
  fileUrl: string;

  @IsInt()
  @Min(0)
  fileSizeBytes: number;
}

/**
 * DTO for a single field mapping
 */
export class FieldMappingDto {
  @IsString()
  sourceField: string;

  @IsString()
  targetField: string;

  @IsEnum(TargetEntityType)
  targetEntity: TargetEntityType;

  @IsOptional()
  @IsEnum(TransformFunction)
  transformFunction?: TransformFunction;

  @IsOptional()
  transformParams?: Record<string, unknown>; // Additional params for transform (e.g., date format)

  @IsOptional()
  defaultValue?: unknown;

  @IsBoolean()
  isRequired: boolean;

  @IsOptional()
  @IsString()
  description?: string; // Help text for mapping
}

/**
 * DTO for saving field mappings to a job
 */
export class SaveFieldMappingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldMappingDto)
  mappings: FieldMappingDto[];

  @IsOptional()
  @IsBoolean()
  saveAsTemplate?: boolean;

  @IsOptional()
  @IsString()
  templateName?: string;
}

/**
 * DTO for starting an import
 */
export class StartImportDto {
  @IsBoolean()
  confirmed: boolean;
}

/**
 * DTO for rollback confirmation
 */
export class RollbackDto {
  @IsString()
  @MinLength(8)
  confirmText: string; // Must be "ROLLBACK" for safety
}

/**
 * Validation error for a specific row/field
 */
export interface ValidationError {
  rowNumber: number;
  field: string;
  value: unknown;
  error: string;
  severity: 'error' | 'warning';
}

/**
 * Preview row showing transformed data
 */
export interface PreviewRow {
  rowNumber: number;
  sourceData: Record<string, unknown>;
  transformedData: {
    case?: Record<string, unknown>;
    riu?: Record<string, unknown>;
    person?: Record<string, unknown>;
    investigation?: Record<string, unknown>;
  };
  issues?: string[];
}

/**
 * Response DTO for migration job
 */
export class MigrationJobResponseDto {
  id: string;
  status: MigrationJobStatus;
  sourceType: MigrationSourceType;
  fileName: string;
  progress: number;
  currentStep?: string;
  totalRows?: number;
  validRows?: number;
  errorRows?: number;
  importedRows: number;
  previewData?: PreviewRow[];
  validationErrors?: ValidationError[];
  rollbackAvailableUntil?: Date;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Response DTO for format detection
 */
export class FormatDetectionResponseDto {
  sourceType: MigrationSourceType;
  confidence: number; // 0-100
  detectedFields: string[];
  sampleRows: Record<string, unknown>[];
  suggestedMappings: FieldMappingDto[];
}

/**
 * Response DTO for rollback check
 */
export class RollbackCheckResponseDto {
  canRollback: boolean;
  reason?: string;
  modifiedCount?: number;
  totalRecords?: number;
  expiresAt?: Date;
}

/**
 * Response DTO for rollback result
 */
export class RollbackResultResponseDto {
  rolledBackCount: number;
  skippedCount: number;
  skippedReasons: string[];
}

/**
 * Query DTO for listing migration jobs
 */
export class MigrationJobQueryDto {
  @IsOptional()
  @IsEnum(MigrationJobStatus)
  status?: MigrationJobStatus;

  @IsOptional()
  @IsEnum(MigrationSourceType)
  sourceType?: MigrationSourceType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 20;
}
