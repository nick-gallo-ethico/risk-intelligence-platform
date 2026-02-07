"use client";

/**
 * Investigations Page
 *
 * Main investigations list page using the HubSpot-style saved views system.
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
import { INVESTIGATIONS_VIEW_CONFIG } from "@/lib/views/configs/investigations.config";
import {
  useInvestigationsView,
  type Investigation,
} from "@/hooks/views/useInvestigationsView";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";

/**
 * InvestigationsPageContent component that uses the view context
 */
function InvestigationsPageContent() {
  const router = useRouter();
  const {
    investigations,
    totalRecords,
    isLoading,
    handleBulkAction,
    handleStageChange,
  } = useInvestigationsView();

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
   * Navigate to investigation detail page
   */
  const handleRowClick = useCallback(
    (record: Investigation) => {
      router.push(`/investigations/${record.id}`);
    },
    [router],
  );

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
  const getRowId = useCallback((row: Investigation) => row.id, []);

  return (
    <div className="flex flex-col h-full">
      {/* Zone 1: View Tabs */}
      <ViewTabsBar />

      {/* Zone 2: Toolbar with actions */}
      <ViewToolbar
        onEditColumnsClick={() => setShowColumnModal(true)}
        onFilterClick={() => setShowFilters(!showFilters)}
        filterCount={totalFilterCount}
        showFilters={showFilters}
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
            data={investigations}
            isLoading={isLoading}
            totalRecords={totalRecords}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onRowClick={handleRowClick}
            onBulkAction={handleBulkAction}
            getRowId={getRowId}
            emptyMessage="No investigations match your current filters"
          />
        ) : (
          <BoardView
            data={investigations}
            isLoading={isLoading}
            onRecordClick={handleRowClick}
            onStatusChange={handleStageChange}
            getRecordId={getRowId}
            emptyMessage="No investigations match your current filters"
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
 * Investigations Page with SavedViewProvider wrapper
 */
export default function InvestigationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <SavedViewProvider config={INVESTIGATIONS_VIEW_CONFIG}>
        <InvestigationsPageContent />
      </SavedViewProvider>
    </Suspense>
  );
}
