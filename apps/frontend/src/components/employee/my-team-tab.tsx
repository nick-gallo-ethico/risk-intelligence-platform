'use client';

/**
 * MyTeamTab Component
 *
 * Full implementation of the My Team tab for managers.
 *
 * Features:
 * - Fetch team from /api/v1/employee/team
 * - Summary stats: total members, compliant, needs attention
 * - Team member list using TeamMemberRow
 * - Bulk reminder action for overdue members
 * - Export button (CSV of team status)
 * - Search/filter by name, department
 */

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users,
  Search,
  Download,
  Mail,
  CheckCircle,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { TeamMemberRow, type TeamMemberWithStatus } from './team-member-row';
import { useEmployee } from '@/contexts/employee-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Team members API response.
 */
interface TeamResponse {
  members: TeamMemberWithStatus[];
  summary: {
    total: number;
    compliant: number;
    pending: number;
    overdue: number;
  };
}

/**
 * Query keys for team data.
 */
const teamQueryKeys = {
  all: ['employee', 'team'] as const,
  members: () => [...teamQueryKeys.all, 'members'] as const,
};

/**
 * Loading skeleton for team tab.
 */
function TeamTabSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>

      {/* Search skeleton */}
      <Skeleton className="h-10 w-full max-w-sm" />

      {/* Member list skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}

/**
 * Empty state component.
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="font-medium text-lg">No Team Members</h3>
      <p className="text-muted-foreground mt-1">
        You don&apos;t have any direct reports in the system.
      </p>
    </div>
  );
}

/**
 * MyTeamTab - Main team management tab for managers.
 */
export function MyTeamTab() {
  const { profile } = useEmployee();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [reminderLoadingIds, setReminderLoadingIds] = useState<Set<string>>(new Set());

  // Determine if user is a manager (used to enable/disable queries)
  const isManager = profile?.isManager ?? false;

  // Fetch team members with compliance status (only if manager)
  const { data, isLoading, error } = useQuery({
    queryKey: teamQueryKeys.members(),
    queryFn: async () => {
      // Fetch team members
      const members = await apiClient.get<TeamMemberWithStatus[]>('/employee/team');

      // Calculate summary
      const summary = {
        total: members.length,
        compliant: members.filter((m) => m.overdueTasks === 0 && m.pendingTasks === 0).length,
        pending: members.filter((m) => m.pendingTasks > 0 && m.overdueTasks === 0).length,
        overdue: members.filter((m) => m.overdueTasks > 0).length,
      };

      return { members, summary } as TeamResponse;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: isManager, // Only fetch if user is a manager
  });

  // Send reminder mutation
  const sendReminderMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiClient.post(`/employee/team/${memberId}/remind`);
    },
    onMutate: (memberId) => {
      setReminderLoadingIds((prev) => new Set([...prev, memberId]));
    },
    onSettled: (_, __, memberId) => {
      setReminderLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(memberId);
        return next;
      });
    },
  });

  // Bulk reminder mutation
  const bulkReminderMutation = useMutation({
    mutationFn: async (memberIds: string[]) => {
      await apiClient.post('/employee/team/remind-bulk', { memberIds });
    },
  });

  // Filter members by search query
  const filteredMembers = useMemo(() => {
    if (!data?.members) return [];
    if (!searchQuery.trim()) return data.members;

    const query = searchQuery.toLowerCase();
    return data.members.filter((member) => {
      const searchableFields = [
        member.name,
        member.email,
        member.jobTitle,
        member.department,
      ].filter(Boolean);

      return searchableFields.some((field) =>
        field!.toLowerCase().includes(query)
      );
    });
  }, [data?.members, searchQuery]);

  // Get members needing attention (for bulk actions)
  const membersNeedingAttention = useMemo(() => {
    return filteredMembers.filter(
      (m) => m.overdueTasks > 0 || m.pendingTasks > 3
    );
  }, [filteredMembers]);

  // Handle send reminder
  const handleSendReminder = useCallback((memberId: string) => {
    sendReminderMutation.mutate(memberId);
  }, [sendReminderMutation]);

  // Handle bulk reminder
  const handleBulkReminder = useCallback(() => {
    const ids = membersNeedingAttention.map((m) => m.id);
    bulkReminderMutation.mutate(ids);
  }, [membersNeedingAttention, bulkReminderMutation]);

  // Handle export
  const handleExport = useCallback(() => {
    if (!data?.members) return;

    // Build CSV content
    const headers = ['Name', 'Email', 'Job Title', 'Department', 'Compliance Score', 'Pending Tasks', 'Overdue Tasks'];
    const rows = data.members.map((m) => [
      m.name,
      m.email || '',
      m.jobTitle || '',
      m.department || '',
      m.complianceScore.toString(),
      m.pendingTasks.toString(),
      m.overdueTasks.toString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `team-compliance-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data?.members]);

  // Only render for managers - check AFTER all hooks are called
  if (!isManager) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>This tab is only available for managers.</p>
      </div>
    );
  }

  if (isLoading) {
    return <TeamTabSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Failed to load team data. Please try again.
      </div>
    );
  }

  if (!data?.members || data.members.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Members
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.summary.total}</div>
          </CardContent>
        </Card>

        <Card className="border-green-500/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Compliant
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {data.summary.compliant}
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-500/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {data.summary.pending}
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overdue
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {data.summary.overdue}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and actions row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, email, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {membersNeedingAttention.length > 0 && (
            <Button
              variant="outline"
              onClick={handleBulkReminder}
              disabled={bulkReminderMutation.isPending}
              className="flex items-center gap-2"
            >
              <Mail className="h-4 w-4" />
              Remind All ({membersNeedingAttention.length})
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleExport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Member list */}
      {filteredMembers.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No team members match your search.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMembers.map((member) => (
            <TeamMemberRow
              key={member.id}
              member={member}
              onSendReminder={handleSendReminder}
              isReminderLoading={reminderLoadingIds.has(member.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default MyTeamTab;
