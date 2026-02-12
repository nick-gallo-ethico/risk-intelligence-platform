/**
 * Notification Preferences API Service
 *
 * API client for user notification preference endpoints.
 * Handles CRUD operations for notification settings and out-of-office.
 *
 * Endpoints are under /api/v1/notifications/preferences namespace.
 * @see PreferencesController in backend
 */

import { apiClient } from "@/lib/api";
import type {
  NotificationPreferences,
  UpdatePreferencesDto,
  SetOOODto,
  OOOResponse,
  OrgNotificationSettings,
} from "@/types/notification-preferences";

/**
 * Get current user's notification preferences.
 * Returns preferences merged with organization-enforced categories.
 *
 * GET /api/v1/notifications/preferences
 */
export async function getMyPreferences(): Promise<NotificationPreferences> {
  return apiClient.get<NotificationPreferences>("/notifications/preferences");
}

/**
 * Update current user's notification preferences.
 * Only provided fields will be updated.
 *
 * PUT /api/v1/notifications/preferences
 *
 * @param dto - Partial preference updates
 */
export async function updateMyPreferences(
  dto: UpdatePreferencesDto,
): Promise<{ success: boolean }> {
  return apiClient.put<{ success: boolean }>("/notifications/preferences", dto);
}

/**
 * Set out-of-office status with backup user delegation.
 * Urgent notifications will be delegated to the backup user.
 *
 * POST /api/v1/notifications/preferences/ooo
 *
 * @param dto - OOO settings (backup user and end date)
 */
export async function setOOO(dto: SetOOODto): Promise<OOOResponse> {
  return apiClient.post<OOOResponse>("/notifications/preferences/ooo", dto);
}

/**
 * Clear out-of-office status.
 * Resume receiving notifications directly.
 *
 * DELETE /api/v1/notifications/preferences/ooo
 */
export async function clearOOO(): Promise<OOOResponse> {
  return apiClient.delete<OOOResponse>("/notifications/preferences/ooo");
}

/**
 * Get organization notification settings.
 * Available to all authenticated users (read-only).
 *
 * GET /api/v1/notifications/preferences/org-settings
 */
export async function getOrgSettings(): Promise<OrgNotificationSettings> {
  return apiClient.get<OrgNotificationSettings>(
    "/notifications/preferences/org-settings",
  );
}

// Export all functions as a single API object for convenience
export const notificationPreferencesApi = {
  getMyPreferences,
  updateMyPreferences,
  setOOO,
  clearOOO,
  getOrgSettings,
};
