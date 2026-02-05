import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDate,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsBoolean,
} from "class-validator";
import { Type, Transform } from "class-transformer";
import {
  MilestoneCategory,
  MilestoneStatus,
  MilestoneItemType,
} from "@prisma/client";

// ===========================================
// Create DTOs
// ===========================================

/**
 * DTO for creating a milestone item within a milestone.
 */
export class CreateMilestoneItemDto {
  @IsEnum(MilestoneItemType)
  entityType: MilestoneItemType;

  @IsOptional()
  @IsUUID()
  entityId?: string;

  @IsOptional()
  @IsString()
  customTitle?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  weight?: number;
}

/**
 * DTO for creating a new milestone.
 */
export class CreateMilestoneDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MilestoneCategory)
  category: MilestoneCategory;

  @Type(() => Date)
  @IsDate()
  targetDate: Date;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneItemDto)
  items?: CreateMilestoneItemDto[];
}

// ===========================================
// Update DTOs
// ===========================================

/**
 * DTO for updating a milestone.
 */
export class UpdateMilestoneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(MilestoneCategory)
  category?: MilestoneCategory;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  targetDate?: Date;

  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  lastStatusUpdate?: string;
}

/**
 * DTO for updating a milestone item.
 */
export class UpdateMilestoneItemDto {
  @IsOptional()
  @IsBoolean()
  isCompleted?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dueDate?: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  weight?: number;

  @IsOptional()
  @IsString()
  customTitle?: string;
}

// ===========================================
// Query DTOs
// ===========================================

/**
 * DTO for querying milestones with filtering and pagination.
 */
export class MilestoneQueryDto {
  @IsOptional()
  @IsEnum(MilestoneStatus)
  status?: MilestoneStatus;

  @IsOptional()
  @IsEnum(MilestoneCategory)
  category?: MilestoneCategory;

  @IsOptional()
  @IsUUID()
  ownerId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  targetDateFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  targetDateTo?: Date;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  offset?: number = 0;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ===========================================
// Response DTOs
// ===========================================

/**
 * Response DTO for milestone item data.
 */
export class MilestoneItemResponseDto {
  id: string;
  entityType: MilestoneItemType;
  entityId?: string;
  customTitle?: string;
  isCompleted: boolean;
  completedAt?: Date;
  dueDate?: Date;
  weight: number;
  sortOrder: number;

  /** Resolved entity info (for linked items) */
  resolvedEntity?: {
    title: string;
    status: string;
    url: string;
  };
}

/**
 * Response DTO for milestone data with computed fields.
 */
export class MilestoneResponseDto {
  id: string;
  name: string;
  description?: string;
  category: MilestoneCategory;
  targetDate: Date;
  completedAt?: Date;
  status: MilestoneStatus;
  totalItems: number;
  completedItems: number;
  progressPercent: number;

  owner?: {
    id: string;
    name: string;
  };

  items: MilestoneItemResponseDto[];
  notes?: string;
  lastStatusUpdate?: string;

  /** Days until target date (negative if past) */
  daysUntilTarget: number;

  /** True if past target date and not completed */
  isOverdue: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Paginated result wrapper for milestones.
 */
export interface PaginatedMilestoneResult {
  items: MilestoneResponseDto[];
  total: number;
  offset: number;
  limit: number;
}
