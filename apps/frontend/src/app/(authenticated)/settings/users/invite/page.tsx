'use client';

import { useState, Suspense } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { InviteUserForm } from '@/components/settings/invite-user-form';
import { RolePermissionsTable } from '@/components/settings/role-permissions-table';
import { usersApi } from '@/services/users';
import { useAuth } from '@/contexts/auth-context';
import type { InviteUserDto } from '@/types/user';

/**
 * Loading skeleton for invite page
 */
function InvitePageSkeleton() {
  return (
    <div className="max-w-2xl space-y-6">
      <Skeleton className="h-5 w-48" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="border rounded-lg p-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

/**
 * Access denied component
 */
function AccessDenied() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
      <p className="text-muted-foreground mb-4">
        Only System Administrators can invite users.
      </p>
      <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
    </div>
  );
}

/**
 * Invite user page content
 */
function InvitePageContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();

  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  const isAdmin = currentUser?.role === 'SYSTEM_ADMIN';

  // Invite mutation
  const inviteMutation = useMutation({
    mutationFn: (data: InviteUserDto) => usersApi.invite(data),
    onSuccess: (_, variables) => {
      toast.success('Invitation sent!', {
        description: `An invitation email has been sent to ${variables.email}`,
      });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      router.push('/settings/users');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      const message =
        error.response?.data?.message ||
        error.message ||
        'Failed to send invitation';
      toast.error('Failed to send invitation', {
        description: message,
      });
    },
  });

  // Handle form submit
  const handleSubmit = async (data: InviteUserDto) => {
    await inviteMutation.mutateAsync(data);
  };

  // Loading state
  if (authLoading) {
    return <InvitePageSkeleton />;
  }

  // Auth check
  if (!isAuthenticated) {
    router.push('/login');
    return null;
  }

  // Admin check
  if (!isAdmin) {
    return <AccessDenied />;
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link
          href="/settings/users"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Users
        </Link>
        <span>/</span>
        <span className="text-foreground">Invite User</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">Invite User</h1>
        <p className="text-muted-foreground">
          Send an invitation email to add a new user to your organization
        </p>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle>User Details</CardTitle>
          <CardDescription>
            Enter the information for the new user. They will receive an email
            with instructions to activate their account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteUserForm
            onSubmit={handleSubmit}
            isSubmitting={inviteMutation.isPending}
            onCancel={() => router.push('/settings/users')}
          />
        </CardContent>
      </Card>

      {/* Role Permissions Reference */}
      <Collapsible open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="flex w-full justify-between p-4 h-auto"
          >
            <span className="text-sm text-muted-foreground">
              View role permissions reference
            </span>
            {isPermissionsOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-2">
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>
                Each role has different access levels to platform features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RolePermissionsTable />
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * Invite user page with Suspense wrapper
 */
export default function InviteUserPage() {
  return (
    <Suspense fallback={<InvitePageSkeleton />}>
      <InvitePageContent />
    </Suspense>
  );
}
