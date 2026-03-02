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

/**
 * Case-level SLA configuration stored per organization.
 *
 * Organizations can customize:
 * - Default SLA days for cases
 * - Warning/critical thresholds
 * - Per-severity and per-category overrides
 */
export interface CaseSlaConfig {
  /** Whether case SLA monitoring is enabled (default: true) */
  enabled: boolean;

  /** Default SLA days for cases (default: 14) */
  defaultDays: number;

  /** Warning threshold percentage (default: 80 per RULE-03) */
  warningThresholdPercent: number;

  /** Hours after breach to trigger critical escalation (default: 48) */
  criticalThresholdHours: number;

  /** Per-severity SLA days override (HIGH=7, MEDIUM=14, LOW=30) */
  severityOverrides?: {
    HIGH?: number;
    MEDIUM?: number;
    LOW?: number;
  };

  /** Per-category SLA days override (categoryId -> days) */
  categoryOverrides?: Record<string, number>;
}

/** Default case SLA configuration */
export const DEFAULT_CASE_SLA_CONFIG: CaseSlaConfig = {
  enabled: true,
  defaultDays: 14,
  warningThresholdPercent: 80,
  criticalThresholdHours: 48,
  severityOverrides: {
    HIGH: 7,
    MEDIUM: 14,
    LOW: 30,
  },
};

/** SLA status type for cases */
export type CaseSlaStatus = "on_track" | "warning" | "breached" | "critical";

/**
 * State tracked per case for SLA deduplication.
 * Stored in Case.slaState JSON field.
 */
export interface CaseSlaState {
  /** Last calculated SLA status */
  lastStatus: CaseSlaStatus;
  /** When last notification was sent */
  lastNotifiedAt: Date | null;
  /** Type of last notification sent */
  lastNotificationType: "warning" | "breach" | "critical" | null;
}
