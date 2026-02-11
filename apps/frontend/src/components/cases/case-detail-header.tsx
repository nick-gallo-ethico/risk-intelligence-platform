"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Check,
  Users,
  Clock,
  AlertTriangle,
  AlertCircle,
  ChevronDown,
  UserPlus,
  RefreshCw,
  GitMerge,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Case, CaseStatus, Severity, SlaStatus } from "@/types/case";

/**
 * Status color mapping for case status badges
 */
const STATUS_CONFIG: Record<
  CaseStatus,
  { bg: string; text: string; label: string }
> = {
  NEW: { bg: "bg-blue-100", text: "text-blue-800", label: "New" },
  OPEN: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Open" },
  CLOSED: { bg: "bg-gray-100", text: "text-gray-800", label: "Closed" },
};

/**
 * Severity color mapping - matches backend Prisma enum
 */
const SEVERITY_CONFIG: Record<
  Severity,
  { bg: string; text: string; label: string }
> = {
  LOW: { bg: "bg-green-100", text: "text-green-800", label: "Low" },
  MEDIUM: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Medium" },
  HIGH: { bg: "bg-orange-100", text: "text-orange-800", label: "High" },
};

/**
 * SLA status color mapping
 */
const SLA_CONFIG: Record<
  SlaStatus,
  { bg: string; text: string; icon: typeof Check; label: string }
> = {
  ON_TRACK: {
    bg: "bg-green-50",
    text: "text-green-700",
    icon: Check,
    label: "On Track",
  },
  WARNING: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    icon: AlertTriangle,
    label: "Warning",
  },
  BREACHED: {
    bg: "bg-red-50",
    text: "text-red-700",
    icon: AlertCircle,
    label: "Breached",
  },
  CRITICAL: {
    bg: "bg-red-100",
    text: "text-red-800",
    icon: AlertCircle,
    label: "Critical",
  },
};

/**
 * Pipeline stage progress mapping
 */
const PIPELINE_STAGES = [
  "INTAKE",
  "TRIAGE",
  "INVESTIGATION",
  "REVIEW",
  "CLOSURE",
];

interface CaseDetailHeaderProps {
  caseData: Case | null;
  isLoading: boolean;
  onAssign?: () => void;
  onChangeStatus?: () => void;
  onMerge?: () => void;
}

/**
 * Enhanced case detail header with comprehensive case information.
 *
 * Displays:
 * - Reference number with copy button
 * - Status and severity badges
 * - Pipeline stage progress indicator
 * - Category with icon
 * - Created date and case age
 * - Assigned investigators avatars
 * - SLA status indicator
 * - Quick action buttons
 */
export function CaseDetailHeader({
  caseData,
  isLoading,
  onAssign,
  onChangeStatus,
  onMerge,
}: CaseDetailHeaderProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const handleCopyReference = useCallback(async () => {
    if (!caseData?.referenceNumber) return;

    try {
      await navigator.clipboard.writeText(caseData.referenceNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy reference number:", error);
    }
  }, [caseData?.referenceNumber]);

  if (isLoading) {
    return <CaseDetailHeaderSkeleton />;
  }

  if (!caseData) {
    return null;
  }

  const statusConfig = STATUS_CONFIG[caseData.status];
  const severityConfig = caseData.severity
    ? SEVERITY_CONFIG[caseData.severity]
    : null;
  const slaConfig = caseData.slaStatus ? SLA_CONFIG[caseData.slaStatus] : null;

  // Calculate case age in days
  const caseAge = Math.floor(
    (Date.now() - new Date(caseData.createdAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  // Calculate pipeline progress
  const currentStageIndex = caseData.pipelineStage
    ? PIPELINE_STAGES.indexOf(caseData.pipelineStage.toUpperCase())
    : 0;
  const pipelineProgress =
    ((currentStageIndex + 1) / PIPELINE_STAGES.length) * 100;

  return (
    <div className="bg-white border-b">
      <div className="px-6 py-4">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-500 mb-3">
          <button
            onClick={() => router.push("/cases")}
            className="hover:text-gray-700 transition-colors"
          >
            Cases
          </button>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">
            {caseData.referenceNumber}
          </span>
        </nav>

        {/* Main Header Row */}
        <div className="flex items-start justify-between mb-4">
          {/* Left: Reference + Badges */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              {/* Reference Number with Copy */}
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 font-mono">
                  {caseData.referenceNumber}
                </h1>
                <button
                  onClick={handleCopyReference}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  aria-label="Copy reference number"
                  title="Copy reference number"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>

              {/* Status Badge */}
              <Badge
                variant="outline"
                className={cn(
                  statusConfig.bg,
                  statusConfig.text,
                  "border-transparent",
                )}
              >
                {statusConfig.label}
              </Badge>

              {/* Severity Badge */}
              {severityConfig && (
                <Badge
                  variant="outline"
                  className={cn(
                    severityConfig.bg,
                    severityConfig.text,
                    "border-transparent",
                  )}
                >
                  {severityConfig.label}
                </Badge>
              )}
            </div>

            {/* Category */}
            {caseData.category && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">{caseData.category.name}</span>
                {caseData.category.code && (
                  <span className="text-gray-400">
                    ({caseData.category.code})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onAssign}
              className="gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              Assign
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onChangeStatus}
              className="gap-1.5"
            >
              <RefreshCw className="w-4 h-4" />
              Status
              <ChevronDown className="w-3 h-3" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onMerge}
              className="gap-1.5"
            >
              <GitMerge className="w-4 h-4" />
              Merge
            </Button>
          </div>
        </div>

        {/* Summary */}
        {caseData.summary && (
          <p className="text-gray-600 line-clamp-2 mb-4">{caseData.summary}</p>
        )}

        {/* Info Row: Pipeline, Dates, Investigators, SLA */}
        <div className="flex items-center justify-between flex-wrap gap-4 pt-3 border-t">
          {/* Pipeline Stage */}
          {caseData.pipelineStage && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 uppercase font-medium">
                Stage
              </span>
              <div className="flex items-center gap-2 min-w-[180px]">
                <Progress value={pipelineProgress} className="w-20 h-1.5" />
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {caseData.pipelineStage.toLowerCase().replace("_", " ")}
                </span>
              </div>
            </div>
          )}

          {/* Created Date & Age */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-600">
              {new Date(caseData.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">
              {caseAge === 0 ? "Today" : `${caseAge}d old`}
            </span>
          </div>

          {/* Assigned Investigators */}
          {caseData.assignedInvestigators &&
            caseData.assignedInvestigators.length > 0 && (
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-gray-400" />
                <div className="flex -space-x-2">
                  {caseData.assignedInvestigators.slice(0, 3).map((user) => (
                    <Avatar
                      key={user.id}
                      className="w-7 h-7 border-2 border-white"
                    >
                      <AvatarImage
                        src={user.avatarUrl}
                        alt={`${user.firstName} ${user.lastName}`}
                      />
                      <AvatarFallback className="text-xs">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {caseData.assignedInvestigators.length > 3 && (
                    <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                      <span className="text-xs text-gray-600">
                        +{caseData.assignedInvestigators.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* SLA Status */}
          {slaConfig && (
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md",
                slaConfig.bg,
              )}
            >
              <slaConfig.icon className={cn("w-4 h-4", slaConfig.text)} />
              <span className={cn("text-sm font-medium", slaConfig.text)}>
                {slaConfig.label}
              </span>
              {caseData.slaDueAt && (
                <span className={cn("text-xs", slaConfig.text)}>
                  (Due {new Date(caseData.slaDueAt).toLocaleDateString()})
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for CaseDetailHeader
 */
export function CaseDetailHeaderSkeleton() {
  return (
    <div className="bg-white border-b">
      <div className="px-6 py-4">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-12" />
          <span className="text-gray-300">/</span>
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Main header skeleton */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>

        {/* Summary skeleton */}
        <Skeleton className="h-5 w-3/4 mb-4" />

        {/* Info row skeleton */}
        <div className="flex items-center justify-between pt-3 border-t">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}
