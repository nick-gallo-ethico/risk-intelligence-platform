import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsObject,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";

/**
 * Severity-specific SLA override configuration.
 */
export class SeverityOverridesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  HIGH?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  MEDIUM?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  LOW?: number;
}

/**
 * DTO for updating case SLA configuration for an organization.
 *
 * All fields are optional - partial updates are supported.
 * The service will merge with existing configuration.
 */
export class UpdateCaseSlaConfigDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  defaultDays?: number;

  @IsOptional()
  @IsInt()
  @Min(50)
  @Max(99)
  warningThresholdPercent?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(168) // Max 1 week
  criticalThresholdHours?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => SeverityOverridesDto)
  severityOverrides?: SeverityOverridesDto;

  @IsOptional()
  @IsObject()
  categoryOverrides?: Record<string, number>;
}
