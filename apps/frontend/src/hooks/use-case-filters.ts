'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type { CaseStatus, Severity, SourceChannel, CaseType } from '@/types/case';

export interface CaseFilters {
  statuses: CaseStatus[];
  severities: Severity[];
  sourceChannel: SourceChannel | null;
  caseType: CaseType | null;
  dateFrom: string | null;
  dateTo: string | null;
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

/**
 * Converts CaseFilters to a plain object for saved views.
 * Excludes pagination fields since those shouldn't be saved.
 */
export function filtersToViewData(filters: CaseFilters): Record<string, unknown> {
  return {
    statuses: filters.statuses,
    severities: filters.severities,
    sourceChannel: filters.sourceChannel,
    caseType: filters.caseType,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    search: filters.search,
  };
}

/**
 * Converts saved view filter data back to CaseFilters.
 */
export function viewDataToFilters(
  data: Record<string, unknown>
): Partial<CaseFilters> {
  return {
    statuses: (data.statuses as CaseStatus[]) || [],
    severities: (data.severities as Severity[]) || [],
    sourceChannel: (data.sourceChannel as SourceChannel | null) || null,
    caseType: (data.caseType as CaseType | null) || null,
    dateFrom: (data.dateFrom as string | null) || null,
    dateTo: (data.dateTo as string | null) || null,
    search: (data.search as string) || '',
  };
}

const DEFAULT_FILTERS: CaseFilters = {
  statuses: [],
  severities: [],
  sourceChannel: null,
  caseType: null,
  dateFrom: null,
  dateTo: null,
  search: '',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 0,
  pageSize: 20,
};

export function useCaseFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: CaseFilters = useMemo(() => {
    const statusParam = searchParams?.get('status');
    const severityParam = searchParams?.get('severity');

    return {
      statuses: statusParam
        ? (statusParam.split(',') as CaseStatus[])
        : DEFAULT_FILTERS.statuses,
      severities: severityParam
        ? (severityParam.split(',') as Severity[])
        : DEFAULT_FILTERS.severities,
      sourceChannel: (searchParams?.get('source') as SourceChannel) || null,
      caseType: (searchParams?.get('type') as CaseType) || null,
      dateFrom: searchParams?.get('from') || null,
      dateTo: searchParams?.get('to') || null,
      search: searchParams?.get('search') || '',
      sortBy: searchParams?.get('sortBy') || DEFAULT_FILTERS.sortBy,
      sortOrder:
        (searchParams?.get('sortOrder') as 'asc' | 'desc') ||
        DEFAULT_FILTERS.sortOrder,
      page: parseInt(searchParams?.get('page') || '0', 10),
      pageSize: parseInt(
        searchParams?.get('pageSize') || String(DEFAULT_FILTERS.pageSize),
        10
      ),
    };
  }, [searchParams]);

  const updateFilters = useCallback(
    (updates: Partial<CaseFilters>) => {
      const newParams = new URLSearchParams(searchParams?.toString() ?? '');
      const newFilters = { ...filters, ...updates };

      // Reset page when filters change (except page itself)
      if (!('page' in updates)) {
        newFilters.page = 0;
      }

      // Update URL params
      if (newFilters.statuses.length > 0) {
        newParams.set('status', newFilters.statuses.join(','));
      } else {
        newParams.delete('status');
      }

      if (newFilters.severities.length > 0) {
        newParams.set('severity', newFilters.severities.join(','));
      } else {
        newParams.delete('severity');
      }

      if (newFilters.sourceChannel) {
        newParams.set('source', newFilters.sourceChannel);
      } else {
        newParams.delete('source');
      }

      if (newFilters.caseType) {
        newParams.set('type', newFilters.caseType);
      } else {
        newParams.delete('type');
      }

      if (newFilters.dateFrom) {
        newParams.set('from', newFilters.dateFrom);
      } else {
        newParams.delete('from');
      }

      if (newFilters.dateTo) {
        newParams.set('to', newFilters.dateTo);
      } else {
        newParams.delete('to');
      }

      if (newFilters.search) {
        newParams.set('search', newFilters.search);
      } else {
        newParams.delete('search');
      }

      if (newFilters.sortBy !== DEFAULT_FILTERS.sortBy) {
        newParams.set('sortBy', newFilters.sortBy);
      } else {
        newParams.delete('sortBy');
      }

      if (newFilters.sortOrder !== DEFAULT_FILTERS.sortOrder) {
        newParams.set('sortOrder', newFilters.sortOrder);
      } else {
        newParams.delete('sortOrder');
      }

      if (newFilters.page > 0) {
        newParams.set('page', String(newFilters.page));
      } else {
        newParams.delete('page');
      }

      if (newFilters.pageSize !== DEFAULT_FILTERS.pageSize) {
        newParams.set('pageSize', String(newFilters.pageSize));
      } else {
        newParams.delete('pageSize');
      }

      const queryString = newParams.toString();
      router.push(`${pathname}${queryString ? `?${queryString}` : ''}`, {
        scroll: false,
      });
    },
    [filters, pathname, router, searchParams]
  );

  const clearAllFilters = useCallback(() => {
    router.push(pathname ?? '/cases', { scroll: false });
  }, [pathname, router]);

  const clearFilter = useCallback(
    (filterKey: keyof CaseFilters, value?: string) => {
      switch (filterKey) {
        case 'statuses':
          if (value) {
            updateFilters({
              statuses: filters.statuses.filter((s) => s !== value),
            });
          } else {
            updateFilters({ statuses: [] });
          }
          break;
        case 'severities':
          if (value) {
            updateFilters({
              severities: filters.severities.filter((s) => s !== value),
            });
          } else {
            updateFilters({ severities: [] });
          }
          break;
        case 'sourceChannel':
          updateFilters({ sourceChannel: null });
          break;
        case 'caseType':
          updateFilters({ caseType: null });
          break;
        case 'dateFrom':
        case 'dateTo':
          updateFilters({ dateFrom: null, dateTo: null });
          break;
        case 'search':
          updateFilters({ search: '' });
          break;
        default:
          break;
      }
    },
    [filters, updateFilters]
  );

  const hasActiveFilters = useMemo(() => {
    return (
      filters.statuses.length > 0 ||
      filters.severities.length > 0 ||
      filters.sourceChannel !== null ||
      filters.caseType !== null ||
      filters.dateFrom !== null ||
      filters.dateTo !== null ||
      filters.search !== ''
    );
  }, [filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.statuses.length > 0) count += filters.statuses.length;
    if (filters.severities.length > 0) count += filters.severities.length;
    if (filters.sourceChannel) count++;
    if (filters.caseType) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.search) count++;
    return count;
  }, [filters]);

  /**
   * Apply filters from a saved view response.
   * Converts the view data to filter format and updates URL params.
   */
  const applyFiltersFromView = useCallback(
    (viewData: {
      filters: Record<string, unknown>;
      sortBy?: string;
      sortOrder?: string;
    }) => {
      const filterUpdates = viewDataToFilters(viewData.filters);
      const updates: Partial<CaseFilters> = {
        ...filterUpdates,
        page: 0, // Reset to first page
      };

      // Apply sort if provided
      if (viewData.sortBy) {
        updates.sortBy = viewData.sortBy;
      }
      if (viewData.sortOrder === 'asc' || viewData.sortOrder === 'desc') {
        updates.sortOrder = viewData.sortOrder;
      }

      updateFilters(updates);
    },
    [updateFilters]
  );

  return {
    filters,
    updateFilters,
    clearAllFilters,
    clearFilter,
    hasActiveFilters,
    activeFilterCount,
    applyFiltersFromView,
  };
}
