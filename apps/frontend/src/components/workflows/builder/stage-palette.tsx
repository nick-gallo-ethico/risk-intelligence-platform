/**
 * Stage Palette Component
 *
 * Left sidebar with draggable stage presets that can be
 * dropped onto the workflow canvas.
 */

import type { DragEvent } from "react";
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  Bell,
  GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StagePreset, StageDragData } from "./use-workflow-builder";

// ============================================================================
// Types
// ============================================================================

interface PaletteItem {
  preset: StagePreset;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

// ============================================================================
// Preset Definitions
// ============================================================================

const PALETTE_ITEMS: PaletteItem[] = [
  {
    preset: "standard",
    label: "Standard Stage",
    description: "Basic workflow stage",
    icon: <GitBranch className="w-4 h-4" />,
    color: "#3b82f6", // blue-500
  },
  {
    preset: "approval",
    label: "Approval Gate",
    description: "Requires approval to proceed",
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: "#f59e0b", // amber-500
  },
  {
    preset: "terminal",
    label: "Terminal Stage",
    description: "End of workflow",
    icon: <XCircle className="w-4 h-4" />,
    color: "#ef4444", // red-500
  },
  {
    preset: "notification",
    label: "Notification Stage",
    description: "Sends notification on entry",
    icon: <Bell className="w-4 h-4" />,
    color: "#22c55e", // green-500
  },
];

// ============================================================================
// Palette Item Component
// ============================================================================

interface PaletteItemProps {
  item: PaletteItem;
}

function PaletteItemComponent({ item }: PaletteItemProps) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    const dragData: StageDragData = { preset: item.preset };
    e.dataTransfer.setData("application/json", JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border border-border",
        "bg-card cursor-grab transition-all",
        "hover:border-border/80 hover:shadow-sm",
        "active:cursor-grabbing active:scale-[0.98]",
      )}
    >
      {/* Drag handle */}
      <GripVertical className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />

      {/* Color indicator + icon */}
      <div
        className="flex items-center justify-center w-8 h-8 rounded"
        style={{ backgroundColor: `${item.color}20` }}
      >
        <div style={{ color: item.color }}>{item.icon}</div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground truncate">
          {item.label}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {item.description}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Stage Palette Component
// ============================================================================

export function StagePalette() {
  return (
    <div className="flex flex-col h-full bg-muted/50 border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm text-foreground">Stages</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Drag stages onto the canvas
        </p>
      </div>

      {/* Palette items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {PALETTE_ITEMS.map((item) => (
          <PaletteItemComponent key={item.preset} item={item} />
        ))}
      </div>

      {/* Instructions */}
      <div className="p-3 border-t border-border bg-card">
        <p className="text-xs text-muted-foreground text-center">
          Connect stages by dragging from handles
        </p>
      </div>
    </div>
  );
}
