"use client";

/**
 * Workflows Settings Page
 *
 * Main entry point for workflow template management.
 * Shows all workflow templates with filtering, actions, and create functionality.
 *
 * Route: /settings/workflows
 */

import React, { useState, Suspense } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WorkflowListFilters } from "@/components/workflows/workflow-list-filters";
import { WorkflowListTable } from "@/components/workflows/workflow-list-table";
import { CreateWorkflowDialog } from "@/components/workflows/create-workflow-dialog";
import type { WorkflowEntityType } from "@/types/workflow";

// ============================================================================
// Loading Skeleton
// ============================================================================

function WorkflowsPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-[150px]" />
          <Skeleton className="h-4 w-[350px] mt-2" />
        </div>
        <Skeleton className="h-10 w-[140px]" />
      </div>

      {/* Filters skeleton */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[200px]" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 border rounded-lg"
          >
            <Skeleton className="h-5 w-[180px]" />
            <Skeleton className="h-5 w-[100px]" />
            <Skeleton className="h-5 w-[60px]" />
            <Skeleton className="h-5 w-[80px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Page Content
// ============================================================================

function WorkflowsPageContent() {
  // Filter state
  const [entityType, setEntityType] = useState<WorkflowEntityType | undefined>(
    undefined,
  );
  const [isActive, setIsActive] = useState<boolean | undefined>(undefined);

  // Create dialog state
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workflows</h1>
          <p className="text-muted-foreground mt-1">
            Manage workflow templates for cases, policies, and disclosures
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Workflow
        </Button>
      </div>

      {/* Filters */}
      <WorkflowListFilters
        entityType={entityType}
        isActive={isActive}
        onEntityTypeChange={setEntityType}
        onIsActiveChange={setIsActive}
      />

      {/* Table */}
      <WorkflowListTable entityType={entityType} isActive={isActive} />

      {/* Create Dialog */}
      <CreateWorkflowDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}

// ============================================================================
// Page Export
// ============================================================================

export default function WorkflowsPage() {
  return (
    <Suspense fallback={<WorkflowsPageSkeleton />}>
      <WorkflowsPageContent />
    </Suspense>
  );
}
