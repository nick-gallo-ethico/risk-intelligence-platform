'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
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
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
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
        // Fetch recent cases (larger limit to have enough data for stats)
        const response = await casesApi.list({
          limit: 100,
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

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/cases')}
              >
                Cases
              </Button>
              {user.role === 'SYSTEM_ADMIN' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/settings/users')}
                >
                  Settings
                </Button>
              )}
              <span className="text-sm text-gray-600">
                {user.firstName} {user.lastName}
              </span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {user.firstName}. Here&apos;s your compliance overview.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="mb-6">
          <QuickActions />
        </div>

        {/* Stats Cards */}
        <div className="mb-8">
          <StatsCards cases={cases} isLoading={isLoadingCases} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="text-sm text-gray-900">{user.role.replace(/_/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">User ID</dt>
                <dd className="text-sm text-gray-900 font-mono text-xs">{user.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Organization ID</dt>
                <dd className="text-sm text-gray-900 font-mono text-xs">
                  {user.organizationId}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
