/**
 * SSO provider identifiers
 */
export type SsoProvider = 'azure-ad' | 'google' | 'saml';

/**
 * User data extracted from SSO provider callback.
 * Used by SsoService to find or create users during SSO flow.
 */
export interface SsoUserData {
  /** Email address (required for all providers) */
  email: string;

  /** First name from profile */
  firstName: string;

  /** Last name from profile */
  lastName: string;

  /** SSO provider type */
  provider: SsoProvider;

  /** Provider-specific unique ID (oid for Azure, sub for Google, nameID for SAML) */
  ssoId: string;

  /** Azure AD tenant ID (Azure only) */
  azureTenantId?: string;

  /** Profile picture URL (if provided) */
  avatarUrl?: string;

  /** Raw profile data from provider (for debugging/auditing) */
  rawProfile?: Record<string, unknown>;
}
