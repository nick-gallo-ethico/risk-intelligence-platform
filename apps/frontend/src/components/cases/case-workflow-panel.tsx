"use client";

/**
 * Case Workflow Panel
 *
 * Wrapper component that renders the WorkflowStatusCard for a case.
 * Used on the case detail page to show workflow progress and actions.
 */

import React from "react";
import { WorkflowStatusCard } from "@/components/workflows/workflow-status-card";

export interface CaseWorkflowPanelProps {
  /** Case ID to display workflow for */
  caseId: string;
  /** Additional CSS classes */
  className?: string;
}

export function CaseWorkflowPanel({
  caseId,
  className,
}: CaseWorkflowPanelProps) {
  return (
    <WorkflowStatusCard
      entityType="CASE"
      entityId={caseId}
      className={className}
    />
  );
}
