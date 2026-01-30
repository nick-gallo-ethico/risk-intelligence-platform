/**
 * Cases API client
 */
import { apiClient } from './api';
import type {
  Case,
  CaseListResponse,
  CaseQueryParams,
  CreateCaseInput,
  UpdateCaseInput,
} from '@/types/case';

export const casesApi = {
  /**
   * List cases with optional filtering and pagination
   */
  list: (params?: CaseQueryParams): Promise<CaseListResponse> => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return apiClient.get<CaseListResponse>(`/cases${query ? `?${query}` : ''}`);
  },

  /**
   * Get a single case by ID
   */
  getById: (id: string): Promise<Case> => {
    return apiClient.get<Case>(`/cases/${id}`);
  },

  /**
   * Get a case by reference number
   */
  getByReference: (referenceNumber: string): Promise<Case> => {
    return apiClient.get<Case>(`/cases/reference/${referenceNumber}`);
  },

  /**
   * Create a new case
   */
  create: (input: CreateCaseInput): Promise<Case> => {
    return apiClient.post<Case>('/cases', input);
  },

  /**
   * Update a case
   */
  update: (id: string, input: UpdateCaseInput): Promise<Case> => {
    return apiClient.patch<Case>(`/cases/${id}`, input);
  },

  /**
   * Update case status
   */
  updateStatus: (
    id: string,
    status: string,
    rationale?: string
  ): Promise<Case> => {
    return apiClient.patch<Case>(`/cases/${id}/status`, { status, rationale });
  },

  /**
   * Close a case
   */
  close: (id: string, rationale: string): Promise<Case> => {
    return apiClient.post<Case>(`/cases/${id}/close`, { rationale });
  },
};
