/**
 * Reports API Client
 *
 * API client for the report system endpoints.
 * Matches backend ReportController at /api/v1/reports/*
 */

import { apiClient } from "./api";
import type {
  SavedReport,
  ReportFieldGroup,
  ReportResult,
  CreateReportInput,
  RunReportInput,
  AiGeneratedReport,
  ReportListResponse,
  ReportListParams,
} from "@/types/reports";

/**
 * Reports API client
 */
export const reportsApi = {
  // =========================================================================
  // Field Registry
  // =========================================================================

  /**
   * Get available fields for an entity type.
   * Used by report designer field picker.
   */
  getFields: (entityType: string): Promise<ReportFieldGroup[]> =>
    apiClient.get<ReportFieldGroup[]>(`/reports/fields/${entityType}`),

  // =========================================================================
  // Templates
  // =========================================================================

  /**
   * Get pre-built report templates.
   */
  getTemplates: (): Promise<SavedReport[]> =>
    apiClient.get<SavedReport[]>("/reports/templates"),

  // =========================================================================
  // Report CRUD
  // =========================================================================

  /**
   * List saved reports with filtering and pagination.
   */
  list: (params?: ReportListParams): Promise<ReportListResponse> => {
    const searchParams = new URLSearchParams();

    if (params?.visibility) {
      searchParams.append("visibility", params.visibility);
    }
    if (params?.isTemplate !== undefined) {
      searchParams.append("isTemplate", String(params.isTemplate));
    }
    if (params?.search) {
      searchParams.append("search", params.search);
    }
    if (params?.page !== undefined) {
      searchParams.append("page", String(params.page));
    }
    if (params?.pageSize !== undefined) {
      searchParams.append("pageSize", String(params.pageSize));
    }

    const queryString = searchParams.toString();
    return apiClient.get<ReportListResponse>(
      `/reports${queryString ? `?${queryString}` : ""}`,
    );
  },

  /**
   * Get a single report by ID.
   */
  get: (id: string): Promise<SavedReport> =>
    apiClient.get<SavedReport>(`/reports/${id}`),

  /**
   * Create a new saved report.
   */
  create: (input: CreateReportInput): Promise<SavedReport> =>
    apiClient.post<SavedReport>("/reports", input),

  /**
   * Update an existing report.
   */
  update: (
    id: string,
    input: Partial<CreateReportInput>,
  ): Promise<SavedReport> =>
    apiClient.put<SavedReport>(`/reports/${id}`, input),

  /**
   * Delete a report.
   */
  delete: (id: string): Promise<void> =>
    apiClient.delete<void>(`/reports/${id}`),

  // =========================================================================
  // Report Execution
  // =========================================================================

  /**
   * Execute a saved report and get results.
   */
  run: (id: string, input?: RunReportInput): Promise<ReportResult> =>
    apiClient.post<ReportResult>(`/reports/${id}/run`, input || {}),

  // =========================================================================
  // Report Actions
  // =========================================================================

  /**
   * Duplicate a report.
   * Creates a copy with "(Copy)" appended to the name.
   */
  duplicate: (id: string): Promise<SavedReport> =>
    apiClient.post<SavedReport>(`/reports/${id}/duplicate`),

  /**
   * Toggle favorite status on a report.
   */
  toggleFavorite: (id: string): Promise<{ isFavorite: boolean }> =>
    apiClient.post<{ isFavorite: boolean }>(`/reports/${id}/favorite`),

  /**
   * Export report results to a file format.
   * Returns job ID for async processing or direct download URL.
   */
  exportReport: (
    id: string,
    format: "excel" | "csv" | "pdf",
  ): Promise<{ jobId?: string; downloadUrl?: string; status: string }> =>
    apiClient.post<{ jobId?: string; downloadUrl?: string; status: string }>(
      `/reports/${id}/export`,
      { format },
    ),

  // =========================================================================
  // AI Generation
  // =========================================================================

  /**
   * Generate a report from natural language query.
   * Uses AI to parse the query and create a report configuration.
   */
  aiGenerate: (query: string): Promise<AiGeneratedReport> =>
    apiClient.post<AiGeneratedReport>("/reports/ai-generate", { query }),
};
