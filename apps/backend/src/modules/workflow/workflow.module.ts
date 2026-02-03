import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { WorkflowEngineService } from "./engine/workflow-engine.service";
import { WorkflowService } from "./workflow.service";
import { WorkflowController } from "./workflow.controller";
import { SlaTrackerService } from "./sla/sla-tracker.service";
import { SlaSchedulerService } from "./sla/sla-scheduler.service";

/**
 * WorkflowModule provides the workflow engine for entity lifecycle management.
 *
 * Features:
 * - Configurable workflow templates with stages and transitions
 * - Workflow instances that track entity progress
 * - Stage-level and workflow-level SLA tracking (every 5 minutes)
 * - Event-driven architecture for audit and notification integration
 *
 * Exports:
 * - WorkflowEngineService: For starting/transitioning workflows from other modules
 * - WorkflowService: For template management
 * - SlaTrackerService: For SLA status calculations and updates
 */
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    WorkflowEngineService,
    WorkflowService,
    SlaTrackerService,
    SlaSchedulerService,
  ],
  controllers: [WorkflowController],
  exports: [WorkflowEngineService, WorkflowService, SlaTrackerService],
})
export class WorkflowModule {}
