'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { LanguageSwitcher } from './language-switcher';
import { EthicsNav } from './ethics-nav';
import type { TenantBranding } from '@/types/branding';
import { cn } from '@/lib/utils';

interface EthicsHeaderProps {
  /** Tenant branding configuration */
  branding: TenantBranding | null;
  /** Tenant slug for navigation */
  tenantSlug: string;
  /** Feature flags for conditional navigation */
  features?: {
    resourcesEnabled?: boolean;
    chatbotEnabled?: boolean;
  };
  /** Additional CSS classes */
  className?: string;
}

/**
 * EthicsHeader - Header component for the Ethics Portal.
 *
 * Features:
 * - Tenant logo on the left (or fallback text)
 * - Desktop navigation in center
 * - Language switcher on the right
 * - Mobile: hamburger menu with slide-out sheet
 * - Skip to content link for accessibility
 * - Fixed positioning for consistent navigation
 *
 * @example
 * ```tsx
 * <EthicsHeader
 *   branding={branding}
 *   tenantSlug="acme"
 *   features={{ resourcesEnabled: true }}
 * />
 * ```
 */
export function EthicsHeader({
  branding,
  tenantSlug,
  features = {},
  className,
}: EthicsHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const basePath = `/ethics/${tenantSlug}`;

  return (
    <>
      {/* Skip to content link - only visible on focus */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md"
      >
        Skip to main content
      </a>

      <header
        className={cn(
          'sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
          className
        )}
        role="banner"
      >
        <div className="container flex h-16 items-center justify-between px-4 mx-auto max-w-7xl">
          {/* Logo / Brand */}
          <Link
            href={basePath}
            className="flex items-center space-x-2"
            aria-label="Go to home page"
          >
            {branding?.logoUrl ? (
              <Image
                src={branding.logoUrl}
                alt=""
                width={140}
                height={40}
                className="h-10 w-auto object-contain"
                priority
              />
            ) : (
              <span className="text-xl font-bold text-primary">
                Ethics Portal
              </span>
            )}
          </Link>

          {/* Desktop Navigation - hidden on mobile */}
          <div className="hidden md:flex md:items-center md:justify-center md:flex-1 md:px-8">
            <EthicsNav
              tenantSlug={tenantSlug}
              features={features}
            />
          </div>

          {/* Right side: Language Switcher + Mobile Menu */}
          <div className="flex items-center gap-2">
            <LanguageSwitcher size="sm" />

            {/* Mobile Menu Trigger - only shown on mobile */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader className="border-b pb-4 mb-4">
                  <SheetTitle className="text-left">
                    {branding?.logoUrl ? (
                      <Image
                        src={branding.logoUrl}
                        alt=""
                        width={120}
                        height={32}
                        className="h-8 w-auto object-contain"
                      />
                    ) : (
                      <span className="text-lg font-bold text-primary">
                        Ethics Portal
                      </span>
                    )}
                  </SheetTitle>
                </SheetHeader>
                <EthicsNav
                  tenantSlug={tenantSlug}
                  features={features}
                  isMobile
                  onNavClick={() => setMobileMenuOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  );
}
