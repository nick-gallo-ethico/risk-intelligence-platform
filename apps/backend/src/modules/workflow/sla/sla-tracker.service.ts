import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { SlaStatus } from "@prisma/client";
import { SlaConfig, SlaCalculation, SlaCheckResult } from "./sla.types";
import {
  WorkflowSlaWarningEvent,
  WorkflowSlaBreachEvent,
} from "../events/workflow.events";

/**
 * SlaTrackerService calculates and updates SLA status for workflow instances.
 *
 * Responsibilities:
 * - Calculate current SLA status based on due date and elapsed time
 * - Update workflow instance SLA status in database
 * - Emit warning and breach events for notification integration
 *
 * SLA Status Levels (per CONTEXT.md):
 * - on_track: Less than 80% of time used
 * - warning: 80%+ of time used (At Risk)
 * - breached: Past due date
 * - critical: 24+ hours past due
 *
 * SLA Actions (per CONTEXT.md):
 * - At Risk (80%): Notify assignee
 * - Breached: Notify both assignee and manager, escalate visibility
 * - Critically Breached (24h+): Executive notification
 */
@Injectable()
export class SlaTrackerService {
  private readonly logger = new Logger(SlaTrackerService.name);

  /** Default warning threshold: 80% of time used */
  private readonly DEFAULT_WARNING_THRESHOLD = 80;

  /** Default critical threshold: 24 hours after breach */
  private readonly DEFAULT_CRITICAL_HOURS = 24;

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2
  ) {}

  /**
   * Calculate current SLA status for a workflow instance.
   *
   * @param dueDate - The SLA due date
   * @param startDate - When the workflow started (optional, calculated from config if not provided)
   * @param slaConfig - SLA configuration (optional, uses defaults if not provided)
   * @returns SLA calculation result with status, remaining time, and percentage used
   */
  calculateSlaStatus(
    dueDate: Date,
    startDate?: Date,
    slaConfig?: SlaConfig
  ): SlaCalculation {
    const now = new Date();
    const remainingMs = dueDate.getTime() - now.getTime();
    const remainingHours = remainingMs / (1000 * 60 * 60);

    // Calculate total SLA duration
    const totalDays = slaConfig?.defaultDays || 14;
    const totalMs = totalDays * 24 * 60 * 60 * 1000;

    // Use actual start date if provided, otherwise estimate from due date
    const effectiveStartDate = startDate
      ? startDate
      : new Date(dueDate.getTime() - totalMs);

    const elapsedMs = now.getTime() - effectiveStartDate.getTime();
    const percentUsed = Math.min(
      200,
      Math.max(0, (elapsedMs / totalMs) * 100)
    );

    const warningThreshold =
      slaConfig?.warningThresholdPercent || this.DEFAULT_WARNING_THRESHOLD;
    const criticalHours =
      slaConfig?.criticalThresholdHours || this.DEFAULT_CRITICAL_HOURS;

    let status: SlaCalculation["status"];

    if (remainingHours <= -criticalHours) {
      status = "critical";
    } else if (remainingHours <= 0) {
      status = "breached";
    } else if (percentUsed >= warningThreshold) {
      status = "warning";
    } else {
      status = "on_track";
    }

    return {
      status,
      dueDate,
      remainingHours,
      percentUsed,
      breachedAt: remainingHours <= 0 ? now : undefined,
    };
  }

  /**
   * Update SLA status for all active workflow instances.
   *
   * This method is called by the SlaSchedulerService every 5 minutes.
   * It checks all active instances with due dates and:
   * - Updates their SLA status in the database
   * - Emits warning events when instances become at-risk
   * - Emits breach events when instances become overdue
   *
   * @returns Summary of the check run
   */
  async updateAllSlaStatuses(): Promise<SlaCheckResult> {
    const instances = await this.prisma.workflowInstance.findMany({
      where: {
        status: "ACTIVE",
        dueDate: { not: null },
      },
      include: { template: true },
    });

    let warnings = 0;
    let breaches = 0;

    for (const instance of instances) {
      if (!instance.dueDate) continue;

      try {
        const slaConfig = instance.template
          .slaConfig as unknown as SlaConfig | null;
        const calc = this.calculateSlaStatus(
          instance.dueDate,
          instance.createdAt,
          slaConfig || undefined
        );

        const previousStatus = instance.slaStatus;
        const newStatus = this.mapToDbStatus(calc.status);

        // Only update and emit events if status changed
        if (previousStatus !== newStatus) {
          await this.prisma.workflowInstance.update({
            where: { id: instance.id },
            data: {
              slaStatus: newStatus,
              // Set breached timestamp on first breach
              ...(newStatus === SlaStatus.OVERDUE &&
                !instance.slaBreachedAt && {
                  slaBreachedAt: new Date(),
                }),
            },
          });

          // Emit warning event (transition from ON_TRACK to WARNING)
          if (
            calc.status === "warning" &&
            previousStatus === SlaStatus.ON_TRACK
          ) {
            warnings++;
            this.emitWarningEvent(instance, calc);
          }

          // Emit breach event (transition from ON_TRACK/WARNING to OVERDUE)
          if (
            (calc.status === "breached" || calc.status === "critical") &&
            previousStatus !== SlaStatus.OVERDUE
          ) {
            breaches++;
            this.emitBreachEvent(instance, calc);
          }

          // Emit escalation event (transition from breached to critical)
          // This is still a breach event but with escalated level
          if (
            calc.status === "critical" &&
            previousStatus === SlaStatus.OVERDUE
          ) {
            // Check if we haven't already emitted a critical event
            // by checking if hoursOverdue just crossed the threshold
            const criticalHours =
              slaConfig?.criticalThresholdHours || this.DEFAULT_CRITICAL_HOURS;
            const hoursOverdue = Math.abs(calc.remainingHours);
            // Only emit if just crossed (within last check interval of 5 minutes)
            if (hoursOverdue < criticalHours + 0.1) {
              this.emitBreachEvent(instance, calc);
            }
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to update SLA for instance ${instance.id}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    this.logger.log(
      `SLA check complete: ${instances.length} checked, ${warnings} warnings, ${breaches} breaches`
    );

    return { checked: instances.length, warnings, breaches };
  }

  /**
   * Check and update SLA for a single workflow instance.
   *
   * @param instanceId - ID of the workflow instance
   * @returns The calculated SLA status, or null if instance not found
   */
  async checkInstance(instanceId: string): Promise<SlaCalculation | null> {
    const instance = await this.prisma.workflowInstance.findUnique({
      where: { id: instanceId },
      include: { template: true },
    });

    if (!instance || !instance.dueDate) {
      return null;
    }

    const slaConfig = instance.template
      .slaConfig as unknown as SlaConfig | null;
    return this.calculateSlaStatus(
      instance.dueDate,
      instance.createdAt,
      slaConfig || undefined
    );
  }

  /**
   * Map internal calculation status to database enum.
   */
  private mapToDbStatus(calcStatus: SlaCalculation["status"]): SlaStatus {
    switch (calcStatus) {
      case "warning":
        return SlaStatus.WARNING;
      case "breached":
      case "critical":
        return SlaStatus.OVERDUE;
      default:
        return SlaStatus.ON_TRACK;
    }
  }

  /**
   * Emit a warning event for an at-risk instance.
   */
  private emitWarningEvent(
    instance: { id: string; organizationId: string; entityType: string; entityId: string; currentStage: string; dueDate: Date | null },
    calc: SlaCalculation
  ): void {
    try {
      this.eventEmitter.emit(
        WorkflowSlaWarningEvent.eventName,
        new WorkflowSlaWarningEvent({
          organizationId: instance.organizationId,
          actorType: "SYSTEM",
          instanceId: instance.id,
          entityType: instance.entityType,
          entityId: instance.entityId,
          stage: instance.currentStage,
          dueDate: instance.dueDate!,
          percentUsed: calc.percentUsed,
        })
      );

      this.logger.debug(
        `Emitted SLA warning for instance ${instance.id} (${calc.percentUsed.toFixed(1)}% used)`
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit SLA warning event: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Emit a breach event for an overdue instance.
   */
  private emitBreachEvent(
    instance: { id: string; organizationId: string; entityType: string; entityId: string; currentStage: string },
    calc: SlaCalculation
  ): void {
    try {
      const hoursOverdue = Math.abs(calc.remainingHours);

      this.eventEmitter.emit(
        WorkflowSlaBreachEvent.eventName,
        new WorkflowSlaBreachEvent({
          organizationId: instance.organizationId,
          actorType: "SYSTEM",
          instanceId: instance.id,
          entityType: instance.entityType,
          entityId: instance.entityId,
          stage: instance.currentStage,
          breachLevel: calc.status as "breached" | "critical",
          hoursOverdue,
        })
      );

      this.logger.debug(
        `Emitted SLA ${calc.status} for instance ${instance.id} (${hoursOverdue.toFixed(1)}h overdue)`
      );
    } catch (error) {
      this.logger.error(
        `Failed to emit SLA breach event: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}
