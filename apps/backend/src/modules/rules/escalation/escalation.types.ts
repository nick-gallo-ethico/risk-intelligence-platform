/**
 * Escalation Types
 *
 * Type definitions for escalation rules and trigger evaluation.
 * Escalation rules are specialized RuleDefinitions that trigger on SLA events.
 */

/**
 * Trigger events that can start an escalation rule evaluation.
 * Escalation rules are specialized RuleDefinitions with these trigger events.
 */
export type EscalationTriggerEvent =
  | "sla.warning"
  | "sla.breached"
  | "sla.critical"
  | "escalation.check"; // Manual trigger for scheduled checks

/**
 * Facts available during escalation rule evaluation.
 */
export interface EscalationFacts {
  /** Case details */
  case: {
    id: string;
    referenceNumber: string;
    severity: string;
    categoryId?: string;
    status: string;
    createdAt: Date;
  };
  /** SLA event details */
  slaEvent: {
    type: "warning" | "breached" | "critical";
    hoursRemaining?: number;
    hoursOverdue?: number;
  };
  /** Assignment state */
  assignment: {
    isUnassigned: boolean;
    hoursUnassigned: number;
    currentAssigneeId?: string;
  };
}

/**
 * Parameters for escalate_to_role action.
 */
export interface EscalateToRoleParams {
  /** Role to escalate to (e.g., 'COMPLIANCE_OFFICER') */
  role: string;
  /** Whether to notify the original assignee about escalation */
  notifyOriginalAssignee?: boolean;
}

/**
 * Parameters for escalate_to_user action.
 */
export interface EscalateToUserParams {
  /** User ID to escalate to */
  userId: string;
  /** Whether to notify the original assignee about escalation */
  notifyOriginalAssignee?: boolean;
}
