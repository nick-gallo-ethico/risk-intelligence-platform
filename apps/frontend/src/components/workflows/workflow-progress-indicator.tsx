"use client";

/**
 * Workflow Progress Indicator
 *
 * A REUSABLE component that renders a horizontal stage pipeline showing:
 * - Circles connected by lines representing stages
 * - Completed stages: green with checkmark
 * - Current stage: blue with pulsing animation
 * - Future stages: gray
 * - Stage names below circles, colors from display.color
 * - Scrollable if many stages
 * - Compact mode for embedding in cards
 *
 * Used by:
 * - Instance detail dialog (Plan 06)
 * - Case/Policy detail pages (Plan 07)
 */

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowStage } from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

export interface WorkflowProgressIndicatorProps {
  /** Stages in the workflow (in order) */
  stages: WorkflowStage[];
  /** Current stage ID */
  currentStage: string;
  /** Completed stage IDs (stages before current) */
  completedStages?: string[];
  /** Compact mode for embedding in cards */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_STAGE_COLOR = "#6b7280"; // gray-500
const COMPLETED_COLOR = "#22c55e"; // green-500
const CURRENT_COLOR = "#3b82f6"; // blue-500

// ============================================================================
// Helper Functions
// ============================================================================

function getStageStatus(
  stageId: string,
  currentStage: string,
  completedStages: string[],
): "completed" | "current" | "future" {
  if (completedStages.includes(stageId)) return "completed";
  if (stageId === currentStage) return "current";
  return "future";
}

function getStageColor(
  stage: WorkflowStage,
  status: "completed" | "current" | "future",
): string {
  if (status === "completed") return COMPLETED_COLOR;
  if (status === "current") return CURRENT_COLOR;
  return stage.display?.color || DEFAULT_STAGE_COLOR;
}

// ============================================================================
// Stage Circle Component
// ============================================================================

interface StageCircleProps {
  stage: WorkflowStage;
  status: "completed" | "current" | "future";
  compact?: boolean;
}

function StageCircle({ stage, status, compact }: StageCircleProps) {
  const size = compact ? "h-6 w-6" : "h-8 w-8";
  const iconSize = compact ? "h-3 w-3" : "h-4 w-4";
  const color = getStageColor(stage, status);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full border-2 transition-all",
        size,
        status === "completed" && "bg-green-500 border-green-500",
        status === "current" &&
          "border-blue-500 bg-blue-500 animate-pulse shadow-md shadow-blue-500/30",
        status === "future" && "border-gray-300 bg-white",
      )}
      style={
        status === "future"
          ? { borderColor: color, opacity: 0.5 }
          : status === "current"
            ? { borderColor: color, backgroundColor: color }
            : undefined
      }
    >
      {status === "completed" && (
        <Check className={cn(iconSize, "text-white")} strokeWidth={3} />
      )}
      {status === "current" && (
        <div
          className={cn(
            "rounded-full bg-white",
            compact ? "h-2 w-2" : "h-2.5 w-2.5",
          )}
        />
      )}
      {status === "future" && (
        <div
          className={cn("rounded-full", compact ? "h-2 w-2" : "h-2.5 w-2.5")}
          style={{ backgroundColor: color, opacity: 0.5 }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Connector Line Component
// ============================================================================

interface ConnectorLineProps {
  isCompleted: boolean;
  compact?: boolean;
}

function ConnectorLine({ isCompleted, compact }: ConnectorLineProps) {
  const width = compact ? "w-8" : "w-12";
  return (
    <div
      className={cn(
        "h-0.5 transition-colors",
        width,
        isCompleted ? "bg-green-500" : "bg-gray-200",
      )}
    />
  );
}

// ============================================================================
// Stage Label Component
// ============================================================================

interface StageLabelProps {
  stage: WorkflowStage;
  status: "completed" | "current" | "future";
  compact?: boolean;
}

function StageLabel({ stage, status, compact }: StageLabelProps) {
  return (
    <div
      className={cn(
        "absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap",
        compact ? "text-[10px]" : "text-xs",
        status === "completed" && "text-green-600 font-medium",
        status === "current" && "text-blue-600 font-medium",
        status === "future" && "text-muted-foreground",
      )}
    >
      {stage.name}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WorkflowProgressIndicator({
  stages,
  currentStage,
  completedStages = [],
  compact = false,
  className,
}: WorkflowProgressIndicatorProps) {
  if (!stages || stages.length === 0) {
    return null;
  }

  // Sort stages by display.sortOrder if available
  const sortedStages = [...stages].sort((a, b) => {
    const orderA = a.display?.sortOrder ?? 0;
    const orderB = b.display?.sortOrder ?? 0;
    return orderA - orderB;
  });

  return (
    <div
      className={cn(
        "overflow-x-auto pb-8",
        compact ? "pb-6" : "pb-8",
        className,
      )}
    >
      <div className="flex items-center justify-start min-w-max px-4">
        {sortedStages.map((stage, index) => {
          const status = getStageStatus(
            stage.id,
            currentStage,
            completedStages,
          );
          const isLastStage = index === sortedStages.length - 1;
          const prevStageCompleted =
            index === 0 || completedStages.includes(sortedStages[index - 1].id);
          const currentIsCompleted = completedStages.includes(stage.id);
          const lineCompleted =
            currentIsCompleted || (status === "current" && prevStageCompleted);

          return (
            <div key={stage.id} className="flex items-center">
              {/* Stage Circle with Label */}
              <div className="relative">
                <StageCircle stage={stage} status={status} compact={compact} />
                <StageLabel stage={stage} status={status} compact={compact} />
              </div>

              {/* Connector Line */}
              {!isLastStage && (
                <ConnectorLine
                  isCompleted={currentIsCompleted}
                  compact={compact}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
