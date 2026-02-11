/**
 * ReportKpi Component
 *
 * Displays a single key metric with optional change indicator.
 * Used for KPI visualization type in reports.
 */
"use client";

import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReportKpiProps {
  /** The main KPI value */
  value: number;
  /** Label describing the metric */
  label: string;
  /** Optional previous value for change calculation */
  previousValue?: number;
  /** Value format type */
  format?: "number" | "percent" | "currency";
  /** Optional custom class name */
  className?: string;
}

/**
 * Format a number based on the format type
 */
function formatValue(
  value: number,
  format: "number" | "percent" | "currency",
): string {
  switch (format) {
    case "percent":
      return new Intl.NumberFormat("en-US", {
        style: "percent",
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value / 100);
    case "currency":
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case "number":
    default:
      // Use compact notation for large numbers
      if (Math.abs(value) >= 1000000) {
        return new Intl.NumberFormat("en-US", {
          notation: "compact",
          compactDisplay: "short",
          maximumFractionDigits: 1,
        }).format(value);
      }
      return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
      }).format(value);
  }
}

/**
 * Calculate and format the change percentage
 */
function getChangeInfo(
  current: number,
  previous: number | undefined,
): {
  changePercent: number | null;
  changeDirection: "up" | "down" | "none";
  isPositiveChange: boolean;
} {
  if (previous === undefined || previous === 0) {
    return {
      changePercent: null,
      changeDirection: "none",
      isPositiveChange: false,
    };
  }

  const change = ((current - previous) / previous) * 100;
  const changeDirection: "up" | "down" | "none" =
    change > 0 ? "up" : change < 0 ? "down" : "none";

  // By default, assume higher is better
  const isPositiveChange = change > 0;

  return {
    changePercent: Math.abs(change),
    changeDirection,
    isPositiveChange,
  };
}

/**
 * ReportKpi Component
 *
 * Displays a single KPI metric with large number, label, and optional change indicator.
 */
export function ReportKpi({
  value,
  label,
  previousValue,
  format = "number",
  className,
}: ReportKpiProps) {
  const formattedValue = formatValue(value, format);
  const { changePercent, changeDirection, isPositiveChange } = getChangeInfo(
    value,
    previousValue,
  );

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="pt-6">
        <div className="flex flex-col items-center text-center space-y-2">
          {/* Main value - large and prominent */}
          <span className="text-5xl font-bold tracking-tight text-foreground">
            {formattedValue}
          </span>

          {/* Label */}
          <span className="text-sm font-medium text-muted-foreground">
            {label}
          </span>

          {/* Change indicator */}
          {changePercent !== null && (
            <div
              className={cn(
                "flex items-center gap-1 text-sm font-medium mt-2 px-2 py-1 rounded-md",
                changeDirection === "none"
                  ? "text-muted-foreground bg-muted/50"
                  : isPositiveChange
                    ? "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30"
                    : "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30",
              )}
            >
              {changeDirection === "up" && <ArrowUpRight className="h-4 w-4" />}
              {changeDirection === "down" && (
                <ArrowDownRight className="h-4 w-4" />
              )}
              {changeDirection === "none" && <Minus className="h-4 w-4" />}
              <span>
                {changeDirection === "none"
                  ? "No change"
                  : `${changePercent.toFixed(1)}%`}
              </span>
            </div>
          )}

          {/* Previous value context */}
          {previousValue !== undefined && (
            <span className="text-xs text-muted-foreground mt-1">
              Previous: {formatValue(previousValue, format)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ReportKpi;
