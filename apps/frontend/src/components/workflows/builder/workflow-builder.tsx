/**
 * Workflow Builder Component
 *
 * Main layout for the visual workflow builder.
 * Three-column layout: palette | canvas | property panel (placeholder)
 */

"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { StagePalette } from "./stage-palette";
import { WorkflowCanvas } from "./workflow-canvas";
import { useWorkflowBuilder } from "./use-workflow-builder";
import type { WorkflowTemplate } from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

interface WorkflowBuilderProps {
  /**
   * Initial template to load (for editing existing workflows).
   */
  template?: WorkflowTemplate;

  /**
   * Callback when the workflow is saved.
   */
  onSave?: (
    stages: ReturnType<typeof useWorkflowBuilder>["nodesToStages"],
    transitions: ReturnType<typeof useWorkflowBuilder>["edgesToTransitions"],
  ) => void;

  /**
   * Callback when dirty state changes.
   */
  onDirtyChange?: (isDirty: boolean) => void;
}

// ============================================================================
// Inner Builder (needs ReactFlowProvider context)
// ============================================================================

function WorkflowBuilderInner({
  template,
  onDirtyChange,
}: WorkflowBuilderProps) {
  const builder = useWorkflowBuilder();

  // Load template on mount if provided
  // Note: We use a stable reference check to avoid re-loading
  // In Plan 05, this will be enhanced with proper effect handling
  if (template && builder.nodes.length === 0 && !builder.isDirty) {
    builder.loadTemplate(template);
  }

  // Notify parent of dirty state changes
  if (onDirtyChange && builder.isDirty !== undefined) {
    // This would be better in a useEffect, but keeping simple for now
    // Plan 05 will add proper change tracking
  }

  return (
    <div className="flex h-full">
      {/* Left: Stage Palette */}
      <div className="w-60 flex-shrink-0">
        <StagePalette />
      </div>

      {/* Center: Canvas */}
      <div className="flex-1 min-w-0">
        <WorkflowCanvas
          nodes={builder.nodes}
          edges={builder.edges}
          onNodesChange={builder.onNodesChange}
          onEdgesChange={builder.onEdgesChange}
          onConnect={builder.onConnect}
          onAddStage={builder.addStage}
          onRemoveSelected={builder.removeSelected}
        />
      </div>

      {/* Right: Property Panel Placeholder (Plan 05) */}
      <div className="w-80 flex-shrink-0 border-l border-slate-200 bg-slate-50">
        <div className="p-4">
          <h3 className="font-semibold text-sm text-slate-900 mb-2">
            Properties
          </h3>
          {builder.selectedNode ? (
            <div className="space-y-3">
              <div className="p-3 bg-white rounded border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">
                  Selected Stage
                </div>
                <div className="font-medium text-sm text-slate-900">
                  {builder.selectedNode.data.stage.name}
                </div>
                {builder.selectedNode.data.isInitial && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 mt-2">
                    Start Stage
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Stage properties panel coming in Plan 05
              </p>
            </div>
          ) : builder.selectedEdge ? (
            <div className="space-y-3">
              <div className="p-3 bg-white rounded border border-slate-200">
                <div className="text-xs text-slate-500 mb-1">
                  Selected Transition
                </div>
                <div className="font-medium text-sm text-slate-900">
                  {builder.selectedEdge.data?.transition?.label ||
                    "Unnamed Transition"}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {builder.selectedEdge.source} → {builder.selectedEdge.target}
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Transition properties panel coming in Plan 05
              </p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Select a stage or transition to view properties
            </p>
          )}
        </div>

        {/* Dirty state indicator */}
        {builder.isDirty && (
          <div className="absolute bottom-4 right-4">
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">
              Unsaved changes
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Export (with ReactFlowProvider)
// ============================================================================

export function WorkflowBuilder(props: WorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderInner {...props} />
    </ReactFlowProvider>
  );
}
