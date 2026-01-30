import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  Min,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for file attachments on investigation notes.
 * Used as a nested type in create/update DTOs.
 */
export class AttachmentDto {
  @ApiProperty({
    description: "Unique identifier for the attachment",
    example: "att-550e8400-e29b-41d4",
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: "Original filename of the attachment",
    maxLength: 255,
    example: "interview-transcript.pdf",
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  filename: string;

  @ApiProperty({
    description: "URL to access the attachment (signed URL or storage path)",
    example: "https://storage.example.com/attachments/interview-transcript.pdf",
  })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiPropertyOptional({
    description: "File size in bytes",
    example: 1024000,
    minimum: 0,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  size?: number;

  @ApiPropertyOptional({
    description: "MIME type of the file",
    maxLength: 100,
    example: "application/pdf",
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  mimeType?: string;
}
