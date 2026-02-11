"use client";

/**
 * Instance List Table
 *
 * Displays workflow instances in a table with:
 * - Columns: Entity (type badge + ID), Current Stage, Status, SLA Status, Started, Due Date
 * - Row selection with checkboxes for bulk actions
 * - Bulk actions: Pause/Resume/Cancel with state validation
 * - Row click opens InstanceDetailDialog
 * - Pagination, loading skeleton, empty state
 */

import React, { useState, useCallback, useMemo } from "react";
import { formatDistanceToNow, format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Pause,
  Play,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  useWorkflowInstances,
  usePauseInstance,
  useResumeInstance,
  useCancelInstance,
} from "@/hooks/use-workflows";
import { InstanceDetailDialog } from "./instance-detail-dialog";
import type {
  WorkflowInstance,
  WorkflowInstanceStatus,
  WorkflowEntityType,
  WorkflowStage,
  SlaStatus,
  WorkflowInstanceQueryParams,
} from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

export interface InstanceListTableProps {
  /** Template ID to filter instances */
  templateId: string;
  /** Status filter */
  status?: WorkflowInstanceStatus;
  /** Stages from the template for display */
  stages?: WorkflowStage[];
}

// ============================================================================
// Constants
// ============================================================================

const ENTITY_TYPE_COLORS: Record<WorkflowEntityType, string> = {
  CASE: "bg-blue-100 text-blue-700",
  INVESTIGATION: "bg-green-100 text-green-700",
  DISCLOSURE: "bg-amber-100 text-amber-700",
  POLICY: "bg-purple-100 text-purple-700",
  CAMPAIGN: "bg-cyan-100 text-cyan-700",
};

const ENTITY_TYPE_LABELS: Record<WorkflowEntityType, string> = {
  CASE: "Case",
  INVESTIGATION: "Investigation",
  DISCLOSURE: "Disclosure",
  POLICY: "Policy",
  CAMPAIGN: "Campaign",
};

const STATUS_COLORS: Record<WorkflowInstanceStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-blue-100 text-blue-800",
  CANCELLED: "bg-red-100 text-red-800",
  PAUSED: "bg-yellow-100 text-yellow-800",
};

const STATUS_LABELS: Record<WorkflowInstanceStatus, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  PAUSED: "Paused",
};

const SLA_STATUS_COLORS: Record<SlaStatus, string> = {
  ON_TRACK: "bg-green-100 text-green-800",
  WARNING: "bg-yellow-100 text-yellow-800",
  OVERDUE: "bg-red-100 text-red-800",
};

const SLA_STATUS_LABELS: Record<SlaStatus, string> = {
  ON_TRACK: "On Track",
  WARNING: "Warning",
  OVERDUE: "Overdue",
};

const PAGE_SIZE = 20;

// ============================================================================
// Helper Functions
// ============================================================================

function formatStartedAt(date: string): string {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

function formatDueDate(date: string | undefined): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "MMM d, yyyy");
  } catch {
    return "-";
  }
}

function getStageName(
  stageId: string,
  stages: WorkflowStage[] | undefined,
): string {
  if (!stages) return stageId;
  const stage = stages.find((s) => s.id === stageId);
  return stage?.name || stageId;
}

function getStageColor(
  stageId: string,
  stages: WorkflowStage[] | undefined,
): string | undefined {
  if (!stages) return undefined;
  const stage = stages.find((s) => s.id === stageId);
  return stage?.display?.color;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function InstanceTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-5 w-[150px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[70px]" />
          <Skeleton className="h-5 w-[70px]" />
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-5 w-[100px]" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyInstances({ status }: { status?: WorkflowInstanceStatus }) {
  return (
    <div className="text-center py-12 border rounded-lg bg-muted/30">
      <div className="h-12 w-12 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
        <ExternalLink className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-lg font-medium mb-2">No instances found</p>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">
        {status
          ? `No ${STATUS_LABELS[status].toLowerCase()} instances for this workflow template.`
          : "No instances have been started for this workflow template yet."}
      </p>
    </div>
  );
}

// ============================================================================
// Bulk Actions Bar
// ============================================================================

interface BulkActionsBarProps {
  selectedCount: number;
  selectedInstances: WorkflowInstance[];
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onClearSelection: () => void;
  isPausing: boolean;
  isResuming: boolean;
  isCancelling: boolean;
}

function BulkActionsBar({
  selectedCount,
  selectedInstances,
  onPause,
  onResume,
  onCancel,
  onClearSelection,
  isPausing,
  isResuming,
  isCancelling,
}: BulkActionsBarProps) {
  if (selectedCount === 0) return null;

  // Check what actions are available based on selected instances
  const canPause = selectedInstances.some((i) => i.status === "ACTIVE");
  const canResume = selectedInstances.some((i) => i.status === "PAUSED");
  const canCancel = selectedInstances.some(
    (i) => i.status === "ACTIVE" || i.status === "PAUSED",
  );

  const isLoading = isPausing || isResuming || isCancelling;

  return (
    <div className="flex items-center justify-between p-3 bg-muted rounded-lg mb-4">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">
          {selectedCount} instance{selectedCount !== 1 ? "s" : ""} selected
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isLoading}
        >
          Clear
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {canPause && (
          <Button
            variant="outline"
            size="sm"
            onClick={onPause}
            disabled={isLoading}
          >
            <Pause className="h-4 w-4 mr-1" />
            Pause
          </Button>
        )}
        {canResume && (
          <Button
            variant="outline"
            size="sm"
            onClick={onResume}
            disabled={isLoading}
          >
            <Play className="h-4 w-4 mr-1" />
            Resume
          </Button>
        )}
        {canCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isLoading}
            className="text-destructive hover:text-destructive"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Instance Row
// ============================================================================

interface InstanceRowProps {
  instance: WorkflowInstance;
  stages?: WorkflowStage[];
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onViewDetails: (instance: WorkflowInstance) => void;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onCancel: (id: string) => void;
}

function InstanceRow({
  instance,
  stages,
  isSelected,
  onSelect,
  onViewDetails,
  onPause,
  onResume,
  onCancel,
}: InstanceRowProps) {
  const stageColor = getStageColor(instance.currentStage, stages);
  const stageName = getStageName(instance.currentStage, stages);

  const canPause = instance.status === "ACTIVE";
  const canResume = instance.status === "PAUSED";
  const canCancel =
    instance.status === "ACTIVE" || instance.status === "PAUSED";

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => onViewDetails(instance)}
    >
      {/* Checkbox */}
      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(instance.id, checked === true)}
        />
      </TableCell>

      {/* Entity */}
      <TableCell>
        <div className="flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn(ENTITY_TYPE_COLORS[instance.entityType])}
          >
            {ENTITY_TYPE_LABELS[instance.entityType]}
          </Badge>
          <span className="text-sm font-mono text-muted-foreground truncate max-w-[120px]">
            {instance.entityId.substring(0, 8)}...
          </span>
        </div>
      </TableCell>

      {/* Current Stage */}
      <TableCell>
        <div className="flex items-center gap-2">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: stageColor || "#6b7280" }}
          />
          <span className="text-sm">{stageName}</span>
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge
          variant="secondary"
          className={cn(STATUS_COLORS[instance.status])}
        >
          {STATUS_LABELS[instance.status]}
        </Badge>
      </TableCell>

      {/* SLA Status */}
      <TableCell>
        {instance.slaStatus ? (
          <Badge
            variant="secondary"
            className={cn(SLA_STATUS_COLORS[instance.slaStatus])}
          >
            {SLA_STATUS_LABELS[instance.slaStatus]}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>

      {/* Started */}
      <TableCell className="text-muted-foreground text-sm">
        {formatStartedAt(instance.createdAt)}
      </TableCell>

      {/* Due Date */}
      <TableCell className="text-muted-foreground text-sm">
        {formatDueDate(instance.dueDate)}
      </TableCell>

      {/* Actions */}
      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onViewDetails(instance)}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {canPause && (
              <DropdownMenuItem onClick={() => onPause(instance.id)}>
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </DropdownMenuItem>
            )}
            {canResume && (
              <DropdownMenuItem onClick={() => onResume(instance.id)}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </DropdownMenuItem>
            )}
            {canCancel && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onCancel(instance.id)}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function InstanceListTable({
  templateId,
  status,
  stages,
}: InstanceListTableProps) {
  // Pagination state
  const [page, setPage] = useState(1);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail dialog state
  const [selectedInstance, setSelectedInstance] =
    useState<WorkflowInstance | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Bulk cancel confirmation
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);

  // Build query params
  const queryParams: WorkflowInstanceQueryParams = useMemo(
    () => ({
      templateId,
      status,
      page,
      limit: PAGE_SIZE,
    }),
    [templateId, status, page],
  );

  // Fetch instances
  const { data, isLoading } = useWorkflowInstances(queryParams);

  // Mutations
  const pauseMutation = usePauseInstance();
  const resumeMutation = useResumeInstance();
  const cancelMutation = useCancelInstance();

  const instances = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Get selected instances
  const selectedInstances = useMemo(
    () => instances.filter((i) => selectedIds.has(i.id)),
    [instances, selectedIds],
  );

  // Selection handlers
  const handleSelectAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        setSelectedIds(new Set(instances.map((i) => i.id)));
      } else {
        setSelectedIds(new Set());
      }
    },
    [instances],
  );

  const handleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Single instance actions
  const handlePauseSingle = useCallback(
    async (id: string) => {
      try {
        await pauseMutation.mutateAsync({ id });
        toast.success("Instance paused");
      } catch (error) {
        console.warn("Failed to pause instance:", error);
        toast.error("Failed to pause instance");
      }
    },
    [pauseMutation],
  );

  const handleResumeSingle = useCallback(
    async (id: string) => {
      try {
        await resumeMutation.mutateAsync(id);
        toast.success("Instance resumed");
      } catch (error) {
        console.warn("Failed to resume instance:", error);
        toast.error("Failed to resume instance");
      }
    },
    [resumeMutation],
  );

  const handleCancelSingle = useCallback(
    async (id: string) => {
      try {
        await cancelMutation.mutateAsync({ id });
        toast.success("Instance cancelled");
      } catch (error) {
        console.warn("Failed to cancel instance:", error);
        toast.error("Failed to cancel instance");
      }
    },
    [cancelMutation],
  );

  // Bulk actions
  const handleBulkPause = useCallback(async () => {
    const toPause = selectedInstances.filter((i) => i.status === "ACTIVE");
    let successCount = 0;

    for (const instance of toPause) {
      try {
        await pauseMutation.mutateAsync({ id: instance.id });
        successCount++;
      } catch {
        // Continue with others
      }
    }

    if (successCount > 0) {
      toast.success(
        `Paused ${successCount} instance${successCount !== 1 ? "s" : ""}`,
      );
      clearSelection();
    } else {
      toast.error("Failed to pause instances");
    }
  }, [selectedInstances, pauseMutation, clearSelection]);

  const handleBulkResume = useCallback(async () => {
    const toResume = selectedInstances.filter((i) => i.status === "PAUSED");
    let successCount = 0;

    for (const instance of toResume) {
      try {
        await resumeMutation.mutateAsync(instance.id);
        successCount++;
      } catch {
        // Continue with others
      }
    }

    if (successCount > 0) {
      toast.success(
        `Resumed ${successCount} instance${successCount !== 1 ? "s" : ""}`,
      );
      clearSelection();
    } else {
      toast.error("Failed to resume instances");
    }
  }, [selectedInstances, resumeMutation, clearSelection]);

  const handleBulkCancel = useCallback(async () => {
    const toCancel = selectedInstances.filter(
      (i) => i.status === "ACTIVE" || i.status === "PAUSED",
    );
    let successCount = 0;

    for (const instance of toCancel) {
      try {
        await cancelMutation.mutateAsync({ id: instance.id });
        successCount++;
      } catch {
        // Continue with others
      }
    }

    if (successCount > 0) {
      toast.success(
        `Cancelled ${successCount} instance${successCount !== 1 ? "s" : ""}`,
      );
      clearSelection();
    } else {
      toast.error("Failed to cancel instances");
    }
    setIsCancelDialogOpen(false);
  }, [selectedInstances, cancelMutation, clearSelection]);

  // View details handler
  const handleViewDetails = useCallback((instance: WorkflowInstance) => {
    setSelectedInstance(instance);
    setIsDetailOpen(true);
  }, []);

  // Render
  if (isLoading) {
    return <InstanceTableSkeleton />;
  }

  if (instances.length === 0) {
    return <EmptyInstances status={status} />;
  }

  const allSelected =
    instances.length > 0 && selectedIds.size === instances.length;
  const someSelected = selectedIds.size > 0 && !allSelected;

  return (
    <>
      {/* Bulk Actions Bar */}
      <BulkActionsBar
        selectedCount={selectedIds.size}
        selectedInstances={selectedInstances}
        onPause={handleBulkPause}
        onResume={handleBulkResume}
        onCancel={() => setIsCancelDialogOpen(true)}
        onClearSelection={clearSelection}
        isPausing={pauseMutation.isPending}
        isResuming={resumeMutation.isPending}
        isCancelling={cancelMutation.isPending}
      />

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  // @ts-expect-error - indeterminate is valid but not typed
                  indeterminate={someSelected}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Current Stage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SLA Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {instances.map((instance) => (
              <InstanceRow
                key={instance.id}
                instance={instance}
                stages={stages}
                isSelected={selectedIds.has(instance.id)}
                onSelect={handleSelect}
                onViewDetails={handleViewDetails}
                onPause={handlePauseSingle}
                onResume={handleResumeSingle}
                onCancel={handleCancelSingle}
              />
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1} to{" "}
            {Math.min(page * PAGE_SIZE, total)} of {total} instances
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <InstanceDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        instance={selectedInstance}
        stages={stages}
      />

      {/* Bulk Cancel Confirmation */}
      <AlertDialog
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Selected Instances?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel{" "}
              {
                selectedInstances.filter(
                  (i) => i.status === "ACTIVE" || i.status === "PAUSED",
                ).length
              }{" "}
              instance(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Active</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleBulkCancel}
            >
              Cancel Instances
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
