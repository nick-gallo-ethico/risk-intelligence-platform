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
 * Action executor for round-robin team assignment.
 *
 * Distributes case assignments fairly across team members by tracking
 * the last assigned user per team and assigning to the next eligible
 * member in sequence.
 *
 * Team membership is determined by matching User email to Employee records
 * that have the specified teamId.
 *
 * Algorithm:
 * 1. Get all active users who are team members (via Employee.teamId + email match)
 * 2. Order by User.createdAt for consistent ordering
 * 3. Find last successful round_robin assignment for this team via RuleExecutionLog
 * 4. Parse the userId from that log's actionsTaken
 * 5. Assign to next user in sequence (wrapping around at end)
 *
 * Params:
 * - teamId (required): The team to distribute assignments across
 *
 * Note: Currently Case model does not have assignedToId/assignedTeamId fields.
 * This action executor is forward-compatible and will update the case once
 * those fields are added. For now, it emits CaseAssignedEvent for downstream
 * processing.
 */
@Injectable()
export class RoundRobinTeamAction implements RuleActionExecutor {
  readonly type = "round_robin";
  private readonly logger = new Logger(RoundRobinTeamAction.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

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

      // Get eligible team members: active users whose email matches
      // an Employee record with this teamId
      const eligibleMembers = await this.getEligibleTeamMembers(
        teamId,
        context.organizationId,
      );

      if (eligibleMembers.length === 0) {
        return {
          success: false,
          actionType: this.type,
          details: { teamId, teamName: team.name },
          error: "No eligible team members found",
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

      // Find next assignee in round-robin sequence
      const nextAssignee = await this.getNextAssignee(
        teamId,
        eligibleMembers,
        context.organizationId,
      );

      const memberIndex = eligibleMembers.findIndex(
        (m) => m.id === nextAssignee.id,
      );

      // TODO: Case model doesn't have assignedToId/assignedTeamId fields yet.
      // When the schema is updated, uncomment this:
      //
      // await this.prisma.case.update({
      //   where: { id: context.entityId },
      //   data: {
      //     assignedToId: nextAssignee.id,
      //     assignedTeamId: teamId,
      //   },
      // });

      // Emit assignment event for downstream processing
      this.eventEmitter.emit(
        CaseAssignedEvent.eventName,
        new CaseAssignedEvent({
          organizationId: context.organizationId,
          caseId: context.entityId,
          previousAssigneeId: null,
          newAssigneeId: nextAssignee.id,
          actorUserId: null,
          actorType: "SYSTEM",
        }),
      );

      this.logger.log(
        `Round-robin assignment: Case ${currentCase.referenceNumber} -> ` +
          `User ${nextAssignee.firstName} ${nextAssignee.lastName} ` +
          `(member ${memberIndex + 1}/${eligibleMembers.length} of team ${team.name}) ` +
          `(rule: ${context.triggeredByRuleId})`,
      );

      return {
        success: true,
        actionType: this.type,
        details: {
          teamId,
          teamName: team.name,
          teamCode: team.code,
          userId: nextAssignee.id,
          userName: `${nextAssignee.firstName} ${nextAssignee.lastName}`,
          memberIndex: memberIndex + 1,
          totalMembers: eligibleMembers.length,
          caseId: context.entityId,
          caseReferenceNumber: currentCase.referenceNumber,
          reason: `Round-robin assignment from team ${team.name} (rule: ${context.triggeredByRuleId})`,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to execute round-robin assignment: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        success: false,
        actionType: this.type,
        details: { teamId },
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get eligible team members as Users.
   * Membership is determined by matching User email to Employee records
   * with the specified teamId and active status.
   */
  private async getEligibleTeamMembers(
    teamId: string,
    organizationId: string,
  ): Promise<Array<{ id: string; firstName: string; lastName: string }>> {
    // Get employees in this team
    const teamEmployees = await this.prisma.employee.findMany({
      where: {
        organizationId,
        teamId,
        employmentStatus: "ACTIVE",
      },
      select: { email: true },
    });

    if (teamEmployees.length === 0) {
      return [];
    }

    const employeeEmails = teamEmployees.map((e) => e.email.toLowerCase());

    // Get active users whose email matches team employees
    // Order by createdAt for consistent round-robin ordering
    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        email: {
          in: employeeEmails,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return users;
  }

  /**
   * Get the next assignee in round-robin sequence.
   *
   * Looks up the last successful round_robin execution for this team
   * and returns the next member in sequence. If no prior execution
   * found, returns the first member.
   */
  private async getNextAssignee(
    teamId: string,
    eligibleMembers: Array<{
      id: string;
      firstName: string;
      lastName: string;
    }>,
    organizationId: string,
  ): Promise<{ id: string; firstName: string; lastName: string }> {
    // Find last successful round-robin assignment for this team
    const lastExecution = await this.prisma.ruleExecutionLog.findFirst({
      where: {
        organizationId,
        matched: true,
        actionsTaken: {
          path: ["$"],
          array_contains: [{ actionType: this.type, teamId }],
        },
      },
      orderBy: { executedAt: "desc" },
      select: { actionsTaken: true },
    });

    if (!lastExecution || !lastExecution.actionsTaken) {
      // No prior execution, start with first member
      return eligibleMembers[0];
    }

    // Parse the last assigned userId from actionsTaken
    const actionsTaken = lastExecution.actionsTaken as Array<{
      actionType: string;
      success: boolean;
      details: { userId?: string; teamId?: string };
    }>;

    const lastRoundRobinAction = actionsTaken.find(
      (a) =>
        a.actionType === this.type && a.success && a.details?.teamId === teamId,
    );

    if (!lastRoundRobinAction?.details?.userId) {
      // Can't determine last user, start with first
      return eligibleMembers[0];
    }

    const lastUserId = lastRoundRobinAction.details.userId;
    const lastUserIndex = eligibleMembers.findIndex((m) => m.id === lastUserId);

    if (lastUserIndex === -1) {
      // Last user no longer eligible (inactive or removed), start with first
      return eligibleMembers[0];
    }

    // Next member in sequence, wrapping around
    const nextIndex = (lastUserIndex + 1) % eligibleMembers.length;
    return eligibleMembers[nextIndex];
  }
}
