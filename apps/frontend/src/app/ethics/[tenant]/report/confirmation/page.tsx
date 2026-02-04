'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  ConfirmationPage,
  type SubmissionResult,
} from '@/components/ethics/confirmation-page';
import { LanguageSwitcher } from '@/components/ethics/language-switcher';

/**
 * Confirmation page route for successful report submission.
 *
 * Features:
 * - Displays access code prominently
 * - Multiple save options (copy, email, print, download)
 * - "What happens next" explanation
 * - Acknowledgment requirement before done
 *
 * Route: /ethics/[tenant]/report/confirmation
 *
 * This page reads the submission result from sessionStorage.
 * If no result is found, redirects back to the report page.
 */
export default function ConfirmationPageRoute() {
  const params = useParams();
  const router = useRouter();
  const tenantSlug = params.tenant as string;

  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Try to get submission result from sessionStorage
    const storedResult = sessionStorage.getItem(`ethics-submission-${tenantSlug}`);

    if (storedResult) {
      try {
        const parsed = JSON.parse(storedResult);
        setSubmissionResult(parsed);
      } catch {
        // Invalid JSON, redirect
        router.replace(`/ethics/${tenantSlug}/report`);
        return;
      }
    } else {
      // No stored result, redirect to report page
      router.replace(`/ethics/${tenantSlug}/report`);
      return;
    }

    setIsLoading(false);

    // Clear from sessionStorage after reading (one-time use)
    // We keep it for now in case user refreshes, but clear on navigation away
    return () => {
      // Optional: Clear on unmount
      // sessionStorage.removeItem(`ethics-submission-${tenantSlug}`);
    };
  }, [tenantSlug, router]);

  // Loading state
  if (isLoading || !submissionResult) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <header className="border-b bg-card">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            <h1 className="text-lg font-semibold">Report Submitted</h1>
            <LanguageSwitcher size="sm" />
          </div>
        </header>

        {/* Loading */}
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Loading confirmation...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Report Submitted</h1>
          <LanguageSwitcher size="sm" />
        </div>
      </header>

      {/* Print header */}
      <div className="hidden print:block p-8 text-center border-b">
        <h1 className="text-2xl font-bold">Report Confirmation</h1>
        <p className="text-muted-foreground">
          Keep this document for your records
        </p>
      </div>

      {/* Main content */}
      <main className="flex-1">
        <ConfirmationPage
          submissionResult={submissionResult}
          tenantSlug={tenantSlug}
        />
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

      {/* Print footer */}
      <div className="hidden print:block p-8 text-center text-xs text-muted-foreground border-t">
        <p>
          Printed on {new Date().toLocaleDateString()} |
          Ethico Ethics Reporting System
        </p>
      </div>
    </div>
  );
}
