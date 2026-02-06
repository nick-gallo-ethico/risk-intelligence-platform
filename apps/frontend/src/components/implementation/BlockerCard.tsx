'use client';

/**
 * Blocker Card Component
 *
 * Displays a single blocker with:
 * - Title and description
 * - Category badge
 * - Time since creation
 * - Escalation status indicator
 */

import { AlertTriangle, Clock, ArrowUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface BlockerCardProps {
  blocker: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    status: string;
    createdAt: string;
    escalatedToManagerAt: string | null;
    escalatedToDirectorAt: string | null;
  };
}

function formatCategory(category: string): string {
  return category
    .replace(/_/g, ' ')
    .toLowerCase();
}

export function BlockerCard({ blocker }: BlockerCardProps) {
  const isEscalatedToManager = !!blocker.escalatedToManagerAt;
  const isEscalatedToDirector = !!blocker.escalatedToDirectorAt;
  const isEscalated = isEscalatedToManager || isEscalatedToDirector;
  const isResolved = blocker.status === 'RESOLVED';

  // Determine card styling based on escalation level
  const cardStyles = isResolved
    ? 'border-gray-200 bg-gray-50'
    : isEscalatedToDirector
      ? 'border-red-400 bg-red-50'
      : isEscalatedToManager
        ? 'border-orange-300 bg-orange-50'
        : 'border-yellow-300 bg-yellow-50';

  const iconColor = isResolved
    ? 'text-gray-400'
    : isEscalatedToDirector
      ? 'text-red-500'
      : isEscalatedToManager
        ? 'text-orange-500'
        : 'text-yellow-500';

  return (
    <div
      className={cn(
        'p-4 border rounded-lg transition-all',
        cardStyles,
        isResolved && 'opacity-60'
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className={cn('h-5 w-5 mt-0.5 flex-shrink-0', iconColor)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div
              className={cn(
                'font-medium text-sm',
                isResolved && 'line-through text-gray-500'
              )}
            >
              {blocker.title}
            </div>
            {isResolved && (
              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded flex-shrink-0">
                Resolved
              </span>
            )}
          </div>

          {blocker.description && (
            <p
              className={cn(
                'text-xs mt-1',
                isResolved ? 'text-gray-400' : 'text-gray-600'
              )}
            >
              {blocker.description}
            </p>
          )}

          <div className="flex items-center flex-wrap gap-2 mt-3">
            {/* Category badge */}
            <span className="px-2 py-0.5 bg-white rounded text-xs text-gray-600 border">
              {formatCategory(blocker.category)}
            </span>

            {/* Time created */}
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(blocker.createdAt), {
                addSuffix: true,
              })}
            </span>

            {/* Escalation indicator */}
            {isEscalated && !isResolved && (
              <span
                className={cn(
                  'flex items-center gap-1 text-xs font-medium',
                  isEscalatedToDirector ? 'text-red-600' : 'text-orange-600'
                )}
              >
                <ArrowUp className="h-3 w-3" />
                {isEscalatedToDirector
                  ? 'Escalated to Director'
                  : 'Escalated to Manager'}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
