'use client';

/**
 * Proxy Report Page
 *
 * Page for managers to submit reports on behalf of their team members.
 *
 * Route: /employee/proxy-report
 *
 * Features:
 * - Requires authentication
 * - Only managers can access (redirects non-managers)
 * - ProxyReportForm for multi-step submission
 * - ProxyConfirmation after successful submission
 * - Breadcrumb navigation
 */

import * as React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home, Users, AlertCircle } from 'lucide-react';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { ProxyReportForm } from '@/components/employee/proxy-report-form';
import { ProxyConfirmation } from '@/components/employee/proxy-confirmation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ProxySubmissionResult } from '@/types/employee-portal.types';

/**
 * Breadcrumb component for the proxy report page.
 */
function Breadcrumb() {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
      <Link
        href="/employee"
        className="flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
        <span>Dashboard</span>
      </Link>
      <ChevronRight className="h-4 w-4" />
      <span className="text-foreground font-medium">Submit Proxy Report</span>
    </nav>
  );
}

/**
 * Loading state skeleton.
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

/**
 * Not a manager state.
 */
function NotManagerState() {
  const router = useRouter();

  useEffect(() => {
    // Redirect after showing message briefly
    const timer = setTimeout(() => {
      router.push('/employee');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="py-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
        </div>
        <h2 className="text-lg font-semibold">Manager Access Required</h2>
        <p className="text-muted-foreground mt-2">
          Proxy reporting is only available for managers with direct or indirect reports.
        </p>
        <p className="text-sm text-muted-foreground mt-4">
          Redirecting to dashboard...
        </p>
        <Link href="/employee">
          <Button variant="outline" className="mt-4">
            Return to Dashboard
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * ProxyReportPage - Main page component.
 */
export default function ProxyReportPage() {
  const router = useRouter();
  const { isManager, isLoading } = useTeamMembers();
  const [submissionResult, setSubmissionResult] = useState<ProxySubmissionResult | null>(null);

  /**
   * Handle successful submission.
   */
  const handleSubmitSuccess = (result: ProxySubmissionResult) => {
    setSubmissionResult(result);
    // Scroll to top to show confirmation
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /**
   * Handle "submit another" action.
   */
  const handleSubmitAnother = () => {
    setSubmissionResult(null);
  };

  /**
   * Handle cancel action.
   */
  const handleCancel = () => {
    router.push('/employee');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <Breadcrumb />
        <LoadingSkeleton />
      </div>
    );
  }

  // Not a manager - show message and redirect
  if (!isManager) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <Breadcrumb />
        <NotManagerState />
      </div>
    );
  }

  // Show confirmation if submission was successful
  if (submissionResult) {
    return (
      <div className="p-4 md:p-6 lg:p-8">
        <Breadcrumb />
        <ProxyConfirmation
          result={submissionResult}
          onSubmitAnother={handleSubmitAnother}
        />
      </div>
    );
  }

  // Main form view
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <Breadcrumb />

      {/* Page header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Submit Proxy Report</h1>
        </div>
        <p className="text-muted-foreground">
          Submit a report on behalf of one of your team members. The access code
          will be provided to the employee so they can track the status of their report.
        </p>
      </div>

      {/* Form */}
      <Card>
        <CardContent className="py-6">
          <ProxyReportForm
            onSubmit={handleSubmitSuccess}
            onCancel={handleCancel}
          />
        </CardContent>
      </Card>

      {/* Info notice */}
      <p className="text-xs text-muted-foreground text-center mt-6">
        All proxy submissions are logged for compliance purposes.
        The employee will be notified and provided with access to track their report.
      </p>
    </div>
  );
}
