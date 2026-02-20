"use client";

import {
  Calendar,
  Clock,
  Shield,
  AlertTriangle,
  Check,
  AlertCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Case, CaseStatus, Severity, SlaStatus } from "@/types/case";

/**
 * Status color configuration for case status badges
 */
const STATUS_CONFIG: Record<
  CaseStatus,
  { bg: string; text: string; label: string }
> = {
  NEW: {
    bg: "bg-blue-100 dark:bg-blue-900/50",
    text: "text-blue-800 dark:text-blue-200",
    label: "New",
  },
  OPEN: {
    bg: "bg-yellow-100 dark:bg-yellow-900/50",
    text: "text-yellow-800 dark:text-yellow-200",
    label: "Open",
  },
  CLOSED: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    label: "Closed",
  },
};

/**
 * Severity color configuration
 */
const SEVERITY_CONFIG: Record<
  Severity,
  { bg: string; text: string; label: string }
> = {
  LOW: {
    bg: "bg-green-100 dark:bg-green-900/50",
    text: "text-green-800 dark:text-green-200",
    label: "Low",
  },
  MEDIUM: {
    bg: "bg-yellow-100 dark:bg-yellow-900/50",
    text: "text-yellow-800 dark:text-yellow-200",
    label: "Medium",
  },
  HIGH: {
    bg: "bg-orange-100 dark:bg-orange-900/50",
    text: "text-orange-800 dark:text-orange-200",
    label: "High",
  },
};

/**
 * SLA status color configuration
 */
const SLA_CONFIG: Record<
  SlaStatus,
  { bg: string; text: string; icon: typeof Check; label: string }
> = {
  ON_TRACK: {
    bg: "bg-green-50 dark:bg-green-950/50",
    text: "text-green-700 dark:text-green-300",
    icon: Check,
    label: "On Track",
  },
  WARNING: {
    bg: "bg-yellow-50 dark:bg-yellow-950/50",
    text: "text-yellow-700 dark:text-yellow-300",
    icon: AlertTriangle,
    label: "Warning",
  },
  BREACHED: {
    bg: "bg-red-50 dark:bg-red-950/50",
    text: "text-red-700 dark:text-red-300",
    icon: AlertCircle,
    label: "Breached",
  },
  CRITICAL: {
    bg: "bg-red-100 dark:bg-red-900/50",
    text: "text-red-800 dark:text-red-200",
    icon: AlertCircle,
    label: "Critical",
  },
};

interface CaseInfoSummaryProps {
  caseData: Case | null;
  isLoading: boolean;
}

/**
 * Compact case information summary card for the left column.
 *
 * Displays:
 * - Reference number (bold, prominent)
 * - Status badge
 * - Severity badge
 * - Pipeline stage
 * - Days open
 * - Created date
 * - SLA status indicator
 */
export function CaseInfoSummary({ caseData, isLoading }: CaseInfoSummaryProps) {
  if (isLoading) {
    return <CaseInfoSummarySkeleton />;
  }

  if (!caseData) {
    return null;
  }

  const statusConfig = STATUS_CONFIG[caseData.status];
  const severityConfig = caseData.severity
    ? SEVERITY_CONFIG[caseData.severity]
    : null;
  const slaConfig = caseData.slaStatus ? SLA_CONFIG[caseData.slaStatus] : null;

  // Calculate days open
  const daysOpen = Math.floor(
    (Date.now() - new Date(caseData.createdAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  const formattedCreatedDate = new Date(caseData.createdAt).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    },
  );

  return (
    <div className="bg-card p-4">
      {/* Reference Number */}
      <h2 className="text-lg font-bold text-foreground font-mono mb-3">
        {caseData.referenceNumber}
      </h2>

      {/* Status and Severity Badges */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
            statusConfig.bg,
            statusConfig.text,
          )}
        >
          {statusConfig.label}
        </span>
        {severityConfig && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
              severityConfig.bg,
              severityConfig.text,
            )}
          >
            {severityConfig.label}
          </span>
        )}
      </div>

      {/* Info Grid */}
      <div className="space-y-3 border-t pt-3">
        {/* Pipeline Stage */}
        {caseData.pipelineStage && (
          <div className="flex items-center gap-2 text-sm">
            <Shield className="w-4 h-4 text-muted-foreground/70" />
            <span className="text-muted-foreground">Stage:</span>
            <span className="font-medium text-foreground capitalize">
              {caseData.pipelineStage.toLowerCase().replace("_", " ")}
            </span>
          </div>
        )}

        {/* Days Open */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground/70" />
          <span className="text-muted-foreground">Open:</span>
          <span className="font-medium text-foreground">
            {daysOpen === 0
              ? "Today"
              : daysOpen === 1
                ? "1 day"
                : `${daysOpen} days`}
          </span>
        </div>

        {/* Created Date */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-muted-foreground/70" />
          <span className="text-muted-foreground">Created:</span>
          <span className="font-medium text-foreground">
            {formattedCreatedDate}
          </span>
        </div>

        {/* SLA Status */}
        {slaConfig && (
          <div className="flex items-center gap-2 text-sm">
            <slaConfig.icon className={cn("w-4 h-4", slaConfig.text)} />
            <span className="text-muted-foreground">SLA:</span>
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                slaConfig.bg,
                slaConfig.text,
              )}
            >
              {slaConfig.label}
              {caseData.slaDueAt && (
                <span className="opacity-75">
                  (Due {new Date(caseData.slaDueAt).toLocaleDateString()})
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for CaseInfoSummary
 */
function CaseInfoSummarySkeleton() {
  return (
    <div className="bg-card p-4">
      {/* Reference Number */}
      <Skeleton className="h-6 w-36 mb-3" />

      {/* Badges */}
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-14 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Info Grid */}
      <div className="space-y-3 border-t pt-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}
