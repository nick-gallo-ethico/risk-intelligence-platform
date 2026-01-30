'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { InvestigationCard } from './investigation-card';
import { CreateInvestigationDialog } from './create-investigation-dialog';
import { InvestigationDetailPanel } from '@/components/investigations';
import { getInvestigationsForCase } from '@/lib/investigation-api';
import type { Case } from '@/types/case';
import type { Investigation } from '@/types/investigation';

interface CaseInvestigationsPanelProps {
  caseData: Case | null;
  isLoading: boolean;
}

export function CaseInvestigationsPanel({ caseData, isLoading }: CaseInvestigationsPanelProps) {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [investigationsLoading, setInvestigationsLoading] = useState(false);
  const [investigationsError, setInvestigationsError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string | null>(null);

  // Fetch investigations when case data is available
  const fetchInvestigations = useCallback(async () => {
    if (!caseData?.id) {
      setInvestigations([]);
      return;
    }

    setInvestigationsLoading(true);
    setInvestigationsError(null);

    try {
      const response = await getInvestigationsForCase(caseData.id);
      setInvestigations(response.data);
    } catch (error) {
      console.error('Failed to fetch investigations:', error);
      setInvestigationsError('Failed to load investigations');
      setInvestigations([]);
    } finally {
      setInvestigationsLoading(false);
    }
  }, [caseData?.id]);

  useEffect(() => {
    fetchInvestigations();
  }, [fetchInvestigations]);

  const handleInvestigationCreated = useCallback((investigation: Investigation) => {
    setInvestigations((prev) => [...prev, investigation]);
  }, []);

  const handleInvestigationClick = useCallback((investigation: Investigation) => {
    setSelectedInvestigationId(investigation.id);
  }, []);

  const handleDetailPanelClose = useCallback(() => {
    setSelectedInvestigationId(null);
  }, []);

  if (isLoading) {
    return <CaseInvestigationsPanelSkeleton />;
  }

  if (!caseData) {
    return null;
  }

  const hasInvestigations = investigations.length > 0;

  return (
    <div className="space-y-4 p-4">
      {/* Investigations Section */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Investigations
              {hasInvestigations && (
                <span className="ml-2 text-xs font-normal text-gray-500">
                  ({investigations.length})
                </span>
              )}
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              data-testid="create-investigation-button"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {investigationsLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : investigationsError ? (
            <div className="text-center py-6 text-red-500 border border-dashed border-red-200 rounded-md">
              <p className="text-sm">{investigationsError}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchInvestigations}
                className="mt-2"
              >
                Retry
              </Button>
            </div>
          ) : hasInvestigations ? (
            <div className="space-y-3" data-testid="investigations-list">
              {investigations.map((investigation) => (
                <InvestigationCard
                  key={investigation.id}
                  investigation={investigation}
                  onClick={handleInvestigationClick}
                />
              ))}
            </div>
          ) : (
            <div
              className="text-center py-6 text-gray-400 border border-dashed rounded-md"
              data-testid="empty-state"
            >
              <Search className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No investigations yet</p>
              <p className="text-xs mt-1">Create an investigation to begin</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setCreateDialogOpen(true)}
                data-testid="empty-state-create-button"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Investigation
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Investigation Dialog */}
      <CreateInvestigationDialog
        caseId={caseData.id}
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleInvestigationCreated}
      />

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

      {/* Investigation Detail Panel */}
      <InvestigationDetailPanel
        investigationId={selectedInvestigationId}
        onClose={handleDetailPanelClose}
      />
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
