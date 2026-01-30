import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  Min,
  MaxLength,
} from "class-validator";

/**
 * DTO for file attachments on investigation notes.
 * Used as a nested type in create/update DTOs.
 */
export class AttachmentDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  size?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  mimeType?: string;
}
