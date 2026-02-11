/**
 * Edit Workflow Page
 *
 * Route: /settings/workflows/:id
 *
 * Loads an existing workflow template and opens it in the workflow builder.
 */

"use client";

import { use, Suspense } from "react";
import { useWorkflowTemplate } from "@/hooks/use-workflows";
import { WorkflowBuilder } from "@/components/workflows/builder/workflow-builder";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

// ============================================================================
// Types
// ============================================================================

interface EditWorkflowPageProps {
  params: Promise<{ id: string }>;
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function EditWorkflowSkeleton() {
  return (
    <div className="h-full flex flex-col">
      {/* Toolbar skeleton */}
      <div className="h-14 border-b border-slate-200 bg-white flex items-center gap-3 px-4">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-12" />
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
        <div className="flex-1 bg-slate-100">
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
              <span className="text-sm">Loading workflow...</span>
            </div>
          </div>
        </div>

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
// Error State
// ============================================================================

function EditWorkflowError({ message }: { message: string }) {
  return (
    <div className="h-full flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Workflow</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button variant="outline" asChild>
            <Link href="/settings/workflows">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Workflows
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Page Content
// ============================================================================

function EditWorkflowContent({ id }: { id: string }) {
  const { data: template, isLoading, error } = useWorkflowTemplate(id);

  if (isLoading) {
    return <EditWorkflowSkeleton />;
  }

  if (error) {
    return (
      <EditWorkflowError
        message={
          error instanceof Error
            ? error.message
            : "Failed to load workflow template. It may have been deleted."
        }
      />
    );
  }

  if (!template) {
    return (
      <EditWorkflowError message="Workflow template not found. It may have been deleted." />
    );
  }

  return (
    <div className="h-[calc(100vh-64px)]">
      <WorkflowBuilder template={template} />
    </div>
  );
}

// ============================================================================
// Page Export
// ============================================================================

export default function EditWorkflowPage({ params }: EditWorkflowPageProps) {
  // Unwrap the params promise using React 19's use() hook
  const { id } = use(params);

  return (
    <Suspense fallback={<EditWorkflowSkeleton />}>
      <EditWorkflowContent id={id} />
    </Suspense>
  );
}
