"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Next due action info for remediation status.
 */
export interface NextRemediationAction {
  title: string;
  dueDate: string;
  assignee: string;
}

export interface RemediationStatusCardProps {
  /** Case ID for linking */
  caseId: string;
  /** Total number of remediation actions */
  totalActions: number;
  /** Number of completed remediation actions */
  completedActions: number;
  /** Next due action details */
  nextAction?: NextRemediationAction;
  /** Handler to navigate to remediation tab */
  onViewPlan: () => void;
}

/**
 * Format date to short display (e.g., "Mar 15, 2026")
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * RemediationStatusCard displays remediation plan progress summary.
 *
 * Per spec Section 17.4:
 * - Progress bar showing completion percentage
 * - "{completed} of {total} actions complete" text
 * - Next due action if exists
 * - "View remediation plan" link at bottom
 */
export function RemediationStatusCard({
  caseId,
  totalActions,
  completedActions,
  nextAction,
  onViewPlan,
}: RemediationStatusCardProps) {
  const hasRemediation = totalActions > 0;
  const percentage =
    totalActions > 0 ? Math.round((completedActions / totalActions) * 100) : 0;

  return (
    <Card className="shadow-sm">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-900">
            Remediation Status
          </span>
        </div>
      </CardHeader>

      <CardContent className="py-2 px-4">
        {!hasRemediation ? (
          <div className="text-center py-2">
            <p className="text-sm text-muted-foreground mb-1">
              No remediation plan created
            </p>
            <p className="text-xs text-muted-foreground">
              Create a remediation plan from the Remediation tab.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{percentage}%</span>
              </div>
              <Progress
                value={completedActions}
                max={totalActions}
                className={cn(
                  "h-2",
                  percentage === 100 && "[&>div]:bg-green-500",
                )}
              />
              <p className="text-sm text-muted-foreground">
                {completedActions} of {totalActions} actions complete
              </p>
            </div>

            {/* Next due action */}
            {nextAction && (
              <div className="border-t pt-3 space-y-1">
                <p className="text-xs text-muted-foreground">Next due:</p>
                <p
                  className="text-sm font-medium truncate"
                  title={nextAction.title}
                >
                  {nextAction.title}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Due: {formatDate(nextAction.dueDate)}</span>
                  <span>Assigned: {nextAction.assignee}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="py-2 px-4 border-t">
        <button
          onClick={onViewPlan}
          className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
        >
          View remediation plan
          <ChevronRight className="h-3 w-3" />
        </button>
      </CardFooter>
    </Card>
  );
}

export default RemediationStatusCard;
