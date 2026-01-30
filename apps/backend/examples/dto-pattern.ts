// =============================================================================
// DTO PATTERN - All DTOs MUST follow this structure
// =============================================================================
//
// This is the canonical pattern for all DTOs in the Risk Intelligence Platform.
// Copy this structure when creating new DTOs.
//
// KEY REQUIREMENTS:
// 1. All fields MUST have class-validator decorators
// 2. Use appropriate validators (IsString, IsUUID, MaxLength, etc.)
// 3. Optional fields use @IsOptional()
// 4. Swagger decorators for API documentation
// 5. Transform decorators for type coercion
// =============================================================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  IsBoolean,
  IsEmail,
  IsDate,
  IsArray,
  MaxLength,
  MinLength,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';

// Enum for status (matches Prisma enum)
export enum ExampleStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}

// =============================================================================
// CREATE DTO - Input for creating new entities
// =============================================================================
export class CreateExampleDto {
  @ApiProperty({
    description: 'Name of the example',
    example: 'My Example',
    minLength: 1,
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Detailed description',
    example: 'This is a detailed description of the example.',
    maxLength: 10000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Category UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Priority level',
    example: 3,
    minimum: 1,
    maximum: 5,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  priority?: number;

  @ApiPropertyOptional({
    description: 'Tags for categorization',
    example: ['urgent', 'compliance'],
    maxItems: 10,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  tags?: string[];
}

// =============================================================================
// UPDATE DTO - Partial version of Create (all fields optional)
// =============================================================================
export class UpdateExampleDto extends PartialType(CreateExampleDto) {
  // PartialType makes all fields from CreateExampleDto optional
  // Add any update-specific fields here

  @ApiPropertyOptional({
    description: 'Reason for the update',
    example: 'Updated based on new requirements',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  updateReason?: string;
}

// =============================================================================
// CHANGE STATUS DTO - For status transitions
// =============================================================================
export class ChangeStatusDto {
  @ApiProperty({
    description: 'New status',
    enum: ExampleStatus,
    example: ExampleStatus.ACTIVE,
  })
  @IsEnum(ExampleStatus)
  status: ExampleStatus;

  @ApiProperty({
    description: 'Reason for status change (required for audit trail)',
    example: 'Approved by compliance officer after review',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10) // Force meaningful rationale
  @MaxLength(500)
  rationale: string;
}

// =============================================================================
// QUERY DTO - For list/search endpoints
// =============================================================================
export class ExampleQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number) // Transform string to number
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 20,
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: ExampleStatus,
  })
  @IsOptional()
  @IsEnum(ExampleStatus)
  status?: ExampleStatus;

  @ApiPropertyOptional({
    description: 'Search term (searches name, description)',
    example: 'compliance',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => value?.trim()) // Trim whitespace
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt',
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    example: 'desc',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

// =============================================================================
// RESPONSE DTOs - Output types (no validation needed, for typing only)
// =============================================================================
export class ExampleResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'My Example' })
  name: string;

  @ApiPropertyOptional({ example: 'Description text' })
  description?: string;

  @ApiProperty({ enum: ExampleStatus, example: ExampleStatus.DRAFT })
  status: ExampleStatus;

  @ApiProperty({ example: '2026-01-29T12:00:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-29T12:00:00Z' })
  updatedAt: Date;

  @ApiProperty({
    description: 'User who created this record',
    example: { id: 'user-123', name: 'John Doe' },
  })
  createdBy: {
    id: string;
    name: string;
  };
}

export class ExampleListResponseDto {
  @ApiProperty({ type: [ExampleResponseDto] })
  items: ExampleResponseDto[];

  @ApiProperty({
    description: 'Pagination metadata',
    example: { page: 1, limit: 20, total: 100, totalPages: 5 },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// =============================================================================
// NESTED OBJECT DTOs - For complex inputs
// =============================================================================
export class AddressDto {
  @ApiProperty({ example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({ example: 'New York' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiPropertyOptional({ example: 'NY' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  state?: string;

  @ApiProperty({ example: '10001' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;
}

export class CreateWithAddressDto extends CreateExampleDto {
  @ApiPropertyOptional({ type: AddressDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto) // Required for nested validation
  address?: AddressDto;
}

// =============================================================================
// BULK OPERATION DTOs
// =============================================================================
export class BulkDeleteDto {
  @ApiProperty({
    description: 'IDs to delete',
    example: ['id-1', 'id-2', 'id-3'],
    minItems: 1,
    maxItems: 100,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  ids: string[];

  @ApiProperty({
    description: 'Reason for bulk deletion',
    example: 'Cleanup of outdated records',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  reason: string;
}

// =============================================================================
// IMPORTANT NOTES
// =============================================================================
//
// 1. NEVER include organizationId in Create/Update DTOs
//    - It comes from the JWT, not user input
//
// 2. NEVER include fields like createdAt, updatedAt, createdById
//    - These are set by the service, not user input
//
// 3. Use @Transform for sanitization:
//    - Trim strings: @Transform(({ value }) => value?.trim())
//    - Lowercase emails: @Transform(({ value }) => value?.toLowerCase())
//
// 4. Use custom validators for complex rules:
//    - @Matches(/^[A-Z]{3}-\d{4}$/) for reference numbers
//    - @IsPhoneNumber() for phone numbers
//
// 5. Swagger decorators are required for API documentation
//
