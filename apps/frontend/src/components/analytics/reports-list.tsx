'use client';

/**
 * ReportsList Component
 *
 * Displays a list of report templates with favorites sidebar.
 */

import { Star, MoreHorizontal, Play, Copy, Trash2, FileText } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { Report } from '@/types/analytics';

export interface ReportsListProps {
  reports: Report[];
  isLoading?: boolean;
  onToggleFavorite?: (id: string) => void;
  onSelect?: (id: string) => void;
  onRun?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
}

/**
 * Format updated date
 */
function formatUpdated(date: string | undefined): string {
  if (!date) return 'Unknown';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return 'Unknown';
  }
}

/**
 * Loading skeleton for report list
 */
function ReportsListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-5 w-[200px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[60px]" />
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-5 w-8" />
        </div>
      ))}
    </div>
  );
}

/**
 * Empty state when no reports exist
 */
function EmptyState() {
  return (
    <div className="text-center py-12 border rounded-lg bg-muted/30">
      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-muted-foreground mb-2">No reports yet</p>
      <p className="text-sm text-muted-foreground">
        Reports allow you to query and export data from the platform.
      </p>
    </div>
  );
}

/**
 * Coming soon placeholder
 */
function ComingSoon() {
  return (
    <div className="text-center py-12 border rounded-lg bg-muted/30">
      <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <p className="text-lg font-medium mb-2">Reports Coming Soon</p>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        The reports feature is currently in development. Check back soon for
        the ability to create custom reports and export data.
      </p>
    </div>
  );
}

/**
 * Report row component
 */
function ReportRow({
  report,
  onToggleFavorite,
  onSelect,
  onRun,
  onDuplicate,
  onDelete,
}: {
  report: Report;
  onToggleFavorite?: (id: string) => void;
  onSelect?: (id: string) => void;
  onRun?: (id: string) => void;
  onDuplicate?: (id: string) => void;
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
            onToggleFavorite?.(report.id);
          }}
        >
          <Star
            className={cn(
              'h-4 w-4',
              report.isFavorite
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            )}
          />
        </Button>
      </TableCell>
      <TableCell onClick={() => onSelect?.(report.id)}>
        <div className="flex flex-col">
          <span className="font-medium">{report.name}</span>
          {report.description && (
            <span className="text-xs text-muted-foreground truncate max-w-[300px]">
              {report.description}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell onClick={() => onSelect?.(report.id)}>
        {report.isSystem ? (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
            System
          </span>
        ) : (
          report.ownerName || 'You'
        )}
      </TableCell>
      <TableCell onClick={() => onSelect?.(report.id)}>
        {report.viewCount ?? 0}
      </TableCell>
      <TableCell onClick={() => onSelect?.(report.id)}>
        <div className="flex gap-1 flex-wrap">
          {report.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {(report.tags?.length ?? 0) > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{(report.tags?.length ?? 0) - 2}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell
        className="text-muted-foreground text-sm"
        onClick={() => onSelect?.(report.id)}
      >
        {formatUpdated(report.updatedAt)}
      </TableCell>
      <TableCell className="w-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRun?.(report.id)}>
              <Play className="h-4 w-4 mr-2" />
              Run Report
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate?.(report.id)}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            {!report.isSystem && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete?.(report.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

export function ReportsList({
  reports,
  isLoading,
  onToggleFavorite,
  onSelect,
  onRun,
  onDuplicate,
  onDelete,
}: ReportsListProps) {
  if (isLoading) {
    return <ReportsListSkeleton />;
  }

  // If reports endpoint not available or empty, show coming soon
  if (!reports || reports.length === 0) {
    return <ComingSoon />;
  }

  // Separate favorites and regular reports
  const favoriteReports = reports.filter((r) => r.isFavorite);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Favorites Sidebar */}
      {favoriteReports.length > 0 && (
        <div className="lg:col-span-1">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            Favorites
          </h3>
          <div className="space-y-2">
            {favoriteReports.map((report) => (
              <button
                key={report.id}
                onClick={() => onSelect?.(report.id)}
                className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <p className="font-medium text-sm truncate">{report.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatUpdated(report.updatedAt)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reports Table */}
      <div className={favoriteReports.length > 0 ? 'lg:col-span-3' : 'lg:col-span-4'}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Tags</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                onToggleFavorite={onToggleFavorite}
                onSelect={onSelect}
                onRun={onRun}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
