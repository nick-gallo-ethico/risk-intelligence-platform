"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  FileText,
  Search,
  MessageSquare,
  Paperclip,
  Activity,
  ClipboardCheck,
  ScrollText,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { LinkedRiuList } from "./linked-riu-list";
import { LinkedRiuFormAnswers } from "./linked-riu-form-answers";
import { CaseActivityTimeline } from "./case-activity-timeline";
import { CaseInvestigationsPanel } from "./case-investigations-panel";
import { MessagesTab } from "./messages-tab";
import { FilesTab } from "./files-tab";
import { RemediationTab } from "./remediation-tab";
import { SummaryTab } from "./summary-tab";
import type { Case, RiuAssociation } from "@/types/case";

/**
 * Tab configuration with icons and counts
 * Order: Activities, Overview, Summary, Investigations, Messages, Files, Remediation
 * (Activities is default as investigators check recent activity first)
 */
const TABS = [
  { id: "activity", label: "Activities", icon: Activity },
  { id: "overview", label: "Overview", icon: FileText },
  { id: "summary", label: "Summary", icon: ScrollText },
  { id: "investigations", label: "Investigations", icon: Search },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "files", label: "Files", icon: Paperclip },
  { id: "remediation", label: "Remediation", icon: ClipboardCheck },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface TabCounts {
  investigations?: number;
  messages?: number;
  unreadMessages?: number;
  files?: number;
  activity?: number;
  summary?: number;
  remediation?: number;
}

interface CaseTabsProps {
  caseData: Case | null;
  isLoading: boolean;
  /** Optional tab counts for badge display */
  counts?: TabCounts;
  /** Optional initial tab to display */
  defaultTab?: TabId;
}

/**
 * Tabbed interface for case detail sections.
 *
 * Tabs:
 * - Overview: Linked RIUs, case summary, key dates
 * - Investigations: List of investigations with status
 * - Messages: Anonymous communication thread with reporter
 * - Files: Attachments grid
 * - Activity: Timeline of all case activity
 * - Remediation: Linked remediation plans
 *
 * Features:
 * - Badge indicators showing counts
 * - URL-synced tab navigation
 * - Responsive tab scrolling on mobile
 */
export function CaseTabs({
  caseData,
  isLoading,
  counts = {},
  defaultTab = "activity",
}: CaseTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current tab from URL or use default
  const currentTab = (searchParams?.get("tab") as TabId) || defaultTab;

  // Handle tab change - update URL
  const handleTabChange = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("tab", tab);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  // Handle RIU click - navigate to RIU detail
  const handleRiuClick = useCallback(
    (riuId: string) => {
      router.push(`/rius/${riuId}`);
    },
    [router],
  );

  if (isLoading) {
    return <CaseTabsSkeleton />;
  }

  if (!caseData) {
    return null;
  }

  return (
    <Tabs
      value={currentTab}
      onValueChange={handleTabChange}
      className="h-full flex flex-col"
    >
      {/* Tab List with horizontal scroll on mobile */}
      <div className="border-b bg-white sticky top-0 z-10">
        <TabsList className="h-12 w-full justify-start rounded-none border-0 bg-transparent p-0 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count = counts[tab.id as keyof TabCounts];
            const hasUnread = tab.id === "messages" && counts.unreadMessages;

            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "relative h-12 rounded-none border-b-2 border-transparent px-4 py-2 font-medium",
                  "data-[state=active]:border-blue-600 data-[state=active]:text-blue-600",
                  "data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700",
                  "transition-colors",
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {count !== undefined && count > 0 && (
                    <Badge
                      variant={hasUnread ? "default" : "secondary"}
                      className={cn(
                        "h-5 min-w-5 px-1.5 text-xs",
                        hasUnread && "bg-red-500",
                      )}
                    >
                      {hasUnread ? counts.unreadMessages : count}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {/* Overview Tab */}
        <TabsContent
          value="overview"
          className="h-full m-0 p-0 data-[state=inactive]:hidden"
        >
          <div className="h-full overflow-y-auto">
            <OverviewTab caseData={caseData} onRiuClick={handleRiuClick} />
          </div>
        </TabsContent>

        {/* Investigations Tab */}
        <TabsContent
          value="investigations"
          className="h-full m-0 p-0 data-[state=inactive]:hidden"
        >
          <div className="h-full overflow-y-auto">
            <CaseInvestigationsPanel caseData={caseData} isLoading={false} />
          </div>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent
          value="messages"
          className="h-full m-0 p-0 data-[state=inactive]:hidden"
        >
          <div className="h-full overflow-hidden">
            <MessagesTab
              caseId={caseData.id}
              reporterAnonymous={caseData.reporterAnonymous}
            />
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent
          value="files"
          className="h-full m-0 p-0 data-[state=inactive]:hidden"
        >
          <div className="h-full overflow-y-auto">
            <FilesTab caseId={caseData.id} />
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent
          value="activity"
          className="h-full m-0 p-0 data-[state=inactive]:hidden"
        >
          <div className="h-full overflow-hidden">
            <CaseActivityTimeline caseData={caseData} isLoading={false} />
          </div>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent
          value="summary"
          className="h-full m-0 p-0 data-[state=inactive]:hidden"
        >
          <div className="h-full overflow-y-auto">
            <SummaryTab caseData={caseData} />
          </div>
        </TabsContent>

        {/* Remediation Tab */}
        <TabsContent
          value="remediation"
          className="h-full m-0 p-0 data-[state=inactive]:hidden"
        >
          <div className="h-full overflow-y-auto">
            <RemediationTab caseId={caseData.id} />
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}

/**
 * Pipeline stages for lifecycle visualization
 */
const PIPELINE_STAGES = ["New", "Triage", "Investigation", "Review", "Closed"];

/**
 * Overview tab content - lifecycle, linked RIUs, details, key dates
 */
interface OverviewTabProps {
  caseData: Case;
  onRiuClick?: (riuId: string) => void;
}

function OverviewTab({ caseData, onRiuClick }: OverviewTabProps) {
  // Determine current stage index based on pipelineStage or status
  const currentStageIndex = (() => {
    if (caseData.pipelineStage) {
      const idx = PIPELINE_STAGES.findIndex(
        (s) => s.toLowerCase() === caseData.pipelineStage?.toLowerCase(),
      );
      return idx >= 0 ? idx : 0;
    }
    // Map status to stage if no pipelineStage
    switch (caseData.status) {
      case "CLOSED":
        return 4;
      case "OPEN":
        return 2;
      case "NEW":
      default:
        return 0;
    }
  })();

  return (
    <div className="p-6 space-y-6">
      {/* Lifecycle Section */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Lifecycle</h3>
        <div className="bg-white border rounded-lg p-4">
          {/* Pipeline Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              {PIPELINE_STAGES.map((stage, idx) => (
                <div key={stage} className="flex-1 flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium",
                        idx < currentStageIndex
                          ? "bg-green-500 text-white"
                          : idx === currentStageIndex
                            ? "bg-blue-600 text-white ring-2 ring-blue-200"
                            : "bg-gray-200 text-gray-500",
                      )}
                    >
                      {idx + 1}
                    </div>
                    <span
                      className={cn(
                        "text-xs mt-1",
                        idx === currentStageIndex
                          ? "font-medium text-blue-600"
                          : "text-gray-500",
                      )}
                    >
                      {stage}
                    </span>
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-1",
                        idx < currentStageIndex
                          ? "bg-green-500"
                          : "bg-gray-200",
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Status and Assignees */}
          <div className="flex items-center gap-4 pt-3 border-t">
            <div>
              <span className="text-xs text-gray-500">Status: </span>
              <Badge
                variant={
                  caseData.status === "CLOSED"
                    ? "secondary"
                    : caseData.status === "OPEN"
                      ? "default"
                      : "outline"
                }
              >
                {caseData.status}
              </Badge>
            </div>
            {caseData.assignedInvestigators &&
              caseData.assignedInvestigators.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Assigned:</span>
                  <div className="flex -space-x-2">
                    {caseData.assignedInvestigators.slice(0, 3).map((inv) => (
                      <div
                        key={inv.id}
                        className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600"
                        title={`${inv.firstName} ${inv.lastName}`}
                      >
                        {inv.firstName?.[0]}
                        {inv.lastName?.[0]}
                      </div>
                    ))}
                    {caseData.assignedInvestigators.length > 3 && (
                      <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-600">
                        +{caseData.assignedInvestigators.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        </div>
      </section>

      {/* Linked RIUs Section */}
      <section>
        <LinkedRiuList
          associations={caseData.riuAssociations || []}
          onRiuClick={onRiuClick}
        />
      </section>

      {/* Original Intake Details Section */}
      {caseData.riuAssociations && caseData.riuAssociations.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Original Intake Details
          </h3>
          <div className="bg-white border rounded-lg p-4">
            {(() => {
              const primaryRiu =
                caseData.riuAssociations.find(
                  (a) => a.associationType === "PRIMARY",
                ) || caseData.riuAssociations[0];

              return (
                <LinkedRiuFormAnswers
                  riuId={primaryRiu.riuId}
                  riuType={primaryRiu.riu.type}
                />
              );
            })()}
          </div>
        </section>
      )}

      {/* Case Details Section */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Case Details
        </h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {caseData.details || "No case details available."}
          </p>
        </div>
      </section>

      {/* Key Dates Section */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Key Dates</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Created
            </p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {new Date(caseData.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div className="bg-white border rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Intake
            </p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {new Date(caseData.intakeTimestamp).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
          {caseData.slaDueAt && (
            <div className="bg-white border rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">
                SLA Due
              </p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {new Date(caseData.slaDueAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          )}
          <div className="bg-white border rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">
              Last Updated
            </p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {new Date(caseData.updatedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Skeleton loader for CaseTabs
 */
export function CaseTabsSkeleton() {
  return (
    <div className="h-full flex flex-col">
      {/* Tab List Skeleton */}
      <div className="border-b bg-white">
        <div className="flex items-center gap-4 p-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 p-6 space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
