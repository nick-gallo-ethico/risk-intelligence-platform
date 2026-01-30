/**
 * Investigation entity types - matches backend Prisma schema
 */

export type InvestigationStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'INVESTIGATING'
  | 'PENDING_REVIEW'
  | 'CLOSED'
  | 'ON_HOLD';

export type InvestigationType = 'FULL' | 'LIMITED' | 'INQUIRY';

export type InvestigationDepartment =
  | 'HR'
  | 'LEGAL'
  | 'SAFETY'
  | 'COMPLIANCE'
  | 'OTHER';

export type SlaStatus = 'ON_TRACK' | 'WARNING' | 'OVERDUE';

export type InvestigationOutcome =
  | 'SUBSTANTIATED'
  | 'UNSUBSTANTIATED'
  | 'INCONCLUSIVE'
  | 'POLICY_VIOLATION'
  | 'NO_VIOLATION'
  | 'INSUFFICIENT_EVIDENCE';

export interface InvestigationUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Investigation {
  id: string;
  caseId: string;
  organizationId: string;
  investigationNumber: number;

  // Classification
  categoryId: string | null;
  investigationType: InvestigationType;
  department: InvestigationDepartment | null;

  // Assignment
  assignedTo: string[];
  primaryInvestigatorId: string | null;
  primaryInvestigator?: InvestigationUser;
  assignedAt: string | null;
  assignedById: string | null;

  // Workflow
  status: InvestigationStatus;
  statusRationale: string | null;
  statusChangedAt: string | null;
  dueDate: string | null;
  slaStatus: SlaStatus;

  // Findings
  findingsSummary: string | null;
  findingsDetail: string | null;
  outcome: InvestigationOutcome | null;
  rootCause: string | null;
  lessonsLearned: string | null;
  findingsDate: string | null;

  // Closure
  closedAt: string | null;
  closedById: string | null;
  closureNotes: string | null;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdBy?: InvestigationUser;

  // Notes count (aggregated)
  notesCount?: number;
}

export interface InvestigationListResponse {
  data: Investigation[];
  total: number;
  limit: number;
  page: number;
}

export interface CreateInvestigationInput {
  investigationType: InvestigationType;
  categoryId?: string;
  department?: InvestigationDepartment;
  dueDate?: string;
  templateId?: string;
}
