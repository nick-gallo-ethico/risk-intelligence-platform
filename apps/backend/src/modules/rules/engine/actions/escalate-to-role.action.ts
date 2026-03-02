import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PrismaService } from "../../../prisma/prisma.service";
import type {
  RuleActionExecutor,
  ActionContext,
  ActionResult,
} from "./base.action";
import type { EscalateToRoleParams } from "../../escalation/escalation.types";

/**
 * Event emitted when a case is escalated.
 * Other listeners can react to this event to send notifications,
 * update dashboards, etc.
 */
export class CaseEscalatedEvent {
  static readonly eventName = "case.escalated";

  /** Organization ID for tenant scoping */
  organizationId: string;
  /** Case that was escalated */
  caseId: string;
  /** Case reference number for display */
  referenceNumber: string;
  /** User ID of the escalation target */
  escalatedToUserId: string;
  /** Email of the escalation target */
  escalatedToEmail: string;
  /** Role of the escalation target */
  escalatedToRole: string;
  /** User ID of the original assignee (if any) */
  escalatedFromUserId?: string;
  /** Reason for escalation */
  reason: string;
  /** Rule ID that triggered the escalation */
  ruleId?: string;

  constructor(data: Partial<CaseEscalatedEvent>) {
    Object.assign(this, data);
  }
}

/**
 * Action executor for escalating a case to a user with a specific role.
 *
 * This action:
 * 1. Finds an active user with the specified role in the organization
 * 2. Gets the current assignee (if notifyOriginalAssignee is true)
 * 3. Emits a case.escalated event for downstream processing
 *
 * Note: This action emits an event rather than directly updating the case,
 * as the Case model doesn't have an escalatedTo field. Downstream listeners
 * handle notifications and any other side effects.
 */
@Injectable()
export class EscalateToRoleAction implements RuleActionExecutor {
  readonly type = "escalate_to_role";

  private readonly logger = new Logger(EscalateToRoleAction.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    params: Record<string, unknown>,
    context: ActionContext,
  ): Promise<ActionResult> {
    const role = params.role as string | undefined;
    const notifyOriginalAssignee = params.notifyOriginalAssignee as
      | boolean
      | undefined;

    if (!role) {
      return {
        success: false,
        actionType: this.type,
        details: {},
        error: "Missing role parameter",
      };
    }

    try {
      // Find an active user with the specified role in the org
      const targetUser = await this.prisma.user.findFirst({
        where: {
          organizationId: context.organizationId,
          role: role as any, // Role enum value
          isActive: true,
        },
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      if (!targetUser) {
        this.logger.warn(
          `No active user found with role ${role} in org ${context.organizationId}`,
        );
        return {
          success: false,
          actionType: this.type,
          details: { role },
          error: `No active user found with role ${role}`,
        };
      }

      // Get case reference number for logging/notifications
      const currentCase = await this.prisma.case.findFirst({
        where: {
          id: context.entityId,
          organizationId: context.organizationId,
        },
        select: { id: true, referenceNumber: true },
      });

      if (!currentCase) {
        return {
          success: false,
          actionType: this.type,
          details: { role, entityId: context.entityId },
          error: "Case not found",
        };
      }

      // Get current assignee if needed for notification
      let currentAssigneeId: string | undefined;
      if (notifyOriginalAssignee) {
        const investigation = await this.prisma.investigation.findFirst({
          where: {
            caseId: context.entityId,
            organizationId: context.organizationId,
          },
          select: { primaryInvestigatorId: true },
          orderBy: { createdAt: "asc" },
        });
        currentAssigneeId = investigation?.primaryInvestigatorId || undefined;
      }

      // Emit escalation event for downstream processing
      this.eventEmitter.emit(
        CaseEscalatedEvent.eventName,
        new CaseEscalatedEvent({
          organizationId: context.organizationId,
          caseId: context.entityId,
          referenceNumber: currentCase.referenceNumber,
          escalatedToUserId: targetUser.id,
          escalatedToEmail: targetUser.email,
          escalatedToRole: role,
          escalatedFromUserId: currentAssigneeId,
          reason: `Escalated by rule: ${context.triggeredByRuleId}`,
          ruleId: context.triggeredByRuleId,
        }),
      );

      const targetName =
        `${targetUser.firstName} ${targetUser.lastName}`.trim();
      this.logger.log(
        `Escalated case ${currentCase.referenceNumber} to ${targetName} (${targetUser.email}, role: ${role}) via rule ${context.triggeredByRuleId}`,
      );

      return {
        success: true,
        actionType: this.type,
        details: {
          escalatedTo: targetUser.id,
          escalatedToEmail: targetUser.email,
          escalatedToName: targetName,
          role,
          caseId: context.entityId,
          caseReferenceNumber: currentCase.referenceNumber,
          previousAssigneeId: currentAssigneeId,
          reason: `Rule-based escalation (rule: ${context.triggeredByRuleId})`,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to escalate to role: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        actionType: this.type,
        details: { role },
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
