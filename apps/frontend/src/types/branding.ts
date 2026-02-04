/**
 * Branding Types for Frontend
 *
 * Type definitions for the white-label branding system.
 * Mirrors backend types from apps/backend/src/modules/branding/types/branding.types.ts
 */

/**
 * BrandingMode determines the level of customization available to a tenant.
 */
export const BrandingMode = {
  TEMPLATE: 'TEMPLATE',
  FULL_WHITE_LABEL: 'FULL_WHITE_LABEL',
} as const;

export type BrandingMode = (typeof BrandingMode)[keyof typeof BrandingMode];

/**
 * ThemeMode determines the default color scheme for the portal.
 */
export const ThemeMode = {
  LIGHT: 'LIGHT',
  DARK: 'DARK',
  SYSTEM: 'SYSTEM',
} as const;

export type ThemeMode = (typeof ThemeMode)[keyof typeof ThemeMode];

/**
 * ColorPalette defines the 12-token HSL color palette for full white-label mode.
 * Values are HSL strings without hsl() wrapper, e.g., "221 83% 53%"
 */
export interface ColorPalette {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
}

/**
 * Typography configuration for full white-label mode.
 */
export interface Typography {
  fontFamily: string;
  headingFontFamily?: string;
}

/**
 * TenantBranding represents the complete branding configuration for a tenant.
 * Used by the frontend to apply tenant-specific theming.
 */
export interface TenantBranding {
  id: string;
  organizationId: string;
  mode: BrandingMode;

  // Basic branding (always available)
  logoUrl: string | null;
  primaryColor: string | null;
  theme: ThemeMode;

  // Full white-label (only in FULL_WHITE_LABEL mode)
  colorPalette: ColorPalette | null;
  typography: Typography | null;
  customDomain: string | null;

  // Additional customizations
  footerText: string | null;
  welcomeVideoUrl: string | null;

  createdAt: string;
  updatedAt: string;
}

/**
 * EthicsPortalConfig contains tenant-specific configuration for the Ethics Portal.
 * Fetched from /api/v1/public/ethics/:tenant/config
 */
export interface EthicsPortalConfig {
  organizationId: string;
  organizationName: string;
  tenantSlug: string;

  // Feature flags
  features: {
    chatbotEnabled: boolean;
    resourcesEnabled: boolean;
    anonymousReporting: boolean;
    proxyReporting: boolean;
  };

  // Welcome content
  welcomeMessage: string | null;
  announcementBanner: string | null;

  // Quick link customization
  quickLinks: {
    reportIssue: boolean;
    checkStatus: boolean;
    askQuestion: boolean;
    browseResources: boolean;
  };
}
