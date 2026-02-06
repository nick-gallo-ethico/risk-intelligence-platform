/**
 * Hotline Operations DTOs
 *
 * DTOs for hotline operations endpoints including:
 * - Directive management (CRUD with versioning)
 * - Bulk QA actions (approve, reject, reassign, change priority)
 * - Operator status updates
 */

import {
  IsString,
  IsArray,
  IsEnum,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

/**
 * Bulk QA action types.
 * Actions that can be performed on multiple RIUs simultaneously.
 */
export type BulkQaActionType = 'APPROVE' | 'REJECT' | 'REASSIGN' | 'CHANGE_PRIORITY';

/**
 * DTO for performing bulk QA actions on multiple RIUs.
 *
 * @example
 * // Approve multiple RIUs
 * { riuIds: ['uuid1', 'uuid2'], action: 'APPROVE' }
 *
 * @example
 * // Reject with reason
 * { riuIds: ['uuid1'], action: 'REJECT', reason: 'Incomplete information' }
 */
export class BulkQaActionDto {
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty({ each: true })
  riuIds: string[];

  @IsEnum(['APPROVE', 'REJECT', 'REASSIGN', 'CHANGE_PRIORITY'])
  action: BulkQaActionType;

  /** Required for REJECT action */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  /** Required for REASSIGN action - user ID to assign to */
  @IsOptional()
  @IsUUID('4')
  assignToUserId?: string;

  /** Required for CHANGE_PRIORITY action - new priority (1-5) */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;
}

/**
 * Directive stages for hotline call flow.
 * Directives are displayed at specific stages of a call.
 */
export type DirectiveStage = 'OPENING' | 'INTAKE' | 'CATEGORY_SPECIFIC' | 'CLOSING';

/**
 * DTO for creating a new directive.
 * Supports draft mode for client-submitted directives pending Ethico approval.
 */
export class CreateDirectiveDto {
  @IsUUID('4')
  organizationId: string;

  @IsEnum(['OPENING', 'INTAKE', 'CATEGORY_SPECIFIC', 'CLOSING'])
  stage: DirectiveStage;

  /** Required when stage is CATEGORY_SPECIFIC */
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  /** True if directive must be read verbatim */
  @IsOptional()
  @IsBoolean()
  isReadAloud?: boolean;

  /** True if this is a client draft needing Ethico approval */
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}

/**
 * DTO for updating an existing directive.
 * Includes approveAndPublish for Ethico to publish client drafts.
 */
export class UpdateDirectiveDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  isReadAloud?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /**
   * When true, Ethico approves and publishes a client draft.
   * Sets isActive = true.
   */
  @IsOptional()
  @IsBoolean()
  approveAndPublish?: boolean;
}

/**
 * DTO for updating operator status.
 * Used for real-time status board updates.
 */
export class UpdateOperatorStatusDto {
  @IsEnum(['AVAILABLE', 'ON_CALL', 'ON_BREAK', 'OFFLINE'])
  status: string;

  /** Languages operator can handle (ISO 639-1 codes) */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];
}

/**
 * Query parameters for listing directives.
 */
export class ListDirectivesQueryDto {
  @IsOptional()
  @IsUUID('4')
  organizationId?: string;

  @IsOptional()
  @IsEnum(['OPENING', 'INTAKE', 'CATEGORY_SPECIFIC', 'CLOSING'])
  stage?: DirectiveStage;

  @IsOptional()
  @IsBoolean()
  includeInactive?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

/**
 * Query parameters for global QA queue.
 */
export class QaQueueQueryDto {
  @IsOptional()
  @IsEnum(['PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'NEEDS_REVISION'])
  qaStatus?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

/**
 * Response for bulk QA action results.
 */
export class BulkQaActionResponseDto {
  /** Number of items successfully processed */
  processed: number;
  /** Error messages for failed items */
  errors: string[];
}

/**
 * Reviewer metrics for QA throughput reporting.
 */
export class ReviewerMetricsDto {
  reviewerId: string;
  reviewerName?: string;
  itemsReviewed: number;
  averageReviewTime?: number;
}
