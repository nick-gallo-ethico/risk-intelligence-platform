"use client";

import React, { useState } from "react";
import {
  X,
  Trash2,
  Download,
  UserPlus,
  Tag,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { BulkAction } from "@/lib/views/types";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  actions: BulkAction[];
  onClearSelection: () => void;
  onSelectAll: () => void;
  onAction: (actionId: string, selectedIds: string[]) => void | Promise<void>;
  selectedIds: string[];
  entityName?: { singular: string; plural: string };
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  assign: <UserPlus className="h-4 w-4 mr-2" />,
  status: <CheckCircle className="h-4 w-4 mr-2" />,
  category: <Tag className="h-4 w-4 mr-2" />,
  export: <Download className="h-4 w-4 mr-2" />,
  delete: <Trash2 className="h-4 w-4 mr-2" />,
};

export function BulkActionsBar({
  selectedCount,
  totalCount,
  actions,
  onClearSelection,
  onSelectAll,
  onAction,
  selectedIds,
  entityName = { singular: "record", plural: "records" },
}: BulkActionsBarProps) {
  const [confirmAction, setConfirmAction] = useState<{
    actionId: string;
    label: string;
    destructive?: boolean;
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  if (selectedCount === 0) return null;

  const allSelected = selectedCount === totalCount;
  const entityLabel =
    selectedCount === 1 ? entityName.singular : entityName.plural;

  const handleAction = async (
    actionId: string,
    destructive?: boolean,
    label?: string,
  ) => {
    if (destructive) {
      // Show confirmation dialog for destructive actions
      setConfirmAction({
        actionId,
        label: label || "this action",
        destructive: true,
      });
      return;
    }

    setIsProcessing(true);
    try {
      await onAction(actionId, selectedIds);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmedAction = async () => {
    if (!confirmAction) return;

    setIsProcessing(true);
    try {
      await onAction(confirmAction.actionId, selectedIds);
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-2 bg-primary text-primary-foreground animate-in slide-in-from-top-2">
        {/* Selection info */}
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className="bg-primary-foreground text-primary font-semibold"
          >
            {selectedCount.toLocaleString()}
          </Badge>
          <span className="text-sm font-medium">{entityLabel} selected</span>
        </div>

        {/* Select all link */}
        {!allSelected && totalCount > selectedCount && (
          <Button
            variant="link"
            size="sm"
            className="text-primary-foreground underline p-0 h-auto"
            onClick={onSelectAll}
          >
            Select all {totalCount.toLocaleString()}
          </Button>
        )}

        <div className="h-4 w-px bg-primary-foreground/30" />

        {/* Bulk action buttons */}
        {actions.map((action) => {
          if (action.children && action.children.length > 0) {
            // Dropdown for actions with sub-options
            return (
              <DropdownMenu key={action.id}>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="sm" disabled={isProcessing}>
                    {ACTION_ICONS[action.id] || null}
                    {action.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {action.children.map((child) => (
                    <DropdownMenuItem
                      key={child.id}
                      onClick={() =>
                        handleAction(child.id, child.destructive, child.label)
                      }
                    >
                      {child.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          return (
            <Button
              key={action.id}
              variant={action.destructive ? "destructive" : "secondary"}
              size="sm"
              disabled={isProcessing}
              onClick={() =>
                handleAction(action.id, action.destructive, action.label)
              }
            >
              {ACTION_ICONS[action.id] || null}
              {action.label}
            </Button>
          );
        })}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Processing indicator */}
        {isProcessing && (
          <span className="text-sm animate-pulse">Processing...</span>
        )}

        {/* Clear selection */}
        <Button
          variant="ghost"
          size="sm"
          className="text-primary-foreground hover:text-primary-foreground hover:bg-primary-foreground/20"
          onClick={onClearSelection}
          disabled={isProcessing}
        >
          <X className="h-4 w-4 mr-1" />
          Clear
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Confirm {confirmAction?.label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {confirmAction?.label?.toLowerCase()}{" "}
              {selectedCount.toLocaleString()} {entityLabel}. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmedAction}
              disabled={isProcessing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isProcessing ? "Processing..." : `Yes, ${confirmAction?.label}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
