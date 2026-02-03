import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { ActionCatalog } from './action.catalog';
import {
  ActionContext,
  ActionPreview,
  ActionResult,
  ActionCategory,
} from './action.types';
import { Prisma } from '@prisma/client';

/**
 * Result from executing an action.
 */
export interface ExecutionResult {
  success: boolean;
  actionId: string;
  result?: ActionResult;
  error?: string;
  undoAvailable: boolean;
  undoExpiresAt?: Date;
}

/**
 * ActionExecutorService handles action preview, execution, and undo.
 *
 * Provides the execution layer for actions registered in ActionCatalog:
 * - Preview: Show what will change before execution
 * - Execute: Perform the action with database tracking and audit
 * - Undo: Reverse the action if within the undo window
 *
 * Undo windows per CONTEXT.md:
 * - Quick actions (30 seconds): add note, update field
 * - Standard actions (5 minutes): change assignment, change status
 * - Significant actions (30 minutes): close case/investigation
 * - Extended (24 hours): archive
 * - Non-undoable (0): sent emails, external API calls
 *
 * Actions are persisted to AiAction table for audit and undo support.
 *
 * Usage:
 * ```typescript
 * // Preview an action
 * const preview = await executor.preview('change-status', { newStatus: 'CLOSED' }, context);
 *
 * // Execute with tracking
 * const result = await executor.execute('change-status', { newStatus: 'CLOSED' }, context);
 *
 * // Undo within window
 * await executor.undo(result.actionId, context);
 * ```
 */
@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly actionCatalog: ActionCatalog,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Preview an action before execution.
   *
   * @param actionId - ID of the action to preview
   * @param input - Action input parameters
   * @param context - Execution context (org, user, entity)
   * @returns Preview of changes
   */
  async preview(
    actionId: string,
    input: unknown,
    context: ActionContext,
  ): Promise<ActionPreview> {
    const action = this.actionCatalog.getAction(actionId);
    if (!action) {
      throw new NotFoundException(`Action not found: ${actionId}`);
    }

    // Validate permissions
    this.validatePermissions(action.requiredPermissions, context.permissions);

    // Check entity type
    if (!action.entityTypes.includes(context.entityType)) {
      throw new ForbiddenException(
        `Action ${actionId} not available for ${context.entityType}`,
      );
    }

    // Validate input with Zod schema
    const validatedInput = action.inputSchema.parse(input);

    // Check canExecute if defined
    if (action.canExecute) {
      const canExecuteResult = await action.canExecute(validatedInput, context);
      if (!canExecuteResult.allowed) {
        throw new ForbiddenException(
          canExecuteResult.reason || 'Action not allowed',
        );
      }
    }

    // Generate preview
    return action.generatePreview(validatedInput, context);
  }

  /**
   * Execute an action with tracking and audit.
   *
   * @param actionId - ID of the action to execute
   * @param input - Action input parameters
   * @param context - Execution context (org, user, entity)
   * @param skipPreview - Skip preview requirement check for quick actions
   * @returns Execution result with action record ID
   */
  async execute(
    actionId: string,
    input: unknown,
    context: ActionContext,
    skipPreview = false,
  ): Promise<ExecutionResult> {
    const action = this.actionCatalog.getAction(actionId);
    if (!action) {
      throw new NotFoundException(`Action not found: ${actionId}`);
    }

    // Validate permissions
    this.validatePermissions(action.requiredPermissions, context.permissions);

    // Check entity type
    if (!action.entityTypes.includes(context.entityType)) {
      throw new ForbiddenException(
        `Action ${actionId} not available for ${context.entityType}`,
      );
    }

    // Validate input with Zod schema
    const validatedInput = action.inputSchema.parse(input);

    // Check if preview is required
    if (!skipPreview && this.actionCatalog.requiresPreview(actionId)) {
      // For standard+ actions, preview should be done first
      // This is a safety check - callers should call preview() first
      this.logger.debug(`Action ${actionId} normally requires preview`);
    }

    // Create action record in PENDING state
    const aiAction = await this.prisma.aiAction.create({
      data: {
        organizationId: context.organizationId,
        userId: context.userId,
        conversationId: context.conversationId,
        actionType: actionId,
        entityType: context.entityType,
        entityId: context.entityId,
        input: validatedInput as Prisma.JsonObject,
        status: 'EXECUTING',
        undoWindowSeconds: action.undoWindowSeconds,
        undoExpiresAt:
          action.undoWindowSeconds > 0
            ? new Date(Date.now() + action.undoWindowSeconds * 1000)
            : null,
        executedAt: new Date(),
      },
    });

    try {
      // Execute the action
      const result = await action.execute(validatedInput, context);

      if (result.success) {
        // Update action record with result
        await this.prisma.aiAction.update({
          where: { id: aiAction.id },
          data: {
            status: 'COMPLETED',
            result: result as unknown as Prisma.JsonObject,
            previousState: result.previousState as
              | Prisma.JsonObject
              | undefined,
            completedAt: new Date(),
          },
        });

        // Emit event for activity feed
        this.eventEmitter.emit('ai.action.completed', {
          actionId: aiAction.id,
          organizationId: context.organizationId,
          userId: context.userId,
          entityType: context.entityType,
          entityId: context.entityId,
          actionType: actionId,
        });

        return {
          success: true,
          actionId: aiAction.id,
          result,
          undoAvailable: action.undoWindowSeconds > 0,
          undoExpiresAt: aiAction.undoExpiresAt || undefined,
        };
      } else {
        await this.prisma.aiAction.update({
          where: { id: aiAction.id },
          data: {
            status: 'FAILED',
            error: result.message || 'Action failed',
          },
        });

        return {
          success: false,
          actionId: aiAction.id,
          error: result.message || 'Action failed',
          undoAvailable: false,
        };
      }
    } catch (error) {
      await this.prisma.aiAction.update({
        where: { id: aiAction.id },
        data: {
          status: 'FAILED',
          error: error.message,
        },
      });

      this.logger.error(`Action ${actionId} failed:`, error);

      return {
        success: false,
        actionId: aiAction.id,
        error: error.message,
        undoAvailable: false,
      };
    }
  }

  /**
   * Undo a previously executed action.
   *
   * @param actionRecordId - ID of the AiAction record to undo
   * @param context - Execution context (must match organization)
   */
  async undo(actionRecordId: string, context: ActionContext): Promise<void> {
    const aiAction = await this.prisma.aiAction.findFirst({
      where: {
        id: actionRecordId,
        organizationId: context.organizationId,
        status: 'COMPLETED',
      },
    });

    if (!aiAction) {
      throw new NotFoundException('Action not found or not completed');
    }

    // Check undo window
    if (!aiAction.undoExpiresAt || aiAction.undoExpiresAt < new Date()) {
      throw new ForbiddenException('Undo window has expired');
    }

    const action = this.actionCatalog.getAction(aiAction.actionType);
    if (!action || !action.undo) {
      throw new ForbiddenException('Action is not undoable');
    }

    // Execute undo
    await action.undo(
      actionRecordId,
      (aiAction.previousState as Record<string, unknown>) || {},
      {
        ...context,
        entityType: aiAction.entityType,
        entityId: aiAction.entityId,
      },
    );

    // Update action record
    await this.prisma.aiAction.update({
      where: { id: actionRecordId },
      data: {
        status: 'UNDONE',
        undoneAt: new Date(),
        undoneByUserId: context.userId,
      },
    });

    // Emit event
    this.eventEmitter.emit('ai.action.undone', {
      actionId: actionRecordId,
      organizationId: context.organizationId,
      userId: context.userId,
      entityType: aiAction.entityType,
      entityId: aiAction.entityId,
      actionType: aiAction.actionType,
    });
  }

  /**
   * Get action history for an entity.
   *
   * @param params - Filter parameters
   * @returns Array of action records with undo availability
   */
  async getActionHistory(params: {
    organizationId: string;
    entityType?: string;
    entityId?: string;
    limit?: number;
  }): Promise<
    Array<{
      id: string;
      actionType: string;
      status: string;
      createdAt: Date;
      undoAvailable: boolean;
    }>
  > {
    const actions = await this.prisma.aiAction.findMany({
      where: {
        organizationId: params.organizationId,
        ...(params.entityType && { entityType: params.entityType }),
        ...(params.entityId && { entityId: params.entityId }),
      },
      orderBy: { createdAt: 'desc' },
      take: params.limit || 50,
    });

    return actions.map((a) => ({
      id: a.id,
      actionType: a.actionType,
      status: a.status,
      createdAt: a.createdAt,
      undoAvailable:
        a.status === 'COMPLETED' &&
        a.undoExpiresAt !== null &&
        a.undoExpiresAt > new Date(),
    }));
  }

  /**
   * Check if a specific action can be undone.
   *
   * @param actionRecordId - ID of the AiAction record
   * @param context - Execution context
   * @returns Undo availability status
   */
  async canUndo(
    actionRecordId: string,
    context: ActionContext,
  ): Promise<{ canUndo: boolean; remainingSeconds?: number }> {
    const aiAction = await this.prisma.aiAction.findFirst({
      where: {
        id: actionRecordId,
        organizationId: context.organizationId,
        status: 'COMPLETED',
      },
    });

    if (!aiAction || !aiAction.undoExpiresAt) {
      return { canUndo: false };
    }

    const remainingMs = aiAction.undoExpiresAt.getTime() - Date.now();
    if (remainingMs <= 0) {
      return { canUndo: false };
    }

    return {
      canUndo: true,
      remainingSeconds: Math.floor(remainingMs / 1000),
    };
  }

  private validatePermissions(
    required: string[],
    userPermissions: string[],
  ): void {
    const missing = required.filter((p) => !userPermissions.includes(p));
    if (missing.length > 0) {
      throw new ForbiddenException(`Missing permissions: ${missing.join(', ')}`);
    }
  }
}
