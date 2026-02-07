"use client";

/**
 * My Work Page
 *
 * Full task queue with filtering by category. Shows all pending tasks
 * across cases, investigations, approvals, and other work items.
 */

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { formatDistanceToNow, isPast, isToday } from "date-fns";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  FileText,
  Search,
  Clipboard,
  Shield,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ListTodo,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api";

interface UnifiedTask {
  id: string;
  type: string;
  title: string;
  description?: string;
  url: string;
  dueDate: string | null;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  status: string;
  sourceType: string;
  sourceId: string;
  sourceReference?: string;
  assignedAt?: string;
  categoryName?: string;
}

interface MyWorkResponse {
  data: UnifiedTask[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type FilterType = "all" | "cases" | "investigations" | "approvals" | "overdue";

const PAGE_SIZE = 50;

/**
 * Get icon based on task type
 */
function getTaskIcon(type: string) {
  switch (type) {
    case "CASE_ASSIGNMENT":
      return <FileText className="h-5 w-5" />;
    case "INVESTIGATION_STEP":
      return <Search className="h-5 w-5" />;
    case "APPROVAL_REQUEST":
      return <CheckCircle className="h-5 w-5" />;
    case "DISCLOSURE_REVIEW":
      return <Clipboard className="h-5 w-5" />;
    case "REMEDIATION_TASK":
      return <Shield className="h-5 w-5" />;
    default:
      return <Clock className="h-5 w-5" />;
  }
}

/**
 * Get priority badge styling
 */
function getPriorityBadge(priority: string) {
  switch (priority) {
    case "CRITICAL":
      return <Badge variant="destructive">Critical</Badge>;
    case "HIGH":
      return <Badge className="bg-orange-500 hover:bg-orange-600">High</Badge>;
    case "MEDIUM":
      return <Badge variant="secondary">Medium</Badge>;
    default:
      return <Badge variant="outline">Low</Badge>;
  }
}

/**
 * Get due date styling based on status
 */
function getDueDateDisplay(dueDate: string | null) {
  if (!dueDate) return null;

  const date = new Date(dueDate);
  const isOverdue = isPast(date) && !isToday(date);
  const isDueToday = isToday(date);

  let colorClass = "text-muted-foreground";
  let prefix = "Due: ";

  if (isOverdue) {
    colorClass = "text-destructive font-medium";
    prefix = "Overdue: ";
  } else if (isDueToday) {
    colorClass = "text-orange-600 font-medium";
    prefix = "Due today: ";
  }

  return (
    <span className={colorClass}>
      {prefix}
      {formatDistanceToNow(date, { addSuffix: true })}
    </span>
  );
}

/**
 * Loading skeleton for task items
 */
function TaskSkeleton() {
  return (
    <div className="p-4 border-b">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

export default function MyWorkPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>("all");

  // Fetch tasks with filter
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-work", { page, limit: PAGE_SIZE, filter }],
    queryFn: async (): Promise<MyWorkResponse> => {
      try {
        const params: Record<string, string | number> = {
          page,
          limit: PAGE_SIZE,
        };

        // Add filter based on selection
        if (filter === "overdue") {
          params.overdue = "true";
        } else if (filter !== "all") {
          params.sourceType = filter.toUpperCase();
        }

        const response = await api.get("/my-work", { params });

        // Handle sectioned response (legacy)
        if (response.data?.sections) {
          const allTasks = response.data.sections.flatMap(
            (s: { tasks: UnifiedTask[] }) => s.tasks
          );
          return {
            data: allTasks,
            total: response.data.total || allTasks.length,
            page: 1,
            limit: PAGE_SIZE,
            totalPages: Math.ceil(
              (response.data.total || allTasks.length) / PAGE_SIZE
            ),
          };
        }

        // Handle paginated response
        if (response.data?.data && Array.isArray(response.data.data)) {
          return response.data;
        }

        // Handle flat array response
        if (Array.isArray(response.data)) {
          return {
            data: response.data,
            total: response.data.length,
            page: 1,
            limit: PAGE_SIZE,
            totalPages: 1,
          };
        }

        return { data: [], total: 0, page: 1, limit: PAGE_SIZE, totalPages: 0 };
      } catch (err) {
        console.error("Failed to fetch my-work:", err);
        return { data: [], total: 0, page: 1, limit: PAGE_SIZE, totalPages: 0 };
      }
    },
  });

  /**
   * Handle task click - navigate to task URL
   */
  const handleTaskClick = useCallback(
    (task: UnifiedTask) => {
      if (task.url) {
        router.push(task.url);
      }
    },
    [router]
  );

  /**
   * Handle filter change
   */
  const handleFilterChange = useCallback((value: string) => {
    setFilter(value as FilterType);
    setPage(1); // Reset to first page when filter changes
  }, []);

  // Filter tasks client-side if needed (for overdue)
  let tasks = data?.data || [];
  if (filter === "overdue") {
    tasks = tasks.filter(
      (t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))
    );
  }

  const total = data?.total || 0;
  const totalPages = data?.totalPages || Math.ceil(total / PAGE_SIZE);
  const overdueCount = (data?.data || []).filter(
    (t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate))
  ).length;

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="border-b bg-background">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
                <ListTodo className="h-6 w-6" />
                My Work
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                All tasks, assignments, and action items across cases,
                investigations, and campaigns.
              </p>
            </div>
            {total > 0 && (
              <Badge variant="secondary" className="text-sm">
                {total} {total === 1 ? "task" : "tasks"}
              </Badge>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-6 pb-3">
          <Tabs value={filter} onValueChange={handleFilterChange}>
            <TabsList>
              <TabsTrigger value="all">All Tasks</TabsTrigger>
              <TabsTrigger value="cases">Cases</TabsTrigger>
              <TabsTrigger value="investigations">Investigations</TabsTrigger>
              <TabsTrigger value="approvals">Approvals</TabsTrigger>
              <TabsTrigger value="overdue" className="relative">
                Overdue
                {overdueCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-1 h-5 w-5 p-0 text-xs flex items-center justify-center"
                  >
                    {overdueCount}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6">
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                // Loading state
                <>
                  <TaskSkeleton />
                  <TaskSkeleton />
                  <TaskSkeleton />
                  <TaskSkeleton />
                  <TaskSkeleton />
                </>
              ) : error ? (
                // Error state
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                  <h3 className="text-lg font-medium">Failed to load tasks</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please try again later.
                  </p>
                </div>
              ) : tasks.length === 0 ? (
                // Empty state
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mb-4" />
                  <h3 className="text-lg font-medium">
                    {filter === "overdue"
                      ? "No overdue tasks"
                      : "You&apos;re all caught up!"}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {filter === "overdue"
                      ? "All your tasks are on track."
                      : "No tasks assigned to you right now."}
                  </p>
                </div>
              ) : (
                // Task list
                <div className="divide-y">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => handleTaskClick(task)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                          {getTaskIcon(task.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="text-sm font-medium truncate max-w-[60%]">
                              {task.title}
                            </p>
                            {getPriorityBadge(task.priority)}
                            {task.status && (
                              <Badge variant="outline" className="text-xs">
                                {task.status}
                              </Badge>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1 mb-1">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs">
                            {task.sourceReference && (
                              <span className="text-muted-foreground">
                                {task.sourceReference}
                                {task.categoryName && ` - ${task.categoryName}`}
                              </span>
                            )}
                            {getDueDateDisplay(task.dueDate)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1} -{" "}
                {Math.min(page * PAGE_SIZE, total)} of {total} tasks
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
