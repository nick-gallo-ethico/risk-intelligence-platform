/**
 * Branding Types
 *
 * Type definitions for the white-label branding system.
 * Supports both TEMPLATE mode (basic customization) and
 * FULL_WHITE_LABEL mode (complete customization with 12-token palette).
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
 * This format is compatible with CSS custom properties and Tailwind.
 */
export interface ColorPalette {
  /** Main background color */
  background: string;
  /** Text color on background */
  foreground: string;
  /** Card background color */
  card: string;
  /** Text color on cards */
  cardForeground: string;
  /** Primary brand color */
  primary: string;
  /** Text color on primary */
  primaryForeground: string;
  /** Secondary color for less prominent elements */
  secondary: string;
  /** Text color on secondary */
  secondaryForeground: string;
  /** Muted color for subtle backgrounds */
  muted: string;
  /** Text color on muted */
  mutedForeground: string;
  /** Accent color for highlights */
  accent: string;
  /** Text color on accent */
  accentForeground: string;
  /** Destructive action color (red tones) */
  destructive: string;
  /** Text color on destructive */
  destructiveForeground: string;
  /** Border color */
  border: string;
  /** Input field border/background */
  input: string;
  /** Focus ring color */
  ring: string;
}

/**
 * Typography configuration for full white-label mode.
 */
export interface Typography {
  /** Primary font family for body text */
  fontFamily: string;
  /** Font family for headings (optional, defaults to fontFamily) */
  headingFontFamily?: string;
}

/**
 * BrandingConfig represents the complete branding configuration.
 * Used as service response and for CSS generation.
 */
export interface BrandingConfig {
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

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Default Ethico color palette (light mode).
 * Based on shadcn/ui zinc palette with Ethico blue primary.
 */
export const DEFAULT_COLOR_PALETTE: ColorPalette = {
  background: '0 0% 100%',
  foreground: '222 47% 11%',
  card: '0 0% 100%',
  cardForeground: '222 47% 11%',
  primary: '221 83% 53%', // Ethico blue
  primaryForeground: '210 40% 98%',
  secondary: '210 40% 96%',
  secondaryForeground: '222 47% 11%',
  muted: '210 40% 96%',
  mutedForeground: '215 16% 47%',
  accent: '210 40% 96%',
  accentForeground: '222 47% 11%',
  destructive: '0 84% 60%',
  destructiveForeground: '210 40% 98%',
  border: '214 32% 91%',
  input: '214 32% 91%',
  ring: '221 83% 53%', // Matches primary
};

/**
 * Default dark mode color palette.
 * Used when theme is DARK.
 */
export const DEFAULT_DARK_COLOR_PALETTE: ColorPalette = {
  background: '222 47% 11%',
  foreground: '210 40% 98%',
  card: '222 47% 11%',
  cardForeground: '210 40% 98%',
  primary: '217 91% 60%', // Lighter blue for dark mode
  primaryForeground: '222 47% 11%',
  secondary: '217 32% 17%',
  secondaryForeground: '210 40% 98%',
  muted: '217 32% 17%',
  mutedForeground: '215 20% 65%',
  accent: '217 32% 17%',
  accentForeground: '210 40% 98%',
  destructive: '0 62% 30%',
  destructiveForeground: '210 40% 98%',
  border: '217 32% 17%',
  input: '217 32% 17%',
  ring: '217 91% 60%', // Matches primary
};

/**
 * Default typography configuration.
 * Uses Inter as the default font family (common for SaaS applications).
 */
export const DEFAULT_TYPOGRAPHY: Typography = {
  fontFamily: 'Inter, sans-serif',
  headingFontFamily: 'Inter, sans-serif',
};

/**
 * CSS variable mapping for color palette.
 * Maps ColorPalette keys to CSS custom property names.
 */
export const CSS_VAR_MAPPING: Record<keyof ColorPalette, string> = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  cardForeground: '--card-foreground',
  primary: '--primary',
  primaryForeground: '--primary-foreground',
  secondary: '--secondary',
  secondaryForeground: '--secondary-foreground',
  muted: '--muted',
  mutedForeground: '--muted-foreground',
  accent: '--accent',
  accentForeground: '--accent-foreground',
  destructive: '--destructive',
  destructiveForeground: '--destructive-foreground',
  border: '--border',
  input: '--input',
  ring: '--ring',
};
