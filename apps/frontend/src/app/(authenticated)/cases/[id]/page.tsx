"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { useTrackRecentItem } from "@/contexts/shortcuts-context";
import { useGlobalShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { casesApi } from "@/lib/cases-api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CaseDetailHeader } from "@/components/cases/case-detail-header";
import { CasePropertiesPanel } from "@/components/cases/case-properties-panel";
import { CaseInfoSummary } from "@/components/cases/case-info-summary";
import {
  ActionButtonRow,
  type ActionType,
} from "@/components/cases/action-button-row";
import { CaseTabs } from "@/components/cases/case-tabs";
import { ConnectedPeopleCard } from "@/components/cases/connected-people-card";
import { ConnectedDocumentsCard } from "@/components/cases/connected-documents-card";
import { AssignModal } from "@/components/cases/assign-modal";
import { StatusChangeModal } from "@/components/cases/status-change-modal";
import { MergeModal } from "@/components/cases/merge-modal";
import { AddNoteModal } from "@/components/cases/add-note-modal";
import { EmailLogModal } from "@/components/cases/email-log-modal";
import { Sparkles } from "lucide-react";
import type { Case } from "@/types/case";

/**
 * Case Detail Page
 *
 * Three-column layout:
 * - Left column: Case info summary, quick actions, properties panel
 * - Center column: Tabbed interface (Overview, Investigations, Messages, Files, Activity, Remediation)
 * - Right column: Connected entities (placeholder for Plan 05)
 *
 * Route: /cases/[id]
 */
export default function CaseDetailPage() {
  return (
    <Suspense fallback={<CaseDetailPageSkeleton />}>
      <CaseDetailPageContent />
    </Suspense>
  );
}

function CaseDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal open states
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  const caseId = params?.id as string;

  // Register go back shortcut
  useGlobalShortcuts({
    onGoBack: () => router.push("/cases"),
  });

  // Track as recent item for command palette
  useTrackRecentItem(
    caseData
      ? {
          id: caseData.id,
          label: `Case ${caseData.referenceNumber}`,
          type: "case",
          href: `/cases/${caseData.id}`,
        }
      : null,
  );

  const fetchCase = useCallback(async () => {
    if (!caseId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await casesApi.getById(caseId);
      setCaseData(data);
    } catch (err) {
      console.error("Failed to fetch case:", err);
      // Check if it's a 404
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 404) {
          setError(
            "Case not found. It may have been deleted or you may not have access.",
          );
        } else {
          setError("Failed to load case. Please try again.");
        }
      } else {
        setError("Failed to load case. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [authLoading, isAuthenticated, router]);

  // Fetch case data when authenticated
  useEffect(() => {
    if (isAuthenticated && caseId) {
      fetchCase();
    }
  }, [isAuthenticated, caseId, fetchCase]);

  // Action handlers for header buttons
  const handleAssign = useCallback(() => {
    setAssignModalOpen(true);
  }, []);

  const handleChangeStatus = useCallback(() => {
    setStatusModalOpen(true);
  }, []);

  const handleMerge = useCallback(() => {
    setMergeModalOpen(true);
  }, []);

  // Handle merge success - redirect to target case
  const handleMergeSuccess = useCallback(
    (targetCaseId: string) => {
      router.push(`/cases/${targetCaseId}`);
    },
    [router],
  );

  // Quick action handler for left column buttons
  const handleAction = useCallback((action: ActionType) => {
    switch (action) {
      case "note":
        setNoteModalOpen(true);
        break;
      case "email":
        setEmailModalOpen(true);
        break;
      case "interview":
        console.log("Interview - coming soon");
        break;
      case "document":
        console.log("Document - coming soon");
        break;
      case "task":
        console.log("Task - coming soon");
        break;
    }
  }, []);

  // Show loading while checking auth
  if (authLoading) {
    return <CaseDetailPageSkeleton />;
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Case Not Found
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => router.push("/cases")}>Back to Cases</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <CaseDetailHeader
        caseData={caseData}
        isLoading={loading}
        onAssign={handleAssign}
        onChangeStatus={handleChangeStatus}
        onMerge={handleMerge}
      />

      {/* Three-column grid layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] overflow-hidden">
        {/* LEFT COLUMN - Case info, actions, properties */}
        <aside className="border-r overflow-y-auto bg-white hidden lg:block">
          <CaseInfoSummary caseData={caseData} isLoading={loading} />
          <ActionButtonRow
            caseId={caseData?.id ?? ""}
            onAction={handleAction}
          />
          <div className="border-t">
            <CasePropertiesPanel caseData={caseData} isLoading={loading} />
          </div>
        </aside>

        {/* CENTER COLUMN - Tabs */}
        <main className="overflow-hidden bg-white">
          <CaseTabs
            caseData={caseData}
            isLoading={loading}
            counts={{
              investigations: 0, // TODO: Get from API
              messages: 0,
              unreadMessages: 0,
              files: 0,
            }}
            defaultTab="overview"
          />
        </main>

        {/* RIGHT COLUMN - Connected entities */}
        <aside className="border-l overflow-y-auto bg-gray-50/50 hidden lg:block">
          <div className="p-4 space-y-4">
            {caseData && (
              <>
                <ConnectedPeopleCard caseId={caseData.id} />
                <ConnectedDocumentsCard caseId={caseData.id} />
                <div className="pt-2">
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={() => setAiPanelOpen(true)}
                  >
                    <Sparkles className="w-4 h-4" />
                    Ask AI Assistant
                  </Button>
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {/* Modals - only render when caseData is available */}
      {caseData && (
        <>
          <AssignModal
            caseId={caseData.id}
            currentAssigneeIds={
              caseData.assignedInvestigators?.map((u) => u.id) ?? []
            }
            open={assignModalOpen}
            onOpenChange={setAssignModalOpen}
            onAssigned={fetchCase}
          />
          <StatusChangeModal
            caseId={caseData.id}
            currentStatus={caseData.status}
            open={statusModalOpen}
            onOpenChange={setStatusModalOpen}
            onStatusChanged={fetchCase}
          />
          <MergeModal
            caseId={caseData.id}
            caseReferenceNumber={caseData.referenceNumber}
            open={mergeModalOpen}
            onOpenChange={setMergeModalOpen}
            onMerged={handleMergeSuccess}
          />
          <AddNoteModal
            caseId={caseData.id}
            open={noteModalOpen}
            onOpenChange={setNoteModalOpen}
            onNoteAdded={fetchCase}
          />
          <EmailLogModal
            caseId={caseData.id}
            open={emailModalOpen}
            onOpenChange={setEmailModalOpen}
            onEmailLogged={fetchCase}
          />
        </>
      )}
    </div>
  );
}

/**
 * Skeleton loader for the entire page - three-column layout
 */
function CaseDetailPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header skeleton */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-12" />
          <span className="text-gray-300">/</span>
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-8 w-40" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-24" />
          </div>
        </div>
      </div>

      {/* Three-column layout skeleton */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr_300px]">
        {/* Left column skeleton */}
        <aside className="hidden lg:block bg-white border-r">
          {/* CaseInfoSummary skeleton */}
          <div className="p-4">
            <Skeleton className="h-6 w-36 mb-3" />
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-3 border-t pt-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4 rounded" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>
          {/* ActionButtonRow skeleton */}
          <div className="p-4">
            <Skeleton className="h-3 w-24 mb-2" />
            <div className="space-y-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          </div>
          {/* Properties skeleton */}
          <div className="border-t p-4 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </aside>

        {/* Center column skeleton */}
        <main className="bg-white p-6">
          <div className="flex gap-4 mb-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-8 w-24" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </main>

        {/* Right column skeleton */}
        <aside className="hidden lg:block bg-gray-50/50 border-l p-4 space-y-4">
          {/* Connected People skeleton */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
          {/* Connected Documents skeleton */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
          {/* AI button skeleton */}
          <Skeleton className="h-10 w-full mt-2" />
        </aside>
      </div>
    </div>
  );
}
