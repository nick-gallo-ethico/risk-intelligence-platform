/**
 * SLA Domain Events
 *
 * Events related to SLA (Service Level Agreement) tracking and escalation.
 * These events are emitted by the SLA scheduler and tracking services.
 */

import { BaseEvent } from './base.event';

/**
 * Emitted when a case approaches its SLA deadline.
 * Triggers SLA warning notifications.
 */
export class SlaWarningEvent extends BaseEvent {
  static readonly eventName = 'sla.warning';

  /** Case ID */
  readonly caseId: string;
  /** Case reference number for display */
  readonly referenceNumber: string;
  /** Current assignee user ID */
  readonly assigneeId: string;
  /** Hours remaining until SLA breach */
  readonly hoursRemaining: number;
  /** SLA due date */
  readonly dueDate: Date;
  /** Warning threshold that triggered this event */
  readonly threshold: 'WARNING_72H' | 'WARNING_24H';

  constructor(data: Partial<SlaWarningEvent>) {
    super(data);
    if (!data.caseId) {
      throw new Error('SlaWarningEvent requires caseId');
    }
    if (!data.referenceNumber) {
      throw new Error('SlaWarningEvent requires referenceNumber');
    }
    if (!data.assigneeId) {
      throw new Error('SlaWarningEvent requires assigneeId');
    }
    if (data.hoursRemaining === undefined) {
      throw new Error('SlaWarningEvent requires hoursRemaining');
    }
    if (!data.dueDate) {
      throw new Error('SlaWarningEvent requires dueDate');
    }
    if (!data.threshold) {
      throw new Error('SlaWarningEvent requires threshold');
    }

    this.caseId = data.caseId;
    this.referenceNumber = data.referenceNumber;
    this.assigneeId = data.assigneeId;
    this.hoursRemaining = data.hoursRemaining;
    this.dueDate = data.dueDate;
    this.threshold = data.threshold;
  }
}

/**
 * Emitted when a case exceeds its SLA deadline.
 * Triggers escalation to assignee and supervisor.
 */
export class SlaBreachedEvent extends BaseEvent {
  static readonly eventName = 'sla.breached';

  /** Case ID */
  readonly caseId: string;
  /** Case reference number for display */
  readonly referenceNumber: string;
  /** Current assignee user ID */
  readonly assigneeId: string;
  /** Supervisor user ID (if available) */
  readonly supervisorId?: string;
  /** Hours overdue */
  readonly hoursOverdue: number;

  constructor(data: Partial<SlaBreachedEvent>) {
    super(data);
    if (!data.caseId) {
      throw new Error('SlaBreachedEvent requires caseId');
    }
    if (!data.referenceNumber) {
      throw new Error('SlaBreachedEvent requires referenceNumber');
    }
    if (!data.assigneeId) {
      throw new Error('SlaBreachedEvent requires assigneeId');
    }
    if (data.hoursOverdue === undefined) {
      throw new Error('SlaBreachedEvent requires hoursOverdue');
    }

    this.caseId = data.caseId;
    this.referenceNumber = data.referenceNumber;
    this.assigneeId = data.assigneeId;
    this.supervisorId = data.supervisorId;
    this.hoursOverdue = data.hoursOverdue;
  }
}

/**
 * Emitted when a case is critically overdue (48h+ per CONTEXT.md).
 * Triggers escalation to compliance officer.
 */
export class SlaCriticalEvent extends BaseEvent {
  static readonly eventName = 'sla.critical';

  /** Case ID */
  readonly caseId: string;
  /** Case reference number for display */
  readonly referenceNumber: string;
  /** Current assignee user ID */
  readonly assigneeId: string;
  /** Supervisor user ID (if available) */
  readonly supervisorId?: string;
  /** Compliance officer user ID to escalate to */
  readonly complianceOfficerId: string;
  /** Hours overdue */
  readonly hoursOverdue: number;

  constructor(data: Partial<SlaCriticalEvent>) {
    super(data);
    if (!data.caseId) {
      throw new Error('SlaCriticalEvent requires caseId');
    }
    if (!data.referenceNumber) {
      throw new Error('SlaCriticalEvent requires referenceNumber');
    }
    if (!data.assigneeId) {
      throw new Error('SlaCriticalEvent requires assigneeId');
    }
    if (!data.complianceOfficerId) {
      throw new Error('SlaCriticalEvent requires complianceOfficerId');
    }
    if (data.hoursOverdue === undefined) {
      throw new Error('SlaCriticalEvent requires hoursOverdue');
    }

    this.caseId = data.caseId;
    this.referenceNumber = data.referenceNumber;
    this.assigneeId = data.assigneeId;
    this.supervisorId = data.supervisorId;
    this.complianceOfficerId = data.complianceOfficerId;
    this.hoursOverdue = data.hoursOverdue;
  }
}
