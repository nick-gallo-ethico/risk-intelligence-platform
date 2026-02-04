'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TenantBranding } from '@/types/branding';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Cache branding data with 1-hour stale time (matches backend cache)
const brandingCache = new Map<string, { data: TenantBranding; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface UseTenantBrandingResult {
  branding: TenantBranding | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and cache tenant branding configuration.
 *
 * @param tenantSlug - The tenant's unique slug identifier
 * @returns Branding data, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { branding, isLoading, error } = useTenantBranding('acme-corp');
 *
 * if (isLoading) return <LoadingSkeleton />;
 * if (error) return <ErrorMessage />;
 *
 * return <img src={branding?.logoUrl} alt="Company Logo" />;
 * ```
 */
export function useTenantBranding(tenantSlug: string): UseTenantBrandingResult {
  const [branding, setBranding] = useState<TenantBranding | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBranding = useCallback(async () => {
    if (!tenantSlug) {
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cached = brandingCache.get(tenantSlug);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setBranding(cached.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/public/branding/${encodeURIComponent(tenantSlug)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // Tenant not found - use default branding
          const defaultBranding = getDefaultBranding(tenantSlug);
          setBranding(defaultBranding);
          brandingCache.set(tenantSlug, { data: defaultBranding, timestamp: Date.now() });
        } else {
          throw new Error(`Failed to fetch branding: ${response.status}`);
        }
      } else {
        const data: TenantBranding = await response.json();
        setBranding(data);
        brandingCache.set(tenantSlug, { data, timestamp: Date.now() });
      }
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error('Unknown error fetching branding');
      setError(fetchError);
      // Fall back to default branding on error
      const defaultBranding = getDefaultBranding(tenantSlug);
      setBranding(defaultBranding);
    } finally {
      setIsLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  return {
    branding,
    isLoading,
    error,
    refetch: fetchBranding,
  };
}

/**
 * Returns default Ethico branding for fallback scenarios.
 */
function getDefaultBranding(tenantSlug: string): TenantBranding {
  return {
    id: 'default',
    organizationId: 'default',
    mode: 'TEMPLATE',
    logoUrl: null,
    primaryColor: '221 83% 53%', // Ethico blue
    theme: 'LIGHT',
    colorPalette: null,
    typography: null,
    customDomain: null,
    footerText: null,
    welcomeVideoUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Clears the branding cache for a specific tenant or all tenants.
 * Useful for admin tools when branding is updated.
 */
export function clearBrandingCache(tenantSlug?: string): void {
  if (tenantSlug) {
    brandingCache.delete(tenantSlug);
  } else {
    brandingCache.clear();
  }
}
