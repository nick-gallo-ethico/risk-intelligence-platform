/**
 * Go-Live Readiness Types
 *
 * Per CONTEXT.md hybrid gates:
 * - Hard gates (blockers - must pass)
 * - Readiness score (recommended 85%+)
 * - Client sign-off to proceed below threshold
 */

export const RECOMMENDED_SCORE = 85; // Recommended minimum readiness score

export enum GateStatus {
  PENDING = "PENDING",
  PASSED = "PASSED",
  FAILED = "FAILED",
  WAIVED = "WAIVED", // With sign-off
}

export enum SignoffType {
  CLIENT = "CLIENT", // Client acknowledges risk
  INTERNAL = "INTERNAL", // Ethico approves exception
}

// Hard gates per CONTEXT.md - these MUST pass
export const HARD_GATES = [
  {
    id: "auth_configured",
    name: "Authentication configured",
    description: "SSO or password authentication is set up and tested",
    order: 1,
  },
  {
    id: "admin_trained",
    name: "At least 1 admin trained/certified",
    description:
      "Primary admin has completed Platform Fundamentals certification",
    order: 2,
  },
  {
    id: "terms_signed",
    name: "Terms & data processing agreement signed",
    description: "Legal agreements are executed",
    order: 3,
  },
  {
    id: "contact_designated",
    name: "Primary contact designated",
    description: "Escalation contact information is on file",
    order: 4,
  },
] as const;

// Readiness items with weights (must sum to 100)
export const READINESS_ITEMS = [
  {
    id: "data_migration",
    name: "Data migration completed",
    description: "Historical data imported and verified",
    weight: 20,
    category: "data",
  },
  {
    id: "test_workflow",
    name: "Test workflow executed",
    description: "End-to-end workflow tested with sample data",
    weight: 15,
    category: "testing",
  },
  {
    id: "users_invited",
    name: "Users invited",
    description: "At least 50% of target users have accounts",
    weight: 15,
    category: "users",
  },
  {
    id: "branding_configured",
    name: "Branding configured",
    description: "Logo, colors, and portal customization complete",
    weight: 10,
    category: "configuration",
  },
  {
    id: "categories_configured",
    name: "Categories configured",
    description: "Category taxonomy set up for organization",
    weight: 10,
    category: "configuration",
  },
  {
    id: "integrations_tested",
    name: "Integrations tested",
    description: "HRIS, SSO, and other integrations verified",
    weight: 15,
    category: "integrations",
  },
  {
    id: "first_policy",
    name: "First policy published",
    description: "At least one policy is live",
    weight: 15,
    category: "content",
  },
] as const;

// Calculate total weight for validation
export const TOTAL_WEIGHT = READINESS_ITEMS.reduce(
  (sum, item) => sum + item.weight,
  0,
); // Should be 100

export type HardGateId = (typeof HARD_GATES)[number]["id"];
export type ReadinessItemId = (typeof READINESS_ITEMS)[number]["id"];
export type ReadinessCategory = (typeof READINESS_ITEMS)[number]["category"];

/**
 * Represents a hard gate definition from HARD_GATES
 */
export interface HardGateDefinition {
  id: HardGateId;
  name: string;
  description: string;
  order: number;
}

/**
 * Represents a readiness item definition from READINESS_ITEMS
 */
export interface ReadinessItemDefinition {
  id: ReadinessItemId;
  name: string;
  description: string;
  weight: number;
  category: ReadinessCategory;
}

/**
 * Go-live readiness calculation result
 */
export interface GoLiveReadinessResult {
  /** All hard gates passed */
  hardGatesPassed: boolean;
  /** Number of hard gates passed */
  hardGatesPassedCount: number;
  /** Total number of hard gates */
  hardGatesTotalCount: number;
  /** List of failed gate IDs */
  failedGateIds: HardGateId[];
  /** List of waived gate IDs */
  waivedGateIds: HardGateId[];

  /** Calculated readiness score (0-100) */
  readinessScore: number;
  /** Whether score meets recommended threshold */
  meetsRecommendedScore: boolean;

  /** Whether go-live can proceed (hard gates + score OR sign-off) */
  canProceed: boolean;
  /** Whether client sign-off exists for below-threshold launch */
  hasSignoff: boolean;
}
