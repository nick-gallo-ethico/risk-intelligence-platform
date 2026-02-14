import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import {
  WorkflowEntityType,
  WorkflowInstanceStatus,
  WorkflowInstance,
  WorkflowTemplate,
} from "@prisma/client";
import {
  WorkflowStage,
  WorkflowTransition,
  TransitionResult,
  StageGate,
  StartWorkflowParams,
  TransitionParams,
  CompleteWorkflowParams,
} from "../types/workflow.types";
import {
  WorkflowInstanceCreatedEvent,
  WorkflowTransitionedEvent,
  WorkflowCompletedEvent,
  WorkflowCancelledEvent,
  WorkflowPausedEvent,
  WorkflowResumedEvent,
} from "../events/workflow.events";

type WorkflowInstanceWithTemplate = WorkflowInstance & {
  template: WorkflowTemplate;
};

/**
 * WorkflowEngineService manages workflow lifecycle operations.
 *
 * Core responsibilities:
 * - Start workflow instances for entities
 * - Validate and execute transitions between stages
 * - Complete, pause, and cancel workflows
 * - Emit events for audit and notification integration
 *
 * Key design decisions:
 * - Instances are locked to template VERSION for in-flight stability
 * - Transitions validate against allowed paths and gates
 * - All state changes emit events for downstream processing
 */
@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Start a new workflow instance for an entity.
   *
   * @param params - Start workflow parameters
   * @returns The ID of the created workflow instance
   * @throws NotFoundException if no active template found
   * @throws BadRequestException if template configuration is invalid
   */
  async startWorkflow(params: StartWorkflowParams): Promise<string> {
    const { organizationId, entityType, entityId, templateId, actorUserId } =
      params;

    // Cast string to enum
    const entityTypeEnum = entityType as WorkflowEntityType;

    // Find template (specific or default for entity type)
    const template = templateId
      ? await this.prisma.workflowTemplate.findFirst({
          where: { id: templateId, organizationId, isActive: true },
        })
      : await this.prisma.workflowTemplate.findFirst({
          where: {
            organizationId,
            entityType: entityTypeEnum,
            isDefault: true,
            isActive: true,
          },
        });

    if (!template) {
      throw new NotFoundException(
        `No active workflow template found for ${entityType}`,
      );
    }

    const stages = template.stages as unknown as WorkflowStage[];
    const initialStage = stages.find((s) => s.id === template.initialStage);

    if (!initialStage) {
      throw new BadRequestException(
        "Invalid workflow template: initial stage not found",
      );
    }

    // Calculate due date from SLA
    const dueDate = template.defaultSlaDays
      ? new Date(Date.now() + template.defaultSlaDays * 24 * 60 * 60 * 1000)
      : null;

    // Create instance locked to this template VERSION
    const instance = await this.prisma.workflowInstance.create({
      data: {
        organizationId,
        templateId: template.id,
        templateVersion: template.version,
        entityType: entityTypeEnum,
        entityId,
        currentStage: template.initialStage,
        status: WorkflowInstanceStatus.ACTIVE,
        stepStates: {},
        dueDate,
        startedById: actorUserId,
      },
    });

    // Emit event
    this.emitEvent(
      WorkflowInstanceCreatedEvent.eventName,
      new WorkflowInstanceCreatedEvent({
        organizationId,
        actorUserId,
        actorType: actorUserId ? "USER" : "SYSTEM",
        instanceId: instance.id,
        templateId: template.id,
        entityType,
        entityId,
        initialStage: template.initialStage,
      }),
    );

    this.logger.log(
      `Started workflow ${instance.id} for ${entityType}:${entityId}`,
    );
    return instance.id;
  }

  /**
   * Transition an entity to a new stage.
   *
   * @param params - Transition parameters
   * @returns Result of the transition attempt
   */
  async transition(params: TransitionParams): Promise<TransitionResult> {
    const {
      instanceId,
      toStage,
      actorUserId,
      validateGates = true,
      reason,
    } = params;

    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { template: true },
    });

    if (!instance) {
      return {
        success: false,
        previousStage: "",
        newStage: toStage,
        error: "Instance not found",
      };
    }

    if (instance.status !== WorkflowInstanceStatus.ACTIVE) {
      return {
        success: false,
        previousStage: instance.currentStage,
        newStage: toStage,
        error: "Workflow not active",
      };
    }

    const transitions = instance.template
      .transitions as unknown as WorkflowTransition[];
    const stages = instance.template.stages as unknown as WorkflowStage[];

    // Validate transition is allowed
    const allowedTransition = transitions.find(
      (t) =>
        (t.from === instance.currentStage || t.from === "*") &&
        t.to === toStage,
    );

    if (!allowedTransition) {
      return {
        success: false,
        previousStage: instance.currentStage,
        newStage: toStage,
        error: `Transition from ${instance.currentStage} to ${toStage} not allowed`,
      };
    }

    // Validate stage gates if required
    if (validateGates) {
      const currentStage = stages.find((s) => s.id === instance.currentStage);
      if (currentStage?.gates) {
        const gateResult = await this.validateGates(
          currentStage.gates,
          instance as WorkflowInstanceWithTemplate,
        );
        if (!gateResult.valid) {
          return {
            success: false,
            previousStage: instance.currentStage,
            newStage: toStage,
            error: `Gate validation failed: ${gateResult.error}`,
          };
        }
      }
    }

    const previousStage = instance.currentStage;

    // Calculate new due date if target stage has specific SLA
    const targetStageConfig = stages.find((s) => s.id === toStage);
    let newDueDate = instance.dueDate;
    if (targetStageConfig?.slaDays) {
      newDueDate = new Date(
        Date.now() + targetStageConfig.slaDays * 24 * 60 * 60 * 1000,
      );
    }

    // Perform transition
    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        currentStage: toStage,
        dueDate: newDueDate,
        stepStates: {
          ...(instance.stepStates as object),
          [previousStage]: {
            status: "completed",
            completedAt: new Date().toISOString(),
            completedBy: actorUserId,
          },
        },
      },
    });

    // Emit event
    this.emitEvent(
      WorkflowTransitionedEvent.eventName,
      new WorkflowTransitionedEvent({
        organizationId: instance.organizationId,
        actorUserId,
        actorType: actorUserId ? "USER" : "SYSTEM",
        instanceId,
        entityType: instance.entityType,
        entityId: instance.entityId,
        previousStage,
        newStage: toStage,
        triggeredBy: actorUserId || "system",
        reason,
      }),
    );

    this.logger.log(
      `Transitioned ${instanceId} from ${previousStage} to ${toStage}`,
    );

    return { success: true, previousStage, newStage: toStage };
  }

  /**
   * Complete a workflow instance.
   *
   * @param params - Completion parameters
   */
  async complete(params: CompleteWorkflowParams): Promise<void> {
    const { instanceId, outcome, actorUserId } = params;

    const instance = await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: WorkflowInstanceStatus.COMPLETED,
        completedAt: new Date(),
        outcome,
      },
    });

    this.emitEvent(
      WorkflowCompletedEvent.eventName,
      new WorkflowCompletedEvent({
        organizationId: instance.organizationId,
        actorUserId,
        actorType: actorUserId ? "USER" : "SYSTEM",
        instanceId,
        entityType: instance.entityType,
        entityId: instance.entityId,
        outcome: outcome || "completed",
      }),
    );

    this.logger.log(
      `Completed workflow ${instanceId} with outcome: ${outcome || "completed"}`,
    );
  }

  /**
   * Cancel a workflow instance.
   *
   * @param instanceId - ID of the workflow instance
   * @param actorUserId - ID of the user cancelling
   * @param reason - Reason for cancellation
   */
  async cancel(
    instanceId: string,
    actorUserId?: string,
    reason?: string,
  ): Promise<void> {
    const instance = await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: WorkflowInstanceStatus.CANCELLED,
      },
    });

    this.emitEvent(
      WorkflowCancelledEvent.eventName,
      new WorkflowCancelledEvent({
        organizationId: instance.organizationId,
        actorUserId,
        actorType: actorUserId ? "USER" : "SYSTEM",
        instanceId,
        entityType: instance.entityType,
        entityId: instance.entityId,
        reason,
      }),
    );

    this.logger.log(`Cancelled workflow ${instanceId}`);
  }

  /**
   * Pause a workflow instance.
   *
   * @param instanceId - ID of the workflow instance
   * @param actorUserId - ID of the user pausing
   * @param reason - Reason for pausing
   */
  async pause(
    instanceId: string,
    actorUserId?: string,
    reason?: string,
  ): Promise<void> {
    const instance = await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: WorkflowInstanceStatus.PAUSED,
      },
    });

    this.emitEvent(
      WorkflowPausedEvent.eventName,
      new WorkflowPausedEvent({
        organizationId: instance.organizationId,
        actorUserId,
        actorType: actorUserId ? "USER" : "SYSTEM",
        instanceId,
        entityType: instance.entityType,
        entityId: instance.entityId,
        reason,
      }),
    );

    this.logger.log(`Paused workflow ${instanceId}`);
  }

  /**
   * Resume a paused workflow instance.
   *
   * @param instanceId - ID of the workflow instance
   * @param actorUserId - ID of the user resuming
   */
  async resume(instanceId: string, actorUserId?: string): Promise<void> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
    });

    if (!instance) {
      throw new NotFoundException(`Workflow instance ${instanceId} not found`);
    }

    if (instance.status !== WorkflowInstanceStatus.PAUSED) {
      throw new BadRequestException("Can only resume paused workflows");
    }

    await this.prisma.workflowInstance.update({
      where: { id: instanceId },
      data: {
        status: WorkflowInstanceStatus.ACTIVE,
      },
    });

    this.emitEvent(
      WorkflowResumedEvent.eventName,
      new WorkflowResumedEvent({
        organizationId: instance.organizationId,
        actorUserId,
        actorType: actorUserId ? "USER" : "SYSTEM",
        instanceId,
        entityType: instance.entityType,
        entityId: instance.entityId,
      }),
    );

    this.logger.log(`Resumed workflow ${instanceId}`);
  }

  /**
   * Get current workflow state for an entity.
   *
   * @param organizationId - Organization ID
   * @param entityType - Type of entity
   * @param entityId - ID of the entity
   * @returns Workflow instance with template, or null if not found
   */
  async getInstanceByEntity(
    organizationId: string,
    entityType: WorkflowEntityType,
    entityId: string,
  ): Promise<WorkflowInstanceWithTemplate | null> {
    return this.prisma.workflowInstance.findUnique({
      where: {
        entityType_entityId: { entityType, entityId },
      },
      include: { template: true },
    });
  }

  /**
   * Get a workflow instance by ID.
   *
   * @param instanceId - ID of the workflow instance
   * @returns Workflow instance with template, or null if not found
   */
  async getInstance(
    instanceId: string,
  ): Promise<WorkflowInstanceWithTemplate | null> {
    return this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { template: true },
    });
  }

  /**
   * Get all allowed transitions from the current stage.
   *
   * @param instanceId - ID of the workflow instance
   * @returns Array of allowed transition targets
   */
  async getAllowedTransitions(
    instanceId: string,
  ): Promise<{ to: string; label?: string }[]> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { template: true },
    });

    if (!instance || instance.status !== WorkflowInstanceStatus.ACTIVE) {
      return [];
    }

    const transitions = instance.template
      .transitions as unknown as WorkflowTransition[];

    return transitions
      .filter((t) => t.from === instance.currentStage || t.from === "*")
      .map((t) => ({ to: t.to, label: t.label }));
  }

  /**
   * Validate stage gates before transition.
   * Placeholder implementation - full gate validation in future iteration.
   */
  private async validateGates(
    gates: StageGate[],
    _instance: WorkflowInstanceWithTemplate,
  ): Promise<{ valid: boolean; error?: string }> {
    for (const gate of gates) {
      if (gate.type === "required_fields") {
        // Would check entity has required fields filled
        // Implementation depends on entity type
      }
      if (gate.type === "approval") {
        // Would check approval status
        // Implementation depends on approval tracking
      }
      if (gate.type === "condition") {
        // Would evaluate condition expression
        // Implementation depends on expression engine
      }
      if (gate.type === "time") {
        // Would check minimum time in stage
        // Implementation depends on stage enter timestamp
      }
    }
    return { valid: true };
  }

  /**
   * Emit an event safely, catching and logging any errors.
   */
  private emitEvent(eventName: string, event: object): void {
    try {
      this.eventEmitter.emit(eventName, event);
    } catch (error) {
      this.logger.error(
        `Failed to emit event ${eventName}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
