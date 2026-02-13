"use client";

import {
  StickyNote,
  Mic,
  FileText,
  CheckSquare,
  Mail,
  Phone,
} from "lucide-react";
import {
  QuickActionGrid,
  type QuickAction,
} from "@/components/shared/quick-action-grid";

export type ActionType =
  | "note"
  | "call"
  | "interview"
  | "document"
  | "task"
  | "email";

interface ActionButtonRowProps {
  caseId: string;
  onAction: (action: ActionType) => void;
  className?: string;
}

/**
 * Quick action buttons for the case detail left column.
 * Uses HubSpot-style horizontal icon+label grid.
 */
export function ActionButtonRow({
  caseId,
  onAction,
  className,
}: ActionButtonRowProps) {
  const actions: QuickAction[] = [
    {
      id: "note",
      label: "Note",
      icon: StickyNote,
      onClick: () => onAction("note"),
    },
    {
      id: "email",
      label: "Email",
      icon: Mail,
      onClick: () => onAction("email"),
    },
    { id: "call", label: "Call", icon: Phone, onClick: () => onAction("call") },
    {
      id: "interview",
      label: "Interview",
      icon: Mic,
      onClick: () => onAction("interview"),
    },
    {
      id: "document",
      label: "Document",
      icon: FileText,
      onClick: () => onAction("document"),
    },
    {
      id: "task",
      label: "Task",
      icon: CheckSquare,
      onClick: () => onAction("task"),
    },
  ];

  return (
    <QuickActionGrid actions={actions} columns={4} className={className} />
  );
}
