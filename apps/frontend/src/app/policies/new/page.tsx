'use client';

import { Suspense, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PolicyEditor } from '@/components/policies/policy-editor';
import { policiesApi } from '@/services/policies';
import { useAuth } from '@/contexts/auth-context';
import type { CreatePolicyDto, UpdatePolicyDto, Policy } from '@/types/policy';

function NewPolicyContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [createdPolicy, setCreatedPolicy] = useState<Policy | null>(null);

  // Create policy mutation
  const createMutation = useMutation({
    mutationFn: (dto: CreatePolicyDto) => policiesApi.create(dto),
    onSuccess: (policy) => {
      setCreatedPolicy(policy);
      // Navigate to edit page after creation
      router.replace(`/policies/${policy.id}/edit`);
    },
  });

  // Update policy mutation (for autosave after initial creation)
  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdatePolicyDto }) =>
      policiesApi.update(id, dto),
  });

  const handleSave = useCallback(
    async (data: UpdatePolicyDto) => {
      if (createdPolicy) {
        // Policy already created, update it
        await updateMutation.mutateAsync({
          id: createdPolicy.id,
          dto: data,
        });
      } else {
        // First save - create the policy
        const createDto: CreatePolicyDto = {
          title: data.title || 'Untitled Policy',
          policyType: data.policyType || 'OTHER',
          category: data.category,
          content: data.content,
          effectiveDate: data.effectiveDate,
          reviewDate: data.reviewDate,
        };
        await createMutation.mutateAsync(createDto);
      }
    },
    [createdPolicy, createMutation, updateMutation]
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
          <h1 className="text-2xl font-bold text-gray-900">Create New Policy</h1>
          <p className="text-muted-foreground mt-1">
            Create a new policy document with rich text content
          </p>
        </div>

        {/* Editor Card */}
        <Card>
          <CardHeader>
            <CardTitle>Policy Details</CardTitle>
          </CardHeader>
          <CardContent>
            <PolicyEditor
              onSave={handleSave}
              isSubmitting={createMutation.isPending || updateMutation.isPending}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function NewPolicyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <NewPolicyContent />
    </Suspense>
  );
}
