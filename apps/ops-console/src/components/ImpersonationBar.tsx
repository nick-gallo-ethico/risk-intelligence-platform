'use client';

import { useEffect, useState } from 'react';
import { useImpersonation } from '@/hooks/useImpersonation';
import { Shield, X, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Persistent impersonation indicator bar.
 *
 * Per CONTEXT.md:
 * - Shows when impersonating a client tenant
 * - Displays remaining session time
 * - Prominent visual indicator (colored border/bar)
 * - One-click end session
 * - Warning state when time is low (<15 min)
 *
 * This bar is always visible at the top of the page when impersonating,
 * ensuring operators always know they're in client context.
 */
export function ImpersonationBar() {
  const { session, isImpersonating, remainingSeconds, endSession, isEnding } = useImpersonation();
  const [isExpiring, setIsExpiring] = useState(false);

  // Check if session is about to expire (less than 15 minutes)
  useEffect(() => {
    setIsExpiring(remainingSeconds > 0 && remainingSeconds < 15 * 60);
  }, [remainingSeconds]);

  // Don't render if not impersonating
  if (!isImpersonating || !session) {
    return null;
  }

  // Format remaining time
  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const timeDisplay =
    hours > 0
      ? `${hours}h ${minutes}m remaining`
      : minutes > 0
        ? `${minutes}m ${seconds}s remaining`
        : `${seconds}s remaining`;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'sticky top-0 z-50 flex items-center justify-between px-4 py-2 text-sm',
        'border-b-4 transition-colors duration-300',
        isExpiring
          ? 'bg-yellow-100 border-yellow-500 text-yellow-900'
          : 'bg-blue-100 border-blue-500 text-blue-900'
      )}
    >
      {/* Left side - Session info */}
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'p-1.5 rounded-md',
            isExpiring ? 'bg-yellow-200' : 'bg-blue-200'
          )}
        >
          <Shield className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold">Impersonating:</span>
          <span className="font-medium">
            {session.organizationName || session.organizationId}
          </span>
          {session.organizationSlug && (
            <span className="text-xs opacity-75">({session.organizationSlug})</span>
          )}
        </div>

        {/* Reason badge */}
        {session.reason && (
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full',
              isExpiring ? 'bg-yellow-200/50' : 'bg-white/50'
            )}
          >
            {session.reason}
          </span>
        )}
      </div>

      {/* Right side - Timer and end session */}
      <div className="flex items-center gap-4">
        {/* Time remaining */}
        <div
          className={cn(
            'flex items-center gap-1.5',
            isExpiring && 'font-bold animate-pulse'
          )}
        >
          {isExpiring ? (
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Clock className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{timeDisplay}</span>
        </div>

        {/* End session button */}
        <button
          onClick={() => endSession()}
          disabled={isEnding}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-md',
            'text-sm font-medium transition-colors',
            isExpiring
              ? 'bg-yellow-200 hover:bg-yellow-300 text-yellow-900'
              : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-300',
            isEnding && 'opacity-50 cursor-not-allowed'
          )}
          aria-label="End impersonation session"
        >
          <X className="h-4 w-4" aria-hidden="true" />
          <span>{isEnding ? 'Ending...' : 'End Session'}</span>
        </button>
      </div>
    </div>
  );
}
