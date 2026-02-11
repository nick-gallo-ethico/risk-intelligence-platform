/**
 * Reports API Service
 *
 * API client functions for the reports feature.
 * Handles report CRUD, field registry, and report execution.
 */

import { apiClient } from "@/lib/api";
import type {
  SavedReport,
  ReportFieldGroup,
  ReportResult,
  CreateReportInput,
  RunReportInput,
  ReportListResponse,
  ReportListParams,
  AiGeneratedReport,
} from "@/types/reports";

/**
 * Get available fields for an entity type.
 * Returns fields grouped by category for the field picker.
 */
export async function getFields(
  entityType: string,
): Promise<ReportFieldGroup[]> {
  return apiClient.get<ReportFieldGroup[]>(`/reports/fields/${entityType}`);
}

/**
 * List saved reports with optional filters.
 */
export async function listReports(
  params?: ReportListParams,
): Promise<ReportListResponse> {
  return apiClient.get<ReportListResponse>("/reports", { params });
}

/**
 * Get a single report by ID.
 */
export async function getReport(id: string): Promise<SavedReport> {
  return apiClient.get<SavedReport>(`/reports/${id}`);
}

/**
 * Create a new report.
 */
export async function createReport(
  input: CreateReportInput,
): Promise<SavedReport> {
  return apiClient.post<SavedReport>("/reports", input);
}

/**
 * Update an existing report.
 */
export async function updateReport(
  id: string,
  input: Partial<CreateReportInput>,
): Promise<SavedReport> {
  return apiClient.patch<SavedReport>(`/reports/${id}`, input);
}

/**
 * Delete a report.
 */
export async function deleteReport(id: string): Promise<void> {
  return apiClient.delete(`/reports/${id}`);
}

/**
 * Run/execute a report and get results.
 */
export async function runReport(
  id: string,
  input?: RunReportInput,
): Promise<ReportResult> {
  return apiClient.post<ReportResult>(`/reports/${id}/run`, input);
}

/**
 * Toggle report as favorite.
 */
export async function toggleFavorite(id: string): Promise<SavedReport> {
  return apiClient.post<SavedReport>(`/reports/${id}/favorite`);
}

/**
 * Duplicate a report (creates a copy).
 */
export async function duplicateReport(id: string): Promise<SavedReport> {
  return apiClient.post<SavedReport>(`/reports/${id}/duplicate`);
}

/**
 * Get report templates.
 */
export async function getTemplates(): Promise<SavedReport[]> {
  const response = await listReports({ isTemplate: true });
  return response.data;
}

/**
 * Generate a report from natural language query using AI.
 */
export async function generateFromNL(
  query: string,
): Promise<AiGeneratedReport> {
  return apiClient.post<AiGeneratedReport>("/reports/generate", { query });
}

/**
 * Export wrapper for easy importing.
 */
export const reportsApi = {
  getFields,
  listReports,
  getReport,
  createReport,
  updateReport,
  deleteReport,
  runReport,
  toggleFavorite,
  duplicateReport,
  getTemplates,
  generateFromNL,
};

export default reportsApi;
