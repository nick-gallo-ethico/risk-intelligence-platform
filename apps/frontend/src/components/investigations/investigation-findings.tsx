'use client';

import { Badge } from '@/components/ui/badge';
import { FileText, Target, Lightbulb, AlertTriangle, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Investigation, InvestigationOutcome } from '@/types/investigation';

interface InvestigationFindingsProps {
  investigation: Investigation;
}

/**
 * Outcome badge color mapping
 */
const OUTCOME_COLORS: Record<InvestigationOutcome, { bg: string; text: string }> = {
  SUBSTANTIATED: { bg: 'bg-red-100', text: 'text-red-700' },
  UNSUBSTANTIATED: { bg: 'bg-green-100', text: 'text-green-700' },
  INCONCLUSIVE: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  POLICY_VIOLATION: { bg: 'bg-red-100', text: 'text-red-700' },
  NO_VIOLATION: { bg: 'bg-green-100', text: 'text-green-700' },
  INSUFFICIENT_EVIDENCE: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

/**
 * Format date for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Section component for findings display
 */
function FindingsSection({
  icon: Icon,
  title,
  children,
  isEmpty = false,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  isEmpty?: boolean;
}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-sm font-medium text-gray-900">{title}</h4>
      </div>
      <div className={cn('text-sm', isEmpty && 'text-muted-foreground italic')}>
        {children}
      </div>
    </div>
  );
}

/**
 * Findings tab content - shows investigation findings and outcome
 */
export function InvestigationFindings({ investigation }: InvestigationFindingsProps) {
  const hasFindings =
    investigation.findingsSummary ||
    investigation.outcome ||
    investigation.rootCause ||
    investigation.lessonsLearned;

  if (!hasFindings) {
    return (
      <div className="py-8 text-center text-muted-foreground border border-dashed rounded-lg mt-4">
        <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
        <p className="text-sm font-medium">No findings recorded</p>
        <p className="text-xs mt-1">
          Findings will appear here once the investigation is complete
        </p>
      </div>
    );
  }

  const outcomeColors = investigation.outcome
    ? OUTCOME_COLORS[investigation.outcome]
    : null;

  return (
    <div className="space-y-4 py-4">
      {/* Outcome */}
      {investigation.outcome && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Outcome</div>
            <Badge
              className={cn(
                'text-sm font-medium border-0',
                outcomeColors?.bg,
                outcomeColors?.text
              )}
            >
              {investigation.outcome.replace(/_/g, ' ')}
            </Badge>
          </div>
          {investigation.findingsDate && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground mb-1">Recorded</div>
              <div className="text-sm flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(investigation.findingsDate)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Findings Summary */}
      <FindingsSection
        icon={FileText}
        title="Findings Summary"
        isEmpty={!investigation.findingsSummary}
      >
        {investigation.findingsSummary || 'No summary provided'}
      </FindingsSection>

      {/* Detailed Findings */}
      {investigation.findingsDetail && (
        <FindingsSection icon={FileText} title="Detailed Findings">
          <div
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: investigation.findingsDetail }}
          />
        </FindingsSection>
      )}

      {/* Root Cause */}
      <FindingsSection
        icon={Target}
        title="Root Cause"
        isEmpty={!investigation.rootCause}
      >
        {investigation.rootCause || 'No root cause identified'}
      </FindingsSection>

      {/* Lessons Learned */}
      <FindingsSection
        icon={Lightbulb}
        title="Lessons Learned"
        isEmpty={!investigation.lessonsLearned}
      >
        {investigation.lessonsLearned || 'No lessons learned documented'}
      </FindingsSection>

      {/* Closure Notes */}
      {investigation.closureNotes && (
        <FindingsSection icon={AlertTriangle} title="Closure Notes">
          {investigation.closureNotes}
        </FindingsSection>
      )}

      {/* Closed by info */}
      {investigation.closedAt && (
        <div className="text-xs text-muted-foreground text-right">
          Closed on {formatDate(investigation.closedAt)}
        </div>
      )}
    </div>
  );
}
