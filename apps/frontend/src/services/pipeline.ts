/**
 * Pipeline API Service
 *
 * API client functions for pipeline configuration management.
 * Handles fetching tenant-specific pipeline configurations and activity pinning.
 */

import { apiClient } from "@/lib/api";
import type { PipelineConfig, PipelineStage } from "@/types/record-detail";

/**
 * Fetch all pipeline configurations for the tenant.
 *
 * @returns Array of pipeline configurations (typically just the default case pipeline)
 */
export async function fetchPipelines(): Promise<PipelineConfig[]> {
  return apiClient.get<PipelineConfig[]>("/pipelines");
}

/**
 * Fetch a specific pipeline configuration by ID.
 *
 * @param id - Pipeline configuration ID
 * @returns Pipeline configuration
 */
export async function fetchPipelineById(id: string): Promise<PipelineConfig> {
  return apiClient.get<PipelineConfig>(`/pipelines/${id}`);
}

/**
 * Update a pipeline configuration.
 * Requires SYSTEM_ADMIN or COMPLIANCE_OFFICER role.
 *
 * @param id - Pipeline configuration ID
 * @param data - Update data (name and/or stages)
 * @returns Updated pipeline configuration
 */
export async function updatePipeline(
  id: string,
  data: { name?: string; stages?: PipelineStage[] },
): Promise<PipelineConfig> {
  return apiClient.put<PipelineConfig>(`/pipelines/${id}`, data);
}

/**
 * Fetch a specific stage from a pipeline.
 *
 * @param pipelineId - Pipeline configuration ID
 * @param stageId - Stage ID within the pipeline
 * @returns Pipeline stage, or null if not found
 */
export async function fetchPipelineStage(
  pipelineId: string,
  stageId: string,
): Promise<PipelineStage | null> {
  return apiClient.get<PipelineStage | null>(
    `/pipelines/${pipelineId}/stages/${stageId}`,
  );
}

/**
 * Toggle the pinned status of a case activity.
 *
 * @param caseId - Case UUID
 * @param activityId - Activity UUID
 * @param isPinned - Whether to pin or unpin
 * @returns Result with success flag and new pinned state
 */
export async function pinActivity(
  caseId: string,
  activityId: string,
  isPinned: boolean,
): Promise<{ success: boolean; isPinned: boolean }> {
  return apiClient.put<{ success: boolean; isPinned: boolean }>(
    `/cases/${caseId}/activities/${activityId}/pin`,
    { isPinned },
  );
}

/**
 * Fetch status history for a case.
 *
 * @param caseId - Case UUID
 * @returns Array of status changes
 */
export async function fetchStatusHistory(caseId: string): Promise<
  Array<{
    id: string;
    status: string;
    date: string;
    changedBy: { id: string; name: string } | null;
    rationale: string | null;
  }>
> {
  return apiClient.get(`/cases/${caseId}/status-history`);
}

// Export all functions as a single API object for convenience
export const pipelineApi = {
  list: fetchPipelines,
  getById: fetchPipelineById,
  update: updatePipeline,
  getStage: fetchPipelineStage,
  pinActivity,
  getStatusHistory: fetchStatusHistory,
};
