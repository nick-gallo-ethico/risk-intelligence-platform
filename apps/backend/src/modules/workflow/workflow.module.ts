import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { WorkflowEngineService } from "./engine/workflow-engine.service";
import { WorkflowService } from "./workflow.service";
import { WorkflowController } from "./workflow.controller";
import { SlaTrackerService } from "./sla/sla-tracker.service";
import { SlaSchedulerService } from "./sla/sla-scheduler.service";
import { SlaConfigService } from "./sla/sla-config.service";
import { SlaConfigController } from "./sla/sla-config.controller";
import { CaseSlaTrackerService } from "./sla/case-sla-tracker.service";
import { AssignmentRulesService } from "./assignment/assignment-rules.service";
import { RoundRobinStrategy } from "./assignment/strategies/round-robin.strategy";
import { LeastLoadedStrategy } from "./assignment/strategies/least-loaded.strategy";
import { GeographicStrategy } from "./assignment/strategies/geographic.strategy";

/**
 * WorkflowModule provides the workflow engine for entity lifecycle management.
 *
 * Features:
 * - Configurable workflow templates with stages and transitions
 * - Workflow instances that track entity progress
 * - Stage-level and workflow-level SLA tracking (every 5 minutes)
 * - Case-level SLA configuration per organization
 * - Auto-assignment with pluggable strategies (round-robin, least-loaded, geographic)
 * - Event-driven architecture for audit and notification integration
 *
 * Exports:
 * - WorkflowEngineService: For starting/transitioning workflows from other modules
 * - WorkflowService: For template management
 * - SlaTrackerService: For workflow SLA status calculations and updates
 * - CaseSlaTrackerService: For case-level SLA monitoring
 * - SlaConfigService: For organization-level SLA configuration
 * - AssignmentRulesService: For auto-assignment based on rules
 */
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    // Core workflow services
    WorkflowEngineService,
    WorkflowService,
    // SLA tracking
    SlaTrackerService,
    CaseSlaTrackerService,
    SlaSchedulerService,
    SlaConfigService,
    // Assignment strategies
    RoundRobinStrategy,
    LeastLoadedStrategy,
    GeographicStrategy,
    AssignmentRulesService,
  ],
  controllers: [WorkflowController, SlaConfigController],
  exports: [
    WorkflowEngineService,
    WorkflowService,
    SlaTrackerService,
    CaseSlaTrackerService,
    SlaConfigService,
    AssignmentRulesService,
  ],
})
export class WorkflowModule {}
