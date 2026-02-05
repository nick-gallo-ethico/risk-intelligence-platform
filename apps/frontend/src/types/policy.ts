/**
 * Policy entity types - matches backend Prisma schema
 */

export type PolicyStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PUBLISHED' | 'RETIRED';

export type PolicyType =
  | 'CODE_OF_CONDUCT'
  | 'ANTI_HARASSMENT'
  | 'ANTI_BRIBERY'
  | 'DATA_PRIVACY'
  | 'INFORMATION_SECURITY'
  | 'GIFT_ENTERTAINMENT'
  | 'CONFLICTS_OF_INTEREST'
  | 'TRAVEL_EXPENSE'
  | 'WHISTLEBLOWER'
  | 'SOCIAL_MEDIA'
  | 'ACCEPTABLE_USE'
  | 'OTHER';

export interface PolicyOwner {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Policy {
  id: string;
  title: string;
  slug: string;
  policyType: PolicyType;
  category?: string;
  status: PolicyStatus;
  currentVersion: number;
  draftContent?: string;
  draftUpdatedAt?: string;
  effectiveDate?: string;
  reviewDate?: string;
  ownerId: string;
  owner?: PolicyOwner;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  createdById: string;
  updatedById?: string;
}

export interface PolicyVersion {
  id: string;
  policyId: string;
  version: number;
  versionLabel?: string;
  content: string;
  summary?: string;
  changeNotes?: string;
  publishedAt: string;
  publishedById?: string;
  publishedBy?: PolicyOwner;
  effectiveDate: string;
  isLatest: boolean;
}

export interface PolicyTranslation {
  id: string;
  policyVersionId: string;
  languageCode: string;
  languageName: string;
  title: string;
  content: string;
  translatedBy: 'AI' | 'HUMAN' | 'IMPORT';
  reviewStatus: 'PENDING_REVIEW' | 'APPROVED' | 'NEEDS_REVISION' | 'PUBLISHED';
  isStale: boolean;
  reviewedAt?: string;
  reviewedById?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyDto {
  title: string;
  policyType: PolicyType;
  category?: string;
  content?: string;
  ownerId?: string;
  effectiveDate?: string;
  reviewDate?: string;
}

export interface UpdatePolicyDto {
  title?: string;
  policyType?: PolicyType;
  category?: string;
  content?: string;
  effectiveDate?: string;
  reviewDate?: string;
}

export interface PublishPolicyDto {
  versionLabel?: string;
  summary?: string;
  changeNotes?: string;
  effectiveDate?: string;
}

export interface PolicyFilters {
  status?: PolicyStatus;
  policyType?: PolicyType;
  ownerId?: string;
  search?: string;
}

export interface PolicyListResponse {
  data: Policy[];
  total: number;
  limit: number;
  offset: number;
}

export interface PolicyApprovalStatus {
  policy: Policy;
  workflowInstance?: {
    id: string;
    status: string;
    currentStepIndex: number;
    submittedAt: string;
  };
  currentStep?: {
    name: string;
    stepType: string;
    assignees: Array<{ id: string; name: string; email: string }>;
    status: string;
  };
}

/**
 * Display labels for policy types
 */
export const POLICY_TYPE_LABELS: Record<PolicyType, string> = {
  CODE_OF_CONDUCT: 'Code of Conduct',
  ANTI_HARASSMENT: 'Anti-Harassment',
  ANTI_BRIBERY: 'Anti-Bribery',
  DATA_PRIVACY: 'Data Privacy',
  INFORMATION_SECURITY: 'Information Security',
  GIFT_ENTERTAINMENT: 'Gift & Entertainment',
  CONFLICTS_OF_INTEREST: 'Conflicts of Interest',
  TRAVEL_EXPENSE: 'Travel & Expense',
  WHISTLEBLOWER: 'Whistleblower',
  SOCIAL_MEDIA: 'Social Media',
  ACCEPTABLE_USE: 'Acceptable Use',
  OTHER: 'Other',
};

/**
 * Display labels for policy statuses
 */
export const POLICY_STATUS_LABELS: Record<PolicyStatus, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  PUBLISHED: 'Published',
  RETIRED: 'Retired',
};
