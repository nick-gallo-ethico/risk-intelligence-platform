"use client";

import {
  UserPlus,
  RefreshCw,
  GitMerge,
  Heart,
  List,
  History,
  Download,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toaster";

interface ActionsDropdownProps {
  /** Handler for Assign action */
  onAssign: () => void;
  /** Handler for Change Status action */
  onChangeStatus: () => void;
  /** Handler for Merge action */
  onMerge: () => void;
  /** Handler for Follow/Unfollow action */
  onFollow: () => void;
  /** Handler for View All Properties action */
  onViewProperties: () => void;
  /** Handler for View Property History action */
  onViewHistory: () => void;
  /** Handler for Export action */
  onExport: () => void;
  /** Handler for Delete action */
  onDelete: () => void;
  /** Whether the user is currently following this record */
  isFollowing?: boolean;
  /** Whether the user has admin privileges (controls Delete visibility) */
  isAdmin?: boolean;
}

/**
 * ActionsDropdown - Dropdown menu with 8 record actions.
 *
 * Actions:
 * 1. Assign - Opens Assign Modal
 * 2. Change Status - Opens Status Change Modal
 * 3. Merge - Opens Merge Modal
 * 4. Follow/Unfollow - Subscribe to notifications
 * 5. View All Properties - Opens full property view
 * 6. View Property History - Shows historical changes
 * 7. Export Case - Downloads PDF/Excel summary
 * 8. Delete - Soft-deletes the case (admin only)
 *
 * Per spec Section 14.2.
 */
export function ActionsDropdown({
  onAssign,
  onChangeStatus,
  onMerge,
  onFollow,
  onViewProperties,
  onViewHistory,
  onExport,
  onDelete,
  isFollowing = false,
  isAdmin = false,
}: ActionsDropdownProps) {
  const handleFollowClick = () => {
    // For now, show coming soon toast since Follow isn't wired yet
    toast.info("Coming soon");
    onFollow();
  };

  const handleViewPropertiesClick = () => {
    toast.info("Coming soon");
    onViewProperties();
  };

  const handleViewHistoryClick = () => {
    toast.info("Coming soon");
    onViewHistory();
  };

  const handleExportClick = () => {
    toast.info("Coming soon");
    onExport();
  };

  return (
    <div className="px-4 pb-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between gap-2 font-medium"
          >
            Actions
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {/* Primary actions */}
          <DropdownMenuItem onClick={onAssign}>
            <UserPlus className="mr-2 h-4 w-4" />
            Assign
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onChangeStatus}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Change Status
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMerge}>
            <GitMerge className="mr-2 h-4 w-4" />
            Merge
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleFollowClick}>
            <Heart
              className={`mr-2 h-4 w-4 ${isFollowing ? "fill-red-500 text-red-500" : ""}`}
            />
            {isFollowing ? "Unfollow" : "Follow"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Property views */}
          <DropdownMenuItem onClick={handleViewPropertiesClick}>
            <List className="mr-2 h-4 w-4" />
            View All Properties
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleViewHistoryClick}>
            <History className="mr-2 h-4 w-4" />
            View Property History
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Export and Delete */}
          <DropdownMenuItem onClick={handleExportClick}>
            <Download className="mr-2 h-4 w-4" />
            Export Case
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-600 focus:text-red-600 focus:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
