/**
 * QuickFilterDropdown Component
 *
 * Type-aware quick filter dropdown that renders appropriate filter UI
 * based on the property type (date, select, user, boolean, etc.)
 */
"use client";

import React from "react";
import { ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { FilterCondition } from "@/lib/views/types";
import type { QuickFilterProperty } from "@/types/view-config";
import { DateRangeFilter } from "./DateRangeFilter";
import { MultiSelectFilter, FilterOption } from "./MultiSelectFilter";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

interface QuickFilterDropdownProps {
  property: QuickFilterProperty;
  condition: FilterCondition | undefined;
  onConditionChange: (condition: FilterCondition | undefined) => void;
  onRemove?: () => void;
}

export function QuickFilterDropdown({
  property,
  condition,
  onConditionChange,
}: QuickFilterDropdownProps) {
  const [open, setOpen] = React.useState(false);

  const isActive = condition !== undefined;

  const getDisplayValue = (): string => {
    if (!condition) return property.label;

    switch (property.type) {
      case "date":
      case "datetime":
        if (Array.isArray(condition.value)) {
          const [from, to] = condition.value;
          if (from && to) return `${property.label}: Date range`;
        }
        return `${property.label}: ${condition.value}`;

      case "enum":
      case "status":
      case "severity":
      case "user":
      case "users": {
        const values = condition.value;
        if (Array.isArray(values)) {
          const count = values.length;
          if (count === 1) {
            const firstValue = values[0] as string;
            const option = property.options?.find(
              (o) => o.value === firstValue,
            );
            return `${property.label}: ${option?.label || firstValue}`;
          }
          return `${property.label}: ${count} selected`;
        }
        return property.label;
      }

      case "boolean":
        return `${property.label}: ${condition.value ? "Yes" : "No"}`;

      default:
        return condition.value
          ? `${property.label}: ${condition.value}`
          : property.label;
    }
  };

  const handleDateRangeChange = (range: DateRange | undefined) => {
    if (!range?.from) {
      onConditionChange(undefined);
    } else {
      onConditionChange({
        id: `quick-${property.propertyId}`,
        propertyId: property.propertyId,
        operator: "is_between",
        value: [range.from.toISOString(), range.to?.toISOString()],
      });
    }
    setOpen(false);
  };

  const handleMultiSelectChange = (values: string[]) => {
    if (values.length === 0) {
      onConditionChange(undefined);
    } else {
      onConditionChange({
        id: `quick-${property.propertyId}`,
        propertyId: property.propertyId,
        operator: "is_any_of",
        value: values,
      });
    }
  };

  const handleBooleanChange = (value: boolean) => {
    onConditionChange({
      id: `quick-${property.propertyId}`,
      propertyId: property.propertyId,
      operator: value ? "is_true" : "is_false",
      value: value,
    });
    setOpen(false);
  };

  const handleClear = () => {
    onConditionChange(undefined);
    setOpen(false);
  };

  const renderFilterContent = () => {
    switch (property.type) {
      case "date":
      case "datetime": {
        let dateValue: DateRange | undefined;
        if (
          condition?.value &&
          Array.isArray(condition.value) &&
          condition.value[0]
        ) {
          dateValue = {
            from: new Date(condition.value[0] as string),
            to: condition.value[1]
              ? new Date(condition.value[1] as string)
              : undefined,
          };
        }
        return (
          <DateRangeFilter value={dateValue} onChange={handleDateRangeChange} />
        );
      }

      case "enum":
      case "status":
      case "severity": {
        const options: FilterOption[] = (property.options || []).map((opt) => ({
          value: opt.value,
          label: opt.label,
        }));
        return (
          <MultiSelectFilter
            options={options}
            selectedValues={(condition?.value as string[]) || []}
            onChange={handleMultiSelectChange}
          />
        );
      }

      case "user":
      case "users": {
        const userOptions: FilterOption[] = (property.options || []).map(
          (opt) => ({
            value: opt.value,
            label: opt.label,
          }),
        );
        return (
          <MultiSelectFilter
            options={userOptions}
            selectedValues={(condition?.value as string[]) || []}
            searchPlaceholder="Search users..."
            onChange={handleMultiSelectChange}
          />
        );
      }

      case "boolean":
        return (
          <div className="p-2 space-y-1 w-48">
            <Button
              variant={condition?.value === true ? "default" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => handleBooleanChange(true)}
            >
              Yes
            </Button>
            <Button
              variant={condition?.value === false ? "default" : "ghost"}
              size="sm"
              className="w-full justify-start"
              onClick={() => handleBooleanChange(false)}
            >
              No
            </Button>
            {condition && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={handleClear}
              >
                Clear
              </Button>
            )}
          </div>
        );

      default:
        return (
          <div className="p-3 text-sm text-muted-foreground w-48">
            Use Advanced Filters for this property type.
          </div>
        );
    }
  };

  const handleClearClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onConditionChange(undefined);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={isActive ? "secondary" : "outline"}
          size="sm"
          className={cn("gap-1 h-8", isActive && "pr-1")}
        >
          <span className="truncate max-w-[150px]">{getDisplayValue()}</span>
          {isActive ? (
            <Badge
              variant="secondary"
              className="ml-1 h-5 w-5 p-0 hover:bg-destructive/20 cursor-pointer"
              onClick={handleClearClick}
            >
              <X className="h-3 w-3" />
            </Badge>
          ) : (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {renderFilterContent()}
      </PopoverContent>
    </Popover>
  );
}
