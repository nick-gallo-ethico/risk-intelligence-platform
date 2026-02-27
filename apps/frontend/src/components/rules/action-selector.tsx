"use client";

/**
 * Action Selector Component
 *
 * Configures the actions to execute when a rule matches.
 * Supports assign_user, assign_team, and round_robin action types.
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RuleAction, RuleActionType } from "@/types/rules";

// ============================================================================
// Action Type Definitions
// ============================================================================

const ACTION_TYPES: {
  value: RuleActionType;
  label: string;
  description: string;
}[] = [
  {
    value: "assign_user",
    label: "Assign to User",
    description: "Assign the case to a specific user",
  },
  {
    value: "assign_team",
    label: "Assign to Team",
    description: "Assign the case to a team",
  },
  {
    value: "round_robin",
    label: "Round Robin",
    description: "Distribute evenly across team members",
  },
  {
    value: "set_priority",
    label: "Set Priority",
    description: "Set the case priority level",
  },
];

// ============================================================================
// Component Props
// ============================================================================

interface ActionSelectorProps {
  actions: RuleAction[];
  onChange: (actions: RuleAction[]) => void;
}

// ============================================================================
// Component
// ============================================================================

export function ActionSelector({ actions, onChange }: ActionSelectorProps) {
  // Add a new action
  const addAction = () => {
    const newAction: RuleAction = {
      type: "assign_user",
      params: {},
    };
    onChange([...actions, newAction]);
  };

  // Update an action
  const updateAction = (index: number, updates: Partial<RuleAction>) => {
    const updated = [...actions];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  // Remove an action
  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      {/* Action rows */}
      <div className="space-y-3">
        {actions.map((action, index) => (
          <ActionRow
            key={index}
            action={action}
            onUpdate={(updates) => updateAction(index, updates)}
            onRemove={() => removeAction(index)}
          />
        ))}
      </div>

      {/* Add button */}
      <Button type="button" variant="outline" size="sm" onClick={addAction}>
        <Plus className="mr-2 h-4 w-4" />
        Add Action
      </Button>

      {/* Empty state */}
      {actions.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No actions configured. At least one action is required.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Action Row Component
// ============================================================================

interface ActionRowProps {
  action: RuleAction;
  onUpdate: (updates: Partial<RuleAction>) => void;
  onRemove: () => void;
}

function ActionRow({ action, onUpdate, onRemove }: ActionRowProps) {
  const actionDef = ACTION_TYPES.find((a) => a.value === action.type);

  // Handle type change - reset params
  const handleTypeChange = (type: RuleActionType) => {
    onUpdate({ type, params: {} });
  };

  // Handle param change
  const handleParamChange = (key: string, value: string) => {
    onUpdate({
      params: { ...action.params, [key]: value },
    });
  };

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        {/* Action type selector */}
        <div className="flex items-center gap-3">
          <Select
            value={action.type}
            onValueChange={(v) => handleTypeChange(v as RuleActionType)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              {ACTION_TYPES.map((actionType) => (
                <SelectItem key={actionType.value} value={actionType.value}>
                  {actionType.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {actionDef && (
            <span className="text-sm text-muted-foreground">
              {actionDef.description}
            </span>
          )}
        </div>

        {/* Remove button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remove action</span>
        </Button>
      </div>

      {/* Action parameters */}
      <ActionParams
        type={action.type}
        params={action.params}
        onParamChange={handleParamChange}
      />
    </div>
  );
}

// ============================================================================
// Action Parameters Component
// ============================================================================

interface ActionParamsProps {
  type: RuleActionType;
  params: Record<string, unknown>;
  onParamChange: (key: string, value: string) => void;
}

function ActionParams({ type, params, onParamChange }: ActionParamsProps) {
  switch (type) {
    case "assign_user":
      return (
        <div className="space-y-2">
          <Label htmlFor="userId">User ID</Label>
          <Input
            id="userId"
            value={String(params.userId || "")}
            onChange={(e) => onParamChange("userId", e.target.value)}
            placeholder="Enter user ID"
            className="max-w-[300px]"
          />
          <p className="text-xs text-muted-foreground">
            The ID of the user to assign cases to
          </p>
        </div>
      );

    case "assign_team":
      return (
        <div className="space-y-2">
          <Label htmlFor="teamId">Team ID</Label>
          <Input
            id="teamId"
            value={String(params.teamId || "")}
            onChange={(e) => onParamChange("teamId", e.target.value)}
            placeholder="Enter team ID"
            className="max-w-[300px]"
          />
          <p className="text-xs text-muted-foreground">
            The ID of the team to assign cases to
          </p>
        </div>
      );

    case "round_robin":
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="roundRobinTeamId">Team ID</Label>
            <Input
              id="roundRobinTeamId"
              value={String(params.teamId || "")}
              onChange={(e) => onParamChange("teamId", e.target.value)}
              placeholder="Enter team ID"
            />
            <p className="text-xs text-muted-foreground">
              The team whose members will receive cases
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxOpenCases">Max Open Cases (Optional)</Label>
            <Input
              id="maxOpenCases"
              type="number"
              value={String(params.maxOpenCases || "")}
              onChange={(e) => onParamChange("maxOpenCases", e.target.value)}
              placeholder="e.g., 10"
            />
            <p className="text-xs text-muted-foreground">
              Skip members with this many open cases
            </p>
          </div>
        </div>
      );

    case "set_priority":
      return (
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select
            value={String(params.priority || "")}
            onValueChange={(v) => onParamChange("priority", v)}
          >
            <SelectTrigger className="max-w-[200px]">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            The priority to set on matching cases
          </p>
        </div>
      );

    default:
      return null;
  }
}
