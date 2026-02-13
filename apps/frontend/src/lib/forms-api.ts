/**
 * Forms API Client
 *
 * API client for interacting with form definition endpoints.
 * Maps between backend field names (formType, isPublished) and
 * frontend field names (type, status).
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
 * Form definition entity (frontend shape).
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
 * Raw form definition from the backend (uses formType/isPublished).
 */
interface BackendFormDefinition {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  formType: FormType;
  type?: FormType;
  isPublished?: boolean;
  isActive?: boolean;
  status?: FormStatus;
  version: number;
  schema?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  createdById?: string;
}

/**
 * Map a backend form definition to the frontend FormDefinition shape.
 */
function mapFormDefinition(raw: BackendFormDefinition): FormDefinition {
  return {
    id: raw.id,
    organizationId: raw.organizationId,
    name: raw.name,
    description: raw.description,
    type: raw.formType || raw.type || ("CUSTOM" as FormType),
    status: raw.status || (raw.isPublished ? "PUBLISHED" : "DRAFT"),
    version: raw.version,
    schema: raw.schema,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    publishedAt: raw.publishedAt,
    createdById: raw.createdById,
  };
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
      BackendFormDefinition[] | { data: BackendFormDefinition[]; total: number }
    >(url);

    // Handle both array and paginated response formats from backend
    if (Array.isArray(response)) {
      return {
        data: response.map(mapFormDefinition),
        total: response.length,
      };
    }

    return {
      data: (response.data || []).map(mapFormDefinition),
      total: response.total,
    };
  },

  /**
   * Get a single form definition by ID.
   */
  getById: async (id: string): Promise<FormDefinition> => {
    const raw = await apiClient.get<BackendFormDefinition>(
      `/forms/definitions/${id}`,
    );
    return mapFormDefinition(raw);
  },

  /**
   * Create a new form definition.
   * Maps frontend `type` to backend `formType`.
   */
  create: async (dto: CreateFormDto): Promise<FormDefinition> => {
    const raw = await apiClient.post<BackendFormDefinition>(
      "/forms/definitions",
      {
        name: dto.name,
        description: dto.description,
        formType: dto.type,
        schema: dto.schema || { sections: [] },
      },
    );
    return mapFormDefinition(raw);
  },

  /**
   * Update an existing form definition.
   */
  update: async (id: string, dto: UpdateFormDto): Promise<FormDefinition> => {
    const raw = await apiClient.patch<BackendFormDefinition>(
      `/forms/definitions/${id}`,
      dto,
    );
    return mapFormDefinition(raw);
  },

  /**
   * Publish a form definition (changes status from DRAFT to PUBLISHED).
   */
  publish: async (id: string): Promise<FormDefinition> => {
    const raw = await apiClient.post<BackendFormDefinition>(
      `/forms/definitions/${id}/publish`,
    );
    return mapFormDefinition(raw);
  },

  /**
   * Clone a form definition (creates new DRAFT copy).
   */
  clone: async (id: string): Promise<FormDefinition> => {
    const raw = await apiClient.post<BackendFormDefinition>(
      `/forms/definitions/${id}/clone`,
    );
    return mapFormDefinition(raw);
  },
};
