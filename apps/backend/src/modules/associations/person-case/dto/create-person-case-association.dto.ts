import {
  IsUUID,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PersonCaseLabel, EvidentiaryStatus } from "@prisma/client";

/**
 * DTO for creating a person-case association.
 *
 * Per HubSpot V4 Associations pattern, associations are first-class entities
 * with labels and metadata. The label determines how the person relates to the case.
 *
 * Evidentiary labels (REPORTER, SUBJECT, WITNESS):
 *   - Use evidentiaryStatus to track investigation outcomes
 *   - ACTIVE = under investigation, CLEARED = exonerated, SUBSTANTIATED = confirmed
 *
 * Role labels (ASSIGNED_INVESTIGATOR, LEGAL_COUNSEL, etc.):
 *   - Use validity periods (startedAt, endedAt) - managed by service
 *   - Can end when person leaves the role
 */
export class CreatePersonCaseAssociationDto {
  @ApiProperty({
    description: "UUID of the person to associate with the case",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  personId: string;

  @ApiProperty({
    description: "Type of association/role for this person on the case",
    enum: PersonCaseLabel,
    example: PersonCaseLabel.WITNESS,
  })
  @IsEnum(PersonCaseLabel)
  label: PersonCaseLabel;

  @ApiPropertyOptional({
    description: "Optional notes about this association",
    example: "Observed the incident from the break room",
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiPropertyOptional({
    description:
      "Initial evidentiary status (only for REPORTER, SUBJECT, WITNESS labels)",
    enum: EvidentiaryStatus,
    example: EvidentiaryStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(EvidentiaryStatus)
  evidentiaryStatus?: EvidentiaryStatus;
}
