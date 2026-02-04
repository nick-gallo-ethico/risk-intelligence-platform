'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { casesApi } from '@/lib/cases-api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { CaseDetailHeader } from '@/components/cases/case-detail-header';
import { CasePropertiesPanel } from '@/components/cases/case-properties-panel';
import { CaseTabs } from '@/components/cases/case-tabs';
import { cn } from '@/lib/utils';
import type { Case } from '@/types/case';

/**
 * Case Detail Page
 *
 * Enhanced layout with:
 * - CaseDetailHeader: Comprehensive metadata display
 * - Left sidebar: Case properties (collapsible)
 * - Main content: Tabbed interface (Overview, Investigations, Messages, Files, Activity, Remediation)
 *
 * Route: /cases/[id]
 */
export default function CaseDetailPage() {
  return (
    <Suspense fallback={<CaseDetailPageSkeleton />}>
      <CaseDetailPageContent />
    </Suspense>
  );
}

function CaseDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const caseId = params.id as string;

  const fetchCase = useCallback(async () => {
    if (!caseId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await casesApi.getById(caseId);
      setCaseData(data);
    } catch (err) {
      console.error('Failed to fetch case:', err);
      // Check if it's a 404
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          setError('Case not found. It may have been deleted or you may not have access.');
        } else {
          setError('Failed to load case. Please try again.');
        }
      } else {
        setError('Failed to load case. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch case data when authenticated
  useEffect(() => {
    if (isAuthenticated && caseId) {
      fetchCase();
    }
  }, [isAuthenticated, caseId, fetchCase]);

  // Toggle sidebar
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => !prev);
  }, []);

  // Action handlers
  const handleAssign = useCallback(() => {
    // TODO: Open assign modal
    console.log('Assign clicked');
  }, []);

  const handleChangeStatus = useCallback(() => {
    // TODO: Open status change modal
    console.log('Change status clicked');
  }, []);

  const handleMerge = useCallback(() => {
    // TODO: Open merge modal
    console.log('Merge clicked');
  }, []);

  // Show loading while checking auth
  if (authLoading) {
    return <CaseDetailPageSkeleton />;
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Case Not Found
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push('/cases')}>
            Back to Cases
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <CaseDetailHeader
        caseData={caseData}
        isLoading={loading}
        onAssign={handleAssign}
        onChangeStatus={handleChangeStatus}
        onMerge={handleMerge}
      />

      {/* Main content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Properties */}
        <aside
          className={cn(
            'bg-white border-r overflow-y-auto transition-all duration-300 ease-in-out',
            'hidden lg:block',
            sidebarOpen ? 'lg:w-[300px]' : 'lg:w-0 lg:border-r-0'
          )}
        >
          {sidebarOpen && (
            <CasePropertiesPanel caseData={caseData} isLoading={loading} />
          )}
        </aside>

        {/* Sidebar toggle button */}
        <div className="hidden lg:flex items-start pt-4 -ml-3 z-10">
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-full bg-white border shadow-sm hover:bg-gray-50 transition-colors"
            aria-label={sidebarOpen ? 'Collapse properties' : 'Expand properties'}
          >
            <svg
              className={cn(
                'w-4 h-4 text-gray-500 transition-transform',
                !sidebarOpen && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        {/* Main content - Tabs */}
        <main className="flex-1 bg-white overflow-hidden">
          <CaseTabs
            caseData={caseData}
            isLoading={loading}
            counts={{
              investigations: 0, // TODO: Get from API
              messages: 0,
              unreadMessages: 0,
              files: 0,
            }}
            defaultTab="overview"
          />
        </main>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for the entire page
 */
function CaseDetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header skeleton */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-12" />
          <span className="text-gray-300">/</span>
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex">
        <aside className="hidden lg:block w-[300px] bg-white border-r p-4">
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </aside>
        <main className="flex-1 bg-white p-6">
          <div className="flex gap-4 mb-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-8 w-24" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </main>
      </div>
    </div>
  );
}
