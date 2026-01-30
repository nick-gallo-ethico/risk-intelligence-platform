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
import { NoteType, NoteVisibility } from "@prisma/client";

/**
 * DTO for querying/filtering investigation notes.
 */
export class InvestigationNoteQueryDto {
  @IsEnum(NoteType)
  @IsOptional()
  noteType?: NoteType;

  @IsEnum(NoteVisibility)
  @IsOptional()
  visibility?: NoteVisibility;

  @IsUUID()
  @IsOptional()
  authorId?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 20;

  @IsString()
  @IsOptional()
  sortBy?: string = "createdAt";

  @IsString()
  @IsOptional()
  sortOrder?: "asc" | "desc" = "desc";
}
