/**
 * Analytics API client
 *
 * Provides functions for interacting with dashboard and report endpoints.
 */
import { apiClient } from './api';
import type {
  Dashboard,
  DashboardListResponse,
  DashboardQueryParams,
  DashboardTemplate,
  CreateDashboardInput,
  Report,
  ReportListResponse,
  ReportQueryParams,
} from '@/types/analytics';

/**
 * Analytics API endpoints
 */
export const analyticsApi = {
  // ==================
  // Dashboards
  // ==================

  /**
   * List dashboards with optional filtering
   */
  listDashboards: (params?: DashboardQueryParams): Promise<DashboardListResponse> => {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.dashboardType) searchParams.append('dashboardType', params.dashboardType);
      if (params.includeSystem !== undefined) searchParams.append('includeSystem', String(params.includeSystem));
      if (params.defaultsOnly !== undefined) searchParams.append('defaultsOnly', String(params.defaultsOnly));
      if (params.limit !== undefined) searchParams.append('limit', String(params.limit));
      if (params.offset !== undefined) searchParams.append('offset', String(params.offset));
    }
    const query = searchParams.toString();
    return apiClient.get<DashboardListResponse>(`/analytics/dashboards${query ? `?${query}` : ''}`);
  },

  /**
   * Get a single dashboard by ID
   */
  getDashboard: (id: string): Promise<Dashboard> => {
    return apiClient.get<Dashboard>(`/analytics/dashboards/${id}`);
  },

  /**
   * Create a new dashboard
   */
  createDashboard: (input: CreateDashboardInput): Promise<Dashboard> => {
    // Transform to backend-expected format
    const payload = {
      name: input.name,
      description: input.description,
      dashboardType: input.dashboardType,
      layouts: {
        lg: [],
        md: [],
        sm: [],
      },
    };
    return apiClient.post<Dashboard>('/analytics/dashboards', payload);
  },

  /**
   * Delete a dashboard
   */
  deleteDashboard: (id: string): Promise<void> => {
    return apiClient.delete(`/analytics/dashboards/${id}`);
  },

  /**
   * Toggle dashboard favorite status
   * Note: This may not exist in backend yet - handle gracefully
   */
  toggleDashboardFavorite: async (id: string): Promise<{ isFavorite: boolean }> => {
    try {
      return await apiClient.post<{ isFavorite: boolean }>(`/analytics/dashboards/${id}/favorite`);
    } catch {
      // Favorite endpoint may not exist yet, return mock response
      console.warn('Dashboard favorite endpoint not implemented yet');
      return { isFavorite: true };
    }
  },

  /**
   * Get user's home dashboard
   */
  getHomeDashboard: (): Promise<Dashboard | null> => {
    return apiClient.get<Dashboard | null>('/analytics/dashboards/user/home').catch(() => null);
  },

  /**
   * Set a dashboard as home
   */
  setHomeDashboard: (dashboardId: string): Promise<void> => {
    return apiClient.post(`/analytics/dashboards/user/home/${dashboardId}`);
  },

  // ==================
  // Dashboard Templates
  // ==================

  /**
   * Get available dashboard templates
   * Note: Backend may not have dedicated templates endpoint - provide static templates
   */
  getDashboardTemplates: async (): Promise<DashboardTemplate[]> => {
    // Static templates - these can be moved to backend later
    return [
      {
        id: 'blank',
        name: 'Blank Dashboard',
        description: 'Start with an empty dashboard and add your own widgets',
        category: 'General',
        dashboardType: 'CUSTOM',
      },
      {
        id: 'compliance-overview',
        name: 'Compliance Overview',
        description: 'High-level view of compliance metrics and KPIs',
        category: 'Compliance',
        dashboardType: 'COMPLIANCE_OVERVIEW',
      },
      {
        id: 'case-metrics',
        name: 'Case Metrics',
        description: 'Track case volumes, resolution times, and trends',
        category: 'Cases',
        dashboardType: 'CASE_METRICS',
      },
      {
        id: 'campaign-performance',
        name: 'Campaign Performance',
        description: 'Monitor disclosure and attestation campaign results',
        category: 'Campaigns',
        dashboardType: 'CAMPAIGN_PERFORMANCE',
      },
      {
        id: 'investigation-metrics',
        name: 'Investigation Metrics',
        description: 'Track investigation progress and outcomes',
        category: 'Investigations',
        dashboardType: 'INVESTIGATION_METRICS',
      },
    ];
  },

  // ==================
  // Reports
  // ==================

  /**
   * List report templates with optional filtering
   */
  listReports: async (params?: ReportQueryParams): Promise<ReportListResponse> => {
    try {
      const searchParams = new URLSearchParams();
      if (params?.category) searchParams.append('category', params.category);
      const query = searchParams.toString();
      const data = await apiClient.get<Report[]>(`/reports/templates${query ? `?${query}` : ''}`);
      // Backend returns array, wrap in response format
      return { data: Array.isArray(data) ? data : [], total: Array.isArray(data) ? data.length : 0 };
    } catch {
      // Reports endpoint may not be fully implemented
      console.warn('Reports endpoint not available');
      return { data: [], total: 0 };
    }
  },

  /**
   * Get a single report by ID
   */
  getReport: (id: string): Promise<Report> => {
    return apiClient.get<Report>(`/reports/templates/${id}`);
  },

  /**
   * Toggle report favorite status
   * Note: This may not exist in backend yet - handle gracefully
   */
  toggleReportFavorite: async (id: string): Promise<{ isFavorite: boolean }> => {
    try {
      return await apiClient.post<{ isFavorite: boolean }>(`/reports/templates/${id}/favorite`);
    } catch {
      // Favorite endpoint may not exist yet
      console.warn('Report favorite endpoint not implemented yet');
      return { isFavorite: true };
    }
  },
};
