'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { InvestigationHeader } from './investigation-header';
import { InvestigationOverview } from './investigation-overview';
import { InvestigationNotes } from './investigation-notes';
import { InvestigationFindings } from './investigation-findings';
import { getInvestigation } from '@/lib/investigation-api';
import type { Investigation } from '@/types/investigation';

interface InvestigationDetailPanelProps {
  /** ID of the investigation to display, null to close panel */
  investigationId: string | null;
  /** Callback when panel is closed */
  onClose: () => void;
}

/**
 * Slide-over panel displaying investigation details with tabs for
 * Overview, Notes, and Findings.
 */
export function InvestigationDetailPanel({
  investigationId,
  onClose,
}: InvestigationDetailPanelProps) {
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch investigation data when ID changes
  const fetchInvestigation = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await getInvestigation(id);
      setInvestigation(data);
    } catch (err) {
      console.error('Failed to fetch investigation:', err);
      setError('Failed to load investigation details');
      setInvestigation(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (investigationId) {
      fetchInvestigation(investigationId);
    } else {
      setInvestigation(null);
      setError(null);
    }
  }, [investigationId, fetchInvestigation]);

  // Handle panel close
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        onClose();
      }
    },
    [onClose]
  );

  // Determine if findings tab should be shown
  const showFindings =
    investigation?.status === 'PENDING_REVIEW' ||
    investigation?.status === 'CLOSED';

  return (
    <Sheet open={!!investigationId} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:w-[600px] sm:max-w-[600px] overflow-y-auto">
        <SheetHeader className="sr-only">
          <SheetTitle>Investigation Details</SheetTitle>
        </SheetHeader>

        {loading ? (
          // Loading state
          <div className="space-y-6 py-4">
            {/* Header skeleton */}
            <div className="space-y-4 pb-4 border-b">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>

            {/* Tabs skeleton */}
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ) : error ? (
          // Error state
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-destructive mb-4">{error}</p>
            <button
              onClick={() => investigationId && fetchInvestigation(investigationId)}
              className="text-sm text-primary hover:underline"
            >
              Try again
            </button>
          </div>
        ) : investigation ? (
          // Content
          <>
            <InvestigationHeader investigation={investigation} />

            <Tabs defaultValue="overview" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                {showFindings && (
                  <TabsTrigger value="findings">Findings</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="overview">
                <InvestigationOverview investigation={investigation} />
              </TabsContent>

              <TabsContent value="notes">
                <InvestigationNotes investigationId={investigation.id} />
              </TabsContent>

              {showFindings && (
                <TabsContent value="findings">
                  <InvestigationFindings investigation={investigation} />
                </TabsContent>
              )}
            </Tabs>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
