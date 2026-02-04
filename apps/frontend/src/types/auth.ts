/**
 * Auth types matching backend DTOs
 */

export type UserRole =
  | 'SYSTEM_ADMIN'
  | 'CCO'
  | 'COMPLIANCE_OFFICER'
  | 'TRIAGE_LEAD'
  | 'INVESTIGATOR'
  | 'HR_PARTNER'
  | 'LEGAL_COUNSEL'
  | 'DEPARTMENT_ADMIN'
  | 'MANAGER'
  | 'READ_ONLY'
  | 'EMPLOYEE'
  | 'OPERATOR';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
