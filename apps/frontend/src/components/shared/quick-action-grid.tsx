"use client";

import { LucideIcon, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  /** If true, action appears in "More" overflow menu instead of grid */
  overflow?: boolean;
}

interface QuickActionGridProps {
  actions: QuickAction[];
  /** Max visible actions before overflow into "More" menu (default: show all) */
  maxVisible?: number;
  className?: string;
}

/**
 * HubSpot-style horizontal icon+label grid for quick actions.
 *
 * Displays main actions as icon buttons with labels beneath,
 * and overflow actions in a "More" dropdown.
 */
export function QuickActionGrid({
  actions,
  maxVisible,
  className,
}: QuickActionGridProps) {
  // Split into visible vs overflow: explicitly marked overflow first, then excess past maxVisible
  const nonOverflow = actions.filter((a) => !a.overflow);
  const explicitOverflow = actions.filter((a) => a.overflow);

  const limit = maxVisible ?? nonOverflow.length;
  const mainActions = nonOverflow.slice(0, limit);
  const overflowActions = [...nonOverflow.slice(limit), ...explicitOverflow];

  return (
    <div className={cn("p-4", className)}>
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
        Quick Actions
      </h3>
      <div className="flex gap-2">
        {mainActions.map((action) => (
          <Button
            key={action.id}
            variant="outline"
            className="flex-1 min-w-0 flex flex-col items-center justify-center h-16 p-2 gap-1 hover:bg-gray-50"
            onClick={action.onClick}
          >
            <action.icon className="h-5 w-5 text-gray-600" />
            <span className="text-xs text-gray-700 font-medium truncate">
              {action.label}
            </span>
          </Button>
        ))}

        {/* More dropdown for overflow actions */}
        {overflowActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="flex-1 min-w-0 flex flex-col items-center justify-center h-16 p-2 gap-1 hover:bg-gray-50"
              >
                <MoreHorizontal className="h-5 w-5 text-gray-600" />
                <span className="text-xs text-gray-700 font-medium">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {overflowActions.map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  onClick={action.onClick}
                  className="flex items-center gap-2"
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
