import { Injectable, Inject, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";

/**
 * Tenant-aware caching service for multi-instance deployment.
 *
 * All cache keys are automatically prefixed with organization ID to prevent
 * cross-tenant data leaks. Uses Redis store for horizontal scaling.
 *
 * Key format: org:{organizationId}:{namespace}:{key}
 *
 * Example usage:
 * ```typescript
 * // Get or compute cached value
 * const categories = await cacheService.getOrSet(
 *   orgId,
 *   'categories',
 *   'all',
 *   () => this.prisma.category.findMany({ where: { organizationId: orgId } }),
 *   300000, // 5 minutes
 * );
 *
 * // Invalidate on update
 * await cacheService.del(orgId, 'categories', 'all');
 * ```
 */
@Injectable()
export class TenantCacheService {
  private readonly logger = new Logger(TenantCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Build tenant-scoped cache key.
   * Format: org:{organizationId}:{namespace}:{key}
   */
  private buildKey(
    organizationId: string,
    namespace: string,
    key: string,
  ): string {
    return `org:${organizationId}:${namespace}:${key}`;
  }

  /**
   * Get cached value with tenant isolation.
   * Returns undefined if not found or on cache error (fail-open for reads).
   */
  async get<T>(
    organizationId: string,
    namespace: string,
    key: string,
  ): Promise<T | undefined> {
    const fullKey = this.buildKey(organizationId, namespace, key);
    try {
      return await this.cacheManager.get<T>(fullKey);
    } catch (error) {
      this.logger.warn(
        `Cache get failed for ${fullKey}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      return undefined;
    }
  }

  /**
   * Set cached value with tenant isolation.
   * Silently fails on cache error (fail-open for writes).
   *
   * @param organizationId - Tenant ID for isolation
   * @param namespace - Logical grouping (e.g., 'categories', 'permissions')
   * @param key - Specific key within namespace
   * @param value - Value to cache
   * @param ttl - Time to live in milliseconds (default: 300000 = 5 minutes)
   */
  async set<T>(
    organizationId: string,
    namespace: string,
    key: string,
    value: T,
    ttl: number = 300000,
  ): Promise<void> {
    const fullKey = this.buildKey(organizationId, namespace, key);
    try {
      await this.cacheManager.set(fullKey, value, ttl);
    } catch (error) {
      this.logger.warn(
        `Cache set failed for ${fullKey}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Delete cached value.
   * Silently fails on cache error.
   */
  async del(
    organizationId: string,
    namespace: string,
    key: string,
  ): Promise<void> {
    const fullKey = this.buildKey(organizationId, namespace, key);
    try {
      await this.cacheManager.del(fullKey);
    } catch (error) {
      this.logger.warn(
        `Cache del failed for ${fullKey}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get or compute and cache value (cache-aside pattern).
   *
   * If cached value exists, returns it immediately.
   * Otherwise, calls factory to compute value, caches it, and returns.
   *
   * @param organizationId - Tenant ID for isolation
   * @param namespace - Logical grouping
   * @param key - Specific key within namespace
   * @param factory - Async function to compute value if not cached
   * @param ttl - Time to live in milliseconds (default: 300000 = 5 minutes)
   */
  async getOrSet<T>(
    organizationId: string,
    namespace: string,
    key: string,
    factory: () => Promise<T>,
    ttl: number = 300000,
  ): Promise<T> {
    const cached = await this.get<T>(organizationId, namespace, key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(organizationId, namespace, key, value, ttl);
    return value;
  }

  /**
   * Log intent to invalidate namespace.
   *
   * Note: Pattern-based deletion (KEYS/SCAN + DEL) is expensive in Redis
   * and should be avoided in production. Use specific key deletions instead.
   * This method logs the invalidation intent for debugging purposes.
   */
  async invalidateNamespace(
    organizationId: string,
    namespace: string,
  ): Promise<void> {
    const pattern = this.buildKey(organizationId, namespace, "*");
    this.logger.debug(`Invalidating cache pattern: ${pattern}`);
    // Pattern delete requires Redis client directly, not through cache-manager.
    // For production use, track specific keys or use versioned cache keys.
  }
}
