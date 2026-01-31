/**
 * Attachment types - matches backend DTOs
 */

export type AttachmentEntityType = 'CASE' | 'INVESTIGATION' | 'INVESTIGATION_NOTE';

export interface AttachmentUploader {
  id: string;
  name: string;
  email: string;
}

export interface Attachment {
  id: string;
  organizationId: string;
  entityType: AttachmentEntityType;
  entityId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  uploadedBy: AttachmentUploader;
  description?: string;
  isEvidence: boolean;
  downloadUrl: string;
  createdAt: string;
}

export interface AttachmentListResponse {
  items: Attachment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AttachmentQueryParams {
  entityType?: AttachmentEntityType;
  entityId?: string;
  isEvidence?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateAttachmentInput {
  entityType: AttachmentEntityType;
  entityId: string;
  description?: string;
  isEvidence?: boolean;
}
