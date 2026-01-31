/**
 * User types - matches backend DTOs
 */

import type { UserRole } from './auth';

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
  department?: DepartmentRef | null;
  businessUnit?: BusinessUnitRef | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
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
  'READ_ONLY',
  'EMPLOYEE',
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
  READ_ONLY: 'Read Only',
  EMPLOYEE: 'Employee',
};
