'use client';

/**
 * Employee Portal Dashboard Page
 *
 * Main landing page for the Employee Portal.
 * - Loads task counts and overview data
 * - Renders EmployeeDashboard with stats
 * - Handles tab navigation via URL query param
 */

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useEmployee } from '@/contexts/employee-context';
import { EmployeeDashboard, type TaskCounts } from '@/components/employee/employee-dashboard';
import type { DashboardTab } from '@/components/employee/dashboard-tabs';
import { MyTasksTab } from '@/components/employee/my-tasks-tab';
import { MyTeamTab } from '@/components/employee/my-team-tab';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Query keys for employee data.
 */
const employeeQueryKeys = {
  taskCounts: ['employee', 'tasks', 'counts'] as const,
  teamOverview: ['employee', 'team', 'overview'] as const,
};

/**
 * Team overview response for manager badge counts.
 */
interface TeamOverview {
  totalMembers: number;
  compliant: number;
  needsAttention: number;
}

/**
 * Loading skeleton for dashboard.
 */
function DashboardSkeleton() {
  return (
    <div className="container py-6 space-y-6 px-4">
      {/* Welcome message skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>

      {/* Tabs skeleton */}
      <Skeleton className="h-10 w-full max-w-md" />

      {/* Content skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    </div>
  );
}

/**
 * Placeholder component for History tab.
 */
function MyHistoryTab() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p>Your compliance history will appear here.</p>
      <p className="text-sm mt-2">View past reports, disclosures, and attestations.</p>
    </div>
  );
}

/**
 * Placeholder component for Policies tab.
 */
function PoliciesTab() {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <p>Company policies will appear here.</p>
      <p className="text-sm mt-2">Review and acknowledge organizational policies.</p>
    </div>
  );
}

/**
 * Dashboard content component (inside Suspense boundary).
 */
function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, isLoading: profileLoading } = useEmployee();

  // Get active tab from URL or default to 'tasks'
  const tabParam = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState<DashboardTab>(
    (tabParam as DashboardTab) || 'tasks'
  );

  // Sync tab state with URL
  useEffect(() => {
    const tab = searchParams?.get('tab') as DashboardTab | null;
    if (tab && ['tasks', 'team', 'history', 'policies'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  // Handle tab change
  const handleTabChange = (tab: DashboardTab) => {
    setActiveTab(tab);
    const url = tab === 'tasks' ? '/employee' : `/employee?tab=${tab}`;
    router.push(url, { scroll: false });
  };

  // Fetch task counts
  const { data: taskCounts, isLoading: taskCountsLoading } = useQuery({
    queryKey: employeeQueryKeys.taskCounts,
    queryFn: async () => {
      return apiClient.get<TaskCounts>('/employee/tasks/counts');
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Fetch team overview (for managers only)
  const { data: teamOverview } = useQuery({
    queryKey: employeeQueryKeys.teamOverview,
    queryFn: async () => {
      // Get team members and calculate needs attention count
      const team = await apiClient.get<Array<{
        id: string;
        pendingTasks?: number;
        overdueTasks?: number;
      }>>('/employee/team');

      const needsAttention = team.filter(
        (m) => (m.overdueTasks ?? 0) > 0 || (m.pendingTasks ?? 0) > 5
      ).length;

      return {
        totalMembers: team.length,
        compliant: team.length - needsAttention,
        needsAttention,
      } as TeamOverview;
    },
    enabled: profile?.isManager ?? false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Show skeleton while loading
  if (profileLoading || taskCountsLoading || !profile) {
    return <DashboardSkeleton />;
  }

  // Default task counts if not loaded
  const counts: TaskCounts = taskCounts ?? {
    total: 0,
    pending: profile.pendingTaskCount,
    overdue: profile.overdueTaskCount,
    completed: 0,
    upcomingDue: 0,
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'tasks':
        return <MyTasksTab />;
      case 'team':
        return profile.isManager ? <MyTeamTab /> : null;
      case 'history':
        return <MyHistoryTab />;
      case 'policies':
        return <PoliciesTab />;
      default:
        return <MyTasksTab />;
    }
  };

  return (
    <EmployeeDashboard
      profile={profile}
      taskCounts={counts}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      teamNeedsAttentionCount={teamOverview?.needsAttention}
    >
      {renderTabContent()}
    </EmployeeDashboard>
  );
}

/**
 * Employee Portal Dashboard Page.
 */
export default function EmployeeDashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
