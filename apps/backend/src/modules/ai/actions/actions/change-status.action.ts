import { z } from "zod";
import {
  ActionDefinition,
  ActionCategory,
  ActionContext,
  UNDO_WINDOWS,
} from "../action.types";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * Input schema for change-status action.
 * newStatus must be one of the valid status values for the entity type.
 */
export const changeStatusInputSchema = z.object({
  newStatus: z
    .string()
    .describe(
      "The new status to set. For cases: NEW, OPEN, or CLOSED. For investigations: NEW, ASSIGNED, INVESTIGATING, PENDING_REVIEW, CLOSED, or ON_HOLD.",
    ),
  reason: z
    .string()
    .optional()
    .describe("Optional reason for the status change"),
});

export type ChangeStatusInput = z.infer<typeof changeStatusInputSchema>;

/**
 * Valid status transitions per entity type.
 * Defines the state machine for status changes.
 */
const STATUS_TRANSITIONS: Record<string, Record<string, string[]>> = {
  case: {
    NEW: ["OPEN", "CLOSED"],
    OPEN: ["NEW", "CLOSED"],
    CLOSED: ["OPEN"],
  },
  investigation: {
    NEW: ["ASSIGNED", "CLOSED", "ON_HOLD"],
    ASSIGNED: ["NEW", "INVESTIGATING", "CLOSED", "ON_HOLD"],
    INVESTIGATING: ["ASSIGNED", "PENDING_REVIEW", "CLOSED", "ON_HOLD"],
    PENDING_REVIEW: ["INVESTIGATING", "CLOSED", "ON_HOLD"],
    CLOSED: ["INVESTIGATING"],
    ON_HOLD: ["NEW", "ASSIGNED", "INVESTIGATING"],
  },
};

/**
 * Factory function to create change-status action with Prisma dependency.
 *
 * @param prisma - PrismaService for database operations
 * @returns ActionDefinition for change-status
 */
export function createChangeStatusAction(
  prisma: PrismaService,
): ActionDefinition<ChangeStatusInput> {
  return {
    id: "change-status",
    name: "Change Status",
    description: "Change the status of a case or investigation",
    category: ActionCategory.STANDARD,
    entityTypes: ["case", "investigation"],
    requiredPermissions: [],
    undoWindowSeconds: UNDO_WINDOWS.STANDARD,
    inputSchema: changeStatusInputSchema,

    async canExecute(input: ChangeStatusInput, context: ActionContext) {
      // Check entity-appropriate permission
      const requiredPerm =
        context.entityType === "case"
          ? "cases:update:status"
          : "investigations:update:status";
      if (!context.permissions.includes(requiredPerm)) {
        return {
          allowed: false,
          reason: `Missing permission: ${requiredPerm}`,
        };
      }

      // Fetch current status
      let currentStatus: string | null = null;

      if (context.entityType === "case") {
        const caseData = await prisma.case.findUnique({
          where: { id: context.entityId },
          select: { status: true },
        });
        currentStatus = caseData?.status || null;
      } else if (context.entityType === "investigation") {
        const investigation = await prisma.investigation.findUnique({
          where: { id: context.entityId },
          select: { status: true },
        });
        currentStatus = investigation?.status || null;
      }

      if (!currentStatus) {
        return { allowed: false, reason: "Entity not found" };
      }

      // Check valid transitions
      const transitions = STATUS_TRANSITIONS[context.entityType];
      const validNextStatuses = transitions?.[currentStatus] || [];

      if (!validNextStatuses.includes(input.newStatus)) {
        return {
          allowed: false,
          reason: `Cannot transition from ${currentStatus} to ${input.newStatus}. Valid transitions: ${validNextStatuses.join(", ") || "none"}`,
        };
      }

      return { allowed: true };
    },

    async generatePreview(input: ChangeStatusInput, context: ActionContext) {
      // Fetch current status for preview
      let currentStatus = "UNKNOWN";

      if (context.entityType === "case") {
        const caseData = await prisma.case.findUnique({
          where: { id: context.entityId },
          select: { status: true },
        });
        currentStatus = caseData?.status || "UNKNOWN";
      } else if (context.entityType === "investigation") {
        const investigation = await prisma.investigation.findUnique({
          where: { id: context.entityId },
          select: { status: true },
        });
        currentStatus = investigation?.status || "UNKNOWN";
      }

      const warnings: string[] = [];
      if (input.newStatus === "CLOSED") {
        warnings.push("Closing will send notifications to assigned users");
      }

      return {
        description: `Change ${context.entityType} status from ${currentStatus} to ${input.newStatus}`,
        changes: [
          {
            field: "status",
            oldValue: currentStatus,
            newValue: input.newStatus,
          },
        ],
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },

    async execute(input: ChangeStatusInput, context: ActionContext) {
      let previousStatus: string;

      // Get user name for activity description
      const user = await prisma.user.findUnique({
        where: { id: context.userId },
        select: { firstName: true, lastName: true },
      });
      const userName = user
        ? `${user.firstName} ${user.lastName}`
        : "AI Assistant";

      if (context.entityType === "case") {
        // Fetch current status
        const current = await prisma.case.findUnique({
          where: { id: context.entityId },
          select: { status: true },
        });
        previousStatus = current?.status || "UNKNOWN";

        // Update status using raw update since status is an enum
        await prisma.case.update({
          where: { id: context.entityId },
          data: {
            status: input.newStatus as "NEW" | "OPEN" | "CLOSED",
            statusRationale: input.reason,
          },
        });

        // Log to AuditLog for Activity feed visibility
        await prisma.auditLog.create({
          data: {
            organizationId: context.organizationId,
            entityType: "CASE",
            entityId: context.entityId,
            action: "status_changed",
            actionCategory: "UPDATE",
            actionDescription: `${userName} changed status from ${previousStatus} to ${input.newStatus} via AI${input.reason ? `: ${input.reason}` : ""}`,
            actorUserId: context.userId,
            actorType: "AI",
            actorName: userName,
            changes: {
              status: { from: previousStatus, to: input.newStatus },
            },
            context: {
              source: "ai_action",
              reason: input.reason,
            },
          },
        });
      } else if (context.entityType === "investigation") {
        // Fetch current status
        const current = await prisma.investigation.findUnique({
          where: { id: context.entityId },
          select: { status: true },
        });
        previousStatus = current?.status || "UNKNOWN";

        // Update status
        await prisma.investigation.update({
          where: { id: context.entityId },
          data: {
            status: input.newStatus as
              | "NEW"
              | "ASSIGNED"
              | "INVESTIGATING"
              | "PENDING_REVIEW"
              | "CLOSED"
              | "ON_HOLD",
            statusRationale: input.reason,
            statusChangedAt: new Date(),
          },
        });

        // Log to AuditLog for Activity feed visibility
        await prisma.auditLog.create({
          data: {
            organizationId: context.organizationId,
            entityType: "INVESTIGATION",
            entityId: context.entityId,
            action: "status_changed",
            actionCategory: "UPDATE",
            actionDescription: `${userName} changed status from ${previousStatus} to ${input.newStatus} via AI${input.reason ? `: ${input.reason}` : ""}`,
            actorUserId: context.userId,
            actorType: "AI",
            actorName: userName,
            changes: {
              status: { from: previousStatus, to: input.newStatus },
            },
            context: {
              source: "ai_action",
              reason: input.reason,
            },
          },
        });
      } else {
        return {
          success: false,
          message: `Unsupported entity type: ${context.entityType}`,
        };
      }

      return {
        success: true,
        message: `Status changed to ${input.newStatus}`,
        previousState: { status: previousStatus },
        newState: { status: input.newStatus },
      };
    },

    async undo(
      actionId: string,
      previousState: Record<string, unknown>,
      context: ActionContext,
    ) {
      const previousStatus = previousState.status as string;
      if (!previousStatus) {
        throw new Error("Cannot undo: previous status not found");
      }

      if (context.entityType === "case") {
        await prisma.case.update({
          where: { id: context.entityId },
          data: {
            status: previousStatus as "NEW" | "OPEN" | "CLOSED",
            statusRationale: "Undo: reverted to previous status",
          },
        });
      } else if (context.entityType === "investigation") {
        await prisma.investigation.update({
          where: { id: context.entityId },
          data: {
            status: previousStatus as
              | "NEW"
              | "ASSIGNED"
              | "INVESTIGATING"
              | "PENDING_REVIEW"
              | "CLOSED"
              | "ON_HOLD",
            statusRationale: "Undo: reverted to previous status",
            statusChangedAt: new Date(),
          },
        });
      }
    },
  };
}

/**
 * Placeholder action for registration without Prisma.
 * Used by ActionCatalog - replaced with factory version at runtime.
 */
export const changeStatusAction: ActionDefinition<ChangeStatusInput> = {
  id: "change-status",
  name: "Change Status",
  description: "Change the status of a case or investigation",
  category: ActionCategory.STANDARD,
  entityTypes: ["case", "investigation"],
  requiredPermissions: [],
  undoWindowSeconds: UNDO_WINDOWS.STANDARD,
  inputSchema: changeStatusInputSchema,

  async canExecute(input: ChangeStatusInput, context: ActionContext) {
    // Placeholder - real implementation uses factory
    return { allowed: true };
  },

  async generatePreview(input: ChangeStatusInput, context: ActionContext) {
    return {
      description: `Change ${context.entityType} status to ${input.newStatus}`,
      changes: [
        {
          field: "status",
          oldValue: "CURRENT",
          newValue: input.newStatus,
        },
      ],
    };
  },

  async execute(input: ChangeStatusInput, context: ActionContext) {
    // Placeholder - real implementation uses factory
    return {
      success: false,
      message: "Action not properly initialized - use factory function",
    };
  },

  async undo(
    actionId: string,
    previousState: Record<string, unknown>,
    context: ActionContext,
  ) {
    // Placeholder - real implementation uses factory
    throw new Error("Action not properly initialized - use factory function");
  },
};
