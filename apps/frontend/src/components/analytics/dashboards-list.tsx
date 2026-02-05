'use client';

/**
 * DashboardsList Component
 *
 * Displays a list of dashboards with favorites support and actions.
 * Shows pre-built system dashboards separately from user-created ones.
 */

import { Star, MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Dashboard } from '@/types/analytics';

export interface DashboardsListProps {
  dashboards: Dashboard[];
  isLoading?: boolean;
  onToggleFavorite?: (id: string) => void;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}

/**
 * Format last viewed date
 */
function formatLastViewed(date: string | undefined): string {
  if (!date) return 'Never';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

/**
 * Loading skeleton for dashboard list
 */
function DashboardsListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-[200px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 w-8" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when no dashboards exist
 */
function EmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <div className="text-center py-12 border rounded-lg bg-muted/30">
      <p className="text-muted-foreground mb-4">No dashboards yet</p>
      {onCreate && (
        <Button onClick={onCreate} variant="outline">
          Create your first dashboard
        </Button>
      )}
    </div>
  );
}

/**
 * Dashboard row component
 */
function DashboardRow({
  dashboard,
  onToggleFavorite,
  onSelect,
  onDelete,
}: {
  dashboard: Dashboard;
  onToggleFavorite?: (id: string) => void;
  onSelect?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted/50">
      <TableCell className="w-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(dashboard.id);
          }}
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
      </TableCell>
      <TableCell onClick={() => onSelect?.(dashboard.id)}>
        <div className="flex flex-col">
          <span className="font-medium">{dashboard.name}</span>
          {dashboard.description && (
            <span className="text-xs text-muted-foreground truncate max-w-[300px]">
              {dashboard.description}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell onClick={() => onSelect?.(dashboard.id)}>
        {dashboard.isSystem ? (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
            System
          </span>
        ) : (
          dashboard.ownerName || 'You'
        )}
      </TableCell>
      <TableCell
        className="text-muted-foreground text-sm"
        onClick={() => onSelect?.(dashboard.id)}
      >
        {formatLastViewed(dashboard.lastViewedAt)}
      </TableCell>
      <TableCell className="w-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSelect?.(dashboard.id)}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
            {!dashboard.isSystem && (
              <>
                <DropdownMenuItem onClick={() => onSelect?.(dashboard.id)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete?.(dashboard.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export function DashboardsList({
  dashboards,
  isLoading,
  onToggleFavorite,
  onSelect,
  onDelete,
}: DashboardsListProps) {
  if (isLoading) {
    return <DashboardsListSkeleton />;
  }

  if (!dashboards || dashboards.length === 0) {
    return <EmptyState />;
  }

  // Separate system and user dashboards
  const systemDashboards = dashboards.filter((d) => d.isSystem);
  const userDashboards = dashboards.filter((d) => !d.isSystem);

  return (
    <div className="space-y-6">
      {/* Pre-built Dashboards */}
      {systemDashboards.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Pre-built Dashboards
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Last Viewed</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {systemDashboards.map((dashboard) => (
                <DashboardRow
                  key={dashboard.id}
                  dashboard={dashboard}
                  onToggleFavorite={onToggleFavorite}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* User Dashboards */}
      {userDashboards.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Your Dashboards
          </h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Last Viewed</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userDashboards.map((dashboard) => (
                <DashboardRow
                  key={dashboard.id}
                  dashboard={dashboard}
                  onToggleFavorite={onToggleFavorite}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Show message if only system dashboards exist */}
      {systemDashboards.length > 0 && userDashboards.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          Create your own dashboard to customize your analytics view.
        </p>
      )}
    </div>
  );
}
