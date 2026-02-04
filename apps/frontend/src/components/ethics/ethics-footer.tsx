'use client';

import Link from 'next/link';
import type { TenantBranding } from '@/types/branding';
import { cn } from '@/lib/utils';

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface EthicsFooterProps {
  /** Tenant branding configuration */
  branding: TenantBranding | null;
  /** Tenant slug for link generation */
  tenantSlug: string;
  /** Additional footer links from tenant config */
  additionalLinks?: FooterLink[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Default footer links shown for all tenants.
 */
const DEFAULT_FOOTER_LINKS: FooterLink[] = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms of Use', href: '/terms' },
  { label: 'Accessibility', href: '/accessibility' },
];

/**
 * EthicsFooter - Footer component for the Ethics Portal.
 *
 * Features:
 * - Customizable footer text from branding config
 * - Standard links (Privacy, Terms, Accessibility)
 * - Optional additional tenant-specific links
 * - Copyright notice with current year
 * - Subdued styling with muted colors
 * - Responsive layout (stacks on mobile)
 *
 * @example
 * ```tsx
 * <EthicsFooter
 *   branding={branding}
 *   tenantSlug="acme"
 *   additionalLinks={[
 *     { label: 'Help Center', href: 'https://help.acme.com', external: true }
 *   ]}
 * />
 * ```
 */
export function EthicsFooter({
  branding,
  tenantSlug,
  additionalLinks = [],
  className,
}: EthicsFooterProps) {
  const basePath = `/ethics/${tenantSlug}`;
  const currentYear = new Date().getFullYear();

  // Combine default links with any additional tenant-specific links
  const allLinks = [...DEFAULT_FOOTER_LINKS, ...additionalLinks];

  // Default footer text if not customized
  const footerText =
    branding?.footerText ||
    'Your report is confidential and protected.';

  return (
    <footer
      className={cn(
        'border-t bg-muted/30',
        className
      )}
      role="contentinfo"
    >
      <div className="container mx-auto max-w-7xl px-4 py-8">
        {/* Trust message */}
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground">{footerText}</p>
        </div>

        {/* Links and copyright */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Copyright */}
          <p className="text-xs text-muted-foreground order-2 md:order-1">
            &copy; {currentYear} All rights reserved. Powered by Ethico.
          </p>

          {/* Footer links */}
          <nav
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 order-1 md:order-2"
            aria-label="Footer navigation"
          >
            {allLinks.map((link) => {
              if (link.external) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                  </a>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={`${basePath}${link.href}`}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Ethico attribution - subtle, at the bottom */}
        <div className="mt-6 pt-4 border-t border-border/50 text-center">
          <a
            href="https://www.ethico.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            <span>Ethics & Compliance Platform by</span>
            <span className="font-medium">Ethico</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
