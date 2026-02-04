/**
 * Operator Console API Service
 *
 * API client functions for the Operator Console.
 * Handles client lookup, directives, HRIS search, and caller history.
 */

import { apiClient } from '@/lib/api';
import type {
  ClientProfile,
  CallDirectives,
  HrisResult,
  CallerHistoryItem,
  PaginatedQaQueueResult,
  QaQueueItem,
  QaItemDetail,
  QaQueueFilters,
  QaEditsDto,
} from '@/types/operator.types';

/**
 * Look up a client by phone number.
 *
 * @param phoneNumber - Phone number in any format (will be normalized)
 * @returns Client profile or null if not found
 */
export async function lookupByPhone(
  phoneNumber: string
): Promise<ClientProfile | null> {
  try {
    const encodedPhone = encodeURIComponent(phoneNumber);
    return await apiClient.get<ClientProfile>(
      `/operator/lookup/phone/${encodedPhone}`
    );
  } catch (error: any) {
    // 404 means not found - return null instead of throwing
    if (error?.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get full client profile by ID.
 *
 * @param clientId - Client organization ID
 * @returns Client profile
 */
export async function getClientProfile(
  clientId: string
): Promise<ClientProfile> {
  return apiClient.get<ClientProfile>(
    `/operator/clients/${clientId}/profile`
  );
}

/**
 * Get directives for an active call.
 *
 * @param clientId - Client organization ID
 * @param categoryId - Optional category ID for category-specific directives
 * @returns Call directives grouped by stage
 */
export async function getDirectivesForCall(
  clientId: string,
  categoryId?: string
): Promise<CallDirectives> {
  const params = categoryId ? `?categoryId=${categoryId}` : '';
  return apiClient.get<CallDirectives>(
    `/operator/clients/${clientId}/directives/call${params}`
  );
}

/**
 * Search HRIS for employees.
 *
 * @param clientId - Client organization ID
 * @param query - Search query (name, email, department)
 * @returns Array of HRIS results
 */
export async function searchHris(
  clientId: string,
  query: string
): Promise<HrisResult[]> {
  return apiClient.get<HrisResult[]>(
    `/operator/clients/${clientId}/hris/search`,
    { params: { query } }
  );
}

/**
 * Get caller history (previous RIUs from same phone number).
 *
 * @param clientId - Client organization ID
 * @param phoneNumber - Caller's phone number
 * @returns Array of previous caller history items
 */
export async function getCallerHistory(
  clientId: string,
  phoneNumber: string
): Promise<CallerHistoryItem[]> {
  return apiClient.get<CallerHistoryItem[]>(
    `/operator/clients/${clientId}/caller-history`,
    { params: { phoneNumber } }
  );
}

/**
 * Get QA queue items.
 *
 * @param filters - Filter parameters
 * @returns Paginated QA queue result
 */
export async function getQaQueue(
  filters: QaQueueFilters
): Promise<PaginatedQaQueueResult> {
  return apiClient.get<PaginatedQaQueueResult>('/operator/qa-queue', {
    params: filters,
  });
}

/**
 * Get QA item detail.
 *
 * @param riuId - RIU ID
 * @returns QA item full detail
 */
export async function getQaItemDetail(riuId: string): Promise<QaItemDetail> {
  return apiClient.get<QaItemDetail>(`/operator/qa-queue/${riuId}`);
}

/**
 * Claim QA item for review.
 *
 * @param riuId - RIU ID to claim
 */
export async function claimQaItem(riuId: string): Promise<void> {
  await apiClient.post(`/operator/qa-queue/${riuId}/claim`);
}

/**
 * Release QA item (approve).
 *
 * @param riuId - RIU ID
 * @param edits - Optional edits to apply
 */
export async function releaseQaItem(
  riuId: string,
  edits?: QaEditsDto
): Promise<void> {
  await apiClient.post(`/operator/qa-queue/${riuId}/release`, edits);
}

/**
 * Reject QA item (send back for revision).
 *
 * @param riuId - RIU ID
 * @param reason - Rejection reason
 */
export async function rejectQaItem(
  riuId: string,
  reason: string
): Promise<void> {
  await apiClient.post(`/operator/qa-queue/${riuId}/reject`, { reason });
}

/**
 * Abandon QA item claim (return to queue).
 *
 * @param riuId - RIU ID
 */
export async function abandonQaItem(riuId: string): Promise<void> {
  await apiClient.post(`/operator/qa-queue/${riuId}/abandon`);
}
