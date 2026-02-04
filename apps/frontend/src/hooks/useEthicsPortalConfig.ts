'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EthicsPortalConfig } from '@/types/branding';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Cache portal config with 1-hour stale time
const configCache = new Map<string, { data: EthicsPortalConfig; timestamp: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface UseEthicsPortalConfigResult {
  config: EthicsPortalConfig | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and cache Ethics Portal configuration for a tenant.
 *
 * @param tenantSlug - The tenant's unique slug identifier
 * @returns Portal config, loading state, error, and refetch function
 *
 * @example
 * ```tsx
 * const { config, isLoading, error } = useEthicsPortalConfig('acme-corp');
 *
 * if (config?.features.chatbotEnabled) {
 *   // Show chatbot button
 * }
 * ```
 */
export function useEthicsPortalConfig(tenantSlug: string): UseEthicsPortalConfigResult {
  const [config, setConfig] = useState<EthicsPortalConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConfig = useCallback(async () => {
    if (!tenantSlug) {
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cached = configCache.get(tenantSlug);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      setConfig(cached.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/public/ethics/${encodeURIComponent(tenantSlug)}/config`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // Tenant not found - use default config
          const defaultConfig = getDefaultConfig(tenantSlug);
          setConfig(defaultConfig);
          configCache.set(tenantSlug, { data: defaultConfig, timestamp: Date.now() });
        } else {
          throw new Error(`Failed to fetch portal config: ${response.status}`);
        }
      } else {
        const data: EthicsPortalConfig = await response.json();
        setConfig(data);
        configCache.set(tenantSlug, { data, timestamp: Date.now() });
      }
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error('Unknown error fetching config');
      setError(fetchError);
      // Fall back to default config on error
      const defaultConfig = getDefaultConfig(tenantSlug);
      setConfig(defaultConfig);
    } finally {
      setIsLoading(false);
    }
  }, [tenantSlug]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    isLoading,
    error,
    refetch: fetchConfig,
  };
}

/**
 * Returns default Ethics Portal configuration for fallback scenarios.
 */
function getDefaultConfig(tenantSlug: string): EthicsPortalConfig {
  return {
    organizationId: 'default',
    organizationName: 'Ethics Portal',
    tenantSlug,
    features: {
      chatbotEnabled: false,
      resourcesEnabled: true,
      anonymousReporting: true,
      proxyReporting: false,
    },
    welcomeMessage: null,
    announcementBanner: null,
    quickLinks: {
      reportIssue: true,
      checkStatus: true,
      askQuestion: false,
      browseResources: true,
    },
  };
}

/**
 * Clears the config cache for a specific tenant or all tenants.
 */
export function clearPortalConfigCache(tenantSlug?: string): void {
  if (tenantSlug) {
    configCache.delete(tenantSlug);
  } else {
    configCache.clear();
  }
}
