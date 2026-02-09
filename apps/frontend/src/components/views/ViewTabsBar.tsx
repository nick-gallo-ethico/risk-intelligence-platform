/**
 * ViewTabsBar Component
 *
 * Horizontal row of draggable view tabs using dnd-kit.
 * Primary navigation for switching between saved views.
 * Includes module name indicator on the left (HubSpot style).
 */
"use client";

import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { SortableViewTab } from "./SortableViewTab";
import { AddViewButton } from "./AddViewButton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export function ViewTabsBar() {
  const { config, views, activeViewId, hasUnsavedChanges, setActiveView, reorderTabs } =
    useSavedViewContext();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = views.findIndex((v) => v.id === active.id);
      const newIndex = views.findIndex((v) => v.id === over.id);
      const newOrder = arrayMove(
        views.map((v) => v.id),
        oldIndex,
        newIndex
      );
      await reorderTabs(newOrder);
    }
  };

  // Sort views by displayOrder
  const sortedViews = [...views].sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="border-b bg-muted/40">
      {/* Top padding to separate from nav bar */}
      <div className="pt-2 px-4">
        <div className="flex items-end gap-3">
          {/* Module name indicator - HubSpot style */}
          <div className="flex-shrink-0 mb-1 h-9 px-3 bg-primary text-primary-foreground rounded-md font-medium flex items-center">
            {config.entityName.plural}
          </div>

          <ScrollArea className="flex-1">
            <div className="flex items-end gap-1">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToHorizontalAxis]}
              >
                <SortableContext
                  items={sortedViews.map((v) => v.id)}
                  strategy={horizontalListSortingStrategy}
                >
                  {sortedViews.map((view) => (
                    <SortableViewTab
                      key={view.id}
                      view={view}
                      isActive={view.id === activeViewId}
                      hasUnsavedChanges={
                        view.id === activeViewId && hasUnsavedChanges
                      }
                      onSelect={() => setActiveView(view.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <div className="flex-shrink-0 ml-2 mb-1">
            <AddViewButton />
          </div>
        </div>
      </div>
    </div>
  );
}
