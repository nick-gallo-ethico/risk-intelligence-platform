import { Injectable, Logger, Inject } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import {
  OrganizationContext,
  TeamContext,
  UserContext,
  EntityContext,
} from "../dto/context.dto";

/**
 * ContextCacheService provides caching for AI context data.
 *
 * Responsibilities:
 * - Cache key generation with consistent prefixes
 * - Get/set operations for each context level
 * - TTL management per context type
 * - Cache invalidation by level
 */
@Injectable()
export class ContextCacheService {
  private readonly logger = new Logger(ContextCacheService.name);

  // Cache TTLs in seconds
  private readonly orgCacheTtl = 300; // 5 minutes
  private readonly teamCacheTtl = 300; // 5 minutes
  private readonly userCacheTtl = 300; // 5 minutes
  private readonly entityCacheTtl = 60; // 1 minute (entities change more often)

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Get organization context from cache.
   */
  async getOrgContext(orgId: string): Promise<OrganizationContext | null> {
    const cached = await this.cacheManager.get<OrganizationContext>(
      this.getOrgCacheKey(orgId),
    );
    if (cached) {
      this.logger.debug(`Cache hit for org context ${orgId}`);
    }
    return cached ?? null;
  }

  /**
   * Set organization context in cache.
   */
  async setOrgContext(
    orgId: string,
    context: OrganizationContext,
  ): Promise<void> {
    await this.cacheManager.set(
      this.getOrgCacheKey(orgId),
      context,
      this.orgCacheTtl * 1000,
    );
    this.logger.debug(`Cached org context for ${orgId}`);
  }

  /**
   * Get team context from cache.
   */
  async getTeamContext(teamId: string): Promise<TeamContext | null> {
    const cached = await this.cacheManager.get<TeamContext>(
      this.getTeamCacheKey(teamId),
    );
    if (cached) {
      this.logger.debug(`Cache hit for team context ${teamId}`);
    }
    return cached ?? null;
  }

  /**
   * Set team context in cache.
   */
  async setTeamContext(teamId: string, context: TeamContext): Promise<void> {
    await this.cacheManager.set(
      this.getTeamCacheKey(teamId),
      context,
      this.teamCacheTtl * 1000,
    );
    this.logger.debug(`Cached team context for ${teamId}`);
  }

  /**
   * Get user context from cache.
   */
  async getUserContext(userId: string): Promise<UserContext | null> {
    const cached = await this.cacheManager.get<UserContext>(
      this.getUserCacheKey(userId),
    );
    if (cached) {
      this.logger.debug(`Cache hit for user context ${userId}`);
    }
    return cached ?? null;
  }

  /**
   * Set user context in cache.
   */
  async setUserContext(userId: string, context: UserContext): Promise<void> {
    await this.cacheManager.set(
      this.getUserCacheKey(userId),
      context,
      this.userCacheTtl * 1000,
    );
    this.logger.debug(`Cached user context for ${userId}`);
  }

  /**
   * Get entity context from cache.
   */
  async getEntityContext(
    entityType: string,
    entityId: string,
  ): Promise<EntityContext | null> {
    const cached = await this.cacheManager.get<EntityContext>(
      this.getEntityCacheKey(entityType, entityId),
    );
    if (cached) {
      this.logger.debug(
        `Cache hit for entity context ${entityType}:${entityId}`,
      );
    }
    return cached ?? null;
  }

  /**
   * Set entity context in cache.
   */
  async setEntityContext(
    entityType: string,
    entityId: string,
    context: EntityContext,
  ): Promise<void> {
    await this.cacheManager.set(
      this.getEntityCacheKey(entityType, entityId),
      context,
      this.entityCacheTtl * 1000,
    );
    this.logger.debug(`Cached entity context for ${entityType}:${entityId}`);
  }

  /**
   * Invalidate cached context for an organization, team, or user.
   */
  async invalidate(params: {
    organizationId?: string;
    teamId?: string;
    userId?: string;
  }): Promise<void> {
    if (params.userId) {
      await this.cacheManager.del(this.getUserCacheKey(params.userId));
    }
    if (params.teamId) {
      await this.cacheManager.del(this.getTeamCacheKey(params.teamId));
    }
    if (params.organizationId) {
      await this.cacheManager.del(this.getOrgCacheKey(params.organizationId));
    }
  }

  // Cache key generators

  private getOrgCacheKey(orgId: string): string {
    return `ai:context:org:${orgId}`;
  }

  private getTeamCacheKey(teamId: string): string {
    return `ai:context:team:${teamId}`;
  }

  private getUserCacheKey(userId: string): string {
    return `ai:context:user:${userId}`;
  }

  private getEntityCacheKey(entityType: string, entityId: string): string {
    return `ai:context:entity:${entityType}:${entityId}`;
  }
}
