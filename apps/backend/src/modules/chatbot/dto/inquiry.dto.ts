import { IsString, IsOptional, IsEnum, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { InquiryStatus, InquiryPriority } from "@prisma/client";

/**
 * DTO for assigning an inquiry to a compliance team member.
 */
export class AssignInquiryDto {
  @ApiProperty({ description: "User ID of the assignee" })
  @IsString()
  assigneeId: string;
}

/**
 * DTO for resolving an inquiry with a compliance team response.
 */
export class ResolveInquiryDto {
  @ApiProperty({ description: "Resolution text from compliance team" })
  @IsString()
  @MaxLength(5000)
  resolution: string;
}

/**
 * DTO for listing/filtering inquiries.
 */
export class ListInquiriesDto {
  @ApiPropertyOptional({
    description: "Filter by inquiry status",
    enum: InquiryStatus,
  })
  @IsOptional()
  @IsEnum(InquiryStatus)
  status?: InquiryStatus;

  @ApiPropertyOptional({
    description: "Filter by inquiry priority",
    enum: InquiryPriority,
  })
  @IsOptional()
  @IsEnum(InquiryPriority)
  priority?: InquiryPriority;

  @ApiPropertyOptional({ description: "Filter by assigned user ID" })
  @IsOptional()
  @IsString()
  assignedToId?: string;
}
