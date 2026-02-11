"use client";

import { useState, useEffect } from "react";
import { Loader2, ListTodo, Calendar, Flag } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/api";

interface CreateTaskModalProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTaskCreated: () => void;
}

type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

interface User {
  id: string;
  name: string;
  email: string;
}

interface CreateTaskFormData {
  title: string;
  description?: string;
  assigneeId?: string;
  dueDate?: string;
  priority: TaskPriority;
}

/**
 * CreateTaskModal - Modal for creating tasks from case context
 *
 * For MVP, this logs task creation as an activity entry with metadata.
 * Full task management integration with My Work requires the Case Task model
 * (planned for Phase 21).
 *
 * The task will appear in the case's activity timeline.
 */
export function CreateTaskModal({
  caseId,
  open,
  onOpenChange,
  onTaskCreated,
}: CreateTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Users for assignee selection
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch users when modal opens
  useEffect(() => {
    if (open) {
      setLoadingUsers(true);
      apiClient
        .get<User[]>("/users")
        .then((data) => {
          setUsers(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          console.error("Failed to fetch users:", err);
          setUsers([]);
        })
        .finally(() => {
          setLoadingUsers(false);
        });
    }
  }, [open]);

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle("");
      setDescription("");
      setAssigneeId("");
      setDueDate("");
      setPriority("MEDIUM");
      setError(null);
    }
  }, [open]);

  const isValid = title.trim().length >= 3;

  const getPriorityLabel = (p: TaskPriority): string => {
    switch (p) {
      case "LOW":
        return "Low";
      case "MEDIUM":
        return "Medium";
      case "HIGH":
        return "High";
      default:
        return p;
    }
  };

  const getAssigneeName = (id: string): string => {
    const user = users.find((u) => u.id === id);
    return user?.name || "Unassigned";
  };

  const handleSubmit = async () => {
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);

    const priorityLabel = getPriorityLabel(priority);
    const assigneeName = assigneeId ? getAssigneeName(assigneeId) : null;
    const dueDateFormatted = dueDate
      ? new Date(dueDate).toLocaleDateString()
      : null;

    let actionDescription = `Created task: ${title.trim()} (${priorityLabel} priority)`;
    if (assigneeName) {
      actionDescription += ` - Assigned to ${assigneeName}`;
    }
    if (dueDateFormatted) {
      actionDescription += ` - Due ${dueDateFormatted}`;
    }

    try {
      // Log the task creation as an activity entry
      await apiClient.post(`/cases/${caseId}/activity`, {
        action: "task_created",
        description: `Task: ${title.trim()}`,
        actionDescription: actionDescription,
        metadata: {
          title: title.trim(),
          description: description.trim() || undefined,
          assigneeId: assigneeId || undefined,
          assigneeName: assigneeName || undefined,
          dueDate: dueDate || undefined,
          priority,
        },
      });

      onTaskCreated();
      onOpenChange(false);
    } catch (err) {
      console.error("Failed to create task:", err);
      // Fallback: try via tasks endpoint if it exists
      try {
        await apiClient.post(`/cases/${caseId}/tasks`, {
          title: title.trim(),
          description: description.trim() || undefined,
          assigneeId: assigneeId || undefined,
          dueDate: dueDate || undefined,
          priority,
        });
        onTaskCreated();
        onOpenChange(false);
      } catch (fallbackErr) {
        console.error("Fallback also failed:", fallbackErr);
        setError("Failed to create task. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Create Task
          </DialogTitle>
          <DialogDescription>
            Create a task related to this case. The task will be recorded in the
            case activity timeline.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Task Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Enter task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
            {title.length > 0 && title.trim().length < 3 && (
              <p className="text-xs text-gray-500">
                Title must be at least 3 characters
              </p>
            )}
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what needs to be done..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* Assignee */}
          <div className="grid gap-2">
            <Label htmlFor="assignee">Assignee</Label>
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger id="assignee">
                <SelectValue
                  placeholder={loadingUsers ? "Loading..." : "Select assignee"}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Due Date */}
          <div className="grid gap-2">
            <Label htmlFor="dueDate" className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Due Date
            </Label>
            <Input
              id="dueDate"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* Priority */}
          <div className="grid gap-2">
            <Label htmlFor="priority" className="flex items-center gap-1">
              <Flag className="h-3.5 w-3.5" />
              Priority
            </Label>
            <Select
              value={priority}
              onValueChange={(value) => setPriority(value as TaskPriority)}
            >
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOW">Low</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
