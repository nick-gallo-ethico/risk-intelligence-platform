'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Attachment } from '@/types/attachment';

export interface FilePreviewProps {
  /** Attachment to preview */
  attachment: Attachment;
  /** Whether dialog is open */
  open: boolean;
  /** Callback when dialog is closed */
  onClose: () => void;
  /** Callback when download is clicked */
  onDownload?: () => void;
  /** Callback when delete is clicked */
  onDelete?: () => void;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get file type category
 */
function getFileTypeCategory(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType === 'application/pdf') return 'PDF Document';
  if (mimeType.includes('word')) return 'Word Document';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'Spreadsheet';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'Presentation';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'Archive';
  if (mimeType.startsWith('text/')) return 'Text File';
  return 'File';
}

/**
 * Check if file can be previewed in browser
 */
function canPreviewInBrowser(mimeType: string): boolean {
  return (
    mimeType.startsWith('image/') ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/')
  );
}

/**
 * File preview dialog showing attachment details and inline preview when possible.
 */
export function FilePreview({
  attachment,
  open,
  onClose,
  onDownload,
  onDelete,
}: FilePreviewProps) {
  const canPreview = canPreviewInBrowser(attachment.mimeType);
  const fileCategory = getFileTypeCategory(attachment.mimeType);
  const isImage = attachment.mimeType.startsWith('image/');
  const isPdf = attachment.mimeType === 'application/pdf';
  const isVideo = attachment.mimeType.startsWith('video/');
  const isAudio = attachment.mimeType.startsWith('audio/');

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className={cn('sm:max-w-2xl', canPreview && 'sm:max-w-4xl')}>
        <DialogHeader>
          <DialogTitle className="pr-6 truncate">{attachment.fileName}</DialogTitle>
        </DialogHeader>

        {/* Preview area */}
        {canPreview && (
          <div className="relative bg-gray-100 rounded-lg overflow-hidden min-h-[200px] flex items-center justify-center">
            {isImage && (
              <img
                src={attachment.downloadUrl}
                alt={attachment.fileName}
                className="max-w-full max-h-[400px] object-contain"
              />
            )}
            {isPdf && (
              <iframe
                src={attachment.downloadUrl}
                title={attachment.fileName}
                className="w-full h-[500px] border-0"
              />
            )}
            {isVideo && (
              <video
                src={attachment.downloadUrl}
                controls
                className="max-w-full max-h-[400px]"
              >
                Your browser does not support video playback.
              </video>
            )}
            {isAudio && (
              <div className="p-8 w-full">
                <div className="flex flex-col items-center gap-4">
                  <svg
                    className="w-16 h-16 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
                    />
                  </svg>
                  <audio src={attachment.downloadUrl} controls className="w-full max-w-md">
                    Your browser does not support audio playback.
                  </audio>
                </div>
              </div>
            )}
          </div>
        )}

        {/* File icon for non-previewable files */}
        {!canPreview && (
          <div className="flex items-center justify-center py-8 bg-gray-50 rounded-lg">
            <div className="text-center">
              <svg
                className="w-16 h-16 mx-auto text-gray-400 mb-3"
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
              <p className="text-gray-500 text-sm">Preview not available</p>
              <p className="text-gray-400 text-xs mt-1">Click download to view this file</p>
            </div>
          </div>
        )}

        {/* File details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 mb-1">Type</p>
            <div className="flex items-center gap-2">
              <span className="font-medium">{fileCategory}</span>
              {attachment.isEvidence && (
                <Badge variant="secondary" className="text-xs">
                  Evidence
                </Badge>
              )}
            </div>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Size</p>
            <p className="font-medium">{formatFileSize(attachment.fileSize)}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Uploaded by</p>
            <p className="font-medium">{attachment.uploadedBy.name}</p>
          </div>
          <div>
            <p className="text-gray-500 mb-1">Uploaded on</p>
            <p className="font-medium">{formatDate(attachment.createdAt)}</p>
          </div>
          {attachment.description && (
            <div className="col-span-2">
              <p className="text-gray-500 mb-1">Description</p>
              <p className="font-medium">{attachment.description}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          {onDelete && (
            <Button variant="outline" onClick={onDelete}>
              Delete
            </Button>
          )}
          {onDownload && (
            <Button onClick={onDownload}>
              <svg
                className="w-4 h-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
