/**
 * Support Console DTOs
 *
 * DTOs for the support console service - tenant search, error log filtering, etc.
 * Support team uses these to diagnose issues within impersonated tenants.
 */

import { IsString, IsOptional, IsEnum, IsDateString } from "class-validator";
import { Type } from "class-transformer";

/**
 * DTO for searching tenants by name, domain, or ID
 */
export class TenantSearchDto {
  @IsOptional()
  @IsString()
  query?: string; // Search by name, domain, or ID

  @IsOptional()
  @IsString()
  status?: string; // 'active' | 'inactive'
}

/**
 * DTO for filtering error logs
 */
export class ErrorLogFiltersDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(["error", "warn", "info"])
  level?: string;

  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

/**
 * Response for job queue status
 */
export interface JobQueueStatusResponse {
  exports: Array<{
    id: string;
    status: string;
    createdAt: Date;
  }>;
  migrations: Array<{
    id: string;
    status: string;
    createdAt: Date;
  }>;
}

/**
 * Response for search index status
 */
export interface SearchIndexStatusResponse {
  database: {
    cases: number;
    rius: number;
  };
  elasticsearch: {
    cases: number | "N/A";
    rius: number | "N/A";
  };
  lastIndexed: Date | null;
}
