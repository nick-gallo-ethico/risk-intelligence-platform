import { Module, OnModuleInit } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditModule } from "../audit/audit.module";
import { EventEmitterModule } from "@nestjs/event-emitter";

// CRUD providers
import { RulesService } from "./rules.service";
import { RulesController } from "./rules.controller";

// Engine providers
import { RulesEngineService } from "./engine/rules-engine.service";
import { AssignUserAction } from "./engine/actions/assign-user.action";
import { AssignTeamAction } from "./engine/actions/assign-team.action";
import { RoundRobinTeamAction } from "./engine/actions/round-robin-team.action";

// Listener providers
import { CaseRoutingListener } from "./listeners/case-routing.listener";
import { InvestigationStatusListener } from "./listeners/investigation-status.listener";

// Testing providers
import { RuleTesterService } from "./testing/rule-tester.service";

/**
 * RulesModule provides the rules engine for automated case routing and actions.
 *
 * Features:
 * - Rule definition CRUD with tenant isolation
 * - Rule activation/deactivation
 * - Execution log querying for audit
 * - Rules engine for evaluation with custom operators
 * - Action executors for rule outcomes
 *
 * Exports:
 * - RulesService: For rule management
 * - RulesEngineService: For rule evaluation and action execution
 *
 * Action executors are registered with the RulesEngineService during
 * module initialization via OnModuleInit.
 */
@Module({
  imports: [PrismaModule, AuditModule, EventEmitterModule.forRoot()],
  providers: [
    // CRUD
    RulesService,
    // Engine
    RulesEngineService,
    AssignUserAction,
    AssignTeamAction,
    RoundRobinTeamAction,
    // Listeners
    CaseRoutingListener,
    InvestigationStatusListener,
    // Testing
    RuleTesterService,
  ],
  controllers: [RulesController],
  exports: [RulesService, RulesEngineService],
})
export class RulesModule implements OnModuleInit {
  constructor(
    private readonly rulesEngine: RulesEngineService,
    private readonly assignUserAction: AssignUserAction,
    private readonly assignTeamAction: AssignTeamAction,
    private readonly roundRobinTeamAction: RoundRobinTeamAction,
  ) {}

  /**
   * Register action executors with the rules engine during initialization.
   * This allows the engine to dispatch actions to the appropriate handlers.
   */
  onModuleInit() {
    this.rulesEngine.registerActionExecutor(this.assignUserAction);
    this.rulesEngine.registerActionExecutor(this.assignTeamAction);
    this.rulesEngine.registerActionExecutor(this.roundRobinTeamAction);
  }
}
