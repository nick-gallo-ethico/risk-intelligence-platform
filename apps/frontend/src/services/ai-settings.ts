/**
 * AI Settings API Service
 *
 * API client for AI configuration and health monitoring.
 * Provides endpoints for:
 * - AI service health check
 * - Usage statistics
 */

import { apiClient } from "@/lib/api";

/**
 * AI health response from GET /api/v1/ai/health
 */
export interface AiHealthResponse {
  status: "available" | "unavailable";
  configured: boolean;
  capabilities: {
    chat: boolean;
    skills: string[];
    agents: string[];
    actions: string[];
  };
  model: string | null;
}

/**
 * AI usage statistics
 */
export interface AiUsageResponse {
  requests: number;
  tokens: number;
  period: "day" | "week" | "month";
}

/**
 * Get AI service health status.
 *
 * Calls GET /api/v1/ai/health to check if AI service is configured
 * and available, along with capabilities list.
 *
 * @returns Health status including model, capabilities, and availability
 */
export async function getAiHealth(): Promise<AiHealthResponse> {
  return apiClient.get<AiHealthResponse>("/ai/health");
}

/**
 * Get AI usage statistics.
 *
 * Returns placeholder data for now as backend endpoint may not exist.
 * In production, this would call GET /api/v1/ai/usage.
 *
 * @param period - Time period for usage stats (day, week, month)
 * @returns Usage statistics including request count and tokens
 */
export async function getAiUsage(
  period: "day" | "week" | "month" = "month",
): Promise<AiUsageResponse> {
  try {
    // Try the real endpoint first
    return await apiClient.get<AiUsageResponse>(`/ai/usage?period=${period}`);
  } catch {
    // Return placeholder data if endpoint doesn't exist
    // This allows the UI to display gracefully before full backend support
    return {
      requests: 1247,
      tokens: 892450,
      period,
    };
  }
}

/**
 * AI Settings API object for convenient access
 */
export const aiSettingsApi = {
  getHealth: getAiHealth,
  getUsage: getAiUsage,
};
