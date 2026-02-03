import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsBoolean,
  IsInt,
  IsUUID,
  IsDateString,
  ValidateNested,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CampaignType, AudienceMode } from "@prisma/client";
import { SegmentCriteria } from "./segment-criteria.dto";

/**
 * DTO for creating a new campaign.
 */
export class CreateCampaignDto {
  @ApiProperty({
    description: "Campaign name",
    example: "Q1 2026 COI Disclosure",
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Campaign description",
    example: "Annual conflict of interest disclosure for all employees",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    enum: CampaignType,
    description: "Type of campaign",
    example: CampaignType.DISCLOSURE,
  })
  @IsEnum(CampaignType)
  type: CampaignType;

  @ApiProperty({
    enum: AudienceMode,
    description: "How audience is targeted",
    example: AudienceMode.SEGMENT,
  })
  @IsEnum(AudienceMode)
  audienceMode: AudienceMode;

  @ApiPropertyOptional({
    description: "Segment ID when audienceMode = SEGMENT",
  })
  @IsOptional()
  @IsUUID()
  segmentId?: string;

  @ApiPropertyOptional({
    description: "Employee IDs when audienceMode = MANUAL",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("4", { each: true })
  manualIds?: string[];

  @ApiProperty({
    description: "Deadline for campaign completion (ISO date)",
    example: "2026-03-31T23:59:59Z",
  })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional({
    description: "When to launch the campaign (ISO date, null for immediate)",
    example: "2026-01-15T09:00:00Z",
  })
  @IsOptional()
  @IsDateString()
  launchAt?: string;

  @ApiPropertyOptional({
    description: "When campaign expires (ISO date)",
    example: "2026-04-15T23:59:59Z",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: "Form definition ID for campaign responses",
  })
  @IsOptional()
  @IsUUID()
  formDefinitionId?: string;

  @ApiPropertyOptional({
    description: "Days before due date to send reminders",
    type: [Number],
    default: [7, 3, 1],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(90, { each: true })
  reminderDays?: number[];

  @ApiPropertyOptional({
    description: "Days after due date before escalation",
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  escalationAfterDays?: number;

  @ApiPropertyOptional({
    description: "User ID to escalate overdue assignments to",
  })
  @IsOptional()
  @IsUUID()
  escalateToUserId?: string;

  @ApiPropertyOptional({
    description: "Whether to auto-create cases from responses",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  autoCreateCase?: boolean;

  @ApiPropertyOptional({
    description: "Threshold criteria for auto-case creation (JSON)",
    example: { field: "disclosureValue", operator: ">", threshold: 500 },
  })
  @IsOptional()
  caseCreationThreshold?: Record<string, unknown>;
}

/**
 * DTO for updating an existing campaign.
 */
export class UpdateCampaignDto {
  @ApiPropertyOptional({
    description: "Campaign name",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: "Campaign description",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Deadline for campaign completion (ISO date)",
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    description: "When campaign expires (ISO date)",
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({
    description: "Days before due date to send reminders",
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(90, { each: true })
  reminderDays?: number[];

  @ApiPropertyOptional({
    description: "Days after due date before escalation",
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  escalationAfterDays?: number;

  @ApiPropertyOptional({
    description: "User ID to escalate overdue assignments to",
  })
  @IsOptional()
  @IsUUID()
  escalateToUserId?: string;

  @ApiPropertyOptional({
    description: "Status note",
  })
  @IsOptional()
  @IsString()
  statusNote?: string;
}

/**
 * DTO for launching a campaign.
 */
export class LaunchCampaignDto {
  @ApiPropertyOptional({
    description: "Override launch time (ISO date). If not provided, launches immediately.",
  })
  @IsOptional()
  @IsDateString()
  launchAt?: string;
}

/**
 * DTO for inline segment criteria when creating a campaign.
 * Used when audienceMode = SEGMENT but no existing segment is used.
 */
export class CreateCampaignWithCriteriaDto extends CreateCampaignDto {
  @ApiPropertyOptional({
    type: SegmentCriteria,
    description: "Inline segment criteria (alternative to segmentId)",
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SegmentCriteria)
  criteria?: SegmentCriteria;
}
