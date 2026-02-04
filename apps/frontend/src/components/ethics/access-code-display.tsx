'use client';

import * as React from 'react';
import { Copy, Mail, Printer, Download, Check, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AccessCodeDisplayProps {
  /** The access code to display */
  accessCode: string;
  /** The reference number (e.g., RPT-12345) */
  referenceNumber: string;
  /** Tenant slug for the status check URL */
  tenantSlug: string;
  /** Additional class name */
  className?: string;
}

/**
 * Format access code with dashes for readability.
 * Converts "ABCD1234EFGH" to "ABCD-1234-EFGH"
 */
function formatAccessCode(code: string): string {
  // Split into groups of 4
  const groups = code.match(/.{1,4}/g) || [];
  return groups.join('-');
}

/**
 * Access code display component for confirmation page.
 *
 * Features:
 * - Large, prominent display of segmented code
 * - Copy to clipboard
 * - Email to self option
 * - Print button
 * - Download as PDF (placeholder)
 * - Warning message about saving
 *
 * @example
 * ```tsx
 * <AccessCodeDisplay
 *   accessCode="ABCD1234EFGH"
 *   referenceNumber="RPT-12345"
 *   tenantSlug="acme-corp"
 * />
 * ```
 */
export function AccessCodeDisplay({
  accessCode,
  referenceNumber,
  tenantSlug,
  className,
}: AccessCodeDisplayProps) {
  const [copied, setCopied] = React.useState(false);
  const [showEmailForm, setShowEmailForm] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [emailSent, setEmailSent] = React.useState(false);
  const [emailSending, setEmailSending] = React.useState(false);
  const [emailError, setEmailError] = React.useState<string | null>(null);

  const formattedCode = formatAccessCode(accessCode);
  const statusUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/ethics/${tenantSlug}/status`;

  /**
   * Copy access code to clipboard.
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = accessCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * Send access code to email.
   */
  const handleSendEmail = async () => {
    if (!email || !email.includes('@')) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailSending(true);
    setEmailError(null);

    try {
      const response = await fetch(`/api/v1/public/ethics/${tenantSlug}/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          accessCode,
          referenceNumber,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      setEmailSent(true);
      setShowEmailForm(false);
    } catch (err) {
      setEmailError('Failed to send email. Please copy the code instead.');
    } finally {
      setEmailSending(false);
    }
  };

  /**
   * Open print dialog.
   */
  const handlePrint = () => {
    window.print();
  };

  /**
   * Download as PDF (creates a simple text file for now).
   */
  const handleDownload = () => {
    const content = `
REPORT CONFIRMATION
==================

Reference Number: ${referenceNumber}
Access Code: ${formattedCode}

IMPORTANT: Save this information! You will need your access code to check the status of your report.

Check Status: ${statusUrl}

Enter your reference number and access code to view updates, communicate with investigators, and receive responses to your report.

This document was generated on ${new Date().toLocaleString()}.
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-confirmation-${referenceNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Warning banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-200">
            Save this code now!
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            You will need this access code to check the status of your report and communicate with investigators.
            This code will not be shown again.
          </p>
        </div>
      </div>

      {/* Reference number */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Reference Number</p>
        <p className="text-xl font-semibold">{referenceNumber}</p>
      </div>

      {/* Access code display */}
      <div className="text-center py-6 px-4 bg-muted/50 rounded-xl border-2 border-dashed border-muted-foreground/25">
        <p className="text-sm text-muted-foreground mb-2">Your Access Code</p>
        <p
          className="text-3xl sm:text-4xl font-mono font-bold tracking-wider select-all"
          aria-label={`Access code: ${formattedCode.split('').join(' ')}`}
        >
          {formattedCode}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 justify-center print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="gap-2"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Code
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowEmailForm(!showEmailForm)}
          className="gap-2"
        >
          <Mail className="w-4 h-4" />
          {emailSent ? 'Email Sent' : 'Email to Me'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handlePrint}
          className="gap-2"
        >
          <Printer className="w-4 h-4" />
          Print
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Download
        </Button>
      </div>

      {/* Email form */}
      {showEmailForm && !emailSent && (
        <div className="space-y-3 p-4 bg-muted/30 rounded-lg print:hidden">
          <Label htmlFor="backup-email">Send a backup to your email</Label>
          <div className="flex gap-2">
            <Input
              id="backup-email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleSendEmail}
              disabled={emailSending || !email}
            >
              {emailSending ? 'Sending...' : 'Send'}
            </Button>
          </div>
          {emailError && (
            <p className="text-sm text-destructive">{emailError}</p>
          )}
          <p className="text-xs text-muted-foreground">
            We&apos;ll send a secure, one-time link to recover your access code.
          </p>
        </div>
      )}

      {/* Email success */}
      {emailSent && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 text-sm print:hidden">
          <Check className="w-4 h-4" />
          <span>Backup email sent! Check your inbox.</span>
        </div>
      )}

      {/* Status check info */}
      <div className="text-center text-sm text-muted-foreground">
        <p>
          Check your report status at:{' '}
          <span className="font-medium text-foreground">{statusUrl}</span>
        </p>
      </div>
    </div>
  );
}
