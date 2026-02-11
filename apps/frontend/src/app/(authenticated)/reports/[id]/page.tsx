/**
 * Report Detail Page
 *
 * Displays a saved report with its results and actions.
 * Route: /reports/[id]
 */
"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Pencil,
  Copy,
  Trash2,
  MoreHorizontal,
  Table as TableIcon,
  BarChart3,
  LineChart,
  PieChart,
  Activity,
  TrendingUp,
  Layers,
  Globe,
  Users,
  Lock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ReportResultsViewer } from "@/components/reports/ReportResultsViewer";
import { reportsApi } from "@/services/reports-api";
import type { SavedReport, ReportResult } from "@/types/reports";

// =========================================================================
// Constants
// =========================================================================

/**
 * Visualization type to icon mapping
 */
const VISUALIZATION_ICONS: Record<string, React.ElementType> = {
  table: TableIcon,
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  kpi: Activity,
  funnel: TrendingUp,
  stacked_bar: Layers,
};

/**
 * Visibility level to icon mapping
 */
const VISIBILITY_ICONS: Record<string, React.ElementType> = {
  PRIVATE: Lock,
  TEAM: Users,
  EVERYONE: Globe,
};

/**
 * Entity type display names
 */
const ENTITY_TYPE_LABELS: Record<string, string> = {
  cases: "Cases",
  rius: "RIUs",
  persons: "Persons",
  campaigns: "Campaigns",
  policies: "Policies",
  disclosures: "Disclosures",
  investigations: "Investigations",
};

// =========================================================================
// Loading Skeleton
// =========================================================================

function ReportDetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
      {/* Results skeleton */}
      <Skeleton className="h-[500px] w-full" />
    </div>
  );
}

// =========================================================================
// Not Found State
// =========================================================================

function ReportNotFound() {
  return (
    <div className="p-6">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Report Not Found</AlertTitle>
        <AlertDescription>
          The report you are looking for does not exist or has been deleted.
        </AlertDescription>
      </Alert>
      <div className="mt-4">
        <Link href="/reports">
          <Button variant="outline">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Reports
          </Button>
        </Link>
      </div>
    </div>
  );
}

// =========================================================================
// Error State
// =========================================================================

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Error Running Report</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}

// =========================================================================
// Page Props
// =========================================================================

interface ReportDetailPageProps {
  params: Promise<{ id: string }>;
}

// =========================================================================
// Main Component
// =========================================================================

export default function ReportDetailPage({ params }: ReportDetailPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resolvedParams = use(params);
  const reportId = resolvedParams.id;

  // State
  const [report, setReport] = useState<SavedReport | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Check for auto-run parameter
  const shouldAutoRun = searchParams?.get("run") === "true";

  // Fetch report on mount
  useEffect(() => {
    async function fetchReport() {
      setIsLoading(true);
      setError(null);
      setNotFound(false);

      try {
        const fetchedReport = await reportsApi.getReport(reportId);
        setReport(fetchedReport);
      } catch (err) {
        console.warn("Failed to fetch report:", err);
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch report";
        if (
          errorMessage.includes("not found") ||
          errorMessage.includes("404")
        ) {
          setNotFound(true);
        } else {
          setError(errorMessage);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchReport();
  }, [reportId]);

  // Auto-run report when loaded
  useEffect(() => {
    if (report && !result && !isRunning) {
      // Always auto-run on load, or if explicitly requested via URL
      handleRunReport();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report, shouldAutoRun]);

  // Run report handler
  const handleRunReport = useCallback(async () => {
    if (!report) return;

    setIsRunning(true);
    setError(null);

    try {
      const runResult = await reportsApi.runReport(report.id);
      setResult(runResult);
      // Update report with new lastRunAt
      setReport((prev) =>
        prev
          ? {
              ...prev,
              lastRunAt: new Date().toISOString(),
              lastRunDuration: runResult.summary?.executionTimeMs,
              lastRunRowCount: runResult.totalCount,
            }
          : null,
      );
    } catch (err) {
      console.warn("Failed to run report:", err);
      setError(err instanceof Error ? err.message : "Failed to run report");
    } finally {
      setIsRunning(false);
    }
  }, [report]);

  // Export handler
  const handleExport = useCallback(
    async (format: "excel" | "csv" | "pdf") => {
      if (!report) return;

      try {
        const exportResult = await reportsApi.exportReport(report.id, format);

        if (exportResult.downloadUrl) {
          // Direct download
          window.open(exportResult.downloadUrl, "_blank");
          toast.success("Export started");
        } else if (exportResult.jobId) {
          // Async export job
          toast.success("Export queued. You will be notified when ready.");
        } else {
          toast.info(`Export to ${format.toUpperCase()} requested`);
        }
      } catch (err) {
        console.warn("Failed to export report:", err);
        toast.error("Failed to export report");
      }
    },
    [report],
  );

  // Edit handler
  const handleEdit = useCallback(() => {
    router.push(`/reports/${reportId}/edit`);
  }, [router, reportId]);

  // Duplicate handler
  const handleDuplicate = useCallback(async () => {
    if (!report) return;

    try {
      const duplicated = await reportsApi.duplicateReport(report.id);
      toast.success(`Report duplicated: ${duplicated.name}`);
      router.push(`/reports/${duplicated.id}`);
    } catch (err) {
      console.warn("Failed to duplicate report:", err);
      toast.error("Failed to duplicate report");
    }
  }, [report, router]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!report) return;

    try {
      await reportsApi.deleteReport(report.id);
      toast.success("Report deleted");
      router.push("/reports");
    } catch (err) {
      console.warn("Failed to delete report:", err);
      toast.error("Failed to delete report");
    }
  }, [report, router]);

  // Loading state
  if (isLoading) {
    return <ReportDetailSkeleton />;
  }

  // Not found state
  if (notFound) {
    return <ReportNotFound />;
  }

  // Report not loaded
  if (!report) {
    return (
      <div className="p-6">
        <ErrorState
          message={error || "Failed to load report"}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  // Get icons
  const VizIcon = VISUALIZATION_ICONS[report.visualization] || TableIcon;
  const VisibilityIcon = VISIBILITY_ICONS[report.visibility] || Lock;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          {/* Back link */}
          <Link
            href="/reports"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Back to Reports
          </Link>

          {/* Title */}
          <h1 className="text-2xl font-bold text-foreground">{report.name}</h1>

          {/* Description */}
          {report.description && (
            <p className="text-muted-foreground max-w-2xl">
              {report.description}
            </p>
          )}

          {/* Badges */}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="gap-1">
              {ENTITY_TYPE_LABELS[report.entityType] || report.entityType}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <VizIcon className="h-3 w-3" />
              {report.visualization}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <VisibilityIcon className="h-3 w-3" />
              {report.visibility.toLowerCase()}
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Error banner */}
      {error && <ErrorState message={error} onRetry={handleRunReport} />}

      {/* Results viewer */}
      <ReportResultsViewer
        report={report}
        result={result}
        isLoading={isRunning}
        onRun={handleRunReport}
        onExport={handleExport}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Report</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{report.name}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
