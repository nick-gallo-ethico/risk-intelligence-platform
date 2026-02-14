/**
 * DTOs for employee history view endpoints.
 */
import { IsOptional, IsString, IsInt, Min, Max, IsEnum } from "class-validator";
import { Transform, Type } from "class-transformer";

/**
 * Status filter for attestation list.
 */
export enum AttestationStatusFilter {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  ALL = "ALL",
}

/**
 * Query parameters for fetching employee reports.
 */
export class GetReportsQueryDto {
  /**
   * Filter by RIU status (comma-separated).
   */
  @IsOptional()
  @IsString()
  status?: string;

  /**
   * Page number (1-indexed).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Number of items per page.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Query parameters for fetching employee disclosures.
 */
export class GetDisclosuresQueryDto {
  /**
   * Filter by disclosure type (e.g., COI, GIFT).
   */
  @IsOptional()
  @IsString()
  type?: string;

  /**
   * Page number (1-indexed).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Number of items per page.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/**
 * Query parameters for fetching employee attestations.
 */
export class GetAttestationsQueryDto {
  /**
   * Filter by status: pending, completed, or all.
   */
  @IsOptional()
  @IsEnum(AttestationStatusFilter)
  status?: AttestationStatusFilter = AttestationStatusFilter.ALL;

  /**
   * Page number (1-indexed).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /**
   * Number of items per page.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
