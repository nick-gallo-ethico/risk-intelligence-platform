/**
 * DTOs for Disclosure Submission workflow.
 * Supports draft save/resume, full submission, and query operations.
 */

import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsObject,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DisclosureType } from '@prisma/client';
import { ConflictAlertDto } from './conflict.dto';
import { ThresholdEvaluationResult } from './threshold-rule.dto';

// ===========================================
// Enums
// ===========================================

/**
 * Disclosure submission status.
 */
export enum DisclosureStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

// ===========================================
// Draft DTOs
// ===========================================

/**
 * DTO for saving a disclosure draft.
 * Allows partial form data to be saved for resume later.
 */
export class SaveDraftDto {
  @IsUUID()
  @IsOptional()
  assignmentId?: string;

  @IsUUID()
  @IsOptional()
  formTemplateId?: string;

  @IsEnum(DisclosureType)
  @IsOptional()
  disclosureType?: DisclosureType;

  @IsObject()
  formData: Record<string, unknown>;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  completionPercentage?: number;

  @IsOptional()
  @IsString()
  currentSection?: string;
}

/**
 * Response for draft operations.
 */
export class DraftResponseDto {
  id: string;
  organizationId: string;
  employeeId: string;
  assignmentId?: string;
  formTemplateId?: string;
  disclosureType?: string;
  formData: Record<string, unknown>;
  completionPercentage: number;
  currentSection?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ===========================================
// Submit DTOs
// ===========================================

/**
 * DTO for submitting a complete disclosure.
 */
export class SubmitDisclosureDto {
  @IsUUID()
  @IsOptional()
  assignmentId?: string;

  @IsUUID()
  @IsOptional()
  draftId?: string;

  @IsUUID()
  formTemplateId: string;

  @IsEnum(DisclosureType)
  disclosureType: DisclosureType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  disclosureSubtype?: string;

  @IsObject()
  formData: Record<string, unknown>;

  // Value tracking
  @IsOptional()
  @IsNumber()
  @Min(0)
  disclosureValue?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  disclosureCurrency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedAnnualValue?: number;

  // Related party
  @IsOptional()
  @IsUUID()
  relatedPersonId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  relatedPersonName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  relatedCompany?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  relationshipType?: string;

  // Dates
  @IsOptional()
  @IsDateString()
  effectiveDate?: string;

  @IsOptional()
  @IsDateString()
  expirationDate?: string;

  // Location
  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationAddress?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationState?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  locationZip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  locationCountry?: string;

  // Narrative
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  details?: string;
}

// ===========================================
// Response DTOs
// ===========================================

/**
 * Full disclosure response after submission.
 */
export class DisclosureResponseDto {
  id: string;
  referenceNumber: string;
  organizationId: string;
  status: DisclosureStatus;

  // Type
  disclosureType: string;
  disclosureSubtype?: string;

  // Value
  disclosureValue?: number;
  disclosureCurrency?: string;
  estimatedAnnualValue?: number;

  // Threshold & Conflict
  thresholdTriggered: boolean;
  thresholdAmount?: number;
  conflictDetected: boolean;
  conflictReason?: string;

  // Related party
  relatedPersonId?: string;
  relatedPersonName?: string;
  relatedCompany?: string;
  relationshipType?: string;

  // Dates
  effectiveDate?: Date;
  expirationDate?: Date;

  // Form
  formTemplateId?: string;
  formVersion?: number;
  formData: Record<string, unknown>;

  // Campaign link
  campaignId?: string;
  campaignAssignmentId?: string;

  // Threshold evaluation result
  thresholdEvaluation?: ThresholdEvaluationResult;

  // Detected conflicts
  conflicts: ConflictAlertDto[];

  // Case link (if auto-created)
  caseId?: string;
  caseReferenceNumber?: string;

  // Timestamps
  createdAt: Date;
  updatedAt?: Date;
  submittedAt: Date;
  submittedById: string;
}

/**
 * Lightweight disclosure list item for dashboard views.
 */
export class DisclosureListItemDto {
  id: string;
  referenceNumber: string;
  status: DisclosureStatus;
  disclosureType: string;
  disclosureSubtype?: string;
  disclosureValue?: number;
  disclosureCurrency?: string;
  relatedCompany?: string;
  relatedPersonName?: string;
  thresholdTriggered: boolean;
  conflictDetected: boolean;
  conflictCount: number;
  createdAt: Date;
  submittedAt: Date;
  submittedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

/**
 * Paginated disclosure list response.
 */
export class DisclosureListResponseDto {
  items: DisclosureListItemDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

// ===========================================
// Query DTOs
// ===========================================

/**
 * DTO for querying disclosures with filters and pagination.
 */
export class DisclosureQueryDto {
  @IsOptional()
  @IsEnum(DisclosureStatus)
  status?: DisclosureStatus;

  @IsOptional()
  @IsEnum(DisclosureType)
  disclosureType?: DisclosureType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  relatedCompany?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  relatedPersonName?: string;

  @IsOptional()
  @IsBoolean()
  thresholdTriggered?: boolean;

  @IsOptional()
  @IsBoolean()
  conflictDetected?: boolean;

  @IsOptional()
  @IsUUID()
  submittedById?: string;

  @IsOptional()
  @IsUUID()
  campaignId?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'submittedAt' | 'disclosureValue' | 'disclosureType';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

// ===========================================
// Review/Approval DTOs
// ===========================================

/**
 * DTO for approving a disclosure.
 */
export class ApproveDisclosureDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  approvalNotes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  conditions?: string[];
}

/**
 * DTO for rejecting a disclosure.
 */
export class RejectDisclosureDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  rejectionReason: string;

  @IsOptional()
  @IsBoolean()
  requestResubmission?: boolean;
}

/**
 * DTO for requesting additional information.
 */
export class RequestInfoDto {
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  requestMessage: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredFields?: string[];
}

// ===========================================
// Submission Result DTOs
// ===========================================

/**
 * Result of disclosure submission including threshold and conflict results.
 */
export class SubmissionResultDto {
  disclosure: DisclosureResponseDto;
  riuId: string;
  riuReferenceNumber: string;

  // Threshold evaluation
  thresholdEvaluation: ThresholdEvaluationResult;

  // Conflict detection
  conflictCheckResult: {
    checkedAt: Date;
    conflictCount: number;
    conflicts: ConflictAlertDto[];
    excludedConflictCount: number;
  };

  // Auto-created case (if threshold triggered CREATE_CASE action)
  autoCreatedCase?: {
    caseId: string;
    caseReferenceNumber: string;
    reason: string;
  };

  // Campaign assignment update
  assignmentUpdated: boolean;
  assignmentId?: string;
}
