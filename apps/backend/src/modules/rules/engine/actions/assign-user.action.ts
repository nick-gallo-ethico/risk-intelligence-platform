import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CaseAssignedEvent } from "../../../events/events/case.events";
import type {
  RuleActionExecutor,
  ActionContext,
  ActionResult,
} from "./base.action";

/**
 * Action executor for assigning a case to a specific user.
 *
 * This action verifies the target user exists and is active in the same
 * organization, then updates the case assignment and emits a CaseAssignedEvent.
 *
 * Note: Currently Case model does not have assignedToId field.
 * This action executor is forward-compatible and will work once the
 * field is added to the schema. For now, it logs the intended action
 * and emits the event for downstream processing.
 */
@Injectable()
export class AssignUserAction implements RuleActionExecutor {
  readonly type = "assign_user";
  private readonly logger = new Logger(AssignUserAction.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    params: Record<string, unknown>,
    context: ActionContext,
  ): Promise<ActionResult> {
    const userId = params.userId as string;

    if (!userId) {
      return {
        success: false,
        actionType: this.type,
        details: {},
        error: "Missing userId parameter",
      };
    }

    try {
      // Verify user exists and is active in same org (tenant isolation)
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
          organizationId: context.organizationId,
          isActive: true,
        },
        select: { id: true, firstName: true, lastName: true },
      });

      if (!user) {
        return {
          success: false,
          actionType: this.type,
          details: { userId },
          error: "User not found or inactive in this organization",
        };
      }

      // Verify entity (case) exists
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
          details: { userId, entityId: context.entityId },
          error: "Case not found",
        };
      }

      // TODO: Case model doesn't have assignedToId field yet.
      // When the schema is updated to include assignedToId, uncomment this:
      //
      // await this.prisma.case.update({
      //   where: { id: context.entityId },
      //   data: { assignedToId: userId },
      // });

      // Emit assignment event for downstream processing
      // This allows other listeners to handle the assignment even if
      // the direct field update isn't available yet
      this.eventEmitter.emit(
        CaseAssignedEvent.eventName,
        new CaseAssignedEvent({
          organizationId: context.organizationId,
          caseId: context.entityId,
          previousAssigneeId: null, // No previous assignee tracked yet
          newAssigneeId: userId,
          actorUserId: null, // SYSTEM-triggered, not user-triggered
          actorType: "SYSTEM",
        }),
      );

      this.logger.log(
        `Rule-based assignment: Case ${currentCase.referenceNumber} -> User ${user.firstName} ${user.lastName} (rule: ${context.triggeredByRuleId})`,
      );

      return {
        success: true,
        actionType: this.type,
        details: {
          userId,
          userName: `${user.firstName} ${user.lastName}`,
          caseId: context.entityId,
          caseReferenceNumber: currentCase.referenceNumber,
          reason: `Rule-based assignment (rule: ${context.triggeredByRuleId})`,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to assign user: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        actionType: this.type,
        details: { userId },
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
