import { UserRole } from '@prisma/client';

/**
 * Domain verification methods supported
 */
export type DomainVerificationMethod = 'DNS_TXT' | 'META_TAG' | 'FILE';

/**
 * Domain verification status
 */
export interface TenantDomainData {
  id: string;
  organizationId: string;
  domain: string;
  verified: boolean;
  verifiedAt: Date | null;
  verificationToken: string;
  verificationMethod: DomainVerificationMethod;
  isPrimary: boolean;
}

/**
 * Per-tenant SSO configuration data
 */
export interface TenantSsoConfigData {
  id: string;
  organizationId: string;
  ssoProvider: string | null;
  ssoEnabled: boolean;
  jitProvisioningEnabled: boolean;
  defaultRole: UserRole;
  azureTenantId: string | null;
  samlIdpEntityId: string | null;
  samlIdpEntryPoint: string | null;
  samlIdpCertificate: string | null;
  samlSpEntityId: string | null;
  mfaRequired: boolean;
}

/**
 * SAML configuration subset for strategy initialization
 */
export interface SamlConfig {
  callbackUrl: string;
  entryPoint: string;
  issuer: string;
  cert: string;
  wantAssertionsSigned: boolean;
  wantAuthnResponseSigned: boolean;
  signatureAlgorithm: 'sha256' | 'sha512';
}
