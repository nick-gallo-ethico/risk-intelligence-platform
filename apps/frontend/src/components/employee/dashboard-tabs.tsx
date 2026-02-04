'use client';

/**
 * DashboardTabs Component
 *
 * Role-aware tab navigation for the Employee Portal dashboard.
 *
 * Features:
 * - My Tasks tab (always shown, default)
 * - My Team tab (only if isManager = true)
 * - My History tab
 * - Policies tab
 * - Badge on tabs showing counts
 * - Responsive: horizontal tabs on desktop, works with bottom nav on mobile
 */

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type DashboardTab = 'tasks' | 'team' | 'history' | 'policies';

export interface DashboardTabsProps {
  /** Whether user is a manager */
  isManager: boolean;
  /** Currently active tab */
  activeTab: DashboardTab;
  /** Callback when tab changes */
  onTabChange: (tab: DashboardTab) => void;
  /** Pending task count for badge */
  pendingTaskCount?: number;
  /** Overdue task count for badge (managers only) */
  teamNeedsAttentionCount?: number;
  /** Additional class name */
  className?: string;
}

/**
 * DashboardTabs - Tab navigation for employee dashboard.
 */
export function DashboardTabs({
  isManager,
  activeTab,
  onTabChange,
  pendingTaskCount,
  teamNeedsAttentionCount,
  className,
}: DashboardTabsProps) {
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) => onTabChange(value as DashboardTab)}
      className={className}
    >
      <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:w-auto lg:inline-flex">
        {/* My Tasks tab - always shown */}
        <TabsTrigger
          value="tasks"
          className="flex items-center gap-2"
        >
          My Tasks
          {pendingTaskCount !== undefined && pendingTaskCount > 0 && (
            <Badge
              variant={activeTab === 'tasks' ? 'secondary' : 'default'}
              className="ml-1 h-5 min-w-[20px] flex items-center justify-center text-xs"
            >
              {pendingTaskCount > 99 ? '99+' : pendingTaskCount}
            </Badge>
          )}
        </TabsTrigger>

        {/* My Team tab - only for managers */}
        {isManager && (
          <TabsTrigger
            value="team"
            className="flex items-center gap-2"
          >
            My Team
            {teamNeedsAttentionCount !== undefined && teamNeedsAttentionCount > 0 && (
              <Badge
                variant={activeTab === 'team' ? 'secondary' : 'destructive'}
                className="ml-1 h-5 min-w-[20px] flex items-center justify-center text-xs"
              >
                {teamNeedsAttentionCount > 99 ? '99+' : teamNeedsAttentionCount}
              </Badge>
            )}
          </TabsTrigger>
        )}

        {/* My History tab */}
        <TabsTrigger value="history">My History</TabsTrigger>

        {/* Policies tab */}
        <TabsTrigger value="policies">Policies</TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

export default DashboardTabs;
