/**
 * User types - matches backend DTOs
 */

import type { UserRole } from './auth';

export type { UserRole } from './auth';

/**
 * User status for display purposes
 * - ACTIVE: User can log in and use the platform
 * - PENDING_INVITE: User has been invited but hasn't activated account
 * - INACTIVE: User has been deactivated
 * - SUSPENDED: User has been suspended (admin action)
 */
export type UserStatus = 'ACTIVE' | 'PENDING_INVITE' | 'INACTIVE' | 'SUSPENDED';

export interface DepartmentRef {
  id: string;
  name: string;
}

export interface BusinessUnitRef {
  id: string;
  name: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  status?: UserStatus;
  department?: DepartmentRef | null;
  businessUnit?: BusinessUnitRef | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // SSO info
  ssoProvider?: string | null;
  // MFA
  mfaEnabled?: boolean;
  // Profile
  avatarUrl?: string | null;
  title?: string | null;
}

export interface UserListResponse {
  items: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserQueryParams {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password?: string;
  departmentId?: string;
  businessUnitId?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
  departmentId?: string;
  businessUnitId?: string;
  title?: string;
}

/**
 * DTO for inviting a new user to the organization
 */
export interface InviteUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  message?: string;
}

/**
 * Role permission definitions for display
 */
export interface RolePermission {
  resource: string;
  actions: {
    create: boolean;
    read: boolean;
    update: boolean;
    delete: boolean;
  };
}

/**
 * User query filters for the user list
 */
export interface UserFilters {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}

export const USER_ROLES: UserRole[] = [
  'SYSTEM_ADMIN',
  'CCO',
  'COMPLIANCE_OFFICER',
  'TRIAGE_LEAD',
  'INVESTIGATOR',
  'HR_PARTNER',
  'LEGAL_COUNSEL',
  'DEPARTMENT_ADMIN',
  'MANAGER',
  'READ_ONLY',
  'EMPLOYEE',
  'OPERATOR',
];

export const ROLE_LABELS: Record<UserRole, string> = {
  SYSTEM_ADMIN: 'System Admin',
  CCO: 'Chief Compliance Officer',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  TRIAGE_LEAD: 'Triage Lead',
  INVESTIGATOR: 'Investigator',
  HR_PARTNER: 'HR Partner',
  LEGAL_COUNSEL: 'Legal Counsel',
  DEPARTMENT_ADMIN: 'Department Admin',
  MANAGER: 'Manager',
  READ_ONLY: 'Read Only',
  EMPLOYEE: 'Employee',
  OPERATOR: 'Operator',
};

/**
 * Role descriptions for the user invite form
 */
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  SYSTEM_ADMIN: 'Full access to all features and settings',
  CCO: 'Chief Compliance Officer with oversight of all compliance activities',
  COMPLIANCE_OFFICER: 'Manage policies, cases, campaigns, and reports',
  TRIAGE_LEAD: 'Review and triage incoming reports',
  INVESTIGATOR: 'Conduct investigations and manage cases',
  HR_PARTNER: 'Access to HR-related cases and employee data',
  LEGAL_COUNSEL: 'Legal review access for cases and policies',
  DEPARTMENT_ADMIN: 'Manage department-specific data',
  MANAGER: 'Team management and proxy report capabilities',
  READ_ONLY: 'View-only access to reports and dashboards',
  EMPLOYEE: 'Self-service access to own data',
  OPERATOR: 'Hotline operator intake and QA access',
};

/**
 * Status labels for display
 */
export const STATUS_LABELS: Record<UserStatus, string> = {
  ACTIVE: 'Active',
  PENDING_INVITE: 'Pending Invite',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
};

/**
 * Status badge colors for the user list
 */
export const STATUS_COLORS: Record<UserStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PENDING_INVITE: 'bg-yellow-100 text-yellow-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
  SUSPENDED: 'bg-red-100 text-red-800',
};

/**
 * Role badge colors for the user list
 */
export const ROLE_COLORS: Record<UserRole, string> = {
  SYSTEM_ADMIN: 'bg-purple-100 text-purple-800',
  CCO: 'bg-blue-100 text-blue-800',
  COMPLIANCE_OFFICER: 'bg-blue-100 text-blue-800',
  TRIAGE_LEAD: 'bg-indigo-100 text-indigo-800',
  INVESTIGATOR: 'bg-teal-100 text-teal-800',
  HR_PARTNER: 'bg-pink-100 text-pink-800',
  LEGAL_COUNSEL: 'bg-amber-100 text-amber-800',
  DEPARTMENT_ADMIN: 'bg-cyan-100 text-cyan-800',
  MANAGER: 'bg-orange-100 text-orange-800',
  READ_ONLY: 'bg-gray-100 text-gray-800',
  EMPLOYEE: 'bg-slate-100 text-slate-800',
  OPERATOR: 'bg-emerald-100 text-emerald-800',
};
