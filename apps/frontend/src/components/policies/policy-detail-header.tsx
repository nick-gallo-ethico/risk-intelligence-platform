'use client';

import { format, isPast } from 'date-fns';
import { AlertTriangle, Edit, Send, Upload, Clock, Shield, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { policiesApi } from '@/services/policies';
import type { Policy, PolicyStatus, PolicyType } from '@/types/policy';
import { POLICY_TYPE_LABELS, POLICY_STATUS_LABELS } from '@/types/policy';

// Status badge colors
const STATUS_COLORS: Record<PolicyStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 border-gray-200',
  PENDING_APPROVAL: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  APPROVED: 'bg-blue-100 text-blue-800 border-blue-200',
  PUBLISHED: 'bg-green-100 text-green-800 border-green-200',
  RETIRED: 'bg-red-100 text-red-800 border-red-200',
};

interface PolicyDetailHeaderProps {
  policy: Policy;
  onEdit: () => void;
  onPublish: () => void;
  onRetire: () => void;
  onSubmitForApproval: () => void;
  onCreateAttestation: () => void;
  onCancelApproval?: () => void;
}

/**
 * Policy detail header component.
 *
 * Displays policy metadata, status, and action buttons based on status.
 * Shows review date warning if policy is overdue for review.
 * Shows approval workflow status if pending approval.
 */
export function PolicyDetailHeader({
  policy,
  onEdit,
  onPublish,
  onRetire,
  onSubmitForApproval,
  onCreateAttestation,
  onCancelApproval,
}: PolicyDetailHeaderProps) {
  const isReviewOverdue = policy.reviewDate && isPast(new Date(policy.reviewDate));

  // Fetch approval status if pending
  const { data: approvalStatus, isLoading: isLoadingApproval } = useQuery({
    queryKey: ['policy-approval-status', policy.id],
    queryFn: () => policiesApi.getApprovalStatus(policy.id),
    enabled: policy.status === 'PENDING_APPROVAL',
  });

  // Determine available actions based on status
  const canEdit = policy.status === 'DRAFT' || policy.status === 'PUBLISHED';
  const canSubmitForApproval = policy.status === 'DRAFT';
  const canPublish = policy.status === 'APPROVED';
  const canRetire = policy.status === 'PUBLISHED';
  const canCreateAttestation = policy.status === 'PUBLISHED';
  const canCancelApproval = policy.status === 'PENDING_APPROVAL';

  return (
    <div className="space-y-4">
      {/* Header Row */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          {/* Title and Status */}
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold">{policy.title}</h1>
            <Badge
              className={cn(
                'border',
                STATUS_COLORS[policy.status]
              )}
            >
              {POLICY_STATUS_LABELS[policy.status]}
            </Badge>
          </div>

          {/* Metadata Row */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              v{policy.currentVersion > 0 ? policy.currentVersion : 'Draft'}
            </span>
            <span>{POLICY_TYPE_LABELS[policy.policyType]}</span>
            {policy.owner && (
              <span>
                Owner: {policy.owner.firstName} {policy.owner.lastName}
              </span>
            )}
            {policy.effectiveDate && (
              <span>
                Effective: {format(new Date(policy.effectiveDate), 'MMM d, yyyy')}
              </span>
            )}
            {policy.reviewDate && (
              <span className={cn(isReviewOverdue && 'text-destructive font-medium')}>
                Review: {format(new Date(policy.reviewDate), 'MMM d, yyyy')}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          )}
          {canSubmitForApproval && (
            <Button variant="outline" onClick={onSubmitForApproval}>
              <Send className="h-4 w-4 mr-2" />
              Submit for Approval
            </Button>
          )}
          {canPublish && (
            <Button onClick={onPublish}>
              <Upload className="h-4 w-4 mr-2" />
              Publish
            </Button>
          )}
          {canCreateAttestation && (
            <Button variant="outline" onClick={onCreateAttestation}>
              <Shield className="h-4 w-4 mr-2" />
              Create Attestation Campaign
            </Button>
          )}
          {canRetire && (
            <Button variant="outline" className="text-destructive" onClick={onRetire}>
              <Clock className="h-4 w-4 mr-2" />
              Retire
            </Button>
          )}
        </div>
      </div>

      {/* Review Date Warning */}
      {isReviewOverdue && (
        <Alert variant="warning">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This policy is due for review. The review date was{' '}
            {format(new Date(policy.reviewDate!), 'MMMM d, yyyy')}.
          </AlertDescription>
        </Alert>
      )}

      {/* Approval Workflow Status */}
      {policy.status === 'PENDING_APPROVAL' && (
        <ApprovalStatusCard
          approvalStatus={approvalStatus}
          isLoading={isLoadingApproval}
          onCancel={canCancelApproval ? onCancelApproval : undefined}
        />
      )}
    </div>
  );
}

interface ApprovalStatusCardProps {
  approvalStatus?: {
    currentStep?: {
      name: string;
      stepType: string;
      assignees: Array<{ id: string; name: string; email: string }>;
      status: string;
    };
    workflowInstance?: {
      id: string;
      status: string;
      currentStepIndex: number;
      submittedAt: string;
    };
  };
  isLoading: boolean;
  onCancel?: () => void;
}

function ApprovalStatusCard({
  approvalStatus,
  isLoading,
  onCancel,
}: ApprovalStatusCardProps) {
  if (isLoading) {
    return (
      <Card className="border-yellow-200 bg-yellow-50/50">
        <CardContent className="py-4">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardContent>
      </Card>
    );
  }

  const currentStep = approvalStatus?.currentStep;
  const workflow = approvalStatus?.workflowInstance;

  return (
    <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-900/10">
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="font-medium text-yellow-800 dark:text-yellow-200">
                Pending Approval
              </span>
            </div>
            {currentStep && (
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <span className="font-medium">Current step:</span> {currentStep.name}
              </div>
            )}
            {currentStep?.assignees && currentStep.assignees.length > 0 && (
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                <span className="font-medium">Pending reviewers:</span>{' '}
                {currentStep.assignees.map((a) => a.name).join(', ')}
              </div>
            )}
            {workflow?.submittedAt && (
              <div className="text-sm text-muted-foreground">
                Submitted {format(new Date(workflow.submittedAt), 'MMM d, yyyy h:mm a')}
              </div>
            )}
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-yellow-700 hover:text-yellow-800 hover:bg-yellow-100"
            >
              <X className="h-4 w-4 mr-1" />
              Cancel Approval
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
