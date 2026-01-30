'use client';

import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Case, CaseStatus, Severity } from '@/types/case';

const STATUS_COLORS: Record<CaseStatus, string> = {
  NEW: 'bg-blue-100 text-blue-800',
  OPEN: 'bg-yellow-100 text-yellow-800',
  CLOSED: 'bg-gray-100 text-gray-800',
};

const SEVERITY_COLORS: Record<Severity, string> = {
  LOW: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  HIGH: 'bg-orange-100 text-orange-800',
  CRITICAL: 'bg-red-100 text-red-800',
};

interface CaseHeaderProps {
  caseData: Case | null;
  isLoading: boolean;
}

export function CaseHeader({ caseData, isLoading }: CaseHeaderProps) {
  const router = useRouter();

  if (isLoading) {
    return <CaseHeaderSkeleton />;
  }

  if (!caseData) {
    return null;
  }

  return (
    <div className="bg-white border-b">
      <div className="px-6 py-4">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-gray-500 mb-3">
          <button
            onClick={() => router.push('/cases')}
            className="hover:text-gray-700 transition-colors"
          >
            Cases
          </button>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">
            {caseData.referenceNumber}
          </span>
        </nav>

        {/* Header Content */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900 font-mono">
              {caseData.referenceNumber}
            </h1>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={STATUS_COLORS[caseData.status]}
              >
                {caseData.status}
              </Badge>
              {caseData.severity && (
                <Badge
                  variant="outline"
                  className={SEVERITY_COLORS[caseData.severity]}
                >
                  {caseData.severity}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Edit
            </Button>
            <Button variant="outline" size="sm">
              Actions
            </Button>
          </div>
        </div>

        {/* Summary Line */}
        {caseData.summary && (
          <p className="mt-2 text-gray-600 line-clamp-2">
            {caseData.summary}
          </p>
        )}
      </div>
    </div>
  );
}

export function CaseHeaderSkeleton() {
  return (
    <div className="bg-white border-b">
      <div className="px-6 py-4">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-12" />
          <span className="text-gray-300">/</span>
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Header content skeleton */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-16" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>

        {/* Summary skeleton */}
        <Skeleton className="mt-2 h-5 w-3/4" />
      </div>
    </div>
  );
}
