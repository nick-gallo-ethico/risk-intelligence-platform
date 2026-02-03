import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UserRole } from "@prisma/client";
import {
  AssignmentContext,
  AssignmentResult,
  AssignmentStrategy,
} from "./strategies/base.strategy";
import { RoundRobinStrategy } from "./strategies/round-robin.strategy";
import { LeastLoadedStrategy } from "./strategies/least-loaded.strategy";
import { GeographicStrategy } from "./strategies/geographic.strategy";

/**
 * Assignment rule condition that must match for rule to apply.
 */
export interface AssignmentRuleCondition {
  /** Entity type to match (CASE, INVESTIGATION, etc.) */
  entityType?: string;

  /** Category ID to match */
  categoryId?: string;

  /** Severity level to match */
  severity?: string;

  /** Location identifier to match */
  location?: string;
}

/**
 * Strategy configuration within a rule.
 */
export interface AssignmentRuleStrategy {
  /** Strategy type (round_robin, least_loaded, geographic) */
  type: string;

  /** Strategy-specific configuration */
  config: Record<string, unknown>;
}

/**
 * Full assignment rule definition.
 */
export interface AssignmentRule {
  /** Rule ID */
  id: string;

  /** Human-readable name */
  name: string;

  /** Priority (lower = higher priority) */
  priority: number;

  /** Conditions that must match for rule to apply */
  conditions: AssignmentRuleCondition;

  /** Strategy to use when conditions match */
  strategy: AssignmentRuleStrategy;
}

/**
 * AssignmentRulesService manages auto-assignment based on rules.
 *
 * Features:
 * - Pluggable strategy pattern (round-robin, least-loaded, geographic)
 * - Category-based routing with default assignees
 * - Falls back through rules by priority
 * - Default fallback to round-robin among investigators
 *
 * Per CONTEXT.md, supported strategies:
 * - round_robin: Fair distribution
 * - least_loaded: Capacity-aware
 * - geographic: Location/timezone based
 * - (Future: manager_of, team_queue, skill_based, specific_user)
 */
@Injectable()
export class AssignmentRulesService {
  private readonly logger = new Logger(AssignmentRulesService.name);

  /** Registered strategies by type */
  private strategies: Map<string, AssignmentStrategy>;

  constructor(
    private readonly prisma: PrismaService,
    roundRobin: RoundRobinStrategy,
    leastLoaded: LeastLoadedStrategy,
    geographic: GeographicStrategy
  ) {
    this.strategies = new Map<string, AssignmentStrategy>([
      [roundRobin.type, roundRobin],
      [leastLoaded.type, leastLoaded],
      [geographic.type, geographic],
    ]);
  }

  /**
   * Resolve assignee for an entity based on configured rules.
   *
   * Resolution order:
   * 1. Category's default assignee (if configured)
   * 2. Category's routing rules (if configured)
   * 3. Fallback: round-robin among investigators
   *
   * @param context - Assignment context with entity details
   * @returns Assignment result, or null if no suitable assignee
   */
  async resolveAssignee(
    context: AssignmentContext
  ): Promise<AssignmentResult | null> {
    this.logger.debug(
      `Resolving assignee for ${context.entityType}:${context.entityId}`
    );

    // Step 1: Check category-based routing
    if (context.category) {
      const categoryResult = await this.resolveByCategoryRules(context);
      if (categoryResult) {
        this.logger.debug(`Resolved via category: ${categoryResult.reason}`);
        return categoryResult;
      }
    }

    // Step 2: Fallback to round-robin among investigators
    const fallbackResult = await this.resolveFallback(context);
    if (fallbackResult) {
      this.logger.debug(`Resolved via fallback: ${fallbackResult.reason}`);
    }

    return fallbackResult;
  }

  /**
   * Resolve assignee based on category configuration.
   */
  private async resolveByCategoryRules(
    context: AssignmentContext
  ): Promise<AssignmentResult | null> {
    if (!context.category) return null;

    const category = await this.prisma.category.findUnique({
      where: { id: context.category.id },
      select: { defaultAssigneeId: true, routingRules: true },
    });

    if (!category) return null;

    // Check for direct default assignee
    if (category.defaultAssigneeId) {
      const user = await this.prisma.user.findUnique({
        where: { id: category.defaultAssigneeId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          isActive: true,
        },
      });

      if (user?.isActive) {
        return {
          userId: user.id,
          reason: `Category default assignment to ${user.firstName} ${user.lastName}`,
        };
      }
    }

    // Check for routing rules
    if (category.routingRules) {
      const rules = category.routingRules as unknown as AssignmentRuleStrategy;

      if (rules.type) {
        const strategy = this.strategies.get(rules.type);
        if (strategy) {
          const result = await strategy.resolve(context, rules.config || {});
          if (result) {
            return result;
          }
        }
      }
    }

    return null;
  }

  /**
   * Fallback resolution using round-robin among investigators.
   */
  private async resolveFallback(
    context: AssignmentContext
  ): Promise<AssignmentResult | null> {
    const roundRobin = this.strategies.get("round_robin");
    if (!roundRobin) return null;

    return roundRobin.resolve(context, {
      roleFilter: [UserRole.INVESTIGATOR, UserRole.TRIAGE_LEAD],
    });
  }

  /**
   * Register a custom assignment strategy.
   *
   * This allows domain modules to add specialized strategies
   * (e.g., skill_based, manager_of) without modifying core code.
   *
   * @param strategy - Strategy instance to register
   */
  registerStrategy(strategy: AssignmentStrategy): void {
    if (this.strategies.has(strategy.type)) {
      this.logger.warn(
        `Overwriting existing strategy: ${strategy.type}`
      );
    }
    this.strategies.set(strategy.type, strategy);
    this.logger.log(`Registered assignment strategy: ${strategy.type}`);
  }

  /**
   * Unregister a strategy by type.
   *
   * @param type - Strategy type to remove
   * @returns true if strategy was removed
   */
  unregisterStrategy(type: string): boolean {
    return this.strategies.delete(type);
  }

  /**
   * Get list of registered strategy types.
   */
  getRegisteredStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }
}
