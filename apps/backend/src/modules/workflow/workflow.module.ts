import { Module } from "@nestjs/common";
import { WorkflowEngineService } from "./engine/workflow-engine.service";
import { WorkflowService } from "./workflow.service";
import { WorkflowController } from "./workflow.controller";

/**
 * WorkflowModule provides the workflow engine for entity lifecycle management.
 *
 * Features:
 * - Configurable workflow templates with stages and transitions
 * - Workflow instances that track entity progress
 * - Stage-level and workflow-level SLA tracking
 * - Event-driven architecture for audit and notification integration
 *
 * Exports:
 * - WorkflowEngineService: For starting/transitioning workflows from other modules
 * - WorkflowService: For template management
 */
@Module({
  providers: [WorkflowEngineService, WorkflowService],
  controllers: [WorkflowController],
  exports: [WorkflowEngineService, WorkflowService],
})
export class WorkflowModule {}
