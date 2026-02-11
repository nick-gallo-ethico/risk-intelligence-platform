"use client";

/**
 * Instance Detail Dialog
 *
 * Shows full details of a workflow instance including:
 * - Entity type/ID and status badge
 * - WorkflowProgressIndicator with stages and current position
 * - Step states table
 * - Metadata: template name, version, dates, SLA
 * - Actions: Pause/Resume/Cancel buttons based on status
 */

import React, { useCallback } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Calendar,
  Clock,
  ExternalLink,
  Pause,
  Play,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  usePauseInstance,
  useResumeInstance,
  useCancelInstance,
} from "@/hooks/use-workflows";
import { WorkflowProgressIndicator } from "./workflow-progress-indicator";
import type {
  WorkflowInstance,
  WorkflowInstanceStatus,
  WorkflowEntityType,
  WorkflowStage,
  SlaStatus,
  StepStates,
  StepStatus,
} from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

export interface InstanceDetailDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** The instance to display */
  instance: WorkflowInstance | null;
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

const STEP_STATUS_ICONS: Record<StepStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  in_progress: <Timer className="h-4 w-4 text-blue-500" />,
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  skipped: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
};

const STEP_STATUS_LABELS: Record<StepStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  skipped: "Skipped",
  failed: "Failed",
};

// ============================================================================
// Helper Functions
// ============================================================================

function formatDateTime(date: string | undefined): string {
  if (!date) return "-";
  try {
    return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
  } catch {
    return "-";
  }
}

function formatRelativeTime(date: string | undefined): string {
  if (!date) return "-";
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return "-";
  }
}

function getStepName(
  stepId: string,
  stages: WorkflowStage[] | undefined,
): string {
  if (!stages) return stepId;
  for (const stage of stages) {
    const step = stage.steps.find((s) => s.id === stepId);
    if (step) return step.name;
  }
  return stepId;
}

function getStageName(
  stageId: string,
  stages: WorkflowStage[] | undefined,
): string {
  if (!stages) return stageId;
  const stage = stages.find((s) => s.id === stageId);
  return stage?.name || stageId;
}

function getCompletedStages(
  currentStage: string,
  stages: WorkflowStage[] | undefined,
): string[] {
  if (!stages) return [];
  const completed: string[] = [];
  for (const stage of stages) {
    if (stage.id === currentStage) break;
    completed.push(stage.id);
  }
  return completed;
}

// ============================================================================
// Step States Table
// ============================================================================

interface StepStatesTableProps {
  stepStates: StepStates;
  stages?: WorkflowStage[];
}

function StepStatesTable({ stepStates, stages }: StepStatesTableProps) {
  const entries = Object.entries(stepStates);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No step activity recorded yet.
      </p>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Step</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Completed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(([stepId, state]) => (
            <TableRow key={stepId}>
              <TableCell className="font-medium">
                {getStepName(stepId, stages)}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {STEP_STATUS_ICONS[state.status]}
                  <span className="text-sm">
                    {STEP_STATUS_LABELS[state.status]}
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatRelativeTime(state.completedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================================
// Metadata Section
// ============================================================================

interface MetadataSectionProps {
  instance: WorkflowInstance;
  stages?: WorkflowStage[];
}

function MetadataSection({ instance, stages }: MetadataSectionProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Template */}
      <div>
        <p className="text-sm text-muted-foreground">Template</p>
        <p className="font-medium">
          {instance.template?.name || "Unknown"} (v{instance.templateVersion})
        </p>
      </div>

      {/* Current Stage */}
      <div>
        <p className="text-sm text-muted-foreground">Current Stage</p>
        <p className="font-medium">
          {getStageName(instance.currentStage, stages)}
        </p>
      </div>

      {/* Started */}
      <div>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          Started
        </p>
        <p className="font-medium">{formatDateTime(instance.createdAt)}</p>
      </div>

      {/* Due Date */}
      <div>
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          Due Date
        </p>
        <p className="font-medium">{formatDateTime(instance.dueDate)}</p>
      </div>

      {/* Completed At (if applicable) */}
      {instance.completedAt && (
        <div>
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="font-medium">{formatDateTime(instance.completedAt)}</p>
        </div>
      )}

      {/* Outcome (if applicable) */}
      {instance.outcome && (
        <div>
          <p className="text-sm text-muted-foreground">Outcome</p>
          <p className="font-medium">{instance.outcome}</p>
        </div>
      )}

      {/* SLA Breached At (if applicable) */}
      {instance.slaBreachedAt && (
        <div className="col-span-2">
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" />
            SLA Breached
          </p>
          <p className="font-medium text-destructive">
            {formatDateTime(instance.slaBreachedAt)}
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function InstanceDetailDialog({
  open,
  onOpenChange,
  instance,
  stages,
}: InstanceDetailDialogProps) {
  // Mutations
  const pauseMutation = usePauseInstance();
  const resumeMutation = useResumeInstance();
  const cancelMutation = useCancelInstance();

  const isLoading =
    pauseMutation.isPending ||
    resumeMutation.isPending ||
    cancelMutation.isPending;

  // Action handlers
  const handlePause = useCallback(async () => {
    if (!instance) return;
    try {
      await pauseMutation.mutateAsync({ id: instance.id });
      toast.success("Instance paused");
    } catch (error) {
      console.warn("Failed to pause instance:", error);
      toast.error("Failed to pause instance");
    }
  }, [instance, pauseMutation]);

  const handleResume = useCallback(async () => {
    if (!instance) return;
    try {
      await resumeMutation.mutateAsync(instance.id);
      toast.success("Instance resumed");
    } catch (error) {
      console.warn("Failed to resume instance:", error);
      toast.error("Failed to resume instance");
    }
  }, [instance, resumeMutation]);

  const handleCancel = useCallback(async () => {
    if (!instance) return;
    try {
      await cancelMutation.mutateAsync({ id: instance.id });
      toast.success("Instance cancelled");
      onOpenChange(false);
    } catch (error) {
      console.warn("Failed to cancel instance:", error);
      toast.error("Failed to cancel instance");
    }
  }, [instance, cancelMutation, onOpenChange]);

  if (!instance) return null;

  const canPause = instance.status === "ACTIVE";
  const canResume = instance.status === "PAUSED";
  const canCancel =
    instance.status === "ACTIVE" || instance.status === "PAUSED";

  const completedStages = getCompletedStages(instance.currentStage, stages);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Instance Details</span>
            <Badge
              variant="secondary"
              className={cn(STATUS_COLORS[instance.status])}
            >
              {STATUS_LABELS[instance.status]}
            </Badge>
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(ENTITY_TYPE_COLORS[instance.entityType])}
            >
              {ENTITY_TYPE_LABELS[instance.entityType]}
            </Badge>
            <span className="font-mono text-xs">
              {instance.entityId.substring(0, 8)}...
            </span>
            <Button variant="ghost" size="icon" className="h-5 w-5" asChild>
              <a
                href={`/${instance.entityType.toLowerCase()}s/${instance.entityId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
            {instance.slaStatus && (
              <Badge
                variant="secondary"
                className={cn("ml-auto", SLA_STATUS_COLORS[instance.slaStatus])}
              >
                {SLA_STATUS_LABELS[instance.slaStatus]}
              </Badge>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Indicator */}
          {stages && stages.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3">Workflow Progress</h4>
              <WorkflowProgressIndicator
                stages={stages}
                currentStage={instance.currentStage}
                completedStages={completedStages}
              />
            </div>
          )}

          <Separator />

          {/* Metadata */}
          <div>
            <h4 className="text-sm font-medium mb-3">Details</h4>
            <MetadataSection instance={instance} stages={stages} />
          </div>

          <Separator />

          {/* Step States */}
          <div>
            <h4 className="text-sm font-medium mb-3">Step Activity</h4>
            <StepStatesTable stepStates={instance.stepStates} stages={stages} />
          </div>

          {/* Actions */}
          {(canPause || canResume || canCancel) && (
            <>
              <Separator />
              <div className="flex justify-end gap-2">
                {canPause && (
                  <Button
                    variant="outline"
                    onClick={handlePause}
                    disabled={isLoading}
                  >
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Instance
                  </Button>
                )}
                {canResume && (
                  <Button
                    variant="outline"
                    onClick={handleResume}
                    disabled={isLoading}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Resume Instance
                  </Button>
                )}
                {canCancel && (
                  <Button
                    variant="destructive"
                    onClick={handleCancel}
                    disabled={isLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Instance
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
