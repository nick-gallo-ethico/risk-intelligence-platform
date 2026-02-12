"use client";

/**
 * AddTaskRow Component
 *
 * A row at the bottom of each group for quickly creating new tasks.
 * Shows a muted "+ Add task" button that transforms into an input field.
 * Supports rapid task entry (input clears after creation).
 */

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateTask } from "@/hooks/use-project-detail";

interface AddTaskRowProps {
  projectId: string;
  groupId: string | undefined;
  onTaskCreated: () => void;
}

/**
 * AddTaskRow - inline task creation row.
 */
export function AddTaskRow({
  projectId,
  groupId,
  onTaskCreated,
}: AddTaskRowProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const createTask = useCreateTask(projectId);

  // Focus input when entering add mode
  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  // Handle starting add mode
  const handleStartAdding = useCallback(() => {
    setIsAdding(true);
    setTitle("");
  }, []);

  // Handle creating the task
  const handleCreate = useCallback(async () => {
    if (!title.trim()) {
      setIsAdding(false);
      return;
    }

    await createTask.mutateAsync({
      title: title.trim(),
      groupId: groupId,
      status: "NOT_STARTED",
      priority: "MEDIUM",
    });

    // Clear for rapid entry
    setTitle("");
    onTaskCreated();

    // Keep focus for rapid entry
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [title, groupId, createTask, onTaskCreated]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setIsAdding(false);
    setTitle("");
  }, []);

  // Handle key down
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCreate();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleCreate, handleCancel],
  );

  // Handle blur - create if has content, cancel if empty
  const handleBlur = useCallback(() => {
    if (title.trim()) {
      handleCreate();
    } else {
      handleCancel();
    }
  }, [title, handleCreate, handleCancel]);

  if (!isAdding) {
    return (
      <button
        onClick={handleStartAdding}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-gray-50 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add task
      </button>
    );
  }

  return (
    <div className="grid grid-cols-[40px_1fr_120px_100px_140px_120px_80px] gap-2 items-center px-4 py-2 bg-blue-50/50 border-b">
      {/* Spacer for checkbox column */}
      <div className="flex items-center justify-center">
        {createTask.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        ) : (
          <Plus className="h-4 w-4 text-primary" />
        )}
      </div>

      {/* Title input */}
      <div className="col-span-6">
        <Input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Enter task title..."
          className="h-8 text-sm border-primary/50 focus-visible:ring-primary"
          disabled={createTask.isPending}
        />
      </div>
    </div>
  );
}
