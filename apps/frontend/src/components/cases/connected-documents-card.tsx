"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText,
  FileImage,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  File,
  FolderOpen,
  Download,
} from "lucide-react";
import { AssociationCard } from "@/components/ui/association-card";

/**
 * Attachment entity from GET /attachments?entityType=CASE&entityId=xxx
 */
interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  entityType: string;
  entityId: string;
  description: string | null;
  isEvidence: boolean;
  createdAt: string;
  downloadUrl: string;
}

interface AttachmentListResponse {
  data: Attachment[];
  total: number;
  limit: number;
  offset: number;
}

interface ConnectedDocumentsCardProps {
  caseId: string;
  onNavigateToFiles?: () => void;
}

/**
 * Get appropriate icon based on MIME type
 */
function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return FileImage;
  }
  if (mimeType.startsWith("video/")) {
    return FileVideo;
  }
  if (mimeType.startsWith("audio/")) {
    return FileAudio;
  }
  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv"
  ) {
    return FileSpreadsheet;
  }
  if (
    mimeType.includes("document") ||
    mimeType.includes("word") ||
    mimeType === "application/pdf" ||
    mimeType === "text/plain"
  ) {
    return FileText;
  }
  return File;
}

/**
 * Format file size to human-readable string
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Format date to short display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

/**
 * Truncate filename if too long
 */
function truncateFilename(filename: string, maxLength = 24): string {
  if (filename.length <= maxLength) return filename;

  const ext = filename.includes(".") ? filename.split(".").pop() || "" : "";
  const name = ext ? filename.slice(0, -(ext.length + 1)) : filename;

  const maxNameLength = maxLength - ext.length - 4; // 4 for "..." and "."
  if (maxNameLength < 4) return filename.slice(0, maxLength - 3) + "...";

  return `${name.slice(0, maxNameLength)}...${ext ? "." + ext : ""}`;
}

/**
 * ConnectedDocumentsCard displays files attached to a case.
 * Uses AssociationCard wrapper for HubSpot-style association cards.
 */
export function ConnectedDocumentsCard({
  caseId,
  onNavigateToFiles,
}: ConnectedDocumentsCardProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!caseId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<AttachmentListResponse>(
        "/attachments",
        {
          params: {
            entityType: "CASE",
            entityId: caseId,
            limit: 5, // Show first 5 in sidebar
          },
        },
      );
      // apiClient returns the response data directly, so response IS the AttachmentListResponse
      setAttachments(response?.data || []);
    } catch (err) {
      console.error("Failed to fetch documents:", err);
      setError("Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleAddDocument = useCallback(() => {
    // Navigate to Files tab if callback provided
    if (onNavigateToFiles) {
      onNavigateToFiles();
    }
  }, [onNavigateToFiles]);

  const handleDownload = useCallback((attachment: Attachment) => {
    // Open download URL in new tab
    window.open(attachment.downloadUrl, "_blank");
  }, []);

  const totalCount = attachments.length;

  if (loading) {
    return (
      <AssociationCard
        title="Connected Documents"
        count={0}
        icon={FolderOpen}
        collapsible={false}
      >
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-1">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </AssociationCard>
    );
  }

  if (error) {
    return (
      <AssociationCard
        title="Connected Documents"
        count={0}
        icon={FolderOpen}
        onAdd={handleAddDocument}
        onSettings={() => {}}
      >
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchDocuments}
          className="mt-2 text-sm text-blue-600 hover:underline"
        >
          Retry
        </button>
      </AssociationCard>
    );
  }

  return (
    <AssociationCard
      title="Connected Documents"
      count={totalCount}
      icon={FolderOpen}
      onAdd={handleAddDocument}
      onSettings={() => {}}
      viewAllHref={`/cases/${caseId}?tab=files`}
      viewAllLabel="View all associated Documents"
    >
      {attachments.length === 0 ? (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">No documents attached</p>
        </div>
      ) : (
        <div className="space-y-1">
          {attachments.map((attachment) => (
            <DocumentRow
              key={attachment.id}
              attachment={attachment}
              onDownload={() => handleDownload(attachment)}
            />
          ))}
        </div>
      )}
    </AssociationCard>
  );
}

/**
 * Individual document row
 */
function DocumentRow({
  attachment,
  onDownload,
}: {
  attachment: Attachment;
  onDownload: () => void;
}) {
  const FileIcon = getFileIcon(attachment.mimeType);

  return (
    <div className="flex items-center gap-3 py-2 group">
      <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
        <FileIcon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" title={attachment.filename}>
          {truncateFilename(attachment.filename)}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(attachment.size)}</span>
          <span>-</span>
          <span>{formatDate(attachment.createdAt)}</span>
          {attachment.isEvidence && (
            <Badge
              variant="outline"
              className="text-[10px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200"
            >
              Evidence
            </Badge>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={onDownload}
        title="Download"
      >
        <Download className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

export default ConnectedDocumentsCard;
