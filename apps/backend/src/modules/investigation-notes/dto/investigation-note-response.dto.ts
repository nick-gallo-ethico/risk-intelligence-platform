import { NoteType, NoteVisibility } from "@prisma/client";

/**
 * Nested author information in response.
 */
export class NoteAuthorDto {
  id: string;
  name: string;
  email: string;
}

/**
 * Nested investigation reference in response.
 */
export class NoteInvestigationDto {
  id: string;
  investigationNumber: number;
}

/**
 * Attachment information in response.
 */
export class AttachmentResponseDto {
  id: string;
  filename: string;
  url: string;
  size?: number;
  mimeType?: string;
}

/**
 * Response DTO for investigation note.
 * Used for single note responses and as the item type in list responses.
 */
export class InvestigationNoteResponseDto {
  id: string;
  investigationId: string;
  organizationId: string;

  // Content
  content: string;
  contentPlainText?: string;
  noteType: NoteType;

  // Visibility
  visibility: NoteVisibility;

  // Author (nested)
  author: NoteAuthorDto;

  // Edit Tracking
  isEdited: boolean;
  editedAt?: Date;
  editCount: number;

  // Attachments
  attachments: AttachmentResponseDto[];

  // AI Enrichment
  aiSummary?: string;
  aiSummaryGeneratedAt?: Date;
  aiModelVersion?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Investigation reference (nested)
  investigation: NoteInvestigationDto;
}

/**
 * Pagination metadata for list responses.
 */
export class PaginationDto {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * Response DTO for paginated list of investigation notes.
 */
export class InvestigationNoteListResponseDto {
  items: InvestigationNoteResponseDto[];
  pagination: PaginationDto;
}
