'use client';

import { cn } from '@/lib/utils';
import { format, differenceInDays, isPast } from 'date-fns';
import {
  CheckCircle2,
  Circle,
  AlertTriangle,
  Clock,
  XCircle,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import type { MilestoneResponseDto, MilestoneStatus } from '@/types/milestone';

interface MilestoneTimelineProps {
  milestones: MilestoneResponseDto[];
  onMilestoneClick?: (milestone: MilestoneResponseDto) => void;
  className?: string;
}

const statusConfig: Record<
  MilestoneStatus,
  {
    icon: typeof Circle;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  NOT_STARTED: {
    icon: Circle,
    color: 'text-slate-400',
    bgColor: 'bg-slate-100',
    label: 'Not Started',
  },
  IN_PROGRESS: {
    icon: Clock,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    label: 'In Progress',
  },
  AT_RISK: {
    icon: AlertTriangle,
    color: 'text-amber-500',
    bgColor: 'bg-amber-100',
    label: 'At Risk',
  },
  COMPLETED: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-100',
    label: 'Completed',
  },
  CANCELLED: {
    icon: XCircle,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    label: 'Cancelled',
  },
};

/**
 * MilestoneTimeline provides a list-based view of milestones as an alternative
 * to the Gantt chart. Useful for simpler milestone tracking or mobile views.
 *
 * Features:
 * - Vertical timeline with status icons
 * - Progress bars for each milestone
 * - Days remaining/overdue badges
 * - Click to view milestone details
 */
export function MilestoneTimeline({
  milestones,
  onMilestoneClick,
  className,
}: MilestoneTimelineProps) {
  // Sort milestones by target date
  const sortedMilestones = [...milestones].sort(
    (a, b) =>
      new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()
  );

  return (
    <div className={cn('relative', className)}>
      {/* Timeline vertical line */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />

      <div className="space-y-4">
        {sortedMilestones.map((milestone) => {
          const config = statusConfig[milestone.status];
          const Icon = config.icon;
          const targetDate = new Date(milestone.targetDate);
          const daysUntil = differenceInDays(targetDate, new Date());
          const isOverdue =
            isPast(targetDate) && milestone.status !== 'COMPLETED';

          return (
            <div
              key={milestone.id}
              className={cn(
                'relative pl-12 cursor-pointer group',
                'transition-colors hover:bg-slate-50 rounded-lg p-3 -ml-3'
              )}
              onClick={() => onMilestoneClick?.(milestone)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onMilestoneClick?.(milestone);
                }
              }}
            >
              {/* Status icon on the timeline */}
              <div
                className={cn(
                  'absolute left-2 top-4 w-7 h-7 rounded-full flex items-center justify-center',
                  config.bgColor
                )}
              >
                <Icon className={cn('h-4 w-4', config.color)} />
              </div>

              {/* Milestone content */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h4 className="font-medium group-hover:text-primary">
                      {milestone.name}
                    </h4>
                    {milestone.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {milestone.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant={isOverdue ? 'destructive' : 'secondary'}>
                      {isOverdue
                        ? `${Math.abs(daysUntil)} days overdue`
                        : daysUntil === 0
                          ? 'Due today'
                          : `${daysUntil} days left`}
                    </Badge>
                    <Badge variant="outline" className={config.color}>
                      {config.label}
                    </Badge>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Progress value={milestone.progressPercent} className="h-2" />
                  </div>
                  <span className="text-sm text-muted-foreground w-20 text-right">
                    {milestone.progressPercent}% ({milestone.completedItems}/
                    {milestone.totalItems})
                  </span>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Target: {format(targetDate, 'MMM d, yyyy')}</span>
                  {milestone.owner && (
                    <span>Owner: {milestone.owner.name}</span>
                  )}
                  <span className="capitalize">
                    Category: {milestone.category.toLowerCase()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {sortedMilestones.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No milestones found. Create one to start tracking progress.
          </div>
        )}
      </div>
    </div>
  );
}
