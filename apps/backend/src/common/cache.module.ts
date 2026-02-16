/**
 * CACHE MODULE - Redis-backed caching for multi-instance deployment
 *
 * This module provides tenant-aware caching capabilities across the platform.
 * Uses Redis as the backing store for horizontal scaling (multiple app instances
 * share the same cache).
 *
 * EXPORTS:
 * - TenantCacheService: Tenant-scoped caching with automatic key prefixing
 * - CacheModule: NestJS cache manager configured with Redis store
 *
 * CONFIGURATION (environment variables):
 * - REDIS_HOST: Redis server host (default: localhost)
 * - REDIS_PORT: Redis server port (default: 6379)
 * - REDIS_PASSWORD: Redis password (optional)
 * - REDIS_DB: Redis database number (default: 0)
 */

import { Module, Global, Logger } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { redisStore } from "cache-manager-ioredis-yet";
import { TenantCacheService } from "./services/cache.service";

const logger = new Logger("CacheModuleInit");

@Global()
@Module({
  imports: [
    ConfigModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>("REDIS_HOST", "localhost");
        const port = configService.get<number>("REDIS_PORT", 6379);
        const password = configService.get<string>("REDIS_PASSWORD");
        const db = configService.get<number>("REDIS_DB", 0);

        logger.log(`Initializing Redis cache store: ${host}:${port}/db${db}`);

        const store = await redisStore({
          host,
          port,
          password: password || undefined,
          db,
          ttl: 300000, // 5 minutes default TTL
        });

        return { store };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [TenantCacheService],
  exports: [TenantCacheService, CacheModule],
})
export class RedisCacheModule {}
