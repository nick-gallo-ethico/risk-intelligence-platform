'use client';

/**
 * ProxyConfirmation Component
 *
 * Confirmation screen shown after a successful proxy report submission.
 *
 * Features:
 * - Success message with employee name
 * - Reference number display
 * - Clear notice that access code went to employee
 * - Manager does NOT see the access code (per CONTEXT.md)
 * - Actions: submit another, return to dashboard
 * - Audit acknowledgment
 */

import * as React from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  User,
  Mail,
  FileText,
  ArrowRight,
  Plus,
  Home,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ProxySubmissionResult } from '@/types/employee-portal.types';

interface ProxyConfirmationProps {
  /** Result from the proxy submission API */
  result: ProxySubmissionResult;
  /** Callback to submit another proxy report */
  onSubmitAnother?: () => void;
  /** Additional class name */
  className?: string;
}

/**
 * ProxyConfirmation - Success screen after proxy report submission.
 */
export function ProxyConfirmation({
  result,
  onSubmitAnother,
  className,
}: ProxyConfirmationProps) {
  return (
    <div className={cn('max-w-2xl mx-auto space-y-6', className)}>
      {/* Success header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-green-700 dark:text-green-400">
            Report Submitted Successfully
          </h1>
          <p className="text-muted-foreground mt-2">
            The report has been submitted on behalf of{' '}
            <strong>{result.employeeName}</strong>
          </p>
        </div>
      </div>

      {/* Reference number card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Reference Number
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-mono font-bold tracking-wider">
            {result.referenceNumber}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            This reference number can be used to track the report status.
          </p>
        </CardContent>
      </Card>

      {/* Access code notice - KEY INFORMATION */}
      <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
        <CardContent className="py-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Access Code Sent to Employee
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                The access code has been provided to <strong>{result.employeeName}</strong>{' '}
                at <strong>{result.employeeEmail}</strong> so they can check the status
                of their report and communicate with investigators.
              </p>
              <div className="mt-3 p-3 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg">
                <p className="text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <Shield className="h-4 w-4 flex-shrink-0" />
                  <span>
                    As the proxy submitter, you do not have access to the report&apos;s
                    access code. This ensures the employee maintains control over their
                    report and any follow-up communications.
                  </span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit acknowledgment */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground flex items-start gap-2">
            <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              This proxy submission has been logged for compliance purposes.
              Your identity as the proxy submitter has been recorded alongside
              the employee&apos;s report for audit trail requirements.
            </span>
          </p>
        </CardContent>
      </Card>

      {/* Submission time */}
      <div className="text-center text-sm text-muted-foreground">
        Submitted on {new Date(result.submittedAt).toLocaleString()}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        {onSubmitAnother && (
          <Button
            variant="outline"
            onClick={onSubmitAnother}
            className="flex-1"
          >
            <Plus className="h-4 w-4 mr-2" />
            Submit Another Proxy Report
          </Button>
        )}
        <Link href="/employee" className="flex-1">
          <Button className="w-full">
            <Home className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
