import { BaseEvent } from "./base.event";

/**
 * Emitted when a new case is created.
 * Subscribers: audit logging, search indexing, notifications
 */
export class CaseCreatedEvent extends BaseEvent {
  static readonly eventName = "case.created";

  readonly caseId: string;
  readonly referenceNumber: string;
  readonly sourceChannel: string;
  readonly categoryId?: string;
  readonly severity: string;

  constructor(data: Partial<CaseCreatedEvent>) {
    super(data);
    if (!data.caseId) {
      throw new Error("CaseCreatedEvent requires caseId");
    }
    if (!data.referenceNumber) {
      throw new Error("CaseCreatedEvent requires referenceNumber");
    }
    if (!data.sourceChannel) {
      throw new Error("CaseCreatedEvent requires sourceChannel");
    }
    if (!data.severity) {
      throw new Error("CaseCreatedEvent requires severity");
    }

    this.caseId = data.caseId;
    this.referenceNumber = data.referenceNumber;
    this.sourceChannel = data.sourceChannel;
    this.categoryId = data.categoryId;
    this.severity = data.severity;
  }
}

/**
 * Emitted when case fields are updated.
 * Subscribers: audit logging, search re-indexing
 */
export class CaseUpdatedEvent extends BaseEvent {
  static readonly eventName = "case.updated";

  readonly caseId: string;
  readonly changes: Record<string, { old: unknown; new: unknown }>;

  constructor(data: Partial<CaseUpdatedEvent>) {
    super(data);
    if (!data.caseId) {
      throw new Error("CaseUpdatedEvent requires caseId");
    }
    if (!data.changes) {
      throw new Error("CaseUpdatedEvent requires changes");
    }

    this.caseId = data.caseId;
    this.changes = data.changes;
  }
}

/**
 * Emitted when case status changes.
 * Subscribers: audit logging, workflow engine, notifications, SLA tracking
 */
export class CaseStatusChangedEvent extends BaseEvent {
  static readonly eventName = "case.status_changed";

  readonly caseId: string;
  readonly previousStatus: string;
  readonly newStatus: string;
  readonly rationale?: string;

  constructor(data: Partial<CaseStatusChangedEvent>) {
    super(data);
    if (!data.caseId) {
      throw new Error("CaseStatusChangedEvent requires caseId");
    }
    if (!data.previousStatus) {
      throw new Error("CaseStatusChangedEvent requires previousStatus");
    }
    if (!data.newStatus) {
      throw new Error("CaseStatusChangedEvent requires newStatus");
    }

    this.caseId = data.caseId;
    this.previousStatus = data.previousStatus;
    this.newStatus = data.newStatus;
    this.rationale = data.rationale;
  }
}

/**
 * Emitted when case is assigned to a different user.
 * Subscribers: audit logging, notifications
 */
export class CaseAssignedEvent extends BaseEvent {
  static readonly eventName = "case.assigned";

  readonly caseId: string;
  readonly previousAssigneeId: string | null;
  readonly newAssigneeId: string;

  constructor(data: Partial<CaseAssignedEvent>) {
    super(data);
    if (!data.caseId) {
      throw new Error("CaseAssignedEvent requires caseId");
    }
    if (!data.newAssigneeId) {
      throw new Error("CaseAssignedEvent requires newAssigneeId");
    }

    this.caseId = data.caseId;
    this.previousAssigneeId = data.previousAssigneeId ?? null;
    this.newAssigneeId = data.newAssigneeId;
  }
}
