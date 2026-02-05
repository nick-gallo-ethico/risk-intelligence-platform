/**
 * Users API Service
 *
 * API client functions for user management.
 * Handles CRUD operations, invitations, MFA resets, and role management.
 */

import { apiClient } from '@/lib/api';
import type {
  User,
  UserListResponse,
  UserQueryParams,
  InviteUserDto,
  UpdateUserInput,
  RolePermission,
  UserFilters,
} from '@/types/user';
import type { UserRole } from '@/types/auth';

/**
 * List users with optional filtering and pagination.
 *
 * @param filters - Optional filter parameters
 * @param page - Page number (1-indexed)
 * @param limit - Number of items per page
 * @returns Paginated list of users
 */
export async function listUsers(
  filters?: UserFilters,
  page = 1,
  limit = 20
): Promise<UserListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (filters?.role) params.set('role', filters.role);
  if (filters?.status) params.set('status', filters.status);
  if (filters?.search) params.set('search', filters.search);

  return apiClient.get<UserListResponse>(`/users?${params}`);
}

/**
 * Get a single user by ID.
 *
 * @param id - User ID
 * @returns User with details
 */
export async function getUser(id: string): Promise<User> {
  return apiClient.get<User>(`/users/${id}`);
}

/**
 * Invite a new user to the organization.
 * Sends an invitation email with activation link.
 *
 * @param dto - Invitation data
 * @returns Created user (pending invite status)
 */
export async function inviteUser(dto: InviteUserDto): Promise<User> {
  return apiClient.post<User>('/users/invite', dto);
}

/**
 * Update a user's information.
 *
 * @param id - User ID
 * @param dto - Update data
 * @returns Updated user
 */
export async function updateUser(
  id: string,
  dto: UpdateUserInput
): Promise<User> {
  return apiClient.patch<User>(`/users/${id}`, dto);
}

/**
 * Deactivate a user account.
 * User will no longer be able to log in.
 *
 * @param id - User ID
 * @returns Updated user
 */
export async function deactivateUser(id: string): Promise<User> {
  return apiClient.post<User>(`/users/${id}/deactivate`);
}

/**
 * Reactivate a previously deactivated user account.
 *
 * @param id - User ID
 * @returns Updated user
 */
export async function reactivateUser(id: string): Promise<User> {
  return apiClient.post<User>(`/users/${id}/reactivate`);
}

/**
 * Resend invitation email to a pending user.
 *
 * @param id - User ID
 */
export async function resendInvite(id: string): Promise<void> {
  await apiClient.post(`/users/${id}/resend-invite`);
}

/**
 * Reset a user's MFA settings.
 * User will need to set up MFA again on next login.
 *
 * @param id - User ID
 */
export async function resetMfa(id: string): Promise<void> {
  await apiClient.post(`/users/${id}/reset-mfa`);
}

/**
 * Suspend a user account.
 * Different from deactivation - indicates admin action.
 *
 * @param id - User ID
 * @param reason - Reason for suspension
 * @returns Updated user
 */
export async function suspendUser(id: string, reason?: string): Promise<User> {
  return apiClient.post<User>(`/users/${id}/suspend`, { reason });
}

/**
 * Get role permissions matrix.
 * Shows what each role can do with each resource.
 *
 * @returns Map of role to permissions
 */
export async function getRolePermissions(): Promise<
  Record<UserRole, RolePermission[]>
> {
  return apiClient.get<Record<UserRole, RolePermission[]>>(
    '/users/role-permissions'
  );
}

// Export all functions as a single API object for convenience
export const usersApi = {
  list: listUsers,
  getById: getUser,
  invite: inviteUser,
  update: updateUser,
  deactivate: deactivateUser,
  reactivate: reactivateUser,
  resendInvite,
  resetMfa,
  suspend: suspendUser,
  getRolePermissions,
};
