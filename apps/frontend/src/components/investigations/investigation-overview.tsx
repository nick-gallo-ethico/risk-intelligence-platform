'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { User, Users, Calendar, Building2, Tag, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Investigation } from '@/types/investigation';

interface InvestigationOverviewProps {
  investigation: Investigation;
}

/**
 * Get initials from user name
 */
function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

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
 * Property row component
 */
function PropertyRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-sm">{children}</div>
      </div>
    </div>
  );
}

/**
 * Overview tab content - shows investigation properties
 */
export function InvestigationOverview({ investigation }: InvestigationOverviewProps) {
  const primaryInvestigator = investigation.primaryInvestigator;
  const hasAssignees = investigation.assignedTo.length > 0;

  return (
    <div className="space-y-6 py-4">
      {/* Assignment section */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Assignment</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          {/* Primary Investigator */}
          <div>
            <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
              <User className="h-3 w-3" />
              Primary Investigator
            </div>
            {primaryInvestigator ? (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {getInitials(primaryInvestigator.firstName, primaryInvestigator.lastName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-sm font-medium">
                    {primaryInvestigator.firstName} {primaryInvestigator.lastName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {primaryInvestigator.email}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground italic">Not assigned</span>
            )}
          </div>

          {/* Assigned team */}
          {hasAssignees && (
            <div>
              <div className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                <Users className="h-3 w-3" />
                Assigned Team ({investigation.assignedTo.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {investigation.assignedTo.map((userId, index) => (
                  <Badge
                    key={userId}
                    variant="outline"
                    className={cn(
                      'text-xs',
                      userId === investigation.primaryInvestigatorId &&
                        'bg-primary/5 border-primary/20'
                    )}
                  >
                    Investigator {index + 1}
                    {userId === investigation.primaryInvestigatorId && ' (Primary)'}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Assignment date */}
          {investigation.assignedAt && (
            <div className="text-xs text-muted-foreground">
              Assigned on {formatDate(investigation.assignedAt)}
            </div>
          )}
        </div>
      </section>

      {/* Properties section */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Properties</h3>
        <div className="border rounded-lg">
          <PropertyRow icon={Tag} label="Type">
            <Badge variant="outline" className="font-normal">
              {investigation.investigationType}
            </Badge>
          </PropertyRow>

          <PropertyRow icon={Building2} label="Department">
            {investigation.department ? (
              <Badge variant="outline" className="font-normal">
                {investigation.department}
              </Badge>
            ) : (
              <span className="text-muted-foreground italic">Not set</span>
            )}
          </PropertyRow>

          <PropertyRow icon={Calendar} label="Due Date">
            {investigation.dueDate ? (
              formatDate(investigation.dueDate)
            ) : (
              <span className="text-muted-foreground italic">No due date</span>
            )}
          </PropertyRow>

          <PropertyRow icon={FileText} label="Status Rationale">
            {investigation.statusRationale ? (
              <p className="text-gray-700">{investigation.statusRationale}</p>
            ) : (
              <span className="text-muted-foreground italic">No rationale provided</span>
            )}
          </PropertyRow>
        </div>
      </section>

      {/* Timeline section */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Timeline</h3>
        <div className="border rounded-lg">
          <PropertyRow icon={Calendar} label="Created">
            {formatDate(investigation.createdAt)}
          </PropertyRow>

          {investigation.statusChangedAt && (
            <PropertyRow icon={Calendar} label="Last Status Change">
              {formatDate(investigation.statusChangedAt)}
            </PropertyRow>
          )}

          {investigation.closedAt && (
            <PropertyRow icon={Calendar} label="Closed">
              {formatDate(investigation.closedAt)}
            </PropertyRow>
          )}
        </div>
      </section>
    </div>
  );
}
