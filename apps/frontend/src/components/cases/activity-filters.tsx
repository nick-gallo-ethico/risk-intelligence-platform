'use client';

import { cn } from '@/lib/utils';
import type { ActivityFilterType } from '@/types/activity';

interface ActivityFiltersProps {
  activeFilter: ActivityFilterType;
  onFilterChange: (filter: ActivityFilterType) => void;
  counts?: {
    all: number;
    notes: number;
    status: number;
    files: number;
  };
}

const filters: { value: ActivityFilterType; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'notes', label: 'Notes' },
  { value: 'status', label: 'Status Changes' },
  { value: 'files', label: 'Files' },
];

export function ActivityFilters({
  activeFilter,
  onFilterChange,
  counts,
}: ActivityFiltersProps) {
  return (
    <div
      className="flex items-center gap-1 border-b"
      role="tablist"
      aria-label="Activity filter tabs"
    >
      {filters.map(({ value, label }) => {
        const isActive = activeFilter === value;
        const count = counts?.[value];

        return (
          <button
            key={value}
            onClick={() => onFilterChange(value)}
            role="tab"
            aria-selected={isActive}
            aria-controls={`activity-panel-${value}`}
            className={cn(
              'px-3 py-2 text-sm font-medium transition-colors',
              'border-b-2 -mb-px',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
              isActive
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span
                className={cn(
                  'ml-1.5 px-1.5 py-0.5 text-xs rounded-full',
                  isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
