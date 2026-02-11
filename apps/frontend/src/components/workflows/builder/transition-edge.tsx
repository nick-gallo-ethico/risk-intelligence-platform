/**
 * Custom React Flow edge for workflow transitions.
 *
 * Renders a bezier edge with:
 * - Optional label at midpoint
 * - Condition indicator (filter icon) if conditions exist
 * - Reason indicator (message icon) if requiresReason
 * - Animated dashed line on hover/selection
 */

import { memo, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type Edge,
} from "@xyflow/react";
import { Filter, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowTransition } from "@/types/workflow";

/**
 * Data type for transition edges.
 */
export interface TransitionEdgeData extends Record<string, unknown> {
  transition: WorkflowTransition;
}

/**
 * Edge type definition for React Flow registration.
 */
export type TransitionEdgeType = Edge<TransitionEdgeData, "transition">;

/**
 * Custom transition edge component.
 */
function TransitionEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<TransitionEdgeType>) {
  const [isHovered, setIsHovered] = useState(false);

  const transition = data?.transition;
  const hasConditions = (transition?.conditions?.length ?? 0) > 0;
  const hasRequiresReason = transition?.requiresReason === true;
  const label = transition?.label;

  // Calculate bezier path
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Style based on selection/hover state
  const strokeColor = selected ? "#3b82f6" : "#94a3b8"; // blue-500 or slate-400
  const strokeWidth = selected ? 3 : 2;

  return (
    <>
      {/* Invisible wider path for easier hover/click */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Visible edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: isHovered || selected ? "5,5" : undefined,
          animation:
            isHovered || selected ? "dashdraw 0.5s linear infinite" : undefined,
        }}
      />

      {/* Label at midpoint */}
      {(label || hasConditions || hasRequiresReason) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
            }}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full",
              "bg-white border border-slate-200 text-xs text-slate-700",
              "shadow-sm transition-all",
              selected && "border-blue-300 bg-blue-50",
              isHovered && !selected && "border-slate-300",
            )}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {label && <span className="font-medium">{label}</span>}
            {hasConditions && (
              <Filter
                className="w-3 h-3 text-amber-600"
                aria-label="Has conditions"
              />
            )}
            {hasRequiresReason && (
              <MessageSquare
                className="w-3 h-3 text-blue-600"
                aria-label="Requires reason"
              />
            )}
          </div>
        </EdgeLabelRenderer>
      )}

      {/* CSS for dash animation */}
      <style>{`
        @keyframes dashdraw {
          from {
            stroke-dashoffset: 10;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </>
  );
}

// Memoize to prevent unnecessary re-renders
export const TransitionEdge = memo(TransitionEdgeComponent);
