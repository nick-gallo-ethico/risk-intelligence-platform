"use client";

import { useState, useCallback } from "react";
import {
  Pin,
  MessageSquare,
  Pencil,
  Link2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/date-utils";
import { getActivityIconConfig } from "@/lib/activity-icons";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import type { Activity } from "@/types/activity";

/** Maximum character length before truncating with expand/collapse */
const TRUNCATE_LENGTH = 200;

interface ActivityEntryProps {
  activity: Activity;
  isLast?: boolean;
  /** Show upcoming style (amber accent for future items) */
  isUpcoming?: boolean;
  /** Show pinned style (highlighted background) */
  isPinned?: boolean;
  /** Callback when pin button is clicked */
  onPin?: (activityId: string) => void;
  /** Callback when unpin button is clicked */
  onUnpin?: (activityId: string) => void;
  /** Callback when delete button is clicked */
  onDelete?: (activityId: string) => void;
  /** Whether current user can edit this activity */
  canEdit?: boolean;
  /** Whether current user can delete this activity */
  canDelete?: boolean;
}

export function ActivityEntry({
  activity,
  isLast = false,
  isUpcoming = false,
  isPinned = false,
  onPin,
  onUnpin,
  onDelete,
  canEdit = false,
  canDelete = false,
}: ActivityEntryProps) {
  const { icon: Icon, color, bgColor } = getActivityIconConfig(activity.action);
  const [isExpanded, setIsExpanded] = useState(false);

  const actorDisplay = activity.actorName || "System";
  const description = activity.actionDescription || "";
  const shouldTruncate = description.length > TRUNCATE_LENGTH;
  const displayDescription =
    shouldTruncate && !isExpanded
      ? description.slice(0, TRUNCATE_LENGTH) + "..."
      : description;

  const handleCopyLink = useCallback(() => {
    // Create a shareable link to this activity
    const activityUrl = `${window.location.origin}${window.location.pathname}?activity=${activity.id}`;
    navigator.clipboard.writeText(activityUrl);
    toast.success("Link copied to clipboard");
  }, [activity.id]);

  const handleComment = useCallback(() => {
    // Placeholder for comment functionality
    toast.info("Comments coming soon");
  }, []);

  const handleEdit = useCallback(() => {
    // Placeholder for edit functionality
    toast.info("Edit coming soon");
  }, []);

  const handlePinToggle = useCallback(() => {
    if (isPinned && onUnpin) {
      onUnpin(activity.id);
    } else if (!isPinned && onPin) {
      onPin(activity.id);
    }
  }, [activity.id, isPinned, onPin, onUnpin]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(activity.id);
    }
  }, [activity.id, onDelete]);

  return (
    <div
      className={cn(
        "group flex gap-3 relative",
        isUpcoming && "bg-amber-50 -mx-2 px-2 py-1 rounded-lg",
        isPinned && !isUpcoming && "bg-blue-50/50 -mx-2 px-2 py-1 rounded-lg",
      )}
      data-testid="activity-entry"
      data-activity-id={activity.id}
    >
      {/* Timeline indicator */}
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full",
            isUpcoming ? "bg-amber-100" : isPinned ? "bg-blue-100" : bgColor,
          )}
        >
          <Icon
            className={cn(
              "w-4 h-4",
              isUpcoming
                ? "text-amber-600"
                : isPinned
                  ? "text-blue-600"
                  : color,
            )}
            aria-hidden="true"
          />
        </div>
        {!isLast && (
          <div
            className={cn(
              "flex-1 w-px my-2",
              isUpcoming
                ? "bg-amber-200"
                : isPinned
                  ? "bg-blue-200"
                  : "bg-gray-200",
            )}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className="text-sm text-gray-900"
              data-testid="activity-description"
            >
              {displayDescription}
            </p>

            {/* Expand/collapse toggle for long content */}
            {shouldTruncate && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs text-blue-600 hover:text-blue-700 mt-1 flex items-center gap-0.5"
              >
                {isExpanded ? (
                  <>
                    Show less <ChevronUp className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    Show full <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}

            <p className="text-xs text-gray-500 mt-0.5">
              by <span className="font-medium">{actorDisplay}</span>
            </p>
          </div>

          {/* Timestamp and hover actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Hover action bar - only visible on hover */}
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Pin/Unpin */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7",
                        isPinned && "text-blue-600 bg-blue-50",
                      )}
                      onClick={handlePinToggle}
                    >
                      <Pin
                        className={cn(
                          "h-3.5 w-3.5",
                          isPinned && "fill-current",
                        )}
                      />
                      <span className="sr-only">
                        {isPinned ? "Unpin" : "Pin"}
                      </span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {isPinned ? "Unpin" : "Pin"}
                  </TooltipContent>
                </Tooltip>

                {/* Comment */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleComment}
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span className="sr-only">Comment</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Comment</TooltipContent>
                </Tooltip>

                {/* Edit (only for creator/admin) */}
                {canEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={handleEdit}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Edit</TooltipContent>
                  </Tooltip>
                )}

                {/* Copy link */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleCopyLink}
                    >
                      <Link2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Copy link</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Copy link</TooltipContent>
                </Tooltip>

                {/* Delete (only for creator/admin) */}
                {canDelete && (
                  <AlertDialog>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </AlertDialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="top">Delete</TooltipContent>
                    </Tooltip>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete activity?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete this activity entry.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </TooltipProvider>

            {/* Timestamp */}
            <time
              className={cn(
                "text-xs whitespace-nowrap ml-1",
                isUpcoming ? "text-amber-600 font-medium" : "text-gray-400",
              )}
              dateTime={activity.createdAt}
              title={new Date(activity.createdAt).toLocaleString()}
              data-testid="activity-timestamp"
            >
              {formatRelativeTime(activity.createdAt)}
            </time>
          </div>
        </div>

        {/* Show changes if available */}
        {activity.changes && Object.keys(activity.changes).length > 0 && (
          <div className="mt-2 text-xs bg-gray-50 rounded-md p-2 border">
            <ActivityChangesDisplay changes={activity.changes} />
          </div>
        )}
      </div>
    </div>
  );
}

interface ActivityChangesDisplayProps {
  changes: Record<string, { old: unknown; new: unknown }>;
}

function ActivityChangesDisplay({ changes }: ActivityChangesDisplayProps) {
  const entries = Object.entries(changes).filter(
    ([key]) => key !== "fields_changed",
  );

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1">
      {entries.map(([field, { old: oldValue, new: newValue }]) => (
        <div key={field} className="flex items-center gap-2">
          <span className="text-gray-500 capitalize">
            {formatFieldName(field)}:
          </span>
          <span className="text-gray-400 line-through">
            {formatValue(oldValue)}
          </span>
          <span className="text-gray-400">-&gt;</span>
          <span className="text-gray-700 font-medium">
            {formatValue(newValue)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatFieldName(field: string): string {
  return field
    .replace(/_/g, " ")
    .replace(/([A-Z])/g, " $1")
    .toLowerCase()
    .trim();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "none";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
