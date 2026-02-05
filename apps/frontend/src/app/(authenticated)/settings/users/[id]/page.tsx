'use client';

import { Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserForm } from '@/components/settings/user-form';
import { usersApi } from '@/services/users';
import { useAuth } from '@/contexts/auth-context';
import {
  ROLE_LABELS,
  ROLE_COLORS,
  STATUS_LABELS,
  STATUS_COLORS,
  type UserStatus,
  type UpdateUserInput,
} from '@/types/user';

/**
 * Derive user status from user properties
 */
function getUserStatus(user: { status?: UserStatus; isActive: boolean; lastLoginAt?: string | null }): UserStatus {
  if (user.status) return user.status;
  if (!user.isActive) return 'INACTIVE';
  if (!user.lastLoginAt) return 'PENDING_INVITE';
  return 'ACTIVE';
}

/**
 * Loading skeleton for user detail page
 */
function UserDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-5 w-64" />
      <div className="flex items-start gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
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
        Only System Administrators can access user management.
      </p>
      <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
    </div>
  );
}

/**
 * User detail page content
 */
function UserDetailContent() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user: currentUser, isAuthenticated, isLoading: authLoading } = useAuth();

  const isAdmin = currentUser?.role === 'SYSTEM_ADMIN';
  const isCurrentUser = currentUser?.id === id;

  // Fetch user
  const {
    data: user,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getById(id),
    enabled: !!id && isAuthenticated && isAdmin,
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateUserInput) => usersApi.update(id, data),
    onSuccess: () => {
      toast.success('User updated successfully');
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => {
      toast.error('Failed to update user');
    },
  });

  // Handle form submit
  const handleSubmit = async (data: UpdateUserInput) => {
    await updateMutation.mutateAsync(data);
  };

  // Loading state
  if (authLoading || isLoading) {
    return <UserDetailSkeleton />;
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

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-xl font-semibold mb-2">Failed to Load User</h2>
        <p className="text-muted-foreground mb-4">
          There was an error loading this user. Please try again.
        </p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  // Not found state
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <UserIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
        <p className="text-muted-foreground mb-4">
          The user you&apos;re looking for doesn&apos;t exist or has been deleted.
        </p>
        <Button asChild>
          <Link href="/settings/users">View All Users</Link>
        </Button>
      </div>
    );
  }

  const status = getUserStatus(user);

  return (
    <div className="space-y-6">
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
        <span className="text-foreground">
          {user.firstName} {user.lastName}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center text-2xl font-semibold">
            {user.firstName.charAt(0)}
            {user.lastName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">
                {user.firstName} {user.lastName}
              </h1>
              {isCurrentUser && (
                <Badge variant="outline" className="text-xs">
                  You
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">{user.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={ROLE_COLORS[user.role]}>
                {ROLE_LABELS[user.role]}
              </Badge>
              <Badge variant="outline" className={STATUS_COLORS[status]}>
                {STATUS_LABELS[status]}
              </Badge>
              {user.mfaEnabled && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  MFA Enabled
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Edit User</CardTitle>
            <CardDescription>
              Update user information and role assignment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UserForm
              user={user}
              onSubmit={handleSubmit}
              isSubmitting={updateMutation.isPending}
              isCurrentUser={isCurrentUser}
            />
          </CardContent>
        </Card>

        {/* User Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Created
                </p>
                <p>
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Last Login
                </p>
                <p>
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Never'}
                </p>
              </div>
              {user.ssoProvider && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    SSO Provider
                  </p>
                  <p className="capitalize">{user.ssoProvider}</p>
                </div>
              )}
              {user.department && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Department
                  </p>
                  <p>{user.department.name}</p>
                </div>
              )}
              {user.businessUnit && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Business Unit
                  </p>
                  <p>{user.businessUnit.name}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {status === 'PENDING_INVITE' && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    usersApi.resendInvite(user.id).then(() => {
                      toast.success(`Invitation sent to ${user.email}`);
                    });
                  }}
                >
                  Resend Invitation
                </Button>
              )}
              {user.mfaEnabled && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    usersApi.resetMfa(user.id).then(() => {
                      toast.success('MFA has been reset');
                      queryClient.invalidateQueries({ queryKey: ['user', id] });
                    });
                  }}
                >
                  Reset MFA
                </Button>
              )}
              {status === 'ACTIVE' && !isCurrentUser && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() => {
                    usersApi.deactivate(user.id).then(() => {
                      toast.success('User has been deactivated');
                      queryClient.invalidateQueries({ queryKey: ['user', id] });
                      queryClient.invalidateQueries({ queryKey: ['users'] });
                    });
                  }}
                >
                  Deactivate User
                </Button>
              )}
              {(status === 'INACTIVE' || status === 'SUSPENDED') && (
                <Button
                  variant="outline"
                  className="w-full justify-start text-green-600 hover:text-green-600"
                  onClick={() => {
                    usersApi.reactivate(user.id).then(() => {
                      toast.success('User has been reactivated');
                      queryClient.invalidateQueries({ queryKey: ['user', id] });
                      queryClient.invalidateQueries({ queryKey: ['users'] });
                    });
                  }}
                >
                  Reactivate User
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * User detail page with Suspense wrapper
 */
export default function UserDetailPage() {
  return (
    <Suspense fallback={<UserDetailSkeleton />}>
      <UserDetailContent />
    </Suspense>
  );
}
