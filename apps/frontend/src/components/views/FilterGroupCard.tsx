"use client";

/**
 * FilterGroupCard Component
 *
 * A filter group card containing multiple conditions joined by AND logic.
 * Supports adding, removing, duplicating conditions and the entire group.
 */

import React from "react";
import { Copy, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilterConditionRow } from "./FilterConditionRow";
import { FilterGroup, FilterCondition } from "@/lib/views/types";
import { generateId } from "@/lib/utils";
import { ColumnDefinition } from "@/types/view-config";

interface FilterGroupCardProps {
  group: FilterGroup;
  groupIndex: number;
  columns: ColumnDefinition[];
  canDelete: boolean;
  canDuplicate: boolean;
  onChange: (group: FilterGroup) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const MAX_CONDITIONS_PER_GROUP = 20;

export function FilterGroupCard({
  group,
  groupIndex,
  columns,
  canDelete,
  canDuplicate,
  onChange,
  onDuplicate,
  onDelete,
}: FilterGroupCardProps) {
  const handleConditionChange = (index: number, condition: FilterCondition) => {
    const newConditions = [...group.conditions];
    newConditions[index] = condition;
    onChange({ ...group, conditions: newConditions });
  };

  const handleConditionRemove = (index: number) => {
    const newConditions = group.conditions.filter((_, i) => i !== index);
    onChange({ ...group, conditions: newConditions });
  };

  const handleAddCondition = () => {
    if (group.conditions.length >= MAX_CONDITIONS_PER_GROUP) return;

    const defaultColumn = columns[0];
    const newCondition: FilterCondition = {
      id: generateId(),
      propertyId: defaultColumn?.id || "",
      operator: "is",
      value: undefined,
    };
    onChange({ ...group, conditions: [...group.conditions, newCondition] });
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Group {groupIndex + 1}
          </CardTitle>
          <div className="flex items-center gap-1">
            {canDuplicate && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDuplicate}
                title="Duplicate group"
              >
                <Copy className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                title="Delete group"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {group.conditions.map((condition, index) => (
          <React.Fragment key={condition.id}>
            {index > 0 && (
              <div className="flex items-center gap-2 py-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground font-medium px-2">
                  and
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <FilterConditionRow
              condition={condition}
              columns={columns}
              onChange={(c) => handleConditionChange(index, c)}
              onRemove={() => handleConditionRemove(index)}
            />
          </React.Fragment>
        ))}

        {/* Add filter button */}
        {group.conditions.length < MAX_CONDITIONS_PER_GROUP && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={handleAddCondition}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add filter
          </Button>
        )}

        {group.conditions.length >= MAX_CONDITIONS_PER_GROUP && (
          <p className="text-xs text-muted-foreground text-center">
            Maximum {MAX_CONDITIONS_PER_GROUP} conditions per group
          </p>
        )}
      </CardContent>
    </Card>
  );
}
