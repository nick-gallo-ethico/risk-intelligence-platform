/**
 * Module View Configuration Types
 *
 * Each module (Cases, Investigations, etc.) defines its available columns,
 * filters, and bulk actions through a configuration object passed to
 * the shared view components.
 */
import type { ViewEntityType, PropertyType, FilterGroup } from "@/lib/views/types";
import type { CellContext } from "@tanstack/react-table";
import type { ReactNode } from "react";

// Column data types (extends PropertyType with additional display types)
export type ColumnType =
  | PropertyType
  | "datetime"
  | "users"
  | "link"
  | "currency";

// Column definition for a module
export interface ColumnDefinition {
  id: string;
  header: string;
  accessorKey: string; // Property path (e.g., 'status', 'createdBy.name')
  group: string; // Group name for organization in column picker
  type: ColumnType;
  sortable?: boolean;
  filterable?: boolean;
  defaultVisible?: boolean;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  enableResizing?: boolean; // Can resize column (default: true)
  cell?: (props: CellContext<unknown, unknown>) => ReactNode; // Custom cell renderer
  filterOptions?: { value: string; label: string }[]; // For enum/status types
}

// Default view configuration
export interface DefaultViewConfig {
  name: string;
  description?: string;
  filters?: FilterGroup[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  columns?: string[]; // Column IDs to show
  isSystem: boolean; // System views cannot be deleted
}

// Bulk action configuration
export interface BulkActionConfig {
  id: string;
  label: string;
  icon?: string;
  destructive?: boolean;
  requiresConfirmation?: boolean;
  confirmationMessage?: string;
}

// Board view configuration
export interface BoardConfig {
  groupByOptions: { propertyId: string; label: string }[];
  defaultGroupBy: string;
  cardFields?: string[]; // Fields to show on board cards
}

// Quick filter property
export interface QuickFilterProperty {
  propertyId: string;
  label: string;
  type: ColumnType;
  options?: { value: string; label: string }[]; // For enum types
}

// API endpoints for a module
export interface ModuleEndpoints {
  list: string;
  export: string;
  bulk: string;
  single: (id: string) => string; // GET endpoint for single item
}

// Complete module view configuration
export interface ModuleViewConfig {
  moduleType: ViewEntityType;
  columns: ColumnDefinition[];
  quickFilterProperties: QuickFilterProperty[];
  defaultViews: DefaultViewConfig[];
  bulkActions: BulkActionConfig[];
  boardConfig?: BoardConfig;
  primaryColumnId: string; // First column, cannot be hidden
  endpoints: ModuleEndpoints;
  entityName: {
    singular: string;
    plural: string;
  };
}

// Helper to create a column definition with defaults
export function createColumn(
  id: string,
  header: string,
  accessorKey: string,
  group: string,
  type: ColumnType,
  options?: Partial<ColumnDefinition>,
): ColumnDefinition {
  return {
    id,
    header,
    accessorKey,
    group,
    type,
    sortable: false,
    filterable: false,
    defaultVisible: false,
    enableResizing: true,
    ...options,
  };
}
