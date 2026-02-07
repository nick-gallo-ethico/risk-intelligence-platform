/**
 * SavedViewProvider
 *
 * React context provider for managing all view state including:
 * - Active view selection
 * - Filters, sort, and columns
 * - Pagination and selection
 * - View mode (table/board)
 *
 * Uses useReducer for predictable state management and synchronizes
 * with URL state for shareable views.
 */
"use client";

import React, {
  createContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  SavedView,
  FilterGroup,
  ColumnConfig,
  SortOrder,
  ViewMode,
} from "@/lib/views/types";
import { ModuleViewConfig } from "@/types/view-config";
import {
  useSavedViews,
  useCreateSavedView,
  useUpdateSavedView,
  useDeleteSavedView,
  useCloneSavedView,
  useReorderSavedViews,
  useApplySavedView,
} from "@/hooks/views/useSavedViewsApi";
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_VIEW_MODE,
  DEFAULT_FROZEN_COLUMNS,
} from "@/lib/views/constants";

// State shape
interface ViewState {
  // Active view
  activeViewId: string | null;
  activeView: SavedView | null;

  // Current state (may differ from saved view)
  filters: FilterGroup[];
  quickFilters: Record<string, unknown>;
  searchQuery: string;
  visibleColumns: string[];
  columnOrder: string[];
  frozenColumnCount: number;
  columnWidths: Record<string, number>;
  sortBy: string | null;
  sortOrder: SortOrder;
  viewMode: ViewMode;
  boardGroupBy: string | null;

  // Selection
  selectedRowIds: Set<string>;

  // Pagination
  page: number;
  pageSize: number;
  total: number;

  // UI state
  hasUnsavedChanges: boolean;
  isLoading: boolean;
}

// Actions
type ViewAction =
  | { type: "SET_ACTIVE_VIEW"; view: SavedView | null }
  | { type: "SET_FILTERS"; filters: FilterGroup[] }
  | { type: "SET_QUICK_FILTER"; propertyId: string; value: unknown }
  | { type: "CLEAR_FILTERS" }
  | { type: "SET_SEARCH"; query: string }
  | { type: "SET_COLUMNS"; columnIds: string[] }
  | { type: "SET_COLUMN_ORDER"; columnIds: string[] }
  | { type: "SET_FROZEN_COLUMNS"; count: number }
  | { type: "RESIZE_COLUMN"; columnId: string; width: number }
  | { type: "SET_SORT"; column: string | null; order: SortOrder }
  | { type: "SET_VIEW_MODE"; mode: ViewMode }
  | { type: "SET_BOARD_GROUP_BY"; propertyId: string }
  | { type: "SELECT_ROW"; rowId: string }
  | { type: "SELECT_ALL"; rowIds: string[] }
  | { type: "CLEAR_SELECTION" }
  | { type: "SET_PAGE"; page: number }
  | { type: "SET_PAGE_SIZE"; size: number }
  | { type: "SET_TOTAL"; total: number }
  | { type: "MARK_SAVED" }
  | { type: "SET_LOADING"; loading: boolean };

// Context value type
export interface SavedViewContextValue extends ViewState {
  config: ModuleViewConfig;
  views: SavedView[];

  // View management
  setActiveView: (viewId: string | null) => Promise<void>;
  saveView: () => Promise<void>;
  saveViewAs: (
    name: string,
    visibility: "private" | "team" | "everyone"
  ) => Promise<SavedView>;
  deleteView: (viewId: string) => Promise<void>;
  duplicateView: (viewId: string) => Promise<SavedView>;
  renameView: (viewId: string, name: string) => Promise<void>;
  reorderTabs: (viewIds: string[]) => Promise<void>;

  // Filter actions
  setFilters: (filters: FilterGroup[]) => void;
  setQuickFilter: (propertyId: string, value: unknown) => void;
  clearFilters: () => void;
  setSearchQuery: (query: string) => void;

  // Column actions
  setColumns: (columnIds: string[]) => void;
  setColumnOrder: (columnIds: string[]) => void;
  setFrozenColumns: (count: number) => void;
  resizeColumn: (columnId: string, width: number) => void;

  // Sort actions
  setSort: (column: string | null, order: SortOrder) => void;

  // View mode actions
  setViewMode: (mode: ViewMode) => void;
  setBoardGroupBy: (propertyId: string) => void;

  // Selection actions
  selectRow: (rowId: string) => void;
  selectAll: (rowIds: string[]) => void;
  clearSelection: () => void;

  // Pagination actions
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setTotal: (total: number) => void;

  // Data actions
  refresh: () => void;
}

export const SavedViewContext = createContext<SavedViewContextValue | null>(
  null
);

function viewReducer(state: ViewState, action: ViewAction): ViewState {
  switch (action.type) {
    case "SET_ACTIVE_VIEW":
      if (!action.view) {
        return {
          ...state,
          activeViewId: null,
          activeView: null,
          hasUnsavedChanges: false,
        };
      }
      return {
        ...state,
        activeViewId: action.view.id,
        activeView: action.view,
        filters: action.view.filters || [],
        visibleColumns:
          action.view.columns
            ?.filter((c) => c.visible)
            .map((c) => c.key) || state.visibleColumns,
        columnOrder:
          action.view.columns
            ?.sort((a, b) => a.order - b.order)
            .map((c) => c.key) || state.columnOrder,
        frozenColumnCount: action.view.frozenColumnCount,
        sortBy: action.view.sortBy || null,
        sortOrder: (action.view.sortOrder as SortOrder) || "asc",
        viewMode: (action.view.viewMode as ViewMode) || "table",
        boardGroupBy: action.view.boardGroupBy || null,
        hasUnsavedChanges: false,
        page: 1, // Reset to first page on view change
      };

    case "SET_FILTERS":
      return {
        ...state,
        filters: action.filters,
        hasUnsavedChanges: true,
        page: 1,
      };

    case "SET_QUICK_FILTER":
      return {
        ...state,
        quickFilters: {
          ...state.quickFilters,
          [action.propertyId]: action.value,
        },
        hasUnsavedChanges: true,
        page: 1,
      };

    case "CLEAR_FILTERS":
      return {
        ...state,
        filters: [],
        quickFilters: {},
        searchQuery: "",
        hasUnsavedChanges: true,
        page: 1,
      };

    case "SET_SEARCH":
      return { ...state, searchQuery: action.query, page: 1 };

    case "SET_COLUMNS":
      return {
        ...state,
        visibleColumns: action.columnIds,
        hasUnsavedChanges: true,
      };

    case "SET_COLUMN_ORDER":
      return {
        ...state,
        columnOrder: action.columnIds,
        hasUnsavedChanges: true,
      };

    case "SET_FROZEN_COLUMNS":
      return {
        ...state,
        frozenColumnCount: action.count,
        hasUnsavedChanges: true,
      };

    case "RESIZE_COLUMN":
      return {
        ...state,
        columnWidths: {
          ...state.columnWidths,
          [action.columnId]: action.width,
        },
        hasUnsavedChanges: true,
      };

    case "SET_SORT":
      return {
        ...state,
        sortBy: action.column,
        sortOrder: action.order,
        hasUnsavedChanges: true,
        page: 1,
      };

    case "SET_VIEW_MODE":
      return { ...state, viewMode: action.mode, hasUnsavedChanges: true };

    case "SET_BOARD_GROUP_BY":
      return {
        ...state,
        boardGroupBy: action.propertyId,
        hasUnsavedChanges: true,
      };

    case "SELECT_ROW": {
      const newSelected = new Set(state.selectedRowIds);
      if (newSelected.has(action.rowId)) {
        newSelected.delete(action.rowId);
      } else {
        newSelected.add(action.rowId);
      }
      return { ...state, selectedRowIds: newSelected };
    }

    case "SELECT_ALL":
      return { ...state, selectedRowIds: new Set(action.rowIds) };

    case "CLEAR_SELECTION":
      return { ...state, selectedRowIds: new Set() };

    case "SET_PAGE":
      return { ...state, page: action.page };

    case "SET_PAGE_SIZE":
      return { ...state, pageSize: action.size, page: 1 };

    case "SET_TOTAL":
      return { ...state, total: action.total };

    case "MARK_SAVED":
      return { ...state, hasUnsavedChanges: false };

    case "SET_LOADING":
      return { ...state, isLoading: action.loading };

    default:
      return state;
  }
}

interface SavedViewProviderProps {
  config: ModuleViewConfig;
  children: React.ReactNode;
}

export function SavedViewProvider({
  config,
  children,
}: SavedViewProviderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial state from config
  const defaultColumns = config.columns
    .filter((c) => c.defaultVisible)
    .map((c) => c.id);
  const allColumnIds = config.columns.map((c) => c.id);

  const initialState: ViewState = {
    activeViewId: null,
    activeView: null,
    filters: [],
    quickFilters: {},
    searchQuery: "",
    visibleColumns: defaultColumns,
    columnOrder: allColumnIds,
    frozenColumnCount: DEFAULT_FROZEN_COLUMNS,
    columnWidths: {},
    sortBy: null,
    sortOrder: "asc",
    viewMode: DEFAULT_VIEW_MODE,
    boardGroupBy: config.boardConfig?.defaultGroupBy || null,
    selectedRowIds: new Set(),
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    hasUnsavedChanges: false,
    isLoading: false,
  };

  const [state, dispatch] = useReducer(viewReducer, initialState);

  // API hooks
  const { data: viewsData, refetch: refetchViews } = useSavedViews(
    config.moduleType
  );
  const createMutation = useCreateSavedView();
  const updateMutation = useUpdateSavedView();
  const deleteMutation = useDeleteSavedView();
  const cloneMutation = useCloneSavedView();
  const reorderMutation = useReorderSavedViews();
  const applyMutation = useApplySavedView();

  // Memoize views to prevent dependency changes on every render
  const views = useMemo(() => viewsData?.data || [], [viewsData?.data]);

  // Load view from URL on mount
  useEffect(() => {
    const viewId = searchParams?.get("viewId");
    if (viewId && views.length > 0) {
      const view = views.find((v) => v.id === viewId);
      if (view) {
        dispatch({ type: "SET_ACTIVE_VIEW", view });
      }
    }
  }, [searchParams, views]);

  // Actions
  const setActiveView = useCallback(
    async (viewId: string | null) => {
      if (!viewId) {
        dispatch({ type: "SET_ACTIVE_VIEW", view: null });
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.delete("viewId");
        router.replace(`?${params.toString()}`);
        return;
      }

      dispatch({ type: "SET_LOADING", loading: true });
      try {
        const result = await applyMutation.mutateAsync(viewId);
        const view = views.find((v) => v.id === viewId);
        if (view) {
          // Merge applied result with view data
          dispatch({
            type: "SET_ACTIVE_VIEW",
            view: {
              ...view,
              filters: result.filters,
              sortBy: result.sortBy,
              sortOrder: result.sortOrder,
              columns: result.columns,
              frozenColumnCount: result.frozenColumnCount,
              viewMode: result.viewMode,
              boardGroupBy: result.boardGroupBy,
            },
          });
        }
        // Update URL
        const params = new URLSearchParams(searchParams?.toString() || "");
        params.set("viewId", viewId);
        router.replace(`?${params.toString()}`);
      } finally {
        dispatch({ type: "SET_LOADING", loading: false });
      }
    },
    [views, applyMutation, searchParams, router]
  );

  const saveView = useCallback(async () => {
    if (!state.activeView) return;

    const columns: ColumnConfig[] = state.columnOrder.map((id, index) => ({
      key: id,
      visible: state.visibleColumns.includes(id),
      order: index,
      width: state.columnWidths[id],
    }));

    await updateMutation.mutateAsync({
      id: state.activeView.id,
      filters: state.filters,
      sortBy: state.sortBy || undefined,
      sortOrder: state.sortOrder,
      columns,
      frozenColumnCount: state.frozenColumnCount,
      viewMode: state.viewMode,
      boardGroupBy: state.boardGroupBy || undefined,
    });

    dispatch({ type: "MARK_SAVED" });
    refetchViews();
  }, [state, updateMutation, refetchViews]);

  const saveViewAs = useCallback(
    async (name: string, visibility: "private" | "team" | "everyone") => {
      const columns: ColumnConfig[] = state.columnOrder.map((id, index) => ({
        key: id,
        visible: state.visibleColumns.includes(id),
        order: index,
        width: state.columnWidths[id],
      }));

      const newView = await createMutation.mutateAsync({
        name,
        entityType: config.moduleType,
        filters: state.filters,
        sortBy: state.sortBy || undefined,
        sortOrder: state.sortOrder,
        columns,
        frozenColumnCount: state.frozenColumnCount,
        viewMode: state.viewMode,
        boardGroupBy: state.boardGroupBy || undefined,
        isShared: visibility !== "private",
      });

      await refetchViews();
      dispatch({ type: "SET_ACTIVE_VIEW", view: newView });
      return newView;
    },
    [state, config.moduleType, createMutation, refetchViews]
  );

  const deleteView = useCallback(
    async (viewId: string) => {
      await deleteMutation.mutateAsync(viewId);
      if (state.activeViewId === viewId) {
        dispatch({ type: "SET_ACTIVE_VIEW", view: null });
      }
      refetchViews();
    },
    [state.activeViewId, deleteMutation, refetchViews]
  );

  const duplicateView = useCallback(
    async (viewId: string) => {
      const newView = await cloneMutation.mutateAsync({ id: viewId });
      await refetchViews();
      return newView;
    },
    [cloneMutation, refetchViews]
  );

  const renameView = useCallback(
    async (viewId: string, name: string) => {
      await updateMutation.mutateAsync({ id: viewId, name });
      refetchViews();
    },
    [updateMutation, refetchViews]
  );

  const reorderTabs = useCallback(
    async (viewIds: string[]) => {
      const viewOrders = viewIds.map((id, index) => ({
        id,
        displayOrder: index,
      }));
      await reorderMutation.mutateAsync(viewOrders);
      refetchViews();
    },
    [reorderMutation, refetchViews]
  );

  // Simple state setters
  const setFilters = useCallback((filters: FilterGroup[]) => {
    dispatch({ type: "SET_FILTERS", filters });
  }, []);

  const setQuickFilter = useCallback((propertyId: string, value: unknown) => {
    dispatch({ type: "SET_QUICK_FILTER", propertyId, value });
  }, []);

  const clearFilters = useCallback(() => {
    dispatch({ type: "CLEAR_FILTERS" });
  }, []);

  const setSearchQuery = useCallback((query: string) => {
    dispatch({ type: "SET_SEARCH", query });
  }, []);

  const setColumns = useCallback((columnIds: string[]) => {
    dispatch({ type: "SET_COLUMNS", columnIds });
  }, []);

  const setColumnOrder = useCallback((columnIds: string[]) => {
    dispatch({ type: "SET_COLUMN_ORDER", columnIds });
  }, []);

  const setFrozenColumns = useCallback((count: number) => {
    dispatch({ type: "SET_FROZEN_COLUMNS", count });
  }, []);

  const resizeColumn = useCallback((columnId: string, width: number) => {
    dispatch({ type: "RESIZE_COLUMN", columnId, width });
  }, []);

  const setSort = useCallback((column: string | null, order: SortOrder) => {
    dispatch({ type: "SET_SORT", column, order });
  }, []);

  const setViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: "SET_VIEW_MODE", mode });
  }, []);

  const setBoardGroupBy = useCallback((propertyId: string) => {
    dispatch({ type: "SET_BOARD_GROUP_BY", propertyId });
  }, []);

  const selectRow = useCallback((rowId: string) => {
    dispatch({ type: "SELECT_ROW", rowId });
  }, []);

  const selectAll = useCallback((rowIds: string[]) => {
    dispatch({ type: "SELECT_ALL", rowIds });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_SELECTION" });
  }, []);

  const setPage = useCallback((page: number) => {
    dispatch({ type: "SET_PAGE", page });
  }, []);

  const setPageSize = useCallback((size: number) => {
    dispatch({ type: "SET_PAGE_SIZE", size });
  }, []);

  const setTotal = useCallback((total: number) => {
    dispatch({ type: "SET_TOTAL", total });
  }, []);

  const refresh = useCallback(() => {
    refetchViews();
  }, [refetchViews]);

  const value: SavedViewContextValue = useMemo(
    () => ({
      ...state,
      config,
      views,
      setActiveView,
      saveView,
      saveViewAs,
      deleteView,
      duplicateView,
      renameView,
      reorderTabs,
      setFilters,
      setQuickFilter,
      clearFilters,
      setSearchQuery,
      setColumns,
      setColumnOrder,
      setFrozenColumns,
      resizeColumn,
      setSort,
      setViewMode,
      setBoardGroupBy,
      selectRow,
      selectAll,
      clearSelection,
      setPage,
      setPageSize,
      setTotal,
      refresh,
    }),
    [
      state,
      config,
      views,
      setActiveView,
      saveView,
      saveViewAs,
      deleteView,
      duplicateView,
      renameView,
      reorderTabs,
      setFilters,
      setQuickFilter,
      clearFilters,
      setSearchQuery,
      setColumns,
      setColumnOrder,
      setFrozenColumns,
      resizeColumn,
      setSort,
      setViewMode,
      setBoardGroupBy,
      selectRow,
      selectAll,
      clearSelection,
      setPage,
      setPageSize,
      setTotal,
      refresh,
    ]
  );

  return (
    <SavedViewContext.Provider value={value}>
      {children}
    </SavedViewContext.Provider>
  );
}
