"use client";

import { StickyNote, Mic, FileText, CheckSquare, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ActionType = "note" | "interview" | "document" | "task" | "email";

interface ActionButtonRowProps {
  caseId: string;
  onAction: (action: ActionType) => void;
  className?: string;
}

/**
 * Action button definition
 */
interface ActionButton {
  id: ActionType;
  label: string;
  icon: typeof StickyNote;
}

const ACTIONS: ActionButton[] = [
  { id: "note", label: "Add Note", icon: StickyNote },
  { id: "interview", label: "Log Interview", icon: Mic },
  { id: "document", label: "Attach Document", icon: FileText },
  { id: "task", label: "Create Task", icon: CheckSquare },
  { id: "email", label: "Log Email", icon: Mail },
];

/**
 * Quick action buttons for the case detail left column.
 *
 * Renders a vertical stack of action buttons styled like a sidebar menu.
 * Each button triggers the onAction callback with the action type.
 */
export function ActionButtonRow({
  caseId,
  onAction,
  className,
}: ActionButtonRowProps) {
  return (
    <div className={cn("p-4", className)}>
      {/* Section Header */}
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        Quick Actions
      </h3>

      {/* Action Buttons */}
      <div className="space-y-1">
        {ACTIONS.map((action) => (
          <Button
            key={action.id}
            variant="ghost"
            className="w-full justify-start h-9 px-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            onClick={() => onAction(action.id)}
          >
            <action.icon className="w-4 h-4 mr-2 text-gray-500" />
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
