"use client";

/**
 * Disclosures Page
 *
 * Main disclosures list page using the HubSpot-style saved views system.
 * Provides table and board views with filters, search, and bulk actions.
 *
 * Disclosures include: COI, gifts & entertainment, outside activities,
 * financial interests, and family/personal relationships.
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
import { DISCLOSURES_VIEW_CONFIG } from "@/lib/views/configs/disclosures.config";
import {
  useDisclosuresView,
  type Disclosure,
} from "@/hooks/views/useDisclosuresView";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileCheck, Settings } from "lucide-react";

/**
 * DisclosuresPageContent component that uses the view context
 */
function DisclosuresPageContent() {
  const router = useRouter();
  const {
    disclosures,
    totalRecords,
    isLoading,
    handleBulkAction,
    handleStatusChange,
  } = useDisclosuresView();

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
   * Navigate to disclosure detail page
   */
  const handleRowClick = useCallback(
    (disclosure: Disclosure) => {
      router.push(`/disclosures/${disclosure.id}`);
    },
    [router],
  );

  /**
   * Navigate to new disclosure campaign
   */
  const handleNewCampaign = useCallback(() => {
    router.push("/campaigns/new?type=DISCLOSURE");
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
  const getRowId = useCallback((row: Disclosure) => row.id, []);

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/disclosures/forms/builder")}
            >
              <Settings className="h-4 w-4 mr-1" />
              Form Builder
            </Button>
            <Button onClick={handleNewCampaign} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New Campaign
            </Button>
          </div>
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
            data={disclosures}
            isLoading={isLoading}
            totalRecords={totalRecords}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onRowClick={handleRowClick}
            onBulkAction={handleBulkAction}
            getRowId={getRowId}
            emptyMessage="No disclosures match your current filters"
          />
        ) : (
          <BoardView
            data={disclosures}
            isLoading={isLoading}
            onRecordClick={handleRowClick}
            onStatusChange={handleStatusChange}
            getRecordId={getRowId}
            emptyMessage="No disclosures match your current filters"
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
 * Disclosures Page with SavedViewProvider wrapper
 */
export default function DisclosuresPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <SavedViewProvider config={DISCLOSURES_VIEW_CONFIG}>
        <DisclosuresPageContent />
      </SavedViewProvider>
    </Suspense>
  );
}
