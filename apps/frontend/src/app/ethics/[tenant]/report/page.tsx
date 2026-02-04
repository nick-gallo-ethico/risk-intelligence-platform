'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ReportForm, type SubmissionResult } from '@/components/ethics/report-form';
import { LanguageSwitcher } from '@/components/ethics/language-switcher';
import { useTenantCategories } from '@/hooks/useTenantCategories';
import { cn } from '@/lib/utils';

/**
 * Report submission page for the Ethics Portal.
 *
 * Features:
 * - Multi-step report form
 * - Category selection with category-specific fields
 * - Auto-save drafts
 * - Mobile-first design
 * - Tenant-branded (when branding is applied)
 *
 * Route: /ethics/[tenant]/report
 */
export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  // Fetch categories
  const {
    categories,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useTenantCategories(tenantSlug);

  // Store submission result for redirect
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handle successful submission.
   * Store result in sessionStorage and redirect to confirmation page.
   */
  const handleSubmit = (result: SubmissionResult) => {
    // Store in sessionStorage for confirmation page
    sessionStorage.setItem(
      `ethics-submission-${tenantSlug}`,
      JSON.stringify(result)
    );

    // Redirect to confirmation page
    router.push(`/ethics/${tenantSlug}/report/confirmation`);
  };

  // Loading state
  if (categoriesLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Submit a Report</h1>
            <LanguageSwitcher size="sm" />
          </div>
        </header>

        {/* Loading */}
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (categoriesError) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Submit a Report</h1>
            <LanguageSwitcher size="sm" />
          </div>
        </header>

        {/* Error */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-destructive mb-2">
              Unable to Load
            </h2>
            <p className="text-muted-foreground mb-4">
              We were unable to load the report form. Please try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="text-primary hover:underline"
            >
              Refresh page
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Submit a Report</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Your privacy is protected
            </p>
          </div>
          <LanguageSwitcher size="sm" />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <ReportForm
            tenantSlug={tenantSlug}
            categories={categories}
            onSubmit={handleSubmit}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card py-4 print:hidden">
        <div className="max-w-4xl mx-auto px-4 text-center text-xs text-muted-foreground">
          <p>
            This reporting system is provided by Ethico.
            Your submission is encrypted and secure.
          </p>
        </div>
      </footer>
    </div>
  );
}
