'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Case } from '@/types/case';

interface CasePropertiesPanelProps {
  caseData: Case | null;
  isLoading: boolean;
}

interface PropertyRowProps {
  label: string;
  value: string | null | undefined;
}

function PropertyRow({ label, value }: PropertyRowProps) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">
        {value || '—'}
      </span>
    </div>
  );
}

export function CasePropertiesPanel({ caseData, isLoading }: CasePropertiesPanelProps) {
  if (isLoading) {
    return <CasePropertiesPanelSkeleton />;
  }

  if (!caseData) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4 p-4">
      {/* Status Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Status
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <PropertyRow label="Status" value={caseData.status} />
          <PropertyRow label="Severity" value={caseData.severity} />
          {caseData.statusRationale && (
            <PropertyRow label="Rationale" value={caseData.statusRationale} />
          )}
        </CardContent>
      </Card>

      {/* Classification Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Classification
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <PropertyRow label="Source" value={caseData.sourceChannel.replace(/_/g, ' ')} />
          <PropertyRow label="Type" value={caseData.caseType} />
          {caseData.tags && caseData.tags.length > 0 && (
            <PropertyRow label="Tags" value={caseData.tags.join(', ')} />
          )}
        </CardContent>
      </Card>

      {/* Reporter Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Reporter
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <PropertyRow label="Type" value={caseData.reporterType} />
          <PropertyRow
            label="Anonymous"
            value={caseData.reporterAnonymous ? 'Yes' : 'No'}
          />
          {!caseData.reporterAnonymous && (
            <>
              <PropertyRow label="Name" value={caseData.reporterName} />
              <PropertyRow label="Email" value={caseData.reporterEmail} />
              <PropertyRow label="Phone" value={caseData.reporterPhone} />
            </>
          )}
        </CardContent>
      </Card>

      {/* Location Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Location
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <PropertyRow label="City" value={caseData.locationCity} />
          <PropertyRow label="State" value={caseData.locationState} />
          <PropertyRow label="Country" value={caseData.locationCountry} />
        </CardContent>
      </Card>

      {/* Metadata Section */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">
            Metadata
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <PropertyRow label="Created" value={formatDate(caseData.createdAt)} />
          <PropertyRow label="Updated" value={formatDate(caseData.updatedAt)} />
          <PropertyRow label="Intake" value={formatDate(caseData.intakeTimestamp)} />
        </CardContent>
      </Card>
    </div>
  );
}

export function CasePropertiesPanelSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3, 4].map((section) => (
        <Card key={section}>
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {[1, 2, 3].map((row) => (
              <div key={row} className="flex justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
