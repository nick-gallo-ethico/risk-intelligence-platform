/**
 * Campaign Types
 *
 * Type definitions for the campaigns feature matching backend Campaign entity
 * and API responses.
 */

export type CampaignType = "DISCLOSURE" | "ATTESTATION" | "SURVEY";
export type CampaignStatus =
  | "DRAFT"
  | "SCHEDULED"
  | "ACTIVE"
  | "PAUSED"
  | "COMPLETED"
  | "CANCELLED";

/**
 * Campaign entity as returned by the backend API.
 */
export interface Campaign {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  type: CampaignType;
  status: CampaignStatus;
  startDate?: string;
  endDate?: string;
  dueDate: string;
  totalAssignments: number;
  completedAssignments: number;
  overdueAssignments: number;
  completionPercentage: number;
  ownerId?: string;
  ownerName?: string;
  launchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Paginated campaign list response.
 */
export interface CampaignListResponse {
  data: Campaign[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Query parameters for filtering campaigns.
 */
export interface CampaignQueryParams {
  type?: CampaignType;
  status?: CampaignStatus;
  ownerId?: string;
  startDateFrom?: string;
  startDateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Dashboard statistics for campaign summary cards.
 */
export interface CampaignDashboardStats {
  totalCampaigns: number;
  activeCampaigns: number;
  completedCampaigns: number;
  draftCampaigns: number;
  scheduledCampaigns: number;
  overallCompletionRate: number;
  totalAssignments: number;
  completedAssignments: number;
  overdueAssignments: number;
  assignmentsByStatus: {
    pending: number;
    notified: number;
    inProgress: number;
    completed: number;
    overdue: number;
    skipped: number;
  };
}

/**
 * DTO for creating a campaign.
 */
export interface CreateCampaignDto {
  name: string;
  description?: string;
  type: CampaignType;
  dueDate: string;
  startDate?: string;
  segmentId?: string;
  policyId?: string;
  formTemplateId?: string;
  formDefinitionId?: string;
  audienceMode?: "ALL" | "SEGMENT" | "MANUAL";
  criteria?: unknown;
  launchAt?: string;
  notifyImmediately?: boolean;
  reminderSchedule?: ReminderSchedule;
}

/**
 * DTO for updating a campaign.
 */
export interface UpdateCampaignDto {
  name?: string;
  description?: string;
  dueDate?: string;
  startDate?: string;
  reminderSchedule?: ReminderSchedule;
}

/**
 * Reminder schedule configuration.
 */
export interface ReminderSchedule {
  enabled: boolean;
  intervals: number[];
  finalReminderDays?: number;
}

/**
 * Display helpers for campaign types and statuses.
 */
export const CAMPAIGN_TYPE_LABELS: Record<CampaignType, string> = {
  DISCLOSURE: "Disclosure",
  ATTESTATION: "Attestation",
  SURVEY: "Survey",
};

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Draft",
  SCHEDULED: "Scheduled",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export const CAMPAIGN_STATUS_COLORS: Record<CampaignStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  SCHEDULED: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
  COMPLETED: "bg-purple-100 text-purple-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export const CAMPAIGN_TYPE_COLORS: Record<CampaignType, string> = {
  DISCLOSURE: "bg-indigo-100 text-indigo-800",
  ATTESTATION: "bg-teal-100 text-teal-800",
  SURVEY: "bg-amber-100 text-amber-800",
};

/**
 * Campaign assignment entity representing an employee's campaign task.
 */
export interface CampaignAssignment {
  id: string;
  campaignId: string;
  employeeId: string;
  status: CampaignAssignmentStatus;
  assignedAt: string;
  completedAt?: string;
  employeeSnapshot?: {
    firstName?: string;
    lastName?: string;
    email?: string;
    department?: string;
    location?: string;
  };
}

/**
 * Assignment status enum matching backend.
 */
export type CampaignAssignmentStatus =
  | "PENDING"
  | "NOTIFIED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "OVERDUE"
  | "SKIPPED";

/**
 * Assignment status display configuration.
 */
export const ASSIGNMENT_STATUS_LABELS: Record<
  CampaignAssignmentStatus,
  string
> = {
  PENDING: "Pending",
  NOTIFIED: "Notified",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  OVERDUE: "Overdue",
  SKIPPED: "Skipped",
};

export const ASSIGNMENT_STATUS_COLORS: Record<
  CampaignAssignmentStatus,
  string
> = {
  PENDING: "bg-gray-100 text-gray-800",
  NOTIFIED: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-green-100 text-green-800",
  OVERDUE: "bg-red-100 text-red-800",
  SKIPPED: "bg-purple-100 text-purple-800",
};

/**
 * Campaign summary for dashboard widgets (overdue/upcoming).
 */
export interface CampaignSummary {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  dueDate: string;
  totalAssignments: number;
  completedAssignments: number;
  overdueAssignments: number;
  completionPercentage: number;
  launchedAt?: string;
}
