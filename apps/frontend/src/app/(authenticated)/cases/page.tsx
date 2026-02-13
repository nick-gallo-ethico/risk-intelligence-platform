"use client";

/**
 * Cases Page
 *
 * Main cases list page using the HubSpot-style saved views system.
 * Provides table and board views with filters, search, and bulk actions.
 */

import React, { useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  SavedViewProvider,
  ViewTabsBar,
  ViewToolbar,
  QuickFiltersRow,
  ColumnSelectionModal,
  AdvancedFiltersPanel,
  DataTable,
  BoardView,
} from "@/components/views";
import { CASES_VIEW_CONFIG } from "@/lib/views/configs/cases.config";
import { useCasesView, type Case } from "@/hooks/views/useCasesView";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ContextualHelpLink } from "@/components/help/contextual-help-link";

/**
 * CasesPageContent component that uses the view context
 */
function CasesPageContent() {
  const router = useRouter();
  const {
    cases,
    totalRecords,
    isLoading,
    handleBulkAction,
    handleStatusChange,
  } = useCasesView();

  const {
    viewMode,
    filters,
    quickFilters,
    page,
    pageSize,
    setPage,
    setPageSize,
  } = useSavedViewContext();

  // UI state for panels and modals
  const [showFilters, setShowFilters] = useState(false);
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Count active filters for badge display
  const quickFilterCount = Object.values(quickFilters).filter(
    (v) => v !== undefined && v !== null && v !== "",
  ).length;
  const advancedFilterCount = filters.reduce(
    (sum, g) => sum + g.conditions.length,
    0,
  );
  const totalFilterCount = quickFilterCount + advancedFilterCount;

  /**
   * Navigate to case detail page
   */
  const handleRowClick = useCallback(
    (caseRecord: Case) => {
      router.push(`/cases/${caseRecord.id}`);
    },
    [router],
  );

  /**
   * Navigate to new case page
   */
  const handleNewCase = useCallback(() => {
    router.push("/cases/new");
  }, [router]);

  /**
   * Pagination handlers
   */
  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
    },
    [setPage],
  );

  const handlePageSizeChange = useCallback(
    (size: number) => {
      setPageSize(size);
    },
    [setPageSize],
  );

  /**
   * Get row ID for table selection
   */
  const getRowId = useCallback((row: Case) => row.id, []);

  return (
    <div className="flex flex-col h-full relative">
      <ContextualHelpLink className="absolute top-4 right-4 z-10" />

      {/* Zone 1: View Tabs */}
      <ViewTabsBar />

      {/* Zone 2: Toolbar with actions */}
      <ViewToolbar
        onEditColumnsClick={() => setShowColumnModal(true)}
        onFilterClick={() => setShowFilters(!showFilters)}
        filterCount={totalFilterCount}
        showFilters={showFilters}
        actions={
          <Button onClick={handleNewCase} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Case
          </Button>
        }
      />

      {/* Zone 3: Quick Filters (conditional) */}
      {showFilters && (
        <QuickFiltersRow
          onAdvancedFiltersClick={() => setShowAdvancedFilters(true)}
          advancedFilterCount={advancedFilterCount}
        />
      )}

      {/* Zone 4: Data Table or Board View */}
      <div className="flex-1 min-h-0">
        {viewMode === "table" ? (
          <DataTable
            data={cases}
            isLoading={isLoading}
            totalRecords={totalRecords}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onRowClick={handleRowClick}
            onBulkAction={handleBulkAction}
            getRowId={getRowId}
            emptyMessage="No cases match your current filters"
          />
        ) : (
          <BoardView
            data={cases}
            isLoading={isLoading}
            onRecordClick={handleRowClick}
            onStatusChange={handleStatusChange}
            getRecordId={getRowId}
            emptyMessage="No cases match your current filters"
          />
        )}
      </div>

      {/* Column Selection Modal */}
      <ColumnSelectionModal
        open={showColumnModal}
        onOpenChange={setShowColumnModal}
      />

      {/* Advanced Filters Panel (slide-out) */}
      <AdvancedFiltersPanel
        open={showAdvancedFilters}
        onOpenChange={setShowAdvancedFilters}
      />
    </div>
  );
}

/**
 * Cases Page with SavedViewProvider wrapper
 */
export default function CasesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <SavedViewProvider config={CASES_VIEW_CONFIG}>
        <CasesPageContent />
      </SavedViewProvider>
    </Suspense>
  );
}
