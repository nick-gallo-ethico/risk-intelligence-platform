import { Global, Module } from "@nestjs/common";
import { FeatureFlagsService } from "./feature-flags.service";
import { FeatureFlagsController } from "./feature-flags.controller";

/**
 * Feature Flags Module
 *
 * Provides feature flag management with Redis caching.
 *
 * Features:
 * - Global enable/disable toggles
 * - Percentage-based gradual rollout
 * - Organization-specific allowlisting
 * - Redis caching with in-memory fallback
 *
 * Usage:
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(private featureFlags: FeatureFlagsService) {}
 *
 *   async doSomething(orgId: string) {
 *     if (await this.featureFlags.isEnabled('new_feature', { organizationId: orgId })) {
 *       // New feature code
 *     } else {
 *       // Legacy code
 *     }
 *   }
 * }
 * ```
 *
 * The module is marked as @Global() so FeatureFlagsService is available
 * throughout the application without explicit imports.
 */
@Global()
@Module({
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService],
  exports: [FeatureFlagsService],
})
export class FeatureFlagsModule {}
