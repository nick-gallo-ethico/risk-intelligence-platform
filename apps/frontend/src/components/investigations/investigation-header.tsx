'use client';

import { Badge } from '@/components/ui/badge';
import { Calendar, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Investigation, InvestigationStatus, SlaStatus } from '@/types/investigation';

interface InvestigationHeaderProps {
  investigation: Investigation;
}

/**
 * Status badge color mapping
 */
const STATUS_COLORS: Record<InvestigationStatus, { bg: string; text: string }> = {
  NEW: { bg: 'bg-gray-100', text: 'text-gray-700' },
  ASSIGNED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  INVESTIGATING: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  PENDING_REVIEW: { bg: 'bg-orange-100', text: 'text-orange-700' },
  CLOSED: { bg: 'bg-green-100', text: 'text-green-700' },
  ON_HOLD: { bg: 'bg-red-100', text: 'text-red-700' },
};

/**
 * SLA status styling
 */
const SLA_STYLES: Record<SlaStatus, { bg: string; text: string; icon: string }> = {
  ON_TRACK: { bg: 'bg-green-50', text: 'text-green-700', icon: 'text-green-500' },
  WARNING: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: 'text-yellow-500' },
  OVERDUE: { bg: 'bg-red-50', text: 'text-red-700', icon: 'text-red-500' },
};

/**
 * Format date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format date relative to today
 */
function formatDueDate(dateString: string | null): { text: string; isOverdue: boolean } {
  if (!dateString) return { text: 'No due date', isOverdue: false };

  const dueDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const diffTime = dueDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { text: `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} overdue`, isOverdue: true };
  } else if (diffDays === 0) {
    return { text: 'Due today', isOverdue: false };
  } else if (diffDays === 1) {
    return { text: 'Due tomorrow', isOverdue: false };
  } else if (diffDays <= 7) {
    return { text: `Due in ${diffDays} days`, isOverdue: false };
  }

  return { text: formatDate(dateString), isOverdue: false };
}

/**
 * Header component for investigation detail panel
 */
export function InvestigationHeader({ investigation }: InvestigationHeaderProps) {
  const statusColors = STATUS_COLORS[investigation.status];
  const slaStyles = SLA_STYLES[investigation.slaStatus];
  const dueInfo = formatDueDate(investigation.dueDate);

  return (
    <div className="space-y-4 pb-4 border-b">
      {/* Investigation number and status */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Investigation #{investigation.investigationNumber}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Created {formatDate(investigation.createdAt)}
          </p>
        </div>

        {/* Status badge */}
        <Badge
          className={cn(
            'text-sm font-medium border-0 px-3 py-1',
            statusColors.bg,
            statusColors.text
          )}
        >
          {investigation.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* Type, Department, and SLA row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Investigation type */}
        <Badge variant="outline" className="font-normal">
          {investigation.investigationType}
        </Badge>

        {/* Department */}
        {investigation.department && (
          <Badge variant="outline" className="font-normal">
            {investigation.department}
          </Badge>
        )}

        {/* SLA indicator */}
        <div
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
            slaStyles.bg,
            slaStyles.text
          )}
        >
          {investigation.slaStatus === 'OVERDUE' ? (
            <AlertCircle className={cn('h-3.5 w-3.5', slaStyles.icon)} />
          ) : (
            <Clock className={cn('h-3.5 w-3.5', slaStyles.icon)} />
          )}
          <span>{investigation.slaStatus.replace('_', ' ')}</span>
        </div>
      </div>

      {/* Due date */}
      {investigation.dueDate && (
        <div
          className={cn(
            'flex items-center gap-2 text-sm',
            dueInfo.isOverdue ? 'text-red-600' : 'text-muted-foreground'
          )}
        >
          <Calendar className="h-4 w-4" />
          <span>{dueInfo.text}</span>
        </div>
      )}
    </div>
  );
}
