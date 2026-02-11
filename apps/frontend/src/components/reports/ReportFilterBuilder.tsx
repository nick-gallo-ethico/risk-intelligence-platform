/**
 * ReportFilterBuilder Component
 *
 * Filter condition builder for reports. Allows adding multiple filter
 * conditions with type-appropriate operators and value inputs.
 * Filters are combined with AND logic.
 */
"use client";

import React, { useCallback } from "react";
import { Plus, X, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn, generateId } from "@/lib/utils";
import type { ReportField, ReportFilter } from "@/types/reports";

// Operator definitions per field type
interface OperatorOption {
  value: string;
  label: string;
  requiresValue: boolean;
  requiresSecondaryValue?: boolean;
}

const OPERATORS_BY_TYPE: Record<string, OperatorOption[]> = {
  string: [
    { value: "eq", label: "equals", requiresValue: true },
    { value: "neq", label: "not equals", requiresValue: true },
    { value: "contains", label: "contains", requiresValue: true },
    { value: "startsWith", label: "starts with", requiresValue: true },
    { value: "isNull", label: "is empty", requiresValue: false },
    { value: "isNotNull", label: "is not empty", requiresValue: false },
  ],
  number: [
    { value: "eq", label: "equals", requiresValue: true },
    { value: "neq", label: "not equals", requiresValue: true },
    { value: "gt", label: "greater than", requiresValue: true },
    { value: "gte", label: "greater than or equal", requiresValue: true },
    { value: "lt", label: "less than", requiresValue: true },
    { value: "lte", label: "less than or equal", requiresValue: true },
    {
      value: "between",
      label: "between",
      requiresValue: true,
      requiresSecondaryValue: true,
    },
    { value: "isNull", label: "is empty", requiresValue: false },
  ],
  date: [
    { value: "eq", label: "is", requiresValue: true },
    { value: "gt", label: "is after", requiresValue: true },
    { value: "gte", label: "is on or after", requiresValue: true },
    { value: "lt", label: "is before", requiresValue: true },
    { value: "lte", label: "is on or before", requiresValue: true },
    {
      value: "between",
      label: "is between",
      requiresValue: true,
      requiresSecondaryValue: true,
    },
    { value: "isNull", label: "is empty", requiresValue: false },
  ],
  boolean: [{ value: "eq", label: "is", requiresValue: true }],
  enum: [
    { value: "eq", label: "is", requiresValue: true },
    { value: "neq", label: "is not", requiresValue: true },
    { value: "in", label: "is any of", requiresValue: true },
    { value: "notIn", label: "is none of", requiresValue: true },
    { value: "isNull", label: "is empty", requiresValue: false },
  ],
};

function getOperatorsForType(type: string): OperatorOption[] {
  return OPERATORS_BY_TYPE[type] || OPERATORS_BY_TYPE.string;
}

function getOperatorOption(
  type: string,
  operator: string,
): OperatorOption | undefined {
  const operators = getOperatorsForType(type);
  return operators.find((op) => op.value === operator);
}

interface FilterRowProps {
  filter: ReportFilter;
  fields: ReportField[];
  onChange: (filter: ReportFilter) => void;
  onRemove: () => void;
}

function FilterRow({ filter, fields, onChange, onRemove }: FilterRowProps) {
  const selectedField = fields.find((f) => f.id === filter.field);
  const fieldType = selectedField?.type || "string";
  const operators = getOperatorsForType(fieldType);
  const operatorOption = getOperatorOption(fieldType, filter.operator);

  const handleFieldChange = (fieldId: string) => {
    const newField = fields.find((f) => f.id === fieldId);
    const newType = newField?.type || "string";
    const newOperators = getOperatorsForType(newType);
    // Reset operator and value when field changes
    onChange({
      ...filter,
      field: fieldId,
      operator: newOperators[0].value as ReportFilter["operator"],
      value: undefined,
      valueTo: undefined,
    });
  };

  const handleOperatorChange = (operator: string) => {
    const newOperator = operators.find((op) => op.value === operator);
    onChange({
      ...filter,
      operator: operator as ReportFilter["operator"],
      value: newOperator?.requiresValue ? filter.value : undefined,
      valueTo: newOperator?.requiresSecondaryValue ? filter.valueTo : undefined,
    });
  };

  const handleValueChange = (value: unknown) => {
    onChange({ ...filter, value });
  };

  const handleSecondaryValueChange = (valueTo: unknown) => {
    onChange({ ...filter, valueTo });
  };

  // Render value input based on field type
  const renderValueInput = () => {
    if (!operatorOption?.requiresValue) return null;

    switch (fieldType) {
      case "boolean":
        return (
          <Select
            value={filter.value?.toString() || "true"}
            onValueChange={(v) => handleValueChange(v === "true")}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">True</SelectItem>
              <SelectItem value="false">False</SelectItem>
            </SelectContent>
          </Select>
        );

      case "date":
        return (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[140px] justify-start text-left font-normal",
                    !filter.value && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filter.value
                    ? format(new Date(filter.value as string), "PP")
                    : "Pick date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    filter.value ? new Date(filter.value as string) : undefined
                  }
                  onSelect={(date) =>
                    handleValueChange(date?.toISOString().split("T")[0])
                  }
                />
              </PopoverContent>
            </Popover>
            {operatorOption?.requiresSecondaryValue && (
              <>
                <span className="text-sm text-muted-foreground">and</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !filter.valueTo && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filter.valueTo
                        ? format(new Date(filter.valueTo as string), "PP")
                        : "Pick date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        filter.valueTo
                          ? new Date(filter.valueTo as string)
                          : undefined
                      }
                      onSelect={(date) =>
                        handleSecondaryValueChange(
                          date?.toISOString().split("T")[0],
                        )
                      }
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>
        );

      case "number":
        return (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={(filter.value as number) ?? ""}
              onChange={(e) =>
                handleValueChange(
                  e.target.value ? parseFloat(e.target.value) : undefined,
                )
              }
              className="w-[120px]"
              placeholder="Value"
            />
            {operatorOption?.requiresSecondaryValue && (
              <>
                <span className="text-sm text-muted-foreground">and</span>
                <Input
                  type="number"
                  value={(filter.valueTo as number) ?? ""}
                  onChange={(e) =>
                    handleSecondaryValueChange(
                      e.target.value ? parseFloat(e.target.value) : undefined,
                    )
                  }
                  className="w-[120px]"
                  placeholder="Value"
                />
              </>
            )}
          </div>
        );

      case "enum":
        if (filter.operator === "in" || filter.operator === "notIn") {
          // Multi-select for in/notIn operators
          const selectedValues = Array.isArray(filter.value)
            ? (filter.value as string[])
            : [];
          const enumValues = selectedField?.enumValues || [];

          return (
            <div className="flex flex-wrap gap-2 max-w-[300px]">
              {enumValues.map((val) => (
                <div key={val} className="flex items-center gap-1">
                  <Checkbox
                    id={`${filter.field}-${val}`}
                    checked={selectedValues.includes(val)}
                    onCheckedChange={(checked) => {
                      const newValues = checked
                        ? [...selectedValues, val]
                        : selectedValues.filter((v) => v !== val);
                      handleValueChange(newValues);
                    }}
                  />
                  <Label
                    htmlFor={`${filter.field}-${val}`}
                    className="text-sm cursor-pointer"
                  >
                    {val}
                  </Label>
                </div>
              ))}
            </div>
          );
        }
        // Single select for eq/neq
        return (
          <Select
            value={(filter.value as string) || ""}
            onValueChange={handleValueChange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select value" />
            </SelectTrigger>
            <SelectContent>
              {(selectedField?.enumValues || []).map((val) => (
                <SelectItem key={val} value={val}>
                  {val}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        // String input
        return (
          <Input
            type="text"
            value={(filter.value as string) ?? ""}
            onChange={(e) => handleValueChange(e.target.value || undefined)}
            className="w-[180px]"
            placeholder="Enter value"
          />
        );
    }
  };

  return (
    <div className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30">
      {/* Field selector */}
      <Select value={filter.field} onValueChange={handleFieldChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select field" />
        </SelectTrigger>
        <SelectContent>
          {fields
            .filter((f) => f.filterable)
            .map((field) => (
              <SelectItem key={field.id} value={field.id}>
                {field.label}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>

      {/* Operator selector */}
      <Select value={filter.operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Value input(s) */}
      {renderValueInput()}

      {/* Remove button */}
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 ml-auto"
        onClick={onRemove}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

interface ReportFilterBuilderProps {
  fields: ReportField[];
  filters: ReportFilter[];
  onFiltersChange: (filters: ReportFilter[]) => void;
}

export function ReportFilterBuilder({
  fields,
  filters,
  onFiltersChange,
}: ReportFilterBuilderProps) {
  const filterableFields = fields.filter((f) => f.filterable);

  const handleAddFilter = useCallback(() => {
    const defaultField = filterableFields[0];
    if (!defaultField) return;

    const defaultOperators = getOperatorsForType(defaultField.type);
    const newFilter: ReportFilter = {
      field: defaultField.id,
      operator: defaultOperators[0].value as ReportFilter["operator"],
      value: undefined,
    };

    onFiltersChange([...filters, newFilter]);
  }, [filterableFields, filters, onFiltersChange]);

  const handleFilterChange = useCallback(
    (index: number, filter: ReportFilter) => {
      const newFilters = [...filters];
      newFilters[index] = filter;
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange],
  );

  const handleRemoveFilter = useCallback(
    (index: number) => {
      onFiltersChange(filters.filter((_, i) => i !== index));
    },
    [filters, onFiltersChange],
  );

  const handleClearAll = useCallback(() => {
    onFiltersChange([]);
  }, [onFiltersChange]);

  if (filterableFields.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No filterable fields available for this data source.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-sm">Filter Conditions</h3>
          <p className="text-xs text-muted-foreground mt-1">
            All conditions are combined with AND logic
          </p>
        </div>
        {filters.length > 0 && (
          <Button variant="ghost" size="sm" onClick={handleClearAll}>
            Clear all
          </Button>
        )}
      </div>

      {filters.length === 0 ? (
        <div className="text-center py-8 border rounded-lg border-dashed">
          <p className="text-sm text-muted-foreground mb-4">
            No filters applied. Add a filter to narrow your results.
          </p>
          <Button variant="outline" onClick={handleAddFilter}>
            <Plus className="h-4 w-4 mr-2" />
            Add filter
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filters.map((filter, index) => (
            <div key={index}>
              {index > 0 && (
                <div className="flex items-center gap-2 py-1 px-3">
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                    AND
                  </span>
                </div>
              )}
              <FilterRow
                filter={filter}
                fields={filterableFields}
                onChange={(f) => handleFilterChange(index, f)}
                onRemove={() => handleRemoveFilter(index)}
              />
            </div>
          ))}

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddFilter}
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add filter
          </Button>
        </div>
      )}
    </div>
  );
}
