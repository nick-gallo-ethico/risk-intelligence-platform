"use client";

import { useState, ReactNode } from "react";
import {
  LucideIcon,
  Plus,
  Settings2,
  ChevronRight,
  Search,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import Link from "next/link";

export interface AssociationCardProps {
  /** Title for the card header (e.g., "Connected People") */
  title: string;
  /** Count of associated items */
  count: number;
  /** Icon to display in header */
  icon: LucideIcon;
  /** Handler for + Add button (omit to hide button) */
  onAdd?: () => void;
  /** Handler for gear icon (omit to hide icon) */
  onSettings?: () => void;
  /** URL for "View all associated X" link */
  viewAllHref?: string;
  /** Label for "View all" link (e.g., "View all associated People") */
  viewAllLabel?: string;
  /** Show search input when count exceeds this threshold */
  searchThreshold?: number;
  /** Placeholder for search input */
  searchPlaceholder?: string;
  /** Current search query (controlled) */
  searchQuery?: string;
  /** Handler for search query changes */
  onSearchChange?: (query: string) => void;
  /** Card content */
  children: ReactNode;
  /** Additional class names */
  className?: string;
  /** If true, card is collapsible (default true) */
  collapsible?: boolean;
  /** Initial collapsed state (default false) */
  defaultCollapsed?: boolean;
}

/**
 * HubSpot-style association card wrapper for right sidebar.
 *
 * Provides consistent header with:
 * - Icon + Title + Count badge
 * - + Add button (optional)
 * - Gear settings icon (optional)
 * - Search input for large lists
 * - "View all" link footer
 * - Collapsible content
 */
export function AssociationCard({
  title,
  count,
  icon: Icon,
  onAdd,
  onSettings,
  viewAllHref,
  viewAllLabel,
  searchThreshold = 5,
  searchPlaceholder = "Search...",
  searchQuery,
  onSearchChange,
  children,
  className,
  collapsible = true,
  defaultCollapsed = false,
}: AssociationCardProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const showSearch = count > searchThreshold && onSearchChange;

  return (
    <Card className={cn("shadow-sm", className)}>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          {/* Left: Icon + Title + Count */}
          <button
            onClick={() => collapsible && setCollapsed(!collapsed)}
            className={cn(
              "flex items-center gap-2",
              collapsible && "cursor-pointer hover:opacity-80",
            )}
            disabled={!collapsible}
          >
            {collapsible && (
              <ChevronRight
                className={cn(
                  "h-4 w-4 text-gray-500 transition-transform duration-200",
                  !collapsed && "rotate-90",
                )}
              />
            )}
            <Icon className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-semibold text-gray-900">{title}</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {count}
            </Badge>
          </button>

          {/* Right: Add + Settings */}
          <div className="flex items-center gap-1">
            {onAdd && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onAdd}
              >
                <Plus className="h-4 w-4" />
                <span className="sr-only">Add</span>
              </Button>
            )}
            {onSettings && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={onSettings}
              >
                <Settings2 className="h-4 w-4 text-gray-400" />
                <span className="sr-only">Settings</span>
              </Button>
            )}
          </div>
        </div>

        {/* Search input */}
        {showSearch && !collapsed && (
          <div className="mt-2 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
        )}
      </CardHeader>

      {!collapsed && (
        <>
          <CardContent className="py-2 px-4">{children}</CardContent>

          {viewAllHref && viewAllLabel && (
            <CardFooter className="py-2 px-4 border-t">
              <Link
                href={viewAllHref}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
              >
                {viewAllLabel}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </CardFooter>
          )}
        </>
      )}
    </Card>
  );
}
