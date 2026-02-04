'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  MessageSquare,
  Users,
  Paperclip,
  Activity,
  Loader2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { InvestigationHeader } from '@/components/investigations/investigation-header';
import { InvestigationOverview } from '@/components/investigations/investigation-overview';
import { InvestigationNotes } from '@/components/investigations/investigation-notes';
import { InvestigationFindings } from '@/components/investigations/investigation-findings';
import { ChecklistPanel } from '@/components/investigations/checklist-panel';
import { TemplateSelectorDialog } from '@/components/investigations/template-selector';
import { getInvestigation } from '@/lib/investigation-api';
import {
  getChecklistProgress,
  applyTemplate,
  completeItem,
  skipItem,
  uncompleteItem,
  addCustomItem,
  deleteChecklist,
  type ChecklistProgress,
} from '@/lib/checklist-api';
import type { Investigation } from '@/types/investigation';

/**
 * Investigation detail page with tabs for Checklist, Notes, Interviews, Files, Activity.
 */
export default function InvestigationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const investigationId = params.id as string;

  // State
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('checklist');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  // Fetch investigation data
  const fetchInvestigation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInvestigation(investigationId);
      setInvestigation(data);
    } catch (err) {
      console.error('Failed to fetch investigation:', err);
      setError('Failed to load investigation');
    } finally {
      setLoading(false);
    }
  }, [investigationId]);

  // Fetch checklist progress
  const fetchChecklistProgress = useCallback(async () => {
    try {
      const progress = await getChecklistProgress(investigationId);
      setChecklistProgress(progress);
    } catch (err) {
      console.error('Failed to fetch checklist:', err);
      // Not an error if no checklist exists
      setChecklistProgress(null);
    }
  }, [investigationId]);

  // Initial data fetch
  useEffect(() => {
    fetchInvestigation();
    fetchChecklistProgress();
  }, [fetchInvestigation, fetchChecklistProgress]);

  // Handle template apply
  const handleApplyTemplate = async (templateId: string) => {
    setApplyingTemplate(true);
    try {
      const progress = await applyTemplate(investigationId, templateId);
      setChecklistProgress(progress);
      setShowTemplateSelector(false);
    } catch (err) {
      console.error('Failed to apply template:', err);
      // TODO: Show toast error
    } finally {
      setApplyingTemplate(false);
    }
  };

  // Handle item completion
  const handleCompleteItem = async (
    itemId: string,
    notes?: string,
    attachmentIds?: string[]
  ) => {
    setChecklistLoading(true);
    try {
      const progress = await completeItem(investigationId, itemId, {
        completionNotes: notes,
        attachmentIds,
      });
      setChecklistProgress(progress);
    } catch (err) {
      console.error('Failed to complete item:', err);
    } finally {
      setChecklistLoading(false);
    }
  };

  // Handle item skip
  const handleSkipItem = async (itemId: string, reason: string) => {
    setChecklistLoading(true);
    try {
      const progress = await skipItem(investigationId, itemId, reason);
      setChecklistProgress(progress);
    } catch (err) {
      console.error('Failed to skip item:', err);
    } finally {
      setChecklistLoading(false);
    }
  };

  // Handle item uncomplete
  const handleUncompleteItem = async (itemId: string) => {
    setChecklistLoading(true);
    try {
      const progress = await uncompleteItem(investigationId, itemId);
      setChecklistProgress(progress);
    } catch (err) {
      console.error('Failed to uncomplete item:', err);
    } finally {
      setChecklistLoading(false);
    }
  };

  // Handle custom item add
  const handleAddCustomItem = async (sectionId: string, text: string) => {
    setChecklistLoading(true);
    try {
      const progress = await addCustomItem(investigationId, sectionId, text);
      setChecklistProgress(progress);
    } catch (err) {
      console.error('Failed to add custom item:', err);
    } finally {
      setChecklistLoading(false);
    }
  };

  // Handle template swap
  const handleSwapTemplate = () => {
    setShowTemplateSelector(true);
  };

  // Handle checklist removal
  const handleRemoveChecklist = async () => {
    if (!confirm('Are you sure you want to remove the checklist? This cannot be undone.')) {
      return;
    }
    setChecklistLoading(true);
    try {
      await deleteChecklist(investigationId);
      setChecklistProgress(null);
    } catch (err) {
      console.error('Failed to remove checklist:', err);
    } finally {
      setChecklistLoading(false);
    }
  };

  // Show findings tab for closed or pending review
  const showFindings =
    investigation?.status === 'PENDING_REVIEW' ||
    investigation?.status === 'CLOSED';

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="space-y-6">
          {/* Header skeleton */}
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9" />
            <div className="space-y-2">
              <Skeleton className="h-7 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
          {/* Content skeleton */}
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !investigation) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="text-center py-12">
          <p className="text-red-600 mb-4">{error || 'Investigation not found'}</p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-7xl">
      {/* Back link */}
      <div className="mb-4">
        <Link
          href={`/cases/${investigation.caseId}`}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to case
        </Link>
      </div>

      {/* Investigation header */}
      <div className="mb-6">
        <InvestigationHeader investigation={investigation} />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="checklist" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Checklist
            {checklistProgress && (
              <span className="text-xs text-gray-500 ml-1">
                ({Math.round(checklistProgress.progressPercent)}%)
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Notes
            {investigation.notesCount !== undefined && investigation.notesCount > 0 && (
              <span className="text-xs bg-gray-200 rounded-full px-1.5">
                {investigation.notesCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="interviews" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Interviews
          </TabsTrigger>
          <TabsTrigger value="files" className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Files
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Activity
          </TabsTrigger>
          {showFindings && (
            <TabsTrigger value="findings" className="flex items-center gap-2">
              Findings
            </TabsTrigger>
          )}
        </TabsList>

        {/* Checklist tab */}
        <TabsContent value="checklist" className="mt-6">
          {checklistProgress ? (
            <ChecklistPanel
              progress={checklistProgress}
              onCompleteItem={handleCompleteItem}
              onSkipItem={handleSkipItem}
              onUncompleteItem={handleUncompleteItem}
              onAddCustomItem={handleAddCustomItem}
              onSwapTemplate={handleSwapTemplate}
              onRemoveChecklist={handleRemoveChecklist}
              loading={checklistLoading}
            />
          ) : (
            <div className="text-center py-12 border rounded-lg bg-gray-50">
              <FileText className="h-12 w-12 mx-auto text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                No checklist applied
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Apply a template to guide your investigation with a structured
                checklist.
              </p>
              <Button
                className="mt-4"
                onClick={() => setShowTemplateSelector(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Apply Template
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Notes tab */}
        <TabsContent value="notes" className="mt-6">
          <InvestigationNotes investigationId={investigation.id} />
        </TabsContent>

        {/* Interviews tab - placeholder */}
        <TabsContent value="interviews" className="mt-6">
          <div className="text-center py-12 border rounded-lg bg-gray-50">
            <Users className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              Interviews
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Interview management coming soon.
            </p>
          </div>
        </TabsContent>

        {/* Files tab - placeholder */}
        <TabsContent value="files" className="mt-6">
          <div className="text-center py-12 border rounded-lg bg-gray-50">
            <Paperclip className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Files</h3>
            <p className="mt-1 text-sm text-gray-500">
              File management coming soon.
            </p>
          </div>
        </TabsContent>

        {/* Activity tab - placeholder */}
        <TabsContent value="activity" className="mt-6">
          <div className="text-center py-12 border rounded-lg bg-gray-50">
            <Activity className="h-12 w-12 mx-auto text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Activity</h3>
            <p className="mt-1 text-sm text-gray-500">
              Activity timeline coming soon.
            </p>
          </div>
        </TabsContent>

        {/* Findings tab */}
        {showFindings && (
          <TabsContent value="findings" className="mt-6">
            <InvestigationFindings investigation={investigation} />
          </TabsContent>
        )}
      </Tabs>

      {/* Template selector dialog */}
      <TemplateSelectorDialog
        open={showTemplateSelector}
        onOpenChange={setShowTemplateSelector}
        categoryId={investigation.categoryId || undefined}
        onApply={handleApplyTemplate}
        loading={applyingTemplate}
      />
    </div>
  );
}
