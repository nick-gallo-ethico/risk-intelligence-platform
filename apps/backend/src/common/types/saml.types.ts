/**
 * SAML 2.0 Type Definitions
 *
 * Provides type-safe access to SAML profile attributes and claim URIs,
 * replacing unsafe `(profile as any)[claimUri]` patterns.
 */

/**
 * Standard SAML 2.0 claim URIs used by common IdPs.
 * These URIs follow WS-Federation claim type standards.
 */
export const SAML_CLAIMS = {
  // Identity claims
  email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
  upn: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn",
  name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",

  // Name claims
  givenName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
  surname: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",
  firstName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname",
  lastName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname",

  // Group and role claims
  groups: "http://schemas.microsoft.com/ws/2008/06/identity/claims/groups",
  role: "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",

  // Authentication claims
  authMethod: "http://schemas.microsoft.com/claims/authnmethodsreferences",
  identityProvider:
    "http://schemas.microsoft.com/identity/claims/identityprovider",

  // Tenant/organization claims (Azure AD specific)
  tenantId: "http://schemas.microsoft.com/identity/claims/tenantid",
  objectId: "http://schemas.microsoft.com/identity/claims/objectidentifier",
} as const;

/**
 * Type for SAML claim URI values.
 */
export type SamlClaimUri = (typeof SAML_CLAIMS)[keyof typeof SAML_CLAIMS];

/**
 * Extended SAML profile interface with common claim attributes.
 * Based on @node-saml/passport-saml Profile but with explicit claim properties.
 *
 * @example
 * // Instead of:
 * const email = (profile as any)['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'];
 *
 * // Use:
 * const email = getEmailFromProfile(profile);
 */
export interface SamlProfile {
  /** SAML NameID value (often the user identifier) */
  nameID?: string;
  /** Format of the NameID */
  nameIDFormat?: string;
  /** Issuer of the SAML assertion */
  issuer?: string;
  /** Session index for single logout */
  sessionIndex?: string;
  /** Subject confirmation method */
  inResponseTo?: string;

  // Direct attribute names (simple IdP configurations)
  email?: string;
  firstName?: string;
  lastName?: string;
  givenName?: string;
  surname?: string;
  displayName?: string;

  // Indexed by claim URI (complex IdP configurations)
  [SAML_CLAIMS.email]?: string;
  [SAML_CLAIMS.upn]?: string;
  [SAML_CLAIMS.givenName]?: string;
  [SAML_CLAIMS.surname]?: string;
  [SAML_CLAIMS.name]?: string;
  [SAML_CLAIMS.groups]?: string[];
  [SAML_CLAIMS.role]?: string | string[];
  [SAML_CLAIMS.tenantId]?: string;
  [SAML_CLAIMS.objectId]?: string;

  // Allow additional custom attributes
  [key: string]: unknown;
}

/**
 * Extracts email from SAML profile.
 * Checks multiple possible attribute locations.
 *
 * @param profile - SAML profile from assertion
 * @returns Email address or undefined if not found
 */
export function getEmailFromProfile(profile: SamlProfile): string | undefined {
  return (
    profile[SAML_CLAIMS.email] ||
    profile[SAML_CLAIMS.upn] ||
    profile.email ||
    profile.nameID ||
    undefined
  );
}

/**
 * Extracts first name from SAML profile.
 *
 * @param profile - SAML profile from assertion
 * @returns First name or empty string if not found
 */
export function getFirstNameFromProfile(profile: SamlProfile): string {
  return (
    profile[SAML_CLAIMS.givenName] ||
    profile.firstName ||
    profile.givenName ||
    ""
  );
}

/**
 * Extracts last name from SAML profile.
 *
 * @param profile - SAML profile from assertion
 * @returns Last name or empty string if not found
 */
export function getLastNameFromProfile(profile: SamlProfile): string {
  return (
    profile[SAML_CLAIMS.surname] || profile.lastName || profile.surname || ""
  );
}

/**
 * Extracts display name from SAML profile.
 * Falls back to constructing from first/last name.
 *
 * @param profile - SAML profile from assertion
 * @returns Display name or empty string if not found
 */
export function getDisplayNameFromProfile(profile: SamlProfile): string {
  if (profile.displayName) {
    return profile.displayName;
  }
  const nameClaimValue = profile[SAML_CLAIMS.name];
  if (typeof nameClaimValue === "string") {
    return nameClaimValue;
  }
  const firstName = getFirstNameFromProfile(profile);
  const lastName = getLastNameFromProfile(profile);
  if (firstName || lastName) {
    return `${firstName} ${lastName}`.trim();
  }
  return "";
}

/**
 * Extracts groups from SAML profile.
 *
 * @param profile - SAML profile from assertion
 * @returns Array of group identifiers
 */
export function getGroupsFromProfile(profile: SamlProfile): string[] {
  const groups = profile[SAML_CLAIMS.groups];
  if (Array.isArray(groups)) {
    return groups;
  }
  return [];
}

/**
 * Extracts roles from SAML profile.
 *
 * @param profile - SAML profile from assertion
 * @returns Array of role identifiers
 */
export function getRolesFromProfile(profile: SamlProfile): string[] {
  const roles = profile[SAML_CLAIMS.role];
  if (Array.isArray(roles)) {
    return roles;
  }
  if (typeof roles === "string") {
    return [roles];
  }
  return [];
}
