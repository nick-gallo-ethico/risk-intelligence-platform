"use client";

/**
 * FilterConditionRow Component
 *
 * A single filter condition row with property selector, operator dropdown,
 * and type-specific value input. Used within FilterGroupCard.
 */

import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { FilterCondition, FilterOperator } from "@/lib/views/types";
import { getOperatorsForType, OPERATOR_LABELS } from "@/lib/views/operators";
import { MultiSelectFilter, FilterOption } from "./MultiSelectFilter";
import { ColumnDefinition, ColumnType } from "@/types/view-config";

interface FilterConditionRowProps {
  condition: FilterCondition;
  columns: ColumnDefinition[];
  onChange: (condition: FilterCondition) => void;
  onRemove: () => void;
}

// Map ColumnType to PropertyType for operator lookup
function getPropertyTypeFromColumnType(columnType: ColumnType): string {
  switch (columnType) {
    case "datetime":
      return "date";
    case "users":
    case "link":
      return "user";
    case "currency":
      return "number";
    default:
      return columnType;
  }
}

export function FilterConditionRow({
  condition,
  columns,
  onChange,
  onRemove,
}: FilterConditionRowProps) {
  const column = columns.find((c) => c.id === condition.propertyId);
  const propertyType = column
    ? getPropertyTypeFromColumnType(column.type)
    : "text";
  const operators = getOperatorsForType(propertyType as never);

  const handlePropertyChange = (propertyId: string) => {
    const newColumn = columns.find((c) => c.id === propertyId);
    const newPropertyType = newColumn
      ? getPropertyTypeFromColumnType(newColumn.type)
      : "text";
    const newOperators = getOperatorsForType(newPropertyType as never);
    onChange({
      ...condition,
      propertyId,
      operator: newOperators[0] || "is",
      value: undefined,
      secondaryValue: undefined,
    });
  };

  const handleOperatorChange = (operator: FilterOperator) => {
    onChange({
      ...condition,
      operator,
      // Clear value when switching to is_known/is_unknown
      value: ["is_known", "is_unknown"].includes(operator)
        ? undefined
        : condition.value,
      secondaryValue:
        operator === "is_between" ? condition.secondaryValue : undefined,
    });
  };

  const handleValueChange = (value: unknown) => {
    onChange({ ...condition, value });
  };

  const handleSecondaryValueChange = (secondaryValue: unknown) => {
    onChange({ ...condition, secondaryValue });
  };

  const handleUnitChange = (unit: "day" | "week" | "month") => {
    onChange({ ...condition, unit });
  };

  const renderValueInput = () => {
    if (!column) return null;

    // No value input for known/unknown operators
    if (
      ["is_known", "is_unknown", "is_true", "is_false"].includes(
        condition.operator,
      )
    ) {
      return null;
    }

    const columnType = column.type;

    switch (columnType) {
      case "text":
        if (["is_any_of", "is_none_of"].includes(condition.operator)) {
          return (
            <Input
              placeholder="Enter values (comma-separated)"
              value={
                Array.isArray(condition.value) ? condition.value.join(", ") : ""
              }
              onChange={(e) =>
                handleValueChange(
                  e.target.value.split(",").map((s) => s.trim()),
                )
              }
              className="flex-1"
            />
          );
        }
        return (
          <Input
            placeholder="Enter value"
            value={(condition.value as string) || ""}
            onChange={(e) => handleValueChange(e.target.value)}
            className="flex-1"
          />
        );

      case "number":
      case "currency":
        if (condition.operator === "is_between") {
          return (
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="number"
                placeholder="Min"
                value={(condition.value as number) ?? ""}
                onChange={(e) => handleValueChange(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-muted-foreground">and</span>
              <Input
                type="number"
                placeholder="Max"
                value={(condition.secondaryValue as number) ?? ""}
                onChange={(e) =>
                  handleSecondaryValueChange(Number(e.target.value))
                }
                className="w-24"
              />
            </div>
          );
        }
        return (
          <Input
            type="number"
            placeholder="Enter number"
            value={(condition.value as number) ?? ""}
            onChange={(e) => handleValueChange(Number(e.target.value))}
            className="flex-1"
          />
        );

      case "date":
      case "datetime":
        // Relative date operators
        if (
          ["is_less_than_n_ago", "is_more_than_n_ago"].includes(
            condition.operator,
          )
        ) {
          return (
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="number"
                min="1"
                placeholder="N"
                value={(condition.value as number) ?? ""}
                onChange={(e) => handleValueChange(Number(e.target.value))}
                className="w-20"
              />
              <Select
                value={condition.unit || "day"}
                onValueChange={(v) =>
                  handleUnitChange(v as "day" | "week" | "month")
                }
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">days ago</SelectItem>
                  <SelectItem value="week">weeks ago</SelectItem>
                  <SelectItem value="month">months ago</SelectItem>
                </SelectContent>
              </Select>
            </div>
          );
        }

        // Date range (is_between)
        if (condition.operator === "is_between") {
          return (
            <div className="flex items-center gap-2 flex-1">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[140px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {condition.value
                      ? format(
                          new Date(condition.value as string),
                          "MMM d, yyyy",
                        )
                      : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      condition.value
                        ? new Date(condition.value as string)
                        : undefined
                    }
                    onSelect={(date) => handleValueChange(date?.toISOString())}
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[140px] justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {condition.secondaryValue
                      ? format(
                          new Date(condition.secondaryValue as string),
                          "MMM d, yyyy",
                        )
                      : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={
                      condition.secondaryValue
                        ? new Date(condition.secondaryValue as string)
                        : undefined
                    }
                    onSelect={(date) =>
                      handleSecondaryValueChange(date?.toISOString())
                    }
                  />
                </PopoverContent>
              </Popover>
            </div>
          );
        }

        // Single date
        return (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex-1 justify-start">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {condition.value
                  ? format(new Date(condition.value as string), "MMM d, yyyy")
                  : "Select date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={
                  condition.value
                    ? new Date(condition.value as string)
                    : undefined
                }
                onSelect={(date) => handleValueChange(date?.toISOString())}
              />
            </PopoverContent>
          </Popover>
        );

      case "enum":
      case "status":
      case "severity":
      case "user":
      case "users":
        if (["is_any_of", "is_none_of"].includes(condition.operator)) {
          const options: FilterOption[] = (column.filterOptions || []).map(
            (opt) =>
              typeof opt === "string"
                ? { value: opt, label: opt }
                : { value: opt.value, label: opt.label },
          );
          return (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start">
                  {Array.isArray(condition.value) && condition.value.length > 0
                    ? `${condition.value.length} selected`
                    : "Select values"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start">
                <MultiSelectFilter
                  options={options}
                  selectedValues={(condition.value as string[]) || []}
                  onChange={handleValueChange}
                />
              </PopoverContent>
            </Popover>
          );
        }
        return null;

      case "boolean":
        return null; // Boolean uses is_true/is_false operators with no value

      default:
        return (
          <Input
            placeholder="Enter value"
            value={String(condition.value || "")}
            onChange={(e) => handleValueChange(e.target.value)}
            className="flex-1"
          />
        );
    }
  };

  return (
    <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-lg">
      {/* Property selector */}
      <Select value={condition.propertyId} onValueChange={handlePropertyChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select property" />
        </SelectTrigger>
        <SelectContent>
          {columns.map((col) => (
            <SelectItem key={col.id} value={col.id}>
              {col.header}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select
        value={condition.operator}
        onValueChange={(v) => handleOperatorChange(v as FilterOperator)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op} value={op}>
              {OPERATOR_LABELS[op] || op}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input */}
      {renderValueInput()}

      {/* Remove button */}
      <Button variant="ghost" size="icon" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
