/**
 * ReportChart Component
 *
 * Renders recharts visualizations based on visualization type and data.
 * Supports bar, line, pie, stacked_bar, and funnel chart types.
 */
"use client";

import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import type { ReportGroupedItem } from "@/types/reports";

// Color palette for charts
const CHART_COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#6366f1", // indigo-500
  "#ec4899", // pink-500
  "#f97316", // orange-500
];

interface ReportChartProps {
  /** Visualization type */
  visualization: string;
  /** Grouped data items for chart */
  groupedData: ReportGroupedItem[];
  /** Optional chart configuration */
  chartConfig?: Record<string, unknown>;
  /** Optional chart title */
  title?: string;
}

/**
 * Get color for a given index
 */
function getColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

/**
 * Format number for display in charts
 */
function formatValue(value: number | undefined | null): string {
  if (value === undefined || value === null) return "0";
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

/**
 * Tooltip content style
 */
const tooltipStyle = {
  backgroundColor: "hsl(var(--background))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
};

/**
 * Render a bar chart
 */
function BarChartVisualization({
  data,
}: {
  data: ReportGroupedItem[];
  chartConfig?: Record<string, unknown>;
}) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatValue(v)}
          className="text-muted-foreground"
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [formatValue(value as number), "Value"]}
        />
        <Legend />
        <Bar dataKey="value" name="Value" radius={[4, 4, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={getColor(index)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Render a line chart
 */
function LineChartVisualization({
  data,
}: {
  data: ReportGroupedItem[];
  chartConfig?: Record<string, unknown>;
}) {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={data}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatValue(v)}
          className="text-muted-foreground"
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [formatValue(value as number), "Value"]}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          name="Value"
          stroke={CHART_COLORS[0]}
          strokeWidth={2}
          dot={{ fill: CHART_COLORS[0], strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Render a pie chart
 */
function PieChartVisualization({
  data,
}: {
  data: ReportGroupedItem[];
  chartConfig?: Record<string, unknown>;
}) {
  // Calculate total for percentage labels
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Custom label renderer for pie chart
  const renderLabel = (entry: {
    name?: string;
    value?: number;
    label?: string;
  }) => {
    const label = entry.label || entry.name || "";
    const value = entry.value || 0;
    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
    return `${label}: ${percent}%`;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={true}
          label={renderLabel}
          outerRadius={140}
          fill="#8884d8"
          dataKey="value"
          nameKey="label"
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={getColor(index)} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value, _name, props) => {
            const numValue = value as number;
            const percent =
              total > 0 ? ((numValue / total) * 100).toFixed(1) : "0";
            const label =
              (props?.payload as { label?: string })?.label || "Value";
            return [`${formatValue(numValue)} (${percent}%)`, label];
          }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 * Render a stacked bar chart
 * Falls back to regular bar chart if no sub-categories available
 */
function StackedBarChartVisualization({
  data,
}: {
  data: ReportGroupedItem[];
  chartConfig?: Record<string, unknown>;
}) {
  // Check if data has sub-categories in metadata
  const hasSubCategories = data.some(
    (item) => item.metadata && Object.keys(item.metadata).length > 0,
  );

  // If no sub-categories, render as regular bar chart
  if (!hasSubCategories) {
    return <BarChartVisualization data={data} />;
  }

  // Extract unique sub-category keys from metadata
  const subCategoryKeys = new Set<string>();
  data.forEach((item) => {
    if (item.metadata) {
      Object.keys(item.metadata).forEach((key) => {
        if (typeof item.metadata![key] === "number") {
          subCategoryKeys.add(key);
        }
      });
    }
  });

  const subCategories = Array.from(subCategoryKeys);

  // Transform data for stacked bar chart
  const stackedData = data.map((item) => ({
    label: item.label,
    ...item.metadata,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={stackedData}
        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          className="text-muted-foreground"
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => formatValue(v)}
          className="text-muted-foreground"
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => formatValue(value as number)}
        />
        <Legend />
        {subCategories.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            name={key}
            stackId="stack"
            fill={getColor(index)}
            radius={
              index === subCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]
            }
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Render a funnel chart
 * Data is sorted by value descending
 */
function FunnelChartVisualization({
  data,
}: {
  data: ReportGroupedItem[];
  chartConfig?: Record<string, unknown>;
}) {
  // Sort by value descending for funnel visualization
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  // Transform data with colors
  const funnelData = sortedData.map((item, index) => ({
    ...item,
    name: item.label,
    fill: getColor(index),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <FunnelChart margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value) => [formatValue(value as number), "Value"]}
        />
        <Funnel dataKey="value" data={funnelData} isAnimationActive>
          <LabelList
            position="right"
            fill="hsl(var(--foreground))"
            stroke="none"
            dataKey="label"
            className="text-sm"
          />
          <LabelList
            position="center"
            fill="#fff"
            stroke="none"
            dataKey="value"
            formatter={(v: unknown) => formatValue(v as number)}
            className="text-sm font-medium"
          />
        </Funnel>
        <Legend />
      </FunnelChart>
    </ResponsiveContainer>
  );
}

/**
 * Empty state when no data is available
 */
function EmptyChart() {
  return (
    <div className="flex items-center justify-center h-[400px] border rounded-lg bg-muted/20">
      <p className="text-muted-foreground">
        No data available for visualization
      </p>
    </div>
  );
}

/**
 * ReportChart Component
 *
 * Main component that renders the appropriate chart type based on visualization prop.
 */
export function ReportChart({
  visualization,
  groupedData,
  chartConfig,
  title,
}: ReportChartProps) {
  // Handle empty data
  if (!groupedData || groupedData.length === 0) {
    return <EmptyChart />;
  }

  // Render title if provided
  const titleElement = title ? (
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
  ) : null;

  // Select chart type based on visualization
  let chart: React.ReactNode;

  switch (visualization) {
    case "bar":
      chart = (
        <BarChartVisualization data={groupedData} chartConfig={chartConfig} />
      );
      break;
    case "line":
      chart = (
        <LineChartVisualization data={groupedData} chartConfig={chartConfig} />
      );
      break;
    case "pie":
      chart = (
        <PieChartVisualization data={groupedData} chartConfig={chartConfig} />
      );
      break;
    case "stacked_bar":
      chart = (
        <StackedBarChartVisualization
          data={groupedData}
          chartConfig={chartConfig}
        />
      );
      break;
    case "funnel":
      chart = (
        <FunnelChartVisualization
          data={groupedData}
          chartConfig={chartConfig}
        />
      );
      break;
    default:
      // For unsupported types, default to bar chart
      chart = (
        <BarChartVisualization data={groupedData} chartConfig={chartConfig} />
      );
  }

  return (
    <div className="w-full">
      {titleElement}
      {chart}
    </div>
  );
}

export default ReportChart;
