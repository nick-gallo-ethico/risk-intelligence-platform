/**
 * AddViewButton Component
 *
 * Plus button that opens a popover with options to:
 * - Create a new view
 * - Search and select an existing view
 */
"use client";

import React, { useState } from "react";
import { Plus, FolderOpen } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSavedViewContext } from "@/hooks/views/useSavedViewContext";
import { CreateViewDialog } from "./CreateViewDialog";

export function AddViewButton() {
  const { views, setActiveView } = useSavedViewContext();
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter views by search
  const filteredViews = views.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectView = (viewId: string) => {
    setActiveView(viewId);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <Plus className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="end">
          <div className="p-2 border-b">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                setOpen(false);
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create new view
            </Button>
          </div>

          <div className="p-2 border-b">
            <Input
              placeholder="Search views..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8"
            />
          </div>

          <ScrollArea className="h-[200px]">
            <div className="p-1">
              {filteredViews.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No views found
                </div>
              ) : (
                filteredViews.map((view) => (
                  <Button
                    key={view.id}
                    variant="ghost"
                    className="w-full justify-start font-normal"
                    onClick={() => handleSelectView(view.id)}
                  >
                    <FolderOpen className="h-4 w-4 mr-2 text-muted-foreground" />
                    {view.name}
                  </Button>
                ))
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <CreateViewDialog open={createOpen} onOpenChange={setCreateOpen} />
    </>
  );
}
