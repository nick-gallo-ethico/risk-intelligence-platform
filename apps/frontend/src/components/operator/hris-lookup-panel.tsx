'use client';

/**
 * HrisLookupPanel - HRIS Search Tab Content
 *
 * Allows operators to search for employees in the HRIS:
 * - Search by name, email, or department
 * - Display results with name, title, department, manager
 * - Click to select as subject (emits event to intake form)
 * - Show org chart hierarchy on selection
 */

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  User,
  Building2,
  MapPin,
  UserCheck,
  ChevronRight,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api';
import type { ClientProfile, HrisResult } from '@/types/operator.types';

export interface HrisLookupPanelProps {
  /** Currently loaded client profile */
  clientProfile: ClientProfile | null;
  /** Called when employee is selected as subject */
  onEmployeeSelect?: (employee: HrisResult) => void;
}

export function HrisLookupPanel({
  clientProfile,
  onEmployeeSelect,
}: HrisLookupPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<HrisResult | null>(
    null
  );

  // Debounce search input
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      // Simple debounce - in production use useDeferredValue or lodash debounce
      const timer = setTimeout(() => {
        setDebouncedQuery(value);
      }, 300);
      return () => clearTimeout(timer);
    },
    []
  );

  // Search HRIS
  const {
    data: results,
    isLoading,
    isFetching,
  } = useQuery({
    queryKey: ['operator', 'hris', clientProfile?.id, debouncedQuery],
    queryFn: async () => {
      if (!clientProfile?.id || !debouncedQuery.trim()) return [];
      return apiClient.get<HrisResult[]>(
        `/operator/clients/${clientProfile.id}/hris/search`,
        { params: { query: debouncedQuery } }
      );
    },
    enabled: !!clientProfile?.id && debouncedQuery.length >= 2,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

  // Handle employee selection
  const handleSelect = (employee: HrisResult) => {
    setSelectedEmployee(employee);
    onEmployeeSelect?.(employee);
  };

  if (!clientProfile) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Look up a client to search HRIS</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search Input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, or department..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Selected Employee Details */}
      {selectedEmployee && (
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Selected Subject</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setSelectedEmployee(null)}
            >
              Clear
            </Button>
          </div>
          <EmployeeCard
            employee={selectedEmployee}
            isSelected
            showHierarchy
          />
        </div>
      )}

      {/* Search Results */}
      <div className="flex-1 overflow-y-auto">
        {isLoading || isFetching ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : debouncedQuery.length < 2 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            Enter at least 2 characters to search
          </div>
        ) : results && results.length > 0 ? (
          <div className="space-y-2">
            {results.map((employee) => (
              <EmployeeCard
                key={employee.id}
                employee={employee}
                isSelected={selectedEmployee?.id === employee.id}
                onClick={() => handleSelect(employee)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground text-sm py-8">
            No employees found matching &ldquo;{debouncedQuery}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Employee card component.
 */
interface EmployeeCardProps {
  employee: HrisResult;
  isSelected?: boolean;
  showHierarchy?: boolean;
  onClick?: () => void;
}

function EmployeeCard({
  employee,
  isSelected,
  showHierarchy,
  onClick,
}: EmployeeCardProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        isSelected
          ? 'bg-primary/10 border-primary'
          : 'bg-card hover:bg-muted cursor-pointer',
        onClick && 'cursor-pointer'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
          <User className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">
              {employee.firstName} {employee.lastName}
            </span>
            {isSelected && <UserCheck className="h-4 w-4 text-primary" />}
          </div>
          {employee.jobTitle && (
            <p className="text-xs text-muted-foreground truncate">
              {employee.jobTitle}
            </p>
          )}
          <div className="flex items-center gap-3 mt-1">
            {employee.department && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Building2 className="h-3 w-3" />
                <span className="truncate">{employee.department}</span>
              </div>
            )}
            {employee.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{employee.location}</span>
              </div>
            )}
          </div>
          {employee.email && (
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {employee.email}
            </p>
          )}

          {/* Manager Hierarchy */}
          {showHierarchy && employee.managerName && (
            <div className="mt-2 pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Reports to:</p>
              <div className="flex items-center gap-1 text-xs">
                <ChevronRight className="h-3 w-3" />
                <span>{employee.managerName}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
