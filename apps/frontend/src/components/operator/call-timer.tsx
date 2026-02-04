'use client';

/**
 * CallTimer - Call Duration Timer Component
 *
 * Displays the current call duration in MM:SS format.
 * Shows visual indicator when call is on hold.
 */

import { cn } from '@/lib/utils';
import { Clock, Pause } from 'lucide-react';

export interface CallTimerProps {
  /** Duration in seconds */
  duration: number;
  /** Whether the timer is actively counting (not on hold) */
  isActive: boolean;
}

export function CallTimer({ duration, isActive }: CallTimerProps) {
  // Format seconds to MM:SS
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-sm',
        isActive ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400'
      )}
    >
      {isActive ? (
        <Clock className="h-4 w-4" />
      ) : (
        <Pause className="h-4 w-4 animate-pulse" />
      )}
      <span>{formatDuration(duration)}</span>
      {!isActive && (
        <span className="text-xs font-normal ml-1">(Hold)</span>
      )}
    </div>
  );
}
