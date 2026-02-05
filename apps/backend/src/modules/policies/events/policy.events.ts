import { BaseEvent } from "../../events/events/base.event";

/**
 * Emitted when a new policy is created.
 * Subscribers: audit logging, search indexing
 */
export class PolicyCreatedEvent extends BaseEvent {
  static readonly eventName = "policy.created";

  readonly policyId: string;
  readonly title: string;
  readonly ownerId: string;

  constructor(data: Partial<PolicyCreatedEvent>) {
    super(data);
    if (!data.policyId) {
      throw new Error("PolicyCreatedEvent requires policyId");
    }
    if (!data.title) {
      throw new Error("PolicyCreatedEvent requires title");
    }
    if (!data.ownerId) {
      throw new Error("PolicyCreatedEvent requires ownerId");
    }

    this.policyId = data.policyId;
    this.title = data.title;
    this.ownerId = data.ownerId;
  }
}

/**
 * Emitted when policy draft is updated.
 * Subscribers: audit logging
 */
export class PolicyUpdatedEvent extends BaseEvent {
  static readonly eventName = "policy.updated";

  readonly policyId: string;
  readonly changes: Record<string, { old: unknown; new: unknown }>;

  constructor(data: Partial<PolicyUpdatedEvent>) {
    super(data);
    if (!data.policyId) {
      throw new Error("PolicyUpdatedEvent requires policyId");
    }
    if (!data.changes) {
      throw new Error("PolicyUpdatedEvent requires changes");
    }

    this.policyId = data.policyId;
    this.changes = data.changes;
  }
}

/**
 * Emitted when a policy is published (new version created).
 * Subscribers: audit logging, search indexing, notifications, attestation workflow
 */
export class PolicyPublishedEvent extends BaseEvent {
  static readonly eventName = "policy.published";

  readonly policyId: string;
  readonly policyVersionId: string;
  readonly version: number;

  constructor(data: Partial<PolicyPublishedEvent>) {
    super(data);
    if (!data.policyId) {
      throw new Error("PolicyPublishedEvent requires policyId");
    }
    if (!data.policyVersionId) {
      throw new Error("PolicyPublishedEvent requires policyVersionId");
    }
    if (data.version === undefined) {
      throw new Error("PolicyPublishedEvent requires version");
    }

    this.policyId = data.policyId;
    this.policyVersionId = data.policyVersionId;
    this.version = data.version;
  }
}

/**
 * Emitted when a policy is retired.
 * Subscribers: audit logging, notifications
 */
export class PolicyRetiredEvent extends BaseEvent {
  static readonly eventName = "policy.retired";

  readonly policyId: string;

  constructor(data: Partial<PolicyRetiredEvent>) {
    super(data);
    if (!data.policyId) {
      throw new Error("PolicyRetiredEvent requires policyId");
    }

    this.policyId = data.policyId;
  }
}

/**
 * Emitted when policy status changes (excluding retire which has its own event).
 * Subscribers: audit logging, workflow engine
 */
export class PolicyStatusChangedEvent extends BaseEvent {
  static readonly eventName = "policy.status_changed";

  readonly policyId: string;
  readonly fromStatus: string;
  readonly toStatus: string;

  constructor(data: Partial<PolicyStatusChangedEvent>) {
    super(data);
    if (!data.policyId) {
      throw new Error("PolicyStatusChangedEvent requires policyId");
    }
    if (!data.fromStatus) {
      throw new Error("PolicyStatusChangedEvent requires fromStatus");
    }
    if (!data.toStatus) {
      throw new Error("PolicyStatusChangedEvent requires toStatus");
    }

    this.policyId = data.policyId;
    this.fromStatus = data.fromStatus;
    this.toStatus = data.toStatus;
  }
}
