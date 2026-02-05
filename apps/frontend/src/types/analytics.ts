/**
 * Analytics Types
 *
 * Types for dashboards, reports, and analytics features.
 */

/**
 * Dashboard type enum - matches backend DashboardType
 */
export type DashboardType =
  | 'COMPLIANCE_OVERVIEW'
  | 'CASE_METRICS'
  | 'CAMPAIGN_PERFORMANCE'
  | 'INVESTIGATION_METRICS'
  | 'CUSTOM';

/**
 * Date range preset enum - matches backend DateRangePreset
 */
export type DateRangePreset =
  | 'TODAY'
  | 'YESTERDAY'
  | 'LAST_7_DAYS'
  | 'LAST_30_DAYS'
  | 'LAST_90_DAYS'
  | 'LAST_YEAR'
  | 'QUARTER_TO_DATE'
  | 'YEAR_TO_DATE'
  | 'CUSTOM';

/**
 * Dashboard entity
 */
export interface Dashboard {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  dashboardType: DashboardType;
  isSystem: boolean;
  isDefault: boolean;
  ownerId?: string;
  ownerName?: string;
  lastViewedAt?: string;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response for listing dashboards
 */
export interface DashboardListResponse {
  data: Dashboard[];
  total: number;
}

/**
 * Dashboard query params
 */
export interface DashboardQueryParams {
  dashboardType?: DashboardType;
  includeSystem?: boolean;
  defaultsOnly?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Report template entity
 */
export interface Report {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category?: string;
  dataSource: string;
  ownerId?: string;
  ownerName?: string;
  viewCount?: number;
  tags?: string[];
  isSystem?: boolean;
  isFavorite?: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Response for listing reports
 */
export interface ReportListResponse {
  data: Report[];
  total: number;
}

/**
 * Report query params
 */
export interface ReportQueryParams {
  category?: string;
  limit?: number;
  offset?: number;
}

/**
 * Dashboard template for creation
 */
export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  category: string;
  dashboardType: DashboardType;
}

/**
 * Create dashboard input
 */
export interface CreateDashboardInput {
  name: string;
  description?: string;
  dashboardType: DashboardType;
  templateId?: string;
}
