import { apiClient } from './api';
import type {
  Investigation,
  InvestigationListResponse,
  CreateInvestigationInput,
} from '@/types/investigation';

/**
 * API client functions for Investigation entity.
 * Uses nested routes under cases for creation/listing.
 */

/**
 * Get all investigations for a specific case.
 */
export async function getInvestigationsForCase(
  caseId: string,
  options?: { page?: number; limit?: number }
): Promise<InvestigationListResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));

  const queryString = params.toString();
  const url = `/cases/${caseId}/investigations${queryString ? `?${queryString}` : ''}`;

  return apiClient.get<InvestigationListResponse>(url);
}

/**
 * Create a new investigation for a case.
 */
export async function createInvestigation(
  caseId: string,
  input: CreateInvestigationInput
): Promise<Investigation> {
  return apiClient.post<Investigation>(`/cases/${caseId}/investigations`, input);
}

/**
 * Get a single investigation by ID.
 */
export async function getInvestigation(id: string): Promise<Investigation> {
  return apiClient.get<Investigation>(`/investigations/${id}`);
}

/**
 * Update an investigation.
 */
export async function updateInvestigation(
  id: string,
  input: Partial<CreateInvestigationInput>
): Promise<Investigation> {
  return apiClient.patch<Investigation>(`/investigations/${id}`, input);
}

/**
 * Assign investigators to an investigation.
 */
export async function assignInvestigation(
  id: string,
  userIds: string[],
  primaryInvestigatorId?: string
): Promise<Investigation> {
  return apiClient.post<Investigation>(`/investigations/${id}/assign`, {
    userIds,
    primaryInvestigatorId,
  });
}

/**
 * Transition investigation status.
 */
export async function transitionInvestigation(
  id: string,
  status: string,
  rationale?: string
): Promise<Investigation> {
  return apiClient.post<Investigation>(`/investigations/${id}/transition`, {
    status,
    rationale,
  });
}

/**
 * Close an investigation with findings.
 */
export async function closeInvestigation(
  id: string,
  data: {
    outcome: string;
    findingsSummary?: string;
    findingsDetail?: string;
    closureNotes?: string;
  }
): Promise<Investigation> {
  return apiClient.post<Investigation>(`/investigations/${id}/close`, data);
}
