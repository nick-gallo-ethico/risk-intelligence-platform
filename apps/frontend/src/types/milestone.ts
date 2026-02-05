/**
 * Milestone types for project tracking and Gantt chart visualization.
 */

export type MilestoneStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'AT_RISK'
  | 'COMPLETED'
  | 'CANCELLED';

export type MilestoneCategory =
  | 'IMPLEMENTATION'
  | 'INTEGRATION'
  | 'TRAINING'
  | 'GO_LIVE'
  | 'MIGRATION'
  | 'CUSTOM';

export interface MilestoneOwner {
  id: string;
  name: string;
  email: string;
}

export interface MilestoneItem {
  id: string;
  milestoneId: string;
  entityType: string;
  entityId?: string;
  customTitle?: string;
  isCompleted: boolean;
  completedAt?: string;
  completedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MilestoneResponseDto {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category: MilestoneCategory;
  status: MilestoneStatus;
  targetDate: string;
  completedAt?: string;
  ownerId?: string;
  owner?: MilestoneOwner;
  totalItems: number;
  completedItems: number;
  progressPercent: number;
  items?: MilestoneItem[];
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById: string;
}

export interface CreateMilestoneDto {
  name: string;
  description?: string;
  category: MilestoneCategory;
  targetDate: string;
  ownerId?: string;
}

export interface UpdateMilestoneDto {
  name?: string;
  description?: string;
  category?: MilestoneCategory;
  status?: MilestoneStatus;
  targetDate?: string;
  ownerId?: string;
}

export interface MilestoneQueryDto {
  status?: MilestoneStatus;
  category?: MilestoneCategory;
  ownerId?: string;
  targetDateFrom?: Date;
  targetDateTo?: Date;
  offset?: number;
  limit?: number;
}

export interface CreateMilestoneItemDto {
  entityType: string;
  entityId?: string;
  customTitle?: string;
}

export interface UpdateMilestoneItemDto {
  isCompleted?: boolean;
  customTitle?: string;
}
