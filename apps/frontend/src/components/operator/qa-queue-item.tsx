'use client';

/**
 * QaQueueItem - Single Item in QA Queue List
 *
 * Displays a QA queue item with:
 * - Reference number and category
 * - Severity badge (color-coded)
 * - Client and operator names
 * - Time in queue
 * - Priority flags
 * - Claim button or claimed-by indicator
 */

import { formatRelativeTime } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import type { QaQueueItem as QaQueueItemType, QaQueueFlag } from '@/types/operator.types';
import {
  AlertTriangle,
  Clock,
  Flag,
  Loader2,
  Phone,
  RefreshCw,
  Tag,
  User,
} from 'lucide-react';

/**
 * Severity colors mapping.
 */
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  LOW: 'bg-green-100 text-green-800 border-green-200',
};

/**
 * Flag display configuration.
 */
const FLAG_CONFIG: Record<
  QaQueueFlag,
  { icon: React.ComponentType<{ className?: string }>; label: string; color: string }
> = {
  HIGH_SEVERITY: {
    icon: AlertTriangle,
    label: 'High Severity',
    color: 'text-red-600',
  },
  KEYWORD_TRIGGER: {
    icon: Tag,
    label: 'Keyword Match',
    color: 'text-purple-600',
  },
  HIGH_RISK_CATEGORY: {
    icon: Flag,
    label: 'High-Risk Category',
    color: 'text-orange-600',
  },
  URGENT: {
    icon: Clock,
    label: 'Urgent',
    color: 'text-red-500',
  },
  RESUBMISSION: {
    icon: RefreshCw,
    label: 'Resubmission',
    color: 'text-blue-600',
  },
};

export interface QaQueueItemProps {
  /** The queue item to display */
  item: QaQueueItemType;
  /** Called when user clicks claim button */
  onClaim: (riuId: string) => void;
  /** Whether a claim operation is in progress for this item */
  isClaiming?: boolean;
  /** Whether this item is currently selected */
  isSelected?: boolean;
  /** Called when item row is clicked */
  onClick?: (riuId: string) => void;
  /** Current user ID (to check if item is claimed by current user) */
  currentUserId?: string;
}

export function QaQueueItem({
  item,
  onClaim,
  isClaiming = false,
  isSelected = false,
  onClick,
  currentUserId,
}: QaQueueItemProps) {
  const isClaimedByOther =
    item.qaStatus === 'IN_REVIEW' && item.qaReviewerId !== currentUserId;
  const isClaimedBySelf =
    item.qaStatus === 'IN_REVIEW' && item.qaReviewerId === currentUserId;
  const canClaim = item.qaStatus === 'PENDING' && !isClaiming;

  const handleClick = () => {
    onClick?.(item.riuId);
  };

  const handleClaimClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canClaim) {
      onClaim(item.riuId);
    }
  };

  return (
    <Card
      className={cn(
        'p-4 cursor-pointer transition-colors hover:bg-muted/50',
        isSelected && 'ring-2 ring-primary bg-muted/30',
        isClaimedByOther && 'opacity-60'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Left: Main info */}
        <div className="flex-1 min-w-0">
          {/* Reference and Category */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-semibold text-foreground">
              {item.referenceNumber}
            </span>
            {item.category && (
              <Badge variant="outline" className="text-xs">
                {item.category}
              </Badge>
            )}
          </div>

          {/* Client and Operator */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {item.clientName}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {item.operatorName}
            </span>
          </div>

          {/* Flags */}
          {item.flags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.flags.map((flag) => {
                const config = FLAG_CONFIG[flag];
                if (!config) return null;
                const Icon = config.icon;
                return (
                  <span
                    key={flag}
                    className={cn(
                      'inline-flex items-center gap-1 text-xs',
                      config.color
                    )}
                    title={config.label}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="sr-only">{config.label}</span>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Severity, Time, and Action */}
        <div className="flex flex-col items-end gap-2">
          {/* Severity badge */}
          {item.severityScore && (
            <Badge
              className={cn(
                'text-xs',
                SEVERITY_COLORS[item.severityScore] || 'bg-gray-100 text-gray-800'
              )}
            >
              {item.severityScore}
            </Badge>
          )}

          {/* Time in queue */}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatRelativeTime(item.createdAt)}
          </span>

          {/* Claim button or status */}
          {isClaimedByOther ? (
            <span className="text-xs text-muted-foreground italic">
              Being reviewed
            </span>
          ) : isClaimedBySelf ? (
            <Badge variant="secondary" className="text-xs">
              Your claim
            </Badge>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={handleClaimClick}
              disabled={!canClaim}
              className="h-7 text-xs"
            >
              {isClaiming ? (
                <>
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  Claiming...
                </>
              ) : (
                'Claim'
              )}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
