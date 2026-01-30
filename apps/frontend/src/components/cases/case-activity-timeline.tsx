'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Phone, Mail, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityFilters } from './activity-filters';
import { ActivityEntry } from './activity-entry';
import { groupByDate } from '@/lib/date-utils';
import { apiClient } from '@/lib/api';
import type { Case } from '@/types/case';
import type { Activity, ActivityFilterType, ActivityListResponse } from '@/types/activity';

interface CaseActivityTimelineProps {
  caseData: Case | null;
  isLoading: boolean;
}

export function CaseActivityTimeline({ caseData, isLoading }: CaseActivityTimelineProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ActivityFilterType>('all');
  const [addNoteModalOpen, setAddNoteModalOpen] = useState(false);

  // Fetch activities when case data is available
  useEffect(() => {
    if (!caseData?.id) {
      setActivities([]);
      return;
    }

    const fetchActivities = async () => {
      setActivitiesLoading(true);
      setActivitiesError(null);

      try {
        const response = await apiClient.get<ActivityListResponse>(
          `/activity/entity/CASE/${caseData.id}`
        );
        setActivities(response.data);
      } catch (error) {
        console.error('Failed to fetch activities:', error);
        setActivitiesError('Failed to load activities');
        // Create a fallback activity from case data
        setActivities([
          {
            id: `created-${caseData.id}`,
            entityType: 'CASE',
            entityId: caseData.id,
            action: 'created',
            actionDescription: 'Case created',
            changes: null,
            actorUserId: caseData.createdById,
            actorType: 'USER',
            actorName: caseData.createdBy
              ? `${caseData.createdBy.firstName} ${caseData.createdBy.lastName}`
              : 'System',
            createdAt: caseData.createdAt,
          },
        ]);
      } finally {
        setActivitiesLoading(false);
      }
    };

    fetchActivities();
  }, [caseData?.id, caseData?.createdById, caseData?.createdBy, caseData?.createdAt]);

  // Filter activities based on active filter
  const filteredActivities = useMemo(() => {
    if (activeFilter === 'all') {
      return activities;
    }

    return activities.filter((activity) => {
      switch (activeFilter) {
        case 'notes':
          return activity.action === 'commented';
        case 'status':
          return activity.action === 'status_changed';
        case 'files':
          return activity.action === 'file_uploaded';
        default:
          return true;
      }
    });
  }, [activities, activeFilter]);

  // Count activities by type for filter badges
  const filterCounts = useMemo(() => {
    return {
      all: activities.length,
      notes: activities.filter((a) => a.action === 'commented').length,
      status: activities.filter((a) => a.action === 'status_changed').length,
      files: activities.filter((a) => a.action === 'file_uploaded').length,
    };
  }, [activities]);

  // Group filtered activities by date
  const groupedActivities = useMemo(() => {
    return groupByDate(filteredActivities, (activity) => activity.createdAt);
  }, [filteredActivities]);

  const handleAddNote = useCallback(() => {
    setAddNoteModalOpen(true);
    // TODO: Implement modal in future task
    console.log('Add note clicked - modal placeholder');
  }, []);

  if (isLoading) {
    return <CaseActivityTimelineSkeleton />;
  }

  if (!caseData) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Actions Bar */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddNote}
            aria-label="Add a note to this case"
          >
            <Plus className="w-4 h-4 mr-1.5" aria-hidden="true" />
            Add Note
          </Button>
          <Button variant="outline" size="sm">
            <Phone className="w-4 h-4 mr-1.5" aria-hidden="true" />
            Log Call
          </Button>
          <Button variant="outline" size="sm">
            <Mail className="w-4 h-4 mr-1.5" aria-hidden="true" />
            Send Email
          </Button>
        </div>
      </div>

      {/* Case Details */}
      <div className="p-6 border-b">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Case Details</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{caseData.details}</p>
          </CardContent>
        </Card>
      </div>

      {/* Activity Timeline */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filter tabs */}
        <div className="px-6 pt-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity</h3>
          <ActivityFilters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            counts={filterCounts}
          />
        </div>

        {/* Activities list */}
        <div
          className="flex-1 p-6 overflow-auto"
          role="tabpanel"
          id={`activity-panel-${activeFilter}`}
          aria-label={`${activeFilter} activities`}
        >
          {activitiesLoading ? (
            <ActivityTimelineSkeleton />
          ) : activitiesError && activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{activitiesError}</p>
            </div>
          ) : filteredActivities.length === 0 ? (
            <EmptyState filter={activeFilter} />
          ) : (
            <div className="space-y-6">
              {groupedActivities.map((group) => (
                <div key={group.label}>
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
                    {group.label}
                  </h4>
                  <div className="space-y-0">
                    {group.items.map((activity, index) => (
                      <ActivityEntry
                        key={activity.id}
                        activity={activity}
                        isLast={index === group.items.length - 1}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Note Modal Placeholder */}
      {addNoteModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setAddNoteModalOpen(false)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold mb-4">Add Note</h2>
            <p className="text-gray-500 text-sm mb-4">
              Note creation will be implemented in a future task.
            </p>
            <Button onClick={() => setAddNoteModalOpen(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface EmptyStateProps {
  filter: ActivityFilterType;
}

function EmptyState({ filter }: EmptyStateProps) {
  const messages: Record<ActivityFilterType, { title: string; description: string }> = {
    all: {
      title: 'No activity yet',
      description: 'Activity will appear here as changes are made to this case.',
    },
    notes: {
      title: 'No notes yet',
      description: 'Click "Add Note" to add the first note to this case.',
    },
    status: {
      title: 'No status changes',
      description: 'Status change history will appear here.',
    },
    files: {
      title: 'No files uploaded',
      description: 'Uploaded files will appear here.',
    },
  };

  const { title, description } = messages[filter];

  return (
    <div className="text-center py-12" data-testid="empty-state">
      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h4 className="text-sm font-medium text-gray-900 mb-1">{title}</h4>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

function ActivityTimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((item) => (
        <div key={item} className="flex gap-3">
          <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CaseActivityTimelineSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Actions Bar skeleton */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-28" />
        </div>
      </div>

      {/* Case details skeleton */}
      <div className="p-6 border-b">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>

      {/* Activity section skeleton */}
      <div className="flex-1 p-6">
        <Skeleton className="h-4 w-20 mb-3" />
        {/* Filter tabs skeleton */}
        <div className="flex gap-2 mb-6 border-b pb-2">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-14" />
        </div>
        {/* Timeline skeleton */}
        <ActivityTimelineSkeleton />
      </div>
    </div>
  );
}
