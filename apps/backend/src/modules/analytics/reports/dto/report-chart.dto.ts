import { IsString, IsOptional, IsBoolean, IsObject } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { ReportAggregationFunction } from "../entities/saved-report.entity";

/**
 * Aggregation configuration for a report column.
 */
export class ReportAggregationConfigDto {
  @ApiPropertyOptional({
    description: "Field to aggregate",
    example: "id",
  })
  @IsString()
  field: string;

  @ApiPropertyOptional({
    description: "Aggregation function",
    enum: ["count", "sum", "avg", "min", "max"],
    example: "count",
  })
  @IsString()
  function: ReportAggregationFunction;

  @ApiPropertyOptional({
    description: "Alias for result column",
    example: "total_cases",
  })
  @IsOptional()
  @IsString()
  alias?: string;
}

/**
 * Configuration for chart visualizations.
 */
export class ReportChartConfigDto {
  @ApiPropertyOptional({
    description: "X-axis field for bar/line charts",
    example: "createdAt",
  })
  @IsOptional()
  @IsString()
  xAxisField?: string;

  @ApiPropertyOptional({
    description: "Y-axis field for bar/line charts",
    example: "count",
  })
  @IsOptional()
  @IsString()
  yAxisField?: string;

  @ApiPropertyOptional({
    description: "Series field for multiple lines/bars",
    example: "status",
  })
  @IsOptional()
  @IsString()
  seriesField?: string;

  @ApiPropertyOptional({
    description: "Custom colors by value",
    example: { NEW: "#4CAF50", CLOSED: "#9E9E9E" },
  })
  @IsOptional()
  @IsObject()
  colors?: Record<string, string>;

  @ApiPropertyOptional({
    description: "Show data labels on chart",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showDataLabels?: boolean;

  @ApiPropertyOptional({
    description: "Show legend",
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  showLegend?: boolean;

  @ApiPropertyOptional({
    description: "Stack bars for stacked_bar visualization",
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  stacked?: boolean;

  @ApiPropertyOptional({
    description: "Comparison period for KPI visualization",
    enum: ["previous_period", "same_period_last_year"],
    example: "previous_period",
  })
  @IsOptional()
  @IsString()
  comparisonPeriod?: "previous_period" | "same_period_last_year";

  @ApiPropertyOptional({
    description: "Funnel conversion metric",
    example: "status",
  })
  @IsOptional()
  @IsString()
  funnelMetric?: string;
}
