import {
  IsString,
  IsEnum,
  IsOptional,
  IsEmail,
  MaxLength,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { AnonymityTier, PersonStatus } from "@prisma/client";

/**
 * DTO for updating a person record.
 * type and source are NOT included - they are immutable after creation.
 * Only identity, contact info, and status fields can be updated.
 */
export class UpdatePersonDto {
  // Identity
  @ApiPropertyOptional({
    description: "Person's first name",
    maxLength: 255,
    example: "John",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  firstName?: string;

  @ApiPropertyOptional({
    description: "Person's last name",
    maxLength: 255,
    example: "Doe",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  lastName?: string;

  @ApiPropertyOptional({
    description: "Person's email address (must be unique within organization)",
    maxLength: 255,
    example: "john.doe@example.com",
  })
  @IsEmail()
  @IsOptional()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional({
    description: "Person's phone number",
    maxLength: 50,
    example: "+1-555-123-4567",
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  // Employee link (for EMPLOYEE type)
  @ApiPropertyOptional({
    description: "Employee ID to link to (for EMPLOYEE type persons)",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsString()
  @IsOptional()
  employeeId?: string;

  // External contact details (for EXTERNAL_CONTACT type)
  @ApiPropertyOptional({
    description: "Company/organization name (for external contacts)",
    maxLength: 255,
    example: "Acme Corp",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  company?: string;

  @ApiPropertyOptional({
    description: "Job title (for external contacts)",
    maxLength: 255,
    example: "Sales Manager",
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: "Relationship type (vendor, contractor, customer, etc.)",
    maxLength: 100,
    example: "vendor",
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  relationship?: string;

  // Anonymity
  @ApiPropertyOptional({
    description: "Anonymity tier for this person",
    enum: AnonymityTier,
    example: AnonymityTier.OPEN,
  })
  @IsEnum(AnonymityTier)
  @IsOptional()
  anonymityTier?: AnonymityTier;

  // Status
  @ApiPropertyOptional({
    description: "Person status (use for soft-delete via INACTIVE)",
    enum: PersonStatus,
    example: PersonStatus.ACTIVE,
  })
  @IsEnum(PersonStatus)
  @IsOptional()
  status?: PersonStatus;

  // Notes
  @ApiPropertyOptional({
    description: "Additional notes about this person",
    maxLength: 2000,
    example: "Primary contact for vendor relationship",
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  notes?: string;
}
