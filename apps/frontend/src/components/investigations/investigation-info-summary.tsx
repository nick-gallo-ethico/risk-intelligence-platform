"use client";

import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Investigation, InvestigationStatus } from "@/types/investigation";

interface InvestigationInfoSummaryProps {
  investigation: Investigation;
}

const STATUS_COLORS: Record<InvestigationStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  ASSIGNED: "bg-indigo-100 text-indigo-800",
  INVESTIGATING: "bg-yellow-100 text-yellow-800",
  PENDING_REVIEW: "bg-orange-100 text-orange-800",
  CLOSED: "bg-gray-100 text-gray-800",
  ON_HOLD: "bg-slate-100 text-slate-800",
};

/**
 * Investigation info summary card for left sidebar.
 *
 * Displays:
 * - Investigation number (bold)
 * - Status and type badges
 * - Milestone checklist showing investigation progress
 * - Created date and creator
 */
export function InvestigationInfoSummary({
  investigation,
}: InvestigationInfoSummaryProps) {
  // Calculate checklist progress
  const checklistProgress = investigation.checklistProgress || 0;
  const hasTemplate = !!investigation.templateId;
  const hasFindings =
    investigation.status === "PENDING_REVIEW" ||
    investigation.status === "CLOSED";

  // Get assigned investigators
  const hasAssignedInvestigators =
    (investigation.assignedInvestigators &&
      investigation.assignedInvestigators.length > 0) ||
    investigation.primaryInvestigatorId;

  // Get interview count
  const interviewsCount = investigation.interviewsCount || 0;

  // Milestone checklist items
  const milestones = [
    {
      label: "Assigned to investigators",
      complete: !!hasAssignedInvestigators,
    },
    {
      label: "Template applied",
      complete: hasTemplate,
    },
    {
      label: `Checklist ${checklistProgress}% complete`,
      complete: checklistProgress >= 100,
      inProgress: checklistProgress > 0 && checklistProgress < 100,
    },
    {
      label: "Interviews scheduled",
      complete: interviewsCount > 0,
    },
    {
      label: "Findings recorded",
      complete: hasFindings,
    },
  ];

  // Get investigation type
  const investigationType =
    investigation.type || investigation.investigationType;

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm font-semibold">
          Investigation #{investigation.investigationNumber}
        </CardTitle>
        <div className="flex items-center gap-2 mt-1">
          <Badge
            className={cn("border-0", STATUS_COLORS[investigation.status])}
          >
            {investigation.status?.replace("_", " ")}
          </Badge>
          {investigationType && (
            <Badge variant="outline">{investigationType}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="py-2 px-4">
        {/* Progress checklist */}
        <div className="space-y-2">
          {milestones.map((milestone, idx) => (
            <div key={idx} className="flex items-start gap-2">
              {milestone.complete ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
              ) : milestone.inProgress ? (
                <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-gray-300 mt-0.5 flex-shrink-0" />
              )}
              <span
                className={cn(
                  "text-sm",
                  milestone.complete ? "text-gray-700" : "text-gray-500",
                )}
              >
                {milestone.label}
              </span>
            </div>
          ))}
        </div>

        {/* Created info */}
        <div className="mt-4 pt-3 border-t text-xs text-gray-500">
          <p>
            Created:{" "}
            {new Date(investigation.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          {investigation.createdBy && (
            <p>
              By: {investigation.createdBy.firstName}{" "}
              {investigation.createdBy.lastName}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
