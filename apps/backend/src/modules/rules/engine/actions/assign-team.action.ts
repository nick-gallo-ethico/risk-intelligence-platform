import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import type {
  RuleActionExecutor,
  ActionContext,
  ActionResult,
} from "./base.action";

/**
 * Action executor for assigning a case to a team queue.
 *
 * This action verifies the target team exists in the same organization,
 * then marks the case as assigned to that team. Individual user assignment
 * from the team would be handled by separate round-robin or claim logic.
 *
 * Note: Currently Case model does not have assignedTeamId field.
 * This action executor is forward-compatible and will work once the
 * field is added to the schema. For now, it logs the intended action.
 */
@Injectable()
export class AssignTeamAction implements RuleActionExecutor {
  readonly type = "assign_team";
  private readonly logger = new Logger(AssignTeamAction.name);

  constructor(private readonly prisma: PrismaService) {}

  async execute(
    params: Record<string, unknown>,
    context: ActionContext,
  ): Promise<ActionResult> {
    const teamId = params.teamId as string;

    if (!teamId) {
      return {
        success: false,
        actionType: this.type,
        details: {},
        error: "Missing teamId parameter",
      };
    }

    try {
      // Verify team exists in same org (tenant isolation)
      const team = await this.prisma.team.findFirst({
        where: {
          id: teamId,
          organizationId: context.organizationId,
        },
        select: { id: true, name: true, code: true },
      });

      if (!team) {
        return {
          success: false,
          actionType: this.type,
          details: { teamId },
          error: "Team not found in this organization",
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
          details: { teamId, entityId: context.entityId },
          error: "Case not found",
        };
      }

      // TODO: Case model doesn't have assignedTeamId field yet.
      // When the schema is updated to include assignedTeamId, uncomment this:
      //
      // await this.prisma.case.update({
      //   where: { id: context.entityId },
      //   data: { assignedTeamId: teamId },
      // });

      this.logger.log(
        `Rule-based team assignment: Case ${currentCase.referenceNumber} -> Team ${team.name} (${team.code}) (rule: ${context.triggeredByRuleId})`,
      );

      return {
        success: true,
        actionType: this.type,
        details: {
          teamId,
          teamName: team.name,
          teamCode: team.code,
          caseId: context.entityId,
          caseReferenceNumber: currentCase.referenceNumber,
          reason: `Rule-based team assignment (rule: ${context.triggeredByRuleId})`,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to assign team: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        actionType: this.type,
        details: { teamId },
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
