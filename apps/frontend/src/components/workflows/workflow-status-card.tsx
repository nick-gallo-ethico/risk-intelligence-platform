"use client";

/**
 * Workflow Status Card
 *
 * A reusable card component that displays workflow progress for any entity.
 * Shows:
 * - Current stage and progress indicator
 * - SLA status (on track, warning, overdue)
 * - Started time (relative)
 * - Allowed transitions with action buttons
 * - Resume/Pause controls for paused workflows
 * - Outcome display for completed workflows
 *
 * Used on:
 * - Case detail pages
 * - Policy detail pages
 * - Any entity detail page with workflow support
 */

import React, { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Play, Pause, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  useWorkflowInstanceByEntity,
  useWorkflowTemplate,
  useAllowedTransitions,
  useTransitionInstance,
  useResumeInstance,
  usePauseInstance,
} from "@/hooks/use-workflows";
import { WorkflowProgressIndicator } from "@/components/workflows/workflow-progress-indicator";
import type {
  WorkflowEntityType,
  WorkflowInstance,
  WorkflowTemplate,
  AllowedTransition,
  WorkflowStage,
} from "@/types/workflow";
import {
  WORKFLOW_INSTANCE_STATUS_LABELS,
  WORKFLOW_INSTANCE_STATUS_COLORS,
  SLA_STATUS_LABELS,
  SLA_STATUS_COLORS,
} from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

export interface WorkflowStatusCardProps {
  /** Type of entity this workflow is attached to */
  entityType: WorkflowEntityType;
  /** ID of the entity */
  entityId: string;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

interface StatusBadgeProps {
  status: WorkflowInstance["status"];
}

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn("text-xs", WORKFLOW_INSTANCE_STATUS_COLORS[status])}
    >
      {WORKFLOW_INSTANCE_STATUS_LABELS[status]}
    </Badge>
  );
}

interface SlaBadgeProps {
  slaStatus: WorkflowInstance["slaStatus"];
}

function SlaBadge({ slaStatus }: SlaBadgeProps) {
  if (!slaStatus) return null;

  return (
    <Badge
      variant="secondary"
      className={cn("text-xs", SLA_STATUS_COLORS[slaStatus])}
    >
      {SLA_STATUS_LABELS[slaStatus]}
    </Badge>
  );
}

interface TransitionButtonProps {
  transition: AllowedTransition;
  stageName: string;
  onTransition: (toStage: string, reason?: string) => void;
  isLoading: boolean;
}

function TransitionButton({
  transition,
  stageName,
  onTransition,
  isLoading,
}: TransitionButtonProps) {
  const [showReasonDialog, setShowReasonDialog] = useState(false);
  const [reason, setReason] = useState("");

  const handleClick = () => {
    if (transition.requiresReason) {
      setShowReasonDialog(true);
    } else {
      onTransition(transition.to);
    }
  };

  const handleSubmitWithReason = () => {
    onTransition(transition.to, reason);
    setShowReasonDialog(false);
    setReason("");
  };

  const label = transition.label || `Move to ${stageName}`;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isLoading}
        className="justify-between"
      >
        <span>{label}</span>
        {isLoading ? (
          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
        ) : (
          <ChevronRight className="h-4 w-4 ml-2" />
        )}
      </Button>

      <Dialog open={showReasonDialog} onOpenChange={setShowReasonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reason Required</DialogTitle>
            <DialogDescription>
              Please provide a reason for this transition to {stageName}.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter reason..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReasonDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitWithReason}
              disabled={!reason.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function WorkflowStatusCard({
  entityType,
  entityId,
  className,
}: WorkflowStatusCardProps) {
  // Fetch workflow instance for this entity
  const {
    data: instance,
    isLoading: instanceLoading,
    error: instanceError,
  } = useWorkflowInstanceByEntity(entityType, entityId);

  // Fetch template for the instance
  const { data: template, isLoading: templateLoading } = useWorkflowTemplate(
    instance?.templateId,
  );

  // Fetch allowed transitions for active instances
  const { data: allowedTransitions } = useAllowedTransitions(
    instance?.status === "ACTIVE" ? instance?.id : undefined,
  );

  // Mutations
  const transitionMutation = useTransitionInstance();
  const resumeMutation = useResumeInstance();
  const pauseMutation = usePauseInstance();

  // Handle transition
  const handleTransition = (toStage: string, reason?: string) => {
    if (!instance) return;

    transitionMutation.mutate(
      { id: instance.id, dto: { toStage, reason } },
      {
        onSuccess: (result) => {
          if (result.success) {
            const stageName =
              template?.stages.find((s) => s.id === toStage)?.name || toStage;
            toast.success(`Moved to ${stageName}`);
          } else {
            toast.error(result.error || "Could not complete transition");
          }
        },
        onError: () => {
          toast.error("Failed to transition workflow");
        },
      },
    );
  };

  // Handle resume
  const handleResume = () => {
    if (!instance) return;

    resumeMutation.mutate(instance.id, {
      onSuccess: () => {
        toast.success("Workflow resumed");
      },
      onError: () => {
        toast.error("Failed to resume workflow");
      },
    });
  };

  // Handle pause
  const handlePause = () => {
    if (!instance) return;

    pauseMutation.mutate(
      { id: instance.id },
      {
        onSuccess: () => {
          toast.success("Workflow paused");
        },
        onError: () => {
          toast.error("Failed to pause workflow");
        },
      },
    );
  };

  // Loading state
  if (instanceLoading || templateLoading) {
    return (
      <Card className={cn("animate-pulse", className)}>
        <CardHeader className="pb-2">
          <div className="h-5 w-24 bg-muted rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-8 bg-muted rounded" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No instance - render nothing
  if (!instance || instanceError) {
    return null;
  }

  // Get template stages
  const stages: WorkflowStage[] = template?.stages || [];

  // Find current stage info
  const currentStageInfo = stages.find((s) => s.id === instance.currentStage);

  // Calculate completed stages (stages before current in display order)
  const sortedStages = [...stages].sort((a, b) => {
    const orderA = a.display?.sortOrder ?? 0;
    const orderB = b.display?.sortOrder ?? 0;
    return orderA - orderB;
  });

  const currentIndex = sortedStages.findIndex(
    (s) => s.id === instance.currentStage,
  );
  const completedStages = sortedStages.slice(0, currentIndex).map((s) => s.id);

  // Build stage name map for transitions
  const stageNameMap = new Map(stages.map((s) => [s.id, s.name]));

  const isTransitioning =
    transitionMutation.isPending ||
    resumeMutation.isPending ||
    pauseMutation.isPending;

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Workflow</CardTitle>
          <StatusBadge status={instance.status} />
        </div>
        {template && (
          <CardDescription className="text-xs">{template.name}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Indicator */}
        {stages.length > 0 && (
          <WorkflowProgressIndicator
            stages={stages}
            currentStage={instance.currentStage}
            completedStages={completedStages}
            compact
          />
        )}

        {/* Current Stage Details */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {currentStageInfo?.name || instance.currentStage}
            </span>
            {instance.slaStatus && <SlaBadge slaStatus={instance.slaStatus} />}
          </div>
          <p className="text-xs text-muted-foreground">
            Started{" "}
            {formatDistanceToNow(new Date(instance.createdAt), {
              addSuffix: true,
            })}
          </p>
        </div>

        {/* Active Instance Actions */}
        {instance.status === "ACTIVE" && (
          <div className="space-y-2">
            {/* Allowed Transitions */}
            {allowedTransitions && allowedTransitions.length > 0 && (
              <div className="space-y-1.5">
                {allowedTransitions.map((transition) => (
                  <TransitionButton
                    key={transition.to}
                    transition={transition}
                    stageName={stageNameMap.get(transition.to) || transition.to}
                    onTransition={handleTransition}
                    isLoading={isTransitioning}
                  />
                ))}
              </div>
            )}

            {/* Pause Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePause}
              disabled={isTransitioning}
              className="w-full justify-start text-muted-foreground"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause Workflow
            </Button>
          </div>
        )}

        {/* Paused Instance Actions */}
        {instance.status === "PAUSED" && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResume}
            disabled={isTransitioning}
            className="w-full"
          >
            {isTransitioning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Resume Workflow
          </Button>
        )}

        {/* Completed Instance */}
        {instance.status === "COMPLETED" && (
          <div className="rounded-md bg-green-50 p-3 dark:bg-green-950">
            <p className="text-sm text-green-800 dark:text-green-200">
              {instance.outcome || "Workflow completed successfully"}
            </p>
            {instance.completedAt && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                Completed{" "}
                {formatDistanceToNow(new Date(instance.completedAt), {
                  addSuffix: true,
                })}
              </p>
            )}
          </div>
        )}

        {/* Cancelled Instance */}
        {instance.status === "CANCELLED" && (
          <div className="rounded-md bg-red-50 p-3 dark:bg-red-950">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">
                Workflow cancelled
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
