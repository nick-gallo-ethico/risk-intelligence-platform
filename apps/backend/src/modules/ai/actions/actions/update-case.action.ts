import { z } from "zod";
import { Prisma, Severity } from "@prisma/client";
import {
  ActionDefinition,
  ActionCategory,
  ActionContext,
  UNDO_WINDOWS,
} from "../action.types";
import { PrismaService } from "../../../prisma/prisma.service";

export const updateCaseInputSchema = z.object({
  summary: z.string().optional().describe("New summary for the case"),
  severity: z
    .enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"])
    .optional()
    .describe("New severity/priority level: LOW, MEDIUM, HIGH, or CRITICAL"),
  tags: z.array(z.string()).optional().describe("Tags to set on the case"),
  reason: z.string().optional().describe("Reason for the update"),
});

export type UpdateCaseInput = z.infer<typeof updateCaseInputSchema>;

export function createUpdateCaseAction(
  prisma: PrismaService,
): ActionDefinition<UpdateCaseInput> {
  return {
    id: "update-case",
    name: "Update Case",
    description:
      "Update case fields such as summary, severity (priority), or tags.",
    category: ActionCategory.QUICK,
    entityTypes: ["case"],
    requiredPermissions: [],
    undoWindowSeconds: UNDO_WINDOWS.QUICK,
    inputSchema: updateCaseInputSchema,

    async canExecute(_input: UpdateCaseInput, context: ActionContext) {
      if (!context.permissions.includes("cases:update:status")) {
        return {
          allowed: false,
          reason: "Missing permission: cases:update:status",
        };
      }
      return { allowed: true };
    },

    async generatePreview(input: UpdateCaseInput, context: ActionContext) {
      const changes: Array<{
        field: string;
        oldValue: unknown;
        newValue: unknown;
      }> = [];

      const current = await prisma.case.findUnique({
        where: { id: context.entityId },
        select: {
          summary: true,
          severity: true,
          tags: true,
        },
      });

      if (input.summary !== undefined) {
        changes.push({
          field: "summary",
          oldValue: current?.summary || "(none)",
          newValue:
            input.summary.slice(0, 100) +
            (input.summary.length > 100 ? "..." : ""),
        });
      }
      if (input.severity !== undefined) {
        changes.push({
          field: "severity",
          oldValue: current?.severity || "(none)",
          newValue: input.severity,
        });
      }
      if (input.tags !== undefined) {
        changes.push({
          field: "tags",
          oldValue: current?.tags || [],
          newValue: input.tags,
        });
      }

      return {
        description: `Update case fields: ${changes.map((c) => c.field).join(", ")}`,
        changes,
      };
    },

    async execute(input: UpdateCaseInput, context: ActionContext) {
      // Fetch current state for undo
      const current = await prisma.case.findUnique({
        where: { id: context.entityId },
        select: {
          summary: true,
          severity: true,
          tags: true,
        },
      });

      if (!current) {
        return { success: false, message: "Case not found" };
      }

      // Build update data with proper Prisma types
      const updateData: {
        summary?: string;
        severity?: Severity;
        tags?: string[];
      } = {};
      const changedFields: string[] = [];

      if (input.summary !== undefined) {
        updateData.summary = input.summary;
        changedFields.push("summary");
      }
      if (input.severity !== undefined) {
        updateData.severity = input.severity as Severity;
        changedFields.push("severity");
      }
      if (input.tags !== undefined) {
        updateData.tags = input.tags;
        changedFields.push("tags");
      }

      if (changedFields.length === 0) {
        return { success: false, message: "No fields to update" };
      }

      // Update the case
      await prisma.case.update({
        where: { id: context.entityId },
        data: updateData,
      });

      // Get actor name
      const actor = await prisma.user.findUnique({
        where: { id: context.userId },
        select: { firstName: true, lastName: true },
      });
      const actorName = actor
        ? `${actor.firstName} ${actor.lastName}`
        : "AI Assistant";

      // Audit log
      await prisma.auditLog.create({
        data: {
          organizationId: context.organizationId,
          entityType: "CASE",
          entityId: context.entityId,
          action: "case_updated",
          actionCategory: "UPDATE",
          actionDescription: `${actorName} updated ${changedFields.join(", ")} via AI${input.reason ? `: ${input.reason}` : ""}`,
          actorUserId: context.userId,
          actorType: "AI",
          actorName: actorName,
          changes: {
            fields: changedFields,
            previous: {
              summary: current.summary,
              severity: current.severity,
              tags: current.tags,
            },
            updated: updateData,
          } as unknown as Prisma.InputJsonValue,
          context: {
            source: "ai_action",
            reason: input.reason,
          },
        },
      });

      return {
        success: true,
        message: `Updated ${changedFields.join(", ")}`,
        previousState: {
          summary: current.summary,
          severity: current.severity,
          tags: current.tags,
        },
        newState: updateData,
      };
    },

    async undo(
      _actionId: string,
      previousState: Record<string, unknown>,
      context: ActionContext,
    ) {
      await prisma.case.update({
        where: { id: context.entityId },
        data: {
          summary: previousState.summary as string | undefined,
          severity: previousState.severity as Severity | undefined,
          tags: previousState.tags as string[] | undefined,
        },
      });
    },
  };
}
