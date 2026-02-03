/**
 * SLA (Service Level Agreement) type definitions.
 *
 * Used by the SLA Tracker and Scheduler services to calculate
 * and monitor workflow instance compliance.
 */

/**
 * Configuration for SLA behavior.
 * Can be defined at workflow template level or overridden per stage.
 */
export interface SlaConfig {
  /** Default SLA duration in days */
  defaultDays: number;

  /** Percentage of time used that triggers warning status (default 80%) */
  warningThresholdPercent: number;

  /** Hours after breach to escalate to critical (default 24) */
  criticalThresholdHours: number;

  /** Stage-specific SLA overrides (stageId -> days) */
  stageOverrides?: Record<string, number>;
}

/**
 * Result of an SLA calculation for a workflow instance.
 */
export interface SlaCalculation {
  /** Current SLA status */
  status: "on_track" | "warning" | "breached" | "critical";

  /** When the SLA is/was due */
  dueDate: Date;

  /** Hours remaining (negative if past due) */
  remainingHours: number;

  /** Percentage of total SLA time consumed (0-100+) */
  percentUsed: number;

  /** When the breach occurred (if breached) */
  breachedAt?: Date;
}

/**
 * Summary result of an SLA check run.
 */
export interface SlaCheckResult {
  /** Total instances checked */
  checked: number;

  /** Count of new warnings emitted */
  warnings: number;

  /** Count of new breaches detected */
  breaches: number;
}
