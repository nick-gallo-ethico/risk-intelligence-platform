import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsUUID,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ConflictType, ExclusionScope } from "@prisma/client";

/**
 * DTO for conflict exclusion.
 */
export class ConflictExclusionDto {
  @ApiProperty({ description: "Unique identifier" })
  id: string;

  @ApiProperty({ description: "Organization ID" })
  organizationId: string;

  @ApiProperty({ description: "Person ID this exclusion applies to" })
  personId: string;

  @ApiProperty({ description: "Entity name excluded" })
  matchedEntity: string;

  @ApiProperty({ enum: ConflictType, description: "Type of conflict excluded" })
  conflictType: ConflictType;

  @ApiPropertyOptional({ description: "Original alert that created this" })
  createdFromAlertId?: string;

  @ApiProperty({ description: "Reason for the exclusion" })
  reason: string;

  @ApiPropertyOptional({ description: "Additional notes" })
  notes?: string;

  @ApiProperty({
    enum: ExclusionScope,
    description: "Scope of the exclusion",
  })
  scope: ExclusionScope;

  @ApiPropertyOptional({ description: "When the exclusion expires" })
  expiresAt?: Date;

  @ApiProperty({ description: "Whether the exclusion is active" })
  isActive: boolean;

  @ApiProperty({ description: "User who created the exclusion" })
  createdBy: string;

  @ApiProperty({ description: "When created" })
  createdAt: Date;

  @ApiProperty({ description: "When last updated" })
  updatedAt: Date;

  // Optional related data
  @ApiPropertyOptional({ description: "Person details" })
  person?: {
    id: string;
    firstName: string;
    lastName: string;
  };

  @ApiPropertyOptional({ description: "Creator user details" })
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * DTO for creating a standalone exclusion (not from dismissal).
 */
export class CreateExclusionDto {
  @ApiProperty({ description: "Person ID to create exclusion for" })
  @IsUUID()
  personId: string;

  @ApiProperty({ description: "Entity name to exclude" })
  @IsString()
  matchedEntity: string;

  @ApiProperty({
    enum: ConflictType,
    description: "Type of conflict to exclude",
  })
  @IsEnum(ConflictType)
  conflictType: ConflictType;

  @ApiProperty({ description: "Reason for the exclusion" })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: "Additional notes" })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    enum: ExclusionScope,
    description: "Scope of the exclusion",
    default: ExclusionScope.PERMANENT,
  })
  @IsOptional()
  @IsEnum(ExclusionScope)
  scope?: ExclusionScope;

  @ApiPropertyOptional({
    description: "Expiration date for TIME_LIMITED scope",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
