"use client";

import { useState, useEffect, useCallback } from "react";
import { File, FileText, FileImage, Image } from "lucide-react";
import { AssociationCard } from "@/components/ui/association-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiClient } from "@/lib/api";

interface EvidenceFile {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileType:
    | "EVIDENCE"
    | "SUPPORTING_DOCUMENT"
    | "TRANSCRIPT"
    | "PHOTO"
    | "OTHER";
  createdAt: string;
}

interface InvestigationEvidenceCardProps {
  investigationId: string;
  onAddEvidence?: () => void;
  onViewAll?: () => void;
}

const FILE_TYPE_COLORS: Record<string, string> = {
  EVIDENCE: "bg-red-100 text-red-800",
  SUPPORTING_DOCUMENT: "bg-blue-100 text-blue-800",
  TRANSCRIPT: "bg-purple-100 text-purple-800",
  PHOTO: "bg-green-100 text-green-800",
  OTHER: "bg-gray-100 text-gray-800",
};

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image;
  if (mimeType.includes("pdf")) return FileText;
  return File;
}

function formatFileType(fileType: string): string {
  return fileType.replace(/_/g, " ");
}

/**
 * InvestigationEvidenceCard - Quick-glance evidence card for the right sidebar.
 *
 * Features:
 * - Fetches files from investigation API
 * - Shows up to 3 files with type badges
 * - Files show appropriate icons based on mime type
 * - "+ Add" button triggers onAddEvidence
 * - "View all files" link navigates to Files tab
 * - Empty state shows "No evidence uploaded"
 */
export function InvestigationEvidenceCard({
  investigationId,
  onAddEvidence,
}: InvestigationEvidenceCardProps) {
  const [files, setFiles] = useState<EvidenceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      // Try to fetch files from the investigation files endpoint
      const response = await apiClient.get<
        EvidenceFile[] | { data: EvidenceFile[]; total: number }
      >(`/investigations/${investigationId}/files`, { params: { limit: 3 } });

      // Handle both array and paginated response formats
      if (Array.isArray(response)) {
        setFiles(response || []);
        setTotalCount(response?.length || 0);
      } else if (response && "data" in response) {
        setFiles(response.data || []);
        setTotalCount(response.total || response.data?.length || 0);
      } else {
        setFiles([]);
        setTotalCount(0);
      }
    } catch (err) {
      // API endpoint might not exist yet - gracefully handle
      console.debug("Failed to fetch evidence files:", err);
      setFiles([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [investigationId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  if (loading) {
    return (
      <AssociationCard
        title="Evidence"
        count={0}
        icon={File}
        collapsible={false}
      >
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </AssociationCard>
    );
  }

  return (
    <AssociationCard
      title="Evidence"
      count={totalCount}
      icon={File}
      onAdd={onAddEvidence}
      onSettings={() => {}}
      viewAllHref="#files"
      viewAllLabel="View all files"
    >
      {files.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">No evidence uploaded</p>
      ) : (
        <div className="space-y-2">
          {files.map((file) => {
            const Icon = getFileIcon(file.mimeType);
            return (
              <div
                key={file.id}
                className="flex items-start gap-2 p-2 rounded border hover:bg-gray-50"
              >
                <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.originalFilename}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      className={`text-xs ${FILE_TYPE_COLORS[file.fileType] || FILE_TYPE_COLORS.OTHER}`}
                    >
                      {formatFileType(file.fileType)}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AssociationCard>
  );
}
