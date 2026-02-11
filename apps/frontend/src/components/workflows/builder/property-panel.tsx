/**
 * Property Panel Component
 *
 * Right sidebar panel that shows properties for selected stages or transitions.
 * Switches between StageProperties and TransitionProperties based on selection.
 */

"use client";

import React, { useCallback } from "react";
import { Layers, ArrowRight } from "lucide-react";
import type { Node, Edge } from "@xyflow/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StageProperties } from "./stage-properties";
import { TransitionProperties } from "./transition-properties";
import type { StageNodeData } from "./stage-node";
import type { TransitionEdgeData } from "./transition-edge";
import type { WorkflowStage, WorkflowTransition } from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

export interface PropertyPanelProps {
  /** Currently selected node (if any) */
  selectedNode: Node<StageNodeData> | null;
  /** Currently selected edge (if any) */
  selectedEdge: Edge<TransitionEdgeData> | null;
  /** All nodes (for looking up stage names) */
  nodes: Node<StageNodeData>[];
  /** Callback when node data changes */
  onUpdateNode: (nodeId: string, stage: WorkflowStage) => void;
  /** Callback when edge data changes */
  onUpdateEdge: (edgeId: string, transition: WorkflowTransition) => void;
  /** Callback to set a stage as initial */
  onSetInitialStage: (stageId: string) => void;
}

// ============================================================================
// Component
// ============================================================================

export function PropertyPanel({
  selectedNode,
  selectedEdge,
  nodes,
  onUpdateNode,
  onUpdateEdge,
  onSetInitialStage,
}: PropertyPanelProps) {
  // Helper to get stage name by ID
  const getStageName = useCallback(
    (stageId: string): string => {
      const node = nodes.find((n) => n.id === stageId);
      return node?.data.stage.name ?? stageId;
    },
    [nodes],
  );

  // Handlers
  const handleStageUpdate = useCallback(
    (stage: WorkflowStage) => {
      if (selectedNode) {
        onUpdateNode(selectedNode.id, stage);
      }
    },
    [selectedNode, onUpdateNode],
  );

  const handleTransitionUpdate = useCallback(
    (transition: WorkflowTransition) => {
      if (selectedEdge) {
        onUpdateEdge(selectedEdge.id, transition);
      }
    },
    [selectedEdge, onUpdateEdge],
  );

  const handleSetInitial = useCallback(() => {
    if (selectedNode) {
      onSetInitialStage(selectedNode.id);
    }
  }, [selectedNode, onSetInitialStage]);

  // Render content based on selection
  const renderContent = () => {
    // Stage selected
    if (selectedNode) {
      return (
        <StageProperties
          stage={selectedNode.data.stage}
          isInitial={selectedNode.data.isInitial}
          onUpdate={handleStageUpdate}
          onSetInitial={handleSetInitial}
        />
      );
    }

    // Transition selected
    if (selectedEdge && selectedEdge.data?.transition) {
      return (
        <TransitionProperties
          transition={selectedEdge.data.transition}
          fromStageName={getStageName(selectedEdge.source)}
          toStageName={getStageName(selectedEdge.target)}
          onUpdate={handleTransitionUpdate}
        />
      );
    }

    // Nothing selected - show placeholder
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <Layers className="w-6 h-6 text-slate-400" />
        </div>
        <h3 className="font-medium text-sm text-slate-700 mb-1">
          No Selection
        </h3>
        <p className="text-xs text-slate-500 max-w-[200px]">
          Select a stage or transition on the canvas to view and edit its
          properties
        </p>
        <div className="mt-6 space-y-3 text-left">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <div className="w-5 h-5 rounded bg-blue-500" />
            <span>Click a stage to edit</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ArrowRight className="w-5 h-5 text-slate-400" />
            <span>Click a transition to edit</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-80 flex-shrink-0 border-l border-slate-200 bg-white flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-4">{renderContent()}</div>
      </ScrollArea>
    </div>
  );
}
