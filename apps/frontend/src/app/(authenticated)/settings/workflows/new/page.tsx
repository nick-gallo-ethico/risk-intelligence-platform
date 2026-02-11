/**
 * New Workflow Page
 *
 * Route: /settings/workflows/new
 *
 * Creates a new workflow template. Reads entityType and name from query params
 * (typically from the create dialog navigation).
 */

"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { WorkflowBuilder } from "@/components/workflows/builder/workflow-builder";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkflowEntityType } from "@/types/workflow";

// ============================================================================
// Loading Skeleton
// ============================================================================

function NewWorkflowSkeleton() {
  return (
    <div className="h-full flex flex-col">
      {/* Toolbar skeleton */}
      <div className="h-14 border-b border-slate-200 bg-white flex items-center gap-3 px-4">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-20" />
        <div className="flex-1" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>

      {/* Main content skeleton */}
      <div className="flex flex-1">
        {/* Palette skeleton */}
        <div className="w-60 border-r border-slate-200 p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full mb-2" />
          ))}
        </div>

        {/* Canvas skeleton */}
        <div className="flex-1 bg-slate-100" />

        {/* Properties skeleton */}
        <div className="w-80 border-l border-slate-200 p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Page Content
// ============================================================================

function NewWorkflowContent() {
  const searchParams = useSearchParams();

  // Read query parameters with null safety
  const entityType =
    (searchParams?.get("entityType") as WorkflowEntityType) ?? "CASE";
  const name = searchParams?.get("name") ?? "Untitled Workflow";

  return (
    <div className="h-[calc(100vh-64px)]">
      <WorkflowBuilder
        template={null}
        entityType={entityType}
        initialName={name}
      />
    </div>
  );
}

// ============================================================================
// Page Export
// ============================================================================

export default function NewWorkflowPage() {
  return (
    <Suspense fallback={<NewWorkflowSkeleton />}>
      <NewWorkflowContent />
    </Suspense>
  );
}
