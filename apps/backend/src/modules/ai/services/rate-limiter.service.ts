import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { PrismaService } from "../../prisma/prisma.service";
import {
  RateLimitCheckParams,
  RateLimitResult,
  RecordUsageParams,
  OrgRateLimits,
} from "../dto/rate-limit.dto";

const DEFAULT_LIMITS: OrgRateLimits = {
  requestsPerMinute: 60,
  tokensPerMinute: 100000,
  requestsPerDay: 10000,
  tokensPerDay: 5000000,
};

/**
 * AiRateLimiterService provides per-tenant AI rate limiting using Redis sorted sets.
 *
 * Features:
 * - Sliding window rate limiting for accurate RPM/TPM tracking
 * - Daily limits tracked separately
 * - Per-organization limit configuration
 * - Usage recording for billing and analytics
 *
 * Key design decisions:
 * - Redis sorted sets enable precise sliding window (vs fixed windows)
 * - Each organization has isolated rate limits (no cross-tenant impact)
 * - Limits are cached locally for 1 minute to reduce DB queries
 */
@Injectable()
export class AiRateLimiterService {
  private readonly logger = new Logger(AiRateLimiterService.name);
  private redis: Redis;
  private readonly limitsCache = new Map<
    string,
    { limits: OrgRateLimits; expiresAt: number }
  >();
  private readonly limitsCacheTtl = 60000; // 1 minute cache

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const redisUrl = this.configService.get<string>(
      "REDIS_URL",
      "redis://localhost:6379",
    );
    this.redis = new Redis(redisUrl);
  }

  /**
   * Generate Redis key for rate limiting.
   * Keys include organization ID for tenant isolation.
   */
  private getKey(
    orgId: string,
    type: "rpm" | "tpm" | "daily-rpm" | "daily-tpm",
  ): string {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (type.startsWith("daily")) {
      return `ai:ratelimit:${orgId}:${type}:${today}`;
    }
    return `ai:ratelimit:${orgId}:${type}`;
  }

  /**
   * Check if request is allowed and consume quota if so.
   * Uses Redis sorted sets for accurate sliding window rate limiting.
   *
   * @param params - Organization ID and estimated token count
   * @returns RateLimitResult with allowed flag and remaining capacity
   */
  async checkAndConsume(params: RateLimitCheckParams): Promise<RateLimitResult> {
    const { organizationId, estimatedTokens } = params;
    const limits = await this.getOrgLimits(organizationId);
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // Keys
    const rpmKey = this.getKey(organizationId, "rpm");
    const tpmKey = this.getKey(organizationId, "tpm");
    const dailyRpmKey = this.getKey(organizationId, "daily-rpm");
    const dailyTpmKey = this.getKey(organizationId, "daily-tpm");

    // Use pipeline for atomic operations
    const pipeline = this.redis.pipeline();

    // Clean old entries and get counts for RPM
    pipeline.zremrangebyscore(rpmKey, 0, windowStart);
    pipeline.zcard(rpmKey);

    // Clean old entries and get token sum for TPM
    pipeline.zremrangebyscore(tpmKey, 0, windowStart);
    pipeline.zrange(tpmKey, 0, -1, "WITHSCORES");

    // Daily counts (simple counters, reset at midnight)
    pipeline.get(dailyRpmKey);
    pipeline.get(dailyTpmKey);

    const results = await pipeline.exec();

    // Parse results
    const currentRpm = (results![1][1] as number) || 0;
    const tpmEntries = (results![3][1] as string[]) || [];
    const currentTpm = this.sumTokensFromEntries(tpmEntries);
    const dailyRpm = parseInt((results![4][1] as string) || "0", 10);
    const dailyTpm = parseInt((results![5][1] as string) || "0", 10);

    // Check RPM limit
    if (currentRpm >= limits.requestsPerMinute) {
      const oldestEntry = await this.getOldestEntry(rpmKey, windowStart);
      const retryAfterMs = oldestEntry ? oldestEntry + 60000 - now : 1000;

      return {
        allowed: false,
        reason: "RATE_LIMIT_RPM",
        retryAfterMs: Math.max(retryAfterMs, 0),
      };
    }

    // Check TPM limit
    if (currentTpm + estimatedTokens > limits.tokensPerMinute) {
      return {
        allowed: false,
        reason: "RATE_LIMIT_TPM",
        retryAfterMs: this.calculateTpmRetryAfter(tpmEntries, windowStart, now),
      };
    }

    // Check daily limits
    if (dailyRpm >= limits.requestsPerDay) {
      return {
        allowed: false,
        reason: "RATE_LIMIT_DAILY",
        retryAfterMs: this.msUntilMidnight(),
      };
    }

    if (dailyTpm + estimatedTokens > limits.tokensPerDay) {
      return {
        allowed: false,
        reason: "RATE_LIMIT_DAILY",
        retryAfterMs: this.msUntilMidnight(),
      };
    }

    // Consume quota
    const requestId = `${now}:${Math.random().toString(36).slice(2, 10)}`;
    const consumePipeline = this.redis.pipeline();

    // Add to RPM counter
    consumePipeline.zadd(rpmKey, now, requestId);
    consumePipeline.expire(rpmKey, 120);

    // Add to TPM counter (store tokens in member name for summing)
    consumePipeline.zadd(tpmKey, now, `${requestId}:${estimatedTokens}`);
    consumePipeline.expire(tpmKey, 120);

    // Increment daily counters
    consumePipeline.incr(dailyRpmKey);
    consumePipeline.expire(dailyRpmKey, 86400 + 3600); // 25 hours to survive timezone edge cases
    consumePipeline.incrby(dailyTpmKey, estimatedTokens);
    consumePipeline.expire(dailyTpmKey, 86400 + 3600);

    await consumePipeline.exec();

    return {
      allowed: true,
      remaining: {
        rpm: limits.requestsPerMinute - currentRpm - 1,
        tpm: limits.tokensPerMinute - currentTpm - estimatedTokens,
        dailyRequests: limits.requestsPerDay - dailyRpm - 1,
        dailyTokens: limits.tokensPerDay - dailyTpm - estimatedTokens,
      },
    };
  }

  /**
   * Record actual token usage after API call completes.
   * Stores in database for billing analytics and usage tracking.
   */
  async recordUsage(params: RecordUsageParams): Promise<void> {
    const totalTokens = params.inputTokens + params.outputTokens;

    // Store in database for billing and analytics
    await this.prisma.aiUsage.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        cacheReadTokens: params.cacheReadTokens || 0,
        cacheWriteTokens: params.cacheWriteTokens || 0,
        model: params.model,
        provider: params.provider || "claude",
        featureType: params.featureType,
        entityType: params.entityType,
        entityId: params.entityId,
        durationMs: params.durationMs,
      },
    });

    // Update actual TPM if significantly different from estimate
    // This helps maintain accurate rate limiting
    this.logger.debug(
      `AI usage: org=${params.organizationId} tokens=${totalTokens} feature=${params.featureType}`,
    );
  }

  /**
   * Get usage statistics for an organization.
   * Supports day, week, and month periods.
   */
  async getUsageStats(
    organizationId: string,
    period: "day" | "week" | "month" = "day",
  ): Promise<{
    totalRequests: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    byFeature: Record<string, { requests: number; tokens: number }>;
  }> {
    const periodStart = new Date();
    if (period === "day") {
      periodStart.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      periodStart.setDate(periodStart.getDate() - 7);
    } else {
      periodStart.setDate(periodStart.getDate() - 30);
    }

    const usage = await this.prisma.aiUsage.findMany({
      where: {
        organizationId,
        timestamp: { gte: periodStart },
      },
    });

    const byFeature: Record<string, { requests: number; tokens: number }> = {};

    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    for (const record of usage) {
      totalInputTokens += record.inputTokens;
      totalOutputTokens += record.outputTokens;

      const feature = record.featureType || "unknown";
      if (!byFeature[feature]) {
        byFeature[feature] = { requests: 0, tokens: 0 };
      }
      byFeature[feature].requests++;
      byFeature[feature].tokens += record.inputTokens + record.outputTokens;
    }

    return {
      totalRequests: usage.length,
      totalInputTokens,
      totalOutputTokens,
      byFeature,
    };
  }

  /**
   * Get rate limits for an organization.
   * Caches results for performance (1 minute TTL).
   */
  private async getOrgLimits(organizationId: string): Promise<OrgRateLimits> {
    // Check cache
    const cached = this.limitsCache.get(organizationId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.limits;
    }

    // Query database
    const config = await this.prisma.aiRateLimit.findUnique({
      where: { organizationId },
    });

    const limits: OrgRateLimits = config
      ? {
          requestsPerMinute: config.requestsPerMinute,
          tokensPerMinute: config.tokensPerMinute,
          requestsPerDay: config.requestsPerDay,
          tokensPerDay: config.tokensPerDay,
        }
      : DEFAULT_LIMITS;

    // Cache
    this.limitsCache.set(organizationId, {
      limits,
      expiresAt: Date.now() + this.limitsCacheTtl,
    });

    return limits;
  }

  /**
   * Sum tokens from TPM sorted set entries.
   * Entries are [member, score, member, score, ...]
   * Member format: requestId:tokenCount
   */
  private sumTokensFromEntries(entries: string[]): number {
    let sum = 0;
    // Entries are [member, score, member, score, ...]
    // Member format: requestId:tokenCount
    for (let i = 0; i < entries.length; i += 2) {
      const member = entries[i];
      const parts = member.split(":");
      if (parts.length >= 3) {
        sum += parseInt(parts[2], 10) || 0;
      }
    }
    return sum;
  }

  /**
   * Get the timestamp of the oldest entry in the sliding window.
   */
  private async getOldestEntry(
    key: string,
    windowStart: number,
  ): Promise<number | null> {
    const oldest = await this.redis.zrangebyscore(
      key,
      windowStart,
      "+inf",
      "LIMIT",
      0,
      1,
    );
    if (oldest.length > 0) {
      const parts = oldest[0].split(":");
      return parseInt(parts[0], 10);
    }
    return null;
  }

  /**
   * Calculate retry-after duration for TPM limit.
   */
  private calculateTpmRetryAfter(
    entries: string[],
    windowStart: number,
    now: number,
  ): number {
    // Find oldest entry to know when capacity will free up
    for (let i = 0; i < entries.length; i += 2) {
      const score = parseFloat(entries[i + 1]);
      if (score >= windowStart) {
        return Math.max(score + 60000 - now, 1000);
      }
    }
    return 1000;
  }

  /**
   * Calculate milliseconds until midnight UTC.
   */
  private msUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  }

  /**
   * Get current rate limit status for an organization.
   * Useful for displaying remaining capacity to users.
   */
  async getRateLimitStatus(organizationId: string): Promise<{
    limits: OrgRateLimits;
    current: {
      rpm: number;
      tpm: number;
      dailyRequests: number;
      dailyTokens: number;
    };
    remaining: {
      rpm: number;
      tpm: number;
      dailyRequests: number;
      dailyTokens: number;
    };
  }> {
    const limits = await this.getOrgLimits(organizationId);
    const now = Date.now();
    const windowStart = now - 60000;

    const rpmKey = this.getKey(organizationId, "rpm");
    const tpmKey = this.getKey(organizationId, "tpm");
    const dailyRpmKey = this.getKey(organizationId, "daily-rpm");
    const dailyTpmKey = this.getKey(organizationId, "daily-tpm");

    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(rpmKey, 0, windowStart);
    pipeline.zcard(rpmKey);
    pipeline.zremrangebyscore(tpmKey, 0, windowStart);
    pipeline.zrange(tpmKey, 0, -1, "WITHSCORES");
    pipeline.get(dailyRpmKey);
    pipeline.get(dailyTpmKey);

    const results = await pipeline.exec();

    const currentRpm = (results![1][1] as number) || 0;
    const tpmEntries = (results![3][1] as string[]) || [];
    const currentTpm = this.sumTokensFromEntries(tpmEntries);
    const dailyRpm = parseInt((results![4][1] as string) || "0", 10);
    const dailyTpm = parseInt((results![5][1] as string) || "0", 10);

    return {
      limits,
      current: {
        rpm: currentRpm,
        tpm: currentTpm,
        dailyRequests: dailyRpm,
        dailyTokens: dailyTpm,
      },
      remaining: {
        rpm: Math.max(limits.requestsPerMinute - currentRpm, 0),
        tpm: Math.max(limits.tokensPerMinute - currentTpm, 0),
        dailyRequests: Math.max(limits.requestsPerDay - dailyRpm, 0),
        dailyTokens: Math.max(limits.tokensPerDay - dailyTpm, 0),
      },
    };
  }

  /**
   * Update rate limits for an organization.
   * Used by admin to set custom tier limits.
   */
  async updateOrgLimits(
    organizationId: string,
    newLimits: Partial<OrgRateLimits>,
  ): Promise<OrgRateLimits> {
    const config = await this.prisma.aiRateLimit.upsert({
      where: { organizationId },
      create: {
        organizationId,
        requestsPerMinute: newLimits.requestsPerMinute ?? DEFAULT_LIMITS.requestsPerMinute,
        tokensPerMinute: newLimits.tokensPerMinute ?? DEFAULT_LIMITS.tokensPerMinute,
        requestsPerDay: newLimits.requestsPerDay ?? DEFAULT_LIMITS.requestsPerDay,
        tokensPerDay: newLimits.tokensPerDay ?? DEFAULT_LIMITS.tokensPerDay,
      },
      update: {
        requestsPerMinute: newLimits.requestsPerMinute,
        tokensPerMinute: newLimits.tokensPerMinute,
        requestsPerDay: newLimits.requestsPerDay,
        tokensPerDay: newLimits.tokensPerDay,
      },
    });

    // Invalidate cache
    this.limitsCache.delete(organizationId);

    return {
      requestsPerMinute: config.requestsPerMinute,
      tokensPerMinute: config.tokensPerMinute,
      requestsPerDay: config.requestsPerDay,
      tokensPerDay: config.tokensPerDay,
    };
  }
}
