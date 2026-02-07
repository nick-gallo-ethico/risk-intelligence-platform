"use client";

import React, { useMemo, useRef, useCallback } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  RowSelectionState,
  ColumnResizeMode,
} from "@tanstack/react-table";
import { ArrowUp, ArrowDown, ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { BulkActionsBar } from "./BulkActionsBar";
import { PaginationBar } from "./PaginationBar";
import { ColumnDefinition } from "@/types/view-config";
import { BulkAction } from "@/lib/views/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DataTableProps<T> {
  data: T[];
  isLoading?: boolean;
  totalRecords: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRowClick?: (row: T) => void;
  onBulkAction?: (actionId: string, selectedIds: string[]) => void;
  getRowId: (row: T) => string;
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  isLoading = false,
  totalRecords,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onRowClick,
  onBulkAction,
  getRowId,
  emptyMessage = "No records found",
}: DataTableProps<T>) {
  const {
    config,
    visibleColumns,
    frozenColumnCount,
    sortBy,
    sortOrder,
    setSort,
  } = useSavedViewContext();

  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Convert BulkActionConfig to BulkAction for the BulkActionsBar
  const bulkActions = useMemo<BulkAction[]>(() => {
    return (config.bulkActions || []).map((action) => ({
      id: action.id,
      label: action.label,
      icon: action.icon,
      destructive: action.destructive,
      requiresConfirmation: action.requiresConfirmation,
      confirmationMessage: action.confirmationMessage,
    }));
  }, [config.bulkActions]);

  // Build TanStack column definitions from visible columns
  const columns = useMemo<ColumnDef<T>[]>(() => {
    const cols: ColumnDef<T>[] = [];

    // Checkbox column
    cols.push({
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      size: 40,
      enableResizing: false,
    });

    // Data columns from visible columns
    visibleColumns.forEach((colId) => {
      const colConfig = config.columns.find((c) => c.id === colId);
      if (!colConfig) return;

      cols.push({
        id: colConfig.id,
        accessorKey: colConfig.accessorKey || colConfig.id,
        header: ({ column }) => (
          <div className="flex items-center gap-2">
            <span className="truncate">{colConfig.header}</span>
            {colConfig.sortable && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => {
                  const currentDir = column.getIsSorted();
                  if (!currentDir) {
                    setSort(colConfig.id, "asc");
                  } else if (currentDir === "asc") {
                    setSort(colConfig.id, "desc");
                  } else {
                    setSort(null, "asc");
                  }
                }}
              >
                {column.getIsSorted() === "asc" ? (
                  <ArrowUp className="h-4 w-4" />
                ) : column.getIsSorted() === "desc" ? (
                  <ArrowDown className="h-4 w-4" />
                ) : (
                  <ArrowUpDown className="h-4 w-4 opacity-50" />
                )}
              </Button>
            )}
          </div>
        ),
        cell: ({ getValue, row }) =>
          renderCell(getValue(), colConfig, row.original),
        size: colConfig.width || 150,
        enableResizing: colConfig.enableResizing !== false,
      });
    });

    // Actions column
    cols.push({
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onRowClick?.(row.original)}>
              View details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      size: 50,
      enableResizing: false,
    });

    return cols;
  }, [visibleColumns, config.columns, setSort, onRowClick]);

  // Render cell based on column type
  const renderCell = (
    value: unknown,
    colConfig: ColumnDefinition,
    row: T,
  ): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground">--</span>;
    }

    switch (colConfig.type) {
      case "date":
        return format(new Date(value as string), "MMM d, yyyy");
      case "datetime":
        return format(new Date(value as string), "MMM d, yyyy HH:mm");
      case "boolean":
        return value ? "Yes" : "No";
      case "enum":
      case "status":
      case "severity": {
        const option = colConfig.filterOptions?.find((o) => o.value === value);
        if (option) {
          return (
            <Badge variant="secondary" className="capitalize">
              {option.label}
            </Badge>
          );
        }
        return String(value);
      }
      case "user":
      case "users":
        // Render user name
        return <span>{String(value)}</span>;
      case "link":
        // First column is usually clickable
        return (
          <button
            className="text-primary hover:underline font-medium text-left"
            onClick={(e) => {
              e.stopPropagation();
              onRowClick?.(row);
            }}
          >
            {String(value)}
          </button>
        );
      case "number":
        return typeof value === "number"
          ? value.toLocaleString()
          : String(value);
      case "currency":
        return typeof value === "number"
          ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: "USD",
            }).format(value)
          : String(value);
      default: {
        const strValue = String(value);
        if (strValue.length > 50) {
          return (
            <span title={strValue} className="truncate block max-w-[200px]">
              {strValue}
            </span>
          );
        }
        return strValue;
      }
    }
  };

  // Sorting state (controlled by context)
  const sorting = useMemo<SortingState>(() => {
    if (!sortBy) return [];
    return [{ id: sortBy, desc: sortOrder === "desc" }];
  }, [sortBy, sortOrder]);

  // Row selection state
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  // Table instance
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId,
    columnResizeMode: "onChange" as ColumnResizeMode,
    manualSorting: true, // Sorting is handled by backend
  });

  const selectedRowIds = Object.keys(rowSelection);

  const handleClearSelection = useCallback(() => {
    setRowSelection({});
  }, []);

  const handleSelectAll = useCallback(() => {
    const allIds = data.reduce((acc, row) => {
      acc[getRowId(row)] = true;
      return acc;
    }, {} as RowSelectionState);
    setRowSelection(allIds);
  }, [data, getRowId]);

  const handleBulkAction = useCallback(
    (actionId: string, ids: string[]) => {
      onBulkAction?.(actionId, ids);
      handleClearSelection();
    },
    [onBulkAction, handleClearSelection],
  );

  const totalPages = Math.ceil(totalRecords / pageSize);

  // Calculate cumulative left offsets for frozen columns
  const getFrozenOffset = (index: number): number => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      const header = table.getHeaderGroups()[0]?.headers[i];
      offset += header?.getSize() || 40;
    }
    return offset;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Bulk actions bar */}
      <BulkActionsBar
        selectedCount={selectedRowIds.length}
        totalCount={data.length}
        actions={bulkActions}
        onClearSelection={handleClearSelection}
        onSelectAll={handleSelectAll}
        onAction={handleBulkAction}
        selectedIds={selectedRowIds}
      />

      {/* Table container with horizontal scroll */}
      <div ref={tableContainerRef} className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          {/* Header */}
          <thead className="sticky top-0 bg-muted z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => {
                  const isFrozen = index <= frozenColumnCount; // +1 for checkbox
                  const leftOffset = isFrozen
                    ? getFrozenOffset(index)
                    : undefined;
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-3 py-2 text-left text-sm font-medium text-muted-foreground border-b bg-muted",
                        isFrozen &&
                          "sticky z-20 bg-muted shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
                        header.column.getCanResize() && "relative",
                      )}
                      style={{
                        width: header.getSize(),
                        left: leftOffset,
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}

                      {/* Resize handle */}
                      {header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={cn(
                            "absolute right-0 top-0 h-full w-1 cursor-col-resize select-none touch-none hover:bg-primary/50",
                            header.column.getIsResizing() && "bg-primary",
                          )}
                        />
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          {/* Body */}
          <tbody>
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j} className="px-3 py-3 border-b">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={columns.length} className="text-center py-12">
                  <p className="text-muted-foreground">{emptyMessage}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your filters or search criteria.
                  </p>
                </td>
              </tr>
            ) : (
              // Data rows
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    "hover:bg-muted/50 cursor-pointer",
                    row.getIsSelected() && "bg-primary/5",
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell, index) => {
                    const isFrozen = index <= frozenColumnCount;
                    const leftOffset = isFrozen
                      ? getFrozenOffset(index)
                      : undefined;
                    return (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-3 py-3 text-sm border-b",
                          isFrozen &&
                            "sticky bg-background z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.1)]",
                        )}
                        style={{
                          width: cell.column.getSize(),
                          left: leftOffset,
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
