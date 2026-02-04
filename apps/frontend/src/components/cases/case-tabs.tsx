'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import {
  FileText,
  Search,
  MessageSquare,
  Paperclip,
  Activity,
  ClipboardCheck,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { LinkedRiuList } from './linked-riu-list';
import { CaseActivityTimeline } from './case-activity-timeline';
import { CaseInvestigationsPanel } from './case-investigations-panel';
import type { Case, RiuAssociation } from '@/types/case';

/**
 * Tab configuration with icons and counts
 */
const TABS = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'investigations', label: 'Investigations', icon: Search },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'files', label: 'Files', icon: Paperclip },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'remediation', label: 'Remediation', icon: ClipboardCheck },
] as const;

type TabId = (typeof TABS)[number]['id'];

interface TabCounts {
  investigations?: number;
  messages?: number;
  unreadMessages?: number;
  files?: number;
  activity?: number;
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
  defaultTab = 'overview',
}: CaseTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current tab from URL or use default
  const currentTab = (searchParams.get('tab') as TabId) || defaultTab;

  // Handle tab change - update URL
  const handleTabChange = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('tab', tab);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Handle RIU click - navigate to RIU detail
  const handleRiuClick = useCallback(
    (riuId: string) => {
      router.push(`/rius/${riuId}`);
    },
    [router]
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
            const hasUnread = tab.id === 'messages' && counts.unreadMessages;

            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  'relative h-12 rounded-none border-b-2 border-transparent px-4 py-2 font-medium',
                  'data-[state=active]:border-blue-600 data-[state=active]:text-blue-600',
                  'data-[state=inactive]:text-gray-500 data-[state=inactive]:hover:text-gray-700',
                  'transition-colors'
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {count !== undefined && count > 0 && (
                    <Badge
                      variant={hasUnread ? 'default' : 'secondary'}
                      className={cn(
                        'h-5 min-w-5 px-1.5 text-xs',
                        hasUnread && 'bg-red-500'
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
          <div className="h-full overflow-y-auto">
            <MessagesTab caseData={caseData} />
          </div>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent
          value="files"
          className="h-full m-0 p-0 data-[state=inactive]:hidden"
        >
          <div className="h-full overflow-y-auto">
            <FilesTab caseData={caseData} />
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

        {/* Remediation Tab */}
        <TabsContent
          value="remediation"
          className="h-full m-0 p-0 data-[state=inactive]:hidden"
        >
          <div className="h-full overflow-y-auto">
            <RemediationTab caseData={caseData} />
          </div>
        </TabsContent>
      </div>
    </Tabs>
  );
}

/**
 * Overview tab content - linked RIUs, summary, key dates
 */
interface OverviewTabProps {
  caseData: Case;
  onRiuClick?: (riuId: string) => void;
}

function OverviewTab({ caseData, onRiuClick }: OverviewTabProps) {
  return (
    <div className="p-6 space-y-6">
      {/* Linked RIUs Section */}
      <section>
        <LinkedRiuList
          associations={caseData.riuAssociations || []}
          onRiuClick={onRiuClick}
        />
      </section>

      {/* Case Details Section */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Case Details</h3>
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {caseData.details}
          </p>
        </div>
      </section>

      {/* Key Dates Section */}
      <section>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Key Dates</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Created</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {new Date(caseData.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
          <div className="bg-white border rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Intake</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {new Date(caseData.intakeTimestamp).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
          {caseData.slaDueAt && (
            <div className="bg-white border rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">SLA Due</p>
              <p className="text-sm font-medium text-gray-900 mt-1">
                {new Date(caseData.slaDueAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
          <div className="bg-white border rounded-lg p-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Last Updated</p>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {new Date(caseData.updatedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/**
 * Messages tab - anonymous communication placeholder
 */
function MessagesTab({ caseData }: { caseData: Case }) {
  return (
    <div className="p-6">
      <div className="text-center py-12 text-gray-400 border border-dashed rounded-md">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h4 className="text-sm font-medium text-gray-900 mb-1">
          Anonymous Communication
        </h4>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Securely communicate with the reporter through the anonymous relay system.
          Messages are end-to-end encrypted.
        </p>
        {caseData.reporterAnonymous && (
          <Badge variant="outline" className="mt-4">
            Reporter is anonymous
          </Badge>
        )}
      </div>
    </div>
  );
}

/**
 * Files tab - attachments grid placeholder
 */
function FilesTab({ caseData }: { caseData: Case }) {
  // TODO: Fetch attachments for case and pass to FileList
  // For now, show placeholder
  return (
    <div className="p-6">
      <div className="text-center py-12 text-gray-400 border border-dashed rounded-md">
        <Paperclip className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h4 className="text-sm font-medium text-gray-900 mb-1">
          Attachments
        </h4>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Upload and manage files related to this case. Documents, images, and evidence can be attached here.
        </p>
        <Button variant="outline" size="sm" className="mt-4">
          Upload File
        </Button>
      </div>
    </div>
  );
}

/**
 * Remediation tab - linked remediation plans placeholder
 */
function RemediationTab({ caseData }: { caseData: Case }) {
  return (
    <div className="p-6">
      <div className="text-center py-12 text-gray-400 border border-dashed rounded-md">
        <ClipboardCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h4 className="text-sm font-medium text-gray-900 mb-1">
          Remediation Plans
        </h4>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Create and track remediation plans to address findings from investigations.
        </p>
      </div>
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
