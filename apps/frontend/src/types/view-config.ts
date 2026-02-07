/**
 * Module View Configuration Types
 *
 * Each module (Cases, Investigations, etc.) defines its available columns,
 * filters, and bulk actions through a configuration object passed to
 * the shared view components.
 */
import type { ViewEntityType } from "@/lib/views/types";
import type { ReactNode } from "react";

// Column data types
export type ColumnType =
  | "text"
  | "number"
  | "date"
  | "datetime"
  | "boolean"
  | "enum"
  | "status"
  | "severity"
  | "user"
  | "users"
  | "link"
  | "currency";

// Cell context for custom cell renderers
export interface CellContext<TData = unknown> {
  row: TData;
  value: unknown;
  columnId: string;
}

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
  cell?: (context: CellContext) => ReactNode; // Custom cell renderer
  filterOptions?: { value: string; label: string }[]; // For enum/status types
}

// Default view configuration
export interface DefaultViewConfig {
  name: string;
  description?: string;
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  isSystem?: boolean; // System views cannot be deleted
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
}

// API endpoints for a module
export interface ModuleEndpoints {
  list: string;
  export: string;
  bulk: string;
}

// Complete module view configuration
export interface ModuleViewConfig {
  moduleType: ViewEntityType;
  displayName: string;
  displayNamePlural: string;
  columns: ColumnDefinition[];
  quickFilterProperties: string[];
  defaultViews: DefaultViewConfig[];
  bulkActions: BulkActionConfig[];
  boardConfig?: BoardConfig;
  endpoints: ModuleEndpoints;
}
