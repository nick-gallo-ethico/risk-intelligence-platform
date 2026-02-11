"use client";

/**
 * Workflow Instances Page
 *
 * Shows all instances for a specific workflow template with:
 * - Template name header with back link
 * - Status filter tabs (All, Active, Completed, Cancelled, Paused)
 * - InstanceListTable with bulk actions
 *
 * Route: /settings/workflows/[id]/instances
 */

import React, { useState, Suspense, use } from "react";
import Link from "next/link";
import { ArrowLeft, Workflow } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { InstanceListTable } from "@/components/workflows/instance-list-table";
import { useWorkflowTemplate } from "@/hooks/use-workflows";
import type { WorkflowInstanceStatus } from "@/types/workflow";

// ============================================================================
// Types
// ============================================================================

interface WorkflowInstancesPageProps {
  params: Promise<{ id: string }>;
}

// ============================================================================
// Constants
// ============================================================================

const STATUS_OPTIONS: Array<{
  value: WorkflowInstanceStatus | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "PAUSED", label: "Paused" },
];

// ============================================================================
// Loading Skeleton
// ============================================================================

function InstancesPageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-9" />
        <div>
          <Skeleton className="h-7 w-[200px]" />
          <Skeleton className="h-4 w-[300px] mt-2" />
        </div>
      </div>

      {/* Filters skeleton */}
      <Skeleton className="h-10 w-[400px]" />

      {/* Table skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 p-4 border rounded-lg"
          >
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-[150px]" />
            <Skeleton className="h-5 w-[100px]" />
            <Skeleton className="h-5 w-[70px]" />
            <Skeleton className="h-5 w-[70px]" />
            <Skeleton className="h-5 w-[100px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Page Content
// ============================================================================

function InstancesPageContent({ templateId }: { templateId: string }) {
  // Status filter state
  const [statusFilter, setStatusFilter] = useState<
    WorkflowInstanceStatus | "ALL"
  >("ALL");

  // Fetch template details
  const { data: template, isLoading: isTemplateLoading } =
    useWorkflowTemplate(templateId);

  if (isTemplateLoading) {
    return <InstancesPageSkeleton />;
  }

  if (!template) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-lg font-medium text-muted-foreground">
            Workflow template not found
          </p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/settings/workflows">Back to Workflows</Link>
          </Button>
        </div>
      </div>
    );
  }

  const status = statusFilter === "ALL" ? undefined : statusFilter;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button asChild variant="ghost" size="icon" className="shrink-0 mt-1">
          <Link href="/settings/workflows">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Workflow className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-bold text-foreground">
              {template.name}
            </h1>
          </div>
          <p className="text-muted-foreground mt-1">
            View and manage workflow instances. Instances are running workflows
            attached to {template.entityType.toLowerCase()}s.
          </p>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="border-b pb-4">
        <ToggleGroup
          type="single"
          value={statusFilter}
          onValueChange={(value) => {
            if (value) {
              setStatusFilter(value as WorkflowInstanceStatus | "ALL");
            }
          }}
          className="justify-start"
        >
          {STATUS_OPTIONS.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              aria-label={`Filter by ${option.label}`}
              className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {/* Instance List Table */}
      <InstanceListTable
        templateId={templateId}
        status={status}
        stages={template.stages}
      />
    </div>
  );
}

// ============================================================================
// Page Export
// ============================================================================

export default function WorkflowInstancesPage({
  params,
}: WorkflowInstancesPageProps) {
  const { id } = use(params);

  return (
    <Suspense fallback={<InstancesPageSkeleton />}>
      <InstancesPageContent templateId={id} />
    </Suspense>
  );
}
