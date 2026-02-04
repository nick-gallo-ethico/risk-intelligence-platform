'use client';

import { Suspense } from 'react';
import { TenantThemeProvider } from '@/components/ethics/tenant-theme-provider';
import { EthicsHeader } from '@/components/ethics/ethics-header';
import { EthicsFooter } from '@/components/ethics/ethics-footer';
import { ThemeSkeleton } from '@/components/ethics/theme-skeleton';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { useEthicsPortalConfig } from '@/hooks/useEthicsPortalConfig';

interface EthicsLayoutProps {
  /** Child components (page content) */
  children: React.ReactNode;
  /** Route params containing tenant slug */
  params: {
    tenant: string;
  };
}

/**
 * EthicsLayout - Root layout for the Ethics Portal tenant routes.
 *
 * This layout:
 * 1. Wraps content with TenantThemeProvider for CSS custom properties
 * 2. Renders EthicsHeader with tenant branding
 * 3. Renders main content area
 * 4. Renders EthicsFooter with tenant customization
 *
 * Route: /ethics/[tenant]/*
 *
 * @example
 * // This layout is automatically used for all routes under /ethics/[tenant]/
 * // e.g., /ethics/acme/report, /ethics/acme/status, etc.
 */
export default function EthicsLayout({ children, params }: EthicsLayoutProps) {
  const tenantSlug = params.tenant;

  return (
    <TenantThemeProvider tenantSlug={tenantSlug}>
      <Suspense fallback={<ThemeSkeleton />}>
        <EthicsLayoutContent tenantSlug={tenantSlug}>
          {children}
        </EthicsLayoutContent>
      </Suspense>
    </TenantThemeProvider>
  );
}

/**
 * Inner layout content that uses hooks (must be inside TenantThemeProvider).
 */
function EthicsLayoutContent({
  children,
  tenantSlug,
}: {
  children: React.ReactNode;
  tenantSlug: string;
}) {
  const { branding } = useTenantBranding(tenantSlug);
  const { config } = useEthicsPortalConfig(tenantSlug);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <EthicsHeader
        branding={branding}
        tenantSlug={tenantSlug}
        features={{
          resourcesEnabled: config?.features.resourcesEnabled,
          chatbotEnabled: config?.features.chatbotEnabled,
        }}
      />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main">
        {children}
      </main>

      {/* Footer */}
      <EthicsFooter branding={branding} tenantSlug={tenantSlug} />
    </div>
  );
}
