'use client';

import { cn } from '@/lib/utils';

/**
 * Save status for draft indicator.
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'unsaved' | 'error';

/**
 * Props for DraftIndicator component.
 */
export interface DraftIndicatorProps {
  /** Current save status */
  status: SaveStatus;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Status configuration for display.
 */
interface StatusConfig {
  label: string;
  icon: React.ReactNode;
  className: string;
}

/**
 * Get status configuration for display.
 */
function getStatusConfig(status: SaveStatus): StatusConfig {
  switch (status) {
    case 'saving':
      return {
        label: 'Saving...',
        icon: (
          <svg
            className="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ),
        className: 'text-muted-foreground',
      };
    case 'saved':
      return {
        label: 'All changes saved',
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        ),
        className: 'text-green-600',
      };
    case 'unsaved':
      return {
        label: 'Unsaved changes',
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="12" r="3" fill="currentColor" />
          </svg>
        ),
        className: 'text-amber-600',
      };
    case 'error':
      return {
        label: 'Save failed',
        icon: (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        ),
        className: 'text-destructive',
      };
    case 'idle':
    default:
      return {
        label: '',
        icon: null,
        className: 'text-transparent',
      };
  }
}

/**
 * Draft save status indicator component.
 *
 * Shows:
 * - "Saving..." with spinner when actively saving
 * - "All changes saved" with checkmark after successful save
 * - "Unsaved changes" with dot when there are pending changes
 * - "Save failed" with warning when save fails
 * - Hidden when idle (no activity)
 *
 * Non-intrusive indicator that provides save state feedback.
 */
export function DraftIndicator({ status, className }: DraftIndicatorProps) {
  const config = getStatusConfig(status);

  // Don't render anything when idle
  if (status === 'idle') {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs transition-opacity',
        config.className,
        className
      )}
      role="status"
      aria-live="polite"
    >
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
}

// ===========================================
// Attachment Upload Components
// ===========================================

/**
 * Attachment metadata for evidence chain.
 */
export interface AttachmentMeta {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  hash: string;
  uploadedAt: Date;
  uploadedBy: string;
  fieldId?: string;
  version: number;
  previousVersionId?: string;
}

/**
 * Props for AttachmentEvidenceChain component.
 */
export interface AttachmentEvidenceChainProps {
  /** Attachment metadata */
  attachment: AttachmentMeta;
  /** Whether to show detailed chain info */
  showDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format file size for display.
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format date for display.
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

/**
 * Truncate hash for display.
 */
function truncateHash(hash: string, length: number = 12): string {
  if (hash.length <= length) return hash;
  return `${hash.slice(0, length / 2)}...${hash.slice(-length / 2)}`;
}

/**
 * Evidence chain display for a single attachment.
 *
 * Shows:
 * - Upload timestamp
 * - Original filename
 * - SHA-256 hash (truncated)
 * - Version indicator if replaced
 *
 * Provides compliance-grade audit information for attachments.
 */
export function AttachmentEvidenceChain({
  attachment,
  showDetails = false,
  className,
}: AttachmentEvidenceChainProps) {
  return (
    <div
      className={cn(
        'text-xs text-muted-foreground space-y-1 border-l-2 border-muted pl-2',
        className
      )}
    >
      {/* Timestamp */}
      <div className="flex items-center gap-1">
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{formatDate(new Date(attachment.uploadedAt))}</span>
      </div>

      {/* Original filename */}
      <div className="flex items-center gap-1">
        <svg
          className="w-3 h-3"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span className="truncate">{attachment.originalFilename}</span>
        <span className="text-muted-foreground/50">
          ({formatFileSize(attachment.size)})
        </span>
      </div>

      {/* Hash */}
      {showDetails && (
        <div className="flex items-center gap-1">
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span className="font-mono">{truncateHash(attachment.hash)}</span>
        </div>
      )}

      {/* Version indicator */}
      {attachment.version > 1 && (
        <div className="flex items-center gap-1 text-amber-600">
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Version {attachment.version}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Props for LinkedAttachment component.
 */
export interface LinkedAttachmentProps {
  /** Attachment metadata */
  attachment: AttachmentMeta;
  /** Whether attachment can be removed */
  canRemove?: boolean;
  /** Callback when remove is clicked */
  onRemove?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get file type icon based on MIME type.
 */
function getFileTypeIcon(mimeType: string): React.ReactNode {
  if (mimeType.startsWith('image/')) {
    return (
      <svg
        className="w-5 h-5 text-blue-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
        />
      </svg>
    );
  }
  if (mimeType === 'application/pdf') {
    return (
      <svg
        className="w-5 h-5 text-red-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
        />
      </svg>
    );
  }
  return (
    <svg
      className="w-5 h-5 text-gray-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

/**
 * Linked attachment display component.
 *
 * Shows attachment with file type icon, name, and evidence chain.
 * Optionally allows removal.
 */
export function LinkedAttachment({
  attachment,
  canRemove = false,
  onRemove,
  className,
}: LinkedAttachmentProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 border rounded-lg bg-muted/20',
        className
      )}
    >
      {/* File type icon */}
      <div className="flex-shrink-0 mt-0.5">
        {getFileTypeIcon(attachment.mimeType)}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {attachment.originalFilename}
          </span>
          {attachment.version > 1 && (
            <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
              v{attachment.version}
            </span>
          )}
        </div>
        <AttachmentEvidenceChain attachment={attachment} />
      </div>

      {/* Remove button */}
      {canRemove && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="flex-shrink-0 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded"
          aria-label="Remove attachment"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default DraftIndicator;
