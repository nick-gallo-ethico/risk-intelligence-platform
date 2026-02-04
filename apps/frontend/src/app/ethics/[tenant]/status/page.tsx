'use client';

import * as React from 'react';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Search, Loader2, Clock, AlertTriangle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AccessCodeInput } from '@/components/ethics/access-code-input';
import { LanguageSwitcher } from '@/components/ethics/language-switcher';
import { useReportStatus } from '@/hooks/useReportStatus';
import Link from 'next/link';

interface StatusEntryPageProps {
  params: {
    tenant: string;
  };
}

/**
 * StatusEntryPage - Access code entry page for checking report status.
 *
 * Route: /ethics/[tenant]/status
 *
 * Features:
 * - AccessCodeInput component for entering access code
 * - "Check Status" button
 * - Rate limit warning display when locked
 * - Help text
 * - Link back to home page
 * - On valid code: redirect to /status/:code
 */
export default function StatusEntryPage({ params }: StatusEntryPageProps) {
  const tenantSlug = params.tenant;
  const router = useRouter();
  const { t } = useTranslation('status');

  const {
    checkStatus,
    isLoading,
    error,
    isLocked,
    lockoutRemaining,
  } = useReportStatus();

  const [enteredCode, setEnteredCode] = useState('');
  const [showError, setShowError] = useState(false);

  // Handle code completion from AccessCodeInput
  const handleCodeComplete = useCallback((code: string) => {
    setEnteredCode(code);
    setShowError(false);
  }, []);

  // Handle check status button
  const handleCheckStatus = useCallback(async () => {
    if (!enteredCode || isLoading || isLocked) {
      return;
    }

    const success = await checkStatus(enteredCode);
    if (success) {
      // Redirect to status detail page
      router.push(`/ethics/${tenantSlug}/status/${enteredCode}`);
    } else {
      setShowError(true);
    }
  }, [enteredCode, isLoading, isLocked, checkStatus, router, tenantSlug]);

  // Format lockout time
  const formatLockoutTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
    const minutes = Math.ceil(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Check Report Status</CardTitle>
          <CardDescription>
            Enter the access code you received when you submitted your report
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language Switcher */}
          <div className="flex justify-end -mt-2 mb-4">
            <LanguageSwitcher size="sm" />
          </div>

          {/* Rate Limit Warning */}
          {isLocked && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-300">
                  Too many attempts
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Please wait {formatLockoutTime(lockoutRemaining)} before trying again.
                </p>
              </div>
            </div>
          )}

          {/* Access Code Input */}
          <AccessCodeInput
            onComplete={handleCodeComplete}
            disabled={isLocked || isLoading}
            error={showError && error ? error : undefined}
          />

          {/* Check Status Button */}
          <Button
            onClick={handleCheckStatus}
            disabled={!enteredCode || isLoading || isLocked}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Search className="h-4 w-4 mr-2" />
                Check Status
              </>
            )}
          </Button>

          {/* Help Text */}
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>
              Your access code was provided when you submitted your report.
            </p>
            <p>
              If you&apos;ve lost your access code, we cannot retrieve it for security reasons.
            </p>
          </div>

          {/* Divider */}
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Back to Home */}
          <div className="flex flex-col gap-2">
            <Link href={`/ethics/${tenantSlug}`} className="w-full">
              <Button variant="outline" className="w-full">
                <Home className="h-4 w-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <Link href={`/ethics/${tenantSlug}/report`} className="w-full">
              <Button variant="ghost" className="w-full text-primary">
                Report a New Issue
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
