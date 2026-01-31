'use client';

import { useCallback, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/toaster';
import { attachmentsApi } from '@/lib/attachments-api';
import type { Attachment, AttachmentEntityType } from '@/types/attachment';

/**
 * File item in the upload queue with upload state
 */
interface QueuedFile {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
  preview?: string;
}

export interface FileUploadProps {
  /** Type of entity to attach files to */
  entityType: AttachmentEntityType;
  /** ID of the entity to attach files to */
  entityId: string;
  /** Callback when a file is successfully uploaded */
  onUploadComplete?: (attachment: Attachment) => void;
  /** Maximum number of files allowed (default: 10) */
  maxFiles?: number;
  /** Accepted MIME types (default: all allowed by backend) */
  accept?: string;
  /** Maximum file size in bytes (default: 50MB) */
  maxSize?: number;
  /** Additional CSS classes */
  className?: string;
}

const DEFAULT_MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const DEFAULT_MAX_FILES = 10;

// Matches backend ALLOWED_MIME_TYPES
const DEFAULT_ACCEPT = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/rtf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/tiff',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/webm',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
].join(',');

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get file type badge color
 */
function getFileTypeBadge(mimeType: string): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  if (mimeType.startsWith('image/')) return { label: 'Image', variant: 'default' };
  if (mimeType.startsWith('video/')) return { label: 'Video', variant: 'secondary' };
  if (mimeType.startsWith('audio/')) return { label: 'Audio', variant: 'secondary' };
  if (mimeType === 'application/pdf') return { label: 'PDF', variant: 'default' };
  if (mimeType.includes('word')) return { label: 'Word', variant: 'outline' };
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return { label: 'Excel', variant: 'outline' };
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return { label: 'PPT', variant: 'outline' };
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return { label: 'Archive', variant: 'secondary' };
  return { label: 'File', variant: 'outline' };
}

/**
 * Generate unique ID for queued files
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * File upload component with drag and drop support.
 *
 * Features:
 * - Drag and drop zone
 * - Click to browse files
 * - Multiple file selection
 * - File type validation
 * - File size validation
 * - Upload progress indicator
 * - Preview for images
 * - Remove file before upload
 * - Error display per file
 */
export function FileUpload({
  entityType,
  entityId,
  onUploadComplete,
  maxFiles = DEFAULT_MAX_FILES,
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE,
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validate a file before adding to queue
   */
  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      const acceptedTypes = accept.split(',').map((t) => t.trim());
      const isValidType = acceptedTypes.some((type) => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', ''));
        }
        return file.type === type;
      });

      if (!isValidType) {
        return `File type "${file.type || 'unknown'}" is not allowed`;
      }

      // Check file size
      if (file.size > maxSize) {
        return `File size (${formatFileSize(file.size)}) exceeds maximum (${formatFileSize(maxSize)})`;
      }

      return null;
    },
    [accept, maxSize]
  );

  /**
   * Add files to the upload queue
   */
  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const availableSlots = maxFiles - queue.length;

      if (fileArray.length > availableSlots) {
        toast.error(`Can only add ${availableSlots} more file(s). Maximum is ${maxFiles}.`);
        return;
      }

      const newQueuedFiles: QueuedFile[] = [];

      fileArray.forEach((file) => {
        const error = validateFile(file);
        const preview = file.type.startsWith('image/')
          ? URL.createObjectURL(file)
          : undefined;

        newQueuedFiles.push({
          id: generateId(),
          file,
          progress: 0,
          status: error ? 'error' : 'pending',
          error: error || undefined,
          preview,
        });
      });

      setQueue((prev) => [...prev, ...newQueuedFiles]);
    },
    [queue.length, maxFiles, validateFile]
  );

  /**
   * Remove a file from the queue
   */
  const removeFile = useCallback((id: string) => {
    setQueue((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  /**
   * Upload a single file
   */
  const uploadFile = useCallback(
    async (queuedFile: QueuedFile) => {
      setQueue((prev) =>
        prev.map((f) => (f.id === queuedFile.id ? { ...f, status: 'uploading' } : f))
      );

      try {
        const attachment = await attachmentsApi.upload({
          file: queuedFile.file,
          entityType,
          entityId,
          onProgress: (progress) => {
            setQueue((prev) =>
              prev.map((f) => (f.id === queuedFile.id ? { ...f, progress } : f))
            );
          },
        });

        setQueue((prev) =>
          prev.map((f) =>
            f.id === queuedFile.id ? { ...f, status: 'complete', progress: 100 } : f
          )
        );

        toast.success(`Uploaded ${queuedFile.file.name}`);
        onUploadComplete?.(attachment);

        // Remove from queue after a short delay
        setTimeout(() => {
          removeFile(queuedFile.id);
        }, 1500);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed';
        setQueue((prev) =>
          prev.map((f) =>
            f.id === queuedFile.id ? { ...f, status: 'error', error: message } : f
          )
        );
        toast.error(`Failed to upload ${queuedFile.file.name}`);
      }
    },
    [entityType, entityId, onUploadComplete, removeFile]
  );

  /**
   * Upload all pending files
   */
  const uploadAll = useCallback(() => {
    const pendingFiles = queue.filter((f) => f.status === 'pending');
    pendingFiles.forEach((file) => {
      uploadFile(file);
    });
  }, [queue, uploadFile]);

  /**
   * Handle drag events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (e.dataTransfer.files) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles]
  );

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addFiles(e.target.files);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [addFiles]
  );

  /**
   * Open file browser
   */
  const openFileBrowser = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const pendingCount = queue.filter((f) => f.status === 'pending').length;
  const uploadingCount = queue.filter((f) => f.status === 'uploading').length;

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileBrowser}
        className={cn(
          'relative flex flex-col items-center justify-center gap-2 p-6',
          'border-2 border-dashed rounded-lg cursor-pointer transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
        />

        {/* Upload icon */}
        <svg
          className={cn(
            'w-10 h-10 transition-colors',
            isDragging ? 'text-primary' : 'text-gray-400'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-primary">Click to upload</span> or drag and
            drop
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Max {formatFileSize(maxSize)} per file, up to {maxFiles} files
          </p>
        </div>
      </div>

      {/* Queued files */}
      {queue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              {queue.length} file(s) selected
            </span>
            {pendingCount > 0 && uploadingCount === 0 && (
              <Button size="sm" onClick={uploadAll}>
                Upload {pendingCount} file(s)
              </Button>
            )}
          </div>

          <div className="space-y-2">
            {queue.map((queuedFile) => (
              <FileQueueItem
                key={queuedFile.id}
                queuedFile={queuedFile}
                onRemove={() => removeFile(queuedFile.id)}
                onRetry={() => uploadFile(queuedFile)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual file item in the upload queue
 */
interface FileQueueItemProps {
  queuedFile: QueuedFile;
  onRemove: () => void;
  onRetry: () => void;
}

function FileQueueItem({ queuedFile, onRemove, onRetry }: FileQueueItemProps) {
  const { file, progress, status, error, preview } = queuedFile;
  const typeBadge = getFileTypeBadge(file.type);

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border',
        status === 'error' ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'
      )}
    >
      {/* Preview or icon */}
      <div className="flex-shrink-0 w-12 h-12 rounded overflow-hidden bg-gray-100 flex items-center justify-center">
        {preview ? (
          <img
            src={preview}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg
            className="w-6 h-6 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 truncate">
            {file.name}
          </span>
          <Badge variant={typeBadge.variant} className="text-xs">
            {typeBadge.label}
          </Badge>
        </div>
        <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>

        {/* Progress bar */}
        {status === 'uploading' && (
          <Progress value={progress} className="mt-2 h-1" />
        )}

        {/* Error message */}
        {status === 'error' && error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}

        {/* Complete indicator */}
        {status === 'complete' && (
          <p className="text-xs text-green-600 mt-1">Uploaded successfully</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex items-center gap-2">
        {status === 'error' && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        )}
        {(status === 'pending' || status === 'error') && (
          <button
            onClick={onRemove}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
            aria-label="Remove file"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
        {status === 'uploading' && (
          <span className="text-xs text-gray-500">{progress}%</span>
        )}
        {status === 'complete' && (
          <svg
            className="w-5 h-5 text-green-500"
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
        )}
      </div>
    </div>
  );
}
