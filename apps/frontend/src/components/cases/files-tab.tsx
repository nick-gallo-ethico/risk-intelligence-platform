'use client';

import { useState, useCallback, useMemo } from 'react';
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
  Eye,
  Search,
  ArrowUpDown,
  ChevronDown,
  Tag,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/common/empty-state';
import { FileUpload } from '@/components/files/file-upload';
import { useCaseFiles, useDeleteCaseFile, useInvalidateCaseFiles } from '@/hooks/use-case-files';
import type { Attachment } from '@/types/attachment';

interface FilesTabProps {
  caseId: string;
}

type SortOption = 'newest' | 'oldest' | 'name' | 'size';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'size', label: 'Size (largest)' },
];

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
 * Check if file type supports inline preview
 */
function isPreviewable(mimeType: string): boolean {
  return (
    isImageFile(mimeType) ||
    mimeType === 'application/pdf' ||
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/')
  );
}

/**
 * Single file card component with download/preview/delete actions
 */
interface FileCardProps {
  attachment: Attachment;
  onDelete: (id: string) => void;
  onDownload: (attachment: Attachment) => void;
  onPreview: (attachment: Attachment) => void;
}

function FileCard({ attachment, onDelete, onDownload, onPreview }: FileCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = getFileIcon(attachment.mimeType);
  const showThumbnail = isImageFile(attachment.mimeType);
  const canPreview = isPreviewable(attachment.mimeType);

  // Mock tags (will be replaced with actual attachment tags when API supports)
  const tags = attachment.isEvidence ? ['Evidence'] : [];

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
            {canPreview && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => onPreview(attachment)}
                className="h-8 w-8"
                title="Preview"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
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

        {/* Tag chips */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="text-xs px-1.5 py-0 h-5 bg-gray-50"
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Drag and drop upload zone
 */
interface DropZoneProps {
  onDrop: () => void;
  isDragging: boolean;
}

function DropZone({ onDrop, isDragging }: DropZoneProps) {
  return (
    <div
      className={cn(
        'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
      )}
      onClick={onDrop}
    >
      <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
      <p className="text-sm font-medium text-gray-700">
        Drop files here or click to upload
      </p>
      <p className="text-xs text-gray-500 mt-1">
        Supports images, documents, videos, and audio files
      </p>
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
 * - Upload button + drag-drop zone
 * - Search bar for filtering files
 * - Sort dropdown (newest, oldest, name, size)
 * - Grid view of attachments with thumbnails
 * - File cards with download/preview/delete actions
 * - Tag chips for categorization
 * - Empty state
 */
export function FilesTab({ caseId }: FilesTabProps) {
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<Attachment | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [isDragging, setIsDragging] = useState(false);

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
    setShowUploadDialog(false);
    toast.success('File uploaded successfully');
  }, [caseId, invalidateCaseFiles]);

  const handlePreview = useCallback((attachment: Attachment) => {
    setPreviewFile(attachment);
  }, []);

  // Filter and sort files
  const filteredAndSortedFiles = useMemo(() => {
    const files = data?.items || [];

    // Filter by search query
    let filtered = files;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = files.filter(
        (f) =>
          f.fileName.toLowerCase().includes(query) ||
          f.mimeType.toLowerCase().includes(query)
      );
    }

    // Sort files
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.fileName.localeCompare(b.fileName);
        case 'size':
          return b.fileSize - a.fileSize;
        default:
          return 0;
      }
    });

    return sorted;
  }, [data?.items, searchQuery, sortOption]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Open upload dialog - FileUpload component will handle the files
    setShowUploadDialog(true);
  }, []);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-9 w-64" />
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

  const totalFiles = data?.items?.length || 0;

  return (
    <div
      className="p-6"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header with search, sort, and upload */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-4 flex-1 w-full sm:w-auto">
          <h3 className="text-sm font-semibold text-gray-700 whitespace-nowrap">
            Files
            {totalFiles > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
                {totalFiles}
              </Badge>
            )}
          </h3>

          {/* Search bar */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="pl-9 h-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                {SORT_OPTIONS.find((o) => o.value === sortOption)?.label}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SORT_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSortOption(option.value)}
                  className={cn(sortOption === option.value && 'bg-gray-100')}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Upload button */}
          <Button variant="default" size="sm" onClick={() => setShowUploadDialog(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Drag and drop indicator */}
      {isDragging && (
        <div className="absolute inset-0 bg-blue-50/80 flex items-center justify-center z-50 rounded-lg border-2 border-dashed border-blue-500">
          <div className="text-center">
            <Upload className="h-12 w-12 mx-auto text-blue-500 mb-2" />
            <p className="text-lg font-medium text-blue-700">Drop files to upload</p>
          </div>
        </div>
      )}

      {/* File grid or empty state */}
      {filteredAndSortedFiles.length === 0 ? (
        searchQuery ? (
          <EmptyState
            icon={Search}
            title="No files found"
            description={`No files match "${searchQuery}". Try a different search term.`}
            actionLabel="Clear search"
            onAction={() => setSearchQuery('')}
          />
        ) : (
          <DropZone
            onDrop={() => setShowUploadDialog(true)}
            isDragging={isDragging}
          />
        )
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedFiles.map((attachment) => (
            <FileCard
              key={attachment.id}
              attachment={attachment}
              onDelete={handleDeleteClick}
              onDownload={handleDownload}
              onPreview={handlePreview}
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

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewFile?.fileName}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-4 bg-gray-100 rounded-lg min-h-[400px]">
            {previewFile && isImageFile(previewFile.mimeType) && (
              <img
                src={previewFile.downloadUrl}
                alt={previewFile.fileName}
                className="max-w-full max-h-[60vh] object-contain"
              />
            )}
            {previewFile && previewFile.mimeType === 'application/pdf' && (
              <iframe
                src={previewFile.downloadUrl}
                title={previewFile.fileName}
                className="w-full h-[60vh]"
              />
            )}
            {previewFile && previewFile.mimeType.startsWith('video/') && (
              <video
                src={previewFile.downloadUrl}
                controls
                className="max-w-full max-h-[60vh]"
              />
            )}
            {previewFile && previewFile.mimeType.startsWith('audio/') && (
              <audio src={previewFile.downloadUrl} controls className="w-full" />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewFile(null)}>
              Close
            </Button>
            <Button onClick={() => previewFile && handleDownload(previewFile)}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
