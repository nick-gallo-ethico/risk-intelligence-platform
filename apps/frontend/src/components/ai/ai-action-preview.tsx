"use client";

/**
 * AI Action Preview Dialog
 *
 * Confirmation dialog showing what an AI action will change before execution.
 * Displays field-level before/after values with undo window information.
 *
 * Part of the preview-then-execute pattern for AI actions:
 * 1. User triggers action (e.g., "change status to Closed")
 * 2. Frontend calls preview endpoint
 * 3. This dialog shows changes for user confirmation
 * 4. On confirm, frontend calls execute endpoint
 *
 * @see useAiActions for the hook that provides preview/execute functions
 * @see ActionExecutorService (backend) for the preview generation
 */

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Undo2, AlertTriangle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActionPreview, ActionChange } from "@/hooks/useAiActions";

/**
 * Props for the AI action preview dialog.
 */
export interface AiActionPreviewProps {
  /** Action ID being previewed (e.g., "change-status", "add-note") */
  actionId: string;
  /** Preview data from backend */
  preview: ActionPreview;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Whether execution is in progress */
  isLoading: boolean;
  /** Undo window in seconds (0 = not undoable) */
  undoWindowSeconds?: number;
  /** Called when user confirms execution */
  onConfirm: () => void;
  /** Called when user cancels */
  onCancel: () => void;
}

/**
 * Format a value for display.
 * Handles various types including null, undefined, booleans, objects.
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "(empty)";
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Format undo window for display.
 * Converts seconds to human-readable format.
 */
function formatUndoWindow(seconds: number): string {
  if (seconds <= 0) {
    return "Not undoable";
  }
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }
  const hours = Math.floor(seconds / 3600);
  return `${hours} hour${hours !== 1 ? "s" : ""}`;
}

/**
 * Individual change row showing field, old value, and new value.
 */
function ChangeRow({ change }: { change: ActionChange }) {
  return (
    <div className="flex items-center gap-2 text-sm bg-muted rounded p-2">
      <span className="font-medium min-w-24 text-muted-foreground">
        {change.field}:
      </span>
      <span className="text-muted-foreground line-through">
        {formatValue(change.oldValue)}
      </span>
      <ArrowRight className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
      <span className="font-medium text-foreground">
        {formatValue(change.newValue)}
      </span>
    </div>
  );
}

/**
 * AI Action Preview Dialog.
 *
 * Shows what an AI action will change before execution.
 * Provides confirmation/cancel with undo window information.
 *
 * @example
 * ```tsx
 * const { preview, execute, currentPreview, isLoading, clearPreview } = useAiActions();
 *
 * // After calling preview()
 * return (
 *   <AiActionPreview
 *     actionId="change-status"
 *     preview={currentPreview}
 *     isOpen={!!currentPreview}
 *     isLoading={isLoading}
 *     undoWindowSeconds={300}
 *     onConfirm={() => execute('change-status', params)}
 *     onCancel={clearPreview}
 *   />
 * );
 * ```
 */
export function AiActionPreview({
  actionId,
  preview,
  isOpen,
  isLoading,
  undoWindowSeconds = 0,
  onConfirm,
  onCancel,
}: AiActionPreviewProps) {
  // Format action ID for display (e.g., "change-status" -> "Change Status")
  const actionDisplayName = actionId
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            AI Action Preview
            <Badge variant="outline" className="text-xs font-normal">
              {actionDisplayName}
            </Badge>
          </AlertDialogTitle>
          <AlertDialogDescription>{preview.description}</AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 my-4">
          {/* Changes section */}
          {preview.changes.length > 0 && (
            <>
              <p className="text-sm font-medium text-foreground">
                The following changes will be made:
              </p>
              <div className="space-y-2">
                {preview.changes.map((change, index) => (
                  <ChangeRow key={index} change={change} />
                ))}
              </div>
            </>
          )}

          {/* Warnings section */}
          {preview.warnings && preview.warnings.length > 0 && (
            <div className="space-y-1 mt-3">
              {preview.warnings.map((warning, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 text-sm text-amber-600 dark:text-amber-500"
                >
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </div>
              ))}
            </div>
          )}

          {/* Undo window info */}
          <div
            className={cn(
              "flex items-center gap-2 text-xs",
              undoWindowSeconds > 0
                ? "text-muted-foreground"
                : "text-amber-600 dark:text-amber-500",
            )}
          >
            <Undo2 className="h-3 w-3" />
            {undoWindowSeconds > 0 ? (
              <span>
                Undo available for {formatUndoWindow(undoWindowSeconds)}
              </span>
            ) : (
              <span>This action cannot be undone</span>
            )}
          </div>

          {/* Estimated duration if provided */}
          {preview.estimatedDuration && (
            <p className="text-xs text-muted-foreground">
              Estimated time: {preview.estimatedDuration}
            </p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className={cn(
              undoWindowSeconds === 0 &&
                "bg-amber-600 hover:bg-amber-700 text-white",
            )}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              "Execute"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default AiActionPreview;
