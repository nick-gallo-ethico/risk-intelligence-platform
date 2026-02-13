"use client";

/**
 * TaskDetailPanel Component
 *
 * A slide-out panel from the right with full task details in 4 tabs:
 * - Details: Title, description, status, priority, assignee, dates, subscribers, dependencies
 * - Updates: Threaded conversation with @mentions
 * - Activity: Chronological log of all changes
 * - Files: File attachments with upload/download
 *
 * This is Monday.com's #1 differentiator - the conversation thread inside each task
 * transforms tasks from static work items into collaborative workspaces.
 */

import React, { useState, useCallback, useEffect } from "react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Calendar as CalendarIcon,
  Trash2,
  ArrowDown,
  Minus,
  ArrowUp,
  ChevronsUp,
  X,
  Loader2,
  MoreHorizontal,
  Eye,
  Link2,
  Copy,
  FolderInput,
  MessageSquare,
  Activity,
  Paperclip,
  FileText,
  Hash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useUpdateTask,
  useDeleteTask,
  useTaskFiles,
} from "@/hooks/use-project-detail";
import { apiClient } from "@/lib/api";
import type {
  ProjectTask,
  ProjectGroup,
  ProjectTaskStatus,
  ProjectTaskPriority,
} from "@/types/project";

// Import tab components
import { TaskUpdateThread } from "./TaskUpdateThread";
import { TaskActivityLog } from "./TaskActivityLog";
import { TaskFileList } from "./TaskFileList";
import { TaskSubscriberList } from "./TaskSubscriberList";
import { TaskDependencyList } from "./TaskDependencyList";

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * Status display configuration.
 */
const STATUS_CONFIG: Record<
  ProjectTaskStatus,
  { bg: string; text: string; label: string }
> = {
  NOT_STARTED: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: "Not Started",
  },
  IN_PROGRESS: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    label: "In Progress",
  },
  STUCK: { bg: "bg-red-100", text: "text-red-700", label: "Stuck" },
  DONE: { bg: "bg-green-100", text: "text-green-700", label: "Done" },
  CANCELLED: { bg: "bg-gray-100", text: "text-gray-400", label: "Cancelled" },
};

/**
 * Priority display configuration.
 */
const PRIORITY_CONFIG: Record<
  ProjectTaskPriority,
  { icon: React.ElementType; color: string; label: string }
> = {
  LOW: { icon: ArrowDown, color: "text-gray-500", label: "Low" },
  MEDIUM: { icon: Minus, color: "text-yellow-600", label: "Medium" },
  HIGH: { icon: ArrowUp, color: "text-orange-500", label: "High" },
  CRITICAL: { icon: ChevronsUp, color: "text-red-600", label: "Critical" },
};

interface TaskDetailPanelProps {
  task: ProjectTask | null;
  projectId: string;
  groups: ProjectGroup[];
  onClose: () => void;
  onUpdate: () => void;
  currentUserId?: string;
}

/**
 * TaskDetailPanel - full task detail view in a slide-out sheet with 4 tabs.
 */
export function TaskDetailPanel({
  task,
  projectId,
  groups,
  onClose,
  onUpdate,
  currentUserId,
}: TaskDetailPanelProps) {
  const [activeTab, setActiveTab] = useState("details");
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [startDateOpen, setStartDateOpen] = useState(false);
  const [dueDateOpen, setDueDateOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const updateTask = useUpdateTask(projectId);
  const deleteTask = useDeleteTask(projectId);

  // Get file count for badge
  const { data: files } = useTaskFiles(projectId, task?.id);
  const fileCount = files?.length || 0;

  // Sync local state with task prop
  useEffect(() => {
    if (task) {
      setEditedTitle(task.title);
      setEditedDescription(task.description ?? "");
    }
  }, [task]);

  // Reset tab when task changes
  useEffect(() => {
    if (task) {
      setActiveTab("details");
    }
  }, [task?.id]);

  // Fetch users when assignee popover opens
  useEffect(() => {
    if (assigneeOpen) {
      apiClient
        .get<User[]>("/users")
        .then((data) => setUsers(Array.isArray(data) ? data : []))
        .catch(() => setUsers([]));
    }
  }, [assigneeOpen]);

  // Handle title save on blur
  const handleTitleBlur = useCallback(async () => {
    if (!task) return;
    if (editedTitle.trim() && editedTitle !== task.title) {
      await updateTask.mutateAsync({
        taskId: task.id,
        dto: { title: editedTitle.trim() },
      });
      onUpdate();
    }
  }, [task, editedTitle, updateTask, onUpdate]);

  // Handle description save on blur
  const handleDescriptionBlur = useCallback(async () => {
    if (!task) return;
    const newDesc = editedDescription.trim() || null;
    const oldDesc = task.description || null;
    if (newDesc !== oldDesc) {
      await updateTask.mutateAsync({
        taskId: task.id,
        dto: { description: newDesc ?? undefined },
      });
      onUpdate();
    }
  }, [task, editedDescription, updateTask, onUpdate]);

  // Handle status change
  const handleStatusChange = useCallback(
    async (status: ProjectTaskStatus) => {
      if (!task) return;
      await updateTask.mutateAsync({
        taskId: task.id,
        dto: { status },
      });
      onUpdate();
    },
    [task, updateTask, onUpdate],
  );

  // Handle priority change
  const handlePriorityChange = useCallback(
    async (priority: ProjectTaskPriority) => {
      if (!task) return;
      await updateTask.mutateAsync({
        taskId: task.id,
        dto: { priority },
      });
      onUpdate();
    },
    [task, updateTask, onUpdate],
  );

  // Handle group change
  const handleGroupChange = useCallback(
    async (groupId: string | null) => {
      if (!task) return;
      await updateTask.mutateAsync({
        taskId: task.id,
        dto: { groupId },
      });
      onUpdate();
    },
    [task, updateTask, onUpdate],
  );

  // Handle assignee change
  const handleAssigneeChange = useCallback(
    async (assigneeId: string | null) => {
      if (!task) return;
      await updateTask.mutateAsync({
        taskId: task.id,
        dto: { assigneeId },
      });
      setAssigneeOpen(false);
      onUpdate();
    },
    [task, updateTask, onUpdate],
  );

  // Handle start date change
  const handleStartDateChange = useCallback(
    async (date: Date | undefined) => {
      if (!task) return;
      await updateTask.mutateAsync({
        taskId: task.id,
        dto: { startDate: date?.toISOString() ?? null },
      });
      setStartDateOpen(false);
      onUpdate();
    },
    [task, updateTask, onUpdate],
  );

  // Handle due date change
  const handleDueDateChange = useCallback(
    async (date: Date | undefined) => {
      if (!task) return;
      await updateTask.mutateAsync({
        taskId: task.id,
        dto: { dueDate: date?.toISOString() ?? null },
      });
      setDueDateOpen(false);
      onUpdate();
    },
    [task, updateTask, onUpdate],
  );

  // Handle delete
  const handleDelete = useCallback(async () => {
    if (!task) return;
    await deleteTask.mutateAsync(task.id);
    setDeleteDialogOpen(false);
    onClose();
    onUpdate();
  }, [task, deleteTask, onClose, onUpdate]);

  // Handle copy link
  const handleCopyLink = useCallback(() => {
    if (!task) return;
    const url = `${window.location.origin}/projects/${projectId}?task=${task.id}`;
    navigator.clipboard.writeText(url);
  }, [task, projectId]);

  if (!task) {
    return null;
  }

  const statusConfig = STATUS_CONFIG[task.status];
  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const PriorityIcon = priorityConfig.icon;

  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-[480px] sm:w-[540px] flex flex-col p-0 overflow-hidden"
      >
        {/* Header */}
        <SheetHeader className="px-4 py-3 border-b bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-mono">
                <Hash className="h-3 w-3 mr-0.5" />
                {task.id.slice(0, 8)}
              </Badge>
              <SheetTitle className="sr-only">Task Details</SheetTitle>
              <SheetDescription className="sr-only">
                View and edit task details
              </SheetDescription>
            </div>

            <div className="flex items-center gap-1">
              {/* Subscriber count */}
              <TaskSubscriberList
                projectId={projectId}
                taskId={task.id}
                currentUserId={currentUserId}
                compact
              />

              {/* Three-dot menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <FolderInput className="h-4 w-4 mr-2" />
                    Move to group
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete task
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Editable title */}
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleTitleBlur}
            className="mt-2 text-lg font-semibold h-auto py-1 px-2 border-transparent hover:border-gray-300 focus:border-gray-300"
          />
        </SheetHeader>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="w-full justify-start rounded-none border-b h-10 bg-transparent px-4">
            <TabsTrigger
              value="details"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
            >
              <FileText className="h-4 w-4 mr-1.5" />
              Details
            </TabsTrigger>
            <TabsTrigger
              value="updates"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
            >
              <MessageSquare className="h-4 w-4 mr-1.5" />
              Updates
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none"
            >
              <Activity className="h-4 w-4 mr-1.5" />
              Activity
            </TabsTrigger>
            <TabsTrigger
              value="files"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-500 rounded-none relative"
            >
              <Paperclip className="h-4 w-4 mr-1.5" />
              Files
              {fileCount > 0 && (
                <Badge
                  variant="secondary"
                  className="ml-1.5 h-5 px-1.5 text-[10px]"
                >
                  {fileCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Details Tab */}
          <TabsContent
            value="details"
            className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden"
          >
            <ScrollArea className="h-full">
              <div className="p-4 space-y-6">
                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="task-description">Description</Label>
                  <Textarea
                    id="task-description"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    onBlur={handleDescriptionBlur}
                    placeholder="Add a description..."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <Separator />

                {/* Status & Priority row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Status */}
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={task.status}
                      onValueChange={(v) =>
                        handleStatusChange(v as ProjectTaskStatus)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>
                          <Badge
                            className={cn(statusConfig.bg, statusConfig.text)}
                          >
                            {statusConfig.label}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.keys(STATUS_CONFIG) as ProjectTaskStatus[]
                        ).map((status) => (
                          <SelectItem key={status} value={status}>
                            <Badge
                              className={cn(
                                STATUS_CONFIG[status].bg,
                                STATUS_CONFIG[status].text,
                              )}
                            >
                              {STATUS_CONFIG[status].label}
                            </Badge>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Priority */}
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={task.priority}
                      onValueChange={(v) =>
                        handlePriorityChange(v as ProjectTaskPriority)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>
                          <div className="flex items-center gap-2">
                            <PriorityIcon
                              className={cn("h-4 w-4", priorityConfig.color)}
                            />
                            {priorityConfig.label}
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          Object.keys(PRIORITY_CONFIG) as ProjectTaskPriority[]
                        ).map((priority) => {
                          const config = PRIORITY_CONFIG[priority];
                          const Icon = config.icon;
                          return (
                            <SelectItem key={priority} value={priority}>
                              <div className="flex items-center gap-2">
                                <Icon className={cn("h-4 w-4", config.color)} />
                                {config.label}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Assignee & Group row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Assignee */}
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start font-normal"
                        >
                          {task.assignee ? (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-5 w-5">
                                <AvatarFallback className="text-[10px]">
                                  {task.assignee.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">
                                {task.assignee.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">
                              Unassigned
                            </span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-1" align="start">
                        <button
                          onClick={() => handleAssigneeChange(null)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors"
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                          Unassigned
                        </button>
                        <div className="my-1 border-t" />
                        {users.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => handleAssigneeChange(user.id)}
                            className={cn(
                              "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors",
                              task.assigneeId === user.id && "bg-muted",
                            )}
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="text-[10px]">
                                {user.firstName.charAt(0)}
                                {user.lastName.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            {user.firstName} {user.lastName}
                          </button>
                        ))}
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Group */}
                  <div className="space-y-2">
                    <Label>Group</Label>
                    <Select
                      value={task.groupId ?? "_ungrouped"}
                      onValueChange={(v) =>
                        handleGroupChange(v === "_ungrouped" ? null : v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue>
                          {task.group?.name ?? "Ungrouped"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_ungrouped">Ungrouped</SelectItem>
                        {groups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor: group.color || "#6b7280",
                                }}
                              />
                              {group.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Dates row */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Start Date */}
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover
                      open={startDateOpen}
                      onOpenChange={setStartDateOpen}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start font-normal"
                        >
                          <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                          {task.startDate
                            ? format(new Date(task.startDate), "PP")
                            : "Not set"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            task.startDate
                              ? new Date(task.startDate)
                              : undefined
                          }
                          onSelect={handleStartDateChange}
                          initialFocus
                        />
                        {task.startDate && (
                          <div className="p-2 border-t">
                            <button
                              onClick={() => handleStartDateChange(undefined)}
                              className="w-full text-sm text-red-600 hover:underline"
                            >
                              Clear date
                            </button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Due Date */}
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Popover open={dueDateOpen} onOpenChange={setDueDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start font-normal",
                            task.dueDate &&
                              new Date(task.dueDate) < new Date() &&
                              task.status !== "DONE" &&
                              "border-red-300 text-red-600",
                          )}
                        >
                          <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                          {task.dueDate
                            ? format(new Date(task.dueDate), "PP")
                            : "Not set"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            task.dueDate ? new Date(task.dueDate) : undefined
                          }
                          onSelect={handleDueDateChange}
                          initialFocus
                        />
                        {task.dueDate && (
                          <div className="p-2 border-t">
                            <button
                              onClick={() => handleDueDateChange(undefined)}
                              className="w-full text-sm text-red-600 hover:underline"
                            >
                              Clear date
                            </button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <Separator />

                {/* Subtasks */}
                {task.subtaskCount && task.subtaskCount > 0 && (
                  <>
                    <div className="space-y-2">
                      <Label>Subtasks</Label>
                      <div className="text-sm text-muted-foreground">
                        {task.completedSubtaskCount ?? 0} of {task.subtaskCount}{" "}
                        subtasks complete
                      </div>
                    </div>
                    <Separator />
                  </>
                )}

                {/* Subscribers */}
                <div className="space-y-2">
                  <TaskSubscriberList
                    projectId={projectId}
                    taskId={task.id}
                    currentUserId={currentUserId}
                  />
                </div>

                <Separator />

                {/* Dependencies */}
                <TaskDependencyList
                  projectId={projectId}
                  taskId={task.id}
                  onNavigateToTask={(taskId) => {
                    // Could implement task switching here
                    console.log("Navigate to task:", taskId);
                  }}
                />

                <Separator />

                {/* Metadata */}
                <div className="space-y-2 text-xs text-muted-foreground">
                  <div>
                    Created:{" "}
                    {task.createdAt &&
                    !isNaN(new Date(task.createdAt).getTime())
                      ? format(new Date(task.createdAt), "PPP 'at' p")
                      : "Unknown"}
                  </div>
                  <div>
                    Last updated:{" "}
                    {task.updatedAt &&
                    !isNaN(new Date(task.updatedAt).getTime())
                      ? format(new Date(task.updatedAt), "PPP 'at' p")
                      : "Unknown"}
                  </div>
                  {task.completedAt && (
                    <div>
                      Completed:{" "}
                      {format(new Date(task.completedAt), "PPP 'at' p")}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Updates Tab */}
          <TabsContent
            value="updates"
            className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden"
          >
            <TaskUpdateThread
              projectId={projectId}
              taskId={task.id}
              currentUserId={currentUserId}
            />
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent
            value="activity"
            className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden"
          >
            <TaskActivityLog projectId={projectId} taskId={task.id} />
          </TabsContent>

          {/* Files Tab */}
          <TabsContent
            value="files"
            className="flex-1 overflow-hidden m-0 data-[state=inactive]:hidden"
          >
            <TaskFileList projectId={projectId} taskId={task.id} />
          </TabsContent>
        </Tabs>

        {/* Delete confirmation dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{task.title}&quot;? This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteTask.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

export default TaskDetailPanel;
