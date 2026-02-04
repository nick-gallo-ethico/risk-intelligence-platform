'use client';

import { Shield, Lock, Eye, UserCheck } from 'lucide-react';
import { QuickActions } from './quick-actions';
import { Card, CardContent } from '@/components/ui/card';
import type { TenantBranding, EthicsPortalConfig } from '@/types/branding';
import { cn } from '@/lib/utils';

interface EthicsHomeProps {
  /** Tenant branding configuration */
  branding: TenantBranding | null;
  /** Tenant portal configuration */
  config: EthicsPortalConfig | null;
  /** Tenant slug for navigation */
  tenantSlug: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * How it works steps shown on the home page.
 */
const HOW_IT_WORKS_STEPS = [
  {
    number: 1,
    title: 'Submit Your Report',
    description:
      'Describe the concern using our secure form. You can remain anonymous or provide contact information.',
  },
  {
    number: 2,
    title: 'Receive Your Access Code',
    description:
      'After submitting, you\'ll receive a unique access code to check the status of your report anytime.',
  },
  {
    number: 3,
    title: 'Stay Connected',
    description:
      'Use your access code to check updates, respond to questions, and communicate with investigators.',
  },
];

/**
 * Trust indicators shown at the bottom of the home page.
 */
const TRUST_INDICATORS = [
  {
    icon: Shield,
    title: 'Secure',
    description: 'Bank-level encryption protects your data',
  },
  {
    icon: Lock,
    title: 'Confidential',
    description: 'Your identity is protected',
  },
  {
    icon: Eye,
    title: 'Anonymous Option',
    description: 'Report without identifying yourself',
  },
  {
    icon: UserCheck,
    title: 'No Retaliation',
    description: 'Protected by company policy',
  },
];

/**
 * EthicsHome - Home page content for the Ethics Portal.
 *
 * Sections:
 * 1. Welcome section with optional video and message
 * 2. Announcement banner (if configured)
 * 3. Quick actions grid
 * 4. How it works (3 steps)
 * 5. Trust indicators (security badges)
 *
 * @example
 * ```tsx
 * <EthicsHome
 *   branding={branding}
 *   config={config}
 *   tenantSlug="acme"
 * />
 * ```
 */
export function EthicsHome({
  branding,
  config,
  tenantSlug,
  className,
}: EthicsHomeProps) {
  const organizationName = config?.organizationName || 'your organization';
  const welcomeMessage =
    config?.welcomeMessage ||
    `Welcome to ${organizationName}'s Ethics Portal. We're committed to maintaining the highest standards of ethics and compliance. This portal provides a safe, confidential way to report concerns.`;

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Announcement Banner */}
      {config?.announcementBanner && (
        <div className="bg-primary/10 border-b border-primary/20 py-3 px-4">
          <p className="text-center text-sm text-primary font-medium">
            {config.announcementBanner}
          </p>
        </div>
      )}

      {/* Welcome Section */}
      <section className="bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Welcome Video (if configured) */}
          {branding?.welcomeVideoUrl && (
            <div className="mb-8 aspect-video max-w-2xl mx-auto rounded-lg overflow-hidden shadow-lg">
              <iframe
                src={branding.welcomeVideoUrl}
                title="Welcome video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Speak Up. We&apos;re Listening.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {welcomeMessage}
          </p>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="bg-muted/30 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-8">
            How Can We Help?
          </h2>
          <QuickActions
            tenantSlug={tenantSlug}
            features={{
              chatbotEnabled: config?.features.chatbotEnabled,
              resourcesEnabled: config?.features.resourcesEnabled,
            }}
            quickLinks={config?.quickLinks}
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-background py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-8">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <div key={step.number} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="bg-muted/30 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-center mb-8">
            Your Privacy is Protected
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {TRUST_INDICATORS.map((indicator) => (
              <Card key={indicator.title} className="text-center">
                <CardContent className="pt-6">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <indicator.icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="font-medium text-sm mb-1">{indicator.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {indicator.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
