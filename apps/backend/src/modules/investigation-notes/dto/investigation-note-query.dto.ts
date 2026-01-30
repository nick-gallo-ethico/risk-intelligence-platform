import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  IsUUID,
  Min,
  Max,
} from "class-validator";
import { Transform } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { NoteType, NoteVisibility } from "@prisma/client";

/**
 * DTO for querying/filtering investigation notes.
 */
export class InvestigationNoteQueryDto {
  @ApiPropertyOptional({
    description: "Filter by note type",
    enum: NoteType,
    example: NoteType.INTERVIEW,
  })
  @IsEnum(NoteType)
  @IsOptional()
  noteType?: NoteType;

  @ApiPropertyOptional({
    description: "Filter by visibility level",
    enum: NoteVisibility,
    example: NoteVisibility.TEAM,
  })
  @IsEnum(NoteVisibility)
  @IsOptional()
  visibility?: NoteVisibility;

  @ApiPropertyOptional({
    description: "Filter by author UUID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  @IsOptional()
  authorId?: string;

  @ApiPropertyOptional({
    description: "Page number",
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Items per page",
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "Field to sort by",
    example: "createdAt",
    default: "createdAt",
  })
  @IsString()
  @IsOptional()
  sortBy?: string = "createdAt";

  @ApiPropertyOptional({
    description: "Sort order",
    example: "desc",
    default: "desc",
    enum: ["asc", "desc"],
  })
  @IsString()
  @IsOptional()
  sortOrder?: "asc" | "desc" = "desc";
}
