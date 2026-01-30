import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { NoteType, NoteVisibility } from "@prisma/client";

/**
 * Nested author information in response.
 */
export class NoteAuthorDto {
  @ApiProperty({
    description: "Author UUID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  id: string;

  @ApiProperty({
    description: "Author display name",
    example: "John Doe",
  })
  name: string;

  @ApiProperty({
    description: "Author email address",
    example: "john.doe@example.com",
  })
  email: string;
}

/**
 * Nested investigation reference in response.
 */
export class NoteInvestigationDto {
  @ApiProperty({
    description: "Investigation UUID",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  id: string;

  @ApiProperty({
    description: "Investigation number",
    example: 1,
  })
  investigationNumber: number;
}

/**
 * Attachment information in response.
 */
export class AttachmentResponseDto {
  @ApiProperty({
    description: "Attachment UUID",
    example: "att-550e8400-e29b-41d4",
  })
  id: string;

  @ApiProperty({
    description: "Original filename",
    example: "interview-transcript.pdf",
  })
  filename: string;

  @ApiProperty({
    description: "URL to access the attachment",
    example: "https://storage.example.com/attachments/interview-transcript.pdf",
  })
  url: string;

  @ApiPropertyOptional({
    description: "File size in bytes",
    example: 1024000,
  })
  size?: number;

  @ApiPropertyOptional({
    description: "MIME type of the file",
    example: "application/pdf",
  })
  mimeType?: string;
}

/**
 * Response DTO for investigation note.
 * Used for single note responses and as the item type in list responses.
 */
export class InvestigationNoteResponseDto {
  @ApiProperty({
    description: "Note UUID",
    example: "550e8400-e29b-41d4-a716-446655440002",
  })
  id: string;

  @ApiProperty({
    description: "Investigation UUID this note belongs to",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  investigationId: string;

  @ApiProperty({
    description: "Organization UUID",
    example: "550e8400-e29b-41d4-a716-446655440003",
  })
  organizationId: string;

  // Content
  @ApiProperty({
    description: "Note content (rich text/markdown)",
    example: "Interviewed witness regarding the reported incident...",
  })
  content: string;

  @ApiPropertyOptional({
    description: "Plain text version of the content",
    example: "Interviewed witness regarding the reported incident...",
  })
  contentPlainText?: string;

  @ApiProperty({
    description: "Type of note",
    enum: NoteType,
    example: NoteType.INTERVIEW,
  })
  noteType: NoteType;

  // Visibility
  @ApiProperty({
    description: "Visibility level",
    enum: NoteVisibility,
    example: NoteVisibility.TEAM,
  })
  visibility: NoteVisibility;

  // Author (nested)
  @ApiProperty({
    description: "Author information",
    type: NoteAuthorDto,
  })
  author: NoteAuthorDto;

  // Edit Tracking
  @ApiProperty({
    description: "Whether the note has been edited",
    example: false,
  })
  isEdited: boolean;

  @ApiPropertyOptional({
    description: "When the note was last edited",
    example: "2026-01-29T12:00:00Z",
  })
  editedAt?: Date;

  @ApiProperty({
    description: "Number of times the note has been edited",
    example: 0,
  })
  editCount: number;

  // Attachments
  @ApiProperty({
    description: "File attachments",
    type: [AttachmentResponseDto],
  })
  attachments: AttachmentResponseDto[];

  // AI Enrichment
  @ApiPropertyOptional({
    description: "AI-generated summary of the note",
    example: "Interview summary: Witness confirmed policy violation...",
  })
  aiSummary?: string;

  @ApiPropertyOptional({
    description: "When the AI summary was generated",
    example: "2026-01-29T12:00:00Z",
  })
  aiSummaryGeneratedAt?: Date;

  @ApiPropertyOptional({
    description: "AI model version used for summary",
    example: "claude-3-opus-20240229",
  })
  aiModelVersion?: string;

  // Timestamps
  @ApiProperty({
    description: "When the note was created",
    example: "2026-01-29T12:00:00Z",
  })
  createdAt: Date;

  @ApiProperty({
    description: "When the note was last updated",
    example: "2026-01-29T12:00:00Z",
  })
  updatedAt: Date;

  // Investigation reference (nested)
  @ApiProperty({
    description: "Investigation reference",
    type: NoteInvestigationDto,
  })
  investigation: NoteInvestigationDto;
}

/**
 * Pagination metadata for list responses.
 */
export class PaginationDto {
  @ApiProperty({
    description: "Current page number",
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: "Items per page",
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: "Total number of items",
    example: 50,
  })
  total: number;

  @ApiProperty({
    description: "Total number of pages",
    example: 3,
  })
  totalPages: number;
}

/**
 * Response DTO for paginated list of investigation notes.
 */
export class InvestigationNoteListResponseDto {
  @ApiProperty({
    description: "List of notes",
    type: [InvestigationNoteResponseDto],
  })
  items: InvestigationNoteResponseDto[];

  @ApiProperty({
    description: "Pagination metadata",
    type: PaginationDto,
  })
  pagination: PaginationDto;
}
