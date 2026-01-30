'use client';

import { cn } from '@/lib/utils';
import type { CaseStatus } from '@/types/case';

const STATUS_COLORS: Record<CaseStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800 border-blue-200',
  OPEN: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  CLOSED: 'bg-gray-100 text-gray-800 border-gray-200',
};

const STATUS_LABELS: Record<CaseStatus, string> = {
  NEW: 'New',
  OPEN: 'Open',
  CLOSED: 'Closed',
};

interface StatusBadgeProps {
  status: CaseStatus;
  className?: string;
}

/**
 * Status badge component for case status display.
 * Uses consistent color coding across the application.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        STATUS_COLORS[status],
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

export { STATUS_COLORS, STATUS_LABELS };
