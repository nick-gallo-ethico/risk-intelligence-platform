/**
 * Campaigns API Client
 *
 * API client for interacting with campaign endpoints.
 */

import { apiClient } from "./api";
import type {
  Campaign,
  CampaignListResponse,
  CampaignQueryParams,
  CampaignDashboardStats,
  CreateCampaignDto,
  UpdateCampaignDto,
  CampaignAssignment,
  CampaignSummary,
  CampaignAssignmentStatus,
} from "@/types/campaign";

/**
 * Campaigns API client with typed endpoints.
 */
export const campaignsApi = {
  /**
   * List all campaigns with optional filtering.
   */
  list: async (params?: CampaignQueryParams): Promise<CampaignListResponse> => {
    const queryParams = new URLSearchParams();

    if (params?.type) queryParams.set("type", params.type);
    if (params?.status) queryParams.set("status", params.status);
    if (params?.ownerId) queryParams.set("ownerId", params.ownerId);
    if (params?.search) queryParams.set("search", params.search);
    if (params?.startDateFrom)
      queryParams.set("startDateFrom", params.startDateFrom);
    if (params?.startDateTo) queryParams.set("startDateTo", params.startDateTo);

    // Pagination - backend uses skip/take
    if (params?.skip !== undefined)
      queryParams.set("skip", String(params.skip));
    if (params?.take !== undefined)
      queryParams.set("take", String(params.take));
    if (params?.page !== undefined && params?.limit !== undefined) {
      queryParams.set("skip", String(params.page * params.limit));
      queryParams.set("take", String(params.limit));
    }

    if (params?.sortBy) queryParams.set("sortBy", params.sortBy);
    if (params?.sortOrder) queryParams.set("sortOrder", params.sortOrder);

    const queryString = queryParams.toString();
    const url = queryString ? `/campaigns?${queryString}` : "/campaigns";

    const response = await apiClient.get<
      Campaign[] | { data: Campaign[]; total: number }
    >(url);

    // Handle both array and paginated response formats from backend
    if (Array.isArray(response)) {
      return {
        data: response,
        total: response.length,
        page: params?.page ?? 0,
        limit: params?.limit ?? response.length,
      };
    }

    return {
      data: response.data,
      total: response.total,
      page: params?.page ?? 0,
      limit: params?.limit ?? response.data.length,
    };
  },

  /**
   * Get a single campaign by ID.
   */
  getById: async (id: string): Promise<Campaign> => {
    return apiClient.get<Campaign>(`/campaigns/${id}`);
  },

  /**
   * Get dashboard statistics for campaigns.
   */
  getStats: async (): Promise<CampaignDashboardStats> => {
    // Use the campaign-dashboard endpoint
    return apiClient.get<CampaignDashboardStats>("/campaigns/dashboard/stats");
  },

  /**
   * Get campaign statistics for a specific campaign.
   */
  getCampaignStats: async (
    id: string,
  ): Promise<{
    totalAssignments: number;
    completedAssignments: number;
    overdueAssignments: number;
    completionPercentage: number;
  }> => {
    return apiClient.get(`/campaigns/${id}/statistics`);
  },

  /**
   * Create a new campaign.
   */
  create: async (dto: CreateCampaignDto): Promise<Campaign> => {
    return apiClient.post<Campaign>("/campaigns", dto);
  },

  /**
   * Update an existing campaign.
   */
  update: async (id: string, dto: UpdateCampaignDto): Promise<Campaign> => {
    return apiClient.put<Campaign>(`/campaigns/${id}`, dto);
  },

  /**
   * Launch a campaign.
   */
  launch: async (
    id: string,
    notifyImmediately?: boolean,
  ): Promise<Campaign> => {
    return apiClient.post<Campaign>(`/campaigns/${id}/launch`, {
      notifyImmediately,
    });
  },

  /**
   * Pause an active campaign.
   */
  pause: async (id: string): Promise<Campaign> => {
    return apiClient.post<Campaign>(`/campaigns/${id}/pause`);
  },

  /**
   * Resume a paused campaign.
   */
  resume: async (id: string): Promise<Campaign> => {
    return apiClient.post<Campaign>(`/campaigns/${id}/resume`);
  },

  /**
   * Cancel a campaign.
   */
  cancel: async (id: string, reason?: string): Promise<Campaign> => {
    return apiClient.post<Campaign>(`/campaigns/${id}/cancel`, { reason });
  },

  /**
   * Delete a draft campaign.
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/campaigns/${id}`);
  },

  /**
   * Get assignments for a campaign with optional filtering.
   */
  getAssignments: async (
    id: string,
    params?: {
      status?: CampaignAssignmentStatus;
      skip?: number;
      take?: number;
    },
  ): Promise<{ data: CampaignAssignment[]; total: number }> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.set("status", params.status);
    if (params?.skip !== undefined)
      queryParams.set("skip", String(params.skip));
    if (params?.take !== undefined)
      queryParams.set("take", String(params.take));

    const queryString = queryParams.toString();
    const url = `/campaigns/${id}/assignments${queryString ? `?${queryString}` : ""}`;

    return apiClient.get<{ data: CampaignAssignment[]; total: number }>(url);
  },

  /**
   * Get overdue campaigns for dashboard.
   */
  getOverdueCampaigns: async (limit?: number): Promise<CampaignSummary[]> => {
    const url = limit
      ? `/campaigns/dashboard/overdue?limit=${limit}`
      : "/campaigns/dashboard/overdue";
    return apiClient.get<CampaignSummary[]>(url);
  },

  /**
   * Get campaigns with upcoming deadlines.
   */
  getUpcomingDeadlines: async (params?: {
    days?: number;
    limit?: number;
  }): Promise<CampaignSummary[]> => {
    const queryParams = new URLSearchParams();
    if (params?.days !== undefined)
      queryParams.set("days", String(params.days));
    if (params?.limit !== undefined)
      queryParams.set("limit", String(params.limit));

    const queryString = queryParams.toString();
    const url = `/campaigns/dashboard/upcoming${queryString ? `?${queryString}` : ""}`;

    return apiClient.get<CampaignSummary[]>(url);
  },

  /**
   * Send reminders to incomplete assignments.
   */
  sendReminders: async (id: string): Promise<void> => {
    return apiClient.post(`/campaigns/${id}/remind`);
  },
};
