'use client';

import { Suspense, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PolicyList } from '@/components/policies/policy-list';
import { PolicyFilters } from '@/components/policies/policy-filters';
import { policiesApi } from '@/services/policies';
import { useAuth } from '@/contexts/auth-context';
import type { PolicyFilters as Filters, Policy } from '@/types/policy';

/**
 * Policy list skeleton for loading state.
 */
function PolicyListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <Skeleton className="h-5 w-[300px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[60px]" />
          <Skeleton className="h-5 w-[120px]" />
          <Skeleton className="h-5 w-[80px]" />
        </div>
      ))}
    </div>
  );
}

/**
 * Error state with retry button.
 */
function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-red-600 mb-4">Failed to load policies. Please try again.</p>
      <Button onClick={onRetry} variant="outline">
        Retry
      </Button>
    </div>
  );
}

function PoliciesContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [filters, setFilters] = useState<Filters>({});
  const [page, setPage] = useState(1);

  // Fetch policies
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['policies', filters, page],
    queryFn: () => policiesApi.list(filters, page, 20),
    enabled: isAuthenticated,
  });

  // Submit for approval mutation
  const submitForApprovalMutation = useMutation({
    mutationFn: (policy: Policy) => policiesApi.submitForApproval(policy.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });

  // Retire mutation
  const retireMutation = useMutation({
    mutationFn: (policy: Policy) => policiesApi.retire(policy.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });

  const handleFiltersChange = useCallback((newFilters: Filters) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  const handleSubmitForApproval = useCallback(
    (policy: Policy) => {
      if (
        window.confirm(
          `Submit "${policy.title}" for approval? This will start the approval workflow.`
        )
      ) {
        submitForApprovalMutation.mutate(policy);
      }
    },
    [submitForApprovalMutation]
  );

  const handleRetire = useCallback(
    (policy: Policy) => {
      if (
        window.confirm(
          `Retire "${policy.title}"? This will mark the policy as no longer active.`
        )
      ) {
        retireMutation.mutate(policy);
      }
    },
    [retireMutation]
  );

  // Redirect to login if not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="font-semibold text-gray-900">
                Risk Intelligence Platform
              </span>
            </div>
            <nav className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                Dashboard
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/cases')}
              >
                Cases
              </Button>
              <Button variant="ghost" size="sm" className="font-semibold">
                Policies
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Policies</h1>
            <p className="text-muted-foreground mt-1">
              Manage your organization&apos;s policies
            </p>
          </div>
          <Button asChild>
            <Link href="/policies/new">
              <Plus className="mr-2 h-4 w-4" />
              New Policy
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <PolicyFilters filters={filters} onChange={handleFiltersChange} />
          </CardContent>
        </Card>

        {/* Policies Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>All Policies</span>
              {data && (
                <span className="text-sm font-normal text-muted-foreground">
                  {data.total} total
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <PolicyListSkeleton />
            ) : error ? (
              <ErrorState onRetry={() => refetch()} />
            ) : (
              <PolicyList
                policies={data?.data || []}
                total={data?.total || 0}
                page={page}
                onPageChange={setPage}
                onSubmitForApproval={handleSubmitForApproval}
                onRetire={handleRetire}
              />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function PoliciesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <PoliciesContent />
    </Suspense>
  );
}
