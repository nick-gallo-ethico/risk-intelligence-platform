/**
 * Workflow Canvas Component
 *
 * React Flow canvas for visual workflow editing.
 * Supports drag-drop from palette, connection by handles,
 * keyboard shortcuts for deletion, and viewport controls.
 */

"use client";

import { useCallback, useRef, useEffect, type DragEvent } from "react";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useReactFlow,
  type ReactFlowInstance,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { StageNode, type StageNodeData } from "./stage-node";
import { TransitionEdge, type TransitionEdgeData } from "./transition-edge";
import type { StageDragData, StagePreset } from "./use-workflow-builder";

// ============================================================================
// Node and Edge Type Registration (MUST be outside component to prevent re-renders)
// ============================================================================

const nodeTypes = {
  stage: StageNode,
} as const;

const edgeTypes = {
  transition: TransitionEdge,
} as const;

// ============================================================================
// Types
// ============================================================================

interface WorkflowCanvasProps {
  nodes: Node<StageNodeData>[];
  edges: Edge<TransitionEdgeData>[];
  onNodesChange: OnNodesChange<Node<StageNodeData>>;
  onEdgesChange: OnEdgesChange<Edge<TransitionEdgeData>>;
  onConnect: OnConnect;
  onAddStage: (preset: StagePreset, position: { x: number; y: number }) => void;
  onRemoveSelected: () => void;
}

// ============================================================================
// Canvas Component
// ============================================================================

export function WorkflowCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onAddStage,
  onRemoveSelected,
}: WorkflowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useRef<ReactFlowInstance<
    Node<StageNodeData>,
    Edge<TransitionEdgeData>
  > | null>(null);
  const { fitView } = useReactFlow();

  // Handle drop from palette
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();

      if (!reactFlowInstance.current || !reactFlowWrapper.current) return;

      // Parse drag data
      const dataStr = e.dataTransfer.getData("application/json");
      if (!dataStr) return;

      let dragData: StageDragData;
      try {
        dragData = JSON.parse(dataStr);
      } catch {
        return;
      }

      // Convert screen coordinates to flow position
      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.current.screenToFlowPosition({
        x: e.clientX - bounds.left,
        y: e.clientY - bounds.top,
      });

      onAddStage(dragData.preset, position);
    },
    [onAddStage],
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete or Backspace removes selected elements
      if (e.key === "Delete" || e.key === "Backspace") {
        // Don't trigger if user is typing in an input
        const target = e.target as HTMLElement;
        if (
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable
        ) {
          return;
        }

        e.preventDefault();
        onRemoveSelected();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onRemoveSelected]);

  // Fit view on initial load
  useEffect(() => {
    if (nodes.length > 0) {
      // Small delay to ensure nodes are rendered
      const timer = setTimeout(() => fitView({ padding: 0.2 }), 100);
      return () => clearTimeout(timer);
    }
  }, [nodes.length, fitView]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={(instance) => {
          reactFlowInstance.current = instance;
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{
          type: "transition",
          animated: false,
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        deleteKeyCode={null} // We handle deletion manually
        proOptions={{ hideAttribution: true }}
        className="bg-slate-100"
      >
        {/* Dot pattern background */}
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="#cbd5e1"
        />

        {/* Minimap at bottom-right */}
        <MiniMap
          nodeColor={(node) => {
            const stage = (node.data as StageNodeData)?.stage;
            return stage?.display?.color ?? "#3b82f6";
          }}
          nodeStrokeWidth={3}
          zoomable
          pannable
          className="bg-white rounded shadow-sm border"
        />

        {/* Controls at bottom-left */}
        <Controls
          showInteractive={false}
          className="bg-white rounded shadow-sm border"
        />
      </ReactFlow>
    </div>
  );
}
