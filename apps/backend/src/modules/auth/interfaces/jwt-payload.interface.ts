import { UserRole } from "@prisma/client";

/**
 * Access token payload - short-lived (15 minutes)
 * Contains user identity and permissions for API authorization
 */
export interface AccessTokenPayload {
  sub: string; // User ID
  email: string;
  organizationId: string; // Tenant ID (CRITICAL for RLS)
  role: UserRole;
  sessionId: string;
  type: "access";
  iat?: number;
  exp?: number;
}

/**
 * Refresh token payload - long-lived (7 days)
 * Used to obtain new access tokens without re-authentication
 */
export interface RefreshTokenPayload {
  sub: string; // User ID
  organizationId: string;
  sessionId: string;
  type: "refresh";
  iat?: number;
  exp?: number;
}

/**
 * User object attached to request after JWT validation
 */
export interface RequestUser {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
  sessionId: string;
  firstName: string;
  lastName: string;
}
