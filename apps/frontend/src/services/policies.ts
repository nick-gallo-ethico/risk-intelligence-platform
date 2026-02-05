/**
 * Policies API Service
 *
 * API client functions for policy management.
 * Handles CRUD operations, publishing, approval workflow, and translations.
 */

import { apiClient } from '@/lib/api';
import type {
  Policy,
  PolicyVersion,
  PolicyTranslation,
  CreatePolicyDto,
  UpdatePolicyDto,
  PublishPolicyDto,
  PolicyFilters,
  PolicyListResponse,
  PolicyApprovalStatus,
  PolicyCaseAssociation,
  AttestationCampaign,
} from '@/types/policy';

/**
 * List policies with optional filtering and pagination.
 *
 * @param filters - Optional filter parameters
 * @param page - Page number (1-indexed)
 * @param limit - Number of items per page
 * @returns Paginated list of policies
 */
export async function listPolicies(
  filters?: PolicyFilters,
  page = 1,
  limit = 20
): Promise<PolicyListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (filters?.status) params.set('status', filters.status);
  if (filters?.policyType) params.set('policyType', filters.policyType);
  if (filters?.ownerId) params.set('ownerId', filters.ownerId);
  if (filters?.search) params.set('search', filters.search);

  return apiClient.get<PolicyListResponse>(`/policies?${params}`);
}

/**
 * Get a single policy by ID.
 *
 * @param id - Policy ID
 * @returns Policy with owner details
 */
export async function getPolicy(id: string): Promise<Policy> {
  return apiClient.get<Policy>(`/policies/${id}`);
}

/**
 * Create a new policy.
 *
 * @param dto - Policy creation data
 * @returns Created policy
 */
export async function createPolicy(dto: CreatePolicyDto): Promise<Policy> {
  return apiClient.post<Policy>('/policies', dto);
}

/**
 * Update a policy draft.
 *
 * @param id - Policy ID
 * @param dto - Update data
 * @returns Updated policy
 */
export async function updatePolicy(
  id: string,
  dto: UpdatePolicyDto
): Promise<Policy> {
  return apiClient.put<Policy>(`/policies/${id}`, dto);
}

/**
 * Delete a policy (only DRAFT policies can be deleted).
 *
 * @param id - Policy ID
 */
export async function deletePolicy(id: string): Promise<void> {
  await apiClient.delete(`/policies/${id}`);
}

/**
 * Publish a policy, creating a new version.
 *
 * @param id - Policy ID
 * @param dto - Publish data with version info
 * @returns Created policy version
 */
export async function publishPolicy(
  id: string,
  dto: PublishPolicyDto
): Promise<PolicyVersion> {
  return apiClient.post<PolicyVersion>(`/policies/${id}/publish`, dto);
}

/**
 * Retire a published policy.
 *
 * @param id - Policy ID
 * @returns Updated policy
 */
export async function retirePolicy(id: string): Promise<Policy> {
  return apiClient.post<Policy>(`/policies/${id}/retire`);
}

/**
 * Get all versions of a policy.
 *
 * @param id - Policy ID
 * @returns Array of policy versions
 */
export async function getPolicyVersions(id: string): Promise<PolicyVersion[]> {
  return apiClient.get<PolicyVersion[]>(`/policies/${id}/versions`);
}

/**
 * Get a specific policy version.
 *
 * @param id - Policy ID
 * @param version - Version number
 * @returns Policy version
 */
export async function getPolicyVersion(
  id: string,
  version: number
): Promise<PolicyVersion> {
  return apiClient.get<PolicyVersion>(`/policies/${id}/versions/${version}`);
}

/**
 * Submit a policy for approval.
 *
 * @param id - Policy ID
 * @param workflowTemplateId - Optional workflow template ID
 * @param submissionNotes - Optional notes for reviewers
 * @returns Updated policy
 */
export async function submitForApproval(
  id: string,
  workflowTemplateId?: string,
  submissionNotes?: string
): Promise<{ policy: Policy }> {
  return apiClient.post<{ policy: Policy }>(`/policies/${id}/submit-for-approval`, {
    workflowTemplateId,
    submissionNotes,
  });
}

/**
 * Cancel an in-progress approval workflow.
 *
 * @param id - Policy ID
 * @param reason - Cancellation reason
 * @returns Updated policy
 */
export async function cancelApproval(
  id: string,
  reason: string
): Promise<Policy> {
  return apiClient.post<Policy>(`/policies/${id}/cancel-approval`, { reason });
}

/**
 * Get the approval status of a policy.
 *
 * @param id - Policy ID
 * @returns Approval status with workflow details
 */
export async function getApprovalStatus(
  id: string
): Promise<PolicyApprovalStatus> {
  return apiClient.get<PolicyApprovalStatus>(`/policies/${id}/approval-status`);
}

/**
 * Get available workflow templates for policy approval.
 *
 * @returns Array of workflow templates
 */
export async function getWorkflowTemplates(): Promise<
  Array<{ id: string; name: string; description?: string }>
> {
  return apiClient.get<Array<{ id: string; name: string; description?: string }>>(
    '/policies/workflow-templates'
  );
}

/**
 * Get translations for a policy version.
 *
 * @param versionId - Policy version ID
 * @returns Array of translations
 */
export async function getTranslations(
  versionId: string
): Promise<PolicyTranslation[]> {
  return apiClient.get<PolicyTranslation[]>(
    `/policies/versions/${versionId}/translations`
  );
}

/**
 * Create a translation for a policy version.
 *
 * @param versionId - Policy version ID
 * @param languageCode - ISO language code (e.g., 'es', 'fr')
 * @param useAI - Whether to use AI for translation
 * @returns Created translation
 */
export async function createTranslation(
  versionId: string,
  languageCode: string,
  useAI = true
): Promise<PolicyTranslation> {
  return apiClient.post<PolicyTranslation>(
    `/policies/versions/${versionId}/translations`,
    {
      policyVersionId: versionId,
      languageCode,
      useAI,
    }
  );
}

/**
 * Update a translation.
 *
 * @param translationId - Translation ID
 * @param content - Updated translation content
 * @returns Updated translation
 */
export async function updateTranslation(
  translationId: string,
  content: string
): Promise<PolicyTranslation> {
  return apiClient.put<PolicyTranslation>(
    `/policies/translations/${translationId}`,
    { content }
  );
}

/**
 * Approve a translation.
 *
 * @param translationId - Translation ID
 * @returns Updated translation
 */
export async function approveTranslation(
  translationId: string
): Promise<PolicyTranslation> {
  return apiClient.post<PolicyTranslation>(
    `/policies/translations/${translationId}/approve`
  );
}

/**
 * Refresh a stale translation.
 *
 * @param translationId - Translation ID
 * @returns Updated translation
 */
export async function refreshTranslation(
  translationId: string
): Promise<PolicyTranslation> {
  return apiClient.post<PolicyTranslation>(
    `/policies/translations/${translationId}/refresh`
  );
}

// ============================================================================
// Policy-Case Associations
// ============================================================================

/**
 * Get policy-case associations for a policy.
 *
 * @param policyId - Policy ID
 * @returns Array of policy-case associations
 */
export async function getPolicyCaseAssociations(
  policyId: string
): Promise<PolicyCaseAssociation[]> {
  return apiClient.get<PolicyCaseAssociation[]>(
    `/policy-case-associations/by-policy/${policyId}`
  );
}

/**
 * Link a case to a policy.
 *
 * @param policyId - Policy ID
 * @param caseId - Case ID
 * @param linkType - Type of link (VIOLATION, REFERENCE, GOVERNING)
 * @param violationDate - Optional violation date (for VIOLATION type)
 * @param notes - Optional notes
 * @returns Created association
 */
export async function linkCaseToPolicy(
  policyId: string,
  caseId: string,
  linkType: 'VIOLATION' | 'REFERENCE' | 'GOVERNING',
  violationDate?: string,
  notes?: string
): Promise<PolicyCaseAssociation> {
  return apiClient.post<PolicyCaseAssociation>('/policy-case-associations', {
    policyId,
    caseId,
    linkType,
    violationDate,
    notes,
  });
}

/**
 * Unlink a case from a policy.
 *
 * @param associationId - Association ID
 */
export async function unlinkCaseFromPolicy(associationId: string): Promise<void> {
  await apiClient.delete(`/policy-case-associations/${associationId}`);
}

// ============================================================================
// Attestation Campaigns
// ============================================================================

/**
 * Get attestation campaigns for a policy.
 *
 * @param policyId - Policy ID
 * @returns Array of attestation campaigns
 */
export async function getPolicyAttestationCampaigns(
  policyId: string
): Promise<AttestationCampaign[]> {
  return apiClient.get<AttestationCampaign[]>(
    `/campaigns?policyId=${policyId}&type=ATTESTATION`
  );
}

// Export all functions as a single API object for convenience
export const policiesApi = {
  list: listPolicies,
  getById: getPolicy,
  create: createPolicy,
  update: updatePolicy,
  delete: deletePolicy,
  publish: publishPolicy,
  retire: retirePolicy,
  getVersions: getPolicyVersions,
  getVersion: getPolicyVersion,
  submitForApproval,
  cancelApproval,
  getApprovalStatus,
  getWorkflowTemplates,
  getTranslations,
  createTranslation,
  updateTranslation,
  approveTranslation,
  refreshTranslation,
  getCaseAssociations: getPolicyCaseAssociations,
  linkCase: linkCaseToPolicy,
  unlinkCase: unlinkCaseFromPolicy,
  getAttestationCampaigns: getPolicyAttestationCampaigns,
};
