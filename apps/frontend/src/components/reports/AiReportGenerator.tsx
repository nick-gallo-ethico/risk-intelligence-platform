/**
 * AiReportGenerator Component
 *
 * Dialog component for generating reports from natural language queries.
 * Uses AI to parse the query and create a report configuration with live preview.
 */
"use client";

import React, { useState, useCallback } from "react";
import { Sparkles, Loader2, RefreshCw, Save, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { reportsApi } from "@/lib/reports-api";
import type {
  SavedReport,
  ReportResult,
  AiGeneratedReport,
} from "@/types/reports";

// Example queries for quick selection
const EXAMPLE_QUERIES = [
  "Show me all harassment cases from Q4 2025",
  "What are the top 5 categories by case volume this year?",
  "How many cases are overdue by severity level?",
  "Compare disclosure completion rates across business units",
  "Monthly trend of new cases over the last 12 months",
];

interface AiReportGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReportGenerated: (
    report: Partial<SavedReport>,
    results: ReportResult,
  ) => void;
}

type ErrorType = "unavailable" | "rate_limit" | "no_results" | "generic";

interface ErrorState {
  type: ErrorType;
  message: string;
}

const ERROR_MESSAGES: Record<ErrorType, string> = {
  unavailable: "AI is temporarily unavailable. Try creating a report manually.",
  rate_limit: "You've reached the AI query limit. Try again in a few minutes.",
  no_results: "No data matches your query. Try adjusting the question.",
  generic: "Something went wrong. Please try again.",
};

export function AiReportGenerator({
  open,
  onOpenChange,
  onReportGenerated,
}: AiReportGeneratorProps) {
  const [query, setQuery] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] =
    useState<AiGeneratedReport | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setQuery(e.target.value);
      // Clear error when user types
      if (error) {
        setError(null);
      }
    },
    [error],
  );

  const handleExampleClick = useCallback((example: string) => {
    setQuery(example);
    setError(null);
    setGeneratedResult(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!query.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedResult(null);

    try {
      const result = await reportsApi.aiGenerate(query);

      // Check if we got empty results
      if (
        !result.results?.rows?.length &&
        !result.results?.groupedData?.length
      ) {
        setError({
          type: "no_results",
          message: ERROR_MESSAGES.no_results,
        });
        return;
      }

      setGeneratedResult(result);
    } catch (err: unknown) {
      // Determine error type from response
      const axiosError = err as {
        response?: { status?: number; data?: { message?: string } };
      };
      const status = axiosError?.response?.status;
      const message = axiosError?.response?.data?.message || "";

      if (status === 503 || message.toLowerCase().includes("unavailable")) {
        setError({
          type: "unavailable",
          message: ERROR_MESSAGES.unavailable,
        });
      } else if (
        status === 429 ||
        message.toLowerCase().includes("rate limit")
      ) {
        setError({
          type: "rate_limit",
          message: ERROR_MESSAGES.rate_limit,
        });
      } else {
        setError({
          type: "generic",
          message: ERROR_MESSAGES.generic,
        });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [query]);

  const handleSaveAsReport = useCallback(() => {
    if (!generatedResult) return;

    onReportGenerated(generatedResult.report, generatedResult.results);
    onOpenChange(false);

    // Reset state for next use
    setQuery("");
    setGeneratedResult(null);
    setError(null);
  }, [generatedResult, onReportGenerated, onOpenChange]);

  const handleRefine = useCallback(() => {
    // Keep the query, clear results so user can edit and regenerate
    setGeneratedResult(null);
  }, []);

  const handleClose = useCallback(() => {
    onOpenChange(false);
    // Reset state when closing
    setQuery("");
    setGeneratedResult(null);
    setError(null);
    setIsGenerating(false);
  }, [onOpenChange]);

  // Format visualization type for display
  const formatVisualization = (viz: string | undefined): string => {
    if (!viz) return "Table";
    return viz
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Generate Report with AI
          </DialogTitle>
          <DialogDescription>
            Describe the report you want in plain English
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          {/* Query Input */}
          <div className="space-y-3">
            <Textarea
              placeholder="e.g., Show me all open cases from the last 30 days grouped by category"
              value={query}
              onChange={handleQueryChange}
              rows={4}
              disabled={isGenerating}
              className="resize-none"
            />

            {/* Example Queries */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Try an example:</p>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_QUERIES.map((example, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="cursor-pointer hover:bg-muted transition-colors text-xs"
                    onClick={() => handleExampleClick(example)}
                  >
                    {example}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div className="flex items-center justify-center py-8 gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                AI is analyzing your question...
              </span>
            </div>
          )}

          {/* Results Preview */}
          {generatedResult && !isGenerating && (
            <ScrollArea className="flex-1 min-h-0">
              <div className="space-y-4 pr-4">
                {/* AI Interpretation */}
                <div className="space-y-1">
                  <p className="text-sm font-medium">AI Interpretation</p>
                  <p className="text-sm text-muted-foreground italic">
                    {generatedResult.interpretation}
                  </p>
                </div>

                <Separator />

                {/* Report Config Summary */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Report Configuration</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary">
                      Entity:{" "}
                      {generatedResult.report.entityType?.replace(/_/g, " ") ||
                        "Cases"}
                    </Badge>
                    <Badge variant="secondary">
                      Fields: {generatedResult.report.columns?.length || 0}
                    </Badge>
                    <Badge variant="secondary">
                      Filters: {generatedResult.report.filters?.length || 0}
                    </Badge>
                    <Badge variant="secondary">
                      Visualization:{" "}
                      {formatVisualization(
                        generatedResult.report.visualization,
                      )}
                    </Badge>
                  </div>
                </div>

                <Separator />

                {/* Results Preview */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    Results Preview ({generatedResult.results.totalCount} rows)
                  </p>

                  {/* Simple table preview */}
                  {generatedResult.results.rows.length > 0 && (
                    <div className="border rounded-md overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-muted">
                            <tr>
                              {generatedResult.results.columns
                                .slice(0, 5)
                                .map((col) => (
                                  <th
                                    key={col.key}
                                    className="px-3 py-2 text-left font-medium"
                                  >
                                    {col.label}
                                  </th>
                                ))}
                              {generatedResult.results.columns.length > 5 && (
                                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                                  +{generatedResult.results.columns.length - 5}{" "}
                                  more
                                </th>
                              )}
                            </tr>
                          </thead>
                          <tbody>
                            {generatedResult.results.rows
                              .slice(0, 5)
                              .map((row, idx) => (
                                <tr key={idx} className="border-t">
                                  {generatedResult.results.columns
                                    .slice(0, 5)
                                    .map((col) => (
                                      <td
                                        key={col.key}
                                        className="px-3 py-2 truncate max-w-[200px]"
                                      >
                                        {formatCellValue(row[col.key])}
                                      </td>
                                    ))}
                                  {generatedResult.results.columns.length >
                                    5 && <td className="px-3 py-2">...</td>}
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                      {generatedResult.results.rows.length > 5 && (
                        <div className="px-3 py-2 bg-muted text-xs text-muted-foreground text-center">
                          Showing 5 of {generatedResult.results.totalCount} rows
                        </div>
                      )}
                    </div>
                  )}

                  {/* Grouped data preview for charts */}
                  {generatedResult.results.groupedData &&
                    generatedResult.results.groupedData.length > 0 && (
                      <div className="border rounded-md overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium">
                                  Group
                                </th>
                                <th className="px-3 py-2 text-right font-medium">
                                  Value
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {generatedResult.results.groupedData
                                .slice(0, 5)
                                .map((item, idx) => (
                                  <tr key={idx} className="border-t">
                                    <td className="px-3 py-2">{item.label}</td>
                                    <td className="px-3 py-2 text-right">
                                      {item.value.toLocaleString()}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                        {generatedResult.results.groupedData.length > 5 && (
                          <div className="px-3 py-2 bg-muted text-xs text-muted-foreground text-center">
                            Showing 5 of{" "}
                            {generatedResult.results.groupedData.length} groups
                          </div>
                        )}
                      </div>
                    )}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="flex-shrink-0">
          {!generatedResult ? (
            <Button
              onClick={handleGenerate}
              disabled={!query.trim() || isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          ) : (
            <div className="flex gap-2 w-full justify-end">
              <Button variant="outline" onClick={handleRefine}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refine
              </Button>
              <Button onClick={handleSaveAsReport}>
                <Save className="h-4 w-4 mr-2" />
                Save as Report
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Format a cell value for display in the preview table
 */
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "-";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (value instanceof Date) {
    return value.toLocaleDateString();
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
