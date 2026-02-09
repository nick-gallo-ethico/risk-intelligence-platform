'use client';

/**
 * Dashboard Detail Page
 *
 * Displays a single dashboard with its widgets.
 * Route: /analytics/dashboards/[id]
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  MoreHorizontal,
  Settings,
  Star,
  Share2,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/auth-context';
import { useDashboard, useToggleDashboardFavorite } from '@/hooks/use-dashboards';
import { cn } from '@/lib/utils';

type DateRange = 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'LAST_90_DAYS' | 'YEAR_TO_DATE';

export default function DashboardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [dateRange, setDateRange] = useState<DateRange>('LAST_30_DAYS');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const dashboardId = params?.id as string;
  const { data: dashboard, isLoading, error, refetch } = useDashboard(dashboardId);
  const toggleFavorite = useToggleDashboardFavorite();

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleToggleFavorite = () => {
    if (dashboardId) {
      toggleFavorite.mutate(dashboardId);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-9" />
          <Skeleton className="h-8 w-[200px]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[200px]" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Dashboard not found or failed to load.</p>
          <Button variant="outline" asChild>
            <Link href="/analytics">Back to Analytics</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/analytics">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back to Analytics</span>
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-foreground">{dashboard.name}</h1>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleToggleFavorite}
              >
                <Star
                  className={cn(
                    'h-4 w-4',
                    dashboard.isFavorite
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  )}
                />
              </Button>
            </div>
            {dashboard.description && (
              <p className="text-muted-foreground text-sm">{dashboard.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Range Selector */}
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[160px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LAST_7_DAYS">Last 7 Days</SelectItem>
              <SelectItem value="LAST_30_DAYS">Last 30 Days</SelectItem>
              <SelectItem value="LAST_90_DAYS">Last 90 Days</SelectItem>
              <SelectItem value="YEAR_TO_DATE">Year to Date</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Share2 className="h-4 w-4 mr-2" />
                Share Dashboard
              </DropdownMenuItem>
              {!dashboard.isSystem && (
                <>
                  <DropdownMenuItem>
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Dashboard Content - Placeholder widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Placeholder widgets - in a real implementation, these would come from dashboard.widgets */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">247</div>
            <p className="text-xs text-muted-foreground">+12% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Investigations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">18</div>
            <p className="text-xs text-muted-foreground">3 high priority</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">94%</div>
            <p className="text-xs text-muted-foreground">Within SLA target</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Case Volume Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              Chart visualization will be rendered here
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <li className="flex justify-between text-sm">
                <span>Policy Violation</span>
                <span className="font-medium">45</span>
              </li>
              <li className="flex justify-between text-sm">
                <span>Conflict of Interest</span>
                <span className="font-medium">32</span>
              </li>
              <li className="flex justify-between text-sm">
                <span>Harassment</span>
                <span className="font-medium">28</span>
              </li>
              <li className="flex justify-between text-sm">
                <span>Fraud</span>
                <span className="font-medium">21</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {dashboard.isSystem && (
        <p className="text-sm text-muted-foreground text-center">
          This is a system dashboard. Clone it to customize.
        </p>
      )}
    </div>
  );
}
