import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  IsInt,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";
import { ViewEntityType } from "@prisma/client";

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

  @IsObject()
  filters: FilterCriteria;

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

  @IsObject()
  @IsOptional()
  filters?: FilterCriteria;

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
}
