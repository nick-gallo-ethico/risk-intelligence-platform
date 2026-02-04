'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { casesApi } from '@/lib/cases-api';
import { useCaseFilters, filtersToViewData } from '@/hooks/use-case-filters';
import { useSavedViews } from '@/hooks/use-saved-views';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CaseListFilters } from '@/components/cases/case-list-filters';
import { FilterChips } from '@/components/cases/filter-chips';
import { Pagination } from '@/components/cases/pagination';
import { SavedViewSelector } from '@/components/common/saved-view-selector';
import type { Case, CaseStatus, Severity, CaseQueryParams } from '@/types/case';

const STATUS_COLORS: Record<CaseStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  OPEN: 'bg-yellow-100 text-yellow-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const SEVERITY_COLORS: Record<Severity, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

function CasesContent() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    filters,
    updateFilters,
    clearAllFilters,
    clearFilter,
    hasActiveFilters,
    applyFiltersFromView,
  } = useCaseFilters();

  // Saved views integration - auto-apply default view disabled since we manage filters via URL
  const {
    views,
    loading: viewsLoading,
    activeView,
    applyView,
    saveCurrentView,
    deleteView,
    clearActiveView,
  } = useSavedViews('CASES', { autoApplyDefault: false });

  const [cases, setCases] = useState<Case[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: CaseQueryParams = {
        limit: filters.pageSize,
        offset: filters.page * filters.pageSize,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      };

      // Multi-select filters
      if (filters.statuses.length > 0) {
        params.status = filters.statuses;
      }
      if (filters.severities.length > 0) {
        params.severity = filters.severities;
      }

      // Single-select filters
      if (filters.sourceChannel) {
        params.sourceChannel = filters.sourceChannel;
      }
      if (filters.caseType) {
        params.caseType = filters.caseType;
      }

      // Date range
      if (filters.dateFrom) {
        params.createdAfter = filters.dateFrom;
      }
      if (filters.dateTo) {
        params.createdBefore = filters.dateTo;
      }

      // Search
      if (filters.search.trim()) {
        params.search = filters.search.trim();
      }

      const response = await casesApi.list(params);
      setCases(response.data);
      setTotal(response.total);
    } catch (err) {
      console.error('Failed to fetch cases:', err);
      setError('Failed to load cases. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCases();
    }
  }, [isAuthenticated, fetchCases]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  /**
   * Handler for applying a saved view.
   * Fetches the view filters from API and applies them to the URL params.
   */
  const handleApplyView = useCallback(
    async (viewId: string) => {
      try {
        const viewData = await applyView(viewId);
        applyFiltersFromView(viewData);
      } catch (error) {
        console.error('Failed to apply view:', error);
      }
    },
    [applyView, applyFiltersFromView]
  );

  /**
   * Handler for saving current filters as a new view.
   */
  const handleSaveView = useCallback(
    async (name: string, isShared: boolean, isPinned: boolean) => {
      await saveCurrentView(name, filtersToViewData(filters), {
        isShared,
        isPinned,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });
    },
    [filters, saveCurrentView]
  );

  /**
   * Handler for clearing the active view and all filters.
   */
  const handleClearView = useCallback(() => {
    clearActiveView();
    clearAllFilters();
  }, [clearActiveView, clearAllFilters]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="font-semibold text-gray-900">
                Risk Intelligence Platform
              </span>
            </div>
            <nav className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                Dashboard
              </Button>
              <Button variant="ghost" size="sm" className="font-semibold">
                Cases
              </Button>
              {user.role === 'SYSTEM_ADMIN' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push('/settings/users')}
                >
                  Settings
                </Button>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
            <p className="text-gray-600 mt-1">
              Manage and track compliance cases
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SavedViewSelector
              views={views}
              activeView={activeView}
              onApplyView={handleApplyView}
              onSaveView={handleSaveView}
              onDeleteView={deleteView}
              onClearView={handleClearView}
              hasActiveFilters={hasActiveFilters}
              loading={viewsLoading}
            />
            <Button onClick={() => router.push('/cases/new')}>+ New Case</Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <CaseListFilters filters={filters} onUpdateFilters={updateFilters} />
          </CardContent>
        </Card>

        {/* Active filters */}
        {hasActiveFilters && (
          <div className="mb-4">
            <FilterChips
              filters={filters}
              onClearFilter={clearFilter}
              onClearAll={clearAllFilters}
              totalResults={total}
            />
          </div>
        )}

        {/* Cases Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Cases</span>
              {!hasActiveFilters && (
                <span className="text-sm font-normal text-muted-foreground">
                  {total} total
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-red-600 mb-4 p-4 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8 text-gray-500">
                Loading cases...
              </div>
            ) : cases.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {hasActiveFilters
                  ? 'No cases match your filters.'
                  : 'No cases found. Create your first case to get started.'}
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Summary</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cases.map((caseItem) => (
                      <TableRow
                        key={caseItem.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => router.push(`/cases/${caseItem.id}`)}
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          {caseItem.referenceNumber}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {caseItem.summary || caseItem.details.slice(0, 100)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_COLORS[caseItem.status]}
                          >
                            {caseItem.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {caseItem.severity ? (
                            <Badge
                              variant="outline"
                              className={SEVERITY_COLORS[caseItem.severity]}
                            >
                              {caseItem.severity}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {caseItem.sourceChannel.replace(/_/g, ' ')}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {formatDate(caseItem.createdAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/cases/${caseItem.id}`);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <Pagination
                  page={filters.page}
                  pageSize={filters.pageSize}
                  total={total}
                  onPageChange={(page) => updateFilters({ page })}
                  onPageSizeChange={(pageSize) => updateFilters({ pageSize })}
                />
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function CasesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      }
    >
      <CasesContent />
    </Suspense>
  );
}
