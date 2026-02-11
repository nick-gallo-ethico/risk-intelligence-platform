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
 * Export report result response type.
 */
export interface ExportReportResponse {
  jobId?: string;
  downloadUrl?: string;
  status: string;
}

/**
 * Export report results to a file format.
 * Returns job ID for async processing or direct download URL.
 */
export async function exportReport(
  id: string,
  format: "excel" | "csv" | "pdf",
): Promise<ExportReportResponse> {
  return apiClient.post<ExportReportResponse>(`/reports/${id}/export`, {
    format,
  });
}

// =========================================================================
// Schedule API Types
// =========================================================================

/**
 * Schedule type for delivery frequency
 */
export type ScheduleType = "DAILY" | "WEEKLY" | "MONTHLY";

/**
 * Export format for scheduled delivery
 */
export type ScheduleExportFormat = "EXCEL" | "CSV" | "PDF";

/**
 * Configuration for a scheduled export
 */
export interface ScheduledExportConfig {
  id?: string;
  name: string;
  scheduleType: ScheduleType;
  time: string; // HH:MM format
  dayOfWeek?: number; // 0-6 for weekly (0=Sunday)
  dayOfMonth?: number; // 1-31 for monthly
  timezone: string;
  format: ScheduleExportFormat;
  recipients: string[];
  isActive: boolean;
}

// =========================================================================
// Schedule API Functions
// =========================================================================

/**
 * Create a schedule for a report.
 */
export async function scheduleReport(
  reportId: string,
  config: Omit<ScheduledExportConfig, "id" | "isActive">,
): Promise<ScheduledExportConfig> {
  return apiClient.post<ScheduledExportConfig>(
    `/reports/${reportId}/schedule`,
    config,
  );
}

/**
 * Get the schedule for a report.
 */
export async function getSchedule(
  reportId: string,
): Promise<ScheduledExportConfig | null> {
  try {
    return await apiClient.get<ScheduledExportConfig>(
      `/reports/${reportId}/schedule`,
    );
  } catch {
    // Return null if no schedule exists
    return null;
  }
}

/**
 * Update an existing schedule.
 */
export async function updateSchedule(
  reportId: string,
  config: Partial<ScheduledExportConfig>,
): Promise<ScheduledExportConfig> {
  return apiClient.put<ScheduledExportConfig>(
    `/reports/${reportId}/schedule`,
    config,
  );
}

/**
 * Delete a schedule.
 */
export async function deleteSchedule(reportId: string): Promise<void> {
  return apiClient.delete(`/reports/${reportId}/schedule`);
}

/**
 * Pause a schedule.
 */
export async function pauseSchedule(reportId: string): Promise<void> {
  return apiClient.post(`/reports/${reportId}/schedule/pause`);
}

/**
 * Resume a paused schedule.
 */
export async function resumeSchedule(reportId: string): Promise<void> {
  return apiClient.post(`/reports/${reportId}/schedule/resume`);
}

/**
 * Trigger immediate execution of a scheduled report.
 */
export async function runScheduleNow(reportId: string): Promise<void> {
  return apiClient.post(`/reports/${reportId}/schedule/run-now`);
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
  exportReport,
  // Schedule methods
  scheduleReport,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  pauseSchedule,
  resumeSchedule,
  runScheduleNow,
};

export default reportsApi;
