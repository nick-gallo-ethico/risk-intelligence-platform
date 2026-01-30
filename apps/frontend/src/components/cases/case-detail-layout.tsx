'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CaseHeader } from './case-header';
import { CasePropertiesPanel } from './case-properties-panel';
import { CaseActivityTimeline } from './case-activity-timeline';
import { CaseInvestigationsPanel } from './case-investigations-panel';
import type { Case } from '@/types/case';

interface CaseDetailLayoutProps {
  caseData: Case | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * HubSpot-style 3-column layout for case detail view.
 *
 * Layout:
 * - Left Panel (~300px): Case properties, collapsible
 * - Center Panel (flexible): Activity timeline
 * - Right Panel (~350px): Investigations, AI Summary, collapsible
 *
 * Responsive behavior:
 * - Mobile: Single column, toggle between panels
 * - Tablet: Center panel full, side panels as drawers
 * - Desktop: Full 3-column layout
 */
export function CaseDetailLayout({ caseData, isLoading, error }: CaseDetailLayoutProps) {
  const [leftPanelOpen, setLeftPanelOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  const toggleLeftPanel = useCallback(() => {
    setLeftPanelOpen((prev) => !prev);
  }, []);

  const toggleRightPanel = useCallback(() => {
    setRightPanelOpen((prev) => !prev);
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Case Not Found
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <CaseHeader caseData={caseData} isLoading={isLoading} />

      {/* Panel toggle buttons for mobile/tablet */}
      <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-white border-b">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleLeftPanel}
          className={cn(leftPanelOpen && 'bg-gray-100')}
        >
          Properties
        </Button>
        <span className="text-sm text-gray-500">Activity</span>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleRightPanel}
          className={cn(rightPanelOpen && 'bg-gray-100')}
        >
          Investigations
        </Button>
      </div>

      {/* Main 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Properties */}
        <aside
          className={cn(
            'bg-white border-r overflow-y-auto transition-all duration-300 ease-in-out',
            // Desktop: Fixed width, collapsible
            'hidden lg:block',
            leftPanelOpen ? 'lg:w-[300px]' : 'lg:w-0 lg:border-r-0'
          )}
        >
          {leftPanelOpen && (
            <CasePropertiesPanel caseData={caseData} isLoading={isLoading} />
          )}
        </aside>

        {/* Left panel collapse button (desktop) */}
        <div className="hidden lg:flex items-start pt-4 -ml-3 z-10">
          <button
            onClick={toggleLeftPanel}
            className="p-1 rounded-full bg-white border shadow-sm hover:bg-gray-50 transition-colors"
            aria-label={leftPanelOpen ? 'Collapse properties' : 'Expand properties'}
          >
            <svg
              className={cn(
                'w-4 h-4 text-gray-500 transition-transform',
                !leftPanelOpen && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        {/* Center Panel - Activity Timeline */}
        <main className="flex-1 overflow-y-auto bg-white">
          <CaseActivityTimeline caseData={caseData} isLoading={isLoading} />
        </main>

        {/* Right panel collapse button (desktop) */}
        <div className="hidden lg:flex items-start pt-4 -mr-3 z-10">
          <button
            onClick={toggleRightPanel}
            className="p-1 rounded-full bg-white border shadow-sm hover:bg-gray-50 transition-colors"
            aria-label={rightPanelOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <svg
              className={cn(
                'w-4 h-4 text-gray-500 transition-transform',
                rightPanelOpen && 'rotate-180'
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>

        {/* Right Panel - Investigations & AI */}
        <aside
          className={cn(
            'bg-gray-50 border-l overflow-y-auto transition-all duration-300 ease-in-out',
            // Desktop: Fixed width, collapsible
            'hidden lg:block',
            rightPanelOpen ? 'lg:w-[350px]' : 'lg:w-0 lg:border-l-0'
          )}
        >
          {rightPanelOpen && (
            <CaseInvestigationsPanel caseData={caseData} isLoading={isLoading} />
          )}
        </aside>
      </div>

      {/* Mobile/Tablet slide-over panels */}
      {/* Left panel slide-over */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-50 transition-opacity',
          leftPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <div
          className="absolute inset-0 bg-black/30"
          onClick={toggleLeftPanel}
        />
        <aside
          className={cn(
            'absolute left-0 top-0 bottom-0 w-[300px] bg-white shadow-xl overflow-y-auto transition-transform duration-300',
            leftPanelOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold text-gray-900">Properties</h2>
            <button
              onClick={toggleLeftPanel}
              className="p-1 rounded hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <CasePropertiesPanel caseData={caseData} isLoading={isLoading} />
        </aside>
      </div>

      {/* Right panel slide-over */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-50 transition-opacity',
          rightPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        <div
          className="absolute inset-0 bg-black/30"
          onClick={toggleRightPanel}
        />
        <aside
          className={cn(
            'absolute right-0 top-0 bottom-0 w-[350px] max-w-full bg-gray-50 shadow-xl overflow-y-auto transition-transform duration-300',
            rightPanelOpen ? 'translate-x-0' : 'translate-x-full'
          )}
        >
          <div className="flex items-center justify-between p-4 border-b bg-white">
            <h2 className="font-semibold text-gray-900">Investigations</h2>
            <button
              onClick={toggleRightPanel}
              className="p-1 rounded hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <CaseInvestigationsPanel caseData={caseData} isLoading={isLoading} />
        </aside>
      </div>
    </div>
  );
}
