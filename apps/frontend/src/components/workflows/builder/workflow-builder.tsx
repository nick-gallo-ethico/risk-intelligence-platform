/**
 * Workflow Builder Component
 *
 * Main layout for the visual workflow builder.
 * Three-column layout: palette | canvas | property panel
 * Top: toolbar with name editing, save/publish
 */

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { StagePalette } from "./stage-palette";
import { WorkflowCanvas } from "./workflow-canvas";
import { PropertyPanel } from "./property-panel";
import { WorkflowToolbar } from "./workflow-toolbar";
import { useWorkflowBuilder } from "./use-workflow-builder";
import type { WorkflowTemplate, WorkflowEntityType } from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

interface WorkflowBuilderProps {
  /**
   * Initial template to load (for editing existing workflows).
   */
  template?: WorkflowTemplate | null;

  /**
   * Entity type (required for new workflows without a template).
   */
  entityType?: WorkflowEntityType;

  /**
   * Initial name (for new workflows from create dialog).
   */
  initialName?: string;
}

// ============================================================================
// Inner Builder (needs ReactFlowProvider context)
// ============================================================================

function WorkflowBuilderInner({
  template,
  entityType: initialEntityType,
  initialName,
}: WorkflowBuilderProps) {
  const builder = useWorkflowBuilder();

  // Track the current template (updated after save)
  const [currentTemplate, setCurrentTemplate] =
    useState<WorkflowTemplate | null>(template ?? null);
  const [workflowName, setWorkflowName] = useState(
    template?.name ?? initialName ?? "Untitled Workflow",
  );
  const entityType = template?.entityType ?? initialEntityType ?? "CASE";

  // Load template on mount if provided
  useEffect(() => {
    if (template && builder.nodes.length === 0) {
      builder.loadTemplate(template);
    }
  }, [template]); // eslint-disable-line react-hooks/exhaustive-deps

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (builder.isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [builder.isDirty]);

  // Handle name change (marks dirty)
  const handleNameChange = useCallback(
    (newName: string) => {
      setWorkflowName(newName);
      builder.setIsDirty(true);
    },
    [builder],
  );

  // Handle save complete
  const handleSaved = useCallback(
    (newTemplate: WorkflowTemplate) => {
      setCurrentTemplate(newTemplate);
      setWorkflowName(newTemplate.name);
      builder.setIsDirty(false);
    },
    [builder],
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <WorkflowToolbar
        template={currentTemplate}
        name={workflowName}
        onNameChange={handleNameChange}
        entityType={entityType}
        isDirty={builder.isDirty}
        onSaved={handleSaved}
        getStages={builder.nodesToStages}
        getTransitions={builder.edgesToTransitions}
        initialStage={builder.initialStage}
      />

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
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

        {/* Right: Property Panel */}
        <PropertyPanel
          selectedNode={builder.selectedNode}
          selectedEdge={builder.selectedEdge}
          nodes={builder.nodes}
          onUpdateNode={builder.updateNode}
          onUpdateEdge={builder.updateEdge}
          onSetInitialStage={builder.setInitialStage}
        />
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
