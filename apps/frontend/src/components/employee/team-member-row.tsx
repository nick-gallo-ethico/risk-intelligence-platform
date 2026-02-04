'use client';

/**
 * TeamMemberRow Component
 *
 * Row display for team members in My Team tab.
 *
 * Features:
 * - Avatar, name, role display
 * - Compliance score with color coding
 * - Pending/overdue item counts
 * - Expandable to show specific pending items
 * - Send reminder button
 */

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Clock,
  Mail,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

/**
 * Pending task summary for team member.
 */
export interface PendingTaskSummary {
  id: string;
  title: string;
  type: string;
  dueDate: string | null;
  isOverdue: boolean;
}

/**
 * Team member with compliance status.
 */
export interface TeamMemberWithStatus {
  id: string;
  name: string;
  email: string | null;
  avatarUrl?: string;
  jobTitle: string | null;
  department: string | null;
  complianceScore: number;
  pendingTasks: number;
  overdueTasks: number;
  pendingItems?: PendingTaskSummary[];
}

export interface TeamMemberRowProps {
  /** Team member data */
  member: TeamMemberWithStatus;
  /** Callback when reminder is sent */
  onSendReminder?: (memberId: string) => void;
  /** Whether reminder is being sent */
  isReminderLoading?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Get initials from a name.
 */
function getInitials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Get compliance status info.
 */
function getComplianceStatus(
  overdueTasks: number,
  pendingTasks: number,
  score: number
): { label: string; color: string; icon: typeof CheckCircle } {
  if (overdueTasks > 0) {
    return {
      label: 'Overdue',
      color: 'text-destructive',
      icon: AlertTriangle,
    };
  }
  if (pendingTasks > 0) {
    return {
      label: 'Pending',
      color: 'text-amber-500',
      icon: Clock,
    };
  }
  return {
    label: 'Compliant',
    color: 'text-green-500',
    icon: CheckCircle,
  };
}

/**
 * TeamMemberRow - Displays a team member with compliance status.
 */
export function TeamMemberRow({
  member,
  onSendReminder,
  isReminderLoading,
  className,
}: TeamMemberRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = getComplianceStatus(
    member.overdueTasks,
    member.pendingTasks,
    member.complianceScore
  );
  const StatusIcon = status.icon;

  const hasExpandableItems =
    member.pendingItems && member.pendingItems.length > 0;
  const needsAttention = member.overdueTasks > 0 || member.pendingTasks > 3;

  return (
    <div
      className={cn(
        'border rounded-lg bg-card transition-colors',
        needsAttention && 'border-amber-500/50',
        member.overdueTasks > 0 && 'border-destructive/50 bg-destructive/5',
        className
      )}
    >
      {/* Main row */}
      <div
        className={cn(
          'p-4 flex items-center gap-4',
          hasExpandableItems && 'cursor-pointer hover:bg-muted/50'
        )}
        onClick={() => hasExpandableItems && setIsExpanded(!isExpanded)}
      >
        {/* Expand/collapse indicator */}
        {hasExpandableItems && (
          <div className="flex-shrink-0 w-5">
            {isExpanded ? (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        )}

        {/* Avatar */}
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={member.avatarUrl} alt={member.name} />
          <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
        </Avatar>

        {/* Member info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{member.name}</span>
            <StatusIcon className={cn('h-4 w-4 flex-shrink-0', status.color)} />
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {member.jobTitle}
            {member.department && ` - ${member.department}`}
          </p>
        </div>

        {/* Compliance score */}
        <div className="hidden sm:flex flex-col items-end gap-1 w-24">
          <span className="text-sm font-medium">{member.complianceScore}%</span>
          <Progress
            value={member.complianceScore}
            className={cn(
              'h-1.5 w-full',
              member.complianceScore >= 80
                ? '[&>div]:bg-green-500'
                : member.complianceScore >= 50
                ? '[&>div]:bg-amber-500'
                : '[&>div]:bg-destructive'
            )}
          />
        </div>

        {/* Task counts */}
        <div className="flex items-center gap-2">
          {member.overdueTasks > 0 && (
            <Badge variant="destructive" className="text-xs">
              {member.overdueTasks} overdue
            </Badge>
          )}
          {member.pendingTasks > 0 && member.overdueTasks === 0 && (
            <Badge variant="secondary" className="text-xs">
              {member.pendingTasks} pending
            </Badge>
          )}
          {member.pendingTasks === 0 && member.overdueTasks === 0 && (
            <Badge variant="outline" className="text-xs text-green-500 border-green-500/50">
              Up to date
            </Badge>
          )}
        </div>

        {/* Reminder button */}
        {needsAttention && onSendReminder && (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onSendReminder(member.id);
            }}
            disabled={isReminderLoading}
            className="flex-shrink-0"
          >
            <Mail className="h-4 w-4 mr-1" />
            Remind
          </Button>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && hasExpandableItems && (
        <div className="border-t px-4 py-3 bg-muted/30">
          <p className="text-sm font-medium mb-2">Pending Items:</p>
          <ul className="space-y-2">
            {member.pendingItems!.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  {item.isOverdue ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                  ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={cn(item.isOverdue && 'text-destructive')}>
                    {item.title}
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {item.type}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default TeamMemberRow;
