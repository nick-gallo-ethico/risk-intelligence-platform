import { BaseEvent } from "../../events/events/base.event";

/**
 * Event emitted when a new workflow instance is created.
 */
export class WorkflowInstanceCreatedEvent extends BaseEvent {
  static readonly eventName = "workflow.instance_created";

  readonly instanceId: string;
  readonly templateId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly initialStage: string;

  constructor(data: Partial<WorkflowInstanceCreatedEvent>) {
    super(data);
    this.instanceId = data.instanceId!;
    this.templateId = data.templateId!;
    this.entityType = data.entityType!;
    this.entityId = data.entityId!;
    this.initialStage = data.initialStage!;
  }
}

/**
 * Event emitted when a workflow instance transitions between stages.
 */
export class WorkflowTransitionedEvent extends BaseEvent {
  static readonly eventName = "workflow.transitioned";

  readonly instanceId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly previousStage: string;
  readonly newStage: string;
  readonly triggeredBy: string;
  readonly reason?: string;

  constructor(data: Partial<WorkflowTransitionedEvent>) {
    super(data);
    this.instanceId = data.instanceId!;
    this.entityType = data.entityType!;
    this.entityId = data.entityId!;
    this.previousStage = data.previousStage!;
    this.newStage = data.newStage!;
    this.triggeredBy = data.triggeredBy!;
    this.reason = data.reason;
  }
}

/**
 * Event emitted when a workflow instance is completed.
 */
export class WorkflowCompletedEvent extends BaseEvent {
  static readonly eventName = "workflow.completed";

  readonly instanceId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly outcome: string;

  constructor(data: Partial<WorkflowCompletedEvent>) {
    super(data);
    this.instanceId = data.instanceId!;
    this.entityType = data.entityType!;
    this.entityId = data.entityId!;
    this.outcome = data.outcome!;
  }
}

/**
 * Event emitted when a workflow instance breaches or approaches SLA.
 */
export class WorkflowSlaBreachEvent extends BaseEvent {
  static readonly eventName = "workflow.sla_breach";

  readonly instanceId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly stage: string;
  readonly breachLevel: "warning" | "breached" | "critical";
  readonly dueDate: Date;
  readonly daysPastDue?: number;

  constructor(data: Partial<WorkflowSlaBreachEvent>) {
    super(data);
    this.instanceId = data.instanceId!;
    this.entityType = data.entityType!;
    this.entityId = data.entityId!;
    this.stage = data.stage!;
    this.breachLevel = data.breachLevel!;
    this.dueDate = data.dueDate!;
    this.daysPastDue = data.daysPastDue;
  }
}

/**
 * Event emitted when a workflow instance is cancelled.
 */
export class WorkflowCancelledEvent extends BaseEvent {
  static readonly eventName = "workflow.cancelled";

  readonly instanceId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly reason?: string;

  constructor(data: Partial<WorkflowCancelledEvent>) {
    super(data);
    this.instanceId = data.instanceId!;
    this.entityType = data.entityType!;
    this.entityId = data.entityId!;
    this.reason = data.reason;
  }
}

/**
 * Event emitted when a workflow instance is paused.
 */
export class WorkflowPausedEvent extends BaseEvent {
  static readonly eventName = "workflow.paused";

  readonly instanceId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly reason?: string;

  constructor(data: Partial<WorkflowPausedEvent>) {
    super(data);
    this.instanceId = data.instanceId!;
    this.entityType = data.entityType!;
    this.entityId = data.entityId!;
    this.reason = data.reason;
  }
}

/**
 * Event emitted when a workflow instance is resumed.
 */
export class WorkflowResumedEvent extends BaseEvent {
  static readonly eventName = "workflow.resumed";

  readonly instanceId: string;
  readonly entityType: string;
  readonly entityId: string;

  constructor(data: Partial<WorkflowResumedEvent>) {
    super(data);
    this.instanceId = data.instanceId!;
    this.entityType = data.entityType!;
    this.entityId = data.entityId!;
  }
}
