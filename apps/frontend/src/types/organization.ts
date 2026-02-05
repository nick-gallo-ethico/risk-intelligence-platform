/**
 * Organization types for organization settings UI.
 *
 * Defines the organization entity, settings structure, and update DTOs
 * for configuring general settings, branding, notifications, and security.
 */

import type { UserRole } from './auth';

/**
 * Organization entity - the tenant/organization record.
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  domain?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  timezone: string;
  dateFormat: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Complete organization settings - all configurable options.
 */
export interface OrganizationSettings {
  // General
  name: string;
  timezone: string;
  dateFormat: string;
  defaultLanguage: string;

  // Branding
  logoUrl?: string;
  faviconUrl?: string;
  brandingMode: BrandingMode;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  customCss?: string;

  // Notifications
  defaultDigestTime: string; // HH:mm format
  digestEnabled: boolean;
  enforcedNotificationCategories: string[];
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;

  // Security
  mfaRequired: boolean;
  mfaRequiredRoles: UserRole[];
  sessionTimeoutMinutes: number;
  passwordPolicy: PasswordPolicy;

  // SSO
  ssoEnabled: boolean;
  ssoProvider?: SsoProvider;
  ssoConfig?: SsoConfig;
}

/**
 * Branding modes for organization customization.
 */
export type BrandingMode = 'STANDARD' | 'CO_BRANDED' | 'FULL_WHITE_LABEL';

/**
 * SSO provider types.
 */
export type SsoProvider = 'AZURE_AD' | 'GOOGLE' | 'SAML';

/**
 * Password policy configuration.
 */
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

/**
 * SSO configuration details.
 */
export interface SsoConfig {
  clientId?: string;
  tenantId?: string;
  metadataUrl?: string;
  enforceForAllUsers: boolean;
}

/**
 * DTO for updating general organization settings.
 */
export interface UpdateOrganizationDto {
  name?: string;
  timezone?: string;
  dateFormat?: string;
  defaultLanguage?: string;
}

/**
 * DTO for updating branding settings.
 */
export interface UpdateBrandingDto {
  brandingMode?: BrandingMode;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  customCss?: string;
}

/**
 * DTO for updating notification settings.
 */
export interface UpdateNotificationSettingsDto {
  defaultDigestTime?: string;
  digestEnabled?: boolean;
  enforcedNotificationCategories?: string[];
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

/**
 * DTO for updating security settings.
 */
export interface UpdateSecuritySettingsDto {
  mfaRequired?: boolean;
  mfaRequiredRoles?: UserRole[];
  sessionTimeoutMinutes?: number;
  passwordPolicy?: PasswordPolicy;
}

/**
 * Verified domain information.
 */
export interface VerifiedDomain {
  domain: string;
  verified: boolean;
  verifiedAt: string;
}

/**
 * SSO test result.
 */
export interface SsoTestResult {
  success: boolean;
  message: string;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Available timezones for selection.
 */
export const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'America/Phoenix', label: 'Arizona (No DST)' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Europe/Amsterdam', label: 'Amsterdam (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Mumbai/Kolkata (IST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Australia/Melbourne', label: 'Melbourne (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
] as const;

/**
 * Available date formats for selection.
 */
export const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (Europe)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
  { value: 'DD.MM.YYYY', label: 'DD.MM.YYYY (Germany)' },
  { value: 'YYYY/MM/DD', label: 'YYYY/MM/DD (Japan)' },
] as const;

/**
 * Available languages for selection.
 */
export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'ja', label: 'Japanese' },
  { value: 'zh', label: 'Chinese' },
  { value: 'ko', label: 'Korean' },
] as const;

/**
 * Branding mode options with descriptions.
 */
export const BRANDING_MODES = [
  {
    value: 'STANDARD' as BrandingMode,
    label: 'Standard',
    description: 'Ethico branding throughout the platform',
  },
  {
    value: 'CO_BRANDED' as BrandingMode,
    label: 'Co-branded',
    description: 'Your logo alongside Ethico branding',
  },
  {
    value: 'FULL_WHITE_LABEL' as BrandingMode,
    label: 'White Label',
    description: 'Your branding only - fully customized',
  },
] as const;

/**
 * Notification categories that can be enforced at org level.
 */
export const NOTIFICATION_CATEGORIES = [
  { value: 'case_assignment', label: 'Case Assignment' },
  { value: 'case_updates', label: 'Case Updates' },
  { value: 'sla_warnings', label: 'SLA Warnings' },
  { value: 'approvals', label: 'Approval Requests' },
  { value: 'policy_updates', label: 'Policy Updates' },
  { value: 'attestation_reminders', label: 'Attestation Reminders' },
  { value: 'disclosure_reminders', label: 'Disclosure Reminders' },
  { value: 'system_alerts', label: 'System Alerts' },
  { value: 'security_alerts', label: 'Security Alerts' },
] as const;

/**
 * Role display names for MFA role selection.
 */
export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  SYSTEM_ADMIN: 'System Admin',
  CCO: 'Chief Compliance Officer',
  COMPLIANCE_OFFICER: 'Compliance Officer',
  TRIAGE_LEAD: 'Triage Lead',
  INVESTIGATOR: 'Investigator',
  HR_PARTNER: 'HR Partner',
  LEGAL_COUNSEL: 'Legal Counsel',
  DEPARTMENT_ADMIN: 'Department Admin',
  MANAGER: 'Manager',
  READ_ONLY: 'Read Only',
  EMPLOYEE: 'Employee',
  OPERATOR: 'Operator',
};

/**
 * Roles available for MFA requirement selection.
 */
export const MFA_ELIGIBLE_ROLES: UserRole[] = [
  'SYSTEM_ADMIN',
  'CCO',
  'COMPLIANCE_OFFICER',
  'TRIAGE_LEAD',
  'INVESTIGATOR',
  'HR_PARTNER',
  'LEGAL_COUNSEL',
  'DEPARTMENT_ADMIN',
  'MANAGER',
];

/**
 * Default password policy settings.
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
};

/**
 * Default organization settings (for new organizations or fallback).
 */
export const DEFAULT_ORGANIZATION_SETTINGS: Partial<OrganizationSettings> = {
  timezone: 'America/New_York',
  dateFormat: 'MM/DD/YYYY',
  defaultLanguage: 'en',
  brandingMode: 'STANDARD',
  digestEnabled: true,
  defaultDigestTime: '08:00',
  enforcedNotificationCategories: ['security_alerts', 'sla_warnings'],
  quietHoursEnabled: false,
  mfaRequired: false,
  mfaRequiredRoles: ['SYSTEM_ADMIN', 'CCO'],
  sessionTimeoutMinutes: 60,
  passwordPolicy: DEFAULT_PASSWORD_POLICY,
  ssoEnabled: false,
};
