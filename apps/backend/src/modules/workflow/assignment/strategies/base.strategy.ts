/**
 * Base types and abstract class for assignment strategies.
 *
 * Assignment strategies determine who should be assigned to work on
 * a given entity (case, investigation, etc.) based on configurable rules.
 *
 * Per CONTEXT.md, supported strategies include:
 * - round_robin: Fair distribution among team
 * - least_loaded: Capacity-aware (fewest open items)
 * - geographic: Location/timezone based
 * - manager_of: Reporter's manager (for disclosures)
 * - team_queue: Claim from pool
 * - skill_based: Match to certifications
 * - specific_user: Direct assignment
 */

/**
 * Context provided to assignment strategies.
 * Contains all information needed to make assignment decisions.
 */
export interface AssignmentContext {
  /** Organization ID for tenant scoping */
  organizationId: string;

  /** Type of entity being assigned (CASE, INVESTIGATION, etc.) */
  entityType: string;

  /** ID of the specific entity */
  entityId: string;

  /** Category information (optional) */
  category?: {
    id: string;
    name: string;
  };

  /** Location information for geographic routing (optional) */
  location?: {
    id: string;
    name: string;
    country?: string;
    region?: string;
    timezone?: string;
  };

  /** Severity level (optional) */
  severity?: string;

  /** Additional metadata for custom routing logic */
  metadata?: Record<string, unknown>;

  /** Reporter's employee ID (for manager-of strategy) */
  reporterEmployeeId?: string;
}

/**
 * Result of an assignment decision.
 */
export interface AssignmentResult {
  /** User ID of the assignee */
  userId: string;

  /** Human-readable explanation of why this user was selected */
  reason: string;
}

/**
 * Abstract base class for assignment strategies.
 *
 * All strategies must implement the resolve() method which takes
 * an assignment context and strategy-specific configuration,
 * returning an assignment result or null if no suitable assignee found.
 */
export abstract class AssignmentStrategy {
  /** Unique identifier for this strategy type */
  abstract readonly type: string;

  /**
   * Resolve an assignee based on the strategy logic.
   *
   * @param context - Information about the entity being assigned
   * @param config - Strategy-specific configuration
   * @returns Assignment result, or null if no suitable assignee
   */
  abstract resolve(
    context: AssignmentContext,
    config: Record<string, unknown>
  ): Promise<AssignmentResult | null>;
}
