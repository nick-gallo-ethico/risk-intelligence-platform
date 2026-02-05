'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  ClipboardCheck,
  Plus,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { RemediationStepCard } from './remediation-step-card';
import {
  useCaseRemediation,
  useReorderSteps,
  useCompleteStep,
  useSkipStep,
  useActivateRemediationPlan,
} from '@/hooks/use-case-remediation';
import type {
  RemediationPlan,
  RemediationPlanStatus,
  RemediationStep,
} from '@/types/remediation';

interface RemediationTabProps {
  caseId: string;
}

/**
 * Get badge styling for plan status.
 */
function getPlanStatusBadge(status: RemediationPlanStatus): {
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  label: string;
  className: string;
} {
  switch (status) {
    case 'DRAFT':
      return {
        variant: 'secondary',
        label: 'Draft',
        className: 'bg-gray-100 text-gray-700',
      };
    case 'ACTIVE':
      return {
        variant: 'default',
        label: 'Active',
        className: 'bg-blue-100 text-blue-700',
      };
    case 'COMPLETED':
      return {
        variant: 'default',
        label: 'Completed',
        className: 'bg-green-100 text-green-700',
      };
    case 'CANCELLED':
      return {
        variant: 'secondary',
        label: 'Cancelled',
        className: 'bg-gray-100 text-gray-500',
      };
    default:
      return {
        variant: 'outline',
        label: status,
        className: '',
      };
  }
}

/**
 * Single plan card with collapsible steps.
 */
interface PlanCardProps {
  plan: RemediationPlan;
  caseId: string;
  isExpanded: boolean;
  onToggle: () => void;
}

function PlanCard({ plan, caseId, isExpanded, onToggle }: PlanCardProps) {
  const reorderMutation = useReorderSteps(plan.id, caseId);
  const completeMutation = useCompleteStep(caseId);
  const skipMutation = useSkipStep(caseId);
  const activateMutation = useActivateRemediationPlan();

  const [localSteps, setLocalSteps] = useState<RemediationStep[]>(plan.steps);

  // Update local steps when plan changes
  if (plan.steps !== localSteps && plan.steps.length !== localSteps.length) {
    setLocalSteps(plan.steps);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = localSteps.findIndex((s) => s.id === active.id);
      const newIndex = localSteps.findIndex((s) => s.id === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const newSteps = arrayMove(localSteps, oldIndex, newIndex);
      setLocalSteps(newSteps);

      const stepOrders = newSteps.map((s, i) => ({ id: s.id, order: i }));
      reorderMutation.mutate(stepOrders);
    },
    [localSteps, reorderMutation]
  );

  const handleCompleteStep = useCallback(
    (stepId: string) => {
      completeMutation.mutate({ stepId });
    },
    [completeMutation]
  );

  const handleSkipStep = useCallback(
    (stepId: string) => {
      // For now, use a default reason - in production, show a dialog
      skipMutation.mutate({ stepId, reason: 'Skipped by user' });
    },
    [skipMutation]
  );

  const handleActivate = useCallback(() => {
    activateMutation.mutate(plan.id);
  }, [activateMutation, plan.id]);

  const statusBadge = getPlanStatusBadge(plan.status);
  const progressPercent =
    plan.totalSteps > 0
      ? Math.round((plan.completedSteps / plan.totalSteps) * 100)
      : 0;

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <Collapsible open={isExpanded} onOpenChange={onToggle}>
        {/* Plan Header */}
        <div className="p-4 flex items-center gap-3">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate">{plan.title}</h3>
              <Badge variant={statusBadge.variant} className={statusBadge.className}>
                {statusBadge.label}
              </Badge>
            </div>

            {plan.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                {plan.description}
              </p>
            )}

            {/* Progress */}
            <div className="flex items-center gap-3 mt-2">
              <Progress value={progressPercent} className="h-1.5 flex-1 max-w-[200px]" />
              <span className="text-xs text-gray-500">
                {plan.completedSteps}/{plan.totalSteps} steps
              </span>
              {plan.overdueSteps > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {plan.overdueSteps} overdue
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {plan.status === 'DRAFT' && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleActivate}
                disabled={activateMutation.isPending}
              >
                <PlayCircle className="h-4 w-4 mr-1" />
                Activate
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <a href={`/remediation/${plan.id}`}>
                <ExternalLink className="h-4 w-4 mr-1" />
                Details
              </a>
            </Button>
          </div>
        </div>

        {/* Steps List */}
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0">
            <div className="border-t pt-4">
              {localSteps.length === 0 ? (
                <div className="text-center py-6 text-gray-400 border border-dashed rounded-md">
                  <p className="text-sm">No steps defined</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Step
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={localSteps.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {localSteps.map((step) => (
                        <RemediationStepCard
                          key={step.id}
                          step={step}
                          onComplete={handleCompleteStep}
                          onSkip={handleSkipStep}
                        />
                      ))}
                    </div>
                  </SortableContext>
                  <DragOverlay>
                    {/* Optional: render a preview of the dragged item */}
                  </DragOverlay>
                </DndContext>
              )}

              {localSteps.length > 0 && (
                <Button variant="outline" size="sm" className="w-full mt-3">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Step
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * Remediation tab content - displays remediation plans for a case.
 */
export function RemediationTab({ caseId }: RemediationTabProps) {
  const { data: plans, isLoading, error } = useCaseRemediation(caseId);
  const [expandedPlanIds, setExpandedPlanIds] = useState<Set<string>>(new Set());

  const togglePlan = useCallback((planId: string) => {
    setExpandedPlanIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  }, []);

  // Expand first plan by default when data loads
  if (plans && plans.length > 0 && expandedPlanIds.size === 0) {
    setExpandedPlanIds(new Set([plans[0].id]));
  }

  if (isLoading) {
    return <RemediationTabSkeleton />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-red-500 border border-dashed border-red-200 rounded-md">
          <p className="text-sm">Failed to load remediation plans</p>
          <p className="text-xs mt-1 text-red-400">
            {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  const hasPlans = plans && plans.length > 0;

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">
          Remediation Plans
          {hasPlans && (
            <span className="ml-2 text-xs font-normal text-gray-500">
              ({plans.length})
            </span>
          )}
        </h2>
        {hasPlans && (
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Create Plan
          </Button>
        )}
      </div>

      {/* Content */}
      {hasPlans ? (
        <div className="space-y-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              caseId={caseId}
              isExpanded={expandedPlanIds.has(plan.id)}
              onToggle={() => togglePlan(plan.id)}
            />
          ))}
        </div>
      ) : (
        <div
          className="text-center py-12 text-gray-400 border border-dashed rounded-md"
          data-testid="empty-state"
        >
          <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <h4 className="text-sm font-medium text-gray-900 mb-1">
            No remediation plans
          </h4>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Create a plan to track corrective actions and ensure compliance issues
            are addressed.
          </p>
          <Button variant="outline" size="sm" className="mt-4">
            <Plus className="h-4 w-4 mr-1" />
            Create Plan
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Skeleton loader for RemediationTab.
 */
function RemediationTabSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-8 w-28" />
      </div>
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="h-6 w-6" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-64" />
                <div className="flex items-center gap-3">
                  <Skeleton className="h-1.5 w-[200px]" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RemediationTab;
