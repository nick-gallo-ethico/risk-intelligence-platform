"use client";

import {
  StickyNote,
  Mic,
  FileText,
  CheckSquare,
  ClipboardList,
} from "lucide-react";
import {
  QuickActionGrid,
  type QuickAction,
} from "@/components/shared/quick-action-grid";

export type InvestigationActionType =
  | "note"
  | "interview"
  | "evidence"
  | "task"
  | "checklist";

interface InvestigationActionButtonsProps {
  investigationId: string;
  onAction: (action: InvestigationActionType) => void;
  className?: string;
}

/**
 * Quick action buttons for investigation operations.
 *
 * Uses the shared QuickActionGrid component with investigation-specific actions:
 * - Note: Add investigation note
 * - Interview: Schedule or log interview
 * - Evidence: Attach evidence/documents
 * - Task: Create a related task
 * - Checklist: Jump to checklist tab
 */
export function InvestigationActionButtons({
  investigationId,
  onAction,
  className,
}: InvestigationActionButtonsProps) {
  const actions: QuickAction[] = [
    {
      id: "note",
      label: "Note",
      icon: StickyNote,
      onClick: () => onAction("note"),
    },
    {
      id: "interview",
      label: "Interview",
      icon: Mic,
      onClick: () => onAction("interview"),
    },
    {
      id: "evidence",
      label: "Evidence",
      icon: FileText,
      onClick: () => onAction("evidence"),
    },
    {
      id: "task",
      label: "Task",
      icon: CheckSquare,
      onClick: () => onAction("task"),
    },
    {
      id: "checklist",
      label: "Checklist",
      icon: ClipboardList,
      onClick: () => onAction("checklist"),
    },
  ];

  return (
    <QuickActionGrid actions={actions} columns={3} className={className} />
  );
}
