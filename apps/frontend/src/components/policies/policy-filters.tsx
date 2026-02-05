'use client';

import { useCallback, useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  PolicyFilters as Filters,
  PolicyStatus,
  PolicyType,
} from '@/types/policy';
import {
  POLICY_TYPE_LABELS,
  POLICY_STATUS_LABELS,
} from '@/types/policy';

interface PolicyFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

const POLICY_STATUSES: PolicyStatus[] = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'PUBLISHED',
  'RETIRED',
];

const POLICY_TYPES: PolicyType[] = [
  'CODE_OF_CONDUCT',
  'ANTI_HARASSMENT',
  'ANTI_BRIBERY',
  'DATA_PRIVACY',
  'INFORMATION_SECURITY',
  'GIFT_ENTERTAINMENT',
  'CONFLICTS_OF_INTEREST',
  'TRAVEL_EXPENSE',
  'WHISTLEBLOWER',
  'SOCIAL_MEDIA',
  'ACCEPTABLE_USE',
  'OTHER',
];

/**
 * Policy list filters component.
 *
 * Provides filtering by:
 * - Status (Draft, Pending Approval, Approved, Published, Retired)
 * - Policy Type (Code of Conduct, Anti-Harassment, etc.)
 * - Search (debounced text search)
 */
export function PolicyFilters({ filters, onChange }: PolicyFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Debounce search input
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== (filters.search || '')) {
        onChange({ ...filters, search: searchInput || undefined });
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchInput, filters, onChange]);

  // Sync search input when filters change externally
  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  const handleStatusChange = useCallback(
    (value: string) => {
      onChange({
        ...filters,
        status: value === 'all' ? undefined : (value as PolicyStatus),
      });
    },
    [filters, onChange]
  );

  const handleTypeChange = useCallback(
    (value: string) => {
      onChange({
        ...filters,
        policyType: value === 'all' ? undefined : (value as PolicyType),
      });
    },
    [filters, onChange]
  );

  const handleClearFilters = useCallback(() => {
    setSearchInput('');
    onChange({});
  }, [onChange]);

  const hasActiveFilters =
    !!filters.status ||
    !!filters.policyType ||
    !!filters.ownerId ||
    !!filters.search;

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Search */}
      <div className="relative flex-1 min-w-[200px] max-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search policies..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status Filter */}
      <Select
        value={filters.status || 'all'}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {POLICY_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {POLICY_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Policy Type Filter */}
      <Select
        value={filters.policyType || 'all'}
        onValueChange={handleTypeChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {POLICY_TYPES.map((type) => (
            <SelectItem key={type} value={type}>
              {POLICY_TYPE_LABELS[type]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="text-muted-foreground"
        >
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
