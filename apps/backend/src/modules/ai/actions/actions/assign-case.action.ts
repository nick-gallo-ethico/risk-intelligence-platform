import { z } from "zod";
import {
  ActionDefinition,
  ActionCategory,
  ActionContext,
  UNDO_WINDOWS,
} from "../action.types";
import { PrismaService } from "../../../prisma/prisma.service";

export const assignCaseInputSchema = z.object({
  assigneeEmail: z
    .string()
    .describe(
      "Email address of the user to assign the case to. Must be a user in the same organization.",
    ),
  reason: z.string().optional().describe("Optional reason for the assignment"),
});

export type AssignCaseInput = z.infer<typeof assignCaseInputSchema>;

export function createAssignCaseAction(
  prisma: PrismaService,
): ActionDefinition<AssignCaseInput> {
  return {
    id: "assign-case",
    name: "Assign Case",
    description:
      "Assign a case to a user by their email address. The user must be in the same organization.",
    category: ActionCategory.STANDARD,
    entityTypes: ["case"],
    requiredPermissions: [],
    undoWindowSeconds: UNDO_WINDOWS.STANDARD,
    inputSchema: assignCaseInputSchema,

    async canExecute(input: AssignCaseInput, context: ActionContext) {
      if (!context.permissions.includes("cases:update:status")) {
        return {
          allowed: false,
          reason: "Missing permission: cases:update:status",
        };
      }

      // Verify the target user exists in the same org
      const targetUser = await prisma.user.findFirst({
        where: {
          email: input.assigneeEmail,
          organizationId: context.organizationId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!targetUser) {
        return {
          allowed: false,
          reason: `User ${input.assigneeEmail} not found in this organization`,
        };
      }

      return { allowed: true };
    },

    async generatePreview(input: AssignCaseInput, context: ActionContext) {
      const currentCase = await prisma.case.findUnique({
        where: { id: context.entityId },
        select: {
          updatedBy: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      });

      return {
        description: `Assign case to ${input.assigneeEmail}`,
        changes: [
          {
            field: "assignee",
            oldValue: currentCase?.updatedBy?.email || "unassigned",
            newValue: input.assigneeEmail,
          },
        ],
      };
    },

    async execute(input: AssignCaseInput, context: ActionContext) {
      // Find the target user
      const targetUser = await prisma.user.findFirst({
        where: {
          email: input.assigneeEmail,
          organizationId: context.organizationId,
          isActive: true,
        },
        select: { id: true, firstName: true, lastName: true },
      });

      if (!targetUser) {
        return {
          success: false,
          message: `User ${input.assigneeEmail} not found`,
        };
      }

      // Get current assignee for undo
      const currentCase = await prisma.case.findUnique({
        where: { id: context.entityId },
        select: { updatedById: true },
      });

      const previousAssigneeId = currentCase?.updatedById;

      // Get actor name
      const actor = await prisma.user.findUnique({
        where: { id: context.userId },
        select: { firstName: true, lastName: true },
      });
      const actorName = actor
        ? `${actor.firstName} ${actor.lastName}`
        : "AI Assistant";
      const targetName = `${targetUser.firstName} ${targetUser.lastName}`;

      // Update the case - assign by updating updatedById
      // Also update status to OPEN if it's NEW (assignment implies work beginning)
      const updateData: Record<string, unknown> = {
        updatedById: targetUser.id,
      };

      await prisma.case.update({
        where: { id: context.entityId },
        data: updateData as { updatedById: string },
      });

      // Log to audit
      await prisma.auditLog.create({
        data: {
          organizationId: context.organizationId,
          entityType: "CASE",
          entityId: context.entityId,
          action: "case_assigned",
          actionCategory: "UPDATE",
          actionDescription: `${actorName} assigned case to ${targetName} via AI${input.reason ? `: ${input.reason}` : ""}`,
          actorUserId: context.userId,
          actorType: "AI",
          actorName: actorName,
          changes: {
            assignee: {
              from: previousAssigneeId,
              to: targetUser.id,
              toName: targetName,
            },
          },
          context: {
            source: "ai_action",
            reason: input.reason,
          },
        },
      });

      return {
        success: true,
        message: `Case assigned to ${targetName}`,
        previousState: { assigneeId: previousAssigneeId },
        newState: { assigneeId: targetUser.id, assigneeName: targetName },
      };
    },

    async undo(
      _actionId: string,
      previousState: Record<string, unknown>,
      context: ActionContext,
    ) {
      const previousAssigneeId = previousState.assigneeId as string | null;
      if (previousAssigneeId) {
        await prisma.case.update({
          where: { id: context.entityId },
          data: { updatedById: previousAssigneeId },
        });
      }
    },
  };
}
