'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Case } from '@/types/case';

interface CaseInvestigationsPanelProps {
  caseData: Case | null;
  isLoading: boolean;
}

export function CaseInvestigationsPanel({ caseData, isLoading }: CaseInvestigationsPanelProps) {
  if (isLoading) {
    return <CaseInvestigationsPanelSkeleton />;
  }

  if (!caseData) {
    return null;
  }

  return (
    <div className="space-y-4 p-4">
      {/* Investigations Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Investigations
            </CardTitle>
            <Button variant="outline" size="sm">
              Create
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Placeholder for investigations list - Task 1.4.10 */}
          <div className="text-center py-6 text-gray-400 border border-dashed rounded-md">
            <p className="text-sm">No investigations yet</p>
            <p className="text-xs mt-1">Create an investigation to begin</p>
          </div>
        </CardContent>
      </Card>

      {/* AI Summary Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">
              AI Summary
            </CardTitle>
            <Button variant="ghost" size="sm">
              Generate
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {caseData.aiSummary ? (
            <div>
              <p className="text-sm text-gray-700">{caseData.aiSummary}</p>
              {caseData.aiSummaryGeneratedAt && (
                <p className="text-xs text-gray-400 mt-2">
                  Generated{' '}
                  {new Date(caseData.aiSummaryGeneratedAt).toLocaleDateString()}
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-400 border border-dashed rounded-md">
              <p className="text-sm">No AI summary generated</p>
              <p className="text-xs mt-1">
                Click Generate to create an AI summary
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Related Cases Section - Placeholder */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Related Cases
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-400 border border-dashed rounded-md">
            <p className="text-sm">No related cases</p>
            <p className="text-xs mt-1">AI will suggest related cases</p>
          </div>
        </CardContent>
      </Card>

      {/* Subjects Section - Placeholder */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Subjects
            </CardTitle>
            <Button variant="outline" size="sm">
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-400 border border-dashed rounded-md">
            <p className="text-sm">No subjects linked</p>
            <p className="text-xs mt-1">Add people named in this case</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function CaseInvestigationsPanelSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3, 4].map((section) => (
        <Card key={section}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
