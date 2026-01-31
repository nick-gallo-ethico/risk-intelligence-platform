import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

/**
 * Nested DTO for department reference in user response.
 */
export class DepartmentRefDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "Engineering" })
  name: string;
}

/**
 * Nested DTO for business unit reference in user response.
 */
export class BusinessUnitRefDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440001" })
  id: string;

  @ApiProperty({ example: "North America" })
  name: string;
}

/**
 * Response DTO for a single user.
 *
 * Note: Sensitive fields like passwordHash are never included.
 */
export class UserResponseDto {
  @ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000" })
  id: string;

  @ApiProperty({ example: "john.doe@example.com" })
  email: string;

  @ApiProperty({ example: "John" })
  firstName: string;

  @ApiProperty({ example: "Doe" })
  lastName: string;

  @ApiProperty({ enum: UserRole, example: UserRole.EMPLOYEE })
  role: UserRole;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiPropertyOptional({ type: DepartmentRefDto })
  department?: DepartmentRefDto;

  @ApiPropertyOptional({ type: BusinessUnitRefDto })
  businessUnit?: BusinessUnitRefDto;

  @ApiPropertyOptional({ example: "2026-01-29T12:00:00Z" })
  lastLoginAt?: Date | null;

  @ApiProperty({ example: "2026-01-29T12:00:00Z" })
  createdAt: Date;

  @ApiProperty({ example: "2026-01-29T12:00:00Z" })
  updatedAt: Date;
}

/**
 * Response DTO for paginated user list.
 */
export class UserListResponseDto {
  @ApiProperty({ type: [UserResponseDto] })
  items: UserResponseDto[];

  @ApiProperty({
    description: "Pagination metadata",
    example: { page: 1, limit: 20, total: 100, totalPages: 5 },
  })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
