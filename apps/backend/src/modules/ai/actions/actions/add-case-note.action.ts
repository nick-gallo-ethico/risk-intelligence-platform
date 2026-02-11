import { z } from "zod";
import {
  ActionDefinition,
  ActionCategory,
  ActionContext,
  UNDO_WINDOWS,
} from "../action.types";
import { PrismaService } from "../../../prisma/prisma.service";

/**
 * Input schema for add-case-note action.
 */
export const addCaseNoteInputSchema = z.object({
  content: z
    .string()
    .min(1)
    .max(50000)
    .describe("The note content to add to the case"),
  noteType: z
    .enum(["GENERAL", "FOLLOW_UP", "FINDING", "RECOMMENDATION"])
    .optional()
    .default("GENERAL")
    .describe("Type of note: GENERAL, FOLLOW_UP, FINDING, or RECOMMENDATION"),
});

export type AddCaseNoteInput = z.infer<typeof addCaseNoteInputSchema>;

/**
 * Factory function to create add-case-note action with Prisma dependency.
 * Called during ActionCatalog initialization.
 *
 * Unlike investigations which have InvestigationNote model, cases store notes
 * as AuditLog entries with actionCategory: CREATE and action: note_added.
 * This enables notes to appear in the Activity tab of the case detail page.
 *
 * @param prisma - PrismaService for database operations
 * @returns ActionDefinition for add-case-note
 */
export function createAddCaseNoteAction(
  prisma: PrismaService,
): ActionDefinition<AddCaseNoteInput> {
  return {
    id: "add-case-note",
    name: "Add Case Note",
    description: "Add a note to a case activity feed",
    category: ActionCategory.QUICK,
    entityTypes: ["case"],
    requiredPermissions: ["cases:notes:create"],
    undoWindowSeconds: UNDO_WINDOWS.QUICK,
    inputSchema: addCaseNoteInputSchema,

    async generatePreview(input: AddCaseNoteInput, context: ActionContext) {
      return {
        description: `Add a ${input.noteType.toLowerCase()} note to case`,
        changes: [
          {
            field: "activity",
            oldValue: null,
            newValue:
              input.content.slice(0, 100) +
              (input.content.length > 100 ? "..." : ""),
          },
        ],
      };
    },

    async execute(input: AddCaseNoteInput, context: ActionContext) {
      if (context.entityType !== "case") {
        return {
          success: false,
          message:
            "add-case-note only supports cases. Use add-note for investigations.",
        };
      }

      // Get user name for activity description
      const user = await prisma.user.findUnique({
        where: { id: context.userId },
        select: { firstName: true, lastName: true },
      });
      const userName = user
        ? `${user.firstName} ${user.lastName}`
        : "AI Assistant";

      // Log note as AuditLog entry with CREATE category
      // This will appear in the Activity tab of the case detail page
      const auditLog = await prisma.auditLog.create({
        data: {
          organizationId: context.organizationId,
          entityType: "CASE",
          entityId: context.entityId,
          action: "note_added",
          actionCategory: "CREATE",
          actionDescription: `${userName} added a ${input.noteType.toLowerCase()} note via AI: ${input.content.slice(0, 200)}${input.content.length > 200 ? "..." : ""}`,
          actorUserId: context.userId,
          actorType: "AI",
          actorName: userName,
          context: {
            noteType: input.noteType,
            source: "ai_action",
            fullContent: input.content,
          },
        },
      });

      return {
        success: true,
        message: `Note added to case`,
        previousState: { auditLogId: auditLog.id },
        newState: { auditLogId: auditLog.id, noteType: input.noteType },
      };
    },

    async undo(
      actionId: string,
      previousState: Record<string, unknown>,
      context: ActionContext,
    ) {
      const auditLogId = previousState.auditLogId as string;
      if (!auditLogId) {
        throw new Error("Cannot undo: auditLogId not found");
      }

      await prisma.auditLog.delete({
        where: { id: auditLogId },
      });
    },
  };
}

/**
 * Placeholder action for registration without Prisma.
 * Used by ActionCatalog - replaced with factory version at runtime.
 */
export const addCaseNoteAction: ActionDefinition<AddCaseNoteInput> = {
  id: "add-case-note",
  name: "Add Case Note",
  description: "Add a note to a case activity feed",
  category: ActionCategory.QUICK,
  entityTypes: ["case"],
  requiredPermissions: ["cases:notes:create"],
  undoWindowSeconds: UNDO_WINDOWS.QUICK,
  inputSchema: addCaseNoteInputSchema,

  async generatePreview(input: AddCaseNoteInput, context: ActionContext) {
    return {
      description: `Add a ${input.noteType.toLowerCase()} note to case`,
      changes: [
        {
          field: "activity",
          oldValue: null,
          newValue: input.content.slice(0, 100),
        },
      ],
    };
  },

  async execute() {
    return { success: false, message: "Not initialized" };
  },

  async undo() {
    throw new Error("Not initialized");
  },
};
