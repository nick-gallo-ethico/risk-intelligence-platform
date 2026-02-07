/**
 * MultiSelectFilter Component
 *
 * Searchable multi-select filter with checkbox list.
 * Supports Select All, avatars (for users), and color badges (for status).
 */
"use client";

import React, { useMemo, useState } from "react";
import { Search, Check, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
  description?: string;
  avatar?: string;
  color?: string; // For status badges
}

interface MultiSelectFilterProps {
  options: FilterOption[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  searchPlaceholder?: string;
  showSelectAll?: boolean;
}

export function MultiSelectFilter({
  options,
  selectedValues,
  onChange,
  searchPlaceholder = "Search...",
  showSelectAll = true,
}: MultiSelectFilterProps) {
  const [search, setSearch] = useState("");

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const lower = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(lower) ||
        opt.description?.toLowerCase().includes(lower),
    );
  }, [options, search]);

  const handleToggle = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((o) => o.value));
    }
  };

  const handleClear = () => {
    onChange([]);
  };

  const isAllSelected = selectedValues.length === options.length;
  const isSomeSelected =
    selectedValues.length > 0 && selectedValues.length < options.length;

  return (
    <div className="w-64">
      {/* Search */}
      <div className="relative p-2">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8 h-8"
        />
      </div>

      <Separator />

      {/* Select all option */}
      {showSelectAll && (
        <>
          <div
            className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-accent"
            onClick={handleSelectAll}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelectAll();
              }
            }}
          >
            <Checkbox
              checked={isAllSelected}
              className={cn(
                isSomeSelected &&
                  "bg-primary border-primary [&>span]:flex [&>span]:items-center [&>span]:justify-center",
              )}
            />
            {isSomeSelected && (
              <Minus className="absolute left-[18px] h-3 w-3 text-primary-foreground" />
            )}
            <span className="text-sm font-medium">Select all</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {selectedValues.length} of {options.length}
            </span>
          </div>
          <Separator />
        </>
      )}

      {/* Options list */}
      <ScrollArea className="h-[240px]">
        <div className="py-1">
          {filteredOptions.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <div
                key={option.value}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-accent",
                  isSelected && "bg-accent/50",
                )}
                onClick={() => handleToggle(option.value)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleToggle(option.value);
                  }
                }}
              >
                <Checkbox checked={isSelected} />

                {/* Avatar if provided */}
                {option.avatar && (
                  <img
                    src={option.avatar}
                    alt=""
                    className="h-6 w-6 rounded-full"
                  />
                )}

                {/* Label with optional color badge */}
                <div className="flex-1 min-w-0">
                  {option.color ? (
                    <Badge
                      variant="secondary"
                      style={{ backgroundColor: option.color }}
                      className="text-white"
                    >
                      {option.label}
                    </Badge>
                  ) : (
                    <span className="text-sm truncate block">
                      {option.label}
                    </span>
                  )}
                  {option.description && (
                    <p className="text-xs text-muted-foreground truncate">
                      {option.description}
                    </p>
                  )}
                </div>

                {isSelected && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0" />
                )}
              </div>
            );
          })}

          {filteredOptions.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results found
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Clear filter */}
      {selectedValues.length > 0 && (
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
