'use client';

import * as React from 'react';
import {
  Upload,
  X,
  File,
  FileImage,
  FileText,
  Camera,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

/**
 * Attachment file with metadata.
 */
export interface Attachment {
  /** Unique ID (temp ID for local, server ID after upload) */
  id: string;
  /** Original file name */
  name: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  type: string;
  /** Local file reference (before upload) */
  file?: File;
  /** Local blob URL for preview */
  previewUrl?: string;
  /** Whether marked as sensitive */
  isSensitive: boolean;
  /** Upload status */
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  /** Upload progress (0-100) */
  progress?: number;
  /** Error message if failed */
  error?: string;
}

/**
 * Allowed file types.
 */
const ALLOWED_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  // Text
  'text/plain',
  'text/csv',
];

/**
 * File type extensions for accept attribute.
 */
const ACCEPT_EXTENSIONS = '.jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv';

/**
 * Maximum file size in bytes (25MB).
 */
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * Format file size for display.
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get icon for file type.
 */
function getFileIcon(type: string): React.ElementType {
  if (type.startsWith('image/')) return FileImage;
  if (type.includes('pdf') || type.includes('word') || type.includes('document')) {
    return FileText;
  }
  return File;
}

/**
 * Generate a unique ID for attachments.
 */
function generateId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

interface AttachmentUploadProps {
  /** Current attachments */
  attachments: Attachment[];
  /** Callback when attachments change */
  onAdd: (files: File[]) => void;
  /** Callback when an attachment is removed */
  onRemove: (attachmentId: string) => void;
  /** Callback when sensitivity toggle changes */
  onToggleSensitive: (attachmentId: string, sensitive: boolean) => void;
  /** Tenant slug for upload endpoint */
  tenantSlug: string;
  /** Disable interaction */
  disabled?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Attachment upload component for report submission.
 * Supports drag-drop, file selection, and mobile camera capture.
 *
 * Features:
 * - Drag and drop zone
 * - Multiple file selection
 * - Mobile camera capture
 * - File type validation
 * - Size validation (25MB max)
 * - Sensitivity tagging
 * - Upload progress
 *
 * @example
 * ```tsx
 * <AttachmentUpload
 *   attachments={attachments}
 *   onAdd={(files) => handleUpload(files)}
 *   onRemove={(id) => removeAttachment(id)}
 *   onToggleSensitive={(id, sensitive) => updateAttachment(id, { isSensitive: sensitive })}
 *   tenantSlug="acme-corp"
 * />
 * ```
 */
export function AttachmentUpload({
  attachments,
  onAdd,
  onRemove,
  onToggleSensitive,
  tenantSlug,
  disabled = false,
  className,
}: AttachmentUploadProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  /**
   * Validate a file before adding.
   */
  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type "${file.type || 'unknown'}" is not supported.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" exceeds the 25MB size limit.`;
    }
    return null;
  };

  /**
   * Process files from input or drop.
   */
  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    fileArray.forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setValidationError(errors.join(' '));
      setTimeout(() => setValidationError(null), 5000);
    }

    if (validFiles.length > 0) {
      onAdd(validFiles);
    }
  };

  /**
   * Handle file input change.
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  /**
   * Handle drag events.
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  /**
   * Open file picker.
   */
  const handleBrowseClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  /**
   * Open camera on mobile.
   */
  const handleCameraClick = () => {
    if (!disabled) {
      cameraInputRef.current?.click();
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-6 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
      >
        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPT_EXTENSIONS}
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          disabled={disabled}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-3">
          <div
            className={cn(
              'w-14 h-14 rounded-full flex items-center justify-center',
              isDragging ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}
          >
            <Upload className="w-6 h-6" />
          </div>

          <div>
            <p className="font-medium text-foreground">
              {isDragging ? 'Drop files here' : 'Drag and drop files here'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>

          <div className="flex gap-2 flex-wrap justify-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBrowseClick}
              disabled={disabled}
            >
              <File className="w-4 h-4 mr-2" />
              Browse Files
            </Button>

            {/* Camera button (shown on touch devices) */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCameraClick}
              disabled={disabled}
              className="md:hidden"
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Max 25MB per file. Images, PDFs, Word, Excel, text files supported.
          </p>
        </div>
      </div>

      {/* Validation error */}
      {validationError && (
        <div
          className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm"
          role="alert"
        >
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Attachment list */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Attached files ({attachments.length})
          </Label>

          <div className="space-y-2">
            {attachments.map((attachment) => {
              const IconComponent = getFileIcon(attachment.type);

              return (
                <div
                  key={attachment.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border bg-card',
                    attachment.status === 'error' && 'border-destructive'
                  )}
                >
                  {/* File icon */}
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                    <IconComponent className="w-5 h-5 text-muted-foreground" />
                  </div>

                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {attachment.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)}
                      {attachment.status === 'uploading' && attachment.progress !== undefined && (
                        <span> - Uploading {attachment.progress}%</span>
                      )}
                      {attachment.status === 'error' && attachment.error && (
                        <span className="text-destructive"> - {attachment.error}</span>
                      )}
                    </p>
                  </div>

                  {/* Sensitive toggle */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Checkbox
                      id={`sensitive-${attachment.id}`}
                      checked={attachment.isSensitive}
                      onCheckedChange={(checked) =>
                        onToggleSensitive(attachment.id, checked === true)
                      }
                      disabled={disabled}
                    />
                    <Label
                      htmlFor={`sensitive-${attachment.id}`}
                      className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
                    >
                      <Shield className="w-3 h-3" />
                      <span className="hidden sm:inline">Sensitive</span>
                    </Label>
                  </div>

                  {/* Remove button */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(attachment.id)}
                    disabled={disabled}
                    className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                    <span className="sr-only">Remove</span>
                  </Button>
                </div>
              );
            })}
          </div>

          {/* Sensitivity explanation */}
          <p className="text-xs text-muted-foreground">
            <Shield className="w-3 h-3 inline mr-1" />
            Mark files as &quot;Sensitive&quot; for extra access restrictions. Only authorized personnel will be able to view them.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Create an Attachment object from a File.
 */
export function createAttachmentFromFile(file: File): Attachment {
  return {
    id: generateId(),
    name: file.name,
    size: file.size,
    type: file.type,
    file,
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
    isSensitive: false,
    status: 'pending',
  };
}
