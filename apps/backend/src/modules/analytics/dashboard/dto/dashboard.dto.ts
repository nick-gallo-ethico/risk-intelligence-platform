import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  IsObject,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import {
  DashboardType,
  WidgetType,
  ChartType,
  DateRangePreset,
} from "@prisma/client";
import {
  LayoutItem,
  ResponsiveLayouts,
  WidgetQueryConfig,
  WidgetDisplayConfig,
  DateRangeOverride,
} from "../entities/dashboard-config.entity";

/**
 * DTO for creating a widget within a dashboard.
 */
export class CreateWidgetDto {
  @IsEnum(WidgetType)
  widgetType: WidgetType;

  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  dataSource?: string;

  @IsObject()
  @IsOptional()
  queryConfig?: WidgetQueryConfig;

  @IsObject()
  layoutItem: LayoutItem;

  @IsEnum(ChartType)
  @IsOptional()
  chartType?: ChartType;

  @IsObject()
  @IsOptional()
  displayConfig?: WidgetDisplayConfig;

  @IsBoolean()
  @IsOptional()
  useDashboardDateRange?: boolean;

  @IsObject()
  @IsOptional()
  dateRangeOverride?: DateRangeOverride;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(60)
  refreshInterval?: number;
}

/**
 * DTO for updating an existing widget.
 */
export class UpdateWidgetDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  dataSource?: string;

  @IsObject()
  @IsOptional()
  queryConfig?: WidgetQueryConfig;

  @IsObject()
  @IsOptional()
  layoutItem?: LayoutItem;

  @IsEnum(ChartType)
  @IsOptional()
  chartType?: ChartType;

  @IsObject()
  @IsOptional()
  displayConfig?: WidgetDisplayConfig;

  @IsBoolean()
  @IsOptional()
  useDashboardDateRange?: boolean;

  @IsObject()
  @IsOptional()
  dateRangeOverride?: DateRangeOverride;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(60)
  refreshInterval?: number;
}

/**
 * DTO for creating a new dashboard.
 */
export class CreateDashboardDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(DashboardType)
  dashboardType: DashboardType;

  @IsObject()
  layouts: ResponsiveLayouts;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateWidgetDto)
  @IsOptional()
  widgets?: CreateWidgetDto[];
}

/**
 * DTO for updating an existing dashboard.
 */
export class UpdateDashboardDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  layouts?: ResponsiveLayouts;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;
}

/**
 * DTO for dashboard layout update (react-grid-layout format).
 */
export class DashboardLayoutDto {
  @IsObject()
  layouts: ResponsiveLayouts;
}

/**
 * DTO for date range configuration.
 */
export class DateRangeDto {
  @IsEnum(DateRangePreset)
  @IsOptional()
  preset?: DateRangePreset;

  @IsString()
  @IsOptional()
  start?: string;

  @IsString()
  @IsOptional()
  end?: string;
}

/**
 * DTO for user dashboard configuration.
 */
export class UserDashboardConfigDto {
  @IsBoolean()
  @IsOptional()
  isHome?: boolean;

  @IsObject()
  @IsOptional()
  layoutOverrides?: ResponsiveLayouts;

  @IsObject()
  @IsOptional()
  widgetOverrides?: Record<string, Partial<UpdateWidgetDto>>;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(30)
  refreshInterval?: number;

  @IsEnum(DateRangePreset)
  @IsOptional()
  dateRangePreset?: DateRangePreset;
}

/**
 * DTO for querying dashboards.
 */
export class DashboardQueryDto {
  @IsEnum(DashboardType)
  @IsOptional()
  dashboardType?: DashboardType;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  includeSystem?: boolean;

  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  defaultsOnly?: boolean;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  offset?: number;
}

/**
 * Response DTO for dashboard with widgets.
 */
export class DashboardResponseDto {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  dashboardType: DashboardType;
  isSystem: boolean;
  isDefault: boolean;
  layouts: ResponsiveLayouts;
  widgets: WidgetResponseDto[];
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
}

/**
 * Response DTO for widget.
 */
export class WidgetResponseDto {
  id: string;
  widgetType: WidgetType;
  title: string;
  dataSource?: string;
  queryConfig?: WidgetQueryConfig;
  layoutItem: LayoutItem;
  chartType?: ChartType;
  displayConfig?: WidgetDisplayConfig;
  useDashboardDateRange: boolean;
  dateRangeOverride?: DateRangeOverride;
  refreshInterval?: number;
}

/**
 * Response DTO for user dashboard configuration.
 */
export class UserDashboardConfigResponseDto {
  id: string;
  dashboardId: string;
  isHome: boolean;
  layoutOverrides?: ResponsiveLayouts;
  widgetOverrides?: Record<string, Partial<UpdateWidgetDto>>;
  refreshInterval: number;
  dateRangePreset: DateRangePreset;
}
