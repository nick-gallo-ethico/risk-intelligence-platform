import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUUID,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ExclusionScope } from "@prisma/client";
import { DismissalCategory } from "./conflict-context.dto";

/**
 * DTO for dismissing a conflict alert.
 * RS.44: Dismissals can optionally create exclusions.
 */
export class DismissConflictDto {
  @ApiProperty({
    description: "Category of dismissal",
    enum: Object.values(DismissalCategory),
  })
  @IsString()
  category: DismissalCategory;

  @ApiProperty({ description: "Explanation for the dismissal" })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: "Create an exclusion to prevent future matches",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  createExclusion?: boolean;

  @ApiPropertyOptional({
    description: "Scope of exclusion if created",
    enum: ExclusionScope,
    default: ExclusionScope.PERMANENT,
  })
  @IsOptional()
  @IsEnum(ExclusionScope)
  exclusionScope?: ExclusionScope;

  @ApiPropertyOptional({
    description: "Expiration date for TIME_LIMITED exclusions",
  })
  @IsOptional()
  @IsDateString()
  exclusionExpiresAt?: string;

  @ApiPropertyOptional({ description: "Additional notes for the exclusion" })
  @IsOptional()
  @IsString()
  exclusionNotes?: string;
}

/**
 * DTO for escalating a conflict to a case.
 */
export class EscalateConflictDto {
  @ApiPropertyOptional({
    description: "Existing case ID to link to",
  })
  @IsOptional()
  @IsUUID()
  existingCaseId?: string;

  @ApiPropertyOptional({
    description: "Notes to add to the escalation",
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
