'use client';

import { cn } from '@/lib/utils';
import { ReportStatusEnum } from '@/types/ethics-portal.types';

export interface StatusBadgeProps {
  /** Status enum value */
  status: ReportStatusEnum;
  /** Optional class name for styling */
  className?: string;
  /** Whether to show the pulsing animation for ADDITIONAL_INFO_NEEDED */
  showPulse?: boolean;
}

/**
 * Status badge component for displaying report status.
 *
 * Colors:
 * - RECEIVED: blue - report has been received
 * - UNDER_REVIEW: amber - actively being reviewed
 * - ADDITIONAL_INFO_NEEDED: orange with pulse - investigator needs more info
 * - CLOSED: gray - case is closed
 */
export function StatusBadge({
  status,
  className,
  showPulse = true,
}: StatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium',
        config.className,
        className
      )}
      role="status"
      aria-label={`Report status: ${config.label}`}
    >
      {/* Pulse indicator for ADDITIONAL_INFO_NEEDED */}
      {status === ReportStatusEnum.ADDITIONAL_INFO_NEEDED && showPulse && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-500" />
        </span>
      )}
      {config.label}
    </span>
  );
}

/**
 * Get status configuration (label and styles).
 */
function getStatusConfig(status: ReportStatusEnum): {
  label: string;
  className: string;
} {
  switch (status) {
    case ReportStatusEnum.RECEIVED:
      return {
        label: 'Received',
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      };
    case ReportStatusEnum.UNDER_REVIEW:
      return {
        label: 'Under Review',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      };
    case ReportStatusEnum.ADDITIONAL_INFO_NEEDED:
      return {
        label: 'Additional Information Needed',
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      };
    case ReportStatusEnum.CLOSED:
      return {
        label: 'Closed',
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      };
    default:
      return {
        label: 'Unknown',
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
      };
  }
}

/**
 * Get description text for a status.
 * This provides the reporter with context about what the status means.
 */
export function getStatusDescription(status: ReportStatusEnum): string {
  switch (status) {
    case ReportStatusEnum.RECEIVED:
      return 'Your report has been received and is being processed. You will be notified when it is assigned for review.';
    case ReportStatusEnum.UNDER_REVIEW:
      return 'Your report is currently under review. An investigator is looking into the matter.';
    case ReportStatusEnum.ADDITIONAL_INFO_NEEDED:
      return 'The investigator has questions about your report. Please check your messages and respond.';
    case ReportStatusEnum.CLOSED:
      return 'Your report has been reviewed and closed. Thank you for speaking up.';
    default:
      return 'Status unknown. Please check back later.';
  }
}
