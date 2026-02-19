"use client";

import { cn } from "@/lib/utils";
import { getSeverityColor, severityColors } from "@/lib/theme-colors";
import type { Severity } from "@/types/case";

const SEVERITY_LABELS: Record<Severity, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

interface SeverityBadgeProps {
  severity: Severity;
  className?: string;
}

/**
 * Severity badge component for case severity display.
 * Uses centralized theme-colors utility for dark mode support.
 */
export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        getSeverityColor(severity),
        className,
      )}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

// Re-export severityColors for backward compatibility
export { severityColors as SEVERITY_COLORS, SEVERITY_LABELS };
