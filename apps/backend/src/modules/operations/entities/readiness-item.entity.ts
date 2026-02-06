/**
 * ReadinessItem Entity Description
 *
 * This file documents the ReadinessItem Prisma model for tracking
 * weighted readiness checklist items for implementation go-live.
 *
 * Readiness items are defined in types/go-live.types.ts READINESS_ITEMS array.
 * Each item has a weight that contributes to the overall readiness score.
 * Total weights must sum to 100.
 *
 * Per CONTEXT.md, recommended minimum readiness score is 85%.
 * If score is below threshold, client sign-off is required to proceed.
 *
 * @see schema.prisma for the actual model definition
 * @see types/go-live.types.ts for item definitions and types
 */

import type {
  ReadinessCategory,
  ReadinessItemId,
} from "../types/go-live.types";

/**
 * ReadinessItem represents a weighted checklist item for implementation readiness.
 */
export interface ReadinessItem {
  /** Unique identifier */
  id: string;

  /** FK to ImplementationProject */
  projectId: string;

  /** Item ID from READINESS_ITEMS */
  itemId: ReadinessItemId;

  /** Whether the item is complete */
  isComplete: boolean;

  /** When the item was completed */
  completedAt: Date | null;

  /** InternalUser ID who marked complete */
  completedById: string | null;

  /** Partial credit (0-100 for the item's portion) */
  percentComplete: number;

  /** Additional notes */
  notes: string | null;

  /** Record creation timestamp */
  createdAt: Date;

  /** Record last update timestamp */
  updatedAt: Date;
}

/**
 * DTO for creating a readiness item record.
 */
export interface CreateReadinessItemDto {
  projectId: string;
  itemId: ReadinessItemId;
  percentComplete?: number;
  notes?: string;
}

/**
 * DTO for updating a readiness item.
 */
export interface UpdateReadinessItemDto {
  isComplete?: boolean;
  completedById?: string;
  percentComplete?: number;
  notes?: string;
}

/**
 * ReadinessItem with computed/joined fields for API responses.
 */
export interface ReadinessItemWithDetails extends ReadinessItem {
  /** Item definition details */
  itemDefinition: {
    id: string;
    name: string;
    description: string;
    weight: number;
    category: ReadinessCategory;
  };
  /** Weighted score contribution (weight * percentComplete / 100) */
  weightedScore: number;
}

/**
 * Summary of all readiness items for a project.
 */
export interface ReadinessSummary {
  /** Total items count */
  totalItems: number;
  /** Completed items count */
  completedItems: number;
  /** Overall readiness score (0-100) */
  readinessScore: number;
  /** Whether score meets recommended threshold (85%) */
  meetsRecommendedScore: boolean;
  /** Items grouped by category */
  itemsByCategory: Record<ReadinessCategory, ReadinessItemWithDetails[]>;
}
