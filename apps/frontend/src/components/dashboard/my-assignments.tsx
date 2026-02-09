'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { Case } from '@/types/case';

interface MyAssignmentsProps {
  cases: Case[];
  currentUserId: string;
  isLoading: boolean;
}

/**
 * Get cases relevant to the current user.
 * Shows cases created by the user that are still active (NEW or OPEN).
 *
 * Note: Full assignment tracking will come from Investigations entity.
 * This is a simplified view showing the user's active cases.
 */
function getUserAssignments(cases: Case[], userId: string): Case[] {
  return cases
    .filter(
      (c) =>
        c.createdById === userId &&
        (c.status === 'NEW' || c.status === 'OPEN')
    )
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);
}

/**
 * My Assignments section for the dashboard.
 * Shows cases/investigations assigned to the current user.
 */
export function MyAssignments({
  cases,
  currentUserId,
  isLoading,
}: MyAssignmentsProps) {
  const router = useRouter();
  const assignments = getUserAssignments(cases, currentUserId);

  return (
    <Card className="flex-1 flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">My Active Cases</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : assignments.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p>No active cases assigned to you.</p>
            <button
              onClick={() => router.push('/cases/new')}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Create a new case
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {assignments.map((caseItem) => (
              <li
                key={caseItem.id}
                className="flex items-center justify-between py-2 px-3 -mx-3 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => router.push(`/cases/${caseItem.id}`)}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-700">
                      {caseItem.referenceNumber}
                    </span>
                    <StatusBadge status={caseItem.status} />
                  </div>
                  <p className="text-sm text-gray-500 truncate mt-0.5">
                    {caseItem.summary || caseItem.details.substring(0, 50) + '...'}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0">
                  <span className="text-xs text-gray-400">
                    {new Date(caseItem.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
