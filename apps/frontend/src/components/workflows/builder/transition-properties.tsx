/**
 * Transition Properties Component
 *
 * Property panel for editing workflow transition details.
 * Shows label, requires reason toggle, allowed roles, conditions, and actions.
 */

"use client";

import React, { useState, useCallback } from "react";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  WorkflowTransition,
  TransitionCondition,
  TransitionAction,
  ConditionType,
  ActionType,
} from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

export interface TransitionPropertiesProps {
  /** The transition being edited */
  transition: WorkflowTransition;
  /** Source stage name for display */
  fromStageName: string;
  /** Target stage name for display */
  toStageName: string;
  /** Callback when transition properties change */
  onUpdate: (transition: WorkflowTransition) => void;
}

// ============================================================================
// Constants
// ============================================================================

const ALLOWED_ROLES = [
  { value: "SYSTEM_ADMIN", label: "System Admin" },
  { value: "COMPLIANCE_OFFICER", label: "Compliance Officer" },
  { value: "POLICY_AUTHOR", label: "Policy Author" },
  { value: "POLICY_REVIEWER", label: "Policy Reviewer" },
  { value: "DEPARTMENT_ADMIN", label: "Department Admin" },
  { value: "INVESTIGATOR", label: "Investigator" },
  { value: "TRIAGE_LEAD", label: "Triage Lead" },
];

const CONDITION_TYPES: Array<{ value: ConditionType; label: string }> = [
  { value: "field", label: "Field condition" },
  { value: "approval", label: "Approval required" },
  { value: "time", label: "Time elapsed" },
  { value: "expression", label: "Custom expression" },
];

const ACTION_TYPES: Array<{ value: ActionType; label: string }> = [
  { value: "notification", label: "Send notification" },
  { value: "assignment", label: "Assign to user/team" },
  { value: "field_update", label: "Update field" },
  { value: "webhook", label: "Call webhook" },
];

// ============================================================================
// Component
// ============================================================================

export function TransitionProperties({
  transition,
  fromStageName,
  toStageName,
  onUpdate,
}: TransitionPropertiesProps) {
  // Local state for adding conditions/actions
  const [isAddingCondition, setIsAddingCondition] = useState(false);
  const [newConditionType, setNewConditionType] =
    useState<ConditionType>("field");
  const [newConditionConfig, setNewConditionConfig] = useState("{}");

  const [isAddingAction, setIsAddingAction] = useState(false);
  const [newActionType, setNewActionType] =
    useState<ActionType>("notification");
  const [newActionConfig, setNewActionConfig] = useState("{}");

  // Update helpers
  const updateTransition = useCallback(
    (updates: Partial<WorkflowTransition>) => {
      onUpdate({ ...transition, ...updates });
    },
    [transition, onUpdate],
  );

  // Role toggle handler
  const handleRoleToggle = (role: string, checked: boolean) => {
    const currentRoles = transition.allowedRoles ?? [];
    let newRoles: string[];
    if (checked) {
      newRoles = [...currentRoles, role];
    } else {
      newRoles = currentRoles.filter((r) => r !== role);
    }
    updateTransition({
      allowedRoles: newRoles.length > 0 ? newRoles : undefined,
    });
  };

  // Condition handlers
  const handleAddCondition = () => {
    try {
      const config = JSON.parse(newConditionConfig);
      const newCondition: TransitionCondition = {
        type: newConditionType,
        config,
      };
      const conditions = transition.conditions || [];
      updateTransition({ conditions: [...conditions, newCondition] });
      setIsAddingCondition(false);
      setNewConditionConfig("{}");
    } catch {
      // Invalid JSON - don't add
    }
  };

  const handleDeleteCondition = (index: number) => {
    const conditions =
      transition.conditions?.filter((_, i) => i !== index) ?? [];
    updateTransition({
      conditions: conditions.length > 0 ? conditions : undefined,
    });
  };

  // Action handlers
  const handleAddAction = () => {
    try {
      const config = JSON.parse(newActionConfig);
      const newAction: TransitionAction = {
        type: newActionType,
        config,
      };
      const actions = transition.actions || [];
      updateTransition({ actions: [...actions, newAction] });
      setIsAddingAction(false);
      setNewActionConfig("{}");
    } catch {
      // Invalid JSON - don't add
    }
  };

  const handleDeleteAction = (index: number) => {
    const actions = transition.actions?.filter((_, i) => i !== index) ?? [];
    updateTransition({ actions: actions.length > 0 ? actions : undefined });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h3 className="font-semibold text-sm text-slate-900">
          Transition Properties
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure the selected transition
        </p>
      </div>

      {/* From/To Display */}
      <div className="flex items-center gap-2 p-2 bg-slate-100 rounded border border-slate-200">
        <Badge variant="outline" className="text-xs">
          {fromStageName}
        </Badge>
        <ArrowRight className="h-4 w-4 text-slate-400" />
        <Badge variant="outline" className="text-xs">
          {toStageName}
        </Badge>
      </div>

      <Separator />

      {/* Basic Properties */}
      <div className="space-y-4">
        {/* Label */}
        <div className="space-y-1.5">
          <Label htmlFor="transition-label" className="text-xs">
            Label
          </Label>
          <Input
            id="transition-label"
            value={transition.label ?? ""}
            onChange={(e) =>
              updateTransition({ label: e.target.value || undefined })
            }
            placeholder="e.g., Close Case, Escalate"
            className="h-8 text-sm"
          />
        </div>

        {/* Requires Reason */}
        <div className="flex items-center justify-between py-1">
          <div className="space-y-0.5">
            <Label
              htmlFor="transition-reason"
              className="text-xs cursor-pointer"
            >
              Requires Reason
            </Label>
            <p className="text-[10px] text-slate-500">
              User must provide a reason when triggering
            </p>
          </div>
          <Switch
            id="transition-reason"
            checked={transition.requiresReason ?? false}
            onCheckedChange={(checked) =>
              updateTransition({ requiresReason: checked || undefined })
            }
          />
        </div>
      </div>

      <Separator />

      {/* Allowed Roles */}
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-xs text-slate-900">Allowed Roles</h4>
          <p className="text-[10px] text-slate-500">
            Who can trigger this transition (leave empty for all roles)
          </p>
        </div>

        <div className="space-y-2">
          {ALLOWED_ROLES.map((role) => (
            <div key={role.value} className="flex items-center gap-2">
              <Checkbox
                id={`role-${role.value}`}
                checked={transition.allowedRoles?.includes(role.value) ?? false}
                onCheckedChange={(checked) =>
                  handleRoleToggle(role.value, checked as boolean)
                }
              />
              <Label
                htmlFor={`role-${role.value}`}
                className="text-xs cursor-pointer"
              >
                {role.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <Separator />

      {/* Conditions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-xs text-slate-900">Conditions</h4>
            <p className="text-[10px] text-slate-500">
              {transition.conditions?.length ?? 0} condition(s)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddingCondition(true)}
            disabled={isAddingCondition}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>

        {/* Conditions List */}
        <div className="space-y-2">
          {transition.conditions?.map((condition, index) => (
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
                    {condition.type}
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {JSON.stringify(condition.config).slice(0, 50)}
                  {JSON.stringify(condition.config).length > 50 && "..."}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDeleteCondition(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {/* Add Condition Form */}
          {isAddingCondition && (
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-1.5">
                <Label htmlFor="condition-type" className="text-xs">
                  Condition Type
                </Label>
                <Select
                  value={newConditionType}
                  onValueChange={(value: ConditionType) =>
                    setNewConditionType(value)
                  }
                >
                  <SelectTrigger id="condition-type" className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONDITION_TYPES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="condition-config" className="text-xs">
                  Configuration (JSON)
                </Label>
                <Textarea
                  id="condition-config"
                  value={newConditionConfig}
                  onChange={(e) => setNewConditionConfig(e.target.value)}
                  placeholder='{ "field": "status", "equals": "reviewed" }'
                  className="text-sm font-mono min-h-[60px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" onClick={handleAddCondition}>
                  Add Condition
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingCondition(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {(!transition.conditions || transition.conditions.length === 0) &&
            !isAddingCondition && (
              <div className="text-center py-4 text-xs text-slate-500">
                No conditions. Transition is always allowed.
              </div>
            )}
        </div>
      </div>

      <Separator />

      {/* Actions Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-medium text-xs text-slate-900">Actions</h4>
            <p className="text-[10px] text-slate-500">
              {transition.actions?.length ?? 0} action(s)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsAddingAction(true)}
            disabled={isAddingAction}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        </div>

        {/* Actions List */}
        <div className="space-y-2">
          {transition.actions?.map((action, index) => (
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
                    {action.type}
                  </Badge>
                </div>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {JSON.stringify(action.config).slice(0, 50)}
                  {JSON.stringify(action.config).length > 50 && "..."}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleDeleteAction(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          {/* Add Action Form */}
          {isAddingAction && (
            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-1.5">
                <Label htmlFor="action-type" className="text-xs">
                  Action Type
                </Label>
                <Select
                  value={newActionType}
                  onValueChange={(value: ActionType) => setNewActionType(value)}
                >
                  <SelectTrigger id="action-type" className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="action-config" className="text-xs">
                  Configuration (JSON)
                </Label>
                <Textarea
                  id="action-config"
                  value={newActionConfig}
                  onChange={(e) => setNewActionConfig(e.target.value)}
                  placeholder='{ "template": "case_closed", "to": "assignee" }'
                  className="text-sm font-mono min-h-[60px]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" onClick={handleAddAction}>
                  Add Action
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddingAction(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {(!transition.actions || transition.actions.length === 0) &&
            !isAddingAction && (
              <div className="text-center py-4 text-xs text-slate-500">
                No actions. Nothing happens on transition.
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
