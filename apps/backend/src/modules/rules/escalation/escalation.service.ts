import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { RulesService } from "../rules.service";
import { EscalationTriggerEvent, EscalationFacts } from "./escalation.types";
import { CreateRuleDto } from "../dto/create-rule.dto";

/**
 * Valid escalation trigger events.
 */
const VALID_ESCALATION_TRIGGERS: EscalationTriggerEvent[] = [
  "sla.warning",
  "sla.breached",
  "sla.critical",
  "escalation.check",
];

/**
 * EscalationService provides CRUD operations for escalation rules.
 *
 * Escalation rules are stored as standard RuleDefinitions but with
 * trigger events specific to SLA monitoring (sla.warning, sla.breached, etc.).
 *
 * This service:
 * - Validates escalation-specific trigger events
 * - Delegates to RulesService for actual persistence
 * - Provides methods to build escalation facts from case data
 */
@Injectable()
export class EscalationService {
  private readonly logger = new Logger(EscalationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rulesService: RulesService,
  ) {}

  /**
   * Create an escalation rule.
   * Escalation rules are stored as RuleDefinitions with escalation trigger events.
   *
   * @param organizationId - Tenant ID
   * @param dto - Rule creation data (must have escalation trigger event)
   * @param userId - User creating the rule
   * @returns Created rule definition
   */
  async createEscalationRule(
    organizationId: string,
    dto: CreateRuleDto,
    userId: string,
  ) {
    // Validate trigger event is an escalation trigger
    if (
      !VALID_ESCALATION_TRIGGERS.includes(
        dto.triggerEvent as EscalationTriggerEvent,
      )
    ) {
      throw new BadRequestException(
        `Invalid escalation trigger: ${dto.triggerEvent}. Must be one of: ${VALID_ESCALATION_TRIGGERS.join(", ")}`,
      );
    }

    this.logger.log(
      `Creating escalation rule "${dto.name}" for trigger ${dto.triggerEvent}`,
    );

    return this.rulesService.create(dto, userId, organizationId);
  }

  /**
   * Get all escalation rules for an organization.
   *
   * @param organizationId - Tenant ID
   * @returns List of active escalation rules ordered by priority
   */
  async getEscalationRules(organizationId: string) {
    return this.prisma.ruleDefinition.findMany({
      where: {
        organizationId,
        triggerEvent: {
          in: VALID_ESCALATION_TRIGGERS,
        },
        isActive: true,
      },
      orderBy: { priority: "asc" },
    });
  }

  /**
   * Get escalation rules for a specific trigger event.
   *
   * @param organizationId - Tenant ID
   * @param triggerEvent - Specific escalation trigger
   * @returns List of active rules for this trigger
   */
  async getEscalationRulesForTrigger(
    organizationId: string,
    triggerEvent: EscalationTriggerEvent,
  ) {
    return this.prisma.ruleDefinition.findMany({
      where: {
        organizationId,
        triggerEvent,
        isActive: true,
      },
      orderBy: { priority: "asc" },
    });
  }

  /**
   * Build escalation facts from a case and SLA event.
   *
   * @param caseId - Case ID to build facts for
   * @param slaEventType - Type of SLA event (warning, breached, critical)
   * @param slaEventData - Additional SLA event data
   * @returns Escalation facts for rule evaluation
   */
  async buildEscalationFacts(
    caseId: string,
    slaEventType: "warning" | "breached" | "critical",
    slaEventData: { hoursRemaining?: number; hoursOverdue?: number },
  ): Promise<EscalationFacts> {
    const caseRecord = await this.prisma.case.findUniqueOrThrow({
      where: { id: caseId },
      include: {
        investigations: {
          select: { primaryInvestigatorId: true, createdAt: true },
          take: 1,
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const investigation = caseRecord.investigations[0];
    const isUnassigned = !investigation?.primaryInvestigatorId;

    // Calculate hours unassigned from case creation
    const hoursUnassigned = isUnassigned
      ? (Date.now() - new Date(caseRecord.createdAt).getTime()) /
        (1000 * 60 * 60)
      : 0;

    return {
      case: {
        id: caseRecord.id,
        referenceNumber: caseRecord.referenceNumber,
        severity: caseRecord.severity,
        categoryId: caseRecord.primaryCategoryId || undefined,
        status: caseRecord.status,
        createdAt: caseRecord.createdAt,
      },
      slaEvent: {
        type: slaEventType,
        hoursRemaining: slaEventData.hoursRemaining,
        hoursOverdue: slaEventData.hoursOverdue,
      },
      assignment: {
        isUnassigned,
        hoursUnassigned,
        currentAssigneeId: investigation?.primaryInvestigatorId || undefined,
      },
    };
  }

  /**
   * Check if a trigger event is a valid escalation trigger.
   *
   * @param triggerEvent - Event to check
   * @returns true if valid escalation trigger
   */
  isEscalationTrigger(triggerEvent: string): boolean {
    return VALID_ESCALATION_TRIGGERS.includes(
      triggerEvent as EscalationTriggerEvent,
    );
  }
}
