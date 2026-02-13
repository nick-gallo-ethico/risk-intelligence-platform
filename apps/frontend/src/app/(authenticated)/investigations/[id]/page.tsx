"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  MessageSquare,
  Users,
  Paperclip,
  Activity,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { InvestigationHeader } from "@/components/investigations/investigation-header";
import { InvestigationInfoSummary } from "@/components/investigations/investigation-info-summary";
import {
  InvestigationActionButtons,
  type InvestigationActionType,
} from "@/components/investigations/investigation-action-buttons";
import { InvestigationPropertiesPanel } from "@/components/investigations/investigation-properties-panel";
import { InvestigationNotes } from "@/components/investigations/investigation-notes";
import { InvestigationFindings } from "@/components/investigations/investigation-findings";
import { ChecklistPanel } from "@/components/investigations/checklist-panel";
import { InvestigationActivityTimeline } from "@/components/investigations/investigation-activity-timeline";
import { InvestigationInterviewsTab } from "@/components/investigations/investigation-interviews-tab";
import { InvestigationFilesTab } from "@/components/investigations/investigation-files-tab";
import { TemplateSelectorDialog } from "@/components/investigations/template-selector";
import { useTrackRecentItem } from "@/contexts/shortcuts-context";
import {
  useGlobalShortcuts,
  useTabNavigation,
} from "@/hooks/use-keyboard-shortcuts";
import { getInvestigation } from "@/lib/investigation-api";
import {
  getChecklistProgress,
  applyTemplate,
  completeItem,
  skipItem,
  uncompleteItem,
  addCustomItem,
  deleteChecklist,
  type ChecklistProgress,
} from "@/lib/checklist-api";
import type { Investigation } from "@/types/investigation";

/**
 * Investigation detail page with tabs for Checklist, Notes, Interviews, Files, Activity.
 */
export default function InvestigationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const investigationId = params?.id as string;

  // State
  const [investigation, setInvestigation] = useState<Investigation | null>(
    null,
  );
  const [checklistProgress, setChecklistProgress] =
    useState<ChecklistProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("activity");
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  // Modal states for quick actions
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [interviewModalOpen, setInterviewModalOpen] = useState(false);
  const [evidenceModalOpen, setEvidenceModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  // Tab mapping for keyboard navigation (1-6) - Activity first
  const TABS = [
    "activity",
    "checklist",
    "notes",
    "interviews",
    "files",
    "findings",
  ];

  // Register go back shortcut
  useGlobalShortcuts({
    onGoBack: () => {
      if (investigation?.caseId) {
        router.push(`/cases/${investigation.caseId}`);
      } else {
        router.back();
      }
    },
  });

  // Tab navigation with number keys
  useTabNavigation({
    onTabChange: (index) => {
      if (TABS[index]) {
        setActiveTab(TABS[index]);
      }
    },
    maxTabs: 6,
    enabled: !showTemplateSelector,
  });

  // Track as recent item for command palette
  useTrackRecentItem(
    investigation
      ? {
          id: investigation.id,
          label: `Investigation #${investigation.investigationNumber}`,
          type: "investigation",
          href: `/investigations/${investigation.id}`,
        }
      : null,
  );

  // Fetch investigation data
  const fetchInvestigation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getInvestigation(investigationId);
      setInvestigation(data);
    } catch (err) {
      console.error("Failed to fetch investigation:", err);
      setError("Failed to load investigation");
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
      console.error("Failed to fetch checklist:", err);
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
      console.error("Failed to apply template:", err);
      // TODO: Show toast error
    } finally {
      setApplyingTemplate(false);
    }
  };

  // Handle item completion
  const handleCompleteItem = async (
    itemId: string,
    notes?: string,
    attachmentIds?: string[],
  ) => {
    setChecklistLoading(true);
    try {
      const progress = await completeItem(investigationId, itemId, {
        completionNotes: notes,
        attachmentIds,
      });
      setChecklistProgress(progress);
    } catch (err) {
      console.error("Failed to complete item:", err);
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
      console.error("Failed to skip item:", err);
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
      console.error("Failed to uncomplete item:", err);
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
      console.error("Failed to add custom item:", err);
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
    if (
      !confirm(
        "Are you sure you want to remove the checklist? This cannot be undone.",
      )
    ) {
      return;
    }
    setChecklistLoading(true);
    try {
      await deleteChecklist(investigationId);
      setChecklistProgress(null);
    } catch (err) {
      console.error("Failed to remove checklist:", err);
    } finally {
      setChecklistLoading(false);
    }
  };

  // Quick action handler for left column buttons
  const handleAction = useCallback((action: InvestigationActionType) => {
    switch (action) {
      case "note":
        setNoteModalOpen(true);
        break;
      case "interview":
        setInterviewModalOpen(true);
        break;
      case "evidence":
        setEvidenceModalOpen(true);
        break;
      case "task":
        setTaskModalOpen(true);
        break;
      case "checklist":
        setActiveTab("checklist");
        break;
    }
  }, []);

  // Show findings tab for closed or pending review
  const showFindings =
    investigation?.status === "PENDING_REVIEW" ||
    investigation?.status === "CLOSED";

  if (loading) {
    return <InvestigationDetailPageSkeleton />;
  }

  if (error || !investigation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Investigation Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            {error || "Investigation not found"}
          </p>
          <Button onClick={() => router.back()}>Go back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Full-width header */}
      <div className="border-b bg-white">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <InvestigationHeader
            investigation={investigation}
            onAssign={() => {
              /* TODO: Implement assign modal */
            }}
            onStatusChange={() => {
              /* TODO: Implement status modal */
            }}
          />
        </div>
      </div>

      {/* Three-column grid */}
      <div className="flex-1 max-w-[1800px] mx-auto w-full px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6 h-full">
          {/* Left Column - Summary, Actions, Properties */}
          <div className="space-y-4 lg:sticky lg:top-6 lg:self-start hidden lg:block">
            <InvestigationInfoSummary investigation={investigation} />
            <InvestigationActionButtons
              investigationId={investigation.id}
              onAction={handleAction}
            />
            <InvestigationPropertiesPanel investigation={investigation} />
          </div>

          {/* Center Column - Tabs */}
          <div className="min-h-0 bg-white border rounded-lg overflow-hidden">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="h-full flex flex-col"
            >
              <TabsList className="border-b px-4 pt-2">
                <TabsTrigger
                  value="activity"
                  className="flex items-center gap-2"
                >
                  <Activity className="h-4 w-4" />
                  Activity
                </TabsTrigger>
                <TabsTrigger
                  value="checklist"
                  className="flex items-center gap-2"
                >
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
                  {investigation.notesCount !== undefined &&
                    investigation.notesCount > 0 && (
                      <span className="text-xs bg-gray-200 rounded-full px-1.5">
                        {investigation.notesCount}
                      </span>
                    )}
                </TabsTrigger>
                <TabsTrigger
                  value="interviews"
                  className="flex items-center gap-2"
                >
                  <Users className="h-4 w-4" />
                  Interviews
                </TabsTrigger>
                <TabsTrigger value="files" className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  Files
                </TabsTrigger>
                {showFindings && (
                  <TabsTrigger
                    value="findings"
                    className="flex items-center gap-2"
                  >
                    Findings
                  </TabsTrigger>
                )}
              </TabsList>

              {/* Checklist tab */}
              <TabsContent
                value="checklist"
                className="flex-1 overflow-auto p-4"
              >
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
                      Apply a template to guide your investigation with a
                      structured checklist.
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
              <TabsContent value="notes" className="flex-1 overflow-auto p-4">
                <InvestigationNotes investigationId={investigation.id} />
              </TabsContent>

              {/* Interviews tab */}
              <TabsContent value="interviews" className="flex-1 overflow-auto">
                <InvestigationInterviewsTab
                  investigationId={investigation.id}
                  onScheduleInterview={() => setInterviewModalOpen(true)}
                />
              </TabsContent>

              {/* Files tab */}
              <TabsContent value="files" className="flex-1 overflow-auto">
                <InvestigationFilesTab
                  investigationId={investigation.id}
                  onUploadFile={() => setEvidenceModalOpen(true)}
                />
              </TabsContent>

              {/* Activity tab */}
              <TabsContent value="activity" className="flex-1 overflow-hidden">
                <InvestigationActivityTimeline
                  investigationId={investigation.id}
                />
              </TabsContent>

              {/* Findings tab */}
              {showFindings && (
                <TabsContent
                  value="findings"
                  className="flex-1 overflow-auto p-4"
                >
                  <InvestigationFindings investigation={investigation} />
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Right Column - Associations (Plan 06) */}
          <div className="space-y-4 hidden lg:block">
            {/* Placeholder for association cards */}
            <div className="text-sm text-gray-500 p-4 border rounded-lg bg-white">
              Association cards will be added in Plan 06
            </div>
          </div>
        </div>
      </div>

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

/**
 * Skeleton loader for the entire page - three-column layout
 */
function InvestigationDetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header skeleton */}
      <div className="bg-white border-b px-6 py-4">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-4 w-12" />
            <span className="text-gray-300">/</span>
            <Skeleton className="h-4 w-24" />
            <span className="text-gray-300">/</span>
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
          {/* Pipeline skeleton */}
          <div className="flex items-center gap-1 mt-4 pt-4 border-t">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-2 w-24 rounded-full" />
            ))}
          </div>
        </div>
      </div>

      {/* Three-column layout skeleton */}
      <div className="flex-1 max-w-[1800px] mx-auto w-full px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] gap-6">
          {/* Left column skeleton */}
          <div className="hidden lg:block space-y-4">
            {/* Summary card skeleton */}
            <div className="rounded-lg border bg-white p-4 space-y-3">
              <Skeleton className="h-5 w-32" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <div className="space-y-2 pt-2 border-t">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>
            {/* Actions skeleton */}
            <div className="rounded-lg border bg-white p-4">
              <Skeleton className="h-3 w-24 mb-3" />
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            </div>
            {/* Properties skeleton */}
            <div className="rounded-lg border bg-white p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Center column skeleton */}
          <div className="bg-white border rounded-lg p-6">
            <div className="flex gap-4 mb-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-8 w-24" />
              ))}
            </div>
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          </div>

          {/* Right column skeleton */}
          <div className="hidden lg:block">
            <div className="rounded-lg border bg-white p-4">
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
