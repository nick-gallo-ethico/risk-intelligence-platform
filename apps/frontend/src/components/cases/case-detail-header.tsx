"use client";

import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import type { Case } from "@/types/case";

interface CaseDetailHeaderProps {
  caseData: Case | null;
  isLoading: boolean;
  /** Deprecated: Now handled by ActionsDropdown in left sidebar */
  onAssign?: () => void;
  /** Deprecated: Now handled by ActionsDropdown in left sidebar */
  onChangeStatus?: () => void;
  /** Deprecated: Now handled by ActionsDropdown in left sidebar */
  onMerge?: () => void;
}

/**
 * CaseDetailHeader - Simplified breadcrumb navigation for case detail page.
 *
 * After Plan 03 restructure:
 * - Case identity (ref#, status, severity) moved to RecordHeader in left sidebar
 * - Action buttons moved to ActionsDropdown in left sidebar
 * - Pipeline stage bar is in center column (PipelineStageBar component)
 * - This component is now breadcrumb-only
 *
 * Per spec Section 13.
 */
export function CaseDetailHeader({
  caseData,
  isLoading,
}: CaseDetailHeaderProps) {
  const router = useRouter();

  if (isLoading) {
    return <CaseDetailHeaderSkeleton />;
  }

  if (!caseData) {
    return null;
  }

  return (
    <div className="bg-white border-b">
      <div className="px-6 py-3">
        {/* Breadcrumb navigation */}
        <nav className="flex items-center text-sm text-gray-500">
          <button
            onClick={() => router.push("/cases")}
            className="hover:text-gray-700 transition-colors"
          >
            Cases
          </button>
          <span className="mx-2">/</span>
          <span className="text-gray-900 font-medium">
            {caseData.referenceNumber}
          </span>
        </nav>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for CaseDetailHeader
 */
export function CaseDetailHeaderSkeleton() {
  return (
    <div className="bg-white border-b">
      <div className="px-6 py-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-12" />
          <span className="text-gray-300">/</span>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    </div>
  );
}
