"use client";

import { cn } from "@/lib/utils";
import type { Severity } from "@/types/case";

// Severity colors and labels match backend Prisma enum
const SEVERITY_COLORS: Record<Severity, string> = {
  LOW: "bg-green-100 text-green-800 border-green-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-orange-100 text-orange-800 border-orange-200",
};

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
 * Uses consistent color coding across the application.
 */
export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        SEVERITY_COLORS[severity],
        className,
      )}
    >
      {SEVERITY_LABELS[severity]}
    </span>
  );
}

export { SEVERITY_COLORS, SEVERITY_LABELS };
