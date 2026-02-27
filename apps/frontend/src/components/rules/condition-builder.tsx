"use client";

/**
 * Condition Builder Component
 *
 * Visual builder for rule conditions using json-rules-engine format.
 * Supports AND/OR logic with multiple condition blocks.
 */

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RuleConditions, RuleConditionBlock } from "@/types/rules";
import { RULE_FACTS, RULE_OPERATORS, SEVERITY_OPTIONS } from "@/types/rules";

// ============================================================================
// Component Props
// ============================================================================

interface ConditionBuilderProps {
  conditions: RuleConditions;
  onChange: (conditions: RuleConditions) => void;
}

// ============================================================================
// Component
// ============================================================================

export function ConditionBuilder({
  conditions,
  onChange,
}: ConditionBuilderProps) {
  // Current mode: "all" (AND) or "any" (OR)
  const mode = conditions.all ? "all" : "any";
  const conditionList = conditions.all || conditions.any || [];

  // Update mode (switch between ALL and ANY)
  const handleModeChange = (newMode: "all" | "any") => {
    if (newMode === "all") {
      onChange({ all: conditionList });
    } else {
      onChange({ any: conditionList });
    }
  };

  // Add a new condition
  const addCondition = () => {
    const newCondition: RuleConditionBlock = {
      fact: "severity",
      operator: "equal",
      value: "",
    };
    const updated = [...conditionList, newCondition];
    onChange(mode === "all" ? { all: updated } : { any: updated });
  };

  // Update a specific condition
  const updateCondition = (
    index: number,
    field: keyof RuleConditionBlock,
    value: unknown,
  ) => {
    const updated = [...conditionList];
    updated[index] = { ...updated[index], [field]: value };
    onChange(mode === "all" ? { all: updated } : { any: updated });
  };

  // Remove a condition
  const removeCondition = (index: number) => {
    const updated = conditionList.filter((_, i) => i !== index);
    onChange(mode === "all" ? { all: updated } : { any: updated });
  };

  return (
    <div className="space-y-4">
      {/* Mode selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Match</span>
        <Select
          value={mode}
          onValueChange={(v) => handleModeChange(v as "all" | "any")}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ALL (AND)</SelectItem>
            <SelectItem value="any">ANY (OR)</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          of the following conditions:
        </span>
      </div>

      {/* Condition rows */}
      <div className="space-y-3">
        {conditionList.map((condition, index) => (
          <ConditionRow
            key={index}
            condition={condition}
            onUpdate={(field, value) => updateCondition(index, field, value)}
            onRemove={() => removeCondition(index)}
          />
        ))}
      </div>

      {/* Add button */}
      <Button type="button" variant="outline" size="sm" onClick={addCondition}>
        <Plus className="mr-2 h-4 w-4" />
        Add Condition
      </Button>

      {/* Empty state */}
      {conditionList.length === 0 && (
        <p className="text-sm text-muted-foreground italic">
          No conditions configured. Click &quot;Add Condition&quot; to get
          started.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Condition Row Component
// ============================================================================

interface ConditionRowProps {
  condition: RuleConditionBlock;
  onUpdate: (field: keyof RuleConditionBlock, value: unknown) => void;
  onRemove: () => void;
}

function ConditionRow({ condition, onUpdate, onRemove }: ConditionRowProps) {
  // Get the selected fact definition
  const selectedFact = RULE_FACTS.find((f) => f.value === condition.fact);
  const factType = selectedFact?.type || "string";

  return (
    <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
      {/* Fact selector */}
      <Select value={condition.fact} onValueChange={(v) => onUpdate("fact", v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Select field" />
        </SelectTrigger>
        <SelectContent>
          {RULE_FACTS.map((fact) => (
            <SelectItem key={fact.value} value={fact.value}>
              {fact.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select
        value={condition.operator}
        onValueChange={(v) => onUpdate("operator", v)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select operator" />
        </SelectTrigger>
        <SelectContent>
          {RULE_OPERATORS.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input - changes based on fact type */}
      {factType === "string" && condition.fact === "severity" ? (
        <Select
          value={String(condition.value || "")}
          onValueChange={(v) => onUpdate("value", v)}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Select value" />
          </SelectTrigger>
          <SelectContent>
            {SEVERITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          value={String(condition.value || "")}
          onChange={(e) => onUpdate("value", e.target.value)}
          placeholder="Enter value"
          className="w-[200px]"
        />
      )}

      {/* Remove button */}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Remove condition</span>
      </Button>
    </div>
  );
}
