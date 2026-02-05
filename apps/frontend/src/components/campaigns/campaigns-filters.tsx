'use client';

import { useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, Calendar, SlidersHorizontal } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import type { CampaignQueryParams, CampaignType, CampaignStatus } from '@/types/campaign';
import { CAMPAIGN_TYPE_LABELS, CAMPAIGN_STATUS_LABELS } from '@/types/campaign';

interface CampaignsFiltersProps {
  filters: CampaignQueryParams;
  onChange: (updates: Partial<CampaignQueryParams>) => void;
}

/**
 * Filter bar for campaigns list.
 * Includes Type, Status, Date range, and Search filters.
 */
export function CampaignsFilters({ filters, onChange }: CampaignsFiltersProps) {
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ search: e.target.value });
    },
    [onChange]
  );

  const handleTypeChange = useCallback(
    (value: string) => {
      onChange({ type: value === 'all' ? undefined : (value as CampaignType) });
    },
    [onChange]
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      onChange({ status: value === 'all' ? undefined : (value as CampaignStatus) });
    },
    [onChange]
  );

  const handleStartDateFromChange = useCallback(
    (date: Date | undefined) => {
      onChange({ startDateFrom: date ? format(date, 'yyyy-MM-dd') : undefined });
    },
    [onChange]
  );

  const handleStartDateToChange = useCallback(
    (date: Date | undefined) => {
      onChange({ startDateTo: date ? format(date, 'yyyy-MM-dd') : undefined });
    },
    [onChange]
  );

  const clearFilters = useCallback(() => {
    onChange({
      type: undefined,
      status: undefined,
      ownerId: undefined,
      startDateFrom: undefined,
      startDateTo: undefined,
      search: undefined,
    });
  }, [onChange]);

  const hasActiveFilters =
    filters.type ||
    filters.status ||
    filters.ownerId ||
    filters.startDateFrom ||
    filters.startDateTo ||
    filters.search;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search campaigns..."
          value={filters.search || ''}
          onChange={handleSearchChange}
          className="pl-9"
        />
      </div>

      {/* Type Filter */}
      <Select value={filters.type || 'all'} onValueChange={handleTypeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {(Object.keys(CAMPAIGN_TYPE_LABELS) as CampaignType[]).map((type) => (
            <SelectItem key={type} value={type}>
              {CAMPAIGN_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {(Object.keys(CAMPAIGN_STATUS_LABELS) as CampaignStatus[]).map((status) => (
            <SelectItem key={status} value={status}>
              {CAMPAIGN_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Date From */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
            <Calendar className="mr-2 h-4 w-4" />
            {filters.startDateFrom ? (
              format(new Date(filters.startDateFrom), 'MMM d, yyyy')
            ) : (
              <span className="text-muted-foreground">From date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={filters.startDateFrom ? new Date(filters.startDateFrom) : undefined}
            onSelect={handleStartDateFromChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Date To */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-[140px] justify-start text-left font-normal">
            <Calendar className="mr-2 h-4 w-4" />
            {filters.startDateTo ? (
              format(new Date(filters.startDateTo), 'MMM d, yyyy')
            ) : (
              <span className="text-muted-foreground">To date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={filters.startDateTo ? new Date(filters.startDateTo) : undefined}
            onSelect={handleStartDateToChange}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Advanced (placeholder) */}
      <Button variant="outline" size="icon" className="shrink-0" disabled>
        <SlidersHorizontal className="h-4 w-4" />
        <span className="sr-only">Advanced filters</span>
      </Button>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
