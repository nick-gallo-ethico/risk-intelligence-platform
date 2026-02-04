'use client';

import { MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, getStatusDescription } from './status-badge';
import { formatRelativeTime } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import type { ReportStatus } from '@/types/ethics-portal.types';

export interface StatusViewProps {
  /** Report status data */
  reportStatus: ReportStatus;
  /** Optional class name for styling */
  className?: string;
}

/**
 * StatusView - Minimal status display for the reporter.
 *
 * Per CONTEXT.md: Shows only current status and message thread -
 * NO internal process visibility (no stage, no investigator name, no timeline).
 *
 * Displays:
 * - Reference number
 * - Current status badge
 * - Status description (1-2 sentences)
 * - Last updated timestamp
 * - Unread message indicator
 */
export function StatusView({ reportStatus, className }: StatusViewProps) {
  const {
    referenceNumber,
    status,
    statusLabel,
    statusDescription,
    hasUnreadMessages,
    unreadCount,
    lastUpdated,
  } = reportStatus;

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="pt-6">
        {/* Reference Number */}
        <div className="text-sm text-muted-foreground mb-2">
          Reference Number
        </div>
        <div className="text-lg font-mono font-semibold mb-4">
          {referenceNumber}
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-3 mb-4">
          <StatusBadge status={status} />
          {/* Unread Messages Indicator */}
          {hasUnreadMessages && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-primary text-primary-foreground">
              <MessageSquare className="h-3 w-3" />
              {unreadCount} new message{unreadCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Status Description */}
        <p className="text-muted-foreground mb-4">
          {statusDescription || getStatusDescription(status)}
        </p>

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground border-t pt-3">
          Last updated {formatRelativeTime(lastUpdated)}
        </div>
      </CardContent>
    </Card>
  );
}
