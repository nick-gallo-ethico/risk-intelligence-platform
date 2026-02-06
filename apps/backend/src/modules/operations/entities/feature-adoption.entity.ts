/**
 * FeatureAdoption Entity Description
 *
 * This file documents the FeatureAdoption Prisma model for tracking feature usage.
 *
 * FeatureAdoption tracks binary adoption flags per tenant per feature:
 * - Which features have been used
 * - When features were first and last used
 * - Usage count for activity metrics
 *
 * Used to calculate feature adoption score in TenantHealthScore.
 *
 * @see schema.prisma for the actual model definition
 * @see health-metrics.types.ts for TrackedFeature enum
 */

import { TrackedFeature } from "../types/health-metrics.types";

/**
 * FeatureAdoption represents feature usage tracking per tenant.
 *
 * Prisma model:
 * ```prisma
 * model FeatureAdoption {
 *   id             String   @id @default(uuid())
 *   organizationId String   @map("organization_id")
 *   featureKey     String   @map("feature_key")
 *
 *   // Adoption tracking
 *   firstUsedAt    DateTime @map("first_used_at")
 *   lastUsedAt     DateTime @map("last_used_at")
 *   usageCount     Int      @default(1) @map("usage_count")
 *
 *   createdAt      DateTime @default(now()) @map("created_at")
 *   updatedAt      DateTime @updatedAt @map("updated_at")
 *
 *   // Relations
 *   organization   Organization @relation(...)
 * }
 * ```
 */
export interface FeatureAdoption {
  /** Unique identifier */
  id: string;

  /** Organization this adoption record belongs to */
  organizationId: string;

  /** Feature key (TrackedFeature enum value) */
  featureKey: string;

  /** When the feature was first used */
  firstUsedAt: Date;

  /** When the feature was last used */
  lastUsedAt: Date;

  /** Number of times the feature has been used */
  usageCount: number;

  /** Record creation timestamp */
  createdAt: Date;

  /** Record last update timestamp */
  updatedAt: Date;
}

/**
 * DTO for recording feature adoption.
 */
export interface RecordFeatureAdoptionDto {
  organizationId: string;
  featureKey: TrackedFeature | string;
}

/**
 * DTO for updating feature adoption (e.g., incrementing usage).
 */
export interface UpdateFeatureAdoptionDto {
  lastUsedAt?: Date;
  usageCount?: number;
}

/**
 * Feature adoption summary for a tenant.
 */
export interface FeatureAdoptionSummary {
  organizationId: string;

  /** Total number of trackable features */
  totalFeatures: number;

  /** Number of features adopted (used at least once) */
  adoptedFeatures: number;

  /** Adoption rate (adoptedFeatures / totalFeatures) */
  adoptionRate: number;

  /** List of adopted feature keys */
  adoptedFeatureKeys: string[];

  /** List of non-adopted feature keys */
  notAdoptedFeatureKeys: string[];
}

/**
 * Feature adoption with details for reporting.
 */
export interface FeatureAdoptionWithDetails extends FeatureAdoption {
  /** Human-readable feature name */
  featureName: string;

  /** Feature category (core, advanced, campaigns, integrations) */
  featureCategory: string;

  /** Days since last used */
  daysSinceLastUsed: number;

  /** Whether feature is actively used (used in last 30 days) */
  isActivelyUsed: boolean;
}

/**
 * Feature adoption trend data for charts.
 */
export interface FeatureAdoptionTrend {
  date: Date;
  adoptedCount: number;
  totalFeatures: number;
  adoptionRate: number;
}

/**
 * Feature usage statistics across all tenants (for internal analytics).
 */
export interface FeatureUsageStats {
  featureKey: string;
  featureName: string;

  /** Number of tenants that have adopted this feature */
  adoptionCount: number;

  /** Percentage of tenants that have adopted */
  adoptionRate: number;

  /** Total usage count across all tenants */
  totalUsageCount: number;

  /** Average usage count per adopting tenant */
  avgUsagePerTenant: number;
}
