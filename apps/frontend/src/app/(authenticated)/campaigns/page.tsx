"use client";

import { useState, useCallback, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, FileInput } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CampaignsSummaryCards,
  CampaignsFilters,
  CampaignsTable,
} from "@/components/campaigns";
import { Pagination } from "@/components/cases/pagination";
import { useCampaigns, useCampaignStats } from "@/hooks/use-campaigns";
import type { CampaignQueryParams, CampaignStatus } from "@/types/campaign";

const PAGE_SIZE = 20;

/**
 * Tab preset filters for quick filtering.
 */
const TAB_PRESETS: Record<string, Partial<CampaignQueryParams>> = {
  all: {},
  active: { status: "ACTIVE" as CampaignStatus },
  drafts: { status: "DRAFT" as CampaignStatus },
  completed: { status: "COMPLETED" as CampaignStatus },
};

function CampaignsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Parse filters from URL search params
  const filtersFromUrl = useMemo((): CampaignQueryParams => {
    return {
      type:
        (searchParams?.get("type") as CampaignQueryParams["type"]) || undefined,
      status:
        (searchParams?.get("status") as CampaignQueryParams["status"]) ||
        undefined,
      ownerId: searchParams?.get("ownerId") || undefined,
      startDateFrom: searchParams?.get("startDateFrom") || undefined,
      startDateTo: searchParams?.get("startDateTo") || undefined,
      search: searchParams?.get("search") || undefined,
      sortBy: searchParams?.get("sortBy") || "createdAt",
      sortOrder: (searchParams?.get("sortOrder") as "asc" | "desc") || "desc",
      page: parseInt(searchParams?.get("page") || "0", 10),
      limit: parseInt(searchParams?.get("limit") || String(PAGE_SIZE), 10),
    };
  }, [searchParams]);

  // Local state for active tab (derived from status filter)
  const activeTab = useMemo(() => {
    if (!filtersFromUrl.status) return "all";
    if (filtersFromUrl.status === "ACTIVE") return "active";
    if (filtersFromUrl.status === "DRAFT") return "drafts";
    if (filtersFromUrl.status === "COMPLETED") return "completed";
    return "all";
  }, [filtersFromUrl.status]);

  // Fetch campaigns with filters
  const { data: campaignsData, isLoading } = useCampaigns({
    ...filtersFromUrl,
    skip: (filtersFromUrl.page ?? 0) * (filtersFromUrl.limit ?? PAGE_SIZE),
    take: filtersFromUrl.limit ?? PAGE_SIZE,
  });

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useCampaignStats();

  /**
   * Update URL with new filter values.
   */
  const updateFilters = useCallback(
    (updates: Partial<CampaignQueryParams>) => {
      const newParams = new URLSearchParams(searchParams?.toString() || "");
      const newFilters = { ...filtersFromUrl, ...updates };

      // Reset page when filters change (except page itself)
      if (!("page" in updates)) {
        newFilters.page = 0;
      }

      // Update URL params
      const paramMapping: [keyof CampaignQueryParams, string][] = [
        ["type", "type"],
        ["status", "status"],
        ["ownerId", "ownerId"],
        ["startDateFrom", "startDateFrom"],
        ["startDateTo", "startDateTo"],
        ["search", "search"],
        ["sortBy", "sortBy"],
        ["sortOrder", "sortOrder"],
        ["page", "page"],
        ["limit", "limit"],
      ];

      for (const [key, paramName] of paramMapping) {
        const value = newFilters[key];
        if (value !== undefined && value !== "" && value !== 0) {
          newParams.set(paramName, String(value));
        } else {
          newParams.delete(paramName);
        }
      }

      // Clean up defaults
      if (newFilters.sortBy === "createdAt") newParams.delete("sortBy");
      if (newFilters.sortOrder === "desc") newParams.delete("sortOrder");
      if ((newFilters.limit ?? PAGE_SIZE) === PAGE_SIZE)
        newParams.delete("limit");

      const queryString = newParams.toString();
      router.push(`/campaigns${queryString ? `?${queryString}` : ""}`, {
        scroll: false,
      });
    },
    [filtersFromUrl, router, searchParams],
  );

  /**
   * Handle tab change - update status filter.
   */
  const handleTabChange = useCallback(
    (tab: string) => {
      const preset = TAB_PRESETS[tab] || {};
      updateFilters({
        ...preset,
        // Clear other filters when switching tabs
        type: undefined,
        ownerId: undefined,
        startDateFrom: undefined,
        startDateTo: undefined,
        search: undefined,
      });
    },
    [updateFilters],
  );

  /**
   * Handle sort column click.
   */
  const handleSort = useCallback(
    (column: string) => {
      const newSortOrder =
        filtersFromUrl.sortBy === column && filtersFromUrl.sortOrder === "asc"
          ? "desc"
          : "asc";
      updateFilters({ sortBy: column, sortOrder: newSortOrder });
    },
    [filtersFromUrl.sortBy, filtersFromUrl.sortOrder, updateFilters],
  );

  /**
   * Handle pagination.
   */
  const handlePageChange = useCallback(
    (page: number) => {
      updateFilters({ page });
    },
    [updateFilters],
  );

  const handlePageSizeChange = useCallback(
    (limit: number) => {
      updateFilters({ limit, page: 0 });
    },
    [updateFilters],
  );

  const campaigns = campaignsData?.data ?? [];
  const total = campaignsData?.total ?? 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Manage compliance campaigns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push("/forms")}>
            <FileInput className="mr-2 h-4 w-4" />
            Manage Forms
          </Button>
          <Button onClick={() => router.push("/campaigns/new")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <CampaignsSummaryCards stats={stats} isLoading={statsLoading} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <CampaignsFilters filters={filtersFromUrl} onChange={updateFilters} />
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          <CampaignsTable
            campaigns={campaigns}
            isLoading={isLoading}
            onSort={handleSort}
            sortBy={filtersFromUrl.sortBy || "createdAt"}
            sortOrder={filtersFromUrl.sortOrder || "desc"}
          />

          {/* Pagination */}
          <Pagination
            page={filtersFromUrl.page ?? 0}
            pageSize={filtersFromUrl.limit ?? PAGE_SIZE}
            total={total}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Campaigns list page.
 * Route: /campaigns
 */
export default function CampaignsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading campaigns...</div>
        </div>
      }
    >
      <CampaignsContent />
    </Suspense>
  );
}
