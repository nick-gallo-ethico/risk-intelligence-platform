/**
 * Implementation Portal Types
 *
 * Supports both PLG (self-serve) and Enterprise (guided) implementation tracks
 * per CONTEXT.md decisions.
 */

// Implementation type determines which checklist template to use
export enum ImplementationType {
  SMB_QUICK_START = "SMB_QUICK_START", // 1-2 week self-serve
  ENTERPRISE_FULL = "ENTERPRISE_FULL", // 6-8 week guided
  HEALTHCARE_HIPAA = "HEALTHCARE_HIPAA", // Industry-specific
  FINANCIAL_SOX = "FINANCIAL_SOX", // Industry-specific
  GENERAL_BUSINESS = "GENERAL_BUSINESS", // Standard business
}

// Phases for Enterprise implementation (per CONTEXT.md)
export enum ImplementationPhase {
  DISCOVERY = "DISCOVERY",
  CONFIGURATION = "CONFIGURATION",
  DATA_MIGRATION = "DATA_MIGRATION",
  UAT = "UAT",
  GO_LIVE = "GO_LIVE",
  OPTIMIZATION = "OPTIMIZATION",
}

// Phases for PLG/SMB implementation
export enum PlgPhase {
  SETUP = "SETUP",
  FIRST_POLICY = "FIRST_POLICY",
  FIRST_WORKFLOW = "FIRST_WORKFLOW",
  INVITE_TEAM = "INVITE_TEAM",
  ACTIVE = "ACTIVE",
}

export enum ProjectStatus {
  NOT_STARTED = "NOT_STARTED",
  IN_PROGRESS = "IN_PROGRESS",
  AT_RISK = "AT_RISK",
  ON_HOLD = "ON_HOLD",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum TaskStatus {
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  BLOCKED = "BLOCKED",
  COMPLETED = "COMPLETED",
  SKIPPED = "SKIPPED",
}

// Blocker categories determine escalation timing per CONTEXT.md
export enum BlockerCategory {
  INTERNAL = "INTERNAL", // 3-day escalation
  CLIENT_SIDE = "CLIENT_SIDE", // 5-day escalation
  VENDOR = "VENDOR", // 5-day escalation
}

export enum BlockerStatus {
  OPEN = "OPEN",
  SNOOZED = "SNOOZED",
  RESOLVED = "RESOLVED",
}

export enum ActivityType {
  EMAIL_SENT = "EMAIL_SENT",
  EMAIL_RECEIVED = "EMAIL_RECEIVED",
  MEETING = "MEETING",
  DECISION = "DECISION",
  PHASE_TRANSITION = "PHASE_TRANSITION",
  NOTE = "NOTE",
  TASK_COMPLETED = "TASK_COMPLETED",
  BLOCKER_CREATED = "BLOCKER_CREATED",
  BLOCKER_RESOLVED = "BLOCKER_RESOLVED",
}

// Escalation timing by category (in days)
export const ESCALATION_TIMING = {
  [BlockerCategory.INTERNAL]: { reminder: 2, manager: 3, director: 7 },
  [BlockerCategory.CLIENT_SIDE]: { reminder: 2, manager: 5, director: 7 },
  [BlockerCategory.VENDOR]: { reminder: 2, manager: 5, director: 7 },
} as const;

// Type for escalation timing
export type EscalationTiming = typeof ESCALATION_TIMING;

/**
 * Health score components for implementation project tracking
 */
export interface ImplementationHealthScore {
  taskCompletionRate: number; // 0-100
  blockerCount: number;
  daysFromTarget: number; // negative = behind, positive = ahead
  overallScore: number; // 0-100 weighted average
}

/**
 * Phase configuration for implementation templates
 */
export interface PhaseConfig {
  phase: ImplementationPhase;
  name: string;
  estimatedDays: number;
  tasks: PhaseTaskTemplate[];
}

/**
 * Task template for implementation phases
 */
export interface PhaseTaskTemplate {
  name: string;
  description?: string;
  isRequired: boolean;
  estimatedHours?: number;
  dependsOn?: string[]; // Task names that must complete first
}
