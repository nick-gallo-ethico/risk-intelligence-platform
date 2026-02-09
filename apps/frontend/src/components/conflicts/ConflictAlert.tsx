'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Building2,
  User,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  ArrowUpRight,
  Eye,
  XCircle,
  Briefcase,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ===========================================
// Types
// ===========================================

export type ConflictType =
  | 'VENDOR_MATCH'
  | 'APPROVAL_AUTHORITY'
  | 'PRIOR_CASE_HISTORY'
  | 'HRIS_MATCH'
  | 'GIFT_AGGREGATE'
  | 'RELATIONSHIP_PATTERN'
  | 'SELF_DEALING';

export type ConflictSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ConflictStatus = 'OPEN' | 'DISMISSED' | 'ESCALATED';

export type DismissalCategory =
  | 'FALSE_MATCH_DIFFERENT_ENTITY'
  | 'FALSE_MATCH_NAME_COLLISION'
  | 'ALREADY_REVIEWED'
  | 'PRE_APPROVED_EXCEPTION'
  | 'BELOW_THRESHOLD'
  | 'OTHER';

export type ExclusionScope = 'PERMANENT' | 'TIME_LIMITED' | 'ONE_TIME';

export interface VendorContext {
  vendorId?: string;
  vendorName: string;
  contractValue?: number;
  currency?: string;
  approvalLevel?: string;
  vendorStatus?: string;
  relationshipStartDate?: string;
}

export interface EmployeeContext {
  employeeId?: string;
  personId?: string;
  name: string;
  department?: string;
  jobTitle?: string;
  relationship?: string;
  managerId?: string;
  managerName?: string;
}

export interface DisclosureContext {
  priorDisclosureIds: string[];
  totalValue?: number;
  currency?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  disclosureTypes?: string[];
}

export interface CaseContext {
  caseIds: string[];
  caseTypes?: string[];
  outcomes?: string[];
  roles?: string[];
}

export interface MatchDetails {
  vendorContext?: VendorContext;
  employeeContext?: EmployeeContext;
  disclosureContext?: DisclosureContext;
  caseContext?: CaseContext;
}

export interface SeverityFactors {
  factors: string[];
  thresholdExceeded?: boolean;
  historicalOccurrences?: number;
  valueAtRisk?: number;
  matchConfidence?: number;
}

export interface ConflictAlertData {
  id: string;
  organizationId: string;
  disclosureId: string;
  conflictType: ConflictType;
  severity: ConflictSeverity;
  status: ConflictStatus;
  summary: string;
  matchedEntity: string;
  matchConfidence: number;
  matchDetails: MatchDetails;
  severityFactors?: SeverityFactors;
  dismissedCategory?: DismissalCategory;
  dismissedReason?: string;
  dismissedBy?: string;
  dismissedAt?: string;
  escalatedToCaseId?: string;
  exclusionId?: string;
  createdAt: string;
  updatedAt: string;
  dismissedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  escalatedCase?: {
    id: string;
    referenceNumber: string;
    status: string;
  };
  // Additional display context
  yourDisclosure?: {
    entityName: string;
    relationshipType: string;
    value?: number;
    currency?: string;
  };
}

export interface DismissConflictRequest {
  category: DismissalCategory;
  reason: string;
  createExclusion?: boolean;
  exclusionScope?: ExclusionScope;
  exclusionExpiresAt?: string;
  exclusionNotes?: string;
}

// ===========================================
// Constants
// ===========================================

const SEVERITY_COLORS: Record<ConflictSeverity, string> = {
  LOW: 'bg-green-100 text-green-800 border-green-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
};

const SEVERITY_LABELS: Record<ConflictSeverity, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

const CONFLICT_TYPE_ICONS: Record<ConflictType, React.ElementType> = {
  VENDOR_MATCH: Building2,
  APPROVAL_AUTHORITY: Briefcase,
  PRIOR_CASE_HISTORY: FileText,
  HRIS_MATCH: User,
  GIFT_AGGREGATE: DollarSign,
  RELATIONSHIP_PATTERN: User,
  SELF_DEALING: AlertTriangle,
};

const CONFLICT_TYPE_LABELS: Record<ConflictType, string> = {
  VENDOR_MATCH: 'Vendor Match',
  APPROVAL_AUTHORITY: 'Approval Authority',
  PRIOR_CASE_HISTORY: 'Prior Case History',
  HRIS_MATCH: 'Employee Match',
  GIFT_AGGREGATE: 'Gift Aggregate',
  RELATIONSHIP_PATTERN: 'Relationship Pattern',
  SELF_DEALING: 'Self Dealing',
};

const DISMISSAL_CATEGORY_LABELS: Record<DismissalCategory, string> = {
  FALSE_MATCH_DIFFERENT_ENTITY: 'Different Entity (same name)',
  FALSE_MATCH_NAME_COLLISION: 'Name Collision (common name)',
  ALREADY_REVIEWED: 'Already Reviewed',
  PRE_APPROVED_EXCEPTION: 'Pre-approved Exception',
  BELOW_THRESHOLD: 'Below Threshold',
  OTHER: 'Other',
};

const EXCLUSION_SCOPE_LABELS: Record<ExclusionScope, string> = {
  PERMANENT: 'Permanent',
  TIME_LIMITED: 'Time Limited',
  ONE_TIME: 'One Time Only',
};

const WHY_IT_MATTERS: Record<ConflictType, string> = {
  VENDOR_MATCH:
    'This entity matches an approved vendor. Disclosures involving vendors may require additional review to ensure there are no conflicts of interest.',
  APPROVAL_AUTHORITY:
    'You may have approval authority over this entity or relationship. This could create a conflict of interest in business decisions.',
  PRIOR_CASE_HISTORY:
    'This entity has been involved in prior compliance cases. This history may be relevant to your disclosure.',
  HRIS_MATCH:
    'This name matches an employee in the organization. Relationships with employees may require disclosure and review.',
  GIFT_AGGREGATE:
    'The cumulative value of gifts/entertainment with this entity exceeds or approaches policy thresholds.',
  RELATIONSHIP_PATTERN:
    'Multiple employees have disclosed relationships with this entity. This pattern may warrant additional review.',
  SELF_DEALING:
    'You have prior disclosures involving this entity. Review your relationship history for potential conflicts.',
};

// ===========================================
// Component
// ===========================================

interface ConflictAlertProps {
  alert: ConflictAlertData;
  onDismiss?: (id: string, request: DismissConflictRequest) => Promise<void>;
  onEscalate?: (id: string) => Promise<void>;
  onViewEntity?: (entityName: string) => void;
  onViewDetails?: (id: string) => void;
  isExpanded?: boolean;
  className?: string;
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (id: string, selected: boolean) => void;
}

/**
 * ConflictAlert component displays a detected conflict with full context.
 * Supports dismissal flow with categorization and optional exclusion creation.
 * Per RS.42-RS.43: Contextual conflict presentation with actionable options.
 */
export function ConflictAlert({
  alert,
  onDismiss,
  onEscalate,
  onViewEntity,
  onViewDetails,
  isExpanded: initialExpanded = false,
  className,
  selectable = false,
  selected = false,
  onSelectionChange,
}: ConflictAlertProps) {
  const [isExpanded, setIsExpanded] = React.useState(initialExpanded);
  const [isDismissDialogOpen, setIsDismissDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Dismissal form state
  const [dismissalCategory, setDismissalCategory] =
    React.useState<DismissalCategory | null>(null);
  const [dismissalReason, setDismissalReason] = React.useState('');
  const [createExclusion, setCreateExclusion] = React.useState(false);
  const [exclusionScope, setExclusionScope] =
    React.useState<ExclusionScope>('PERMANENT');

  const TypeIcon = CONFLICT_TYPE_ICONS[alert.conflictType];
  const isOpen = alert.status === 'OPEN';

  const handleDismissSubmit = async () => {
    if (!dismissalCategory || !dismissalReason.trim() || !onDismiss) return;

    setIsSubmitting(true);
    try {
      await onDismiss(alert.id, {
        category: dismissalCategory,
        reason: dismissalReason,
        createExclusion,
        exclusionScope: createExclusion ? exclusionScope : undefined,
      });
      setIsDismissDialogOpen(false);
      resetDismissalForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetDismissalForm = () => {
    setDismissalCategory(null);
    setDismissalReason('');
    setCreateExclusion(false);
    setExclusionScope('PERMANENT');
  };

  const handleEscalate = async () => {
    if (!onEscalate) return;
    setIsSubmitting(true);
    try {
      await onEscalate(alert.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (value: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Render match context based on conflict type
  const renderMatchContext = () => {
    const { matchDetails } = alert;

    if (matchDetails.vendorContext) {
      const ctx = matchDetails.vendorContext;
      return (
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{ctx.vendorName}</span>
            {ctx.vendorStatus && (
              <Badge variant="outline" className="text-xs">
                {ctx.vendorStatus}
              </Badge>
            )}
          </div>
          {ctx.contractValue && (
            <div className="ml-6 text-muted-foreground">
              Contract: {formatCurrency(ctx.contractValue, ctx.currency)}
            </div>
          )}
          {ctx.relationshipStartDate && (
            <div className="ml-6 text-muted-foreground">
              Since: {formatDate(ctx.relationshipStartDate)}
            </div>
          )}
        </div>
      );
    }

    if (matchDetails.employeeContext) {
      const ctx = matchDetails.employeeContext;
      return (
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{ctx.name}</span>
          </div>
          {ctx.jobTitle && (
            <div className="ml-6 text-muted-foreground">{ctx.jobTitle}</div>
          )}
          {ctx.department && (
            <div className="ml-6 text-muted-foreground">{ctx.department}</div>
          )}
        </div>
      );
    }

    if (matchDetails.disclosureContext) {
      const ctx = matchDetails.disclosureContext;
      return (
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {ctx.priorDisclosureIds.length} prior disclosure(s)
            </span>
          </div>
          {ctx.totalValue && (
            <div className="ml-6 text-muted-foreground">
              Total value: {formatCurrency(ctx.totalValue, ctx.currency)}
            </div>
          )}
          {ctx.dateRange && (
            <div className="ml-6 text-muted-foreground">
              Period: {formatDate(ctx.dateRange.start)} -{' '}
              {formatDate(ctx.dateRange.end)}
            </div>
          )}
        </div>
      );
    }

    if (matchDetails.caseContext) {
      const ctx = matchDetails.caseContext;
      return (
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              Involved in {ctx.caseIds.length} case(s)
            </span>
          </div>
          {ctx.roles && ctx.roles.length > 0 && (
            <div className="ml-6 text-muted-foreground">
              Roles: {ctx.roles.join(', ')}
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <>
      <Card
        className={cn(
          'transition-shadow hover:shadow-md',
          isOpen ? '' : 'opacity-75',
          selected && 'ring-2 ring-primary',
          className
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {selectable && (
                <Checkbox
                  checked={selected}
                  onCheckedChange={(checked) =>
                    onSelectionChange?.(alert.id, checked === true)
                  }
                  className="mt-1"
                />
              )}
              <div
                className={cn(
                  'rounded-lg p-2',
                  alert.severity === 'CRITICAL' && 'bg-red-100',
                  alert.severity === 'HIGH' && 'bg-orange-100',
                  alert.severity === 'MEDIUM' && 'bg-yellow-100',
                  alert.severity === 'LOW' && 'bg-green-100'
                )}
              >
                <TypeIcon
                  className={cn(
                    'h-5 w-5',
                    alert.severity === 'CRITICAL' && 'text-red-600',
                    alert.severity === 'HIGH' && 'text-orange-600',
                    alert.severity === 'MEDIUM' && 'text-yellow-600',
                    alert.severity === 'LOW' && 'text-green-600'
                  )}
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={cn(
                      'border px-2.5 py-0.5 text-xs font-semibold',
                      SEVERITY_COLORS[alert.severity]
                    )}
                  >
                    {SEVERITY_LABELS[alert.severity]}
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {CONFLICT_TYPE_LABELS[alert.conflictType]}
                  </Badge>
                  {alert.status === 'DISMISSED' && (
                    <Badge variant="outline" className="text-xs text-gray-500">
                      Dismissed
                    </Badge>
                  )}
                  {alert.status === 'ESCALATED' && (
                    <Badge
                      variant="outline"
                      className="text-xs text-blue-600 border-blue-200"
                    >
                      Escalated
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-sm font-medium">{alert.summary}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {alert.matchConfidence}% confidence match
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4 pt-0">
            {/* Your Disclosure Section */}
            {alert.yourDisclosure && (
              <div className="rounded-lg bg-blue-50 p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-blue-700 mb-2">
                  Your Disclosure
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="font-medium">
                    {alert.yourDisclosure.entityName}
                  </div>
                  <div className="text-muted-foreground">
                    {alert.yourDisclosure.relationshipType}
                  </div>
                  {alert.yourDisclosure.value && (
                    <div className="text-muted-foreground">
                      Value:{' '}
                      {formatCurrency(
                        alert.yourDisclosure.value,
                        alert.yourDisclosure.currency
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Matched Against Section */}
            <div className="rounded-lg bg-gray-50 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-700 mb-2">
                Matched Against
              </h4>
              <div className="space-y-2">
                <div className="font-medium text-sm">{alert.matchedEntity}</div>
                {renderMatchContext()}
              </div>
            </div>

            {/* Why This Matters Section */}
            <div className="rounded-lg bg-amber-50 p-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-2">
                Why This Matters
              </h4>
              <p className="text-sm text-amber-900">
                {WHY_IT_MATTERS[alert.conflictType]}
              </p>
            </div>

            {/* Severity Factors */}
            {alert.severityFactors && alert.severityFactors.factors.length > 0 && (
              <div className="text-sm">
                <h4 className="font-medium mb-1">Severity Factors</h4>
                <ul className="list-disc list-inside text-muted-foreground">
                  {alert.severityFactors.factors.map((factor, i) => (
                    <li key={i}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Dismissal Info (if dismissed) */}
            {alert.status === 'DISMISSED' && alert.dismissedByUser && (
              <div className="rounded-lg border border-gray-200 p-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <XCircle className="h-4 w-4" />
                  <span>
                    Dismissed by {alert.dismissedByUser.firstName}{' '}
                    {alert.dismissedByUser.lastName}
                  </span>
                  {alert.dismissedAt && (
                    <span className="text-muted-foreground">
                      on {formatDate(alert.dismissedAt)}
                    </span>
                  )}
                </div>
                {alert.dismissedCategory && (
                  <div className="mt-1 ml-6 text-muted-foreground">
                    Category: {DISMISSAL_CATEGORY_LABELS[alert.dismissedCategory]}
                  </div>
                )}
                {alert.dismissedReason && (
                  <div className="mt-1 ml-6 text-muted-foreground">
                    Reason: {alert.dismissedReason}
                  </div>
                )}
              </div>
            )}

            {/* Escalation Info (if escalated) */}
            {alert.status === 'ESCALATED' && alert.escalatedCase && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm">
                <div className="flex items-center gap-2 text-blue-700">
                  <ArrowUpRight className="h-4 w-4" />
                  <span>
                    Escalated to Case {alert.escalatedCase.referenceNumber}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {alert.escalatedCase.status}
                  </Badge>
                </div>
              </div>
            )}

            {/* Actions */}
            {isOpen && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                {onViewDetails && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(alert.id)}
                  >
                    <Eye className="mr-1.5 h-4 w-4" />
                    View Details
                  </Button>
                )}
                {onDismiss && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDismissDialogOpen(true)}
                    disabled={isSubmitting}
                  >
                    <XCircle className="mr-1.5 h-4 w-4" />
                    Dismiss
                  </Button>
                )}
                {onEscalate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEscalate}
                    disabled={isSubmitting}
                  >
                    <ArrowUpRight className="mr-1.5 h-4 w-4" />
                    Escalate
                  </Button>
                )}
                {onViewEntity && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewEntity(alert.matchedEntity)}
                    className="ml-auto"
                  >
                    <ExternalLink className="mr-1.5 h-4 w-4" />
                    View Entity
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Dismissal Dialog */}
      <Dialog open={isDismissDialogOpen} onOpenChange={setIsDismissDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dismiss Conflict</DialogTitle>
            <DialogDescription>
              Select a category and provide a reason for dismissing this
              conflict alert.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Category Selection */}
            <div className="space-y-2">
              <Label>Dismissal Category</Label>
              <div className="space-y-2">
                {Object.entries(DISMISSAL_CATEGORY_LABELS).map(
                  ([value, label]) => (
                    <div
                      key={value}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors',
                        dismissalCategory === value
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      )}
                      onClick={() =>
                        setDismissalCategory(value as DismissalCategory)
                      }
                    >
                      <div
                        className={cn(
                          'h-4 w-4 rounded-full border-2',
                          dismissalCategory === value
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground'
                        )}
                      >
                        {dismissalCategory === value && (
                          <Check className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm">{label}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Dismissal</Label>
              <Textarea
                id="reason"
                placeholder="Explain why this conflict is being dismissed..."
                value={dismissalReason}
                onChange={(e) => setDismissalReason(e.target.value)}
                rows={3}
              />
            </div>

            {/* Create Exclusion */}
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="createExclusion"
                  checked={createExclusion}
                  onCheckedChange={(checked) =>
                    setCreateExclusion(checked === true)
                  }
                />
                <Label htmlFor="createExclusion" className="cursor-pointer">
                  Don&apos;t flag this combination again
                </Label>
              </div>

              {createExclusion && (
                <div className="ml-6 space-y-2">
                  <Label className="text-sm">Exclusion Scope</Label>
                  <Select
                    value={exclusionScope}
                    onValueChange={(v) => setExclusionScope(v as ExclusionScope)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(EXCLUSION_SCOPE_LABELS).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {exclusionScope === 'PERMANENT' &&
                      'This exclusion will apply permanently.'}
                    {exclusionScope === 'TIME_LIMITED' &&
                      'You can set an expiration date after creation.'}
                    {exclusionScope === 'ONE_TIME' &&
                      'This exclusion will only apply to the next match.'}
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDismissDialogOpen(false);
                resetDismissalForm();
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDismissSubmit}
              disabled={
                !dismissalCategory || !dismissalReason.trim() || isSubmitting
              }
            >
              {isSubmitting ? 'Dismissing...' : 'Dismiss Conflict'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export { SEVERITY_COLORS, CONFLICT_TYPE_LABELS, DISMISSAL_CATEGORY_LABELS };
