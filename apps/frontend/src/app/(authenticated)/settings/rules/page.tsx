"use client";

/**
 * Rules Settings Page
 *
 * Main entry point for routing rules management.
 * Shows all rules with filtering, actions, and create functionality.
 *
 * Route: /settings/rules
 */

import React, { useState, Suspense } from "react";
import { Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RulesListTable } from "@/components/rules/rules-list-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RuleTriggerEvent } from "@/types/rules";

// ============================================================================
// Loading Skeleton
// ============================================================================

function RulesPageSkeleton() {
  return (
    <div className="space-y-6">
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
        <Skeleton className="h-10 w-[150px]" />
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
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Page Content
// ============================================================================

function RulesPageContent() {
  const [triggerEvent, setTriggerEvent] = useState<RuleTriggerEvent | "all">(
    "all",
  );
  const [isActive, setIsActive] = useState<boolean | "all">("all");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Routing Rules</h1>
          <p className="text-muted-foreground mt-1">
            Configure automatic case routing and assignment rules
          </p>
        </div>
        <Button asChild>
          <Link href="/settings/rules/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Rule
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={triggerEvent}
          onValueChange={(v) => setTriggerEvent(v as RuleTriggerEvent | "all")}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All trigger events" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All trigger events</SelectItem>
            <SelectItem value="case.created">Case Created</SelectItem>
            <SelectItem value="case.updated">Case Updated</SelectItem>
            <SelectItem value="investigation.status_changed">
              Investigation Status Changed
            </SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={String(isActive)}
          onValueChange={(v) => setIsActive(v === "all" ? "all" : v === "true")}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="true">Active</SelectItem>
            <SelectItem value="false">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <RulesListTable
        triggerEvent={triggerEvent === "all" ? undefined : triggerEvent}
        isActive={isActive === "all" ? undefined : isActive}
      />
    </div>
  );
}

// ============================================================================
// Page Export
// ============================================================================

export default function RulesPage() {
  return (
    <Suspense fallback={<RulesPageSkeleton />}>
      <RulesPageContent />
    </Suspense>
  );
}
