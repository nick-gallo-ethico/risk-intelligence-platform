import { BaseEvent } from "../../events/events/base.event";
import { ProjectTaskStatus, ProjectTaskPriority } from "@prisma/client";

/**
 * Emitted when a new project task is created.
 * Subscribers: audit logging, progress recalculation
 */
export class ProjectTaskCreatedEvent extends BaseEvent {
  static readonly eventName = "project.task.created";

  readonly taskId: string;
  readonly milestoneId: string;
  readonly title: string;
  readonly groupId?: string;

  constructor(data: Partial<ProjectTaskCreatedEvent>) {
    super(data);
    if (!data.taskId) {
      throw new Error("ProjectTaskCreatedEvent requires taskId");
    }
    if (!data.milestoneId) {
      throw new Error("ProjectTaskCreatedEvent requires milestoneId");
    }
    if (!data.title) {
      throw new Error("ProjectTaskCreatedEvent requires title");
    }

    this.taskId = data.taskId;
    this.milestoneId = data.milestoneId;
    this.title = data.title;
    this.groupId = data.groupId;
  }
}

/**
 * Emitted when a project task is updated.
 * Subscribers: audit logging, progress recalculation
 */
export class ProjectTaskUpdatedEvent extends BaseEvent {
  static readonly eventName = "project.task.updated";

  readonly taskId: string;
  readonly milestoneId: string;
  readonly changes: Record<string, { old: unknown; new: unknown }>;

  constructor(data: Partial<ProjectTaskUpdatedEvent>) {
    super(data);
    if (!data.taskId) {
      throw new Error("ProjectTaskUpdatedEvent requires taskId");
    }
    if (!data.milestoneId) {
      throw new Error("ProjectTaskUpdatedEvent requires milestoneId");
    }
    if (!data.changes) {
      throw new Error("ProjectTaskUpdatedEvent requires changes");
    }

    this.taskId = data.taskId;
    this.milestoneId = data.milestoneId;
    this.changes = data.changes;
  }
}

/**
 * Emitted when a project task is completed (status changed to DONE).
 * Subscribers: audit logging, progress recalculation, notifications
 */
export class ProjectTaskCompletedEvent extends BaseEvent {
  static readonly eventName = "project.task.completed";

  readonly taskId: string;
  readonly milestoneId: string;
  readonly title: string;

  constructor(data: Partial<ProjectTaskCompletedEvent>) {
    super(data);
    if (!data.taskId) {
      throw new Error("ProjectTaskCompletedEvent requires taskId");
    }
    if (!data.milestoneId) {
      throw new Error("ProjectTaskCompletedEvent requires milestoneId");
    }
    if (!data.title) {
      throw new Error("ProjectTaskCompletedEvent requires title");
    }

    this.taskId = data.taskId;
    this.milestoneId = data.milestoneId;
    this.title = data.title;
  }
}

/**
 * Emitted when a project task is deleted.
 * Subscribers: audit logging, progress recalculation
 */
export class ProjectTaskDeletedEvent extends BaseEvent {
  static readonly eventName = "project.task.deleted";

  readonly taskId: string;
  readonly milestoneId: string;
  readonly title: string;

  constructor(data: Partial<ProjectTaskDeletedEvent>) {
    super(data);
    if (!data.taskId) {
      throw new Error("ProjectTaskDeletedEvent requires taskId");
    }
    if (!data.milestoneId) {
      throw new Error("ProjectTaskDeletedEvent requires milestoneId");
    }
    if (!data.title) {
      throw new Error("ProjectTaskDeletedEvent requires title");
    }

    this.taskId = data.taskId;
    this.milestoneId = data.milestoneId;
    this.title = data.title;
  }
}

/**
 * Emitted when a project group is created.
 * Subscribers: audit logging
 */
export class ProjectGroupCreatedEvent extends BaseEvent {
  static readonly eventName = "project.group.created";

  readonly groupId: string;
  readonly milestoneId: string;
  readonly name: string;

  constructor(data: Partial<ProjectGroupCreatedEvent>) {
    super(data);
    if (!data.groupId) {
      throw new Error("ProjectGroupCreatedEvent requires groupId");
    }
    if (!data.milestoneId) {
      throw new Error("ProjectGroupCreatedEvent requires milestoneId");
    }
    if (!data.name) {
      throw new Error("ProjectGroupCreatedEvent requires name");
    }

    this.groupId = data.groupId;
    this.milestoneId = data.milestoneId;
    this.name = data.name;
  }
}

/**
 * Emitted when a project group is deleted.
 * Subscribers: audit logging
 */
export class ProjectGroupDeletedEvent extends BaseEvent {
  static readonly eventName = "project.group.deleted";

  readonly groupId: string;
  readonly milestoneId: string;
  readonly name: string;

  constructor(data: Partial<ProjectGroupDeletedEvent>) {
    super(data);
    if (!data.groupId) {
      throw new Error("ProjectGroupDeletedEvent requires groupId");
    }
    if (!data.milestoneId) {
      throw new Error("ProjectGroupDeletedEvent requires milestoneId");
    }
    if (!data.name) {
      throw new Error("ProjectGroupDeletedEvent requires name");
    }

    this.groupId = data.groupId;
    this.milestoneId = data.milestoneId;
    this.name = data.name;
  }
}
