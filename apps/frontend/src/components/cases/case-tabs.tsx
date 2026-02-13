"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, CheckSquare, ArrowRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { LinkedRiuList } from "./linked-riu-list";
import { LinkedRiuFormAnswers } from "./linked-riu-form-answers";
import { CaseActivityTimeline } from "./case-activity-timeline";
import { CaseInvestigationsPanel } from "./case-investigations-panel";
import { MessagesTab } from "./messages-tab";
import { FilesTab } from "./files-tab";
import { RemediationTab } from "./remediation-tab";
import { ActivityEntry } from "./activity-entry";
import {
  DataHighlightsCard,
  type DataHighlight,
} from "@/components/record-detail/DataHighlightsCard";
import { EditableSummary } from "@/components/record-detail/EditableSummary";
import {
  StatusHistoryTimeline,
  type StatusChange,
} from "@/components/record-detail/StatusHistoryTimeline";
import { useActivities } from "@/hooks/useActivities";
import { apiClient } from "@/lib/api";
import type { Case } from "@/types/case";

/**
 * Tab configuration - text only, no icons
 * Order: Overview, Activities, Investigations, Messages, Files, Remediation
 * Overview is default - provides context before diving into specific areas
 */
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "activities", label: "Activities" },
  { id: "investigations", label: "Investigations" },
  { id: "messages", label: "Messages" },
  { id: "files", label: "Files" },
  { id: "remediation", label: "Remediation" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface TabCounts {
  investigations?: number;
  messages?: number;
  unreadMessages?: number;
  files?: number;
  activities?: number;
  remediation?: number;
}

interface CaseTabsProps {
  caseData: Case | null;
  isLoading: boolean;
  /** Optional tab counts for badge display */
  counts?: TabCounts;
  /** Callback to refresh case data */
  onRefresh?: () => void;
  /** Callback to open task creation modal */
  onCreateTask?: () => void;
}

/**
 * Tabbed interface for case detail sections.
 *
 * Tabs (6 total):
 * - Overview: Data Highlights, Summary, Case Details, Status History, Recent Activities, Tasks (DEFAULT)
 * - Activities: Timeline of all case activity
 * - Investigations: List of investigations with status
 * - Messages: Reporter communication and email correspondence
 * - Files: Attachments with upload, search, sort
 * - Remediation: Linked remediation plans
 *
 * Features:
 * - Badge indicators showing counts
 * - Local state only (no URL syncing)
 * - Responsive tab scrolling on mobile
 */
export function CaseTabs({
  caseData,
  isLoading,
  counts = {},
  onRefresh,
  onCreateTask,
}: CaseTabsProps) {
  const router = useRouter();

  // Local tab state - always starts on Overview
  const [currentTab, setCurrentTab] = useState<TabId>("overview");

  // Handle RIU click - navigate to RIU detail
  const handleRiuClick = useCallback(
    (riuId: string) => {
      router.push(`/rius/${riuId}`);
    },
    [router],
  );

  // Handler to switch to Activities tab (for "View all" link)
  const handleViewAllActivities = useCallback(() => {
    setCurrentTab("activities");
  }, []);

  if (isLoading) {
    return <CaseTabsSkeleton />;
  }

  if (!caseData) {
    return null;
  }

  return (
    <Tabs
      value={currentTab}
      onValueChange={(value) => setCurrentTab(value as TabId)}
      className="h-full flex flex-col"
    >
      {/* Tab List with horizontal scroll on mobile */}
      <div className="border-b bg-white sticky top-0 z-10">
        <TabsList className="h-12 w-full justify-start rounded-none border-0 bg-transparent p-0 overflow-x-auto">
          {TABS.map((tab) => {
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
                  <span>{tab.label}</span>
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
        {/* Overview Tab (default) */}
        <TabsContent
          value="overview"
          className="h-full m-0 p-0 data-[state=inactive]:hidden"
        >
          <div className="h-full overflow-y-auto">
            <OverviewTab
              caseData={caseData}
              onRiuClick={handleRiuClick}
              onViewAllActivities={handleViewAllActivities}
              onRefresh={onRefresh}
              onCreateTask={onCreateTask}
            />
          </div>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent
          value="activities"
          className="h-full m-0 p-0 data-[state=inactive]:hidden"
        >
          <div className="h-full overflow-hidden">
            <CaseActivityTimeline caseData={caseData} isLoading={false} />
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
 * Overview tab content - 6 sections per spec:
 * 1. Data Highlights (6-value grid)
 * 2. Editable Summary with AI
 * 3. Case Details (collapsible, collapsed by default)
 * 4. Status History Timeline
 * 5. Recent Activities (3 items + View all)
 * 6. Upcoming Tasks (3 items with checkboxes)
 *
 * NOTE: Pipeline visualization is now in PipelineStageBar above tabs,
 * NOT inside this Overview tab.
 */
interface OverviewTabProps {
  caseData: Case;
  onRiuClick?: (riuId: string) => void;
  onViewAllActivities?: () => void;
  onRefresh?: () => void;
  onCreateTask?: () => void;
}

function OverviewTab({
  caseData,
  onRiuClick,
  onViewAllActivities,
  onRefresh,
  onCreateTask,
}: OverviewTabProps) {
  // Local state for collapsible case details
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isSavingSummary, setIsSavingSummary] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Fetch activities for Recent Activities and Status History
  const { activities, isLoading: activitiesLoading } = useActivities({
    entityType: "CASE",
    entityId: caseData.id,
    enabled: !!caseData.id,
  });

  // Compute Data Highlights
  const dataHighlights = useMemo<DataHighlight[]>(() => {
    // Calculate case age
    const createdDate = new Date(caseData.createdAt);
    const now = new Date();
    const ageInDays = Math.floor(
      (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const caseAge =
      ageInDays === 0
        ? "Today"
        : ageInDays === 1
          ? "1 day"
          : `${ageInDays} days`;

    // Get assignee name
    const assignee =
      caseData.assignedInvestigators &&
      caseData.assignedInvestigators.length > 0
        ? `${caseData.assignedInvestigators[0].firstName} ${caseData.assignedInvestigators[0].lastName}`
        : null;

    // Get source channel display name
    const sourceChannelMap: Record<string, string> = {
      HOTLINE: "Hotline",
      WEB_FORM: "Web Form",
      PROXY: "Proxy Report",
      DIRECT_ENTRY: "Direct Entry",
      CHATBOT: "Chatbot",
    };

    return [
      { label: "Severity", value: caseData.severity, type: "badge" as const },
      { label: "Status", value: caseData.status, type: "badge" as const },
      { label: "Case Age", value: caseAge, type: "text" as const },
      {
        label: "SLA Status",
        value: caseData.slaStatus || "ON_TRACK",
        type: "sla" as const,
      },
      {
        label: "Assigned To",
        value: assignee,
        type: "user" as const,
        avatarUrl: caseData.assignedInvestigators?.[0]?.avatarUrl,
      },
      {
        label: "Source",
        value:
          sourceChannelMap[caseData.sourceChannel] || caseData.sourceChannel,
        type: "text" as const,
      },
    ];
  }, [caseData]);

  // Extract status changes from activities for timeline
  const statusChanges = useMemo<StatusChange[]>(() => {
    return activities
      .filter((a) => a.action === "status_changed")
      .map((a) => ({
        status: (a.changes?.status?.new as string) || "Unknown",
        date: a.createdAt,
        changedBy: a.actorName || "System",
        rationale: a.context?.rationale as string | undefined,
      }))
      .slice(0, 10); // Limit to 10 most recent
  }, [activities]);

  // Get 3 most recent activities for preview
  const recentActivities = useMemo(() => {
    return activities.slice(0, 3);
  }, [activities]);

  // Mock tasks data - in real implementation, this would come from API
  // TODO: Wire to actual tasks endpoint when available
  const mockTasks = useMemo(() => {
    return [
      {
        id: "task-1",
        title: "Review initial findings",
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        isCompleted: false,
      },
      {
        id: "task-2",
        title: "Schedule follow-up interview",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        isCompleted: false,
      },
      {
        id: "task-3",
        title: "Document preliminary assessment",
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        isCompleted: true,
      },
    ].slice(0, 3);
  }, []);

  // Handle summary save
  const handleSaveSummary = useCallback(
    async (newSummary: string) => {
      setIsSavingSummary(true);
      try {
        await apiClient.patch(`/cases/${caseData.id}`, { summary: newSummary });
        onRefresh?.();
      } finally {
        setIsSavingSummary(false);
      }
    },
    [caseData.id, onRefresh],
  );

  // Handle AI summary generation
  const handleAiGenerate = useCallback(async () => {
    setIsGeneratingAi(true);
    try {
      const response = await apiClient.post<{ summary: string }>(
        `/ai/summarize`,
        {
          entityType: "case",
          entityId: caseData.id,
          content: caseData.details,
        },
      );
      return response.summary;
    } catch {
      // Return a placeholder if AI fails
      return `AI-generated summary for case ${caseData.referenceNumber}:\n\nThis case involves ${caseData.details?.substring(0, 100) || "reported concerns"}...`;
    } finally {
      setIsGeneratingAi(false);
    }
  }, [caseData]);

  // Handle task completion toggle (mock)
  const handleToggleTask = useCallback((taskId: string, completed: boolean) => {
    console.log(
      `Toggle task ${taskId} to ${completed ? "completed" : "incomplete"}`,
    );
    // TODO: Wire to actual API when available
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Section 1: Data Highlights - 6-value grid */}
      <DataHighlightsCard highlights={dataHighlights} />

      {/* Section 2: Editable Summary with AI */}
      <EditableSummary
        summary={caseData.aiSummary || caseData.summary}
        onSave={handleSaveSummary}
        onAiGenerate={handleAiGenerate}
        isGenerating={isGeneratingAi}
        isSaving={isSavingSummary}
      />

      {/* Section 3: Case Details (Collapsible, collapsed by default) */}
      <Card>
        <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
          <CardHeader className="py-3 cursor-pointer hover:bg-gray-50">
            <CollapsibleTrigger asChild>
              <div className="flex items-center gap-2">
                <ChevronRight
                  className={cn(
                    "h-4 w-4 text-gray-500 transition-transform",
                    detailsOpen && "rotate-90",
                  )}
                />
                <CardTitle className="text-sm font-semibold text-gray-700">
                  Case Details
                </CardTitle>
              </div>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              {/* Details text */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {caseData.details || "No case details available."}
                </p>
              </div>

              {/* Two-column property grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Category:</span>
                  <span className="ml-2 font-medium">
                    {caseData.category?.name || "Not categorized"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Case Type:</span>
                  <span className="ml-2 font-medium">{caseData.caseType}</span>
                </div>
                <div>
                  <span className="text-gray-500">Reporter Type:</span>
                  <span className="ml-2 font-medium">
                    {caseData.reporterType}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Location:</span>
                  <span className="ml-2 font-medium">
                    {[
                      caseData.locationCity,
                      caseData.locationState,
                      caseData.locationCountry,
                    ]
                      .filter(Boolean)
                      .join(", ") || "Not specified"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2 font-medium">
                    {new Date(caseData.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="ml-2 font-medium">
                    {new Date(caseData.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* View All Properties link */}
              <Button
                variant="link"
                className="text-blue-600 p-0 h-auto text-sm"
                onClick={() => {
                  /* TODO: open full properties panel */
                }}
              >
                View All Properties
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Section 4: Status History Timeline */}
      <StatusHistoryTimeline changes={statusChanges} />

      {/* Section 5: Recent Activities (3 items + View all) */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700">
              Recent Activities
            </CardTitle>
            {activities.length > 3 && (
              <Button
                variant="link"
                className="text-blue-600 p-0 h-auto text-sm"
                onClick={onViewAllActivities}
              >
                View all
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {activitiesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentActivities.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No activities yet. Use the quick actions above to log your first
              activity.
            </p>
          ) : (
            <div className="space-y-0">
              {recentActivities.map((activity, index) => (
                <ActivityEntry
                  key={activity.id}
                  activity={activity}
                  isLast={index === recentActivities.length - 1}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 6: Upcoming Tasks (3 items with checkboxes) */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Upcoming Tasks
            </CardTitle>
            <Button
              variant="link"
              className="text-blue-600 p-0 h-auto text-sm"
              onClick={() => {
                /* TODO: navigate to tasks view */
              }}
            >
              View all
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {mockTasks.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No upcoming tasks. Create a task from the quick actions or right
              sidebar.
            </p>
          ) : (
            <div className="space-y-2">
              {mockTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 py-2 border-b last:border-0"
                >
                  <Checkbox
                    checked={task.isCompleted}
                    onCheckedChange={(checked) =>
                      handleToggleTask(task.id, checked === true)
                    }
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm font-medium",
                        task.isCompleted && "line-through text-gray-400",
                      )}
                    >
                      {task.title}
                    </p>
                    {task.dueDate && (
                      <p className="text-xs text-gray-500">
                        Due{" "}
                        {new Date(task.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Skeleton loader for CaseTabs
 */
export function CaseTabsSkeleton() {
  return (
    <div className="h-full flex flex-col">
      {/* Tab List Skeleton - 6 tabs */}
      <div className="border-b bg-white">
        <div className="flex items-center gap-4 p-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
