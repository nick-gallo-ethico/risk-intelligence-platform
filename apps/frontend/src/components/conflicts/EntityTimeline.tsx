'use client';

import * as React from 'react';
import {
  FileText,
  AlertTriangle,
  XCircle,
  ArrowUpRight,
  Shield,
  Clock,
  User,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ===========================================
// Types
// ===========================================

export type EntityTimelineEventType =
  | 'DISCLOSURE_SUBMITTED'
  | 'CONFLICT_DETECTED'
  | 'CONFLICT_DISMISSED'
  | 'CONFLICT_ESCALATED'
  | 'CASE_INVOLVEMENT'
  | 'EXCLUSION_CREATED';

export interface EntityTimelineItem {
  eventType: EntityTimelineEventType;
  occurredAt: string;
  description: string;
  disclosureId?: string;
  conflictAlertId?: string;
  caseId?: string;
  exclusionId?: string;
  personId?: string;
  personName?: string;
  metadata?: Record<string, unknown>;
}

export interface EntityTimelineStatistics {
  totalDisclosures: number;
  totalConflicts: number;
  totalCases: number;
  uniquePersons: number;
  dateRange: {
    earliest: string | null;
    latest: string | null;
  };
}

export interface EntityTimelineData {
  entityName: string;
  totalEvents: number;
  events: EntityTimelineItem[];
  statistics: EntityTimelineStatistics;
}

export interface EntityTimelineProps {
  data: EntityTimelineData | null;
  isLoading?: boolean;
  onEventClick?: (event: EntityTimelineItem) => void;
  onClose?: () => void;
  className?: string;
}

// ===========================================
// Constants
// ===========================================

const EVENT_TYPE_CONFIG: Record<
  EntityTimelineEventType,
  {
    icon: React.ElementType;
    color: string;
    bgColor: string;
    label: string;
  }
> = {
  DISCLOSURE_SUBMITTED: {
    icon: FileText,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Disclosure',
  },
  CONFLICT_DETECTED: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    label: 'Conflict Detected',
  },
  CONFLICT_DISMISSED: {
    icon: XCircle,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Dismissed',
  },
  CONFLICT_ESCALATED: {
    icon: ArrowUpRight,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Escalated',
  },
  CASE_INVOLVEMENT: {
    icon: Shield,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    label: 'Case',
  },
  EXCLUSION_CREATED: {
    icon: Shield,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100',
    label: 'Exclusion',
  },
};

const ALL_EVENT_TYPES: EntityTimelineEventType[] = [
  'DISCLOSURE_SUBMITTED',
  'CONFLICT_DETECTED',
  'CONFLICT_DISMISSED',
  'CONFLICT_ESCALATED',
  'CASE_INVOLVEMENT',
  'EXCLUSION_CREATED',
];

// ===========================================
// Component
// ===========================================

/**
 * EntityTimeline component displays the full history of an entity.
 * Per RS.49: Shows all disclosures, conflicts, cases, and exclusions.
 */
export function EntityTimeline({
  data,
  isLoading = false,
  onEventClick,
  onClose,
  className,
}: EntityTimelineProps) {
  const [visibleEventTypes, setVisibleEventTypes] = React.useState<
    Set<EntityTimelineEventType>
  >(new Set(ALL_EVENT_TYPES));
  const [dateRange, setDateRange] = React.useState<'all' | '30d' | '90d' | '1y'>('all');
  const [expandedEvents, setExpandedEvents] = React.useState<Set<number>>(new Set());

  // Filter events
  const filteredEvents = React.useMemo(() => {
    if (!data) return [];

    let events = data.events.filter((e) => visibleEventTypes.has(e.eventType));

    // Filter by date range
    if (dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      switch (dateRange) {
        case '30d':
          cutoff.setDate(now.getDate() - 30);
          break;
        case '90d':
          cutoff.setDate(now.getDate() - 90);
          break;
        case '1y':
          cutoff.setFullYear(now.getFullYear() - 1);
          break;
      }
      events = events.filter((e) => new Date(e.occurredAt) >= cutoff);
    }

    return events;
  }, [data, visibleEventTypes, dateRange]);

  const toggleEventType = (type: EntityTimelineEventType) => {
    const newSet = new Set(visibleEventTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setVisibleEventTypes(newSet);
  };

  const toggleEventExpanded = (index: number) => {
    const newSet = new Set(expandedEvents);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedEvents(newSet);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Card className={cn('h-full flex flex-col', className)}>
        <CardHeader className="pb-3 border-b">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32 mt-1" />
        </CardHeader>
        <CardContent className="flex-1 pt-4">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className={cn('h-full flex flex-col', className)}>
        <CardContent className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Select an entity to view its timeline</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{data.entityName}</CardTitle>
            <p className="text-sm text-muted-foreground mt-0.5">
              {data.totalEvents} events
            </p>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <XCircle className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-lg font-semibold">
              {data.statistics.totalDisclosures}
            </p>
            <p className="text-xs text-muted-foreground">Disclosures</p>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-lg font-semibold">
              {data.statistics.totalConflicts}
            </p>
            <p className="text-xs text-muted-foreground">Conflicts</p>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-lg font-semibold">
              {data.statistics.totalCases}
            </p>
            <p className="text-xs text-muted-foreground">Cases</p>
          </div>
          <div className="text-center p-2 rounded bg-muted/50">
            <p className="text-lg font-semibold">
              {data.statistics.uniquePersons}
            </p>
            <p className="text-xs text-muted-foreground">People</p>
          </div>
        </div>
      </CardHeader>

      {/* Filters */}
      <div className="px-4 py-3 border-b flex items-center gap-2 flex-wrap">
        {/* Event Type Filter */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              Events
              {visibleEventTypes.size < ALL_EVENT_TYPES.length && (
                <Badge variant="secondary" className="ml-1.5 px-1 h-4 text-xs">
                  {visibleEventTypes.size}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56" align="start">
            <div className="space-y-2">
              {ALL_EVENT_TYPES.map((type) => {
                const config = EVENT_TYPE_CONFIG[type];
                return (
                  <div key={type} className="flex items-center gap-2">
                    <Checkbox
                      id={type}
                      checked={visibleEventTypes.has(type)}
                      onCheckedChange={() => toggleEventType(type)}
                    />
                    <Label
                      htmlFor={type}
                      className="flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <div className={cn('rounded p-0.5', config.bgColor)}>
                        <config.icon className={cn('h-3 w-3', config.color)} />
                      </div>
                      {config.label}
                    </Label>
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* Date Range Filter */}
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
          <SelectTrigger className="w-28 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
            <SelectItem value="1y">Last Year</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-xs text-muted-foreground ml-auto">
          Showing {filteredEvents.length} of {data.totalEvents}
        </span>
      </div>

      {/* Timeline */}
      <CardContent className="flex-1 overflow-auto pt-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No events match your filters</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted" />

            {/* Events */}
            <div className="space-y-4">
              {filteredEvents.map((event, index) => {
                const config = EVENT_TYPE_CONFIG[event.eventType];
                const Icon = config.icon;
                const isExpanded = expandedEvents.has(index);

                return (
                  <div key={index} className="relative flex gap-3 pl-1">
                    {/* Icon */}
                    <div
                      className={cn(
                        'relative z-10 rounded-full p-1.5 shrink-0',
                        config.bgColor
                      )}
                    >
                      <Icon className={cn('h-4 w-4', config.color)} />
                    </div>

                    {/* Content */}
                    <div
                      className={cn(
                        'flex-1 rounded-lg border p-3 transition-colors',
                        onEventClick && 'cursor-pointer hover:bg-muted/50'
                      )}
                      onClick={() => {
                        if (event.metadata) {
                          toggleEventExpanded(index);
                        }
                        onEventClick?.(event);
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Badge
                            variant="secondary"
                            className="text-xs mb-1.5"
                          >
                            {config.label}
                          </Badge>
                          <p className="text-sm">{event.description}</p>

                          {event.personName && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              {event.personName}
                            </div>
                          )}

                          {/* Metadata (expanded) */}
                          {isExpanded && event.metadata && (
                            <div className="mt-3 pt-3 border-t text-xs space-y-1">
                              {Object.entries(event.metadata).map(([key, value]) => (
                                <div key={key} className="flex justify-between">
                                  <span className="text-muted-foreground capitalize">
                                    {key.replace(/_/g, ' ')}:
                                  </span>
                                  <span className="font-medium">
                                    {String(value)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(event.occurredAt)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(event.occurredAt)}
                          </span>
                          {event.metadata && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleEventExpanded(index);
                              }}
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>

      {/* Footer with date range */}
      {data.statistics.dateRange.earliest && data.statistics.dateRange.latest && (
        <div className="px-4 py-2 border-t text-xs text-muted-foreground flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          <span>
            {formatDate(data.statistics.dateRange.earliest)} -{' '}
            {formatDate(data.statistics.dateRange.latest)}
          </span>
        </div>
      )}
    </Card>
  );
}
