/**
 * ReportResultsViewer Component
 *
 * Displays report execution results with appropriate visualization.
 * Supports table, chart, and KPI views based on report configuration.
 */
"use client";

import React, { useState, useMemo } from "react";
import {
  Play,
  Download,
  ChevronDown,
  Clock,
  Rows,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { ReportChart } from "./ReportChart";
import { ReportKpi } from "./ReportKpi";
import type { SavedReport, ReportResult } from "@/types/reports";

interface ReportResultsViewerProps {
  /** The saved report configuration */
  report: SavedReport;
  /** Report execution result (null if not run yet) */
  result: ReportResult | null;
  /** Whether the report is currently loading/running */
  isLoading: boolean;
  /** Callback to run the report */
  onRun: () => void;
  /** Callback to export report results */
  onExport: (format: "excel" | "csv" | "pdf") => void;
}

// Page size for table pagination
const PAGE_SIZE = 25;

/**
 * Loading skeleton for report results
 */
function ResultsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <div className="flex-1" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="border rounded-lg p-4">
        <Skeleton className="h-[400px] w-full" />
      </div>
    </div>
  );
}

/**
 * Empty state when report hasn't been run
 */
function EmptyResults({ onRun }: { onRun: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 border rounded-lg bg-muted/20">
      <Play className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">No results yet</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Run this report to see results
      </p>
      <Button onClick={onRun}>
        <Play className="mr-2 h-4 w-4" />
        Run Report
      </Button>
    </div>
  );
}

/**
 * Format cell value for display
 */
function formatCellValue(value: unknown, type?: string): string {
  if (value === null || value === undefined) {
    return "-";
  }

  if (type === "date" && typeof value === "string") {
    try {
      return new Date(value).toLocaleDateString();
    } catch {
      return String(value);
    }
  }

  if (type === "boolean") {
    return value ? "Yes" : "No";
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  return String(value);
}

/**
 * Table visualization component with sorting and pagination
 */
function TableVisualization({ result }: { result: ReportResult }) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  // Sort rows
  const sortedRows = useMemo(() => {
    if (!sortColumn) return result.rows;

    return [...result.rows].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];

      // Handle null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      // Compare values
      let comparison = 0;
      if (typeof aValue === "number" && typeof bValue === "number") {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(String(bValue));
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [result.rows, sortColumn, sortDirection]);

  // Paginate rows
  const paginatedRows = useMemo(() => {
    const start = page * PAGE_SIZE;
    return sortedRows.slice(start, start + PAGE_SIZE);
  }, [sortedRows, page]);

  const totalPages = Math.ceil(sortedRows.length / PAGE_SIZE);

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(columnKey);
      setSortDirection("asc");
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {result.columns.map((column) => (
                <TableHead
                  key={column.key}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort(column.key)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.label}</span>
                    <ArrowUpDown
                      className={cn(
                        "h-4 w-4",
                        sortColumn === column.key
                          ? "text-foreground"
                          : "text-muted-foreground/50",
                      )}
                    />
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={result.columns.length}
                  className="text-center py-8 text-muted-foreground"
                >
                  No data available
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {result.columns.map((column) => (
                    <TableCell key={column.key}>
                      {formatCellValue(row[column.key], column.type)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {page * PAGE_SIZE + 1} to{" "}
            {Math.min((page + 1) * PAGE_SIZE, sortedRows.length)} of{" "}
            {sortedRows.length} rows
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * ReportResultsViewer Component
 *
 * Main component that renders report results with toolbar and visualization.
 */
export function ReportResultsViewer({
  report,
  result,
  isLoading,
  onRun,
  onExport,
}: ReportResultsViewerProps) {
  // Show loading state
  if (isLoading) {
    return <ResultsSkeleton />;
  }

  // Show empty state if no result
  if (!result) {
    return <EmptyResults onRun={onRun} />;
  }

  // Render visualization based on type
  let visualization: React.ReactNode;

  switch (report.visualization) {
    case "table":
      visualization = <TableVisualization result={result} />;
      break;

    case "kpi":
      // For KPI, use the first grouped data item
      if (result.groupedData && result.groupedData.length > 0) {
        const kpiData = result.groupedData[0];
        visualization = (
          <div className="flex justify-center py-8">
            <ReportKpi
              value={kpiData.value}
              label={kpiData.label}
              format="number"
              className="max-w-sm"
            />
          </div>
        );
      } else if (result.summary?.totalRows !== undefined) {
        // Fallback to total rows as KPI
        visualization = (
          <div className="flex justify-center py-8">
            <ReportKpi
              value={result.summary.totalRows}
              label="Total Records"
              format="number"
              className="max-w-sm"
            />
          </div>
        );
      } else {
        visualization = <TableVisualization result={result} />;
      }
      break;

    case "bar":
    case "line":
    case "pie":
    case "stacked_bar":
    case "funnel":
      if (result.groupedData && result.groupedData.length > 0) {
        visualization = (
          <ReportChart
            visualization={report.visualization}
            groupedData={result.groupedData}
            chartConfig={report.chartConfig}
          />
        );
      } else {
        // Fallback to table if no grouped data
        visualization = <TableVisualization result={result} />;
      }
      break;

    default:
      visualization = <TableVisualization result={result} />;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <Button onClick={onRun} variant="outline">
          <Play className="mr-2 h-4 w-4" />
          Run Again
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onExport("excel")}>
              Export to Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("csv")}>
              Export to CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport("pdf")}>
              Export to PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex-1" />

        {/* Execution info */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Rows className="h-4 w-4" />
            <span>{result.totalCount.toLocaleString()} rows</span>
          </div>
          {result.summary?.executionTimeMs && (
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{result.summary.executionTimeMs}ms</span>
            </div>
          )}
          {report.lastRunAt && (
            <div className="flex items-center gap-1">
              <span>
                Last run:{" "}
                {formatDistanceToNow(new Date(report.lastRunAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Visualization */}
      <div className="border rounded-lg p-4">{visualization}</div>
    </div>
  );
}

export default ReportResultsViewer;
