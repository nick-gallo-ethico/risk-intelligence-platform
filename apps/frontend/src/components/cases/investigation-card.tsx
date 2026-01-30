'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, User, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Investigation, InvestigationStatus, SlaStatus } from '@/types/investigation';

interface InvestigationCardProps {
  investigation: Investigation;
  onClick?: (investigation: Investigation) => void;
}

/**
 * Status badge color mapping per PROMPT.md specification.
 */
const STATUS_COLORS: Record<InvestigationStatus, { bg: string; text: string }> = {
  NEW: { bg: 'bg-gray-100', text: 'text-gray-700' },
  ASSIGNED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  INVESTIGATING: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  PENDING_REVIEW: { bg: 'bg-orange-100', text: 'text-orange-700' },
  CLOSED: { bg: 'bg-green-100', text: 'text-green-700' },
  ON_HOLD: { bg: 'bg-red-100', text: 'text-red-700' },
};

/**
 * SLA status color mapping per PROMPT.md specification.
 */
const SLA_COLORS: Record<SlaStatus, { bg: string; dot: string }> = {
  ON_TRACK: { bg: 'bg-green-100', dot: 'bg-green-500' },
  WARNING: { bg: 'bg-yellow-100', dot: 'bg-yellow-500' },
  OVERDUE: { bg: 'bg-red-100', dot: 'bg-red-500' },
};

/**
 * Format date for display.
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get initials from user name.
 */
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function InvestigationCard({ investigation, onClick }: InvestigationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusColors = STATUS_COLORS[investigation.status];
  const slaColors = SLA_COLORS[investigation.slaStatus];

  const handleClick = () => {
    setIsExpanded(!isExpanded);
    if (onClick) {
      onClick(investigation);
    }
  };

  const investigator = investigation.primaryInvestigator;
  const hasFindings = investigation.status === 'CLOSED' && investigation.findingsSummary;

  return (
    <div
      className="border rounded-lg bg-white hover:shadow-sm transition-shadow cursor-pointer"
      onClick={handleClick}
      data-testid="investigation-card"
    >
      {/* Card Header */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          {/* Investigation Number & Status */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="font-semibold text-gray-900">
              #{investigation.investigationNumber}
            </span>
            <Badge
              className={cn(
                'text-xs font-medium border-0',
                statusColors.bg,
                statusColors.text
              )}
              data-testid="status-badge"
            >
              {investigation.status.replace('_', ' ')}
            </Badge>
          </div>

          {/* Expand/Collapse Icon */}
          <button
            className="p-1 hover:bg-gray-100 rounded"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>

        {/* Investigation Type & Department */}
        <div className="mt-1 text-xs text-gray-500">
          {investigation.investigationType}
          {investigation.department && ` · ${investigation.department}`}
        </div>

        {/* Primary Investigator */}
        {investigator && (
          <div className="mt-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">
              {getInitials(investigator.firstName, investigator.lastName)}
            </div>
            <span className="text-sm text-gray-700">
              {investigator.firstName} {investigator.lastName}
            </span>
          </div>
        )}

        {/* Due Date & SLA Status */}
        <div className="mt-2 flex items-center justify-between">
          {investigation.dueDate && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(investigation.dueDate)}</span>
            </div>
          )}

          {/* SLA Indicator */}
          <div
            className={cn(
              'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs',
              slaColors.bg
            )}
            data-testid="sla-indicator"
          >
            <div className={cn('w-2 h-2 rounded-full', slaColors.dot)} />
            <span className="text-gray-700">
              {investigation.slaStatus.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          className="border-t px-3 py-3 bg-gray-50"
          data-testid="expanded-content"
        >
          {/* All Assignees */}
          {investigation.assignedTo.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                <User className="w-3 h-3" />
                <span>Assignees ({investigation.assignedTo.length})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {investigation.assignedTo.map((userId, index) => (
                  <span
                    key={userId}
                    className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded"
                  >
                    Investigator {index + 1}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Findings Summary (if closed) */}
          {hasFindings && (
            <div className="mb-3">
              <div className="flex items-center gap-1 text-xs font-medium text-gray-500 mb-1">
                <FileText className="w-3 h-3" />
                <span>Findings</span>
              </div>
              <p className="text-sm text-gray-700 line-clamp-3">
                {investigation.findingsSummary}
              </p>
              {investigation.outcome && (
                <Badge className="mt-1 text-xs bg-gray-100 text-gray-700 border-0">
                  {investigation.outcome.replace('_', ' ')}
                </Badge>
              )}
            </div>
          )}

          {/* Notes Count */}
          {investigation.notesCount !== undefined && investigation.notesCount > 0 && (
            <div className="text-xs text-gray-500">
              {investigation.notesCount} note{investigation.notesCount !== 1 ? 's' : ''}
            </div>
          )}

          {/* Empty expanded state */}
          {!hasFindings &&
            investigation.assignedTo.length === 0 &&
            (investigation.notesCount === undefined || investigation.notesCount === 0) && (
              <p className="text-xs text-gray-400 italic">
                No additional details available
              </p>
            )}
        </div>
      )}
    </div>
  );
}
