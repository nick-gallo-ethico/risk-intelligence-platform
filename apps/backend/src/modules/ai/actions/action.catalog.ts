import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ActionDefinition, ActionCategory } from "./action.types";

/**
 * ActionCatalog manages the registry of available actions.
 *
 * Actions are operations that modify data with preview and confirmation.
 * The catalog provides:
 * - Action registration
 * - Permission-based filtering
 * - Entity-type filtering
 * - Category grouping
 *
 * Usage:
 * ```typescript
 * // Get actions for an entity
 * const actions = catalog.getAvailableActions({
 *   entityType: 'case',
 *   userPermissions: ['case:update', 'case:assign'],
 * });
 *
 * // Check if action requires preview
 * const needsPreview = catalog.requiresPreview('assign-case');
 * ```
 */
@Injectable()
export class ActionCatalog implements OnModuleInit {
  private readonly logger = new Logger(ActionCatalog.name);
  private readonly actions = new Map<string, ActionDefinition>();

  onModuleInit() {
    // Actions will be registered by domain modules
    // e.g., CaseModule registers case actions
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
    entityType?: string;
    userPermissions: string[];
    category?: ActionCategory;
  }): ActionDefinition[] {
    return Array.from(this.actions.values()).filter((action) => {
      // Filter by entity type
      if (
        params.entityType &&
        !action.entityTypes.includes(params.entityType)
      ) {
        return false;
      }

      // Filter by category
      if (params.category && action.category !== params.category) {
        return false;
      }

      // Filter by permissions
      return action.requiredPermissions.every((p) =>
        params.userPermissions.includes(p),
      );
    });
  }

  /**
   * Check if an action requires preview.
   * Per CONTEXT.md:
   * - QUICK actions: no preview needed
   * - STANDARD actions: preview recommended
   * - CRITICAL/EXTERNAL actions: preview required
   *
   * @param actionId - Action identifier
   * @returns true if preview is recommended/required
   */
  requiresPreview(actionId: string): boolean {
    const action = this.actions.get(actionId);
    if (!action) return true;

    // Quick actions don't need preview
    if (action.category === ActionCategory.QUICK) {
      return false;
    }

    // All other categories benefit from preview
    return true;
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
   * List all registered action IDs.
   *
   * @returns Array of action IDs
   */
  listActions(): string[] {
    return Array.from(this.actions.keys());
  }

  /**
   * Get actions grouped by category.
   *
   * @returns Object with arrays of actions per category
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
