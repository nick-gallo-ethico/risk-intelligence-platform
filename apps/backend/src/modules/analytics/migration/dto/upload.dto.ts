import { IsString, IsOptional, IsEnum } from "class-validator";
import { MigrationSourceType } from "@prisma/client";

/**
 * DTO for uploading a migration file.
 */
export class UploadMigrationFileDto {
  @IsOptional()
  @IsEnum(MigrationSourceType)
  hintSourceType?: MigrationSourceType;

  @IsOptional()
  @IsString()
  description?: string;
}

/**
 * Result of a migration file upload.
 */
export class UploadResultDto {
  jobId: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  detectedSourceType: MigrationSourceType;
  detectedFields: string[];
  sampleRows: Record<string, unknown>[];
  confidence: number;
  warnings: string[];
}

/**
 * Result of format detection from file contents.
 */
export class FormatDetectionResult {
  sourceType: MigrationSourceType;
  confidence: number; // 0-100
  detectedFields: string[];
  sampleRows: Record<string, unknown>[];
  warnings: string[];
  delimiter?: string; // For CSV files
  hasHeaders: boolean;
  encoding: string;
  totalRows?: number;
}

/**
 * Known field patterns for each source type.
 * Used to detect the source system from column headers.
 */
export const SOURCE_FIELD_PATTERNS: Record<MigrationSourceType, string[]> = {
  NAVEX: [
    "case_number",
    "case_id",
    "incident_type",
    "incident_date",
    "reporter_type",
    "location",
    "business_unit",
    "subject_name",
    "allegation",
    "status",
    "assigned_to",
    "created_date",
    "closed_date",
  ],
  EQS: [
    "report_id",
    "report_date",
    "category",
    "subcategory",
    "description",
    "reporter_relationship",
    "anonymous",
    "location_country",
    "location_region",
    "status",
    "handler",
  ],
  LEGACY_ETHICO: [
    "call_id",
    "call_date",
    "hotline_type",
    "caller_type",
    "incident_summary",
    "organization",
    "department",
    "case_status",
    "investigator",
    "resolution",
  ],
  GENERIC_CSV: [], // Detected dynamically - accepts any headers
  ONETRUST: [
    "incident_id",
    "created_at",
    "type",
    "severity",
    "department",
    "submitted_by",
    "description",
    "state",
  ],
  STAR: [
    "matter_id",
    "matter_type",
    "report_date",
    "category",
    "business_area",
    "reporter",
    "narrative",
    "status",
  ],
};
