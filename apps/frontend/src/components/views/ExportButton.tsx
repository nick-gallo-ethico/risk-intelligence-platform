/**
 * ExportButton Component
 *
 * Dropdown button for exporting data in different formats.
 * Supports Excel (.xlsx), CSV (.csv), and PDF export.
 *
 * For small datasets (<100 rows), uses client-side export for speed.
 * For large datasets, creates a backend export job and polls for completion.
 */
"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileType,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { api, apiClient } from "@/lib/api";
import { toast } from "sonner";

// Export job status from backend
type ExportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

interface ExportJob {
  id: string;
  status: ExportStatus;
  progress?: number;
  downloadUrl?: string;
  errorMessage?: string;
  createdAt: string;
}

interface ExportJobResponse {
  jobId: string;
  status: ExportStatus;
}

// Backend export format (matches ExportFormat enum)
type ExportFormat = "xlsx" | "csv" | "pdf";

// Thresholds and configuration
const SMALL_DATASET_THRESHOLD = 100; // Use client-side export for small datasets
const POLL_INTERVAL_MS = 3000; // Poll every 3 seconds
const POLL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minute timeout

// Map entity types to backend ExportType enum values
const ENTITY_TYPE_MAP: Record<string, string> = {
  cases: "CASES",
  investigations: "INVESTIGATIONS",
  rius: "RIUS",
  policies: "POLICIES",
  campaigns: "CAMPAIGNS",
  disclosures: "DISCLOSURES",
  persons: "PERSONS",
  employees: "EMPLOYEES",
};

export function ExportButton() {
  const { config, filters, sortBy, sortOrder, visibleColumns, total } =
    useSavedViewContext();
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollStartTimeRef = useRef<number | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  /**
   * Client-side export for small datasets.
   * Uses the existing module export endpoint which returns a blob directly.
   */
  const handleClientSideExport = useCallback(
    async (format: ExportFormat) => {
      setIsExporting(true);
      setExportFormat(format);

      try {
        const response = await api.post(
          config.endpoints.export,
          {
            format,
            filters,
            sortBy,
            sortOrder,
            columns: visibleColumns,
          },
          { responseType: "blob" },
        );

        // Create download link
        const mimeTypes: Record<ExportFormat, string> = {
          xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          csv: "text/csv",
          pdf: "application/pdf",
        };

        const blob = new Blob([response.data], {
          type: mimeTypes[format],
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${config.entityName.plural.toLowerCase()}-export.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast.success("Export downloaded");
      } catch (error) {
        console.error("Export failed:", error);
        toast.error("Export failed. Please try again.");
      } finally {
        setIsExporting(false);
        setExportFormat(null);
      }
    },
    [config, filters, sortBy, sortOrder, visibleColumns],
  );

  /**
   * Backend export for large datasets.
   * Creates an export job and polls for completion.
   */
  const handleBackendExport = useCallback(
    async (format: ExportFormat) => {
      setIsExporting(true);
      setExportFormat(format);

      try {
        // Map the entity type to backend enum value
        const exportType =
          ENTITY_TYPE_MAP[config.moduleType.toLowerCase()] || "CASES";

        // Create export job
        const jobResponse = await apiClient.post<ExportJobResponse>(
          "/exports/flat-file",
          {
            exportType,
            format: format.toUpperCase(),
            filters: filters.length > 0 ? { groups: filters } : undefined,
            columnConfig: visibleColumns.map((col, index) => ({
              field: col,
              header: col, // The backend will resolve the proper header
              order: index,
            })),
            sortBy,
            sortOrder,
          },
        );

        toast.info("Export started. We'll notify you when it's ready.", {
          duration: 4000,
        });

        // Start polling for job completion
        pollStartTimeRef.current = Date.now();
        pollForCompletion(jobResponse.jobId, format);
      } catch (error) {
        console.error("Failed to start export:", error);
        toast.error("Failed to start export. Please try again.");
        setIsExporting(false);
        setExportFormat(null);
      }
    },
    [config, filters, sortBy, sortOrder, visibleColumns],
  );

  /**
   * Poll the export job status until completion or timeout.
   */
  const pollForCompletion = useCallback(
    (jobId: string, format: ExportFormat) => {
      const checkStatus = async () => {
        try {
          // Check for timeout
          const elapsed = Date.now() - (pollStartTimeRef.current || 0);
          if (elapsed > POLL_TIMEOUT_MS) {
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }
            toast.error(
              "Export timed out. Please try again with a smaller dataset.",
            );
            setIsExporting(false);
            setExportFormat(null);
            return;
          }

          // Get job status
          const job = await apiClient.get<ExportJob>(`/exports/${jobId}`);

          if (job.status === "COMPLETED") {
            // Stop polling
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            // Trigger download
            await triggerDownload(jobId, format);

            toast.success("Export ready! Download started.");
            setIsExporting(false);
            setExportFormat(null);
          } else if (job.status === "FAILED") {
            // Stop polling
            if (pollIntervalRef.current) {
              clearInterval(pollIntervalRef.current);
              pollIntervalRef.current = null;
            }

            toast.error(job.errorMessage || "Export failed. Please try again.");
            setIsExporting(false);
            setExportFormat(null);
          }
          // If PENDING or PROCESSING, continue polling
        } catch (error) {
          console.error("Failed to check export status:", error);
          // Don't stop polling on transient errors, just log them
        }
      };

      // Start polling
      pollIntervalRef.current = setInterval(checkStatus, POLL_INTERVAL_MS);

      // Also check immediately
      checkStatus();
    },
    [],
  );

  /**
   * Trigger browser download from the export job download endpoint.
   */
  const triggerDownload = useCallback(
    async (jobId: string, format: ExportFormat) => {
      try {
        const response = await api.get(`/exports/${jobId}/download`, {
          responseType: "blob",
        });

        const mimeTypes: Record<ExportFormat, string> = {
          xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          csv: "text/csv",
          pdf: "application/pdf",
        };

        const blob = new Blob([response.data], {
          type: mimeTypes[format],
        });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${config.entityName.plural.toLowerCase()}-export.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error("Failed to download export:", error);
        toast.error("Failed to download export file.");
      }
    },
    [config],
  );

  /**
   * Main export handler - decides between client-side and backend export.
   */
  const handleExport = useCallback(
    async (format: ExportFormat) => {
      // Use client-side export for small datasets
      if (total < SMALL_DATASET_THRESHOLD) {
        await handleClientSideExport(format);
      } else {
        await handleBackendExport(format);
      }
    },
    [total, handleClientSideExport, handleBackendExport],
  );

  // Format icon helper
  const getFormatIcon = (format: ExportFormat) => {
    switch (format) {
      case "xlsx":
        return FileSpreadsheet;
      case "csv":
        return FileText;
      case "pdf":
        return FileType;
      default:
        return FileText;
    }
  };

  const buttonIcon = isExporting ? (
    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
  ) : (
    <Download className="h-4 w-4 mr-2" />
  );

  const buttonText = isExporting
    ? exportFormat
      ? `Exporting ${exportFormat.toUpperCase()}...`
      : "Exporting..."
    : "Export";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {buttonIcon}
          {buttonText}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("xlsx")}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export to Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileText className="h-4 w-4 mr-2" />
          Export to CSV (.csv)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("pdf")}>
          <FileType className="h-4 w-4 mr-2" />
          Export to PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
