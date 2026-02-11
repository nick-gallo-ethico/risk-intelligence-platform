/**
 * Step Editor Component
 *
 * Inline expandable editor for a single WorkflowStep.
 * Used within StageProperties for adding/editing steps.
 */

"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { nanoid } from "nanoid";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WorkflowStep, StepType, TimeoutAction } from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

export interface StepEditorProps {
  /** Existing step to edit (null for new step) */
  step: WorkflowStep | null;
  /** Callback when save is clicked */
  onSave: (step: WorkflowStep) => void;
  /** Callback when cancel is clicked */
  onCancel: () => void;
}

// ============================================================================
// Schema & Types
// ============================================================================

const STRATEGY_TYPES = [
  "specific_user",
  "round_robin",
  "least_loaded",
  "manager_of",
  "team_queue",
  "skill_based",
  "geographic",
  "none",
] as const;

type StrategyType = (typeof STRATEGY_TYPES)[number];

interface StepFormData {
  name: string;
  type: StepType;
  description: string;
  isOptional: boolean;
  timeoutHours: number | null;
  onTimeout: TimeoutAction | null;
  assigneeStrategyType: StrategyType;
  assigneeStrategyValue: string;
}

// ============================================================================
// Constants
// ============================================================================

const STEP_TYPES: Array<{ value: StepType; label: string }> = [
  { value: "manual", label: "Manual Task" },
  { value: "automatic", label: "Automatic" },
  { value: "approval", label: "Approval" },
  { value: "notification", label: "Notification" },
];

const TIMEOUT_ACTIONS: Array<{ value: TimeoutAction; label: string }> = [
  { value: "pause", label: "Pause workflow" },
  { value: "skip", label: "Skip step" },
  { value: "escalate", label: "Escalate" },
];

const ASSIGNEE_STRATEGIES: Array<{ value: string; label: string }> = [
  { value: "none", label: "No assignment" },
  { value: "specific_user", label: "Specific user" },
  { value: "round_robin", label: "Round robin (team)" },
  { value: "least_loaded", label: "Least loaded (team)" },
  { value: "manager_of", label: "Manager of (field)" },
  { value: "team_queue", label: "Team queue" },
  { value: "skill_based", label: "Skill-based" },
  { value: "geographic", label: "Geographic" },
];

// ============================================================================
// Component
// ============================================================================

export function StepEditor({ step, onSave, onCancel }: StepEditorProps) {
  // Parse existing assignee strategy
  const existingStrategy = step?.assigneeStrategy;
  let strategyType: StrategyType = "none";
  let strategyValue = "";
  if (existingStrategy) {
    strategyType = existingStrategy.type;
    if ("userId" in existingStrategy) strategyValue = existingStrategy.userId;
    else if ("teamId" in existingStrategy)
      strategyValue = existingStrategy.teamId;
    else if ("field" in existingStrategy)
      strategyValue = existingStrategy.field;
    else if ("skillId" in existingStrategy)
      strategyValue = existingStrategy.skillId;
    else if ("regionField" in existingStrategy)
      strategyValue = existingStrategy.regionField;
  }

  const form = useForm<StepFormData>({
    defaultValues: {
      name: step?.name ?? "",
      type: step?.type ?? "manual",
      description: step?.description ?? "",
      isOptional: step?.isOptional ?? false,
      timeoutHours: step?.timeoutHours ?? null,
      onTimeout: step?.onTimeout ?? null,
      assigneeStrategyType: strategyType,
      assigneeStrategyValue: strategyValue,
    },
  });

  const watchTimeoutHours = form.watch("timeoutHours");
  const watchStrategyType = form.watch("assigneeStrategyType");

  const handleSubmit = (data: StepFormData) => {
    // Build assignee strategy
    let assigneeStrategy: WorkflowStep["assigneeStrategy"] = undefined;
    if (data.assigneeStrategyType && data.assigneeStrategyType !== "none") {
      const val = data.assigneeStrategyValue || "";
      switch (data.assigneeStrategyType) {
        case "specific_user":
          assigneeStrategy = { type: "specific_user", userId: val };
          break;
        case "round_robin":
          assigneeStrategy = { type: "round_robin", teamId: val };
          break;
        case "least_loaded":
          assigneeStrategy = { type: "least_loaded", teamId: val };
          break;
        case "manager_of":
          assigneeStrategy = { type: "manager_of", field: val };
          break;
        case "team_queue":
          assigneeStrategy = { type: "team_queue", teamId: val };
          break;
        case "skill_based":
          assigneeStrategy = { type: "skill_based", skillId: val };
          break;
        case "geographic":
          assigneeStrategy = { type: "geographic", regionField: val };
          break;
      }
    }

    const newStep: WorkflowStep = {
      id: step?.id ?? nanoid(8),
      name: data.name,
      type: data.type,
      description: data.description || undefined,
      isOptional: data.isOptional,
      timeoutHours: data.timeoutHours || undefined,
      onTimeout:
        data.timeoutHours && data.onTimeout ? data.onTimeout : undefined,
      assigneeStrategy,
    };

    onSave(newStep);
  };

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-4 p-3 bg-slate-50 rounded-lg border border-slate-200"
    >
      {/* Name */}
      <div className="space-y-1.5">
        <Label htmlFor="step-name" className="text-xs">
          Name
        </Label>
        <Input
          id="step-name"
          placeholder="Step name"
          className="h-8 text-sm"
          {...form.register("name")}
        />
        {form.formState.errors.name && (
          <p className="text-xs text-destructive">
            {form.formState.errors.name.message}
          </p>
        )}
      </div>

      {/* Type */}
      <div className="space-y-1.5">
        <Label htmlFor="step-type" className="text-xs">
          Type
        </Label>
        <Select
          value={form.watch("type")}
          onValueChange={(value: StepType) => form.setValue("type", value)}
        >
          <SelectTrigger id="step-type" className="h-8 text-sm">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {STEP_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="step-description" className="text-xs">
          Description (optional)
        </Label>
        <Textarea
          id="step-description"
          placeholder="What this step accomplishes..."
          className="text-sm min-h-[60px]"
          {...form.register("description")}
        />
      </div>

      {/* Is Optional */}
      <div className="flex items-center gap-2">
        <Switch
          id="step-optional"
          checked={form.watch("isOptional")}
          onCheckedChange={(checked) => form.setValue("isOptional", checked)}
        />
        <Label htmlFor="step-optional" className="text-xs cursor-pointer">
          Optional step (can be skipped)
        </Label>
      </div>

      {/* Timeout Hours */}
      <div className="space-y-1.5">
        <Label htmlFor="step-timeout" className="text-xs">
          Timeout (hours)
        </Label>
        <Input
          id="step-timeout"
          type="number"
          min={0}
          placeholder="No timeout"
          className="h-8 text-sm"
          {...form.register("timeoutHours")}
        />
      </div>

      {/* On Timeout (only shown if timeoutHours is set) */}
      {watchTimeoutHours && Number(watchTimeoutHours) > 0 && (
        <div className="space-y-1.5">
          <Label htmlFor="step-on-timeout" className="text-xs">
            On Timeout
          </Label>
          <Select
            value={form.watch("onTimeout") ?? "pause"}
            onValueChange={(value: TimeoutAction) =>
              form.setValue("onTimeout", value)
            }
          >
            <SelectTrigger id="step-on-timeout" className="h-8 text-sm">
              <SelectValue placeholder="Action on timeout" />
            </SelectTrigger>
            <SelectContent>
              {TIMEOUT_ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Assignee Strategy */}
      <div className="space-y-1.5">
        <Label htmlFor="step-assignee" className="text-xs">
          Assignment Strategy
        </Label>
        <Select
          value={form.watch("assigneeStrategyType") ?? "none"}
          onValueChange={(value: StrategyType) =>
            form.setValue("assigneeStrategyType", value)
          }
        >
          <SelectTrigger id="step-assignee" className="h-8 text-sm">
            <SelectValue placeholder="No assignment" />
          </SelectTrigger>
          <SelectContent>
            {ASSIGNEE_STRATEGIES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Assignee Strategy Value (shown when strategy needs a value) */}
      {watchStrategyType && watchStrategyType !== "none" && (
        <div className="space-y-1.5">
          <Label htmlFor="step-assignee-value" className="text-xs">
            {watchStrategyType === "specific_user" && "User ID"}
            {(watchStrategyType === "round_robin" ||
              watchStrategyType === "least_loaded" ||
              watchStrategyType === "team_queue") &&
              "Team ID"}
            {watchStrategyType === "manager_of" && "Field name"}
            {watchStrategyType === "skill_based" && "Skill ID"}
            {watchStrategyType === "geographic" && "Region field"}
          </Label>
          <Input
            id="step-assignee-value"
            placeholder="Enter ID or field name"
            className="h-8 text-sm"
            {...form.register("assigneeStrategyValue")}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button type="submit" size="sm">
          {step ? "Update" : "Add"} Step
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
