/**
 * Stage Properties Component
 *
 * Property panel for editing workflow stage details.
 * Shows name, description, color, SLA, terminal toggle, steps, and gates.
 */

"use client";

import React, { useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Flag, GripVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StepEditor } from "./step-editor";
import type {
  WorkflowStage,
  WorkflowStep,
  StageGate,
  GateType,
  StepType,
} from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

export interface StagePropertiesProps {
  /** The stage being edited */
  stage: WorkflowStage;
  /** Whether this stage is the initial stage */
  isInitial: boolean;
  /** Callback when stage properties change */
  onUpdate: (stage: WorkflowStage) => void;
  /** Callback to set this as the initial stage */
  onSetInitial: () => void;
}

// ============================================================================
// Constants
// ============================================================================

const COLOR_PRESETS = [
  { value: "#3b82f6", label: "Blue" },
  { value: "#22c55e", label: "Green" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#ef4444", label: "Red" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#06b6d4", label: "Cyan" },
  { value: "#6b7280", label: "Gray" },
  { value: "#ec4899", label: "Pink" },
];

const GATE_TYPES: Array<{ value: GateType; label: string }> = [
  { value: "required_fields", label: "Required Fields" },
  { value: "approval", label: "Approval" },
  { value: "condition", label: "Condition" },
  { value: "time", label: "Time Gate" },
];

const STEP_TYPE_COLORS: Record<StepType, string> = {
  manual: "bg-blue-100 text-blue-800",
  automatic: "bg-green-100 text-green-800",
  approval: "bg-amber-100 text-amber-800",
  notification: "bg-purple-100 text-purple-800",
};

// ============================================================================
// Component
// ============================================================================

export function StageProperties({
  stage,
  isInitial,
  onUpdate,
  onSetInitial,
}: StagePropertiesProps) {
  // Local state for editing
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [isAddingStep, setIsAddingStep] = useState(false);
  const [isAddingGate, setIsAddingGate] = useState(false);
  const [newGateType, setNewGateType] = useState<GateType>("required_fields");
  const [newGateConfig, setNewGateConfig] = useState("{}");

  // Update helpers
  const updateStage = useCallback(
    (updates: Partial<WorkflowStage>) => {
      onUpdate({ ...stage, ...updates });
    },
    [stage, onUpdate],
  );

  const updateDisplay = useCallback(
    (updates: Partial<NonNullable<WorkflowStage["display"]>>) => {
      onUpdate({
        ...stage,
        display: { ...stage.display, ...updates },
      });
    },
    [stage, onUpdate],
  );

  // Step handlers
  const handleSaveStep = (step: WorkflowStep) => {
    const steps = stage.steps || [];
    const existingIndex = steps.findIndex((s) => s.id === step.id);

    if (existingIndex >= 0) {
      // Update existing step
      const newSteps = [...steps];
      newSteps[existingIndex] = step;
      updateStage({ steps: newSteps });
    } else {
      // Add new step
      updateStage({ steps: [...steps, step] });
    }

    setEditingStepId(null);
    setIsAddingStep(false);
  };

  const handleDeleteStep = (stepId: string) => {
    const steps = stage.steps?.filter((s) => s.id !== stepId) ?? [];
    updateStage({ steps });
  };

  // Gate handlers
  const handleAddGate = () => {
    try {
      const config = JSON.parse(newGateConfig);
      const newGate: StageGate = {
        type: newGateType,
        config,
        errorMessage: `${newGateType} gate failed`,
      };
      const gates = stage.gates || [];
      updateStage({ gates: [...gates, newGate] });
      setIsAddingGate(false);
      setNewGateConfig("{}");
    } catch {
      // Invalid JSON - don't add
    }
  };

  const handleDeleteGate = (index: number) => {
    const gates = stage.gates?.filter((_, i) => i !== index) ?? [];
    updateStage({ gates });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-sm text-slate-900">
          Stage Properties
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure the selected stage
        </p>
      </div>

      <Separator />

      {/* Basic Properties */}
      <div className="space-y-4">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="stage-name" className="text-xs">
            Name
          </Label>
          <Input
            id="stage-name"
            value={stage.name}
            onChange={(e) => updateStage({ name: e.target.value })}
            placeholder="Stage name"
            className="h-8 text-sm"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="stage-description" className="text-xs">
            Description
          </Label>
          <Textarea
            id="stage-description"
            value={stage.description ?? ""}
            onChange={(e) => updateStage({ description: e.target.value })}
            placeholder="Optional description..."
            className="text-sm min-h-[60px]"
          />
        </div>

        {/* Color */}
        <div className="space-y-1.5">
          <Label className="text-xs">Color</Label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color.value}
                type="button"
                onClick={() => updateDisplay({ color: color.value })}
                className={`w-6 h-6 rounded-full border-2 transition-all ${
                  stage.display?.color === color.value
                    ? "border-slate-900 scale-110"
                    : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: color.value }}
                title={color.label}
              />
            ))}
          </div>
        </div>

        {/* SLA Days */}
        <div className="space-y-1.5">
          <Label htmlFor="stage-sla" className="text-xs">
            SLA Days (optional)
          </Label>
          <Input
            id="stage-sla"
            type="number"
            min={0}
            value={stage.slaDays ?? ""}
            onChange={(e) =>
              updateStage({
                slaDays: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            placeholder="No SLA"
            className="h-8 text-sm"
          />
        </div>

        {/* Is Terminal */}
        <div className="flex items-center justify-between py-1">
          <div className="space-y-0.5">
            <Label htmlFor="stage-terminal" className="text-xs cursor-pointer">
              Terminal Stage
            </Label>
            <p className="text-[10px] text-slate-500">
              No outgoing transitions allowed
            </p>
          </div>
          <Switch
            id="stage-terminal"
            checked={stage.isTerminal ?? false}
            onCheckedChange={(checked) => updateStage({ isTerminal: checked })}
          />
        </div>

        {/* Set as Initial */}
        {!isInitial && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onSetInitial}
            className="w-full"
          >
            <Flag className="h-3.5 w-3.5 mr-1.5" />
            Set as Initial Stage
          </Button>
        )}
        {isInitial && (
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
            <Flag className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs text-green-700 font-medium">
              Initial Stage
            </span>
          </div>
        )}
      </div>

      <Separator />

      {/* Steps Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-xs text-slate-900">Steps</h4>
            <p className="text-[10px] text-slate-500">
              {stage.steps?.length ?? 0} step(s)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddingStep(true)}
            disabled={isAddingStep || editingStepId !== null}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>

        {/* Steps List */}
        <div className="space-y-2">
          {stage.steps?.map((step) => (
            <div key={step.id}>
              {editingStepId === step.id ? (
                <StepEditor
                  step={step}
                  onSave={handleSaveStep}
                  onCancel={() => setEditingStepId(null)}
                />
              ) : (
                <div className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 group">
                  <GripVertical className="h-4 w-4 text-slate-300" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 truncate">
                        {step.name}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-1.5 py-0 ${STEP_TYPE_COLORS[step.type]}`}
                      >
                        {step.type}
                      </Badge>
                      {step.isOptional && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0"
                        >
                          optional
                        </Badge>
                      )}
                    </div>
                    {step.description && (
                      <p className="text-[10px] text-slate-500 truncate">
                        {step.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => setEditingStepId(step.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteStep(step.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add Step Form */}
          {isAddingStep && (
            <StepEditor
              step={null}
              onSave={handleSaveStep}
              onCancel={() => setIsAddingStep(false)}
            />
          )}

          {/* Empty State */}
          {(!stage.steps || stage.steps.length === 0) && !isAddingStep && (
            <div className="text-center py-4 text-xs text-slate-500">
              No steps defined. Add steps to define work within this stage.
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Gates Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-xs text-slate-900">Gates</h4>
            <p className="text-[10px] text-slate-500">
              {stage.gates?.length ?? 0} gate(s)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddingGate(true)}
            disabled={isAddingGate}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>

        {/* Gates List */}
        <div className="space-y-2">
          {stage.gates?.map((gate, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0"
                  >
                    {gate.type}
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {JSON.stringify(gate.config).slice(0, 50)}
                  {JSON.stringify(gate.config).length > 50 && "..."}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDeleteGate(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {/* Add Gate Form */}
          {isAddingGate && (
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-1.5">
                <Label htmlFor="gate-type" className="text-xs">
                  Gate Type
                </Label>
                <Select
                  value={newGateType}
                  onValueChange={(value: GateType) => setNewGateType(value)}
                >
                  <SelectTrigger id="gate-type" className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GATE_TYPES.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gate-config" className="text-xs">
                  Configuration (JSON)
                </Label>
                <Textarea
                  id="gate-config"
                  value={newGateConfig}
                  onChange={(e) => setNewGateConfig(e.target.value)}
                  placeholder='{ "fields": ["assignee"] }'
                  className="text-sm font-mono min-h-[60px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" onClick={handleAddGate}>
                  Add Gate
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingGate(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {(!stage.gates || stage.gates.length === 0) && !isAddingGate && (
            <div className="text-center py-4 text-xs text-slate-500">
              No gates defined. Gates enforce rules before stage transitions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
