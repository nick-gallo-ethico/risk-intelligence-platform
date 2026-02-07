/**
 * useViewUrlState Hook
 *
 * Bidirectional URL state synchronization for saved views.
 * Enables bookmarkable view links with filters, sort, and search state.
 * Uses Next.js App Router navigation APIs.
 */
"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { FilterGroup, SortOrder } from "@/lib/views/types";

interface ViewUrlState {
  viewId: string | null;
  filters: string | null;
  sortBy: string | null;
  sortOrder: SortOrder | null;
  search: string | null;
  page: number;
  pageSize: number;
}

interface UseViewUrlStateReturn {
  urlState: ViewUrlState;
  setViewId: (viewId: string | null) => void;
  setFilters: (filters: FilterGroup[]) => void;
  setSort: (sortBy: string | null, sortOrder: SortOrder) => void;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  clearUrlState: () => void;
}

export function useViewUrlState(): UseViewUrlStateReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse current URL state
  const urlState = useMemo<ViewUrlState>(
    () => ({
      viewId: searchParams?.get("view") ?? null,
      filters: searchParams?.get("filters") ?? null,
      sortBy: searchParams?.get("sortBy") ?? null,
      sortOrder: (searchParams?.get("sortOrder") as SortOrder | null) ?? null,
      search: searchParams?.get("q") ?? null,
      page: parseInt(searchParams?.get("page") || "1", 10),
      pageSize: parseInt(searchParams?.get("pageSize") || "25", 10),
    }),
    [searchParams],
  );

  // Helper to update URL params
  const updateUrl = useCallback(
    (updates: Partial<ViewUrlState>) => {
      const params = new URLSearchParams(searchParams?.toString() || "");

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "") {
          params.delete(key === "search" ? "q" : key);
        } else if (key === "filters") {
          // Only set filters if there are actual conditions
          const parsed = typeof value === "string" ? JSON.parse(value) : value;
          if (Array.isArray(parsed) && parsed.length > 0) {
            params.set("filters", JSON.stringify(parsed));
          } else {
            params.delete("filters");
          }
        } else if (key === "search") {
          if (value) params.set("q", String(value));
          else params.delete("q");
        } else if (key === "page" && value === 1) {
          params.delete("page"); // Default page 1, no need in URL
        } else if (key === "pageSize" && value === 25) {
          params.delete("pageSize"); // Default pageSize, no need in URL
        } else {
          params.set(key === "viewId" ? "view" : key, String(value));
        }
      });

      const basePath = pathname || "/";
      const newUrl = params.toString()
        ? `${basePath}?${params.toString()}`
        : basePath;
      router.replace(newUrl, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  const setViewId = useCallback(
    (viewId: string | null) => {
      // When switching views, clear filters and sort (they're part of the view)
      const params = new URLSearchParams();
      if (viewId) params.set("view", viewId);
      const basePath = pathname || "/";
      const newUrl = params.toString()
        ? `${basePath}?${params.toString()}`
        : basePath;
      router.push(newUrl, { scroll: false });
    },
    [router, pathname],
  );

  const setFilters = useCallback(
    (filters: FilterGroup[]) => {
      const hasConditions = filters.some((g) => g.conditions.length > 0);
      updateUrl({
        filters: hasConditions ? JSON.stringify(filters) : null,
        page: 1, // Reset to page 1 when filters change
      });
    },
    [updateUrl],
  );

  const setSort = useCallback(
    (sortBy: string | null, sortOrder: SortOrder) => {
      updateUrl({ sortBy, sortOrder });
    },
    [updateUrl],
  );

  const setSearch = useCallback(
    (search: string) => {
      updateUrl({
        search: search || null,
        page: 1, // Reset to page 1 when search changes
      });
    },
    [updateUrl],
  );

  const setPage = useCallback(
    (page: number) => {
      updateUrl({ page });
    },
    [updateUrl],
  );

  const setPageSize = useCallback(
    (pageSize: number) => {
      updateUrl({ pageSize, page: 1 });
    },
    [updateUrl],
  );

  const clearUrlState = useCallback(() => {
    router.replace(pathname || "/", { scroll: false });
  }, [router, pathname]);

  return {
    urlState,
    setViewId,
    setFilters,
    setSort,
    setSearch,
    setPage,
    setPageSize,
    clearUrlState,
  };
}

/**
 * Helper to parse filters from URL query string
 */
export function parseUrlFilters(filtersParam: string | null): FilterGroup[] {
  if (!filtersParam) return [];
  try {
    return JSON.parse(filtersParam);
  } catch {
    return [];
  }
}

/**
 * Helper to serialize filters for URL query string
 */
export function serializeFiltersForUrl(filters: FilterGroup[]): string | null {
  const hasConditions = filters.some((g) => g.conditions.length > 0);
  if (!hasConditions) return null;
  return JSON.stringify(filters);
}
