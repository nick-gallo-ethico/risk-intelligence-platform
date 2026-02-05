/**
 * Organization API Service
 *
 * API client functions for organization settings management.
 * Handles CRUD operations for general settings, branding, notifications,
 * security configuration, and SSO setup.
 */

import { apiClient } from '@/lib/api';
import type {
  Organization,
  OrganizationSettings,
  UpdateOrganizationDto,
  UpdateBrandingDto,
  UpdateNotificationSettingsDto,
  UpdateSecuritySettingsDto,
  VerifiedDomain,
  SsoTestResult,
  SsoConfig,
  SsoProvider,
} from '@/types/organization';

/**
 * Get the current organization record.
 *
 * @returns Organization entity
 */
export async function getCurrentOrganization(): Promise<Organization> {
  return apiClient.get<Organization>('/organization');
}

/**
 * Get the complete organization settings.
 *
 * @returns OrganizationSettings with all configurable options
 */
export async function getOrganizationSettings(): Promise<OrganizationSettings> {
  return apiClient.get<OrganizationSettings>('/organization/settings');
}

/**
 * Update general organization settings.
 *
 * @param dto - General settings update data
 * @returns Updated organization
 */
export async function updateGeneralSettings(
  dto: UpdateOrganizationDto
): Promise<Organization> {
  return apiClient.put<Organization>('/organization', dto);
}

/**
 * Update branding settings.
 *
 * @param dto - Branding settings update data
 * @returns Updated organization settings
 */
export async function updateBrandingSettings(
  dto: UpdateBrandingDto
): Promise<OrganizationSettings> {
  return apiClient.put<OrganizationSettings>('/organization/branding', dto);
}

/**
 * Upload organization logo.
 *
 * @param file - Logo image file
 * @returns URL of the uploaded logo
 */
export async function uploadLogo(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('logo', file);
  return apiClient.post<{ url: string }>('/organization/logo', formData);
}

/**
 * Upload organization favicon.
 *
 * @param file - Favicon image file
 * @returns URL of the uploaded favicon
 */
export async function uploadFavicon(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('favicon', file);
  return apiClient.post<{ url: string }>('/organization/favicon', formData);
}

/**
 * Delete organization logo.
 *
 * @returns Updated organization settings
 */
export async function deleteLogo(): Promise<OrganizationSettings> {
  return apiClient.delete<OrganizationSettings>('/organization/logo');
}

/**
 * Delete organization favicon.
 *
 * @returns Updated organization settings
 */
export async function deleteFavicon(): Promise<OrganizationSettings> {
  return apiClient.delete<OrganizationSettings>('/organization/favicon');
}

/**
 * Update notification settings.
 *
 * @param dto - Notification settings update data
 * @returns Updated organization settings
 */
export async function updateNotificationSettings(
  dto: UpdateNotificationSettingsDto
): Promise<OrganizationSettings> {
  return apiClient.put<OrganizationSettings>(
    '/organization/notification-settings',
    dto
  );
}

/**
 * Update security settings.
 *
 * @param dto - Security settings update data
 * @returns Updated organization settings
 */
export async function updateSecuritySettings(
  dto: UpdateSecuritySettingsDto
): Promise<OrganizationSettings> {
  return apiClient.put<OrganizationSettings>(
    '/organization/security-settings',
    dto
  );
}

/**
 * Get SSO configuration.
 *
 * @returns SSO configuration details
 */
export async function getSsoConfig(): Promise<{
  enabled: boolean;
  provider?: SsoProvider;
  config?: SsoConfig;
}> {
  return apiClient.get<{
    enabled: boolean;
    provider?: SsoProvider;
    config?: SsoConfig;
  }>('/organization/sso');
}

/**
 * Update SSO configuration.
 *
 * @param dto - SSO configuration data
 * @returns Updated SSO configuration
 */
export async function updateSsoConfig(dto: {
  enabled: boolean;
  provider?: SsoProvider;
  config?: Partial<SsoConfig>;
}): Promise<{
  enabled: boolean;
  provider?: SsoProvider;
  config?: SsoConfig;
}> {
  return apiClient.put<{
    enabled: boolean;
    provider?: SsoProvider;
    config?: SsoConfig;
  }>('/organization/sso', dto);
}

/**
 * Test SSO connection.
 *
 * @returns Test result with success status and message
 */
export async function testSsoConnection(): Promise<SsoTestResult> {
  return apiClient.post<SsoTestResult>('/organization/sso/test');
}

/**
 * Get verified domains for the organization.
 *
 * @returns Array of verified domains
 */
export async function getVerifiedDomains(): Promise<VerifiedDomain[]> {
  return apiClient.get<VerifiedDomain[]>('/organization/domains');
}

/**
 * Add a domain for verification.
 *
 * @param domain - Domain to add
 * @returns Verification instructions
 */
export async function addDomain(domain: string): Promise<{
  domain: string;
  verificationRecord: string;
  instructions: string;
}> {
  return apiClient.post<{
    domain: string;
    verificationRecord: string;
    instructions: string;
  }>('/organization/domains', { domain });
}

/**
 * Verify a domain.
 *
 * @param domain - Domain to verify
 * @returns Verification result
 */
export async function verifyDomain(
  domain: string
): Promise<{ verified: boolean; message: string }> {
  return apiClient.post<{ verified: boolean; message: string }>(
    `/organization/domains/${encodeURIComponent(domain)}/verify`
  );
}

/**
 * Remove a domain.
 *
 * @param domain - Domain to remove
 */
export async function removeDomain(domain: string): Promise<void> {
  await apiClient.delete(`/organization/domains/${encodeURIComponent(domain)}`);
}

// Export all functions as a single API object for convenience
export const organizationApi = {
  getCurrent: getCurrentOrganization,
  getSettings: getOrganizationSettings,
  updateGeneral: updateGeneralSettings,
  updateBranding: updateBrandingSettings,
  uploadLogo,
  uploadFavicon,
  deleteLogo,
  deleteFavicon,
  updateNotificationSettings,
  updateSecuritySettings,
  getSsoConfig,
  updateSsoConfig,
  testSsoConnection,
  getVerifiedDomains,
  addDomain,
  verifyDomain,
  removeDomain,
};
