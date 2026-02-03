import { z } from 'zod';
import {
  ActionDefinition,
  ActionCategory,
  ActionContext,
  UNDO_WINDOWS,
} from '../action.types';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * Input schema for add-note action.
 */
export const addNoteInputSchema = z.object({
  content: z.string().min(1).max(50000),
  noteType: z
    .enum(['GENERAL', 'INTERVIEW', 'EVIDENCE', 'FINDING', 'RECOMMENDATION', 'FOLLOW_UP'])
    .optional()
    .default('GENERAL'),
});

export type AddNoteInput = z.infer<typeof addNoteInputSchema>;

/**
 * Factory function to create add-note action with Prisma dependency.
 * Called during ActionCatalog initialization.
 *
 * Currently supports investigation notes only.
 * CaseNote support will be added when that model is created.
 *
 * @param prisma - PrismaService for database operations
 * @returns ActionDefinition for add-note
 */
export function createAddNoteAction(
  prisma: PrismaService,
): ActionDefinition<AddNoteInput> {
  return {
    id: 'add-note',
    name: 'Add Note',
    description: 'Add a note to an investigation',
    category: ActionCategory.QUICK,
    entityTypes: ['investigation'],
    requiredPermissions: ['investigations:notes:create'],
    undoWindowSeconds: UNDO_WINDOWS.QUICK,
    inputSchema: addNoteInputSchema,

    async generatePreview(input: AddNoteInput, context: ActionContext) {
      return {
        description: `Add a ${input.noteType.toLowerCase()} note to ${context.entityType} ${context.entityId}`,
        changes: [
          {
            field: 'notes',
            oldValue: null,
            newValue:
              input.content.slice(0, 100) +
              (input.content.length > 100 ? '...' : ''),
          },
        ],
      };
    },

    async execute(input: AddNoteInput, context: ActionContext) {
      if (context.entityType !== 'investigation') {
        return {
          success: false,
          message: `Unsupported entity type: ${context.entityType}. Only investigations are supported.`,
        };
      }

      // Fetch user name for denormalized author field
      const user = await prisma.user.findUnique({
        where: { id: context.userId },
        select: { firstName: true, lastName: true },
      });

      const authorName = user
        ? `${user.firstName} ${user.lastName}`
        : 'Unknown User';

      const note = await prisma.investigationNote.create({
        data: {
          investigationId: context.entityId,
          organizationId: context.organizationId,
          content: input.content,
          noteType: input.noteType,
          authorId: context.userId,
          authorName,
        },
      });

      return {
        success: true,
        message: `Note added to investigation`,
        previousState: { noteId: note.id },
        newState: { noteId: note.id, noteType: input.noteType },
      };
    },

    async undo(
      actionId: string,
      previousState: Record<string, unknown>,
      context: ActionContext,
    ) {
      const noteId = previousState.noteId as string;
      if (!noteId) {
        throw new Error('Cannot undo: noteId not found in previous state');
      }

      await prisma.investigationNote.delete({
        where: { id: noteId },
      });
    },
  };
}

/**
 * Placeholder action for registration without Prisma.
 * Used by ActionCatalog - replaced with factory version at runtime.
 */
export const addNoteAction: ActionDefinition<AddNoteInput> = {
  id: 'add-note',
  name: 'Add Note',
  description: 'Add a note to an investigation',
  category: ActionCategory.QUICK,
  entityTypes: ['investigation'],
  requiredPermissions: ['investigations:notes:create'],
  undoWindowSeconds: UNDO_WINDOWS.QUICK,
  inputSchema: addNoteInputSchema,

  async generatePreview(input: AddNoteInput, context: ActionContext) {
    return {
      description: `Add a ${input.noteType.toLowerCase()} note to ${context.entityType} ${context.entityId}`,
      changes: [
        {
          field: 'notes',
          oldValue: null,
          newValue:
            input.content.slice(0, 100) +
            (input.content.length > 100 ? '...' : ''),
        },
      ],
    };
  },

  async execute(input: AddNoteInput, context: ActionContext) {
    // Placeholder - real implementation uses factory with injected Prisma
    return {
      success: false,
      message: 'Action not properly initialized - use factory function',
    };
  },

  async undo(
    actionId: string,
    previousState: Record<string, unknown>,
    context: ActionContext,
  ) {
    // Placeholder - real implementation uses factory with injected Prisma
    throw new Error('Action not properly initialized - use factory function');
  },
};
