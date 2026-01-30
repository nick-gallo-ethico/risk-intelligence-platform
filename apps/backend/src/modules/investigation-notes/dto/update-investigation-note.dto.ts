import {
  IsString,
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
 * DTO for updating an investigation note.
 * All fields are optional - only provided fields will be updated.
 */
export class UpdateInvestigationNoteDto {
  @IsString()
  @MaxLength(50000)
  @IsOptional()
  content?: string;

  @IsEnum(NoteType)
  @IsOptional()
  noteType?: NoteType;

  @IsEnum(NoteVisibility)
  @IsOptional()
  visibility?: NoteVisibility;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  @IsOptional()
  attachments?: AttachmentDto[];
}
