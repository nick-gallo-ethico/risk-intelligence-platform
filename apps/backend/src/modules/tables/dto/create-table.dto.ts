import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  IsObject,
  ValidateNested,
  MaxLength,
  ArrayMinSize,
  IsNumber,
} from "class-validator";
import { Type } from "class-transformer";
import {
  TableColumn,
  TableFilterCriteria,
  TableAggregateDefinition,
  TableSortDefinition,
  TableDestination,
  TableScheduleConfig,
  TableDataSource,
  TableCreationMethodType,
  TableVisibilityType,
} from "../types/table.types";

/**
 * DTO for creating a user data table.
 */
export class CreateTableDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsIn(["BUILDER", "AI_GENERATED", "IMPORT"])
  createdVia?: TableCreationMethodType;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  aiPrompt?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  dataSources: TableDataSource[];

  @IsArray()
  @ArrayMinSize(1)
  @IsObject({ each: true })
  columns: TableColumn[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  filters?: TableFilterCriteria[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupBy?: string[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  aggregates?: TableAggregateDefinition[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  sortBy?: TableSortDefinition[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  destinations?: TableDestination[];

  @IsOptional()
  @IsIn(["PRIVATE", "TEAM", "ORG"])
  visibility?: TableVisibilityType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sharedWithTeams?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sharedWithUsers?: string[];

  @IsOptional()
  @IsObject()
  scheduleConfig?: TableScheduleConfig;
}

/**
 * DTO for updating a user data table.
 */
export class UpdateTableDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dataSources?: TableDataSource[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  columns?: TableColumn[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  filters?: TableFilterCriteria[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupBy?: string[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  aggregates?: TableAggregateDefinition[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  sortBy?: TableSortDefinition[];

  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  destinations?: TableDestination[];
}

/**
 * DTO for scheduling table delivery.
 */
export class ScheduleTableDto {
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  config: TableScheduleConfig;
}

/**
 * DTO for sharing a table.
 */
export class ShareTableDto {
  @IsIn(["PRIVATE", "TEAM", "ORG"])
  visibility: TableVisibilityType;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  teamIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userIds?: string[];
}

/**
 * DTO for cloning a table.
 */
export class CloneTableDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

/**
 * DTO for exporting table data.
 */
export class ExportTableDto {
  @IsIn(["csv", "excel", "pdf"])
  format: "csv" | "excel" | "pdf";

  @IsOptional()
  @IsString()
  @MaxLength(255)
  filename?: string;
}

/**
 * Query parameters for listing tables.
 */
export class TableQueryDto {
  @IsOptional()
  @IsIn(["PRIVATE", "TEAM", "ORG"])
  visibility?: TableVisibilityType;

  @IsOptional()
  @IsIn(["BUILDER", "AI_GENERATED", "IMPORT"])
  createdVia?: TableCreationMethodType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;

  @IsOptional()
  @IsString()
  pinnedToType?: "dashboard" | "view" | "report";

  @IsOptional()
  @IsString()
  pinnedToId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}
