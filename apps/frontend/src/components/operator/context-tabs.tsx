'use client';

/**
 * ContextTabs - Right Panel Context Tabs Component
 *
 * Tabs for switching between different context panels:
 * - Script/Guide: DirectivesPanel
 * - HRIS Lookup: HrisLookupPanel
 * - History: CallerHistoryPanel
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DirectivesPanel } from './directives-panel';
import { HrisLookupPanel } from './hris-lookup-panel';
import { CallerHistoryPanel } from './caller-history-panel';
import { FileText, Users, History } from 'lucide-react';
import type { ClientProfile } from '@/types/operator.types';

export interface ContextTabsProps {
  /** Currently loaded client profile */
  clientProfile: ClientProfile | null;
  /** Current intake stage for highlighting directives */
  currentStage?: 'opening' | 'intake' | 'closing';
  /** Selected category ID for category-specific directives */
  selectedCategoryId?: string;
}

export function ContextTabs({
  clientProfile,
  currentStage = 'opening',
  selectedCategoryId,
}: ContextTabsProps) {
  const [activeTab, setActiveTab] = useState<'script' | 'hris' | 'history'>(
    'script'
  );

  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as typeof activeTab)}
      className="flex flex-col h-full"
    >
      <TabsList className="w-full justify-start border-b rounded-none h-12 px-4 bg-transparent">
        <TabsTrigger
          value="script"
          className="gap-2 data-[state=active]:bg-muted"
        >
          <FileText className="h-4 w-4" />
          Script/Guide
        </TabsTrigger>
        <TabsTrigger
          value="hris"
          className="gap-2 data-[state=active]:bg-muted"
        >
          <Users className="h-4 w-4" />
          HRIS Lookup
        </TabsTrigger>
        <TabsTrigger
          value="history"
          className="gap-2 data-[state=active]:bg-muted"
        >
          <History className="h-4 w-4" />
          History
        </TabsTrigger>
      </TabsList>

      <div className="flex-1 overflow-y-auto">
        <TabsContent value="script" className="m-0 p-4 h-full">
          <DirectivesPanel
            clientProfile={clientProfile}
            currentStage={currentStage}
            selectedCategoryId={selectedCategoryId}
          />
        </TabsContent>
        <TabsContent value="hris" className="m-0 p-4 h-full">
          <HrisLookupPanel clientProfile={clientProfile} />
        </TabsContent>
        <TabsContent value="history" className="m-0 p-4 h-full">
          <CallerHistoryPanel clientProfile={clientProfile} />
        </TabsContent>
      </div>
    </Tabs>
  );
}
