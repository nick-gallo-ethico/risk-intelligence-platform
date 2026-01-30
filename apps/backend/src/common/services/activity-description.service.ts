// =============================================================================
// ACTIVITY DESCRIPTION GENERATOR SERVICE
// =============================================================================
//
// Generates natural language descriptions for activity log entries.
// This is a stateless utility service with pure functions.
//
// Standard action types are defined in:
// - 01-SHARED-INFRASTRUCTURE/CORE-DATA-MODEL.md (Standard Action Types table)
//
// KEY FEATURES:
// - Template-based description generation
// - Actor type handling (USER, SYSTEM, AI, ANONYMOUS)
// - Bulk change support
// - Fallback for unknown actions
// =============================================================================

import { Injectable } from "@nestjs/common";

/**
 * Actor types that determine how the actor name is displayed in descriptions.
 */
export type ActorType = "USER" | "SYSTEM" | "AI" | "ANONYMOUS" | "INTEGRATION";

/**
 * Context object containing all values needed for description generation.
 */
export interface DescriptionContext {
  /** The action being performed (e.g., 'created', 'status_changed') */
  action: string;

  /** Entity type (e.g., 'Case', 'Policy', 'Investigation') */
  entityType: string;

  /** Actor name - can be null for system/AI actions */
  actorName?: string | null;

  /** Type of actor performing the action */
  actorType?: ActorType;

  /** Old value for change-based actions (e.g., old status) */
  oldValue?: string;

  /** New value for change-based actions (e.g., new status) */
  newValue?: string;

  /** Assignee name for assignment actions */
  assigneeName?: string;

  /** List of field names that were updated */
  changedFields?: string[];

  /** Content type for AI-generated content */
  contentType?: string;

  /** Format for export actions (e.g., 'PDF', 'CSV') */
  format?: string;

  /** Reason for rejection or other contextual message */
  reason?: string;

  /** Count for bulk operations */
  count?: number;

  /** Location for login actions */
  location?: string;

  /** Email for failed login attempts */
  email?: string;
}

/**
 * Generates natural language descriptions for activity log entries.
 *
 * This service is stateless and uses pure functions. It follows the
 * Standard Action Types defined in CORE-DATA-MODEL.md.
 *
 * @example
 * ```typescript
 * const generator = new ActivityDescriptionGenerator();
 *
 * // Simple create action
 * generator.generate({ action: 'created', entityType: 'Case', actorName: 'John Doe' });
 * // => "John Doe created Case"
 *
 * // Status change
 * generator.generate({
 *   action: 'status_changed',
 *   entityType: 'Case',
 *   actorName: 'John Doe',
 *   oldValue: 'OPEN',
 *   newValue: 'IN_PROGRESS'
 * });
 * // => "John Doe changed status from OPEN to IN_PROGRESS"
 * ```
 */
@Injectable()
export class ActivityDescriptionGenerator {
  /**
   * Generates a natural language description for an activity.
   *
   * @param context - The context containing all values for description generation
   * @returns A human-readable description string
   */
  generate(context: DescriptionContext): string {
    const actor = this.resolveActorName(context);
    const { action, entityType } = context;

    // Handle standard action types
    switch (action) {
      case "created":
        return `${actor} created ${entityType}`;

      case "updated":
        return this.generateUpdatedDescription(actor, entityType, context);

      case "deleted":
        return `${actor} deleted ${entityType}`;

      case "archived":
        return `${actor} archived ${entityType}`;

      case "status_changed":
        return this.generateStatusChangedDescription(actor, context);

      case "assigned":
        return this.generateAssignedDescription(actor, entityType, context);

      case "unassigned":
        return this.generateUnassignedDescription(actor, entityType, context);

      case "commented":
        return `${actor} added comment on ${entityType}`;

      case "viewed":
        return `${actor} viewed ${entityType}`;

      case "exported":
        return this.generateExportedDescription(actor, entityType, context);

      case "approved":
        return `${actor} approved ${entityType}`;

      case "rejected":
        return this.generateRejectedDescription(actor, entityType, context);

      case "ai_generated":
        return this.generateAIGeneratedDescription(entityType, context);

      case "ai_edited":
        return this.generateAIEditedDescription(actor, context);

      case "synced":
        return this.generateSyncedDescription(context);

      case "login":
        return this.generateLoginDescription(actor, context);

      case "login_failed":
        return this.generateLoginFailedDescription(context);

      default:
        // Fallback for unknown actions
        return `${actor} performed ${action} on ${entityType}`;
    }
  }

  /**
   * Resolves the actor name based on the actor type.
   * Returns appropriate label for system, AI, or anonymous actors.
   *
   * @param context - The context containing actor information
   * @returns The resolved actor name string
   */
  private resolveActorName(context: DescriptionContext): string {
    const { actorName, actorType } = context;

    // If actor name is provided and actor is a regular user, use it
    if (actorName && actorType !== "SYSTEM" && actorType !== "AI") {
      return actorName;
    }

    // Handle special actor types
    switch (actorType) {
      case "SYSTEM":
        return "System";
      case "AI":
        return "AI";
      case "ANONYMOUS":
        return "Anonymous reporter";
      case "INTEGRATION":
        return actorName || "Integration";
      default:
        // Fallback: use provided name or 'User'
        return actorName || "User";
    }
  }

  /**
   * Generates description for update actions.
   * Handles both single field and bulk updates.
   */
  private generateUpdatedDescription(
    actor: string,
    entityType: string,
    context: DescriptionContext,
  ): string {
    const { changedFields, count } = context;

    // Bulk update with count
    if (count !== undefined && count > 1) {
      return `${actor} updated ${count} fields on ${entityType}`;
    }

    // Fields specified
    if (changedFields && changedFields.length > 0) {
      const fieldList = changedFields.join(", ");
      return `${actor} updated ${fieldList} on ${entityType}`;
    }

    // Generic update
    return `${actor} updated ${entityType}`;
  }

  /**
   * Generates description for status change actions.
   */
  private generateStatusChangedDescription(
    actor: string,
    context: DescriptionContext,
  ): string {
    const { oldValue, newValue } = context;

    if (oldValue && newValue) {
      return `${actor} changed status from ${oldValue} to ${newValue}`;
    }

    if (newValue) {
      return `${actor} changed status to ${newValue}`;
    }

    return `${actor} changed status`;
  }

  /**
   * Generates description for assignment actions.
   */
  private generateAssignedDescription(
    actor: string,
    entityType: string,
    context: DescriptionContext,
  ): string {
    const { assigneeName } = context;

    if (assigneeName) {
      return `${actor} assigned ${entityType} to ${assigneeName}`;
    }

    return `${actor} assigned ${entityType}`;
  }

  /**
   * Generates description for unassignment actions.
   */
  private generateUnassignedDescription(
    actor: string,
    entityType: string,
    context: DescriptionContext,
  ): string {
    const { assigneeName } = context;

    if (assigneeName) {
      return `${actor} unassigned ${entityType} from ${assigneeName}`;
    }

    return `${actor} unassigned ${entityType}`;
  }

  /**
   * Generates description for export actions.
   */
  private generateExportedDescription(
    actor: string,
    entityType: string,
    context: DescriptionContext,
  ): string {
    const { format } = context;

    if (format) {
      return `${actor} exported ${entityType} to ${format}`;
    }

    return `${actor} exported ${entityType}`;
  }

  /**
   * Generates description for rejection actions.
   */
  private generateRejectedDescription(
    actor: string,
    entityType: string,
    context: DescriptionContext,
  ): string {
    const { reason } = context;

    if (reason) {
      return `${actor} rejected ${entityType}: ${reason}`;
    }

    return `${actor} rejected ${entityType}`;
  }

  /**
   * Generates description for AI-generated content.
   */
  private generateAIGeneratedDescription(
    entityType: string,
    context: DescriptionContext,
  ): string {
    const { contentType } = context;

    if (contentType) {
      return `AI generated ${contentType} for ${entityType}`;
    }

    return `AI generated content for ${entityType}`;
  }

  /**
   * Generates description for editing AI-generated content.
   */
  private generateAIEditedDescription(
    actor: string,
    context: DescriptionContext,
  ): string {
    const { contentType } = context;

    if (contentType) {
      return `${actor} edited AI-generated ${contentType}`;
    }

    return `${actor} edited AI-generated content`;
  }

  /**
   * Generates description for HRIS sync actions.
   */
  private generateSyncedDescription(context: DescriptionContext): string {
    const { count } = context;

    if (count !== undefined) {
      return `HRIS sync updated ${count} records`;
    }

    return "HRIS sync completed";
  }

  /**
   * Generates description for login actions.
   */
  private generateLoginDescription(
    actor: string,
    context: DescriptionContext,
  ): string {
    const { location } = context;

    if (location) {
      return `${actor} logged in from ${location}`;
    }

    return `${actor} logged in`;
  }

  /**
   * Generates description for failed login attempts.
   */
  private generateLoginFailedDescription(context: DescriptionContext): string {
    const { email } = context;

    if (email) {
      return `Failed login attempt for ${email}`;
    }

    return "Failed login attempt";
  }
}
