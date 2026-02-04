'use client';

import { useEffect, useState, useCallback } from 'react';
import { ThemeSkeleton } from './theme-skeleton';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/** ID for the injected style element */
const THEME_STYLE_ID = 'tenant-theme';

/** Default Ethico CSS custom properties (fallback theme) */
const DEFAULT_THEME_CSS = `:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --primary: 221 83% 53%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222 47% 11%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --accent: 210 40% 96%;
  --accent-foreground: 222 47% 11%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 210 40% 98%;
  --border: 214 32% 91%;
  --input: 214 32% 91%;
  --ring: 221 83% 53%;
  --radius: 0.5rem;
}`;

interface TenantThemeProviderProps {
  /** Tenant slug from route params */
  tenantSlug: string;
  /** Child components to render after theme loads */
  children: React.ReactNode;
}

/**
 * TenantThemeProvider - Loads and applies tenant-specific CSS custom properties.
 *
 * This component:
 * 1. Fetches CSS from /api/v1/public/branding/:tenant/css
 * 2. Injects the CSS as a style element in the document head
 * 3. Shows a loading skeleton while CSS loads
 * 4. Falls back to Ethico default theme on error
 * 5. Cleans up the style element on unmount
 *
 * @example
 * ```tsx
 * // In layout.tsx
 * export default function Layout({ children, params }) {
 *   return (
 *     <TenantThemeProvider tenantSlug={params.tenant}>
 *       {children}
 *     </TenantThemeProvider>
 *   );
 * }
 * ```
 */
export function TenantThemeProvider({
  tenantSlug,
  children,
}: TenantThemeProviderProps) {
  const [cssLoaded, setCssLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadTheme = useCallback(async () => {
    if (!tenantSlug) {
      // No tenant - apply default theme
      applyThemeCss(DEFAULT_THEME_CSS);
      setCssLoaded(true);
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/public/branding/${encodeURIComponent(tenantSlug)}/css`,
        {
          method: 'GET',
          // Don't send credentials - this is a public endpoint
          credentials: 'omit',
          headers: {
            Accept: 'text/css',
          },
        }
      );

      if (!response.ok) {
        // If tenant not found or error, use default theme
        console.warn(
          `Failed to load theme for tenant "${tenantSlug}": ${response.status}`
        );
        applyThemeCss(DEFAULT_THEME_CSS);
        setLoadError(true);
      } else {
        const css = await response.text();
        applyThemeCss(css);
      }
    } catch (error) {
      console.error('Error loading tenant theme:', error);
      // Apply default theme on error
      applyThemeCss(DEFAULT_THEME_CSS);
      setLoadError(true);
    } finally {
      setCssLoaded(true);
    }
  }, [tenantSlug]);

  useEffect(() => {
    loadTheme();

    // Cleanup: remove theme style element on unmount
    return () => {
      const existingStyle = document.getElementById(THEME_STYLE_ID);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, [loadTheme]);

  // Show loading skeleton while CSS loads
  if (!cssLoaded) {
    return <ThemeSkeleton />;
  }

  return <>{children}</>;
}

/**
 * Applies CSS to the document by injecting or updating a style element.
 */
function applyThemeCss(css: string): void {
  // Remove existing theme style element
  const existingStyle = document.getElementById(THEME_STYLE_ID);
  if (existingStyle) {
    existingStyle.remove();
  }

  // Create and inject new style element
  const style = document.createElement('style');
  style.id = THEME_STYLE_ID;
  style.textContent = css;
  document.head.appendChild(style);
}

/**
 * Utility to force reload the tenant theme.
 * Useful for admin tools when branding is updated.
 */
export function reloadTenantTheme(tenantSlug: string): void {
  // Clear browser cache for the CSS endpoint
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.open(name).then((cache) => {
          cache.delete(
            `${API_BASE_URL}/api/v1/public/branding/${encodeURIComponent(tenantSlug)}/css`
          );
        });
      });
    });
  }
}
