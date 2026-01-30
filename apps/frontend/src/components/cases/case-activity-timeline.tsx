'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Case } from '@/types/case';

interface CaseActivityTimelineProps {
  caseData: Case | null;
  isLoading: boolean;
}

export function CaseActivityTimeline({ caseData, isLoading }: CaseActivityTimelineProps) {
  if (isLoading) {
    return <CaseActivityTimelineSkeleton />;
  }

  if (!caseData) {
    return null;
  }

  // Placeholder timeline items - will be replaced with real activity data in Task 1.4.9
  const placeholderActivities = [
    {
      id: '1',
      type: 'created',
      description: 'Case created',
      timestamp: caseData.createdAt,
      user: caseData.createdBy
        ? `${caseData.createdBy.firstName} ${caseData.createdBy.lastName}`
        : 'System',
    },
  ];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Actions Bar */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            Add Note
          </Button>
          <Button variant="outline" size="sm">
            Log Call
          </Button>
          <Button variant="outline" size="sm">
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
      <div className="flex-1 p-6 overflow-auto">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Activity</h3>

        <div className="space-y-4">
          {placeholderActivities.map((activity) => (
            <div key={activity.id} className="flex gap-4">
              {/* Timeline dot and line */}
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1" />
                <div className="flex-1 w-px bg-gray-200 my-2" />
              </div>

              {/* Content */}
              <div className="flex-1 pb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      by {activity.user}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDate(activity.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Placeholder for more activities */}
          <div className="text-center py-8 text-gray-400 border-t border-dashed">
            <p className="text-sm">Activity timeline will be populated here</p>
            <p className="text-xs mt-1">(Task 1.4.9)</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CaseActivityTimelineSkeleton() {
  return (
    <div className="flex flex-col h-full">
      {/* Actions Bar skeleton */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex gap-3">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
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

      {/* Timeline skeleton */}
      <div className="flex-1 p-6">
        <Skeleton className="h-4 w-20 mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex gap-4">
              <div className="flex flex-col items-center">
                <Skeleton className="w-3 h-3 rounded-full" />
                <div className="flex-1 w-px bg-gray-200 my-2" />
              </div>
              <div className="flex-1">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
