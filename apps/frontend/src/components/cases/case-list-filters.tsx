'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import {
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { SearchInput } from './search-input';
import { cn } from '@/lib/utils';
import type { CaseFilters } from '@/hooks/use-case-filters';
import type { CaseStatus, Severity, SourceChannel, CaseType } from '@/types/case';

interface CaseListFiltersProps {
  filters: CaseFilters;
  onUpdateFilters: (updates: Partial<CaseFilters>) => void;
}

const STATUSES: { value: CaseStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'OPEN', label: 'Open' },
  { value: 'CLOSED', label: 'Closed' },
];

const SEVERITIES: { value: Severity; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'CRITICAL', label: 'Critical' },
];

const SOURCES: { value: SourceChannel; label: string }[] = [
  { value: 'HOTLINE', label: 'Hotline' },
  { value: 'WEB_FORM', label: 'Web Form' },
  { value: 'PROXY', label: 'Proxy' },
  { value: 'DIRECT_ENTRY', label: 'Direct Entry' },
  { value: 'CHATBOT', label: 'Chatbot' },
];

const TYPES: { value: CaseType; label: string }[] = [
  { value: 'REPORT', label: 'Report' },
  { value: 'INQUIRY', label: 'Inquiry' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
];

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Created Date' },
  { value: 'updatedAt', label: 'Updated Date' },
  { value: 'referenceNumber', label: 'Reference' },
  { value: 'severity', label: 'Severity' },
];

function MultiSelectDropdown({
  label,
  options,
  selectedValues,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const displayText =
    selectedValues.length === 0
      ? label
      : selectedValues.length === 1
        ? options.find((o) => o.value === selectedValues[0])?.label || label
        : `${selectedValues.length} selected`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-[150px] justify-between"
        >
          <span className="truncate">{displayText}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <div className="p-2 space-y-2">
          {options.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`${label}-${option.value}`}
                checked={selectedValues.includes(option.value)}
                onCheckedChange={() => toggleValue(option.value)}
              />
              <Label
                htmlFor={`${label}-${option.value}`}
                className="text-sm font-normal cursor-pointer flex-1"
              >
                {option.label}
              </Label>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DateRangePicker({
  dateFrom,
  dateTo,
  onChange,
}: {
  dateFrom: string | null;
  dateTo: string | null;
  onChange: (from: string | null, to: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  const fromDate = dateFrom ? new Date(dateFrom) : undefined;
  const toDate = dateTo ? new Date(dateTo) : undefined;

  const displayText =
    fromDate && toDate
      ? `${format(fromDate, 'MMM d')} - ${format(toDate, 'MMM d')}`
      : fromDate
        ? `From ${format(fromDate, 'MMM d')}`
        : toDate
          ? `Until ${format(toDate, 'MMM d')}`
          : 'Date Range';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-[180px] justify-start">
          <CalendarIcon className="mr-2 h-4 w-4" />
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">From</Label>
            <Calendar
              mode="single"
              selected={fromDate}
              onSelect={(date) =>
                onChange(date ? date.toISOString().split('T')[0] : null, dateTo)
              }
              initialFocus
            />
          </div>
          <div className="border-t pt-4 space-y-2">
            <Label className="text-sm font-medium">To</Label>
            <Calendar
              mode="single"
              selected={toDate}
              onSelect={(date) =>
                onChange(dateFrom, date ? date.toISOString().split('T')[0] : null)
              }
              disabled={(date) => (fromDate ? date < fromDate : false)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange(null, null);
                setOpen(false);
              }}
            >
              Clear
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CaseListFilters({
  filters,
  onUpdateFilters,
}: CaseListFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="space-y-4">
      {/* Search bar - always visible */}
      <div className="flex gap-4 flex-wrap">
        <SearchInput
          value={filters.search}
          onChange={(search) => onUpdateFilters({ search })}
          placeholder="Search by reference, details, summary..."
          className="flex-1 min-w-[250px]"
        />

        {/* Collapsible filter toggle for mobile */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild className="md:hidden">
            <Button variant="outline" size="sm">
              Filters
              {isExpanded ? (
                <ChevronUp className="ml-2 h-4 w-4" />
              ) : (
                <ChevronDown className="ml-2 h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </Collapsible>
      </div>

      {/* Filter bar */}
      <Collapsible open={isExpanded} className="md:!block">
        <CollapsibleContent className="space-y-4">
          <div className="flex gap-3 flex-wrap items-center">
            {/* Status multi-select */}
            <MultiSelectDropdown
              label="Status"
              options={STATUSES}
              selectedValues={filters.statuses}
              onChange={(statuses) =>
                onUpdateFilters({ statuses: statuses as CaseStatus[] })
              }
            />

            {/* Severity multi-select */}
            <MultiSelectDropdown
              label="Severity"
              options={SEVERITIES}
              selectedValues={filters.severities}
              onChange={(severities) =>
                onUpdateFilters({ severities: severities as Severity[] })
              }
            />

            {/* Source channel select */}
            <Select
              value={filters.sourceChannel || 'all'}
              onValueChange={(value) =>
                onUpdateFilters({
                  sourceChannel:
                    value === 'all' ? null : (value as SourceChannel),
                })
              }
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {SOURCES.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Case type select */}
            <Select
              value={filters.caseType || 'all'}
              onValueChange={(value) =>
                onUpdateFilters({
                  caseType: value === 'all' ? null : (value as CaseType),
                })
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Date range picker */}
            <DateRangePicker
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              onChange={(from, to) =>
                onUpdateFilters({ dateFrom: from, dateTo: to })
              }
            />

            {/* Separator */}
            <div className="hidden lg:block w-px h-8 bg-border" />

            {/* Sort controls */}
            <div className="flex items-center gap-2">
              <Select
                value={filters.sortBy}
                onValueChange={(value) => onUpdateFilters({ sortBy: value })}
              >
                <SelectTrigger className="w-[140px]">
                  <ArrowUpDown className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  onUpdateFilters({
                    sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
                  })
                }
                title={
                  filters.sortOrder === 'asc'
                    ? 'Ascending (oldest first)'
                    : 'Descending (newest first)'
                }
              >
                {filters.sortOrder === 'asc' ? (
                  <ArrowUp className="h-4 w-4" />
                ) : (
                  <ArrowDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
