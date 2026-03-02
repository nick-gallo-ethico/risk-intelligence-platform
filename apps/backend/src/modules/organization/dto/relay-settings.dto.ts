/**
 * Relay Settings DTOs
 *
 * Configuration for anonymous communication relay features.
 * Controls how much information reporters see about their cases
 * and notification timing parameters.
 *
 * @see 42-01-PLAN.md - Anonymous Communication Relay foundation
 */

import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from "class-validator";

/**
 * Reporter visibility levels control how much information
 * is shared with anonymous reporters about their cases.
 *
 * Ordered from least to most transparent.
 */
export enum ReporterVisibilityLevel {
  /**
   * MINIMAL: Status only, no details.
   * Reporter sees: "Your report is being reviewed."
   */
  MINIMAL = "MINIMAL",

  /**
   * STANDARD: Status + messages, no investigator names.
   * Reporter sees messages from compliance team, case status updates.
   * Default level for most organizations.
   */
  STANDARD = "STANDARD",

  /**
   * DETAILED: Status + messages + estimated timeline.
   * Reporter sees when updates are expected, case complexity indicators.
   */
  DETAILED = "DETAILED",

  /**
   * TRANSPARENT: Full status with investigator first name.
   * Reporter sees "Sarah from the compliance team has been assigned."
   * Use only when reporter anonymity is not a concern.
   */
  TRANSPARENT = "TRANSPARENT",
}

/**
 * DTO for relay settings stored in Organization.settings JSON.
 */
export class RelaySettingsDto {
  @ApiPropertyOptional({
    enum: ReporterVisibilityLevel,
    default: ReporterVisibilityLevel.STANDARD,
    description: "How much case information is visible to anonymous reporters",
  })
  @IsOptional()
  @IsEnum(ReporterVisibilityLevel)
  reporterVisibilityLevel?: ReporterVisibilityLevel;

  @ApiPropertyOptional({
    description: "Enable two-way messaging between investigators and reporters",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enableMessaging?: boolean;

  @ApiPropertyOptional({
    description: "Automatically notify reporter when new message is posted",
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoNotifyOnMessage?: boolean;

  @ApiPropertyOptional({
    description:
      "Minimum delay for reporter notifications in hours (privacy protection)",
    default: 1,
    minimum: 0,
    maximum: 24,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(24)
  notificationDelayMinHours?: number;

  @ApiPropertyOptional({
    description: "Maximum delay for reporter notifications in hours",
    default: 6,
    minimum: 1,
    maximum: 48,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(48)
  notificationDelayMaxHours?: number;
}

/**
 * DTO for updating relay settings.
 * Same structure as RelaySettingsDto since all fields are optional.
 */
export class UpdateRelaySettingsDto extends RelaySettingsDto {}
