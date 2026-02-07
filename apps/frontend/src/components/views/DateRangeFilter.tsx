/**
 * DateRangeFilter Component
 *
 * Date range filter with preset options (Today, This week, etc.)
 * and a custom dual-month calendar picker.
 */
"use client";

import React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  startOfToday,
  endOfToday,
  startOfYesterday,
  endOfYesterday,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  subDays,
  format,
} from "date-fns";
import type { DateRange } from "react-day-picker";

interface DateRangeFilterProps {
  value: DateRange | undefined;
  onChange: (range: DateRange | undefined) => void;
}

interface DatePreset {
  label: string;
  getValue: () => DateRange;
}

const DATE_PRESETS: DatePreset[] = [
  {
    label: "Today",
    getValue: () => ({ from: startOfToday(), to: endOfToday() }),
  },
  {
    label: "Yesterday",
    getValue: () => ({ from: startOfYesterday(), to: endOfYesterday() }),
  },
  {
    label: "This week",
    getValue: () => ({
      from: startOfWeek(new Date()),
      to: endOfWeek(new Date()),
    }),
  },
  {
    label: "This month",
    getValue: () => ({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
    }),
  },
  {
    label: "This quarter",
    getValue: () => ({
      from: startOfQuarter(new Date()),
      to: endOfQuarter(new Date()),
    }),
  },
  {
    label: "Last 30 days",
    getValue: () => ({ from: subDays(new Date(), 30), to: endOfToday() }),
  },
  {
    label: "Last 90 days",
    getValue: () => ({ from: subDays(new Date(), 90), to: endOfToday() }),
  },
];

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  const [isCustom, setIsCustom] = React.useState(false);
  const [customPopoverOpen, setCustomPopoverOpen] = React.useState(false);

  const handlePresetClick = (preset: DatePreset) => {
    onChange(preset.getValue());
    setIsCustom(false);
  };

  const handleCustomRange = (range: DateRange | undefined) => {
    onChange(range);
    setIsCustom(true);
    // Close popover when both dates are selected
    if (range?.from && range?.to) {
      setCustomPopoverOpen(false);
    }
  };

  const handleClear = () => {
    onChange(undefined);
    setIsCustom(false);
  };

  const getDisplayLabel = (): string => {
    if (!value?.from) return "Select dates...";

    // Check if matches a preset
    for (const preset of DATE_PRESETS) {
      const presetValue = preset.getValue();
      if (
        value.from.getTime() === presetValue.from?.getTime() &&
        value.to?.getTime() === presetValue.to?.getTime()
      ) {
        return preset.label;
      }
    }

    // Custom range
    if (value.to) {
      return `${format(value.from, "MMM d")} - ${format(value.to, "MMM d")}`;
    }
    return format(value.from, "MMM d, yyyy");
  };

  const isPresetSelected = (preset: DatePreset): boolean => {
    if (!value?.from || isCustom) return false;
    const presetValue = preset.getValue();
    return (
      value.from.getTime() === presetValue.from?.getTime() &&
      value.to?.getTime() === presetValue.to?.getTime()
    );
  };

  return (
    <div className="w-56 space-y-2">
      {/* Presets */}
      <div className="space-y-1 p-2">
        {DATE_PRESETS.map((preset) => (
          <Button
            key={preset.label}
            variant="ghost"
            size="sm"
            className={cn(
              "w-full justify-start font-normal",
              isPresetSelected(preset) && "bg-accent",
            )}
            onClick={() => handlePresetClick(preset)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <Separator />

      {/* Custom range */}
      <div className="p-2">
        <p className="text-sm font-medium mb-2">Custom range</p>
        <Popover open={customPopoverOpen} onOpenChange={setCustomPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              {isCustom && value?.from ? getDisplayLabel() : "Select dates..."}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start" side="right">
            <Calendar
              mode="range"
              selected={value}
              onSelect={handleCustomRange}
              numberOfMonths={2}
              defaultMonth={value?.from}
            />
          </PopoverContent>
        </Popover>
      </div>

      {value && (
        <>
          <Separator />
          <div className="p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={handleClear}
            >
              Clear filter
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
