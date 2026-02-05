'use client';

import { Suspense, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PolicyEditor } from '@/components/policies/policy-editor';
import { policiesApi } from '@/services/policies';
import { useAuth } from '@/contexts/auth-context';
import type { UpdatePolicyDto } from '@/types/policy';

/**
 * Editor loading skeleton.
 */
function EditorSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
      <Skeleton className="h-[500px]" />
    </div>
  );
}

/**
 * Error state component.
 */
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="text-center py-12">
      <p className="text-red-600 mb-4">{message}</p>
      <Button onClick={onRetry} variant="outline">
        Retry
      </Button>
    </div>
  );
}

function EditPolicyContent() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const policyId = params.id as string;

  // Fetch policy
  const {
    data: policy,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['policy', policyId],
    queryFn: () => policiesApi.getById(policyId),
    enabled: !!policyId && isAuthenticated,
  });

  // Update policy mutation
  const updateMutation = useMutation({
    mutationFn: (dto: UpdatePolicyDto) => policiesApi.update(policyId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy', policyId] });
    },
  });

  // Submit for approval mutation
  const submitForApprovalMutation = useMutation({
    mutationFn: () => policiesApi.submitForApproval(policyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy', policyId] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: () =>
      policiesApi.publish(policyId, {
        summary: 'Initial publication',
        effectiveDate: new Date().toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policy', policyId] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
    },
  });

  const handleSave = useCallback(
    async (data: UpdatePolicyDto) => {
      await updateMutation.mutateAsync(data);
    },
    [updateMutation]
  );

  const handleSubmitForApproval = useCallback(() => {
    if (
      window.confirm(
        'Submit this policy for approval? This will start the approval workflow.'
      )
    ) {
      submitForApprovalMutation.mutate();
    }
  }, [submitForApprovalMutation]);

  const handlePublish = useCallback(() => {
    if (
      window.confirm(
        'Publish this policy? It will become active and visible to all employees.'
      )
    ) {
      publishMutation.mutate();
    }
  }, [publishMutation]);

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

  const isSubmitting =
    updateMutation.isPending ||
    submitForApprovalMutation.isPending ||
    publishMutation.isPending;

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
              <Button
                variant="ghost"
                size="sm"
                className="font-semibold"
                onClick={() => router.push('/policies')}
              >
                Policies
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/policies"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Policies
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isLoading ? (
              <Skeleton className="h-8 w-[300px]" />
            ) : (
              policy?.title || 'Edit Policy'
            )}
          </h1>
          {policy && (
            <p className="text-muted-foreground mt-1">
              Version {policy.currentVersion > 0 ? policy.currentVersion : 'Draft'}
              {policy.status && ` - ${policy.status.replace(/_/g, ' ')}`}
            </p>
          )}
        </div>

        {/* Editor Card */}
        <Card>
          <CardHeader>
            <CardTitle>Policy Editor</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <EditorSkeleton />
            ) : error ? (
              <ErrorState
                message="Failed to load policy. Please try again."
                onRetry={() => refetch()}
              />
            ) : policy ? (
              <PolicyEditor
                policy={policy}
                onSave={handleSave}
                onSubmitForApproval={
                  policy.status === 'DRAFT' ? handleSubmitForApproval : undefined
                }
                onPublish={
                  policy.status === 'APPROVED' ? handlePublish : undefined
                }
                isSubmitting={isSubmitting}
              />
            ) : null}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function EditPolicyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <EditPolicyContent />
    </Suspense>
  );
}
