"use client";

/**
 * Policies Page
 *
 * Main policies list page using the HubSpot-style saved views system.
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
import { POLICIES_VIEW_CONFIG } from "@/lib/views/configs/policies.config";
import { usePoliciesView, type Policy } from "@/hooks/views/usePoliciesView";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import Link from "next/link";

/**
 * PoliciesPageContent component that uses the view context
 */
function PoliciesPageContent() {
  const router = useRouter();
  const {
    policies,
    totalRecords,
    isLoading,
    handleBulkAction,
    handleStatusChange,
  } = usePoliciesView();

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
   * Navigate to policy detail page
   */
  const handleRowClick = useCallback(
    (record: Policy) => {
      router.push(`/policies/${record.id}`);
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
  const getRowId = useCallback((row: Policy) => row.id, []);

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
        actions={
          <Button asChild size="sm">
            <Link href="/policies/new">
              <Plus className="h-4 w-4 mr-1" />
              New Policy
            </Link>
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
            data={policies}
            isLoading={isLoading}
            totalRecords={totalRecords}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onRowClick={handleRowClick}
            onBulkAction={handleBulkAction}
            getRowId={getRowId}
            emptyMessage="No policies match your current filters"
          />
        ) : (
          <BoardView
            data={policies}
            isLoading={isLoading}
            onRecordClick={handleRowClick}
            onStatusChange={handleStatusChange}
            getRecordId={getRowId}
            emptyMessage="No policies match your current filters"
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
 * Policies Page with SavedViewProvider wrapper
 */
export default function PoliciesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <SavedViewProvider config={POLICIES_VIEW_CONFIG}>
        <PoliciesPageContent />
      </SavedViewProvider>
    </Suspense>
  );
}
