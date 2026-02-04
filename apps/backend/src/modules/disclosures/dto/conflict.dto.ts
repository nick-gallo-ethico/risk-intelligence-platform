import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ConflictType,
  ConflictSeverity,
  ConflictStatus,
  ExclusionScope,
} from '@prisma/client';

// ===========================================
// Dismissal Categories (RS.44)
// ===========================================

/**
 * DismissalCategory defines why a conflict was dismissed.
 * RS.44: Categorized dismissals for analytics and future false positive reduction.
 */
export const DismissalCategory = {
  /** Entity names are similar but refer to different entities */
  FALSE_MATCH_DIFFERENT_ENTITY: 'FALSE_MATCH_DIFFERENT_ENTITY',
  /** Names collide but relationship is unrelated (e.g., common surname) */
  FALSE_MATCH_NAME_COLLISION: 'FALSE_MATCH_NAME_COLLISION',
  /** Conflict was already reviewed and addressed in a prior disclosure */
  ALREADY_REVIEWED: 'ALREADY_REVIEWED',
  /** Relationship has pre-approved exception (e.g., documented family employment) */
  PRE_APPROVED_EXCEPTION: 'PRE_APPROVED_EXCEPTION',
  /** Value/activity falls below policy threshold for concern */
  BELOW_THRESHOLD: 'BELOW_THRESHOLD',
  /** Other reason - requires explanation in dismissedReason field */
  OTHER: 'OTHER',
} as const;

export type DismissalCategory =
  (typeof DismissalCategory)[keyof typeof DismissalCategory];

// ===========================================
// Match Context Interfaces (RS.43)
// ===========================================

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

// ===========================================
// Conflict Alert DTOs
// ===========================================

/**
 * DTO for conflict alert with full context.
 * Used for presenting detected conflicts to compliance reviewers.
 */
export class ConflictAlertDto {
  @ApiProperty({ description: 'Unique identifier for the conflict alert' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Source disclosure ID (RIU ID)' })
  disclosureId: string;

  @ApiProperty({ enum: ConflictType, description: 'Type of conflict detected' })
  conflictType: ConflictType;

  @ApiProperty({
    enum: ConflictSeverity,
    description: 'Severity of the conflict',
  })
  severity: ConflictSeverity;

  @ApiProperty({ enum: ConflictStatus, description: 'Current status' })
  status: ConflictStatus;

  @ApiProperty({ description: 'Human-readable summary of the conflict' })
  summary: string;

  @ApiProperty({ description: 'Entity name that triggered the match' })
  matchedEntity: string;

  @ApiProperty({ description: 'Confidence score 0-100' })
  matchConfidence: number;

  @ApiProperty({ description: 'Full context details' })
  matchDetails: MatchDetails;

  @ApiPropertyOptional({ description: 'Severity determination factors' })
  severityFactors?: SeverityFactors;

  @ApiPropertyOptional({ description: 'Dismissal category if dismissed' })
  dismissedCategory?: DismissalCategory;

  @ApiPropertyOptional({ description: 'Reason for dismissal' })
  dismissedReason?: string;

  @ApiPropertyOptional({ description: 'User ID who dismissed' })
  dismissedBy?: string;

  @ApiPropertyOptional({ description: 'When dismissed' })
  dismissedAt?: Date;

  @ApiPropertyOptional({ description: 'Case ID if escalated' })
  escalatedToCaseId?: string;

  @ApiPropertyOptional({ description: 'Exclusion ID if created' })
  exclusionId?: string;

  @ApiProperty({ description: 'When the conflict was detected' })
  createdAt: Date;

  @ApiProperty({ description: 'When last updated' })
  updatedAt: Date;

  // Optional related data
  @ApiPropertyOptional({ description: 'Dismisser user details' })
  dismissedByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };

  @ApiPropertyOptional({ description: 'Escalated case details' })
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

// ===========================================
// Dismissal DTOs
// ===========================================

/**
 * DTO for dismissing a conflict alert.
 * RS.44: Dismissals can optionally create exclusions.
 */
export class DismissConflictDto {
  @ApiProperty({
    description: 'Category of dismissal',
    enum: Object.values(DismissalCategory),
  })
  @IsString()
  category: DismissalCategory;

  @ApiProperty({ description: 'Explanation for the dismissal' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({
    description: 'Create an exclusion to prevent future matches',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  createExclusion?: boolean;

  @ApiPropertyOptional({
    description: 'Scope of exclusion if created',
    enum: ExclusionScope,
    default: ExclusionScope.PERMANENT,
  })
  @IsOptional()
  @IsEnum(ExclusionScope)
  exclusionScope?: ExclusionScope;

  @ApiPropertyOptional({
    description: 'Expiration date for TIME_LIMITED exclusions',
  })
  @IsOptional()
  @IsDateString()
  exclusionExpiresAt?: string;

  @ApiPropertyOptional({ description: 'Additional notes for the exclusion' })
  @IsOptional()
  @IsString()
  exclusionNotes?: string;
}

/**
 * DTO for escalating a conflict to a case.
 */
export class EscalateConflictDto {
  @ApiPropertyOptional({
    description: 'Existing case ID to link to',
  })
  @IsOptional()
  @IsUUID()
  existingCaseId?: string;

  @ApiPropertyOptional({
    description: 'Notes to add to the escalation',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ===========================================
// Entity Timeline DTOs (RS.45)
// ===========================================

/**
 * Type of entity timeline event.
 */
export const EntityTimelineEventType = {
  DISCLOSURE_SUBMITTED: 'DISCLOSURE_SUBMITTED',
  CONFLICT_DETECTED: 'CONFLICT_DETECTED',
  CONFLICT_DISMISSED: 'CONFLICT_DISMISSED',
  CONFLICT_ESCALATED: 'CONFLICT_ESCALATED',
  CASE_INVOLVEMENT: 'CASE_INVOLVEMENT',
  EXCLUSION_CREATED: 'EXCLUSION_CREATED',
} as const;

export type EntityTimelineEventType =
  (typeof EntityTimelineEventType)[keyof typeof EntityTimelineEventType];

/**
 * Single item in an entity's timeline.
 * RS.45: Full entity timeline history view.
 */
export class EntityTimelineItem {
  @ApiProperty({ description: 'Type of timeline event' })
  eventType: EntityTimelineEventType;

  @ApiProperty({ description: 'When the event occurred' })
  occurredAt: Date;

  @ApiProperty({ description: 'Human-readable description of the event' })
  description: string;

  @ApiPropertyOptional({ description: 'Related disclosure ID' })
  disclosureId?: string;

  @ApiPropertyOptional({ description: 'Related conflict alert ID' })
  conflictAlertId?: string;

  @ApiPropertyOptional({ description: 'Related case ID' })
  caseId?: string;

  @ApiPropertyOptional({ description: 'Related exclusion ID' })
  exclusionId?: string;

  @ApiPropertyOptional({ description: 'Person ID involved' })
  personId?: string;

  @ApiPropertyOptional({ description: 'Person name (for display)' })
  personName?: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  metadata?: Record<string, unknown>;
}

/**
 * Full entity timeline response.
 * RS.45: Aggregates all interactions with an entity across disclosures and cases.
 */
export class EntityTimelineDto {
  @ApiProperty({ description: 'Entity name searched' })
  entityName: string;

  @ApiProperty({ description: 'Total number of timeline events' })
  totalEvents: number;

  @ApiProperty({ type: [EntityTimelineItem], description: 'Timeline events' })
  events: EntityTimelineItem[];

  @ApiProperty({ description: 'Summary statistics' })
  statistics: {
    totalDisclosures: number;
    totalConflicts: number;
    totalCases: number;
    uniquePersons: number;
    dateRange: {
      earliest: Date | null;
      latest: Date | null;
    };
  };
}

// ===========================================
// Query DTOs
// ===========================================

/**
 * DTO for querying conflict alerts with filters.
 */
export class ConflictQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ConflictStatus,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ConflictStatus, { each: true })
  status?: ConflictStatus[];

  @ApiPropertyOptional({
    description: 'Filter by conflict type',
    enum: ConflictType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ConflictType, { each: true })
  conflictType?: ConflictType[];

  @ApiPropertyOptional({
    description: 'Filter by severity',
    enum: ConflictSeverity,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ConflictSeverity, { each: true })
  severity?: ConflictSeverity[];

  @ApiPropertyOptional({ description: 'Filter by disclosure ID' })
  @IsOptional()
  @IsUUID()
  disclosureId?: string;

  @ApiPropertyOptional({ description: 'Filter by matched entity name' })
  @IsOptional()
  @IsString()
  matchedEntity?: string;

  @ApiPropertyOptional({ description: 'Minimum match confidence' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  minConfidence?: number;

  @ApiPropertyOptional({ description: 'Start date for date range filter' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date for date range filter' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Page size (max 100)',
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number;
}

/**
 * Paginated response for conflict alerts.
 */
export class ConflictAlertPageDto {
  @ApiProperty({ type: [ConflictAlertDto] })
  items: ConflictAlertDto[];

  @ApiProperty({ description: 'Total count of matching alerts' })
  total: number;

  @ApiProperty({ description: 'Current page (1-based)' })
  page: number;

  @ApiProperty({ description: 'Page size' })
  pageSize: number;

  @ApiProperty({ description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ description: 'Whether there are more pages' })
  hasMore: boolean;
}

// ===========================================
// Exclusion DTOs
// ===========================================

/**
 * DTO for conflict exclusion.
 */
export class ConflictExclusionDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'Organization ID' })
  organizationId: string;

  @ApiProperty({ description: 'Person ID this exclusion applies to' })
  personId: string;

  @ApiProperty({ description: 'Entity name excluded' })
  matchedEntity: string;

  @ApiProperty({ enum: ConflictType, description: 'Type of conflict excluded' })
  conflictType: ConflictType;

  @ApiPropertyOptional({ description: 'Original alert that created this' })
  createdFromAlertId?: string;

  @ApiProperty({ description: 'Reason for the exclusion' })
  reason: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  notes?: string;

  @ApiProperty({
    enum: ExclusionScope,
    description: 'Scope of the exclusion',
  })
  scope: ExclusionScope;

  @ApiPropertyOptional({ description: 'When the exclusion expires' })
  expiresAt?: Date;

  @ApiProperty({ description: 'Whether the exclusion is active' })
  isActive: boolean;

  @ApiProperty({ description: 'User who created the exclusion' })
  createdBy: string;

  @ApiProperty({ description: 'When created' })
  createdAt: Date;

  @ApiProperty({ description: 'When last updated' })
  updatedAt: Date;

  // Optional related data
  @ApiPropertyOptional({ description: 'Person details' })
  person?: {
    id: string;
    firstName: string;
    lastName: string;
  };

  @ApiPropertyOptional({ description: 'Creator user details' })
  createdByUser?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

/**
 * DTO for creating a standalone exclusion (not from dismissal).
 */
export class CreateExclusionDto {
  @ApiProperty({ description: 'Person ID to create exclusion for' })
  @IsUUID()
  personId: string;

  @ApiProperty({ description: 'Entity name to exclude' })
  @IsString()
  matchedEntity: string;

  @ApiProperty({
    enum: ConflictType,
    description: 'Type of conflict to exclude',
  })
  @IsEnum(ConflictType)
  conflictType: ConflictType;

  @ApiProperty({ description: 'Reason for the exclusion' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    enum: ExclusionScope,
    description: 'Scope of the exclusion',
    default: ExclusionScope.PERMANENT,
  })
  @IsOptional()
  @IsEnum(ExclusionScope)
  scope?: ExclusionScope;

  @ApiPropertyOptional({
    description: 'Expiration date for TIME_LIMITED scope',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
