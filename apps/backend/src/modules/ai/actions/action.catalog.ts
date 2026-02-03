import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ActionDefinition, ActionCategory } from './action.types';
import { createAddNoteAction } from './actions/add-note.action';
import { createChangeStatusAction } from './actions/change-status.action';

/**
 * ActionCatalog manages the registry of available actions.
 *
 * Actions are mutations with permission validation, preview capability, and undo support.
 * The catalog provides:
 * - Action registration at module initialization
 * - Permission-based filtering for available actions
 * - Entity-type filtering
 * - Category-based preview requirements
 *
 * Built-in actions are registered via factory functions that receive PrismaService.
 *
 * Usage:
 * ```typescript
 * // Get actions for an entity
 * const actions = catalog.getAvailableActions({
 *   entityType: 'case',
 *   userPermissions: ['cases:update', 'notes:create'],
 * });
 *
 * // Check if action requires preview
 * const needsPreview = catalog.requiresPreview('change-status');
 * ```
 */
@Injectable()
export class ActionCatalog implements OnModuleInit {
  private readonly logger = new Logger(ActionCatalog.name);
  private readonly actions = new Map<string, ActionDefinition>();

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Register built-in actions with Prisma dependency
    this.registerAction(createAddNoteAction(this.prisma));
    this.registerAction(createChangeStatusAction(this.prisma));

    this.logger.log(
      `ActionCatalog initialized with ${this.actions.size} actions`,
    );
  }

  /**
   * Register an action.
   *
   * @param action - Action definition to register
   */
  registerAction(action: ActionDefinition): void {
    if (this.actions.has(action.id)) {
      this.logger.warn(`Overwriting action: ${action.id}`);
    }
    this.actions.set(action.id, action);
    this.logger.debug(`Registered action: ${action.id}`);
  }

  /**
   * Get an action by ID.
   *
   * @param id - Action identifier
   * @returns Action definition or undefined if not found
   */
  getAction(id: string): ActionDefinition | undefined {
    return this.actions.get(id);
  }

  /**
   * Get available actions for an entity type and user permissions.
   *
   * @param params - Filter parameters
   * @returns Array of available action definitions
   */
  getAvailableActions(params: {
    entityType: string;
    userPermissions: string[];
    category?: ActionCategory;
  }): ActionDefinition[] {
    return Array.from(this.actions.values()).filter((action) => {
      // Check entity type
      if (!action.entityTypes.includes(params.entityType)) {
        return false;
      }

      // Check category filter
      if (params.category && action.category !== params.category) {
        return false;
      }

      // Check permissions
      return action.requiredPermissions.every((p) =>
        params.userPermissions.includes(p),
      );
    });
  }

  /**
   * List all registered action IDs.
   *
   * @returns Array of action IDs
   */
  listActions(): string[] {
    return Array.from(this.actions.keys());
  }

  /**
   * Check if an action requires preview before execution.
   * Per CONTEXT.md: QUICK actions don't need preview, others do.
   *
   * @param actionId - Action identifier
   * @returns true if preview is required or action not found
   */
  requiresPreview(actionId: string): boolean {
    const action = this.actions.get(actionId);
    if (!action) return true;
    return (
      action.category === ActionCategory.STANDARD ||
      action.category === ActionCategory.CRITICAL ||
      action.category === ActionCategory.EXTERNAL
    );
  }

  /**
   * Check if an action is undoable.
   *
   * @param actionId - Action identifier
   * @returns true if action can be undone
   */
  isUndoable(actionId: string): boolean {
    const action = this.actions.get(actionId);
    return (action?.undoWindowSeconds ?? 0) > 0;
  }

  /**
   * Get undo window in seconds for an action.
   *
   * @param actionId - Action identifier
   * @returns Undo window in seconds (0 = not undoable)
   */
  getUndoWindow(actionId: string): number {
    const action = this.actions.get(actionId);
    return action?.undoWindowSeconds ?? 0;
  }

  /**
   * Get actions grouped by category.
   *
   * @returns Record mapping categories to action arrays
   */
  getActionsByCategory(): Record<ActionCategory, ActionDefinition[]> {
    const result: Record<ActionCategory, ActionDefinition[]> = {
      [ActionCategory.QUICK]: [],
      [ActionCategory.STANDARD]: [],
      [ActionCategory.CRITICAL]: [],
      [ActionCategory.EXTERNAL]: [],
    };

    for (const action of this.actions.values()) {
      result[action.category].push(action);
    }

    return result;
  }

  /**
   * Unregister an action by ID.
   *
   * @param actionId - ID of action to remove
   * @returns true if action was removed
   */
  unregisterAction(actionId: string): boolean {
    return this.actions.delete(actionId);
  }
}
