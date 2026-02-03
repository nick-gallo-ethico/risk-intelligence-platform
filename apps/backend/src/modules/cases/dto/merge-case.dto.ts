import {
  IsString,
  IsNotEmpty,
  IsUUID,
  MinLength,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for merging two cases.
 * The source case becomes a tombstone pointing to the target (primary) case.
 */
export class MergeCaseDto {
  @ApiProperty({
    description: "ID of the case to merge FROM (will become tombstone)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  @IsNotEmpty()
  sourceCaseId: string;

  @ApiProperty({
    description: "ID of the case to merge INTO (primary case)",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  @IsUUID()
  @IsNotEmpty()
  targetCaseId: string;

  @ApiProperty({
    description: "Reason for merging the cases (required for audit trail)",
    minLength: 10,
    maxLength: 1000,
    example:
      "These cases relate to the same incident reported by different witnesses. Consolidating for unified investigation.",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(1000)
  reason: string;
}

/**
 * Response DTO for merge operation result.
 */
export class MergeResultDto {
  @ApiProperty({
    description: "The merged (tombstone) case ID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  sourceCaseId: string;

  @ApiProperty({
    description: "The primary case ID that now contains the merged data",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  targetCaseId: string;

  @ApiProperty({
    description: "Reference number of the merged (tombstone) case",
    example: "ETH-2026-00042",
  })
  sourceReferenceNumber: string;

  @ApiProperty({
    description: "Reference number of the primary case",
    example: "ETH-2026-00041",
  })
  targetReferenceNumber: string;

  @ApiProperty({
    description: "Number of RIU associations moved to the primary case",
    example: 2,
  })
  riuAssociationsMoved: number;

  @ApiProperty({
    description: "Number of subjects moved to the primary case",
    example: 3,
  })
  subjectsMoved: number;

  @ApiProperty({
    description: "Number of investigations reassigned to the primary case",
    example: 1,
  })
  investigationsMoved: number;

  @ApiProperty({
    description: "Timestamp of the merge operation",
    example: "2026-02-03T10:30:00.000Z",
  })
  mergedAt: Date;
}

/**
 * DTO for merge history entry.
 */
export class MergeHistoryDto {
  @ApiProperty({
    description: "ID of the merged case (tombstone)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  mergedCaseId: string;

  @ApiProperty({
    description: "Reference number of the merged case",
    example: "ETH-2026-00042",
  })
  mergedCaseReferenceNumber: string;

  @ApiProperty({
    description: "Reason for the merge",
    example: "Related incident reports consolidated",
  })
  reason: string;

  @ApiProperty({
    description: "User who performed the merge",
    example: { id: "...", firstName: "John", lastName: "Doe" },
  })
  mergedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;

  @ApiProperty({
    description: "Timestamp of the merge",
    example: "2026-02-03T10:30:00.000Z",
  })
  mergedAt: Date;
}
