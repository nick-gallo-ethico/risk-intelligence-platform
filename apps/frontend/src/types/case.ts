/**
 * Case entity types - matches backend Prisma schema
 */

export type CaseStatus = 'NEW' | 'OPEN' | 'CLOSED';
export type SourceChannel = 'HOTLINE' | 'WEB_FORM' | 'PROXY' | 'DIRECT_ENTRY' | 'CHATBOT';
export type CaseType = 'REPORT' | 'INQUIRY' | 'FOLLOW_UP';
export type ReporterType = 'EMPLOYEE' | 'VENDOR' | 'CUSTOMER' | 'ANONYMOUS' | 'OTHER';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface CaseUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Case {
  id: string;
  referenceNumber: string;
  organizationId: string;
  status: CaseStatus;
  statusRationale: string | null;
  sourceChannel: SourceChannel;
  caseType: CaseType;
  intakeTimestamp: string;

  // Reporter
  reporterType: ReporterType;
  reporterAnonymous: boolean;
  reporterName: string | null;
  reporterEmail: string | null;
  reporterPhone: string | null;

  // Location
  locationCity: string | null;
  locationState: string | null;
  locationCountry: string | null;

  // Content
  details: string;
  summary: string | null;

  // Classification
  severity: Severity | null;
  severityReason: string | null;
  tags: string[];

  // AI
  aiSummary: string | null;
  aiSummaryGeneratedAt: string | null;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdById: string;
  createdBy?: CaseUser;
}

export interface CaseListResponse {
  data: Case[];
  total: number;
  limit: number;
  offset: number;
}

export interface CaseQueryParams {
  limit?: number;
  offset?: number;
  status?: CaseStatus | CaseStatus[];
  severity?: Severity | Severity[];
  sourceChannel?: SourceChannel;
  caseType?: CaseType;
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateCaseInput {
  sourceChannel: SourceChannel;
  details: string;
  summary?: string;
  caseType?: CaseType;
  reporterType?: ReporterType;
  reporterAnonymous?: boolean;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  locationCity?: string;
  locationState?: string;
  locationCountry?: string;
  severity?: Severity;
  severityReason?: string;
  tags?: string[];
}

export interface UpdateCaseInput extends Partial<CreateCaseInput> {
  status?: CaseStatus;
  statusRationale?: string;
}
