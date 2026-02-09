import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsInt,
  IsObject,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";
import { ViewEntityType } from "@prisma/client";

/**
 * A single filter condition within a filter group.
 * Represents a single property comparison (e.g., "status is_any_of open,in_progress").
 */
export interface FilterCondition {
  id: string;
  propertyId: string;
  operator: string; // 'is', 'is_not', 'contains', 'is_any_of', 'is_between', 'is_empty', etc.
  value?: unknown;
  secondaryValue?: unknown; // For 'is_between' operator
  unit?: "day" | "week" | "month"; // For relative date operators like 'in_last'
}

/**
 * A group of filter conditions that are AND-joined.
 * Multiple groups are OR-joined with each other.
 */
export interface FilterGroup {
  id: string;
  conditions: FilterCondition[]; // AND-joined within group
}

/**
 * Filter structure varies by entity type, but has common patterns.
 * Stored as JSON in the database for flexibility.
 */
export interface FilterCriteria {
  // Common filters
  status?: string | string[];
  dateRange?: {
    field: string;
    from?: string;
    to?: string;
  };
  search?: string;

  // Case-specific
  categoryId?: string;
  severity?: string | string[];
  assignedTo?: string;
  pipelineStage?: string;

  // RIU-specific
  sourceChannel?: string | string[];
  reporterType?: string;

  // Investigation-specific
  investigationType?: string;
  slaStatus?: string;

  // Custom fields
  customFields?: Record<string, unknown>;

  // Advanced - allows complex nested conditions
  and?: FilterCriteria[];
  or?: FilterCriteria[];

  // HubSpot-style filter groups (OR-joined groups of AND-joined conditions)
  groups?: FilterGroup[];
}

/**
 * Column configuration for saved views.
 * Controls which columns are visible and their order.
 */
export interface ColumnConfig {
  key: string;
  visible: boolean;
  order: number;
  width?: number;
}

/**
 * DTO for creating a new saved view.
 */
export class CreateSavedViewDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ViewEntityType)
  entityType: ViewEntityType;

  // Allow both object (FilterCriteria) and array (FilterGroup[]) formats
  @IsOptional()
  filters?: FilterCriteria | FilterGroup[];

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: string;

  @IsOptional()
  columns?: ColumnConfig[];

  @IsBoolean()
  @IsOptional()
  isShared?: boolean;

  @IsUUID()
  @IsOptional()
  sharedWithTeamId?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @Min(0)
  @Max(3)
  @IsOptional()
  frozenColumnCount?: number;

  @IsString()
  @IsIn(["table", "board"])
  @IsOptional()
  viewMode?: string;

  @IsString()
  @IsOptional()
  boardGroupBy?: string;
}

/**
 * DTO for updating an existing saved view.
 * All fields are optional since partial updates are allowed.
 */
export class UpdateSavedViewDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  // Allow both object (FilterCriteria) and array (FilterGroup[]) formats
  @IsOptional()
  filters?: FilterCriteria | FilterGroup[];

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: string;

  @IsOptional()
  columns?: ColumnConfig[];

  @IsBoolean()
  @IsOptional()
  isShared?: boolean;

  @IsUUID()
  @IsOptional()
  sharedWithTeamId?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsInt()
  @IsOptional()
  displayOrder?: number;

  @IsString()
  @IsOptional()
  color?: string;

  @IsInt()
  @Min(0)
  @Max(3)
  @IsOptional()
  frozenColumnCount?: number;

  @IsString()
  @IsIn(["table", "board"])
  @IsOptional()
  viewMode?: string;

  @IsString()
  @IsOptional()
  boardGroupBy?: string;
}

/**
 * DTO for cloning a saved view.
 * Optionally provide a new name for the cloned view.
 */
export class CloneSavedViewDto {
  @IsString()
  @IsOptional()
  newName?: string;
}

/**
 * DTO for reordering multiple saved views at once.
 * Updates displayOrder for each view in a single transaction.
 */
export class ReorderSavedViewsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ViewOrderItem)
  viewOrders: ViewOrderItem[];
}

/**
 * Individual view order item for reordering.
 */
export class ViewOrderItem {
  @IsUUID()
  id: string;

  @IsInt()
  @Min(0)
  displayOrder: number;
}

/**
 * DTO for querying saved views.
 * Supports filtering by entity type and shared status.
 */
export class SavedViewQueryDto {
  @IsEnum(ViewEntityType)
  @IsOptional()
  entityType?: ViewEntityType;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeShared?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  pinnedOnly?: boolean;
}

/**
 * Response DTO when applying a view.
 * Includes validated filters and any invalidated filter keys.
 */
export class ApplyViewResponseDto {
  filters: FilterCriteria;
  sortBy?: string;
  sortOrder?: string;
  columns?: ColumnConfig[];
  invalidFilters: string[]; // Filter keys that couldn't be validated

  // HubSpot-style view enhancements
  frozenColumnCount?: number;
  viewMode?: string; // 'table' | 'board'
  boardGroupBy?: string;
  recordCount?: number | null;
  recordCountAt?: Date | null;
}
