"use client";

/**
 * Checklist Panel Component
 *
 * Displays checklist tasks grouped by phase with:
 * - Expandable phase sections
 * - Progress bar per phase
 * - Task toggle for complete/pending
 * - Required task indicators
 */

import { useState } from "react";
import {
  CheckCircle,
  Circle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface ChecklistPanelProps {
  phase: string;
  tasks: Array<{
    id: string;
    name: string;
    status: string;
    isRequired: boolean;
    dueDate: string | null;
    notes: string | null;
  }>;
  onTaskUpdate: (taskId: string, status: string) => void;
}

const STATUS_ICONS: Record<string, typeof Circle> = {
  PENDING: Circle,
  IN_PROGRESS: Clock,
  COMPLETED: CheckCircle,
  BLOCKED: AlertCircle,
  SKIPPED: Circle,
};

function formatPhase(phase: string): string {
  return phase
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export function ChecklistPanel({
  phase,
  tasks,
  onTaskUpdate,
}: ChecklistPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const progress =
    tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  // Determine phase status icon color
  const phaseStatus =
    progress === 100
      ? "text-green-500"
      : progress > 0
        ? "text-blue-500"
        : "text-gray-300 dark:text-gray-600";

  return (
    <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
      {/* Phase header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          )}
          <span className="font-medium text-foreground">
            {formatPhase(phase)}
          </span>
          <span className="text-sm text-muted-foreground">
            {completedCount}/{tasks.length} complete
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{progress}%</span>
          <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full transition-all rounded-full",
                progress === 100
                  ? "bg-green-500"
                  : progress > 0
                    ? "bg-blue-500"
                    : "bg-secondary",
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </button>

      {/* Task list */}
      {isExpanded && (
        <div className="border-t divide-y divide-border">
          {tasks.map((task) => {
            const Icon = STATUS_ICONS[task.status] || Circle;
            const isCompleted = task.status === "COMPLETED";
            const isBlocked = task.status === "BLOCKED";
            const isInProgress = task.status === "IN_PROGRESS";

            return (
              <div
                key={task.id}
                className={cn(
                  "p-3 flex items-start gap-3 hover:bg-muted/50 transition-colors",
                  isBlocked && "bg-red-50 dark:bg-red-900/20",
                )}
              >
                <button
                  onClick={() => {
                    const newStatus = isCompleted ? "PENDING" : "COMPLETED";
                    onTaskUpdate(task.id, newStatus);
                  }}
                  className="flex-shrink-0 mt-0.5"
                  disabled={isBlocked}
                  title={
                    isBlocked ? "Resolve blocker first" : "Toggle completion"
                  }
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-colors",
                      isCompleted
                        ? "text-green-500 hover:text-green-600"
                        : isBlocked
                          ? "text-red-500"
                          : isInProgress
                            ? "text-blue-500"
                            : "text-gray-300 hover:text-gray-400 dark:text-gray-600 dark:hover:text-gray-500",
                    )}
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm",
                      isCompleted && "line-through text-muted-foreground",
                    )}
                  >
                    {task.name}
                    {task.isRequired && (
                      <span className="ml-2 text-xs text-red-500 dark:text-red-400 font-medium">
                        *required
                      </span>
                    )}
                  </div>
                  {task.notes && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {task.notes}
                    </div>
                  )}
                  {task.dueDate && !isCompleted && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due: {format(new Date(task.dueDate), "MMM d")}
                    </div>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded",
                    isCompleted
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                      : isBlocked
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                        : isInProgress
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",
                  )}
                >
                  {task.status.replace(/_/g, " ")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
