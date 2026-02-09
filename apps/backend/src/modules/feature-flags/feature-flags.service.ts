import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

/**
 * Feature flag configuration.
 *
 * @property name - Unique identifier for the feature flag
 * @property enabled - Whether the flag is globally enabled
 * @property percentage - Optional percentage for gradual rollout (0-100)
 * @property allowedOrgs - Optional list of organization IDs that have access
 * @property metadata - Optional additional configuration data
 */
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  percentage?: number;
  allowedOrgs?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Context for evaluating feature flag eligibility.
 *
 * @property organizationId - Current tenant/organization ID
 * @property userId - Current user ID
 */
export interface FeatureFlagContext {
  organizationId?: string;
  userId?: string;
}

/**
 * Service for managing feature flags with Redis caching.
 *
 * Supports:
 * - Global enable/disable
 * - Percentage-based gradual rollout
 * - Organization-specific allowlisting
 * - Redis caching with in-memory fallback for local dev
 *
 * Usage:
 * ```typescript
 * // Check if feature is enabled
 * if (await this.featureFlagsService.isEnabled('ai_chat', { organizationId })) {
 *   // Feature is available
 * }
 *
 * // Admin: Update a flag
 * await this.featureFlagsService.setFlag({
 *   name: 'new_feature',
 *   enabled: true,
 *   percentage: 25, // 25% rollout
 * });
 * ```
 */
@Injectable()
export class FeatureFlagsService implements OnModuleInit {
  private readonly logger = new Logger(FeatureFlagsService.name);
  private redis: Redis | null = null;
  private readonly CACHE_PREFIX = "feature_flag:";
  private readonly CACHE_TTL = 300; // 5 minutes

  // In-memory fallback for local dev or when Redis is unavailable
  private readonly localFlags = new Map<string, FeatureFlag>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.configService.get<string>("REDIS_URL");

    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl);
        this.logger.log("Feature flags Redis connection established");
      } catch (error) {
        this.logger.warn(
          "Failed to connect to Redis for feature flags, using in-memory fallback",
        );
      }
    } else {
      this.logger.log("No REDIS_URL configured, using in-memory feature flags");
    }

    // Initialize default flags
    await this.initializeDefaultFlags();
  }

  /**
   * Initialize default feature flags if they don't exist.
   * These represent platform-level feature toggles.
   */
  private async initializeDefaultFlags(): Promise<void> {
    const defaults: FeatureFlag[] = [
      { name: "ai_chat", enabled: true },
      { name: "ai_summarization", enabled: true },
      { name: "prometheus_metrics", enabled: true },
      { name: "sentry_error_tracking", enabled: true },
      { name: "advanced_search", enabled: false, percentage: 10 },
      { name: "new_investigation_ui", enabled: false },
      { name: "realtime_collaboration", enabled: true },
      { name: "anonymous_messaging", enabled: true },
      { name: "ai_translation", enabled: true },
      { name: "bulk_operations", enabled: false, percentage: 50 },
    ];

    for (const flag of defaults) {
      const existing = await this.getFlag(flag.name);
      if (!existing) {
        await this.setFlag(flag);
      }
    }
  }

  /**
   * Check if a feature flag is enabled for the given context.
   *
   * Evaluation order:
   * 1. Flag must exist (returns false if not found)
   * 2. Flag must be globally enabled
   * 3. If allowedOrgs is set, org must be in the list
   * 4. If percentage is set, deterministic hash check
   *
   * @param flagName - Name of the feature flag
   * @param context - Optional context with organizationId and/or userId
   * @returns Promise<boolean> - Whether the feature is enabled
   */
  async isEnabled(
    flagName: string,
    context?: FeatureFlagContext,
  ): Promise<boolean> {
    const flag = await this.getFlag(flagName);

    if (!flag) {
      return false;
    }

    if (!flag.enabled) {
      return false;
    }

    // Check org-specific allowlist
    if (flag.allowedOrgs?.length && context?.organizationId) {
      if (!flag.allowedOrgs.includes(context.organizationId)) {
        return false;
      }
    }

    // Percentage-based rollout using deterministic hashing
    if (flag.percentage !== undefined && flag.percentage < 100) {
      const hashInput = `${flagName}:${context?.organizationId || context?.userId || ""}`;
      const hash = this.hashString(hashInput);
      return hash % 100 < flag.percentage;
    }

    return true;
  }

  /**
   * Get a feature flag by name.
   *
   * Checks Redis first, falls back to in-memory storage.
   *
   * @param name - Feature flag name
   * @returns Promise<FeatureFlag | null>
   */
  async getFlag(name: string): Promise<FeatureFlag | null> {
    const cacheKey = `${this.CACHE_PREFIX}${name}`;

    if (this.redis) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        this.logger.warn(`Redis get failed for ${name}, using fallback`);
      }
    }

    return this.localFlags.get(name) || null;
  }

  /**
   * Set or update a feature flag.
   *
   * Updates both Redis cache and in-memory storage.
   *
   * @param flag - Feature flag configuration
   */
  async setFlag(flag: FeatureFlag): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${flag.name}`;

    // Always update local storage
    this.localFlags.set(flag.name, flag);

    if (this.redis) {
      try {
        await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(flag));
      } catch (error) {
        this.logger.warn(`Redis set failed for ${flag.name}`);
      }
    }
  }

  /**
   * Delete a feature flag.
   *
   * @param name - Feature flag name
   */
  async deleteFlag(name: string): Promise<void> {
    const cacheKey = `${this.CACHE_PREFIX}${name}`;

    this.localFlags.delete(name);

    if (this.redis) {
      try {
        await this.redis.del(cacheKey);
      } catch (error) {
        this.logger.warn(`Redis delete failed for ${name}`);
      }
    }
  }

  /**
   * Get all feature flags.
   *
   * @returns Promise<FeatureFlag[]>
   */
  async getAllFlags(): Promise<FeatureFlag[]> {
    return Array.from(this.localFlags.values());
  }

  /**
   * Deterministic hash function for percentage-based rollout.
   *
   * Uses the same input to always produce the same output,
   * ensuring consistent feature availability for a user/org.
   *
   * @param str - String to hash
   * @returns Non-negative integer
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
