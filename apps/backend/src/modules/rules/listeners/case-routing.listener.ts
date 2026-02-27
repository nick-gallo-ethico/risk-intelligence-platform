import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../../prisma/prisma.service";
import { RulesEngineService } from "../engine/rules-engine.service";
import { CaseCreatedEvent } from "../../events/events/case.events";
import type { ActionContext } from "../engine/actions/base.action";

/**
 * CaseRoutingListener evaluates routing rules when new cases are created.
 *
 * This listener:
 * 1. Receives case.created events asynchronously
 * 2. Skips if case already has an assignee (no re-routing)
 * 3. Loads case data including category and location
 * 4. Builds flat + nested facts for rule evaluation
 * 5. Evaluates active routing rules via RulesEngineService
 * 6. Executes matching rule actions (e.g., assignment)
 * 7. Logs all evaluations (both match and no-match) for audit trail
 *
 * CRITICAL: Uses { async: true } to avoid blocking case creation response.
 * Errors are caught and logged but never propagated - routing failure
 * should not prevent case creation from completing.
 */
@Injectable()
export class CaseRoutingListener {
  private readonly logger = new Logger(CaseRoutingListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesEngine: RulesEngineService,
  ) {}

  /**
   * Handle case.created events by evaluating routing rules.
   *
   * Async execution ensures case creation response is not blocked.
   * All rule evaluations (match and no-match) are logged for compliance audit.
   *
   * @param event - CaseCreatedEvent with case details
   */
  @OnEvent(CaseCreatedEvent.eventName, { async: true })
  async handleCaseCreated(event: CaseCreatedEvent): Promise<void> {
    this.logger.debug(`Evaluating routing rules for case ${event.caseId}`);

    try {
      // Check if case already has assignment - skip to avoid re-routing
      // Note: Case model doesn't have assignedToId/assignedTeamId yet,
      // so we check if there's an active investigation with a primary investigator
      const existingCase = await this.prisma.case.findUnique({
        where: { id: event.caseId },
        select: {
          id: true,
          referenceNumber: true,
          // Check investigations for primary investigator as proxy for "assigned"
          // until assignedToId field is added to Case model
          investigations: {
            where: { status: { not: "CLOSED" } },
            select: { primaryInvestigatorId: true },
            take: 1,
          },
        },
      });

      // If case has any active investigation with a primary investigator, consider it assigned
      const hasAssignment = existingCase?.investigations?.some(
        (inv) => inv.primaryInvestigatorId,
      );

      if (hasAssignment) {
        this.logger.debug(
          `Case ${event.caseId} already has assigned investigation, skipping routing rules`,
        );
        return;
      }

      // Load additional case data for fact building
      const caseData = await this.loadCaseData(
        event.caseId,
        event.organizationId,
      );
      if (!caseData) {
        this.logger.warn(`Case ${event.caseId} not found, skipping routing`);
        return;
      }

      // Build facts from case data
      const facts = this.buildFacts(event, caseData);

      // Evaluate routing rules
      const result = await this.rulesEngine.evaluate(
        event.organizationId,
        "case.created",
        facts,
      );

      // Log evaluation regardless of match (audit completeness)
      if (result.matched && result.matchedRuleId) {
        // Execute actions if matched
        const context: ActionContext = {
          organizationId: event.organizationId,
          entityType: "CASE",
          entityId: event.caseId,
          triggeredByRuleId: result.matchedRuleId,
          actorType: "SYSTEM",
        };

        const actionResults = await this.rulesEngine.executeActions(
          result.triggeredActions,
          context,
        );

        // Log execution with action results
        await this.rulesEngine.logExecution(
          event.organizationId,
          result.matchedRuleId,
          "CASE",
          event.caseId,
          result,
          actionResults.actions,
        );

        this.logger.log(
          `Routing rule "${result.matchedRuleName}" applied to case ${event.caseId}. ` +
            `Actions: ${actionResults.actions.length}, Success: ${actionResults.allSuccessful}`,
        );
      } else {
        this.logger.debug(`No routing rules matched for case ${event.caseId}`);

        // Log no-match evaluation for audit trail
        // Find first active rule to log against (for audit record association)
        const firstActiveRule = await this.prisma.ruleDefinition.findFirst({
          where: {
            organizationId: event.organizationId,
            triggerEvent: "case.created",
            isActive: true,
          },
          orderBy: { priority: "asc" },
          select: { id: true },
        });

        if (firstActiveRule) {
          await this.rulesEngine.logExecution(
            event.organizationId,
            firstActiveRule.id,
            "CASE",
            event.caseId,
            result,
          );
        }
      }
    } catch (error) {
      // Log but don't throw - routing failure shouldn't block case creation
      this.logger.error(
        `Error evaluating routing rules for case ${event.caseId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Load additional case data needed for fact building.
   *
   * Fetches category, location, and other relevant fields
   * that rules may condition on.
   *
   * @param caseId - Case ID
   * @param organizationId - Organization ID (tenant isolation)
   * @returns Case data for fact building, or null if not found
   */
  private async loadCaseData(
    caseId: string,
    organizationId: string,
  ): Promise<CaseFactData | null> {
    const caseRecord = await this.prisma.case.findFirst({
      where: {
        id: caseId,
        organizationId,
      },
      select: {
        id: true,
        referenceNumber: true,
        severity: true,
        primaryCategoryId: true,
        secondaryCategoryId: true,
        sourceChannel: true,
        caseType: true,
        status: true,
        reporterType: true,
        locationName: true,
        locationCity: true,
        locationState: true,
        locationCountry: true,
        tags: true,
        primaryCategory: {
          select: {
            id: true,
            name: true,
            parentCategoryId: true,
          },
        },
        secondaryCategory: {
          select: {
            id: true,
            name: true,
            parentCategoryId: true,
          },
        },
      },
    });

    if (!caseRecord) return null;

    return {
      caseId: caseRecord.id,
      referenceNumber: caseRecord.referenceNumber,
      severity: caseRecord.severity,
      primaryCategoryId: caseRecord.primaryCategoryId,
      primaryCategoryName: caseRecord.primaryCategory?.name,
      parentCategoryId: caseRecord.primaryCategory?.parentCategoryId,
      secondaryCategoryId: caseRecord.secondaryCategoryId,
      secondaryCategoryName: caseRecord.secondaryCategory?.name,
      sourceChannel: caseRecord.sourceChannel,
      caseType: caseRecord.caseType,
      status: caseRecord.status,
      reporterType: caseRecord.reporterType,
      locationName: caseRecord.locationName,
      locationCity: caseRecord.locationCity,
      locationState: caseRecord.locationState,
      locationCountry: caseRecord.locationCountry,
      tags: caseRecord.tags,
    };
  }

  /**
   * Build facts object for rule evaluation.
   *
   * Creates both flat structure (for simple conditions) and nested
   * structure (for path-based conditions like case.severity).
   *
   * @param event - Original case.created event
   * @param caseData - Loaded case data
   * @returns Facts object for rule engine
   */
  private buildFacts(
    event: CaseCreatedEvent,
    caseData: CaseFactData,
  ): Record<string, unknown> {
    return {
      // Core case facts (flat for simple rule authoring)
      caseId: caseData.caseId,
      referenceNumber: caseData.referenceNumber,
      severity: caseData.severity,
      categoryId: caseData.primaryCategoryId,
      categoryName: caseData.primaryCategoryName,
      parentCategoryId: caseData.parentCategoryId,
      secondaryCategoryId: caseData.secondaryCategoryId,
      secondaryCategoryName: caseData.secondaryCategoryName,
      sourceChannel: caseData.sourceChannel,
      caseType: caseData.caseType,
      status: caseData.status,
      reporterType: caseData.reporterType,
      tags: caseData.tags,

      // Location facts (from case inline location fields)
      locationName: caseData.locationName,
      locationCity: caseData.locationCity,
      locationState: caseData.locationState,
      locationCountry: caseData.locationCountry,

      // Nested structure for path-based conditions
      case: {
        id: caseData.caseId,
        referenceNumber: caseData.referenceNumber,
        severity: caseData.severity,
        categoryId: caseData.primaryCategoryId,
        categoryName: caseData.primaryCategoryName,
        sourceChannel: caseData.sourceChannel,
        caseType: caseData.caseType,
        status: caseData.status,
        reporterType: caseData.reporterType,
        tags: caseData.tags,
      },
      category: {
        id: caseData.primaryCategoryId,
        name: caseData.primaryCategoryName,
        parentId: caseData.parentCategoryId,
      },
      location: {
        name: caseData.locationName,
        city: caseData.locationCity,
        state: caseData.locationState,
        country: caseData.locationCountry,
      },

      // Event metadata
      eventType: "case.created",
      organizationId: event.organizationId,
      timestamp: event.timestamp,
    };
  }
}

/**
 * Internal type for case data used in fact building.
 */
interface CaseFactData {
  caseId: string;
  referenceNumber: string;
  severity: string;
  primaryCategoryId: string | null;
  primaryCategoryName?: string;
  parentCategoryId?: string | null;
  secondaryCategoryId: string | null;
  secondaryCategoryName?: string;
  sourceChannel: string;
  caseType: string;
  status: string;
  reporterType: string;
  locationName: string | null;
  locationCity: string | null;
  locationState: string | null;
  locationCountry: string | null;
  tags: string[];
}
