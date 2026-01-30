import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsArray,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { NoteType, NoteVisibility } from "@prisma/client";
import { AttachmentDto } from "./attachment.dto";

/**
 * DTO for creating a new investigation note.
 * Note: investigationId and organizationId are set from route params/context, not user input.
 * Note: authorId and authorName are set from the authenticated user context.
 */
export class CreateInvestigationNoteDto {
  @ApiProperty({
    description: "Note content (supports rich text/markdown)",
    maxLength: 50000,
    example: "Interviewed witness regarding the reported incident...",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  content: string;

  @ApiProperty({
    description: "Type of note",
    enum: NoteType,
    example: NoteType.INTERVIEW,
  })
  @IsEnum(NoteType)
  noteType: NoteType;

  @ApiPropertyOptional({
    description: "Visibility level for the note",
    enum: NoteVisibility,
    example: NoteVisibility.TEAM,
    default: NoteVisibility.TEAM,
  })
  @IsEnum(NoteVisibility)
  @IsOptional()
  visibility?: NoteVisibility = NoteVisibility.TEAM;

  @ApiPropertyOptional({
    description: "File attachments for the note",
    type: [AttachmentDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];
}
