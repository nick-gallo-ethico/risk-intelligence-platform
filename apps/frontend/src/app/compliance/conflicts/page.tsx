'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ChevronLeft,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  ConflictQueue,
  ConflictQueueFilters,
} from '@/components/conflicts/ConflictQueue';
import {
  ConflictAlertData,
  DismissConflictRequest,
  ConflictStatus,
  ConflictType,
  ConflictSeverity,
} from '@/components/conflicts/ConflictAlert';
import {
  EntityTimeline,
  EntityTimelineData,
} from '@/components/conflicts/EntityTimeline';
import { cn } from '@/lib/utils';

// ===========================================
// Mock Data (for development)
// ===========================================

const MOCK_ALERTS: ConflictAlertData[] = [
  {
    id: '1',
    organizationId: 'org-1',
    disclosureId: 'disclosure-1',
    conflictType: 'VENDOR_MATCH',
    severity: 'HIGH',
    status: 'OPEN',
    summary: 'Prior disclosure to "Acme Consulting LLC" found (92% match)',
    matchedEntity: 'Acme Consulting LLC',
    matchConfidence: 92,
    matchDetails: {
      vendorContext: {
        vendorName: 'Acme Consulting LLC',
        vendorStatus: 'Approved',
        contractValue: 125000,
        currency: 'USD',
        relationshipStartDate: '2024-01-15',
      },
    },
    severityFactors: {
      factors: [
        'Active vendor relationship',
        'High contract value',
        'Multiple prior disclosures',
      ],
      matchConfidence: 92,
    },
    yourDisclosure: {
      entityName: 'ACME Consulting',
      relationshipType: 'Gift',
      value: 250,
      currency: 'USD',
    },
    createdAt: '2026-02-01T10:30:00Z',
    updatedAt: '2026-02-01T10:30:00Z',
  },
  {
    id: '2',
    organizationId: 'org-1',
    disclosureId: 'disclosure-2',
    conflictType: 'HRIS_MATCH',
    severity: 'MEDIUM',
    status: 'OPEN',
    summary: 'Name matches employee "Jane Smith" (85% match)',
    matchedEntity: 'Jane Smith',
    matchConfidence: 85,
    matchDetails: {
      employeeContext: {
        name: 'Jane Smith',
        department: 'Engineering',
        jobTitle: 'Senior Developer',
      },
    },
    severityFactors: {
      factors: ['Name matches active employee'],
      matchConfidence: 85,
    },
    yourDisclosure: {
      entityName: 'J. Smith',
      relationshipType: 'Family Member',
    },
    createdAt: '2026-01-28T14:20:00Z',
    updatedAt: '2026-01-28T14:20:00Z',
  },
  {
    id: '3',
    organizationId: 'org-1',
    disclosureId: 'disclosure-3',
    conflictType: 'PRIOR_CASE_HISTORY',
    severity: 'CRITICAL',
    status: 'OPEN',
    summary: 'Entity appears in 3 prior case(s)',
    matchedEntity: 'TechCorp Solutions',
    matchConfidence: 95,
    matchDetails: {
      caseContext: {
        caseIds: ['case-1', 'case-2', 'case-3'],
        caseTypes: ['CLOSED', 'CLOSED', 'OPEN'],
        roles: ['Subject', 'Witness'],
      },
    },
    severityFactors: {
      factors: ['Multiple prior cases', 'Recent case involvement'],
      historicalOccurrences: 3,
    },
    createdAt: '2026-01-25T09:15:00Z',
    updatedAt: '2026-01-25T09:15:00Z',
  },
  {
    id: '4',
    organizationId: 'org-1',
    disclosureId: 'disclosure-4',
    conflictType: 'GIFT_AGGREGATE',
    severity: 'HIGH',
    status: 'OPEN',
    summary: 'Cumulative gifts from "Global Suppliers Inc" exceed $500 threshold',
    matchedEntity: 'Global Suppliers Inc',
    matchConfidence: 100,
    matchDetails: {
      disclosureContext: {
        priorDisclosureIds: ['d-1', 'd-2', 'd-3'],
        totalValue: 750,
        currency: 'USD',
        dateRange: {
          start: '2025-01-01',
          end: '2026-02-01',
        },
      },
    },
    severityFactors: {
      factors: ['Threshold exceeded', 'Rolling 12-month aggregate'],
      thresholdExceeded: true,
      valueAtRisk: 750,
    },
    createdAt: '2026-01-20T16:45:00Z',
    updatedAt: '2026-01-20T16:45:00Z',
  },
  {
    id: '5',
    organizationId: 'org-1',
    disclosureId: 'disclosure-5',
    conflictType: 'RELATIONSHIP_PATTERN',
    severity: 'MEDIUM',
    status: 'DISMISSED',
    summary: '4 employees have disclosed relationships with "Industry Partners"',
    matchedEntity: 'Industry Partners',
    matchConfidence: 80,
    matchDetails: {
      disclosureContext: {
        priorDisclosureIds: ['d-4', 'd-5', 'd-6', 'd-7'],
      },
    },
    dismissedCategory: 'PRE_APPROVED_EXCEPTION',
    dismissedReason: 'Industry standard relationship, pre-approved by compliance',
    dismissedBy: 'user-1',
    dismissedAt: '2026-01-22T11:00:00Z',
    dismissedByUser: {
      id: 'user-1',
      firstName: 'Sarah',
      lastName: 'Johnson',
    },
    createdAt: '2026-01-18T08:30:00Z',
    updatedAt: '2026-01-22T11:00:00Z',
  },
  {
    id: '6',
    organizationId: 'org-1',
    disclosureId: 'disclosure-6',
    conflictType: 'SELF_DEALING',
    severity: 'LOW',
    status: 'ESCALATED',
    summary: 'Prior disclosure involving "Family Business LLC" found',
    matchedEntity: 'Family Business LLC',
    matchConfidence: 100,
    matchDetails: {
      disclosureContext: {
        priorDisclosureIds: ['d-8'],
        totalValue: 5000,
        dateRange: {
          start: '2025-06-01',
          end: '2025-06-01',
        },
      },
    },
    escalatedToCaseId: 'case-10',
    escalatedCase: {
      id: 'case-10',
      referenceNumber: 'ETH-2026-00010',
      status: 'OPEN',
    },
    createdAt: '2026-01-10T13:20:00Z',
    updatedAt: '2026-01-12T09:30:00Z',
  },
];

const MOCK_ENTITY_TIMELINE: EntityTimelineData = {
  entityName: 'Acme Consulting LLC',
  totalEvents: 12,
  events: [
    {
      eventType: 'DISCLOSURE_SUBMITTED',
      occurredAt: '2026-02-01T10:30:00Z',
      description: 'Gift disclosure submitted involving this entity',
      disclosureId: 'disclosure-1',
      personName: 'John Doe',
    },
    {
      eventType: 'CONFLICT_DETECTED',
      occurredAt: '2026-02-01T10:30:05Z',
      description: 'Vendor match conflict detected (92% confidence)',
      conflictAlertId: '1',
      disclosureId: 'disclosure-1',
    },
    {
      eventType: 'DISCLOSURE_SUBMITTED',
      occurredAt: '2025-11-15T14:20:00Z',
      description: 'Entertainment disclosure submitted',
      disclosureId: 'disclosure-prev-1',
      personName: 'Jane Smith',
    },
    {
      eventType: 'CONFLICT_DISMISSED',
      occurredAt: '2025-11-16T09:00:00Z',
      description: 'Conflict dismissed as pre-approved exception',
      conflictAlertId: 'prev-alert-1',
    },
    {
      eventType: 'CASE_INVOLVEMENT',
      occurredAt: '2025-08-20T11:30:00Z',
      description: 'Named as subject in case ETH-2025-00234',
      caseId: 'case-234',
    },
    {
      eventType: 'DISCLOSURE_SUBMITTED',
      occurredAt: '2025-06-10T16:45:00Z',
      description: 'Gift disclosure submitted',
      disclosureId: 'disclosure-prev-2',
      personName: 'John Doe',
    },
    {
      eventType: 'DISCLOSURE_SUBMITTED',
      occurredAt: '2025-03-22T10:15:00Z',
      description: 'Travel expense disclosure submitted',
      disclosureId: 'disclosure-prev-3',
      personName: 'Mike Wilson',
    },
    {
      eventType: 'EXCLUSION_CREATED',
      occurredAt: '2025-01-05T14:30:00Z',
      description: 'Exclusion created for name collision with "Acme Corp"',
      exclusionId: 'excl-1',
    },
    {
      eventType: 'CASE_INVOLVEMENT',
      occurredAt: '2024-09-12T09:00:00Z',
      description: 'Named as witness in case ETH-2024-00156',
      caseId: 'case-156',
    },
    {
      eventType: 'DISCLOSURE_SUBMITTED',
      occurredAt: '2024-07-08T13:45:00Z',
      description: 'Gift disclosure submitted',
      disclosureId: 'disclosure-prev-4',
      personName: 'Sarah Johnson',
    },
    {
      eventType: 'CONFLICT_ESCALATED',
      occurredAt: '2024-04-15T11:20:00Z',
      description: 'Conflict escalated to case for investigation',
      conflictAlertId: 'prev-alert-2',
      caseId: 'case-100',
    },
    {
      eventType: 'DISCLOSURE_SUBMITTED',
      occurredAt: '2024-01-20T10:00:00Z',
      description: 'Initial vendor relationship disclosure',
      disclosureId: 'disclosure-prev-5',
      personName: 'John Doe',
    },
  ],
  statistics: {
    totalDisclosures: 7,
    totalConflicts: 4,
    totalCases: 2,
    uniquePersons: 4,
    dateRange: {
      earliest: '2024-01-20T10:00:00Z',
      latest: '2026-02-01T10:30:05Z',
    },
  },
};

// ===========================================
// Loading Skeleton
// ===========================================

function ConflictsPageSkeleton() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <div className="border-b px-6 py-4">
        <div className="h-8 w-40 bg-muted animate-pulse rounded mb-2" />
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-orange-100 p-2">
            <Loader2 className="h-6 w-6 text-orange-600 animate-spin" />
          </div>
          <div>
            <div className="h-7 w-48 bg-muted animate-pulse rounded mb-1" />
            <div className="h-4 w-64 bg-muted animate-pulse rounded" />
          </div>
        </div>
      </div>
      <div className="flex-1 p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// Page Component
// ===========================================

/**
 * Conflict Review page for compliance officers.
 * Route: /compliance/conflicts
 *
 * Layout:
 * - Left: ConflictQueue (main content)
 * - Right: EntityTimeline (detail panel, shown when entity selected)
 */
export default function ConflictsPage() {
  return (
    <Suspense fallback={<ConflictsPageSkeleton />}>
      <ConflictsPageContent />
    </Suspense>
  );
}

function ConflictsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [alerts, setAlerts] = React.useState<ConflictAlertData[]>(MOCK_ALERTS);
  const [isLoading, setIsLoading] = React.useState(false);
  const [filters, setFilters] = React.useState<ConflictQueueFilters>({
    status: 'ALL',
    conflictType: 'ALL',
    severity: 'ALL',
    search: '',
    sortBy: 'date_desc',
  });

  // Entity timeline state
  const [selectedEntity, setSelectedEntity] = React.useState<string | null>(null);
  const [entityTimeline, setEntityTimeline] =
    React.useState<EntityTimelineData | null>(null);
  const [isTimelineLoading, setIsTimelineLoading] = React.useState(false);

  // Mobile sheet state
  const [isTimelineSheetOpen, setIsTimelineSheetOpen] = React.useState(false);

  // Fetch entity timeline when entity selected
  React.useEffect(() => {
    if (!selectedEntity) {
      setEntityTimeline(null);
      return;
    }

    const fetchTimeline = async () => {
      setIsTimelineLoading(true);
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/v1/conflicts/entity/${encodeURIComponent(selectedEntity)}`);
        // const data = await response.json();
        // setEntityTimeline(data);

        // Mock: simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        setEntityTimeline({
          ...MOCK_ENTITY_TIMELINE,
          entityName: selectedEntity,
        });
      } catch (error) {
        console.error('Failed to fetch entity timeline:', error);
      } finally {
        setIsTimelineLoading(false);
      }
    };

    fetchTimeline();
  }, [selectedEntity]);

  const handleViewEntity = (entityName: string) => {
    setSelectedEntity(entityName);
    // On mobile, open the sheet
    if (window.innerWidth < 1024) {
      setIsTimelineSheetOpen(true);
    }
  };

  const handleCloseTimeline = () => {
    setSelectedEntity(null);
    setIsTimelineSheetOpen(false);
  };

  const handleDismiss = async (id: string, request: DismissConflictRequest) => {
    // TODO: Replace with actual API call
    // await fetch(`/api/v1/conflicts/${id}/dismiss`, {
    //   method: 'POST',
    //   body: JSON.stringify(request),
    // });

    // Mock: update local state
    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'DISMISSED' as ConflictStatus,
              dismissedCategory: request.category,
              dismissedReason: request.reason,
              dismissedAt: new Date().toISOString(),
              dismissedByUser: {
                id: 'current-user',
                firstName: 'Current',
                lastName: 'User',
              },
            }
          : a
      )
    );
  };

  const handleEscalate = async (id: string) => {
    // TODO: Replace with actual API call
    // const response = await fetch(`/api/v1/conflicts/${id}/escalate`, { method: 'POST' });
    // const { caseId, referenceNumber } = await response.json();

    // Mock: update local state
    const caseId = `case-${Date.now()}`;
    const refNum = `ETH-2026-${String(Date.now() % 100000).padStart(5, '0')}`;

    setAlerts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'ESCALATED' as ConflictStatus,
              escalatedToCaseId: caseId,
              escalatedCase: {
                id: caseId,
                referenceNumber: refNum,
                status: 'OPEN',
              },
            }
          : a
      )
    );
  };

  const handleBulkDismiss = async (
    ids: string[],
    request: DismissConflictRequest
  ) => {
    // TODO: Replace with actual API call
    // await Promise.all(ids.map(id => fetch(`/api/v1/conflicts/${id}/dismiss`, {...})));

    // Mock: update local state
    setAlerts((prev) =>
      prev.map((a) =>
        ids.includes(a.id)
          ? {
              ...a,
              status: 'DISMISSED' as ConflictStatus,
              dismissedCategory: request.category,
              dismissedReason: request.reason,
              dismissedAt: new Date().toISOString(),
              dismissedByUser: {
                id: 'current-user',
                firstName: 'Current',
                lastName: 'User',
              },
            }
          : a
      )
    );
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call
      // const response = await fetch('/api/v1/conflicts');
      // const data = await response.json();
      // setAlerts(data.items);

      // Mock: simulate refresh
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/compliance')}
          className="mb-2"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Compliance
        </Button>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-orange-100 p-2">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Conflict Review</h1>
            <p className="text-sm text-muted-foreground">
              Review and resolve detected conflicts from disclosures
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Queue */}
        <div
          className={cn(
            'flex-1 overflow-auto p-6',
            selectedEntity && 'lg:pr-3'
          )}
        >
          <ConflictQueue
            alerts={alerts}
            filters={filters}
            onFiltersChange={setFilters}
            onDismiss={handleDismiss}
            onEscalate={handleEscalate}
            onBulkDismiss={handleBulkDismiss}
            onViewEntity={handleViewEntity}
            onRefresh={handleRefresh}
            isLoading={isLoading}
          />
        </div>

        {/* Right: Entity Timeline (Desktop) */}
        {selectedEntity && (
          <div className="hidden lg:block w-96 border-l overflow-hidden">
            <EntityTimeline
              data={entityTimeline}
              isLoading={isTimelineLoading}
              onClose={handleCloseTimeline}
              className="h-full rounded-none border-0"
            />
          </div>
        )}
      </div>

      {/* Entity Timeline Sheet (Mobile) */}
      <Sheet open={isTimelineSheetOpen} onOpenChange={setIsTimelineSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <EntityTimeline
            data={entityTimeline}
            isLoading={isTimelineLoading}
            onClose={handleCloseTimeline}
            className="h-full rounded-none border-0"
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
