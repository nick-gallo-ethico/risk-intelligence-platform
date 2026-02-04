'use client';

import * as React from 'react';
import {
  Search,
  Filter,
  CheckSquare,
  RefreshCw,
  ChevronDown,
  AlertTriangle,
  Clock,
  Sparkles,
  PartyPopper,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ConflictAlert,
  ConflictAlertData,
  ConflictSeverity,
  ConflictStatus,
  ConflictType,
  DismissConflictRequest,
  SEVERITY_COLORS,
  CONFLICT_TYPE_LABELS,
  DISMISSAL_CATEGORY_LABELS,
  DismissalCategory,
} from './ConflictAlert';
import { cn } from '@/lib/utils';

// ===========================================
// Types
// ===========================================

export interface ConflictQueueFilters {
  status: ConflictStatus | 'ALL';
  conflictType: ConflictType | 'ALL';
  severity: ConflictSeverity | 'ALL';
  search: string;
  sortBy: 'date_desc' | 'date_asc' | 'severity' | 'confidence';
}

export interface ConflictQueueStats {
  openCount: number;
  highSeverityCount: number;
  pendingOver7DaysCount: number;
  dismissedCount: number;
  escalatedCount: number;
}

export interface ConflictQueueProps {
  alerts: ConflictAlertData[];
  stats?: ConflictQueueStats;
  filters?: Partial<ConflictQueueFilters>;
  onFiltersChange?: (filters: ConflictQueueFilters) => void;
  onDismiss?: (id: string, request: DismissConflictRequest) => Promise<void>;
  onEscalate?: (id: string) => Promise<void>;
  onBulkDismiss?: (ids: string[], request: DismissConflictRequest) => Promise<void>;
  onViewEntity?: (entityName: string) => void;
  onViewDetails?: (id: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

const DEFAULT_FILTERS: ConflictQueueFilters = {
  status: 'ALL',
  conflictType: 'ALL',
  severity: 'ALL',
  search: '',
  sortBy: 'date_desc',
};

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'severity', label: 'Severity (High to Low)' },
  { value: 'confidence', label: 'Confidence (High to Low)' },
];

const SEVERITY_ORDER: ConflictSeverity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

// ===========================================
// Component
// ===========================================

/**
 * ConflictQueue component for reviewing and managing conflict alerts.
 * Supports filtering, sorting, batch actions, and infinite scroll.
 */
export function ConflictQueue({
  alerts,
  stats,
  filters: externalFilters,
  onFiltersChange,
  onDismiss,
  onEscalate,
  onBulkDismiss,
  onViewEntity,
  onViewDetails,
  onRefresh,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  className,
}: ConflictQueueProps) {
  const [internalFilters, setInternalFilters] =
    React.useState<ConflictQueueFilters>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [isBulkDismissOpen, setIsBulkDismissOpen] = React.useState(false);
  const [bulkDismissCategory, setBulkDismissCategory] =
    React.useState<DismissalCategory | null>(null);
  const [bulkDismissReason, setBulkDismissReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const filters = externalFilters
    ? { ...DEFAULT_FILTERS, ...externalFilters }
    : internalFilters;

  const setFilters = (newFilters: Partial<ConflictQueueFilters>) => {
    const updated = { ...filters, ...newFilters };
    if (onFiltersChange) {
      onFiltersChange(updated);
    } else {
      setInternalFilters(updated);
    }
  };

  // Filter and sort alerts
  const filteredAlerts = React.useMemo(() => {
    let result = [...alerts];

    // Filter by status
    if (filters.status !== 'ALL') {
      result = result.filter((a) => a.status === filters.status);
    }

    // Filter by conflict type
    if (filters.conflictType !== 'ALL') {
      result = result.filter((a) => a.conflictType === filters.conflictType);
    }

    // Filter by severity
    if (filters.severity !== 'ALL') {
      result = result.filter((a) => a.severity === filters.severity);
    }

    // Filter by search
    if (filters.search.trim()) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (a) =>
          a.matchedEntity.toLowerCase().includes(searchLower) ||
          a.summary.toLowerCase().includes(searchLower)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'date_asc':
          return (
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        case 'date_desc':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        case 'severity':
          return (
            SEVERITY_ORDER.indexOf(a.severity) -
            SEVERITY_ORDER.indexOf(b.severity)
          );
        case 'confidence':
          return b.matchConfidence - a.matchConfidence;
        default:
          return 0;
      }
    });

    return result;
  }, [alerts, filters]);

  // Open alerts (for selection)
  const openAlerts = filteredAlerts.filter((a) => a.status === 'OPEN');
  const allSelected =
    openAlerts.length > 0 && openAlerts.every((a) => selectedIds.has(a.id));
  const someSelected = openAlerts.some((a) => selectedIds.has(a.id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(openAlerts.map((a) => a.id)));
    }
  };

  const handleSelectionChange = (id: string, selected: boolean) => {
    const newSet = new Set(selectedIds);
    if (selected) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDismiss = async () => {
    if (
      !onBulkDismiss ||
      selectedIds.size === 0 ||
      !bulkDismissCategory ||
      !bulkDismissReason.trim()
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onBulkDismiss(Array.from(selectedIds), {
        category: bulkDismissCategory,
        reason: bulkDismissReason,
      });
      setSelectedIds(new Set());
      setIsBulkDismissOpen(false);
      setBulkDismissCategory(null);
      setBulkDismissReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate stats from alerts if not provided
  const computedStats = React.useMemo((): ConflictQueueStats => {
    if (stats) return stats;

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    return {
      openCount: alerts.filter((a) => a.status === 'OPEN').length,
      highSeverityCount: alerts.filter(
        (a) =>
          a.status === 'OPEN' &&
          (a.severity === 'HIGH' || a.severity === 'CRITICAL')
      ).length,
      pendingOver7DaysCount: alerts.filter(
        (a) =>
          a.status === 'OPEN' && new Date(a.createdAt).getTime() < sevenDaysAgo
      ).length,
      dismissedCount: alerts.filter((a) => a.status === 'DISMISSED').length,
      escalatedCount: alerts.filter((a) => a.status === 'ESCALATED').length,
    };
  }, [alerts, stats]);

  // Infinite scroll
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const loadMoreRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (isLoading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && onLoadMore) {
          onLoadMore();
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [isLoading, hasMore, onLoadMore]
  );

  return (
    <div className={cn('space-y-4', className)}>
      {/* Stats Header */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-100 p-2">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{computedStats.openCount}</p>
              <p className="text-xs text-muted-foreground">Open</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {computedStats.highSeverityCount}
              </p>
              <p className="text-xs text-muted-foreground">High Severity</p>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-orange-100 p-2">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {computedStats.pendingOver7DaysCount}
              </p>
              <p className="text-xs text-muted-foreground">Pending 7+ Days</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 hidden sm:block">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gray-100 p-2">
              <XCircle className="h-4 w-4 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {computedStats.dismissedCount}
              </p>
              <p className="text-xs text-muted-foreground">Dismissed</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 hidden lg:block">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-purple-100 p-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {computedStats.escalatedCount}
              </p>
              <p className="text-xs text-muted-foreground">Escalated</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Status Tabs */}
        <Tabs
          value={filters.status}
          onValueChange={(v) => setFilters({ status: v as ConflictStatus | 'ALL' })}
          className="w-full sm:w-auto"
        >
          <TabsList>
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="OPEN">
              Open
              {computedStats.openCount > 0 && (
                <Badge variant="secondary" className="ml-1.5 px-1.5 text-xs">
                  {computedStats.openCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="DISMISSED">Dismissed</TabsTrigger>
            <TabsTrigger value="ESCALATED">Escalated</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search entities..."
            value={filters.search}
            onChange={(e) => setFilters({ search: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Filters Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-1.5 h-4 w-4" />
              Filters
              {(filters.conflictType !== 'ALL' ||
                filters.severity !== 'ALL') && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 px-1.5 h-5 min-w-5"
                >
                  {(filters.conflictType !== 'ALL' ? 1 : 0) +
                    (filters.severity !== 'ALL' ? 1 : 0)}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Conflict Type</Label>
                <Select
                  value={filters.conflictType}
                  onValueChange={(v) =>
                    setFilters({ conflictType: v as ConflictType | 'ALL' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Types</SelectItem>
                    {Object.entries(CONFLICT_TYPE_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Severity</Label>
                <Select
                  value={filters.severity}
                  onValueChange={(v) =>
                    setFilters({ severity: v as ConflictSeverity | 'ALL' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Severities</SelectItem>
                    {SEVERITY_ORDER.map((severity) => (
                      <SelectItem key={severity} value={severity}>
                        {severity.charAt(0) + severity.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sort By</Label>
                <Select
                  value={filters.sortBy}
                  onValueChange={(v) =>
                    setFilters({
                      sortBy: v as ConflictQueueFilters['sortBy'],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() =>
                  setFilters({
                    conflictType: 'ALL',
                    severity: 'ALL',
                    sortBy: 'date_desc',
                  })
                }
              >
                Reset Filters
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Refresh */}
        {onRefresh && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
          >
            <RefreshCw
              className={cn('h-4 w-4', isLoading && 'animate-spin')}
            />
          </Button>
        )}
      </div>

      {/* Batch Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          <Checkbox
            checked={allSelected}
            ref={undefined}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm font-medium">
            {selectedIds.size} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Popover open={isBulkDismissOpen} onOpenChange={setIsBulkDismissOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <XCircle className="mr-1.5 h-4 w-4" />
                  Bulk Dismiss
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <h4 className="font-medium">
                    Dismiss {selectedIds.size} Conflicts
                  </h4>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={bulkDismissCategory ?? ''}
                      onValueChange={(v) =>
                        setBulkDismissCategory(v as DismissalCategory)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DISMISSAL_CATEGORY_LABELS).map(
                          ([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Reason</Label>
                    <Input
                      placeholder="Reason for dismissal..."
                      value={bulkDismissReason}
                      onChange={(e) => setBulkDismissReason(e.target.value)}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsBulkDismissOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleBulkDismiss}
                      disabled={
                        !bulkDismissCategory ||
                        !bulkDismissReason.trim() ||
                        isSubmitting
                      }
                    >
                      {isSubmitting ? 'Dismissing...' : 'Dismiss All'}
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* Select All Toggle (when no selection) */}
      {selectedIds.size === 0 && openAlerts.length > 0 && onBulkDismiss && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={false}
            onCheckedChange={handleSelectAll}
          />
          <span>Select all to enable batch actions</span>
        </div>
      )}

      {/* Alerts List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <Card className="p-8">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-green-100 p-4 mb-4">
                <PartyPopper className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-1">
                No conflicts to review
              </h3>
              <p className="text-muted-foreground max-w-sm">
                {filters.search || filters.conflictType !== 'ALL' || filters.severity !== 'ALL'
                  ? 'No conflicts match your current filters. Try adjusting your search criteria.'
                  : 'Great work! All conflict alerts have been addressed.'}
              </p>
              {(filters.search ||
                filters.conflictType !== 'ALL' ||
                filters.severity !== 'ALL') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() =>
                    setFilters({
                      search: '',
                      conflictType: 'ALL',
                      severity: 'ALL',
                    })
                  }
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </Card>
        ) : (
          filteredAlerts.map((alert) => (
            <ConflictAlert
              key={alert.id}
              alert={alert}
              onDismiss={onDismiss}
              onEscalate={onEscalate}
              onViewEntity={onViewEntity}
              onViewDetails={onViewDetails}
              selectable={alert.status === 'OPEN' && !!onBulkDismiss}
              selected={selectedIds.has(alert.id)}
              onSelectionChange={handleSelectionChange}
            />
          ))
        )}
      </div>

      {/* Load More Trigger */}
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading more...
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={onLoadMore}>
              Load More
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
