import { z } from 'zod';

/**
 * Action categories determine preview requirements and undo windows.
 * Per CONTEXT.md action handling decisions.
 */
export enum ActionCategory {
  QUICK = 'quick', // No preview needed, has undo (add note, change field)
  STANDARD = 'standard', // Preview recommended, has undo (change status, assign)
  CRITICAL = 'critical', // Preview required, limited undo (close, merge)
  EXTERNAL = 'external', // Preview required, no undo (send email, API call)
}

/**
 * Context provided to actions for permission validation and entity access.
 */
export interface ActionContext {
  organizationId: string;
  userId: string;
  userRole: string;
  permissions: string[];
  entityType: string;
  entityId: string;
  conversationId?: string;
}

/**
 * Preview of changes an action will make, shown to user before execution.
 */
export interface ActionPreview {
  description: string;
  changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  warnings?: string[];
  estimatedDuration?: string;
}

/**
 * Result of action execution, includes previous state for undo.
 */
export interface ActionResult {
  success: boolean;
  message?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
}

/**
 * ActionDefinition describes an action that can be executed by the AI.
 * Actions are mutations with permission validation, preview capability, and undo support.
 */
export interface ActionDefinition<TInput = unknown> {
  id: string;
  name: string;
  description: string;
  category: ActionCategory;
  entityTypes: string[];
  requiredPermissions: string[];
  undoWindowSeconds: number; // 0 = non-undoable

  inputSchema: z.ZodType<TInput>;

  // Validation - additional checks beyond permissions
  canExecute?: (
    input: TInput,
    context: ActionContext,
  ) => Promise<{ allowed: boolean; reason?: string }>;

  // Preview generation (for standard and critical)
  generatePreview: (
    input: TInput,
    context: ActionContext,
  ) => Promise<ActionPreview>;

  // Execution
  execute: (input: TInput, context: ActionContext) => Promise<ActionResult>;

  // Undo (if undoWindowSeconds > 0)
  undo?: (
    actionId: string,
    previousState: Record<string, unknown>,
    context: ActionContext,
  ) => Promise<void>;
}

/**
 * Undo windows per CONTEXT.md undo system decisions.
 * - Quick actions (add note, update field): 30 seconds
 * - Standard actions (change assignment, status): 5 minutes
 * - Significant actions (close case/investigation): 30 minutes
 * - Extended (archive): 24 hours
 * - Non-undoable (sent emails, external API): 0
 */
export const UNDO_WINDOWS = {
  QUICK: 30, // 30 seconds for add note, update field
  STANDARD: 300, // 5 minutes for change assignment, change status
  SIGNIFICANT: 1800, // 30 minutes for close case, close investigation
  EXTENDED: 86400, // 24 hours for archive
  NONE: 0, // Non-undoable for sent emails, external API calls
};
