"use client";

import Link from "next/link";
import {
  ChevronRight,
  MoreHorizontal,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type {
  Investigation,
  InvestigationStatus,
  InvestigationType,
  SlaStatus,
} from "@/types/investigation";

interface InvestigationHeaderProps {
  investigation: Investigation;
  onAssign?: () => void;
  onStatusChange?: () => void;
}

// Pipeline stages for investigations
const PIPELINE_STAGES = [
  "New",
  "Assigned",
  "Investigating",
  "Review",
  "Closed",
];

// Status badge colors
const STATUS_COLORS: Record<InvestigationStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-indigo-100 text-indigo-800",
  INVESTIGATING: "bg-yellow-100 text-yellow-800",
  PENDING_REVIEW: "bg-orange-100 text-orange-800",
  CLOSED: "bg-gray-100 text-gray-800",
  ON_HOLD: "bg-slate-100 text-slate-800",
};

// Type badge colors
const TYPE_COLORS: Record<InvestigationType, string> = {
  FULL: "bg-purple-100 text-purple-800",
  LIMITED: "bg-blue-100 text-blue-800",
  INQUIRY: "bg-gray-100 text-gray-800",
};

// SLA status colors
const SLA_COLORS: Record<SlaStatus, string> = {
  ON_TRACK: "bg-green-50 text-green-700 border-green-200",
  WARNING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  OVERDUE: "bg-red-50 text-red-700 border-red-200",
};

/**
 * Investigation header with breadcrumbs, badges, pipeline progress, and meta info.
 *
 * Matches the case detail header pattern for consistent UX across record pages.
 */
export function InvestigationHeader({
  investigation,
  onAssign,
  onStatusChange,
}: InvestigationHeaderProps) {
  // Determine current pipeline stage index
  const currentStageIndex = (() => {
    switch (investigation.status) {
      case "NEW":
        return 0;
      case "ASSIGNED":
        return 1;
      case "INVESTIGATING":
        return 2;
      case "PENDING_REVIEW":
        return 3;
      case "CLOSED":
        return 4;
      case "ON_HOLD":
        return 2; // Show at investigating stage when on hold
      default:
        return 0;
    }
  })();

  // Calculate days since creation
  const daysOpen = Math.floor(
    (Date.now() - new Date(investigation.createdAt).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  // Get SLA status
  const slaStatus = investigation.slaStatus || "ON_TRACK";

  // Get investigation type (prefer type alias, fallback to investigationType)
  const investigationType =
    investigation.type || investigation.investigationType;

  // Get assigned investigators from array or construct from primary
  const assignedInvestigators =
    investigation.assignedInvestigators ||
    (investigation.primaryInvestigator
      ? [investigation.primaryInvestigator]
      : []);

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-gray-500">
        <Link href="/cases" className="hover:text-gray-700">
          Cases
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <Link
          href={`/cases/${investigation.caseId}`}
          className="hover:text-gray-700"
        >
          {investigation.case?.referenceNumber || "Case"}
        </Link>
        <ChevronRight className="h-4 w-4 mx-1" />
        <span className="text-gray-900 font-medium">
          Investigation #{investigation.investigationNumber}
        </span>
      </nav>

      {/* Title row */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          {/* Title + Badges */}
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">
              Investigation #{investigation.investigationNumber}
            </h1>
            <Badge
              className={cn("border-0", STATUS_COLORS[investigation.status])}
            >
              {investigation.status?.replace("_", " ")}
            </Badge>
            {investigationType && (
              <Badge className={cn("border-0", TYPE_COLORS[investigationType])}>
                {investigationType}
              </Badge>
            )}
            <Badge
              variant="outline"
              className={cn("border", SLA_COLORS[slaStatus])}
            >
              {slaStatus === "ON_TRACK" && "On Track"}
              {slaStatus === "WARNING" && (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Warning
                </>
              )}
              {slaStatus === "OVERDUE" && (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Overdue
                </>
              )}
            </Badge>
          </div>

          {/* Category */}
          {investigation.category && (
            <p className="text-sm text-gray-600">
              {investigation.category.name}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAssign}>
            Assign
          </Button>
          <Button variant="outline" size="sm" onClick={onStatusChange}>
            Status
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Export</DropdownMenuItem>
              <DropdownMenuItem>Print</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Info row - Pipeline + Meta */}
      <div className="flex items-center justify-between pt-4 border-t flex-wrap gap-4">
        {/* Pipeline progress */}
        <div className="flex items-center gap-1">
          {PIPELINE_STAGES.map((stage, idx) => (
            <div key={stage} className="flex items-center">
              <div
                className={cn(
                  "w-24 h-2 rounded-full",
                  idx < currentStageIndex
                    ? "bg-green-500"
                    : idx === currentStageIndex
                      ? investigation.status === "ON_HOLD"
                        ? "bg-slate-400"
                        : "bg-blue-500"
                      : "bg-gray-200",
                )}
              />
              {idx < PIPELINE_STAGES.length - 1 && <div className="w-1" />}
            </div>
          ))}
          <span className="text-xs text-gray-500 ml-2">
            {investigation.status === "ON_HOLD"
              ? "On Hold"
              : PIPELINE_STAGES[currentStageIndex]}
          </span>
        </div>

        {/* Meta info */}
        <div className="flex items-center gap-6 text-sm text-gray-500">
          {/* Created date */}
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>
              {new Date(investigation.createdAt).toLocaleDateString()} ·{" "}
              {daysOpen}d
            </span>
          </div>

          {/* Assigned investigators */}
          {assignedInvestigators.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-2">
                {assignedInvestigators.slice(0, 3).map((inv) => (
                  <Avatar
                    key={inv.id}
                    className="h-6 w-6 border-2 border-white"
                  >
                    <AvatarFallback className="text-xs bg-gray-200">
                      {inv.firstName?.[0]}
                      {inv.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {assignedInvestigators.length > 3 && (
                  <Avatar className="h-6 w-6 border-2 border-white">
                    <AvatarFallback className="text-xs bg-gray-200">
                      +{assignedInvestigators.length - 3}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
          )}

          {/* SLA Due */}
          {investigation.dueDate && (
            <div className="flex items-center gap-1">
              <span>
                Due: {new Date(investigation.dueDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
