"use client";

/**
 * Project Detail Page
 *
 * Main workspace for managing project tasks. Features a Monday.com-style
 * grouped table with inline editing, task creation, group management,
 * and a task detail side panel.
 *
 * Route: /projects/[id]
 */

import { Suspense, useState, useCallback, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useTrackRecentItem } from "@/contexts/shortcuts-context";
import { useGlobalShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  useProjectDetail,
  useUpdateProject,
  useCreateGroup,
  type ProjectDetailResponse,
} from "@/hooks/use-project-detail";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  Plus,
  Settings,
  Table2,
  LayoutGrid,
  GanttChart,
  Edit2,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ProjectTaskTable } from "@/components/projects/ProjectTaskTable";
import { TaskDetailPanel } from "@/components/projects/TaskDetailPanel";
import type {
  ProjectStatus,
  ProjectCategory,
  ProjectUser,
  ProjectTask,
} from "@/types/project";

/**
 * Status badge styles.
 */
const STATUS_STYLES: Record<
  ProjectStatus,
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
  AT_RISK: { bg: "bg-orange-100", text: "text-orange-700", label: "At Risk" },
  COMPLETED: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
  CANCELLED: { bg: "bg-gray-100", text: "text-gray-500", label: "Cancelled" },
};

/**
 * Category labels.
 */
const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  AUDIT: "Audit",
  INVESTIGATION: "Investigation",
  CAMPAIGN: "Campaign",
  PROJECT: "Project",
  TRAINING: "Training",
  REMEDIATION: "Remediation",
  OTHER: "Other",
};

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

/**
 * View modes for the project detail page.
 */
type ViewMode = "table" | "board" | "timeline";

/**
 * Project Header Component - displays project info and actions.
 */
function ProjectHeader({
  project,
  isLoading,
  onUpdate,
}: {
  project: ProjectDetailResponse | null;
  isLoading: boolean;
  onUpdate: () => void;
}) {
  const router = useRouter();
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [statusPopoverOpen, setStatusPopoverOpen] = useState(false);
  const [ownerPopoverOpen, setOwnerPopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const updateProject = useUpdateProject(project?.id ?? "");

  // Fetch users for owner selection
  useEffect(() => {
    if (ownerPopoverOpen) {
      apiClient
        .get<User[]>("/users")
        .then((data) => setUsers(Array.isArray(data) ? data : []))
        .catch(() => setUsers([]));
    }
  }, [ownerPopoverOpen]);

  const handleStartEditName = useCallback(() => {
    if (project) {
      setEditedName(project.name);
      setIsEditingName(true);
    }
  }, [project]);

  const handleSaveName = useCallback(async () => {
    if (!editedName.trim() || !project) return;
    await updateProject.mutateAsync({ name: editedName.trim() });
    setIsEditingName(false);
    onUpdate();
  }, [editedName, project, updateProject, onUpdate]);

  const handleCancelEditName = useCallback(() => {
    setIsEditingName(false);
    setEditedName("");
  }, []);

  const handleStatusChange = useCallback(
    async (status: ProjectStatus) => {
      if (!project) return;
      await updateProject.mutateAsync({ status });
      setStatusPopoverOpen(false);
      onUpdate();
    },
    [project, updateProject, onUpdate],
  );

  const handleOwnerChange = useCallback(
    async (ownerId: string) => {
      if (!project) return;
      await updateProject.mutateAsync({ ownerId });
      setOwnerPopoverOpen(false);
      onUpdate();
    },
    [project, updateProject, onUpdate],
  );

  const handleDateChange = useCallback(
    async (date: Date | undefined) => {
      if (!project || !date) return;
      await updateProject.mutateAsync({ targetDate: date.toISOString() });
      setDatePopoverOpen(false);
      onUpdate();
    },
    [project, updateProject, onUpdate],
  );

  if (isLoading) {
    return <ProjectHeaderSkeleton />;
  }

  if (!project) {
    return null;
  }

  const statusStyle = STATUS_STYLES[project.status];
  const ownerInitials = project.owner
    ? `${project.owner.name.charAt(0)}`.toUpperCase()
    : "?";

  return (
    <div className="bg-white border-b px-6 py-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
        <button
          onClick={() => router.push("/projects")}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Projects
        </button>
        <span>/</span>
        <span className="text-foreground">{project.name}</span>
      </div>

      {/* Main header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Project name - editable */}
          <div className="flex items-center gap-2 mb-2">
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") handleCancelEditName();
                  }}
                  autoFocus
                  className="text-xl font-semibold h-9 w-64"
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleSaveName}
                  disabled={updateProject.isPending}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancelEditName}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={handleStartEditName}
                className="group flex items-center gap-2 text-xl font-semibold hover:text-primary transition-colors"
              >
                {project.name}
                <Edit2 className="h-4 w-4 opacity-0 group-hover:opacity-50 transition-opacity" />
              </button>
            )}

            {/* Status badge - clickable */}
            <Popover
              open={statusPopoverOpen}
              onOpenChange={setStatusPopoverOpen}
            >
              <PopoverTrigger asChild>
                <button>
                  <Badge
                    className={cn(
                      statusStyle.bg,
                      statusStyle.text,
                      "hover:opacity-80 cursor-pointer",
                    )}
                  >
                    {statusStyle.label}
                  </Badge>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-1" align="start">
                {(Object.keys(STATUS_STYLES) as ProjectStatus[]).map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(status)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors",
                        project.status === status && "bg-muted",
                      )}
                    >
                      {STATUS_STYLES[status].label}
                    </button>
                  ),
                )}
              </PopoverContent>
            </Popover>

            {/* Category badge */}
            <Badge variant="outline">{CATEGORY_LABELS[project.category]}</Badge>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 min-w-[200px]">
              <Progress value={project.progressPercent} className="h-2" />
              <span className="text-muted-foreground whitespace-nowrap">
                {project.completedItems} of {project.totalItems} tasks
              </span>
            </div>

            {/* Owner - clickable */}
            <Popover open={ownerPopoverOpen} onOpenChange={setOwnerPopoverOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 hover:bg-muted px-2 py-1 rounded-md transition-colors">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {ownerInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-muted-foreground">
                    {project.owner?.name || "Unassigned"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-1">
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleOwnerChange(user.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md hover:bg-muted transition-colors",
                        project.ownerId === user.id && "bg-muted",
                      )}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {user.firstName.charAt(0)}
                          {user.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {user.firstName} {user.lastName}
                      </span>
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Target date - clickable */}
            <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 hover:bg-muted px-2 py-1 rounded-md transition-colors">
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {project.targetDate
                      ? format(new Date(project.targetDate), "MMM d, yyyy")
                      : "No target date"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={
                    project.targetDate
                      ? new Date(project.targetDate)
                      : undefined
                  }
                  onSelect={handleDateChange}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton for project header.
 */
function ProjectHeaderSkeleton() {
  return (
    <div className="bg-white border-b px-6 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Skeleton className="h-4 w-12" />
        <span className="text-gray-300">/</span>
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <div className="flex items-center gap-4">
            <Skeleton className="h-2 w-48" />
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
        </div>
      </div>
    </div>
  );
}

/**
 * View mode tabs component.
 */
function ViewModeTabs({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}) {
  return (
    <div className="border-b px-6">
      <Tabs value={mode} onValueChange={(v) => onChange(v as ViewMode)}>
        <TabsList className="h-10 bg-transparent p-0">
          <TabsTrigger
            value="table"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            <Table2 className="h-4 w-4 mr-1.5" />
            Table
          </TabsTrigger>
          <TabsTrigger
            value="board"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            <LayoutGrid className="h-4 w-4 mr-1.5" />
            Board
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
          >
            <GanttChart className="h-4 w-4 mr-1.5" />
            Timeline
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

/**
 * Add Group Dialog.
 */
function AddGroupDialog({
  open,
  onOpenChange,
  projectId,
  onGroupCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onGroupCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3b82f6");
  const createGroup = useCreateGroup(projectId);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await createGroup.mutateAsync({ name: name.trim(), color });
    setName("");
    setColor("#3b82f6");
    onOpenChange(false);
    onGroupCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Group</DialogTitle>
          <DialogDescription>
            Create a new group to organize your tasks.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="groupName">Group Name</Label>
            <Input
              id="groupName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Planning, Execution, Review"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="groupColor">Color</Label>
            <div className="flex gap-2">
              {[
                "#3b82f6",
                "#10b981",
                "#f59e0b",
                "#ef4444",
                "#8b5cf6",
                "#ec4899",
                "#6b7280",
              ].map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    color === c
                      ? "border-foreground scale-110"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createGroup.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createGroup.isPending || !name.trim()}
          >
            {createGroup.isPending && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            Create Group
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Project Detail Page Content - the main component.
 */
function ProjectDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const projectId = params?.id as string;
  const taskIdFromUrl = searchParams?.get("task") ?? null;

  // State
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(
    taskIdFromUrl,
  );
  const [addGroupDialogOpen, setAddGroupDialogOpen] = useState(false);

  // Data fetching
  const {
    data: project,
    isLoading,
    error,
    refetch,
  } = useProjectDetail(projectId);

  // Register go back shortcut
  useGlobalShortcuts({
    onGoBack: () => router.push("/projects"),
  });

  // Track as recent item (using "page" type since "project" is not in RecentItem type)
  useTrackRecentItem(
    project
      ? {
          id: project.id,
          label: `Project: ${project.name}`,
          type: "page",
          href: `/projects/${project.id}`,
        }
      : null,
  );

  // Update URL when task is selected
  useEffect(() => {
    if (selectedTaskId) {
      const params = new URLSearchParams(window.location.search);
      params.set("task", selectedTaskId);
      window.history.replaceState({}, "", `?${params.toString()}`);
    } else {
      const params = new URLSearchParams(window.location.search);
      params.delete("task");
      const newUrl = params.toString()
        ? `?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }
  }, [selectedTaskId]);

  // Handle task click
  const handleTaskClick = useCallback((task: ProjectTask) => {
    setSelectedTaskId(task.id);
  }, []);

  // Handle task panel close
  const handleTaskPanelClose = useCallback(() => {
    setSelectedTaskId(null);
  }, []);

  // Get selected task from project data
  const selectedTask =
    project?.tasks.find((t) => t.id === selectedTaskId) ?? null;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading while checking auth
  if (authLoading) {
    return <ProjectDetailPageSkeleton />;
  }

  // Don't render if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Project Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The project may have been deleted or you may not have access.
          </p>
          <Button onClick={() => router.push("/projects")}>
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <ProjectHeader
        project={project ?? null}
        isLoading={isLoading}
        onUpdate={refetch}
      />

      {/* View mode tabs */}
      <ViewModeTabs mode={viewMode} onChange={setViewMode} />

      {/* Toolbar */}
      <div className="bg-white border-b px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAddGroupDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Group
          </Button>
        </div>
      </div>

      {/* Content based on view mode */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "table" && (
          <ProjectTaskTable
            project={project ?? null}
            isLoading={isLoading}
            onTaskClick={handleTaskClick}
            onRefresh={refetch}
          />
        )}
        {viewMode === "board" && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Board view - see Plan 05
          </div>
        )}
        {viewMode === "timeline" && (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Timeline view - see Plan 05
          </div>
        )}
      </div>

      {/* Task detail side panel */}
      {project && (
        <TaskDetailPanel
          task={selectedTask}
          projectId={project.id}
          groups={project.groups}
          onClose={handleTaskPanelClose}
          onUpdate={refetch}
        />
      )}

      {/* Add Group Dialog */}
      {project && (
        <AddGroupDialog
          open={addGroupDialogOpen}
          onOpenChange={setAddGroupDialogOpen}
          projectId={project.id}
          onGroupCreated={refetch}
        />
      )}
    </div>
  );
}

/**
 * Skeleton loader for the entire page.
 */
function ProjectDetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <ProjectHeaderSkeleton />
      <div className="border-b px-6 py-2">
        <Skeleton className="h-10 w-64" />
      </div>
      <div className="bg-white border-b px-6 py-2">
        <Skeleton className="h-9 w-24" />
      </div>
      <div className="flex-1 p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border p-4">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Project Detail Page with Suspense wrapper.
 */
export default function ProjectDetailPage() {
  return (
    <Suspense fallback={<ProjectDetailPageSkeleton />}>
      <ProjectDetailPageContent />
    </Suspense>
  );
}
