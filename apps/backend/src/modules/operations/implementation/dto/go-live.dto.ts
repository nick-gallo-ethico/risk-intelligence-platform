/**
 * Go-Live DTOs
 *
 * Data transfer objects for go-live readiness operations:
 * - Gate status updates
 * - Readiness item progress
 * - Client sign-off workflow
 * - Internal approval workflow
 */

import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  IsEnum,
  IsEmail,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { GateStatus } from "../../types/go-live.types";

/**
 * DTO for updating a hard gate status
 */
export class UpdateGateDto {
  @IsEnum(GateStatus)
  status: GateStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  waiverReason?: string;
}

/**
 * DTO for updating a readiness item
 */
export class UpdateReadinessItemDto {
  @IsBoolean()
  isComplete: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  percentComplete?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for client sign-off
 * Required when proceeding below recommended threshold
 */
export class ClientSignoffDto {
  @IsString()
  clientSignerName: string;

  @IsEmail()
  clientSignerEmail: string;

  @IsArray()
  @IsString({ each: true })
  acknowledgedRisks: string[];

  @IsString()
  signoffStatement: string;
}

/**
 * DTO for internal approval
 * Follows client sign-off
 */
export class InternalApprovalDto {
  @IsString()
  internalApproverName: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
