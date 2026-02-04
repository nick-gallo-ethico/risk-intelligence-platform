'use client';

import { notFound } from 'next/navigation';
import { EthicsHome } from '@/components/ethics/ethics-home';
import { useTenantBranding } from '@/hooks/useTenantBranding';
import { useEthicsPortalConfig } from '@/hooks/useEthicsPortalConfig';
import { ThemeSkeleton } from '@/components/ethics/theme-skeleton';

interface EthicsHomePageProps {
  /** Route params containing tenant slug */
  params: {
    tenant: string;
  };
}

/**
 * EthicsHomePage - Home page for the Ethics Portal.
 *
 * Route: /ethics/[tenant]
 *
 * This page displays:
 * - Welcome section with optional video
 * - Quick actions (Report, Check Status, Ask Question, Resources)
 * - How it works steps
 * - Trust indicators
 *
 * The page adapts based on tenant configuration:
 * - Feature flags control which quick actions are shown
 * - Branding controls logo, colors, and welcome video
 * - Config controls welcome message and announcements
 *
 * @example
 * // Accessed at /ethics/acme-corp
 * // Shows ACME Corp's branded ethics portal home page
 */
export default function EthicsHomePage({ params }: EthicsHomePageProps) {
  const tenantSlug = params.tenant;
  const { branding, isLoading: brandingLoading } = useTenantBranding(tenantSlug);
  const { config, isLoading: configLoading, error: configError } = useEthicsPortalConfig(tenantSlug);

  // Show loading state while data is being fetched
  if (brandingLoading || configLoading) {
    return <ThemeSkeleton />;
  }

  // If we have a serious error and no config fallback, show 404
  // Note: useEthicsPortalConfig already provides a fallback, so this is rare
  if (configError && !config) {
    notFound();
  }

  return (
    <EthicsHome
      branding={branding}
      config={config}
      tenantSlug={tenantSlug}
    />
  );
}

/**
 * Generate metadata for the page.
 * This runs on the server, so we can't use hooks here.
 * For dynamic metadata based on tenant, use generateMetadata API with server-side fetch.
 */
// Note: For full SEO, implement generateMetadata with server-side API call
// export async function generateMetadata({ params }: EthicsHomePageProps): Promise<Metadata> {
//   const config = await fetchTenantConfig(params.tenant);
//   return {
//     title: `${config.organizationName} - Ethics Portal`,
//     description: 'Report concerns confidentially and securely.',
//   };
// }
