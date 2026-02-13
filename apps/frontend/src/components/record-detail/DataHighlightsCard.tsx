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
  LOW: "bg-green-100 text-green-800 border-green-200",
  MEDIUM: "bg-yellow-100 text-yellow-800 border-yellow-200",
  HIGH: "bg-red-100 text-red-800 border-red-200",
  // Status
  NEW: "bg-blue-100 text-blue-800 border-blue-200",
  OPEN: "bg-purple-100 text-purple-800 border-purple-200",
  CLOSED: "bg-gray-100 text-gray-800 border-gray-200",
  // SLA Status
  ON_TRACK: "bg-green-100 text-green-800 border-green-200",
  WARNING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  BREACHED: "bg-red-100 text-red-800 border-red-200",
  CRITICAL: "bg-red-200 text-red-900 border-red-300",
};

/**
 * SLA status icon color mapping.
 */
const SLA_ICON_COLOR_MAP: Record<string, string> = {
  ON_TRACK: "text-green-500",
  WARNING: "text-yellow-500",
  BREACHED: "text-red-500",
  CRITICAL: "text-red-600",
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
        <CardTitle className="text-sm font-semibold text-gray-700">
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
      return <span className="text-gray-400 text-sm italic">Not set</span>;
    }

    switch (type) {
      case "badge": {
        const colorClass =
          BADGE_COLOR_MAP[String(value).toUpperCase()] ||
          "bg-gray-100 text-gray-700 border-gray-200";
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
          "bg-gray-100 text-gray-700 border-gray-200";
        const iconColor = SLA_ICON_COLOR_MAP[slaKey] || "text-gray-500";
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
            <span className="text-sm font-medium text-gray-900 truncate">
              {String(value)}
            </span>
          </div>
        );
      }

      case "text":
      default:
        return (
          <div className="flex items-center gap-1.5">
            {icon && <span className="text-gray-400">{icon}</span>}
            <span className="text-sm font-semibold text-gray-900">
              {String(value)}
            </span>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      {renderValue()}
    </div>
  );
}

export default DataHighlightsCard;
