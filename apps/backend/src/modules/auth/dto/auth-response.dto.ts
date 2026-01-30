import { IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

export class AuthUserDto {
  @ApiProperty({
    description: "User UUID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  id: string;

  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  email: string;

  @ApiProperty({
    description: "User first name",
    example: "John",
  })
  firstName: string;

  @ApiProperty({
    description: "User last name",
    example: "Doe",
  })
  lastName: string;

  @ApiProperty({
    description: "User role",
    enum: UserRole,
    example: UserRole.COMPLIANCE_OFFICER,
  })
  role: UserRole;

  @ApiProperty({
    description: "Organization UUID",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  organizationId: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: "JWT access token",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  accessToken: string;

  @ApiProperty({
    description: "JWT refresh token for obtaining new access tokens",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  refreshToken: string;

  @ApiProperty({
    description: "Seconds until access token expires",
    example: 900,
  })
  expiresIn: number;

  @ApiProperty({
    description: "Authenticated user information",
    type: AuthUserDto,
  })
  user: AuthUserDto;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: "Refresh token from previous login or refresh",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  @IsString()
  @IsNotEmpty({ message: "Refresh token is required" })
  refreshToken: string;
}

export class UserProfileDto {
  @ApiProperty({
    description: "User UUID",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  id: string;

  @ApiProperty({
    description: "User email address",
    example: "user@example.com",
  })
  email: string;

  @ApiProperty({
    description: "User first name",
    example: "John",
  })
  firstName: string;

  @ApiProperty({
    description: "User last name",
    example: "Doe",
  })
  lastName: string;

  @ApiProperty({
    description: "User role",
    enum: UserRole,
    example: UserRole.COMPLIANCE_OFFICER,
  })
  role: UserRole;

  @ApiProperty({
    description: "Organization UUID",
    example: "550e8400-e29b-41d4-a716-446655440001",
  })
  organizationId: string;
}
