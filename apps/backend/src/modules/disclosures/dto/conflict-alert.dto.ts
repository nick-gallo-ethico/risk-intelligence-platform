import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ConflictType, ConflictSeverity, ConflictStatus } from "@prisma/client";
import {
  DismissalCategory,
  MatchDetails,
  SeverityFactors,
} from "./conflict-context.dto";

/**
 * DTO for conflict alert with full context.
 * Used for presenting detected conflicts to compliance reviewers.
 */
export class ConflictAlertDto {
  @ApiProperty({ description: "Unique identifier for the conflict alert" })
  id: string;

  @ApiProperty({ description: "Organization ID" })
  organizationId: string;

  @ApiProperty({ description: "Source disclosure ID (RIU ID)" })
  disclosureId: string;

  @ApiProperty({ enum: ConflictType, description: "Type of conflict detected" })
  conflictType: ConflictType;

  @ApiProperty({
    enum: ConflictSeverity,
    description: "Severity of the conflict",
  })
  severity: ConflictSeverity;

  @ApiProperty({ enum: ConflictStatus, description: "Current status" })
  status: ConflictStatus;

  @ApiProperty({ description: "Human-readable summary of the conflict" })
  summary: string;

  @ApiProperty({ description: "Entity name that triggered the match" })
  matchedEntity: string;

  @ApiProperty({ description: "Confidence score 0-100" })
  matchConfidence: number;

  @ApiProperty({ description: "Full context details" })
  matchDetails: MatchDetails;

  @ApiPropertyOptional({ description: "Severity determination factors" })
  severityFactors?: SeverityFactors;

  @ApiPropertyOptional({ description: "Dismissal category if dismissed" })
  dismissedCategory?: DismissalCategory;

  @ApiPropertyOptional({ description: "Reason for dismissal" })
  dismissedReason?: string;

  @ApiPropertyOptional({ description: "User ID who dismissed" })
  dismissedBy?: string;

  @ApiPropertyOptional({ description: "When dismissed" })
  dismissedAt?: Date;

  @ApiPropertyOptional({ description: "Case ID if escalated" })
  escalatedToCaseId?: string;

  @ApiPropertyOptional({ description: "Exclusion ID if created" })
  exclusionId?: string;

  @ApiProperty({ description: "When the conflict was detected" })
  createdAt: Date;

  @ApiProperty({ description: "When last updated" })
  updatedAt: Date;

  // Optional related data
  @ApiPropertyOptional({ description: "Dismisser user details" })
  dismissedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };

  @ApiPropertyOptional({ description: "Escalated case details" })
  escalatedCase?: {
    id: string;
    referenceNumber: string;
    status: string;
  };
}

/**
 * Result of running conflict detection on a disclosure.
 */
export interface ConflictCheckResult {
  /** Disclosure that was checked */
  disclosureId: string;
  /** Person who submitted the disclosure */
  personId: string;
  /** When the check was performed */
  checkedAt: Date;
  /** Number of conflicts detected */
  conflictCount: number;
  /** Detected conflicts (if any) */
  conflicts: ConflictAlertDto[];
  /** Whether any conflicts were excluded by existing exclusions */
  excludedConflictCount: number;
  /** IDs of exclusions that were applied */
  appliedExclusionIds: string[];
}
