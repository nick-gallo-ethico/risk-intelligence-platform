/**
 * Workflow Builder State Hook
 *
 * Manages React Flow nodes and edges for the workflow builder canvas.
 * Provides converters between workflow domain types and React Flow types.
 */

import { useCallback, useMemo, useState } from "react";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import type {
  WorkflowStage,
  WorkflowTransition,
  WorkflowTemplate,
} from "@/types/workflow";
import type { StageNodeData } from "./stage-node";
import type { TransitionEdgeData } from "./transition-edge";

// ============================================================================
// Types
// ============================================================================

/**
 * Stage type presets for the palette.
 */
export type StagePreset = "standard" | "approval" | "terminal" | "notification";

/**
 * Data passed during drag-drop from palette.
 */
export interface StageDragData {
  preset: StagePreset;
}

/**
 * Return type for the workflow builder hook.
 */
export interface UseWorkflowBuilderReturn {
  // React Flow state
  nodes: Node<StageNodeData>[];
  edges: Edge<TransitionEdgeData>[];
  onNodesChange: OnNodesChange<Node<StageNodeData>>;
  onEdgesChange: OnEdgesChange<Edge<TransitionEdgeData>>;
  onConnect: OnConnect;

  // Selection state
  selectedNode: Node<StageNodeData> | null;
  selectedEdge: Edge<TransitionEdgeData> | null;

  // Actions
  loadTemplate: (template: WorkflowTemplate) => void;
  addStage: (preset: StagePreset, position: { x: number; y: number }) => void;
  removeSelected: () => void;
  setInitialStage: (stageId: string) => void;

  // State flags
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;

  // Export helpers
  nodesToStages: () => WorkflowStage[];
  edgesToTransitions: () => WorkflowTransition[];

  // Initial stage tracking
  initialStage: string | null;
}

// ============================================================================
// Converters
// ============================================================================

/**
 * Convert workflow stages to React Flow nodes.
 */
function stagesToNodes(
  stages: WorkflowStage[],
  initialStageId: string | null,
): Node<StageNodeData>[] {
  return stages.map((stage, index) => ({
    id: stage.id,
    type: "stage",
    position: { x: 0, y: index * 150 },
    data: {
      stage,
      isInitial: stage.id === initialStageId,
    },
  }));
}

/**
 * Convert workflow transitions to React Flow edges.
 */
function transitionsToEdges(
  transitions: WorkflowTransition[],
): Edge<TransitionEdgeData>[] {
  return transitions
    .filter((t) => t.from !== "*") // Skip wildcard transitions for visual builder
    .map((transition) => ({
      id: `${transition.from}-${transition.to}`,
      source: transition.from,
      target: transition.to,
      type: "transition",
      data: {
        transition,
      },
    }));
}

/**
 * Extract stages from React Flow nodes.
 */
function nodesBackToStages(nodes: Node<StageNodeData>[]): WorkflowStage[] {
  return nodes.map((node) => node.data.stage);
}

/**
 * Extract transitions from React Flow edges.
 */
function edgesBackToTransitions(
  edges: Edge<TransitionEdgeData>[],
): WorkflowTransition[] {
  return edges.map((edge) => ({
    from: edge.source,
    to: edge.target,
    label: edge.data?.transition?.label ?? "",
    conditions: edge.data?.transition?.conditions ?? [],
    actions: edge.data?.transition?.actions ?? [],
    allowedRoles: edge.data?.transition?.allowedRoles,
    requiresReason: edge.data?.transition?.requiresReason,
  }));
}

// ============================================================================
// Stage Presets
// ============================================================================

/**
 * Create a new stage based on preset type.
 */
function createStageFromPreset(preset: StagePreset): WorkflowStage {
  const id = nanoid(8);
  const base: WorkflowStage = {
    id,
    name: "",
    steps: [],
  };

  switch (preset) {
    case "standard":
      return {
        ...base,
        name: "New Stage",
        display: { color: "#3b82f6" }, // blue-500
      };

    case "approval":
      return {
        ...base,
        name: "Approval Stage",
        display: { color: "#f59e0b" }, // amber-500
        gates: [
          {
            type: "approval",
            config: { approvers: [] },
            errorMessage: "Approval required before proceeding",
          },
        ],
        steps: [
          {
            id: nanoid(8),
            name: "Approval Step",
            type: "approval",
            description: "Requires approval to proceed",
          },
        ],
      };

    case "terminal":
      return {
        ...base,
        name: "Closed",
        isTerminal: true,
        display: { color: "#ef4444" }, // red-500
      };

    case "notification":
      return {
        ...base,
        name: "Notification Stage",
        display: { color: "#22c55e" }, // green-500
        steps: [
          {
            id: nanoid(8),
            name: "Send Notification",
            type: "notification",
            config: { template: "" },
            description: "Sends notification when stage is entered",
          },
        ],
      };

    default:
      return {
        ...base,
        name: "New Stage",
        display: { color: "#3b82f6" },
      };
  }
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Main workflow builder state hook.
 */
export function useWorkflowBuilder(): UseWorkflowBuilderReturn {
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<StageNodeData>>(
    [],
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState<
    Edge<TransitionEdgeData>
  >([]);

  // Track initial stage and dirty state
  const [initialStage, setInitialStageState] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Derived selection state
  const selectedNode = useMemo(
    () => nodes.find((n) => n.selected) ?? null,
    [nodes],
  );

  const selectedEdge = useMemo(
    () => edges.find((e) => e.selected) ?? null,
    [edges],
  );

  // Handle new connections
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const newEdge: Edge<TransitionEdgeData> = {
        id: `${connection.source}-${connection.target}`,
        source: connection.source,
        target: connection.target,
        type: "transition",
        data: {
          transition: {
            from: connection.source,
            to: connection.target,
            label: "",
            conditions: [],
            actions: [],
          },
        },
      };

      setEdges((eds) => addEdge(newEdge, eds));
      setIsDirty(true);
    },
    [setEdges],
  );

  // Load a template into the builder
  const loadTemplate = useCallback(
    (template: WorkflowTemplate) => {
      const newNodes = stagesToNodes(template.stages, template.initialStage);
      const newEdges = transitionsToEdges(template.transitions);

      setNodes(newNodes);
      setEdges(newEdges);
      setInitialStageState(template.initialStage);
      setIsDirty(false);
    },
    [setNodes, setEdges],
  );

  // Add a new stage from preset
  const addStage = useCallback(
    (preset: StagePreset, position: { x: number; y: number }) => {
      const stage = createStageFromPreset(preset);

      const newNode: Node<StageNodeData> = {
        id: stage.id,
        type: "stage",
        position,
        data: {
          stage,
          isInitial: false,
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setIsDirty(true);
    },
    [setNodes],
  );

  // Remove selected nodes and edges
  const removeSelected = useCallback(() => {
    const selectedNodeIds = nodes.filter((n) => n.selected).map((n) => n.id);
    const selectedEdgeIds = edges.filter((e) => e.selected).map((e) => e.id);

    if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) return;

    // Remove selected nodes
    setNodes((nds) => nds.filter((n) => !n.selected));

    // Remove selected edges AND edges connected to removed nodes
    setEdges((eds) =>
      eds.filter(
        (e) =>
          !e.selected &&
          !selectedNodeIds.includes(e.source) &&
          !selectedNodeIds.includes(e.target),
      ),
    );

    setIsDirty(true);
  }, [nodes, edges, setNodes, setEdges]);

  // Set a stage as the initial stage
  const setInitialStage = useCallback(
    (stageId: string) => {
      setInitialStageState(stageId);
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          data: {
            ...n.data,
            isInitial: n.id === stageId,
          },
        })),
      );
      setIsDirty(true);
    },
    [setNodes],
  );

  // Export helpers
  const nodesToStages = useCallback(() => nodesBackToStages(nodes), [nodes]);

  const edgesToTransitions = useCallback(
    () => edgesBackToTransitions(edges),
    [edges],
  );

  return {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    selectedNode,
    selectedEdge,
    loadTemplate,
    addStage,
    removeSelected,
    setInitialStage,
    isDirty,
    setIsDirty,
    nodesToStages,
    edgesToTransitions,
    initialStage,
  };
}
