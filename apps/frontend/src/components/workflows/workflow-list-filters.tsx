"use client";

/**
 * Workflow List Filters
 *
 * Filter bar for the workflow templates list.
 * - Entity type dropdown (All, Case, Investigation, Disclosure, Policy, Campaign)
 * - Status toggle group (All, Active, Inactive)
 */

import React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from "@/components/ui/label";
import type { WorkflowEntityType } from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

export interface WorkflowListFiltersProps {
  /** Selected entity type filter (undefined = all) */
  entityType: WorkflowEntityType | undefined;
  /** Active status filter (undefined = all, true = active only, false = inactive only) */
  isActive: boolean | undefined;
  /** Callback when entity type changes */
  onEntityTypeChange: (value: WorkflowEntityType | undefined) => void;
  /** Callback when active status changes */
  onIsActiveChange: (value: boolean | undefined) => void;
}

// ============================================================================
// Constants
// ============================================================================

const ENTITY_TYPE_OPTIONS: Array<{
  value: WorkflowEntityType | "all";
  label: string;
}> = [
  { value: "all", label: "All Types" },
  { value: "CASE", label: "Case" },
  { value: "INVESTIGATION", label: "Investigation" },
  { value: "DISCLOSURE", label: "Disclosure" },
  { value: "POLICY", label: "Policy" },
  { value: "CAMPAIGN", label: "Campaign" },
];

type StatusFilter = "all" | "active" | "inactive";

// ============================================================================
// Component
// ============================================================================

export function WorkflowListFilters({
  entityType,
  isActive,
  onEntityTypeChange,
  onIsActiveChange,
}: WorkflowListFiltersProps) {
  // Convert isActive to status filter value
  const statusValue: StatusFilter =
    isActive === undefined ? "all" : isActive ? "active" : "inactive";

  const handleEntityTypeChange = (value: string) => {
    if (value === "all") {
      onEntityTypeChange(undefined);
    } else {
      onEntityTypeChange(value as WorkflowEntityType);
    }
  };

  const handleStatusChange = (value: StatusFilter) => {
    // ToggleGroup can return empty string when nothing selected
    if (!value) return;

    if (value === "all") {
      onIsActiveChange(undefined);
    } else if (value === "active") {
      onIsActiveChange(true);
    } else {
      onIsActiveChange(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Entity Type Filter */}
      <div className="flex items-center gap-2">
        <Label
          htmlFor="entity-type-filter"
          className="text-sm text-muted-foreground whitespace-nowrap"
        >
          Entity Type
        </Label>
        <Select
          value={entityType || "all"}
          onValueChange={handleEntityTypeChange}
        >
          <SelectTrigger id="entity-type-filter" className="w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            {ENTITY_TYPE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status Filter */}
      <div className="flex items-center gap-2">
        <Label className="text-sm text-muted-foreground whitespace-nowrap">
          Status
        </Label>
        <ToggleGroup
          type="single"
          value={statusValue}
          onValueChange={(v) => handleStatusChange(v as StatusFilter)}
        >
          <ToggleGroupItem value="all" aria-label="Show all workflows">
            All
          </ToggleGroupItem>
          <ToggleGroupItem
            value="active"
            aria-label="Show active workflows only"
          >
            Active
          </ToggleGroupItem>
          <ToggleGroupItem
            value="inactive"
            aria-label="Show inactive workflows only"
          >
            Inactive
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
