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
import { NoteType, NoteVisibility } from "@prisma/client";
import { AttachmentDto } from "./attachment.dto";

/**
 * DTO for creating a new investigation note.
 * Note: investigationId and organizationId are set from route params/context, not user input.
 * Note: authorId and authorName are set from the authenticated user context.
 */
export class CreateInvestigationNoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50000)
  content: string;

  @IsEnum(NoteType)
  noteType: NoteType;

  @IsEnum(NoteVisibility)
  @IsOptional()
  visibility?: NoteVisibility = NoteVisibility.TEAM;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];
}
