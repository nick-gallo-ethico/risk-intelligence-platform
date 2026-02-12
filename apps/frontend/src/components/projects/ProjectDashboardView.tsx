"use client";

/**
 * ProjectDashboardView Component
 *
 * Project-level dashboard with KPI cards, charts, and progress metrics.
 * Provides an at-a-glance view of project health similar to Monday.com's
 * Dashboard view.
 */

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Users,
  Target,
  ListTodo,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  LabelList,
  Legend,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useProjectStats,
  type ProjectDetailResponse,
} from "@/hooks/use-project-detail";

import type { ProjectTask } from "@/types/project";

interface ProjectDashboardViewProps {
  project: ProjectDetailResponse | null;
  isLoading: boolean;
  onTaskClick: (task: ProjectTask) => void;
  onRefresh: () => void;
}

/**
 * Status colors for charts.
 */
const STATUS_COLORS: Record<string, string> = {
  NOT_STARTED: "#9ca3af",
  IN_PROGRESS: "#3b82f6",
  STUCK: "#ef4444",
  DONE: "#22c55e",
  CANCELLED: "#d1d5db",
};

/**
 * Priority colors for charts.
 */
const PRIORITY_COLORS: Record<string, string> = {
  LOW: "#9ca3af",
  MEDIUM: "#eab308",
  HIGH: "#f97316",
  CRITICAL: "#ef4444",
};

/**
 * ProjectDashboardView - Project health dashboard with charts and KPIs.
 */
export function ProjectDashboardView({
  project,
  isLoading,
  onTaskClick,
  onRefresh,
}: ProjectDashboardViewProps) {
  const { data: stats, isLoading: statsLoading } = useProjectStats(project?.id);

  // Generate completion trend data for last 30 days
  const completionTrendData = useMemo(() => {
    if (!stats?.completedByDay) return [];

    const data = [];
    let cumulative = 0;

    // Get all completed before 30 days ago
    const thirtyDaysAgo = subDays(new Date(), 30);
    const beforeThirtyDays =
      stats.completedTasks -
      Object.values(stats.completedByDay).reduce((a, b) => a + b, 0);
    cumulative = beforeThirtyDays > 0 ? beforeThirtyDays : 0;

    for (let i = 29; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, "yyyy-MM-dd");
      const completed = stats.completedByDay[dateStr] || 0;
      cumulative += completed;
      data.push({
        date: format(date, "MMM d"),
        completed: cumulative,
        daily: completed,
      });
    }

    return data;
  }, [stats?.completedByDay, stats?.completedTasks]);

  // Status pie chart data
  const statusChartData = useMemo(() => {
    if (!stats?.statusCounts) return [];
    return Object.entries(stats.statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: status.replace("_", " "),
        value: count,
        color: STATUS_COLORS[status] || "#9ca3af",
      }));
  }, [stats?.statusCounts]);

  // Priority chart data
  const priorityChartData = useMemo(() => {
    if (!stats?.priorityCounts) return [];
    return Object.entries(stats.priorityCounts)
      .filter(([_, count]) => count > 0)
      .map(([priority, count]) => ({
        name: priority,
        value: count,
        color: PRIORITY_COLORS[priority] || "#9ca3af",
      }));
  }, [stats?.priorityCounts]);

  // Group progress data
  const groupProgressData = useMemo(() => {
    if (!stats?.groupProgress) return [];
    return [...stats.groupProgress].sort(
      (a, b) => a.progressPercent - b.progressPercent,
    );
  }, [stats?.groupProgress]);

  if (isLoading || statsLoading) {
    return <DashboardSkeleton />;
  }

  if (!project || !stats) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Project not found
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Progress */}
        <KpiCard
          title="Progress"
          value={`${stats.progressPercent}%`}
          icon={Target}
          description={`${stats.completedTasks} of ${stats.totalTasks} tasks`}
          trend={
            stats.progressPercent >= 75
              ? "good"
              : stats.progressPercent >= 50
                ? "warning"
                : "bad"
          }
        >
          <div className="mt-3">
            <Progress value={stats.progressPercent} className="h-2" />
          </div>
        </KpiCard>

        {/* Tasks Completed */}
        <KpiCard
          title="Completed"
          value={stats.completedTasks.toString()}
          icon={CheckCircle2}
          description={`${stats.totalTasks - stats.completedTasks} remaining`}
          trend="neutral"
        />

        {/* Days Remaining */}
        <KpiCard
          title="Days Remaining"
          value={
            stats.daysUntilTarget !== null
              ? stats.daysUntilTarget.toString()
              : "N/A"
          }
          icon={Calendar}
          description={
            project.targetDate
              ? format(new Date(project.targetDate), "MMM d, yyyy")
              : "No target date"
          }
          trend={
            stats.daysUntilTarget === null
              ? "neutral"
              : stats.daysUntilTarget < 0
                ? "bad"
                : stats.daysUntilTarget <= 7
                  ? "warning"
                  : "good"
          }
        />

        {/* Overdue Tasks */}
        <KpiCard
          title="Overdue"
          value={stats.overdueTasks.toString()}
          icon={AlertTriangle}
          description={
            stats.overdueTasks === 0 ? "All tasks on track" : "Need attention"
          }
          trend={stats.overdueTasks === 0 ? "good" : "bad"}
        />
      </div>

      {/* Row 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ListTodo className="h-4 w-4" />
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusChartData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      formatter={(value) => [`${value} tasks`, ""]}
                    />
                    <Legend
                      layout="horizontal"
                      align="center"
                      verticalAlign="bottom"
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center mt-[-30px]">
                    <div className="text-2xl font-bold">{stats.totalTasks}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No tasks yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completion Trend Area Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Completion Trend
              <Badge variant="secondary" className="ml-auto text-xs">
                Last 30 days
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completionTrendData.length > 0 ? (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={completionTrendData}>
                    <defs>
                      <linearGradient
                        id="colorCompleted"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#22c55e"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#22c55e"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={30}
                    />
                    <RechartsTooltip
                      formatter={(value, name) => [
                        name === "completed"
                          ? `${value} total completed`
                          : `${value} completed today`,
                        name === "completed" ? "Cumulative" : "Daily",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stroke="#22c55e"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCompleted)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No completion data yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Group Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Group Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          {groupProgressData.length > 0 ? (
            <div className="space-y-3">
              {groupProgressData.map((group) => (
                <div key={group.groupId} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: group.groupColor || "#6b7280",
                    }}
                  />
                  <span className="text-sm font-medium min-w-[120px] truncate">
                    {group.groupName}
                  </span>
                  <div className="flex-1">
                    <Progress value={group.progressPercent} className="h-2" />
                  </div>
                  <span className="text-sm text-muted-foreground min-w-[80px] text-right">
                    {group.done}/{group.total} ({group.progressPercent}%)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No groups defined
            </div>
          )}
        </CardContent>
      </Card>

      {/* Row 4: Priority Distribution and Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">
              Priority Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {priorityChartData.length > 0 ? (
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityChartData} layout="vertical">
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="name"
                      type="category"
                      tick={{ fontSize: 11 }}
                      width={70}
                    />
                    <RechartsTooltip
                      formatter={(value) => [`${value} tasks`, ""]}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {priorityChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                      <LabelList
                        dataKey="value"
                        position="right"
                        fontSize={11}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No tasks yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <QuickStatItem
                label="Unassigned"
                value={stats.unassignedTasks}
                trend={stats.unassignedTasks > 0 ? "warning" : "good"}
              />
              <QuickStatItem
                label="Stuck"
                value={stats.statusCounts?.STUCK || 0}
                trend={(stats.statusCounts?.STUCK || 0) > 0 ? "bad" : "good"}
              />
              <QuickStatItem
                label="In Progress"
                value={stats.statusCounts?.IN_PROGRESS || 0}
                trend="neutral"
              />
              <QuickStatItem
                label="Not Started"
                value={stats.statusCounts?.NOT_STARTED || 0}
                trend="neutral"
              />
              <QuickStatItem
                label="Team Members"
                value={stats.workload?.length || 0}
                trend="neutral"
              />
              <QuickStatItem
                label="Groups"
                value={stats.groupProgress?.length || 0}
                trend="neutral"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * KPI Card Component
 */
interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
  trend: "good" | "warning" | "bad" | "neutral";
  children?: React.ReactNode;
}

function KpiCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  children,
}: KpiCardProps) {
  const trendColors = {
    good: "text-green-600",
    warning: "text-yellow-600",
    bad: "text-red-600",
    neutral: "text-gray-600",
  };

  const bgColors = {
    good: "bg-green-50",
    warning: "bg-yellow-50",
    bad: "bg-red-50",
    neutral: "bg-gray-50",
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn("text-3xl font-bold mt-1", trendColors[trend])}>
              {value}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className={cn("p-2 rounded-lg", bgColors[trend])}>
            <Icon className={cn("h-5 w-5", trendColors[trend])} />
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

/**
 * Quick Stat Item Component
 */
interface QuickStatItemProps {
  label: string;
  value: number;
  trend: "good" | "warning" | "bad" | "neutral";
}

function QuickStatItem({ label, value, trend }: QuickStatItemProps) {
  const trendColors = {
    good: "text-green-600",
    warning: "text-yellow-600",
    bad: "text-red-600",
    neutral: "text-foreground",
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-lg font-semibold", trendColors[trend])}>
        {value}
      </span>
    </div>
  );
}

/**
 * Dashboard Skeleton - Loading state
 */
function DashboardSkeleton() {
  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-8 w-24 mb-1" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Group Progress */}
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-3 w-3 rounded-full" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-2 flex-1" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
