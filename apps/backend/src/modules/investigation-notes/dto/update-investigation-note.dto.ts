import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { NoteType, NoteVisibility } from "@prisma/client";
import { AttachmentDto } from "./attachment.dto";

/**
 * DTO for updating an investigation note.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateInvestigationNoteDto {
  @ApiPropertyOptional({
    description: "Note content (supports rich text/markdown)",
    maxLength: 50000,
    example: "Updated interview notes with additional details...",
  })
  @IsString()
  @MaxLength(50000)
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({
    description: "Type of note",
    enum: NoteType,
    example: NoteType.INTERVIEW,
  })
  @IsEnum(NoteType)
  @IsOptional()
  noteType?: NoteType;

  @ApiPropertyOptional({
    description: "Visibility level for the note",
    enum: NoteVisibility,
    example: NoteVisibility.TEAM,
  })
  @IsEnum(NoteVisibility)
  @IsOptional()
  visibility?: NoteVisibility;

  @ApiPropertyOptional({
    description: "File attachments for the note (replaces existing)",
    type: [AttachmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];
}
