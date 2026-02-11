/**
 * Custom React Flow node for workflow stages.
 *
 * Renders a stage as a card with:
 * - Top color bar from stage.display?.color
 * - Stage name (bold, truncated)
 * - Start/End badges for initial/terminal stages
 * - Step count, gates count, SLA days
 * - Connection handles at top (target) and bottom (source)
 */

import { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Clock, Lock, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowStage } from "@/types/workflow";

/**
 * Data type for stage nodes.
 */
export interface StageNodeData extends Record<string, unknown> {
  stage: WorkflowStage;
  isInitial: boolean;
}

/**
 * Node type definition for React Flow registration.
 */
export type StageNodeType = Node<StageNodeData, "stage">;

/**
 * Custom stage node component.
 */
function StageNodeComponent({ data, selected }: NodeProps<StageNodeType>) {
  const { stage, isInitial } = data;
  const stepCount = stage.steps?.length ?? 0;
  const gateCount = stage.gates?.length ?? 0;
  const stageColor = stage.display?.color ?? "#3b82f6"; // Default blue-500

  return (
    <div
      className={cn(
        "relative bg-white rounded-lg border shadow-sm transition-all",
        "min-w-[200px] max-w-[280px]",
        selected
          ? "ring-2 ring-blue-500 ring-offset-2 shadow-md"
          : "hover:shadow-md",
      )}
    >
      {/* Target handle at top */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white hover:!bg-blue-500"
      />

      {/* Color bar at top */}
      <div
        className="h-1 w-full rounded-t-lg"
        style={{ backgroundColor: stageColor }}
      />

      {/* Content */}
      <div className="p-3">
        {/* Header: Name + Badges */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-sm text-gray-900 truncate flex-1">
            {stage.name}
          </h3>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isInitial && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                Start
              </span>
            )}
            {stage.isTerminal && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800">
                End
              </span>
            )}
          </div>
        </div>

        {/* Description (if present) */}
        {stage.description && (
          <p className="text-xs text-gray-500 truncate mb-2">
            {stage.description}
          </p>
        )}

        {/* Metadata row */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {/* Step count */}
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3" />
            {stepCount} {stepCount === 1 ? "step" : "steps"}
          </span>

          {/* Gates count */}
          {gateCount > 0 && (
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              {gateCount} {gateCount === 1 ? "gate" : "gates"}
            </span>
          )}

          {/* SLA days */}
          {stage.slaDays !== undefined && stage.slaDays > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {stage.slaDays}d SLA
            </span>
          )}
        </div>
      </div>

      {/* Source handle at bottom */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white hover:!bg-blue-500"
      />
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const StageNode = memo(StageNodeComponent);
