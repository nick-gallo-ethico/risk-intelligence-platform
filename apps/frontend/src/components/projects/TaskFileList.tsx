"use client";

/**
 * TaskFileList Component
 *
 * File attachments management for tasks.
 * Supports drag-and-drop upload, download via signed URL, and delete.
 */

import React, { useState, useCallback, useRef } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  Upload,
  Download,
  Trash2,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  File,
  Grid3X3,
  List,
  Loader2,
  Cloud,
} from "lucide-react";
import type { TaskFile } from "@/types/project";
import {
  useTaskFiles,
  useUploadTaskFile,
  useDeleteTaskFile,
  useDownloadTaskFile,
} from "@/hooks/use-project-detail";

interface TaskFileListProps {
  projectId: string;
  taskId: string;
}

// File type icons
const getFileIcon = (fileType: string): React.ElementType => {
  if (fileType.startsWith("image/")) return FileImage;
  if (
    fileType.includes("spreadsheet") ||
    fileType.includes("excel") ||
    fileType.includes("csv")
  )
    return FileSpreadsheet;
  if (
    fileType.includes("code") ||
    fileType.includes("javascript") ||
    fileType.includes("json")
  )
    return FileCode;
  if (fileType.includes("zip") || fileType.includes("archive"))
    return FileArchive;
  if (fileType.includes("pdf") || fileType.includes("document"))
    return FileText;
  return File;
};

// Format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

// Max file size (25MB)
const MAX_FILE_SIZE = 25 * 1024 * 1024;

/**
 * TaskFileList - File attachments management for tasks.
 */
export function TaskFileList({ projectId, taskId }: TaskFileListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch files
  const { data: files, isLoading } = useTaskFiles(projectId, taskId);

  // Mutations
  const uploadFile = useUploadTaskFile(projectId, taskId);
  const deleteFile = useDeleteTaskFile(projectId, taskId);
  const downloadFile = useDownloadTaskFile(projectId, taskId);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return;

      for (const file of Array.from(selectedFiles)) {
        if (file.size > MAX_FILE_SIZE) {
          alert(
            `File "${file.name}" exceeds the maximum size of 25MB. Please select a smaller file.`,
          );
          continue;
        }

        // Simulate upload progress
        setUploadProgress(0);
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev === null || prev >= 90) return prev;
            return prev + 10;
          });
        }, 200);

        try {
          await uploadFile.mutateAsync(file);
          setUploadProgress(100);
        } finally {
          clearInterval(progressInterval);
          setTimeout(() => setUploadProgress(null), 500);
        }
      }
    },
    [uploadFile],
  );

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  // Handle download
  const handleDownload = useCallback(
    async (fileId: string, fileName: string) => {
      try {
        const downloadUrl = await downloadFile.mutateAsync(fileId);
        // Open download URL in new tab or trigger download
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        // Error handled by mutation
      }
    },
    [downloadFile],
  );

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!deleteTargetId) return;
    deleteFile.mutate(deleteTargetId, {
      onSuccess: () => {
        setDeleteDialogOpen(false);
        setDeleteTargetId(null);
      },
    });
  }, [deleteFile, deleteTargetId]);

  // Render file card (grid view)
  const renderFileCard = (file: TaskFile) => {
    const Icon = getFileIcon(file.fileType);
    const isImage = file.fileType.startsWith("image/");

    return (
      <div
        key={file.id}
        className="border rounded-lg p-3 hover:bg-gray-50 transition-colors group"
      >
        {/* Preview/Icon */}
        <div className="aspect-square rounded-md bg-gray-100 flex items-center justify-center mb-2 overflow-hidden">
          {isImage && file.downloadUrl ? (
            <img
              src={file.downloadUrl}
              alt={file.fileName}
              className="w-full h-full object-cover"
            />
          ) : (
            <Icon className="h-12 w-12 text-gray-400" />
          )}
        </div>

        {/* File info */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-sm font-medium truncate">{file.fileName}</p>
            </TooltipTrigger>
            <TooltipContent>{file.fileName}</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <p className="text-xs text-muted-foreground">
          {formatFileSize(file.fileSize)}
        </p>

        {/* Actions */}
        <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7"
            onClick={() => handleDownload(file.id, file.fileName)}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              setDeleteTargetId(file.id);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  // Render file row (list view)
  const renderFileRow = (file: TaskFile) => {
    const Icon = getFileIcon(file.fileType);

    return (
      <div
        key={file.id}
        className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-gray-50 transition-colors group"
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5 text-gray-500" />
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm font-medium truncate">{file.fileName}</p>
              </TooltipTrigger>
              <TooltipContent>{file.fileName}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{formatFileSize(file.fileSize)}</span>
            <span>|</span>
            <div className="flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarFallback className="text-[8px]">
                  {file.uploadedBy?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <span>{file.uploadedBy?.name || "Unknown"}</span>
            </div>
            <span>|</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    {formatDistanceToNow(new Date(file.createdAt), {
                      addSuffix: true,
                    })}
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {format(new Date(file.createdAt), "PPpp")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            onClick={() => handleDownload(file.id, file.fileName)}
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              setDeleteTargetId(file.id);
              setDeleteDialogOpen(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-32 w-full" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Upload area */}
      <div className="p-4 border-b">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />

          {uploadProgress !== null ? (
            <div className="space-y-2">
              <Loader2 className="h-8 w-8 mx-auto text-blue-500 animate-spin" />
              <Progress value={uploadProgress} className="w-48 mx-auto" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <Cloud
                className={cn(
                  "h-8 w-8 mx-auto mb-2",
                  isDragging ? "text-blue-500" : "text-gray-400",
                )}
              />
              <p className="text-sm font-medium">
                Drop files here or click to upload
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max file size: 25MB
              </p>
            </>
          )}
        </div>
      </div>

      {/* Header with view toggle */}
      {files && files.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <span className="text-sm text-muted-foreground">
            {files.length} {files.length === 1 ? "file" : "files"}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={viewMode === "list" ? "default" : "ghost"}
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === "grid" ? "default" : "ghost"}
              className="h-7 w-7 p-0"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* File list */}
      <ScrollArea className="flex-1">
        {!files || files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <File className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No files yet</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">
              Drag and drop files above to attach them to this task.
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="p-4 grid grid-cols-2 gap-3">
            {files.map((file) => renderFileCard(file))}
          </div>
        ) : (
          <div>{files.map((file) => renderFileRow(file))}</div>
        )}
      </ScrollArea>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteFile.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TaskFileList;
