/**
 * Attachments API client
 *
 * Handles file uploads via multipart/form-data and attachment CRUD operations.
 */
import { api, apiClient } from './api';
import type {
  Attachment,
  AttachmentListResponse,
  AttachmentQueryParams,
  AttachmentEntityType,
} from '@/types/attachment';

export interface UploadAttachmentParams {
  file: File;
  entityType: AttachmentEntityType;
  entityId: string;
  description?: string;
  isEvidence?: boolean;
  onProgress?: (progress: number) => void;
}

export const attachmentsApi = {
  /**
   * Upload a file attachment to an entity.
   * Uses multipart/form-data for the upload.
   */
  upload: async ({
    file,
    entityType,
    entityId,
    description,
    isEvidence,
    onProgress,
  }: UploadAttachmentParams): Promise<Attachment> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    formData.append('entityId', entityId);
    if (description) {
      formData.append('description', description);
    }
    if (isEvidence !== undefined) {
      formData.append('isEvidence', String(isEvidence));
    }

    const response = await api.post<Attachment>('/attachments', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    });

    return response.data;
  },

  /**
   * List attachments with optional filters
   */
  list: (params?: AttachmentQueryParams): Promise<AttachmentListResponse> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return apiClient.get<AttachmentListResponse>(`/attachments${query ? `?${query}` : ''}`);
  },

  /**
   * Get attachments for a specific entity
   */
  getForEntity: (
    entityType: AttachmentEntityType,
    entityId: string
  ): Promise<AttachmentListResponse> => {
    return attachmentsApi.list({ entityType, entityId, limit: 100 });
  },

  /**
   * Get a single attachment by ID
   */
  getById: (id: string): Promise<Attachment> => {
    return apiClient.get<Attachment>(`/attachments/${id}`);
  },

  /**
   * Delete an attachment
   */
  delete: (id: string): Promise<void> => {
    return apiClient.delete<void>(`/attachments/${id}`);
  },

  /**
   * Get download URL for an attachment (returns redirect, handled by browser)
   */
  getDownloadUrl: (id: string): string => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    return `${baseUrl}/api/v1/attachments/${id}/download`;
  },
};
