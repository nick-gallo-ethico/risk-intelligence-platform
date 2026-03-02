import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { RulesEngineService } from "../engine/rules-engine.service";
import { EscalationService } from "./escalation.service";
import {
  SlaWarningEvent,
  SlaBreachedEvent,
  SlaCriticalEvent,
} from "../../events/events/sla.events";

/**
 * EscalationTriggerListener listens to SLA events and evaluates escalation rules.
 *
 * When an SLA event occurs (warning, breached, critical), this listener:
 * 1. Builds escalation facts from the case data
 * 2. Evaluates escalation rules via the RulesEngineService
 * 3. Executes triggered actions (e.g., escalate_to_role)
 *
 * This integrates the escalation rules with the existing rules engine,
 * avoiding any duplication of rule evaluation logic.
 */
@Injectable()
export class EscalationTriggerListener {
  private readonly logger = new Logger(EscalationTriggerListener.name);

  constructor(
    private readonly rulesEngine: RulesEngineService,
    private readonly escalationService: EscalationService,
  ) {}

  /**
   * Handle SLA warning events.
   * Triggered when a case approaches its SLA deadline.
   */
  @OnEvent("sla.warning", { async: true })
  async handleSlaWarning(event: SlaWarningEvent): Promise<void> {
    this.logger.debug(
      `SLA warning event received for case ${event.caseId} (${event.hoursRemaining}h remaining)`,
    );

    await this.evaluateEscalationRules(
      event.organizationId,
      event.caseId,
      "sla.warning",
      "warning",
      { hoursRemaining: event.hoursRemaining },
    );
  }

  /**
   * Handle SLA breached events.
   * Triggered when a case exceeds its SLA deadline.
   */
  @OnEvent("sla.breached", { async: true })
  async handleSlaBreach(event: SlaBreachedEvent): Promise<void> {
    this.logger.debug(
      `SLA breached event received for case ${event.caseId} (${event.hoursOverdue}h overdue)`,
    );

    await this.evaluateEscalationRules(
      event.organizationId,
      event.caseId,
      "sla.breached",
      "breached",
      { hoursOverdue: event.hoursOverdue },
    );
  }

  /**
   * Handle SLA critical events.
   * Triggered when a case is critically overdue (48h+).
   */
  @OnEvent("sla.critical", { async: true })
  async handleSlaCritical(event: SlaCriticalEvent): Promise<void> {
    this.logger.debug(
      `SLA critical event received for case ${event.caseId} (${event.hoursOverdue}h overdue)`,
    );

    await this.evaluateEscalationRules(
      event.organizationId,
      event.caseId,
      "sla.critical",
      "critical",
      { hoursOverdue: event.hoursOverdue },
    );
  }

  /**
   * Evaluate escalation rules for a given SLA event.
   *
   * @param organizationId - Tenant ID
   * @param caseId - Case that triggered the event
   * @param triggerEvent - Rule trigger event name
   * @param slaEventType - SLA event type for facts
   * @param slaEventData - Additional SLA data (hours remaining/overdue)
   */
  private async evaluateEscalationRules(
    organizationId: string,
    caseId: string,
    triggerEvent: string,
    slaEventType: "warning" | "breached" | "critical",
    slaEventData: { hoursRemaining?: number; hoursOverdue?: number },
  ): Promise<void> {
    try {
      // Build facts for rule evaluation
      const facts = await this.escalationService.buildEscalationFacts(
        caseId,
        slaEventType,
        slaEventData,
      );

      // Also add flat keys for flexible rule conditions
      // This dual format (nested + flat) supports both styles of rule authoring
      const flattenedFacts = {
        ...facts,
        // Flat keys for simple conditions
        severity: facts.case.severity,
        status: facts.case.status,
        categoryId: facts.case.categoryId,
        isUnassigned: facts.assignment.isUnassigned,
        hoursUnassigned: facts.assignment.hoursUnassigned,
        hoursOverdue: facts.slaEvent.hoursOverdue,
        hoursRemaining: facts.slaEvent.hoursRemaining,
        slaEventType: facts.slaEvent.type,
      };

      // Evaluate escalation rules using the standard rules engine
      const result = await this.rulesEngine.evaluate(
        organizationId,
        triggerEvent,
        flattenedFacts,
      );

      if (result.matched && result.triggeredActions.length > 0) {
        this.logger.log(
          `Escalation rule matched for case ${caseId}: ${result.matchedRuleName} (${result.matchedRuleId})`,
        );

        // Execute triggered actions
        const actionResult = await this.rulesEngine.executeActions(
          result.triggeredActions,
          {
            organizationId,
            entityType: "CASE",
            entityId: caseId,
            triggeredByRuleId: result.matchedRuleId!,
            actorType: "SYSTEM",
          },
        );

        // Log execution for audit trail
        await this.rulesEngine.logExecution(
          organizationId,
          result.matchedRuleId!,
          "CASE",
          caseId,
          result,
          actionResult.actions,
        );

        if (!actionResult.allSuccessful) {
          this.logger.warn(
            `Some escalation actions failed for case ${caseId}: ${actionResult.actions
              .filter((a) => !a.success)
              .map((a) => `${a.actionType}: ${a.error}`)
              .join(", ")}`,
          );
        }
      } else {
        this.logger.debug(
          `No escalation rules matched for case ${caseId} on ${triggerEvent}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Escalation rule evaluation failed for case ${caseId}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      );
    }
  }
}
