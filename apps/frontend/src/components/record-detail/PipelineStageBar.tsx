"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toaster";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { PipelineStage } from "@/types/record-detail";

/**
 * Stage history entry for tracking when stages were entered/exited.
 */
interface StageHistoryEntry {
  stageId: string;
  enteredAt: string;
  exitedAt?: string;
}

/**
 * Props for the PipelineStageBar component.
 */
interface PipelineStageBarProps {
  /** Array of all pipeline stages in order */
  stages: PipelineStage[];
  /** The ID of the current stage */
  currentStageId: string;
  /** ISO date string when current stage was entered */
  stageEnteredAt?: string;
  /** History of stage transitions for tooltips */
  stageHistory?: StageHistoryEntry[];
  /** Callback to request a stage transition */
  onStageTransition: (stageId: string, rationale?: string) => Promise<void>;
  /** Check if transition to a stage is allowed */
  canTransitionTo: (stageId: string) => boolean;
  /** Whether a transition is currently in progress */
  isTransitioning?: boolean;
  /** Number of days in current stage (pre-calculated) */
  daysInCurrentStage?: number;
}

/**
 * PipelineStageBar - Horizontal pipeline visualization with click-to-advance.
 *
 * Features:
 * - Position: sticky at top of center column
 * - Visual distinction: completed (filled + checkmark), current (filled + pulse), future (outlined)
 * - Click to advance with confirmation dialog and rationale field
 * - "In stage for N days" chip below current stage
 * - Hover tooltips with stage info, entry date, time spent
 *
 * @example
 * ```tsx
 * const { stages, canTransitionTo, requestTransition, daysInCurrentStage, isTransitioning } = usePipeline({...});
 *
 * <PipelineStageBar
 *   stages={stages}
 *   currentStageId="active"
 *   stageEnteredAt="2026-02-01T00:00:00Z"
 *   onStageTransition={requestTransition}
 *   canTransitionTo={canTransitionTo}
 *   isTransitioning={isTransitioning}
 *   daysInCurrentStage={daysInCurrentStage}
 * />
 * ```
 */
export function PipelineStageBar({
  stages,
  currentStageId,
  stageEnteredAt,
  stageHistory = [],
  onStageTransition,
  canTransitionTo,
  isTransitioning = false,
  daysInCurrentStage = 0,
}: PipelineStageBarProps) {
  const [selectedStageId, setSelectedStageId] = useState<string | null>(null);
  const [rationale, setRationale] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const currentStageIndex = stages.findIndex((s) => s.id === currentStageId);
  const currentStage = stages[currentStageIndex];
  const selectedStage = stages.find((s) => s.id === selectedStageId);

  /**
   * Handle click on a stage circle.
   * Opens confirmation dialog if transition is allowed, otherwise shows toast.
   */
  const handleStageClick = (stageId: string) => {
    // Don't allow clicking current stage
    if (stageId === currentStageId) return;

    if (canTransitionTo(stageId)) {
      setSelectedStageId(stageId);
      setRationale("");
      setIsDialogOpen(true);
    } else {
      toast.error("Transition not available", {
        description: `Cannot move from "${currentStage?.name || "current"}" to "${stages.find((s) => s.id === stageId)?.name || stageId}". Check allowed transitions.`,
      });
    }
  };

  /**
   * Confirm the stage transition.
   */
  const handleConfirmTransition = async () => {
    if (!selectedStageId) return;

    try {
      await onStageTransition(selectedStageId, rationale || undefined);
      setIsDialogOpen(false);
      setSelectedStageId(null);
      setRationale("");
      toast.success("Stage updated", {
        description: `Moved to "${selectedStage?.name}"`,
      });
    } catch (error) {
      toast.error("Failed to update stage", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    }
  };

  /**
   * Get stage status based on position relative to current stage.
   */
  const getStageStatus = (
    stageIndex: number,
  ): "completed" | "current" | "future" => {
    if (stageIndex < currentStageIndex) return "completed";
    if (stageIndex === currentStageIndex) return "current";
    return "future";
  };

  /**
   * Get history entry for a stage (for tooltip info).
   */
  const getStageHistory = (stageId: string): StageHistoryEntry | undefined => {
    return stageHistory.find((h) => h.stageId === stageId);
  };

  /**
   * Calculate days spent in a stage from history.
   */
  const getDaysInStage = (history: StageHistoryEntry): number => {
    const entered = new Date(history.enteredAt);
    const exited = history.exitedAt ? new Date(history.exitedAt) : new Date();
    return Math.max(
      0,
      Math.floor(
        (exited.getTime() - entered.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
  };

  /**
   * Format date for tooltip display.
   */
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 py-4 px-4">
        <TooltipProvider>
          <div className="flex items-center justify-between">
            {stages.map((stage, index) => {
              const status = getStageStatus(index);
              const history = getStageHistory(stage.id);
              const isLast = index === stages.length - 1;

              return (
                <div key={stage.id} className="flex items-center flex-1">
                  {/* Stage circle and label */}
                  <div className="flex flex-col items-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => handleStageClick(stage.id)}
                          disabled={
                            isTransitioning || stage.id === currentStageId
                          }
                          className={cn(
                            "relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                            status === "completed" && [
                              "bg-green-500 text-white",
                              "hover:bg-green-600 cursor-pointer",
                            ],
                            status === "current" && [
                              "text-white cursor-default",
                              "ring-4 ring-opacity-30 animate-pulse",
                            ],
                            status === "future" && [
                              "border-2 border-gray-300 bg-white text-gray-400",
                              canTransitionTo(stage.id)
                                ? "hover:border-blue-400 hover:text-blue-500 cursor-pointer"
                                : "cursor-not-allowed",
                            ],
                            isTransitioning && "opacity-50 cursor-wait",
                          )}
                          style={
                            status === "current"
                              ? {
                                  backgroundColor: stage.color,
                                  boxShadow: `0 0 0 4px ${stage.color}40`,
                                }
                              : undefined
                          }
                          aria-label={`${stage.name} - ${status}`}
                        >
                          {status === "completed" ? (
                            <Check className="w-4 h-4" />
                          ) : isTransitioning &&
                            stage.id === selectedStageId ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span className="text-xs font-semibold">
                              {index + 1}
                            </span>
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-xs p-3">
                        <div className="space-y-1">
                          <p className="font-semibold">{stage.name}</p>
                          {stage.description && (
                            <p className="text-sm text-muted-foreground">
                              {stage.description}
                            </p>
                          )}
                          {(status === "completed" || status === "current") &&
                            history && (
                              <>
                                <p className="text-sm">
                                  <span className="text-muted-foreground">
                                    Entered:{" "}
                                  </span>
                                  {formatDate(history.enteredAt)}
                                </p>
                                <p className="text-sm">
                                  <span className="text-muted-foreground">
                                    Time in stage:{" "}
                                  </span>
                                  {getDaysInStage(history)} days
                                </p>
                              </>
                            )}
                          {status === "current" &&
                            stageEnteredAt &&
                            !history && (
                              <>
                                <p className="text-sm">
                                  <span className="text-muted-foreground">
                                    Entered:{" "}
                                  </span>
                                  {formatDate(stageEnteredAt)}
                                </p>
                                <p className="text-sm">
                                  <span className="text-muted-foreground">
                                    Time in stage:{" "}
                                  </span>
                                  {daysInCurrentStage} days
                                </p>
                              </>
                            )}
                          {status === "future" && (
                            <p className="text-sm text-muted-foreground">
                              {canTransitionTo(stage.id)
                                ? "Click to advance to this stage"
                                : "Cannot transition to this stage yet"}
                            </p>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {/* Stage label */}
                    <span
                      className={cn(
                        "mt-2 text-xs text-center max-w-[80px] truncate",
                        status === "current" && "font-bold text-gray-900",
                        status === "completed" && "text-gray-700",
                        status === "future" && "text-gray-400",
                      )}
                    >
                      {stage.name}
                    </span>

                    {/* "In stage for N days" chip - only show for current stage */}
                    {status === "current" && daysInCurrentStage >= 0 && (
                      <Badge
                        variant="secondary"
                        className="mt-1 text-[10px] px-2 py-0"
                      >
                        {daysInCurrentStage === 0
                          ? "Today"
                          : daysInCurrentStage === 1
                            ? "1 day"
                            : `${daysInCurrentStage} days`}
                      </Badge>
                    )}
                  </div>

                  {/* Connecting line */}
                  {!isLast && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-2",
                        index < currentStageIndex
                          ? "bg-green-500"
                          : "bg-gray-200",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      {/* Confirmation dialog */}
      <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Move to {selectedStage?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will advance the case from &quot;{currentStage?.name}&quot;
              to &quot;
              {selectedStage?.name}&quot;.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <label
              htmlFor="rationale"
              className="text-sm font-medium text-gray-700"
            >
              Rationale (optional)
            </label>
            <Textarea
              id="rationale"
              placeholder="Add a note about why you're making this transition..."
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isTransitioning}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmTransition}
              disabled={isTransitioning}
            >
              {isTransitioning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Moving...
                </>
              ) : (
                "Confirm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default PipelineStageBar;
