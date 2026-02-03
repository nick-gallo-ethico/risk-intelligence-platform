import { BaseEvent } from "./base.event";

/**
 * Emitted when a new investigation is created on a case.
 * Subscribers: audit logging, search indexing, notifications
 */
export class InvestigationCreatedEvent extends BaseEvent {
  static readonly eventName = "investigation.created";

  readonly investigationId: string;
  readonly caseId: string;
  readonly investigationNumber: number;

  constructor(data: Partial<InvestigationCreatedEvent>) {
    super(data);
    if (!data.investigationId) {
      throw new Error("InvestigationCreatedEvent requires investigationId");
    }
    if (!data.caseId) {
      throw new Error("InvestigationCreatedEvent requires caseId");
    }
    if (data.investigationNumber === undefined) {
      throw new Error("InvestigationCreatedEvent requires investigationNumber");
    }

    this.investigationId = data.investigationId;
    this.caseId = data.caseId;
    this.investigationNumber = data.investigationNumber;
  }
}

/**
 * Emitted when investigation status changes.
 * Subscribers: audit logging, workflow engine, case status derivation
 */
export class InvestigationStatusChangedEvent extends BaseEvent {
  static readonly eventName = "investigation.status_changed";

  readonly investigationId: string;
  readonly caseId: string;
  readonly previousStatus: string;
  readonly newStatus: string;

  constructor(data: Partial<InvestigationStatusChangedEvent>) {
    super(data);
    if (!data.investigationId) {
      throw new Error(
        "InvestigationStatusChangedEvent requires investigationId",
      );
    }
    if (!data.caseId) {
      throw new Error("InvestigationStatusChangedEvent requires caseId");
    }
    if (!data.previousStatus) {
      throw new Error(
        "InvestigationStatusChangedEvent requires previousStatus",
      );
    }
    if (!data.newStatus) {
      throw new Error("InvestigationStatusChangedEvent requires newStatus");
    }

    this.investigationId = data.investigationId;
    this.caseId = data.caseId;
    this.previousStatus = data.previousStatus;
    this.newStatus = data.newStatus;
  }
}

/**
 * Emitted when investigation is assigned to a different investigator.
 * Subscribers: audit logging, notifications
 */
export class InvestigationAssignedEvent extends BaseEvent {
  static readonly eventName = "investigation.assigned";

  readonly investigationId: string;
  readonly caseId: string;
  readonly previousInvestigatorId: string | null;
  readonly newInvestigatorId: string;

  constructor(data: Partial<InvestigationAssignedEvent>) {
    super(data);
    if (!data.investigationId) {
      throw new Error("InvestigationAssignedEvent requires investigationId");
    }
    if (!data.caseId) {
      throw new Error("InvestigationAssignedEvent requires caseId");
    }
    if (!data.newInvestigatorId) {
      throw new Error("InvestigationAssignedEvent requires newInvestigatorId");
    }

    this.investigationId = data.investigationId;
    this.caseId = data.caseId;
    this.previousInvestigatorId = data.previousInvestigatorId ?? null;
    this.newInvestigatorId = data.newInvestigatorId;
  }
}
