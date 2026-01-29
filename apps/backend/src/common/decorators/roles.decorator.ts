import { SetMetadata } from '@nestjs/common';

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

export const ROLES_KEY = 'roles';

/**
 * Decorator to specify which roles are allowed to access a route.
 *
 * Usage:
 * @Roles(UserRole.COMPLIANCE_OFFICER, UserRole.SYSTEM_ADMIN)
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Get('admin-only')
 * getAdminData() {
 *   return 'secret data';
 * }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
