"use client";

/**
 * Rule Form Component
 *
 * Form for creating and editing routing rules.
 * Includes basic info, conditions, and actions sections.
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConditionBuilder } from "./condition-builder";
import { ActionSelector } from "./action-selector";
import type {
  RuleDefinition,
  CreateRuleRequest,
  RuleConditions,
  RuleAction,
  RuleTriggerEvent,
} from "@/types/rules";

// ============================================================================
// Component Props
// ============================================================================

interface RuleFormProps {
  initialData?: RuleDefinition;
  onSubmit: (data: CreateRuleRequest) => void;
  isSubmitting: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function RuleForm({
  initialData,
  onSubmit,
  isSubmitting,
}: RuleFormProps) {
  // Form state
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(
    initialData?.description || "",
  );
  const [priority, setPriority] = useState(
    String(initialData?.priority || 100),
  );
  const [triggerEvent, setTriggerEvent] = useState<RuleTriggerEvent>(
    initialData?.triggerEvent || "case.created",
  );
  const [conditions, setConditions] = useState<RuleConditions>(
    initialData?.conditions || { all: [] },
  );
  const [actions, setActions] = useState<RuleAction[]>(
    initialData?.actions || [],
  );

  // Form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      description: description || undefined,
      priority: parseInt(priority, 10),
      triggerEvent,
      conditions,
      actions,
    });
  };

  // Validation
  const isValid = name.trim() !== "" && actions.length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Route HIGH severity to CCO"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                min={1}
                max={1000}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Lower number = higher priority. Rules are evaluated in priority
                order.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this rule does and when it should apply..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="triggerEvent">Trigger Event</Label>
            <Select
              value={triggerEvent}
              onValueChange={(v) => setTriggerEvent(v as RuleTriggerEvent)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="case.created">
                  Case Created - When a new case is created
                </SelectItem>
                <SelectItem value="case.updated">
                  Case Updated - When a case is modified
                </SelectItem>
                <SelectItem value="investigation.status_changed">
                  Investigation Status Changed - When an investigation status
                  changes
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Conditions */}
      <Card>
        <CardHeader>
          <CardTitle>Conditions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Define when this rule should match. If no conditions are set, the
            rule matches all events.
          </p>
        </CardHeader>
        <CardContent>
          <ConditionBuilder conditions={conditions} onChange={setConditions} />
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Define what happens when this rule matches. At least one action is
            required.
          </p>
        </CardHeader>
        <CardContent>
          <ActionSelector actions={actions} onChange={setActions} />
        </CardContent>
      </Card>

      {/* Form actions */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !isValid}>
          {isSubmitting
            ? "Saving..."
            : initialData
              ? "Save Changes"
              : "Create Rule"}
        </Button>
      </div>
    </form>
  );
}
