/**
 * DTOs for Demo Account Provisioning
 *
 * These DTOs define the request/response shapes for prospect account management.
 */

import { IsString, IsOptional, IsDate, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Request DTO for provisioning a new prospect demo account
 */
export class ProvisionProspectDto {
  @ApiPropertyOptional({ description: 'Name of the prospect (e.g., "John Smith")' })
  @IsOptional()
  @IsString()
  prospectName?: string;

  @ApiPropertyOptional({ description: 'Company name for the prospect' })
  @IsOptional()
  @IsString()
  prospectCompany?: string;

  @ApiPropertyOptional({
    description: 'Role to assign to the prospect account',
    enum: UserRole,
    default: 'COMPLIANCE_OFFICER',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    description: 'Expiry date for the prospect account (default: 14 days from now)',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;

  @ApiPropertyOptional({ description: 'Internal notes about this prospect' })
  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * Request DTO for extending a prospect account expiry
 */
export class ExtendExpiryDto {
  @ApiProperty({ description: 'New expiry date for the account' })
  @Type(() => Date)
  @IsDate()
  newExpiryDate: Date;
}

/**
 * Request DTO for revoking a prospect account
 */
export class RevokeAccountDto {
  @ApiPropertyOptional({ description: 'Reason for revocation' })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Response DTO for demo account data
 */
export class DemoAccountResponseDto {
  @ApiProperty({ description: 'Demo account ID' })
  id: string;

  @ApiProperty({ description: 'Generated prospect email' })
  prospectEmail: string;

  @ApiPropertyOptional({ description: 'Prospect name' })
  prospectName?: string;

  @ApiPropertyOptional({ description: 'Prospect company' })
  prospectCompany?: string;

  @ApiProperty({ description: 'Role assigned to the prospect' })
  role: string;

  @ApiProperty({ description: 'Account status', enum: ['ACTIVE', 'EXPIRED', 'REVOKED'] })
  status: string;

  @ApiProperty({ description: 'Account expiry date' })
  expiresAt: Date;

  @ApiPropertyOptional({ description: 'When account was actually expired' })
  expiredAt?: Date;

  @ApiPropertyOptional({ description: 'Last access timestamp' })
  lastAccessAt?: Date;

  @ApiProperty({ description: 'Number of times the account was accessed' })
  accessCount: number;

  @ApiProperty({ description: 'Account creation date' })
  createdAt: Date;

  @ApiPropertyOptional({
    description: 'Login credentials (only returned on provision)',
  })
  credentials?: {
    email: string;
    password: string;
  };
}

/**
 * Response DTO for provisioned account (includes credentials)
 */
export class ProvisionResponseDto extends DemoAccountResponseDto {
  @ApiProperty({
    description: 'Login credentials for the provisioned account',
    type: 'object',
    properties: {
      email: { type: 'string', example: 'prospect-abc12345@demo.local' },
      password: { type: 'string', example: 'Password123!' },
    },
  })
  credentials: {
    email: string;
    password: string;
  };
}

/**
 * Response DTO for demo credentials listing (public endpoint)
 */
export class DemoCredentialsDto {
  @ApiProperty({ description: 'Password for all demo accounts' })
  password: string;

  @ApiProperty({
    description: 'List of available demo accounts',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        email: { type: 'string' },
        role: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  accounts: Array<{
    email: string;
    role: string;
    description: string;
  }>;
}

/**
 * DTO for sales rep's prospect account listing
 */
export class ProspectListItemDto {
  @ApiProperty({ description: 'Demo account ID' })
  id: string;

  @ApiProperty({ description: 'Prospect email' })
  prospectEmail: string;

  @ApiPropertyOptional({ description: 'Prospect name' })
  prospectName?: string;

  @ApiPropertyOptional({ description: 'Prospect company' })
  prospectCompany?: string;

  @ApiProperty({ description: 'Account status' })
  status: string;

  @ApiProperty({ description: 'Expiry date' })
  expiresAt: Date;

  @ApiProperty({ description: 'Access count' })
  accessCount: number;

  @ApiPropertyOptional({ description: 'Last access' })
  lastAccessAt?: Date;

  @ApiProperty({ description: 'Created date' })
  createdAt: Date;

  @ApiProperty({
    description: 'Prospect user details',
    type: 'object',
    properties: {
      id: { type: 'string' },
      email: { type: 'string' },
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      role: { type: 'string' },
      isActive: { type: 'boolean' },
      lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
    },
  })
  prospectUser: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    isActive: boolean;
    lastLoginAt: Date | null;
  };
}
