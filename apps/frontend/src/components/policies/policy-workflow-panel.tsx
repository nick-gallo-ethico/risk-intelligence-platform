"use client";

/**
 * Policy Workflow Panel
 *
 * Wrapper component that renders the WorkflowStatusCard for a policy.
 * Used on the policy detail page to show approval workflow progress and actions.
 */

import React from "react";
import { WorkflowStatusCard } from "@/components/workflows/workflow-status-card";

export interface PolicyWorkflowPanelProps {
  /** Policy ID to display workflow for */
  policyId: string;
  /** Additional CSS classes */
  className?: string;
}

export function PolicyWorkflowPanel({
  policyId,
  className,
}: PolicyWorkflowPanelProps) {
  return (
    <WorkflowStatusCard
      entityType="POLICY"
      entityId={policyId}
      className={className}
    />
  );
}
