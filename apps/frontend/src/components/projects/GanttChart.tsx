'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  TimelineZoom,
  calculateTimelineRange,
  calculateMilestoneBar,
  getStatusColor,
  getStatusBgColor,
  getTodayPosition,
  formatDateRange,
  MilestoneBar,
} from '@/lib/gantt-utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Calendar } from 'lucide-react';
import type { MilestoneResponseDto } from '@/types/milestone';

interface GanttChartProps {
  milestones: MilestoneResponseDto[];
  onMilestoneClick?: (milestone: MilestoneResponseDto) => void;
  className?: string;
}

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 60;

/**
 * Interactive Gantt chart component for visualizing project milestones.
 *
 * Features:
 * - Timeline zoom (week/month/quarter views)
 * - Progress bars showing completion percentage
 * - Today line marker
 * - Status-based color coding
 * - Tooltips with milestone details
 */
export function GanttChart({
  milestones,
  onMilestoneClick,
  className,
}: GanttChartProps) {
  const [zoom, setZoom] = useState<TimelineZoom>('month');

  // Calculate timeline range based on milestones
  const timeline = useMemo(() => {
    const milestoneDates = milestones.map((m) => ({
      targetDate: new Date(m.targetDate),
      createdAt: new Date(m.createdAt),
    }));
    return calculateTimelineRange(milestoneDates, zoom);
  }, [milestones, zoom]);

  // Calculate bar positions for each milestone
  const bars = useMemo(() => {
    return milestones.map((m, index) =>
      calculateMilestoneBar(
        {
          id: m.id,
          name: m.name,
          createdAt: new Date(m.createdAt),
          targetDate: new Date(m.targetDate),
          progressPercent: m.progressPercent,
          status: m.status,
        },
        timeline,
        index
      )
    );
  }, [milestones, timeline]);

  // Calculate today line position
  const todayPosition = useMemo(() => getTodayPosition(timeline), [timeline]);

  const handleZoomIn = useCallback(() => {
    setZoom((prev) => {
      if (prev === 'quarter') return 'month';
      if (prev === 'month') return 'week';
      return prev;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => {
      if (prev === 'week') return 'month';
      if (prev === 'month') return 'quarter';
      return prev;
    });
  }, []);

  const totalHeight = HEADER_HEIGHT + milestones.length * ROW_HEIGHT + 20;
  const columnWidth = zoom === 'week' ? 40 : zoom === 'month' ? 80 : 120;

  return (
    <div
      className={cn(
        'relative overflow-auto border rounded-lg bg-white',
        className
      )}
    >
      {/* Toolbar */}
      <div className="sticky top-0 left-0 z-20 flex items-center gap-2 p-2 border-b bg-slate-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomIn}
          disabled={zoom === 'week'}
          title="Zoom in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleZoomOut}
          disabled={zoom === 'quarter'}
          title="Zoom out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <span>
            View: {zoom === 'week' ? 'Daily' : zoom === 'month' ? 'Weekly' : 'Monthly'}
          </span>
        </div>
      </div>

      {/* Chart container */}
      <div
        className="relative"
        style={{
          height: totalHeight,
          minWidth: timeline.columns.length * columnWidth,
        }}
      >
        {/* Timeline header */}
        <div
          className="sticky top-[41px] z-10 flex border-b bg-slate-100"
          style={{ height: HEADER_HEIGHT }}
        >
          {timeline.columns.map((col, i) => (
            <div
              key={i}
              className={cn(
                'flex-shrink-0 flex items-end justify-center pb-2 border-r text-xs font-medium',
                col.isToday && 'bg-blue-50',
                col.isWeekend && 'bg-slate-50'
              )}
              style={{ width: columnWidth }}
            >
              {col.label}
            </div>
          ))}
        </div>

        {/* Grid lines */}
        <div className="absolute top-[60px] left-0 right-0 bottom-0">
          {timeline.columns.map((col, i) => (
            <div
              key={i}
              className={cn(
                'absolute top-0 bottom-0 border-r border-slate-100',
                col.isToday && 'bg-blue-50/30',
                col.isWeekend && 'bg-slate-50/50'
              )}
              style={{
                left: `${(i / timeline.columns.length) * 100}%`,
                width: `${100 / timeline.columns.length}%`,
              }}
            />
          ))}
        </div>

        {/* Today line */}
        {todayPosition !== null && (
          <div
            className="absolute top-[60px] bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `${todayPosition}%` }}
          >
            <div className="absolute -top-4 -left-3 px-1 py-0.5 text-xs bg-red-500 text-white rounded">
              Today
            </div>
          </div>
        )}

        {/* Milestone bars */}
        <TooltipProvider>
          <div className="absolute top-[60px] left-0 right-0">
            {bars.map((bar, index) => {
              const milestone = milestones[index];
              return (
                <Tooltip key={bar.id}>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute h-6 my-2 rounded cursor-pointer transition-transform hover:scale-y-110"
                      style={{
                        top: bar.row * ROW_HEIGHT,
                        left: `${bar.left}%`,
                        width: `${bar.width}%`,
                        backgroundColor: getStatusBgColor(bar.status),
                        border: `1px solid ${getStatusColor(bar.status)}`,
                      }}
                      onClick={() => onMilestoneClick?.(milestone)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          onMilestoneClick?.(milestone);
                        }
                      }}
                    >
                      {/* Progress fill */}
                      <div
                        className="absolute top-0 left-0 h-full rounded-l"
                        style={{
                          width: `${bar.progress}%`,
                          backgroundColor: getStatusColor(bar.status),
                          opacity: 0.4,
                        }}
                      />
                      {/* Label */}
                      <span className="absolute inset-0 flex items-center px-2 text-xs font-medium truncate">
                        {bar.name}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-medium">{bar.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateRange(bar.startDate, bar.endDate)}
                      </p>
                      <p className="text-xs">
                        Progress: {bar.progress}% ({milestone.completedItems}/
                        {milestone.totalItems} items)
                      </p>
                      <p className="text-xs capitalize">
                        Status: {bar.status.toLowerCase().replace('_', ' ')}
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        {/* Empty state */}
        {milestones.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            No milestones to display. Create one to start tracking progress.
          </div>
        )}
      </div>
    </div>
  );
}
