'use client';

/**
 * MyTasksTab Component
 *
 * Full implementation of the My Tasks tab for Employee Portal.
 *
 * Features:
 * - Fetch tasks from /api/v1/employee/tasks
 * - Sub-tabs: Pending, Overdue, Recently Completed
 * - Filter dropdown: All, Attestations, Disclosures, Approvals
 * - Sort: Due date, Type
 * - Task list using TaskCard component
 * - Empty state for each sub-tab
 * - Pagination
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileX, Filter, SortAsc } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { TaskCard, type EmployeeTask, type TaskType, type TaskStatus } from './task-card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Tasks API response.
 */
interface TasksResponse {
  data: EmployeeTask[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Query keys for tasks.
 */
const taskQueryKeys = {
  all: ['employee', 'tasks'] as const,
  list: (filters?: { types?: TaskType[]; status?: TaskStatus[] }) =>
    [...taskQueryKeys.all, 'list', filters] as const,
};

/**
 * Filter options for task types.
 */
const TASK_TYPE_FILTERS: { value: TaskType; label: string }[] = [
  { value: 'ATTESTATION', label: 'Attestations' },
  { value: 'DISCLOSURE', label: 'Disclosures' },
  { value: 'APPROVAL', label: 'Approvals' },
  { value: 'REPORT_FOLLOW_UP', label: 'Follow-ups' },
  { value: 'REMEDIATION_STEP', label: 'Remediation' },
];

/**
 * Sort options.
 */
type SortOption = 'dueDate' | 'type' | 'createdAt';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'dueDate', label: 'Due Date' },
  { value: 'type', label: 'Type' },
  { value: 'createdAt', label: 'Date Created' },
];

/**
 * Loading skeleton for task list.
 */
function TaskListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-24" />
      ))}
    </div>
  );
}

/**
 * Empty state component.
 */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FileX className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * MyTasksTab - Main tasks tab component.
 */
export function MyTasksTab() {
  // State
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'overdue' | 'completed'>('pending');
  const [selectedTypes, setSelectedTypes] = useState<Set<TaskType>>(new Set());
  const [sortBy, setSortBy] = useState<SortOption>('dueDate');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, string> = {
      page: page.toString(),
      limit: limit.toString(),
    };

    if (selectedTypes.size > 0) {
      params.types = Array.from(selectedTypes).join(',');
    }

    // Filter by sub-tab status
    if (activeSubTab === 'pending') {
      params.status = 'PENDING,IN_PROGRESS';
    } else if (activeSubTab === 'overdue') {
      params.status = 'OVERDUE';
    } else {
      params.status = 'COMPLETED';
    }

    return params;
  }, [page, selectedTypes, activeSubTab]);

  // Fetch tasks
  const { data, isLoading, error } = useQuery({
    queryKey: taskQueryKeys.list({ types: Array.from(selectedTypes) as TaskType[] }),
    queryFn: async () => {
      const searchParams = new URLSearchParams(queryParams);
      return apiClient.get<TasksResponse>(`/employee/tasks?${searchParams.toString()}`);
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // Sort tasks
  const sortedTasks = useMemo(() => {
    if (!data?.data) return [];

    return [...data.data].sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'type':
          return a.type.localeCompare(b.type);
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
  }, [data?.data, sortBy]);

  // Filter tasks by sub-tab (client-side backup)
  const filteredTasks = useMemo(() => {
    return sortedTasks.filter((task) => {
      if (activeSubTab === 'pending') {
        return task.status === 'PENDING' || task.status === 'IN_PROGRESS';
      }
      if (activeSubTab === 'overdue') {
        return task.status === 'OVERDUE';
      }
      return task.status === 'COMPLETED';
    });
  }, [sortedTasks, activeSubTab]);

  // Get counts for sub-tab badges
  const taskCounts = useMemo(() => {
    const all = data?.data || [];
    return {
      pending: all.filter((t) => t.status === 'PENDING' || t.status === 'IN_PROGRESS').length,
      overdue: all.filter((t) => t.status === 'OVERDUE').length,
      completed: all.filter((t) => t.status === 'COMPLETED').length,
    };
  }, [data?.data]);

  // Handle type filter toggle
  const toggleTypeFilter = (type: TaskType) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
    setPage(1); // Reset page on filter change
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedTypes(new Set());
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs and filters row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Sub-tabs */}
        <Tabs
          value={activeSubTab}
          onValueChange={(v) => {
            setActiveSubTab(v as typeof activeSubTab);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              Pending
              {taskCounts.pending > 0 && (
                <Badge variant="secondary" className="h-5 text-xs">
                  {taskCounts.pending}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="overdue" className="flex items-center gap-2">
              Overdue
              {taskCounts.overdue > 0 && (
                <Badge variant="destructive" className="h-5 text-xs">
                  {taskCounts.overdue}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filter and Sort */}
        <div className="flex items-center gap-2">
          {/* Type filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter
                {selectedTypes.size > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 text-xs">
                    {selectedTypes.size}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {TASK_TYPE_FILTERS.map((filter) => (
                <DropdownMenuCheckboxItem
                  key={filter.value}
                  checked={selectedTypes.has(filter.value)}
                  onCheckedChange={() => toggleTypeFilter(filter.value)}
                >
                  {filter.label}
                </DropdownMenuCheckboxItem>
              ))}
              {selectedTypes.size > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={clearFilters}>
                    Clear filters
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <SortAsc className="h-4 w-4" />
                Sort
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSortBy(option.value)}
                  className={cn(sortBy === option.value && 'bg-muted')}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Active filters display */}
      {selectedTypes.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(selectedTypes).map((type) => (
            <Badge
              key={type}
              variant="secondary"
              className="cursor-pointer"
              onClick={() => toggleTypeFilter(type)}
            >
              {TASK_TYPE_FILTERS.find((f) => f.value === type)?.label}
              <span className="ml-1">&times;</span>
            </Badge>
          ))}
        </div>
      )}

      {/* Task list */}
      {isLoading ? (
        <TaskListSkeleton />
      ) : error ? (
        <div className="text-center py-8 text-destructive">
          Failed to load tasks. Please try again.
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          message={
            activeSubTab === 'pending'
              ? 'No pending tasks. Great job staying on top of things!'
              : activeSubTab === 'overdue'
              ? 'No overdue tasks. Keep up the good work!'
              : 'No completed tasks yet.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => setPage((p) => p + 1)}
            disabled={isLoading}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

export default MyTasksTab;
