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
  /**
   * MFA verification status - set to true after successful TOTP verification.
   * SEC-09: Session-bound MFA - verification persists in JWT, not separate store.
   * Initial login sets this to false if user has MFA enabled.
   */
  mfaVerified: boolean;
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
  /**
   * SEC-09: MFA verification status to preserve across token refresh.
   * When refreshing tokens, this value is carried forward to the new access token.
   */
  mfaVerified: boolean;
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
  /**
   * MFA verification status from JWT payload.
   * SEC-09: true after successful TOTP verification, false otherwise.
   */
  mfaVerified: boolean;
}
