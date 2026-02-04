'use client';

/**
 * TaskCard Component
 *
 * Card display for employee tasks.
 *
 * Features:
 * - Task type icon (attestation, disclosure, approval, follow-up)
 * - Title and description
 * - Due date with relative time
 * - Status badge
 * - Action button (Complete, View, Respond)
 * - Overdue styling: red border, warning icon
 * - Click to navigate to task detail/completion page
 */

import { useRouter } from 'next/navigation';
import {
  FileCheck,
  FileText,
  CheckSquare,
  MessageSquare,
  ClipboardList,
  AlertTriangle,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Task type enum matching backend.
 */
export type TaskType =
  | 'ATTESTATION'
  | 'DISCLOSURE'
  | 'APPROVAL'
  | 'REPORT_FOLLOW_UP'
  | 'REMEDIATION_STEP';

/**
 * Task status enum matching backend.
 */
export type TaskStatus = 'PENDING' | 'OVERDUE' | 'IN_PROGRESS' | 'COMPLETED';

/**
 * Employee task interface matching backend EmployeeTask.
 */
export interface EmployeeTask {
  id: string;
  type: TaskType;
  status: TaskStatus;
  title: string;
  description?: string;
  dueDate: string | null;
  createdAt: string;
  sourceId: string;
  sourceType: string;
  metadata?: Record<string, unknown>;
  actionUrl: string;
}

export interface TaskCardProps {
  /** Task data */
  task: EmployeeTask;
  /** Additional class name */
  className?: string;
}

/**
 * Get icon component for task type.
 */
function getTaskIcon(type: TaskType): typeof FileCheck {
  switch (type) {
    case 'ATTESTATION':
      return FileCheck;
    case 'DISCLOSURE':
      return FileText;
    case 'APPROVAL':
      return CheckSquare;
    case 'REPORT_FOLLOW_UP':
      return MessageSquare;
    case 'REMEDIATION_STEP':
      return ClipboardList;
    default:
      return FileText;
  }
}

/**
 * Get display label for task type.
 */
function getTaskTypeLabel(type: TaskType): string {
  switch (type) {
    case 'ATTESTATION':
      return 'Attestation';
    case 'DISCLOSURE':
      return 'Disclosure';
    case 'APPROVAL':
      return 'Approval';
    case 'REPORT_FOLLOW_UP':
      return 'Follow-up';
    case 'REMEDIATION_STEP':
      return 'Remediation';
    default:
      return 'Task';
  }
}

/**
 * Get badge variant for task status.
 */
function getStatusBadgeVariant(
  status: TaskStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'PENDING':
      return 'secondary';
    case 'OVERDUE':
      return 'destructive';
    case 'IN_PROGRESS':
      return 'default';
    case 'COMPLETED':
      return 'outline';
    default:
      return 'secondary';
  }
}

/**
 * Get action button text for task type.
 */
function getActionLabel(type: TaskType): string {
  switch (type) {
    case 'ATTESTATION':
      return 'Acknowledge';
    case 'DISCLOSURE':
      return 'Complete';
    case 'APPROVAL':
      return 'Review';
    case 'REPORT_FOLLOW_UP':
      return 'Respond';
    case 'REMEDIATION_STEP':
      return 'Mark Done';
    default:
      return 'View';
  }
}

/**
 * Format relative due date.
 */
function formatDueDate(dueDate: string | null): string {
  if (!dueDate) return 'No due date';

  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays);
    return `Overdue by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`;
  }
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays <= 7) return `Due in ${diffDays} days`;
  return `Due ${due.toLocaleDateString()}`;
}

/**
 * TaskCard - Displays a single employee task.
 */
export function TaskCard({ task, className }: TaskCardProps) {
  const router = useRouter();
  const Icon = getTaskIcon(task.type);
  const isOverdue = task.status === 'OVERDUE';

  const handleAction = () => {
    // Navigate to the task action URL
    // Phase 9 will implement the actual completion UIs
    router.push(task.actionUrl);
  };

  const handleCardClick = () => {
    // Navigate to task detail
    router.push(task.actionUrl);
  };

  return (
    <Card
      className={cn(
        'transition-colors hover:bg-muted/50 cursor-pointer',
        isOverdue && 'border-destructive/50 bg-destructive/5',
        className
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Task type icon */}
          <div
            className={cn(
              'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
              isOverdue
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            )}
          >
            <Icon className="h-5 w-5" />
          </div>

          {/* Task content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-xs">
                {getTaskTypeLabel(task.type)}
              </Badge>
              <Badge variant={getStatusBadgeVariant(task.status)}>
                {task.status.replace('_', ' ')}
              </Badge>
            </div>

            <h3 className="font-medium text-sm truncate">{task.title}</h3>

            {task.description && (
              <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                {task.description}
              </p>
            )}

            {/* Due date */}
            <div
              className={cn(
                'flex items-center gap-1 mt-2 text-xs',
                isOverdue ? 'text-destructive' : 'text-muted-foreground'
              )}
            >
              {isOverdue ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <Clock className="h-3 w-3" />
              )}
              <span>{formatDueDate(task.dueDate)}</span>
            </div>
          </div>

          {/* Action button */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <Button
              size="sm"
              variant={isOverdue ? 'destructive' : 'default'}
              onClick={(e) => {
                e.stopPropagation();
                handleAction();
              }}
            >
              {getActionLabel(task.type)}
            </Button>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default TaskCard;
