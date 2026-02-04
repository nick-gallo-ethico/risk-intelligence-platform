'use client';

/**
 * EmployeeDashboard Component
 *
 * Main dashboard view for the Employee Portal.
 *
 * Features:
 * - Welcome message with name
 * - Overview stats cards (pending, overdue, upcoming, compliance score)
 * - Role-aware tabs
 * - Tab content area
 */

import { AlertCircle, CheckSquare, Clock, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { DashboardTabs, type DashboardTab } from './dashboard-tabs';
import type { EmployeeProfile } from '@/hooks/useEmployeeProfile';
import { cn } from '@/lib/utils';

export interface TaskCounts {
  total: number;
  pending: number;
  overdue: number;
  completed: number;
  upcomingDue?: number;
}

export interface EmployeeDashboardProps {
  /** Employee profile data */
  profile: EmployeeProfile;
  /** Task counts for stats cards */
  taskCounts: TaskCounts;
  /** Currently active tab */
  activeTab: DashboardTab;
  /** Callback when tab changes */
  onTabChange: (tab: DashboardTab) => void;
  /** Team members who need attention (for managers) */
  teamNeedsAttentionCount?: number;
  /** Children to render in tab content area */
  children: React.ReactNode;
}

/**
 * Stats card configuration.
 */
interface StatCard {
  title: string;
  value: number | string;
  icon: typeof CheckSquare;
  variant: 'default' | 'warning' | 'success';
  description?: string;
}

/**
 * Get greeting based on time of day.
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * EmployeeDashboard - Main dashboard component.
 */
export function EmployeeDashboard({
  profile,
  taskCounts,
  activeTab,
  onTabChange,
  teamNeedsAttentionCount,
  children,
}: EmployeeDashboardProps) {
  // Build stats cards
  const statsCards: StatCard[] = [
    {
      title: 'Pending Tasks',
      value: taskCounts.pending,
      icon: CheckSquare,
      variant: 'default',
      description: 'Awaiting completion',
    },
    {
      title: 'Overdue',
      value: taskCounts.overdue,
      icon: AlertCircle,
      variant: taskCounts.overdue > 0 ? 'warning' : 'default',
      description: taskCounts.overdue > 0 ? 'Requires immediate attention' : 'All caught up',
    },
    {
      title: 'Due This Week',
      value: taskCounts.upcomingDue ?? 0,
      icon: Clock,
      variant: 'default',
      description: 'Next 7 days',
    },
    {
      title: 'Compliance Score',
      value: `${profile.complianceScore}%`,
      icon: Award,
      variant: profile.complianceScore >= 80 ? 'success' : 'default',
      description: profile.complianceScore >= 80 ? 'Great job!' : 'Complete tasks to improve',
    },
  ];

  return (
    <div className="container py-6 space-y-6 px-4">
      {/* Welcome message */}
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          {getGreeting()}, {profile.name.split(' ')[0]}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s your compliance overview and pending tasks.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card
            key={stat.title}
            className={cn(
              stat.variant === 'warning' && 'border-destructive/50 bg-destructive/5',
              stat.variant === 'success' && 'border-green-500/50 bg-green-500/5'
            )}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon
                className={cn(
                  'h-4 w-4',
                  stat.variant === 'warning' && 'text-destructive',
                  stat.variant === 'success' && 'text-green-500',
                  stat.variant === 'default' && 'text-muted-foreground'
                )}
              />
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'text-2xl font-bold',
                  stat.variant === 'warning' && 'text-destructive'
                )}
              >
                {stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
              {stat.title === 'Compliance Score' && (
                <Progress
                  value={profile.complianceScore}
                  className={cn(
                    'mt-2 h-1.5',
                    profile.complianceScore >= 80
                      ? '[&>div]:bg-green-500'
                      : profile.complianceScore >= 50
                      ? '[&>div]:bg-yellow-500'
                      : '[&>div]:bg-destructive'
                  )}
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <DashboardTabs
        isManager={profile.isManager}
        activeTab={activeTab}
        onTabChange={onTabChange}
        pendingTaskCount={taskCounts.pending}
        teamNeedsAttentionCount={teamNeedsAttentionCount}
      />

      {/* Tab content area */}
      <div className="mt-6">{children}</div>
    </div>
  );
}

export default EmployeeDashboard;
