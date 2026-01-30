'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Case } from '@/types/case';

interface DashboardStats {
  totalThisMonth: number;
  openCases: number;
  newCases: number;
  avgResolutionDays: number | null;
}

interface StatsCardsProps {
  cases: Case[];
  isLoading: boolean;
}

/**
 * Calculate dashboard statistics from case data.
 */
function calculateStats(cases: Case[]): DashboardStats {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMonthCases = cases.filter(
    (c) => new Date(c.createdAt) >= startOfMonth
  );

  const openCases = cases.filter((c) => c.status === 'OPEN');
  const newCases = cases.filter((c) => c.status === 'NEW');

  // Calculate average resolution time for closed cases this month
  const closedThisMonth = cases.filter(
    (c) =>
      c.status === 'CLOSED' &&
      new Date(c.updatedAt) >= startOfMonth
  );

  let avgResolutionDays: number | null = null;
  if (closedThisMonth.length > 0) {
    const totalDays = closedThisMonth.reduce((sum, c) => {
      const created = new Date(c.createdAt).getTime();
      const closed = new Date(c.updatedAt).getTime();
      return sum + (closed - created) / (1000 * 60 * 60 * 24);
    }, 0);
    avgResolutionDays = Math.round(totalDays / closedThisMonth.length);
  }

  return {
    totalThisMonth: thisMonthCases.length,
    openCases: openCases.length,
    newCases: newCases.length,
    avgResolutionDays,
  };
}

/**
 * Stats cards row for the dashboard.
 * Displays key metrics: total cases this month, open, in progress, and avg resolution time.
 */
export function StatsCards({ cases, isLoading }: StatsCardsProps) {
  const router = useRouter();
  const stats = calculateStats(cases);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Cases This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.totalThisMonth}</div>
          <p className="text-xs text-gray-500 mt-1">Total new cases</p>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => router.push('/cases?status=OPEN')}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Open Cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-yellow-600">
            {stats.openCases}
          </div>
          <p className="text-xs text-gray-500 mt-1">Currently active</p>
        </CardContent>
      </Card>

      <Card
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => router.push('/cases?status=NEW')}
      >
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            New (Unassigned)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-600">
            {stats.newCases}
          </div>
          <p className="text-xs text-gray-500 mt-1">Awaiting triage</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-500">
            Avg Resolution Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">
            {stats.avgResolutionDays !== null ? `${stats.avgResolutionDays}d` : '—'}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {stats.avgResolutionDays !== null ? 'Days to close' : 'No data yet'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
