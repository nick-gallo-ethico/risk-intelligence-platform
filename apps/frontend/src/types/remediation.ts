/**
 * Remediation entity types - matches backend Prisma schema
 */

export type RemediationPlanStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export type RemediationStepStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'AWAITING_APPROVAL';

export interface RemediationStep {
  id: string;
  planId: string;
  title: string;
  description?: string;
  status: RemediationStepStatus;
  order: number;
  assigneeId?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  externalAssigneeName?: string;
  externalAssigneeEmail?: string;
  dueDate?: string;
  completedAt?: string;
  completedById?: string;
  notes?: string;
  requiresApproval?: boolean;
  dependsOn?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RemediationPlan {
  id: string;
  caseId: string;
  investigationId?: string;
  title: string;
  description?: string;
  status: RemediationPlanStatus;
  steps: RemediationStep[];
  totalSteps: number;
  completedSteps: number;
  overdueSteps: number;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

export interface CreateRemediationPlanInput {
  caseId: string;
  investigationId?: string;
  title: string;
  description?: string;
  templateId?: string;
}

export interface UpdateRemediationPlanInput {
  title?: string;
  description?: string;
}

export interface CreateRemediationStepInput {
  planId: string;
  title: string;
  description?: string;
  assigneeId?: string;
  externalAssigneeName?: string;
  externalAssigneeEmail?: string;
  dueDate?: string;
  requiresApproval?: boolean;
  dependsOn?: string[];
}

export interface UpdateRemediationStepInput {
  title?: string;
  description?: string;
  assigneeId?: string;
  externalAssigneeName?: string;
  externalAssigneeEmail?: string;
  dueDate?: string;
  requiresApproval?: boolean;
  dependsOn?: string[];
}

export interface CompleteStepInput {
  notes?: string;
  evidenceAttachmentIds?: string[];
}

export interface StepReorderInput {
  id: string;
  order: number;
}
