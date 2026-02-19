"use client";

import { Clock, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/**
 * Single highlight item configuration.
 */
export interface DataHighlight {
  label: string;
  value: string | number | null;
  type?: "badge" | "text" | "sla" | "user";
  /** Color for badge types (hex or tailwind color) */
  color?: string;
  icon?: React.ReactNode;
  /** User avatar URL for user type */
  avatarUrl?: string;
}

interface DataHighlightsCardProps {
  highlights: DataHighlight[];
  className?: string;
}

/**
 * Color mapping for badge types (severity, status).
 */
const BADGE_COLOR_MAP: Record<string, string> = {
  // Severity
  LOW: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  MEDIUM:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  HIGH: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  // Status
  NEW: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  OPEN: "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
  CLOSED: "bg-muted text-muted-foreground border-border",
  // SLA Status
  ON_TRACK:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
  WARNING:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  BREACHED:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  CRITICAL:
    "bg-red-200 text-red-900 border-red-300 dark:bg-red-900/50 dark:text-red-200 dark:border-red-700",
};

/**
 * SLA status icon color mapping.
 */
const SLA_ICON_COLOR_MAP: Record<string, string> = {
  ON_TRACK: "text-green-500 dark:text-green-400",
  WARNING: "text-yellow-500 dark:text-yellow-400",
  BREACHED: "text-red-500 dark:text-red-400",
  CRITICAL: "text-red-600 dark:text-red-400",
};

/**
 * DataHighlightsCard - Displays 4-6 key values in a 3-column grid at the top of Overview tab.
 *
 * Each cell shows:
 * - Label: small muted text above
 * - Value: large bold text below, with optional Badge/color treatment
 *
 * Supported types:
 * - badge: Colored badge (severity, status)
 * - text: Plain text value
 * - sla: SLA status with color-coded urgency
 * - user: Avatar + name
 *
 * @example
 * ```tsx
 * const highlights: DataHighlight[] = [
 *   { label: "Severity", value: "HIGH", type: "badge" },
 *   { label: "Status", value: "OPEN", type: "badge" },
 *   { label: "Case Age", value: "5 days", type: "text" },
 *   { label: "SLA Status", value: "ON_TRACK", type: "sla" },
 *   { label: "Assigned To", value: "John Smith", type: "user", avatarUrl: "..." },
 *   { label: "Source", value: "Hotline", type: "text" },
 * ];
 *
 * <DataHighlightsCard highlights={highlights} />
 * ```
 */
export function DataHighlightsCard({
  highlights,
  className,
}: DataHighlightsCardProps) {
  if (!highlights || highlights.length === 0) {
    return null;
  }

  return (
    <Card className={cn("border shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">
          Data Highlights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {highlights.map((highlight, index) => (
            <HighlightCell key={`${highlight.label}-${index}`} {...highlight} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Individual highlight cell renderer.
 */
function HighlightCell({
  label,
  value,
  type = "text",
  color,
  icon,
  avatarUrl,
}: DataHighlight) {
  const renderValue = () => {
    if (value === null || value === undefined || value === "") {
      return (
        <span className="text-muted-foreground text-sm italic">Not set</span>
      );
    }

    switch (type) {
      case "badge": {
        const colorClass =
          BADGE_COLOR_MAP[String(value).toUpperCase()] ||
          "bg-muted text-muted-foreground border-border";
        return (
          <Badge variant="outline" className={cn("font-medium", colorClass)}>
            {String(value).replace(/_/g, " ")}
          </Badge>
        );
      }

      case "sla": {
        const slaKey = String(value).toUpperCase();
        const colorClass =
          BADGE_COLOR_MAP[slaKey] ||
          "bg-muted text-muted-foreground border-border";
        const iconColor = SLA_ICON_COLOR_MAP[slaKey] || "text-muted-foreground";
        return (
          <div className="flex items-center gap-1.5">
            <Clock className={cn("w-4 h-4", iconColor)} />
            <Badge variant="outline" className={cn("font-medium", colorClass)}>
              {String(value).replace(/_/g, " ")}
            </Badge>
          </div>
        );
      }

      case "user": {
        const initials = String(value)
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={avatarUrl} alt={String(value)} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground truncate">
              {String(value)}
            </span>
          </div>
        );
      }

      case "text":
      default:
        return (
          <div className="flex items-center gap-1.5">
            {icon && <span className="text-muted-foreground">{icon}</span>}
            <span className="text-sm font-semibold text-foreground">
              {String(value)}
            </span>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      {renderValue()}
    </div>
  );
}

export default DataHighlightsCard;
