import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CaseStatus, Severity, SourceChannel } from '@prisma/client';

/**
 * DTO for querying/filtering cases.
 */
export class CaseQueryDto {
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  offset?: number = 0;

  @IsEnum(CaseStatus)
  @IsOptional()
  status?: CaseStatus;

  @IsEnum(Severity)
  @IsOptional()
  severity?: Severity;

  @IsEnum(SourceChannel)
  @IsOptional()
  sourceChannel?: SourceChannel;

  @IsString()
  @IsOptional()
  search?: string;

  @IsDateString()
  @IsOptional()
  createdAfter?: string;

  @IsDateString()
  @IsOptional()
  createdBefore?: string;

  @IsString()
  @IsOptional()
  sortBy?: 'createdAt' | 'updatedAt' | 'referenceNumber' | 'severity' = 'createdAt';

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
