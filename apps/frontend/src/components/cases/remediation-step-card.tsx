'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Calendar,
  User,
  Check,
  MoreHorizontal,
  SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { RemediationStep, RemediationStepStatus } from '@/types/remediation';

interface RemediationStepCardProps {
  step: RemediationStep;
  onComplete?: (stepId: string) => void;
  onSkip?: (stepId: string) => void;
  isDragging?: boolean;
}

/**
 * Get badge variant and label for step status.
 */
function getStatusBadge(status: RemediationStepStatus): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  label: string;
  className: string;
} {
  switch (status) {
    case 'PENDING':
      return {
        variant: 'secondary',
        label: 'Pending',
        className: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
      };
    case 'IN_PROGRESS':
      return {
        variant: 'default',
        label: 'In Progress',
        className: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
      };
    case 'COMPLETED':
      return {
        variant: 'default',
        label: 'Completed',
        className: 'bg-green-100 text-green-700 hover:bg-green-100',
      };
    case 'SKIPPED':
      return {
        variant: 'secondary',
        label: 'Skipped',
        className: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
      };
    case 'AWAITING_APPROVAL':
      return {
        variant: 'default',
        label: 'Awaiting Approval',
        className: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
      };
    default:
      return {
        variant: 'outline',
        label: status,
        className: '',
      };
  }
}

/**
 * Check if a date is overdue (before today).
 */
function isOverdue(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Check if a date is due soon (within 3 days).
 */
function isDueSoon(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(today.getDate() + 3);
  return date >= today && date <= threeDaysFromNow;
}

/**
 * Get initials from a name.
 */
function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Draggable remediation step card component.
 */
export function RemediationStepCard({
  step,
  onComplete,
  onSkip,
  isDragging: externalIsDragging,
}: RemediationStepCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: sortableIsDragging,
  } = useSortable({
    id: step.id,
    data: { type: 'step', step },
  });

  const isDragging = externalIsDragging || sortableIsDragging;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const statusBadge = getStatusBadge(step.status);
  const assigneeName =
    step.assigneeName || step.externalAssigneeName || null;
  const isCompleted = step.status === 'COMPLETED' || step.status === 'SKIPPED';
  const canComplete = !isCompleted && step.status !== 'AWAITING_APPROVAL';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-start gap-3 p-3 bg-white rounded-lg border transition-all',
        isDragging && 'opacity-50 shadow-lg',
        !isDragging && 'hover:border-primary/50'
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded mt-0.5 flex-shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-gray-400" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header Row: Status + Title */}
        <div className="flex items-start gap-2">
          <Badge variant={statusBadge.variant} className={cn('flex-shrink-0', statusBadge.className)}>
            {statusBadge.label}
          </Badge>
          <span
            className={cn(
              'font-medium text-sm',
              isCompleted && 'text-gray-500 line-through'
            )}
          >
            {step.title}
          </span>
        </div>

        {/* Description */}
        {step.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {step.description}
          </p>
        )}

        {/* Meta Row: Assignee + Due Date */}
        <div className="flex items-center gap-4 text-xs text-gray-500">
          {/* Assignee */}
          <div className="flex items-center gap-1.5">
            {assigneeName ? (
              <>
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="text-[10px] bg-gray-200">
                    {getInitials(assigneeName)}
                  </AvatarFallback>
                </Avatar>
                <span>{assigneeName}</span>
              </>
            ) : (
              <>
                <User className="h-3.5 w-3.5" />
                <span className="text-gray-400">Unassigned</span>
              </>
            )}
          </div>

          {/* Due Date */}
          {step.dueDate && (
            <div
              className={cn(
                'flex items-center gap-1',
                !isCompleted && isOverdue(step.dueDate) && 'text-red-600',
                !isCompleted && !isOverdue(step.dueDate) && isDueSoon(step.dueDate) && 'text-amber-600'
              )}
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>
                {new Date(step.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              {!isCompleted && isOverdue(step.dueDate) && (
                <span className="text-[10px] font-medium ml-0.5">(Overdue)</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {canComplete && (onComplete || onSkip) && (
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onComplete && (
                <DropdownMenuItem onClick={() => onComplete(step.id)}>
                  <Check className="mr-2 h-4 w-4" />
                  Mark Complete
                </DropdownMenuItem>
              )}
              {onSkip && (
                <DropdownMenuItem onClick={() => onSkip(step.id)}>
                  <SkipForward className="mr-2 h-4 w-4" />
                  Skip Step
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}
