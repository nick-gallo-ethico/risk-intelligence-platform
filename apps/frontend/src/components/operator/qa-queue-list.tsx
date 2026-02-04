'use client';

/**
 * QaQueueList - QA Queue List with Filters
 *
 * Displays the QA review queue with:
 * - Filter controls (client, severity, operator, date range)
 * - Sort options (severity, queue time, client)
 * - Queue items list with pagination
 * - Queue stats header
 * - Empty state handling
 */

import { useState, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { QaQueueItem } from './qa-queue-item';
import { useQaQueue } from '@/hooks/useQaQueue';
import type {
  QaQueueItem as QaQueueItemType,
  QaQueueFilters,
} from '@/types/operator.types';
import {
  AlertTriangle,
  ArrowDownAZ,
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Inbox,
  RefreshCw,
} from 'lucide-react';

/**
 * Severity options for filter.
 */
const SEVERITY_OPTIONS = [
  { value: '', label: 'All Severities' },
  { value: 'CRITICAL', label: 'Critical only' },
  { value: 'HIGH', label: 'High and above' },
  { value: 'MEDIUM', label: 'Medium and above' },
  { value: 'LOW', label: 'All (including Low)' },
];

/**
 * Sort options for the queue.
 */
const SORT_OPTIONS = [
  { value: 'severity', label: 'Severity (High first)' },
  { value: 'time', label: 'Queue time (Oldest first)' },
  { value: 'client', label: 'Client name' },
];

export interface QaQueueListProps {
  /** Called when an item is selected */
  onSelectItem: (riuId: string) => void;
  /** Currently selected item ID */
  selectedItemId?: string | null;
  /** Current user ID for claim checking */
  currentUserId?: string;
  /** Optional class name */
  className?: string;
}

export function QaQueueList({
  onSelectItem,
  selectedItemId,
  currentUserId,
  className,
}: QaQueueListProps) {
  // Filter state
  const [filters, setFilters] = useState<QaQueueFilters>({
    page: 1,
    limit: 20,
  });
  const [sortBy, setSortBy] = useState<'severity' | 'time' | 'client'>('severity');
  const [showFilters, setShowFilters] = useState(false);

  // Fetch queue data
  const {
    items,
    total,
    page,
    totalPages,
    isLoading,
    error,
    isClaiming,
    refresh,
    claim,
  } = useQaQueue(filters);

  // Local claim tracking to show spinner on specific item
  const [claimingItemId, setClaimingItemId] = useState<string | null>(null);

  // Sort items locally (backend already sorts by severity)
  const sortedItems = useMemo(() => {
    if (sortBy === 'severity') {
      // Backend default sort
      return items;
    }

    return [...items].sort((a, b) => {
      if (sortBy === 'time') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'client') {
        return a.clientName.localeCompare(b.clientName);
      }
      return 0;
    });
  }, [items, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const highSeverityCount = items.filter(
      (item) => item.severityScore === 'HIGH' || item.severityScore === 'CRITICAL'
    ).length;

    // Calculate average wait time (rough estimate from items on this page)
    const waitTimes = items.map(
      (item) => Date.now() - new Date(item.createdAt).getTime()
    );
    const avgWaitMs =
      waitTimes.length > 0
        ? waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length
        : 0;
    const avgWaitMins = Math.round(avgWaitMs / (1000 * 60));

    return {
      total,
      highSeverityCount,
      avgWaitMins,
    };
  }, [items, total]);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (key: keyof QaQueueFilters, value: string) => {
      setFilters((prev) => ({
        ...prev,
        [key]: value || undefined,
        page: 1, // Reset to first page on filter change
      }));
    },
    []
  );

  // Handle page change
  const handlePageChange = useCallback((newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage }));
  }, []);

  // Handle claim
  const handleClaim = useCallback(
    async (riuId: string) => {
      setClaimingItemId(riuId);
      try {
        await claim(riuId);
        // Select the item after claiming
        onSelectItem(riuId);
      } finally {
        setClaimingItemId(null);
      }
    },
    [claim, onSelectItem]
  );

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Stats Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Inbox className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{stats.total}</span>
            <span className="text-sm text-muted-foreground">in queue</span>
          </div>
          {stats.highSeverityCount > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">
                {stats.highSeverityCount} high severity
              </span>
            </div>
          )}
          {stats.avgWaitMins > 0 && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="text-sm">~{stats.avgWaitMins}m avg wait</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
        </Button>
      </div>

      {/* Filter Toggle and Sort */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1"
        >
          <Filter className="h-4 w-4" />
          Filters
          {(filters.clientId || filters.severityMin || filters.operatorId) && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              Active
            </span>
          )}
        </Button>
        <Select
          value={sortBy}
          onValueChange={(value) =>
            setSortBy(value as 'severity' | 'time' | 'client')
          }
        >
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <ArrowDownAZ className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filter Controls (collapsible) */}
      {showFilters && (
        <div className="px-4 py-3 border-b bg-muted/20 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Client</Label>
              <Input
                placeholder="Filter by client..."
                value={filters.clientId || ''}
                onChange={(e) => handleFilterChange('clientId', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Severity</Label>
              <Select
                value={filters.severityMin || ''}
                onValueChange={(value) => handleFilterChange('severityMin', value)}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Operator</Label>
              <Input
                placeholder="Filter by operator..."
                value={filters.operatorId || ''}
                onChange={(e) => handleFilterChange('operatorId', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Date Range</Label>
              <div className="flex gap-1">
                <Input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="h-8 text-sm flex-1"
                />
                <Input
                  type="date"
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="h-8 text-sm flex-1"
                />
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setFilters({ page: 1, limit: 20 })
            }
          >
            Clear Filters
          </Button>
        </div>
      )}

      {/* Queue Items List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && items.length === 0 ? (
          // Loading skeleton
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="p-8 text-center text-muted-foreground">
            <p className="text-red-600 mb-2">Failed to load queue</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        ) : sortedItems.length === 0 ? (
          // Empty state
          <div className="p-8 text-center text-muted-foreground">
            <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">No items in queue</p>
            <p className="text-sm mt-1">
              {filters.clientId || filters.severityMin || filters.operatorId
                ? 'Try adjusting your filters'
                : 'All caught up!'}
            </p>
          </div>
        ) : (
          // Items list
          <div className="p-4 space-y-3">
            {sortedItems.map((item) => (
              <QaQueueItem
                key={item.riuId}
                item={item}
                onClaim={handleClaim}
                isClaiming={claimingItemId === item.riuId}
                isSelected={selectedItemId === item.riuId}
                onClick={onSelectItem}
                currentUserId={currentUserId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t">
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
