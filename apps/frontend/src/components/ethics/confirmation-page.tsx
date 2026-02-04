'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle, ArrowRight, FileText, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { AccessCodeDisplay } from './access-code-display';

/**
 * Submission result from API.
 */
export interface SubmissionResult {
  /** Reference number like RPT-12345 */
  referenceNumber: string;
  /** Access PIN for status checks */
  accessCode: string;
  /** Confirmation number (optional, may be same as reference) */
  confirmationNumber?: string;
}

interface ConfirmationPageProps {
  /** Submission result from API */
  submissionResult: SubmissionResult;
  /** Tenant slug for navigation */
  tenantSlug: string;
  /** Additional class name */
  className?: string;
}

/**
 * Confirmation page displayed after successful report submission.
 *
 * Features:
 * - Success animation/checkmark
 * - Prominent access code display
 * - Multiple save options (copy, email, print, download)
 * - "What happens next" explanation
 * - Acknowledgment checkbox before done button
 *
 * Per CONTEXT.md: "full page (not modal)"
 *
 * @example
 * ```tsx
 * <ConfirmationPage
 *   submissionResult={{
 *     referenceNumber: 'RPT-12345',
 *     accessCode: 'ABCD1234EFGH',
 *   }}
 *   tenantSlug="acme-corp"
 * />
 * ```
 */
export function ConfirmationPage({
  submissionResult,
  tenantSlug,
  className,
}: ConfirmationPageProps) {
  const [hasAcknowledged, setHasAcknowledged] = React.useState(false);

  return (
    <div className={cn('max-w-2xl mx-auto px-4 py-8', className)}>
      {/* Success header */}
      <div className="text-center mb-8">
        {/* Animated checkmark */}
        <div className="relative inline-flex items-center justify-center mb-4">
          <div className="absolute inset-0 w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 animate-ping opacity-25" />
          <div className="relative w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          Your Report Has Been Submitted
        </h1>
        <p className="text-muted-foreground">
          Thank you for speaking up. Your report has been received and will be reviewed.
        </p>
      </div>

      {/* Access code display */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <AccessCodeDisplay
            accessCode={submissionResult.accessCode}
            referenceNumber={submissionResult.referenceNumber}
            tenantSlug={tenantSlug}
          />
        </CardContent>
      </Card>

      {/* What happens next */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            What Happens Next
          </h2>

          <ol className="space-y-4">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center">
                1
              </span>
              <div>
                <p className="font-medium">Report Received</p>
                <p className="text-sm text-muted-foreground">
                  Your report has been securely received and logged in our system.
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-medium flex items-center justify-center">
                2
              </span>
              <div>
                <p className="font-medium">Initial Review</p>
                <p className="text-sm text-muted-foreground">
                  A member of the compliance team will review your report and determine next steps.
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-medium flex items-center justify-center">
                3
              </span>
              <div>
                <p className="font-medium">Investigation (if needed)</p>
                <p className="text-sm text-muted-foreground">
                  If your report requires investigation, it will be assigned to an appropriate investigator.
                </p>
              </div>
            </li>

            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-muted-foreground text-sm font-medium flex items-center justify-center">
                4
              </span>
              <div>
                <p className="font-medium">Updates & Communication</p>
                <p className="text-sm text-muted-foreground">
                  Check your report status using your access code. You may receive questions or updates from investigators.
                </p>
              </div>
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* Acknowledgment */}
      <Card className="mb-6 border-primary/50 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Checkbox
              id="acknowledged"
              checked={hasAcknowledged}
              onCheckedChange={(checked) => setHasAcknowledged(checked === true)}
              className="mt-1"
            />
            <Label
              htmlFor="acknowledged"
              className="cursor-pointer leading-relaxed"
            >
              I have saved my access code and understand that I will need it to check the status of my report.
              I know this code will not be shown again.
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          asChild
          size="lg"
          disabled={!hasAcknowledged}
          className="flex-1"
        >
          <Link href={`/ethics/${tenantSlug}`}>
            Done
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>

        <Button
          asChild
          variant="outline"
          size="lg"
          className="flex-1"
        >
          <Link href={`/ethics/${tenantSlug}/status`}>
            Check Status
            <ExternalLink className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>

      {/* Submit another */}
      <p className="text-center mt-6 text-sm text-muted-foreground">
        Need to submit another report?{' '}
        <Link
          href={`/ethics/${tenantSlug}/report`}
          className="text-primary hover:underline"
        >
          Start a new report
        </Link>
      </p>
    </div>
  );
}
