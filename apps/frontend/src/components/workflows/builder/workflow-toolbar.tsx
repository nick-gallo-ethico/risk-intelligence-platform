/**
 * Workflow Toolbar Component
 *
 * Top toolbar for the workflow builder with name editing, save/publish buttons,
 * version indicator, and active instances warning.
 */

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Pencil,
  Save,
  Upload,
  AlertTriangle,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCreateTemplate, useUpdateTemplate } from "@/hooks/use-workflows";
import type {
  WorkflowTemplate,
  WorkflowStage,
  WorkflowTransition,
  WorkflowEntityType,
  CreateWorkflowTemplateDto,
  UpdateWorkflowTemplateDto,
} from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

export interface WorkflowToolbarProps {
  /** Template being edited (null for new workflow) */
  template: WorkflowTemplate | null;
  /** Current workflow name */
  name: string;
  /** Callback when name changes */
  onNameChange: (name: string) => void;
  /** Entity type (required for new workflows) */
  entityType: WorkflowEntityType;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Callback to mark as clean after save */
  onSaved: (newTemplate: WorkflowTemplate) => void;
  /** Function to get current stages from canvas */
  getStages: () => WorkflowStage[];
  /** Function to get current transitions from canvas */
  getTransitions: () => WorkflowTransition[];
  /** Initial stage ID */
  initialStage: string | null;
}

// ============================================================================
// Constants
// ============================================================================

const ENTITY_TYPE_COLORS: Record<WorkflowEntityType, string> = {
  CASE: "bg-blue-100 text-blue-800",
  INVESTIGATION: "bg-purple-100 text-purple-800",
  DISCLOSURE: "bg-green-100 text-green-800",
  POLICY: "bg-amber-100 text-amber-800",
  CAMPAIGN: "bg-cyan-100 text-cyan-800",
};

// ============================================================================
// Component
// ============================================================================

export function WorkflowToolbar({
  template,
  name,
  onNameChange,
  entityType,
  isDirty,
  onSaved,
  getStages,
  getTransitions,
  initialStage,
}: WorkflowToolbarProps) {
  const router = useRouter();
  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  const isNew = !template;
  const version = template?.version ?? 1;
  const activeInstances = template?._instanceCount ?? 0;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // Handle name editing
  const handleStartEditName = () => {
    setEditedName(name);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    if (editedName.trim().length >= 3) {
      onNameChange(editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelEditName = () => {
    setEditedName(name);
    setIsEditingName(false);
  };

  // Build DTO from current state
  const buildDto = (
    isPublish: boolean,
  ): CreateWorkflowTemplateDto | UpdateWorkflowTemplateDto => {
    const stages = getStages();
    const transitions = getTransitions();

    const dto = {
      name,
      stages: stages.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        steps: s.steps,
        slaDays: s.slaDays,
        gates: s.gates,
        isTerminal: s.isTerminal,
        display: s.display,
      })),
      transitions: transitions.map((t) => ({
        from: t.from,
        to: t.to,
        label: t.label,
        conditions: t.conditions,
        actions: t.actions,
        allowedRoles: t.allowedRoles,
        requiresReason: t.requiresReason,
      })),
      initialStage: initialStage || stages[0]?.id || "",
      isActive: isPublish ? true : template?.isActive,
    };

    if (isNew) {
      return {
        ...dto,
        entityType,
      } as CreateWorkflowTemplateDto;
    }

    return dto as UpdateWorkflowTemplateDto;
  };

  // Handle save
  const handleSave = async () => {
    try {
      const dto = buildDto(false);

      if (isNew) {
        const created = await createMutation.mutateAsync(
          dto as CreateWorkflowTemplateDto,
        );
        toast.success("Workflow created");
        onSaved(created);
        // Navigate to edit page with the new ID
        router.replace(`/settings/workflows/${created.id}`);
      } else {
        const updated = await updateMutation.mutateAsync({
          id: template.id,
          dto: dto as UpdateWorkflowTemplateDto,
        });
        toast.success("Workflow saved");
        onSaved(updated);
      }
    } catch (error) {
      console.error("Save failed:", error);
      toast.error("Failed to save workflow");
    }
  };

  // Handle publish
  const handlePublish = async () => {
    try {
      const dto = buildDto(true);

      if (isNew) {
        const created = await createMutation.mutateAsync({
          ...(dto as CreateWorkflowTemplateDto),
          isActive: true,
        } as CreateWorkflowTemplateDto);
        toast.success(`Workflow published (v${created.version})`);
        onSaved(created);
        router.replace(`/settings/workflows/${created.id}`);
      } else {
        const updated = await updateMutation.mutateAsync({
          id: template.id,
          dto: {
            ...(dto as UpdateWorkflowTemplateDto),
            isActive: true,
          },
        });
        toast.success(`Workflow published (v${updated.version})`);
        onSaved(updated);
      }
    } catch (error) {
      console.error("Publish failed:", error);
      toast.error("Failed to publish workflow");
    } finally {
      setShowPublishDialog(false);
    }
  };

  // Handle publish button click
  const handlePublishClick = () => {
    if (activeInstances > 0) {
      setShowPublishDialog(true);
    } else {
      handlePublish();
    }
  };

  return (
    <TooltipProvider>
      <div className="h-14 border-b border-slate-200 bg-white flex items-center gap-3 px-4">
        {/* Back button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => router.push("/settings/workflows")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Back to workflows</TooltipContent>
        </Tooltip>

        {/* Name */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <div className="flex items-center gap-1">
              <Input
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveName();
                  if (e.key === "Escape") handleCancelEditName();
                }}
                className="h-8 w-64 text-sm"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={handleSaveName}
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <button
              onClick={handleStartEditName}
              className="flex items-center gap-1.5 text-lg font-semibold text-slate-900 hover:text-slate-700 transition-colors group"
            >
              {name || "Untitled Workflow"}
              <Pencil className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
        </div>

        {/* Entity type badge */}
        <Badge variant="secondary" className={ENTITY_TYPE_COLORS[entityType]}>
          {entityType}
        </Badge>

        {/* Version badge */}
        <Badge variant="outline" className="text-xs">
          v{version}
        </Badge>

        {/* Active instances warning */}
        {activeInstances > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800"
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {activeInstances} active
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {activeInstances} active workflow instance(s) using this template
            </TooltipContent>
          </Tooltip>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Dirty indicator */}
        {isDirty && (
          <span className="text-xs text-amber-600 font-medium">
            Unsaved changes
          </span>
        )}

        {/* Save button */}
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
        >
          <Save className="h-4 w-4 mr-1.5" />
          {isSaving && !showPublishDialog ? "Saving..." : "Save"}
        </Button>

        {/* Publish button */}
        <Button
          size="sm"
          onClick={handlePublishClick}
          disabled={isSaving || !name.trim()}
        >
          <Upload className="h-4 w-4 mr-1.5" />
          {isSaving && showPublishDialog ? "Publishing..." : "Publish"}
        </Button>

        {/* Publish confirmation dialog */}
        <AlertDialog
          open={showPublishDialog}
          onOpenChange={setShowPublishDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Publish New Version?</AlertDialogTitle>
              <AlertDialogDescription>
                Publishing will create a new version of this workflow.{" "}
                <strong>{activeInstances} active instance(s)</strong> will
                continue on the current version. New instances will use the new
                version.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePublish}>
                Publish v{version + 1}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
