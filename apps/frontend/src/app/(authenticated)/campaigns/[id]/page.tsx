"use client";

import { Suspense } from "react";
import { useParams, notFound } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignDetail } from "@/components/campaigns/campaign-detail";
import { useCampaign } from "@/hooks/use-campaigns";

/**
 * Loading skeleton for campaign detail page.
 */
function CampaignDetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Summary cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>

      {/* Content skeleton */}
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}

/**
 * Campaign detail page content.
 * Separated to allow Suspense boundary for loading state.
 */
function CampaignDetailContent() {
  const params = useParams();
  const id = params?.id as string;

  const { data: campaign, isLoading, error } = useCampaign(id);

  // Loading state
  if (isLoading) {
    return <CampaignDetailSkeleton />;
  }

  // Error or not found state
  if (error || !campaign) {
    notFound();
  }

  return <CampaignDetail campaign={campaign} isLoading={false} />;
}

/**
 * Campaign Detail Page
 *
 * Displays detailed information about a single campaign including
 * overview stats, assignment list, and campaign settings.
 *
 * Route: /campaigns/[id]
 */
export default function CampaignDetailPage() {
  return (
    <Suspense fallback={<CampaignDetailSkeleton />}>
      <CampaignDetailContent />
    </Suspense>
  );
}
