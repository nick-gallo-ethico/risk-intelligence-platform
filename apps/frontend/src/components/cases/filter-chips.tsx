"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CaseFilters } from "@/hooks/use-case-filters";
import type {
  CaseStatus,
  Severity,
  SourceChannel,
  CaseType,
} from "@/types/case";

interface FilterChipsProps {
  filters: CaseFilters;
  onClearFilter: (key: keyof CaseFilters, value?: string) => void;
  onClearAll: () => void;
  totalResults?: number;
}

const STATUS_LABELS: Record<CaseStatus, string> = {
  NEW: "New",
  OPEN: "Open",
  CLOSED: "Closed",
};

// Severity matches backend Prisma enum
const SEVERITY_LABELS: Record<Severity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

const SOURCE_LABELS: Record<SourceChannel, string> = {
  HOTLINE: "Hotline",
  WEB_FORM: "Web Form",
  PROXY: "Proxy",
  DIRECT_ENTRY: "Direct Entry",
  CHATBOT: "Chatbot",
};

// CaseType matches backend Prisma enum
const TYPE_LABELS: Record<CaseType, string> = {
  REPORT: "Report",
  RFI: "Request for Information",
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FilterChips({
  filters,
  onClearFilter,
  onClearAll,
  totalResults,
}: FilterChipsProps) {
  const hasFilters =
    filters.statuses.length > 0 ||
    filters.severities.length > 0 ||
    filters.sourceChannel ||
    filters.caseType ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.search;

  if (!hasFilters) {
    return totalResults !== undefined ? (
      <div className="text-sm text-muted-foreground">
        {totalResults} {totalResults === 1 ? "result" : "results"}
      </div>
    ) : null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {totalResults !== undefined && (
        <span className="text-sm text-muted-foreground mr-2">
          {totalResults} {totalResults === 1 ? "result" : "results"}
        </span>
      )}

      {/* Status chips */}
      {filters.statuses.map((status) => (
        <Badge
          key={`status-${status}`}
          variant="secondary"
          className="gap-1 pr-1"
        >
          Status: {STATUS_LABELS[status]}
          <button
            type="button"
            onClick={() => onClearFilter("statuses", status)}
            className="ml-1 rounded-full p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove {status} filter</span>
          </button>
        </Badge>
      ))}

      {/* Severity chips */}
      {filters.severities.map((severity) => (
        <Badge
          key={`severity-${severity}`}
          variant="secondary"
          className="gap-1 pr-1"
        >
          Severity: {SEVERITY_LABELS[severity]}
          <button
            type="button"
            onClick={() => onClearFilter("severities", severity)}
            className="ml-1 rounded-full p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove {severity} filter</span>
          </button>
        </Badge>
      ))}

      {/* Source channel chip */}
      {filters.sourceChannel && (
        <Badge variant="secondary" className="gap-1 pr-1">
          Source: {SOURCE_LABELS[filters.sourceChannel]}
          <button
            type="button"
            onClick={() => onClearFilter("sourceChannel")}
            className="ml-1 rounded-full p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove source filter</span>
          </button>
        </Badge>
      )}

      {/* Case type chip */}
      {filters.caseType && (
        <Badge variant="secondary" className="gap-1 pr-1">
          Type: {TYPE_LABELS[filters.caseType]}
          <button
            type="button"
            onClick={() => onClearFilter("caseType")}
            className="ml-1 rounded-full p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove type filter</span>
          </button>
        </Badge>
      )}

      {/* Date range chip */}
      {(filters.dateFrom || filters.dateTo) && (
        <Badge variant="secondary" className="gap-1 pr-1">
          Date:{" "}
          {filters.dateFrom && filters.dateTo
            ? `${formatDate(filters.dateFrom)} - ${formatDate(filters.dateTo)}`
            : filters.dateFrom
              ? `From ${formatDate(filters.dateFrom)}`
              : `Until ${formatDate(filters.dateTo!)}`}
          <button
            type="button"
            onClick={() => onClearFilter("dateFrom")}
            className="ml-1 rounded-full p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove date filter</span>
          </button>
        </Badge>
      )}

      {/* Search chip */}
      {filters.search && (
        <Badge variant="secondary" className="gap-1 pr-1">
          Search: &quot;{filters.search}&quot;
          <button
            type="button"
            onClick={() => onClearFilter("search")}
            className="ml-1 rounded-full p-0.5 hover:bg-muted"
          >
            <X className="h-3 w-3" />
            <span className="sr-only">Remove search filter</span>
          </button>
        </Badge>
      )}

      {/* Clear all button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="h-6 px-2 text-xs"
      >
        Clear all
      </Button>
    </div>
  );
}
