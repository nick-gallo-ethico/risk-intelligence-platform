/**
 * User-related types shared between frontend and backend.
 */

export enum UserRole {
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER',
  TRIAGE_LEAD = 'TRIAGE_LEAD',
  INVESTIGATOR = 'INVESTIGATOR',
  POLICY_AUTHOR = 'POLICY_AUTHOR',
  POLICY_REVIEWER = 'POLICY_REVIEWER',
  DEPARTMENT_ADMIN = 'DEPARTMENT_ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export interface User {
  id: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password?: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface UserProfile extends Omit<User, 'organizationId'> {
  organizationName: string;
  organizationSlug: string;
}
