"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload,
  File,
  FileText,
  FileImage,
  FileVideo,
  Download,
  Eye,
  MoreHorizontal,
  Grid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiClient } from "@/lib/api";

interface InvestigationFile {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number; // bytes
  fileType:
    | "EVIDENCE"
    | "SUPPORTING_DOCUMENT"
    | "TRANSCRIPT"
    | "PHOTO"
    | "OTHER";
  uploadedById: string;
  uploadedBy?: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  url?: string;
}

interface InvestigationFilesTabProps {
  investigationId: string;
  onUploadFile?: () => void;
}

const FILE_TYPE_COLORS: Record<string, string> = {
  EVIDENCE: "bg-red-100 text-red-800",
  SUPPORTING_DOCUMENT: "bg-blue-100 text-blue-800",
  TRANSCRIPT: "bg-purple-100 text-purple-800",
  PHOTO: "bg-green-100 text-green-800",
  OTHER: "bg-gray-100 text-gray-800",
};

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (mimeType.includes("pdf")) return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function InvestigationFilesTab({
  investigationId,
  onUploadFile,
}: InvestigationFilesTabProps) {
  const [files, setFiles] = useState<InvestigationFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");

  const fetchFiles = useCallback(async () => {
    setLoading(true);

    try {
      const response = await apiClient.get<InvestigationFile[]>(
        `/investigations/${investigationId}/files`,
      );
      setFiles(response || []);
    } catch (err) {
      console.error("Failed to fetch files:", err);
      // Graceful fallback - endpoint might not exist yet
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [investigationId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDownload = (file: InvestigationFile) => {
    if (file.url) {
      window.open(file.url, "_blank");
    }
  };

  if (loading) {
    return <InvestigationFilesTabSkeleton />;
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Files & Evidence
          {files.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({files.length})
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2 rounded-r-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              className="h-8 px-2 rounded-l-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={onUploadFile}>
            <Upload className="h-4 w-4 mr-2" />
            Upload File
          </Button>
        </div>
      </div>

      {/* Files content */}
      {files.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-gray-50 border-dashed">
          <File className="h-12 w-12 mx-auto text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No files uploaded
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Upload evidence, documents, or transcripts for this investigation.
          </p>
          <Button className="mt-4" onClick={onUploadFile}>
            <Upload className="h-4 w-4 mr-2" />
            Upload First File
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        /* Grid view */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {files.map((file) => {
            const Icon = getFileIcon(file.mimeType);
            return (
              <Card
                key={file.id}
                className="shadow-sm hover:shadow-md transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex flex-col items-center text-center">
                    <div className="p-3 bg-gray-100 rounded-lg mb-3">
                      <Icon className="h-8 w-8 text-gray-600" />
                    </div>
                    <p className="font-medium text-sm text-gray-900 truncate w-full">
                      {file.originalFilename}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFileSize(file.size)}
                    </p>
                    <Badge
                      className={`mt-2 ${FILE_TYPE_COLORS[file.fileType]}`}
                    >
                      {file.fileType.replace("_", " ")}
                    </Badge>
                    <div className="flex items-center gap-1 mt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* List view */
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Uploaded By</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => {
              const Icon = getFileIcon(file.mimeType);
              return (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">
                        {file.originalFilename}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={FILE_TYPE_COLORS[file.fileType]}>
                      {file.fileType.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {formatFileSize(file.size)}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {file.uploadedBy
                      ? `${file.uploadedBy.firstName} ${file.uploadedBy.lastName}`
                      : "Unknown"}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {new Date(file.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleDownload(file)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Preview</DropdownMenuItem>
                          <DropdownMenuItem>Rename</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

/**
 * Skeleton for loading state
 */
function InvestigationFilesTabSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-7 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}
