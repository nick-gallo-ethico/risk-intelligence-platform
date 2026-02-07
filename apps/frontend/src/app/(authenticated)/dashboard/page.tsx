'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { casesApi } from '@/lib/cases-api';
import {
  QuickActions,
  StatsCards,
  RecentCases,
  MyAssignments,
} from '@/components/dashboard';
import type { Case } from '@/types/case';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [isLoadingCases, setIsLoadingCases] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch cases for dashboard
  useEffect(() => {
    async function fetchCases() {
      if (!isAuthenticated) return;

      try {
        setIsLoadingCases(true);
        // Fetch recent cases (reduced limit for faster dashboard load)
        const response = await casesApi.list({
          limit: 25,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });
        setCases(response.data);
      } catch (error) {
        console.error('Failed to fetch cases:', error);
      } finally {
        setIsLoadingCases(false);
      }
    }

    fetchCases();
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {user.firstName}. Here&apos;s your compliance overview.
        </p>
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Stats Cards */}
      <StatsCards cases={cases} isLoading={isLoadingCases} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Cases - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RecentCases cases={cases} isLoading={isLoadingCases} />
        </div>

        {/* My Assignments - Takes 1 column */}
        <div>
          <MyAssignments
            cases={cases}
            currentUserId={user.id}
            isLoading={isLoadingCases}
          />
        </div>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle>Your Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Email</dt>
              <dd className="text-sm text-foreground">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Role</dt>
              <dd className="text-sm text-foreground">{user.role.replace(/_/g, ' ')}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">User ID</dt>
              <dd className="text-sm text-foreground font-mono text-xs">{user.id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Organization ID</dt>
              <dd className="text-sm text-foreground font-mono text-xs">
                {user.organizationId}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
