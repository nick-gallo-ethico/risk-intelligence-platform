import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { ActionCatalog } from "./action.catalog";
import {
  ActionContext,
  ActionPreview,
  ActionResult,
  ActionCategory,
} from "./action.types";

/**
 * Stored undo information for an executed action.
 */
interface UndoRecord {
  actionId: string;
  previousState: Record<string, unknown>;
  executedAt: Date;
  undoWindowSeconds: number;
}

/**
 * ActionExecutorService handles action preview, execution, and undo.
 *
 * Provides the execution layer for actions registered in ActionCatalog:
 * - Preview: Show what will change before execution
 * - Execute: Perform the action with audit logging
 * - Undo: Reverse the action if supported and within window
 *
 * Undo windows per CONTEXT.md:
 * - Quick actions (30 seconds): add note, update field
 * - Standard actions (5 minutes): change assignment, change status
 * - Significant actions (30 minutes): close case/investigation
 * - Extended (24 hours): archive
 * - Non-undoable: sent emails, external API calls
 *
 * Usage:
 * ```typescript
 * // Preview an action
 * const preview = await executor.preview('assign-case', { assigneeId: 'user-123' }, context);
 *
 * // Execute with preview confirmation
 * const result = await executor.execute('assign-case', { assigneeId: 'user-123' }, context);
 *
 * // Skip preview for quick actions
 * const result = await executor.execute('add-note', input, context, true);
 *
 * // Undo an action (must be within window)
 * await executor.undo('assign-case', context);
 * ```
 */
@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  /** Track executed actions per entity for undo */
  private readonly undoRecords = new Map<string, UndoRecord>();

  constructor(
    private readonly catalog: ActionCatalog,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Preview an action without executing it.
   *
   * @param actionId - Action to preview
   * @param input - Action input
   * @param context - Execution context
   * @returns Preview showing what will change
   */
  async preview(
    actionId: string,
    input: Record<string, unknown>,
    context: ActionContext,
  ): Promise<ActionPreview> {
    const action = this.catalog.getAction(actionId);
    if (!action) {
      throw new NotFoundException(`Action not found: ${actionId}`);
    }

    // Check permissions
    const hasPermission = action.requiredPermissions.every((p) =>
      context.permissions.includes(p),
    );
    if (!hasPermission) {
      throw new BadRequestException(
        "Insufficient permissions for this action",
      );
    }

    // Check entity type
    if (!action.entityTypes.includes(context.entityType)) {
      throw new BadRequestException(
        `Action not available for entity type: ${context.entityType}`,
      );
    }

    // Validate input
    const parseResult = action.inputSchema.safeParse(input);
    if (!parseResult.success) {
      throw new BadRequestException(
        `Invalid input: ${parseResult.error.message}`,
      );
    }

    // Check additional execution constraints
    if (action.canExecute) {
      const canExecuteResult = await action.canExecute(
        parseResult.data,
        context,
      );
      if (!canExecuteResult.allowed) {
        throw new BadRequestException(
          canExecuteResult.reason || "Action not allowed",
        );
      }
    }

    try {
      const preview = await action.generatePreview(parseResult.data, context);
      this.logger.debug(
        `Previewed action ${actionId} for ${context.entityType}:${context.entityId}`,
      );
      return preview;
    } catch (error) {
      this.logger.error(`Preview failed for ${actionId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute an action.
   *
   * @param actionId - Action to execute
   * @param input - Action input
   * @param context - Execution context
   * @param skipPreview - If true, skip preview requirement check
   * @returns Action result
   */
  async execute(
    actionId: string,
    input: Record<string, unknown>,
    context: ActionContext,
    skipPreview = false,
  ): Promise<ActionResult> {
    const action = this.catalog.getAction(actionId);
    if (!action) {
      throw new NotFoundException(`Action not found: ${actionId}`);
    }

    // Check permissions
    const hasPermission = action.requiredPermissions.every((p) =>
      context.permissions.includes(p),
    );
    if (!hasPermission) {
      throw new BadRequestException(
        "Insufficient permissions for this action",
      );
    }

    // Check entity type
    if (!action.entityTypes.includes(context.entityType)) {
      throw new BadRequestException(
        `Action not available for entity type: ${context.entityType}`,
      );
    }

    // Validate input
    const parseResult = action.inputSchema.safeParse(input);
    if (!parseResult.success) {
      throw new BadRequestException(
        `Invalid input: ${parseResult.error.message}`,
      );
    }

    // Require preview for critical/external actions
    if (
      !skipPreview &&
      (action.category === ActionCategory.CRITICAL ||
        action.category === ActionCategory.EXTERNAL)
    ) {
      throw new BadRequestException(
        "This action requires preview before execution. Set skipPreview=true to skip.",
      );
    }

    // Check additional execution constraints
    if (action.canExecute) {
      const canExecuteResult = await action.canExecute(
        parseResult.data,
        context,
      );
      if (!canExecuteResult.allowed) {
        throw new BadRequestException(
          canExecuteResult.reason || "Action not allowed",
        );
      }
    }

    try {
      const result = await action.execute(parseResult.data, context);

      // Store undo info if action is undoable
      if (action.undoWindowSeconds > 0 && result.success && result.previousState) {
        const entityKey = `${context.entityType}:${context.entityId}:${actionId}`;
        this.undoRecords.set(entityKey, {
          actionId,
          previousState: result.previousState,
          executedAt: new Date(),
          undoWindowSeconds: action.undoWindowSeconds,
        });

        // Schedule cleanup after undo window expires
        setTimeout(() => {
          this.undoRecords.delete(entityKey);
        }, action.undoWindowSeconds * 1000);
      }

      this.logger.log(
        `Executed action ${actionId} for ${context.entityType}:${context.entityId} - success=${result.success}`,
      );

      return result;
    } catch (error) {
      this.logger.error(`Execution failed for ${actionId}: ${error.message}`);
      return {
        success: false,
        message: error.message || "Action execution failed",
      };
    }
  }

  /**
   * Undo the last action on an entity.
   *
   * @param actionId - Action to undo
   * @param context - Execution context (must match entity)
   * @returns void on success
   */
  async undo(actionId: string, context: ActionContext): Promise<void> {
    const action = this.catalog.getAction(actionId);
    if (!action) {
      throw new NotFoundException(`Action not found: ${actionId}`);
    }

    if (action.undoWindowSeconds === 0 || !action.undo) {
      throw new BadRequestException("This action cannot be undone");
    }

    const entityKey = `${context.entityType}:${context.entityId}:${actionId}`;
    const undoRecord = this.undoRecords.get(entityKey);

    if (!undoRecord) {
      throw new BadRequestException(
        "Cannot undo: no record of this action or undo window expired",
      );
    }

    // Check if still within undo window
    const elapsedSeconds =
      (Date.now() - undoRecord.executedAt.getTime()) / 1000;
    if (elapsedSeconds > undoRecord.undoWindowSeconds) {
      this.undoRecords.delete(entityKey);
      throw new BadRequestException(
        `Cannot undo: the undo window has expired (${undoRecord.undoWindowSeconds} seconds)`,
      );
    }

    try {
      await action.undo(actionId, undoRecord.previousState, context);

      // Clear undo record
      this.undoRecords.delete(entityKey);

      this.logger.log(
        `Undid action ${actionId} for ${context.entityType}:${context.entityId}`,
      );
    } catch (error) {
      this.logger.error(`Undo failed for ${actionId}: ${error.message}`);
      throw new BadRequestException(error.message || "Undo failed");
    }
  }

  /**
   * Check if an action can be undone for an entity.
   *
   * @param actionId - Action to check
   * @param context - Entity context
   * @returns object with canUndo flag and remaining seconds
   */
  canUndo(
    actionId: string,
    context: ActionContext,
  ): { canUndo: boolean; remainingSeconds?: number } {
    const entityKey = `${context.entityType}:${context.entityId}:${actionId}`;
    const undoRecord = this.undoRecords.get(entityKey);

    if (!undoRecord) {
      return { canUndo: false };
    }

    const elapsedSeconds =
      (Date.now() - undoRecord.executedAt.getTime()) / 1000;
    const remainingSeconds = Math.max(
      0,
      undoRecord.undoWindowSeconds - elapsedSeconds,
    );

    if (remainingSeconds <= 0) {
      this.undoRecords.delete(entityKey);
      return { canUndo: false };
    }

    return { canUndo: true, remainingSeconds: Math.floor(remainingSeconds) };
  }

  /**
   * Get info about undoable actions for an entity.
   * Useful for showing undo buttons in UI.
   *
   * @param context - Entity context
   * @returns List of undoable actions with remaining time
   */
  getUndoableActions(
    context: ActionContext,
  ): Array<{
    actionId: string;
    executedAt: Date;
    remainingSeconds: number;
  }> {
    const prefix = `${context.entityType}:${context.entityId}:`;
    const result: Array<{
      actionId: string;
      executedAt: Date;
      remainingSeconds: number;
    }> = [];

    for (const [key, record] of this.undoRecords.entries()) {
      if (key.startsWith(prefix)) {
        const elapsedSeconds =
          (Date.now() - record.executedAt.getTime()) / 1000;
        const remainingSeconds = Math.max(
          0,
          record.undoWindowSeconds - elapsedSeconds,
        );

        if (remainingSeconds > 0) {
          result.push({
            actionId: record.actionId,
            executedAt: record.executedAt,
            remainingSeconds: Math.floor(remainingSeconds),
          });
        }
      }
    }

    return result;
  }
}
