'use client';

import { useState, useCallback } from 'react';
import {
  Paperclip,
  Upload,
  FileImage,
  FileText,
  FileVideo,
  FileAudio,
  File,
  Download,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/empty-state';
import { FileUpload } from '@/components/files/file-upload';
import { useCaseFiles, useDeleteCaseFile, useInvalidateCaseFiles } from '@/hooks/use-case-files';
import { attachmentsApi } from '@/lib/attachments-api';
import type { Attachment } from '@/types/attachment';

interface FilesTabProps {
  caseId: string;
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
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get appropriate icon for file type
 */
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType === 'application/pdf' || mimeType.includes('document')) return FileText;
  return File;
}

/**
 * Check if file type supports thumbnail preview
 */
function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith('image/') && !mimeType.includes('svg');
}

/**
 * Single file card component
 */
interface FileCardProps {
  attachment: Attachment;
  onDelete: (id: string) => void;
  onDownload: (attachment: Attachment) => void;
}

function FileCard({ attachment, onDelete, onDownload }: FileCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = getFileIcon(attachment.mimeType);
  const showThumbnail = isImageFile(attachment.mimeType);

  return (
    <div
      className="group relative bg-white rounded-lg border shadow-sm overflow-hidden transition-shadow hover:shadow-md"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail/Icon Area */}
      <div className="relative h-32 bg-gray-100 flex items-center justify-center">
        {showThumbnail ? (
          <img
            src={attachment.downloadUrl}
            alt={attachment.fileName}
            className="h-full w-full object-cover"
            onError={(e) => {
              // Fallback to icon if image fails to load
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.classList.add('show-icon');
            }}
          />
        ) : null}
        <Icon
          className={cn(
            'h-12 w-12 text-gray-400',
            showThumbnail && 'hidden group-[.show-icon]:block'
          )}
        />

        {/* Hover overlay with actions */}
        {isHovered && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => onDownload(attachment)}
              className="h-8 w-8"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => onDelete(attachment.id)}
              className="h-8 w-8 hover:bg-red-100 hover:text-red-600"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Evidence badge */}
        {attachment.isEvidence && (
          <Badge
            variant="secondary"
            className="absolute top-2 right-2 bg-amber-100 text-amber-700 text-xs"
          >
            Evidence
          </Badge>
        )}
      </div>

      {/* File Info */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-900 truncate" title={attachment.fileName}>
          {attachment.fileName}
        </p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          <span>{formatFileSize(attachment.fileSize)}</span>
          <span>-</span>
          <span>{formatDate(attachment.createdAt)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for file grid
 */
function FilesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="bg-white rounded-lg border overflow-hidden">
          <Skeleton className="h-32 w-full" />
          <div className="p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2 mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Files tab component for case detail page.
 *
 * Features:
 * - Grid view of attachments
 * - Thumbnail preview for images
 * - Upload button with file upload dialog
 * - Download and delete actions on hover
 * - Loading and empty states
 */
export function FilesTab({ caseId }: FilesTabProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { data, isLoading, error } = useCaseFiles(caseId);
  const deleteMutation = useDeleteCaseFile(caseId);
  const invalidateCaseFiles = useInvalidateCaseFiles();

  const handleDownload = useCallback((attachment: Attachment) => {
    window.open(attachment.downloadUrl, '_blank', 'noopener,noreferrer');
  }, []);

  const handleDeleteClick = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteMutation.mutateAsync(deleteConfirmId);
      toast.success('File deleted');
    } catch {
      toast.error('Failed to delete file');
    } finally {
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, deleteMutation]);

  const handleUploadComplete = useCallback(() => {
    invalidateCaseFiles(caseId);
  }, [caseId, invalidateCaseFiles]);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-end mb-4">
          <Skeleton className="h-9 w-28" />
        </div>
        <FilesGridSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <EmptyState
          icon={Paperclip}
          title="Error loading files"
          description="Failed to load attachments. Please try refreshing the page."
        />
      </div>
    );
  }

  const files = data?.items || [];

  return (
    <div className="p-6">
      {/* Header with upload button */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700">
          Attachments
          {files.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              ({files.length})
            </span>
          )}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setShowUploadDialog(true)}>
          <Upload className="h-4 w-4 mr-2" />
          Upload File
        </Button>
      </div>

      {/* File grid or empty state */}
      {files.length === 0 ? (
        <EmptyState
          icon={Paperclip}
          title="No files attached"
          description="Upload documents, images, and evidence related to this case."
          actionLabel="Upload File"
          onAction={() => setShowUploadDialog(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {files.map((attachment) => (
            <FileCard
              key={attachment.id}
              attachment={attachment}
              onDelete={handleDeleteClick}
              onDownload={handleDownload}
            />
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Upload documents, images, or other files related to this case.
            </DialogDescription>
          </DialogHeader>
          <FileUpload
            entityType="CASE"
            entityId={caseId}
            onUploadComplete={handleUploadComplete}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
