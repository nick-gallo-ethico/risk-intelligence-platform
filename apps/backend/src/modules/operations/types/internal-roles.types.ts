/**
 * Internal Roles Types
 *
 * Type definitions for internal Ethico staff roles and permissions.
 * These roles are SEPARATE from tenant User roles (RBAC) and are used
 * exclusively for the Internal Operations Portal.
 *
 * SECURITY NOTE: InternalUser is a completely separate model from tenant User.
 * This ensures SOC 2 compliance by maintaining clear separation between
 * internal Ethico staff access and tenant user access.
 *
 * @see CONTEXT.md for role descriptions and access matrix
 */

/**
 * InternalRole defines the permission levels for internal Ethico staff.
 * Each role has specific capabilities within the Operations Portal.
 */
export const InternalRole = {
  /** Basic support access - view config, impersonate for troubleshooting */
  SUPPORT_L1: "SUPPORT_L1",
  /** Advanced support - includes error/job visibility */
  SUPPORT_L2: "SUPPORT_L2",
  /** Full support capabilities - can modify config */
  SUPPORT_L3: "SUPPORT_L3",
  /** Implementation specialist - migrations, project management */
  IMPLEMENTATION: "IMPLEMENTATION",
  /** Hotline operations - QA queue, directives, operator status */
  HOTLINE_OPS: "HOTLINE_OPS",
  /** Client success manager - health scores, usage metrics, benchmarks */
  CLIENT_SUCCESS: "CLIENT_SUCCESS",
  /** Internal admin - full access to all operations features */
  ADMIN: "ADMIN",
} as const;

export type InternalRole = (typeof InternalRole)[keyof typeof InternalRole];

/**
 * Permission strings for the Operations Portal.
 * These are granular capabilities that can be checked at runtime.
 */
export const InternalPermission = {
  /** Ability to impersonate into tenant accounts */
  IMPERSONATE: "impersonate",
  /** View tenant configuration */
  VIEW_CONFIG: "view_config",
  /** View tenant error logs */
  VIEW_ERRORS: "view_errors",
  /** View background job status */
  VIEW_JOBS: "view_jobs",
  /** Modify tenant configuration */
  MODIFY_CONFIG: "modify_config",
  /** Manage implementation projects */
  MANAGE_PROJECTS: "manage_projects",
  /** Run data migrations */
  RUN_MIGRATIONS: "run_migrations",
  /** View global QA queue across tenants */
  VIEW_GLOBAL_QA: "view_global_qa",
  /** Perform bulk QA actions */
  BULK_QA_ACTIONS: "bulk_qa_actions",
  /** Manage call directives */
  MANAGE_DIRECTIVES: "manage_directives",
  /** View operator status */
  VIEW_OPERATOR_STATUS: "view_operator_status",
  /** View client health scores */
  VIEW_HEALTH_SCORES: "view_health_scores",
  /** View usage metrics */
  VIEW_USAGE_METRICS: "view_usage_metrics",
  /** View benchmark data */
  VIEW_BENCHMARKS: "view_benchmarks",
  /** Full access (admin only) */
  ALL: "*",
} as const;

export type InternalPermission =
  (typeof InternalPermission)[keyof typeof InternalPermission];

/**
 * Role to permissions mapping.
 * Defines which permissions each internal role has.
 */
export const ROLE_PERMISSIONS: Record<InternalRole, readonly InternalPermission[]> = {
  [InternalRole.SUPPORT_L1]: [
    InternalPermission.IMPERSONATE,
    InternalPermission.VIEW_CONFIG,
  ],
  [InternalRole.SUPPORT_L2]: [
    InternalPermission.IMPERSONATE,
    InternalPermission.VIEW_CONFIG,
    InternalPermission.VIEW_ERRORS,
    InternalPermission.VIEW_JOBS,
  ],
  [InternalRole.SUPPORT_L3]: [
    InternalPermission.IMPERSONATE,
    InternalPermission.VIEW_CONFIG,
    InternalPermission.VIEW_ERRORS,
    InternalPermission.VIEW_JOBS,
    InternalPermission.MODIFY_CONFIG,
  ],
  [InternalRole.IMPLEMENTATION]: [
    InternalPermission.IMPERSONATE,
    InternalPermission.VIEW_CONFIG,
    InternalPermission.MANAGE_PROJECTS,
    InternalPermission.RUN_MIGRATIONS,
  ],
  [InternalRole.HOTLINE_OPS]: [
    InternalPermission.VIEW_GLOBAL_QA,
    InternalPermission.BULK_QA_ACTIONS,
    InternalPermission.MANAGE_DIRECTIVES,
    InternalPermission.VIEW_OPERATOR_STATUS,
  ],
  [InternalRole.CLIENT_SUCCESS]: [
    InternalPermission.VIEW_HEALTH_SCORES,
    InternalPermission.VIEW_USAGE_METRICS,
    InternalPermission.VIEW_BENCHMARKS,
  ],
  [InternalRole.ADMIN]: [InternalPermission.ALL],
} as const;

/**
 * Checks if a role has a specific permission.
 * @param role - The internal role to check
 * @param permission - The permission to check for
 * @returns true if the role has the permission
 */
export function hasPermission(
  role: InternalRole,
  permission: InternalPermission,
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return false;
  }
  // ADMIN role with ALL permission has access to everything
  if (permissions.includes(InternalPermission.ALL)) {
    return true;
  }
  return permissions.includes(permission);
}

/**
 * Gets all permissions for a role.
 * @param role - The internal role
 * @returns Array of permissions for the role
 */
export function getPermissionsForRole(role: InternalRole): InternalPermission[] {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) {
    return [];
  }
  // ADMIN role returns all permissions
  if (permissions.includes(InternalPermission.ALL)) {
    return Object.values(InternalPermission).filter(
      (p) => p !== InternalPermission.ALL,
    );
  }
  return [...permissions];
}

/**
 * Human-readable descriptions for internal roles.
 * Used in UI and audit logs.
 */
export const ROLE_DESCRIPTIONS: Record<InternalRole, string> = {
  [InternalRole.SUPPORT_L1]: "Support Tier 1 - Basic read-only access",
  [InternalRole.SUPPORT_L2]: "Support Tier 2 - Advanced diagnostics access",
  [InternalRole.SUPPORT_L3]: "Support Tier 3 - Full support with config changes",
  [InternalRole.IMPLEMENTATION]: "Implementation Specialist - Migrations and setup",
  [InternalRole.HOTLINE_OPS]: "Hotline Operations - QA and directive management",
  [InternalRole.CLIENT_SUCCESS]: "Client Success Manager - Health monitoring",
  [InternalRole.ADMIN]: "Platform Administrator - Full system access",
};
