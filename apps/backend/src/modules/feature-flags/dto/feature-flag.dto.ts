import {
  IsString,
  IsBoolean,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsObject,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for creating or updating a feature flag.
 */
export class SetFeatureFlagDto {
  @ApiProperty({
    description: "Unique identifier for the feature flag",
    example: "ai_chat",
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Whether the flag is globally enabled",
    example: true,
  })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({
    description: "Percentage for gradual rollout (0-100)",
    example: 25,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage?: number;

  @ApiPropertyOptional({
    description:
      "List of organization IDs that have access regardless of percentage",
    example: ["org_123", "org_456"],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedOrgs?: string[];

  @ApiPropertyOptional({
    description: "Additional metadata for the feature flag",
    example: { description: "New AI chat feature", team: "platform" },
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

/**
 * DTO for checking if a feature flag is enabled.
 */
export class CheckFeatureFlagDto {
  @ApiProperty({
    description: "Name of the feature flag to check",
    example: "ai_chat",
  })
  name: string;

  @ApiProperty({
    description: "Whether the feature is enabled for the current context",
    example: true,
  })
  enabled: boolean;
}

/**
 * DTO for feature flag response.
 */
export class FeatureFlagResponseDto {
  @ApiProperty({
    description: "Unique identifier for the feature flag",
    example: "ai_chat",
  })
  name: string;

  @ApiProperty({
    description: "Whether the flag is globally enabled",
    example: true,
  })
  enabled: boolean;

  @ApiPropertyOptional({
    description: "Percentage for gradual rollout (0-100)",
    example: 25,
  })
  percentage?: number;

  @ApiPropertyOptional({
    description: "List of organization IDs that have access",
    example: ["org_123", "org_456"],
    type: [String],
  })
  allowedOrgs?: string[];

  @ApiPropertyOptional({
    description: "Additional metadata for the feature flag",
  })
  metadata?: Record<string, unknown>;
}
