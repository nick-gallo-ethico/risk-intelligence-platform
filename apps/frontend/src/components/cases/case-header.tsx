"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getStatusColor, getSeverityColor } from "@/lib/theme-colors";
import type { Case } from "@/types/case";

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
    <div className="bg-card border-b border-border">
      <div className="px-6 py-4">
        {/* Breadcrumb */}
        <nav className="flex items-center text-sm text-muted-foreground mb-3">
          <button
            onClick={() => router.push("/cases")}
            className="hover:text-foreground transition-colors"
          >
            Cases
          </button>
          <span className="mx-2">/</span>
          <span className="text-foreground font-medium">
            {caseData.referenceNumber}
          </span>
        </nav>

        {/* Header Content */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-foreground font-mono">
              {caseData.referenceNumber}
            </h1>
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={getStatusColor(caseData.status)}
              >
                {caseData.status}
              </Badge>
              {caseData.severity && (
                <Badge
                  variant="outline"
                  className={getSeverityColor(caseData.severity)}
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
          <p className="mt-2 text-muted-foreground line-clamp-2">
            {caseData.summary}
          </p>
        )}
      </div>
    </div>
  );
}

export function CaseHeaderSkeleton() {
  return (
    <div className="bg-card border-b border-border">
      <div className="px-6 py-4">
        {/* Breadcrumb skeleton */}
        <div className="flex items-center gap-2 mb-3">
          <Skeleton className="h-4 w-12" />
          <span className="text-muted-foreground">/</span>
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
