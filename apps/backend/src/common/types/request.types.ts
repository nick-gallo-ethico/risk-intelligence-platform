/**
 * Express Request Type Extensions
 *
 * Re-exports RequestUser and provides type guards
 * for type-safe request property access.
 *
 * Note: Express.Request type augmentation is handled by:
 * - Auth module's jwt-payload.interface.ts for user
 * - Impersonation module's impersonation.service.ts for impersonation
 */

import { UserRole } from "@prisma/client";

/**
 * User object attached to request after JWT validation.
 * Mirrors the auth module's RequestUser interface.
 *
 * For import in auth module code, use:
 * import { RequestUser } from "../interfaces/jwt-payload.interface";
 *
 * For import elsewhere:
 * import { RequestUser } from "@common/types";
 */
export interface RequestUser {
  /** User ID (UUID) */
  id: string;
  /** User email address */
  email: string;
  /** Organization/tenant ID for RLS */
  organizationId: string;
  /** User's role for RBAC */
  role: UserRole;
  /** Session ID for token management */
  sessionId: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /**
   * MFA verification status from JWT payload.
   * true after successful TOTP verification, false otherwise.
   */
  mfaVerified: boolean;
}

/**
 * Express request with authenticated user.
 * Use instead of manual type casting.
 */
export interface AuthenticatedRequest extends Express.Request {
  user: RequestUser;
  organizationId: string;
}

/**
 * Type guard to check if request has authenticated user.
 *
 * @example
 * if (hasAuthenticatedUser(req)) {
 *   // req.user is typed as RequestUser (non-undefined)
 *   console.log(req.user.email);
 * }
 */
export function hasAuthenticatedUser(
  req: Express.Request,
): req is AuthenticatedRequest {
  return (
    req.user !== undefined &&
    typeof (req.user as RequestUser).id === "string" &&
    typeof (req.user as RequestUser).organizationId === "string"
  );
}

/**
 * Type guard to check if request has organization context.
 */
export function hasOrganizationContext(
  req: Express.Request,
): req is Express.Request & { organizationId: string } {
  return typeof req.organizationId === "string";
}

/**
 * Type guard to check if request is impersonated.
 * Note: ImpersonationContext type is defined in impersonation.service.ts
 */
export function isImpersonatedRequest(req: Express.Request): boolean {
  return req.impersonation !== undefined;
}
