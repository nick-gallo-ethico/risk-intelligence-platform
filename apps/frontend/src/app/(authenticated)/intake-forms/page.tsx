"use client";

/**
 * Intake Forms Page
 *
 * Main intake forms submissions list page using the HubSpot-style saved views system.
 * Provides table and board views with filters, search, and bulk actions.
 *
 * Manages submissions from various intake channels:
 * - Ethics Portal (anonymous reporting)
 * - Web Forms (embedded intake)
 * - Employee Portal
 * - Mobile App
 */

import React, { useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import { INTAKE_FORMS_VIEW_CONFIG } from "@/lib/views/configs/intake-forms.config";
import {
  useIntakeFormsView,
  type IntakeFormSubmission,
} from "@/hooks/views/useIntakeFormsView";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FormInput,
  Globe,
  FileText,
  Phone,
  Mail,
  ExternalLink,
  LayoutGrid,
  List,
} from "lucide-react";

/**
 * Quick Stats Cards for intake channels
 */
function IntakeChannelsBar() {
  const router = useRouter();

  const channels = [
    {
      id: "ethics-portal",
      title: "Ethics Portal",
      icon: Globe,
      href: "/ethics/acme/report",
    },
    {
      id: "web-forms",
      title: "Web Forms",
      icon: FileText,
      href: "/intake-forms/web",
    },
    {
      id: "operator",
      title: "Phone Intake",
      icon: Phone,
      href: "/operator",
    },
  ];

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
      <span className="text-sm font-medium text-muted-foreground mr-2">
        Quick Links:
      </span>
      {channels.map((channel) => (
        <Button
          key={channel.id}
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          asChild
        >
          <Link href={channel.href}>
            <channel.icon className="h-3 w-3 mr-1" />
            {channel.title}
          </Link>
        </Button>
      ))}
      <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
        <Link href="/disclosures/forms/builder">
          <FormInput className="h-3 w-3 mr-1" />
          Form Builder
        </Link>
      </Button>
    </div>
  );
}

/**
 * IntakeFormsPageContent component that uses the view context
 */
function IntakeFormsPageContent() {
  const router = useRouter();
  const {
    submissions,
    totalRecords,
    isLoading,
    handleBulkAction,
    handleStatusChange,
  } = useIntakeFormsView();

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
   * Navigate to submission detail page
   */
  const handleRowClick = useCallback(
    (submission: IntakeFormSubmission) => {
      router.push(`/intake-forms/submissions/${submission.id}`);
    },
    [router],
  );

  /**
   * Navigate to new form template
   */
  const handleNewForm = useCallback(() => {
    router.push("/disclosures/forms/builder");
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
  const getRowId = useCallback((row: IntakeFormSubmission) => row.id, []);

  return (
    <div className="flex flex-col h-full">
      {/* Intake Channels Quick Links */}
      <IntakeChannelsBar />

      {/* Zone 1: View Tabs */}
      <ViewTabsBar />

      {/* Zone 2: Toolbar with actions */}
      <ViewToolbar
        onEditColumnsClick={() => setShowColumnModal(true)}
        onFilterClick={() => setShowFilters(!showFilters)}
        filterCount={totalFilterCount}
        showFilters={showFilters}
        actions={
          <Button onClick={handleNewForm} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Form
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
            data={submissions}
            isLoading={isLoading}
            totalRecords={totalRecords}
            currentPage={page}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onRowClick={handleRowClick}
            onBulkAction={handleBulkAction}
            getRowId={getRowId}
            emptyMessage="No submissions match your current filters"
          />
        ) : (
          <BoardView
            data={submissions}
            isLoading={isLoading}
            onRecordClick={handleRowClick}
            onStatusChange={handleStatusChange}
            getRecordId={getRowId}
            emptyMessage="No submissions match your current filters"
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
 * Intake Forms Page with SavedViewProvider wrapper
 */
export default function IntakeFormsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      }
    >
      <SavedViewProvider config={INTAKE_FORMS_VIEW_CONFIG}>
        <IntakeFormsPageContent />
      </SavedViewProvider>
    </Suspense>
  );
}
