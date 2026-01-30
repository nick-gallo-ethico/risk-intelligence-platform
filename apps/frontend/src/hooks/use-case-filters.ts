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
    const statusParam = searchParams.get('status');
    const severityParam = searchParams.get('severity');

    return {
      statuses: statusParam
        ? (statusParam.split(',') as CaseStatus[])
        : DEFAULT_FILTERS.statuses,
      severities: severityParam
        ? (severityParam.split(',') as Severity[])
        : DEFAULT_FILTERS.severities,
      sourceChannel: (searchParams.get('source') as SourceChannel) || null,
      caseType: (searchParams.get('type') as CaseType) || null,
      dateFrom: searchParams.get('from') || null,
      dateTo: searchParams.get('to') || null,
      search: searchParams.get('search') || '',
      sortBy: searchParams.get('sortBy') || DEFAULT_FILTERS.sortBy,
      sortOrder:
        (searchParams.get('sortOrder') as 'asc' | 'desc') ||
        DEFAULT_FILTERS.sortOrder,
      page: parseInt(searchParams.get('page') || '0', 10),
      pageSize: parseInt(
        searchParams.get('pageSize') || String(DEFAULT_FILTERS.pageSize),
        10
      ),
    };
  }, [searchParams]);

  const updateFilters = useCallback(
    (updates: Partial<CaseFilters>) => {
      const newParams = new URLSearchParams(searchParams.toString());
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
    router.push(pathname, { scroll: false });
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

  return {
    filters,
    updateFilters,
    clearAllFilters,
    clearFilter,
    hasActiveFilters,
    activeFilterCount,
  };
}
