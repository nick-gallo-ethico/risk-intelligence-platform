"use client";

import { ListTodo, Plus, CheckCircle2 } from "lucide-react";
import { AssociationCard } from "@/components/ui/association-card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

/**
 * Task entity for the TasksCard component.
 */
export interface CaseTask {
  id: string;
  title: string;
  dueDate?: string;
  assigneeName?: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface TasksCardProps {
  /** Case ID for linking */
  caseId: string;
  /** List of tasks to display */
  tasks: CaseTask[];
  /** Handler for creating a new task */
  onCreateTask: () => void;
  /** Handler for toggling task completion */
  onToggleComplete: (taskId: string, completed: boolean) => void;
}

/**
 * Format date to short display (e.g., "Feb 15")
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * TasksCard displays open and recently completed tasks for a case.
 *
 * Per spec Section 17.3:
 * - Shows open tasks first, then recently completed
 * - Checkbox to complete inline
 * - Max 5 tasks displayed
 * - Uses AssociationCard wrapper for HubSpot-style association cards
 */
export function TasksCard({
  caseId,
  tasks,
  onCreateTask,
  onToggleComplete,
}: TasksCardProps) {
  // Sort tasks: open first, then completed (recently completed first)
  const sortedTasks = [...tasks].sort((a, b) => {
    // Open tasks come first
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    // For completed tasks, sort by completedAt (most recent first)
    if (a.isCompleted && b.isCompleted && a.completedAt && b.completedAt) {
      return (
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
    }
    // For open tasks, sort by dueDate (earliest first)
    if (!a.isCompleted && !b.isCompleted && a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  });

  // Limit to 5 tasks
  const displayTasks = sortedTasks.slice(0, 5);
  const openCount = tasks.filter((t) => !t.isCompleted).length;
  const totalCount = tasks.length;

  return (
    <AssociationCard
      title="Tasks"
      count={totalCount}
      icon={ListTodo}
      onAdd={onCreateTask}
      viewAllHref={`/cases/${caseId}?tab=overview#tasks`}
      viewAllLabel="View all tasks"
    >
      {tasks.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-1">No tasks</p>
          <p className="text-xs text-muted-foreground">
            Create a task to track action items for this case.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {displayTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onToggle={(completed) => onToggleComplete(task.id, completed)}
            />
          ))}
          {openCount > 0 && totalCount > displayTasks.length && (
            <p className="text-xs text-muted-foreground pt-2">
              +{totalCount - displayTasks.length} more tasks
            </p>
          )}
        </div>
      )}
    </AssociationCard>
  );
}

/**
 * Individual task row with checkbox.
 */
function TaskRow({
  task,
  onToggle,
}: {
  task: CaseTask;
  onToggle: (completed: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 py-2 group">
      <Checkbox
        checked={task.isCompleted}
        onCheckedChange={(checked) => onToggle(checked === true)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium truncate",
              task.isCompleted && "line-through text-muted-foreground",
            )}
            title={task.title}
          >
            {task.title}
          </p>
          {task.dueDate && (
            <span
              className={cn(
                "text-xs shrink-0",
                task.isCompleted
                  ? "text-muted-foreground"
                  : "text-muted-foreground",
              )}
            >
              {task.isCompleted && task.completedAt ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {formatDate(task.completedAt)}
                </span>
              ) : (
                formatDate(task.dueDate)
              )}
            </span>
          )}
        </div>
        {task.assigneeName && (
          <p className="text-xs text-muted-foreground truncate">
            {task.assigneeName}
          </p>
        )}
      </div>
    </div>
  );
}

export default TasksCard;
