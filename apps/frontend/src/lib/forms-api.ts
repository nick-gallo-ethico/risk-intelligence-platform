/**
 * Forms API Client
 *
 * API client for interacting with form definition endpoints.
 */

import { apiClient } from "./api";

/**
 * Form types supported by the platform.
 */
export type FormType =
  | "INTAKE"
  | "DISCLOSURE"
  | "ATTESTATION"
  | "SURVEY"
  | "WORKFLOW_TASK"
  | "CUSTOM";

/**
 * Form status values.
 */
export type FormStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/**
 * Form definition entity.
 */
export interface FormDefinition {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: FormType;
  status: FormStatus;
  version: number;
  schema?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  createdById?: string;
}

/**
 * Response from list endpoint.
 */
export interface FormListResponse {
  data: FormDefinition[];
  total: number;
}

/**
 * Query parameters for form list endpoint.
 */
export interface FormQueryParams {
  type?: FormType;
  status?: FormStatus;
  search?: string;
  skip?: number;
  take?: number;
}

/**
 * DTO for creating a new form definition.
 */
export interface CreateFormDto {
  name: string;
  description?: string;
  type: FormType;
  schema?: Record<string, unknown>;
}

/**
 * DTO for updating an existing form definition.
 */
export interface UpdateFormDto {
  name?: string;
  description?: string;
  schema?: Record<string, unknown>;
}

/**
 * Forms API client with typed endpoints.
 */
export const formsApi = {
  /**
   * List all form definitions with optional filtering.
   */
  list: async (params?: FormQueryParams): Promise<FormListResponse> => {
    const queryParams = new URLSearchParams();

    if (params?.type) queryParams.set("type", params.type);
    if (params?.status) queryParams.set("status", params.status);
    if (params?.search) queryParams.set("search", params.search);
    if (params?.skip !== undefined)
      queryParams.set("skip", String(params.skip));
    if (params?.take !== undefined)
      queryParams.set("take", String(params.take));

    const queryString = queryParams.toString();
    const url = queryString
      ? `/forms/definitions?${queryString}`
      : "/forms/definitions";

    const response = await apiClient.get<
      FormDefinition[] | { data: FormDefinition[]; total: number }
    >(url);

    // Handle both array and paginated response formats from backend
    if (Array.isArray(response)) {
      return {
        data: response,
        total: response.length,
      };
    }

    return {
      data: response.data,
      total: response.total,
    };
  },

  /**
   * Get a single form definition by ID.
   */
  getById: async (id: string): Promise<FormDefinition> => {
    return apiClient.get<FormDefinition>(`/forms/definitions/${id}`);
  },

  /**
   * Create a new form definition.
   */
  create: async (dto: CreateFormDto): Promise<FormDefinition> => {
    return apiClient.post<FormDefinition>("/forms/definitions", dto);
  },

  /**
   * Update an existing form definition.
   */
  update: async (id: string, dto: UpdateFormDto): Promise<FormDefinition> => {
    return apiClient.patch<FormDefinition>(`/forms/definitions/${id}`, dto);
  },

  /**
   * Publish a form definition (changes status from DRAFT to PUBLISHED).
   */
  publish: async (id: string): Promise<FormDefinition> => {
    return apiClient.post<FormDefinition>(`/forms/definitions/${id}/publish`);
  },

  /**
   * Clone a form definition (creates new DRAFT copy).
   */
  clone: async (id: string): Promise<FormDefinition> => {
    return apiClient.post<FormDefinition>(`/forms/definitions/${id}/clone`);
  },
};
