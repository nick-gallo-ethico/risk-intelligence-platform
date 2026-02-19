"use client";

import { cn } from "@/lib/utils";
import { getStatusColor, statusColors } from "@/lib/theme-colors";
import type { CaseStatus } from "@/types/case";

const STATUS_LABELS: Record<CaseStatus, string> = {
  NEW: "New",
  OPEN: "Open",
  CLOSED: "Closed",
};

interface StatusBadgeProps {
  status: CaseStatus;
  className?: string;
}

/**
 * Status badge component for case status display.
 * Uses centralized theme-colors utility for dark mode support.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        getStatusColor(status),
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

// Re-export statusColors for backward compatibility
export { statusColors as STATUS_COLORS, STATUS_LABELS };
