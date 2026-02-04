'use client';

/**
 * QaItemDetail - Read-only Detail View for QA Item
 *
 * Displays full detail of a QA item for review:
 * - Header with reference number, client, operator, time
 * - Category and severity
 * - Full content/notes
 * - Attachments list
 * - Subject info (if present)
 * - Caller info (anonymity, contact)
 * - Call metadata (duration, interpreter, demeanor)
 * - Previous QA notes (if re-review)
 */

import { formatDateTime, formatRelativeTime } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { QaItemDetail as QaItemDetailType, QaQueueFlag } from '@/types/operator.types';
import {
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  FileText,
  Flag,
  Globe,
  MessageSquare,
  Paperclip,
  Phone,
  RefreshCw,
  Shield,
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
    color: 'text-red-600 bg-red-50',
  },
  KEYWORD_TRIGGER: {
    icon: Tag,
    label: 'Keyword Match',
    color: 'text-purple-600 bg-purple-50',
  },
  HIGH_RISK_CATEGORY: {
    icon: Flag,
    label: 'High-Risk Category',
    color: 'text-orange-600 bg-orange-50',
  },
  URGENT: {
    icon: Clock,
    label: 'Urgent',
    color: 'text-red-500 bg-red-50',
  },
  RESUBMISSION: {
    icon: RefreshCw,
    label: 'Resubmission',
    color: 'text-blue-600 bg-blue-50',
  },
};

/**
 * Reporter type labels.
 */
const REPORTER_TYPE_LABELS: Record<string, string> = {
  ANONYMOUS: 'Anonymous',
  CONFIDENTIAL: 'Confidential',
  IDENTIFIED: 'Identified',
};

export interface QaItemDetailProps {
  /** The QA item detail to display */
  item: QaItemDetailType;
  /** Optional class name */
  className?: string;
}

export function QaItemDetail({ item, className }: QaItemDetailProps) {
  return (
    <div className={cn('space-y-6 overflow-y-auto', className)}>
      {/* Header Section */}
      <div className="space-y-3">
        {/* Reference and Client */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold font-mono">
              {item.referenceNumber}
            </h2>
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
              <Building2 className="h-4 w-4" />
              {item.client.name}
            </p>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <p className="flex items-center justify-end gap-1">
              <Calendar className="h-4 w-4" />
              {formatDateTime(item.createdAt)}
            </p>
            <p className="text-xs mt-1">{formatRelativeTime(item.createdAt)}</p>
          </div>
        </div>

        {/* Flags */}
        {item.flags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.flags.map((flag) => {
              const config = FLAG_CONFIG[flag];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <Badge
                  key={flag}
                  variant="outline"
                  className={cn('flex items-center gap-1', config.color)}
                >
                  <Icon className="h-3 w-3" />
                  {config.label}
                </Badge>
              );
            })}
          </div>
        )}

        {/* Category and Severity Row */}
        <div className="flex items-center gap-3">
          {item.category && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              {item.category.name}
              {item.category.code && (
                <span className="text-xs text-muted-foreground">
                  ({item.category.code})
                </span>
              )}
            </Badge>
          )}
          {item.severity && (
            <Badge
              className={cn(
                SEVERITY_COLORS[item.severity] || 'bg-gray-100 text-gray-800'
              )}
            >
              {item.severity}
            </Badge>
          )}
          <Badge variant="secondary" className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {REPORTER_TYPE_LABELS[item.reporterType] || item.reporterType}
          </Badge>
        </div>
      </div>

      {/* Operator Info */}
      <Card className="p-3">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Created by:</span>
          <span className="font-medium">{item.operator.name}</span>
        </div>
      </Card>

      {/* Summary (if present) */}
      {item.summary && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            Summary
          </h3>
          <Card className="p-4">
            <p className="text-sm whitespace-pre-wrap">{item.summary}</p>
          </Card>
        </div>
      )}

      {/* Content/Notes */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <FileText className="h-4 w-4" />
          Report Content
        </h3>
        <Card className="p-4 max-h-[300px] overflow-y-auto">
          <p className="text-sm whitespace-pre-wrap">{item.content}</p>
        </Card>
      </div>

      {/* Operator Notes (if present) */}
      {item.operatorNotes && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <User className="h-4 w-4" />
            Operator Notes
          </h3>
          <Card className="p-4 bg-muted/30">
            <p className="text-sm whitespace-pre-wrap">{item.operatorNotes}</p>
          </Card>
        </div>
      )}

      {/* Call Metadata */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
          <Phone className="h-4 w-4" />
          Call Information
        </h3>
        <Card className="p-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Duration</dt>
            <dd className="font-medium">
              {item.callMetadata.duration
                ? `${Math.floor(item.callMetadata.duration / 60)}m ${item.callMetadata.duration % 60}s`
                : 'Not recorded'}
            </dd>

            <dt className="text-muted-foreground">Interpreter</dt>
            <dd className="font-medium flex items-center gap-1">
              {item.callMetadata.interpreterUsed ? (
                <>
                  <Globe className="h-3 w-3" />
                  Yes
                  {item.callMetadata.interpreterLanguage && (
                    <span className="text-muted-foreground">
                      ({item.callMetadata.interpreterLanguage})
                    </span>
                  )}
                </>
              ) : (
                'No'
              )}
            </dd>

            <dt className="text-muted-foreground">Caller Demeanor</dt>
            <dd className="font-medium capitalize">
              {item.callMetadata.callerDemeanor || 'Not noted'}
            </dd>

            <dt className="text-muted-foreground">Callback Requested</dt>
            <dd className="font-medium">
              {item.callMetadata.callbackRequested ? (
                <>
                  Yes
                  {item.callMetadata.callbackNumber && (
                    <span className="text-muted-foreground ml-1">
                      ({item.callMetadata.callbackNumber})
                    </span>
                  )}
                </>
              ) : (
                'No'
              )}
            </dd>
          </dl>
        </Card>
      </div>

      {/* Attachments */}
      {item.attachments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <Paperclip className="h-4 w-4" />
            Attachments ({item.attachments.length})
          </h3>
          <Card className="p-4">
            <ul className="space-y-2">
              {item.attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{attachment.filename}</span>
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(attachment.size)})
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {/* Previous QA Notes (if re-review) */}
      {(item.qaNotes || item.qaRejectionReason) && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
            <RefreshCw className="h-4 w-4" />
            Previous QA Review
          </h3>
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            {item.qaRejectionReason && (
              <div className="mb-2">
                <p className="text-sm font-medium text-red-700">
                  Rejection Reason:
                </p>
                <p className="text-sm mt-1">{item.qaRejectionReason}</p>
              </div>
            )}
            {item.qaNotes && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Reviewer Notes:
                </p>
                <p className="text-sm mt-1">{item.qaNotes}</p>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}

/**
 * Loading skeleton for QA item detail.
 */
export function QaItemDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      <Skeleton className="h-12 w-full" />
      <div>
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-32 w-full" />
      </div>
      <div>
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-48 w-full" />
      </div>
      <div>
        <Skeleton className="h-4 w-28 mb-2" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

/**
 * Format file size for display.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
