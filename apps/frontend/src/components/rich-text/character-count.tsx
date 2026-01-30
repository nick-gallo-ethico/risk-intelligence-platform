'use client';

import { cn } from '@/lib/utils';

interface CharacterCountProps {
  /** Current character count */
  current: number;
  /** Maximum allowed characters */
  limit: number;
  /** Character count at which to show warning (yellow) */
  warnAt?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays character count with color-coded limits.
 *
 * States:
 * - Normal (gray): Under warnAt threshold
 * - Warning (yellow): At or above warnAt threshold
 * - Error (red): At or above limit
 */
export function CharacterCount({
  current,
  limit,
  warnAt = Math.floor(limit * 0.9), // Default to 90% of limit
  className,
}: CharacterCountProps) {
  const isOverLimit = current >= limit;
  const isWarning = current >= warnAt && current < limit;

  const percentage = Math.min((current / limit) * 100, 100);

  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 border-t text-sm',
        className
      )}
    >
      <div className="flex items-center gap-2">
        {/* Progress bar */}
        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-200',
              isOverLimit
                ? 'bg-destructive'
                : isWarning
                  ? 'bg-yellow-500'
                  : 'bg-primary'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Character count text */}
      <span
        className={cn(
          'font-mono tabular-nums',
          isOverLimit
            ? 'text-destructive font-medium'
            : isWarning
              ? 'text-yellow-600 dark:text-yellow-500'
              : 'text-muted-foreground'
        )}
      >
        {current.toLocaleString()} / {limit.toLocaleString()}
        {isOverLimit && (
          <span className="ml-2 text-xs">(limit exceeded)</span>
        )}
      </span>
    </div>
  );
}
