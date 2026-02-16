/**
 * Dismissal Categories (RS.44)
 *
 * DismissalCategory defines why a conflict was dismissed.
 * RS.44: Categorized dismissals for analytics and future false positive reduction.
 */
export const DismissalCategory = {
  /** Entity names are similar but refer to different entities */
  FALSE_MATCH_DIFFERENT_ENTITY: "FALSE_MATCH_DIFFERENT_ENTITY",
  /** Names collide but relationship is unrelated (e.g., common surname) */
  FALSE_MATCH_NAME_COLLISION: "FALSE_MATCH_NAME_COLLISION",
  /** Conflict was already reviewed and addressed in a prior disclosure */
  ALREADY_REVIEWED: "ALREADY_REVIEWED",
  /** Relationship has pre-approved exception (e.g., documented family employment) */
  PRE_APPROVED_EXCEPTION: "PRE_APPROVED_EXCEPTION",
  /** Value/activity falls below policy threshold for concern */
  BELOW_THRESHOLD: "BELOW_THRESHOLD",
  /** Other reason - requires explanation in dismissedReason field */
  OTHER: "OTHER",
} as const;

export type DismissalCategory =
  (typeof DismissalCategory)[keyof typeof DismissalCategory];

/**
 * Context for conflicts involving vendor matches.
 * Includes contract details and approval authority information.
 */
export interface VendorContext {
  vendorId?: string;
  vendorName: string;
  contractValue?: number;
  currency?: string;
  approvalLevel?: string;
  vendorStatus?: string;
  relationshipStartDate?: string;
}

/**
 * Context for conflicts involving employee matches (HRIS).
 * Includes organizational position and reporting relationship.
 */
export interface EmployeeContext {
  employeeId?: string;
  personId?: string;
  name: string;
  department?: string;
  jobTitle?: string;
  relationship?: string;
  managerId?: string;
  managerName?: string;
}

/**
 * Context for conflicts involving prior disclosures.
 * RS.41: Self-dealing detection across disclosure history.
 */
export interface DisclosureContext {
  priorDisclosureIds: string[];
  totalValue?: number;
  currency?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  disclosureTypes?: string[];
}

/**
 * Context for conflicts involving prior case history.
 * RS.41: Entity appeared in investigations or complaints.
 */
export interface CaseContext {
  caseIds: string[];
  caseTypes?: string[];
  outcomes?: string[];
  roles?: string[]; // Subject, witness, etc.
}

/**
 * Full match details bundle for contextual presentation.
 * RS.43: Each alert includes all relevant context.
 */
export interface MatchDetails {
  vendorContext?: VendorContext;
  employeeContext?: EmployeeContext;
  disclosureContext?: DisclosureContext;
  caseContext?: CaseContext;
}

/**
 * Factors that contributed to the severity determination.
 */
export interface SeverityFactors {
  factors: string[];
  thresholdExceeded?: boolean;
  historicalOccurrences?: number;
  valueAtRisk?: number;
  matchConfidence?: number;
}
