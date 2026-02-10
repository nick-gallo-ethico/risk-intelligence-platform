/**
 * Case entity types - matches backend Prisma schema
 */

export type CaseStatus = "NEW" | "OPEN" | "CLOSED";
export type SourceChannel =
  | "HOTLINE"
  | "WEB_FORM"
  | "PROXY"
  | "DIRECT_ENTRY"
  | "CHATBOT";
export type CaseType = "REPORT" | "INQUIRY" | "FOLLOW_UP";
export type ReporterType =
  | "EMPLOYEE"
  | "VENDOR"
  | "CUSTOMER"
  | "ANONYMOUS"
  | "OTHER";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type SlaStatus = "ON_TRACK" | "WARNING" | "BREACHED" | "CRITICAL";
export type RiuAssociationType = "PRIMARY" | "RELATED" | "MERGED_FROM";
export type RiuType =
  | "HOTLINE_REPORT"
  | "WEB_FORM_SUBMISSION"
  | "DISCLOSURE_RESPONSE"
  | "CHATBOT_TRANSCRIPT";

export interface CaseUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

/**
 * RIU (Risk Intelligence Unit) - immutable intake record
 */
export interface Riu {
  id: string;
  referenceNumber: string;
  type: RiuType;
  sourceChannel: SourceChannel;
  summary?: string;
  details: string;
  severity: Severity;
  createdAt: string;
}

/**
 * RIU-Case association with type
 */
export interface RiuAssociation {
  id: string;
  riuId: string;
  associationType: RiuAssociationType;
  riu: Riu;
}

/**
 * Category with optional parent hierarchy
 */
export interface CaseCategory {
  id: string;
  name: string;
  code: string;
  icon?: string;
  parentId?: string;
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

  // Pipeline & SLA
  pipelineStage?: string;
  slaStatus?: SlaStatus;
  slaDueAt?: string;

  // Category
  categoryId?: string;
  category?: CaseCategory;

  // Assignments
  assignedInvestigators?: CaseUser[];

  // RIU Associations
  riuAssociations?: RiuAssociation[];

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
  sortOrder?: "asc" | "desc";
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
  primaryCategoryId?: string;
  secondaryCategoryId?: string;
}

export interface UpdateCaseInput extends Partial<CreateCaseInput> {
  status?: CaseStatus;
  statusRationale?: string;
}
